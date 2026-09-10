/**
 * Every localStorage/sessionStorage access in the web app must sit inside a try.
 *
 * These throw. Not "return null" — throw, synchronously, on the property access itself, in a
 * browser with site data blocked (Safari's "Block All Cookies", a locked-down school or
 * enterprise profile, some private modes). This app is used on school devices, so that is a
 * real configuration and not a hypothetical one.
 *
 * The consequence is never "a preference was not saved". It is whatever else was in the same
 * function. Four live examples, all fixed in the commit that added this file:
 *
 *   - signup.js stashed a referral code before mounting the Clerk widget, inside an async
 *     load handler with no outer catch. The throw escaped, mountSignUp never ran, and the
 *     page was blank with no error and no retry — nobody could create an account.
 *   - app.js read the remembered last page in the middle of boot. Everything after it —
 *     showPage, renderPageContent, and the maybeShowFirstTimeExperience handoff app-auth.js
 *     calls — never ran.
 *   - "Reset all progress" cleared the local cache before upserting the reset. The throw
 *     abandoned the reset after the confirm dialog had already been dismissed, silently.
 *   - Account deletion did the same at its point of no return, after the rows were gone.
 *
 * app.js already had the matching WRITE guarded in showPage, with a comment explaining this
 * exact failure. Its READ, one function away, was not. That is why this is a check and not a
 * code review note.
 *
 * Parsed properly with TypeScript's own parser (already present for mobile) rather than
 * grepped: "is this inside a try" is a question about ancestors, and a regex answering it
 * would be wrong in both directions.
 *
 *   node scripts/check-storage-guards.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TS = path.join(ROOT, 'mobile', 'node_modules', 'typescript');
if (!fs.existsSync(TS)) {
  console.log('check-storage-guards: skipped, mobile/node_modules/typescript is not installed.');
  console.log('  cd mobile && npm ci');
  process.exit(0);
}
const ts = require(TS);

const FILES = ['app.js', 'app-auth.js', 'landing.js', 'signup.js', 'login.js', 'm-redirect.js',
  'hammy-intro.js', 'daily-rewards.js', 'post-test.js', 'lesson-path.js', 'clerk-account-picker.js'];

const problems = [];
let checked = 0;

for (const file of FILES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const src = fs.readFileSync(full, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);

  const visit = (node, guarded) => {
    // Entering a try BLOCK protects everything in it. The catch and finally clauses do not:
    // a throw there is not caught by their own try.
    if (ts.isTryStatement(node)) {
      ts.forEachChild(node.tryBlock, (c) => visit(c, true));
      if (node.catchClause) ts.forEachChild(node.catchClause, (c) => visit(c, guarded));
      if (node.finallyBlock) ts.forEachChild(node.finallyBlock, (c) => visit(c, guarded));
      return;
    }
    if (ts.isPropertyAccessExpression(node)) {
      const obj = node.expression.getText(sf);
      if (obj === 'localStorage' || obj === 'sessionStorage'
        || obj === 'window.localStorage' || obj === 'window.sessionStorage') {
        checked++;
        if (!guarded) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          problems.push(`${file}:${line + 1}  ${node.getText(sf)}(…)  is not inside a try`);
        }
      }
    }
    ts.forEachChild(node, (c) => visit(c, guarded));
  };
  ts.forEachChild(sf, (c) => visit(c, false));
}

if (problems.length) {
  console.error('Storage guards FAILED — these throw outright when site data is blocked:\n');
  for (const p of problems) console.error('  - ' + p);
  console.error('\nWrap each in try/catch. On the app pages call warnLocalStorageUnavailable(e)');
  console.error('in the catch; elsewhere a console.warn is enough. What matters is that the');
  console.error('REST of the function still runs — the storage itself is never the point.\n');
  process.exit(1);
}

console.log(`Storage guards OK — all ${checked} localStorage/sessionStorage accesses across `
  + `${FILES.length} files are inside a try, so a browser with site data blocked loses a `
  + 'convenience rather than the page.');
