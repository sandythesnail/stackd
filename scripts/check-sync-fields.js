/**
 * Guards the bridge between the two apps: every field of mobile's AppState has to have a
 * decided home in the shared Supabase blob, and the fields BOTH apps keep have to be mapped
 * to each other rather than stashed where only one of them can look.
 *
 * The failure this exists to stop has happened four times, and it is invisible from either
 * app on its own. mobile/src/lib/webState.ts calls it the lastModuleActivityDate trap: a
 * field that exists on both sides gets listed in MOBILE_ONLY_KEYS, so it is written under
 * `_mobile` — a key the website ignores — and the two apps then disagree forever about a
 * fact they both record. Finishing a lesson left Hammy happy on one device and grumpy on the
 * other. Sitting the final assessment on a phone left the laptop offering it as untaken.
 * Choosing a track on the website put the phone through the whole survey again.
 *
 * The postTest case is the one worth remembering, because it was a fix that looked complete:
 * the commit removed postTest from MOBILE_ONLY_KEYS and said in its own message that it was
 * "shared in both directions now", but never added it to the mapping. Net effect, the field
 * stopped round-tripping mobile→mobile without ever starting to reach the web. Nothing failed;
 * `npm run check` stayed green; the only symptom was on a second device.
 *
 * So this checks three things, all by reading source text (webState.ts imports the whole
 * content bundle and cannot be require()d from a plain node script):
 *
 *   1. COVERAGE   every AppState key is either mapped by name in webState.ts's code, or
 *                 deliberately listed as dropped below. A new field added to the store and
 *                 forgotten here is silently lost on every sign-in.
 *   2. DIRECTIONS every shared field is read (webToMobile) AND written (mobileToWeb). One
 *                 direction alone is how postTest broke.
 *   3. WEB SIDE   every shared field is really in app.js's save whitelist under the name
 *                 this side expects, so the mapping points at a field the website persists.
 *
 *   node scripts/check-sync-fields.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const storeSrc = read('mobile/src/store.tsx');
const webStateSrc = read('mobile/src/lib/webState.ts');
const appSrc = read('app.js');

const problems = [];

/** Strips comments so a field named only in prose never counts as mapped. This is the whole
 * point: webState.ts's comments discuss fields at length, including ones it does not map. */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/* ── 1. every AppState key has a home ──────────────────────────────────── */

function appStateKeys() {
  const lines = storeSrc.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('export type AppState = {'));
  if (start < 0) throw new Error('store.tsx: no `export type AppState = {`');
  const keys = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === '};') return keys;
    const m = lines[i].match(/^ {2}([a-zA-Z_][a-zA-Z0-9_]*)\??:/);
    if (m) keys.push(m[1]);
  }
  throw new Error('store.tsx: AppState is not terminated by a bare `};`');
}

/** Fields that genuinely never leave the device, with the reason. Anything here is asserted
 * NOT to be mapped, so a field that later grows a real home has to be moved out of this list
 * rather than quietly counting as both. */
const DELIBERATELY_LOCAL = {
  levelUpBanner:
    'a celebration waiting to be shown, not progress — it is announced on the device that '
    + 'earned it and means nothing on another one',
};

const webStateCode = code(webStateSrc);
const mobileOnly = (() => {
  const m = webStateSrc.match(/const MOBILE_ONLY_KEYS = \[([\s\S]*?)\] as const;/);
  if (!m) throw new Error('webState.ts: no MOBILE_ONLY_KEYS array');
  return code(m[1]).match(/'([^']+)'/g).map((s) => s.slice(1, -1));
})();

const keys = appStateKeys();
for (const key of keys) {
  const local = Object.prototype.hasOwnProperty.call(DELIBERATELY_LOCAL, key);
  // Word-boundary match against the code only. `_mobile`-stashed fields count as mapped
  // through MOBILE_ONLY_KEYS, which is itself part of the code.
  const mapped = new RegExp('\\b' + key + '\\b').test(webStateCode);
  if (local && mapped) {
    problems.push(
      `${key}: listed in DELIBERATELY_LOCAL but webState.ts does map it. If it now has a `
      + 'home, take it out of that list.');
  } else if (!local && !mapped) {
    problems.push(
      `${key}: in AppState but nowhere in webState.ts's code — it is dropped on every `
      + 'sign-in. Map it, add it to MOBILE_ONLY_KEYS, or record it in DELIBERATELY_LOCAL '
      + 'with a reason.');
  }
}
for (const key of Object.keys(DELIBERATELY_LOCAL)) {
  if (!keys.includes(key)) problems.push(`${key}: in DELIBERATELY_LOCAL but not in AppState.`);
}

