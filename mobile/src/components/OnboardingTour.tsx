import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from 'react';
import { Animated, Easing, View, Pressable, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { colors, font, radius } from '@/theme';
import { useStore } from '@/store';
import { Txt } from './Txt';
import { Button } from './Button';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
// Matches the website's `.tour-spotlight`/`.tour-tooltip` transition (0.25s ease) — same
// duration and a comparable curve, so the tour feels the same on both platforms.
const TOUR_TRANSITION_MS = 250;
const TOUR_EASING = Easing.inOut(Easing.ease);

/** Mirrors the website's onboarding spotlight tour (see app.js's ONBOARDING_TOUR_STEPS) —
 * four stops (XP, the Shop, tapping into Modules, starting a lesson), shown once right
 * after a first-time user finishes the onboarding survey. Copy stays as tight as possible
 * on purpose — this is a quick "point at a real element, explain it, Next" tour, not a
 * wall of text. No Tools stop: that UI is still changing, so a "what does this do" step
 * would go stale fast.
 */
const TOUR_STEPS: { targetId: string; title: string; body: string; requiresRealClick?: boolean }[] = [
  {
    targetId: 'tour-xp',
    title: 'Earn XP as you go',
    body: 'Finish lessons and quests to earn XP and level up through the tiers.',
  },
  {
    targetId: 'tour-shop-tab',
    title: 'Spend coins & diamonds in the Shop',
    body: 'Coins come from lessons, diamonds from bigger streak milestones. Spend either on outfits or room decor for Hammy.',
  },
  {
    // Advanced by the real tap itself, not the Next button (see requiresRealClick handling
    // below and TabBar.tsx's advanceIfWaitingOn call) — the user practices the actual
    // navigation instead of reading about it.
    targetId: 'tour-modules-tab',
    title: 'Head to Modules',
    body: 'Tap Modules to see everything you can learn.',
    requiresRealClick: true,
  },
  {
    // The Modules screen starts with the active (for a first-time user, the first) module
    // already expanded by default — see (tabs)/modules.tsx's initial `expanded` state — so
    // this is measurable the moment the screen mounts, no forced-open step needed the way
    // the website's equivalent step has to force its module row open.
    targetId: 'tour-lesson-tile',
    title: 'Start a lesson',
    body: 'Tap a lesson to start it — finish them in order to complete the module.',
  },
];

type MeasuredRect = { x: number; y: number; width: number; height: number };

type TourCtx = {
  registerTarget: (id: string, ref: RefObject<View | null>) => void;
  unregisterTarget: (id: string) => void;
  startTour: () => void;
  /** Screens call this from their OWN onPress handler when they ARE the real element a
   * requiresRealClick step is currently waiting on — advances the tour if (and only if)
   * that's actually the case right now, a no-op otherwise, so it's always safe to call
   * unconditionally alongside the element's normal onPress behavior. */
  advanceIfWaitingOn: (targetId: string) => void;
};

const TourContext = createContext<TourCtx | null>(null);

export function useOnboardingTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useOnboardingTour must be used within OnboardingTourProvider');
  return ctx;
}

/** Wrap any real, on-screen element in this to make it spotlight-able by id. `collapsable={
 * false}` matters on Android — a plain wrapper View with a single child is otherwise a
 * candidate for native view-flattening, which would leave the ref with nothing real to
 * measure. */
