import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Screen, Header, Txt, Hammy, ItemArt, Wallpaper, ListRow } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';
import { shopItemsReal } from '@/content';
import type { RoomSlot, ShopItemReal } from '@/content';

type SlotLayout = { label: string } & ViewStyle;

type FurnitureSlot = Exclude<RoomSlot, 'wallpaper'>;
type WardrobeCategory = 'hat' | 'accessory' | 'exclusive';

/** Ported from the website's room-slot-* CSS rules (app.css) — percentages of the full
 * scene box, not just the wall/floor sub-zone, which is why window/wall/lamp (top-anchored)
 * and plant/bed/rug/desk (bottom-anchored) both work out to land in the right zone.
 * Wallpaper isn't here — it's rendered as the wall zone itself, not a positioned slot. */
const SLOT_LAYOUT: Record<FurnitureSlot, SlotLayout> = {
  window: { label: 'Window', top: '17%', left: '35%', width: '30%', height: '24%' },
  wall: { label: 'Wall art', top: '6%', left: '6%', width: '15%', height: '40%' },
  lamp: { label: 'Lamp', top: '5%', right: '6%', width: '9%', height: '38%' },
  plant: { label: 'Plant', bottom: '6%', left: '31%', width: '6%', height: '14%' },
  bed: { label: 'Bed', bottom: '6%', right: '4%', width: '24%', height: '26%' },
  rug: { label: 'Rug', bottom: '3%', left: '33%', width: '34%', height: '16%' },
  desk: { label: 'Desk', bottom: '5%', left: '6%', width: '18%', height: '24%' },
};

const FURNITURE_SLOTS: FurnitureSlot[] = ['window', 'wall', 'lamp', 'plant', 'bed', 'rug', 'desk'];

/** Ported from the website's wardrobeTabLabels (app.js) — the wardrobe only manages
 * equippable cosmetics, not room decor or auto-awarded "reward" items. */
const WARDROBE_CATEGORIES: { key: WardrobeCategory; label: string }[] = [
  { key: 'hat', label: 'Hats' },
  { key: 'accessory', label: 'Accessories' },
  { key: 'exclusive', label: 'Exclusives' },
];

/** Screen 12 — Room (Hammy's scene & outfit). Full 8-slot scene ported from the website's
 * Room page: wallpaper on the wall zone, 7 furniture slots, Hammy on the floor — plus the
 * website's "Hammy's Wardrobe" sub-tab for browsing/equipping owned cosmetics by category. */
