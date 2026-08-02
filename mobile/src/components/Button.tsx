import { ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { colors, font, radius } from '@/theme';
import { Txt } from './Txt';

type Variant = 'green' | 'pink' | 'dark' | 'ghost' | 'disabled';

/** Each variant carries the colour of the bezel it sits on as well as its own fill — the
 * "3D" is a solid slab of that darker colour showing below the face, so the two have to be
 * chosen together. These shadow tokens already existed in the theme for exactly this. */
const VARIANTS: Record<Variant, { bg: string; text: string; shadow: string; border?: string }> = {
  green: { bg: colors.green, text: colors.white, shadow: colors.greenShadow },
  pink: { bg: colors.pink, text: colors.white, shadow: colors.pinkShadow },
  dark: { bg: colors.dark, text: colors.white, shadow: colors.darkShadow },
  ghost: { bg: colors.white, text: colors.ghostText, shadow: colors.ghostShadow, border: colors.borderField },
  disabled: { bg: colors.disBg, text: colors.disText, shadow: colors.disShadow },
};

/** overshootClamping is the important part. A plain spring back to 0 sails PAST it, which
 * drives translateY negative — the face lifts clear of its bezel and the button appears to
 * pop up off the page before settling. Clamped, the face rises to its resting position and
 * stops there, so the release reads as the button returning rather than recoiling. */
const PRESS_SPRING = { damping: 20, stiffness: 460, overshootClamping: true };
/** How far the face sits above its bezel, and therefore how far it travels when pressed.
 * 3px, down from 5: the travel is meant to read as the button giving under a finger, and at 5
 * it was a visible drop — the face moved far enough that the eye tracked the movement instead
 * of registering the press. */
const DEPTH = { lg: 3, sm: 2.5 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Call sites pass a single `style` and shouldn't have to know this component is two layers,
 * so it gets split by what each key actually means for a button.
 *
 * Anything that positions or sizes the button as a whole — margins, self-alignment, width —
 * belongs to the wrapper, because the bezel is pinned to the wrapper's edges and has to end up
 * exactly as wide as the face. Padding is the exception: left on the wrapper it would inset
 * the face and leave a band of raw bezel colour showing down each side, so it goes to the face
 * and the wrapper simply hugs the result. */
const WRAPPER_KEYS = [
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical', 'alignSelf', 'flex', 'flexGrow', 'flexShrink',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
  'width', 'minWidth', 'maxWidth',
] as const;

function splitStyle(style: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const wrapper: Record<string, unknown> = {};
  const face: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if ((WRAPPER_KEYS as readonly string[]).includes(k)) wrapper[k] = v;
    else face[k] = v;
  }
  return { wrapper: wrapper as ViewStyle, face: face as ViewStyle };
}

/** The app's one CTA primitive — Continue, Next, Got it, Resume, chapter actions all route
 * through it, so what happens here happens on every button in the app.
 *
 * A face sitting on a solid darker bezel. Pressing drives the face down onto the bezel and
 * shrinks the bezel to nothing, so the button reads as being physically depressed rather than
 * just tinted; releasing springs it back up. Both channels are transform/opacity only, so the
 * whole thing runs on the UI thread and never touches layout — the wrapper reserves the full
 * height + DEPTH up front, so a press cannot move anything around it. */
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
  const press = useSharedValue(0);
  const v = VARIANTS[disabled ? 'disabled' : variant];
  const r = size === 'sm' ? radius.md : radius.xl;
  const h = size === 'sm' ? 48 : 56;
  const depth = DEPTH[size];
  const split = splitStyle(style);

  // The face rides down by `depth`; the bezel is revealed by the gap the face leaves above it,
  // so as the face descends the visible slab shrinks to zero at exactly the same rate.
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * depth }],
    opacity: 1 - press.value * 0.05,
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => { press.value = withTiming(1, { duration: 70 }); }}
      onPressOut={() => { press.value = withSpring(0, PRESS_SPRING); }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.wrapper, { height: h + depth }, split.wrapper]}
    >
      {/* The bezel. A full-height slab behind the face rather than a thin strip under it, so
          the rounded bottom corners stay solid at every point in the press. */}
      <Animated.View
        style={[styles.bezel, { borderRadius: r, backgroundColor: v.shadow }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.face,
          {
            height: h,
            borderRadius: r,
            backgroundColor: v.bg,
            borderWidth: v.border ? 1.5 : 0,
            borderColor: v.border,
          },
          split.face,
          faceStyle,
        ]}
      >
        {left}
        <Txt style={{ fontFamily: font.displayMed, fontSize: size === 'sm' ? 16 : 18, color: v.text }}>
          {label}
        </Txt>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Deliberately no alignSelf. Before this was two layers the button was a single Pressable,
  // so it inherited its parent's alignItems like any other flex child — which is how a button
  // in a full-width column stretched to fill it, and one inside an alignItems:'center' row
  // hugged its label. Pinning the wrapper to 'center' here broke the first case everywhere at
  // once: the error screen's "Try again"/"Go home" and the results screen's "Continue" all
  // collapsed to the width of their text. Leaving it `auto` restores the original behaviour
  // at every call site without any of them having to ask for it.
  wrapper: { justifyContent: 'flex-start' },
  bezel: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  face: {
    // stretch, so the face fills a wrapper that was given a width and the wrapper hugs the
    // face when it wasn't — either way the bezel pinned to the wrapper's edges lines up.
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
});
