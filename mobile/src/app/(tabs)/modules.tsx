import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Tag, ProgressBar, MIcon, ModuleLessonList } from '@/components';
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
  const { state, level, tierName, moduleDone, moduleTotal, moduleStatus } = useStore();
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
            const lessons = content?.lessons ?? [];
            const done = moduleDone(m.id);
            const total = moduleTotal(m.id);
            const pct = total ? done / total : 0;
            const status = moduleStatus(m.id);
            const recommended = status === 'active' && trackModuleIds.includes(m.id);
            const isOpen = expanded.has(m.id);
            return (
              <View key={m.id} style={[styles.row, status === 'done' && styles.rowDone, recommended && styles.rowRecommended]}>
                <Pressable onPress={() => toggle(m.id)} style={[styles.rowHead, recommended && styles.rowHeadRecommended]}>
                  <View style={styles.rowHeadLeft}>
                    <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} />
                    <View style={{ flex: 1 }}>
                      <Txt style={styles.rowTitle}>{m.name}</Txt>
                      <Txt style={styles.rowDesc} numberOfLines={1}>{content?.desc ?? `${total} real quests`}</Txt>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {status === 'done' ? (
                      <Tag tone="green" style={styles.tag}>✓ Complete</Tag>
                    ) : recommended ? (
                      <Tag tone="gold" style={styles.tag}>★ Recommended</Tag>
                    ) : (
                      <Tag tone="pink" style={styles.tag}>{Math.round(pct * 100)}%</Tag>
                    )}
                    <Txt style={styles.chevron}>{isOpen ? '▾' : '▸'}</Txt>
                  </View>
                </Pressable>
                {isOpen ? (
                  <View style={styles.rowBody}>
                    <ProgressBar value={pct} tone={status === 'done' ? 'green' : 'pink'} height={7} style={{ marginBottom: 12 }} />
                    <ModuleLessonList
                      moduleId={m.id}
                      lessons={lessons}
                      done={done}
                      status={status}
                      onPressLesson={(i) => router.push({ pathname: '/learn/hook', params: { moduleId: m.id, lessonIndex: String(i) } })}
                    />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 15,
  },
  rowHeadRecommended: { backgroundColor: colors.rewardBg },
  rowHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.extra, fontSize: 14.5, color: colors.ink },
  rowDesc: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted4, marginTop: 2 },
  tag: { paddingVertical: 4, paddingHorizontal: 9 },
  chevron: { fontFamily: font.bold, fontSize: 15, color: colors.muted4 },
  rowBody: { paddingHorizontal: 15, paddingBottom: 16, paddingTop: 2 },
});
