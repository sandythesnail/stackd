import { useState, ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';
import { colors, font, radius } from '@/theme';
import { Txt } from './Txt';

type Variant = 'green' | 'pink' | 'dark' | 'ghost' | 'disabled';

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  green: { bg: colors.green, text: colors.white },
  pink: { bg: colors.pink, text: colors.white },
  dark: { bg: colors.dark, text: colors.white },
  ghost: { bg: colors.white, text: colors.ghostText, border: colors.borderField },
  disabled: { bg: colors.disBg, text: colors.disText },
};

/** Flat, single-color pill — matches the website's .quest-continue-fab.ready (solid fill,
 * no bezel/offset-shadow "3D press" layer). Pressed state just dims slightly instead of
 * shifting/revealing an underlayer. */
export function Button({
  label,
  onPress,
  variant = 'green',
  size = 'lg',
  style,
  left,
  disabled,
}: {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  size?: 'lg' | 'sm';
  style?: ViewStyle;
  left?: ReactNode;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const v = VARIANTS[disabled ? 'disabled' : variant];
  const r = size === 'sm' ? radius.md : radius.xl;
  const h = size === 'sm' ? 48 : 56;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.inner,
        {
          height: h,
          borderRadius: r,
          backgroundColor: v.bg,
          opacity: pressed ? 0.85 : 1,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
        },
        style,
      ]}
    >
      {left}
      <Txt
        style={{
          fontFamily: font.displayMed,
          fontSize: size === 'sm' ? 16 : 18,
          color: v.text,
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
});
