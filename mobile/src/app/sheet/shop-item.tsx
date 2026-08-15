import { useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Card, IconButton, CurrencyChip, Coin, Diamond, ItemArt, Hammy, Wallpaper } from '@/components';
import { colors, font } from '@/theme';
import { shopItemById } from '@/content';
import {
  useStore, mysteryDropChance, mysteryPoolUnowned, itemRarity, MAX_EQUIPPED_ITEMS,
  type MysteryResult,
} from '@/store';
import { RequireAuth } from '@/lib/RequireAuth';

const CATEGORY_LABEL: Record<string, string> = {
  hat: 'Hats', accessory: 'Accessories', room: 'Room', exclusive: 'Exclusive', reward: 'Rewards',
};

const RARITY_LABEL: Record<string, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const RARITY_COLOR: Record<string, string> = { common: '#2F9E44', rare: '#2E6FE0', epic: '#9B3FD6', legendary: '#C9781A' };

/* GiftIcon is gone. It was a hand-drawn stand-in for a mystery box, in pink or purple, used
 * while a box was being shaken open — so the box you tapped and the box that shook were two
 * different pictures, and the diamond box (cyan) shook as a pink present. The three boxes are
 * already one drawing in three colourways in the catalog, so the sheet renders the item's own
 * art instead and the question cannot come up again. */

/** Screen 22 — Shop item detail modal. Real item pulled from the ported shop catalog,
 * with the real purchase/equip economy and (for mystery boxes) the odds-weighted open
 * + spin/reveal flow, all ported from the website's app.js. */
export default function ShopItemModal() {
  // Root-Stack screen with no protected layout above it — gate it directly, or
  // /sheet/shop-item stays reachable by deep link with no session (lib/RequireAuth.tsx).
  return (
    <RequireAuth>
      <ShopItemSheet />
    </RequireAuth>
  );
}

function ShopItemSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = shopItemById(id ?? '');
  const { state, isOwned, isEquipped, buyOrEquipItem, toggleRoomSlot, openMysteryBox } = useStore();

  const [opening, setOpening] = useState(false);
  const [reveal, setReveal] = useState<MysteryResult | null>(null);
  const [notEnough, setNotEnough] = useState(false);
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
  // How many prizes this box can still hand out. openMysteryBox refuses to open (returns
  // null) once its pool is fully owned — but this sheet only ever checked affordability, so
  // an exhausted box kept offering an enabled "Open for N coins" that did precisely nothing
  // when tapped, with no explanation. The Shop grid card behind this sheet already got this
  // right ("✓ All collected!"), which made the sheet the one place a dead button survived.
  const boxRemaining = item.isMysteryBox && item.mysteryPool
    ? mysteryPoolUnowned(item.mysteryPool, state.ownedItems).length
    : 0;

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
    // Anything that costs something and isn't owned yet checks the balance HERE rather than
    // arriving pre-disabled, so "you can't afford this" is something the app says when you
    // ask, in the currency you're short of, instead of a grey rectangle you have to infer.
    if (!owned && !equipped && !canAfford && (item.isMysteryBox || !item.reward)) {
      setNotEnough(true);
      return;
    }
    if (item.isMysteryBox) { startMysteryOpen(); return; }
    if (item.slot) toggleRoomSlot(item.id);
    else buyOrEquipItem(item.id);
  };

  let buttonLabel = '';
  let buttonDisabled = false;
  if (item.isMysteryBox) {
    // Nothing left to win reads as its own state, not as "can't afford it" — the player owns
    // every prize in this pool, which is worth saying out loud rather than dimming a price.
    if (!boxRemaining) {
      buttonLabel = '✓ You’ve collected them all';
      buttonDisabled = true;
    } else {
      // "Buy", and never disabled for price. A greyed-out button is a dead end that doesn't
      // say why; pressing it now tells you what you're short of (see notEnough below).
      buttonLabel = 'Buy';
      buttonDisabled = false;
    }
  } else if (item.reward) {
    // Just "Locked". The old label was the whole unlock condition with a mortarboard in front
    // of it, which is a sentence pretending to be a button; the condition is already spelled
    // out in the card's own description above.
    buttonLabel = 'Locked';
    buttonDisabled = true;
  } else if (equipped) {
    // Three verbs, one per kind of thing: wallpaper is Applied, the rest of the furniture is
    // Placed, and anything Hammy puts on is Worn. Kept in step with this item's status chip
    // in the Shop grid and with the Room tab.
    //
    // Wallpaper keeping its own verb is deliberate and has been decided twice — it is the one
    // room item you don't put somewhere, you cover a wall with it, and "Place wallpaper" reads
    // wrong for that even though it makes the furniture list uniform. Don't collapse it into
    // 'Place' for consistency's sake; the inconsistency is the point.
    buttonLabel = item.slot === 'wallpaper' ? 'Unapply' : item.slot ? 'Unplace' : 'Unwear';
    buttonDisabled = false;
  } else if (owned) {
    const noFreeSlot = !item.slot && state.equippedItems.length >= MAX_EQUIPPED_ITEMS;
    const equipVerb = item.slot === 'wallpaper' ? 'Apply' : item.slot ? 'Place' : 'Wear';
    buttonLabel = noFreeSlot ? `${equipVerb} (take something off first)` : equipVerb;
    buttonDisabled = noFreeSlot;
  } else if (item.mysteryOnly) {
    // Locked, and not for sale. Making these directly buyable was tried and reverted: it made
    // the boxes pointless, since every prize could be bought outright for less than a spin.
    // Same word the milestone rewards use, and it turns into "Unlocked" in green once won.
    buttonLabel = 'Locked';
    buttonDisabled = true;
  } else {
    buttonLabel = 'Buy';
    buttonDisabled = false;
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

          {/* Plain white, not the pink gradient this used to be. Every item in the shop is
              previewed in this box — furniture, wallpaper, hats — and a pink wash tinted all
              of them, which both misrepresented the item's own colours and clashed with the
              wallpaper swatches, whose whole point is the colour they are. */}
          <View style={styles.preview}>
            {opening ? (
              // The box that is actually being shaken, not a stand-in drawn to look like it.
              // GiftIcon had its own pink/purple pair, which meant the diamond box shook as a
              // pink present and the hat box's two representations never quite matched.
              <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
                <ItemArt item={item} size={120} />
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
          </View>

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

              {/* Says what you're short of and by how much, which is the only thing worth
                  knowing at this point. Drawn in the sheet rather than through a platform
                  alert: Alert.alert is a no-op under react-native-web, and /m is the build
                  most people are shopping in (see lib/confirm.ts).

                  The slot is ALWAYS in the layout and only its contents appear, so pressing
                  Buy can't push the button, the balance card and everything else down the
                  sheet by the height of a message. Nothing on this sheet moves when you tap
                  anything. */}
              <View style={styles.shortSlot} pointerEvents={notEnough ? 'auto' : 'none'}>
                {notEnough ? (
                  <Pressable onPress={() => setNotEnough(false)} style={styles.shortRow}>
                    {currency === 'diamond' ? <Diamond size={17} /> : <Coin size={17} />}
                    <Txt style={styles.shortTxt}>
                      {`Not enough ${currency}s. You need ${item.price - (currency === 'diamond' ? state.diamonds : state.coins)} more.`}
                    </Txt>
                  </Pressable>
                ) : null}
              </View>

              <Button
                label={buttonLabel}
                // No currency icon once the label has stopped quoting a price — an exhausted
                // mystery box says "collected them all", which a coin beside it contradicts.
                left={!owned && !item.reward && !item.mysteryOnly && !(item.isMysteryBox && !boxRemaining)
                  && (currency === 'diamond' ? <Diamond size={20} /> : <Coin size={20} />)}
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
  preview: {
    height: 210, borderRadius: 22, alignItems: 'center',
    // Centred for everything: furniture, wall posters, mystery boxes, gift icon and Hammy
    // alike. This used to be flex-end, inherited from the grid card, where bottom-anchoring
    // earns its keep — those tiles are only 92px tall and centring a tall hat clipped it off
    // the top. At 210px with 150px art there is 30px of slack at each end, so nothing clips,
    // and bottom-anchoring instead made every item hang off the bottom edge by a different
    // amount depending on its own aspect ratio: a 220x70 rug letterboxes inside its 150 box
    // and then sat low, while a 100x130 poster nearly filled its box and looked centred. The
    // items were never aligned with each other, only with the bottom of their own art boxes.
    justifyContent: 'center',
    overflow: 'hidden', backgroundColor: colors.white,
    // The pink gradient this replaces gave the box its own edge against the white sheet.
    // Plain white on white needs a border, or the preview area has no boundary at all.
    borderWidth: 1.5, borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  balance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 14, paddingHorizontal: 16 },
  // Reserved height, always present. See the note at its call site.
  shortSlot: { height: 54, justifyContent: 'center', marginTop: 8 },
  shortRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: colors.dangerBg, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#F3D4D4',
  },
  shortTxt: { flex: 1, fontFamily: font.bold, fontSize: 13, lineHeight: 18, color: colors.dangerDeep },
  oddsLine: { fontFamily: font.extra, fontSize: 15, marginTop: 6 },
});
