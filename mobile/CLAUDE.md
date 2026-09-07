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
- `src/theme.ts` — all design tokens (colors, `moduleColor`, `font` families, radii, **`motion`**).
  Start here. `motion` is the app's shared answer to "how hard may this move": `press`, `pop`,
  `settle`, `enter` (Reanimated), `legacySettle`/`legacyDrag` (classic `Animated.spring`, where
  low `friction` is what "bouncy" means) and `mascotReaction`, the scalar every Hammy reaction
  keyframe is multiplied by. Springs may overshoot once; they may not oscillate. Don't write
  spring numbers into a screen, the same way you don't write a hex there.
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
  **Keys reach a BUILD differently from how they reach a laptop, and this is the first thing to
  check when sign-in works locally and not in TestFlight.** `.env` is gitignored, and EAS Build
  honours .gitignore when it uploads the project — so a cloud build gets nothing from it unless
  the same three variables exist as EAS environment variables. `npm run check:build-env` reports
  both sides and `-- --push` copies .env up (all three are publishable by design and end up in
  the bundle regardless). A build that lost them used to fall back to the *development* sign-in
  stub, whose Sign in button navigates rather than authenticating — an app with no accounts that
  looks like it works. The stub is now `__DEV__`-only; a release build shows
  `lib/AuthUnavailable.tsx`, which names the missing variables on screen.
  Apple/Google/Microsoft SSO is `socialAuth.tsx` on native and the site's hosted widget on web
  (`webAuth.tsx` redirects to /login.html). **Apple on iOS uses the system sheet**
  (`expo-apple-authentication` → Clerk's `oauth_token_apple`), not the browser round-trip the
  other two take. That is not polish: the OAuth round-trip gets an email address out of Apple
  only on the FIRST authorization of an app, and this instance requires one — so the button
  worked once per device and then failed forever with a sign-up stuck in
  `missing_requirements`, recoverable only by revoking Stacked in iOS Settings. An identity
  token carries the email claim every time. It also removes the redirect URL from Apple's path
  entirely and never backgrounds the app. Android, and any device where the native sheet isn't
  available, fall back to the round-trip, which is why `check:sso` still checks all three. Native SSO needs two
  separate things true on the Clerk instance, and they fail at the same call with different
  errors: the provider must have an **SSO connection** at all, and the app's **redirect URL**
  (`stackd://`, or the `exp://…` one under Expo Go) must be on the allowed list. **And a
  third, which is not Clerk's at all: the provider has to accept the credentials Clerk holds.**
  Clerk does not validate an OAuth client when you paste it in, so a Services ID / OAuth client
  that was never finished passes both Clerk-side checks and fails on the phone behind an error
  page in a browser sheet.
  `npm run check:sso` now tests all three, for every provider in `socialAuth.tsx`'s `PROVIDERS`
  (it reads that array rather than hardcoding a list, which is how Apple shipped broken while
  the check kept passing on Google and Microsoft). All three are enabled and `stackd://` is
  authorized; **Apple currently FAILS the third stage** — `appleid.apple.com` answers
  `invalid_client` for the Services ID `app.trystacked.signin`, the same answer it gives for a
  Services ID that doesn't exist. That breaks the browser round-trip for Apple everywhere it is
  still used (Android, and the website's hosted widget), and it is fixed in the Apple Developer
  portal, not here: the Services ID must exist, have Sign in with Apple enabled, be tied to the
  primary App ID `app.trystacked.mobile`, and list `https://clerk.trystacked.app/v1/oauth_callback`
  as a Return URL. iOS no longer depends on it — see the native Apple path below — but that path
  needs the app's bundle identifier registered on the Clerk Apple connection instead — which
  is a field the dashboard may not expose, so `socialAuth.tsx` treats the native sheet as an
  optimisation and falls back to the round-trip if Clerk refuses the token. Probed directly:
  `oauth_token_apple` IS an allowed strategy on this instance (a disallowed one answers
  `form_param_value_invalid`, this one answers `form_param_missing` for a missing token), but
  every token rejection comes back as a flat `authorization_invalid` whatever the cause, so
  whether the bundle ID is accepted cannot be established without shipping a build.
  The instance requires BOTH a username and a password at sign-up that the mobile forms don't
  collect for every path, so `clerkSignUp.ts`'s `fillMissingSignUpFields` supplies whatever
  Clerk's `missingFields` actually asks for: a username derived from the email (either flow),
  and a generated password (OAuth only — the email form types its own). Password is the one
  that makes SSO fail rather than degrade: a provider transfer supplies none, so the sign-up
  sits in `missing_requirements` with no session and the round trip ends signed out. Both
  flows react to `missingFields` / `unverifiedFields` rather than assuming a dashboard setting
  (email verification is currently OFF, and there are no second factors). Two outcomes the
  provider round-trip can reach that no amount of retrying fixes, and both now say so:
  `email_address` still missing (Apple releases one only if the user agrees to share it, so
  "Hide My Email" declined leaves the sign-up with none), and an existing Stacked account
  already holding that address (`form_identifier_exists` on the transfer — sign in with the
  password once and the identity links). Every other SSO failure is reported with Clerk's own
  error CODE appended (`clerkErrorWithCode`), because this is the one flow whose cause is
  invisible from the outside and the person hitting it is usually reporting rather than fixing.
- **Never read the SSO nonce with `URL.searchParams`.** The native round-trip comes back as
  `stackd://?rotating_token_nonce=…`, and a query string is parsed per spec as
  application/x-www-form-urlencoded — in which `+` means SPACE. A base64 nonce containing a
  literal `+` therefore comes back corrupted, from a fully correct implementation, with no
  error (verified against `whatwg-url-minimum`, which expo/winter installs over React Native's
  at startup). Clerk answers the resulting reload with HTTP 401 `signed_out` / "You are signed
  out" — shown on a sign-in screen, to someone who has just signed in successfully. An EMPTY
  nonce is accepted and returns `needs_identifier`, so the two failures don't even look alike,
  and since whether a nonce contains `+` is a coin flip per attempt it presents as one provider
  working and another not. `socialAuth.tsx`'s `readNonce` takes the value with a regex and
  decodeURIComponent instead.
  Read off the live instance rather than assumed, for the record: `email_address`, `username`
  and `password` are all enabled AND required, `verify_at_sign_up` is false for email, there
  are no second factors, and `single_session_mode` is on. The instance also lists
  `oauth_token_apple` among its first factors — that is Clerk's NATIVE Sign in with Apple
  strategy (hand it a credential from the system sheet instead of a browser round-trip), which
  needs `expo-apple-authentication` and therefore a rebuild, but is the flow Apple's own
  guidelines expect on iOS and takes the redirect URL out of the picture entirely.
- **Onboarding belongs to the account, not the device.** The survey → hammy-intro → spotlight
  tour chain is gated on `hasCompletedOnboarding` / `onboardingTrackId` / `hasSeenOnboardingTour`,
  which live in the device-global AsyncStorage snapshot. Every sign-up path therefore used to
  skip the whole chain for a new account created on a phone that had onboarded once — no survey,
  so no track and no recommendations anywhere afterwards. Creating an account now calls the
  store's `startOnboardingForNewAccount()` and routes to the survey unconditionally;
  `lib/onboarded.ts` is only for Home's tour gate and the splash. Distinct from
  `resetForAccountSwitch()`, which is for a DIFFERENT account signing in and wipes everything.
- **The spotlight tour publishes THREE contexts, not one** (`OnboardingTour.tsx`): `useTourApi`
  (stable callbacks — free to subscribe to), `useTourStep` (which step is live — six changes a
  tour), `useTourRect` (the measured target, changes constantly; only Home needs it, to compute
  its scroll delta). `useOnboardingTour()` merges all three and therefore re-renders on every
  measurement — prefer the narrow hooks. This is not tidiness: a changed context re-renders its
  consumers regardless of React Compiler, `React.memo` or stable props, so with one context a
  measurement re-rendered every `TourTarget`, the lesson path and its nine animated nodes, on
  the exact frames Home was animating a scroll. The tooltip is also moved by `transform` under
  `useNativeDriver: true` rather than by animating `top`/`left`, which cannot leave the JS thread.
- `src/app/` routes:
  - `index.tsx` — splash (screen 1), auto-advances to onboarding.
  - `(onboarding)/` — welcome, signup, signin, reset-password, piggy-born, survey (screens 2–6).
    Sign-in's "Forgot password?" goes to `reset-password` (Clerk `reset_password_email_code`);
    a successful reset returns a complete sign-in, so it ends signed in rather than back at the form.
  - `(tabs)/` — home, modules, tools, room, shop (tabs) + progress, badges, settings (hidden tab siblings; the
    custom `TabBar` only renders the 5 known routes, so the bar persists on these). Screens 7–14.
  - `learn/` — module/[id], hook, lesson, quiz, results (screens 15–19); full-screen, no tab bar.
    **Nothing in this group is left by swiping.** `gestureEnabled: false` is set on the inner
    stack AND on the root layout's `learn` screen — when the player is the first screen of the
    inner stack there is nothing there to pop, so the iOS edge-swipe falls through to the parent
    and takes the whole group with it. The myth-card chapter is swipe-left/swipe-right by design,
    which is exactly what was being read as "go back". Android's hardware Back is routed through
    the same "Leave this lesson?" dialog as the X (a `BackHandler` in `quest.tsx`).
  - `modal/` — levelup, life-event, shop-item (screens 20–22); presented as transparent modals from the root Stack.
- **A scroller with a button bar under it uses `FadingScroll`, not `ScrollView`.** Both fixed-
  column screens (the quest player and the survey) hide the native scroll indicator, so content
  that overflows is cut off dead flat against the same cream as the bar below it, with nothing
  distinguishing "this is the end" from "there are two more options under this line".
  `FadingScroll` fades its bottom edge while there is more below; it is a cue, never a movement
  — the quest player's auto-scroll-on-growth was tried and reverted for yanking the page
  mid-read, and the note explaining that is still in `quest.tsx`.
- **The survey's last step keeps the track list under your finger.** Everything above that list
  changes height when you switch track (the hero blurb is per-track, the path is three modules
  or four), so picking one from the bottom of the screen used to slide the row you just tapped
  off the bottom of the scroller. It now notes the list's offset before the switch and scrolls
  by the delta afterwards, so the page appears not to move at all. The per-module scale steps
  scroll too, rather than trusting that they "fit any phone" — the failure mode when that is
  wrong is content with no way to reach it.

## Conventions
- Match the design tokens in `theme.ts` — don't hardcode hex values in screens.
- Any screen with a `TextInput` scrolls inside `KeyboardAwareScroll` (`@/components`), not a
  bare `ScrollView`. The auth forms are `flexGrow: 1` with a `<Spacer/>`, so their content is
  exactly screen height and the keyboard covered the lower third with nothing scrollable to
  reach it — `automaticallyAdjustKeyboardInsets` is what makes the focused field reachable.
- The mascot art is a placeholder (`Hammy`/`Slot`); swap for real art without changing layout.
- Verify with `npx tsc --noEmit` and `npx expo export -p ios` (bundles Metro, catches route/import errors).
- `npm run check` (offline route/colour guards). Separately, because they hit the network:
  `npm run check:sso` (production Clerk — providers enabled + redirect allowed) and
  `npm run check:build-env` (are the EXPO_PUBLIC_* keys where a *build* can see them).

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
