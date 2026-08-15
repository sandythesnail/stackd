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

/** Module accent colours keyed by module id: a light chip background with a darker, same-hue
 * foreground for the number on it (see moduleColorText). Used on module icons, the lesson
 * path, and the Progress page's per-module chart, so these eleven values are what "a module
 * has a colour" means anywhere in the app.
 *
 * A RAINBOW IN MODULE ORDER, by request: 01 red, 02 orange, 03 yellow, 04 green, 05 blue,
 * 06 indigo, 07 violet, and 08-11 repeating red/orange/green/blue at a different depth. The
 * hues are fixed by hand in scripts/solve-module-colors.js; only lightness and chroma are
 * solved. Re-run it and paste both scales rather than hand-editing a value.
 *
 * Four constraints the solver holds, each of which was a real defect first:
 *
 *   - Colour blindness. Every pair is scored under deuteranope and protanope simulation
 *     (Vienot 1999) as well as normal vision, and must stay 0.045 apart in all three. This is
 *     the constraint that keeps biting: dichromacy discards hue and keeps LIGHTNESS, so the
 *     first hand-built version of this rainbow, with the four repeats all set to "same hue,
 *     lighter", put taxes and career 0.0046 apart for a green-blind student. The repeats have
 *     to differ in depth from each other, not only from the hue they repeat.
 *   - Visibility as a bare shape. A module colour is a hero border and a progress fill over
 *     colors.track, not only a backdrop for a glyph, so each is measured against white, cream
 *     AND track at 1.35:1. This is what caps yellow and yellow-green, which carry more
 *     luminance than any other hue at the same perceptual lightness.
 *   - Glyph contrast at 4.6:1, since the number on the chip is 16px and so not large text.
 *   - Reserved tokens at 0.09, so a chip can't be mistaken for colors.reward, the app-wide
 *     "come collect" gold. Module 03 is EXEMPT from this one and is the only exception in the
 *     set: yellow was asked for explicitly and no yellow exists that clears both reward
 *     (#F0C22E) and rewardBadgeBg (#FFEDB0). See RESERVED_EXEMPT in the solver for what that
 *     costs and how to undo it.
 *
 * Measured on this set: closest pair 0.0483 (risk/scams, deuteranopia), every chip clearing
 * 1.35:1 against the palest surface it is drawn on and 4.6:1 against its own number. */
export const moduleColor: Record<string, string> = {
  earning: '#F4BDB8',
  spending: '#E99355',
  saving: '#E5C95E',
  investing: '#8BD98D',
  credit: '#9AD1FF',
  risk: '#B5B2FF',
  loans: '#D9C0DE',
  taxes: '#DDAEA9',
  psychology: '#FAA468',
  career: '#7FC881',
  scams: '#8AB7DE',
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
  earning: '#913532',
  spending: '#5F2E00',
  saving: '#645301',
  investing: '#0F5F1C',
  credit: '#00588D',
  risk: '#473E8C',
  loans: '#743C81',
  taxes: '#822826',
  psychology: '#733801',
  career: '#005312',
  scams: '#004773',
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
