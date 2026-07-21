import { useId } from 'react';
import { ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { ShopItemReal } from '@/content';

/** Per-category viewBox fallback, ported from the website's CAT_VIEWBOX (app.js). */
const CAT_VIEWBOX: Record<string, string> = {
  hat: '14 -4 92 46',
  accessory: '6 72 108 62',
};

/** Renders a ported shop item's raw SVG markup inside its own viewBox. Room-decor pieces
 * have real, often very non-square viewBoxes (a rug is 220x70, a wall poster 100x130) — the
 * default fixed-square `size` badly letterboxes those (they end up tiny slivers), so `fill`
 * makes the SVG fill its parent instead and lets its own aspect ratio drive the shape,
 * matching the website's per-slot-shaped CSS containers instead of forcing a square.
 *
 * `align` controls where the item lands within that box once its own aspect ratio stops it
 * from filling every edge (the normal case for room decor — a 70x110 lamp inside a wide
 * slot box, say). Defaults to dead center ('mid'), but floor-standing furniture (a lamp,
 * a desk) wants 'bottom' instead — centering leaves empty space below the item's own base,
 * which is what actually reads as "floating" above the floor rather than sitting on it. */
export function ItemArt({
  item, size = 92, fill, style, align = 'mid',
}: { item: ShopItemReal; size?: number; fill?: boolean; style?: ViewStyle; align?: 'mid' | 'bottom' }) {
  // Per-instance id namespacing, same reasoning as Hammy's EquippedItem: the raw item
  // markup ships literal defs ids (e.g. the Santa hat's "sh-g" red gradient), so the same
  // item drawn on two mounted screens at once (shop card + wardrobe tile behind it)
  // duplicates DOM ids on web and blanks every gradient-filled shape in later copies.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ns = `${item.id}-${uid}`;
  // Wallpaper items have no `svg` at all — they're a bg/pattern lookup, not raw item art
  // (see Wallpaper.tsx) — and shouldn't ever reach this component, but rendering nothing
  // beats crashing the whole screen if a future call site forgets that split.
  const svg = (item.svg ?? '')
    .replace(/id="([^"]+)"/g, (_, id) => `id="${id}-${ns}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${ns})`);
  const vb = item.viewBox || CAT_VIEWBOX[item.category] || '0 0 120 120';
  const preserveAspectRatio = align === 'bottom' ? 'xMidYMax meet' : 'xMidYMid meet';
  const xml = `<svg viewBox="${vb}" preserveAspectRatio="${preserveAspectRatio}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
  return <SvgXml xml={xml} width={fill ? '100%' : size} height={fill ? '100%' : size} style={style} />;
}
