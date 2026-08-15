import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Easing } from 'react-native';
import Reanimated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Tag, ProgressBar, MIcon, ModuleLessonList, RealLifeSubQuestRow } from '@/components';
import { colors, font, radius } from '@/theme';
import { modules } from '@/data';
import { moduleContentById, mainLessonAbsoluteIndices } from '@/content';
import { useStore } from '@/store';
import { SURVEY_TRACKS } from '@/survey';

/** Screen 9 — Modules (all 11). Each row expands in place to show its lesson list instead
 * of navigating to a separate detail screen — matches the website's own module-row
 * expand/collapse behavior (renderModuleList in app.js) rather than mobile's earlier
 * tap-through-to-a-new-screen flow. Done/total/status derived live from the store + real
 * lesson content, not static mock fields. */
/** Module-scope, deliberately not state: the row cascade below should play the first time
 * the tab is opened in a session and never again. Modules is a TAB — it gets mounted dozens
 * of times in a sitting, and replaying a 500ms staggered entrance on every visit turns a
 * piece of polish into something you wait through. A property on a const object rather than
 * a reassigned `let`, and flipped in an effect rather than during render, so it stays out of
 * the render pass entirely. */
const listAnim = { played: false };

/** The row's disclosure chevron, turning between its two positions instead of cutting. A
 * rotation on the UI thread — the one piece of motion in this screen that is guaranteed not
 * to interact with the list's layout, which is why it's the piece that survived. */
