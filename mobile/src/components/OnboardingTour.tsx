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

// Matches the website's `.tour-spotlight`/`.tour-tooltip` transition (0.25s ease) — same
// duration and a comparable curve, so the tour feels the same on both platforms.
const TOUR_TRANSITION_MS = 250;
const TOUR_EASING = Easing.inOut(Easing.ease);
// How long a step may stay blank waiting for its target to be measured before the overlay
// gives up and shows a centred, targetless tooltip. Sized to comfortably cover Home's
// animated scroll to the lesson path (see (tabs)/home.tsx).
const SETTLE_GRACE_MS = 600;

/** Mirrors the website's onboarding spotlight tour (see app.js's ONBOARDING_TOUR_STEPS) —
 * six stops (XP, the Shop, Tools, Modules, picking the first lesson, then actually starting
 * it), shown once right after a first-time user finishes the onboarding survey. Copy stays
 * as tight as possible on purpose — this is a quick "point at a real element, explain it,
 * Next" tour, not a wall of text.
 *
 * The last TWO steps require a real tap instead of a Next button — every earlier step just
 * explains a tab and moves on, so advancing them doesn't need the user to actually be on
 * that tab yet. The whole tour runs on Home: it points at Home's own lesson path rather than
 * hopping to the Modules tab, so there's no navigation in the middle of the tour at all.
 *
 * Tapping a path node doesn't open the lesson directly, it opens the preview sheet — so the
 * tour would have ended on a screen the user hadn't finished acting on. The final step
 * follows them into that sheet and points at its start button, which is the tap that actually
 * starts a lesson.
 */
type TourStep = {
  targetId: string;
  title: string;
  body: string;
  requiresRealClick?: boolean;
  /** True when the target lives inside a react-native Modal (the lesson preview sheet). The
   * provider draws NO overlay for these: on native a Modal is its own window and renders
   * above anything the provider puts on screen, so a spotlight would simply be hidden behind
   * it. The sheet already dims its own background, and renders <TourCallout> itself instead —
   * one scrim, one card, no competing overlays. */
  inSheet?: boolean;
  /** True when the target isn't on screen until the hosting screen scrolls it into view, so
   * it can't be measured for a few hundred milliseconds after the step opens. Changes what
   * the overlay shows in the meantime — see openStep's `blind`. */
  scrollsIntoView?: boolean;
};

