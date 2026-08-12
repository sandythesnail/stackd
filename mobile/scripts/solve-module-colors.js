#!/usr/bin/env node
/**
 * Solves (and checks) the eleven module accent colors in src/theme.ts.
 *
 *   node scripts/solve-module-colors.js           anneal a fresh palette, print both scales
 *   node scripts/solve-module-colors.js --check    verify the CURRENT theme.ts values
 *
 * --check is the regression guard. Every constraint below was a real defect that shipped
 * first, and each one is invisible by eye on a single screen:
 *
 *   reserved   A module chip must not look like `colors.reward` (#F0C22E), which means
 *              "come collect / recommended" app-wide and is drawn on the Modules tab as the
 *              recommended row's border, head fill and tag. A yellow Loans chip once sat
 *              0.0485 from it, so a module impersonated the "start here" affordance.
 *   cvd        Hues that separate for normal vision can collapse under dichromacy. A previous
 *              revision put investing and taxes 0.0031 apart under protanopia - the same
 *              color for ~1% of men. Lightness spread is the fix, since dichromacy preserves
 *              lightness.
 *   surface    `mod.color` is drawn as a bare shape (hero border, progress fill over
 *              colors.track, XP chart column), not always behind a glyph, so it is measured
 *              against white, cream and track - not only against its own foreground.
 *   contrast   The chip's number is 16px, so it is not "large text" and needs 4.5:1. We hold
 *              4.6:1.
 *   brown      Brown is orange gone dark and dull; chartreuse is yellow-green gone saturated.
 *              Neither is a hue you can simply avoid - both are corners of the L/C space that
 *              a hue falls into, so they are bounded rather than banned.
 *
 * Zero dependencies, same as check-modal-routes.js. Wire it into the build so a regression
 * can never ship.
 */

// ---------------------------------------------------------------- sRGB <-> OKLab/OKLCH
const toLin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toSrgb = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const hex2rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const rgb2hex = (r, g, b) => '#' + [r, g, b]
  .map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0').toUpperCase()).join('');

