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
import { useStore, type AppState } from '@/store';
import { makeSupabase } from './supabase';
import { notify } from './confirm';
import { recordPendingReferral } from './referral';
import { mobileToWeb, webToMobile, type WebState } from './webState';

const DEBOUNCE_MS = 1500;
/** Which account wrote the device-global AsyncStorage snapshot — see the owner check. */
const OWNER_KEY = 'stackd_state_owner_v1';

/** Paid to a player who signed up through someone's referral link, once they finish a lesson.
 * Must match referrals.sql's own +15 — the function credits the coins into user_progress
 * server-side and returns `claimed: true`; this constant is only the local mirror of that. */
const REFERRAL_ACTIVATION_COINS = 15;

/** What the two referral RPCs return (jsonb). Both are idempotent and authoritative: once a
 * referral is marked paid, later calls report nothing to claim. */
type ActivationResult = { claimed?: boolean; reason?: string } | null;
type ReferrerResult = { diamonds?: number } | null;

export function SupabaseSync() {
  const { isSignedIn, userId, getToken } = useAuth();
  const { state, hydrated, hydrateFromRemote, resetForAccountSwitch, creditReferralReward } = useStore();

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
          notify('Welcome aboard!', `+${REFERRAL_ACTIVATION_COINS} coins for joining through a friend's link.`);
        }

        const { data: owed, error: owedErr } = await supabase.rpc('claim_referrer_rewards');
        if (owedErr) {
          console.warn('[referral] referrer check failed:', owedErr.message);
        } else {
          const diamonds = (owed as ReferrerResult)?.diamonds ?? 0;
          if (diamonds > 0) {
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
      if (owner !== userId) {
        localState = resetRef.current();
        await AsyncStorage.setItem(OWNER_KEY, userId);
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
        return; // leave ready=false so we don't overwrite the cloud with local defaults
      }
      if (data?.state) {
        lastRemote.current = data.state as WebState;
        hydrateRef.current(webToMobile(data.state as WebState));
        ready.current = true;
      } else {
        ready.current = true;
        await push(userId, localState); // seed a fresh cloud row from local state
      }
      // Catches the referred player who finished their first lesson in an earlier session,
      // and — the case nothing else covers — the REFERRER, whose diamonds depend on what a
      // friend did on a different device entirely.
      if (!cancelled) await claimReferralRewards();
    })();
    return () => { cancelled = true; };
  }, [hydrated, isSignedIn, userId, supabase, push, claimReferralRewards]);

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
