import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Coin, Diamond } from '@/components';
import { colors, font } from '@/theme';
import { shopItems, user, ShopItem } from '@/data';

const FILTERS = ['Hats', 'Glasses', 'Outfits', 'Room'] as const;

/** Screen 13 — Shop (coins & diamonds). */
export default function Shop() {
  const router = useRouter();
  const [filter, setFilter] = useState(0);
  const cat = FILTERS[filter];
  const items = shopItems.filter((i) => i.category === cat);

  return (
    <Screen edges={['top']}>
      <Header title="Shop" coins={user.coins} diamonds={user.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          {FILTERS.map((f, i) => {
            const on = i === filter;
            return (
              <Pressable key={f} onPress={() => setFilter(i)} style={[styles.fchip, on && styles.fchipOn]}>
                <Txt style={[styles.fchipTxt, on && { color: colors.white }]}>{f}</Txt>
              </Pressable>
            );
          })}
        </View>

        {items.length === 0 ? (
          <Txt variant="lead" style={{ marginTop: 12 }}>No {cat.toLowerCase()} yet — check back soon!</Txt>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => (
              <ItemTile key={item.name} item={item} onPress={() => router.push('/modal/shop-item')} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ItemTile({ item, onPress }: { item: ShopItem; onPress: () => void }) {
  return (
    <Pressable style={styles.itile} onPress={onPress}>
      <LinearGradient colors={['#FFF3F7', '#FBE0EA']} style={styles.iprev}>
        <Txt style={styles.mono}>{item.file}</Txt>
      </LinearGradient>
      <View style={styles.itileFoot}>
        <Txt style={styles.iname}>{item.name}</Txt>
        {item.owned ? (
          <View style={[styles.price, { backgroundColor: colors.tagGreenBg }]}>
            <Txt style={[styles.priceTxt, { color: colors.tagGreenText }]}>✓ Owned</Txt>
          </View>
        ) : item.currency === 'diamond' ? (
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
  filters: { flexDirection: 'row', gap: 7 },
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
  mono: { fontFamily: font.bold, fontSize: 12, color: colors.muted5 },
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
