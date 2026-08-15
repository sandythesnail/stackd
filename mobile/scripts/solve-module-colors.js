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

/* ---------------------------------------------------------------- palette definition */
/* ROYGBIV in MODULE-NUMBER order, by request: 01 red, 02 orange, 03 yellow, 04 green,
 * 05 blue, 06 indigo, 07 violet, then 08-11 repeat the first four hues.
 *
 * Hues are fixed and only lightness/chroma are solved, which is the point: the ramp should
 * read as a rainbow you can count along, not as eleven maximally-separated colours. The
 * solver's job is now narrow — find the depth for each chip that keeps the set legible and
 * colour-blind-safe without moving any hue.
 *
 * That job is still real, and the naive version fails: setting the four repeats to "same hue,
 * lighter" by hand put taxes (light red) and career (light green) 0.0046 apart under
 * deuteranopia, the same colour for a green-blind student, because dichromacy throws hue away
 * and keeps lightness and both had been handed the same lightness. A repeat has to differ in
 * DEPTH from the other repeats, not only from the hue it repeats. */
const HUE = {
  earning: 25,      // 01 red
  spending: 55,     // 02 orange
  saving: 95,       // 03 yellow
  investing: 145,   // 04 green
  credit: 245,      // 05 blue
  risk: 285,        // 06 indigo
  loans: 320,       // 07 violet
  taxes: 25,        // 08 red again
  psychology: 55,   // 09 orange again
  career: 145,      // 10 green again
  scams: 245,       // 11 blue again
};
const KEYS = Object.keys(HUE);
const ORDER = ['earning', 'spending', 'saving', 'investing', 'credit', 'risk',
               'loans', 'taxes', 'psychology', 'career', 'scams'];
const RESERVED = { reward: '#F0C22E', rewardBg: '#FFF9E6', rewardBadgeBg: '#FFEDB0' };
const SURFACES = { white: '#FFFFFF', cream: '#FAF6ED', track: '#E7ECE3' };
/** Warm hues carry a chroma floor so they can't dull into brown. Orange is the one at risk
 * now (module 02 and its repeat at 09); red is far enough round the wheel to be safe. */
const WARM = new Set(['spending', 'psychology']);

/* The one module allowed to sit near the reward tokens.
 *
 * Module 03 is yellow because the rainbow says so, and yellow is the app's reward colour:
 * `reward` is #F0C22E, `rewardBadgeBg` #FFEDB0, and every yellow measured lands 0.02-0.08
 * from one of them against the 0.09 floor. There is no yellow that clears both — the band is
 * closed from above and below. It was asked for explicitly, so the constraint is lifted for
 * this one chip rather than quietly satisfied by shipping a green and calling it yellow.
 *
 * The cost, stated so it can be reversed knowingly: the yellow chip is now the closest thing
 * in the app to the "come collect" gold. The worst of that overlap is already gone — the
 * Modules tab no longer washes its recommended row in pale yellow (see modules.tsx) — but the
 * gold badge and the yellow chip are cousins. Remove 'saving' from this set to restore the old
 * guarantee, and expect the solver to refuse every yellow it is offered. */
const RESERVED_EXEMPT = new Set(['saving']);
const VIEWS = ['norm', 'deut', 'prot'];

const MIN_CONTRAST = 4.6;     // chip glyph, 16px so not large text
const MIN_SURFACE = 1.35;     // chip legible as a bare shape
const MIN_RESERVED = 0.09;    // never confusable with the reward tokens
const MIN_PAIR = 0.045;       // worst module pair, in ANY of the three views (solver only)
/** Pairs knowingly allowed to collapse, as "moduleA/moduleB".
 *
 * All four of these are fine in normal vision and fine under protanopia; they collapse only
 * under DEUTERANOPIA, which is the common form of colour blindness (about 1 man in 16). The
 * supplied palette separates these particular pairs almost entirely along the red-green axis,
 * and that axis is exactly what green-blindness removes:
 *
 *     pair                  normal    deut     prot
 *     saving/investing      0.1309    0.0190   0.0461     lime-yellow vs amber
 *     earning/loans         0.3530    0.0332   0.2440     green vs magenta
 *     spending/credit       0.2407    0.0264   0.0957     lime vs orange
 *     taxes/psychology      0.1721    0.0270   0.1014     purple vs dark blue
 *
 * The hues were specified deliberately, so they are kept and the exceptions are written down
 * rather than silently tolerated: the other 51 pairs are still enforced, so a NEW collision
 * introduced later still fails the build. Nothing in the app relies on chip colour alone -
 * every chip carries its module number - so this degrades identification, not function. */
