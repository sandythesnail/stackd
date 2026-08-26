/**
 * Guards the two apps' "Life happens…" catalogue against drift.
 *
 * These events are content, like the modules and the achievements that check-content.js
 * already guards, and they exist twice: app.js's LIFE_EVENTS / LIFE_EVENT_UNLOCKS and
 * mobile/src/lifeEvents.ts's GENERAL_LIFE_EVENTS + MODULE_LIFE_EVENTS + LIFE_EVENT_UNLOCKS.
 * A scenario reworded on one side is a student shown two different versions of the same
 * dilemma depending on which device they opened, and a scenario ADDED on one side is the
 * failure this checker was written after: mobile grew thirty-three module-tagged events and
 * the website kept cycling the same three general ones for an entire curriculum.
 *
 * What is deliberately NOT compared:
 *
 *  - `effect` (checking/savings/creditScore). The website has an ambient financial simulation
 *    for the three general events to move; the mobile app has no such state, so its copies
 *    carry no deltas. `coinDelta`, which both apps really do pay, IS compared.
 *  - Curly vs straight quotes, which are normalised away (see `norm`).
 *
 * Everything else — every event, general, module-tagged and unlock, field by field and choice
 * by choice — must match outright. There are no exemptions. lifeEvents.ts's header warns that
 * mobile rewrote the em dashes out of its copies of the three general events; that is no
 * longer true of any field this compares, so the exemption that used to be here is gone
 * rather than left standing over three events it was no longer protecting.
 *
 *   node scripts/check-life-events.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/**
 * Slices a top-level `const NAME<...> = <open> … <close>;` literal out of a source file and
 * evaluates just that literal in a bare context. No app or module code runs, and the sandbox
 * has no globals for it to reach if it tried — the same approach check-content.js takes with
 * app.js's MODULES.
 */
function literal(src, name, open, close, label) {
  const decl = src.indexOf('const ' + name);
  if (decl < 0) throw new Error(`${label}: no ${name}`);
  // From the `=`, not from the declaration. `const GENERAL_LIFE_EVENTS: LifeEvent[] = [`
  // puts a `[` inside the TYPE annotation, so searching from the name found that one and
  // sliced the empty pair out of `LifeEvent[]` — an empty catalogue that then silently
  // compared equal to nothing.
  const eq = src.indexOf('=', decl);
  const start = src.indexOf(open, eq);
  // Comment-aware, not just string-aware. Both catalogues are heavily commented and those
  // comments are full of apostrophes ("mobile's", "you're"); a scanner that only tracks
  // quotes reads the first one as the start of a string literal and loses the plot several
  // hundred characters later, at whichever brace it then fails to count.
  let depth = 0, str = null, esc = false, comment = null, end = -1;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (comment === 'line') { if (c === '\n') comment = null; continue; }
    if (comment === 'block') { if (c === '*' && next === '/') { comment = null; i++; } continue; }
    if (str) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === '/' && next === '/') { comment = 'line'; i++; continue; }
    if (c === '/' && next === '*') { comment = 'block'; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error(`${label}: unterminated ${name}`);
  return vm.runInNewContext('(' + src.slice(start, end) + ')');
}

const appJs = read('app.js');
const mobileTs = read('mobile/src/lifeEvents.ts');

const webAmbient = literal(appJs, 'LIFE_EVENTS', '[', ']', 'app.js');
const webUnlocks = literal(appJs, 'LIFE_EVENT_UNLOCKS', '{', '}', 'app.js');

const mobileGeneral = literal(mobileTs, 'GENERAL_LIFE_EVENTS', '[', ']', 'lifeEvents.ts');
const mobileByModule = literal(mobileTs, 'MODULE_LIFE_EVENTS', '{', '}', 'lifeEvents.ts');
const mobileUnlocks = literal(mobileTs, 'LIFE_EVENT_UNLOCKS', '{', '}', 'lifeEvents.ts');

