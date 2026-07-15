import { ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { ShopItemReal } from '@/content';

/** Per-category viewBox fallback, ported from the website's CAT_VIEWBOX (app.js). */
const CAT_VIEWBOX: Record<string, string> = {
  hat: '14 -4 92 46',
  accessory: '6 72 108 62',
};

/** Renders a ported shop item's raw SVG markup inside its own viewBox. */
export function ItemArt({ item, size = 92, style }: { item: ShopItemReal; size?: number; style?: ViewStyle }) {
  const vb = item.viewBox || CAT_VIEWBOX[item.category] || '0 0 120 120';
  const xml = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${item.svg}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}
