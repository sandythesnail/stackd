import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Txt, IconButton, ProgressBar, MIcon, ModuleLessonList, RealLifeSubQuestRow } from '@/components';
import { font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';

/** Screen 15 — Module detail (real lessons, done/upcoming from the store's real progress).
 * Every lesson is tappable regardless of order — no sequential gating, matching the
 * website's no-locking behavior. Mostly superseded by the Modules tab's inline-expand
 * accordion (matching the website's own module-row expand behavior), but kept as a direct
 * deep-link target (Home's mini-grid still routes here). */
export default function ModuleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { moduleDone, moduleDoneIndices, moduleTotal, moduleStatus } = useStore();
  const mod = moduleById(id ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  // The real-life step-by-step guide lesson is surfaced separately, right below the main
  // list, via RealLifeSubQuestRow — same split the website makes between a module's main
  // quests and its real-life sub-quest. It's still a required lesson for done/pct though
  // (moduleDone/moduleTotal both count it) — lessons.length below is deliberately only the
  // 8 main ones, just for ModuleLessonList's own rendering.
  const lessons = content?.lessons.filter((l) => !l.isLifeTask) ?? [];
  const guideIndex = content?.lessons.findIndex((l) => l.isLifeTask) ?? -1;
  const done = moduleDone(mod.id);
  const total = moduleTotal(mod.id);
  const status = moduleStatus(mod.id);
  const pct = total ? done / total : 0;

  const goToLesson = (i: number) => router.push({ pathname: '/learn/quest', params: { moduleId: mod.id, lessonIndex: String(i) } });
  const goToGuide = () => router.push({ pathname: '/learn/quest', params: { moduleId: mod.id, lessonIndex: String(guideIndex), isLifeTask: '1' } });

  // router.back() no-ops with no in-app history (e.g. a direct/reloaded web URL) — fall
  // back to the modules list so the back chevron always goes somewhere. push, not replace —
  // this screen lives in the "learn" nested navigator, and replace() doesn't reliably cross
  // into a different top-level branch like (tabs) (see results.tsx's continuePress for the
  // full story of the "route doesn't exist"/blank-screen crash this causes).
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/modules');
  };

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
              <Txt style={styles.heroTiny}>{done} of {total} lessons</Txt>
              <Txt style={styles.heroTiny}>{content?.xpReward ?? 0} XP each</Txt>
            </View>
            <ProgressBar value={pct} height={9} fillColors={['#68B7C9', '#4FA3B8']} style={{ marginTop: 6 }} />
          </View>
        </LinearGradient>

        <ModuleLessonList moduleId={mod.id} lessons={lessons} doneIndices={moduleDoneIndices(mod.id)} status={status} onPressLesson={goToLesson} />
        {guideIndex >= 0 ? <RealLifeSubQuestRow moduleId={mod.id} onPress={goToGuide} /> : null}
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
});
