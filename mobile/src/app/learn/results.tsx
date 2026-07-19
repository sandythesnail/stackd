import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Hammy, Coin } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore, xpProgressPct } from '@/store';

/** Screen 19 — Results (rewards & streak). Reflects the lesson just finished — actually
 * records XP/coins/module progress into the store (not just decorative numbers). */
export default function Results() {
  const router = useRouter();
  const {
    moduleId, lessonIndex, correctCount, total, xpEarned, questId, hintsUsed, bossWon, newTerms,
  } = useLocalSearchParams<{
    moduleId: string; lessonIndex: string; correctCount: string; total: string; xpEarned?: string;
    questId?: string; hintsUsed?: string; bossWon?: string; newTerms?: string;
  }>();
  const mod = moduleById(moduleId ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const li = Number(lessonIndex ?? 0);
  const lesson = content?.lessons[li];
  const correct = Number(correctCount ?? 0);
  const totalQ = Number(total ?? 0);
  const allCorrect = totalQ > 0 && correct === totalQ;
  // The quest player (learn/quest.tsx) accumulates real XP across its chapters; the flat
  // quiz path falls back to the module's flat per-lesson reward.
  const xpForLesson = xpEarned !== undefined ? Number(xpEarned) : (content?.xpReward ?? 0);

  const { state, level, tierName, completeLesson, equippedMascotItems } = useStore();
  const tierBefore = useRef(tierName).current;
  const recorded = useRef(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    const earned = completeLesson(mod.id, li, xpForLesson, {
      correctCount: correct,
      gradedTotal: totalQ,
      questId,
      bossWon: bossWon === '1',
      hintsUsed: hintsUsed !== undefined ? Number(hintsUsed) : undefined,
      newTerms: newTerms ? newTerms.split('|').filter(Boolean) : undefined,
    });
    setCoinsEarned(earned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = xpProgressPct(state.xp, level);
  // The big level-up overlay is reserved for an actual TIER change (mirrors the website's
  // maybeShowPostCompletionOverlays) — a numeric level-up alone doesn't get a full screen.
  // A life event (if one triggered) is deferred until after that overlay, same as the website.
  const tieredUp = tierName !== tierBefore;
  // Previously called router.dismissAll() before this replace() — dismissAll is an
  // imperative native-stack API that Expo Router's web output (history-based navigation,
  // no real dismissable stack) can't service, which is what produced the "unmatched route"
  // error on the web build after finishing a lesson/module. replace() alone is enough to
  // land on Home on every platform.
  const continuePress = () => {
    if (tieredUp) { router.push('/modal/levelup'); return; }
    if (state.pendingLifeEventId) { router.push('/modal/life-event'); return; }
    router.replace('/(tabs)/home');
  };

  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hammy size={150} equipped={equippedMascotItems()} style={{ marginTop: 6 }} />
          <Tag textColor={colors.greenDark} style={styles.tag}>🎉 LESSON COMPLETE</Tag>
          <Txt style={styles.title}>{lesson?.title ?? mod.name} —{'\n'}{allCorrect ? 'nailed it!' : 'done!'}</Txt>
          {totalQ > 0 ? <Txt style={styles.scoreLine}>{correct}/{totalQ} correct</Txt> : null}

          <View style={styles.rewards}>
            <Reward value={`+${xpForLesson}`} label="XP" />
            <Reward value={<Coin size={22} />} label="Coins" big={`+${coinsEarned}`} />
          </View>

          <View style={styles.levelWrap}>
            <View style={styles.levelRow}>
              <Txt style={styles.levelTiny}>LEVEL {level}</Txt>
              <Txt style={styles.levelTiny}>{Math.round(pct)}% to Level {level + 1}</Txt>
            </View>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: `${pct}%` }]} />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Continue" variant="pink" onPress={continuePress} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Reward({ value, label, big }: { value: React.ReactNode; label: string; big?: string }) {
  return (
    <View style={styles.reward}>
      {typeof value === 'string' ? (
        <Txt style={styles.rewardB}>{value}</Txt>
      ) : (
        <View style={styles.rewardIconRow}>
          {value}
          {big ? <Txt style={styles.rewardB}>{big}</Txt> : null}
        </View>
      )}
      <Txt style={styles.rewardEm}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12 },
  tag: { backgroundColor: 'rgba(255,255,255,0.9)', marginTop: 16 },
  title: { fontFamily: font.display, fontSize: 32, color: colors.white, textAlign: 'center', marginTop: 10, lineHeight: 35 },
  scoreLine: { fontFamily: font.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  rewards: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 22 },
  reward: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 8,
  },
  rewardIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardB: { fontFamily: font.display, fontSize: 22, color: colors.white },
  rewardEm: { fontFamily: font.extra, fontSize: 10, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5 },
  levelWrap: { width: '100%', marginTop: 14 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelTiny: { fontFamily: font.extra, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  levelTrack: { height: 11, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 8, backgroundColor: colors.pinkBright },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8 },
});
