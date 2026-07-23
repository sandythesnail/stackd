import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Txt, Hammy, ItemArt, Wallpaper, ListRow } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';
import { shopItemsReal } from '@/content';
import type { RoomSlot, ShopItemReal } from '@/content';

type SlotLayout = { label: string; floorStanding?: boolean } & ViewStyle;

type FurnitureSlot = Exclude<RoomSlot, 'wallpaper'>;
type WardrobeCategory = 'hat' | 'accessory' | 'exclusive';

/** Loosely ported from the website's room-slot-* CSS rules (app.css), then sized up a LOT
 * further — the website's own percentages, and even a first larger pass on top of them,
 * still rendered tiny at mobile's much smaller scene size. `floorStanding` marks furniture
 * that should sit ON something (the floor, a desk) rather than hang on the wall — see
 * RoomSlotBox's `align="bottom"` below, which anchors the item's own art to the bottom of
 * its box instead of dead-center, so e.g. a lamp's actual base lands at the bottom of its
 * slot instead of floating in the middle of empty letterboxed space above the floor line.
 * Wallpaper isn't here — it's rendered as the wall zone itself, not a positioned slot. */
const SLOT_LAYOUT: Record<FurnitureSlot, SlotLayout> = {
  // Shifted up to line up with the poster's own top (4%) instead of sitting lower than it.
  window: { label: 'Window', top: '4%', left: '24%', width: '48%', height: '40%' },
  wall: { label: 'Wall art', top: '4%', left: '3%', width: '21%', height: '41%' },
  // This is the layout for every lamp EXCEPT Fairy Lights — see FairyLightsGarland below,
  // which replaces this slot's normal rendering entirely when that item is equipped.
  lamp: { label: 'Lamp', top: '2%', right: '2%', width: '20%', height: '54%', floorStanding: true },
  // Pushed back and up (bottom sits right at the wall/floor seam, 48% up from the bottom —
  // see floorZone's own 52% height) instead of down at the literal bottom edge, so it reads
  // as tucked into the back corner rather than out front — but still bottom-anchored right
  // on that seam line (not just placed high up with nothing under it), so it doesn't float.
  plant: { label: 'Plant', bottom: '46%', right: '2%', width: '15%', height: '20%', floorStanding: true },
  // Right under the window (window now starts at top 4%, height 40% -> ends at 44%).
  bed: { label: 'Bed', top: '44%', left: '20%', width: '56%', height: '46%', floorStanding: true },
  // Centered under Hammy (see the `hammy` style's alignSelf: 'center') — shifted further up
  // (bottom raised off the literal floor edge) so more of it reads as sitting BEHIND Hammy's
  // body rather than only trailing out below his feet, so the two read as "standing on it"
  // rather than two separate unrelated floor items.
  rug: { label: 'Rug', bottom: '8%', left: '16%', width: '66%', height: '50%', floorStanding: true },
  // Chasing "higher" all the way up to the literal ceiling (top 0%) put it above the window
  // instead of under it, which read wrong. Switched to bottom-anchoring like the plant above
  // (bottom + height, same 20% height) instead of top-anchoring, so its position is set by
  // where its base sits rather than by squeezing between a fixed top and the render size.
  // Window ends at top 4% + height 40% = 44% from the top, i.e. 56% up from the bottom —
  // bottom: 56% - height(20%) = 36% puts the box's top edge right there, flush under the
  // window. Left/width (centered under the window, span 24%-72%, center 48%) kept from the
  // last size pass: left = 48 - 52/2 = 22%.
  desk: { label: 'Desk', bottom: '36%', left: '22%', width: '52%', height: '20%', floorStanding: true },
};

// Rendered in this order, and later entries paint over earlier ones (plain DOM/JSX stacking,
// no explicit z-index) — rug goes right after the wall-mounted pair so it sits BEHIND
// everything else that legitimately overlaps it: the furniture that can sit partway onto a
// rug (normal), and Hammy standing on it (the whole point of the rug reaching up that far).
// plant renders AFTER lamp on purpose too — its box overlaps the top of the lamp's own tall
// strip (see the plant entry above), and a plant sitting in front of the lamp reads right; a
// lamp painted on top would instead hide it.
const FURNITURE_SLOTS: FurnitureSlot[] = ['window', 'wall', 'rug', 'lamp', 'bed', 'plant', 'desk'];

