import { useState } from 'react';
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Line, G } from 'react-native-svg';

/**
 * The room's wooden floor, drawn in one-point perspective.
 *
 * What this replaces was a row of fixed-width vertical stripes ported pixel-for-pixel from
 * the website's `.room-floor` repeating-linear-gradient. Parallel stripes of constant width
 * are the one thing a real floor never looks like: a floor recedes, so its boards converge.
 * Flat stripes read as a striped WALL lying behind Hammy rather than a surface he stands on,
 * which is why the scene had no sense of depth.
 *
 * Everything here hangs off a single vanishing point at the middle of the wall/floor seam
 * (the top edge of this component, which is exactly where the wall zone ends):
 *
 *   - Boards are triangles from that point out to the front edge, so they narrow with
 *     distance instead of holding one width.
 *   - Cross seams use `y = h * a/(j + a)`, which bunches them toward the horizon the way
 *     foreshortening actually does. Even spacing would undo the convergence.
 *   - Light falls from the front of the room, so the boards darken toward the back, and a
 *     soft occlusion band sits in the seam where floor meets wall.
 *
 * Board tone varies by a low-alpha overlay rather than by per-board fill colours, so the
 * depth gradient underneath shows through all of them and one wood colour stays in charge.
 */

const BOARD_FRONT_W = 62;   // board width at the front edge, matching the old stripe rhythm
const SEAM_ROWS = 7;        // cross seams drawn from the front edge back
const SEAM_CURVE = 2.2;     // higher = seams bunch harder toward the horizon

/** Alternating board shading — index % 4 so the pattern doesn't read as a hard stripe. */
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
  const vpx = w / 2;              // vanishing point sits centred on the wall seam
  // The front edge is drawn wider than the floor so the outermost boards still cover the
  // bottom corners once they have converged inward; the Svg itself clips the overhang.
  const spread = w * 1.7;
  const left = vpx - spread / 2;
  const count = Math.ceil(spread / BOARD_FRONT_W);

  const boards = [];
  for (let i = 0; i < count; i++) {
    const x0 = left + i * BOARD_FRONT_W;
    const x1 = x0 + BOARD_FRONT_W;
    boards.push(
      <Path
        key={`b${i}`}
        d={`M ${x0} ${h} L ${x1} ${h} L ${vpx} 0 Z`}
        fill={BOARD_TINT[i % BOARD_TINT.length]}
        fillOpacity={BOARD_ALPHA[i % BOARD_ALPHA.length]}
      />,
    );
  }

  // Board edges. Thinner and fainter with distance, since a seam 4m away is not the same
  // mark on the eye as one underfoot.
  const edges = [];
  for (let i = 0; i <= count; i++) {
    const x = left + i * BOARD_FRONT_W;
    edges.push(
      <Line key={`e${i}`} x1={x} y1={h} x2={vpx} y2={0} stroke="#7C5430" strokeOpacity={0.30} strokeWidth={1.1} />,
    );
  }

  // Cross seams. j counts rows back from the front edge; a/(j+a) is the foreshortening.
  const seams = [];
  for (let j = 1; j <= SEAM_ROWS; j++) {
    const y = h * (SEAM_CURVE / (j + SEAM_CURVE));
    const t = y / h;                      // 1 at the front, →0 at the horizon
    seams.push(
      <Line
        key={`s${j}`}
        x1={0} y1={y} x2={w} y2={y}
        stroke="#6E4A2A"
        strokeOpacity={0.10 + 0.16 * t}
        strokeWidth={0.5 + 1.3 * t}
      />,
    );
  }

  return (
    <Svg width={w} height={h}>
      <Defs>
        {/* Light comes from the front of the room: dark at the horizon, warm at the feet. */}
        <LinearGradient id="floorDepth" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8A6038" />
          <Stop offset="0.45" stopColor="#B07C48" />
          <Stop offset="1" stopColor="#D2A06A" />
        </LinearGradient>
        {/* Contact shading in the wall/floor seam — the darkest part of any room. */}
        <LinearGradient id="floorSeam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3E2713" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#3E2713" stopOpacity="0" />
        </LinearGradient>
        {/* Corners fall off slightly, which keeps the eye on Hammy in the middle. */}
        <LinearGradient id="floorEdgeL" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.16" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="floorEdgeR" x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.16" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={w} height={h} fill="url(#floorDepth)" />
      <G>{boards}</G>
      <G>{edges}</G>
      <G>{seams}</G>
      <Rect x={0} y={0} width={w} height={Math.max(10, h * 0.16)} fill="url(#floorSeam)" />
      <Rect x={0} y={0} width={w * 0.22} height={h} fill="url(#floorEdgeL)" />
      <Rect x={w * 0.78} y={0} width={w * 0.22} height={h} fill="url(#floorEdgeR)" />
    </Svg>
  );
}
