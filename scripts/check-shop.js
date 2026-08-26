/**
 * Guards the shop catalogue against drift between the two apps.
 *
 * Sixty-one items exist twice: app.js's SHOP_ITEMS and mobile/src/content/shopItems.json,
 * which is extracted from it. Nothing enforced that, and by the time this was written six
 * room items had been re-drawn on the mobile side and two descriptions reworded, so the same
 * item was a visibly different object depending on which device you furnished the room on.
 *
 * Prices, currencies, rarities and mystery pools are compared too, and those matter more than
 * they look: both apps spend from the SAME coin and diamond balance in the SAME synced blob.
 * An item priced differently on the two sides is a student who can afford something on their
 * phone and not on their laptop, out of one wallet.
 *
 * ART. The `svg` and `wallCss` fields are compared, because that is where the drift actually
 * was — but the web's copies use `var(--token)` and mobile's cannot (react-native-svg has no
 * CSS custom properties), so the extraction resolves them to literal hexes. This resolves the
 * web's art the way a browser would, from the real stylesheets, before comparing. A var whose
 * value changes in CSS therefore shows up here as drift, which is correct: mobile's copy is
 * now a stale hex.
 *
 * Only quote typography is normalised away (see lib/literal's normalizeQuotes).
 *
 *   node scripts/check-shop.js
 */
const fs = require('fs');
const path = require('path');
const { literal, normalizeQuotes: norm } = require('./lib/literal');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/**
 * The three mystery boxes' `viewBox` and `svg`.
 *
 * Neither app draws a box from the catalogue any more. Both render the same present the
 * daily-reward calendar draws, in the pool's own colour — mobile through its Gift component,
 * the web through mysteryBoxArt/giftSvg — because the catalogue art was a second, different
 * drawing of the same idea and "a box with something in it" looked like two unrelated objects
 * depending on the screen. The fields are dead data on both sides, kept only as a fallback,
 * so they are exempt rather than reconciled.
 *
 * This is an exemption, not a lowered bar: every other field on those same three items, and
 * every field on the other fifty-eight, still has to match.
 */
const ACCEPTED_DRIFT = new Set([
  'hat_mystery_box.viewBox', 'hat_mystery_box.svg',
  'accessory_mystery_box.viewBox', 'accessory_mystery_box.svg',
  'diamond_mystery_box.viewBox', 'diamond_mystery_box.svg',
]);

const web = literal(read('app.js'), 'SHOP_ITEMS', '[', 'app.js');
const mob = JSON.parse(read('mobile/src/content/shopItems.json'));

/** Every `--token: #hex;` declared in the stylesheets, so the web's art can be resolved. */
const cssVars = new Map();
for (const f of ['styles.css', 'app.css']) {
  for (const m of read(f).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (!cssVars.has(m[1])) cssVars.set(m[1], m[2].trim());
  }
}
const unresolved = new Set();
function resolveVars(s) {
  return String(s).replace(/var\((--[\w-]+)\)/g, (all, name) => {
    if (!cssVars.has(name)) { unresolved.add(name); return all; }
    return cssVars.get(name);
  });
}

/** Art compares on shape and colour, not on how it was indented. */
const art = (s) => resolveVars(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

const problems = [];
const exempted = [];
const fail = (where, msg) => {
  if (ACCEPTED_DRIFT.has(where)) { exempted.push(where); return; }
  problems.push(msg);
};

const FIELDS = [
  'name', 'category', 'price', 'currency', 'rarity', 'mysteryPool', 'isMysteryBox',
  'mysteryOnly', 'slot', 'layer', 'fit', 'reward', 'rewardHint', 'desc', 'viewBox',
];
const ART_FIELDS = ['svg', 'wallCss'];

const mById = new Map(mob.map((i) => [i.id, i]));
const wIds = new Set(web.map((i) => i.id));

if (web.length !== mob.length) problems.push(`app.js has ${web.length} items, mobile has ${mob.length}`);
for (const m of mob) if (!wIds.has(m.id)) problems.push(`item ${m.id}: missing from app.js`);

for (const w of web) {
  const m = mById.get(w.id);
  if (!m) { problems.push(`item ${w.id}: missing from mobile`); continue; }

  for (const k of FIELDS) {
    const a = w[k] === undefined ? null : w[k];
    const b = m[k] === undefined ? null : m[k];
    if (JSON.stringify(norm(a)) !== JSON.stringify(norm(b))) {
      fail(`${w.id}.${k}`, `${w.id}.${k}\n  app.js: ${JSON.stringify(a)}\n  mobile: ${JSON.stringify(b)}`);
    }
  }

  for (const k of ART_FIELDS) {
    if (!w[k] && !m[k]) continue;
    if (art(w[k]) !== art(m[k])) {
      fail(`${w.id}.${k}`, `${w.id}.${k}: the drawings differ`
        + `\n  app.js (var()s resolved): ${art(w[k]).slice(0, 110)}…`
        + `\n  mobile:                   ${art(m[k]).slice(0, 110)}…`);
    }
  }
}

if (unresolved.size) {
  problems.push(`art references CSS variables that no stylesheet defines: ${[...unresolved].join(', ')}`);
}

if (problems.length) {
  console.error('Shop catalogue DRIFT — ' + problems.length + ' difference(s):\n');
  console.error(problems.join('\n\n'));
  console.error('\nEdit both sides, or regenerate mobile/src/content/shopItems.json from app.js.');
  process.exit(1);
}

console.log(
  `Shop OK — ${web.length} items match between app.js and mobile, art included `
  + `(${cssVars.size} CSS variables resolved).`
);
if (exempted.length) {
  console.log(`  ${exempted.length} recorded exemption(s) skipped — see ACCEPTED_DRIFT.`);
}
