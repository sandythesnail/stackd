/**
 * Guards the two apps' shared CONTENT against each other: the eleven modules, and the
 * achievement definitions.
 *
 * These are the two biggest datasets that exist twice. mobile/src/content/modules.json is
 * extracted verbatim from app.js's MODULES and kept that way precisely so the two can be
 * diffed; mobile/src/achievements.ts says the same of ACHIEVEMENTS. Nothing enforced it, and
 * "kept that way" is a promise a person has to remember every time either side is edited.
 *
 * What drift here costs is worse than a colour being wrong. A question edited on one side is
 * a student taught one thing on their laptop and marked against another on their phone; a
 * `correct` index that moves is a right answer scored wrong. This is the content the whole
 * product is, so it is the last thing that should be allowed to fork quietly.
 *
 * Deliberately compares only what both apps actually USE: modules.json is regenerated with
 * its keys in a different order, which is not drift and is not reported. The `available`
 * flag IS compared — it used to be mobile-only, but the web has it now, and it decides
 * whether a badge can be won at all, so the two sides disagreeing about that is exactly the
 * kind of difference worth failing over.
 *
 *   node scripts/check-content.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/** Pulls a top-level `const NAME = [ ... ];` array literal out of app.js and evaluates it.
 *
 * app.js is a classic browser script — it cannot be require()d, and MODULES is a `const`, so
 * it never lands on an object we could reach even if it could. Slicing the literal and
 * evaluating just that keeps this to the data: no app code runs, and the sandbox has no
 * globals for it to reach if it tried. */
function arrayFromAppJs(src, name) {
  const decl = 'const ' + name + ' = [';
  const start = src.indexOf(decl);
  if (start < 0) throw new Error('app.js: no ' + name);
  const open = start + decl.length - 1;
  let depth = 0, end = -1, str = null, esc = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (str) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === str) str = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { str = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('app.js: unterminated ' + name);
  return vm.runInNewContext('(' + src.slice(open, end + 1) + ')', Object.create(null));
}

/* No exemptions. The eleven vocab checks that had forked were resolved by taking mobile's
 * wording onto the web, so every module and every achievement now matches outright and any
 * difference at all is a failure. If a difference is ever deliberate, reintroduce a list like
 * mobile/scripts/solve-module-colors.js's ACCEPTED_COLLISIONS rather than loosening this. */
const ACCEPTED_DRIFT = new Set();

const appJs = read('app.js');
const problems = [];
const accepted = [];
/** `where` is the dotted path; everything after it is the detail. */
const note = (m, where) => {
  if (where && ACCEPTED_DRIFT.has(where)) { accepted.push(where); return; }
  if (problems.length < 60) problems.push(m);
};

/* ── Modules ── */
{
  const web = arrayFromAppJs(appJs, 'MODULES');
  const mob = JSON.parse(read('mobile/src/content/modules.json'));

  if (web.length !== mob.length) note(`modules: app.js has ${web.length}, mobile has ${mob.length}`);

  const byId = (arr) => new Map(arr.map((m) => [m.id, m]));
  const wm = byId(web), mm = byId(mob);
  for (const id of wm.keys()) if (!mm.has(id)) note(`module ${id}: missing from mobile`);
  for (const id of mm.keys()) if (!wm.has(id)) note(`module ${id}: missing from app.js`);

  /* Keys that differ for reasons that are not drift.
   *
   * `lessons` is a different thing on each side, not the same thing gone wrong. The web keeps
   * a legacy array of 6-9 entries that only the pre-quest renderer reads (every module has
   * quests now, so that branch is dead); mobile derives a 9-entry list from the quests. Both
   * are correct for their own app. What is actually taught lives in `quests`, which is 9 for 9
   * on both sides for all eleven modules, and that is what this compares.
   *
   * `fullScreen` is a mobile-only rendering hint with no web counterpart. */
  const IGNORE_KEYS = new Set(['lessons', 'fullScreen']);

  /** JSON cannot represent Infinity, so a web `maxLeftover: Infinity` round-trips as null.
   *  That is the format's limit, not a difference in the content. */
  const same = (a, b) =>
    a === b || (a === Infinity && b === null) || (a === null && b === Infinity);

  /** Deep compare, reporting differences by path rather than dumping both trees. */
  function diff(a, b, where) {
    if (same(a, b)) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) { note(`${where}: ${a.length} entries in app.js, ${b.length} in mobile`, where); return; }
      for (let i = 0; i < a.length; i++) diff(a[i], b[i], `${where}[${i}]`);
      return;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      // Key order differs between a hand-edited JS literal and regenerated JSON; the set does not.
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) {
        if (IGNORE_KEYS.has(k)) continue;
        if (!(k in a)) { note(`${where}.${k}: only in mobile`, `${where}.${k}`); continue; }
        if (!(k in b)) { note(`${where}.${k}: only in app.js`, `${where}.${k}`); continue; }
        diff(a[k], b[k], `${where}.${k}`);
      }
      return;
    }
    const show = (v) => (typeof v === 'string' ? JSON.stringify(v.slice(0, 60)) : String(v));
    note(`${where}: app.js ${show(a)} / mobile ${show(b)}`, where);
  }

  for (const id of wm.keys()) {
    if (!mm.has(id)) continue;
    const w = wm.get(id), m = mm.get(id);
    // The taught content, and the module's own headline fields.
    for (const k of ['title', 'icon', 'xpReward', 'hook', 'desc']) diff(w[k], m[k], `module ${id}.${k}`);
    diff(w.questions, m.questions, `module ${id}.questions`);
    diff(w.quests, m.quests, `module ${id}.quests`);
  }
}

