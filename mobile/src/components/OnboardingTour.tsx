import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from 'react';
import { Animated, Easing, View, Pressable, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors, font, radius } from '@/theme';
import { useStore } from '@/store';
import { Txt } from './Txt';
import { Button } from './Button';

// Matches the website's `.tour-spotlight`/`.tour-tooltip` transition (0.25s ease) — same
// duration and a comparable curve, so the tour feels the same on both platforms.
const TOUR_TRANSITION_MS = 250;
const TOUR_EASING = Easing.inOut(Easing.ease);

/** Mirrors the website's onboarding spotlight tour (see app.js's ONBOARDING_TOUR_STEPS) —
 * five stops (XP, the Shop, Tools, Modules, starting the first lesson), shown once right
 * after a first-time user finishes the onboarding survey. Copy stays as tight as possible
 * on purpose — this is a quick "point at a real element, explain it, Next" tour, not a
 * wall of text.
 *
 * Only the LAST step (the first lesson tile) requires a real tap instead of a Next button —
 * every earlier step just explains a tab and moves on, so advancing them doesn't need the
 * user to actually be on that tab yet. Reaching the lesson-tile step specifically DOES
 * require being on the Modules screen (it's a real, measured element there), so `advance`
 * below navigates there itself when it reaches this step, rather than relying on a real tap
 * on the Modules tab the way the tour used to.
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
    // Tools lives in the always-mounted TabBar (present from the very first render, same as
    // Shop/Modules), so this needs no beforeShow drawer-opening logic the way the website's
    // equivalent step does for its collapsible mobile sidebar.
    targetId: 'tour-tools-tab',
    title: 'Do the math in Tools',
    body: 'Budget, loan payoff, and compound interest calculators — real numbers, not just lessons. Handy any time, not just while you\'re learning.',
  },
  {
    targetId: 'tour-modules-tab',
    title: 'Head to Modules',
    body: 'Everything you can learn lives here, organized module by module.',
  },
  {
    // The Modules screen starts with the active (for a first-time user, the first) module
    // already expanded by default — see (tabs)/modules.tsx's initial `expanded` state — so
    // this is measurable the moment the tour navigates there (see advance below), no forced-
    // open step needed the way the website's equivalent step has to force its module row
    // open. Advanced by the real tap itself, not a Next button (see requiresRealClick
    // handling below and ModuleLessonList.tsx's advanceIfWaitingOn call) — the user
    // practices the actual navigation instead of reading about it, and gets a yellow
    // highlight ring around the exact tile to tap (see LessonRow).
    targetId: 'tour-lesson-tile',
    title: 'Start a lesson',
    body: 'Tap this first lesson to start it — finish them in order to complete the module.',
    requiresRealClick: true,
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
  /** The current step's targetId, or null when the tour isn't active — lets a real element
   * (e.g. the first lesson tile) know it should render its own yellow "tap me" highlight
   * right now, on top of the tour's own neutral spotlight ring. */
  activeTargetId: string | null;
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
  const router = useRouter();
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
    // The lesson-tile step is the one step that needs the user to actually be on the
    // Modules screen — every earlier step only points at an always-mounted tab icon, so
    // nothing forced navigation before. Push there ourselves now that reaching this step no
    // longer depends on a real tap on the Modules tab (see TOUR_STEPS' comment above).
    if (TOUR_STEPS[idx].targetId === 'tour-lesson-tile') router.push('/(tabs)/modules');
    setStepIdx(idx);
    setRect(null);
    requestAnimationFrame(() => measure(idx));
    setTimeout(() => measure(idx), 200);
  }, [measure, router]);

  const finish = useCallback(() => {
    setStepIdx(null);
    markOnboardingTourSeen();
  }, [markOnboardingTourSeen]);

  // Both of these read `stepIdx` directly and call finish()/goToStep() as plain, top-level
  // calls — NOT from inside a setStepIdx(i => ...) updater the way this used to be written.
  // Dispatching a second setStepIdx (which is what finish() and goToStep() each do) from
  // inside another setStepIdx's updater function is exactly the kind of thing that produces
  // "the tour gets stuck / a step lingers" bugs: the updater's own `return` and the nested
  // dispatch can race, and the two updates don't reliably compose into one clean transition.
  // Reading `stepIdx` from the closure and depending on it here instead is simpler and can't
  // go stale — this function is recreated fresh every time stepIdx actually changes.
  const advance = useCallback(() => {
    if (stepIdx === null) return;
    if (stepIdx + 1 >= TOUR_STEPS.length) { finish(); return; }
    goToStep(stepIdx + 1);
  }, [stepIdx, finish, goToStep]);

  const advanceIfWaitingOn = useCallback((targetId: string) => {
    if (stepIdx === null) return;
    const step = TOUR_STEPS[stepIdx];
    if (!step.requiresRealClick || step.targetId !== targetId) return;
    if (stepIdx + 1 >= TOUR_STEPS.length) { finish(); return; }
    goToStep(stepIdx + 1);
  }, [stepIdx, finish, goToStep]);

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

  const activeStep = stepIdx !== null ? TOUR_STEPS[stepIdx] : null;

  const ctxValue = useMemo<TourCtx>(
    () => ({ registerTarget, unregisterTarget, startTour, advanceIfWaitingOn, activeTargetId: activeStep?.targetId ?? null }),
    [registerTarget, unregisterTarget, startTour, advanceIfWaitingOn, activeStep],
  );

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
  // Extra clearance specifically for the "sits above the spotlight" case (tab-bar targets
  // near the bottom of the screen almost always land here) — was overlapping the spotlighted
  // icon itself (both visually and for touch, since this card is a real view that swallows
  // taps within its bounds) whenever the real rendered card was taller than the fixed
  // estimate below, which a longer body line easily was. Real measurement (see
  // measuredTooltipH) fixes the height mismatch; this adds visible breathing room on top.
  const aboveGap = 22;
  const tooltipW = Math.min(300, winW - margin * 2);
  const estimatedTooltipH = 168;
  // Updated to the card's real rendered height once it's mounted (see onLayout below) — the
  // fixed estimate above is only a same-frame fallback before that first measurement lands.
  const [measuredTooltipH, setMeasuredTooltipH] = useState(estimatedTooltipH);
  let tooltipTop: number;
  let tooltipLeft: number;
  if (spotlight) {
    const belowTop = spotlight.y + spotlight.height + margin;
    tooltipTop = belowTop + measuredTooltipH > winH - margin
      ? Math.max(margin, spotlight.y - aboveGap - measuredTooltipH)
      : belowTop;
    tooltipLeft = Math.min(Math.max(margin, spotlight.x), winW - tooltipW - margin);
  } else {
    // No measurable target (not on screen yet, or mid-transition) — center the tooltip so
    // the step's text is always readable instead of the tour silently doing nothing.
    tooltipTop = winH / 2 - measuredTooltipH / 2;
    tooltipLeft = (winW - tooltipW) / 2;
  }

  // Animates the tooltip smoothly between positions instead of snapping — matches the
  // website's `transition: top/left 0.25s ease` on .tour-tooltip. Lazily initialized from
  // the CURRENT values so the very first render (TourOverlay mounts fresh each time a tour
  // starts) doesn't animate in from some arbitrary default — only step-to-step changes after
  // that actually animate. (There used to be a visible white ring around the spotlighted
  // element too, animated the same way — removed per direct request; the dark-scrim cutout
  // itself is enough of a highlight on its own.)
  const animTooltipTop = useRef(new Animated.Value(tooltipTop)).current;
  const animTooltipLeft = useRef(new Animated.Value(tooltipLeft)).current;

  useEffect(() => {
    const timing = (value: Animated.Value, toValue: number) => Animated.timing(value, { toValue, duration: TOUR_TRANSITION_MS, easing: TOUR_EASING, useNativeDriver: false });
    Animated.parallel([timing(animTooltipTop, tooltipTop), timing(animTooltipLeft, tooltipLeft)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipTop, tooltipLeft]);

  // Any spotlighted element needs to stay genuinely tappable, not just visually
  // not-covered — a single full-screen Pressable (the fallback below) would swallow a tap
  // on it same as anywhere else. Used to only punch a real hole for requiresRealClick
  // steps, which meant the Shop/Tools tab icons looked spotlighted (lit up, not dimmed)
  // but silently ate any real tap on them — every other step still worked fine via Next,
  // so it read as "the tour is blocking the icon" rather than an obvious crash. Framing
  // the hole with four separate blocking rectangles instead, with NOTHING covering the
  // spotlight rect itself, means a tap there simply never reaches a blocking view at all
  // and falls through to the real element underneath — no z-index trick needed (React
  // Native doesn't have web's stacking-context nuance here, but it also has no clip-path;
  // this is the RN-native way to get the same "real hole" result). Falls back to full
  // blocking until a valid rect exists — better to block everything briefly than guess
  // wrong. Unlike the visual ring/mask above, these snap immediately rather than
  // animating — they only matter for a static frame, so tracking the animation in
  // progress isn't worth the extra Animated-arithmetic complexity.
  const punchHole = !!spotlight;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark scrim — visual only, via an SVG mask (RN has no equivalent of the web's
          oversized box-shadow trick); never intercepts touches itself. The hole itself uses
          the raw (non-Animated) spotlight numbers rather than animX/animY/animW/animH —
          wrapping an SVG primitive in the classic Animated API (Animated.createAnimatedComp
          onent(Rect)) throws at runtime on web (react-native-svg's web Rect doesn't support
          however Animated tries to imperatively patch its native props there), which crashed
          the whole tour the instant it opened on web. The ring below (a plain Animated.View,
          not SVG) still eases smoothly between steps — only this hole snaps instantly,
          which is a minor, barely-noticeable tradeoff against the alternative of the tour
          not working there at all. */}
      <Svg width={winW} height={winH} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Mask id="tour-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={winW} height={winH}>
            <Rect x={0} y={0} width={winW} height={winH} fill="#fff" />
            <Rect
              x={spotlight?.x ?? 0} y={spotlight?.y ?? 0}
              width={spotlight?.width ?? 0} height={spotlight?.height ?? 0}
              rx={14} fill="#000" opacity={spotlight ? 1 : 0}
            />
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
        onLayout={(e) => setMeasuredTooltipH(e.nativeEvent.layout.height)}
        style={[styles.tooltip, { top: animTooltipTop, left: animTooltipLeft, width: tooltipW }]}
      >
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