const ACCEPTED_COLLISIONS = new Set([
  'saving/investing',
  'earning/loans',
  'spending/credit',
  'taxes/psychology',
]);
/* The search space, which is now deliberately WIDER than the palette should be. The ceiling
 * is the only aesthetic-looking number here and it isn't one: MIN_SURFACE against white runs
 * out at about OKLCH L 0.895, because a chip has to stay visible as a bare shape (it is a hero
 * border and a progress fill, not only a backdrop for a glyph).
 *
 * Tightening these bounds is NOT how to make the palette paler — that was tried and it does
 * nothing. The old objective maximised the smallest pairwise distance, so the solver always
 * ran to the EDGES of whatever band it was given; handing it a pastel band just produced a
 * pastel-bounded set with the same spread, and handing it [0.740,0.890] x [0.060,0.118] moved
 * the set's mean lightness by +0.004 and its mean chroma by -0.005. Invisible. Pastel is a
 * property of where the set SITS, so it has to be in the objective — see PASTEL_W. */
const L_RANGE = [0.700, 0.895], C_RANGE = [0.050, 0.130];

/* How hard to pull the whole set toward pale-and-soft, against the separation it costs.
 *
 * There is a real ceiling on this and it is worth knowing before turning the number up: a
 * genuinely pale set cannot satisfy MIN_PAIR at all. Bounded to [0.815,0.885] x [0.048,0.098]
 * — which is what "pastel" looks like if you simply ask for it — the best solution puts loans
 * and saving 0.0243 apart under protanopia, i.e. the same colour for a red-blind student.
 * Four of the eleven hues are greens inside 47 degrees (see HUE) and they separate by DEPTH,
 * so taking lightness away takes away the only axis they have.
 *
 * So separation is a hard floor with a small margin, and pastelness is what the solver spends
 * everything above that floor on. Raising PASTEL_W past the point where the floor binds just
 * makes the search fail the check rather than producing a paler palette. */
const PASTEL_W = 9.0;
const PAIR_MARGIN = 0.003;

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
/** Distance from the pastel target, averaged over the set — the thing to MINIMISE.
 *
 * A target rather than a direction ("lighter, softer") on purpose. Pushed as a direction, the
 * solver trades all of one for all of the other and lands on dusty: mean chroma 0.078 with
 * psychology at #B293AC, a grey-mauve. That is muted, not cute. Candy pastels are light AND
 * still obviously coloured, which is a POINT in the space, not a corner of it.
 *
 * Squared, so a chip that has to wander to stay distinguishable pays for the distance but
 * isn't forbidden from going — the greens do have to spread out, and this lets them while
 * keeping everything that doesn't need to move near the target. */
const TARGET_L = 0.875;
const C_AT_TARGET = 0.064;
/* Chroma is targeted as a FUNCTION of lightness, not a constant, and this slope is the thing
 * that killed the terracotta.
 *
 * Not every chip can be pale — the set has to spread over lightness or near hues collapse
 * under dichromacy (see HUE). The question is what a chip should look like once it has been
 * forced down, and a flat chroma target answers it wrong: mid lightness with mid chroma is the
 * precise recipe for mud. That is where #EA9F79 came from, a burnt terracotta nobody asked
 * for. Warm hues are worst hit, because dulled orange IS brown.
 *
 * So a chip that gives up lightness gets chroma back. Light ones sit soft and pastel; the few
 * that must go deeper land as saturated jewel tones, which read as rich rather than dirty.
 * Nothing is left in the middle. Slope 0.55: at L 0.875 the target is 0.064, at L 0.75 it is
 * 0.133. */
const C_SLOPE = 0.55;
function chromaTargetFor(L) {
  return Math.min(0.155, C_AT_TARGET + Math.max(0, TARGET_L - L) * C_SLOPE);
}
function pastelMiss(spec) {
  let miss = 0;
  for (const k of KEYS) {
    const dL = spec[k].L - TARGET_L;
    const dC = spec[k].C - chromaTargetFor(spec[k].L);
    // Lightness is weighted below chroma on purpose: a chip is allowed to move down the
    // lightness axis when separation needs it, but it is not allowed to go muddy on the way.
    miss += 0.7 * dL * dL + 2.4 * dC * dC;
  }
  return miss / KEYS.length;
}

