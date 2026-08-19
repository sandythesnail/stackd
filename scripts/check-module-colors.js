/**
 * Guards the web app's module palette against the Expo app's.
 *
 * mobile/src/theme.ts is the source of truth for the eleven module chips, and the web
 * duplicates them twice over: as --mod-* custom properties in styles.css (for CSS) and as
 * MODULE_COLOR* objects in app.js (for the lesson path's SVG, which needs a real colour
 * value rather than a var() reference). Three copies of the same forty-four values drift
 * silently, so this asserts they don't.
 *
 * Deliberately NOT a contrast checker — mobile/scripts/solve-module-colors.js already owns
 * that job, including the ACCEPTED_LOW_CONTRAST and ACCEPTED_COLLISIONS exemptions for the
 * supplied palette's known failures. This only asks whether the web copied mobile faithfully;
 * whether the values themselves are sound is settled upstream.
 *
 *   node scripts/check-module-colors.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const HEX = /(\w+):\s*'(#[0-9A-Fa-f]{6})'/g;

const theme = read('mobile/src/theme.ts');
function fromTheme(name) {
  const m = theme.match(new RegExp('export const ' + name + ':[^=]*=\\s*\\{([^}]*)\\}'));
  if (!m) throw new Error('mobile/src/theme.ts: no export named ' + name);
  const out = {};
  for (const hit of m[1].matchAll(HEX)) out[hit[1]] = hit[2].toUpperCase();
  return out;
}

const appJs = read('app.js');
function fromAppJs(name) {
  const m = appJs.match(new RegExp('const ' + name + ' = \\{([\\s\\S]*?)\\};'));
  if (!m) throw new Error('app.js: no const named ' + name);
  const out = {};
  for (const hit of m[1].matchAll(HEX)) out[hit[1]] = hit[2].toUpperCase();
  return out;
}

const css = read('styles.css');
const cssVars = {};
for (const hit of css.matchAll(/--mod-([a-z]+)(-text|-ink|-deep)?:\s*(#[0-9A-Fa-f]{6});/g)) {
  cssVars[hit[1] + (hit[2] || '')] = hit[3].toUpperCase();
}

// theme.ts export → [app.js const, --mod-<id> suffix]
const FAMILIES = {
  moduleColor: ['MODULE_COLOR', ''],
  moduleColorText: ['MODULE_COLOR_TEXT', '-text'],
  moduleColorInk: ['MODULE_COLOR_INK', '-ink'],
  moduleColorDeep: ['MODULE_COLOR_DEEP', '-deep'],
};

const problems = [];
let checked = 0;

for (const [themeName, [jsName, suffix]] of Object.entries(FAMILIES)) {
  const want = fromTheme(themeName);
  const got = fromAppJs(jsName);
  const ids = Object.keys(want);

  if (ids.length !== 11) problems.push(`${themeName}: ${ids.length} modules, expected 11`);

  const extra = Object.keys(got).filter((id) => !(id in want));
  if (extra.length) problems.push(`${jsName}: has ${extra.join(', ')}, absent from ${themeName}`);

  for (const id of ids) {
    checked++;
    if (got[id] !== want[id]) {
      problems.push(`${jsName}.${id}: app.js has ${got[id] || '(missing)'}, mobile has ${want[id]}`);
    }
    const cssKey = id + suffix;
    if (cssVars[cssKey] !== want[id]) {
      problems.push(`--mod-${cssKey}: styles.css has ${cssVars[cssKey] || '(missing)'}, mobile has ${want[id]}`);
    }
  }
}

if (problems.length) {
  console.error('Module palette has drifted from mobile/src/theme.ts:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('\nmobile/src/theme.ts is the source of truth — update app.js and styles.css to match it.');
  process.exit(1);
}

console.log(`Module palette OK — ${checked} values match mobile/src/theme.ts in both app.js and styles.css.`);
