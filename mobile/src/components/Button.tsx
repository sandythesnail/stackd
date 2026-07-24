import { useState, ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
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

const PRESS_SPRING = { damping: 16, stiffness: 380 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Flat, single-color pill — matches the website's .quest-continue-fab.ready (solid fill,
 * no bezel/offset-shadow "3D press" layer). Pressed state dims slightly AND scales down
 * (spring back on release) — this is the one shared primitive nearly every CTA in the app
 * routes through (Resume, chapter actions, etc.), so this single animation covers "every
 * button" rather than needing a bespoke one per screen. */
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const v = VARIANTS[disabled ? 'disabled' : variant];
  const r = size === 'sm' ? radius.md : radius.xl;
  const h = size === 'sm' ? 48 : 56;

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => { setPressed(true); scale.value = withSpring(0.96, PRESS_SPRING); }}
      onPressOut={() => { setPressed(false); scale.value = withSpring(1, PRESS_SPRING); }}
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
        animatedStyle,
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
    </AnimatedPressable>
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
