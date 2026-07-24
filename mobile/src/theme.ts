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

/** Module accent colors keyed by module id — vivid/saturated versions of the ORIGINAL pastel
 * hue for each module (sage green, pink, mint, lavender, sky blue, peach, amber, slate,
 * rose, periwinkle, terracotta), per direct request to revert off two brighter but
 * hue-reassigned passes (a purple cluster, then a straight ROYGBIV spread) back to the
 * original palette's own identity, just more saturated instead of pastel. */
export const moduleColor: Record<string, string> = {
  earning: '#4CAF50', // was pastel sage green
  spending: '#EC6B94', // was pastel pink
  saving: '#2DD4BF', // was pastel mint
  investing: '#9B5DE0', // was pastel lavender
  credit: '#3FA9F5', // was pastel sky blue
  risk: '#FF9F5A', // was pastel peach
  loans: '#FFD23F', // was pastel amber
  taxes: '#7686B8', // was pastel slate
  psychology: '#E362A8', // was pastel rose
  career: '#7C86E3', // was pastel periwinkle
  scams: '#E8875A', // was pastel terracotta
};

/** Darker foreground paired with each `moduleColor` background — the module icon's text
 * color on the website (never plain white on the pale chip). */
export const moduleColorText: Record<string, string> = {
  earning: '#2D6B2F',
  spending: '#99275A',
  saving: '#0F7A6C',
  investing: '#5B21B6',
  credit: '#1D5FA8',
  risk: '#A34E1E',
  loans: '#8A6800',
  taxes: '#3C4A73',
  psychology: '#8F2D6B',
  career: '#3138A0',
  scams: '#8A4A1A',
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

/** Soft ambient card shadow. */
export const softShadow = {
  shadowColor: '#2C3E2D',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
