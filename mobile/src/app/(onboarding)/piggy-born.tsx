import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Hammy, Spacer } from '@/components';
import { colors, font } from '@/theme';

const SPOTS = [
  { size: 12, bg: '#FF96B8', top: 40, left: 34 },
  { size: 9, bg: colors.green, top: 58, right: 48 },
  { size: 8, bg: colors.coin, top: 46, right: 96 },
  { size: 10, bg: colors.diamond, top: 64, left: 96 },
];

/** Screen 5 — "A new piggy was born!" meet-Hammy moment. */
export default function PiggyBorn() {
  const router = useRouter();
  return (
    <LinearGradient colors={[colors.pinkBg, colors.pinkBorder]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={styles.wrap}>
        {SPOTS.map((s, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: s.bg,
              top: s.top,
              left: s.left,
              right: s.right,
            }}
          />
        ))}

        <Tag tone="pink" style={{ marginTop: 10 }}>🎉 IT&apos;S A PIGLET</Tag>
        <Txt style={styles.title}>A new piggy{'\n'}was born!</Txt>
        <Txt style={styles.body}>
          Meet Hammy — your money buddy. Feed him good habits and watch him grow up right alongside your savings.
        </Txt>

        <Hammy size={210} style={styles.hammy} />

        <Spacer />
        <Button label="Say hi to Hammy" variant="pink" onPress={() => router.push('/(onboarding)/survey')} style={{ marginBottom: 12 }} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 22, alignItems: 'center' },
  title: { fontFamily: font.display, fontSize: 34, color: colors.pinkDark, textAlign: 'center', marginTop: 14, lineHeight: 37 },
  body: { fontFamily: font.semi, fontSize: 15, color: '#9E6B79', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  hammy: { marginTop: 22 },
});
