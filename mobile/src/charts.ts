import type { SeriesPoint } from '@/simulators';

/** Generic stacked-area chart builder — ported verbatim from the website's
 * buildStackedAreaChart (app.js). Two series stack: a base value (e.g. contributed) and a
 * delta on top (e.g. interest earned), so the gap between the two lines reads as its own
 * visual quantity. Returns SVG path `d` strings in a fixed width x height viewBox. */
export function buildStackedAreaChart(
  points: SeriesPoint[],
  baseKey: string,
  totalKey: string,
  { width = 480, height = 220, padding = 8 }: { width?: number; height?: number; padding?: number } = {}
) {
  const maxY = Math.max(...points.map((p) => p[totalKey]), 1);
  const n = points.length;
  const xAt = (i: number) => padding + (i / (n - 1)) * (width - padding * 2);
  const yAt = (val: number) => height - padding - (val / maxY) * (height - padding * 2);
  const baseline = height - padding;

  const basePts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[baseKey]).toFixed(1)}`);
  const totalPts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[totalKey]).toFixed(1)}`);

  const baseArea = `M${padding},${baseline} L${basePts.join(' L')} L${(width - padding).toFixed(1)},${baseline} Z`;
  const deltaArea = `M${basePts[0]} L${basePts.join(' L')} L${totalPts.slice().reverse().join(' L')} Z`;
  const totalLine = `M${totalPts.join(' L')}`;

  return { baseArea, deltaArea, totalLine, width, height };
}
