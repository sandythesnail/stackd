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
  // `i / (n - 1)` is `0/0 = NaN` for a single-point series (n === 1) — e.g. a 0-year
  // compound-growth projection or a loan that's already paid off at the starting balance,
  // both of which return exactly one point (see simulators.ts). NaN coordinates produce a
  // broken/invisible SVG path with no error thrown. A lone point has no span to place
  // along, so center it instead.
  const xAt = (i: number) => (n <= 1 ? width / 2 : padding + (i / (n - 1)) * (width - padding * 2));
  const yAt = (val: number) => height - padding - (val / maxY) * (height - padding * 2);
  const baseline = height - padding;

  const basePts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[baseKey]).toFixed(1)}`);
  const totalPts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[totalKey]).toFixed(1)}`);

  const baseArea = `M${padding},${baseline} L${basePts.join(' L')} L${(width - padding).toFixed(1)},${baseline} Z`;
  const deltaArea = `M${basePts[0]} L${basePts.join(' L')} L${totalPts.slice().reverse().join(' L')} Z`;
  const totalLine = `M${totalPts.join(' L')}`;

  return { baseArea, deltaArea, totalLine, width, height };
}
