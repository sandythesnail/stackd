/** Self-contained atoms for the /experiments/path prototype.
 *
 * Deliberately NOT imported from @/components. The brief was to copy rather than import, so
 * that iterating on this screen can never reach back into a production component. These are
 * intentionally thinner than their real counterparts — just enough to build one screen.
 *
 * The exception is Hammy (imported, not copied) and the design tokens in @/theme (imported).
 * Hammy is a 37KB procedurally-drawn SVG coupled to bundled face assets; duplicating him
 * would fork the mascot, and the brief explicitly asks to use the variants that exist. He's
 * only ever read here, never modified. Tokens are values, not components — copying them
 * would guarantee this screen drifts out of the design system, which is the opposite of
 * what "use my existing tokens" asks for.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { colors, font } from '@/theme';

export function T({
  children, style, weight = 'body', size = 14, color = colors.ink, numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  weight?: 'body' | 'bold' | 'extra' | 'display' | 'displayMed';
  size?: number;
  color?: string;
  numberOfLines?: number;
}) {
  const family = {
    body: font.semi, bold: font.bold, extra: font.extra,
    display: font.display, displayMed: font.displayMed,
  }[weight];
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: family, fontSize: size, color }, style]}>
      {children}
    </Text>
  );
}

/** Flat progress bar. */
export function Bar({ value, tint, height = 7 }: { value: number; tint: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.barTrack, { height, borderRadius: height }]}>
      <View style={{ width: `${pct * 100}%`, backgroundColor: tint, height: '100%', borderRadius: height }} />
    </View>
  );
}

export function Pill({ label, bg, fg, style }: { label: string; bg: string; fg: string; style?: ViewStyle }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <T weight="extra" size={10.5} color={fg} style={{ letterSpacing: 0.4 }}>{label}</T>
    </View>
  );
}

/** Honours the OS / browser reduced-motion setting.
 *
 * react-native-web backs `isReduceMotionEnabled` with the `prefers-reduced-motion` media
 * query and fires `reduceMotionChanged` when it flips, so this covers the browser case the
 * brief asks about without adding a dependency or a web-only code path. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduced(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduced(!!v));
    return () => {
      alive = false;
      // RN >= 0.65 returns a subscription; guard anyway since this also runs under RNW.
      (sub as { remove?: () => void } | undefined)?.remove?.();
    };
  }, []);
  return reduced;
}

const styles = StyleSheet.create({
  barTrack: { backgroundColor: colors.track, overflow: 'hidden', width: '100%' },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
});
