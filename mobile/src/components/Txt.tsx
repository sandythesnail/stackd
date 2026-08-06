import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { colors, font } from '@/theme';

type Variant = 'disp' | 'h1' | 'h2' | 'h3' | 'lead' | 'tiny' | 'body' | 'bold' | 'label';

/** Headings default to balanced wrapping — see the `balance` prop. */
const HEADING_VARIANTS = new Set<Variant>(['disp', 'h1', 'h2', 'h3']);

export function Txt({
  variant = 'body',
  color,
  style,
  balance,
  maxFontSizeMultiplier = 1.3,
  ...rest
}: TextProps & {
  variant?: Variant;
  color?: string;
  /** Evens out the line lengths instead of filling each line before wrapping, so a heading
   * can't end on a dangling word or two (`text-wrap: balance`).
   *
   * Defaults ON for the heading variants and off elsewhere; pass it explicitly for a heading
   * that doesn't use a variant (results.tsx's lesson title is one — 32px display type, and
   * the longest real titles run 65 characters, which is where this looked worst).
   *
   * Implemented as a data attribute matched by a rule in the global stylesheet (_layout.tsx)
   * rather than a style key, because react-native-web filters style props against its own
   * supported list and `textWrap` isn't on it — it would be dropped silently. Web-only;
   * `dataSet` is a react-native-web prop, hence the Platform guard. Widows are prevented
   * app-wide by `text-wrap: pretty` in that same stylesheet, so this is the stronger
   * treatment for headings, not the only line of defence. */
  balance?: boolean;
  /** Ceiling on the OS text-size setting's effect (iOS Dynamic Type, Android font size),
   * defaulting to 1.3 for every piece of text in the app.
   *
   * Not `allowFontScaling={false}` — that would pin the app at one size and ignore the
   * setting entirely, which is the actual accessibility failure. A cap keeps the first
   * several Dynamic Type steps working and only refuses the extremes.
   *
   * It's needed because the app has controls whose box is a fixed number of pixels while
   * their label is text, and text that outgrows those boxes is clipped rather than scrolled:
   * `Button`'s face is a hard 48/56px tall (Button.tsx) and every CTA in the app is one, the
   * quest player's chapter counter sits in a 38px-wide slot and its hint pill in a 30px-tall
   * one with numberOfLines={1}. Chapter CONTENT is free to grow — it all scrolls now (see
   * chapterFill in learn/quest.tsx) — so this cap exists for the chrome, not the prose.
   *
   * Override per call site where a box really can grow with its text. */
  maxFontSizeMultiplier?: number;
}) {
  const shouldBalance = balance ?? HEADING_VARIANTS.has(variant);
  const webProps = Platform.OS === 'web' && shouldBalance ? { dataSet: { balance: 'true' } } : null;
  return (
    <Text
      {...rest}
      {...webProps}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[styles[variant], color ? { color } : null, styles.noSelect, style]}
    />
  );
}

const styles = StyleSheet.create({
  disp: { fontFamily: font.display, fontSize: 30, lineHeight: 33, color: colors.ink },
  h1: { fontFamily: font.display, fontSize: 25, lineHeight: 29, color: colors.ink },
  // lineHeight set explicitly, like disp/h1/lead. Without one, a wrapped h2 fell back to the
  // font's own default leading, which Fredoka and react-native-web resolve differently — so a
  // two-line chapter title (every chapter in the quest player is an h2) sat at a different
  // height on the /m web build than in the native app. 25 is the same ~1.32 ratio h1 uses.
  h2: { fontFamily: font.display, fontSize: 19, lineHeight: 25, color: colors.ink },
  h3: { fontFamily: font.displayMed, fontSize: 16, color: colors.ink },
  lead: { fontFamily: font.semi, fontSize: 15, lineHeight: 22, color: colors.muted2 },
  tiny: { fontFamily: font.bold, fontSize: 12, color: colors.muted5 },
  body: { fontFamily: font.semi, fontSize: 15, color: colors.ink },
  bold: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  label: {
    fontFamily: font.extra,
    fontSize: 12.5,
    color: colors.muted3,
    letterSpacing: 0.3,
  },
  // react-native-web's <Text> is natively selectable unless told otherwise — every screen
  // here left it at the browser default, so tapping any static line of copy on a phone
  // browser (this app runs through the web build, see m-redirect.js) triggered the OS's
  // native text-selection UI: a blinking caret + selection handles right in the middle of
  // the sentence, which is the "cursor blinking on some of the text near Hammy" bug.
  // `userSelect: 'none'` opts every Txt out of that (web-only; RN itself ignores style keys
  // it doesn't know), matching how a native app's text isn't selectable by default either.
  // Placed BEFORE `style` in the array above so a caller can still opt back in if some
  // screen ever legitimately wants selectable text.
  noSelect: { userSelect: 'none' } as object,
});
