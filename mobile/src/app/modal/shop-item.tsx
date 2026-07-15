import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Card, IconButton, CurrencyChip, Coin, Diamond, ItemArt, Hammy } from '@/components';
import { colors, font } from '@/theme';
import { user } from '@/data';
import { shopItemById } from '@/content';

const CATEGORY_LABEL: Record<string, string> = {
  hat: 'Hats', accessory: 'Accessories', room: 'Room', exclusive: 'Exclusive', reward: 'Rewards',
};

/** Screen 22 — Shop item detail modal. Real item pulled from the ported shop catalog. */
export default function ShopItemModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = shopItemById(id ?? '');

  if (!item) {
    return (
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()}>
          <View style={styles.scrim} />
        </Pressable>
        <SafeAreaView edges={['bottom']} style={styles.anchor}>
          <View style={styles.sheet}>
            <Txt variant="h1">Item not found</Txt>
            <Button label="Close" onPress={() => router.back()} style={{ marginTop: 16 }} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currency = item.currency ?? 'coin';
  const balance = currency === 'diamond' ? user.diamonds : user.coins;
  const canAfford = balance >= item.price;

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
            {item.category === 'room' ? (
              <ItemArt item={item} size={150} />
            ) : (
              <Hammy size={150} bob={false} equipped={[item]} />
            )}
          </LinearGradient>

          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Txt variant="h1">{item.name}</Txt>
              <Txt variant="lead" style={{ fontSize: 13 }}>{item.desc}</Txt>
            </View>
            <Tag tone="green">{CATEGORY_LABEL[item.category] ?? item.category}</Tag>
          </View>

          {item.rarity ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Tag tone="pink">{item.rarity}</Tag>
              {item.isMysteryBox ? <Tag tone="warm">Mystery box</Tag> : null}
              {item.mysteryOnly && !item.isMysteryBox ? <Tag tone="warm">Mystery-only</Tag> : null}
            </View>
          ) : null}

          <Card style={styles.balance}>
            <Txt variant="lead" style={{ fontSize: 13 }}>Your balance</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CurrencyChip kind="coin" value={user.coins} />
              <CurrencyChip kind="diamond" value={user.diamonds} />
            </View>
          </Card>

          <Button
            label={`Buy for ${item.price} ${currency}${item.price === 1 ? '' : 's'}`}
            left={currency === 'diamond' ? <Diamond size={20} /> : <Coin size={20} />}
            disabled={!canAfford}
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          />
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
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 14, paddingHorizontal: 16 },
});
