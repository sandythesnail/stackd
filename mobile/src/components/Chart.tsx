import { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { buildStackedAreaChart } from '@/charts';
import type { SeriesPoint } from '@/simulators';
import { colors } from '@/theme';

const CHART_W = 480;
const CHART_H = 220;

/** Time-series area chart for the Tools calculators — same stacked-area shape as the
 * website's Compound Interest / Loan Payoff charts (buildStackedAreaChart in charts.ts),
 * redrawn with react-native-svg. Measures its own width via onLayout so it fills its card
 * responsively while keeping the website's 480:220 aspect ratio.
 *
 * `tone="growth"` stacks two areas (base=contributed, delta=interest earned), matching the
 * Compound Interest chart. `tone="debt"` draws a single area from zero up to the balance,
 * matching the Loan Payoff / Credit Card Warning charts — pass a `zero` key alongside the
 * real data as baseKey in that case. */
export function StackedAreaChart({
  points, baseKey, totalKey, tone,
}: { points: SeriesPoint[]; baseKey: string; totalKey: string; tone: 'growth' | 'debt' }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const h = w ? (w * CHART_H) / CHART_W : 0;
  if (!points.length) return <View onLayout={onLayout} style={{ width: '100%' }} />;
  const chart = buildStackedAreaChart(points, baseKey, totalKey, { width: CHART_W, height: CHART_H });
  const lineColor = tone === 'growth' ? colors.greenDark : colors.pinkDark;

  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      {w > 0 ? (
        <Svg width={w} height={h} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          {tone === 'growth' ? (
            <Path d={chart.baseArea} fill={colors.greenSoft} opacity={0.55} />
          ) : null}
          <Path d={chart.deltaArea} fill={colors.pinkBorder} opacity={tone === 'growth' ? 0.6 : 0.55} />
          <Path d={chart.totalLine} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