export function TourTarget({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const ref = useRef<View>(null);
  const { registerTarget, unregisterTarget } = useOnboardingTour();
  useEffect(() => {
    registerTarget(id, ref);
    return () => unregisterTarget(id);
  }, [id, registerTarget, unregisterTarget]);
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}

/** TourTarget, but skippable — for a list where only ONE item (e.g. the first) should ever
 * be a tour stop. Passing `id={undefined}` (every other item) renders children plain,
 * un-wrapped; this is a conditional render, not a conditionally-called hook, so it's safe
 * for different items in the same list to take different branches. */
export function MaybeTourTarget({ id, children, style }: { id?: string; children: ReactNode; style?: ViewStyle }) {
  if (!id) return <>{children}</>;
  return <TourTarget id={id} style={style}>{children}</TourTarget>;
}

export function OnboardingTourProvider({ children }: { children: ReactNode }) {
  const { markOnboardingTourSeen } = useStore();
  const targets = useRef(new Map<string, RefObject<View | null>>()).current;
  const [stepIdx, setStepIdx] = useState<number | null>(null);
  const [rect, setRect] = useState<MeasuredRect | null>(null);

  const measure = useCallback((idx: number) => {
    const ref = targets.get(TOUR_STEPS[idx].targetId);
    if (!ref?.current) { setRect(null); return; }
    ref.current.measureInWindow((x, y, width, height) => {
      setRect(width > 0 || height > 0 ? { x, y, width, height } : null);
    });
  }, [targets]);

  const startTour = useCallback(() => {
    setRect(null);
    setStepIdx(0);
    // The target that matters most for step 1 (the Home stat row) has usually just mounted
    // a beat earlier from the survey->home navigation, so give layout two passes to settle
    // before trusting a measurement — one rAF, one short timeout as a fallback for anything
    // slower (a font swap, a still-finishing screen transition).
    requestAnimationFrame(() => measure(0));
    setTimeout(() => measure(0), 200);
  }, [measure]);

  const goToStep = useCallback((idx: number) => {
    setStepIdx(idx);
    setRect(null);
    requestAnimationFrame(() => measure(idx));
    setTimeout(() => measure(idx), 200);
  }, [measure]);

  const finish = useCallback(() => {
    setStepIdx(null);
    markOnboardingTourSeen();
  }, [markOnboardingTourSeen]);

  const advance = useCallback(() => {
    setStepIdx((i) => {
      if (i === null) return null;
      if (i + 1 >= TOUR_STEPS.length) { finish(); return null; }
      goToStep(i + 1);
      return i + 1;
    });
  }, [finish, goToStep]);

  const advanceIfWaitingOn = useCallback((targetId: string) => {
    setStepIdx((i) => {
      if (i === null) return i;
      const step = TOUR_STEPS[i];
      if (!step.requiresRealClick || step.targetId !== targetId) return i;
      if (i + 1 >= TOUR_STEPS.length) { finish(); return null; }
      goToStep(i + 1);
      return i + 1;
    });
  }, [finish, goToStep]);

  const registerTarget = useCallback((id: string, ref: RefObject<View | null>) => {
    targets.set(id, ref);
    // The Shop/Modules tabs (inside the always-mounted TabBar) are present from the very
    // first render, but a tab SCREEN's own targets (the Home stat row, a Modules lesson
    // tile) mount/unmount as the user navigates — if one registers itself WHILE its step is
    // already active and waiting, take the opportunity to measure it immediately instead of
    // leaving a stale/missing spotlight.
    if (stepIdx !== null && TOUR_STEPS[stepIdx].targetId === id) {
      requestAnimationFrame(() => measure(stepIdx));
    }
  }, [targets, stepIdx, measure]);
  const unregisterTarget = useCallback((id: string) => { targets.delete(id); }, [targets]);

  const ctxValue = useMemo<TourCtx>(
    () => ({ registerTarget, unregisterTarget, startTour, advanceIfWaitingOn }),
    [registerTarget, unregisterTarget, startTour, advanceIfWaitingOn],
  );

  const activeStep = stepIdx !== null ? TOUR_STEPS[stepIdx] : null;

  return (
    <TourContext.Provider value={ctxValue}>
      {children}
      {activeStep ? (
        <TourOverlay
          step={activeStep}
          stepNum={stepIdx! + 1}
          totalSteps={TOUR_STEPS.length}
          rect={rect}
          isLast={stepIdx === TOUR_STEPS.length - 1}
          onNext={advance}
          onSkip={finish}
        />
      ) : null}
    </TourContext.Provider>
  );
}

function TourOverlay({
  step, stepNum, totalSteps, rect, isLast, onNext, onSkip,
}: {
  step: { title: string; body: string; requiresRealClick?: boolean };
  stepNum: number;
  totalSteps: number;
  rect: MeasuredRect | null;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  const pad = 8;
  const spotlight = rect ? {
    x: rect.x - pad, y: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
  } : null;

  const margin = 14;
  const tooltipW = Math.min(300, winW - margin * 2);
  const estimatedTooltipH = 168;
  let tooltipTop: number;
  let tooltipLeft: number;
  if (spotlight) {
    const belowTop = spotlight.y + spotlight.height + margin;
    tooltipTop = belowTop + estimatedTooltipH > winH - margin
      ? Math.max(margin, spotlight.y - margin - estimatedTooltipH)
      : belowTop;
    tooltipLeft = Math.min(Math.max(margin, spotlight.x), winW - tooltipW - margin);
  } else {
    // No measurable target (not on screen yet, or mid-transition) — center the tooltip so
    // the step's text is always readable instead of the tour silently doing nothing.
    tooltipTop = winH / 2 - estimatedTooltipH / 2;
    tooltipLeft = (winW - tooltipW) / 2;
  }

  // Animates the spotlight ring/mask-hole and tooltip smoothly between positions instead of
  // snapping — matches the website's `transition: top/left/width/height 0.25s ease` on
  // .tour-spotlight/.tour-tooltip. Lazily initialized from the CURRENT values so the very
  // first render (TourOverlay mounts fresh each time a tour starts) doesn't animate in from
  // some arbitrary default — only step-to-step changes after that actually animate.
  const animX = useRef(new Animated.Value(spotlight?.x ?? 0)).current;
  const animY = useRef(new Animated.Value(spotlight?.y ?? 0)).current;
  const animW = useRef(new Animated.Value(spotlight?.width ?? 0)).current;
  const animH = useRef(new Animated.Value(spotlight?.height ?? 0)).current;
  const animOpacity = useRef(new Animated.Value(spotlight ? 1 : 0)).current;
  const animTooltipTop = useRef(new Animated.Value(tooltipTop)).current;
  const animTooltipLeft = useRef(new Animated.Value(tooltipLeft)).current;

  useEffect(() => {
    const timing = (value: Animated.Value, toValue: number) => Animated.timing(value, { toValue, duration: TOUR_TRANSITION_MS, easing: TOUR_EASING, useNativeDriver: false });
    const animations = [
      timing(animTooltipTop, tooltipTop),
      timing(animTooltipLeft, tooltipLeft),
      timing(animOpacity, spotlight ? 1 : 0),
    ];
    if (spotlight) {
      animations.push(timing(animX, spotlight.x), timing(animY, spotlight.y), timing(animW, spotlight.width), timing(animH, spotlight.height));
    }
    Animated.parallel(animations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlight?.x, spotlight?.y, spotlight?.width, spotlight?.height, tooltipTop, tooltipLeft]);

  // requiresRealClick needs the real element underneath genuinely tappable, not just
  // visually not-covered — a single full-screen Pressable (used for every other step)
  // would swallow that tap same as anywhere else. Framing the hole with four separate
  // blocking rectangles instead, with NOTHING covering the spotlight rect itself, means a
  // tap there simply never reaches a blocking view at all and falls through to the real
  // TabBar tab underneath — no z-index trick needed (React Native doesn't have web's
  // stacking-context nuance here, but it also has no clip-path; this is the RN-native way
  // to get the same "real hole" result). Falls back to full blocking (like every other
  // step) until a valid rect exists — better to block everything briefly than guess wrong.
  // Unlike the visual ring/mask above, these snap immediately rather than animating — they
  // only matter for the one static requiresRealClick step, so tracking the animation in
  // progress isn't worth the extra Animated-arithmetic complexity.
  const punchHole = !!step.requiresRealClick && !!spotlight;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark scrim — visual only, via an SVG mask (RN has no equivalent of the web's
          oversized box-shadow trick); never intercepts touches itself. */}
      <Svg width={winW} height={winH} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Mask id="tour-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={winW} height={winH}>
            <Rect x={0} y={0} width={winW} height={winH} fill="#fff" />
            <AnimatedRect x={animX} y={animY} width={animW} height={animH} rx={14} fill="#000" opacity={animOpacity} />
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={winW} height={winH} fill="rgba(20,26,20,0.62)" mask="url(#tour-mask)" />
      </Svg>

      {punchHole ? (
        <>
          <BlockRect x={0} y={0} width={winW} height={spotlight!.y} />
          <BlockRect x={0} y={spotlight!.y + spotlight!.height} width={winW} height={winH - (spotlight!.y + spotlight!.height)} />
          <BlockRect x={0} y={spotlight!.y} width={spotlight!.x} height={spotlight!.height} />
          <BlockRect x={spotlight!.x + spotlight!.width} y={spotlight!.y} width={winW - (spotlight!.x + spotlight!.width)} height={spotlight!.height} />
        </>
      ) : (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
      )}

      <Animated.View
        pointerEvents="none"
        style={[styles.spotlightRing, {
          top: animY, left: animX, width: animW, height: animH, opacity: animOpacity,
        }]}
      />

      <Animated.View style={[styles.tooltip, { top: animTooltipTop, left: animTooltipLeft, width: tooltipW }]}>
        <Txt style={styles.stepLabel}>{`STEP ${stepNum} OF ${totalSteps}`}</Txt>
        <Txt style={styles.title}>{step.title}</Txt>
        <Txt style={styles.body}>{step.body}</Txt>
        <View style={styles.footer}>
          <Pressable onPress={onSkip} hitSlop={8}>
            <Txt style={styles.skip}>Skip tour</Txt>
          </Pressable>
          {/* requiresRealClick steps advance only via the real element itself — Next would
              just be a redundant second way to skip past actually tapping the thing being
              taught, so it's left out entirely rather than shown disabled. */}
          {step.requiresRealClick ? null : (
            <Button label={isLast ? 'Got it →' : 'Next →'} size="sm" onPress={onNext} style={styles.nextBtn} />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/** One opaque, touch-blocking strip of the "frame" around a punched-through spotlight hole. */
function BlockRect({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;
  return <Pressable onPress={() => {}} style={{ position: 'absolute', left: x, top: y, width, height }} />;
}

const styles = StyleSheet.create({
  spotlightRing: {
    position: 'absolute', borderRadius: 14, borderWidth: 2, borderColor: colors.white,
  },
  tooltip: {
    position: 'absolute', backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16,
    shadowColor: '#2C3E2D', shadowOpacity: 0.16, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  stepLabel: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.5, color: colors.muted4, marginBottom: 5 },
  title: { fontFamily: font.display, fontSize: 16.5, color: colors.ink, marginBottom: 5 },
  body: { fontFamily: font.semi, fontSize: 13, color: colors.muted1, lineHeight: 18.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  skip: { fontFamily: font.extra, fontSize: 12.5, color: colors.muted4 },
  nextBtn: { paddingHorizontal: 18 },
});
