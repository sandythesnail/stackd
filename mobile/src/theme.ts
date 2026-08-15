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

/** Module accent colours keyed by module id: the chip a module wears everywhere, with its
 * number drawn on top in moduleColorText.
 *
 * Eleven saturated hues, ten supplied directly and the eleventh a deeper version of the first
 * so the set closes on the green it opens with. Vivid rather than pastel by choice.
 *
 * Every HUE here is the supplied one, unrotated. What moved is depth, and it moved because of
 * the one rule the numbers now follow: every number is a lighter tint of its own chip. A chip
 * can only carry a lighter number if it is dark enough for one to be legible, and five of the
 * supplied colours were nowhere near — white itself reaches only 1.65:1 on #A5DB01 lime and
 * 1.67:1 on #F9C000 amber, against the 4.5:1 that text needs.
 *
 * The depths are solved jointly rather than hue by hue, which matters more than it sounds.
 * Darkening each colour as little as it individually needs collapses the palette: five of the
 * eleven hues sit in the yellow-green quadrant and were separated mostly BY lightness, so
 * pushing them into one dark band put spending and saving 0.031 apart in normal vision — the
 * same colour to everyone, not just to a dichromat. Solving all eleven together spreads them
 * back out along depth instead, so saving lands deep (#344800) while investing stays mid
 * (#8E6C01). The closest pair in normal vision is now earning/scams at 0.0492, which is the
 * pair that is meant to be close: scams is the deeper reprise of earning's green.
 *
 * Under DEUTERANOPIA and PROTANOPIA three pairs still fall under the floor — saving/risk at
 * 0.0445, spending/investing at 0.0449, spending/credit at 0.0355. The first two are a hair
 * under and the third is real. All three are recorded in the checker (ACCEPTED_COLLISIONS)
 * rather than silently tolerated; any OTHER pair that collapses still fails the build.
 *
 * scripts/solve-module-colors.js no longer generates these, it only checks them. Its solver
 * is kept because it is what can build a fresh palette if this one is ever replaced. */
export const moduleColor: Record<string, string> = {
  earning: '#00814E',
  spending: '#346700',
  saving: '#344800',
  investing: '#8E6C01',
  credit: '#944E00',
  risk: '#861B00',
  loans: '#DD016F',
  taxes: '#640075',
  psychology: '#004A8C',
  career: '#007A9C',
  scams: '#1C714B',
};

/** The number drawn ON each chip: always a LIGHTER tint of that chip's own hue.
 *
 * One rule for all eleven, which is what makes the Modules tab read as a set rather than as two
 * groups — an earlier revision had five deep numbers and six pale ones, split by which chips
 * happened to be light, and the inconsistency showed.
 *
 * Each tint is solved per chip: the most saturated light tone of the same hue that still clears
 * 4.6:1. That is why they are not all the same value and none of them is plain white — a number
 * on the green chip is faintly green, on the magenta faintly pink, and the deepest chips
 * (#344800, #346700) have enough headroom to carry a properly green number rather than a wash.
 * The ones that look nearly white (#FFF9EC on investing, #FFF7F9 on loans) are the chips with
 * the least room left, where the contrast budget is spent before much hue can be mixed back in.
 *
 * Solved per chip rather than pinned for the set: an earlier revision fixed one foreground
 * lightness for everything and one chip came out at 4.17:1, below AA, with nothing to flag it. */
export const moduleColorText: Record<string, string> = {
  earning: '#E3FFED',
  spending: '#B3EB92',
  saving: '#C3E786',
  investing: '#FFF9EC',
  credit: '#FFD6B8',
  risk: '#FFC9BC',
  loans: '#FFF7F9',
  taxes: '#F5C3FF',
  psychology: '#BCDBFF',
  career: '#F3FBFF',
  scams: '#8DFAC0',
};

/**
 * The module's colour when it is drawn as a BARE SHAPE rather than behind its number: the
 * Progress chart's columns, the module hero's border.
 *
 * Identical to `moduleColor` today, and kept as a separate export rather than folded away.
 * It exists because a shape only exists if it contrasts with what's under it, and an earlier
 * palette had two steps so pale (1.21 and 1.04 against the progress track, where 1.0 is
 * literally invisible) that they needed substitutes here. The current chips are all deep
 * enough to draw themselves — the weakest is 3.98:1 against the lightest surface — so nothing
 * is substituted. If a paler palette ever lands, this is where it gets fixed. */
export const moduleColorSolid: Record<string, string> = { ...moduleColor };

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
