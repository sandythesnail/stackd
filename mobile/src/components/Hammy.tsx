import { useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, ViewStyle, View } from 'react-native';
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop, Ellipse, Circle, Path, Rect, G, ClipPath, SvgXml, Image as SvgImage,
} from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ShopItemReal } from '@/content';
import type { FaceOverlay } from '@/hammyFaces';

// Full-stage geometry ported from the website's CSS pig (styles.css .pig-* rules), a
// 440×460 frame. Kept in the same coordinate space so proportions match the web mascot.
const STAGE_W = 440;
const STAGE_H = 460;

// CSS `ease-in-out` — the timing function every .pig-* animation on the website uses.
const CSS_EASE = Easing.bezier(0.42, 0, 0.58, 1);

// Default transform for equipped items without their own custom `fit` — ported verbatim
// from the website's DEFAULT_ITEM_FIT (app.js). `fit` is a CSS/SVG matrix(a,b,c,d,e,f)
// that maps an item's own local SVG coordinates onto this same 440x460 stage.
const DEFAULT_ITEM_FIT = { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 };

/** One equipped cosmetic, matrix-transformed onto Hammy's 440x460 stage — mirrors the
 * website's getPigWithItemMarkup. Ids are namespaced per item AND per mounted instance:
 * item-only namespacing still collided whenever the same item was worn by two Hammys
 * mounted at once (a tab screen kept alive behind the pushed quest screen, the story
 * intro + companion row, …) — the same duplicate-DOM-id failure documented on the pig's
 * own gradients below, which silently blanks every gradient-filled shape in later-mounted
 * copies. The Santa hat losing its entire red body (all gradient fills; only the solid
 * white trim survived) was exactly this. */
