import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Txt, IconButton, ProgressBar, ListRow, MIcon, Button } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById, type LessonSummary } from '@/content';
import { useStore } from '@/store';
import { resolveLessonSections } from '@/lessonSections';

const QNODE: Record<string, { bg: string }> = {
  done: { bg: colors.green },
  active: { bg: colors.pink },
  upcoming: { bg: colors.greenSoft },
};

/** Screen 15 — Module detail (real lessons, done/upcoming from the store's real progress).
 * Every lesson is tappable regardless of order — no sequential gating, matching the
 * website's no-locking behavior. Lessons are grouped into pink-labeled sections (see
 * @/lessonSections), matching the website's collapsible lesson-section headers. */
export default function ModuleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { moduleDone, moduleStatus } = useStore();
  const mod = moduleById(id ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const lessons = content?.lessons ?? [];
  const done = moduleDone(mod.id);
  const status = moduleStatus(mod.id);
  const pct = lessons.length ? done / lessons.length : 0;

  const goToLesson = (i: number) => router.push({ pathname: '/learn/hook', params: { moduleId: mod.id, lessonIndex: String(i) } });
  const rowStatusFor = (i: number) => (status === 'done' || i < done ? 'done' : i === done ? 'active' : 'upcoming');

  // router.back() no-ops with no in-app history (e.g. a direct/reloaded web URL) — fall
  // back to the modules list so the back chevron always goes somewhere.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/modules');
  };

  const sections = resolveLessonSections(mod.id, lessons.length);

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="chevron-left" size={36} onPress={goBack} />
        <Txt variant="h2" style={{ flex: 1, textAlign: 'center', fontSize: 17 }}>{mod.name}</Txt>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#EAF4F6', '#DCEEF1']} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
          <MIcon abbr={mod.icon} color="#4FA3B8" size={52} r={16} fontSize={20} />
          <View style={{ flex: 1 }}>
            <Txt variant="h2">{content?.desc ?? mod.name}</Txt>
            <View style={styles.heroMeta}>
              <Txt style={styles.heroTiny}>{done} of {lessons.length} lessons</Txt>
              <Txt style={styles.heroTiny}>{content?.xpReward ?? 0} XP each</Txt>
            </View>
            <ProgressBar value={pct} height={9} fillColors={['#68B7C9', '#4FA3B8']} style={{ marginTop: 6 }} />
          </View>
        </LinearGradient>

        {sections ? (
          <View style={{ gap: 6 }}>
            {sections.map((sec) => (
              <LessonSectionBlock
                key={sec.label}
                label={sec.label}
                lessons={lessons.slice(sec.start, sec.end)}
                startIndex={sec.start}
                done={Math.max(0, Math.min(done - sec.start, sec.end - sec.start))}
                defaultOpen={done >= sec.start && done < sec.end}
                rowStatusFor={rowStatusFor}
                onPressLesson={goToLesson}
              />
            ))}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {lessons.map((lesson, i) => (
              <LessonRow key={lesson.title} lesson={lesson} index={i} status={rowStatusFor(i)} onPress={() => goToLesson(i)} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/** Pink-labeled, collapsible section header + its lesson rows — mirrors the website's
 * `.lesson-section-header` (`.lsh-label`/`.lsh-meta`, both `color: var(--pink-dark)`,
 * uppercase, 800-weight). The section containing the next not-done lesson starts open. */
function LessonSectionBlock({
  label,
  lessons,
  startIndex,
  done,
  defaultOpen,
  rowStatusFor,
  onPressLesson,
}: {
  label: string;
  lessons: LessonSummary[];
  startIndex: number;
  done: number;
  defaultOpen: boolean;
  rowStatusFor: (i: number) => string;
  onPressLesson: (i: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.sectionHead}>
        <Txt style={styles.sectionLabel}>{label}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt style={styles.sectionMeta}>{done}/{lessons.length} done</Txt>
          <Txt style={styles.sectionChevron}>{open ? '▾' : '▸'}</Txt>
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: 10, marginTop: 8, marginBottom: 4 }}>
          {lessons.map((lesson, i) => {
            const idx = startIndex + i;
            return (
              <LessonRow key={lesson.title} lesson={lesson} index={idx} status={rowStatusFor(idx)} onPress={() => onPressLesson(idx)} />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function LessonRow({
  lesson,
  index,
  status,
  onPress,
}: {
  lesson: LessonSummary;
  index: number;
  status: string;
  onPress: () => void;
}) {
  const node = QNODE[status];
  const isActive = status === 'active';
  return (
    <ListRow onPress={onPress} style={isActive ? [{ borderWidth: 2, borderColor: colors.green, backgroundColor: '#F1F6EF' }] : undefined}>
      <View style={[styles.qnode, { backgroundColor: node.bg }]}>
        <Txt style={styles.qnodeTxt}>{status === 'done' ? '✓' : String(index + 1)}</Txt>
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={styles.qTitle}>{lesson.title}</Txt>
        {isActive ? <Txt style={[styles.qNote, { color: colors.green }]}>In progress</Txt> : null}
      </View>
      {isActive ? (
        <Button label="Resume" variant="pink" size="sm" style={{ paddingHorizontal: 16 }} onPress={onPress} />
      ) : null}
    </ListRow>
  );
}

const styles = StyleSheet.create({
  stick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EFEFE7',
  },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, borderWidth: 1.5, borderColor: '#CBE5E9', padding: 18 },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  heroTiny: { fontFamily: font.bold, fontSize: 12, color: '#3E8697' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EFEFE7',
  },
  sectionLabel: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.pinkDark },
  sectionMeta: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.5, color: colors.pinkDark },
  sectionChevron: { fontFamily: font.bold, fontSize: 13, color: colors.pinkDark },
  qnode: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qnodeTxt: { fontFamily: font.display, fontSize: 15, color: colors.white },
  qTitle: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  qNote: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 1 },
});
