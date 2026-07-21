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

// Default transform for equipped items without their own custom `fit` — ported verbatim
// from the website's DEFAULT_ITEM_FIT (app.js). `fit` is a CSS/SVG matrix(a,b,c,d,e,f)
// that maps an item's own local SVG coordinates onto this same 440x460 stage.
const DEFAULT_ITEM_FIT = { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 };

/** One equipped cosmetic, matrix-transformed onto Hammy's 440x460 stage — mirrors the
 * website's getPigWithItemMarkup. Namespaced by item id so multiple equipped items (or the
 * same item rendered elsewhere on screen) don't collide over shared <defs> ids. */
function EquippedItem({ item }: { item: ShopItemReal }) {
  const fit = item.fit ?? DEFAULT_ITEM_FIT;
  const matrix = `matrix(${fit.a},${fit.b},${fit.c},${fit.d},${fit.e},${fit.f})`;
  const namespaced = item.svg
    .replace(/id="([^"]+)"/g, (_, id) => `id="${id}-${item.id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${item.id})`);
  return (
    <G transform={matrix}>
      <SvgXml xml={`<svg xmlns="http://www.w3.org/2000/svg" width="${STAGE_W}" height="${STAGE_H}">${namespaced}</svg>`} width={STAGE_W} height={STAGE_H} />
    </G>
  );
}

// Ear silhouette: the website draws ears with CSS border-radius "54% 54% 46% 46% / 70% 70%
// 34% 34%" on a 64×74 box — a much rounder top than bottom, i.e. a teardrop/petal, not a
// plain ellipse. This path is that same per-corner-radius rounded rect converted to arcs
// (with the same CSS overlap correction where adjacent corner radii exceed the box edge).
const EAR_PATH = 'M 32,0 A 32,49.8 0 0 1 64,49.8 A 29.44,24.2 0 0 1 34.56,74 L 29.44,74 A 29.44,24.2 0 0 1 0,49.8 A 32,49.8 0 0 1 32,0 Z';

// Feet/hands: small rounded capsule shapes (styles.css .pig-foot/.pig-arm), not full ovals.
// Using native SVG rounded-rect (rx/ry) rather than a hand-rolled per-corner path — simpler
// and robust — with rx/ry set to exactly half the box's height so the top/bottom read as a
// clean stadium/pill shape, matching the reference art closely.
const FOOT_W = 60; const FOOT_H = 52; const FOOT_R = FOOT_H / 2;
const ARM_W = 60; const ARM_H = 48; const ARM_R = ARM_H / 2;

/**
 * Hammy the pig — the real mascot, redrawn as SVG from the web app's CSS illustration
 * (gradients/shapes ported from styles.css .pig-*). Idle animation: gentle float, eye
 * blink, ear wiggle, tail wag. Swap `pig` to recolor the body/head tint if ever needed;
 * no current screen does.
 */
export function Hammy({
  size = 120,
  bob = true,
  pig: _pig = '#E27EA0',
  equipped = [],
  face,
  blinkThroughFace = true,
  reaction,
  reactionKey,
  style,
}: {
  size?: number;
  bob?: boolean;
  pig?: string;
  /** Currently-worn shop items, matrix-transformed onto the mascot (see EquippedItem). */
  equipped?: ShopItemReal[];
  /** Illustrated mood/reaction face (see @/hammyFaces) — replaces the default eyes/cheeks/
   * snout with a cropped PNG overlay, matching the website's .hammy-face-overlay behavior. */
  face?: FaceOverlay;
  /** Whether `face` briefly fades out on the ambient blink cycle to let the (also blinking)
   * base eyes peek through underneath, instead of sitting there as a frozen mask. Good for
   * an at-rest mood/streak face (Home, results.tsx) that's on screen for a while — bad for
   * the quest companion's transient reaction faces, where the ambient cycle coinciding with
   * an active "happy!" moment made his face flicker to neutral mid-celebration, easy to
   * mistake for the face "going blank" or not reacting at all. Default true; the quest
   * companion passes false. */
  blinkThroughFace?: boolean;
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
  const blink = useRef(new Animated.Value(1)).current; // 1 = open, ~0.08 = closed
  const earL = useRef(new Animated.Value(0)).current;
  const earR = useRef(new Animated.Value(0)).current;
  const tail = useRef(new Animated.Value(0)).current;
  const reactY = useRef(new Animated.Value(0)).current;
  const reactRot = useRef(new Animated.Value(0)).current;

  // Ported from the website's hammyBounce (happy) / hammyWobble (gentle/wrong) /
  // hammyCelebrate (streak) keyframes — a quick one-shot bounce/shake layered on top of the
  // idle float, replayed every time reactionKey changes (not just when `reaction` changes,
  // so answering "correct" twice in a row still replays the animation both times).
  useEffect(() => {
    if (!reaction) return;
    reactY.setValue(0);
    reactRot.setValue(0);
    const q = Easing.inOut(Easing.quad);
    const seq = reaction === 'gentle'
      ? Animated.sequence([
          Animated.timing(reactRot, { toValue: -6, duration: 150, easing: q, useNativeDriver: true }),
          Animated.timing(reactRot, { toValue: 6, duration: 150, easing: q, useNativeDriver: true }),
          Animated.timing(reactRot, { toValue: -6, duration: 150, easing: q, useNativeDriver: true }),
          Animated.timing(reactRot, { toValue: 0, duration: 150, easing: q, useNativeDriver: true }),
        ])
      : reaction === 'streak'
        ? Animated.sequence([
            Animated.timing(reactY, { toValue: -30, duration: 150, easing: q, useNativeDriver: true }),
            Animated.timing(reactY, { toValue: 0, duration: 150, easing: q, useNativeDriver: true }),
            Animated.timing(reactY, { toValue: -30, duration: 150, easing: q, useNativeDriver: true }),
            Animated.timing(reactY, { toValue: 0, duration: 150, easing: q, useNativeDriver: true }),
            Animated.timing(reactY, { toValue: -16, duration: 150, easing: q, useNativeDriver: true }),
            Animated.timing(reactY, { toValue: 0, duration: 150, easing: q, useNativeDriver: true }),
          ])
        : Animated.sequence([
            Animated.timing(reactY, { toValue: -22, duration: 210, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(reactY, { toValue: 0, duration: 175, easing: q, useNativeDriver: true }),
            Animated.timing(reactY, { toValue: -10, duration: 140, easing: q, useNativeDriver: true }),
            Animated.timing(reactY, { toValue: 0, duration: 175, easing: q, useNativeDriver: true }),
          ]);
    seq.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactionKey]);

  useEffect(() => {
    if (!bob) return;
    // Ported verbatim from the website's @keyframes pigFloat (4.2s, ease-in-out): the peak
    // isn't just -14px up, it's translateY(-14px) rotate(1deg) — a whole-body tilt synced
    // with the rise, from rotate(-1deg) at rest. Missing that tilt (mobile previously only
    // bobbed -5px with no rotation at all) is why the figure — arms/feet/ears included, since
    // they're all children of this same root transform — read as moving subtly differently
    // from the web version.
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -14, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [bob, floatY]);

  useEffect(() => {
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(4200),
        Animated.timing(blink, { toValue: 0.08, duration: 90, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: false }),
      ])
    );
    blinkLoop.start();
    const earLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(earL, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(earL, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    earLoop.start();
    const earLoopR = Animated.loop(
      Animated.sequence([
        Animated.timing(earR, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(earR, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    earLoopR.start();
    const tailLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tail, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(tail, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    tailLoop.start();
    return () => { blinkLoop.stop(); earLoop.stop(); earLoopR.stop(); tailLoop.stop(); };
  }, [blink, earL, earR, tail]);

  // react-native-svg's web G/Ellipse are plain class components with no native-driver
  // support, so Animated.createAnimatedComponent(G/Ellipse) throws on mount there (fine
  // on native). Drive plain elements from listener-updated state instead — works
  // identically on both platforms since these loops already run with useNativeDriver: false.
  const [eyeRy, setEyeRy] = useState(19);
  const [earLTransform, setEarLTransform] = useState('rotate(-18 32 74)');
  const [earRTransform, setEarRTransform] = useState('rotate(18 32 74)');
  const [tailTransform, setTailTransform] = useState('rotate(-5 14 26)');
  // Rides the SAME blink cycle as eyeRy above (1 = eyes open, dips toward 0 during the
  // ~90-120ms blink window) — used below to briefly fade the face overlay out and let the
  // base (blinking) eyes show through, so a mood/reaction face doesn't just sit there
  // motionless forever. Without this, blinking only ever showed up when Hammy had no face
  // overlay active at all — which on Home (always a mood face) and results.tsx (now always
  // the streak face) meant essentially never.
  const [blinkDip, setBlinkDip] = useState(1);

  useEffect(() => {
    const eyeRyInterp = blink.interpolate({ inputRange: [0.08, 1], outputRange: [1.6, 19] });
    const blinkDipInterp = blink.interpolate({ inputRange: [0.08, 1], outputRange: [0, 1] });
    const earLInterp = earL.interpolate({ inputRange: [0, 1], outputRange: ['rotate(-18 32 74)', 'rotate(-26 32 74)'] });
    const earRInterp = earR.interpolate({ inputRange: [0, 1], outputRange: ['rotate(18 32 74)', 'rotate(26 32 74)'] });
    const tailInterp = tail.interpolate({ inputRange: [0, 1], outputRange: ['rotate(-5 14 26)', 'rotate(8 14 26)'] });
    const ids = [
      eyeRyInterp.addListener(({ value }) => setEyeRy(value as unknown as number)),
      blinkDipInterp.addListener(({ value }) => setBlinkDip(value as unknown as number)),
      earLInterp.addListener(({ value }) => setEarLTransform(value as unknown as string)),
      earRInterp.addListener(({ value }) => setEarRTransform(value as unknown as string)),
      tailInterp.addListener(({ value }) => setTailTransform(value as unknown as string)),
    ];
    return () => {
      eyeRyInterp.removeListener(ids[0]);
      blinkDipInterp.removeListener(ids[1]);
      earLInterp.removeListener(ids[2]);
      earRInterp.removeListener(ids[3]);
      tailInterp.removeListener(ids[4]);
    };
  }, [blink, earL, earR, tail]);

  // Swap between the default eyes/cheeks/snout and an illustrated face overlay. This used
  // to crossfade via an Animated-driven opacity + a `displayFace` staging value, but that
  // three-piece dance (anim value, a value-listener syncing React state, and a staged
  // "last known face" var) had a real failure mode: whenever a new reaction interrupted an
  // in-flight fade (very easy to do — matching fires reactions in quick succession), the
  // opacity could end up parked at a mid-value with the listener's last update not
  // reflecting the latest `face`, showing neither the overlay nor the base features —
  // exactly the "face goes blank" bug. A direct swap has no intermediate state to get
  // stuck in: `face` falsy shows only the base features, full stop. When `face` IS set, its
  // opacity rides blinkDip instead of a flat 1 — briefly dipping toward 0 on the same cycle
  // as a real blink, letting the (also blinking) base eyes peek through underneath, so an
  // overlay face isn't just a frozen mask the whole time it's shown.
  const faceOpacity = face ? (blinkThroughFace ? blinkDip : 1) : 0;
  const displayFace = face;

  const aspect = STAGE_H / STAGE_W;
  const width = size;
  const height = size * aspect;
  const reactRotDeg = reactRot.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] });
  // The idle float's own tilt (see the floatY loop above) — a separate transform entry from
  // reactRotDeg so the two compose (idle tilt, then any one-shot reaction wobble on top)
  // instead of one overwriting the other.
  const floatRotDeg = floatY.interpolate({ inputRange: [-14, 0], outputRange: ['1deg', '-1deg'] });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          transform: [
            { translateY: Animated.add(floatY, reactY) },
            { rotate: floatRotDeg },
            { rotate: reactRotDeg },
          ],
        },
        style,
      ]}
    >
      {/* A root <svg> defaults to clipping anything outside its viewBox (unlike a plain div,
          which is what the website actually uses) — that's what was cutting off tall hats
          (party hat, santa hat) and wide capes/halos that legitimately draw above y=0 or past
          the 440x460 stage edges. overflow:visible here matches the website's real behavior:
          nothing about the pig itself changes size, equipped items just aren't clipped. */}
      <Svg width={width} height={height} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} style={{ overflow: 'visible' }}>
        <Defs>
          {/* Base fills — gradient stop angles converted from the website's CSS
              (linear-gradient(165deg,...) etc.) to precise SVG x1/y1/x2/y2 so the tilt matches. */}
          <RadialGradient id={gid('hm-shadow')} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#D678A0" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D678A0" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={gid('hm-body')} x1="36.6%" y1="0%" x2="63.4%" y2="100%">
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
          <LinearGradient id={gid('hm-arm-l')} x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFD0E1" />
            <Stop offset="100%" stopColor="#FFBCD4" />
          </LinearGradient>
          <LinearGradient id={gid('hm-arm-r')} x1="68.2%" y1="0%" x2="31.8%" y2="100%">
            <Stop offset="0%" stopColor="#FFD0E1" />
            <Stop offset="100%" stopColor="#FFBCD4" />
          </LinearGradient>
          <LinearGradient id={gid('hm-ear-l')} x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFC6DC" />
            <Stop offset="100%" stopColor="#FF9FC1" />
          </LinearGradient>
          <LinearGradient id={gid('hm-ear-r')} x1="68.2%" y1="0%" x2="31.8%" y2="100%">
            <Stop offset="0%" stopColor="#FFC6DC" />
            <Stop offset="100%" stopColor="#FF9FC1" />
          </LinearGradient>
          <LinearGradient id={gid('hm-head')} x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFD9E7" />
            <Stop offset="58%" stopColor="#FFC6DB" />
            <Stop offset="100%" stopColor="#FFB8D0" />
          </LinearGradient>
          <LinearGradient id={gid('hm-snout')} x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFB3CD" />
            <Stop offset="100%" stopColor="#FF96B8" />
          </LinearGradient>

          {/* Highlight/shadow overlays — approximate the CSS's inset box-shadows (glossy
              top-left highlight, soft bottom-right/bottom shadow) that give the puffy 3D look. */}
          <RadialGradient id={gid('hm-body-shine')} cx="32%" cy="24%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-body-shadow')} cx="74%" cy="78%" r="60%">
            <Stop offset="0%" stopColor="#E783AA" stopOpacity={0.32} />
            <Stop offset="100%" stopColor="#E783AA" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-head-shine')} cx="28%" cy="22%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-head-shadow')} cx="76%" cy="80%" r="60%">
            <Stop offset="0%" stopColor="#E783AA" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#E783AA" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-arm-shadow-l')} cx="76%" cy="80%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-arm-shadow-r')} cx="24%" cy="80%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-ear-shadow-l')} cx="76%" cy="82%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-ear-shadow-r')} cx="24%" cy="82%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-snout-shine')} cx="50%" cy="18%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-snout-shadow')} cx="50%" cy="84%" r="55%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.32} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-snout-drop')} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={gid('hm-foot-shadow')} cx="50%" cy="90%" r="55%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
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

          <ClipPath id={gid('hm-clip-body')}><Ellipse cx={220} cy={287} rx={150} ry={125} /></ClipPath>
          <ClipPath id={gid('hm-clip-head')}><Ellipse cx={220} cy={198} rx={138} ry={124} /></ClipPath>
          <ClipPath id={gid('hm-clip-arm-l')}><Rect x={54} y={262} width={ARM_W} height={ARM_H} rx={ARM_R} ry={ARM_R} /></ClipPath>
          <ClipPath id={gid('hm-clip-arm-r')}><Rect x={326} y={262} width={ARM_W} height={ARM_H} rx={ARM_R} ry={ARM_R} /></ClipPath>
          <ClipPath id={gid('hm-clip-snout')}><Ellipse cx={220} cy={212} rx={59} ry={42} /></ClipPath>
          <ClipPath id={gid('hm-clip-foot-l')}><Rect x={120} y={374} width={FOOT_W} height={FOOT_H} rx={FOOT_R} ry={FOOT_R} /></ClipPath>
          <ClipPath id={gid('hm-clip-foot-r')}><Rect x={260} y={374} width={FOOT_W} height={FOOT_H} rx={FOOT_R} ry={FOOT_R} /></ClipPath>
          <ClipPath id={gid('hm-clip-ear')}><Path d={EAR_PATH} /></ClipPath>
        </Defs>

        {/* back-layer equipped items (e.g. capes) — drawn behind body/arms/head */}
        {backItems.map((item) => <EquippedItem key={item.id} item={item} />)}

        {/* shadow */}
        <Ellipse cx={220} cy={417} rx={150} ry={23} fill={gidUrl('hm-shadow')} />

        {/* feet */}
        <Rect x={120} y={374} width={FOOT_W} height={FOOT_H} rx={FOOT_R} ry={FOOT_R} fill="#F7A8C4" />
        <Rect x={260} y={374} width={FOOT_W} height={FOOT_H} rx={FOOT_R} ry={FOOT_R} fill="#F7A8C4" />
        <Rect x={120} y={374} width={FOOT_W} height={FOOT_H} rx={FOOT_R} ry={FOOT_R} fill={gidUrl('hm-foot-shadow')} clipPath={gidUrl('hm-clip-foot-l')} />
        <Rect x={260} y={374} width={FOOT_W} height={FOOT_H} rx={FOOT_R} ry={FOOT_R} fill={gidUrl('hm-foot-shadow')} clipPath={gidUrl('hm-clip-foot-r')} />

        {/* tail */}
        <G transform="translate(362, 236)">
          <G transform={tailTransform}>
            <Path
              d="M 9,31 C 9,11 27,5 39,15 C 51,25 49,41 39,47 C 29,53 17,49 15,41 C 13,33 21,31 27,33"
              fill="none" stroke="#F7ADD0" strokeWidth={6} strokeLinecap="round"
              transform="scale(0.7857)"
            />
            <Circle cx={21.2} cy={25.9} r={2.75} fill="#F0A0BE" />
          </G>
        </G>

        {/* arms */}
        <Rect x={54} y={262} width={ARM_W} height={ARM_H} rx={ARM_R} ry={ARM_R} fill={gidUrl('hm-arm-l')} />
        <Rect x={54} y={262} width={ARM_W} height={ARM_H} rx={ARM_R} ry={ARM_R} fill={gidUrl('hm-arm-shadow-l')} clipPath={gidUrl('hm-clip-arm-l')} />
        <Rect x={326} y={262} width={ARM_W} height={ARM_H} rx={ARM_R} ry={ARM_R} fill={gidUrl('hm-arm-r')} />
        <Rect x={326} y={262} width={ARM_W} height={ARM_H} rx={ARM_R} ry={ARM_R} fill={gidUrl('hm-arm-shadow-r')} clipPath={gidUrl('hm-clip-arm-r')} />

        {/* body */}
        <Ellipse cx={220} cy={287} rx={150} ry={125} fill={gidUrl('hm-body')} />
        <Ellipse cx={220} cy={287} rx={150} ry={125} fill={gidUrl('hm-body-shadow')} clipPath={gidUrl('hm-clip-body')} />
        <Ellipse cx={220} cy={287} rx={150} ry={125} fill={gidUrl('hm-body-shine')} clipPath={gidUrl('hm-clip-body')} />
        <Ellipse cx={220} cy={330} rx={75} ry={60} fill={gidUrl('hm-tummy')} />

        {/* ears */}
        <G transform="translate(106, 54)">
          <G transform={earLTransform}>
            <Path d={EAR_PATH} fill={gidUrl('hm-ear-l')} />
            <Path d={EAR_PATH} fill={gidUrl('hm-ear-shadow-l')} clipPath={gidUrl('hm-clip-ear')} />
            <Ellipse cx={32} cy={38} rx={13} ry={20} fill="#F48BB0" />
          </G>
        </G>
        <G transform="translate(270, 54)">
          <G transform={earRTransform}>
            <Path d={EAR_PATH} fill={gidUrl('hm-ear-r')} />
            <Path d={EAR_PATH} fill={gidUrl('hm-ear-shadow-r')} clipPath={gidUrl('hm-clip-ear')} />
            <Ellipse cx={32} cy={38} rx={13} ry={20} fill="#F48BB0" />
          </G>
        </G>

        {/* head */}
        <Ellipse cx={220} cy={198} rx={138} ry={124} fill={gidUrl('hm-head')} />
        <Ellipse cx={220} cy={198} rx={138} ry={124} fill={gidUrl('hm-head-shadow')} clipPath={gidUrl('hm-clip-head')} />
        <Ellipse cx={220} cy={198} rx={138} ry={124} fill={gidUrl('hm-head-shine')} clipPath={gidUrl('hm-clip-head')} />

        {/* cheeks, eyes, snout — crossfade out when an illustrated face overlay replaces
            them (smooth version of the website's .has-face-overlay opacity transition;
            always rendered, opacity-driven, instead of an instant conditional swap). */}
        <G opacity={1 - faceOpacity}>
          <Ellipse cx={134} cy={222} rx={28} ry={20} fill={gidUrl('hm-cheek-l')} />
          <Ellipse cx={306} cy={222} rx={28} ry={20} fill={gidUrl('hm-cheek-r')} />

          <Ellipse cx={141} cy={193} rx={19} ry={eyeRy} fill="#3A2230" />
          <Ellipse cx={299} cy={193} rx={19} ry={eyeRy} fill="#3A2230" />
          <Circle cx={134.5} cy={186.5} r={6.5} fill="#FFFFFF" />
          <Circle cx={145} cy={198} r={3.5} fill="#FFFFFF" fillOpacity={0.7} />
          <Circle cx={292.5} cy={186.5} r={6.5} fill="#FFFFFF" />
          <Circle cx={303} cy={198} r={3.5} fill="#FFFFFF" fillOpacity={0.7} />

          {/* soft drop shadow drawn first so it peeks out from beneath the fill */}
          <Ellipse cx={220} cy={218} rx={56} ry={36} fill={gidUrl('hm-snout-drop')} />
          <Ellipse cx={220} cy={212} rx={59} ry={42} fill={gidUrl('hm-snout')} />
          <Ellipse cx={220} cy={212} rx={59} ry={42} fill={gidUrl('hm-snout-shadow')} clipPath={gidUrl('hm-clip-snout')} />
          <Ellipse cx={220} cy={212} rx={59} ry={42} fill={gidUrl('hm-snout-shine')} clipPath={gidUrl('hm-clip-snout')} />
          <Ellipse cx={191} cy={212} rx={10} ry={15} fill="#D9608C" />
          <Ellipse cx={249} cy={212} rx={10} ry={15} fill="#D9608C" />
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
