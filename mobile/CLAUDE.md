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
- `src/app/` routes:
  - `index.tsx` — splash (screen 1), auto-advances to onboarding.
  - `(onboarding)/` — welcome, signup, signin, piggy-born, survey (screens 2–6).
  - `(tabs)/` — home, modules, tools, room, shop (tabs) + progress, badges, settings (hidden tab siblings; the
    custom `TabBar` only renders the 5 known routes, so the bar persists on these). Screens 7–14.
  - `learn/` — module/[id], hook, lesson, quiz, results (screens 15–19); full-screen, no tab bar.
  - `modal/` — levelup, life-event, shop-item (screens 20–22); presented as transparent modals from the root Stack.

## Conventions
- Match the design tokens in `theme.ts` — don't hardcode hex values in screens.
- The mascot art is a placeholder (`Hammy`/`Slot`); swap for real art without changing layout.
- Verify with `npx tsc --noEmit` and `npx expo export -p ios` (bundles Metro, catches route/import errors).

## Run
- `npm run ios` / `npm run android` / `npm run web` (or `npx expo start`).