function EquippedItem({ item }: { item: ShopItemReal }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ns = `${item.id}-${uid}`;
  const fit = item.fit ?? DEFAULT_ITEM_FIT;
  const matrix = `matrix(${fit.a},${fit.b},${fit.c},${fit.d},${fit.e},${fit.f})`;
  const namespaced = item.svg
    .replace(/id="([^"]+)"/g, (_, id) => `id="${id}-${ns}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${ns})`);
  return (
    <G transform={matrix}>
      <SvgXml xml={`<svg xmlns="http://www.w3.org/2000/svg" width="${STAGE_W}" height="${STAGE_H}">${namespaced}</svg>`} width={STAGE_W} height={STAGE_H} />
    </G>
  );
}

/* Silhouettes converted from the website's CSS border-radius boxes. CSS scales ALL corner
 * radii by one shared factor when any two adjacent radii overflow an edge (the min over
 * every edge of edge/(r1+r2)) — each path below applies that exact rule, so these are the
 * shapes a browser actually renders, not the raw declared radii. */

// .pig-foot: 60×52, border-radius 26 26 18 18 (no overlap; radii used as declared).
const FOOT_PATH = 'M 26 0 H 34 A 26 26 0 0 1 60 26 V 34 A 18 18 0 0 1 42 52 H 18 A 18 18 0 0 1 0 34 V 26 A 26 26 0 0 1 26 0 Z';
const FOOT_W = 60; const FOOT_H = 52;

// .pig-arm.l: 60×48, border-radius 30 18 24 28 — left edge overflows (30+28=58 > 48), so
// every radius scales by 48/58 → TL 24.83, TR 14.9, BR 19.86, BL 23.17. The right arm is
// this exact shape mirrored (CSS 18 30 28 24), rendered with scale(-1,1).
const ARM_PATH = 'M 24.83 0 H 45.1 A 14.9 14.9 0 0 1 60 14.9 V 28.14 A 19.86 19.86 0 0 1 40.14 48 H 23.17 A 23.17 23.17 0 0 1 0 24.83 A 24.83 24.83 0 0 1 24.83 0 Z';

// .pig-ear: 64×74, border-radius 54% 54% 46% 46% / 70% 70% 34% 34% → raw radii h 34.56/29.44,
// v 51.8/25.16; the top edge overflows worst (69.12 > 64), so all scale by 64/69.12 →
// h-top 32, v-top 47.96, h-bottom 27.26, v-bottom 23.3.
const EAR_PATH = 'M 32 0 A 32 47.96 0 0 1 64 47.96 V 50.7 A 27.26 23.3 0 0 1 36.74 74 H 27.26 A 27.26 23.3 0 0 1 0 50.7 V 47.96 A 32 47.96 0 0 1 32 0 Z';

// .pig-ear-inner: 26×40, border-radius 54% 54% 46% 46% / 64% 64% 36% 36% → same rule
// (top edge 28.08 > 26, factor 26/28.08) → a teardrop, NOT a symmetric ellipse.
// Positioned at (19,18) within the ear box (top:18, horizontally centered).
const EAR_INNER_PATH = 'M 13 0 A 13 23.7 0 0 1 26 23.7 V 26.67 A 11.07 13.33 0 0 1 14.93 40 H 11.07 A 11.07 13.33 0 0 1 0 26.67 V 23.7 A 13 23.7 0 0 1 13 0 Z';

// .pig-body: 300×250 at (70,162), border-radius 50% 50% 46% 46% → top corners (150,125),
// bottom corners (138,115) — slightly flatter at the bottom than a pure ellipse.
const BODY_PATH = 'M 150 0 A 150 125 0 0 1 300 125 V 135 A 138 115 0 0 1 162 250 H 138 A 138 115 0 0 1 0 135 V 125 A 150 125 0 0 1 150 0 Z';

// .pig-head: 276×248 at (82,74), border-radius 50% 50% 48% 48% → top (138,124),
// bottom (132.48,119.04).
const HEAD_PATH = 'M 138 0 A 138 124 0 0 1 276 124 V 128.96 A 132.48 119.04 0 0 1 143.52 248 H 132.48 A 132.48 119.04 0 0 1 0 128.96 V 124 A 138 124 0 0 1 138 0 Z';

/**
 * Hammy the pig — the real mascot, redrawn as SVG from the web app's CSS illustration
 * (gradients/shapes ported from styles.css .pig-*). Idle animation: gentle float, eye
 * blink, ear wiggle, tail wag — all on the website's exact clocks and cubic-bezier
 * ease-in-out. Swap `pig` to recolor the body/head tint if ever needed; no current
 * screen does.
 */
export function Hammy({
  size = 120,
  bob = true,
  pig: _pig = '#E27EA0',
  equipped = [],
  headOnly = false,
  face,
  reaction,
  reactionKey,
  style,
}: {
  size?: number;
  bob?: boolean;
  pig?: string;
  /** Currently-worn shop items, matrix-transformed onto the mascot (see EquippedItem). */
  equipped?: ShopItemReal[];
  /** Ported from the website's .pig-head-stage (styles.css): the same full pig, windowed
   * to the head — a (80,40)→280x290 slice of the 440x460 stage — with body/tummy/arms/
   * feet/tail/ground-shadow hidden. Ears, face, face overlays, and equipped items all
   * still render, so a worn hat shows up in head-only contexts (the dialogue avatar)
   * exactly like the website's getHammyFaceMarkup. `size` stays the rendered width. */
  headOnly?: boolean;
  /** Illustrated mood/reaction face (see @/hammyFaces) — replaces the default eyes/cheeks/
   * snout with a cropped PNG overlay, matching the website's .hammy-face-overlay behavior.
   * Shown at full opacity for as long as it's set (same as the website's static face masks);
   * an earlier "blink-through" variant dipped the overlay out on the ambient blink cycle,
   * which read as Hammy's face going blank for a beat — removed on purpose. */
  face?: FaceOverlay;
  /** Ported from the website's hammyBounce/hammyWobble/hammyCelebrate keyframes — a one-shot
   * body animation on top of the idle float, played whenever reactionKey changes. */
  reaction?: 'happy' | 'gentle' | 'streak' | null;
  /** Bump this (e.g. a counter) on every reaction so repeat-same-mood reactions still replay
   * the animation — mirrors the website forcing a CSS animation restart (`void el.offsetWidth`). */
  reactionKey?: number;
  style?: ViewStyle;
}) {
  // react-native-svg-web renders each <Defs> gradient/clipPath as a real DOM element with
  // its literal id — with more than one Hammy mounted at once (e.g. a tab screen kept alive
  // behind a pushed quest screen), duplicate ids across instances broke gradient/clipPath
  // resolution on later-mounted instances entirely (solid-fill shapes still rendered; every
  // gradient-filled shape — head, body, snout, arms, ear fill — silently went invisible).
  // Namespacing every id per instance (same pattern EquippedItem already uses) fixes this.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = (base: string) => `${base}-${uid}`;
  const gidUrl = (base: string) => `url(#${gid(base)})`;

  const backItems = equipped.filter((i) => i.layer === 'back');
  const frontItems = equipped.filter((i) => i.layer !== 'back');
  const floatY = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current; // eye scaleY: 1 = open, 0.1 = closed
  const earL = useRef(new Animated.Value(0)).current;
  const tail = useRef(new Animated.Value(0)).current;
  const reactY = useRef(new Animated.Value(0)).current;
  const reactRot = useRef(new Animated.Value(0)).current;
  const floatLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  // On the website, a reaction REPLACES the pigFloat animation on .pig (`animation: … !important`),
  // so the idle float pauses at the unfloated base pose for the reaction's duration and restarts
  // from 0% afterwards. `reacting` also zeroes the float's ±1° tilt for that window, since an
  // unanimated web pig sits at rotate(0), not pigFloat's 0%-frame rotate(-1deg).
  const [reacting, setReacting] = useState(false);

  const startFloat = () => {
    floatLoopRef.current?.stop();
    // Ported verbatim from the website's @keyframes pigFloat (4.2s, ease-in-out): the peak
    // isn't just -14px up, it's translateY(-14px) rotate(1deg) — a whole-body tilt synced
    // with the rise, from rotate(-1deg) at rest.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -14, duration: 2100, easing: CSS_EASE, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2100, easing: CSS_EASE, useNativeDriver: true }),
      ])
    );
    floatLoopRef.current = loop;
    loop.start();
  };

  // Ported from the website's hammyBounce (happy) / hammyWobble (gentle/wrong) /
  // hammyCelebrate (streak) keyframes — including their rotation channels — replayed every
  // time reactionKey changes (not just when `reaction` changes, so answering "correct" twice
  // in a row still replays the animation both times).
  useEffect(() => {
    if (!reaction) return;
    floatLoopRef.current?.stop();
    floatY.setValue(0);
    setReacting(true);
    reactY.setValue(0);
    // hammyBounce's 0% keyframe starts at rotate(-2deg); the other two start at 0.
    reactRot.setValue(reaction === 'happy' ? -2 : 0);
    const t = (v: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(v, { toValue, duration, easing: CSS_EASE, useNativeDriver: true });
    const seq = reaction === 'gentle'
      // hammyWobble, 0.6s: rotate 0 → -6 (25%) → 6 (75%) → 0 (100%)
      ? Animated.sequence([t(reactRot, -6, 150), t(reactRot, 6, 300), t(reactRot, 0, 150)])
      : reaction === 'streak'
        // hammyCelebrate, 1s: keys at 15/30/45/60/75/100%
        ? Animated.parallel([
            Animated.sequence([t(reactY, -30, 150), t(reactY, 0, 150), t(reactY, -30, 150), t(reactY, 0, 150), t(reactY, -16, 150), t(reactY, 0, 250)]),
            Animated.sequence([t(reactRot, -8, 150), t(reactRot, 6, 150), t(reactRot, -8, 150), t(reactRot, 6, 150), t(reactRot, -4, 150), t(reactRot, 0, 250)]),
          ])
        // hammyBounce, 0.7s: keys at 30/55/75/100%
        : Animated.parallel([
            Animated.sequence([t(reactY, -22, 210), t(reactY, 0, 175), t(reactY, -10, 140), t(reactY, 0, 175)]),
            Animated.sequence([t(reactRot, 6, 210), t(reactRot, -4, 175), t(reactRot, 3, 140), t(reactRot, -2, 175)]),
          ]);
    seq.start(({ finished }) => {
      if (!finished) return; // a newer reaction took over; let it own the restart
      reactRot.setValue(0); // CSS fill:none snaps back to the unanimated pose
      setReacting(false);
      if (bob) startFloat();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactionKey]);

  useEffect(() => {
    if (!bob) return;
    startFloat();
    return () => floatLoopRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bob]);

  useEffect(() => {
    // @keyframes pigBlink on a 5s clock: eyes open through 92% (4.6s), closed to scaleY(0.1)
    // at 96% (200ms closing), reopen by 100% (200ms), each segment on CSS ease-in-out.
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(4600),
        Animated.timing(blink, { toValue: 0.1, duration: 200, easing: CSS_EASE, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 1, duration: 200, easing: CSS_EASE, useNativeDriver: false }),
      ])
    );
    blinkLoop.start();
    // earWiggleL/R: 3.6s, both ears on the same clock (the right ear is rendered mirrored,
    // so this single driver produces the website's -18→-26 / +18→+26 pair).
    const earLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(earL, { toValue: 1, duration: 1800, easing: CSS_EASE, useNativeDriver: false }),
        Animated.timing(earL, { toValue: 0, duration: 1800, easing: CSS_EASE, useNativeDriver: false }),
      ])
    );
    earLoop.start();
    // tailWag: 2.6s, rotate -5deg → 8deg.
    const tailLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tail, { toValue: 1, duration: 1300, easing: CSS_EASE, useNativeDriver: false }),
        Animated.timing(tail, { toValue: 0, duration: 1300, easing: CSS_EASE, useNativeDriver: false }),
      ])
    );
    tailLoop.start();
    return () => { blinkLoop.stop(); earLoop.stop(); tailLoop.stop(); };
  }, [blink, earL, tail]);

  // react-native-svg's web G/Ellipse are plain class components with no native-driver
  // support, so Animated.createAnimatedComponent(G/Ellipse) throws on mount there (fine
  // on native). Drive plain elements from listener-updated state instead — works
  // identically on both platforms since these loops already run with useNativeDriver: false.
  const [eyeScaleY, setEyeScaleY] = useState(1);
  const [earLTransform, setEarLTransform] = useState('rotate(-18 32 74)');
  const [tailTransform, setTailTransform] = useState('rotate(-5 7.04 24.2)');

  useEffect(() => {
    const earLInterp = earL.interpolate({ inputRange: [0, 1], outputRange: ['rotate(-18 32 74)', 'rotate(-26 32 74)'] });
    // .pig-tail transform-origin is 16% 55% of its 44×44 box → (7.04, 24.2).
    const tailInterp = tail.interpolate({ inputRange: [0, 1], outputRange: ['rotate(-5 7.04 24.2)', 'rotate(8 7.04 24.2)'] });
    const ids = [
      blink.addListener(({ value }) => setEyeScaleY(value)),
      earLInterp.addListener(({ value }) => setEarLTransform(value as unknown as string)),
      tailInterp.addListener(({ value }) => setTailTransform(value as unknown as string)),
    ];
    return () => {
      blink.removeListener(ids[0]);
      earLInterp.removeListener(ids[1]);
      tailInterp.removeListener(ids[2]);
    };
  }, [blink, earL, tail]);

  // Swap between the default eyes/cheeks/snout and an illustrated face overlay. This used
  // to crossfade via an Animated-driven opacity + a `displayFace` staging value, but that
  // three-piece dance (anim value, a value-listener syncing React state, and a staged
  // "last known face" var) had a real failure mode: whenever a new reaction interrupted an
  // in-flight fade (very easy to do — matching fires reactions in quick succession), the
  // opacity could end up parked at a mid-value with the listener's last update not
  // reflecting the latest `face`, showing neither the overlay nor the base features —
  // exactly the "face goes blank" bug. A direct swap has no intermediate state to get
  // stuck in: `face` falsy shows only the base features, full stop; `face` set shows the
  // overlay at a flat 1 for its whole lifetime, exactly like the website's static face
  // masks — it never dips out mid-display, so Hammy's face can never read as blank.
  const faceOpacity = face ? 1 : 0;
  const displayFace = face;

  // Head-only mode swaps the viewBox for the website's .pig-head-stage window instead of
  // scaling anything — coordinates inside stay in the same 440x460 space either way.
  const viewBox = headOnly ? '80 40 280 290' : `0 0 ${STAGE_W} ${STAGE_H}`;
  const aspect = headOnly ? 290 / 280 : STAGE_H / STAGE_W;
  const width = size;
  const height = size * aspect;
  const reactRotDeg = reactRot.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] });
  // The idle float's own tilt (see startFloat above) — a separate transform entry from
  // reactRotDeg so the two compose (idle tilt, then any one-shot reaction wobble on top)
  // instead of one overwriting the other.
  const floatRotDeg = floatY.interpolate({ inputRange: [-14, 0], outputRange: ['1deg', '-1deg'] });

  // While a face overlay shows, the website also softens the body/head shading
  // (.has-face-overlay: body loses both insets; head keeps only its white shine at .35
  // instead of .6) so the illustrated face blends into flatter skin.
  const moldOpacity = 1 - faceOpacity;
  const headShineOpacity = 1 - faceOpacity * (1 - 0.35 / 0.6);

  // Squash the whole eye group — pupils AND shines together, like the web's scaleY on
  // .pig-eye squashes its child shine divs — about the shared eye centerline y=193.
  const blinkTransform = `translate(0 ${(193 * (1 - eyeScaleY)).toFixed(3)}) scale(1 ${eyeScaleY.toFixed(4)})`;

  return (
    <View style={[{ width, height }, style]}>
      {/* Ground shadow — on the website .pig-shadow sits OUTSIDE the floating .pig element,
          so it stays put while the pig bobs/bounces above it. Rendered in its own static
          Svg behind the animated one for the same effect. rgba(214,120,160,.22) with a 7px
          blur ≈ flat fill to ~82% then a quick fade at the rim. */}
      {!headOnly ? (
        <Svg width={width} height={height} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
          <Defs>
            <RadialGradient id={gid('hm-shadow')} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#D678A0" stopOpacity={0.22} />
              <Stop offset="82%" stopColor="#D678A0" stopOpacity={0.22} />
              <Stop offset="100%" stopColor="#D678A0" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={220} cy={417} rx={150} ry={23} fill={gidUrl('hm-shadow')} />
        </Svg>
      ) : null}

      <Animated.View
        style={{
          width,
          height,
          transform: [
            { translateY: Animated.add(floatY, reactY) },
            { rotate: reacting ? '0deg' : floatRotDeg },
            { rotate: reactRotDeg },
          ],
        }}
      >
        {/* A root <svg> defaults to clipping anything outside its viewBox (unlike a plain div,
            which is what the website actually uses) — that's what was cutting off tall hats
            (party hat, santa hat) and wide capes/halos that legitimately draw above y=0 or past
            the 440x460 stage edges. overflow:visible here matches the website's real behavior:
            nothing about the pig itself changes size, equipped items just aren't clipped. */}
        <Svg width={width} height={height} viewBox={viewBox} style={{ overflow: 'visible' }}>
          <Defs>
            {/* Base fills — each CSS linear-gradient converted to an exact userSpaceOnUse
                line (CSS center/angle/line-length math), so both the tilt and where the
                stops land match the browser per-pixel, aspect ratio included. Local-space
                coordinates for shapes drawn inside translated groups. */}
            <LinearGradient id={gid('hm-body')} x1={108.7} y1={-29.13} x2={191.3} y2={279.13} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFD4E4" />
              <Stop offset="60%" stopColor="#FFC2D9" />
              <Stop offset="100%" stopColor="#FFB4CE" />
            </LinearGradient>
            {/* CSS: radial-gradient(circle at 50% 40%, white .5, transparent 70%) on the
                150x120 tummy box. "circle" forces a TRUE circle regardless of the box's non-
                square aspect ratio — SVG's default objectBoundingBox sizing would stretch this
                into an ellipse matching the box instead, so this uses absolute userSpaceOnUse
                coordinates: center (220,318) is 50%/40% of the tummy box in canvas terms, and
                104 is the farthest-corner distance from that off-center point (CSS's default
                radial-gradient sizing keyword) — not the box's own half-diagonal. */}
            <RadialGradient id={gid('hm-tummy')} cx={220} cy={318} r={104} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
              <Stop offset="70%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={gid('hm-arm')} x1={18.78} y1={-6.83} x2={41.22} y2={54.83} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFD0E1" />
              <Stop offset="100%" stopColor="#FFBCD4" />
            </LinearGradient>
            <LinearGradient id={gid('hm-ear')} x1={16.37} y1={-5.96} x2={47.64} y2={79.96} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFC6DC" />
              <Stop offset="100%" stopColor="#FF9FC1" />
            </LinearGradient>
            <LinearGradient id={gid('hm-head')} x1={82.01} y1={-29.85} x2={193.99} y2={277.85} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFD9E7" />
              <Stop offset="58%" stopColor="#FFC6DB" />
              <Stop offset="100%" stopColor="#FFB8D0" />
            </LinearGradient>
            <LinearGradient id={gid('hm-snout')} x1={199.6} y1={155.95} x2={240.4} y2={268.05} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FFB3CD" />
              <Stop offset="100%" stopColor="#FF96B8" />
            </LinearGradient>

            {/* Highlight/shadow overlays — approximate the CSS's blurred inset box-shadows
                (glossy top-left highlight, soft bottom-right shadow) that give the puffy 3D
                look, at the web's exact colors/alphas. The feet's inset is blur-0, so that
                one is an exact hard band instead (see below). */}
            <RadialGradient id={gid('hm-body-shine')} cx="32%" cy="24%" r="55%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-body-shadow')} cx="74%" cy="78%" r="60%">
              <Stop offset="0%" stopColor="#E783AA" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#E783AA" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-head-shine')} cx="28%" cy="22%" r="55%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.6} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-head-shadow')} cx="76%" cy="80%" r="60%">
              <Stop offset="0%" stopColor="#E783AA" stopOpacity={0.28} />
              <Stop offset="100%" stopColor="#E783AA" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-arm-shadow')} cx="76%" cy="80%" r="65%">
              <Stop offset="0%" stopColor="#E783AA" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#E783AA" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-ear-shadow')} cx="76%" cy="82%" r="65%">
              <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-snout-shine')} cx="50%" cy="18%" r="55%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-snout-shadow')} cx="50%" cy="84%" r="55%">
              <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-snout-drop')} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.2} />
              <Stop offset="80%" stopColor="#D0638C" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
            </RadialGradient>
            {/* CSS: radial-gradient(circle, #ff9bbe, transparent 70%) on the 56x40 cheek box —
                same true-circle-on-a-non-square-box issue as the tummy (see hm-tummy above).
                Centered (no "at" offset), so r is just the half-diagonal: sqrt(28²+20²)≈34.4.
                Two copies since the left/right cheeks sit at different absolute centers. */}
            <RadialGradient id={gid('hm-cheek-l')} cx={134} cy={222} r={34.4} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FF9BBE" />
              <Stop offset="70%" stopColor="#FF9BBE" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={gid('hm-cheek-r')} cx={306} cy={222} r={34.4} gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#FF9BBE" />
              <Stop offset="70%" stopColor="#FF9BBE" stopOpacity={0} />
            </RadialGradient>

            <ClipPath id={gid('hm-clip-foot')}><Path d={FOOT_PATH} /></ClipPath>
          </Defs>

          {/* back-layer equipped items (e.g. capes) — drawn behind body/arms/head */}
          {backItems.map((item) => <EquippedItem key={item.id} item={item} />)}

          {/* Everything below the head — hidden entirely in headOnly mode, mirroring the
              website's `.pig-head-stage .pig-body/…/.pig-tail { display: none }`. */}
          {!headOnly ? <>
          {/* feet — .pig-foot's shading is `inset 0 -6px 0` (zero blur): an exact hard-edged
              6px band along the bottom, clipped to the foot silhouette. */}
          <G transform="translate(120 374)">
            <Path d={FOOT_PATH} fill="#F7A8C4" />
            <Rect x={0} y={FOOT_H - 6} width={FOOT_W} height={6} fill="#D0638C" fillOpacity={0.25} clipPath={gidUrl('hm-clip-foot')} />
          </G>
          <G transform="translate(260 374)">
            <Path d={FOOT_PATH} fill="#F7A8C4" />
            <Rect x={0} y={FOOT_H - 6} width={FOOT_W} height={6} fill="#D0638C" fillOpacity={0.25} clipPath={gidUrl('hm-clip-foot')} />
          </G>

          {/* tail — 44×44 box at (362,236); wag pivots at the CSS transform-origin 16% 55%. */}
          <G transform="translate(362 236)">
            <G transform={tailTransform}>
              <Path
                d="M 9,31 C 9,11 27,5 39,15 C 51,25 49,41 39,47 C 29,53 17,49 15,41 C 13,33 21,31 27,33"
                fill="none" stroke="#F7ADD0" strokeWidth={6} strokeLinecap="round"
                transform="scale(0.7857)"
              />
              <Circle cx={21.2} cy={25.9} r={2.75} fill="#F0A0BE" />
            </G>
          </G>

          {/* body — drawn BEFORE the arms: the website's DOM order paints arms on top of the
              body's edge, so they read as attached paws, not tucked behind. */}
          <G transform="translate(70 162)">
            <Path d={BODY_PATH} fill={gidUrl('hm-body')} />
            <Path d={BODY_PATH} fill={gidUrl('hm-body-shadow')} opacity={moldOpacity} />
            <Path d={BODY_PATH} fill={gidUrl('hm-body-shine')} opacity={moldOpacity} />
          </G>
          <Ellipse cx={220} cy={330} rx={75} ry={60} fill={gidUrl('hm-tummy')} />

          {/* arms — the right arm is the left's exact mirror (matching the CSS's mirrored
              corner radii, 200deg gradient, and flipped inset shadow in one transform). */}
          <G transform="translate(54 262)">
            <Path d={ARM_PATH} fill={gidUrl('hm-arm')} />
            <Path d={ARM_PATH} fill={gidUrl('hm-arm-shadow')} />
          </G>
          <G transform="translate(386 262) scale(-1 1)">
            <Path d={ARM_PATH} fill={gidUrl('hm-arm')} />
            <Path d={ARM_PATH} fill={gidUrl('hm-arm-shadow')} />
          </G>
          </> : null}

          {/* ears — right ear mirrors the left (flipped gradient/shadow/wiggle in one
              transform, exactly the earWiggleL/earWiggleR ±18→±26 pair). */}
          <G transform="translate(106 54)">
            <G transform={earLTransform}>
              <Path d={EAR_PATH} fill={gidUrl('hm-ear')} />
              <Path d={EAR_PATH} fill={gidUrl('hm-ear-shadow')} />
              <G transform="translate(19 18)"><Path d={EAR_INNER_PATH} fill="#F48BB0" /></G>
            </G>
          </G>
          <G transform="translate(334 54) scale(-1 1)">
            <G transform={earLTransform}>
              <Path d={EAR_PATH} fill={gidUrl('hm-ear')} />
              <Path d={EAR_PATH} fill={gidUrl('hm-ear-shadow')} />
              <G transform="translate(19 18)"><Path d={EAR_INNER_PATH} fill="#F48BB0" /></G>
            </G>
          </G>

          {/* head */}
          <G transform="translate(82 74)">
            <Path d={HEAD_PATH} fill={gidUrl('hm-head')} />
            <Path d={HEAD_PATH} fill={gidUrl('hm-head-shadow')} opacity={moldOpacity} />
            <Path d={HEAD_PATH} fill={gidUrl('hm-head-shine')} opacity={headShineOpacity} />
          </G>

          {/* cheeks, eyes, snout — crossfade out when an illustrated face overlay replaces
              them (smooth version of the website's .has-face-overlay opacity transition;
              always rendered, opacity-driven, instead of an instant conditional swap). */}
          <G opacity={1 - faceOpacity}>
            <Ellipse cx={134} cy={222} rx={28} ry={20} fill={gidUrl('hm-cheek-l')} />
            <Ellipse cx={306} cy={222} rx={28} ry={20} fill={gidUrl('hm-cheek-r')} />

            {/* Both eyes + their shines squash together on the blink (the web scales the
                whole .pig-eye element, shine children included). */}
            <G transform={blinkTransform}>
              <Circle cx={141} cy={193} r={19} fill="#3A2230" />
              <Circle cx={299} cy={193} r={19} fill="#3A2230" />
              <Circle cx={134.5} cy={186.5} r={6.5} fill="#FFFFFF" />
              <Circle cx={148.5} cy={201.5} r={3.5} fill="#FFFFFF" fillOpacity={0.7} />
              <Circle cx={292.5} cy={186.5} r={6.5} fill="#FFFFFF" />
              <Circle cx={306.5} cy={201.5} r={3.5} fill="#FFFFFF" fillOpacity={0.7} />
            </G>

            {/* soft drop shadow drawn first so it peeks out from beneath the fill */}
            <Ellipse cx={220} cy={216} rx={59} ry={42} fill={gidUrl('hm-snout-drop')} />
            <Ellipse cx={220} cy={212} rx={59} ry={42} fill={gidUrl('hm-snout')} />
            <Ellipse cx={220} cy={212} rx={59} ry={42} fill={gidUrl('hm-snout-shadow')} />
            <Ellipse cx={220} cy={212} rx={59} ry={42} fill={gidUrl('hm-snout-shine')} />
            <Ellipse cx={201} cy={212} rx={10} ry={15} fill="#D9608C" />
            <Ellipse cx={239} cy={212} rx={10} ry={15} fill="#D9608C" />
          </G>

          {displayFace ? (
            <SvgImage
              href={displayFace.image}
              x={displayFace.left}
              y={displayFace.top}
              width={displayFace.width}
              height={displayFace.height}
              opacity={faceOpacity}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : null}

          {/* front-layer equipped items (hats, glasses, neckwear) — drawn above everything */}
          {frontItems.map((item) => <EquippedItem key={item.id} item={item} />)}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Rounded-rect image slot placeholder (posters, illustrations — unrelated to Hammy). */
export function Slot({
  width,
  height,
  radius = 20,
  label,
  colors = ['#FFF3F7', '#FBE0EA'],
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  label?: string;
  colors?: [string, string];
  style?: ViewStyle;
}) {
  return (
    <ExpoLinearGradient
      colors={colors}
      start={{ x: 0.5, y: 0.2 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        { width: width ?? '100%', height, borderRadius: radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        style,
      ]}
    >
      {label ? (
        <View style={{ opacity: 0.6 }}>
          <MaterialCommunityIcons name="pig-variant" size={Math.min(64, height * 0.4)} color="#E27EA0" />
        </View>
      ) : null}
    </ExpoLinearGradient>
  );
}
