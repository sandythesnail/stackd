/** Path geometry for the /experiments/path prototype. Pure math, no React — kept separate
 * so the winding shape can be tuned without touching the rendering. */

export type Pt = { x: number; y: number };

/** Vertical distance between consecutive nodes. */
export const NODE_GAP = 96;
/** Rendered width of a node's diamond BEFORE rotation. Rotated 45°, its bounding box is
 * this × √2 ≈ 82px, which is also the tap target — comfortably over the 44px floor. */
export const NODE_SIZE = 58;
export const NODE_BOX = Math.ceil(NODE_SIZE * Math.SQRT2);

/** How far a node swings from the centre line at the extremes. */
const AMPLITUDE = 78;
/** Radians of phase per node. ~0.85 gives roughly seven nodes per full left-right-left
 * cycle, which reads as a wandering trail rather than a zigzag or a near-straight line. */
const PHASE_STEP = 0.85;

/** Where each node sits, as a sine wave down the column.
 *
 * A sine rather than an alternating left/right pattern on purpose: alternating puts every
 * node at one of two x values, which reads as two columns with a line stitched between them.
 * A sine passes THROUGH the centre on the way between extremes, so the trail actually curves.
 *
 * `outdent` pushes individual nodes further off the line than the wave would take them —
 * used for the optional real-life lesson at the end of each module, so "not on the main
 * line" is expressed by position and not only by styling.
 */
export function snakePositions(
  count: number,
  centerX: number,
  outdent: (index: number) => number = () => 1,
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const swing = Math.sin(i * PHASE_STEP) * AMPLITUDE * outdent(i);
    pts.push({ x: centerX + swing, y: NODE_BOX / 2 + i * NODE_GAP });
  }
  return pts;
}

/** Total height a section's path body needs to hold `count` nodes. */
export function pathHeight(count: number): number {
  return count > 0 ? (count - 1) * NODE_GAP + NODE_BOX : 0;
}

/** An SVG `d` that runs smoothly through every point (Catmull-Rom converted to cubic
 * béziers). Drawing straight line segments between the nodes would defeat the sine —
 * the trail has to curve as much as the nodes do or the whole thing reads as a zigzag. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}