const TOUR_STEPS: TourStep[] = [
  {
    // Was 'tour-xp', the lifetime-XP tile that used to lead Home's stat row. That tile is
    // gone (see home.tsx), so this stop points at the tile that replaced it at the front of
    // the row — and at a better first thing to teach, since the streak is something the
    // player does rather than a number that accumulates at them.
    targetId: 'tour-streak',
    title: 'Come back every day',
    body: 'Your streak counts the days in a row you show up. Tap it to open the reward calendar and collect the day you\'re on.',
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
    body: 'Budget, loan payoff, and compound interest calculators with real numbers, not just lessons. Handy any time, not just while you\'re learning.',
  },
  {
    targetId: 'tour-modules-tab',
    title: 'Head to Modules',
    body: 'Everything you can learn lives here, organized module by module.',
  },
  {
    // Home's lesson path (see @/lessonPath) opens on whichever module holds the recommended
    // lesson and draws that lesson as its `current` node — for a first-time user, the first
    // node of their survey track's first module. THAT node is this step's target, so the
    // tour stays on Home start to finish. Advanced by the real tap itself, not a Next button
    // (see requiresRealClick handling below and LessonPath.tsx's advanceIfWaitingOn call) —
    // the user practices the actual navigation instead of reading about it, and gets a yellow
    // highlight ring around the exact node to tap (see PathNode's `tourHighlighted`).
    //
    // The path sits well below the fold, so Home scrolls it into view itself when this step
    // opens and calls remeasureActive once that's settled — see (tabs)/home.tsx.
    targetId: 'tour-lesson-node',
    title: 'Pick your first lesson',
    body: 'Tap this one to see what it covers. Finish them in order to complete the module.',
    requiresRealClick: true,
    scrollsIntoView: true,
  },
  {
    // The preview sheet that a path node opens (see LessonPath's PreviewSheet). The copy
    // points at the ring rather than quoting the button's words, because that button is
    // labelled from the node's state — "Continue lesson" only for the recommended one, and
    // "Start lesson", "Resume lesson" or "Do it again" for the rest. The previous step is
    // satisfied by a tap on ANY node, so this step has to survive landing in any of those
    // sheets; naming a label it might not be showing is how you get a tour that instructs
    // the user to press a button that isn't there.
    targetId: 'tour-lesson-start',
    title: 'Now start it',
    body: 'Tap the highlighted button and you\'re in. Everything you finish earns XP and coins.',
    requiresRealClick: true,
    inSheet: true,
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
  /** The mirror of advanceIfWaitingOn, for when the user backs OUT of the element a
   * requiresRealClick step is waiting on (dismissing the lesson preview sheet) instead of
   * acting on it. Ends the tour rather than leaving it pointing at something no longer on
   * screen, which it has no button to escape from. A no-op unless that's the live step. */
  endIfWaitingOn: (targetId: string) => void;
  /** The current step's targetId, or null when the tour isn't active — lets a real element
   * (e.g. the recommended lesson node) know it should render its own yellow "tap me"
   * highlight right now, on top of the tour's own neutral spotlight ring. */
  activeTargetId: string | null;
  /** Re-measure the CURRENT step's target. For a screen that has to move its own target into
   * view before the spotlight can land on it (Home scrolls its lesson path up for the last
   * step) — the tour's own measurement fires immediately and again 200ms later, both of which
   * can be too early for an animated scroll. No-op when no tour is running. */
  remeasureActive: () => void;
  /** Where the current step's target actually is, in WINDOW coordinates, or null before it's
   * been measured. Published so a host screen can scroll its own scroller by the difference
   * between where the target is and where it wants it — which is the only way to get this
   * right, since the target's offset inside that scroller isn't something the screen knows.
   * Home used to scroll to the top of the whole lesson path instead, which only brought the
   * node into view when the node happened to be the first one. */
  activeRect: MeasuredRect | null;
  /** Everything <TourCallout> needs to draw the step card itself, for an in-sheet step the
   * provider deliberately doesn't overlay. Null when no tour is running. */
  activeCallout: { targetId: string; stepNum: number; totalSteps: number; title: string; body: string } | null;
  /** Ends the tour and marks it seen — what the callout's own "Skip tour" calls. */
  skipTour: () => void;
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
  // True from the moment a step opens until its target has actually been measured (or the
  // grace period below expires). See TourOverlay: while this is on and there's no rect yet,
  // the overlay shows a plain scrim and NO tooltip, instead of parking the tooltip in the
  // centre of the screen and then flying it to the real position a frame or two later. That
  // flight was the single most visible piece of jank on the lesson-path step, which can't be
  // measured until Home has finished scrolling it into view.
  const [settling, setSettling] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // stepIdx is mirrored into a ref, updated synchronously by setStep rather than in an
  // effect, so the callbacks below can read the live step without listing it as a dependency.
  // That keeps registerTarget/unregisterTarget referentially STABLE: TourTarget's effect
  // depends on them, so when they changed identity on every step change (which they used to)
  // every mounted TourTarget in the tree unregistered and re-registered itself six times a
  // tour, briefly emptying the map the spotlight measures from.
  const stepIdxRef = useRef<number | null>(null);
  const setStep = useCallback((idx: number | null) => {
    stepIdxRef.current = idx;
    setStepIdx(idx);
  }, []);

  const endSettling = useCallback(() => {
    if (settleTimer.current) { clearTimeout(settleTimer.current); settleTimer.current = null; }
    setSettling(false);
  }, []);

  /** Measures a step's target. `settle` says whether landing a rect should also END the
   * settling state, i.e. reveal the spotlight and the card.
   *
   * For most steps those are the same event and it defaults to true. For a `scrollsIntoView`
   * step they are NOT: the host screen needs the rect immediately (it can only work out how
   * far to scroll by knowing where the target currently is), but that early rect describes
   * where the target sits BEFORE the scroll. Revealing on it put the cutout and the card at
   * the pre-scroll position, from which they then chased the target down the screen for the
   * length of the animation — the jank on the "Pick your first lesson" step. So those steps
   * measure silently, and only the host's own remeasureActive() — its "I've finished
   * scrolling" signal — reveals anything. SETTLE_GRACE_MS bounds the wait either way. */
  const measure = useCallback((idx: number, settle = !TOUR_STEPS[idx].scrollsIntoView) => {
    const ref = targets.get(TOUR_STEPS[idx].targetId);
    if (!ref?.current) { setRect(null); return; }
    ref.current.measureInWindow((x, y, width, height) => {
      // Ignore a measurement that arrives after the step already moved on.
      if (stepIdxRef.current !== idx) return;
      if (width > 0 || height > 0) {
        setRect({ x, y, width, height });
        if (settle) endSettling();
      } else {
        setRect(null);
      }
    });
  }, [targets, endSettling]);

  /** Opens a step, then measures its target on the next frame and again shortly after (a font
   * swap or a still-finishing transition can move it).
   *
   * `blind` decides what's on screen in between, and the two cases genuinely differ. A step
   * whose target is already mounted and on screen (every tab icon) measures within a frame,
   * so KEEPING the previous spotlight lets the card glide from the old target to the new one
   * — the transition this tour has always had. A step whose target has to be scrolled into
   * view first can't be measured for a few hundred milliseconds, and holding the old
   * spotlight there would park the cutout over unrelated content for that whole time; those
   * steps clear it and hold the card back instead (see `settling` and TourOverlay's
   * hideCard). The grace period bounds the wait, so a genuinely missing target degrades to
   * the centred fallback rather than looking like a hang. */
  const openStep = useCallback((idx: number, blind = false) => {
    setStep(idx);
    if (blind || TOUR_STEPS[idx].scrollsIntoView) {
      setRect(null);
      setSettling(true);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => setSettling(false), SETTLE_GRACE_MS);
    }
    requestAnimationFrame(() => measure(idx));
    setTimeout(() => measure(idx), 200);
  }, [measure, setStep]);

  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);

  // Starting fresh is always blind: any rect still in state belongs to a previous run of the
  // tour, and flashing the first card at last time's position would be worse than a beat of
  // nothing.
  const startTour = useCallback(() => openStep(0, true), [openStep]);
  const goToStep = useCallback((idx: number) => openStep(idx), [openStep]);

  const finish = useCallback(() => {
    setStep(null);
    endSettling();
    markOnboardingTourSeen();
  }, [markOnboardingTourSeen, setStep, endSettling]);

  // These read the step and call finish()/goToStep() as plain, top-level calls — NOT from
  // inside a setStepIdx(i => ...) updater the way this used to be written. Dispatching a
  // second setStepIdx (which is what finish() and goToStep() each do) from inside another
  // setStepIdx's updater function is exactly the kind of thing that produces "the tour gets
  // stuck / a step lingers" bugs: the updater's own `return` and the nested dispatch can
  // race, and the two updates don't reliably compose into one clean transition.
  const advance = useCallback(() => {
    const idx = stepIdxRef.current;
    if (idx === null) return;
    const next = idx + 1;
    // Finishing at the end of the list — and ALSO when the next step is an inSheet one.
    //
    // An inSheet step draws no overlay of its own (see the render below): its card, its Skip
    // link and both of its exits (advanceIfWaitingOn / endIfWaitingOn) live inside the lesson
    // preview sheet. Arriving there with that sheet closed leaves the tour running with
    // literally nothing on screen and no way to end it — finish() never fires, so
    // markOnboardingTourSeen() never fires either, and activeTargetId stays pinned to
    // 'tour-lesson-start'. The next time the user opens a lesson preview for any reason,
    // <TourCallout> sees itself as live and a "STEP 6 OF 6" card appears inside the sheet out
    // of nowhere, with a highlight ring round its button.
    //
    // This button is exactly how you got there. It only renders on a requiresRealClick step
    // when the step's target couldn't be measured (see TourOverlay) — i.e. when the lesson
    // node isn't on screen to be tapped, which is the case when the tour is replayed from
    // Settings, or for a player who has mastered every module and so has no path node at all.
    // A press here cannot open the sheet, so the step after it can never become reachable:
    // ending the tour is the only honest outcome.
    if (next >= TOUR_STEPS.length || TOUR_STEPS[next].inSheet) { finish(); return; }
    goToStep(next);
  }, [finish, goToStep]);

  // Reads the live step from the ref rather than the closure, so this stays referentially
  // stable — it's called from onPress handlers deep in the tree (a path node, the preview
  // sheet's CTA) that shouldn't re-render every time the tour moves.
  const waitingOn = (targetId: string) => {
    const idx = stepIdxRef.current;
    if (idx === null) return null;
    const step = TOUR_STEPS[idx];
    return step.requiresRealClick && step.targetId === targetId ? idx : null;
  };

  // Deliberately WITHOUT advance()'s "don't enter an inSheet step" guard. This is the
  // legitimate way into one: tapping the lesson node both advances the tour and opens the
  // sheet, in that order, within a single handler — so the sheet is one render away from
  // existing, not absent. Refusing to enter here would break the only path the step was
  // built for.
  const advanceIfWaitingOn = useCallback((targetId: string) => {
    const idx = waitingOn(targetId);
    if (idx === null) return;
    if (idx + 1 >= TOUR_STEPS.length) { finish(); return; }
    goToStep(idx + 1);
  }, [finish, goToStep]);

  const endIfWaitingOn = useCallback((targetId: string) => {
    if (waitingOn(targetId) === null) return;
    finish();
  }, [finish]);

  const registerTarget = useCallback((id: string, ref: RefObject<View | null>) => {
    targets.set(id, ref);
    const stepIdx = stepIdxRef.current;
    // The Shop/Modules tabs (inside the always-mounted TabBar) are present from the very
    // first render, but a tab SCREEN's own targets (the Home stat row, the lesson path's
    // recommended node) mount/unmount as the user navigates, and the path node in particular
    // moves to a different lesson as progress changes — if one registers itself WHILE its
    // step is already active and waiting, take the opportunity to measure it immediately
    // instead of leaving a stale/missing spotlight.
    if (stepIdx !== null && TOUR_STEPS[stepIdx].targetId === id) {
      requestAnimationFrame(() => measure(stepIdx));
    }
  }, [targets, measure]);
  const unregisterTarget = useCallback((id: string) => { targets.delete(id); }, [targets]);

  // Always settles: this is the host screen telling us its target has stopped moving, which
  // is the one moment a scrollsIntoView step is allowed to reveal itself. See measure().
  const remeasureActive = useCallback(() => {
    const idx = stepIdxRef.current;
    if (idx !== null) measure(idx, true);
  }, [measure]);

  const activeStep = stepIdx !== null ? TOUR_STEPS[stepIdx] : null;

  const activeCallout = useMemo(
    () => (activeStep && stepIdx !== null
      ? {
          targetId: activeStep.targetId,
          stepNum: stepIdx + 1,
          totalSteps: TOUR_STEPS.length,
          title: activeStep.title,
          body: activeStep.body,
        }
      : null),
    [activeStep, stepIdx],
  );

  const ctxValue = useMemo<TourCtx>(
    () => ({
      registerTarget, unregisterTarget, startTour, advanceIfWaitingOn, endIfWaitingOn,
      remeasureActive, activeCallout, skipTour: finish,
      activeTargetId: activeStep?.targetId ?? null,
      activeRect: rect,
    }),
    [
      registerTarget, unregisterTarget, startTour, advanceIfWaitingOn, endIfWaitingOn,
      remeasureActive, activeCallout, finish, activeStep, rect,
    ],
  );

  return (
    <TourContext.Provider value={ctxValue}>
      {children}
      {/* inSheet steps draw nothing here on purpose — see TourStep.inSheet. */}
      {activeStep && !activeStep.inSheet ? (
        <TourOverlay
          step={activeStep}
          stepNum={stepIdx! + 1}
          totalSteps={TOUR_STEPS.length}
          rect={rect}
          settling={settling}
          isLast={stepIdx === TOUR_STEPS.length - 1}
          onNext={advance}
          onSkip={finish}
        />
      ) : null}
    </TourContext.Provider>
  );
}

