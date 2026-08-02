import { useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Reanimated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate,
  FadeInDown, ZoomIn, type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { modules, type Module } from '@/data';
import { moduleContentById } from '@/content';
import { SURVEY_TRACKS } from '@/survey';
import { useStore } from '@/store';
import { Hammy } from '@/components';
import { MOOD_FACES } from '@/hammyFaces';
import { T, Bar, Pill, useReducedMotion } from './bits';
import { PathNode, type NodeState } from './PathNode';
import { NODE_BOX, snakePositions, smoothPath, pathHeight } from './geometry';
import { DeviceFrame, AmbientBackdrop, Sheen, TrailComet, Sparkles, PHONE_W } from './effects';

/** Design target from the brief: a 390px mobile column. On a desktop-width window the whole
 * thing now sits inside a phone shell (see DeviceFrame) rather than floating as a bare column. */
const COLUMN = PHONE_W;

const AnimatedScrollView = Reanimated.createAnimatedComponent(ScrollView);

/* ─────────────────────────── view model ─────────────────────────── */

type PathNodeData = {
  key: string;
  moduleId: string;
  lessonIndex: number;
  title: string;
  state: NodeState;
};

type Section = {
  module: Module;
  nodes: PathNodeData[];
  done: number;
  total: number;
  mastered: boolean;
  /** Set on the first module of each track, so a track boundary can be marked on the path. */
  trackTitle?: string;
};

/** Demo completions, used only when the "Demo data" toggle is on.
 *
 * This never touches the store — it's a pure overlay computed in render, so nothing is
 * written to your real persisted progress. It exists because a fresh account has zero
 * completions, which means three of the four node states would never appear and there'd be
 * nothing to judge. Flip to "My progress" to see the screen against your actual data. */
const DEMO_DONE: Record<string, number[]> = {
  earning: [0, 1, 2, 3, 4, 5, 6, 7],
  spending: [0, 1, 2, 3, 4],
  saving: [0, 1],
};
const DEMO_LIFE_TASKS = ['earning'];

/* ─────────────────────────── screen ─────────────────────────── */

export default function PathScreen() {
  return (
    <DeviceFrame>
      <PathBody />
    </DeviceFrame>
  );
}

function PathBody() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { state, moduleDoneIndices } = useStore();
  const [demo, setDemo] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const railH = useRef(0);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  const colWidth = Math.min(width, COLUMN);
  const centerX = colWidth / 2;

  const doneIndicesFor = (id: string) => (demo ? (DEMO_DONE[id] ?? []) : moduleDoneIndices(id));
  const lifeTaskDone = (id: string) =>
    (demo ? DEMO_LIFE_TASKS : state.completedLifeTaskIds).includes(id);

  /** The single recommended node: the first not-yet-finished lesson in the first
   * not-yet-mastered module of the learner's track (falling back to catalog order). */
  const recommended = useMemo(() => {
    const activeTrack = SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId) ?? SURVEY_TRACKS[0];
    const ordered = [
      ...activeTrack.moduleIds.map((id) => modules.find((m) => m.id === id)).filter((m): m is Module => !!m),
      ...modules.filter((m) => !activeTrack.moduleIds.includes(m.id)),
    ];
    for (const m of ordered) {
      const content = moduleContentById(m.id);
      if (!content) continue;
      const mainCount = content.lessons.filter((l) => !l.isLifeTask).length;
      const done = new Set(doneIndicesFor(m.id));
      for (let i = 0; i < mainCount; i++) {
        if (!done.has(i)) return { moduleId: m.id, lessonIndex: i, trackTitle: activeTrack.title };
      }
      if (!lifeTaskDone(m.id)) return { moduleId: m.id, lessonIndex: mainCount, trackTitle: activeTrack.title };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, state.moduleProgress, state.completedLifeTaskIds, state.onboardingTrackId]);

  /** First module of each track gets that track's name as a boundary marker. Tracks are NOT
   * a partition (saving belongs to two of them), so the path itself is ordered by module and
   * tracks are expressed as boundaries + the jump rail — rather than duplicating a module. */
  const trackBoundary = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of SURVEY_TRACKS) {
      const first = t.moduleIds.find((id) => !map[id]);
      if (first) map[first] = t.title;
    }
    return map;
  }, []);

  const sections: Section[] = useMemo(() => modules.map((m) => {
    const content = moduleContentById(m.id);
    const lessons = content?.lessons ?? [];
    const mainLessons = lessons.filter((l) => !l.isLifeTask);
    const done = new Set(doneIndicesFor(m.id));
    const lifeDone = lifeTaskDone(m.id);

    const nodes: PathNodeData[] = mainLessons.map((l, i) => ({
      key: `${m.id}-${i}`,
      moduleId: m.id,
      lessonIndex: i,
      title: l.title,
      state: done.has(i)
        ? 'completed'
        : recommended?.moduleId === m.id && recommended.lessonIndex === i
          ? 'current'
          : 'available',
    }));

    const life = lessons.find((l) => l.isLifeTask);
    if (life) {
      nodes.push({
        key: `${m.id}-life`,
        moduleId: m.id,
        lessonIndex: lessons.indexOf(life),
        title: life.title,
        // The real-life guide is the one genuinely "aside" lesson in the data (isLifeTask,
        // excluded from module totals on the production screens) — so it carries the
        // optional/advanced state rather than one being invented.
        state: lifeDone ? 'completed' : 'optional',
      });
    }

    const doneCount = done.size + (lifeDone ? 1 : 0);
    return {
      module: m,
      nodes,
      done: doneCount,
      total: lessons.length,
      mastered: lessons.length > 0 && doneCount >= lessons.length,
      trackTitle: trackBoundary[m.id],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [demo, state.moduleProgress, state.completedLifeTaskIds, recommended]);

  const trackStats = useMemo(() => SURVEY_TRACKS.map((t) => {
    let done = 0;
    let total = 0;
    for (const id of t.moduleIds) {
      const s = sections.find((x) => x.module.id === id);
      if (!s) continue;
      done += s.done;
      total += s.total;
    }
    return { track: t, done, total, pct: total ? done / total : 0 };
  }), [sections]);

  const openLesson = (moduleId: string, lessonIndex: number) => {
    router.push({ pathname: '/learn/quest', params: { moduleId, lessonIndex: String(lessonIndex) } });
  };

  const jumpTo = (moduleId: string) => {
    const y = sectionY.current[moduleId];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - railH.current - 10), animated: !reducedMotion });
  };

  const recommendedSection = sections.find((s) => s.module.id === recommended?.moduleId);
  const recommendedNode = recommendedSection?.nodes.find(
    (n) => n.lessonIndex === recommended?.lessonIndex,
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AmbientBackdrop scrollY={scrollY} />
      <AnimatedScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* [0] title + data toggle */}
        <View style={[styles.col, { width: colWidth }]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <T weight="display" size={26}>Your path</T>
              <T weight="body" size={13} color={colors.muted2} style={{ marginTop: 2 }}>
                Follow the trail, or jump anywhere. Nothing is locked.
              </T>
            </View>
          </View>
          <View style={styles.toggle}>
            {(['Demo data', 'My progress'] as const).map((label, i) => {
              const on = (i === 0) === demo;
              return (
                <Pressable
                  key={label}
                  onPress={() => setDemo(i === 0)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Show ${label}`}
                  style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                >
                  <T weight="bold" size={11.5} color={on ? colors.white : colors.muted2}>{label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* [1] STICKY: the track rail. Doubles as overview and jump control — see the note
            in the hand-off. One row, always reachable, never covering the path. */}
        <View
          style={styles.railWrap}
          onLayout={(e: LayoutChangeEvent) => { railH.current = e.nativeEvent.layout.height; }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {trackStats.map(({ track, done, total, pct }) => {
              const isActive = recommended != null && track.moduleIds.includes(recommended.moduleId);
              const firstMod = modules.find((m) => track.moduleIds.includes(m.id));
              return (
                <Pressable
                  key={track.id}
                  onPress={() => firstMod && jumpTo(firstMod.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${track.title} track. ${done} of ${total} lessons done.${isActive ? ' Contains your recommended lesson.' : ''}`}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive && styles.chipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={styles.chipTop}>
                    <T weight="displayMed" size={13} numberOfLines={1}>{track.title}</T>
                    {isActive ? <T weight="extra" size={11} color={colors.reward}> ★</T> : null}
                  </View>
                  <T weight="bold" size={10.5} color={colors.muted3} style={{ marginBottom: 5 }}>
                    {done}/{total} lessons
                  </T>
                  <Bar value={pct} tint={isActive ? colors.green : colors.greenSoft} height={6} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* [2] the recommendation, stated in words before the path repeats it in shape */}
        <View style={[styles.col, { width: colWidth }]}>
          {recommended && recommendedNode && recommendedSection ? (
            <Pressable
              onPress={() => openLesson(recommended.moduleId, recommended.lessonIndex)}
              accessibilityRole="button"
              accessibilityLabel={`Recommended next: ${recommendedNode.title}, in ${recommendedSection.module.name}. Start lesson.`}
              style={({ pressed }) => [styles.recCard, pressed && { transform: [{ scale: 0.985 }] }]}
            >
              {/* Warm wash behind the card so the one thing being recommended isn't the same
                  flat white as everything else on the screen. */}
              <LinearGradient
                colors={['#FFFDF4', '#FFF6DE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Sheen width={colWidth - 36} reducedMotion={reducedMotion} />
              <View style={{ flex: 1 }}>
                <Pill label="RECOMMENDED FOR YOU" bg={colors.rewardBadgeBg} fg={colors.rewardBadgeText} />
                <T weight="display" size={17} style={{ marginTop: 7 }} numberOfLines={2}>
                  {recommendedNode.title}
                </T>
                <T weight="bold" size={11.5} color={colors.muted3} style={{ marginTop: 3 }}>
                  {recommendedSection.module.name} · {recommended.trackTitle} track
                </T>
                <View style={styles.recCta}>
                  <T weight="extra" size={12.5} color={colors.white}>Start</T>
                </View>
              </View>
              <Hammy size={78} bob={!reducedMotion} face={MOOD_FACES.star} floatAmplitude={7} />
            </Pressable>
          ) : (
            <View style={styles.recCard}>
              <T weight="display" size={16}>Everything is finished. Nice.</T>
            </View>
          )}
          <T weight="body" size={11.5} color={colors.muted4} style={styles.freedomNote}>
            Every node below is tappable, including ones far ahead. Skipping is fine.
          </T>
        </View>

        {/* [3…] the path */}
        {sections.map((section, si) => (
          <SectionView
            key={section.module.id}
            section={section}
            colWidth={colWidth}
            centerX={centerX}
            reducedMotion={reducedMotion}
            // Peeking Hammys are rationed: each is a live SVG, and a dozen of them on one
            // scrolling web page is the expensive kind of node. Every fourth section.
            peek={si % 4 === 1}
            scrollY={scrollY}
            onLayout={(y) => { sectionY.current[section.module.id] = y; }}
            onPressNode={openLesson}
          />
        ))}

        <View style={{ height: 40 }} />
      </AnimatedScrollView>
    </SafeAreaView>
  );
}

/* ─────────────────────────── one module ─────────────────────────── */

function SectionView({
  section, colWidth, centerX, reducedMotion, peek, scrollY, onLayout, onPressNode,
}: {
  section: Section;
  colWidth: number;
  centerX: number;
  reducedMotion: boolean;
  peek: boolean;
  scrollY: SharedValue<number>;
  onLayout: (y: number) => void;
  onPressNode: (moduleId: string, lessonIndex: number) => void;
}) {
  const { module: mod, nodes } = section;
  const lastIdx = nodes.length - 1;
  // The optional real-life node swings 1.5× further out than the wave would take it, so
  // "off the main line" is legible from position alone.
  const pts = snakePositions(nodes.length, centerX, (i) =>
    (nodes[i]?.state === 'optional' ? 1.5 : 1));
  const h = pathHeight(nodes.length);
  // The optional real-life lesson hangs off the end of the main line as a dashed SPUR rather
  // than sitting on it — the trail is the main sequence, and the extra is visibly a branch
  // off it. Position, line style and node style all say the same thing three ways.
  const hasSpur = nodes[lastIdx]?.state === 'optional' && pts.length >= 2;
  const mainD = smoothPath(hasSpur ? pts.slice(0, -1) : pts);
  const spurD = hasSpur ? smoothPath(pts.slice(-2)) : '';

  // The trail you've actually walked, drawn in green over the grey one. Progress stops
  // being a number in a header and becomes the shape of the path itself — which is the
  // whole reason to draw a path instead of a list.
  const firstUndone = nodes.findIndex((n) => n.state !== 'completed');
  const walked = firstUndone === -1 ? nodes.length : firstUndone;
  const walkedD = walked >= 2 ? smoothPath(pts.slice(0, walked)) : '';

  const currentIdx = nodes.findIndex((n) => n.state === 'current');
  const currentPt = currentIdx >= 0 ? pts[currentIdx] : null;
  const cometFrom = currentIdx > 0 ? pts[currentIdx - 1] : null;

  // Peekers drift against the scroll. Section y isn't known until layout, so this reads the
  // measured value out of a shared value updated in onLayout below.
  const myY = useSharedValue(0);
  const peekStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value - myY.value, [-600, 600], [26, -26], 'clamp') }],
  }));
  // Hammy stands on whichever side of the column the node ISN'T, so he can never sit over
  // the tap target. pointerEvents:none on every decorative Hammy as a second guarantee.
  const hammyOnLeft = currentPt ? currentPt.x > centerX : true;

  const pct = section.total ? section.done / section.total : 0;

  return (
    <View
      style={[styles.section, { width: colWidth }]}
      onLayout={(e: LayoutChangeEvent) => {
        onLayout(e.nativeEvent.layout.y);
        myY.value = e.nativeEvent.layout.y;
      }}
    >
      {section.trackTitle ? (
        <View style={styles.trackBoundary}>
          <View style={styles.rule} />
          <T weight="extra" size={10.5} color={colors.muted3} style={{ letterSpacing: 1 }}>
            {section.trackTitle.toUpperCase()}
          </T>
          <View style={styles.rule} />
        </View>
      ) : null}

      <Reanimated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(340)}
        style={styles.sectionHead}
      >
        <View style={[styles.modBadge, { backgroundColor: mod.color }]}>
          <T weight="display" size={15} color={mod.textColor}>{mod.icon}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T weight="display" size={17} numberOfLines={1}>{mod.name}</T>
          <View style={styles.headMeta}>
            <T weight="bold" size={11} color={colors.muted3}>{section.done}/{section.total}</T>
            <Bar value={pct} tint={section.mastered ? colors.green : mod.textColor} height={6} />
          </View>
        </View>
        {/* Milestone / celebration Hammy at the header — a head only, so a full-height
            mascot never pushes the first node down the screen. */}
        {section.mastered ? (
          <View pointerEvents="none" style={{ alignItems: 'center' }}>
            <Sparkles reducedMotion={reducedMotion} />
            <Hammy headOnly size={46} bob={!reducedMotion} floatAmplitude={4} face={MOOD_FACES.love} />
            <Pill label="DONE" bg={colors.tagGreenBg} fg={colors.tagGreenText} style={{ marginTop: 2 }} />
          </View>
        ) : section.trackTitle ? (
          <View pointerEvents="none">
            <Hammy headOnly size={44} bob={!reducedMotion} floatAmplitude={4} face={MOOD_FACES.curious} />
          </View>
        ) : null}
      </Reanimated.View>

      <View style={{ height: h, width: colWidth }}>
        {/* The trail, behind everything. */}
        <Svg width={colWidth} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgGradient id={`walked-${mod.id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.greenBright} />
              <Stop offset="1" stopColor={colors.green} />
            </SvgGradient>
          </Defs>
          {/* Soft under-stroke: a wider, paler line beneath the trail so it sits ON the page
              instead of being a flat rule drawn across it. */}
          <SvgPath d={mainD} stroke={colors.borderCool} strokeWidth={15} strokeLinecap="round" fill="none" />
          <SvgPath d={mainD} stroke={colors.track2} strokeWidth={9} strokeLinecap="round" fill="none" />
          {walkedD ? (
            <SvgPath
              d={walkedD}
              stroke={`url(#walked-${mod.id})`}
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          {spurD ? (
            <SvgPath
              d={spurD}
              stroke={colors.borderOpt}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="2 12"
              fill="none"
            />
          ) : null}
        </Svg>

        {/* Dots running the last stretch into the recommended node. */}
        {currentPt && cometFrom ? (
          <TrailComet from={cometFrom} to={currentPt} reducedMotion={reducedMotion} />
        ) : null}

        {/* Hammy peeking from behind the curve — behind the SVG in stacking order and
            non-interactive, pushed half off the column edge so he reads as peeking. */}
        {peek ? (
          <Reanimated.View
            pointerEvents="none"
            style={[styles.peek, { top: h * 0.42, [hammyOnLeft ? 'right' : 'left']: -26 }, peekStyle]}
          >
            <Hammy headOnly size={62} bob={!reducedMotion} floatAmplitude={5} face={MOOD_FACES.wink} />
          </Reanimated.View>
        ) : null}

        {/* Hammy gesturing at the recommended node. */}
        {currentPt ? (
          <View
            pointerEvents="none"
            style={[
              styles.gesture,
              {
                top: currentPt.y - 46,
                [hammyOnLeft ? 'left' : 'right']: 6,
              },
            ]}
          >
            <Hammy size={84} bob={!reducedMotion} floatAmplitude={6} face={MOOD_FACES.star} />
            <T weight="extra" size={9.5} color={colors.muted3} style={{ letterSpacing: 0.6 }}>
              {hammyOnLeft ? 'THIS ONE →' : '← THIS ONE'}
            </T>
          </View>
        ) : null}

        {nodes.map((n, i) => (
          <Reanimated.View
            key={n.key}
            // Nodes drop in one after another rather than all at once, so a section reads as
            // being laid down along the trail. Skipped entirely under reduced motion.
            entering={reducedMotion ? undefined : ZoomIn.delay(i * 55).duration(320).springify().damping(14)}
            style={{
              position: 'absolute',
              left: pts[i].x - NODE_BOX / 2,
              top: pts[i].y - NODE_BOX / 2,
            }}
          >
            <PathNode
              title={n.title}
              state={n.state}
              index={i + 1}
              accentBg={mod.color}
              accentFg={mod.textColor}
              reducedMotion={reducedMotion}
              onPress={() => onPressNode(n.moduleId, n.lessonIndex)}
            />
          </Reanimated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { alignItems: 'center', paddingBottom: 20 },
  col: { paddingHorizontal: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 6 },
  toggle: {
    flexDirection: 'row', alignSelf: 'flex-start', marginTop: 10, padding: 3,
    backgroundColor: colors.canvas, borderRadius: 999, gap: 2,
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  toggleBtnOn: { backgroundColor: colors.greenDark },

  railWrap: {
    width: '100%', backgroundColor: colors.screen, paddingVertical: 10,
    borderBottomWidth: 1.5, borderBottomColor: colors.border,
  },
  rail: { paddingHorizontal: 18, gap: 10 },
  chip: {
    width: 152, padding: 11, borderRadius: 16, backgroundColor: colors.white,
    borderWidth: 1.75, borderColor: colors.borderOpt,
  },
  chipActive: { borderColor: colors.green, backgroundColor: '#F4F8F2' },
  chipTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 1 },

  recCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: colors.white, borderRadius: 22, padding: 16,
    borderWidth: 2, borderColor: colors.reward,
    // Clips the sheen sweep and the gradient wash to the card's rounded corners.
    overflow: 'hidden',
  },
  recCta: {
    marginTop: 10, alignSelf: 'flex-start', backgroundColor: colors.green,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999,
  },
  freedomNote: { marginTop: 10, textAlign: 'center' },

  section: { paddingTop: 18 },
  trackBoundary: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, marginBottom: 14,
  },
  rule: { flex: 1, height: 1.5, backgroundColor: colors.border },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, marginBottom: 8 },
  modBadge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },

  peek: { position: 'absolute', opacity: 0.9 },
  gesture: { position: 'absolute', alignItems: 'center', width: 96 },
});
