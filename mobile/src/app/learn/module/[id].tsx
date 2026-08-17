import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Txt, IconButton, ProgressBar, MIcon, ModuleLessonList, RealLifeSubQuestRow } from '@/components';
import { font, colors, moduleColorSolid } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById, mainLessonAbsoluteIndices, moduleMaxXp } from '@/content';
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
  // ModuleLessonList's onPressLesson gives back a position in the filtered `lessons` above,
  // not a real index into `content.quests` — translate it back. See mainLessonAbsoluteIndices.
  const mainIndices = mainLessonAbsoluteIndices(content);
  const done = moduleDone(mod.id);
  const total = moduleTotal(mod.id);
  const status = moduleStatus(mod.id);
  const pct = total ? done / total : 0;

  const goToLesson = (i: number) => router.push({ pathname: '/learn/quest', params: { moduleId: mod.id, lessonIndex: String(mainIndices[i] ?? i) } });
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

  // The hero's border and gradient are the module colour drawn as a bare shape, so they use
  // the solid variant: the palest two steps of the ramp are invisible against white.
  const heroTone = moduleColorSolid[mod.id] ?? mod.color;

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="chevron-left" size={36} onPress={goBack} />
        <Txt variant="h2" style={{ flex: 1, textAlign: 'center', fontSize: 17 }}>{mod.name}</Txt>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.white, heroTone]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.hero, { borderColor: heroTone }]}>
          {/* color/textColor swapped here previously (only color was set, to mod.textColor
              — the DARK tone) — every other MIcon call site passes color={m.color}
              (the pale chip) with textColor={m.textColor} on top of it. With no textColor
              prop, MIcon's own default (colors.white) kicked in, rendering this hero badge
              as a solid dark chip with white text, the exact "white-on-color" look the
              component's own doc comment says should never happen. */}
          <MIcon abbr={mod.icon} color={mod.color} textColor={mod.textColor} size={52} r={16} fontSize={20} />
          <View style={{ flex: 1 }}>
            <Txt variant="h2">{content?.desc ?? mod.name}</Txt>
            <View style={styles.heroMeta}>
              <Txt style={[styles.heroTiny, { color: mod.inkColor }]}>{done} of {total} lessons</Txt>
              {/* The module's real total, not `xpReward`. That field is the website's flat
                  per-lesson figure and mobile pays real per-chapter XP instead, so "25 XP
                  each" was wrong for essentially every lesson in the module (they range from
                  about 10 to 79). One honest number for the whole module beats a per-lesson
                  one that can't be right for all of them — see moduleMaxXp. */}
              <Txt style={[styles.heroTiny, { color: mod.inkColor }]}>up to {moduleMaxXp(content)} XP</Txt>
            </View>
            <ProgressBar value={pct} height={9} fillColors={[mod.color, mod.inkColor]} style={{ marginTop: 6 }} />
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, borderWidth: 1.5, padding: 18 },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  heroTiny: { fontFamily: font.bold, fontSize: 12 },
});
