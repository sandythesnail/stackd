/**
 * Guards the one rule the two apps both have to know: whether a finished lesson was ACED.
 *
 * It decides the eleven "Ace all 8 lessons in the X module" badges. The web owns the rule
 * (app.js's questWasFlawless, asking its own questTally); mobile carries a second copy
 * (mobile/src/lib/webAced.ts) because the two apps store a finished lesson differently — the
 * web keeps the lesson's analytics, mobile keeps a flat "was this aced" key
 * (AppState.flawlessLessons) — so reading the web's form is the only way for mobile to know
 * that a lesson aced on the laptop was aced.
 *
 * Two copies of a rule drift, and this one drifting is not cosmetic: it is a badge handed out
 * on one device and withheld on the other for the same play. So both are run against the same
 * table (scripts/mastery-fixtures.json) and have to give the same answer on every row.
 *
 * Neither copy is imported. app.js is a classic browser script that cannot be require()d, so
 * the two functions are sliced out by name and evaluated on their own in a sandbox with no
 * globals; webAced.ts is TypeScript, so it is compiled on its own — which is only possible
 * because that file deliberately has no imports. Keep it that way.
 *
 *   node scripts/check-mastery.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Slices a top-level `function NAME(...) { ... }` out of a source file, by brace matching.
 *  Strings and comments are skipped so a brace inside either cannot end the function early. */
function functionFromSource(src, name, label) {
  const decl = 'function ' + name + '(';
  const start = src.indexOf(decl);
  if (start < 0) throw new Error(`${label}: no function ${name}`);
  const open = src.indexOf('{', start);
  let depth = 0, end = -1, str = null, esc = false, line = false, block = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (line) { if (ch === '\n') line = false; continue; }
    if (block) { if (ch === '*' && next === '/') { block = false; i++; } continue; }
    if (str) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === str) str = null;
      continue;
    }
    if (ch === '/' && next === '/') { line = true; i++; continue; }
    if (ch === '/' && next === '*') { block = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { str = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error(`${label}: unterminated function ${name}`);
  return src.slice(start, end + 1);
}

/* ── the web's rule ─────────────────────────────────────────────────────────
   questWasFlawless calls questTally, which calls gradedLists, and none of the three reads
   anything but the record it is handed — so together they stand up on their own with no app
   around them. */
const appJs = read('app.js');
const webSandbox = Object.create(null);
vm.runInNewContext(
  functionFromSource(appJs, 'gradedLists', 'app.js') + '\n'
  + functionFromSource(appJs, 'questTally', 'app.js') + '\n'
  + functionFromSource(appJs, 'questWasFlawless', 'app.js') + '\n'
  + 'this.aced = questWasFlawless;',
  webSandbox,
);
const webAced = webSandbox.aced;

/* ── mobile's copy ──────────────────────────────────────────────────────────
   Compiled with the mobile app's own TypeScript, into a scratch directory that is removed
   again afterwards. If tsc cannot be reached the check reports that and stops rather than
   quietly passing on one implementation. */
const TSC = path.join(ROOT, 'mobile', 'node_modules', 'typescript', 'bin', 'tsc');
if (!fs.existsSync(TSC)) {
  console.log('check-mastery: skipped, mobile/node_modules/typescript is not installed.');
  console.log('  cd mobile && npm ci');
  process.exit(0);
}
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackd-mastery-'));
let mobileAced;
try {
  execFileSync(process.execPath, [
    TSC, path.join(ROOT, 'mobile/src/lib/webAced.ts'),
    '--outDir', outDir, '--module', 'commonjs', '--target', 'es2020',
  ], { stdio: 'pipe' });
  mobileAced = require(path.join(outDir, 'webAced.js')).webLessonWasAced;
} catch (e) {
  console.error('check-mastery: could not compile mobile/src/lib/webAced.ts on its own.');
  console.error('  That file must stay import-free — see its header.');
  console.error(String((e && e.stdout) || e));
  process.exit(1);
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

/* ── run the table through both ─────────────────────────────────────────── */
const { cases } = JSON.parse(read('scripts/mastery-fixtures.json'));
const problems = [];
for (const c of cases) {
  // A fresh clone per implementation: neither rule should mutate what it is handed, and a
  // shared object would hide it if one did.
  const web = webAced(JSON.parse(JSON.stringify(c.record)));
  const mob = mobileAced(JSON.parse(JSON.stringify(c.record)));
  if (web !== c.aced) problems.push(`${c.name}: app.js says ${web}, the table says ${c.aced}`);
  if (mob !== c.aced) problems.push(`${c.name}: webAced.ts says ${mob}, the table says ${c.aced}`);
  if (web !== mob) problems.push(`${c.name}: THE TWO APPS DISAGREE — app.js ${web}, mobile ${mob}`);
}

if (problems.length) {
  console.error('\nThe two apps do not agree about what counts as acing a lesson:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\napp.js questWasFlawless/questTally is the rule; mobile/src/lib/webAced.ts follows it.');
  console.error('If the rule really did change, change both and update scripts/mastery-fixtures.json.\n');
  process.exit(1);
}
console.log(`Mastery OK — app.js and mobile agree on all ${cases.length} lesson records.`);