function TourOverlay({
  step, stepNum, totalSteps, rect, settling, isLast, onNext, onSkip,
}: {
  step: { title: string; body: string; requiresRealClick?: boolean };
  stepNum: number;
  totalSteps: number;
  rect: MeasuredRect | null;
  /** The step has opened but its target hasn't been measured yet — hold the card back rather
   * than showing it somewhere it's about to move away from. See the provider's `settling`. */
  settling: boolean;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { width: winW, height: winH } = useWindowDimensions();
  const pad = 8;
  // `settling` suppresses the cutout as well as the card, not just the card. A rect can exist
  // while still settling — a scrollsIntoView step measures its target early so the host can
  // work out how far to scroll (see the provider's measure()) — and that rect is the target's
  // position BEFORE the scroll. Punching a hole there showed a lit-up patch of unrelated
  // content that then travelled down the screen behind the moving page. Nothing but the plain
  // scrim shows until the target has stopped moving; then the hole and the card arrive
  // together, already in the right place.
  const spotlight = rect && !settling ? {
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
    // the step's text is always readable instead of the tour silently doing nothing. While
    // the step is still settling this position is never SHOWN (see hideCard); it only exists
    // so the card can lay out and report its real height before it appears.
    tooltipTop = winH / 2 - measuredTooltipH / 2;
    tooltipLeft = (winW - tooltipW) / 2;
  }

  // Whatever the spotlight is doing, the CARD stays on screen.
  //
  // Both branches above position it relative to the spotlight, and neither had any idea where
  // the viewport ended. A target sitting below the fold — the lesson-path node, when the
  // host screen's scroll-into-view doesn't reach it — put `belowTop` past the bottom, which
  // took the "above" branch, which then resolved to a position that was ALSO past the bottom.
  // The card rendered somewhere off-screen while the four BlockRects went on swallowing every
  // tap, so the tour was invisible and the screen was frozen: no card, no Skip, nothing to
  // press. Clamping it into the viewport means the worst case is a card pointing at something
  // you can't see, which you can still read and still dismiss.
  const maxTooltipTop = Math.max(margin, winH - measuredTooltipH - margin);
  tooltipTop = Math.min(Math.max(margin, tooltipTop), maxTooltipTop);

  // Held back until there's a real position to show it in. Without this the card appeared
  // dead-centre the instant a step opened and then slid to the target a frame or two later —
  // on the lesson-path step, which can't be measured until Home has scrolled it into view,
  // that slide was long and unmistakably janky.
  const hideCard = settling;

  // Animates the tooltip smoothly between positions instead of snapping — matches the
  // website's `transition: top/left 0.25s ease` on .tour-tooltip. Lazily initialized from
  // the CURRENT values so the very first render (TourOverlay mounts fresh each time a tour
  // starts) doesn't animate in from some arbitrary default — only step-to-step changes after
  // that actually animate. (There used to be a visible white ring around the spotlighted
  // element too, animated the same way — removed per direct request; the dark-scrim cutout
  // itself is enough of a highlight on its own.)
  const animTooltipTop = useRef(new Animated.Value(tooltipTop)).current;
  const animTooltipLeft = useRef(new Animated.Value(tooltipLeft)).current;
  // Whether the card is coming back from being hidden. The first positioned frame after that
  // must SNAP rather than ease: easing from the off-screen holding position would reintroduce
  // exactly the flight hideCard exists to prevent. Starts true so the very first frame of a
  // freshly mounted overlay snaps too.
  const wasHidden = useRef(true);

  useEffect(() => {
    if (hideCard) { wasHidden.current = true; return; }
    if (wasHidden.current) {
      animTooltipTop.setValue(tooltipTop);
      animTooltipLeft.setValue(tooltipLeft);
      wasHidden.current = false;
      return;
    }
    const timing = (value: Animated.Value, toValue: number) => Animated.timing(value, { toValue, duration: TOUR_TRANSITION_MS, easing: TOUR_EASING, useNativeDriver: false });
    Animated.parallel([timing(animTooltipTop, tooltipTop), timing(animTooltipLeft, tooltipLeft)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipTop, tooltipLeft, hideCard]);

  // The card fades rather than blinks. It arrives snapped into position (wasHidden above), so
  // without this it appeared as a hard pop the moment the scroll finished — the opposite end
  // of the same problem the snap exists to solve. `useNativeDriver: false` is not a choice
  // here: top/left on this same view are JS-driven, and one view can't mix the two drivers.
  const animOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animOpacity, {
      toValue: hideCard ? 0 : 1,
      duration: hideCard ? 110 : 200,
      easing: TOUR_EASING,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideCard]);

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
        pointerEvents={hideCard ? 'none' : 'auto'}
        style={[
          styles.tooltip,
          // Kept mounted while hidden (opacity, not unmounted), so its onLayout height is
          // already known by the time it appears and it doesn't reposition on arrival.
          { top: animTooltipTop, left: animTooltipLeft, width: tooltipW, opacity: animOpacity },
        ]}
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
              taught, so it's left out entirely rather than shown disabled.
              UNLESS there's nothing measured to tap: a requiresRealClick step with no rect
              has no element on screen to advance it and no button either, which is a dead
              end the user can only escape via Skip. The lesson-path node isn't rendered at
              all once every module is mastered, so this is reachable, not theoretical —
              falling back to the button keeps the tour finishable in that case. */}
          {step.requiresRealClick && rect ? null : (
            <Button label={isLast ? 'Got it →' : 'Next →'} size="sm" onPress={onNext} style={styles.nextBtn} />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/** The step card, rendered INLINE by a screen that already owns its own scrim — today only
 * the lesson preview sheet (see TourStep.inSheet, which is why the provider draws no overlay
 * for that step). Renders nothing unless the tour is currently sitting on `forTarget`, so it's
 * safe to leave mounted unconditionally. Carries no Next button: an inSheet step is always a
 * requiresRealClick one, so the real button beside it is the only way forward, plus Skip. */
export function TourCallout({ forTarget, style }: { forTarget: string; style?: ViewStyle }) {
  const { activeCallout, skipTour } = useOnboardingTour();
  if (!activeCallout || activeCallout.targetId !== forTarget) return null;
  return (
    <View style={[styles.callout, style]}>
      <Txt style={styles.stepLabel}>{`STEP ${activeCallout.stepNum} OF ${activeCallout.totalSteps}`}</Txt>
      <Txt style={styles.title}>{activeCallout.title}</Txt>
      <Txt style={styles.body}>{activeCallout.body}</Txt>
      <Pressable onPress={skipTour} hitSlop={8} style={styles.calloutSkip}>
        <Txt style={styles.skip}>Skip tour</Txt>
      </Pressable>
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
  // Cream on the sheet's white, with a hairline border: enough to read as the tour talking
  // rather than as more sheet, and no more than that.
  //
  // This used to be reward-yellow — the SAME yellow, on a bigger block, directly above the
  // ring around the button it was telling the user to press. Two yellow things stacked on
  // one small sheet is two highlights, and the larger one wins: the eye went to the card,
  // which is the piece you're meant to read and then look past. The instruction stays here;
  // the only reward-yellow left in the sheet is the ring around the thing to tap.
  callout: {
    backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14,
  },
  calloutSkip: { alignSelf: 'flex-start', marginTop: 10 },
  stepLabel: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.5, color: colors.muted4, marginBottom: 5 },
  title: { fontFamily: font.display, fontSize: 16.5, color: colors.ink, marginBottom: 5 },
  body: { fontFamily: font.semi, fontSize: 13, color: colors.muted1, lineHeight: 18.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  skip: { fontFamily: font.extra, fontSize: 12.5, color: colors.muted4 },
  nextBtn: { paddingHorizontal: 18 },
});