/* ── Achievements ── */
{
  const web = arrayFromAppJs(appJs, 'ACHIEVEMENTS');
  const ts = read('mobile/src/achievements.ts');
  const body = ts.slice(ts.indexOf('export const ACHIEVEMENTS'));

  /* Parsed rather than evaluated: the file is TypeScript, so it cannot be run here. Only the
     scalar fields both apps share are read; the unlock condition itself is a closure on both
     sides and is compared by neither — what it can DECIDE is guarded by the `available` flag
     below, which is the part that was actually wrong. */
  const mob = [];
  /* Both quote styles. A `desc` whose text contains an apostrophe is written with double
     quotes ("Ace both of Hammy's credit quests."), and a single-quote-only pattern silently
     skips exactly those entries — which reads as two achievements missing from mobile when
     they are both there. */
  const S = "(?:'((?:[^'\\\\]|\\\\.)*)'|\"((?:[^\"\\\\]|\\\\.)*)\")";
  const entryRe = new RegExp(
    '\\{\\s*id:\\s*' + S + ',\\s*tier:\\s*' + S + ',\\s*label:\\s*' + S + ',\\s*desc:\\s*' + S
    + ',\\s*color:\\s*' + S + ',\\s*available:\\s*(true|false)', 'g');
  const unq = (a, b) => (a !== undefined ? a : b || '').replace(/\\(['"])/g, '$1');
  let m;
  while ((m = entryRe.exec(body))) {
    mob.push({
      id: unq(m[1], m[2]), tier: unq(m[3], m[4]), label: unq(m[5], m[6]),
      desc: unq(m[7], m[8]), color: unq(m[9], m[10]),
      available: m[11] === 'true',
    });
  }
  if (!mob.length) note('achievements: parsed none from mobile — the checker, not the data, is probably broken');

  const mById = new Map(mob.map((a) => [a.id, a]));
  if (web.length !== mob.length) note(`achievements: app.js has ${web.length}, mobile has ${mob.length}`);
  for (const a of web) {
    const b = mById.get(a.id);
    if (!b) { note(`achievement ${a.id}: missing from mobile`); continue; }
    for (const k of ['tier', 'label', 'desc', 'color']) {
      if (a[k] !== b[k]) note(`achievement ${a.id}.${k}: app.js ${JSON.stringify(a[k])} / mobile ${JSON.stringify(b[k])}`);
    }
    /* Whether the badge can be won at all. Absent on the web means winnable, which is how
       twenty of the twenty-two are written; only the two that nothing in either app can award
       say so out loud. The apps disagreeing here means one of them is advertising a badge it
       can never hand out, or hiding one it could. */
    if ((a.available !== false) !== (b.available !== false)) {
      note(`achievement ${a.id}.available: app.js ${a.available !== false} / mobile ${b.available !== false}`);
    }
  }
  const wIds = new Set(web.map((a) => a.id));
  for (const a of mob) if (!wIds.has(a.id)) note(`achievement ${a.id}: missing from app.js`);
}

if (problems.length) {
  console.error('Shared content has drifted between the web app and mobile:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\nEdit both, or regenerate mobile/src/content/modules.json from app.js.');
  process.exit(1);
}

console.log('Content OK — 11 modules and every achievement match between app.js and mobile.');
if (accepted.length) {
  console.log('  ' + accepted.length + ' recorded difference(s) skipped — see ACCEPTED_DRIFT. These are real and still' +
    ' need settling; they are exempt so that NEW drift is what fails.');
}
