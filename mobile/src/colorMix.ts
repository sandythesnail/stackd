/** React Native has no CSS color-mix(); these replicate the two color-mix() calls the
 * website's badge CSS uses (.ach-icon.unlocked / .locked in app.css) so ported badge colors
 * look identical: a pale tint for the badge circle, a darkened tone for the icon stroke. */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

/** Mirrors `color-mix(in srgb, a pct%, b)` — pct% of `a` blended with the rest `b`. */
export function mixHex(a: string, b: string, pct: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const t = pct / 100;
  const r = ar * t + br * (1 - t);
  const g = ag * t + bg * (1 - t);
  const bl = ab * t + bb * (1 - t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
