/** Visual-effects layer for the /experiments/path prototype: the desktop phone shell, the
 * ambient backdrop, and the reusable motion pieces. All self-contained; nothing here is
 * imported by the production app. */
import { useEffect, useMemo, type ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay,
  cancelAnimation, interpolate, Easing,
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

/** The page's background wash.
 *
 * This used to also carry three oversized pastel discs (green, pink, blue) drifting against
 * the scroll. They're gone — on a screen that already has coloured module badges, a pink CTA
 * card and a green trail, they were one more thing competing for attention rather than the
 * quiet depth they were meant to add. What's left is the cream-to-sage gradient only. */
export function AmbientBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Flat cream, and nothing else.
       *
       * Four things have been tried behind this screen — drifting pastel discs, a dot
       * lattice, a cream-to-sage gradient, and a raised sheet against a deeper canvas — and
       * every one was turned down. The background is plain on purpose now; it is not a
       * placeholder waiting to be decorated. If this screen wants more visual interest it
       * should come from the content (the trail, the nodes, the cards), not from the space
       * behind it. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.screen }]} />
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

/** Dots running the last stretch of trail into the recommended node, on a loop.
 *
 * The recommended node already glows; these point AT it from the direction of travel, so the
 * eye is led along the path rather than just landing somewhere bright.
 *
 * They follow the drawn curve, not a straight line between the two node centres. The straight
 * version visibly left the trail wherever that stretch bowed, which is worse than not having
 * them — the entire job of these dots is to be ON the line. `samples` comes from
 * geometry.segmentSamples, which walks the same bézier the SVG renders; interpolating across
 * that polyline keeps them on it without animating any SVG property, which is the part that's
 * fragile in a web build. */
export function TrailComet({
  samples, reducedMotion,
}: { samples: { x: number; y: number }[]; reducedMotion: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }), -1, false);
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const n = samples.length;
  const input = useMemo(() => samples.map((_, i) => (n > 1 ? i / (n - 1) : 0)), [samples, n]);
  const xs = useMemo(() => samples.map((s) => s.x), [samples]);
  const ys = useMemo(() => samples.map((s) => s.y), [samples]);

  const dot = (lag: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const p = Math.max(0, Math.min(1, t.value - lag));
      return {
        transform: [
          { translateX: interpolate(p, input, xs) - 5 },
          { translateY: interpolate(p, input, ys) - 5 },
          { scale: interpolate(p, [0, 0.5, 1], [0.5, 1, 0.4]) },
        ],
        opacity: p <= 0 || p >= 1 ? 0 : interpolate(p, [0, 0.25, 0.8, 1], [0, 1, 1, 0]),
      };
    });

  const d0 = dot(0);
  const d1 = dot(0.14);
  const d2 = dot(0.28);

  if (reducedMotion || n < 2) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Reanimated.View style={[styles.comet, d0]} />
      <Reanimated.View style={[styles.comet, styles.cometFaint, d1]} />
      <Reanimated.View style={[styles.comet, styles.cometFaint, d2]} />
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


  sheenWrap: { position: 'absolute', top: -30, bottom: -30, left: 0 },

  comet: {
    position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.green,
  },
  cometFaint: { opacity: 0.5, backgroundColor: colors.greenBright },

});
