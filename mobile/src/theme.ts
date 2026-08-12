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
 * looking like one family and what keeps every pair legible (see `moduleColorText`). The set
 * is deliberately cool-weighted: six of the eleven sit in the teal-to-violet arc, with a
 * single true pink (spending) and two warm accents (risk, scams) so it doesn't go monochrome.
 *
 * Nothing sits in the yellow/yellow-green region any more. Loans was a wheat (hue 93) and
 * career a sage (123); both are gone, to a steel blue and a slate teal. That vacates roughly
 * a hundred degrees of the wheel, so what's left is packed tighter than hue alone can carry —
 * hence two other axes doing real work:
 *
 *   - Chroma: career sits at C 0.045, a quarter of the others. Low chroma IS what makes it
 *     read as slate rather than as another teal next to saving.
 *   - Lightness: loans (L 0.775) against credit (L 0.850). They're 7 degrees apart in hue, so
 *     depth is the whole distinction — which is also just true of steel versus sky.
 *
 * The eleven backgrounds are checked pairwise in OKLab; the closest pair is 0.044 apart
 * (investing/taxes), up from 0.030 in the palette this replaces.
 *
 * Regenerating: this is no longer one L/C for everything, so changing a hue means re-checking
 * the pairwise distances rather than trusting the hue number — the tight pairs above are held
 * apart by lightness and chroma, and a hue nudge can quietly collapse one. Both scales must
 * move together: foreground lightness is solved per module against its own background to clear
 * 4.6:1, so a background edit silently invalidates its pair. */
export const moduleColor: Record<string, string> = {
  earning: '#8DD39B',
  spending: '#F6A8C8',
  saving: '#6ED9C2',
  investing: '#C3B2FD',
  credit: '#A2D4FF',
  risk: '#FEB290',
  loans: '#88BDE0',
  taxes: '#A7BDFF',
  psychology: '#DDADE5',
  career: '#A7D2D1',
  scams: '#F6A39C',
};

/** Darker foreground paired with each `moduleColor` background — the module icon's glyph
 * color, never plain white on a light chip. Each one is its own hue taken down in lightness
 * rather than a shared grey, so the pair reads as one color at two weights.
 *
 * Generated at its background's own hue (OKLCH C 0.125, or 0.062 for career so the slate stays
 * slate at both weights). Lightness is not fixed across the set: it's solved per module by
 * walking L down from 0.46 until that specific pair clears 4.6:1. That's what lets the
 * backgrounds vary in depth — loans is the deepest chip and so gets the deepest glyph, without
 * eleven hand-tuned exceptions. Every pair now lands between 4.61:1 and 4.74:1.
 *
 * The hand-mixed pairs two revisions back ranged from 3.54:1 (psychology, scams) to 4.80:1 —
 * the low end failed AA for the chip's number, which is 16px and so not large text. */
export const moduleColorText: Record<string, string> = {
  earning: '#015C27',
  spending: '#822D57',
  saving: '#015C4E',
  investing: '#523B89',
  credit: '#015B91',
  risk: '#883601',
  loans: '#014A6D',
  taxes: '#354792',
  psychology: '#6E3478',
  career: '#1E5C5C',
  scams: '#822826',
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
