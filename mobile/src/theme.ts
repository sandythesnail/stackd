/**
 * Stacked design tokens — ported from the "Stackd Mobile UI System" Claude design.
 * Warm, encouraging, gamified. Fredoka for display, Nunito for body.
 */

export const colors = {
  // surfaces
  screen: '#FAF6ED', // cream app background
  card: '#FFFFFF',
  canvas: '#E4EBE0',

  // text
  ink: '#2C3E2D', // primary text / darkest green
  inkSoft: '#3C4E3D',

  // greens
  green: '#4F9D52',
  /** The website's own brand green — the exact `--green` in styles.css, the one the landing
   * page uses throughout. `green` above is the app's brighter UI green (buttons, links) and
   * stays as it is; this is for the surfaces that sit next to the site's identity rather than
   * inside the app's chrome: the launch screen and the progress ring. Those two read as
   * "Stacked" rather than "a screen in Stacked", and the brighter green looked like a
   * different product's. */
  greenBrand: '#6B8F65',
  greenDark: '#4A6844',
  greenDeep: '#2C3E2D',
  greenBright: '#84AB7B',
  greenSoft: '#B2C9AE',
  greenLeaf: '#5C7A56',
  // Exact hex behind the website's --green-pale (styles.css) — the equipped-item ring
  // color (box-shadow 0 0 0 3px var(--green-pale) in .shop-card.shop-equipped).
  greenPale: '#E0EAE0',

  // muted green text scale
  muted1: '#5C6E58',
  muted2: '#6E7E6B',
  muted3: '#7C8E78',
  muted4: '#8A9B86',
  muted5: '#9DAE99',
  muted6: '#A9B7A4',

  // pinks
  pink: '#E8688F',
  pinkDark: '#B5607A',
  pinkBright: '#FF96B8',
  pinkSoft: '#E39BB1',
  pinkBg: '#FBF0F3',
  pinkBg2: '#FBEEF2',
  pinkBg3: '#F6E2E9',
  pinkBorder: '#F2CDD7',
  pinkBorder2: '#EEBACB',
  pinkText: '#8A4E5E',

  // currency
  coinLight: '#FFE79B',
  coin: '#F3B33C',
  coinBorder: '#E0961B',
  diamondLight: '#9BDCF3',
  diamond: '#46A8D6',
  diamondBorder: '#3792bd',
  flameLight: '#FFB03A',
  flame: '#F26D3D',

  // borders
  border: '#EEF2EA',
  borderCool: '#EAF0E8',
  borderField: '#E4EDE0',
  borderOpt: '#E9EFE5',

  // progress tracks
  track: '#E7ECE3',
  track2: '#E2E9DC',

  // locked
  lockBg: '#F3F1EA',
  lockBorder: '#E8E4D9',
  lockText: '#A39D8F',
  lockIcon: '#C4C0B4',

  // buttons
  greenShadow: '#4A6844',
  pinkShadow: '#B5607A',
  dark: '#2C3E2D',
  darkShadow: '#1C281D',
  ghostText: '#5C7A56',
  ghostShadow: '#DCE6D7',
  disBg: '#DFE6DA',
  disText: '#A9B7A4',
  disShadow: '#CFD9C9',

  // tags
  tagGreenBg: '#EAF3E7',
  tagGreenText: '#4A6844',
  tagPinkBg: '#FBEEF2',
  tagPinkText: '#B5607A',
  tagLockBg: '#EFEDE6',
  tagLockText: '#9C9686',
  tagWarmBg: '#FFF3E4',
  tagWarmText: '#C9622A',
  warmBorder: '#FBE1C2',

  // status
  danger: '#C25A5A',
  dangerBg: '#FBEDED',
  dangerSoft: '#D08A8A',
  // Dark enough to read as body text on dangerBg — `danger` itself is a fill/border weight
  // and goes muddy at 12px on a pale pink card (Tools' "cost of waiting" comparison).
  dangerDeep: '#8A2F2F',

  // reward / "come collect" highlight (streak claim, recommended module) — ported from
  // the website's #F0C22E yellow (hs-card-reward / module-row.recommended in app.css).
  reward: '#F0C22E',
  rewardBg: '#FFF9E6',
  rewardBadgeBg: '#FFEDB0',
  rewardBadgeText: '#8A6800',

  // callout
  calloutBg: '#FBF0F3',
  calloutBorder: '#F2CDD7',
  calloutText: '#8A4E5E',

  white: '#FFFFFF',
  cream: '#FAF6ED',
} as const;

