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
 *  - Curly vs straight quotes, which are normalised away (see lib/literal's
 *    normalizeQuotes).
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
const { literal, normalizeQuotes: norm } = require('./lib/literal');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const appJs = read('app.js');
const mobileTs = read('mobile/src/lifeEvents.ts');

const webAmbient = literal(appJs, 'LIFE_EVENTS', '[', 'app.js');
const webUnlocks = literal(appJs, 'LIFE_EVENT_UNLOCKS', '{', 'app.js');

const mobileGeneral = literal(mobileTs, 'GENERAL_LIFE_EVENTS', '[', 'lifeEvents.ts');
const mobileByModule = literal(mobileTs, 'MODULE_LIFE_EVENTS', '{', 'lifeEvents.ts');
const mobileUnlocks = literal(mobileTs, 'LIFE_EVENT_UNLOCKS', '{', 'lifeEvents.ts');

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

// ── How often one fires ─────────────────────────────────────────────────────────────
//
// The catalogue matching is only half of "do both apps behave the same". The GATE decides how
// often a student is interrupted at all, and it drifted badly while every check here passed:
// mobile held `lifeEventCooldown`, a countdown decremented once per roll ATTEMPT, and attempts
// happen on every non-final chapter transition — so a cooldown named in SESSIONS was spent
// inside two chapter turns of the same lesson. Simulated over thirty lessons, mobile fired
// thirty scenarios where the website fired five.
//
// Both apps now measure the same thing: sessions since the last one fired, where a session is
// one app open. This asserts the two constants match numerically AND that neither side has
// gone back to consuming a budget per attempt, which is the shape of the bug.
/** A named numeric constant's value, from either app's source.
 *
 *  A regex LITERAL matching every `NAME = <number>` and then filtering by name, rather than
 *  building one with new RegExp — the escaping in a constructed pattern has to survive being
 *  written by hand into two apps' worth of tooling, and a `\b` that arrives as a backspace
 *  matches nothing while looking perfectly correct. Tolerates mobile's `: number` annotation. */
const num = (src, name) => {
  for (const m of src.matchAll(/\b([A-Z][A-Z0-9_]*)\s*(?::\s*number\s*)?=\s*(-?[0-9.]+)/g)) {
    if (m[1] === name) return Number(m[2]);
  }
  return null;
};
const webCooldown = num(appJs, 'LIFE_EVENT_COOLDOWN_SESSIONS');
const mobCooldown = num(mobileTs, 'LIFE_EVENT_COOLDOWN_SESSIONS');
const webChance = num(appJs, 'LIFE_EVENT_CHANCE');
const mobChance = num(mobileTs, 'LIFE_EVENT_CHANCE');
if (webCooldown === null) fail('app.js: no LIFE_EVENT_COOLDOWN_SESSIONS');
if (mobCooldown === null) fail('mobile: no LIFE_EVENT_COOLDOWN_SESSIONS');
if (webCooldown !== mobCooldown) fail(`cooldown differs: web waits ${webCooldown} session(s), mobile ${mobCooldown}`);
if (webChance !== mobChance) fail(`roll chance differs: web ${webChance}, mobile ${mobChance}`);

// The gate itself, on both sides, has to be a difference between two session counters. A
// countdown stored in state and decremented on a miss is the failure this section exists for.
const storeSrc = read('mobile/src/store.tsx');
if (!/sessionCount\s*-\s*\w*\.?lastTriggeredSession/.test(appJs)) {
  fail('app.js: maybeTriggerAmbientLifeEvent no longer measures sessions since the last event');
}
if (!/lifeEventSessionCount\s*-\s*\w*\.?lifeEventLastTriggeredSession/.test(storeSrc)) {
  fail('mobile/src/store.tsx: ambientRollAllowed no longer measures sessions since the last event');
}
for (const [label, src] of [['app.js', appJs], ['mobile/src/store.tsx', storeSrc]]) {
  // A decrement of anything cooldown-shaped means eligibility is being spent by attempts
  // again, which decouples it from the unit it is named in.
  if (/[Cc]ooldown\s*(?:-{2}|-=|:\s*[^,;]*-\s*1\b)/.test(src)) {
    fail(`${label}: something cooldown-shaped is being decremented — the gate is counted in `
      + 'sessions (app opens), not in roll attempts. See ambientRollAllowed in store.tsx.');
  }
}

if (problems.length) {
  console.error('Life events DRIFT — ' + problems.length + ' difference(s):\n');
  console.error(problems.join('\n\n'));
  process.exit(1);
}

const tagged = webAmbient.filter((e) => e.moduleId).length;
console.log(
  `Life events OK — ${webAmbient.length} ambient events (${tagged} module-tagged across `
  + `${modulesWithEvents.size} modules) and ${unlockKeys.length} unlock event(s) match between app.js and mobile,`
  + ` and both fire at ${webChance} after ${webCooldown} session(s).`
);
