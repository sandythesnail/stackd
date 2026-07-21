#!/usr/bin/env node
/**
 * Regression guard for the recurring "post-lesson unmatched route" crash.
 *
 * The web build sets baseUrl "/m" (see app.json). Expo Router's stripBaseUrl()
 * removes that base as a RAW STRING PREFIX (no segment-boundary check), so any
 * route whose path itself starts with "/m" has its "m" eaten during path
 * resolution:
 *
 *     '/modal/life-event'  --stripBaseUrl('/m')-->  'odal/life-event'  (unmatched)
 *                          --then re-based-->        '/m/odal/life-event'
 *
 * This is FORM-INDEPENDENT. resolveHref({ pathname: '/modal/x' }) with no params
 * returns the same bare string '/modal/x' as a plain string push, and both are
 * handed to getStateFromPath() -> stripBaseUrl(). Object form is NOT immune. It
 * also only bites in the production web export (stripBaseUrl no-ops when
 * NODE_ENV=development), which is why it never reproduces with `expo start`.
 *
 * The only robust fix is to keep route segments off the letter "m" so they can't
 * collide with the "/m" baseUrl (the modal/* routes were renamed to sheet/*).
 * This script fails the build if any navigation or <Link>/<Redirect> href — in
 * EITHER string or object form — targets a "/m*" route. Wire it into the build so
 * a regression can never ship.
 *
 * Zero dependencies — runs on plain Node.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

/** Recursively collect .ts/.tsx files under a directory. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...walk(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Blank out // line comments and block comments so guidance text that mentions
 *  the bad pattern (e.g. the explanatory comments in results.tsx / _layout.tsx)
 *  is not flagged. Replaces comment chars with spaces to preserve line/columns. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, ' '));
}

// Any navigation target beginning with "/m" collides with baseUrl "/m". These
// patterns catch it in both string and object form:
const PATTERNS = [
  {
    re: /\b(?:router|navigation)\s*\.\s*(?:push|replace|navigate)\s*\(\s*(['"`])\/m/g,
    what: 'string-form router navigation to a /m* route',
  },
  {
    // Object form: push({ pathname: '/m…' }), <Redirect href={{ pathname: '/m…' }}>, etc.
    re: /\bpathname\s*:\s*(['"`])\/m/g,
    what: 'object-form navigation (pathname) to a /m* route',
  },
  {
    re: /\bhref\s*=\s*\{?\s*(['"`])\/m/g,
    what: '<Link>/<Redirect> href to a /m* route',
  },
];

const violations = [];
for (const file of walk(SRC)) {
  const cleaned = stripComments(fs.readFileSync(file, 'utf8'));
  const lines = cleaned.split('\n');
  lines.forEach((line, i) => {
    for (const { re, what } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) {
        violations.push({
          file: path.relative(path.join(__dirname, '..', '..'), file),
          line: i + 1,
          what,
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length) {
  console.error('\n✖ Unsafe route navigation detected (baseUrl "/m" collision).\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} — ${v.what}`);
    console.error(`      ${v.text}`);
  }
  console.error(
    '\n  The web baseUrl is "/m", and Expo Router strips it as a raw string prefix, so a\n' +
      '  route like "/modal/*" resolves to the unmatched "/m/odal/*" in the production web\n' +
      '  build (both string and object form). Route it under a segment that does not start\n' +
      '  with "m" (the modal screens live under /sheet/*), e.g.:\n' +
      "      router.push({ pathname: '/sheet/life-event' })\n"
  );
  process.exit(1);
}

console.log('✓ check-modal-routes: no navigation targets a /m* route (baseUrl "/m" is safe).');
