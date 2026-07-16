/**
 * Supabase client for the mobile app, created the same way the web app does in
 * app-auth.js: the Clerk session token is passed as the Supabase access token, so the
 * project's RLS (which trusts the Clerk JWT) authorizes reads/writes for the signed-in
 * user. This is the native Clerk↔Supabase integration — no separate Supabase auth.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import type { WebState } from './webState';

/** One row of the shared `user_progress` table (same table the web reads/writes). */
export type UserProgressRow = {
  clerk_user_id: string;
  state: WebState;
};

/**
 * Build a Supabase client whose every request carries the current Clerk token.
 * `getToken` comes from Clerk's `useAuth()` on mobile.
 */
export function makeSupabase(getToken: () => Promise<string | null>): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    accessToken: async () => (await getToken()) ?? null,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
