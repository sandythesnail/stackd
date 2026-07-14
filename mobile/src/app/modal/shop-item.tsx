import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Card, IconButton, Hammy, CurrencyChip, Coin } from '@/components';
import { colors, font } from '@/theme';
import { user } from '@/data';

/** Screen 22 — Shop item detail modal. */
export default function ShopItem() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()}>
        <View style={styles.scrim} />
      </Pressable>
      <SafeAreaView edges={['bottom']} style={styles.anchor}>
        <View style={styles.sheet}>
          <View style={styles.topRow}>
            <IconButton name="x" size={34} iconSize={16} onPress={() => router.back()} />
          </View>

          <LinearGradient colors={['#FFF3F7', '#FBE0EA']} style={styles.preview}>
            <Hammy size={150} bob />
            <Txt style={styles.cap}>🎓</Txt>
          </LinearGradient>

          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Txt variant="h1">Grad Cap</Txt>
              <Txt variant="lead" style={{ fontSize: 13 }}>Celebrate your progress in style.</Txt>
            </View>
            <Tag tone="green">Hats</Tag>
          </View>

          <Card style={styles.balance}>
            <Txt variant="lead" style={{ fontSize: 13 }}>Your balance</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CurrencyChip kind="coin" value={user.coins} />
              <CurrencyChip kind="diamond" value={user.diamonds} />
            </View>
          </Card>

          <Button label="Buy for 300 coins" left={<Coin size={20} />} onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: 'rgba(22,32,23,0.62)' },
  anchor: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.screen,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 22,
  },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  preview: { height: 210, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cap: { fontSize: 40, position: 'absolute', top: 34 },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 14, paddingHorizontal: 16 },
});
