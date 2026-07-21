import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Header, Txt, Coin, Diamond, Gift, Hammy, ItemArt, Wallpaper } from '@/components';
import { colors, font, radius } from '@/theme';
import { shopItemsReal } from '@/content';
import type { ShopItemReal } from '@/content';
import { useStore, itemRarity, mysteryDropChance, mysteryPoolUnowned } from '@/store';

type ShopTab = 'boutique' | 'room';

/** Ported from the website's SHOP_CATEGORIES (app.js) — each tab renders its categories as
 * stacked sections (a header + a grid), not filter chips that swap the grid's contents. */
const SHOP_CATEGORIES: { key: ShopItemReal['category']; label: string; tab: ShopTab; tag?: string }[] = [
  { key: 'exclusive', label: 'Diamond Exclusives', tab: 'boutique', tag: 'Earned via streaks, not coins' },
  { key: 'hat', label: 'Hats', tab: 'boutique' },
  { key: 'accessory', label: 'Accessories', tab: 'boutique' },
  { key: 'reward', label: 'Rewards', tab: 'boutique', tag: 'Earned through major milestones, not bought' },
  { key: 'room', label: 'Room Decor', tab: 'room' },
];

const CATEGORY_ICON: Partial<Record<ShopItemReal['category'], keyof typeof MaterialCommunityIcons.glyphMap>> = {
  hat: 'hat-fedora',
  accessory: 'sunglasses',
  reward: 'trophy-variant',
  room: 'sofa',
};

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const RARITY_LABEL: Record<string, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const RARITY_COLOR: Record<string, string> = { common: '#2F9E44', rare: '#2E6FE0', epic: '#9B3FD6', legendary: '#C9781A' };

/** Ported from renderShopPage's item sort — mystery boxes lead their section, then pool
 * items order by rarity (commons first), everything else keeps catalog order. */
function sortItems(items: ShopItemReal[]) {
  return [...items].sort((a, b) => {
    if (!!a.isMysteryBox !== !!b.isMysteryBox) return a.isMysteryBox ? -1 : 1;
    const aIsPool = !!a.mysteryPool && !a.isMysteryBox;
    const bIsPool = !!b.mysteryPool && !b.isMysteryBox;
    if (aIsPool && bIsPool) return RARITY_ORDER.indexOf(itemRarity(a)) - RARITY_ORDER.indexOf(itemRarity(b));
    return 0;
  });
}

function mysteryBoxNameFor(poolKey: string) {
  return shopItemsReal.find((i) => i.isMysteryBox && i.mysteryPool === poolKey)?.name ?? 'a Mystery Box';
}

function formatPct(pct: number) {
  return pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
}

/** Screen 13 — Shop. Ported from the website's renderShopPage: a Boutique tab (Diamond
 * Exclusives, Hats, Accessories, Rewards) and a Room tab (Room Decor), each rendered as
 * stacked, titled sections rather than a single filterable grid. Every item's image, price,
 * rarity, and mystery-pool odds come straight from the ported SHOP_ITEMS catalog — same
 * pictures, same numbers, same "buy the box to spin for one" mechanic as the website. */
