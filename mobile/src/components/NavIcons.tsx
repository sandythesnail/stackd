import Svg, { Path, Polyline, Rect, Line } from 'react-native-svg';

/**
 * The website's own navigation icons, drawn here rather than approximated.
 *
 * The tab bar used to pull from three different icon fonts — Feather for most tabs, Ionicons
 * for the calculator, MaterialCommunityIcons for the pig — none of which matched what the same
 * six destinations wear in the web app's sidebar. Modules was a grid here and an open book
 * there; Progress was a bar chart here and a trend line there; Room was a pig here and a bed
 * there. Same product, same six places, three sets of symbols.
 *
 * These are the exact path data from app.html's sidebar, so the two apps are drawing the same
 * shapes rather than two designers' idea of "modules". Copying the geometry is what makes them
 * identical; picking the nearest glyph from a font would only make them similar.
 *
 * Stroke geometry matches the web too: strokeWidth 2 on a 24 viewBox, and NO explicit
 * linecap/linejoin, because the sidebar doesn't set them either. That last part is load-bearing
 * for Tools — see its note below.
 */

type IconProps = { color: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
});

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 2,
});

export function HomeIcon({ color, size = 25 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" {...stroke(color)} />
      <Polyline points="9 22 9 12 15 12 15 22" {...stroke(color)} />
    </Svg>
  );
}

/** A trend line, not a bar chart — the web's Progress icon. */
export function ProgressIcon({ color, size = 25 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...stroke(color)} />
      <Polyline points="17 6 23 6 23 12" {...stroke(color)} />
    </Svg>
  );
}

/** An open book, not a grid. */
export function ModulesIcon({ color, size = 25 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" {...stroke(color)} />
      <Path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" {...stroke(color)} />
    </Svg>
  );
}

/**
 * Tools: a calculator body and its display bar.
 *
 * The web's markup also carries nine "keys" as zero-length lines (x1===x2, y1===y2). With the
 * default butt linecap those render nothing at all, so the sidebar shows an empty box — which
 * is what this reproduces. They are deliberately not given round caps here: the point of this
 * file is that both apps draw the same icon, and quietly adding keys to one of them would
 * defeat it. If the keys are wanted, add `strokeLinecap="round"` in BOTH places at once.
 */
export function ToolsIcon({ color, size = 25 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={4} y={2} width={16} height={20} rx={2} {...stroke(color)} />
      <Line x1={8} y1={6} x2={16} y2={6} {...stroke(color)} />
    </Svg>
  );
}

/** A bed, not a pig — the web's Room icon. */
export function RoomIcon({ color, size = 25 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M3 12h18v6a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1z"
        {...stroke(color)}
      />
      <Path d="M5 12V8a2 2 0 012-2h10a2 2 0 012 2v4" {...stroke(color)} />
    </Svg>
  );
}

export function ShopIcon({ color, size = 25 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" {...stroke(color)} />
      <Line x1={3} y1={6} x2={21} y2={6} {...stroke(color)} />
      <Path d="M16 10a4 4 0 01-8 0" {...stroke(color)} />
    </Svg>
  );
}
