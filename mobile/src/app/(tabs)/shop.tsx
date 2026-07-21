import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
 * stacked, titled sections — no collapse/expand affordance, every section is always fully
 * shown. Every item's image, price, rarity, and mystery-pool odds come straight from the
 * ported SHOP_ITEMS catalog — same pictures, same numbers, same "buy the box to spin for
 * one" mechanic as the website. */
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
            </View>
          </View>
        </View>

        {categories.map((cat, idx) => {
          const items = sortItems(shopItemsReal.filter((i) => i.category === cat.key));
          const icon = CATEGORY_ICON[cat.key];
          // Room Decor is the only category on its tab — a titled header above it would
          // just repeat what the storefront banner above already says ("The Furniture
          // Farm"), so the Room tab skips straight to the grid instead.
          const showHeader = cat.key !== 'room';
          return (
            <View key={cat.key} style={[styles.section, idx > 0 && styles.sectionDivider]}>
              {showHeader ? (
                <View style={styles.sectionHead}>
                  <View style={styles.sectionIconWrap}>
                    {icon ? (
                      <MaterialCommunityIcons name={icon} size={16} color={colors.greenDark} />
                    ) : (
                      <Diamond size={15} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="h2" style={styles.sectionTitle}>{cat.label}</Txt>
                    {cat.tag ? (
                      <Txt style={styles.sectionTagTxt} numberOfLines={1}>{cat.tag}</Txt>
                    ) : null}
                  </View>
                </View>
              ) : null}
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

/** Diagonal corner banner, ported from the website's .shop-exclusive-ribbon /
 * .shop-reward-ribbon (a rotated strip clipped by the card's own rounded corner) — replaces
 * the small top-left pill this screen used before, which isn't how the site does it. */
function CornerRibbon({ text, tone }: { text: string; tone: 'blue' | 'gold' | 'red' }) {
  const grad: [string, string] = tone === 'blue' ? ['#2AA8C4', '#8FE3F5'] : tone === 'red' ? ['#C0453A', '#E8837A'] : ['#B8860B', '#E8C468'];
  return (
    <View style={styles.ribbonClip} pointerEvents="none">
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ribbonStrip}>
        <Txt style={styles.ribbonTxt}>{text}</Txt>
      </LinearGradient>
    </View>
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
  // canAfford=false structurally, so their status label stays dimmed until owned/earned — the
  // rest of the card (art, name) stays full-strength, only .shop-item-price fades on the site.
  const dimStatus = !owned && !canAfford;
  // Mystery boxes (the actual "buy this, then spin" items) always get the premium glow
  // treatment; the website only glows the Diamond Exclusives category, but the ask here is
  // for every mystery box — hat/accessory boxes included — to stand out the same way.
  const glow = isBox || isDiamond;
  // Ported from the website's renderShopPage: `(isReward || isLocked) && !owned` both get
  // the gold-tinted, dimmed `.shop-reward-card` treatment — a mystery-only item the player
  // hasn't unlocked yet reads exactly like an unearned reward, not just an unequipped item.
  // Mobile previously only applied this to isReward, which is why locked items showed at
  // full strength instead of greyed out.
  const rewardCard = (isReward || isLocked) && !owned;

  // Blue for Diamond Exclusives (box or locked), gold for every other mystery-linked item
  // (the hat/accessory boxes and their locked pool items), red for milestone rewards.
  const ribbon = isBox || (isDiamond && !isBox) || (isLocked && !isDiamond)
    ? <CornerRibbon text="Mystery" tone={isDiamond ? 'blue' : 'gold'} />
    : isReward && !owned
      ? <CornerRibbon text="Reward" tone="red" />
      : null;

  const cardContent = (
    <>
      {ribbon}
      <View style={[styles.preview, rewardCard && styles.previewFaded]}>
        {isWallpaper ? (
          <Wallpaper item={item} style={StyleSheet.absoluteFill} />
        ) : isRoom || isBox ? (
          <ItemArt item={item} fill />
        ) : (
          <Hammy size={68} bob={false} equipped={[item]} />
        )}
      </View>

      <Txt style={styles.cardName} numberOfLines={1}>{item.name}</Txt>

      <View style={dimStatus ? { opacity: 0.55 } : undefined}>
        {isBox ? (
          boxRemaining ? (
            <View style={styles.statusRow}>
              {isDiamond ? <Diamond size={13} /> : <Coin size={13} />}
              <Txt style={styles.statusTxt}>{item.price}</Txt>
            </View>
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
      </View>

      {isPoolItem ? (
        <Txt style={[styles.odds, { color: RARITY_COLOR[itemRarity(item)] }]}>
          {RARITY_LABEL[itemRarity(item)]} · {formatPct(mysteryDropChance(item))}%
        </Txt>
      ) : null}
    </>
  );

  // Ported from the website's `.shop-card.shop-equipped` (border-color green, border-width
  // 2px, box-shadow 0 0 0 3px var(--green-pale)) — applies on top of ANY card variant,
  // exactly like `.shop-exclusive-card.shop-equipped` overrides only the border/ring while
  // keeping the exclusive gradient underneath. rewardCard/equipped never co-occur (equipped
  // implies owned, which excludes the reward/locked treatment), so this never has to
  // resolve a conflict between the two.
  const equippedRing = equipped ? styles.cardEquipped : undefined;

  if (glow) {
    return (
      <Pressable onPress={onPress} style={[styles.cardGlowWrap, equippedRing]}>
        <LinearGradient colors={['#FFFFFF', '#F0FBFF']} style={styles.cardGlowInner}>
          {cardContent}
        </LinearGradient>
      </Pressable>
    );
  }
  if (rewardCard) {
    return (
      <Pressable onPress={onPress} style={[styles.cardRewardWrap, { opacity: 0.85 }]}>
        <LinearGradient colors={['#FFFFFF', '#FFFAEE']} style={styles.cardGlowInner}>
          {cardContent}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable style={[styles.card, equippedRing]} onPress={onPress}>
      {cardContent}
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

  section: { gap: 14 },
  // A hairline rule above every section after the first — replaces the old bordered,
  // card-like header (which read as a pressable button even once the toggle behavior was
  // removed) with a quieter, purely typographic divider.
  sectionDivider: { paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: colors.screen, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16 },
  sectionTagTxt: { fontFamily: font.bold, fontSize: 10.5, color: colors.tagWarmText },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47.5%',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 11,
    gap: 8,
    overflow: 'hidden',
    shadowColor: '#2C3E2D',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardGlowWrap: {
    width: '47.5%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#8FE3F5',
    shadowColor: '#2AA8C4',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardRewardWrap: {
    width: '47.5%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E8C468',
    shadowColor: '#C9781A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  // Ported verbatim from the website's `.shop-card.shop-equipped`: border-color var(--green),
  // border-width 2px, box-shadow 0 0 0 3px var(--green-pale) — a solid (unblurred) ring
  // outside the border, not a soft drop shadow, hence the boxShadow spread syntax rather
  // than shadowRadius/elevation.
  cardEquipped: {
    borderColor: colors.green,
    borderWidth: 2,
    boxShadow: `0 0 0 3px ${colors.greenPale}`,
  },
  cardGlowInner: {
    flex: 1,
    borderRadius: 18,
    padding: 11,
    gap: 8,
    overflow: 'hidden',
  },
  preview: {
    borderRadius: 13,
    height: 92,
    alignItems: 'center',
    // Bottom-anchored, not centered — ported from the website's own .shop-preview fix (its
    // CSS comment explains centering left tall hats no headroom above the pig's head and
    // they clipped at the top; anchoring the pig to the bottom instead gives them room).
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: colors.screen,
    padding: 8,
  },
  // Ported verbatim from `.shop-card.shop-reward-card .shop-preview { filter: grayscale(0.6);
  // opacity: 0.75; }` — applies to unearned reward items AND locked (mystery-only, not yet
  // owned) items alike, see the `rewardCard` definition above.
  previewFaded: { opacity: 0.75, filter: 'grayscale(0.6)' },
  ribbonClip: {
    position: 'absolute', top: 0, right: 0, width: 90, height: 90, overflow: 'hidden', zIndex: 1,
  },
  ribbonStrip: {
    position: 'absolute', top: 12, right: -32, width: 130,
    paddingVertical: 4, alignItems: 'center', transform: [{ rotate: '38deg' }],
  },
  ribbonTxt: { fontFamily: font.extra, fontSize: 9, color: colors.white, textTransform: 'uppercase', letterSpacing: 0.4 },
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
