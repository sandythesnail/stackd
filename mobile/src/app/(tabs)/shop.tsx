import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Header, Txt, Coin, Diamond, ItemArt } from '@/components';
import { colors, font } from '@/theme';
import { shopItemsReal } from '@/content';
import type { ShopItemReal } from '@/content';
import { useStore } from '@/store';

const CATEGORIES: { key: ShopItemReal['category']; label: string }[] = [
  { key: 'hat', label: 'Hats' },
  { key: 'accessory', label: 'Accessories' },
  { key: 'room', label: 'Room' },
  { key: 'exclusive', label: 'Exclusive' },
  { key: 'reward', label: 'Rewards' },
];

const RARITY_COLOR: Record<string, string> = {
  common: colors.muted3,
  rare: '#2E6FE0',
  epic: '#9B3FD6',
  legendary: '#C9781A',
};

/** Screen 13 — Shop (coins & diamonds). Real catalog ported from the website's SHOP_ITEMS. */
export default function Shop() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { state, isOwned, isEquipped } = useStore();
  const initialFilter = Math.max(0, CATEGORIES.findIndex((c) => c.key === category));
  const [filter, setFilter] = useState(initialFilter);
  const cat = CATEGORIES[filter];
  const items = shopItemsReal.filter((i) => i.category === cat.key);

  return (
    <Screen edges={['top']}>
      <Header title="Shop" coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          {CATEGORIES.map((c, i) => {
            const on = i === filter;
            return (
              <Pressable key={c.key} onPress={() => setFilter(i)} style={[styles.fchip, on && styles.fchipOn]}>
                <Txt style={[styles.fchipTxt, on && { color: colors.white }]}>{c.label}</Txt>
              </Pressable>
            );
          })}
        </View>

        {items.length === 0 ? (
          <Txt variant="lead" style={{ marginTop: 12 }}>No {cat.label.toLowerCase()} yet — check back soon!</Txt>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => (
              <ItemTile
                key={item.id}
                item={item}
                owned={isOwned(item.id)}
                equipped={isEquipped(item.id)}
                onPress={() => router.push({ pathname: '/modal/shop-item', params: { id: item.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ItemTile({
  item, owned, equipped, onPress,
}: {
  item: ShopItemReal; owned: boolean; equipped: boolean; onPress: () => void;
}) {
  const currency = item.currency ?? 'coin';
  return (
    <Pressable style={styles.itile} onPress={onPress}>
      <LinearGradient colors={['#FFF3F7', '#FBE0EA']} style={styles.iprev}>
        <ItemArt item={item} size={70} />
        {item.rarity ? (
          <View style={[styles.rarity, { backgroundColor: RARITY_COLOR[item.rarity] ?? colors.muted3 }]}>
            <Txt style={styles.rarityTxt}>{item.rarity}</Txt>
          </View>
        ) : null}
        {item.isMysteryBox ? (
          <View style={styles.mysteryTag}><Txt style={styles.mysteryTagTxt}>🎁</Txt></View>
        ) : null}
      </LinearGradient>
      <View style={styles.itileFoot}>
        <Txt style={styles.iname} numberOfLines={1}>{item.name}</Txt>
        {equipped ? (
          <View style={[styles.price, { backgroundColor: colors.tagGreenBg }]}>
            <Txt style={[styles.priceTxt, { color: colors.tagGreenText }]}>✓ Worn</Txt>
          </View>
        ) : owned ? (
          <View style={[styles.price, { backgroundColor: colors.tagGreenBg }]}>
            <Txt style={[styles.priceTxt, { color: colors.tagGreenText }]}>Owned</Txt>
          </View>
        ) : item.reward ? (
          <View style={[styles.price, { backgroundColor: colors.tagLockBg }]}>
            <Txt style={[styles.priceTxt, { color: colors.tagLockText }]}>🎓 Earned</Txt>
          </View>
        ) : currency === 'diamond' ? (
          <View style={[styles.price, { backgroundColor: '#EAF6FB' }]}>
            <Diamond size={13} />
            <Txt style={[styles.priceTxt, { color: '#2E7FA3' }]}>{item.price}</Txt>
          </View>
        ) : (
          <View style={styles.price}>
            <Coin size={14} />
            <Txt style={styles.priceTxt}>{item.price}</Txt>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 14 },
  filters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  fchip: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderOpt,
  },
  fchipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  fchipTxt: { fontFamily: font.extra, fontSize: 12.5, color: colors.muted3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 11,
    gap: 9,
  },
  iprev: { borderRadius: 13, height: 92, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rarity: { position: 'absolute', top: 6, left: 6, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7 },
  rarityTxt: { fontFamily: font.extra, fontSize: 9, color: colors.white, textTransform: 'uppercase' },
  mysteryTag: { position: 'absolute', top: 6, right: 6, borderRadius: 10, backgroundColor: colors.white, paddingVertical: 2, paddingHorizontal: 6 },
  mysteryTagTxt: { fontSize: 12 },
  itileFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iname: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink, flexShrink: 1 },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F4F7F1',
    borderRadius: 13,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  priceTxt: { fontFamily: font.extra, fontSize: 13, color: colors.ink },
});
