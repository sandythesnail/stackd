import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Modal, StyleSheet } from 'react-native';
import Svg, { Path as SvgPath, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation, interpolate, Easing,
  FadeInDown, SlideInDown, ZoomIn,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { modules, type Module } from '@/data';
import { moduleContentById, mainLessonAbsoluteIndices } from '@/content';
import { SURVEY_TRACKS } from '@/survey';
import { useStore } from '@/store';
import { MIcon, Hammy, MaybeTourTarget, TourCallout, useOnboardingTour } from '@/components';
import { MOOD_FACES, REACTION_FACES, type FaceOverlay } from '@/hammyFaces';
import { T, Bar, Pill, useReducedMotion } from './bits';
import { PathNode, type NodeState } from './PathNode';
import { NODE_BOX, snakePositions, smoothPath, pathHeight, segmentSamples } from './geometry';

/** One distinct expression per module — eleven modules, eleven different faces.
 *
 * Two of these are the quest player's own answer reactions, which a student already knows
 * from answering questions: `happy` (correct) on Saving, `gentle` (wrong) on Loans. Both are
 * `keepBase` overlays — Hammy keeps his eyes, cheeks and snout and only the mouth changes —
 * so they read subtler than the nine full-face swaps around them.
 *
 * `satisfied` is the one face left unused. It and `REACTION_FACES.streak` are both
 * hammy-happy.png at the default crop, so it was only ever a duplicate under another name. */
const MODULE_FACE: Record<string, FaceOverlay> = {
  earning: MOOD_FACES.wink,
  spending: MOOD_FACES.surprise,
  saving: REACTION_FACES.happy,
  investing: MOOD_FACES.star,
  credit: MOOD_FACES.sleepy,
  risk: MOOD_FACES.nervy,
  loans: REACTION_FACES.gentle,
  taxes: MOOD_FACES.sad,
  psychology: MOOD_FACES.love,
  career: MOOD_FACES.curious,
  scams: MOOD_FACES.angry,
};

const STATE_LABEL: Record<NodeState, string> = {
  completed: 'COMPLETED',
  current: 'RECOMMENDED NEXT',
  available: 'NOT STARTED',
  optional: 'OPTIONAL EXTRA',
};

/** The hover card's much shorter wording, and the dot colour that carries it.
 *
 * Deliberately not STATE_LABEL: that set is written for the preview sheet's pill, where a
 * four-syllable all-caps phrase has a whole sheet to sit in. On a card that floats over the
 * path while the cursor is moving, the same words read as a paragraph. Two or three quiet
 * words plus a coloured dot say the same thing at a glance. */
const STATE_TIP: Record<NodeState, { label: string; tone: string }> = {
  completed: { label: 'Completed', tone: colors.greenSoft },
  current: { label: 'Up next', tone: colors.green },
  available: { label: 'Not started', tone: colors.muted5 },
  optional: { label: 'Optional', tone: colors.reward },
};

/** Hover-card width. Its height is measured rather than assumed — see HoverTip. */
const TIP_W = 194;

type PathNodeData = {
  key: string; moduleId: string; lessonIndex: number; title: string; state: NodeState;
  /** The lesson's authored one-paragraph scenario (LessonSummary.hook) — what the preview
   * is for, since a title alone rarely says what a lesson is actually about. */
  hook: string;
  /** Whether this node IS the module's real-life sub-quest (LessonSummary.isLifeTask).
   * Deliberately its own field rather than being read back off `state`: the node's state
   * changes to 'completed' once it's finished, so anything keying off state === 'optional'
   * silently stops being true for exactly the lessons that have been played. */
  isLifeTask?: boolean;
};

type Section = {
  module: Module; nodes: PathNodeData[]; done: number; total: number; mastered: boolean;
};

/**
 * Home's "Keep learning" section: one module's lessons as a winding path of diamond nodes.
 *
 * Replaces the four-tile module grid. The trade it makes is guidance without a cage — the
 * recommended lesson is unmistakable (saturated fill, halo, dots running into it, and the
 * survey's gold outline on its module) while every other node keeps full contrast and stays
 * tappable, including ones far ahead. Nothing here is ever dimmed, because a dimmed node is
 * indistinguishable from a locked one and nothing in this app is locked.
 *
 * One module is on screen at a time, opening on whichever holds the recommended lesson, with
 * chevrons paging through the catalog.
 */
export function LessonPath({ width }: { width: number }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { endIfWaitingOn, activeTargetId } = useOnboardingTour();
  const { state, moduleDoneIndices, moduleStatus, moduleTotal, nextLessonIndex } = useStore();

  const [pickedModule, setPickedModule] = useState<string | null>(null);
  const [preview, setPreview] = useState<PathNodeData | null>(null);

  const centerX = width / 2;

  /** Deliberately the same ordering Home's continue-lesson card uses, so the card and the
   * highlighted node can never point at different lessons. */
  const activeTrack = SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId);
  const trackModuleIds = activeTrack?.moduleIds ?? [];
  const orderedModules: Module[] = trackModuleIds.length
    ? [
        ...trackModuleIds.map((id) => modules.find((m) => m.id === id)).filter((m): m is Module => !!m),
        ...modules.filter((m) => !trackModuleIds.includes(m.id)),
      ]
    : modules;

  const nextModule = orderedModules.find((m) => moduleStatus(m.id) === 'active');
  const nextLesson = nextModule ? Math.max(0, nextLessonIndex(nextModule.id)) : -1;
  const recommended = nextModule && nextLesson >= 0
    ? { moduleId: nextModule.id, lessonIndex: nextLesson }
    : null;

  const sections: Section[] = useMemo(() => modules.map((m) => {
    const content = moduleContentById(m.id);
    const lessons = content?.lessons ?? [];
    // Absolute positions in `lessons`, not 0..n-1. `done` and `recommended.lessonIndex` are
    // both absolute (they come from the store, which navigates with them), so comparing them
    // against a filtered counter only worked while the sub-quest sat last in every module.
    const mainIndices = mainLessonAbsoluteIndices(content);
    const done = new Set(moduleDoneIndices(m.id));
    const lifeDone = state.completedLifeTaskIds.includes(m.id);
    const isRecommended = (absIdx: number) =>
      recommended?.moduleId === m.id && recommended.lessonIndex === absIdx;

    const nodes: PathNodeData[] = mainIndices.map((absIdx, i) => ({
      key: `${m.id}-${absIdx}`,
      moduleId: m.id,
      lessonIndex: absIdx,
      title: lessons[absIdx].title,
      hook: lessons[absIdx].hook,
      state: done.has(absIdx) ? 'completed' : isRecommended(absIdx) ? 'current' : 'available',
    }));

    const lifeIdx = lessons.findIndex((l) => l.isLifeTask);
    if (lifeIdx >= 0) {
      nodes.push({
        key: `${m.id}-life`,
        moduleId: m.id,
        lessonIndex: lifeIdx,
        title: lessons[lifeIdx].title,
        hook: lessons[lifeIdx].hook,
        isLifeTask: true,
        // The real-life step-by-step guide is the one genuinely aside lesson in the content
        // (isLifeTask), so it carries the optional state rather than one being invented —
        // but it can also BE the recommended next lesson, and that has to win.
        //
        // Once every main quest is done, nextLessonIndex points here. This node was hardcoded
        // 'optional' regardless, so no node on the path carried 'current': the recommended
        // halo, the label and the comet all vanished for the whole last lesson of a module,
        // while Home's continue card directly above the path went on saying "Continue lesson
        // · Real-life sub-quest". The two surfaces are supposed to be incapable of pointing
        // at different lessons (that's why they share an ordering) and here they diverged.
        //
        // It keeps reading as "elsewhere" either way — it's `isLifeTask` (not its state) that
        // puts it out on the dashed spur, further off the centre line than the wave would
        // take it, and that styling is untouched by this.
        state: lifeDone ? 'completed' : isRecommended(lifeIdx) ? 'current' : 'optional',
      });
    }

    const doneCount = done.size + (lifeDone ? 1 : 0);
    const total = moduleTotal(m.id);
    return { module: m, nodes, done: doneCount, total, mastered: total > 0 && doneCount >= total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state.moduleProgress, state.completedLifeTaskIds, recommended?.moduleId, recommended?.lessonIndex]);

  // The tour's "Pick your first lesson" step points at the recommended lesson, which only
  // exists in the recommended module's section — but `pickedModule` is sticky, so once the
  // user has paged the carousel the path stays on whatever they last looked at. Replaying the
  // tour after browsing therefore opened that step on the wrong module, with the node it
  // wanted not rendered at all. Dropping the manual pick when the step opens brings the right
  // module back; registerTarget measures the node as soon as it mounts (OnboardingTour.tsx),
  // so the spotlight lands without waiting for the next remeasure.
  useEffect(() => {
    if (activeTargetId === 'tour-lesson-node') setPickedModule(null);
  }, [activeTargetId]);

  const shownId = pickedModule ?? recommended?.moduleId ?? modules[0].id;
  const shownIdx = Math.max(0, sections.findIndex((s) => s.module.id === shownId));
  const shownSection = sections[shownIdx];
  const pageBy = (delta: number) => {
    const next = (shownIdx + delta + sections.length) % sections.length;
    setPickedModule(sections[next].module.id);
  };

  const openLesson = (n: PathNodeData) => {
    router.push({
      pathname: '/learn/quest',
      params: {
        moduleId: n.moduleId,
        lessonIndex: String(n.lessonIndex),
        // Keyed off the node's identity, not its state — see PathNodeData.isLifeTask.
        ...(n.isLifeTask ? { isLifeTask: '1' } : {}),
      },
    });
  };

  if (!shownSection) return null;

  return (
    <>
      <SectionView
        key={shownSection.module.id}
        section={shownSection}
        width={width}
        centerX={centerX}
        reducedMotion={reducedMotion}
        position={`${shownIdx + 1} of ${sections.length}`}
        recommendedTrack={
          activeTrack && recommended?.moduleId === shownSection.module.id ? activeTrack.title : null
        }
        onPrev={() => pageBy(-1)}
        onNext={() => pageBy(1)}
        onPressNode={setPreview}
      />

      <PreviewSheet
        node={preview}
        moduleName={sections.find((s) => s.module.id === preview?.moduleId)?.module.name ?? ''}
        total={sections.find((s) => s.module.id === preview?.moduleId)?.total ?? 0}
        reducedMotion={reducedMotion}
        onClose={() => {
          // Backing out of the sheet while the tour is pointing at its CTA would leave the
          // tour on a step whose target is gone, with no Next button to escape via.
          endIfWaitingOn('tour-lesson-start');
          setPreview(null);
        }}
        onStart={() => {
          const n = preview;
          setPreview(null);
          if (n) openLesson(n);
        }}
      />
    </>
  );
}

/* ─────────────────────────── one module ─────────────────────────── */

function SectionView({
  section, width, centerX, reducedMotion, position, recommendedTrack, onPrev, onNext, onPressNode,
}: {
  section: Section;
  width: number;
  centerX: number;
  reducedMotion: boolean;
  position: string;
  /** Non-null only when THIS module is the one the onboarding survey pointed at. */
  recommendedTrack: string | null;
  onPrev: () => void;
  onNext: () => void;
  onPressNode: (node: PathNodeData) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { activeTargetId, advanceIfWaitingOn } = useOnboardingTour();
  const { module: mod, nodes } = section;
  const lastIdx = nodes.length - 1;
  // The optional real-life lesson swings 1.5x further off the line than the wave would take
  // it, so "not on the main line" is said by position and not only by styling.
  // Both of these key off isLifeTask rather than state === 'optional' for the same reason
  // openLesson does: the sub-quest's state flips to 'completed' once it's played, which used
  // to pull it back onto the main line and delete its dashed spur the moment you finished it
  // — the one lesson that is meant to read as "elsewhere" stopped looking that way exactly
  // when it had been visited.
  const pts = snakePositions(nodes.length, centerX, (i) => (nodes[i]?.isLifeTask ? 1.5 : 1));
  const h = pathHeight(nodes.length);
  const hasSpur = !!nodes[lastIdx]?.isLifeTask && pts.length >= 2;
  // Two separate strokes, so two separate point sets — and everything drawn ON either stroke
  // (the walked-so-far overlay, the travelling dots) is derived from the SAME set as the
  // stroke it has to lie on. Mixing them is what used to put the dots beside the trail rather
  // than on it: a Catmull-Rom control point depends on its neighbours, so the identical pair
  // of nodes bends differently depending on which array it was taken from.
  const mainPts = hasSpur ? pts.slice(0, -1) : pts;
  const spurPts = hasSpur ? pts.slice(-2) : [];
  const mainD = smoothPath(mainPts);
  const spurD = hasSpur ? smoothPath(spurPts) : '';

  // The stretch already walked, drawn in green over the grey — progress becomes the shape of
  // the path rather than a number in the header, which is the reason to draw a path at all.
  const firstUndone = nodes.findIndex((n) => n.state !== 'completed');
  const walked = firstUndone === -1 ? nodes.length : firstUndone;
  const walkedD = smoothPath(mainPts, walked);
  // The spur is its own stroke and so needs its own "done" version — the main overlay stops
  // at the last main node by construction now.
  const spurWalked = hasSpur && nodes[lastIdx].state === 'completed';

  const currentIdx = nodes.findIndex((n) => n.state === 'current');
  // The dots run the last stretch of trail into the recommended node, so they follow whichever
  // stroke that stretch actually is — the dashed spur when the sub-quest is what's recommended.
  const cometSamples = currentIdx <= 0
    ? []
    : hasSpur && currentIdx === lastIdx
      ? segmentSamples(spurPts, 0)
      : segmentSamples(mainPts, currentIdx - 1);

  /** Which node the onboarding tour's "Pick your first lesson" step spotlights.
   *
   * This used to be `state === 'current'` directly, which meant the step had no target at all
   * whenever no node carried that state — and a tour step whose id nothing registers fails
   * SILENTLY (see OnboardingTour.tsx's targets Map): no spotlight, no highlight ring, just the
   * card floating in the middle of the screen pointing at nothing. Three ordinary situations
   * produced it:
   *
   *  - The path was showing a different module. Only the recommended module has a 'current'
   *    node, and `pickedModule` is sticky once the user pages the carousel — so replaying the
   *    tour after browsing left the step targeting a node on a section that wasn't rendered.
   *  - nextLessonIndex returned mainCount, i.e. every main quest done and only the real-life
   *    sub-quest left. That index is past the end of mainLessons, so no main node matches it
   *    and the sub-quest node is 'optional', never 'current'.
   *  - No active module at all (everything mastered), so `recommended` is null.
   *
   * Falling back to the first unfinished node, then to the first node, means the step always
   * has something real to point at as long as the module has any lessons — the copy ("Tap this
   * one to see what it covers") stays true of any of them. LessonPath separately puts the
   * recommended module back on screen while the step is live, so this is the backstop rather
   * than the usual case. */
  const tourNodeIdx = currentIdx >= 0
    ? currentIdx
    : firstUndone >= 0 ? firstUndone : 0;

  const pct = section.total ? section.done / section.total : 0;
  const face = MODULE_FACE[mod.id];

  return (
    <View style={{ width }}>
      {/* The row is always rendered at a fixed height; only its contents are conditional.
          Mounting and unmounting it moved the module name, the path and everything under it
          on every page, which read as the page jumping. */}
      <View style={styles.recLabelRow}>
        {recommendedTrack ? (
          <>
            <Pill label="★ RECOMMENDED FOR YOU" bg={colors.rewardBadgeBg} fg={colors.rewardBadgeText} />
            <T weight="bold" size={10.5} color={colors.muted4}>from your {recommendedTrack} track</T>
          </>
        ) : null}
      </View>

      <Reanimated.View
        key={mod.id}
        entering={reducedMotion ? undefined : FadeInDown.duration(300)}
        style={[styles.sectionHead, recommendedTrack ? styles.sectionHeadRec : null]}
      >
        <PagerButton dir="left" label="Previous module" onPress={onPrev} />
        <MIcon abbr={mod.icon} color={mod.color} textColor={mod.textColor} />
        <View style={{ flex: 1 }}>
          <T weight="display" size={16} numberOfLines={1}>{mod.name}</T>
          <View style={styles.headMeta}>
            <T weight="bold" size={11} color={colors.muted3}>{section.done}/{section.total}</T>
            <Bar value={pct} tint={section.mastered ? colors.green : mod.deepColor} height={6} />
          </View>
        </View>
        <View pointerEvents="none" style={{ alignItems: 'center' }}>
          <Hammy headOnly size={40} bob={false} face={face} />
          {section.mastered ? (
            <Pill label="DONE" bg={colors.tagGreenBg} fg={colors.tagGreenText} style={{ marginTop: 2 }} />
          ) : null}
        </View>
        <PagerButton dir="right" label="Next module" onPress={onNext} />
      </Reanimated.View>

      <T weight="bold" size={10.5} color={colors.muted5} style={styles.position}>
        MODULE {position}
      </T>

      <View style={{ height: h, width }}>
        <Svg width={width} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgGradient id={`walked-${mod.id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.greenBright} />
              <Stop offset="1" stopColor={colors.green} />
            </SvgGradient>
          </Defs>
          {/* A wider pale under-stroke so the trail sits ON the page rather than being a
              rule ruled across it. */}
          <SvgPath d={mainD} stroke={colors.borderCool} strokeWidth={15} strokeLinecap="round" fill="none" />
          <SvgPath d={mainD} stroke={colors.track2} strokeWidth={9} strokeLinecap="round" fill="none" />
          {walkedD ? (
            <SvgPath d={walkedD} stroke={`url(#walked-${mod.id})`} strokeWidth={9} strokeLinecap="round" fill="none" />
          ) : null}
          {spurD ? (
            <SvgPath
              d={spurD}
              stroke={spurWalked ? colors.greenSoft : colors.borderOpt}
              strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" fill="none"
            />
          ) : null}
        </Svg>

        {cometSamples.length ? <TrailComet samples={cometSamples} reducedMotion={reducedMotion} /> : null}

        {nodes.map((n, i) => {
          // The onboarding tour's "Pick your first lesson" stop (see OnboardingTour.tsx).
          // One node per path carries it — see tourNodeIdx for why it isn't simply the
          // `current` one. Every other node renders unwrapped via MaybeTourTarget.
          const isTourTarget = i === tourNodeIdx;
          return (
            <Reanimated.View
              key={n.key}
              entering={reducedMotion ? undefined : ZoomIn.delay(i * 55).duration(320).springify().damping(14)}
              style={{ position: 'absolute', left: pts[i].x - NODE_BOX / 2, top: pts[i].y - NODE_BOX / 2 }}
            >
              <MaybeTourTarget id={isTourTarget ? 'tour-lesson-node' : undefined}>
                <PathNode
                  title={n.title}
                  state={n.state}
                  index={i + 1}
                  accentFg={mod.deepColor}
                  reducedMotion={reducedMotion}
                  tourHighlighted={isTourTarget && activeTargetId === 'tour-lesson-node'}
                  onPress={() => {
                    // Called from EVERY node, not just the spotlighted one. It's already a
                    // no-op unless the tour is waiting on this step, and gating it on
                    // isTourTarget meant tapping any OTHER node opened the preview sheet with
                    // the tour still sitting on this step underneath it — pointing at a node
                    // the sheet now covers, with no Next button to escape by (the step is
                    // requiresRealClick) until the sheet was dismissed again. Any lesson tap
                    // satisfies "tap this one to see what it covers", so any of them may
                    // advance it.
                    advanceIfWaitingOn('tour-lesson-node');
                    onPressNode(n);
                  }}
                  onHoverIn={() => setHovered(i)}
                  onHoverOut={() => setHovered((cur) => (cur === i ? null : cur))}
                />
              </MaybeTourTarget>
            </Reanimated.View>
          );
        })}

        {/* Hover/focus card. Rendered last so it draws over its neighbours. */}
        {hovered !== null && nodes[hovered] ? (
          <HoverTip node={nodes[hovered]} at={pts[hovered]} columnWidth={width} columnHeight={h} />
        ) : null}
      </View>
    </View>
  );
}

/* ─────────────────────────── pieces ─────────────────────────── */

function PagerButton({ dir, label, onPress }: { dir: 'left' | 'right'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pager, pressed && { backgroundColor: colors.canvas }]}
    >
      <Feather name={dir === 'left' ? 'chevron-left' : 'chevron-right'} size={20} color={colors.muted2} />
    </Pressable>
  );
}

/** What a diamond is, while the cursor is on it.
 *
 * A desktop affordance only (react-native-web maps onHoverIn onto real mouse events; touch
 * never fires them), so it is allowed to be small and quiet — the tap route into the same
 * lesson opens the full preview sheet with the whole scenario in it. This card answers one
 * question, "what is this one?", in one line plus a state word, and that's the entire brief:
 * a three-line paragraph chasing the pointer around the path is noise, not a preview.
 *
 * Non-interactive, so it can never eat the tap it is describing. It sits above the node when
 * there's room and flips below when there isn't (the top row of every path), measuring its
 * own height rather than assuming one — the card is one or two title lines depending on the
 * lesson, and a fixed offset put the two-line version over the node it belonged to. */
function HoverTip({
  node, at, columnWidth, columnHeight,
}: {
  node: PathNodeData;
  at: { x: number; y: number };
  columnWidth: number;
  columnHeight: number;
}) {
  const [h, setH] = useState(48);
  const tip = STATE_TIP[node.state];
  const above = at.y - NODE_BOX / 2 - h - 9;
  const below = at.y + NODE_BOX / 2 + 9;
  // Prefer above; drop below only when that would clip off the top of the column. The final
  // clamp keeps the flipped card inside the column too, for a path short enough that neither
  // side fits outright.
  const top = above >= 0 ? above : Math.min(below, Math.max(0, columnHeight - h));

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
      style={[
        styles.tip,
        { top, left: Math.max(6, Math.min(at.x - TIP_W / 2, columnWidth - TIP_W - 6)) },
      ]}
    >
      <View style={styles.tipState}>
        <View style={[styles.tipDot, { backgroundColor: tip.tone }]} />
        <T weight="extra" size={9.5} color={colors.muted4} style={{ letterSpacing: 0.6 }}>
          {tip.label.toUpperCase()}
        </T>
      </View>
      <T weight="displayMed" size={13} color={colors.ink} numberOfLines={2} style={{ lineHeight: 17 }}>
        {node.title}
      </T>
    </View>
  );
}