export default function Room() {
  const router = useRouter();
  const { state, level, equippedMascotItems, equippedRoomItems, isEquipped, buyOrEquipItem } = useStore();
  const [tab, setTab] = useState<'room' | 'wardrobe'>('room');
  const [wardrobeCat, setWardrobeCat] = useState<WardrobeCategory>('hat');

  const equipped = equippedMascotItems();
  const wearingLabel = equipped.length ? equipped.map((i) => i.name).join(' + ') : 'Nothing yet';
  const roomItems = equippedRoomItems();
  const wallpaperItem = roomItems.find((i) => i.slot === 'wallpaper');
  const bySlot = (slot: RoomSlot) => roomItems.find((i) => i.slot === slot);

  const goToRoomShop = () => router.push({ pathname: '/(tabs)/shop', params: { category: 'room' } });

  const wardrobeLabel = WARDROBE_CATEGORIES.find((c) => c.key === wardrobeCat)!.label;
  const wardrobeItems = shopItemsReal.filter(
    (i) => i.category === wardrobeCat && !i.isMysteryBox && state.ownedItems.includes(i.id),
  );

  return (
    <Screen edges={['top']}>
      <Header
        level={level}
        name={tab === 'room' ? "Hammy's Room" : "Hammy's Wardrobe"}
        coins={state.coins}
        diamonds={state.diamonds}
      />
      <View style={styles.wrap}>
        <View style={styles.sceneTabs}>
          {(['room', 'wardrobe'] as const).map((t) => {
            const on = t === tab;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tchip, on && styles.tchipOn]}>
                <Txt style={[styles.tchipTxt, on && { color: colors.white }]}>{t === 'room' ? 'Room' : 'Wardrobe'}</Txt>
              </Pressable>
            );
          })}
        </View>

        {tab === 'room' ? (
          <View style={styles.scene}>
            <View style={styles.wallZone}>
              <Wallpaper item={wallpaperItem} style={StyleSheet.absoluteFill} />
            </View>
            <LinearGradient colors={['#D7A968', '#B9834C']} style={styles.floorZone} />

            {FURNITURE_SLOTS.map((slot) => {
              const item = bySlot(slot);
              const layout = SLOT_LAYOUT[slot];
              return (
                <RoomSlotBox
                  key={slot}
                  layout={layout}
                  item={item}
                  onPress={goToRoomShop}
                />
              );
            })}

            <Hammy size={218} equipped={equipped} style={styles.hammy} />

            <View style={styles.wearing}>
              <Txt style={styles.wearingTxt}>Wearing: {wearingLabel} 🐷</Txt>
            </View>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={styles.wardrobeStage}>
              <Hammy size={190} equipped={equipped} />
            </View>

            <View style={styles.filters}>
              {WARDROBE_CATEGORIES.map((c) => {
                const on = c.key === wardrobeCat;
                return (
                  <Pressable key={c.key} onPress={() => setWardrobeCat(c.key)} style={[styles.fchip, on && styles.fchipOn]}>
                    <Txt style={[styles.fchipTxt, on && { color: colors.white }]}>{c.label}</Txt>
                  </Pressable>
                );
              })}
            </View>

            {wardrobeItems.length === 0 ? (
              <Txt variant="lead" style={{ fontSize: 13, marginTop: 16 }}>
                No {wardrobeLabel.toLowerCase()} yet, visit the Shop to get some.
              </Txt>
            ) : (
              <View style={{ gap: 10, marginTop: 16 }}>
                {wardrobeItems.map((item) => {
                  const worn = isEquipped(item.id);
                  return (
                    <ListRow key={item.id} onPress={() => buyOrEquipItem(item.id)}>
                      <ItemArt item={item} size={40} />
                      <Txt style={styles.itemName} numberOfLines={1}>{item.name}</Txt>
                      <View style={[styles.wornTag, worn && styles.wornTagOn]}>
                        <Txt style={[styles.wornTagTxt, worn && { color: colors.white }]}>{worn ? '✓ Worn' : 'Wear'}</Txt>
                      </View>
                    </ListRow>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

function RoomSlotBox({
  layout, item, onPress,
}: {
  layout: SlotLayout;
  item?: ShopItemReal;
  onPress: () => void;
}) {
  const { label, ...position } = layout;
  return (
    <View style={[styles.slot, position]}>
      {item ? (
        <Pressable style={styles.slotFilled} onPress={onPress}>
          <ItemArt item={item} fill />
        </Pressable>
      ) : (
        <Pressable style={styles.slotEmpty} onPress={onPress}>
          <Txt style={styles.slotPlus}>+</Txt>
          <Txt style={styles.slotLabel}>{label}</Txt>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 6 },
  sceneTabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
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
  scene: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EFE4D6',
  },
  wallZone: { position: 'absolute', top: 0, left: 0, right: 0, height: '48%' },
  floorZone: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%' },
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  slotFilled: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  slotEmpty: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  slotPlus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(44,62,45,0.16)',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: font.extra,
    fontSize: 14,
    color: colors.muted3,
    overflow: 'hidden',
  },
  slotLabel: {
    fontFamily: font.extra,
    fontSize: 8,
    color: colors.muted1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  hammy: { position: 'absolute', bottom: '12%', alignSelf: 'center' },
  wearing: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#EFE4D6',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  wearingTxt: { fontFamily: font.extra, fontSize: 12, color: colors.pinkDark },
  wardrobeStage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pinkBg,
    borderWidth: 1.5,
    borderColor: colors.pinkBorder,
    borderRadius: 24,
    paddingTop: 22,
    paddingBottom: 22,
    minHeight: 240,
  },
  filters: { flexDirection: 'row', gap: 7, marginTop: 14 },
  fchip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderOpt,
  },
  fchipOn: { backgroundColor: colors.green, borderColor: colors.green },
  fchipTxt: { fontFamily: font.extra, fontSize: 12, color: colors.muted3 },
  itemName: { flex: 1, fontFamily: font.extra, fontSize: 13.5, color: colors.ink },
  wornTag: {
    backgroundColor: colors.tagGreenBg,
    borderRadius: 13,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  wornTagOn: { backgroundColor: colors.green },
  wornTagTxt: { fontFamily: font.extra, fontSize: 12, color: colors.tagGreenText },
});
