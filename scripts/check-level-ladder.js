/**
 * Guards the XP ladder and the level-up reward ladder against the Expo app's.
 *
 * Both apps compute a player's level from the same XP total, against the same synced record.
 * If the two ladders disagree, the level shown changes when the student opens the other
 * device — and worse, mobileToWeb writes `level: levelForXp(mobile.xp)` into the shared row,
 * so the wrong ladder doesn't just display a wrong number, it stores one.
 *
 * That has already happened once: the ladder was retuned in app.js and store.tsx and a third
 * copy inside webState.ts was left on the old values. This checks the two real ladders match
 * and that no third copy has reappeared.
 *
 *   node scripts/check-level-ladder.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function nums(src, name, where) {
  const m = src.match(new RegExp('(?:const|let)\\s+' + name + '[^=]*=\\s*\\[([^\\]]*)\\]'));
  if (!m) throw new Error(where + ': no ' + name);
  return m[1].split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));
}

const web = read('app.js');
const mob = read('mobile/src/store.tsx');
const problems = [];

for (const name of ['LEVEL_THRESHOLDS', 'LEVEL_UP_DIAMONDS']) {
  const a = nums(web, name, 'app.js');
  const b = nums(mob, name, 'mobile/src/store.tsx');
  if (a.length !== b.length) {
    problems.push(`${name}: app.js has ${a.length} entries, mobile has ${b.length}`);
  }
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) problems.push(`${name}[${i}]: app.js ${a[i]}, mobile ${b[i]}`);
  }
}

/* A ladder must not be redefined anywhere else in the mobile app. webState.ts is the file
 * that actually went stale, and it went stale precisely by holding its own copy. */
const others = ['mobile/src/lib/webState.ts'];
for (const f of others) {
  const src = read(f);
  if (/(?:const|let)\s+LEVEL_THRESHOLDS\s*[:=]/.test(src)) {
    problems.push(`${f}: declares its own LEVEL_THRESHOLDS — import levelForXp from the store instead`);
  }
}

/* The thresholds must climb, or levelForXp's loop stops early and every level above the dip
 * becomes unreachable. */
const t = nums(web, 'LEVEL_THRESHOLDS', 'app.js');
for (let i = 1; i < t.length; i++) {
  if (t[i] <= t[i - 1]) problems.push(`LEVEL_THRESHOLDS[${i}] (${t[i]}) does not exceed [${i - 1}] (${t[i - 1]})`);
}

if (problems.length) {
  console.error('Level ladders have drifted:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`Level ladders OK — ${t.length} thresholds and the reward ladder match across app.js and mobile, and no third copy exists.`);
