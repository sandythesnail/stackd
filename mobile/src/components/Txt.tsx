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
      style={[styles[variant], color ? { color } : null, style]}
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
});
