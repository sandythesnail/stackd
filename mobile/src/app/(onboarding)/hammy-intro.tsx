import { useEffect, useRef, useState, useId } from 'react';
import { View, Animated, Easing, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Ellipse, Circle, Polygon, Defs, ClipPath, G } from 'react-native-svg';
import { Txt, Hammy, Coin, Diamond } from '@/components';
import { colors, font } from '@/theme';
import { REACTION_FACES, MOOD_FACES, type FaceOverlay } from '@/hammyFaces';

/** Screen — animated "meet Hammy" intro. Replaces the old static piggy-born
 * screen and now runs AFTER the survey, BEFORE the home-screen spotlight tour:
 * the piggy bank drops in, cracks open in a coin/diamond/sparkle burst, Hammy
 * emerges and walks the user through three tappable dialogue beats, then hops
 * off-screen and lands them on Home (where the tour auto-starts for first-time
 * users — see home.tsx). Ported from the website's hammy-intro.js.
 *
 * No jingle SFX here yet: the repo has no audio library (expo-av/expo-audio)
 * and adding a native module is a build-affecting decision — the web version
 * has a placeholder WebAudio jingle; wire a real asset through expo-audio when
 * one is commissioned. */

const GREEN_DARK = '#4A6844';
const GREEN = '#6B8F65';

/* Face per dialogue line — same entries the rest of the app uses (hammyFaces). */
const SCRIPT: { text: string; face: FaceOverlay; reply: string | null }[] = [
  { text: 'Hi, I’m Hammy!', face: REACTION_FACES.streak, reply: 'Hi Hammy! Who are you?' },
  { text: 'I’ll be guiding you along your journey with financial literacy!', face: MOOD_FACES.wink, reply: 'Sounds good, I’m excited!' },
  { text: 'Let’s go!', face: MOOD_FACES.star, reply: null },
];

/* ── Piggy-bank artwork (same user-commissioned drawing as the website's
   hammy-intro.js BANK_ART), in a 400x320 viewBox. `half` clips it to the
   left/right of the jagged crack line so the two copies can fly apart. */
const CLIP_L = '0,0 212,0 184,96 220,176 180,250 208,320 0,320';
const CLIP_R = '212,0 400,0 400,320 208,320 180,250 220,176 184,96';

function BankHalf({ half, uid }: { half: 'l' | 'r'; uid: string }) {
  const body = { fill: '#fcd5e3', stroke: '#4e353b', strokeWidth: 6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const inner = { fill: '#f99bbd' };
  const outline = { stroke: '#4e353b', strokeWidth: 6, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const dark = { fill: '#4e353b' };
  const clipId = `bankClip-${half}-${uid}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 320">
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={half === 'l' ? CLIP_L : CLIP_R} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path {...body} d="M 125,113 C 118,67 148,53 162,91 Z" />
        <Path {...inner} d="M 132,107 C 127,77 146,67 155,89 Z" />
        <Path {...outline} d="M 132,107 C 127,77 146,67 155,89" />
        <Rect {...body} x={135} y={215} width={32} height={35} rx={12} />
        <Rect {...body} x={225} y={215} width={32} height={35} rx={12} />
        <Path {...outline} d="M 312,165 C 335,165 342,135 322,135 C 305,135 308,158 322,154" />
        <Ellipse {...body} cx={210} cy={165} rx={105} ry={78} />
        <Rect {...body} x={155} y={218} width={32} height={35} rx={12} />
        <Rect {...body} x={245} y={218} width={32} height={35} rx={12} />
        <Path {...body} d="M 150,118 C 142,70 178,56 192,96 Z" />
        <Path {...inner} d="M 158,112 C 152,78 175,68 184,96 Z" />
        <Path {...outline} d="M 158,112 C 152,78 175,68 184,96" />
        <Rect {...dark} x={192} y={100} width={48} height={8} rx={4} />
        <Ellipse {...body} cx={102} cy={180} rx={18} ry={24} />
        <Ellipse {...inner} cx={102} cy={180} rx={12} ry={17} />
        <Ellipse {...dark} cx={97} cy={180} rx={2.5} ry={6} />
        <Ellipse {...dark} cx={107} cy={180} rx={2.5} ry={6} />
        <Circle fill="#f57ba6" opacity={0.85} cx={150} cy={184} r={14} />
        <Circle {...dark} cx={136} cy={144} r={8.5} />
        <Circle fill="#ffffff" cx={133.5} cy={141.5} r={3} />
        <Path fill="#ffffff" opacity={0.5} d="M 285,130 C 270,110 240,108 220,110 C 245,108 275,117 288,138 Z" />
      </G>
    </Svg>
  );
}

/* ── Burst particles ── */
type CurrencyCfg = { kind: 'coin' | 'diamond'; size: number; vx: number; vy: number; spin: number; dur: number };
type SparkleCfg = { size: number; dx: number; dy: number; dur: number; color: string };

function CurrencyParticle({ cfg }: { cfg: CurrencyCfg }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: cfg.dur, easing: Easing.bezier(0.15, 0.6, 0.5, 1), useNativeDriver: true }).start();
  }, []);
  const style = {
    transform: [
      { translateX: p.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0, cfg.vx * 0.5, cfg.vx * 0.75] }) },
      { translateY: p.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0, cfg.vy * 0.5 + 180, cfg.vy * 0.75 + 520] }) },
      { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${cfg.spin}deg`] }) },
    ],
    opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
  };
  return (
    <Animated.View style={[styles.particle, style]}>
      {cfg.kind === 'coin' ? <Coin size={cfg.size} /> : <Diamond size={cfg.size} />}
    </Animated.View>
  );
}

