import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, font } from '@/theme';

type Variant = 'disp' | 'h1' | 'h2' | 'h3' | 'lead' | 'tiny' | 'body' | 'bold' | 'label';

export function Txt({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return (
    <Text
      {...rest}
      style={[styles[variant], color ? { color } : null, styles.noSelect, style]}
    />
  );
}

const styles = StyleSheet.create({
  disp: { fontFamily: font.display, fontSize: 30, lineHeight: 33, color: colors.ink },
  h1: { fontFamily: font.display, fontSize: 25, lineHeight: 29, color: colors.ink },
  h2: { fontFamily: font.display, fontSize: 19, color: colors.ink },
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