// Fixed-width vertical stripes, ported pixel-for-pixel from the website's .room-floor
// (repeating-linear-gradient(90deg, #C6935B 0 58px, #B98650 58px 62px)) — a plain two-tone
// gradient here used to have no stripes at all. More entries than any real screen is wide
// enough to need; the floor's own overflow:hidden clips the rest.
const FLOOR_STRIPES = Array.from({ length: 24 }, (_, i) => i);

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
          <View style={styles.floorZone}>
            <View style={styles.floorStripes}>
              {FLOOR_STRIPES.map((i) => <View key={i} style={styles.floorStripe} />)}
            </View>
          </View>

          {FURNITURE_SLOTS.map((slot) => {
            const item = bySlot(slot);
            if (slot === 'lamp' && item?.id === 'lamp_fairy') {
              return <FairyLightsGarland key={slot} item={item} onPress={goToRoomShop} />;
            }
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

          <Pressable style={styles.furnitureCta} onPress={goToRoomShop}>
            <Txt style={styles.furnitureCtaTxt}>Buy some furniture from the Furniture Farm! 🛒</Txt>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.wardrobeContent}>
          <View style={styles.wardrobeStage}>
            <View style={styles.wardrobeStageStripes} pointerEvents="none">
              {FLOOR_STRIPES.map((i) => <View key={i} style={styles.floorStripe} />)}
            </View>
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

// Renders nothing at all for an empty slot — no placeholder box, dashed or otherwise. The
// furnitureCta banner is the one, single way into the shop from this screen now, so an
// unfurnished room just reads as an empty room instead of a scene full of "+" outlines.
function RoomSlotBox({
  layout, item, onPress,
}: { layout: SlotLayout; item?: ShopItemReal; onPress: () => void }) {
  if (!item) return null;
  const { label: _label, floorStanding, ...position } = layout;
  return (
    <View style={[styles.slot, position]}>
      <Pressable style={styles.slotFilled} onPress={onPress}>
        <ItemArt item={item} fill align={floorStanding ? 'bottom' : 'mid'} />
      </Pressable>
    </View>
  );
}

// Fairy Lights only, replacing the normal single "lamp" slot entirely — a row of GARLAND_COUNT
// repeated copies spanning the full width of the scene, right under the furnitureCta pill
// near the top. The item's own art is natively horizontal now (viewBox 120x45 — it used to
// be drawn tall and get rotated 90° just for this one screen, which left it sideways
// everywhere else it rendered, like the shop listing), so no rotation is needed here anymore.
// Uses a single screen-width-derived cell size instead of per-cell onLayout measurement —
// every cell is identical, so one calculation covers the whole row. Cells overlap slightly
// (a negative margin) so the repeats read as one continuous garland instead of visibly
// separated segments.
const GARLAND_COUNT = 3;
const GARLAND_OVERLAP = 0.12;
function FairyLightsGarland({ item, onPress }: { item: ShopItemReal; onPress: () => void }) {
  const { width: winW } = useWindowDimensions();
  // Oversized so GARLAND_COUNT cells, pulled together by the overlap margin below, still
  // span the full screen width instead of leaving a gap short of the right edge.
  const cellW = (winW / GARLAND_COUNT) * (1 + GARLAND_OVERLAP);
  // The item's own art is 120x45 (wide) — height ~= width * 45/120. Letterboxes to fit if a
  // cell ends up a bit off that ratio (ItemArt's own preserveAspectRatio), so this doesn't
  // need to be exact.
  const cellH = cellW * (45 / 120);
  return (
    <View style={[styles.slot, styles.garlandBand]}>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: GARLAND_COUNT }, (_, i) => (
          <Pressable
            key={i}
            onPress={onPress}
            style={{ width: cellW, height: cellH, marginLeft: i === 0 ? 0 : -cellW * GARLAND_OVERLAP }}
          >
            <ItemArt item={item} fill align="mid" />
          </Pressable>
        ))}
      </View>
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
  floorZone: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%',
    backgroundColor: '#B98650', overflow: 'hidden',
  },
  floorStripes: { flex: 1, flexDirection: 'row' },
  floorStripe: { width: 58, height: '100%', backgroundColor: '#C6935B', marginRight: 4 },
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  slotFilled: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  // Right under the furnitureCta pill (top: 14, roughly 40-ish tall) and spanning the full
  // width of the scene. Nudged up slightly from 60.
  garlandBand: { top: 52, left: 0, right: 0 },
  hammy: { position: 'absolute', bottom: '12%', alignSelf: 'center' },
  furnitureCta: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    maxWidth: '84%',
    backgroundColor: colors.pink,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 16,
    shadowColor: '#2C3E2D',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  furnitureCtaTxt: { fontFamily: font.extra, fontSize: 12.5, color: colors.white, textAlign: 'center' },
  wardrobeContent: { paddingHorizontal: 16, paddingBottom: 8 },
  // Same striped floor as the Room tab's floorZone, not its own pink — the wardrobe is
  // still Hammy's room, just browsing outfits instead of furniture.
  wardrobeStage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B98650',
    borderRadius: 24,
    overflow: 'hidden',
    paddingTop: 22,
    paddingBottom: 22,
    minHeight: 240,
  },
  wardrobeStageStripes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
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