/** Module accent colors keyed by module id: a light chip background with a darker, same-hue
 * foreground for the icon glyph/text (see `moduleColorText` below). Used on module icons,
 * the lesson path, and the Progress page's per-module chart, so these eleven values are what
 * "a module has a color" means anywhere in the app.
 *
 * These were ported from the website's `.mod-icon.<color>` pairs, which were pale and
 * desaturated, and three of the eleven weren't really colors at all: taxes was a blue-grey
 * (#E3E7F0), career a grey-lavender (#DCE0FA), and scams a tan-brown (#F5D9C8). Lined up next
 * to each other on the Modules tab, a third of the curriculum looked switched off.
 *
 * The replacements over-corrected: they were mixed by hand in HSL, which meant nothing held
 * them to a common weight. Backgrounds landed anywhere from L 0.78 to L 0.90 with chroma from
 * 0.10 to 0.16 (OKLCH), so some modules shouted and others whispered on the same row.
 *
 * Both scales are solved now rather than mixed, by `scripts/solve-module-colors.js`. Hues are
 * chosen by hand; the solver anneals lightness and chroma to maximise the SMALLEST pairwise
 * distance in the set, which is the number that decides whether two modules look alike. Run it
 * to regenerate, and paste both scales — the values below are its output, not hand-edits.
 *
 * Four constraints it solves against, each of which was a real defect first:
 *
 *   - Reserved tokens. `colors.reward` (#F0C22E) means "come collect / recommended" app-wide,
 *     and the Modules tab draws the recommended row with a reward border, a rewardBg head and
 *     a gold tag. A yellow Loans chip once sat 0.0485 from it — inside the set's own tolerance
 *     — so a module mimicked the "start here" affordance. Nothing yellow can be safe here:
 *     reward, coin (#F3B33C) and flameLight (#FFB03A) occupy hue 72-94, and chartreuse starts
 *     at 110, leaving no window. So there is no yellow module, and the solver scores distance
 *     to those tokens, not just module-to-module.
 *   - Color blindness. Hues that separate cleanly for normal vision collapse under dichromacy:
 *     an earlier revision put investing and taxes 0.0031 apart under protanopia — the same
 *     color. Every pair is now scored under deuteranope and protanope simulation (Viénot 1999)
 *     as well as normal vision, and lightness spread is what pulls them apart, since dichromacy
 *     preserves lightness.
 *   - Visibility as a bare shape. These are not always behind a glyph: `learn/module/[id].tsx`
 *     uses `mod.color` as a hero border and a progress fill over `colors.track`, and the
 *     Progress chart fills columns with it. So each is scored against white, cream AND track,
 *     not just against its own foreground.
 *   - Brown and chartreuse. Both are failure modes of a hue, not hues: brown is orange gone
 *     dark and dull, chartreuse is yellow-green gone saturated. The 110-135 band is left empty
 *     and the warm hues carry chroma floors.
 *
 * PASTEL, by request, and getting there took changing the hues rather than the palette.
 *
 * The previous set crowded the green end (career 168, loans 178, saving 192 — ten degrees
 * between two of them) and paid for it out of lightness, because the only way to separate
 * near-identical hues, especially under dichromacy, is to make one deep and one pale. That
 * spend is exactly the budget pastel needs. Asking the old hues to go pale failed every time:
 * bounded to a genuinely pastel band, the best solution put loans and saving 0.0243 apart
 * under protanopia — the same colour for a red-blind student — against a 0.045 floor.
 *
 * Two other approaches failed less obviously, which is worth recording so they aren't retried:
 * tightening the solver's L/C bounds to a pastel band changed the set's mean lightness by
 * +0.004 (the old objective maximised separation, so it ran to the edges of any band it was
 * given), and making "lighter and softer" a direction rather than a target produced dusty
 * greys — psychology came out #B293AC. Cute pastels are light AND still coloured, which is a
 * point in the space, not a corner.
 *
 * So the hues are respaced about 25-30 degrees apart around the whole wheel, separation comes
 * from hue, and lightness is free. Mean chroma 0.112 -> 0.094, mean lightness 0.777 -> 0.787.
 * The cost: saving moved teal -> sky and career jade -> sage.
 *
 * Measured on this set: closest pair 0.0536 (investing/psychology) for normal vision, 0.0482
 * under deuteranopia, 0.0480 under protanopia, and every chip clears 1.35:1 against the palest
 * surface it is drawn on and 4.6:1 against its own glyph. */
