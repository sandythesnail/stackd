import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { colors, font, radius } from '@/theme';
import { useStore } from '@/store';
import { Txt } from './Txt';
import { Button } from './Button';

/** Mirrors the website's onboarding spotlight tour (see app.js's ONBOARDING_TOUR_STEPS) —
 * two stops, XP then the Shop, shown once right after a first-time user finishes the
 * onboarding survey. The Tools tab is left out on purpose, same reasoning as web: its UI is
 * still changing, so a "what does this do" step would go stale fast.
 */
const TOUR_STEPS: { targetId: string; title: string; body: string }[] = [
  {
    targetId: 'tour-xp',
    title: 'Earn XP as you go',
    body: "Finishing lessons and quests earns XP. Level up to climb the tiers, from Broke Freshman up to Financially Literate Graduate, and watch Hammy grow alongside you.",
  },
  {
    targetId: 'tour-shop-tab',
    title: 'Spend coins & diamonds in the Shop',
    body: "Coins come from everyday lessons; diamonds come from bigger milestones like login streaks. Head into the Shop to spend either on outfits for Hammy or decor for their room.",
  },
];

type MeasuredRect = { x: number; y: number; width: number; height: number };

type TourCtx = {
  registerTarget: (id: string, ref: RefObject<View | null>) => void;
  unregisterTarget: (id: string) => void;
  startTour: () => void;
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

  const registerTarget = useCallback((id: string, ref: RefObject<View | null>) => {
    targets.set(id, ref);
    // The Shop tab (inside the always-mounted TabBar) is present from the very first
    // render, but the Home screen's XP stat mounts/unmounts as the user navigates tabs —
    // if it registers itself WHILE step 1 is already active and waiting, take the
    // opportunity to measure it immediately instead of leaving a stale/missing spotlight.
    if (stepIdx !== null && TOUR_STEPS[stepIdx].targetId === id) {
      requestAnimationFrame(() => measure(stepIdx));
    }
  }, [targets, stepIdx, measure]);
  const unregisterTarget = useCallback((id: string) => { targets.delete(id); }, [targets]);

  const ctxValue = useMemo<TourCtx>(
    () => ({ registerTarget, unregisterTarget, startTour }),
    [registerTarget, unregisterTarget, startTour],
  );

  return (
    <TourContext.Provider value={ctxValue}>
      {children}
      {stepIdx !== null ? (
        <TourOverlay
          step={TOUR_STEPS[stepIdx]}
          stepNum={stepIdx + 1}
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
  step: { title: string; body: string };
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

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark scrim with a cut-out hole over the spotlighted element, via an SVG mask —
          RN has no equivalent of the web's oversized box-shadow trick. Also the one thing
          in this whole overlay that intercepts touches, so a stray tap on the real app
          underneath can't navigate away mid-tour; Next/Skip are the only way through. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}}>
        <Svg width={winW} height={winH}>
          <Defs>
            <Mask id="tour-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={winW} height={winH}>
              <Rect x={0} y={0} width={winW} height={winH} fill="#fff" />
              {spotlight ? (
                <Rect x={spotlight.x} y={spotlight.y} width={spotlight.width} height={spotlight.height} rx={14} fill="#000" />
              ) : null}
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={winW} height={winH} fill="rgba(20,26,20,0.62)" mask="url(#tour-mask)" />
        </Svg>
      </Pressable>

      {spotlight ? (
        <View
          pointerEvents="none"
          style={[styles.spotlightRing, {
            top: spotlight.y, left: spotlight.x, width: spotlight.width, height: spotlight.height,
          }]}
        />
      ) : null}

      <View style={[styles.tooltip, { top: tooltipTop, left: tooltipLeft, width: tooltipW }]}>
        <Txt style={styles.stepLabel}>{`STEP ${stepNum} OF ${totalSteps}`}</Txt>
        <Txt style={styles.title}>{step.title}</Txt>
        <Txt style={styles.body}>{step.body}</Txt>
        <View style={styles.footer}>
          <Pressable onPress={onSkip} hitSlop={8}>
            <Txt style={styles.skip}>Skip tour</Txt>
          </Pressable>
          <Button label={isLast ? 'Got it →' : 'Next →'} size="sm" onPress={onNext} style={styles.nextBtn} />
        </View>
      </View>
    </View>
  );
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