/** Dots running the last stretch of trail into the recommended node.
 *
 * They follow the drawn curve rather than a straight line between the two node centres —
 * `segmentSamples` walks the same bézier the SVG renders, so they stay on the trail wherever
 * it bows. Plain Views, because animating SVG path properties is the fragile part on web. */
function TrailComet({ samples, reducedMotion }: { samples: { x: number; y: number }[]; reducedMotion: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
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

/** Look before you leap — a bottom sheet, matching the shape the quest player already uses
 * for its own interruptions, rising from the edge the thumb is already near. The call to
 * action is worded from the node's state, because "Start lesson" is wrong in three of the
 * four cases. */
function PreviewSheet({
  node, moduleName, total, reducedMotion, onClose, onStart,
}: {
  node: PathNodeData | null;
  moduleName: string;
  total: number;
  reducedMotion: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  const { activeTargetId, advanceIfWaitingOn } = useOnboardingTour();
  const { lessonProgressFor } = useStore();

  // Computed up here, above the early return, because the pulse below is a hook.
  //
  // Deliberately NOT narrowed to `node.state === 'current'` the way it used to be. The step
  // before this one is advanced by a tap on ANY node, not just the recommended one (see the
  // unconditional advanceIfWaitingOn on every PathNode above and the comment there) — so a
  // user who picked a lesson further along the path arrived here with the final step live but
  // nothing locked, nothing ringed and every exit open. The one step in the tour that exists
  // to insist on a real tap was quietly asking for nothing. Whichever sheet the tour lands
  // in is the sheet it holds.
  const locked = activeTargetId === 'tour-lesson-start';

  // A slow breath on the button the step is telling them to press. The yellow ring says which
  // one; the movement is what makes the eye go there first, which is the whole job on a sheet
  // where the other two options have just been greyed out.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!locked || reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 950, easing: Easing.inOut(Easing.quad) }), -1, true,
    );
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, reducedMotion]);
  const ctaPulse = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.028 }] }));

  if (!node) return null;
  const done = node.state === 'completed';
  /* Saving a part-finished lesson is worth nothing if the player can't see that it happened.
   * A student who has been burned once won't risk a long lesson again no matter what the code
   * does, so the resume point is stated here in words — which chapter, out of how many — and
   * the button says Resume rather than Continue. Only for a lesson that genuinely has one:
   * lessonProgressFor validates against the current content and returns null otherwise.
   *
   * There is no "start over" here any more. It sat directly under Resume as a second, quieter
   * button, which made a sheet with one obvious action look like a sheet with a choice to
   * make — and it was the wrong choice to offer, since replaying a lesson from the top is
   * what the node's own "Do it again" already does once the lesson is finished. */
  const saved = node.isLifeTask ? null : lessonProgressFor(node.moduleId, node.lessonIndex);
  const cta = saved
    ? 'Resume lesson'
    : done ? 'Do it again' : node.state === 'current' ? 'Continue lesson' : 'Start lesson';
  const tone = node.state === 'current' || saved ? colors.green : done ? colors.greenDark : colors.pink;
  // While the tour is pointing at the CTA (`locked`, above), that button is the only way out
  // of this sheet. The step is requiresRealClick and draws no Next of its own, so every other
  // exit — the scrim, Android back, "Not now" — was a way to leave the one instruction on
  // screen unperformed, and "tap the highlighted button" is a poor thing to say next to
  // several ways of not doing that. The tour's own "Skip tour" link, right above the button
  // in <TourCallout>, is the deliberate escape hatch: this locks the step, it doesn't trap
  // the user, and everything goes back to normal the moment the tour ends.
  const closeIfAllowed = () => { if (!locked) onClose(); };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeIfAllowed}>
      <View style={styles.sheetRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeIfAllowed}
          accessibilityElementsHidden={locked}
          accessibilityLabel="Close preview"
        />
        <Reanimated.View
          entering={reducedMotion ? undefined : SlideInDown.duration(280)}
          style={styles.previewSheet}
        >
          <View style={styles.grabber} />
          <View style={styles.previewHead}>
            <Pill
              label={STATE_LABEL[node.state]}
              bg={done ? colors.tagGreenBg : node.state === 'current' ? colors.rewardBadgeBg : colors.tagPinkBg}
              fg={done ? colors.tagGreenText : node.state === 'current' ? colors.rewardBadgeText : colors.tagPinkText}
            />
            <T weight="bold" size={11} color={colors.muted4}>
              {moduleName}{total ? ` · Lesson ${node.lessonIndex + 1} of ${total}` : ''}
            </T>
          </View>

          <T weight="display" size={20} style={{ marginTop: 10 }}>{node.title}</T>
          <T weight="body" size={13.5} color={colors.muted2} style={styles.previewHook}>{node.hook}</T>

          {done ? (
            <T weight="bold" size={11.5} color={colors.greenDark} style={{ marginTop: 10 }}>
              ✓ You already finished this one. Replaying it won&apos;t change your progress.
            </T>
          ) : null}

          {saved ? (
            <T weight="bold" size={11.5} color={colors.greenDark} style={{ marginTop: 10 }}>
              ⏸ Paused at chapter {saved.chapterIdx + 1} of {saved.chapterCount}
            </T>
          ) : null}

          <TourCallout forTarget="tour-lesson-start" style={{ marginTop: 16 }} />

          {/* No TourTarget wrapper: an inSheet step is never measured for a spotlight (the
              sheet draws its own scrim and callout), so the button just needs the ring and
              the advance call.
              The ring lives on this WRAPPER rather than on the Pressable itself. React
              Native draws a border inside the view's own box, so putting it on the button
              ate 3.5px off the button's fill on all four sides — the button changed shape
              when the tour arrived, and the yellow read as part of the button rather than as
              something drawn around it. On the wrapper, with a few pixels of padding, it's a
              real ring with a visible gap: the button is untouched and the highlight is
              unmistakably pointing AT it. The pulse scales both together. */}
          <Reanimated.View style={[styles.ctaWrap, locked && styles.ctaWrapTour, ctaPulse]}>
            <Pressable
              onPress={() => {
                // Safe unconditionally — a no-op unless the tour is waiting on this button.
                advanceIfWaitingOn('tour-lesson-start');
                onStart();
              }}
              accessibilityRole="button"
              style={[styles.previewCta, { backgroundColor: tone }]}
            >
              <T weight="extra" size={14.5} color={colors.white}>{cta}</T>
            </Pressable>
          </Reanimated.View>
          {/* Left visible rather than removed while locked. A button that vanishes mid-tour
              reads as the sheet changing shape under you; one that's plainly greyed out reads
              as "not this one, the green one". */}
          <Pressable
            onPress={onClose}
            disabled={locked}
            accessibilityRole="button"
            accessibilityState={{ disabled: locked }}
            style={[styles.previewClose, locked && styles.previewCloseLocked]}
          >
            <T weight="extra" size={13} color={colors.muted2}>Not now</T>
          </Pressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Fixed height, always occupied — 22px is the Pill's own laid-out height, so the reserved
  // space matches the label exactly and there's no slack when it isn't showing.
  recLabelRow: { height: 22, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  // A transparent 2px border and the same padding in the base style, so turning the gold on
  // recolours the box without moving anything.
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: -8, paddingHorizontal: 6, paddingVertical: 8,
    borderRadius: 20, borderWidth: 2, borderColor: 'transparent', marginBottom: 2,
  },
  // Exactly the treatment ModuleTile's `recommended` prop uses, so the path and the module
  // grid can't drift apart on what "recommended" looks like.
  sectionHeadRec: {
    borderColor: colors.reward,
    backgroundColor: colors.rewardBg,
    shadowColor: colors.reward,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  pager: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  position: { textAlign: 'center', letterSpacing: 1, marginBottom: 6 },

  // A lighter border and a softer, shorter shadow than the old card: at this size the heavy
  // treatment read as a second card on the page rather than a label on a node.
  tip: {
    position: 'absolute', width: TIP_W, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 11, gap: 3,
    shadowColor: '#2C3E2D', shadowOpacity: 0.12, shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  tipState: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tipDot: { width: 6, height: 6, borderRadius: 3 },

  comet: {
    position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.green,
  },
  cometFaint: { opacity: 0.5, backgroundColor: colors.greenBright },

  sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,32,23,0.45)' },
  previewSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 10, paddingHorizontal: 22, paddingBottom: 26,
  },
  grabber: {
    width: 42, height: 4, borderRadius: 2, backgroundColor: colors.track,
    alignSelf: 'center', marginBottom: 14,
  },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  previewHook: { marginTop: 8, lineHeight: 19 },
  ctaWrap: { marginTop: 18 },
  // Same reward yellow as the path node's tour ring, so "the thing the tour wants tapped"
  // looks identical in both places. The 4px padding is the gap between ring and button —
  // what makes this read as a highlight around the button rather than a border on it.
  //
  // marginTop drops from 18 to 11 to pay for the 7px the ring itself adds (4 padding +
  // 3 border), so the button stays exactly where it was and the sheet doesn't shift when
  // the tour reaches this step.
  //
  // backgroundColor isn't cosmetic: Android's elevation shadow is derived from the view's
  // own background, and a transparent wrapper gets no glow at all.
  ctaWrapTour: {
    marginTop: 11, padding: 4, borderRadius: 20,
    borderWidth: 3, borderColor: colors.reward, backgroundColor: colors.white,
    shadowColor: colors.reward, shadowOpacity: 0.55, shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  previewCta: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  previewClose: { marginTop: 4, paddingVertical: 11, alignItems: 'center' },
  previewCloseLocked: { opacity: 0.32 },
});
