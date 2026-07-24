import { useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Card, IconButton, CurrencyChip, Coin, Diamond, ItemArt, Hammy, Wallpaper } from '@/components';
import { colors, font } from '@/theme';
import { shopItemById, shopItemsReal } from '@/content';
import type { ShopItemReal } from '@/content';
import { useStore, mysteryDropChance, itemRarity, MAX_EQUIPPED_ITEMS, type MysteryResult } from '@/store';

const CATEGORY_LABEL: Record<string, string> = {
  hat: 'Hats', accessory: 'Accessories', room: 'Room', exclusive: 'Exclusive', reward: 'Rewards',
};

const RARITY_LABEL: Record<string, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const RARITY_COLOR: Record<string, string> = { common: '#2F9E44', rare: '#2E6FE0', epic: '#9B3FD6', legendary: '#C9781A' };

function mysteryBoxNameFor(poolKey: string) {
  return shopItemsReal.find((i) => i.isMysteryBox && i.mysteryPool === poolKey)?.name ?? 'a Mystery Box';
}

/** Ported from the website's ICON_GIFT (app.js) — a real drawn gift box (lid, ribbon, bow,
 * shine highlight), not the plain 🎁 unicode emoji mobile used before. `tone` recolors just
 * the box/lid (the gold ribbon stays gold regardless) — the accessory pool gets purple to
 * match its own card art (see accessory_mystery_box's gradient in shopItems.json), every
 * other pool keeps the site's original pink. */
function GiftIcon({ size, tone = 'pink' }: { size: number; tone?: 'pink' | 'purple' }) {
  const c = tone === 'purple'
    ? { body: '#C9A0FF', lid: '#8A3FE0', stroke: '#4A1A8A' }
    : { body: '#FF6FA0', lid: '#FF4F8A', stroke: '#8A2646' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={11} width={16} height={8.5} rx={1} fill={c.body} stroke={c.stroke} strokeWidth={1.4} />
      <Rect x={3} y={8} width={18} height={3.4} rx={0.9} fill={c.lid} stroke={c.stroke} strokeWidth={1.4} />
      <Rect x={10.7} y={8} width={2.6} height={11.5} fill="#FFD23F" stroke="#8A5A00" strokeWidth={0.8} />
      <Path d="M12 8c-1.6-3.2-5.4-3.2-5.4-0.2 0 1.7 2.5 1 5.4 0.2z" fill="#FFD23F" stroke="#8A5A00" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M12 8c1.6-3.2 5.4-3.2 5.4-0.2 0 1.7-2.5 1-5.4 0.2z" fill="#FFD23F" stroke="#8A5A00" strokeWidth={0.8} strokeLinejoin="round" />
      <Rect x={4} y={11} width={16} height={1.6} fill="#ffffff" opacity={0.25} />
    </Svg>
  );
}

/** Screen 22 — Shop item detail modal. Real item pulled from the ported shop catalog,
 * with the real purchase/equip economy and (for mystery boxes) the odds-weighted open
 * + spin/reveal flow, all ported from the website's app.js. */
