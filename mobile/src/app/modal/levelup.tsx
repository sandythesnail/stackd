import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Hammy, Coin } from '@/components';
import { colors, font } from '@/theme';

const SPOTS = [
  { size: 12, bg: '#FF96B8', top: 120, left: 50 },
  { size: 9, bg: colors.coinLight, top: 160, right: 60 },
  { size: 8, bg: colors.diamondLight, top: 220, left: 80 },
  { size: 10, bg: colors.coinLight, top: 200, right: 100 },
  { size: 7, bg: '#FF96B8', top: 280, right: 56 },
];

/** Screen 20 — Level-up celebration overlay. */
export default function LevelUp() {
  const router = useRouter();
  const done = () => {
    router.dismissAll();
    router.replace('/(tabs)/home');
  };
  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      {SPOTS.map((s, i) => (
        <View
          key={i}
          style={{ position: 'absolute', width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: s.bg, top: s.top, left: s.left, right: s.right }}
        />
      ))}
      <SafeAreaView style={styles.wrap}>
        <View style={styles.center}>
          <Tag tone="pink" textColor={colors.white} style={{ backgroundColor: '#FF96B8' }}>⬆ LEVEL UP</Tag>
          <Hammy size={184} ring bob style={styles.hammy} />
          <Txt style={styles.big}>Level 5!</Txt>
          <Txt style={styles.body}>Hammy grew up — and so did you. You&apos;re now a</Txt>

          <View style={styles.tierChip}>
            <LinearGradient colors={[colors.pinkBorder, colors.pink]} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 1 }} style={styles.tierIc}>
              <Txt style={styles.tierIcTxt}>5</Txt>
            </LinearGradient>
            <Txt style={styles.tierName}>Budget Builder</Txt>
          </View>

          <View style={styles.rewards}>
            <Reward icon={<Coin size={22} />} big="50" label="Bonus coins" />
            <Reward emoji="🎓" label="Grad cap unlocked" />
          </View>
        </View>
        <Button label="Continue" variant="pink" onPress={done} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function Reward({ icon, emoji, big, label }: { icon?: React.ReactNode; emoji?: string; big?: string; label: string }) {
  return (
    <View style={styles.reward}>
      <View style={styles.rewardTop}>
        {emoji ? <Txt style={{ fontSize: 22 }}>{emoji}</Txt> : icon}
        {big ? <Txt style={styles.rewardB}>{big}</Txt> : null}
      </View>
      <Txt style={styles.rewardEm}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 22, paddingBottom: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hammy: {
    marginVertical: 18,
    shadowColor: '#FF96B8',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  big: { fontFamily: font.display, fontSize: 44, color: colors.white },
  body: { fontFamily: font.semi, fontSize: 15, color: 'rgba(250,246,237,0.92)', marginTop: 6, textAlign: 'center' },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 22,
    paddingVertical: 8,
    paddingRight: 16,
    paddingLeft: 8,
  },
  tierIc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tierIcTxt: { fontFamily: font.display, fontSize: 15, color: colors.white },
  tierName: { fontFamily: font.display, fontSize: 19, color: colors.white },
  rewards: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 },
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
  rewardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 26 },
  rewardB: { fontFamily: font.display, fontSize: 22, color: colors.white },
  rewardEm: { fontFamily: font.extra, fontSize: 10, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
});
