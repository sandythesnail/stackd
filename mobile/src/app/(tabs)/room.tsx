import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Screen, Txt, Hammy, ItemArt, Wallpaper, ListRow } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';
import { shopItemsReal } from '@/content';
import type { RoomSlot, ShopItemReal } from '@/content';

type SlotLayout = { label: string; floorStanding?: boolean } & ViewStyle;

type FurnitureSlot = Exclude<RoomSlot, 'wallpaper'>;
type WardrobeCategory = 'hat' | 'accessory' | 'exclusive';

/** Ported from the website's room-slot-* CSS rules (app.css), then sized up further —
 * matching the website's exact percentages left every item rendering tiny inside the much
 * smaller mobile scene. `floorStanding` marks furniture that should sit ON something (the
 * floor, a desk) rather than hang on the wall — see RoomSlotBox's `align="bottom"` below,
 * which anchors the item's own art to the bottom of its box instead of dead-center, so a
 * lamp's actual base lands at the bottom of its slot instead of floating in the middle of
 * empty letterboxed space above the visual floor line. Wallpaper isn't here — it's rendered
 * as the wall zone itself, not a positioned slot. */
const SLOT_LAYOUT: Record<FurnitureSlot, SlotLayout> = {
  window: { label: 'Window', top: '14%', left: '33%', width: '34%', height: '28%' },
  wall: { label: 'Wall art', top: '5%', left: '5%', width: '18%', height: '44%' },
  lamp: { label: 'Lamp', top: '4%', right: '5%', width: '11%', height: '42%', floorStanding: true },
  plant: { label: 'Plant', bottom: '5%', left: '30%', width: '8%', height: '18%', floorStanding: true },
  bed: { label: 'Bed', bottom: '5%', right: '3%', width: '28%', height: '30%', floorStanding: true },
  rug: { label: 'Rug', bottom: '2%', left: '32%', width: '36%', height: '19%', floorStanding: true },
  desk: { label: 'Desk', bottom: '4%', left: '5%', width: '21%', height: '28%', floorStanding: true },
};

// Rendered in this order, and later entries paint over earlier ones (plain DOM/JSX stacking,
// no explicit z-index) — rug goes right after the wall-mounted pair so it sits BEHIND the
// furniture that legitimately overlaps it (a plant or bed sitting partway onto a rug is
// normal; a rug drawn on top of them covering their base would look wrong).
const FURNITURE_SLOTS: FurnitureSlot[] = ['window', 'wall', 'rug', 'lamp', 'plant', 'bed', 'desk'];

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
  const { state, equippedMascotItems, equippedRoomItems, isEquipped, buyOrEquipItem } = useStore();
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

  // No Header here on purpose — the level/coins/diamonds bar just ate space from an already
  // small room scene for no real benefit on this screen; the bottom tab bar and this
  // Room/Wardrobe toggle are the only navigation this screen needs.
  return (
    <Screen edges={['top']}>
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
        // Full-bleed, edge to edge (no side padding, no card border/radius) — fills every
        // bit of space down to the tab bar instead of sitting in a small inset card.
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
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.wardrobeContent}>
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
  const { label: _label, floorStanding, ...position } = layout;
  return (
    <View style={[styles.slot, position]}>
      {item ? (
        <Pressable style={styles.slotFilled} onPress={onPress}>
          <ItemArt item={item} fill align={floorStanding ? 'bottom' : 'mid'} />
        </Pressable>
      ) : (
        // No "+ Label" chip — just a soft dashed outline, still tappable, without a text
        // callout cluttering an otherwise-empty scene.
        <Pressable style={styles.slotEmpty} onPress={onPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sceneTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 6, marginBottom: 10 },
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
  // Full-bleed: no border/radius/side padding — the scene runs edge to edge and fills
  // every bit of vertical space down to the tab bar instead of sitting in an inset card.
  scene: { flex: 1 },
  wallZone: { position: 'absolute', top: 0, left: 0, right: 0, height: '48%' },
  floorZone: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%' },
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  slotFilled: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  // A quiet dashed outline instead of a "+ Label" chip — still tappable, without a text
  // callout cluttering an otherwise-empty scene.
  slotEmpty: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(44,62,45,0.22)',
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
  wardrobeContent: { paddingHorizontal: 16, paddingBottom: 8 },
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
