import { useState, ReactNode } from 'react';
import { Pressable, View, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';
import { colors, font, radius } from '@/theme';
import { Txt } from './Txt';

type Variant = 'green' | 'pink' | 'dark' | 'ghost' | 'disabled';

const VARIANTS: Record<Variant, { bg: string; shadow: string; text: string; border?: string }> = {
  green: { bg: colors.green, shadow: colors.greenShadow, text: colors.white },
  pink: { bg: colors.pink, shadow: colors.pinkShadow, text: colors.white },
  dark: { bg: colors.dark, shadow: colors.darkShadow, text: colors.white },
  ghost: { bg: colors.white, shadow: colors.ghostShadow, text: colors.ghostText, border: colors.borderField },
  disabled: { bg: colors.disBg, shadow: colors.disShadow, text: colors.disText },
};

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
      android_ripple={{ color: 'transparent' }}
      style={[{ borderRadius: r, backgroundColor: v.shadow, paddingBottom: 4 }, style]}
    >
      <View
        style={[
          styles.inner,
          {
            height: h,
            borderRadius: r,
            backgroundColor: v.bg,
            borderWidth: v.border ? 1.5 : 0,
            borderColor: v.border,
            transform: [{ translateY: pressed ? 4 : 0 }],
          },
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
      </View>
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
