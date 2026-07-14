import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Hammy, Flame, Coin, Diamond } from '@/components';
import { colors, font } from '@/theme';

/** Screen 19 — Results (rewards & streak). */
export default function Results() {
  const router = useRouter();
  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hammy size={150} ring style={{ marginTop: 6 }} />
          <Tag textColor={colors.greenDark} style={styles.tag}>🎉 QUEST COMPLETE</Tag>
          <Txt style={styles.title}>Emergency Fund —{'\n'}nailed it!</Txt>

          <View style={styles.rewards}>
            <Reward value="+120" label="XP" />
            <Reward value={<Coin size={22} />} label="Coins" big="40" />
            <Reward value={<Diamond size={19} />} label="Diamond" big="1" />
          </View>

          <View style={styles.streakCard}>
            <Flame size={22} />
            <Txt style={styles.streakTxt}>13-day streak!</Txt>
            <Tag textColor={colors.tagWarmText} style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>+1</Tag>
          </View>

          <View style={styles.levelWrap}>
            <View style={styles.levelRow}>
              <Txt style={styles.levelTiny}>LEVEL 4</Txt>
              <Txt style={styles.levelTiny}>80% to Level 5</Txt>
            </View>
            <View style={styles.levelTrack}>
              <View style={styles.levelFill} />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Continue" variant="pink" onPress={() => router.push('/modal/levelup')} />
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
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 24,
    padding: 16,
  },
  streakTxt: { fontFamily: font.display, fontSize: 19, color: colors.white },
  levelWrap: { width: '100%', marginTop: 14 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelTiny: { fontFamily: font.extra, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  levelTrack: { height: 11, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  levelFill: { height: '100%', width: '80%', borderRadius: 8, backgroundColor: colors.pinkBright },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8 },
});
