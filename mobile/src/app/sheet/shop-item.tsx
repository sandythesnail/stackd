import { useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Card, IconButton, CurrencyChip, Coin, Diamond, ItemArt, Hammy } from '@/components';
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

          <LinearGradient colors={['#FFF3F7', '#FBE0EA']} style={styles.preview}>
            {opening ? (
              <Animated.Text style={[styles.spinIcon, { transform: [{ rotate }, { scale }] }]}>🎁</Animated.Text>
            ) : reveal ? (
              <ItemArt item={reveal.item} size={150} />
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
                </View>
                <Tag tone="green">{CATEGORY_LABEL[item.category] ?? item.category}</Tag>
              </View>

              {item.rarity || item.mysteryPool ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {item.rarity ? <Tag tone="pink">{item.rarity}</Tag> : null}
                  {item.isMysteryBox ? <Tag tone="warm">Mystery box</Tag> : null}
                  {item.mysteryPool && !item.isMysteryBox ? (
                    <Tag textColor={RARITY_COLOR[itemRarity(item)]} tone="warm">
                      {RARITY_LABEL[itemRarity(item)]} · {formatPct(mysteryDropChance(item))}% odds
                    </Tag>
                  ) : null}
                </View>
              ) : null}

              <Card style={styles.balance}>
                <Txt variant="lead" style={{ fontSize: 13 }}>Your balance</Txt>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <CurrencyChip kind="coin" value={state.coins} />
                  <CurrencyChip kind="diamond" value={state.diamonds} />
                </View>
              </Card>

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
  preview: { height: 210, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  spinIcon: { fontSize: 72 },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 14, paddingHorizontal: 16 },
});