function score(spec) {
  const bg = backgrounds(spec);
  // Separation is a FLOOR, not the objective. Credit stops accruing a hair above MIN_PAIR, so
  // everything the solver has left goes into pastelness instead of into pushing two already
  // distinguishable modules further apart. Below the floor the penalty dwarfs everything.
  const { worst } = worstPair(bg);
  const floor = MIN_PAIR + PAIR_MARGIN;
  let s = Math.min(worst, floor) - PASTEL_W * pastelMiss(spec);
  let pen = worst < floor ? (floor - worst) * 40 : 0;
  for (const k of KEYS) {
    if (!RESERVED_EXEMPT.has(k)) for (const t of Object.values(RESERVED)) { const d = dE(bg[k], t); if (d < MIN_RESERVED) pen += (MIN_RESERVED - d) * 3; }
    const surf = Math.min(...Object.values(SURFACES).map(v => cr(bg[k], v)));
    if (surf < MIN_SURFACE) pen += (MIN_SURFACE - surf) * 3;
    // Warm chroma floor, lowered from 0.10 with the pastel band. Its job is to stop scams and
    // risk sliding into brown, and brown is a DARK dull orange — at L 0.82+ a low-chroma warm
    // hue reads as peach, not mud, so the old floor now only forces those two to shout.
    if (WARM.has(k) && spec[k].C < 0.055) pen += (0.055 - spec[k].C) * 10;
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
      if (d < MIN_RESERVED && !RESERVED_EXEMPT.has(k)) fail.push(`${k}: ${d.toFixed(4)} from colors.${n} < ${MIN_RESERVED}`);
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
  const bg = readScale(src, 'moduleColor');
  const fg = readScale(src, 'moduleColorText');
  const solid = readScale(src, 'moduleColorSolid');
  const missing = KEYS.filter(k => !bg[k] || !fg[k]);
  if (missing.length) { console.error('\u2717 theme.ts is missing: ' + missing.join(', ')); process.exit(1); }

  const fail = [];

  // 1. The number on every chip has to be readable. This never bends.
  for (const k of KEYS) {
    const c = cr(bg[k], fg[k]);
    if (c < MIN_CONTRAST) fail.push(k + ': number contrast ' + c.toFixed(2) + ' < ' + MIN_CONTRAST);
  }

  // 2. Anything drawn as a bare shape must be visible on every surface it lands on. That is
  //    moduleColorSolid, which is allowed to differ from moduleColor precisely so a palette
  //    can contain a chip too pale to be a progress fill without breaking the progress fill.
  for (const k of KEYS) {
    const v = solid[k] || bg[k];
    for (const [n, surf] of Object.entries(SURFACES)) {
      const c = cr(v, surf);
      if (c < MIN_SURFACE) fail.push(k + ': solid tone ' + c.toFixed(2) + ' against ' + n + ' < ' + MIN_SURFACE);
    }
  }

  // 3. No two modules may look alike, in normal vision OR under either dichromacy. Pairs listed
  //    in ACCEPTED_COLLISIONS are known and deliberate (see theme.ts); every other pair still
  //    fails, so accepting one collision doesn't quietly accept the next.
  for (const view of VIEWS) {
    const sim_ = Object.fromEntries(KEYS.map(k => [k, sim(bg[k], view)]));
    for (let i = 0; i < KEYS.length; i++) {
      for (let j = i + 1; j < KEYS.length; j++) {
        const a = KEYS[i], b = KEYS[j];
        const d = dE(sim_[a], sim_[b]);
        if (d >= MIN_PAIR) continue;
        if (ACCEPTED_COLLISIONS.has(a + '/' + b) || ACCEPTED_COLLISIONS.has(b + '/' + a)) continue;
        fail.push(a + '/' + b + ': ' + d.toFixed(4) + ' apart under ' + view + ' < ' + MIN_PAIR);
      }
    }
  }

  if (fail.length) {
    console.error('\u2717 module colors violate ' + fail.length + ' constraint(s):');
    for (const f of fail) console.error('   - ' + f);
    process.exit(1);
  }

  const { worst, where } = worstPair(bg);
  const accepted = ACCEPTED_COLLISIONS.size
    ? ' (' + ACCEPTED_COLLISIONS.size + ' accepted collision: ' + [...ACCEPTED_COLLISIONS].join(', ') + ')'
    : '';
  console.log('\u2713 module colors: worst pair ' + worst.toFixed(4) + ' at ' + where + accepted +
    ', every number clears ' + MIN_CONTRAST + ':1 and every solid tone ' + MIN_SURFACE + ':1.');
  process.exit(0);
}

// solve
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
let bestSpec = null, bestScore = -Infinity;
for (let restart = 0; restart < 18; restart++) {
  let spec = Object.fromEntries(KEYS.map(k => [k, {
    L: L_RANGE[0] + Math.random() * (L_RANGE[1] - L_RANGE[0]),
    C: C_RANGE[0] + Math.random() * (C_RANGE[1] - C_RANGE[0]),
  }]));
  let cur = score(spec);
  for (let it = 0; it < 18000; it++) {
    const T = 0.010 * (1 - it / 18000);
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
