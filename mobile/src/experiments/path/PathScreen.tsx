import { useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, Pressable, Modal, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Reanimated, { FadeInDown, SlideInDown, ZoomIn } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { user, modules, type Module } from '@/data';
import { moduleContentById } from '@/content';
import { SURVEY_TRACKS } from '@/survey';
import { useStore } from '@/store';
import { todaysHammyMood, hasModuleActivityToday } from '@/hammyMood';
import { MOOD_FACES, REACTION_FACES, type FaceOverlay } from '@/hammyFaces';
// Imported, not copied. These are read-only presentational widgets and importing them is the
// only way this screen can be a fair comparison — a hand-rolled lookalike of the Header or a
// BadgeMedal would be judging my copy of your design system rather than your design system.
// Nothing here is ever modified; the experiment's own bespoke pieces are all local files.
import { Header, Card, ProgressBar, Speech, Stat, SectionHead, MIcon, BadgeMedal, Coin, Diamond, Flame, Hammy } from '@/components';
import { T, Bar, Pill, useReducedMotion } from './bits';
import { PathNode, type NodeState } from './PathNode';
import { NODE_BOX, snakePositions, smoothPath, pathHeight, segmentSamples } from './geometry';
import { DeviceFrame, AmbientBackdrop, Sheen, TrailComet, PHONE_W } from './effects';

const COLUMN = PHONE_W;

/** One distinct expression per module — eleven modules, eleven different faces.
 *
 * The two downcast ones are back, on new modules: `sad` moved Loans → Taxes, and `gentle`
 * (the wrong-answer mouth) moved Scams → Loans. `star` moved Earning → Investing and `love`
 * moved Spending → Psychology, so all four asked-for reassignments land somewhere the
 * expression also happens to fit: sad about a tax bill, unconvinced about debt, starry-eyed
 * about returns, and hearts for the module about emotional spending.
 *
 * Bringing both back also fills the last gap — every module now carries a real overlay, so
 * nothing falls through to Hammy's plain resting face the way Scams did.
 *
 * Two of these are the quest player's own answer reactions, which a student already knows:
 * `happy` (correct) on Saving, `gentle` (wrong) on Loans. Both are `keepBase` overlays —
 * Hammy keeps his eyes, cheeks and snout and only the mouth changes — so they read subtler
 * than the nine full-face swaps around them.
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

/* ─────────────────────────── view model ─────────────────────────── */

type PathNodeData = {
  key: string; moduleId: string; lessonIndex: number; title: string; state: NodeState;
  /** The lesson's own authored one-paragraph scenario (LessonSummary.hook). It's what the
   * preview is for — the point of looking before you tap is to see what the lesson is
   * actually about, and the title alone rarely tells you. */
  hook: string;
};

type Section = {
  module: Module;
  nodes: PathNodeData[];
  done: number;
  total: number;
  mastered: boolean;
  trackTitle?: string;
};

/** Demo completions, applied as a render-time overlay only — never written to the store, so
 * your real progress is untouched. A fresh account has zero completions, which would leave
 * three of the four node states invisible and nothing to judge. */
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
  const {
    state, level, tierName, moduleDoneIndices, achievements, equippedMascotItems,
  } = useStore();
  const [demo, setDemo] = useState(true);
  /** Which module's path is on screen. Null means "follow the recommendation" — so the
   * screen opens on whatever you'd actually be doing next, and only pins to a specific
   * module once you deliberately page away from it. */
  const [pickedModule, setPickedModule] = useState<string | null>(null);
  /** The node whose preview sheet is open. Tapping a node opens this rather than launching
   * the lesson: on a finished module the whole point is to look at what a lesson was before
   * deciding to redo it, and on an unfinished one it answers "what am I about to start"
   * without committing. The continue-lesson card at the top is still the one-tap route in,
   * so adding a look-first step here doesn't slow down the common case. */
  const [preview, setPreview] = useState<PathNodeData | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const colWidth = Math.min(width, COLUMN);
  const centerX = colWidth / 2;

  const doneIndicesFor = (id: string) => (demo ? (DEMO_DONE[id] ?? []) : moduleDoneIndices(id));
  const lifeTaskDone = (id: string) =>
    (demo ? DEMO_LIFE_TASKS : state.completedLifeTaskIds).includes(id);

  /** The track the onboarding survey actually picked, or null if it never ran.
   *
   * This distinction is the point of the gold treatment: a recommendation the student was
   * given a reason for is a different thing from "the next unfinished lesson in catalog
   * order", and only the first one has earned the right to shout. With no survey answer
   * there is no gold anywhere on the screen — the path still opens on the next lesson, it
   * just doesn't claim to be personalised when it isn't.
   *
   * Demo mode pretends the survey chose Starting Fresh, so the treatment can be judged
   * without running onboarding first. Real mode reads the persisted answer and nothing else. */
  const surveyTrack = demo
    ? SURVEY_TRACKS[0]
    : (SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId) ?? null);

  const recommended = useMemo(() => {
    // Ordering still needs a track even when the survey didn't run — it just doesn't get to
    // call the result "recommended for you".
    const orderTrack = surveyTrack ?? SURVEY_TRACKS[0];
    const ordered = [
      ...orderTrack.moduleIds.map((id) => modules.find((m) => m.id === id)).filter((m): m is Module => !!m),
      ...modules.filter((m) => !orderTrack.moduleIds.includes(m.id)),
    ];
    const base = { trackTitle: surveyTrack?.title ?? null, fromSurvey: !!surveyTrack };
    for (const m of ordered) {
      const content = moduleContentById(m.id);
      if (!content) continue;
      const mainCount = content.lessons.filter((l) => !l.isLifeTask).length;
      const done = new Set(doneIndicesFor(m.id));
      for (let i = 0; i < mainCount; i++) {
        if (!done.has(i)) return { ...base, moduleId: m.id, lessonIndex: i, isLifeTask: false };
      }
      if (!lifeTaskDone(m.id)) return { ...base, moduleId: m.id, lessonIndex: mainCount, isLifeTask: true };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, surveyTrack, state.moduleProgress, state.completedLifeTaskIds]);

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
      hook: l.hook,
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
        hook: life.hook,
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

  // Exactly one module's path is on screen at a time. The arrows in its header page through
  // the catalog — every module is still one or two taps away, so the "nothing is locked"
  // property survives losing the track rail, it just costs a page instead of a scroll.
  const shownId = pickedModule ?? recommended?.moduleId ?? modules[0].id;
  const shownIdx = Math.max(0, sections.findIndex((s) => s.module.id === shownId));
  const shownSection = sections[shownIdx];
  const pageBy = (delta: number) => {
    const next = (shownIdx + delta + sections.length) % sections.length;
    setPickedModule(sections[next].module.id);
  };

  const openLesson = (moduleId: string, lessonIndex: number, isLifeTask = false) => {
    router.push({
      pathname: '/learn/quest',
      params: { moduleId, lessonIndex: String(lessonIndex), ...(isLifeTask ? { isLifeTask: '1' } : {}) },
    });
  };

  const recSection = sections.find((s) => s.module.id === recommended?.moduleId);
  const recNode = recSection?.nodes.find((n) => n.lessonIndex === recommended?.lessonIndex);

  // Home's own daily-mood logic, unchanged — one mood per calendar day, or satisfied once a
  // lesson has been finished today.
  const activeToday = hasModuleActivityToday(state.lastModuleActivityDate);
  const mood = todaysHammyMood();
  const speechMsg = activeToday
    ? "Hammy's had a great day already, thanks to you! Keep it going?"
    : mood.msg;
  const moodFace = activeToday ? MOOD_FACES.satisfied : MOOD_FACES[mood.id];

  const earnedBadges = achievements().filter((b) => b.earned).slice(0, 4);
  const recPct = recSection && recSection.total ? recSection.done / recSection.total : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AmbientBackdrop />
      <Header
        level={level}
        name={tierName}
        coins={state.coins}
        diamonds={state.diamonds}
        hideCurrency
        onGear={() => router.push('/(tabs)/settings')}
      />
      {/* No stickyHeaderIndices. It used to be [3] to pin the track rail; when the rail was
          removed, index 3 became the "Keep learning" header and silently inherited the
          sticky behaviour — which is why that heading rode down the screen as you scrolled.
          Nothing on this screen is sticky now. */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* [0] greeting + the demo-data switch */}
        <View style={[styles.col, { width: colWidth }]}>
          <View style={styles.greetRow}>
            <T weight="display" size={23} style={{ flex: 1 }}>Good {timeOfDay()}, {user.name}</T>
            <View style={styles.toggle}>
              {(['Demo', 'Real'] as const).map((label, i) => {
                const on = (i === 0) === demo;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setDemo(i === 0)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Show ${label === 'Demo' ? 'demo data' : 'my real progress'}`}
                    style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                  >
                    <T weight="bold" size={10.5} color={on ? colors.white : colors.muted3}>{label}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* [1] XP / streak / coins / diamonds — the real home stat row */}
        <View style={[styles.col, styles.statRow, { width: colWidth }]}>
          <Stat value={state.xp.toLocaleString()} label="XP" />
          <Stat value={<Row><Flame size={13} /><Num>{state.streak}</Num></Row>} label="Streak" />
          <Stat value={<Row><Coin /><Num>{state.coins}</Num></Row>} label="Coins" />
          <Stat value={<Row><Diamond /><Num>{state.diamonds}</Num></Row>} label="Diamonds" />
        </View>

        {/* [2] Continue-lesson card. Home's mascot + speech bubble, kept exactly as it is
            there — this is the one Hammy on the screen and it has an actual job. */}
        <View style={[styles.col, { width: colWidth }]}>
          {recommended && recNode && recSection ? (
            // No gold badge or gold border up here. The recommendation is stated once, on
            // the module it actually points at — saying it twice on one screen made the
            // card and the header compete to be the same announcement.
            <Card style={styles.questCard}>
              <View style={styles.questTop}>
                <Hammy size={76} bob={!reducedMotion} equipped={equippedMascotItems()} face={moodFace} />
                <Speech>{speechMsg}</Speech>
              </View>
              <View style={{ marginTop: 14 }}>
                <View style={styles.questMeta}>
                  <T weight="displayMed" size={14}>{recSection.module.name}</T>
                  <T weight="bold" size={12} color={colors.pinkDark}>
                    {recommended.isLifeTask
                      ? 'Real-life sub-quest'
                      : `Lesson ${recommended.lessonIndex + 1} / ${recSection.total}`}
                  </T>
                </View>
                <ProgressBar value={recPct} tone="pink" />
              </View>
              <Pressable
                onPress={() => openLesson(recommended.moduleId, recommended.lessonIndex, recommended.isLifeTask)}
                accessibilityRole="button"
                accessibilityLabel={`Continue lesson: ${recNode.title}`}
                style={styles.recCta}
              >
                <Sheen width={colWidth - 76} reducedMotion={reducedMotion} />
                <T weight="extra" size={14} color={colors.white}>Continue lesson</T>
              </Pressable>
            </Card>
          ) : null}
        </View>

        {/* [3] the path, standing in for Home's "Keep learning" grid — one module only */}
        <View style={[styles.col, { width: colWidth, marginTop: 16 }]}>
          <SectionHead title="Keep learning" action="See all →" onAction={() => router.push('/(tabs)/modules')} />
          <T weight="body" size={11.5} color={colors.muted4} style={{ marginTop: 4 }}>
            Tap any lesson, including ones far ahead. Nothing is locked.
          </T>
        </View>

        {shownSection ? (
          <SectionView
            key={shownSection.module.id}
            section={shownSection}
            colWidth={colWidth}
            centerX={centerX}
            reducedMotion={reducedMotion}
            onPrev={() => pageBy(-1)}
            onNext={() => pageBy(1)}
            position={`${shownIdx + 1} of ${sections.length}`}
            recommendedTrack={
              recommended?.fromSurvey && recommended.moduleId === shownSection.module.id
                ? recommended.trackTitle
                : null
            }
            onPressNode={setPreview}
          />
        ) : null}

        {/* [last] Recent badges — the real home section, unchanged */}
        <View style={[styles.col, { width: colWidth, marginTop: 18 }]}>
          <SectionHead title="Recent badges" action={`All ${achievements().length} →`} onAction={() => router.push('/(tabs)/badges')} />
          <View style={styles.badgeRow}>
            {earnedBadges.length ? earnedBadges.map((b) => (
              <View key={b.id} style={styles.badgeCell}>
                <BadgeMedal icon={b.icon} color={b.color} tier={b.tier} size={54} />
                <T weight="extra" size={10.5} color={colors.muted1} style={{ textAlign: 'center' }}>{b.label}</T>
              </View>
            )) : (
              <T weight="body" size={13} color={colors.muted2}>
                No badges yet. Finish a lesson to earn your first one!
              </T>
            )}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <FakeTabBar onHome={() => scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion })} />

      <PreviewSheet
        node={preview}
        moduleName={sections.find((s) => s.module.id === preview?.moduleId)?.module.name ?? ''}
        total={sections.find((s) => s.module.id === preview?.moduleId)?.total ?? 0}
        reducedMotion={reducedMotion}
        onClose={() => setPreview(null)}
        onStart={() => {
          const n = preview;
          setPreview(null);
          if (n) openLesson(n.moduleId, n.lessonIndex, n.state === 'optional');
        }}
      />
    </SafeAreaView>
  );
}

/** Look before you leap.
 *
 * A bottom sheet rather than a centred dialog, matching the pattern the quest player already
 * uses for its own interruptions — and it rises from the same edge as the thumb, so on a
 * phone the buttons land where the hand already is.
 *
 * The call to action is worded from the node's state, because "Start lesson" is wrong in
 * three of the four cases: a finished lesson is a repeat, the recommended one is a
 * continuation, and the optional extra is a side trip. */
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
  if (!node) return null;
  const done = node.state === 'completed';
  const cta = done ? 'Do it again' : node.state === 'current' ? 'Continue lesson' : 'Start lesson';
  const tone = node.state === 'current' ? colors.green : done ? colors.greenDark : colors.pink;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close preview" />
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

          <Pressable onPress={onStart} accessibilityRole="button" style={[styles.previewCta, { backgroundColor: tone }]}>
            <T weight="extra" size={14.5} color={colors.white}>{cta}</T>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.previewClose}>
            <T weight="extra" size={13} color={colors.muted2}>Not now</T>
          </Pressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const STATE_LABEL: Record<NodeState, string> = {
  completed: 'COMPLETED',
  current: 'RECOMMENDED NEXT',
  available: 'NOT STARTED',
  optional: 'OPTIONAL EXTRA',
};

/* ─────────────────────────── one module ─────────────────────────── */

function SectionView({
  section, colWidth, centerX, reducedMotion, position, recommendedTrack, onPrev, onNext, onPressNode,
}: {
  section: Section;
  colWidth: number;
  centerX: number;
  reducedMotion: boolean;
  /** "3 of 11" — so paging doesn't feel like wandering. */
  position: string;
  /** Non-null when THIS module is the one the onboarding survey pointed at — carries the
   * track's name for the label. Null on every other module, and on every module when the
   * survey never ran. */
  recommendedTrack: string | null;
  onPrev: () => void;
  onNext: () => void;
  onPressNode: (node: PathNodeData) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { module: mod, nodes } = section;
  const lastIdx = nodes.length - 1;
  const pts = snakePositions(nodes.length, centerX, (i) => (nodes[i]?.state === 'optional' ? 1.5 : 1));
  const h = pathHeight(nodes.length);
  const hasSpur = nodes[lastIdx]?.state === 'optional' && pts.length >= 2;
  const mainD = smoothPath(hasSpur ? pts.slice(0, -1) : pts);
  const spurD = hasSpur ? smoothPath(pts.slice(-2)) : '';

  const firstUndone = nodes.findIndex((n) => n.state !== 'completed');
  const walked = firstUndone === -1 ? nodes.length : firstUndone;
  const walkedD = walked >= 2 ? smoothPath(pts.slice(0, walked)) : '';

  const currentIdx = nodes.findIndex((n) => n.state === 'current');
  // Sampled along the same bézier the SVG draws, so the dots ride the line into the node
  // instead of cutting the corner across it.
  const cometSamples = currentIdx > 0 ? segmentSamples(pts, currentIdx - 1) : [];

  const pct = section.total ? section.done / section.total : 0;
  const face = MODULE_FACE[mod.id];

  return (
    <View style={[styles.section, { width: colWidth }]}>
      {/* The survey's own label, sitting directly above the gold outline rather than inside
          it — the box says "this one", the label says why, and keeping them separate stops
          the header row from having to carry both jobs at once.
       *
       * The ROW is always rendered and always the same height; only its contents are
       * conditional. Mounting and unmounting it moved the module name, the whole path and
       * everything under it by ~29px every time you paged onto or off the recommended
       * module, which read as the page jumping. Now the space is simply always there and
       * the label fills it or doesn't. */}
      <View style={styles.recLabelRow}>
        {recommendedTrack ? (
          <>
            <Pill label="★ RECOMMENDED FOR YOU" bg={colors.rewardBadgeBg} fg={colors.rewardBadgeText} />
            <T weight="bold" size={10.5} color={colors.muted4}>from your {recommendedTrack} track</T>
          </>
        ) : null}
      </View>

      {/* Keyed on the module so the whole header + path re-enters when you page, which is
          what makes a page read as a change of place rather than a text swap. */}
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
            <Bar value={pct} tint={section.mastered ? colors.green : mod.textColor} height={6} />
          </View>
        </View>
        {/* The module's own face. Every module gets one, in the same spot, instead of
            mascots appearing at random points down the page. */}
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

      <View style={{ height: h, width: colWidth }}>
        <Svg width={colWidth} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgGradient id={`walked-${mod.id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.greenBright} />
              <Stop offset="1" stopColor={colors.green} />
            </SvgGradient>
          </Defs>
          <SvgPath d={mainD} stroke={colors.borderCool} strokeWidth={15} strokeLinecap="round" fill="none" />
          <SvgPath d={mainD} stroke={colors.track2} strokeWidth={9} strokeLinecap="round" fill="none" />
          {walkedD ? (
            <SvgPath d={walkedD} stroke={`url(#walked-${mod.id})`} strokeWidth={9} strokeLinecap="round" fill="none" />
          ) : null}
          {spurD ? (
            <SvgPath d={spurD} stroke={colors.borderOpt} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" fill="none" />
          ) : null}
        </Svg>

        {cometSamples.length ? (
          <TrailComet samples={cometSamples} reducedMotion={reducedMotion} />
        ) : null}

        {nodes.map((n, i) => (
          <Reanimated.View
            key={n.key}
            entering={reducedMotion ? undefined : ZoomIn.delay(i * 55).duration(320).springify().damping(14)}
            style={{ position: 'absolute', left: pts[i].x - NODE_BOX / 2, top: pts[i].y - NODE_BOX / 2 }}
          >
            <PathNode
              title={n.title}
              state={n.state}
              index={i + 1}
              accentBg={mod.color}
              accentFg={mod.textColor}
              reducedMotion={reducedMotion}
              onPress={() => onPressNode(n)}
              onHoverIn={() => setHovered(i)}
              onHoverOut={() => setHovered((cur) => (cur === i ? null : cur))}
            />
          </Reanimated.View>
        ))}

        {/* Hover card. Sits above the node it belongs to, clamped so it can't run off either
            edge of the column, and non-interactive so it can never eat the tap it's
            describing. Rendered last so it draws over the nodes around it. */}
        {hovered !== null && nodes[hovered] ? (
          <View
            pointerEvents="none"
            style={[
              styles.tip,
              {
                top: Math.max(0, pts[hovered].y - NODE_BOX / 2 - 62),
                left: Math.min(Math.max(6, pts[hovered].x - 110), colWidth - 226),
              },
            ]}
          >
            <T weight="extra" size={9} color={colors.muted5} style={{ letterSpacing: 0.7 }}>
              {STATE_LABEL[nodes[hovered].state]}
            </T>
            <T weight="displayMed" size={13} color={colors.ink} numberOfLines={2}>
              {nodes[hovered].title}
            </T>
            <T weight="body" size={11} color={colors.muted2} numberOfLines={3} style={{ marginTop: 2 }}>
              {nodes[hovered].hook}
            </T>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Pages between modules. 40×40 so it clears the 44px guidance once its 4px of surrounding
 * gap is counted, and it carries a real ARIA label rather than leaving a bare chevron for a
 * screen reader to guess at. */
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

/* ─────────────────────────── chrome ─────────────────────────── */

/** A visual stand-in for the real tab bar, so the screen can be judged with the same amount
 * of chrome the actual Home has under it. Deliberately non-navigating apart from Home —
 * this route lives outside the (tabs) group, and wiring it into the real navigator would
 * mean touching the production layout. */
function FakeTabBar({ onHome }: { onHome: () => void }) {
  const items: { icon: React.ComponentProps<typeof Feather>['name']; label: string }[] = [
    { icon: 'home', label: 'Home' },
    { icon: 'grid', label: 'Modules' },
    { icon: 'bar-chart-2', label: 'Progress' },
    { icon: 'tool', label: 'Tools' },
    { icon: 'shopping-bag', label: 'Shop' },
  ];
  return (
    <View style={styles.tabBar}>
      {items.map((it, i) => {
        const on = i === 0;
        return (
          <Pressable
            key={it.label}
            onPress={on ? onHome : undefined}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            accessibilityState={{ selected: on }}
            style={styles.tabItem}
          >
            <Feather name={it.icon} size={20} color={on ? colors.green : colors.muted5} />
            <T weight="extra" size={9.5} color={on ? colors.green : colors.muted5}>{it.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─────────────────────────── small helpers ─────────────────────────── */

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
const Row = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{children}</View>
);
const Num = ({ children }: { children: React.ReactNode }) => (
  <T weight="display" size={19}>{children}</T>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { alignItems: 'center', paddingBottom: 16 },
  col: { paddingHorizontal: 20 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  toggle: { flexDirection: 'row', padding: 3, backgroundColor: colors.canvas, borderRadius: 999, gap: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  toggleBtnOn: { backgroundColor: colors.greenDark },

  statRow: { flexDirection: 'row', gap: 8, marginTop: 14 },

  questCard: { backgroundColor: colors.pinkBg, borderColor: colors.pinkBorder, marginTop: 15 },
  questTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  recCta: {
    marginTop: 13, backgroundColor: colors.pink, borderRadius: 16,
    paddingVertical: 13, alignItems: 'center', overflow: 'hidden',
  },

  section: { paddingTop: 12 },
  // Fixed height, always occupied. 22px is the Pill's own laid-out height (4px padding top
  // and bottom around a 10.5pt line), so the reserved space matches the label exactly and
  // there's no slack when it isn't showing.
  recLabelRow: {
    height: 22,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, marginBottom: 7,
  },
  // A transparent 2px border and the same padding in the base style, so turning the gold on
  // recolours the box without moving anything — the header must not shift as you page onto
  // and off the recommended module.
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, paddingHorizontal: 6, paddingVertical: 8,
    borderRadius: 20, borderWidth: 2, borderColor: 'transparent',
    marginBottom: 2,
  },
  // Exactly the treatment ModuleTile's `recommended` prop uses on the real Home grid
  // (colors.reward outline, rewardBg fill, soft gold glow) — the same signal in the same
  // colours, so the two screens can't drift apart on what "recommended" looks like.
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

  tip: {
    position: 'absolute', width: 220, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.borderOpt, borderRadius: 14,
    paddingVertical: 9, paddingHorizontal: 12, gap: 1,
    shadowColor: '#2C3E2D', shadowOpacity: 0.16, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },

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
  previewCta: {
    marginTop: 18, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  previewClose: { marginTop: 4, paddingVertical: 11, alignItems: 'center' },
  pager: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  position: { textAlign: 'center', letterSpacing: 1, marginBottom: 6 },

  badgeRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  badgeCell: { flex: 1, alignItems: 'center', gap: 8 },

  tabBar: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderTopWidth: 1.5, borderTopColor: colors.border,
    paddingTop: 8, paddingBottom: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
});
