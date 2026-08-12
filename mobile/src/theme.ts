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
 * (#E3E7F0), career a grey-lavender (#DCE0FA), and scams a tan-brown (#F5D9C8) invented to
 * fill in for `iconColor: 'rust'`, which has no matching CSS rule on the site itself. Lined
 * up next to each other on the Modules tab, a third of the curriculum looked switched off.
 *
 * The replacements over-corrected: they were mixed by hand in HSL, which meant nothing held
 * them to a common weight. Backgrounds landed anywhere from L 0.78 to L 0.90 with chroma from
 * 0.10 to 0.16 (OKLCH), so some modules shouted and others whispered on the same row. Career
 * was the worst of it at C 0.158 — the most saturated of the eleven, sitting at the yellow-
 * green hue where saturation goes bilious, which is what made it read as chartreuse.
 *
 * Both scales are generated in OKLCH now rather than mixed by hand, which is what keeps them
 * looking like one family and what keeps every pair legible (see `moduleColorText`). Eleven
 * distinct hues spread right around the wheel, weighted toward green (three of them) and
 * deliberately light on blue (two), so the set reads as a full range of color rather than a
 * ramp through one part of the spectrum.
 *
 * Two colors are ruled out, and both are failure modes of a hue rather than a hue itself:
 *
 *   - Chartreuse is high chroma at 110-135, so that band is empty. Loans sits at pure yellow
 *     (100) and is pinned light AND high-chroma (L 0.870 / C 0.145) — a yellow that gives up
 *     either one is a wheat, which is where it landed on an earlier pass.
 *   - Brown is simply orange at low lightness and low chroma, so risk and scams carry
 *     lightness floors (L 0.830 / 0.800). They are never allowed to go deep and muted the
 *     way a cooler hue safely can.
 *
 * The three greens — grass (148), jade (168), teal-green (190) — are only ~20 degrees apart,
 * which hue alone cannot carry at chip size. They separate by depth instead: jade is the light
 * one (L 0.858), grass sits mid (0.820), teal-green is the deep one (0.790).
 *
 * The eleven backgrounds are checked pairwise in OKLab; the closest pair is 0.047 apart
 * (spending/psychology), the widest separation of any revision of this palette so far.
 *
 * Regenerating: there is no single L/C to hold, so changing a hue means re-checking the
 * pairwise distances rather than trusting the hue number — the three greens are held apart by
 * lightness, and a nudge can quietly collapse one. Both scales must move together: foreground
 * lightness is solved per module against its own background to clear 4.6:1, so editing a
 * background silently invalidates its pair. And re-check the two exclusions above by their
 * L/C, not by eye on one screen — wheat and brown creep in through lightness, not hue. */
export const moduleColor: Record<string, string> = {
  earning: '#8FD99A',
  spending: '#FCA9C9',
  saving: '#5CD0C9',
  investing: '#D6B4FF',
  credit: '#82D7FF',
  risk: '#FFB480',
  loans: '#EBD659',
  taxes: '#AAB9FF',
  psychology: '#E8A8E1',
  career: '#8DE5C4',
  scams: '#FFA098',
};

/** Darker foreground paired with each `moduleColor` background — the module icon's glyph
 * color, never plain white on a light chip. Each one is its own hue taken down in lightness
 * rather than a shared grey, so the pair reads as one color at two weights.
 *
 * Generated at its background's own hue (OKLCH C 0.125). Lightness is not fixed across the
 * set: it's solved per module by walking L down from 0.48 until that specific pair clears
 * 4.6:1. That's what lets the backgrounds vary in depth — the jade and yellow chips are much
 * lighter than the teal-green one and get correspondingly lighter glyphs — without eleven
 * hand-tuned exceptions. Every pair lands between 4.60:1 and 4.66:1.
 *
 * Solving rather than fixing this is what makes the backgrounds free to move. Pinning
 * foreground lightness broke an earlier revision: one deeper chip came out at 4.17:1, below
 * AA, and nothing flagged it. The hand-mixed pairs further back ranged from 3.54:1
 * (psychology, scams) to 4.80:1 — the low end failing AA for the chip's number, which is 16px
 * and so not large text. */
export const moduleColorText: Record<string, string> = {
  earning: '#006022',
  spending: '#842E56',
  saving: '#025653',
  investing: '#633D89',
  credit: '#025C7B',
  risk: '#7F3F00',
  loans: '#685B02',
  taxes: '#3B4390',
  psychology: '#743170',
  career: '#00674D',
  scams: '#842928',
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
