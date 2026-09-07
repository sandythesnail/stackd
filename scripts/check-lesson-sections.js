/**
 * Guards the labeled grouping of lesson tiles on a module screen — app.js's
 * MODULE_LESSON_SECTIONS against mobile/src/lessonSections.ts's.
 *
 * Both apps draw the same module screen: the module's eight main lessons, in the order the
 * quests define them, under two or three pink section headers. Both apps derive those eight
 * from `quests`, which scripts/check-content.js already holds identical between the two — so
 * the tiles under any given header are the same eight lessons in the same order on both, and
 * a header that differs is one app describing that content differently from the other.
 *
 * Nothing enforced it, and two had forked: `saving`'s first two headers ("Where to Keep Your
 * Money" / "Making Saving Automatic" on the web, "Building Your Safety Net" / "Growing Your
 * Savings" on mobile) and the last of `scams` ("Social Engineering" vs. "Social Engineering
 * & Staying Safe"). Resolved by taking mobile's wording onto the web, the same way the eleven
 * forked vocab checks were — and in `saving`'s case mobile was also the more accurate of the
 * two: "Making Saving Automatic" sat above compounding, automating and sinking funds, only
 * one of which is about automating anything.
 *
 * The counts are checked as well as the labels, and both against the module's real lesson
 * count. That last one is the part that actually breaks a screen rather than just reading
 * oddly: both apps fall back to one flat, unlabeled list when a config doesn't sum to the
 * number of lessons it is grouping (groupLessonTiles on the web, resolveLessonSections on
 * mobile), so a section quietly stops being wrong and starts being absent.
 *
 *   node scripts/check-lesson-sections.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const appJs = read('app.js');

/** Pulls a top-level `const NAME = { ... };` object literal out of app.js and evaluates it.
 *
 * app.js is a classic browser script — it cannot be require()d. Slicing the literal and
 * evaluating just that keeps this to the data: no app code runs, and the sandbox has no
 * globals for it to reach if it tried. Same approach as scripts/check-content.js. */
function objectFromAppJs(src, name) {
  const decl = 'const ' + name + ' = {';
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
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('app.js: unterminated ' + name);
  return vm.runInNewContext('(' + src.slice(open, end + 1) + ')', Object.create(null));
}

/** Parses the same map out of the TypeScript side. It cannot be run here, so each
 *  `  id: [ ... ],` block is read directly. */
function sectionsFromMobile(ts) {
  const body = ts.slice(ts.indexOf('MODULE_LESSON_SECTIONS: Record'));
  const out = {};
  const blockRe = /^ {2}(\w+): \[([\s\S]*?)^ {2}\],$/gm;
  let m;
  while ((m = blockRe.exec(body))) {
    const entries = [...m[2].matchAll(/label: '((?:[^'\\]|\\.)*)', count: (\d+)/g)]
      .map((e) => ({ label: e[1].replace(/\\'/g, "'"), count: Number(e[2]) }));
    if (entries.length) out[m[1]] = entries;
  }
  return out;
}

const problems = [];
const note = (m) => { if (problems.length < 60) problems.push(m); };

const web = objectFromAppJs(appJs, 'MODULE_LESSON_SECTIONS');
const mob = sectionsFromMobile(read('mobile/src/lessonSections.ts'));
const modules = JSON.parse(read('mobile/src/content/modules.json'));

if (!Object.keys(mob).length) {
  note('sections: parsed none from mobile — the checker, not the data, is probably broken');
}

for (const id of Object.keys(web)) if (!mob[id]) note(`module ${id}: sections missing from mobile`);
for (const id of Object.keys(mob)) if (!web[id]) note(`module ${id}: sections missing from app.js`);

let sectionCount = 0;
for (const id of Object.keys(web)) {
  const w = web[id], b = mob[id];
  if (!b) continue;
  if (w.length !== b.length) {
    note(`module ${id}: ${w.length} sections in app.js, ${b.length} in mobile`);
    continue;
  }
  w.forEach((s, i) => {
    sectionCount++;
    if (s.label !== b[i].label) {
      note(`module ${id} section ${i} label: app.js ${JSON.stringify(s.label)} / mobile ${JSON.stringify(b[i].label)}`);
    }
    if (s.count !== b[i].count) {
      note(`module ${id} section ${i} count: app.js ${s.count} / mobile ${b[i].count}`);
    }
  });
}

/* And the counts against the content itself. A module's own lesson list is what both apps
 * group; a config that doesn't add up to it makes both of them drop the grouping entirely
 * and render one flat list, which is a screen quietly losing a feature rather than an error. */
let lessonTotal = 0;
for (const mod of modules) {
  const sections = web[mod.id];
  if (!sections) { note(`module ${mod.id}: no sections configured in app.js`); continue; }
  const real = (mod.lessons || []).filter((l) => !l.isLifeTask).length;
  lessonTotal += real;
  const sum = sections.reduce((a, s) => a + s.count, 0);
  if (sum !== real) {
    note(`module ${mod.id}: sections sum to ${sum}, but the module has ${real} main lessons`
      + ' — both apps will fall back to one flat, unlabeled list');
  }
}

if (problems.length) {
  console.error('Lesson sections DRIFT:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log(`Lesson sections OK — ${sectionCount} section headers match across app.js and mobile,`
  + ` and every module's counts add up to its real lesson list (${lessonTotal} lessons).`);
