# Stackd Mobile

Expo Router + TypeScript app for **Stackd** — a gamified financial-literacy app (Duolingo-style,
pig mascot "Hammy"). This is the **mobile** app (Zain owns mobile; Sandra owns the web app in the
repo root). Ported from the Claude design "Stackd Mobile App UI System" (22 screens).

## Stack
- Expo SDK 57, Expo Router (file-based, `src/app`), React Native 0.86, React 19, TypeScript (strict).
- Fonts: **Fredoka** (display) + **Nunito** (body) via `@expo-google-fonts/*`, loaded in the root layout.
- `expo-linear-gradient` (gradients/currency tokens), `react-native-svg` (progress ring), `@expo/vector-icons`.
- Path alias `@/*` → `src/*`.

## Layout
- `src/theme.ts` — all design tokens (colors, `moduleColor`, `font` families, radii). Start here.
- `src/data.ts` — mock content (user Maya, 11 modules, badges, shop, quests). Swap for Supabase/web content later.
- `src/components/` — shared UI, re-exported from `src/components/index.ts`. Import via `@/components`.
  Key pieces: `Screen`, `Header`/`TierBadge`/`CurrencyChip`, `Button` (3D press), `Card`, `ProgressBar`,
  `Tag`, `Option`, `Field`, `Hammy`/`Slot` (mascot placeholder), `TabBar` (custom 5-tab bar), `bits`, `ModuleBits`.
- `src/lib/` — **auth + cloud sync** (Clerk + Supabase), mirroring the web's `app-auth.js`. Keys come
  from `EXPO_PUBLIC_*` in `.env` (`.env.example` is the template); `env.authEnabled` is false until the
  Clerk key is set, and while false the whole layer stays dormant — the app runs local-only (AsyncStorage),
  exactly as before, so a missing key never breaks it. `webState.ts` does the translate+merge between
  mobile `AppState` and the web's canonical `user_progress.state` blob (web = source of truth; web-only
  fields preserved on write, mobile-only stashed under `_mobile`). `SupabaseSync.tsx` (mounted only when
  `authEnabled`) loads on sign-in, debounced-upserts on change, flushes on background. Same Clerk instance
  + Supabase project as the web (trystacked.app) → cross-device sync. Real Clerk sign-in/up live in
  `(onboarding)/signin|signup` (stub fallback when disabled); real sign-out + account in Settings.
  Apple/Google/Microsoft SSO is `socialAuth.tsx` on native (a Clerk browser round-trip) and the
  site's hosted widget on web (`webAuth.tsx` redirects to /login.html). Native SSO additionally needs
  the app's redirect URL (`stackd://`, or the `exp://…` one under Expo Go) added to the
  Clerk instance's allowed redirect URLs — `npm run check:sso` asks Clerk and prints what it accepts.
  The instance requires a username at sign-up that the mobile forms don't collect, so
  `clerkSignUp.ts` derives one from the email; both flows react to Clerk's `missingFields` /
  `unverifiedFields` rather than assuming a dashboard setting (email verification is currently OFF,
  and there are no second factors).
- `src/app/` routes:
  - `index.tsx` — splash (screen 1), auto-advances to onboarding.
  - `(onboarding)/` — welcome, signup, signin, reset-password, piggy-born, survey (screens 2–6).
    Sign-in's "Forgot password?" goes to `reset-password` (Clerk `reset_password_email_code`);
    a successful reset returns a complete sign-in, so it ends signed in rather than back at the form.
  - `(tabs)/` — home, modules, tools, room, shop (tabs) + progress, badges, settings (hidden tab siblings; the
    custom `TabBar` only renders the 5 known routes, so the bar persists on these). Screens 7–14.
  - `learn/` — module/[id], hook, lesson, quiz, results (screens 15–19); full-screen, no tab bar.
  - `modal/` — levelup, life-event, shop-item (screens 20–22); presented as transparent modals from the root Stack.

## Conventions
- Match the design tokens in `theme.ts` — don't hardcode hex values in screens.
- The mascot art is a placeholder (`Hammy`/`Slot`); swap for real art without changing layout.
- Verify with `npx tsc --noEmit` and `npx expo export -p ios` (bundles Metro, catches route/import errors).
- `npm run check` (offline route/colour guards); `npm run check:sso` separately — it hits production Clerk.

## Run
- `npm run ios` / `npm run android` / `npm run web` (or `npx expo start`).
