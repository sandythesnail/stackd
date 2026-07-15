import { ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import type { ShopItemReal } from '@/content';

/** Ported from the website's wallCss (styles.css/app.css room-wall-zone + wallpaper items):
 * dotted sage/blush, diagonal stripe, or plain cream. Rendered as tiled SVG patterns rather
 * than CSS so the same textures show up pixel-for-pixel on native. */
const WALLPAPER: Record<string, { bg: string; dot?: string } | { bg: string; stripe: [string, string] }> = {
  wallpaper_sage: { bg: '#E0EAE0', dot: 'rgba(107,143,101,0.3)' },
  wallpaper_blush: { bg: '#FBF0F3', dot: 'rgba(212,137,158,0.3)' },
  wallpaper_cream: { bg: '#FAF6ED' },
  wallpaper_stripes: { bg: '#E0EAE0', stripe: ['#B2C9AE', '#E0EAE0'] },
};

/** The website's default, unequipped wall-zone look. */
const DEFAULT_WALL = { bg: '#E0EAE0', dot: 'rgba(107,143,101,0.15)' };

export function Wallpaper({ item, style }: { item?: ShopItemReal; style?: ViewStyle }) {
  const spec = (item && WALLPAPER[item.id]) || DEFAULT_WALL;
  const dot = 'dot' in spec ? spec.dot : undefined;
  const stripe = 'stripe' in spec ? spec.stripe : undefined;

  return (
    <Svg width="100%" height="100%" style={style}>
      <Defs>
        {dot ? (
          <Pattern id="wp-dots" patternUnits="userSpaceOnUse" width={16} height={16}>
            <Circle cx={8} cy={8} r={1.5} fill={dot} />
          </Pattern>
        ) : null}
        {stripe ? (
          <Pattern id="wp-stripe" patternUnits="userSpaceOnUse" width={20} height={20} patternTransform="rotate(45)">
            <Rect x={0} y={0} width={10} height={20} fill={stripe[0]} />
            <Rect x={10} y={0} width={10} height={20} fill={stripe[1]} />
          </Pattern>
        ) : null}
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={spec.bg} />
      {dot ? <Rect x={0} y={0} width="100%" height="100%" fill="url(#wp-dots)" /> : null}
      {stripe ? <Rect x={0} y={0} width="100%" height="100%" fill="url(#wp-stripe)" /> : null}
    </Svg>
  );
}
