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
import { useAuth } from '@clerk/clerk-expo';
import { useStore, type AppState } from '@/store';
import { makeSupabase } from './supabase';
import { mobileToWeb, webToMobile, type WebState } from './webState';

const DEBOUNCE_MS = 1500;

export function SupabaseSync() {
  const { isSignedIn, userId, getToken } = useAuth();
  const { state, hydrateFromRemote } = useStore();

  // Keep latest getToken/state/hydrate in refs so the Supabase client and callbacks are
  // stable (created once) yet always act on current values.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const stateRef = useRef(state);
  stateRef.current = state;
  const hydrateRef = useRef(hydrateFromRemote);
  hydrateRef.current = hydrateFromRemote;

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

  // Load remote on sign-in.
  useEffect(() => {
    ready.current = false;
    lastRemote.current = null;
    if (!isSignedIn || !userId) return;
    let cancelled = false;
    (async () => {
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
        await push(userId, stateRef.current); // seed a fresh cloud row from local state
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, userId, supabase, push]);

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
