/** Visual-effects layer for the /experiments/path prototype: the desktop phone shell, the
 * ambient backdrop, and the reusable motion pieces. All self-contained; nothing here is
 * imported by the production app. */
import { useEffect, type ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay,
  cancelAnimation, interpolate, Easing, type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

/** The design target from the brief. Also the inner screen size of the phone shell. */
export const PHONE_W = 390;
export const PHONE_H = 844;
/** Below this the page IS a phone (or a device-toolbar viewport), so the shell would just be
 * a bezel drawn around a bezel — go edge to edge instead. */
const FRAME_BREAKPOINT = 760;

/** Renders the experiment inside a phone on a desktop-sized window, and full-bleed on a
 * narrow one. On a wide window the old version was a 390px column of cream floating in more
 * cream, which gave the eye no edge to read the layout against — the whole point of a
 * mobile-first design is lost if you can't see where the screen stops. */
export function DeviceFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const framed = width >= FRAME_BREAKPOINT;

  if (!framed) return <View style={styles.bleed}>{children}</View>;

  // Shrink to fit short windows rather than letting the phone run off the bottom.
  const scale = Math.min(1, (height - 40) / (PHONE_H + 26));

  return (
    <View style={styles.stage}>
      <LinearGradient
        colors={['#2B3A2C', '#1B261C']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.phone, { transform: [{ scale }] }]}>
        <View style={styles.screen}>{children}</View>
        {/* Notch + side buttons: cheap, but they're what make the eye read "phone" instead
            of "rounded box", and that reading is the entire job of this shell. */}
        <View pointerEvents="none" style={styles.notch} />
        <View pointerEvents="none" style={[styles.btn, { top: 132, left: -3, height: 58 }]} />
        <View pointerEvents="none" style={[styles.btn, { top: 210, left: -3, height: 58 }]} />
        <View pointerEvents="none" style={[styles.btn, { top: 168, right: -3, height: 86 }]} />
      </View>
    </View>
  );
}

/** Soft moving colour behind the whole path.
 *
 * Three oversized, very low-opacity pastel discs drifting at different rates as you scroll.
 * Deliberately under 10% opacity — this is meant to register as the page having depth, not
 * as decoration you notice. Parallax comes off the same scroll value the peeking mascots
 * use, so everything ambient moves as one system. */
export function AmbientBackdrop({ scrollY }: { scrollY: SharedValue<number> }) {
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollY.value * 0.06 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollY.value * 0.11 }] }));
  const c = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollY.value * 0.04 }] }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[colors.screen, '#F3F6EE', '#EFF4F2']}
        style={StyleSheet.absoluteFill}
      />
      <Reanimated.View style={[styles.blob, { top: 120, left: -110, backgroundColor: colors.greenSoft }, a]} />
      <Reanimated.View style={[styles.blob, { top: 620, right: -130, backgroundColor: colors.pinkBorder }, b]} />
      <Reanimated.View style={[styles.blob, { top: 1180, left: -90, backgroundColor: '#C8E4F5' }, c]} />
    </View>
  );
}

/** A slow diagonal highlight sweeping across a card, on a long pause between passes.
 * Every ~4.5s, not continuously — a card that shines all the time reads as a loading
 * skeleton. */
export function Sheen({ width, reducedMotion }: { width: number; reducedMotion: boolean }) {
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reducedMotion) return;
    x.value = withRepeat(
      withDelay(1200, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    );
    return () => cancelAnimation(x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(x.value, [-1, 1], [-width * 0.6, width * 1.1]) },
      { rotate: '18deg' },
    ],
    opacity: interpolate(x.value, [-1, -0.5, 0, 0.5, 1], [0, 0.5, 0.7, 0.5, 0]),
  }));

  if (reducedMotion) return null;
  return (
    <Reanimated.View pointerEvents="none" style={[styles.sheenWrap, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: 74, height: '100%' }}
      />
    </Reanimated.View>
  );
}

/** A dot running the last stretch of trail into the recommended node, on a loop.
 *
 * The recommended node already glows; this points AT it from the direction of travel, so
 * the eye is led along the path rather than just landing somewhere bright. Plain Views on a
 * straight interpolation between the two node centres — close enough to the curve over one
 * segment, and it avoids animating SVG path properties, which is the fragile part of doing
 * this on the web build. */
export function TrailComet({
  from, to, reducedMotion,
}: { from: { x: number; y: number }; to: { x: number; y: number }; reducedMotion: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }), -1, false);
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const dot = (lag: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const p = Math.max(0, Math.min(1, t.value - lag));
      return {
        transform: [
          { translateX: interpolate(p, [0, 1], [from.x, to.x]) - 5 },
          { translateY: interpolate(p, [0, 1], [from.y, to.y]) - 5 },
          { scale: interpolate(p, [0, 0.5, 1], [0.5, 1, 0.4]) },
        ],
        opacity: p <= 0 || p >= 1 ? 0 : interpolate(p, [0, 0.25, 0.8, 1], [0, 1, 1, 0]),
      };
    });

  const d0 = dot(0);
  const d1 = dot(0.14);
  const d2 = dot(0.28);

  if (reducedMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Reanimated.View style={[styles.comet, d0]} />
      <Reanimated.View style={[styles.comet, styles.cometFaint, d1]} />
      <Reanimated.View style={[styles.comet, styles.cometFaint, d2]} />
    </View>
  );
}

/** Three little diamonds drifting up out of a finished module. */
export function Sparkles({ reducedMotion }: { reducedMotion: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const spark = (lag: number, dx: number, size: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const p = (t.value + lag) % 1;
      return {
        transform: [
          { translateX: dx + interpolate(p, [0, 1], [0, dx > 0 ? 6 : -6]) },
          { translateY: interpolate(p, [0, 1], [8, -26]) },
          { rotate: '45deg' },
          { scale: interpolate(p, [0, 0.3, 1], [0.4, 1, 0.5]) },
        ],
        opacity: interpolate(p, [0, 0.2, 0.7, 1], [0, 0.95, 0.7, 0]),
        width: size,
        height: size,
      };
    });

  const s0 = spark(0, -13, 7);
  const s1 = spark(0.33, 4, 5);
  const s2 = spark(0.66, 13, 6);

  if (reducedMotion) return null;
  return (
    <View pointerEvents="none" style={styles.sparkWrap}>
      <Reanimated.View style={[styles.spark, s0]} />
      <Reanimated.View style={[styles.spark, s1]} />
      <Reanimated.View style={[styles.spark, s2]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phone: {
    width: PHONE_W + 26,
    height: PHONE_H + 26,
    borderRadius: 58,
    backgroundColor: '#121A13',
    padding: 13,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
    elevation: 20,
  },
  screen: { flex: 1, borderRadius: 45, overflow: 'hidden', backgroundColor: colors.screen },
  notch: {
    position: 'absolute', top: 20, alignSelf: 'center',
    width: 116, height: 27, borderRadius: 999, backgroundColor: '#121A13',
  },
  btn: { position: 'absolute', width: 3, borderRadius: 3, backgroundColor: '#0B110C' },

  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 200, opacity: 0.16 },

  sheenWrap: { position: 'absolute', top: -30, bottom: -30, left: 0 },

  comet: {
    position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.green,
  },
  cometFaint: { opacity: 0.5, backgroundColor: colors.greenBright },

  sparkWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 40, alignItems: 'center' },
  spark: { position: 'absolute', borderRadius: 2, backgroundColor: colors.reward },
});
