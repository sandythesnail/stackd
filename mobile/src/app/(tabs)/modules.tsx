import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
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

  // Expanding a row near the bottom of an 11-module list used to drop its lesson list
  // entirely below the fold — you tapped something and appeared to get nothing back. The
  // row's own offset is captured on layout and the list scrolls its header to the top, so
  // the body that just opened is the thing you're looking at.
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef(0);
  const rowY = useRef<Record<string, number>>({});
  // Stable callback so the rows' onLayout closures never touch rowY.current inside the map
  // itself — reading a ref from anywhere in the render pass is what react-hooks/refs objects
  // to, and it's right to: a value read there isn't guaranteed to be the current one.
  const captureRowY = useCallback((id: string, y: number) => { rowY.current[id] = y; }, []);
  const toggle = (id: string) => {
    const opening = !expanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // One frame later, so the body has been laid out and the scroller knows its new height.
    if (opening) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: Math.max(listY.current + (rowY.current[id] ?? 0) - 12, 0), animated: true });
      });
    }
  };

  // Captured once at mount, before the effect below marks the cascade as played.
  const [animateRows] = useState(() => !listAnim.played);
  useEffect(() => { listAnim.played = true; }, []);

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>All modules</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>{doneCount} / {modules.length} done</Txt>
        </View>

        <View style={{ gap: 12 }} onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
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
                onLayout={(e) => captureRowY(m.id, e.nativeEvent.layout.y)}
                style={[styles.row, status === 'done' && styles.rowDone, recommended && styles.rowRecommended]}
              >
                <Pressable onPress={() => toggle(m.id)} style={[styles.rowHead, recommended && styles.rowHeadRecommended]} accessibilityRole="button" accessibilityLabel={m.name} accessibilityState={{ expanded: isOpen }}>
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
                    {status === 'done' ? (
                      <Tag tone="green" style={styles.tag}>✓ Complete</Tag>
                    ) : recommended ? (
                      <Tag tone="gold" style={styles.tag}>★ Start here</Tag>
                    ) : done > 0 ? (
                      <Tag tone="pink" style={styles.tag}>{Math.round(pct * 100)}%</Tag>
                    ) : (
                      <Txt style={styles.lessonCount}>{total} lessons</Txt>
                    )}
                    {/* A real icon, rotated, rather than the ▾/▸ glyph pair this used to
                        draw: those are two different characters at two different widths, so
                        the control changed size as you opened and closed it. */}
                    <Feather
                      name="chevron-down"
                      size={18}
                      color={colors.muted4}
                      style={{ transform: [{ rotate: isOpen ? '0deg' : '-90deg' }] }}
                    />
                  </View>
                </Pressable>
                {isOpen ? (
                  <View style={styles.rowBody}>
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
                  </View>
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
  rowHeadRecommended: { backgroundColor: colors.rewardBg },
  rowHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.extra, fontSize: 14.5, color: colors.ink },
  rowDesc: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted4, marginTop: 2 },
  tag: { paddingVertical: 4, paddingHorizontal: 9 },
  lessonCount: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted4 },
  rowBody: { paddingHorizontal: 12, paddingBottom: 13, paddingTop: 2 },
});
