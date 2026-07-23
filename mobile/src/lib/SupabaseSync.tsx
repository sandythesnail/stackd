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
import { mobileToWeb, webToMobile, type WebState } from './webState';

const DEBOUNCE_MS = 1500;
/** Which account wrote the device-global AsyncStorage snapshot — see the owner check. */
const OWNER_KEY = 'stackd_state_owner_v1';

export function SupabaseSync() {
  const { isSignedIn, userId, getToken } = useAuth();
  const { state, hydrated, hydrateFromRemote, resetForAccountSwitch } = useStore();

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

  const supabase = useMemo(() => makeSupabase(() => getTokenRef.current()), []);

  const lastRemote = useRef<WebState | null>(null);
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<AppState | null>(null);

  const push = useMemo(
    () => async (uid: string, s: AppState) => {
      const blob = mobileToWeb(s, lastRemote.current);
      lastRemote.current = blob;
      const { error } = await supabase.from('user_progress').upsert({ clerk_user_id: uid, state: blob });
      if (error) console.warn('[sync] upload failed:', error.message);
    },
    [supabase],
  );

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
    })();
    return () => { cancelled = true; };
  }, [hydrated, isSignedIn, userId, supabase, push]);

  // Debounced upload whenever local state changes (after the initial load).
  useEffect(() => {
    if (!ready.current || !isSignedIn || !userId) return;
    pending.current = state;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush(); }, DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [state, isSignedIn, userId, flush]);

  // Flush immediately when the app is backgrounded.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') flush();
    });
    return () => sub.remove();
  }, [flush]);

  return null;
}
