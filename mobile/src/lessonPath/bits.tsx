/** Small text/bar/pill atoms used by the lesson path.
 *
 * Kept local to this folder rather than added to @/components: they are deliberately
 * thinner than the real Txt/ProgressBar/Tag (no variants, no tones, no theming surface) and
 * exist only to keep the path's own markup short. Anything that needs to look like the rest
 * of the app — cards, buttons, headers, badges — uses the real components instead.
 *
 * This began life in src/experiments/path/, which still holds its own copy so the sandbox
 * route can be changed without touching what Home renders.
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
