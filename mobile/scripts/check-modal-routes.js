#!/usr/bin/env node
/**
 * Regression guard for the recurring "post-lesson unmatched route" crash.
 *
 * The web build sets baseUrl "/m" (see app.json). Expo Router's stripBaseUrl()
 * removes that base as a RAW STRING PREFIX, so a *string* navigation to a route
 * that itself starts with "/m" gets its "m" eaten:
 *
 *     router.push('/modal/life-event')  ->  parsed as  '/odal/life-event'
 *                                       ->  re-based to '/m/odal/life-event'  (unmatched route)
 *
 * Object-form navigation resolves the pathname against the route tree instead of
 * string-matching, so it is immune:
 *
 *     router.push({ pathname: '/modal/life-event' })   // safe
 *
 * This fix keeps getting reverted because a bare string *looks* correct. This
 * script fails the build if any string-literal navigation or <Link>/<Redirect>
 * href targets a route beginning with "/m" (i.e. anything under /modal/*). Wire
 * it into the build so a regression can never ship.
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
 *  the bad pattern (e.g. the explanatory comment in results.tsx) is not flagged.
 *  Replaces comment chars with spaces to preserve line/column numbers. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, ' '));
}

// A string literal beginning with "/m" passed straight to a navigation call, or
// used as a Link/Redirect href. Object form (push({ pathname: ... }), href={{...}})
// never matches because the char after "(" / "href=" is "{", not a quote.
const PATTERNS = [
  {
    re: /\b(?:router|navigation)\s*\.\s*(?:push|replace|navigate)\s*\(\s*(['"`])\/m/g,
    what: 'string-form router navigation to a /m* route',
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
    '\n  Use object form so the "m" of "modal" is not eaten by the "/m" baseUrl:\n' +
      "      router.push({ pathname: '/modal/life-event' })\n" +
      "  not router.push('/modal/life-event').\n"
  );
  process.exit(1);
}

console.log('✓ check-modal-routes: no unsafe string navigations to /m* routes.');
