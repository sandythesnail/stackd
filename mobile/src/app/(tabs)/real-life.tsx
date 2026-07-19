import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Tag, MIcon, ListRow } from '@/components';
import { colors, font } from '@/theme';
import { modules } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';

/** Screen — Real Life. The website's practical "step-by-step guide" quest that closes out
 * every module (setting up direct deposit, opening a brokerage account, filing taxes for
 * free, ...) lives here instead of mixed into the module's 8 real lessons — one per module,
 * always its 9th/last quest (see LessonSummary.isLifeTask, store.tsx's completeLifeTask).
 * Completing one doesn't count toward module progress/mastery; it's tracked separately. */
export default function RealLife() {
  const router = useRouter();
  const { state, level, tierName } = useStore();
  const doneCount = state.completedLifeTaskIds.length;

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Txt variant="disp" style={{ fontSize: 23 }}>Real Life</Txt>
          <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.green }}>{doneCount} / {modules.length} done</Txt>
        </View>
        <Txt variant="lead" style={{ fontSize: 13 }}>
          The actual account-opening, paperwork, and setup tasks each module covers — real steps, not just theory.
        </Txt>

        <View style={{ gap: 10, marginTop: 4 }}>
          {modules.map((m) => {
            const content = moduleContentById(m.id);
            const guideIndex = content?.lessons.findIndex((l) => l.isLifeTask) ?? -1;
            const guide = guideIndex >= 0 ? content!.lessons[guideIndex] : null;
            if (!guide) return null;
            const done = state.completedLifeTaskIds.includes(m.id);
            return (
              <ListRow
                key={m.id}
                onPress={() => router.push({ pathname: '/learn/hook', params: { moduleId: m.id, lessonIndex: String(guideIndex), isLifeTask: '1' } })}
              >
                <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} size={40} r={13} fontSize={15} />
                <View style={{ flex: 1 }}>
                  <Txt style={styles.title}>{guide.title}</Txt>
                  <Txt style={styles.sub}>{m.name}</Txt>
                </View>
                {done ? <Tag tone="green" style={styles.tag}>✓</Tag> : null}
              </ListRow>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },
  sub: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted5, marginTop: 2 },
  tag: { paddingVertical: 4, paddingHorizontal: 9 },
});
