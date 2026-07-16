/**
 * Public/publishable config for auth + cloud sync, read from EXPO_PUBLIC_* env vars
 * (see mobile/.env). These point at the SAME Clerk instance + Supabase project as the
 * web app, so a user signed into the same account shares the web's user_progress row.
 *
 * `authEnabled` is false until the Clerk key is filled in — in that case the app runs
 * exactly as before (local-only, no sign-in gate), so a missing key never breaks it.
 */
export const env = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

/** True only when all three public keys are present — gates Clerk auth + Supabase sync. */
export const authEnabled = Boolean(
  env.clerkPublishableKey && env.supabaseUrl && env.supabaseAnonKey,
);
