import Svg, { Circle, Text as SvgText, Polygon, Line, Path } from 'react-native-svg';
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

/** Orange streak flame token — an actual flame glyph (was a plain rounded-rect blob). */
export function Flame({ size = 17 }: { size?: number }) {
  return <Ionicons name="flame" size={size} color={colors.flame} />;
}
