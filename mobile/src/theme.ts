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
  // True black. Only for text that has to be maximally legible on a pale tinted ground and
  // must not vary per module — see the survey's topic card, where eleven different inks read
  // as eleven different degrees of washed out.
  black: '#000000',
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
 * These are exactly the eleven values supplied, unmodified. An earlier revision darkened seven
 * of them so that every chip could carry a lighter number; that was reverted on request, and
 * the numbers are plain white instead (see moduleColorText, which documents what that costs).
 *
 * Two things follow from these particular values, both measured rather than assumed:
 *
 *   - The palette is LIGHT. Six of the eleven chips are too light for white text to reach AA,
 *     and four of those are too light even for the 3:1 large-text allowance. That is a
 *     property of the colours, not of the code, and no foreground can fix it.
 *   - saving (#A5DB01) and investing (#F9C000) sit 0.0190 apart under DEUTERANOPIA, against a
 *     0.045 floor, and three other pairs collapse the same way. Lime-yellow and amber are
 *     separated almost entirely by the red-green axis, which is exactly the axis green-
 *     blindness removes, so for roughly one man in twelve those two modules are the same
 *     colour. Both were specified, so both are kept and the pairs are recorded as known
 *     exceptions in the checker (ACCEPTED_COLLISIONS) rather than silently tolerated: any
 *     OTHER pair that collapses still fails the build.
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

/** The number drawn ON each chip: plain white, on all eleven, by request.
 *
 * One value for the whole set, which is the point — the numbers should look like one system
 * rather than eleven separately-solved foregrounds.
 *
 * WHAT THIS COSTS, measured against the supplied chips, since the code should not pretend
 * otherwise. White clears AA (4.5:1) on five of the eleven and falls short on six:
 *
 *     chip                white     verdict
 *     taxes      #6B0F7C  10.58     fine
 *     psychology #044B8B   8.81     fine
 *     risk       #AD2601   6.88     fine
 *     scams      #2B7350   5.72     fine
 *     loans      #E20372   4.68     fine
 *     earning    #3EA06D   3.25     under AA, clears the 3:1 large-text allowance
 *     credit     #F98800   2.46     under both
 *     spending   #66BF01   2.33     under both
 *     career     #3DB9E5   2.27     under both
 *     investing  #F9C000   1.67     under both - effectively unreadable
 *     saving     #A5DB01   1.65     under both - effectively unreadable
 *
 * The bottom four are light, saturated colours; nothing darker than white would help either,
 * since a mid-tone on lime is no better. The only fix is a darker chip, which was tried and
 * reverted. These are recorded in the checker as ACCEPTED_LOW_CONTRAST so the guard still
 * fires for any chip added or changed later — the exemption is a list, not a lowered floor.
 *
 * Nothing in the app depends on reading these numbers: each one sits beside its module's full
 * name everywhere it appears, so the number is decoration that repeats a label, not the label.
 * That is what makes this an acceptable trade rather than a broken screen. */
export const moduleColorText: Record<string, string> = {
  earning: '#FFFFFF',
  spending: '#FFFFFF',
  saving: '#FFFFFF',
  investing: '#FFFFFF',
  credit: '#FFFFFF',
  risk: '#FFFFFF',
  loans: '#FFFFFF',
  taxes: '#FFFFFF',
  psychology: '#FFFFFF',
  career: '#FFFFFF',
  scams: '#FFFFFF',
};

/** Readable INK for prose drawn on a module-coloured surface — a label, a name, a count.
 *
 * Not the same job as moduleColorText, which is the big display number and is plain white on
 * every chip by request. That works for a number precisely because a number is decoration:
 * it repeats the module name sitting next to it, so a faint one costs nothing. Actual words
 * have to be read, and white words on #A5DB01 are not readable by anyone.
 *
 * So this is solved per chip the way the numbers used to be: light where the chip is dark
 * enough to take a light tone, deep where it isn't, every pair clearing 4.6:1. The split
 * looks inconsistent listed out like this and is invisible in use — each value only ever
 * appears against its own chip. */
export const moduleColorInk: Record<string, string> = {
  earning: '#002D18',
  spending: '#224602',
  saving: '#445B12',
  investing: '#694F00',
  credit: '#5A2E00',
  risk: '#FFD2C7',
  loans: '#FFFFFF',
  taxes: '#F7CDFF',
  psychology: '#C7E1FF',
  career: '#00455A',
  scams: '#92FFC5',
};

/** The module's accent when it has to hold its own on a LIGHT surface: the lesson path's
 * nodes, drawn on cream, where the shape IS the colour — border, glyph and glow all.
 *
 * A third token because there are genuinely three jobs. moduleColorText is the number on the
 * chip (white). moduleColorInk is words on the chip (deep on pale chips, pale on deep ones).
 * Neither works here: white on cream is nothing at all, and ink's pale values — #F7CDFF for
 * taxes, #C7E1FF for psychology — are pale precisely BECAUSE their chip is dark, which makes
 * them the worst possible choice against cream.
 *
 * So: the supplied hue, walked down until it clears 4.5:1 on cream, chroma at the gamut edge.
 * Every one is recognisably its module's colour, just deep enough to be a line rather than a
 * suggestion of one. Six of the eleven barely move (taxes and psychology not at all); the
 * pale five come down a long way, which is unavoidable — a lime path node on cream is a lime
 * path node you cannot see. */
export const moduleColorDeep: Record<string, string> = {
  earning: '#00824F',
  spending: '#428002',
  saving: '#5C7B01',
  investing: '#8D6B00',
  credit: '#AB5C00',
  risk: '#AD2600',
  loans: '#CF2F6F',
  taxes: '#6E0080',
  psychology: '#004B8C',
  career: '#047A9C',
  scams: '#10764C',
};

/**
 * The module's colour when it is drawn as a BARE SHAPE rather than behind its number: the
 * Progress chart's columns, the module hero's border.
 *
 * Identical to `moduleColor` today, and kept as a separate export rather than folded away.
 * It exists because a shape only exists if it contrasts with what's under it, and an earlier
 * palette had two steps so pale (1.21 and 1.04 against the progress track, where 1.0 is
 * literally invisible) that they needed substitutes here.
 *
 * The current chips all clear the floor, but not by much: saving (#A5DB01) sits at 1.37
 * against the progress track, where the floor is 1.35. A lime progress fill on that track is
 * faint but present. If a paler palette ever lands, this is where it gets fixed. */
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

/** Kills the browser's own focus ring on a TextInput.
 *
 * On the web build a TextInput is a real <input>, so a focused field gets the user agent's
 * default outline — in Chrome a hard black rectangle, drawn OUTSIDE the field's own rounded
 * border, which reads as a black box slapped around the box you're typing in. Native has no
 * equivalent and ignores this.
 *
 * Only ever use it alongside a focus state of the app's own (see the fields in tools.tsx,
 * which deepen their border while focused). Removing the ring and putting nothing back leaves
 * a keyboard user with no way to see where they are. */
export const noFocusOutline = { outlineStyle: 'none', outlineWidth: 0 } as object;

/** Soft ambient card shadow. */
export const softShadow = {
  shadowColor: '#2C3E2D',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