export const moduleColor: Record<string, string> = {
  earning: '#9CD88F',
  spending: '#E3A0BD',
  saving: '#7AC8DB',
  investing: '#B597E9',
  credit: '#98D0FF',
  risk: '#EA9F79',
  loans: '#87D9D3',
  taxes: '#A3B6F9',
  psychology: '#C793C8',
  career: '#7ABA9E',
  scams: '#FFB7B8',
};

/** Darker foreground paired with each `moduleColor` background — the module icon's glyph
 * color, never plain white on a light chip. Each one is its own hue taken down in lightness
 * rather than a shared grey, so the pair reads as one color at two weights.
 *
 * Generated at its background's own hue, targeting OKLCH C 0.125 — but that target is only
 * advisory, because five of the eleven cannot reach it at the lightness they need and are
 * clipped to the sRGB gamut boundary instead (loans tops out at 0.064, saving 0.072, career
 * 0.082, credit 0.088, risk 0.100). Don't "restore" those to 0.125; it is not a color that
 * exists at those coordinates, and forcing it costs the pair its contrast.
 *
 * Lightness is not fixed across the set. It's solved per module by walking L down until that
 * specific pair clears 4.6:1, which is what lets the backgrounds vary in depth — they span
 * L 0.720 to 0.837 — without eleven hand-tuned exceptions. Every pair lands between 4.60:1
 * and 4.70:1.
 *
 * Solving rather than pinning is what makes the backgrounds free to move at all. An earlier
 * revision fixed one foreground lightness for the whole set; the single chip that had been
 * deepened came out at 4.17:1, below AA, and nothing flagged it. */
export const moduleColorText: Record<string, string> = {
  earning: '#225F12',
  spending: '#782450',
  saving: '#025261',
  investing: '#482873',
  credit: '#00588D',
  risk: '#702F00',
  loans: '#005E5A',
  taxes: '#33408B',
  psychology: '#5C1E5F',
  career: '#014933',
  scams: '#91343D',
};

export const font = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  displayMed: 'Fredoka_500Medium',
  displayReg: 'Fredoka_400Regular',
  reg: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extra: 'Nunito_800ExtraBold',
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 18,
  xl: 20,
  card: 24,
  pill: 24,
  round: 999,
} as const;

export const space = (n: number) => n * 4;

/** Every TextInput needs this in its style.
 *
 * The root layout declares `userSelect: 'none'` for the whole app (see _layout.tsx) so that
 * tapping ordinary UI — a card, a question, Hammy — can't start a text selection and leave a
 * blinking caret behind. user-select inherits, so on the web build a field would otherwise
 * inherit `none` and you couldn't select, drag or copy the text you just typed into it. This
 * puts a real input back to normal; it's a no-op on native, which has no such inheritance. */
export const selectableInput = { userSelect: 'text' } as object;

/** Soft ambient card shadow. */
export const softShadow = {
  shadowColor: '#2C3E2D',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
