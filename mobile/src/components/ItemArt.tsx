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
 * matching the website's per-slot-shaped CSS containers instead of forcing a square. */
export function ItemArt({
  item, size = 92, fill, style,
}: { item: ShopItemReal; size?: number; fill?: boolean; style?: ViewStyle }) {
  const vb = item.viewBox || CAT_VIEWBOX[item.category] || '0 0 120 120';
  const xml = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${item.svg}</svg>`;
  return <SvgXml xml={xml} width={fill ? '100%' : size} height={fill ? '100%' : size} style={style} />;
}