/* ── 2 & 3. the fields both apps keep ──────────────────────────────────── */

/** mobile AppState field -> the name the WEBSITE persists it under.
 *
 * `web` is the key as it appears in app.js's saveState whitelist; a dotted path means the
 * website nests it (the survey is one object over there, two separate fields here). */
const SHARED = [
  { mobile: 'lastModuleActivityDate', web: 'lastModuleActivityDate' },
  { mobile: 'hasSeenOnboardingTour', web: 'hasSeenOnboardingTour' },
  { mobile: 'postTest', web: 'postTest' },
  { mobile: 'onboardingTrackId', web: 'onboardingSurvey.trackId' },
  { mobile: 'hasCompletedOnboarding', web: 'onboardingSurvey.completed' },
];

/** Slices one exported function's body out of webState.ts by brace matching, so "is this
 * field read" and "is this field written" are asked of the right direction rather than of
 * the file as a whole — the postTest bug was present in a file that mentioned postTest. */
function functionBody(src, name) {
  const start = src.indexOf('export function ' + name + '(');
  if (start < 0) throw new Error(`webState.ts: no exported ${name}`);
  const open = src.indexOf('{', src.indexOf(')', start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  throw new Error(`webState.ts: unterminated ${name}`);
}

// mergeSurvey is where mobileToWeb puts the survey halves; it is called from there, so read
// it as part of that direction rather than expecting the fields inline.
const readDir = code(functionBody(webStateSrc, 'webToMobile'));
const writeDir = code(functionBody(webStateSrc, 'mobileToWeb'))
  + (webStateSrc.includes('function mergeSurvey(')
    ? code(webStateSrc.slice(webStateSrc.indexOf('function mergeSurvey(')))
    : '');

const whitelist = (() => {
  // saveState()'s destructure — the explicit list of what the website actually persists.
  const m = appSrc.match(/const snapshot = \{([^}]*)\};/);
  if (!m) throw new Error('app.js: no `const snapshot = { … };` in saveState');
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
})();

for (const { mobile, web } of SHARED) {
  const root = web.split('.')[0];
  if (!whitelist.includes(root)) {
    problems.push(
      `${mobile} -> ${web}: the website does not persist \`${root}\` (it is not in `
      + "app.js's saveState whitelist), so nothing mobile writes there survives a reload.");
  }
  if (!new RegExp('\\b' + mobile + '\\b').test(readDir)) {
    problems.push(`${mobile}: shared, but webToMobile never reads it — the website's copy never reaches the phone.`);
  }
  const written = new RegExp('\\b' + root + '\\b').test(writeDir);
  if (!written) {
    problems.push(`${mobile}: shared, but mobileToWeb never writes \`${root}\` — the phone's copy never reaches the website.`);
  }
  if (SHARED_MUST_NOT_BE_ONLY_STASHED(mobile)) {
    problems.push(
      `${mobile}: mapped nowhere but MOBILE_ONLY_KEYS. That is the lastModuleActivityDate `
      + 'trap — the website keeps this field too, and `_mobile` is a key it ignores.');
  }
}

/** True when a shared field's ONLY appearance is the `_mobile` stash list. Being in that list
 * as well is fine and deliberate (older installs read these only out of `_mobile`); being in
 * it INSTEAD is the bug. */
function SHARED_MUST_NOT_BE_ONLY_STASHED(key) {
  if (!mobileOnly.includes(key)) return false;
  const withoutList = webStateCode.replace(/const MOBILE_ONLY_KEYS = \[[\s\S]*?\] as const;/, ' ');
  return !new RegExp('\\b' + key + '\\b').test(withoutList);
}

/* ── report ────────────────────────────────────────────────────────────── */

if (problems.length) {
  console.error('Sync fields FAILED:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

const stashed = keys.filter((k) => mobileOnly.includes(k) && !SHARED.some((s) => s.mobile === k));
console.log(
  `Sync fields OK — all ${keys.length} AppState fields have a home, ${SHARED.length} are `
  + `shared with the website in both directions, ${stashed.length} ride along under \`_mobile\`, `
  + `${Object.keys(DELIBERATELY_LOCAL).length} stay on the device.`);
