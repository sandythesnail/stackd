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

/**
 * Which of the three are actually missing, by their real variable names.
 *
 * This exists because of how the keys reach a BUILD, which is not how they reach a dev
 * machine. `mobile/.env` is gitignored (deliberately — it is not committed), and EAS Build
 * uploads the project honouring .gitignore, so a cloud build does not receive that file at
 * all. Unless the same three variables exist as EAS environment variables for the profile
 * being built, `authEnabled` comes out FALSE in the shipped app — while every local run,
 * where .env is right there on disk, works perfectly. "Sign-in works on my machine and is
 * broken in TestFlight" is the exact shape of that mistake, and nothing in the app used to
 * say so: the sign-in screen quietly fell back to a local stub.
 *
 * Named rather than counted so the screen that reports this can print the variable to go
 * and set. See scripts/check-build-env.js and eas.json.
 */
export const missingAuthKeys: string[] = [
  ['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', env.clerkPublishableKey],
  ['EXPO_PUBLIC_SUPABASE_URL', env.supabaseUrl],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', env.supabaseAnonKey],
].filter(([, value]) => !value).map(([name]) => name);
