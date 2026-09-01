/**
 * Guards what Hammy SAYS when a student answers something.
 *
 * Three pools, on both apps: the affirmation for a right answer, the gentle line for a wrong
 * one, and the "try again" line Match It uses instead (matching has no explanation to point
 * at, so "here's why" would be pointing at nothing).
 *
 * These are lines a student reads on both devices, at exactly the same moment, and there is
 * no reason for the same moment to be spoken two different ways. They had drifted: the web
 * was standardised to one line per pool and mobile still carried the older randomised
 * versions — six affirmations and four gentle lines, including "Close!", which was being
 * shown on answers that were not close at all. The app never measured closeness, so on one
 * device the copy was claiming something it did not know.
 *
 * ONE line per pool is also checked, not just that the two agree. Both apps pick with
 * `Math.random()` over the pool, so a pool that grows again starts varying the wording under
 * identical circumstances, which is what reads as accidental rather than responsive. If that
 * is ever wanted back, it should be wanted on both apps at once — which is what this makes
 * true.
 *
 *   node scripts/check-hammy-lines.js
 */
const fs = require('fs');
const path = require('path');
const { literal } = require('./lib/literal');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const POOLS = ['HAMMY_CORRECT_MSGS', 'HAMMY_GENTLE_MSGS', 'HAMMY_TRYAGAIN_MSGS'];

const appJs = read('app.js');
const questTsx = read('mobile/src/app/learn/quest.tsx');

const problems = [];
for (const name of POOLS) {
  let web, mob;
  try {
    web = literal(appJs, name, '[', 'app.js');
  } catch (e) {
    problems.push(`${name}: not found in app.js`);
    continue;
  }
  try {
    mob = literal(questTsx, name, '[', 'quest.tsx');
  } catch (e) {
    problems.push(`${name}: not found in mobile/src/app/learn/quest.tsx`);
    continue;
  }

  if (web.length !== 1) {
    problems.push(`${name}: app.js has ${web.length} lines — one per pool, see this file's header`);
  }
  if (mob.length !== 1) {
    problems.push(`${name}: mobile has ${mob.length} lines — one per pool, see this file's header`);
  }
  const n = Math.max(web.length, mob.length);
  for (let i = 0; i < n; i++) {
    if (web[i] !== mob[i]) {
      problems.push(`${name}[${i}]: app.js ${JSON.stringify(web[i])} / mobile ${JSON.stringify(mob[i])}`);
    }
  }
}

if (problems.length) {
  console.error("\nHammy says different things on the two apps:\n");
  for (const p of problems) console.error('  ' + p);
  console.error('\nEdit both. These are the lines a student reads after answering, on either device.\n');
  process.exit(1);
}
console.log(`Hammy's lines OK — all ${POOLS.length} reaction pools match between app.js and mobile.`);
