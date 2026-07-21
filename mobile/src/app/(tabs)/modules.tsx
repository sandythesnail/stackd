import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Tag, ProgressBar, MIcon, ModuleLessonList, RealLifeSubQuestRow } from '@/components';
import { colors, font, radius } from '@/theme';
import { modules } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';
import { SURVEY_TRACKS } from '@/survey';

/** Screen 9 — Modules (all 11). Each row expands in place to show its lesson list instead
 * of navigating to a separate detail screen — matches the website's own module-row
 * expand/collapse behavior (renderModuleList in app.js) rather than mobile's earlier
 * tap-through-to-a-new-screen flow. Done/total/status derived live from the store + real
 * lesson content, not static mock fields. */
export default function Modules() {
  const router = useRouter();
  const { state, level, tierName, moduleDoneIndices, moduleStatus, moduleDisplayTotal, moduleDisplayDone } = useStore();
  const doneCount = modules.filter((m) => moduleStatus(m.id) === 'done').length;
  const activeTrack = SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId);
  const trackModuleIds = activeTrack?.moduleIds ?? [];

  // The module currently in progress starts expanded so returning users land straight on
  // their next lesson; everything else starts collapsed for a clean overview.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const active = modules.find((m) => moduleStatus(m.id) === 'active');
    return new Set(active ? [active.id] : []);
  });
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>All modules</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>{doneCount} / {modules.length} done</Txt>
        </View>

        <View style={{ gap: 12 }}>
          {modules.map((m) => {
            const content = moduleContentById(m.id);
            // The real-life step-by-step guide lesson is surfaced separately, right below
            // the main list, via RealLifeSubQuestRow — same split the website makes between
            // a module's main quests and its real-life sub-quest.
            const lessons = content?.lessons.filter((l) => !l.isLifeTask) ?? [];
            const guideIndex = content?.lessons.findIndex((l) => l.isLifeTask) ?? -1;
            // Display total/done cover all 9 real lessons (8 main quests + the real-life
            // sub-quest) — matches the website's actual lesson count for a module. Mastery
            // status (status/recommended below) still keys off the main-quests-only mastery
            // check (moduleStatus), which is unaffected by this.
            const displayTotal = moduleDisplayTotal(m.id);
            const displayDone = moduleDisplayDone(m.id);
            const pct = displayTotal ? displayDone / displayTotal : 0;
            const status = moduleStatus(m.id);
            const recommended = status === 'active' && trackModuleIds.includes(m.id);
            const isOpen = expanded.has(m.id);
            return (
              <View key={m.id} style={[styles.row, status === 'done' && styles.rowDone, recommended && styles.rowRecommended]}>
                <Pressable onPress={() => toggle(m.id)} style={[styles.rowHead, recommended && styles.rowHeadRecommended]}>
                  {/* Name gets its own full-width row (icon + chevron sharing it, name free
                      to wrap to 2 lines) instead of squeezing against the status tag — the
                      tag/mini-bar move to a second row below so long names like "Scams &
                      Fraud Prevention" always have room. */}
                  <View style={styles.rowHeadTop}>
                    <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} />
                    <Txt style={styles.rowTitle}>{m.name}</Txt>
                    <Txt style={styles.chevron}>{isOpen ? '▾' : '▸'}</Txt>
                  </View>
                  <Txt style={styles.rowDesc} numberOfLines={1}>{content?.desc ?? `${displayTotal} real quests`}</Txt>
                  <View style={styles.rowHeadBottom}>
                    {status === 'done' ? (
                      <Tag tone="green" style={styles.tag}>✓ Complete</Tag>
                    ) : recommended ? (
                      <Tag tone="gold" style={styles.tag}>★ Recommended</Tag>
                    ) : (
                      <Tag tone="pink" style={styles.tag}>{displayDone} out of {displayTotal}</Tag>
                    )}
                    {status !== 'done' ? (
                      <ProgressBar value={pct} tone="pink" height={6} style={{ flex: 1 }} />
                    ) : null}
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
                      onPressLesson={(i) => router.push({ pathname: '/learn/quest', params: { moduleId: m.id, lessonIndex: String(i) } })}
                    />
                    {guideIndex >= 0 ? (
                      <RealLifeSubQuestRow
                        moduleId={m.id}
                        onPress={() => router.push({ pathname: '/learn/quest', params: { moduleId: m.id, lessonIndex: String(guideIndex), isLifeTask: '1' } })}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 14 },
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
    padding: 15,
  },
  rowHeadRecommended: { backgroundColor: colors.rewardBg },
  rowHeadTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // flex:1 + minWidth:0 lets the name actually shrink/wrap within the row instead of
  // pushing the chevron out — a flex child's default min-width is its own content width,
  // which is exactly what let long names like "Scams & Fraud Prevention" refuse to wrap.
  rowTitle: { fontFamily: font.extra, fontSize: 14.5, color: colors.ink, flex: 1, minWidth: 0 },
  rowDesc: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted4, marginTop: 4, marginLeft: 54 },
  rowHeadBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginLeft: 54 },
  tag: { paddingVertical: 4, paddingHorizontal: 9 },
  chevron: { fontFamily: font.bold, fontSize: 15, color: colors.muted4 },
  rowBody: { paddingHorizontal: 15, paddingBottom: 16, paddingTop: 2 },
});
