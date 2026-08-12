import { useState } from 'react';
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Line, G } from 'react-native-svg';

/**
 * The room's wooden floor, drawn in one-point perspective.
 *
 * This replaced a row of fixed-width vertical stripes ported from the website's `.room-floor`
 * gradient. Parallel stripes of constant width are the one thing a real floor never looks
 * like — a floor recedes, so its boards converge — and flat stripes read as a striped WALL
 * standing behind Hammy rather than a surface he stands on.
 *
 * The first attempt then over-corrected in the other direction: it ran the boards to a single
 * vanishing POINT sitting on the wall/floor seam. Converging to a point is precisely how you
 * draw a plane that never ends, so a bedroom floor came out looking like an airfield. A real
 * room's floor is bounded — it stops at the far wall, and the boards still have width where
 * they get there.
 *
 * So the vanishing point lives ABOVE the frame (`k` below sets how far), and the floor is the
 * bounded trapezoid between the front edge and the wall seam:
 *
 *   - `k` is the width of a board at the back wall as a fraction of its width at your feet.
 *     0.52 is a small room. Lower looks like a corridor, 1.0 is flat stripes again.
 *   - The front edge is drawn `1/k` times wider than the floor, so that after converging it
 *     lands exactly on the full width at the back. The floor fills its rectangle at both ends
 *     rather than tapering away from the back corners.
 *   - Cross seams are evenly spaced in WORLD depth and then projected, so they bunch toward
 *     the wall on their own. The last one lands exactly on the seam, which is what gives the
 *     floor a far edge instead of an endless one.
 *
 * Board tone varies by low-alpha overlay rather than per-board fill colours, so the depth
 * gradient shows through all of them and one wood colour stays in charge.
 */

/** Board width at the back wall / board width at the front edge. Lower = deeper room. */
const BACK_SCALE = 0.52;
const BOARD_FRONT_W = 74;   // board width at the front edge
const SEAM_ROWS = 6;        // cross seams between the front edge and the wall

const BOARD_TINT = ['#FFFFFF', '#000000', '#FFFFFF', '#000000'];
const BOARD_ALPHA = [0.05, 0.045, 0.025, 0.02];

export function RoomFloor({
  style,
  pointerEvents,
}: {
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
}) {
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== w || height !== h) setSize({ w: width, h: height });
  };

  return (
    <View style={style} onLayout={onLayout} pointerEvents={pointerEvents}>
      {w > 0 && h > 0 ? <FloorSvg w={w} h={h} /> : null}
    </View>
  );
}

function FloorSvg({ w, h }: { w: number; h: number }) {
  const cx = w / 2;
  const k = BACK_SCALE;
  /** Horizontal position at the back wall (y=0) of a point that sits at `x` on the front edge. */
  const toBack = (x: number) => cx + (x - cx) * k;

  // Widen the front edge so the converged back edge covers the full width exactly.
  const spread = w / k;
  const left = cx - spread / 2;
  const count = Math.ceil(spread / BOARD_FRONT_W);

  const boards = [];
  const edges = [];
  for (let i = 0; i < count; i++) {
    const x0 = left + i * BOARD_FRONT_W;
    const x1 = x0 + BOARD_FRONT_W;
    // A trapezoid, not a triangle: the board still has width at the far wall.
    boards.push(
      <Path
        key={`b${i}`}
        d={`M ${x0} ${h} L ${x1} ${h} L ${toBack(x1)} 0 L ${toBack(x0)} 0 Z`}
        fill={BOARD_TINT[i % BOARD_TINT.length]}
        fillOpacity={BOARD_ALPHA[i % BOARD_ALPHA.length]}
      />,
    );
    edges.push(
      <Line key={`e${i}`} x1={x0} y1={h} x2={toBack(x0)} y2={0}
        stroke="#7C5430" strokeOpacity={0.28} strokeWidth={1.1} />,
    );
  }

  // Seams evenly spaced in world depth, then projected. dMax is the depth of the far wall.
  // s = d/(1+d) is the perspective fraction; y walks from the front edge up to the seam.
  const Hv = (h * k) / (1 - k);          // vanishing point sits at y = -Hv
  const dMax = h / Hv;
  const seams = [];
  for (let i = 1; i <= SEAM_ROWS; i++) {
    const d = (i / SEAM_ROWS) * dMax;
    const s = d / (1 + d);
    const y = h - s * (h + Hv);
    const t = y / h;                      // 1 at the front, 0 at the wall
    seams.push(
      <Line key={`s${i}`} x1={0} y1={y} x2={w} y2={y}
        stroke="#6E4A2A" strokeOpacity={0.10 + 0.15 * t} strokeWidth={0.5 + 1.2 * t} />,
    );
  }

  return (
    <Svg width={w} height={h}>
      <Defs>
        {/* Light comes from the front of the room: dark at the wall, warm at the feet. */}
        <LinearGradient id="floorDepth" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#94683D" />
          <Stop offset="0.5" stopColor="#B8834D" />
          <Stop offset="1" stopColor="#D3A26D" />
        </LinearGradient>
        {/* Contact shading in the wall/floor seam — the darkest part of any room. */}
        <LinearGradient id="floorSeam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3E2713" stopOpacity="0.42" />
          <Stop offset="1" stopColor="#3E2713" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="floorEdgeL" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="floorEdgeR" x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={w} height={h} fill="url(#floorDepth)" />
      <G>{boards}</G>
      <G>{edges}</G>
      <G>{seams}</G>
      {/* The far edge itself. Without a hard line here the floor still reads as running on
          past the wall, which was the whole complaint about the previous version. */}
      <Line x1={0} y1={0.5} x2={w} y2={0.5} stroke="#4A2F17" strokeOpacity={0.55} strokeWidth={2} />
      <Rect x={0} y={0} width={w} height={Math.max(10, h * 0.14)} fill="url(#floorSeam)" />
      <Rect x={0} y={0} width={w * 0.2} height={h} fill="url(#floorEdgeL)" />
      <Rect x={w * 0.8} y={0} width={w * 0.2} height={h} fill="url(#floorEdgeR)" />
    </Svg>
  );
}