export default function Shop() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { state, equippedMascotItems, equippedRoomItems } = useStore();
  const initialTab: ShopTab = SHOP_CATEGORIES.find((c) => c.key === category)?.tab ?? 'boutique';
  const [tab, setTab] = useState<ShopTab>(initialTab);

  const categories = SHOP_CATEGORIES.filter((c) => c.tab === tab);
  const wornItems = equippedMascotItems();
  const filledRoomSlots = equippedRoomItems().length;

  return (
    <Screen edges={['top']}>
      <Header title="Shop" coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          {(['boutique', 'room'] as const).map((t) => {
            const on = t === tab;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tchip, on && styles.tchipOn]}>
                <Txt style={[styles.tchipTxt, on && { color: colors.white }]}>{t === 'boutique' ? 'Boutique' : 'Room'}</Txt>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.storefront}>
          <View style={styles.awning}>
            {[0, 1, 2, 3, 4].map((i) => <View key={i} style={styles.awningStripe} />)}
          </View>
          <View style={styles.storefrontInner}>
            {tab === 'room' ? (
              <View style={styles.storefrontIconWrap}>
                <MaterialCommunityIcons name="sofa" size={30} color={colors.greenDark} />
              </View>
            ) : (
              <Hammy size={56} bob={false} equipped={wornItems} />
            )}
            <View style={{ flex: 1 }}>
              <Txt style={styles.storefrontSign}>{tab === 'room' ? 'The Furniture Farm' : "Porky's Boutique"}</Txt>
              <Txt style={styles.storefrontSub}>
                {tab === 'room'
                  ? (filledRoomSlots ? `${filledRoomSlots} piece${filledRoomSlots === 1 ? '' : 's'} furnished so far` : "Furnish Hammy's room — every cozy upgrade compounds!")
                  : (wornItems.length ? `Currently wearing: ${wornItems.map((i) => i.name).join(', ')}` : 'Pick something cute for your pig!')}
              </Txt>
              <View style={styles.earnTip}>
                <Coin size={12} />
                <Txt style={styles.earnTipTxt}>lessons</Txt>
                <Txt style={styles.earnTipDot}>·</Txt>
                <Diamond size={12} />
                <Txt style={styles.earnTipTxt}>3-day streaks</Txt>
              </View>
            </View>
          </View>
        </View>

        {categories.map((cat) => {
          const items = sortItems(shopItemsReal.filter((i) => i.category === cat.key));
          const icon = CATEGORY_ICON[cat.key];
          return (
            <View key={cat.key} style={styles.section}>
              <View style={styles.sectionHead}>
                {icon ? (
                  <MaterialCommunityIcons name={icon} size={18} color={colors.muted2} />
                ) : (
                  <Diamond size={17} />
                )}
                <Txt variant="h2" style={{ fontSize: 16 }}>{cat.label}</Txt>
                {cat.tag ? (
                  <View style={styles.sectionTag}>
                    <Txt style={styles.sectionTagTxt}>{cat.tag}</Txt>
                  </View>
                ) : null}
              </View>
              {items.length === 0 ? (
                <Txt variant="lead" style={{ fontSize: 13 }}>Nothing here yet — check back soon!</Txt>
              ) : (
                <View style={styles.grid}>
                  {items.map((item) => (
                    <ShopCard
                      key={item.id}
                      item={item}
                      onPress={() => router.push({ pathname: '/sheet/shop-item', params: { id: item.id } })}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function ShopCard({ item, onPress }: { item: ShopItemReal; onPress: () => void }) {
  const { state, isOwned, isEquipped } = useStore();
  const isRoom = !!item.slot;
  const isWallpaper = item.slot === 'wallpaper';
  const isDiamond = item.currency === 'diamond';
  const isReward = !!item.reward;
  const isBox = !!item.isMysteryBox;
  const isPoolItem = !!item.mysteryPool && !isBox;
  const owned = isOwned(item.id);
  const equipped = isEquipped(item.id);
  const isLocked = !!item.mysteryOnly && !owned;
  const boxRemaining = isBox && item.mysteryPool ? mysteryPoolUnowned(item.mysteryPool, state.ownedItems).length : 0;
  const balance = isDiamond ? state.diamonds : state.coins;
  const canAfford = isReward ? false : isLocked ? false : (isBox && !boxRemaining) ? false : balance >= item.price;
  // Matches the website's .shop-broke rule exactly: reward/mystery-only items always read
  // canAfford=false structurally, so they stay dimmed until owned/earned — not a bug, this is
  // how the site visually distinguishes "preview of what the box/milestone can give you" from
  // "buy this directly right now".
  const dim = !owned && !canAfford;

  return (
    <Pressable style={[styles.card, dim && { opacity: 0.55 }]} onPress={onPress}>
      <View style={styles.preview}>
        {isWallpaper ? (
          <Wallpaper item={item} style={StyleSheet.absoluteFill} />
        ) : isRoom || isBox ? (
          <ItemArt item={item} size={64} />
        ) : (
          <Hammy size={64} bob={false} equipped={[item]} />
        )}
        {isBox || (isDiamond && !isBox) ? (
          <View style={styles.ribbon}><Txt style={styles.ribbonTxt}>Mystery</Txt></View>
        ) : isLocked && !isDiamond ? (
          <View style={styles.ribbon}><Txt style={styles.ribbonTxt}>Mystery</Txt></View>
        ) : isReward && !owned ? (
          <View style={[styles.ribbon, styles.ribbonReward]}><Txt style={styles.ribbonTxt}>Reward</Txt></View>
        ) : null}
      </View>

      <Txt style={styles.cardName} numberOfLines={1}>{item.name}</Txt>

      {isBox ? (
        boxRemaining ? (
          <View style={styles.statusRow}><Gift size={13} /><Txt style={styles.statusTxt}>{item.price}</Txt></View>
        ) : (
          <View style={[styles.statusRow, styles.statusOwned]}><Txt style={[styles.statusTxt, { color: colors.tagGreenText }]}>✓ All collected!</Txt></View>
        )
      ) : equipped ? (
        <View style={[styles.statusRow, styles.statusOwned]}>
          <Txt style={[styles.statusTxt, { color: colors.tagGreenText }]}>✓ {isWallpaper ? 'Applied' : isRoom ? 'Placed' : 'Equipped'}</Txt>
        </View>
      ) : owned ? (
        <View style={[styles.statusRow, styles.statusOwned]}><Txt style={[styles.statusTxt, { color: colors.tagGreenText }]}>Owned</Txt></View>
      ) : isLocked ? (
        <View style={styles.statusRow}><Gift size={13} /><Txt style={styles.statusTxt} numberOfLines={1}>{mysteryBoxNameFor(item.mysteryPool!)}</Txt></View>
      ) : isReward ? (
        <View style={[styles.statusRow, styles.statusLock]}>
          <MaterialCommunityIcons name="lock-outline" size={13} color={colors.tagLockText} />
          <Txt style={[styles.statusTxt, { color: colors.tagLockText }]}>Locked</Txt>
        </View>
      ) : (
        <View style={styles.statusRow}>
          {isDiamond ? <Diamond size={13} /> : <Coin size={13} />}
          <Txt style={styles.statusTxt}>{item.price}</Txt>
        </View>
      )}

      {isPoolItem ? (
        <Txt style={[styles.odds, { color: RARITY_COLOR[itemRarity(item)] }]}>
          {RARITY_LABEL[itemRarity(item)]} · {formatPct(mysteryDropChance(item))}%
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 18 },
  tabs: { flexDirection: 'row', gap: 8 },
  tchip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderOpt,
  },
  tchipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tchipTxt: { fontFamily: font.extra, fontSize: 13.5, color: colors.muted3 },

  storefront: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.pinkBg },
  awning: { flexDirection: 'row', height: 10 },
  awningStripe: { flex: 1, backgroundColor: '#FF96B8' },
  storefrontInner: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 },
  storefrontIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  storefrontSign: { fontFamily: font.display, fontSize: 16, color: colors.ink },
  storefrontSub: { fontFamily: font.semi, fontSize: 12, color: colors.pinkText, marginTop: 2 },
  earnTip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  earnTipTxt: { fontFamily: font.bold, fontSize: 10.5, color: colors.muted3 },
  earnTipDot: { fontFamily: font.bold, fontSize: 10.5, color: colors.muted5, marginHorizontal: 1 },

  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sectionTag: { backgroundColor: colors.tagWarmBg, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
  sectionTagTxt: { fontFamily: font.bold, fontSize: 10, color: colors.tagWarmText },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 11,
    gap: 8,
  },
  preview: {
    borderRadius: 13,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.screen,
  },
  ribbon: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: colors.pinkDark, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7,
  },
  ribbonReward: { backgroundColor: colors.reward },
  ribbonTxt: { fontFamily: font.extra, fontSize: 9, color: colors.white, textTransform: 'uppercase' },
  cardName: { fontFamily: font.extra, fontSize: 13, color: colors.ink },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: '#F4F7F1', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 9,
  },
  statusOwned: { backgroundColor: colors.tagGreenBg },
  statusLock: { backgroundColor: colors.tagLockBg },
  statusTxt: { fontFamily: font.extra, fontSize: 12, color: colors.ink, flexShrink: 1 },
  odds: { fontFamily: font.extra, fontSize: 10.5 },
});
