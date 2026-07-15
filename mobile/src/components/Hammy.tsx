import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ViewStyle, View } from 'react-native';
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop, Ellipse, Circle, Path, G, ClipPath, SvgXml,
} from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ShopItemReal } from '@/content';

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

/**
 * Hammy the pig — the real mascot, redrawn as SVG from the web app's CSS illustration
 * (gradients/shapes ported from styles.css .pig-*). Idle animation: gentle float, eye
 * blink, ear wiggle, tail wag. Swap `pig` to recolor the body/head tint if ever needed;
 * no current screen does.
 */
export function Hammy({
  size = 120,
  ring = false,
  bob = true,
  pig: _pig = '#E27EA0',
  equipped = [],
  style,
}: {
  size?: number;
  ring?: boolean;
  bob?: boolean;
  pig?: string;
  /** Currently-worn shop items, matrix-transformed onto the mascot (see EquippedItem). */
  equipped?: ShopItemReal[];
  style?: ViewStyle;
}) {
  const backItems = equipped.filter((i) => i.layer === 'back');
  const frontItems = equipped.filter((i) => i.layer !== 'back');
  const floatY = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current; // 1 = open, ~0.08 = closed
  const earL = useRef(new Animated.Value(0)).current;
  const earR = useRef(new Animated.Value(0)).current;
  const tail = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!bob) return;
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

  useEffect(() => {
    const eyeRyInterp = blink.interpolate({ inputRange: [0.08, 1], outputRange: [1.6, 19] });
    const earLInterp = earL.interpolate({ inputRange: [0, 1], outputRange: ['rotate(-18 32 74)', 'rotate(-26 32 74)'] });
    const earRInterp = earR.interpolate({ inputRange: [0, 1], outputRange: ['rotate(18 32 74)', 'rotate(26 32 74)'] });
    const tailInterp = tail.interpolate({ inputRange: [0, 1], outputRange: ['rotate(-5 14 26)', 'rotate(8 14 26)'] });
    const ids = [
      eyeRyInterp.addListener(({ value }) => setEyeRy(value as unknown as number)),
      earLInterp.addListener(({ value }) => setEarLTransform(value as unknown as string)),
      earRInterp.addListener(({ value }) => setEarRTransform(value as unknown as string)),
      tailInterp.addListener(({ value }) => setTailTransform(value as unknown as string)),
    ];
    return () => {
      eyeRyInterp.removeListener(ids[0]);
      earLInterp.removeListener(ids[1]);
      earRInterp.removeListener(ids[2]);
      tailInterp.removeListener(ids[3]);
    };
  }, [blink, earL, earR, tail]);

  const aspect = STAGE_H / STAGE_W;
  const width = size;
  const height = size * aspect;

  return (
    <Animated.View
      style={[
        { width, height, transform: bob ? [{ translateY: floatY }] : undefined },
        ring
          ? {
              shadowColor: '#FF96B8',
              shadowOpacity: 0.4,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            }
          : null,
        style,
      ]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}>
        <Defs>
          {/* Base fills — gradient stop angles converted from the website's CSS
              (linear-gradient(165deg,...) etc.) to precise SVG x1/y1/x2/y2 so the tilt matches. */}
          <RadialGradient id="hm-shadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#D678A0" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D678A0" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="hm-body" x1="36.6%" y1="0%" x2="63.4%" y2="100%">
            <Stop offset="0%" stopColor="#FFD4E4" />
            <Stop offset="60%" stopColor="#FFC2D9" />
            <Stop offset="100%" stopColor="#FFB4CE" />
          </LinearGradient>
          <RadialGradient id="hm-tummy" cx="50%" cy="40%" r="70%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="hm-arm-l" x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFD0E1" />
            <Stop offset="100%" stopColor="#FFBCD4" />
          </LinearGradient>
          <LinearGradient id="hm-arm-r" x1="68.2%" y1="0%" x2="31.8%" y2="100%">
            <Stop offset="0%" stopColor="#FFD0E1" />
            <Stop offset="100%" stopColor="#FFBCD4" />
          </LinearGradient>
          <LinearGradient id="hm-ear-l" x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFC6DC" />
            <Stop offset="100%" stopColor="#FF9FC1" />
          </LinearGradient>
          <LinearGradient id="hm-ear-r" x1="68.2%" y1="0%" x2="31.8%" y2="100%">
            <Stop offset="0%" stopColor="#FFC6DC" />
            <Stop offset="100%" stopColor="#FF9FC1" />
          </LinearGradient>
          <LinearGradient id="hm-head" x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFD9E7" />
            <Stop offset="58%" stopColor="#FFC6DB" />
            <Stop offset="100%" stopColor="#FFB8D0" />
          </LinearGradient>
          <LinearGradient id="hm-snout" x1="31.8%" y1="0%" x2="68.2%" y2="100%">
            <Stop offset="0%" stopColor="#FFB3CD" />
            <Stop offset="100%" stopColor="#FF96B8" />
          </LinearGradient>

          {/* Highlight/shadow overlays — approximate the CSS's inset box-shadows (glossy
              top-left highlight, soft bottom-right/bottom shadow) that give the puffy 3D look. */}
          <RadialGradient id="hm-body-shine" cx="32%" cy="24%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-body-shadow" cx="74%" cy="78%" r="60%">
            <Stop offset="0%" stopColor="#E783AA" stopOpacity={0.32} />
            <Stop offset="100%" stopColor="#E783AA" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-head-shine" cx="28%" cy="22%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-head-shadow" cx="76%" cy="80%" r="60%">
            <Stop offset="0%" stopColor="#E783AA" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#E783AA" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-arm-shadow-l" cx="76%" cy="80%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-arm-shadow-r" cx="24%" cy="80%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-ear-shadow-l" cx="76%" cy="82%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-ear-shadow-r" cx="24%" cy="82%" r="65%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-snout-shine" cx="50%" cy="18%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-snout-shadow" cx="50%" cy="84%" r="55%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.32} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-snout-drop" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-foot-shadow" cx="50%" cy="90%" r="55%">
            <Stop offset="0%" stopColor="#D0638C" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#D0638C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hm-cheek" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor="#FF9BBE" />
            <Stop offset="100%" stopColor="#FF9BBE" stopOpacity={0} />
          </RadialGradient>

          <ClipPath id="hm-clip-body"><Ellipse cx={220} cy={287} rx={150} ry={125} /></ClipPath>
          <ClipPath id="hm-clip-head"><Ellipse cx={220} cy={198} rx={138} ry={124} /></ClipPath>
          <ClipPath id="hm-clip-arm-l"><Ellipse cx={84} cy={286} rx={30} ry={24} /></ClipPath>
          <ClipPath id="hm-clip-arm-r"><Ellipse cx={356} cy={286} rx={30} ry={24} /></ClipPath>
          <ClipPath id="hm-clip-snout"><Ellipse cx={220} cy={212} rx={59} ry={42} /></ClipPath>
          <ClipPath id="hm-clip-foot-l"><Ellipse cx={150} cy={400} rx={30} ry={26} /></ClipPath>
          <ClipPath id="hm-clip-foot-r"><Ellipse cx={290} cy={400} rx={30} ry={26} /></ClipPath>
          <ClipPath id="hm-clip-ear"><Path d={EAR_PATH} /></ClipPath>
        </Defs>

        {/* back-layer equipped items (e.g. capes) — drawn behind body/arms/head */}
        {backItems.map((item) => <EquippedItem key={item.id} item={item} />)}

        {/* shadow */}
        <Ellipse cx={220} cy={417} rx={150} ry={23} fill="url(#hm-shadow)" />

        {/* feet */}
        <Ellipse cx={150} cy={400} rx={30} ry={26} fill="#F7A8C4" />
        <Ellipse cx={290} cy={400} rx={30} ry={26} fill="#F7A8C4" />
        <Ellipse cx={150} cy={400} rx={30} ry={26} fill="url(#hm-foot-shadow)" clipPath="url(#hm-clip-foot-l)" />
        <Ellipse cx={290} cy={400} rx={30} ry={26} fill="url(#hm-foot-shadow)" clipPath="url(#hm-clip-foot-r)" />

        {/* tail */}
        <G x={362} y={236}>
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
        <Ellipse cx={84} cy={286} rx={30} ry={24} fill="url(#hm-arm-l)" />
        <Ellipse cx={84} cy={286} rx={30} ry={24} fill="url(#hm-arm-shadow-l)" clipPath="url(#hm-clip-arm-l)" />
        <Ellipse cx={356} cy={286} rx={30} ry={24} fill="url(#hm-arm-r)" />
        <Ellipse cx={356} cy={286} rx={30} ry={24} fill="url(#hm-arm-shadow-r)" clipPath="url(#hm-clip-arm-r)" />

        {/* body */}
        <Ellipse cx={220} cy={287} rx={150} ry={125} fill="url(#hm-body)" />
        <Ellipse cx={220} cy={287} rx={150} ry={125} fill="url(#hm-body-shadow)" clipPath="url(#hm-clip-body)" />
        <Ellipse cx={220} cy={287} rx={150} ry={125} fill="url(#hm-body-shine)" clipPath="url(#hm-clip-body)" />
        <Ellipse cx={220} cy={330} rx={75} ry={60} fill="url(#hm-tummy)" />

        {/* ears */}
        <G x={106} y={54}>
          <G transform={earLTransform}>
            <Path d={EAR_PATH} fill="url(#hm-ear-l)" />
            <Path d={EAR_PATH} fill="url(#hm-ear-shadow-l)" clipPath="url(#hm-clip-ear)" />
            <Ellipse cx={32} cy={38} rx={13} ry={20} fill="#F48BB0" />
          </G>
        </G>
        <G x={270} y={54}>
          <G transform={earRTransform}>
            <Path d={EAR_PATH} fill="url(#hm-ear-r)" />
            <Path d={EAR_PATH} fill="url(#hm-ear-shadow-r)" clipPath="url(#hm-clip-ear)" />
            <Ellipse cx={32} cy={38} rx={13} ry={20} fill="#F48BB0" />
          </G>
        </G>

        {/* head */}
        <Ellipse cx={220} cy={198} rx={138} ry={124} fill="url(#hm-head)" />
        <Ellipse cx={220} cy={198} rx={138} ry={124} fill="url(#hm-head-shadow)" clipPath="url(#hm-clip-head)" />
        <Ellipse cx={220} cy={198} rx={138} ry={124} fill="url(#hm-head-shine)" clipPath="url(#hm-clip-head)" />

        {/* cheeks */}
        <Ellipse cx={134} cy={222} rx={28} ry={20} fill="url(#hm-cheek)" />
        <Ellipse cx={306} cy={222} rx={28} ry={20} fill="url(#hm-cheek)" />

        {/* eyes */}
        <Ellipse cx={141} cy={193} rx={19} ry={eyeRy} fill="#3A2230" />
        <Ellipse cx={299} cy={193} rx={19} ry={eyeRy} fill="#3A2230" />
        <Circle cx={134.5} cy={186.5} r={6.5} fill="#FFFFFF" />
        <Circle cx={145} cy={198} r={3.5} fill="#FFFFFF" fillOpacity={0.7} />
        <Circle cx={292.5} cy={186.5} r={6.5} fill="#FFFFFF" />
        <Circle cx={303} cy={198} r={3.5} fill="#FFFFFF" fillOpacity={0.7} />

        {/* snout — soft drop shadow drawn first so it peeks out from beneath the fill */}
        <Ellipse cx={220} cy={218} rx={56} ry={36} fill="url(#hm-snout-drop)" />
        <Ellipse cx={220} cy={212} rx={59} ry={42} fill="url(#hm-snout)" />
        <Ellipse cx={220} cy={212} rx={59} ry={42} fill="url(#hm-snout-shadow)" clipPath="url(#hm-clip-snout)" />
        <Ellipse cx={220} cy={212} rx={59} ry={42} fill="url(#hm-snout-shine)" clipPath="url(#hm-clip-snout)" />
        <Ellipse cx={191} cy={212} rx={10} ry={15} fill="#D9608C" />
        <Ellipse cx={249} cy={212} rx={10} ry={15} fill="#D9608C" />

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
