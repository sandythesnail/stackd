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
 * Both scales are generated now, not mixed: every background is OKLCH L 0.855 / C 0.072 and
 * every foreground L 0.45 / C 0.115, varying only in hue. Uniform lightness is the thing that
 * makes them look like one family — no module can out-shout another when they all carry the
 * same perceptual weight — and the low chroma is what makes them pastel. Career keeps its hue
 * slot (123, the widest-spaced place left on the wheel); at this chroma that hue is a soft
 * sage, not chartreuse. Psychology moved 345 -> 330 because it and spending (356) were 11
 * degrees apart, easily the closest pair in the set and the one place two modules genuinely
 * looked alike.
 *
 * Regenerating: hold the four L/C values fixed and change only a hue, or every module drifts
 * off the shared weight and the family breaks. Both scales must move together — the pairs are
 * built to clear 4.5:1 (see `moduleColorText`), and lightening a background alone would push
 * its chip toward invisible on the white cards these sit on. */
export const moduleColor: Record<string, string> = {
  earning: '#ACDEB9',
  spending: '#F7BCD1',
  saving: '#98DFD6',
  investing: '#D5C6F9',
  credit: '#A3D7F9',
  risk: '#F6C3A4',
  loans: '#DFCF9A',
  taxes: '#BFCDFF',
  psychology: '#EBBFE6',
  career: '#C6D8A4',
  scams: '#FBBDBC',
};

/** Darker foreground paired with each `moduleColor` background — the module icon's glyph
 * color, never plain white on a light chip. Each one is its own hue taken down in lightness
 * rather than a shared grey, so the pair reads as one color at two weights.
 *
 * Generated at the same hue as its background (OKLCH L 0.45 / C 0.115), which is what keeps
 * every pair at 4.6:1 or better. The hand-mixed pairs these replace ranged from 3.54:1
 * (psychology, scams) to 4.80:1 — the low end failed AA for the chip's number, which is
 * 16px and so not large text. Softening the backgrounds raised the whole range rather than
 * lowering it: a paler chip gives a dark glyph more to push against, not less. */
export const moduleColorText: Record<string, string> = {
  earning: '#026735',
  spending: '#853557',
  saving: '#00635C',
  investing: '#5F448B',
  credit: '#015C84',
  risk: '#853F01',
  loans: '#675300',
  taxes: '#404F94',
  psychology: '#783A73',
  career: '#4A5E01',
  scams: '#8A363A',
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
