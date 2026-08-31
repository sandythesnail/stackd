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
  site's hosted widget on web (`webAuth.tsx` redirects to /login.html). Native SSO needs two
  separate things true on the Clerk instance, and they fail at the same call with different
  errors: the provider must have an **SSO connection** at all, and the app's **redirect URL**
  (`stackd://`, or the `exp://…` one under Expo Go) must be on the allowed list.
  `npm run check:sso` asks Clerk about both, for every provider in `socialAuth.tsx`'s
  `PROVIDERS` (it reads that array rather than hardcoding a list, which is how Apple shipped
  broken while the check kept passing on Google and Microsoft). **Apple is currently NOT enabled
  on the instance**, so its button errors on every tap — see `APP_STORE.md` section 7, and note
  that guideline 4.8 is why the button exists, so this blocks iOS submission.
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
- The native app is a **development build** (`expo-dev-client`), not Expo Go — the custom
  `stackd://` scheme that native SSO redirects to is the app's own, and Expo Go cannot own it.
  `eas.json`'s `development` profile has always declared `developmentClient: true`; the package
  itself was missing until it was added, which is what made the crash below possible.
- A debug build carries **no embedded JS** — it fetches the bundle from Metro every launch
  (`AppDelegate.bundleURL()` is `RCTBundleURLProvider` under `#if DEBUG`, and
  `main.jsbundle` from the app bundle otherwise). If that resolves to nothing, React Native
  dies on the spot with `No script URL provided … unsanitizedScriptURLString = (null)`.
  Social sign-in is where this surfaces, because the provider round-trip is the only flow that
  backgrounds the app long enough for iOS to reclaim it and then cold-launch it on the redirect
  — a launch with no Xcode and no packager host behind it. `expo-dev-client` is what makes that
  survivable: it remembers the dev server and shows a reload screen instead of `RCTFatal`.
- Adding or removing a native module means rebuilding: `npx expo run:ios` on a Mac
  (the `ios/` and `android/` folders are generated and gitignored — this repo is developed on
  Windows, so they do not exist here). Testing SSO without a packager at all needs a release
  build, which embeds `main.jsbundle`.
