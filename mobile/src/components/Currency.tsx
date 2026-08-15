import Svg, { Circle, Text as SvgText, Polygon, Line, Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

/** Gold coin token — ported verbatim from the website's ICON_COIN inline SVG (app.js)
 * so mobile and web show the same $ coin instead of a plain gradient circle. */
export function Coin({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill="#FFC400" stroke="#8A5A00" strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={7.3} fill="none" stroke="#8A5A00" strokeWidth={1} opacity={0.55} />
      <SvgText x={12} y={16.2} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={11} fontWeight="800" fill="#8A5A00">$</SvgText>
    </Svg>
  );
}

/** Faceted blue diamond token — ported verbatim from the website's ICON_DIAMOND inline
 * SVG (app.js) so mobile and web show the same gem instead of a rotated square. */
export function Diamond({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="8,6 16,6 20,10.5 12,19 4,10.5" fill="#159CDE" stroke="#0A4A6E" strokeWidth={1.2} strokeLinejoin="round" />
      <Polygon points="4,10.5 12,19 12,10.5" fill="#0A4A6E" opacity={0.18} />
      <Polygon points="8,6 16,6 20,10.5 4,10.5" fill="#ffffff" opacity={0.3} />
      <Polygon points="9.2,7.4 14.8,7.4 17,10.5 7,10.5" fill="#ffffff" opacity={0.18} />
      <Line x1={4} y1={10.5} x2={20} y2={10.5} stroke="#0A4A6E" strokeWidth={0.6} opacity={0.6} />
      <Line x1={12} y1={6} x2={12} y2={19} stroke="#0A4A6E" strokeWidth={0.6} opacity={0.55} />
      <Line x1={8} y1={6} x2={9.2} y2={10.5} stroke="#0A4A6E" strokeWidth={0.5} opacity={0.4} />
      <Line x1={16} y1={6} x2={14.8} y2={10.5} stroke="#0A4A6E" strokeWidth={0.5} opacity={0.4} />
      <Path d="M18.5 4.5l0.6 1.5 1.5 0.6-1.5 0.6-0.6 1.5-0.6-1.5-1.5-0.6 1.5-0.6z" fill="#ffffff" opacity={0.85} />
    </Svg>
  );
}

/** Wrapped-gift token — ported verbatim from the website's ICON_GIFT inline SVG (app.js),
 * used for mystery box status/ribbons instead of a 🎁 emoji. */
/** A wrapped present. `box`/`lid`/`line` are separable so a row of them can be a row of
 * DIFFERENT presents — see GIFT_COLORS, used by the daily-reward calendar. The ribbon stays
 * gold on every one, which is what keeps seven different colours reading as one set. */
export function Gift({
  size = 16,
  box = '#FF6FA0',
  lid = '#FF4F8A',
  line = '#8A2646',
}: { size?: number; box?: string; lid?: string; line?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={11} width={16} height={8.5} rx={1} fill={box} stroke={line} strokeWidth={1.4} />
      <Rect x={3} y={8} width={18} height={3.4} rx={0.9} fill={lid} stroke={line} strokeWidth={1.4} />
      <Rect x={10.7} y={8} width={2.6} height={11.5} fill="#FFD23F" stroke="#8A5A00" strokeWidth={0.8} />
      <Path d="M12 8c-1.6-3.2-5.4-3.2-5.4-0.2 0 1.7 2.5 1 5.4 0.2z" fill="#FFD23F" stroke="#8A5A00" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M12 8c1.6-3.2 5.4-3.2 5.4-0.2 0 1.7-2.5 1-5.4 0.2z" fill="#FFD23F" stroke="#8A5A00" strokeWidth={0.8} strokeLinejoin="round" />
      <Rect x={4} y={11} width={16} height={1.6} fill="#ffffff" opacity={0.25} />
    </Svg>
  );
}

/**
 * One present per day of the reward week.
 *
 * Every tile used to carry the same coin glyph next to its own number, which made the glyph
 * pure decoration — the number said everything, seven times over, in identical yellow. Seven
 * different presents give the row something to read at a glance (where am I in the week?) and
 * make it look like a week of presents rather than a receipt.
 *
 * Deliberately NOT in rainbow order. Adjacent days want to look as unlike each other as
 * possible, and a spectrum puts its most similar neighbours side by side — red beside orange,
 * blue beside indigo — which is the opposite of what a row of seven small boxes needs. Hues
 * jump instead: red, blue, purple, green, yellow, orange, pink.
 *
 * Pastel boxes with a deeper lid of the same hue, so they stay bright at small sizes without
 * going neon.
 */
export const GIFT_COLORS = [
  { box: '#FFB3B8', lid: '#FF8F98', line: '#8A2A38' }, // red
  { box: '#A9DCF5', lid: '#7CC7EE', line: '#1B5877' }, // blue
  { box: '#DCB6EE', lid: '#C48FE2', line: '#5C2A75' }, // purple
  { box: '#B6E5AE', lid: '#8FD684', line: '#2E6B27' }, // green
  { box: '#FFE7A0', lid: '#FFD764', line: '#8A6B12' }, // yellow
  { box: '#FFCBA1', lid: '#FFAE74', line: '#8A4A1A' }, // orange
  { box: '#FFC2DE', lid: '#FF9CC6', line: '#8A2A5C' }, // pink, and day 7 is the big one
] as const;

/** The same present with the colour drained out, for a day that was missed. */
export const GIFT_MISSED = { box: '#E4E0D6', lid: '#D5D0C4', line: '#A39D8F' } as const;

/** Orange streak flame token — an actual flame glyph (was a plain rounded-rect blob). */
export function Flame({ size = 17 }: { size?: number }) {
  return <Ionicons name="flame" size={size} color={colors.flame} />;
}
