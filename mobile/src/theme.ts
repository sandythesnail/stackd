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
 * Two things follow from these particular values, both measured rather than assumed:
 *
 *   - Five chips take WHITE numbers and six take a deep same-hue tone. #6B0F7C and #044B8B
 *     are dark enough that no darker text can clear 4.6:1 against them, and #A5DB01 is light
 *     enough that white cannot. The pairing is solved per chip, not fixed for the set.
 *   - saving (#A5DB01) and investing (#F9C000) sit 0.0190 apart under DEUTERANOPIA, against a
 *     0.045 floor. Lime-yellow and amber are separated almost entirely by the red-green axis,
 *     which is exactly the axis green-blindness removes, so for roughly one man in twelve
 *     those two modules are the same colour. Both were specified, so both are kept and the
 *     pair is recorded as a known exception in the checker (ACCEPTED_COLLISIONS) rather than
 *     silently tolerated: any OTHER pair that collapses still fails the build. Nudging either
 *     hue about 15 degrees apart would clear it if that trade is ever worth making.
 *
 * scripts/solve-module-colors.js no longer generates these, it only checks them. Its solver
 * is kept because it is what can build a fresh palette if this one is ever replaced. */
export const moduleColor: Record<string, string> = {
  earning: '#3EA06D',
  spending: '#66BF01',
  saving: '#A5DB01',
  investing: '#F9C000',
  credit: '#F98800',
  risk: '#AD2601',
  loans: '#E20372',
  taxes: '#6B0F7C',
  psychology: '#044B8B',
  career: '#3DB9E5',
  scams: '#2B7350',
};

/** The number drawn ON each `moduleColor` chip, solved per module for 4.6:1 against it.
 *
 * Not "a darker version of the background" any more, because the ramp's first three chips are
 * genuinely dark (L 0.46 and below) and no darker green clears 4.6:1 against them — those get
 * white. The rest keep a deep same-hue green. Every pair lands between 4.61:1 and 4.66:1.
 *
 * Solving rather than pinning is what makes the backgrounds free to move at all. An earlier
 * revision fixed one foreground lightness for the whole set; the single chip that had been
 * deepened came out at 4.17:1, below AA, and nothing flagged it. */
export const moduleColorText: Record<string, string> = {
  earning: '#002D18',
  spending: '#224602',
  saving: '#445B12',
  investing: '#694F00',
  credit: '#5A2E00',
  risk: '#FFFFFF',
  loans: '#FFFFFF',
  taxes: '#FFFFFF',
  psychology: '#FFFFFF',
  career: '#00455A',
  scams: '#FFFFFF',
};

/**
 * The module's colour when it is drawn as a BARE SHAPE rather than behind its number: the
 * Progress chart's columns, the module hero's border.
 *
 * Same value as `moduleColor` for nine of the eleven. The two palest steps of the ramp are
 * substituted, because a shape only exists if it contrasts with what's under it: #C7DDB5 sits
 * at 1.21 against the progress track and #DDEAD1 at 1.04, where 1.0 is literally invisible.
 * A 4%-complete bar in the palest green would be a bar you cannot see at all.
 *
 * Substituting only where it matters keeps the chips themselves exactly as specified — the
 * ramp you see on the Modules tab is the ramp that was asked for, top to bottom. */
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