function rgb2oklab(r, g, b) {
  r = toLin(r); g = toLin(g); b = toLin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklab2rgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
          toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
          toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
}
const inGamut = (L, C, H) => {
  const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
  return oklab2rgb(L, a, b).every(v => v >= -0.002 && v <= 1.002);
};
/** Nearest in-gamut sRGB hex for an OKLCH triple, reducing chroma until it fits. */
function fit(L, C, H) {
  let c = C;
  while (c > 0 && !inGamut(L, c, H)) c -= 0.001;
  const a = c * Math.cos(H * Math.PI / 180), b = c * Math.sin(H * Math.PI / 180);
  return rgb2hex(...oklab2rgb(L, a, b));
}
function lab(hex) { const [L, A, B] = rgb2oklab(...hex2rgb(hex)); return [L, A, B]; }
function dE(x, y) { const a = lab(x), b = lab(y); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function lum(hex) { const [r, g, b] = hex2rgb(hex).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function cr(x, y) { const a = lum(x), b = lum(y), [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); }

/** Viénot-Brettel-Mollon 1999 dichromat simulation. */
function sim(hex, type) {
  if (type === 'norm') return hex;
  const [r, g, b] = hex2rgb(hex).map(toLin);
  const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  let L2 = L, M2 = M;
  if (type === 'prot') L2 = 2.02344 * M - 2.52581 * S; else M2 = 0.494207 * L + 1.24827 * S;
  const clamp = v => Math.max(0, Math.min(1, v));
  return rgb2hex(
    toSrgb(clamp(0.080944 * L2 - 0.130504 * M2 + 0.116721 * S)),
    toSrgb(clamp(-0.0102485 * L2 + 0.0540194 * M2 - 0.113615 * S)),
    toSrgb(clamp(-0.000365294 * L2 - 0.00412163 * M2 + 0.693513 * S)));
}

// ---------------------------------------------------------------- palette definition
// Hues are chosen by hand (identity: spending is pink, saving is teal, ...). Only lightness
// and chroma are solved. Green-weighted by request: four greens, two blues. There is no
// yellow module and there cannot be one - see `reserved` above.
const HUE = {
  scams: 20, risk: 50, earning: 145, career: 168, loans: 178, saving: 192,
  credit: 232, taxes: 272, investing: 305, psychology: 332, spending: 355,
};
const KEYS = Object.keys(HUE);
const ORDER = ['earning', 'spending', 'saving', 'investing', 'credit', 'risk',
               'loans', 'taxes', 'psychology', 'career', 'scams'];
const RESERVED = { reward: '#F0C22E', rewardBg: '#FFF9E6', rewardBadgeBg: '#FFEDB0' };
const SURFACES = { white: '#FFFFFF', cream: '#FAF6ED', track: '#E7ECE3' };
const WARM = new Set(['scams', 'risk']);
const VIEWS = ['norm', 'deut', 'prot'];

const MIN_CONTRAST = 4.6;     // chip glyph, 16px so not large text
const MIN_SURFACE = 1.35;     // chip legible as a bare shape
const MIN_RESERVED = 0.09;    // never confusable with the reward tokens
const MIN_PAIR = 0.045;       // worst module pair, in ANY of the three views
const L_RANGE = [0.700, 0.880], C_RANGE = [0.080, 0.130];

// ---------------------------------------------------------------- scoring
function backgrounds(spec) { return Object.fromEntries(KEYS.map(k => [k, fit(spec[k].L, spec[k].C, HUE[k])])); }
function worstPair(bg) {
  let worst = Infinity, where = '';
  for (const view of VIEWS) {
    const s = Object.fromEntries(KEYS.map(k => [k, sim(bg[k], view)]));
    for (let i = 0; i < KEYS.length; i++)
      for (let j = i + 1; j < KEYS.length; j++) {
        const d = dE(s[KEYS[i]], s[KEYS[j]]);
        if (d < worst) { worst = d; where = `${KEYS[i]}/${KEYS[j]} (${view})`; }
      }
  }
  return { worst, where };
}
function solveFg(bgHex, H) {
  for (let L = 0.52; L > 0.20; L -= 0.005) {
    const hex = fit(L, 0.125, H);
    if (cr(bgHex, hex) >= MIN_CONTRAST) return hex;
  }
  return fit(0.20, 0.125, H);
}
function score(spec) {
  const bg = backgrounds(spec);
  let s = worstPair(bg).worst, pen = 0;
  for (const k of KEYS) {
    for (const t of Object.values(RESERVED)) { const d = dE(bg[k], t); if (d < MIN_RESERVED) pen += (MIN_RESERVED - d) * 3; }
    const surf = Math.min(...Object.values(SURFACES).map(v => cr(bg[k], v)));
    if (surf < MIN_SURFACE) pen += (MIN_SURFACE - surf) * 3;
    if (WARM.has(k) && spec[k].C < 0.10) pen += (0.10 - spec[k].C) * 10;
  }
  return s - pen;
}

// ---------------------------------------------------------------- report / check
function report(bg, fg) {
  console.log('     module       bg        fg        glyph  white cream track');
  for (const k of ORDER)
    console.log(' ', k.padEnd(11), bg[k], fg[k], cr(bg[k], fg[k]).toFixed(2).padStart(6),
      ...Object.values(SURFACES).map(v => cr(bg[k], v).toFixed(2).padStart(5)));
  for (const view of VIEWS) {
    const s = Object.fromEntries(KEYS.map(k => [k, sim(bg[k], view)]));
    const out = [];
    for (let i = 0; i < KEYS.length; i++)
      for (let j = i + 1; j < KEYS.length; j++) out.push([dE(s[KEYS[i]], s[KEYS[j]]), `${KEYS[i]}/${KEYS[j]}`]);
    out.sort((a, b) => a[0] - b[0]);
    console.log(`  ${view} closest: ` + out.slice(0, 3).map(([d, p]) => `${d.toFixed(4)} ${p}`).join('   '));
  }
}
function check(bg, fg) {
  const fail = [];
  const { worst, where } = worstPair(bg);
  if (worst < MIN_PAIR) fail.push(`closest pair ${worst.toFixed(4)} < ${MIN_PAIR} at ${where}`);
  for (const k of KEYS) {
    const c = cr(bg[k], fg[k]);
    if (c < MIN_CONTRAST) fail.push(`${k}: glyph contrast ${c.toFixed(2)} < ${MIN_CONTRAST}`);
    for (const [n, v] of Object.entries(SURFACES)) {
      const s = cr(bg[k], v);
      if (s < MIN_SURFACE) fail.push(`${k}: ${s.toFixed(2)} against ${n} < ${MIN_SURFACE}`);
    }
    for (const [n, t] of Object.entries(RESERVED)) {
      const d = dE(bg[k], t);
      if (d < MIN_RESERVED) fail.push(`${k}: ${d.toFixed(4)} from colors.${n} < ${MIN_RESERVED}`);
    }
  }
  return fail;
}

// ---------------------------------------------------------------- entry
const fs = require('fs'), path = require('path');
const THEME = path.join(__dirname, '..', 'src', 'theme.ts');

function readScale(src, name) {
  const m = src.match(new RegExp(`export const ${name}[^{]*\\{([^}]*)\\}`));
  if (!m) throw new Error(`could not find ${name} in theme.ts`);
  return Object.fromEntries([...m[1].matchAll(/(\w+)\s*:\s*'(#[0-9A-Fa-f]{6})'/g)].map(x => [x[1], x[2].toUpperCase()]));
}

if (process.argv.includes('--check')) {
  const src = fs.readFileSync(THEME, 'utf8');
  const bg = readScale(src, 'moduleColor'), fg = readScale(src, 'moduleColorText');
  const missing = KEYS.filter(k => !bg[k] || !fg[k]);
  if (missing.length) { console.error('✗ theme.ts is missing: ' + missing.join(', ')); process.exit(1); }
  const fail = check(bg, fg);
  if (fail.length) {
    console.error('✗ module colors violate ' + fail.length + ' constraint(s):');
    for (const f of fail) console.error('   - ' + f);
    console.error('\n  Re-run without --check to solve a fresh palette.');
    process.exit(1);
  }
  const { worst, where } = worstPair(bg);
  console.log(`✓ module colors: worst pair ${worst.toFixed(4)} at ${where}, all 11 clear ` +
    `${MIN_CONTRAST}:1 glyph, ${MIN_SURFACE}:1 surface, ${MIN_RESERVED} from reserved tokens.`);
  process.exit(0);
}

// solve
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
let bestSpec = null, bestScore = -Infinity;
for (let restart = 0; restart < 14; restart++) {
  let spec = Object.fromEntries(KEYS.map(k => [k, {
    L: L_RANGE[0] + Math.random() * (L_RANGE[1] - L_RANGE[0]),
    C: C_RANGE[0] + Math.random() * (C_RANGE[1] - C_RANGE[0]),
  }]));
  let cur = score(spec);
  for (let it = 0; it < 14000; it++) {
    const T = 0.010 * (1 - it / 14000);
    const k = KEYS[(Math.random() * KEYS.length) | 0];
    const axis = Math.random() < 0.65 ? 'L' : 'C';
    const trial = { ...spec, [k]: { ...spec[k] } };
    trial[k][axis] = clamp(trial[k][axis] + (Math.random() - 0.5) * (axis === 'L' ? 0.05 : 0.03),
      axis === 'L' ? L_RANGE : C_RANGE);
    const s = score(trial);
    if (s > cur || Math.random() < Math.exp((s - cur) / (T + 1e-9))) { spec = trial; cur = s; }
    if (cur > bestScore) { bestScore = cur; bestSpec = JSON.parse(JSON.stringify(spec)); }
  }
}
const bg = backgrounds(bestSpec);
const fg = Object.fromEntries(KEYS.map(k => [k, solveFg(bg[k], HUE[k])]));
report(bg, fg);
const fail = check(bg, fg);
console.log(fail.length ? '\n✗ solution still violates:\n   - ' + fail.join('\n   - ') : '\n✓ all constraints satisfied');
console.log('\nexport const moduleColor: Record<string, string> = {');
for (const k of ORDER) console.log(`  ${k}: '${bg[k]}',`);
console.log('};\n\nexport const moduleColorText: Record<string, string> = {');
for (const k of ORDER) console.log(`  ${k}: '${fg[k]}',`);
console.log('};');
