import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Txt, IconButton, ProgressBar, ListRow, MIcon, Button } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';

const QNODE: Record<string, { bg: string }> = {
  done: { bg: colors.green },
  active: { bg: colors.pink },
  locked: { bg: colors.lockIcon },
};

/** Screen 15 — Module detail (real lessons, locked/done from the store's real progress). */
export default function ModuleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { moduleDone, moduleStatus } = useStore();
  const mod = moduleById(id ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const lessons = content?.lessons ?? [];
  const done = moduleDone(mod.id);
  const status = moduleStatus(mod.id, mod.unlockLevel);
  const pct = lessons.length ? done / lessons.length : 0;

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="chevron-left" size={36} onPress={() => router.back()} />
        <Txt variant="h2" style={{ flex: 1, textAlign: 'center', fontSize: 17 }}>{mod.name}</Txt>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#EAF4F6', '#DCEEF1']} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
          <MIcon abbr={mod.abbr} color="#4FA3B8" size={52} r={16} fontSize={20} />
          <View style={{ flex: 1 }}>
            <Txt variant="h2">{content?.desc ?? mod.name}</Txt>
            <View style={styles.heroMeta}>
              <Txt style={styles.heroTiny}>{done} of {lessons.length} lessons</Txt>
              <Txt style={styles.heroTiny}>{content?.xpReward ?? 0} XP each</Txt>
            </View>
            <ProgressBar value={pct} height={9} fillColors={['#68B7C9', '#4FA3B8']} style={{ marginTop: 6 }} />
          </View>
        </LinearGradient>

        <View style={{ gap: 10 }}>
          {lessons.map((lesson, i) => {
            const rowStatus = status === 'locked' ? 'locked' : status === 'done' ? 'done' : i < done ? 'done' : i === done ? 'active' : 'locked';
            const node = QNODE[rowStatus];
            const isActive = rowStatus === 'active';
            const locked = rowStatus === 'locked';
            const goToLesson = () => router.push({ pathname: '/learn/hook', params: { moduleId: mod.id, lessonIndex: String(i) } });
            return (
              <ListRow
                key={lesson.title}
                locked={locked}
                onPress={() => !locked && goToLesson()}
                style={isActive ? [{ borderWidth: 2, borderColor: colors.green, backgroundColor: '#F1F6EF' }] : undefined}
              >
                <View style={[styles.qnode, { backgroundColor: node.bg }]}>
                  <Txt style={styles.qnodeTxt}>{rowStatus === 'done' ? '✓' : rowStatus === 'locked' ? '🔒' : String(i + 1)}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={[styles.qTitle, locked && { color: colors.lockText }]}>{lesson.title}</Txt>
                  {isActive ? <Txt style={[styles.qNote, { color: colors.green }]}>In progress</Txt> : null}
                </View>
                {isActive ? (
                  <Button label="Resume" variant="pink" size="sm" style={{ paddingHorizontal: 16 }} onPress={goToLesson} />
                ) : null}
              </ListRow>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
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
  qnode: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qnodeTxt: { fontFamily: font.display, fontSize: 15, color: colors.white },
  qTitle: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  qNote: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 1 },
});
