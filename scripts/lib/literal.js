/**
 * Slices a top-level `const NAME<…> = <open> … <close>;` literal out of a source file and
 * evaluates just that literal.
 *
 * The two apps keep their shared content in plain literals — app.js is a classic browser
 * script that cannot be require()d, and mobile's are TypeScript — so the drift checkers read
 * the data by cutting the literal out and evaluating it on its own. No app or module code
 * runs, and the sandbox has no globals for the literal to reach if it tried.
 *
 * Shared by scripts/check-life-events.js and scripts/check-survey.js. check-content.js keeps
 * its own MODULES-specific reader; this is the general one.
 */
const vm = require('vm');

/**
 * @param {string} src    file contents
 * @param {string} name   the const's name
 * @param {'['|'{'} open  the literal's opening bracket
 * @param {string} label  file name, for error messages
 */
function literal(src, name, open, label) {
  const close = open === '[' ? ']' : '}';
  const decl = src.indexOf('const ' + name);
  if (decl < 0) throw new Error(`${label}: no ${name}`);
  // From the `=`, not from the declaration. `const GENERAL_LIFE_EVENTS: LifeEvent[] = [` puts
  // a `[` inside the TYPE annotation, so searching from the name found that one and sliced
  // the empty pair out of `LifeEvent[]` — an empty catalogue that then silently compared
  // equal to nothing at all.
  const eq = src.indexOf('=', decl);
  const start = src.indexOf(open, eq);
  if (start < 0) throw new Error(`${label}: ${name} has no ${open}`);

  // Comment-aware, not just string-aware. These catalogues are heavily commented and the
  // comments are full of apostrophes ("mobile's", "you're"); a scanner that only tracks
  // quotes reads the first one as the start of a string literal and loses the plot several
  // hundred characters later, at whichever bracket it then fails to count.
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

/**
 * Curly quotes and apostrophes normalised to their ASCII forms.
 *
 * The website's copy is typeset (’ and “ ”); mobile's copies of the same lines use the
 * straight forms. That is a rendering choice on two platforms, not two different sentences,
 * and failing a build over it would train people to ignore these checkers. Everything that
 * changes MEANING survives the normalisation and still fails.
 */
const normalizeQuotes = (v) => (typeof v === 'string'
  ? v.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  : v);

module.exports = { literal, normalizeQuotes };