function SparkleParticle({ cfg }: { cfg: SparkleCfg }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: cfg.dur, easing: Easing.bezier(0.2, 0.7, 0.4, 1), useNativeDriver: true }).start();
  }, []);
  const style = {
    transform: [
      { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dx] }) },
      { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dy] }) },
      { scale: p.interpolate({ inputRange: [0, 0.35, 0.6, 1], outputRange: [0.2, 1.25, 0.7, 1.1] }) },
      { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
    ],
    opacity: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.9, 0] }),
  };
  return (
    <Animated.View style={[styles.particle, style]}>
      <Svg width={cfg.size} height={cfg.size} viewBox="0 0 100 100">
        <Polygon points="50,0 61,39 100,50 61,61 50,100 39,61 0,50 39,39" fill={cfg.color} />
      </Svg>
    </Animated.View>
  );
}

function makeBurst(count: number): CurrencyCfg[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 3.0;
    const speed = 300 + Math.random() * 380;
    return {
      kind: i % 5 !== 3 ? 'coin' as const : 'diamond' as const, // ~4:1, coins are the common currency
      size: 30 + Math.random() * 22,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 1100,
      dur: 1000 + Math.random() * 500,
    };
  });
}

function makeSparkles(count: number): SparkleCfg[] {
  const palette = ['#FF96B8', '#FFC400', '#FFFFFF', '#FFD9E7'];
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 260;
    return {
      size: 9 + Math.random() * 12,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.8 - 50,
      dur: 500 + Math.random() * 450,
      color: palette[i % palette.length],
    };
  });
}