export default function ShopItemModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = shopItemById(id ?? '');
  const { state, isOwned, isEquipped, buyOrEquipItem, toggleRoomSlot, openMysteryBox } = useStore();

  const [opening, setOpening] = useState(false);
  const [reveal, setReveal] = useState<MysteryResult | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

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
  const balance = currency === 'diamond' ? state.diamonds : state.coins;
  const canAfford = balance >= item.price;
  const owned = isOwned(item.id);
  const equipped = isEquipped(item.id);

  const startMysteryOpen = () => {
    const result = openMysteryBox(item.id);
    if (!result) return;
    setOpening(true);
    spin.setValue(0);
    // Ported from the website's mystery-spin-anim keyframe: rotate 0->1080->1440deg with
    // a scale bump to 1.15 at the 70% mark, over 1.8s.
    Animated.timing(spin, {
      toValue: 1,
      duration: 1800,
      easing: Easing.bezier(0.15, 0.85, 0.35, 1),
      useNativeDriver: true,
    }).start(() => {
      setOpening(false);
      setReveal(result);
    });
  };

  const rotate = spin.interpolate({ inputRange: [0, 0.7, 1], outputRange: ['0deg', '1080deg', '1440deg'] });
  const scale = spin.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1.15, 1] });

  const handlePrimaryAction = () => {
    if (item.isMysteryBox) { startMysteryOpen(); return; }
    if (item.slot) toggleRoomSlot(item.id);
    else buyOrEquipItem(item.id);
  };

  let buttonLabel = '';
  let buttonDisabled = false;
  if (item.isMysteryBox) {
    buttonLabel = `Open for ${item.price} ${currency}${item.price === 1 ? '' : 's'}`;
    buttonDisabled = !canAfford;
  } else if (item.reward) {
    buttonLabel = `🎓 ${item.rewardHint ?? 'Complete all 10 modules to earn this'}`;
    buttonDisabled = true;
  } else if (item.mysteryOnly) {
    buttonLabel = `🎁 Only from the ${mysteryBoxNameFor(item.mysteryPool!)}`;
    buttonDisabled = true;
  } else if (equipped) {
    buttonLabel = 'Unequip';
    buttonDisabled = false;
  } else if (owned) {
    const noFreeSlot = !item.slot && state.equippedItems.length >= MAX_EQUIPPED_ITEMS;
    buttonLabel = noFreeSlot ? 'Equip (unequip something first)' : 'Equip';
    buttonDisabled = noFreeSlot;
  } else {
    buttonLabel = `Buy for ${item.price} ${currency}${item.price === 1 ? '' : 's'}`;
    buttonDisabled = !canAfford;
  }

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

          <LinearGradient colors={['#FFF3F7', '#FBE0EA']} style={[styles.preview, opening && styles.previewCentered]}>
            {opening ? (
              <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
                <GiftIcon size={72} tone={item.mysteryPool === 'accessory' ? 'purple' : 'pink'} />
              </Animated.View>
            ) : reveal ? (
              // Wallpaper items have no `svg` field at all (they're a bg/pattern lookup,
              // not raw item art — see Wallpaper.tsx) — ItemArt.tsx calls item.svg.replace(...)
              // unconditionally, which crashed ("Cannot read properties of undefined
              // (reading 'replace')") the moment a wallpaper's own detail sheet tried to
              // render a preview for it.
              reveal.item.slot === 'wallpaper' ? (
                <Wallpaper item={reveal.item} style={StyleSheet.absoluteFill} />
              ) : (
                <ItemArt item={reveal.item} size={150} />
              )
            ) : item.slot === 'wallpaper' ? (
              <Wallpaper item={item} style={StyleSheet.absoluteFill} />
            ) : item.category === 'room' || item.isMysteryBox ? (
              <ItemArt item={item} size={150} />
            ) : (
              <Hammy size={150} bob={false} equipped={[item]} />
            )}
          </LinearGradient>

          {opening ? (
            <View style={styles.head}>
              <Txt variant="h1">Opening...</Txt>
            </View>
          ) : reveal ? (
            <>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Txt variant="h1">{reveal.isDuplicate ? `You already have: ${reveal.item.name}` : `🎉 You got: ${reveal.item.name}!`}</Txt>
                  <Txt variant="lead" style={{ fontSize: 13 }}>
                    {reveal.isDuplicate
                      ? `Refunded ${reveal.refundAmount} ${reveal.refundCurrency}${reveal.refundAmount === 1 ? '' : 's'} since you already own this one.`
                      : reveal.item.desc}
                  </Txt>
                </View>
              </View>
              <Button label="Nice!" onPress={() => router.back()} style={{ marginTop: 16 }} />
            </>
          ) : (
            <>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Txt variant="h1">{item.name}</Txt>
                  <Txt variant="lead" style={{ fontSize: 13 }}>{item.desc}</Txt>
                  {/* Ported exactly from the website's showAchievementDetail-equivalent
                      (refreshShopModal): the odds are a plain colored line appended after
                      the description — not a separate pill duplicating the rarity — and only
                      pool items (not the box itself) show odds at all. */}
                  {item.mysteryPool && !item.isMysteryBox ? (
                    <Txt style={[styles.oddsLine, { color: RARITY_COLOR[itemRarity(item)] }]}>
                      {RARITY_LABEL[itemRarity(item)]} · {formatPct(mysteryDropChance(item))}%
                    </Txt>
                  ) : null}
                </View>
                <Tag tone="green">{CATEGORY_LABEL[item.category] ?? item.category}</Tag>
              </View>

              {!item.reward ? (
                <Card style={styles.balance}>
                  <Txt variant="lead" style={{ fontSize: 13 }}>Your balance</Txt>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <CurrencyChip kind="coin" value={state.coins} />
                    <CurrencyChip kind="diamond" value={state.diamonds} />
                  </View>
                </Card>
              ) : null}

              <Button
                label={buttonLabel}
                left={!owned && !item.reward && !item.mysteryOnly && (currency === 'diamond' ? <Diamond size={20} /> : <Coin size={20} />)}
                disabled={buttonDisabled}
                variant={equipped ? 'dark' : 'green'}
                onPress={handlePrimaryAction}
                style={{ marginTop: 16 }}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function formatPct(pct: number) {
  return pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
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
  // Bottom-anchored, not centered — see shop.tsx's preview style for why (matches the
  // website's .shop-preview: centering left tall hats no headroom and they clipped at the top).
  preview: { height: 210, borderRadius: 22, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  // The spinning gift icon has no "base" the way item art does — flex-end left it sitting
  // near the bottom edge instead of in the middle of the preview, unlike the website's
  // .shop-modal-pig (a plain centered flexbox). Overrides justifyContent back to center only
  // while opening.
  previewCentered: { justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 14, paddingHorizontal: 16 },
  oddsLine: { fontFamily: font.extra, fontSize: 15, marginTop: 6 },
});