// Mirrors lifeEvents.ts's own LIFE_EVENTS composition: the general set, then every module's
// events tagged with the module they belong to.
const mobileAmbient = [
  ...mobileGeneral,
  ...Object.entries(mobileByModule).flatMap(([moduleId, events]) => events.map((e) => ({ ...e, moduleId }))),
];

const problems = [];
const fail = (msg) => problems.push(msg);

/** Ids, in order, must match on both sides. */
function compareIds(where, web, mob) {
  const w = web.map((e) => e.id).join(', ');
  const m = mob.map((e) => e.id).join(', ');
  if (w !== m) fail(`${where}: event ids differ\n  app.js: ${w}\n  mobile: ${m}`);
}

/**
 * Curly quotes and apostrophes are normalised away before prose is compared.
 *
 * The website's copy is typeset (’ and “ ”); mobile's copies of the same lines use the
 * straight ASCII forms. That is a rendering choice on two different platforms, not two
 * different sentences, and failing the build over it would train people to ignore this
 * checker. Everything that changes MEANING — a different number, a reworded outcome, a
 * missing choice — survives the normalisation and still fails.
 */
const norm = (v) => (typeof v === 'string'
  ? v.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  : v);

function compareChoices(where, web, mob) {
  if (web.length !== mob.length) {
    fail(`${where}: ${web.length} choices on the web, ${mob.length} on mobile`);
    return;
  }
  web.forEach((wc, i) => {
    const mc = mob[i];
    for (const key of ['id', 'label', 'result']) {
      if (norm(wc[key]) !== norm(mc[key])) fail(`${where}.choices[${i}].${key}\n  app.js: ${JSON.stringify(wc[key])}\n  mobile: ${JSON.stringify(mc[key])}`);
    }
    if ((wc.coinDelta || 0) !== (mc.coinDelta || 0)) {
      fail(`${where}.choices[${i}].coinDelta: ${wc.coinDelta || 0} vs ${mc.coinDelta || 0}`);
    }
  });
}

function compareEvent(where, web, mob) {
  for (const key of ['id', 'moduleId', 'tag', 'title', 'scenario']) {
    if (norm(web[key] || null) !== norm(mob[key] || null)) {
      fail(`${where}.${key}\n  app.js: ${JSON.stringify(web[key])}\n  mobile: ${JSON.stringify(mob[key])}`);
    }
  }
  compareChoices(where, web.choices || [], mob.choices || []);
}

// ── Ambient pool ────────────────────────────────────────────────────────────────────
compareIds('LIFE_EVENTS', webAmbient, mobileAmbient);

const webById = new Map(webAmbient.map((e) => [e.id, e]));
for (const mob of mobileAmbient) {
  const web = webById.get(mob.id);
  if (!web) continue; // already reported by compareIds
  compareEvent(`event ${mob.id}`, web, mob);
}

// Every module carries its own scenarios, so no module is left drawing only general ones.
const modulesWithEvents = new Set(webAmbient.map((e) => e.moduleId).filter(Boolean));
for (const moduleId of Object.keys(mobileByModule)) {
  if (!modulesWithEvents.has(moduleId)) fail(`module ${moduleId} has no tagged events on the web`);
}

// ── Unlock events ───────────────────────────────────────────────────────────────────
const unlockKeys = [...new Set([...Object.keys(webUnlocks), ...Object.keys(mobileUnlocks)])];
for (const key of unlockKeys) {
  if (!webUnlocks[key]) { fail(`unlock ${key}: missing on the web`); continue; }
  if (!mobileUnlocks[key]) { fail(`unlock ${key}: missing on mobile`); continue; }
  compareEvent(`unlock ${key}`, webUnlocks[key], mobileUnlocks[key]);
}

if (problems.length) {
  console.error('Life events DRIFT — ' + problems.length + ' difference(s):\n');
  console.error(problems.join('\n\n'));
  process.exit(1);
}

const tagged = webAmbient.filter((e) => e.moduleId).length;
console.log(
  `Life events OK — ${webAmbient.length} ambient events (${tagged} module-tagged across `
  + `${modulesWithEvents.size} modules) and ${unlockKeys.length} unlock event(s) match between app.js and mobile.`
);