export default function HammyIntro() {
  const router = useRouter();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { width: W, height: H } = useWindowDimensions();

  // Bank sized like the website: width-bound on phones, height-capped so the
  // 0.8-aspect drawing never overflows vertically; centered on the screen.
  const bankW = Math.min(W * 0.98, H * 1.1);
  const bankH = bankW * 0.8;

  const [phase, setPhase] = useState<'bank' | 'dialogue' | 'leaving'>('bank');
  const [lineIdx, setLineIdx] = useState(0);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [burst, setBurst] = useState<CurrencyCfg[]>([]);
  const [sparkles, setSparkles] = useState<SparkleCfg[]>([]);

  const bankOp = useRef(new Animated.Value(0)).current;
  const bankY = useRef(new Animated.Value(-H * 0.3)).current;
  const bankRot = useRef(new Animated.Value(0)).current;
  const crackOp = useRef(new Animated.Value(0)).current;
  const popP = useRef(new Animated.Value(0)).current;   // drives both halves' fly-apart
  const ringP = useRef(new Animated.Value(0)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const emergeP = useRef(new Animated.Value(0)).current;
  const waveRot = useRef(new Animated.Value(0)).current;
  const hopX = useRef(new Animated.Value(0)).current;
  const hopY = useRef(new Animated.Value(0)).current;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  const at = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

  /* Single exit path for the natural ending and Skip — clears every pending
     timer so nothing fires after navigation. push, not replace: crossing into
     the (tabs) branch via replace() has a known blank-screen failure (see
     survey.tsx / results.tsx). */
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    router.push('/(tabs)/home');
  };

  const playWave = () => {
    waveRot.setValue(0);
    const t = (v: number, d: number) =>
      Animated.timing(waveRot, { toValue: v, duration: d, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
    Animated.sequence([t(-6, 160), t(5, 200), t(-4, 200), t(2.5, 180), t(0, 160)]).start();
  };

  const showLine = (idx: number) => {
    setLineIdx(idx);
    setBubbleText(SCRIPT[idx].text);
    setReply(null);
    playWave();
    if (SCRIPT[idx].reply !== null) {
      at(1300, () => setReply(SCRIPT[idx].reply));
    } else {
      // hold "Let's go!", then hop off in a straight line and land on Home
      at(1600, () => {
        setBubbleText(null);
        setPhase('leaving');
        const up = () => Animated.timing(hopY, { toValue: -70, duration: 165, easing: Easing.out(Easing.quad), useNativeDriver: true });
        const down = () => Animated.timing(hopY, { toValue: 0, duration: 165, easing: Easing.in(Easing.quad), useNativeDriver: true });
        Animated.parallel([
          Animated.timing(hopX, { toValue: W * 0.75 + 260, duration: 1090, easing: Easing.linear, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(hopY, { toValue: 8, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            up(), down(), up(), down(), up(), down(),
          ]),
        ]).start();
      });
      at(2600, finish);
    }
  };

  useEffect(() => {
    // 0.00 bank drops in with a bounce
    Animated.parallel([
      Animated.timing(bankOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(bankY, { toValue: 0, speed: 14, bounciness: 9, useNativeDriver: true }),
    ]).start();

    // 0.80 wobble + crack flicker
    at(800, () => {
      const r = (v: number, d: number) =>
        Animated.timing(bankRot, { toValue: v, duration: d, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
      Animated.sequence([r(-4, 90), r(4, 110), r(-3.5, 110), r(3, 110), r(0, 90)]).start();
      const c = (v: number, d: number) =>
        Animated.timing(crackOp, { toValue: v, duration: d, useNativeDriver: true });
      Animated.sequence([Animated.delay(200), c(1, 80), c(0.4, 60), c(1, 80)]).start();
    });

    // 1.35 POP — halves fly apart, flash, ring, shake, burst
    at(1350, () => {
      crackOp.setValue(0);
      Animated.timing(popP, { toValue: 1, duration: 600, easing: Easing.bezier(0.3, 0.6, 0.6, 1), useNativeDriver: true }).start();
      Animated.timing(ringP, { toValue: 1, duration: 650, easing: Easing.bezier(0.1, 0.7, 0.3, 1), useNativeDriver: true }).start();
      flashOp.setValue(1);
      Animated.timing(flashOp, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      const s = (v: number) => Animated.timing(shakeX, { toValue: v, duration: 70, useNativeDriver: true });
      Animated.sequence([s(-7), s(7), s(-4), s(3), s(0)]).start();
      setBurst(makeBurst(24));
      setSparkles(makeSparkles(14));
    });

    // 1.45 Hammy springs up (overshoot ease ≈ the website's back-out emerge)
    at(1450, () => {
      setPhase('dialogue');
      Animated.timing(emergeP, { toValue: 1, duration: 750, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }).start();
    });

    // 2.30 first dialogue line
    at(2300, () => showLine(0));

    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, []);

  const onReplyPress = () => {
    setReply(null);
    at(280, () => showLine(lineIdx + 1));
  };

  const bankRotDeg = bankRot.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  const halfL = {
    opacity: popP.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.4, 0] }),
    transform: [
      { translateX: popP.interpolate({ inputRange: [0, 1], outputRange: [0, -bankW * 0.8] }) },
      { translateY: popP.interpolate({ inputRange: [0, 1], outputRange: [0, bankH * 0.35] }) },
      { rotate: popP.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-46deg'] }) },
    ],
  };
  const halfR = {
    opacity: popP.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.4, 0] }),
    transform: [
      { translateX: popP.interpolate({ inputRange: [0, 1], outputRange: [0, bankW * 0.8] }) },
      { translateY: popP.interpolate({ inputRange: [0, 1], outputRange: [0, bankH * 0.35] }) },
      { rotate: popP.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '46deg'] }) },
    ],
  };
  const ringStyle = {
    opacity: ringP.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.95, 0] }),
    transform: [{ scale: ringP.interpolate({ inputRange: [0, 1], outputRange: [0.4, 18] }) }],
  };
  const hammyStyle = {
    opacity: emergeP.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateX: hopX },
      { translateY: Animated.add(hopY, emergeP.interpolate({ inputRange: [0, 1], outputRange: [70, 0] })) },
      { rotate: waveRot.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) },
      { scale: emergeP.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
    ],
  };

  const hammyBottom = H * 0.16;

  return (
    <View style={styles.wrap}>
      {/* piggy bank, centered on screen */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bankWrap,
          { width: bankW, height: bankH, left: (W - bankW) / 2, top: (H - bankH) / 2 - H * 0.02 },
          { opacity: bankOp, transform: [{ translateY: bankY }, { translateX: shakeX }, { rotate: bankRotDeg }] },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, halfL]}><BankHalf half="l" uid={uid} /></Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, halfR]}><BankHalf half="r" uid={uid} /></Animated.View>
        {/* crack flicker along the split */}
        <Animated.View style={[styles.crack, { opacity: crackOp, left: bankW * 0.47, top: bankH * 0.29, height: bankH * 0.48 }]}>
          <Svg width={24} height="100%" viewBox="0 0 34 120" preserveAspectRatio="none">
            <Path d="M17 0 L10 20 L23 38 L9 60 L21 80 L11 100 L17 120" fill="none" stroke="#4e353b" strokeWidth={4.5} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* shockwave ring + particles, from the bank's center */}
      <View pointerEvents="none" style={[styles.burstOrigin, { left: W / 2, top: H / 2 - H * 0.02 }]}>
        <Animated.View style={[styles.ring, ringStyle]} />
        {burst.map((cfg, i) => <CurrencyParticle key={`c${i}`} cfg={cfg} />)}
        {sparkles.map((cfg, i) => <SparkleParticle key={`s${i}`} cfg={cfg} />)}
      </View>

      {/* Hammy + dialogue */}
      {phase !== 'bank' ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.hammyWrap, { bottom: hammyBottom }, hammyStyle]}>
            <Hammy size={200} face={SCRIPT[lineIdx].face} />
          </Animated.View>
          {bubbleText !== null ? (
            <View pointerEvents="none" style={[styles.bubble, { bottom: hammyBottom + 210 }]}>
              <Txt style={styles.bubbleTxt}>{bubbleText}</Txt>
              <View style={styles.bubbleTail} />
            </View>
          ) : null}
        </>
      ) : null}

      {/* white flash on the pop */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flashOp }]} />

      <SafeAreaView style={styles.chrome} pointerEvents="box-none">
        {!finished.current ? (
          <Pressable onPress={finish} hitSlop={10} style={styles.skip}>
            <Txt style={styles.skipTxt}>Skip →</Txt>
          </Pressable>
        ) : null}
        {reply !== null ? (
          <Pressable onPress={onReplyPress} style={({ pressed }) => [styles.choice, pressed && { transform: [{ translateY: 2 }] }]}>
            <Txt style={styles.choiceTxt}>{reply}</Txt>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.screen, overflow: 'hidden' },
  bankWrap: { position: 'absolute' },
  crack: { position: 'absolute', width: 24 },
  burstOrigin: { position: 'absolute', width: 0, height: 0 },
  ring: {
    position: 'absolute',
    left: -12,
    top: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 7,
    borderColor: '#FF96B8',
  },
  particle: { position: 'absolute', left: -20, top: -20 },
  flash: { backgroundColor: 'rgba(255,255,255,0.92)' },
  hammyWrap: { position: 'absolute', alignSelf: 'center' },
  bubble: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: GREEN,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 22,
    maxWidth: '82%',
    shadowColor: GREEN_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  bubbleTxt: { fontFamily: font.extra, fontSize: 18, lineHeight: 24, color: GREEN_DARK, textAlign: 'center' },
  bubbleTail: {
    position: 'absolute',
    bottom: -13,
    alignSelf: 'center',
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: GREEN,
  },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' },
  skip: { position: 'absolute', top: 54, right: 18, padding: 8, opacity: 0.6 },
  skipTxt: { fontFamily: font.bold, fontSize: 14, color: GREEN_DARK },
  choice: {
    position: 'absolute',
    bottom: 34,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: GREEN,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    maxWidth: '86%',
    shadowColor: GREEN_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  choiceTxt: { fontFamily: font.extra, fontSize: 16, color: GREEN_DARK, textAlign: 'center' },
});
