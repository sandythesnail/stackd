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
  broken while the check kept passing on Google and Microsoft). All three providers are now
  enabled on the instance and `stackd://` is authorized — check:sso passes 3/3, so a dead SSO
  button is no longer a dashboard problem and should be diagnosed as a build one (see Run).
  The instance requires BOTH a username and a password at sign-up that the mobile forms don't
  collect for every path, so `clerkSignUp.ts`'s `fillMissingSignUpFields` supplies whatever
  Clerk's `missingFields` actually asks for: a username derived from the email (either flow),
  and a generated password (OAuth only — the email form types its own). Password is the one
  that makes SSO fail rather than degrade: a provider transfer supplies none, so the sign-up
  sits in `missing_requirements` with no session and the round trip ends signed out. Both
  flows react to `missingFields` / `unverifiedFields` rather than assuming a dashboard setting
  (email verification is currently OFF, and there are no second factors).
- **Onboarding belongs to the account, not the device.** The survey → hammy-intro → spotlight
  tour chain is gated on `hasCompletedOnboarding` / `onboardingTrackId` / `hasSeenOnboardingTour`,
  which live in the device-global AsyncStorage snapshot. Every sign-up path therefore used to
  skip the whole chain for a new account created on a phone that had onboarded once — no survey,
  so no track and no recommendations anywhere afterwards. Creating an account now calls the
  store's `startOnboardingForNewAccount()` and routes to the survey unconditionally;
  `lib/onboarded.ts` is only for Home's tour gate and the splash. Distinct from
  `resetForAccountSwitch()`, which is for a DIFFERENT account signing in and wipes everything.
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
- Any screen with a `TextInput` scrolls inside `KeyboardAwareScroll` (`@/components`), not a
  bare `ScrollView`. The auth forms are `flexGrow: 1` with a `<Spacer/>`, so their content is
  exactly screen height and the keyboard covered the lower third with nothing scrollable to
  reach it — `automaticallyAdjustKeyboardInsets` is what makes the focused field reachable.
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
- **A blank Hammy face is a build symptom, not a layout one.** The face overlays are the only
  bitmaps the app draws (icons and the mascot itself are all vector), and they go through
  react-native-svg's native `<Image>`, so a stale native module or an asset the packager isn't
  serving takes out every face and nothing else. `Hammy.tsx` now falls back to the default
  drawn face if an overlay hasn't reported `onLoad` within `FACE_DRAW_TIMEOUT_MS`, so the
  failure reads as "wrong expression" rather than "no face at all" — but the fix is a rebuild.
- Adding or removing a native module means rebuilding: `npx expo run:ios` on a Mac
  (the `ios/` and `android/` folders are generated and gitignored — this repo is developed on
  Windows, so they do not exist here). Testing SSO without a packager at all needs a release
  build, which embeds `main.jsbundle`.