function Chevron({ open }: { open: boolean }) {
  const t = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    t.value = withTiming(open ? 1 : 0, { duration: 160, easing: Easing.out(Easing.quad) });
  }, [open, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-90 + t.value * 90}deg` }] }));
  return (
    <Reanimated.View style={style}>
      <Feather name="chevron-down" size={18} color={colors.muted4} />
    </Reanimated.View>
  );
}

export default function Modules() {
  const router = useRouter();
  const { state, level, tierName, moduleDone, moduleDoneIndices, moduleTotal, moduleStatus } = useStore();
  const doneCount = modules.filter((m) => moduleStatus(m.id) === 'done').length;
  const activeTrack = SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId);
  // ONE recommendation, not the whole track. Every track carries 3 module ids (see
  // @/survey), and highlighting all three at once put the heaviest treatment on the screen —
  // 2px gold border, gold fill, a star tag — on a third of the list, which recommends
  // nothing. The first unfinished module in the track's own order is the one to point at.
  const recommendedId = (activeTrack?.moduleIds ?? []).find((id) => moduleStatus(id) === 'active') ?? null;

  // The module the player is actually working through starts expanded so returning users
  // land on their next lesson; everything else starts collapsed for a clean overview.
  //
  // This asks the store for the module whose lesson was finished most recently. It used to
  // take the first module whose status was 'active' — but nothing in this app is gated, so
  // EVERY unfinished module is 'active' and that always resolved to whichever unfinished
  // module happened to come first in the list, no matter what the player had been doing.
  // Falls back to a partly-finished module, then to the recommended one, for players who
  // have finished nothing yet (a brand-new account opens fully collapsed).
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const last = state.lastModuleId && moduleStatus(state.lastModuleId) === 'active' ? state.lastModuleId : null;
    const started = modules.find((m) => moduleStatus(m.id) === 'active' && moduleDone(m.id) > 0);
    const open = last ?? started?.id ?? recommendedId;
    return new Set(open ? [open] : []);
  });

  // Opening a row does not scroll the list. An auto-scroll that put the tapped row's header
  // at the top was tried and removed: it fires a frame after the tap, so the list jumps
  // under your finger just as the body appears, and the two movements read as one glitch.
  // A row you open near the bottom may open partly below the fold — that's a scroll the
  // reader is already making, and it beats the screen moving on its own.
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  // Captured once at mount, before the effect below marks the cascade as played.
  const [animateRows] = useState(() => !listAnim.played);
  useEffect(() => { listAnim.played = true; }, []);

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>All modules</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>{doneCount} / {modules.length} done</Txt>
        </View>

        {/* Only once every module is finished. It sits at the TOP of the list rather than
            after eleven rows, because by the time it exists the list behind it is entirely
            ticked off and this is the only thing left to do on the screen. */}
        {doneCount === modules.length ? (
          <Pressable
            onPress={() => router.push('/learn/post-test')}
            style={styles.finalCard}
            accessibilityRole="button"
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Txt style={styles.finalEyebrow}>
                {state.postTest ? 'FINAL ASSESSMENT' : 'ALL ELEVEN COMPLETE'}
              </Txt>
              <Txt style={styles.finalTitle}>
                {state.postTest
                  ? `You scored ${state.postTest.score} / ${state.postTest.total}`
                  : 'Take the final assessment'}
              </Txt>
              <Txt style={styles.finalSub}>
                {state.postTest
                  ? 'Take it again, or send more feedback.'
                  : 'Two questions from every module, and a chance to tell us how it went.'}
              </Txt>
            </View>
            <Feather name="chevron-right" size={20} color={colors.white} />
          </Pressable>
        ) : null}

        <View style={{ gap: 12 }}>
          {modules.map((m, rowIdx) => {
            const content = moduleContentById(m.id);
            // The real-life step-by-step guide lesson is surfaced separately, right below
            // the main list, via RealLifeSubQuestRow — same split the website makes between
            // a module's main quests and its real-life sub-quest.
            const lessons = content?.lessons.filter((l) => !l.isLifeTask) ?? [];
            const guideIndex = content?.lessons.findIndex((l) => l.isLifeTask) ?? -1;
            // ModuleLessonList's onPressLesson gives back a position in the filtered
            // `lessons` above, not a real index into `content.quests` — translate it back.
            // See mainLessonAbsoluteIndices.
            const mainIndices = mainLessonAbsoluteIndices(content);
            const done = moduleDone(m.id);
            const total = moduleTotal(m.id);
            const pct = total ? done / total : 0;
            const status = moduleStatus(m.id);
            const recommended = m.id === recommendedId;
            const isOpen = expanded.has(m.id);
            return (
              // Rows cascade in on a short stagger rather than the whole list appearing at
              // once. Capped at 10 steps so the bottom of an 11-module list isn't still
              // arriving half a second after the top — past that they land together. Only on
              // the session's first visit to the tab; see listHasAnimated.
              <Reanimated.View
                key={m.id}
                entering={animateRows ? FadeInDown.delay(Math.min(rowIdx, 10) * 45).duration(320).springify().damping(18) : undefined}
                // Deliberately NO `layout` transition. A LinearTransition here animates the
                // frame of all ELEVEN rows every time one of them opens — inside a
                // ScrollView, which is where Reanimated's layout animations are least
                // reliable — and no duration made that look right. The card resizes
                // instantly now; the only things that animate are the body's opacity and the
                // chevron, both of which are pure UI-thread properties that cannot fight the
                // list's layout.
                style={[styles.row, status === 'done' && styles.rowDone, recommended && styles.rowRecommended]}
              >
                <Pressable
                  onPress={() => toggle(m.id)}
                  // A touch of press feedback so the header reads as a control before it
                  // does anything — the same treatment the lesson rows inside it already get
                  // from ListRow, just done with the pressed flag since there's no spring to
                  // match here.
                  style={({ pressed }) => [styles.rowHead, recommended && styles.rowHeadRecommended, pressed && styles.rowHeadPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={m.name}
                  accessibilityState={{ expanded: isOpen }}
                >
                  <View style={styles.rowHeadLeft}>
                    <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} />
                    <View style={{ flex: 1 }}>
                      <Txt style={styles.rowTitle}>{m.name}</Txt>
                      {/* Two lines once the row is open, where there's room for the whole
                          sentence — collapsed rows still get one, to keep the list scannable. */}
                      <Txt style={styles.rowDesc} numberOfLines={isOpen ? 2 : 1}>{content?.desc ?? `${total} real quests`}</Txt>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* A percentage is only shown once there IS one. Every module starts at
                        zero and nothing is gated, so the old unconditional pink tag meant a
                        new player opened this tab to eleven pink "0%" chips — the app's
                        attention colour, on everything, reporting nothing. Untouched modules
                        state their size instead, in a quiet neutral chip. */}
                    {/* Progress outranks the recommendation. "★ Start here" on a module you
                        are 40% through is stale advice, and it was also hiding the one number
                        worth showing: `recommended` came first, so a recommended module never
                        displayed its percentage at all. */}
                    {status === 'done' ? (
                      <Tag tone="green" style={styles.tag}>✓ Complete</Tag>
                    ) : done > 0 ? (
                      <Tag tone="pink" style={styles.tag}>{Math.round(pct * 100)}%</Tag>
                    ) : recommended ? (
                      <Tag tone="gold" style={styles.tag}>★ Start here</Tag>
                    ) : (
                      <Txt style={styles.lessonCount}>{total} lessons</Txt>
                    )}
                    {/* A real icon, rotated, rather than the ▾/▸ glyph pair this used to
                        draw: those are two different characters at two different widths, so
                        the control changed size as you opened and closed it. */}
                    <Chevron open={isOpen} />
                  </View>
                </Pressable>
                {isOpen ? (
                  // A short fade on the way in, and nothing at all on the way out. No
                  // travel: a FadeInDown slid the body inside a card that clips its overflow,
                  // so the list appeared from under a moving edge. No `exiting` either — an
                  // exit animation keeps this mounted while the card is already collapsing
                  // around it, which is the half of this that looked worst. Closing is now
                  // simply instant, which is what closing should be.
                  <Reanimated.View entering={FadeIn.duration(140)} style={styles.rowBody}>
                    <ProgressBar value={pct} tone={status === 'done' ? 'green' : 'pink'} height={7} style={{ marginBottom: 12 }} />
                    <ModuleLessonList
                      moduleId={m.id}
                      lessons={lessons}
                      doneIndices={moduleDoneIndices(m.id)}
                      status={status}
                      onPressLesson={(i) => router.push({ pathname: '/learn/quest', params: { moduleId: m.id, lessonIndex: String(mainIndices[i] ?? i) } })}
                    />
                    {guideIndex >= 0 ? (
                      <RealLifeSubQuestRow
                        moduleId={m.id}
                        onPress={() => router.push({ pathname: '/learn/quest', params: { moduleId: m.id, lessonIndex: String(guideIndex), isLifeTask: '1' } })}
                      />
                    ) : null}
                  </Reanimated.View>
                ) : null}
              </Reanimated.View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 22, gap: 11 },
  finalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.greenBrand, borderRadius: 20,
    paddingVertical: 16, paddingHorizontal: 18, marginBottom: 14,
  },
  finalEyebrow: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.9, color: 'rgba(255,255,255,0.82)' },
  finalTitle: { fontFamily: font.display, fontSize: 18, color: colors.white },
  finalSub: { fontFamily: font.semi, fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.9)' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  rowDone: { borderColor: colors.greenSoft },
  rowRecommended: { borderWidth: 2, borderColor: colors.reward },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
  },
  // Deliberately empty of a fill. This was `backgroundColor: colors.rewardBg`, a pale yellow
  // wash across the whole header — which put a third band of colour (module chip, yellow head,
  // pink progress bar) into one small row, and read as a highlight sitting ON the progress bar
  // rather than behind the title. The row already says "recommended" twice without it: a gold
  // border around the card (rowRecommended) and the ★ Start here tag.
  rowHeadRecommended: {},
  rowHeadPressed: { backgroundColor: colors.screen },
  rowHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.extra, fontSize: 14.5, color: colors.ink },
  rowDesc: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted4, marginTop: 2 },
  tag: { paddingVertical: 4, paddingHorizontal: 9 },
  lessonCount: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted4 },
  rowBody: { paddingHorizontal: 12, paddingBottom: 13, paddingTop: 2 },
});
