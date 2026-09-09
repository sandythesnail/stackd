/**
 * Bridges Clerk auth + Supabase with the local store to give cross-device sync with the
 * web app. Rendered only when auth is enabled AND inside <ClerkProvider> (see _layout).
 *
 * Lifecycle (mirrors the web's app-auth.js + scheduleSupabaseSync/flushPendingSupabaseSync):
 *  - On sign-in: read this user's user_progress row → translate web→mobile → hydrate the
 *    store. If no row exists yet, seed it from local state. We only allow uploads AFTER
 *    this first read, so local defaults can never clobber existing cloud progress.
 *  - On state change: debounced upsert (mobile→web, merged onto the last-seen remote blob).
 *  - On app backgrounding: flush any pending write immediately (a debounce can otherwise be
 *    suspended before it fires — the exact bug the web guards against).
 */
import { useEffect, useMemo, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/clerk-expo';
import { useStore, type AppState, type CurrencyBaseline } from '@/store';
import { makeSupabase } from './supabase';
import { notify } from './confirm';
import { recordPendingReferral } from './referral';
import { mobileToWeb, webToMobile, type WebState } from './webState';

const DEBOUNCE_MS = 1500;
/** Which account wrote the device-global AsyncStorage snapshot — see the owner check. */
const OWNER_KEY = 'stackd_state_owner_v1';
/** Coins/diamonds as this device last SUCCESSFULLY uploaded them, per account. Read once at
 * sign-in and handed to hydrateFromRemote, which merges the two spendable currencies as a
 * delta against it instead of taking whichever side is higher — see store.tsx's
 * mergeCurrency for what that fixes. Written only after a confirmed upsert: a baseline the
 * server never accepted would make the next merge measure against a fiction, the same
 * reasoning that keeps lastRemote untouched on a failed push. */
const CURRENCY_BASELINE_KEY = 'stackd_pushed_currency_v1';

/** Per-account, because the snapshot this baseline describes is per-account. Sharing one key
 * would let a second account on the same phone measure its delta against the first's
 * balances, which is the same class of bug the OWNER_KEY check exists to stop. */
const baselineKeyFor = (uid: string) => `${CURRENCY_BASELINE_KEY}:${uid}`;

/** A balance out of the remote blob, treating anything non-numeric as zero — the same
 *  coercion webState.ts applies when it reads the same fields. */
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Paid to a player who signed up through someone's referral link, once they finish a lesson.
 * Must match referrals.sql's own +15 — the function credits the coins into user_progress
 * server-side and returns `claimed: true`; this constant is only the local mirror of that. */
const REFERRAL_ACTIVATION_COINS = 15;

/** What the two referral RPCs return (jsonb). Both are idempotent and authoritative: once a
 * referral is marked paid, later calls report nothing to claim. */
type ActivationResult = { claimed?: boolean; reason?: string } | null;
type ReferrerResult = { diamonds?: number } | null;

/** Forgets everything this device recorded ABOUT an account, as opposed to the progress
 * itself (which lives in the store's own snapshot).
 *
 * For account deletion. Both keys are keyed to a Clerk user id that is about to stop
 * existing, so leaving them behind is at best litter and at worst a trap: the owner marker
 * still naming a deleted account means the next sign-in on this phone compares against an id
 * nobody holds, and a currency baseline is a claim about a row that has been dropped.
 *
 * Exported from here because this is the file that owns both key names. */
export async function forgetDeviceAccount(uid: string) {
  try {
    await AsyncStorage.multiRemove([OWNER_KEY, baselineKeyFor(uid)]);
  } catch (e) {
    console.warn('[sync] could not clear device account keys:', e);
  }
}

/** The stored baseline for an account, or undefined when there isn't a usable one.
 *
 * Undefined rather than zeroes on anything unexpected — a missing key, unparseable JSON, a
 * shape that isn't two finite numbers. A baseline of 0/0 is not "unknown", it is a claim that
 * this device last uploaded an empty wallet, and acting on that claim would add the player's
 * entire local balance on top of the cloud's. Undefined puts the merge back on max(), which
 * is the conservative fallback. */
async function readCurrencyBaseline(uid: string): Promise<CurrencyBaseline> {
  try {
    const raw = await AsyncStorage.getItem(baselineKeyFor(uid));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { coins?: unknown; diamonds?: unknown };
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const coins = n(parsed?.coins);
    const diamonds = n(parsed?.diamonds);
    if (coins === null || diamonds === null) return undefined;
    return { coins, diamonds };
  } catch {
    return undefined;
  }
}

/** Advances the stored baseline by an amount the SERVER just added to the row.
 *
 * The baseline means "what the remote row holds, as far as this device knows". Almost every
 * change to that row comes from this device pushing, which is why push() is where it is
 * normally written — but claim_referral_activation() is SECURITY DEFINER and adds its +15
 * coins straight into user_progress.state itself (see supabase/referrals.sql), and the client
 * then mirrors the same +15 locally so the player sees it without waiting for a reload.
 *
 * Two writes of one payment, and the baseline has to know about both or the delta merge
 * counts it twice: with local and remote each at X+15 but the baseline still at X, the next
 * sign-in computes remote + (local - baseline) = X+30. max() got this right by luck, because
 * the two sides happened to be equal. So this is not bookkeeping — it is the invariant that
 * keeps the merge honest, and any future server-side write to a balance needs the same call.
 *
 * A no-op when there is no baseline yet: nothing to correct, and the merge falls back to
 * max(), which cannot double-count either. */
async function writeCurrencyBaseline(uid: string, coins: number, diamonds: number) {
  await AsyncStorage.setItem(baselineKeyFor(uid), JSON.stringify({ coins, diamonds }));
}

async function bumpCurrencyBaseline(uid: string, coins: number, diamonds: number) {
  if (!coins && !diamonds) return;
  try {
    const current = await readCurrencyBaseline(uid);
    if (!current) return;
    await writeCurrencyBaseline(uid, current.coins + coins, current.diamonds + diamonds);
  } catch (e) {
    // Worst case the next merge over-credits by this amount once, which is the direction
    // every fallback in this file already leans. Not worth failing the claim over.
    console.warn('[sync] could not advance currency baseline:', e);
  }
}

export function SupabaseSync() {
  const { isSignedIn, userId, getToken } = useAuth();
  const {
    state, hydrated, hydrateFromRemote, resetForAccountSwitch, creditReferralReward, setRemoteSettled,
  } = useStore();

  // Keep latest getToken/state/hydrate in refs so the Supabase client and callbacks are
  // stable (created once) yet always act on current values.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const stateRef = useRef(state);
  stateRef.current = state;
  const hydrateRef = useRef(hydrateFromRemote);
  hydrateRef.current = hydrateFromRemote;
  const resetRef = useRef(resetForAccountSwitch);
  resetRef.current = resetForAccountSwitch;
  // setRemoteSettled needs no ref of its own: it's a useState setter, so React guarantees a
  // stable identity and it can sit in the effect's dependencies without re-triggering it.
  const creditRef = useRef(creditReferralReward);
  creditRef.current = creditReferralReward;
  // Read inside claimReferralRewards, which is memoised on [supabase] alone so that the
  // post-upload trigger below always calls the same instance.
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const supabase = useMemo(() => makeSupabase(() => getTokenRef.current()), []);

  const lastRemote = useRef<WebState | null>(null);
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<AppState | null>(null);
  /** Set when a lesson has just been finished locally, cleared once the upload that carries
   * it has actually landed — see the referral check below for why the ordering matters. */
  const referralCheckAfterPush = useRef(false);
  const claimingReferral = useRef(false);
  /** Holds claimReferralRewards, which is defined below `push` but has to be callable from
   * inside it. A ref rather than a reorder because push is what proves the server can see the
   * lesson the claim depends on. */
  const claimRef = useRef<(() => Promise<void>) | null>(null);

  const push = useMemo(
    () => async (uid: string, s: AppState) => {
      const blob = mobileToWeb(s, lastRemote.current);
      const { error } = await supabase.from('user_progress').upsert({ clerk_user_id: uid, state: blob });
      if (error) {
        // Leave lastRemote alone on failure. It's the base every later push MERGES onto (to
        // preserve web-only fields it doesn't understand), so recording a blob the server
        // never accepted makes the next push merge onto a fiction: any web-only field that
        // changed remotely in the meantime would be overwritten from a snapshot that was
        // never real. Keeping the last CONFIRMED remote means a retry re-merges from the
        // last thing actually known to be in the row.
        console.warn('[sync] upload failed:', error.message);
        return;
      }
      lastRemote.current = blob;
      // The row now holds exactly these balances, so this is the point they become the
      // baseline every later merge measures this device's own earning and spending against.
      // Best-effort: a write that fails here only costs the next merge its delta, and the
      // fallback for a missing baseline is the old max(), not a wrong number.
      try {
        await writeCurrencyBaseline(uid, blob.coins ?? 0, blob.diamonds ?? 0);
      } catch (e) {
        console.warn('[sync] could not record currency baseline:', e);
      }
      // Only NOW is it worth asking the server to activate a referral. claim_referral_
      // activation refuses to pay until it can see a finished lesson in this account's
      // user_progress.questProgress, and that row is exactly what the upsert above just
      // wrote. Asking any earlier — straight from the "lesson finished" handler, before the
      // debounce fires — reliably returns 'no_lesson_completed', which would then be the
      // last word until the player happened to relaunch the app.
      if (referralCheckAfterPush.current) {
        referralCheckAfterPush.current = false;
        void claimRef.current?.();
      }
    },
    [supabase],
  );

  /** Referral payouts, both directions.
   *
   * These two RPCs are the ONLY way a referral ever pays out — both are SECURITY DEFINER and
   * decide the amounts themselves, so a client can't credit itself or anyone else. Until now
   * only app.js called them, which made the whole feature a no-op for anyone using the app:
   * a mobile referral link points at `/m/?ref=<id>` (see Settings' referralLinkFor), the
   * signup page creates the pending referral row, and then nobody ever asked the server to
   * activate it. The Settings card promised the referrer 25 diamonds and the friend 15 coins,
   * and neither arrived unless one of them happened to open the desktop site afterwards.
   *
   * Both calls are idempotent — an activated referral reports 'no_pending_referral' forever
   * after, and claim_referrer_rewards only returns diamonds for activated-but-unpaid rows —
   * so there's no local "already tried" flag to keep in sync. The in-flight guard is just to
   * stop the load/foreground/post-upload triggers overlapping each other. */
  const claimReferralRewards = useMemo(
    () => async () => {
      if (claimingReferral.current) return;
      const uid = userIdRef.current;
      if (!uid) return;
      claimingReferral.current = true;
      try {
        // Record before claiming, every time. This browser may have arrived through an invite
        // link and only just signed up, in which case there is no referral row yet for
        // claim_referral_activation to find — and until this ran anywhere in the /m/ build,
        // there never would be one. Cheap when there's nothing pending: it reads a single
        // localStorage key and returns.
        await recordPendingReferral(supabase, uid);

        const { data, error } = await supabase.rpc('claim_referral_activation');
        if (error) {
          console.warn('[referral] activation check failed:', error.message);
        } else if ((data as ActivationResult)?.claimed) {
          creditRef.current(REFERRAL_ACTIVATION_COINS, 0);
          // The RPC already put these coins in the row itself, and the line above is only a
          // local mirror of that — so the baseline moves with it. See bumpCurrencyBaseline.
          await bumpCurrencyBaseline(uid, REFERRAL_ACTIVATION_COINS, 0);
          notify('Welcome aboard!', `+${REFERRAL_ACTIVATION_COINS} coins for joining through a friend's link.`);
        }

        const { data: owed, error: owedErr } = await supabase.rpc('claim_referrer_rewards');
        if (owedErr) {
          console.warn('[referral] referrer check failed:', owedErr.message);
        } else {
          const diamonds = (owed as ReferrerResult)?.diamonds ?? 0;
          if (diamonds > 0) {
            // Deliberately NO baseline bump here, unlike the coins above. claim_referrer_
            // rewards only marks the referral rows credited and reports what they are worth;
            // it never touches user_progress, so this credit exists locally and nowhere else
            // and is a genuine unsynced local gain — exactly what the delta is for.
            creditRef.current(0, diamonds);
            notify('A friend joined!', `+${diamonds} diamonds from your referral link.`);
          }
        }
      } catch (e) {
        // Offline, DNS, or the SQL migration not run yet. Nothing is lost: the server still
        // holds the unpaid row, and the next sign-in or foreground asks again.
        console.warn('[referral] check failed:', e);
      } finally {
        claimingReferral.current = false;
      }
    },
    [supabase],
  );
  claimRef.current = claimReferralRewards;

  const flush = useMemo(
    () => async () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      const uid = userId;
      const s = pending.current;
      pending.current = null;
      if (uid && s && ready.current) await push(uid, s);
    },
    [userId, push],
  );

  // Load remote on sign-in — gated on the store's own AsyncStorage hydration, so the
  // account-owner check below can never race the local snapshot load.
  useEffect(() => {
    ready.current = false;
    lastRemote.current = null;
    // Nothing is known about this account's cloud progress until the read below finishes.
    // The splash waits on this to tell a returning user from a brand-new one.
    setRemoteSettled(false);
    if (!hydrated || !isSignedIn || !userId) return;
    let cancelled = false;
    (async () => {
      // Cross-account guard: the AsyncStorage snapshot is device-global, not per-account.
      // Without this, a second account signing up on the same device inherited the
      // previous account's progress — hydrateFromRemote's max() floors let the old
      // coins/xp win even against a real remote row, and for a brand-new account the
      // "seed a fresh cloud row" path below uploaded the old account's entire snapshot
      // into the new account's user_progress row. If the cached snapshot was written by
      // a different account (or an unknown pre-guard session), reset to a clean slate
      // BEFORE any cloud read or write.
      const owner = await AsyncStorage.getItem(OWNER_KEY);
      let localState = stateRef.current;
      // What this device last uploaded for this account, if anything — the anchor
      // hydrateFromRemote measures local earning and spending against. Read alongside the
      // owner check because it is only meaningful for the SAME account: after a reset the
      // local balances it described are gone, so the baseline is dropped with them and the
      // merge falls back to taking the cloud's numbers outright, which is correct for an
      // account this device is meeting for the first time.
      let spentSince: CurrencyBaseline;
      if (owner !== userId) {
        localState = resetRef.current();
        await AsyncStorage.setItem(OWNER_KEY, userId);
        await AsyncStorage.removeItem(baselineKeyFor(userId));
      } else {
        spentSince = await readCurrencyBaseline(userId);
      }
      if (cancelled) return;
      const { data, error } = await supabase
        .from('user_progress')
        .select('state')
        .eq('clerk_user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('[sync] load failed:', error.message);
        // Settled, not successful: we asked and got nothing. Uploads stay disabled
        // (ready=false) so local defaults can't overwrite the cloud, but the splash must
        // still be released — waiting forever on a read that already failed would strand a
        // user on the launch screen every time the network is down.
        setRemoteSettled(true);
        return;
      }
      if (data?.state) {
        const remote = data.state as WebState;
        lastRemote.current = remote;
        hydrateRef.current(webToMobile(remote), spentSince);
        // Re-anchor on what the row ACTUALLY holds, now that we have read it. The baseline
        // means "the row's balance as far as this device knows", and a read is the most
        // direct knowledge of that there is — more direct than the push that set it, which
        // may be several of the other device's writes ago.
        //
        // This is what makes a sign-in idempotent, and without it the merge drifts. Say the
        // baseline is 100, this device earned 20 it has not uploaded, and the other device
        // spent 50, so the row holds 50. The merge correctly lands on 70. If the app is then
        // killed before the debounced push, the next sign-in computes 50 + (70 - 100) = 20,
        // and the one after that 0: the same purchase subtracted again on every launch until
        // the balance is gone. Anchoring here means the delta after a hydrate is exactly the
        // local gain the hydrate just preserved, so re-running it changes nothing.
        //
        // Correct for the resetToken branch inside hydrateFromRemote too, which discards
        // local state wholesale: the row holds the reset balances, and so does this.
        try {
          await writeCurrencyBaseline(userId, num(remote.coins), num(remote.diamonds));
        } catch (e) {
          console.warn('[sync] could not anchor currency baseline:', e);
        }
        ready.current = true;
      } else {
        ready.current = true;
        await push(userId, localState); // seed a fresh cloud row from local state
      }
      setRemoteSettled(true);
      // Catches the referred player who finished their first lesson in an earlier session,
      // and — the case nothing else covers — the REFERRER, whose diamonds depend on what a
      // friend did on a different device entirely.
      if (!cancelled) await claimReferralRewards();
    })();
    return () => { cancelled = true; };
  }, [hydrated, isSignedIn, userId, supabase, push, claimReferralRewards, setRemoteSettled]);

  // A finished lesson is the event claim_referral_activation is waiting for, so note it and
  // let the next successful upload trigger the check (see push). Counts real completions
  // rather than watching the whole state object, which changes on every coin.
  const lessonsDone =
    Object.values(state.moduleProgress).reduce((n, done) => n + done.length, 0)
    + state.completedLifeTaskIds.length;
  const lastLessonsDone = useRef(lessonsDone);
  useEffect(() => {
    if (lessonsDone > lastLessonsDone.current) referralCheckAfterPush.current = true;
    lastLessonsDone.current = lessonsDone;
  }, [lessonsDone]);

  // Debounced upload whenever local state changes (after the initial load).
  useEffect(() => {
    if (!ready.current || !isSignedIn || !userId) return;
    pending.current = state;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush(); }, DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [state, isSignedIn, userId, flush]);

  // Flush immediately when the app is backgrounded, and re-check referrals on the way back
  // in. Coming back to the foreground is the one moment a long-running session gets to learn
  // that a friend finished their first lesson while it was sitting idle.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') flush();
      else if (s === 'active' && ready.current) void claimReferralRewards();
    });
    return () => sub.remove();
  }, [flush, claimReferralRewards]);

  return null;
}
