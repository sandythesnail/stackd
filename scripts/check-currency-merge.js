/**
 * Guards the rule that decides how many coins and diamonds a student actually has when a
 * device meets the cloud.
 *
 * Both apps write the same Supabase row, so both have to merge it the same way. app.js has
 * mergeCurrency; mobile has mobile/src/lib/currencyMerge.ts. Two copies drift, and this one
 * drifting is a money bug that reproduces only across two devices, which is to say it does
 * not reproduce for whoever is trying to fix it. So both are run over one table and have to
 * give the same answer on every row.
 *
 * WHAT THE RULE IS. `merged = remote + (local - lastPushed)`, clamped at zero, falling back
 * to max(local, remote) when this device has never confirmed an upload for this account.
 * The delta is sound because the one thing a client knows for certain is what it itself last
 * put in the row: anything its own balance has moved since is its own unsynced change.
 *
 * WHAT IT REPLACED, and why the table below is shaped the way it is. It used to be plain
 * max(local, remote), which assumes currency only ever goes up. That is false the moment
 * anything is bought, and app.js said so in a comment for as long as it stood there: spend on
 * the laptop, open the phone whose cache still holds the old balance, and max() keeps the
 * bigger number and re-uploads it — purchase refunded, item kept, repeatable. The rows below
 * therefore cover both directions deliberately: the stale-remote race max() was added for
 * (which the delta must still survive), and the cross-device spend it got wrong.
 *
 * Neither copy is imported. app.js is a browser script that cannot be require()d, so the
 * function is sliced out by name and evaluated with no globals; currencyMerge.ts is compiled
 * on its own, which is only possible because that file has no imports. Keep it that way.
 *
 *   node scripts/check-currency-merge.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Slices a top-level `function NAME(...) { ... }` out of a source file by brace matching,
 *  skipping strings and comments so a brace inside either cannot end it early. */
function functionFromSource(src, name, label) {
  const decl = 'function ' + name + '(';
  const start = src.indexOf(decl);
  if (start < 0) throw new Error(`${label}: no function ${name}`);
  const open = src.indexOf('{', start);
  let depth = 0, end = -1, str = null, esc = false, line = false, block = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (line) { if (ch === '\n') line = false; continue; }
    if (block) { if (ch === '*' && next === '/') { block = false; i++; } continue; }
    if (str) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === str) str = null;
      continue;
    }
    if (ch === '/' && next === '/') { line = true; i++; continue; }
    if (ch === '/' && next === '*') { block = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { str = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error(`${label}: unterminated function ${name}`);
  return src.slice(start, end + 1);
}

/* ── the web's copy ─────────────────────────────────────────────────────── */
const webSandbox = Object.create(null);
vm.runInNewContext(
  functionFromSource(read('app.js'), 'mergeCurrency', 'app.js') + '\nthis.merge = mergeCurrency;',
  webSandbox,
);
const webMerge = webSandbox.merge;

/* ── mobile's copy ──────────────────────────────────────────────────────── */
const TSC = path.join(ROOT, 'mobile', 'node_modules', 'typescript', 'bin', 'tsc');
if (!fs.existsSync(TSC)) {
  console.log('check-currency-merge: skipped, mobile/node_modules/typescript is not installed.');
  console.log('  cd mobile && npm ci');
  process.exit(0);
}
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackd-currency-'));
let mobileMerge;
try {
  execFileSync(process.execPath, [
    TSC, path.join(ROOT, 'mobile/src/lib/currencyMerge.ts'),
    '--outDir', outDir, '--module', 'commonjs', '--target', 'es2020',
  ], { stdio: 'pipe' });
  mobileMerge = require(path.join(outDir, 'currencyMerge.js')).mergeCurrency;
} catch (e) {
  console.error('check-currency-merge: could not compile mobile/src/lib/currencyMerge.ts alone.');
  console.error('  That file must stay import-free — see its header.');
  console.error(String((e && e.stdout) || e));
  process.exit(1);
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

/* ── the table ──────────────────────────────────────────────────────────── */
// [name, local, remote, baseline, expected]
const CASES = [
  // The race max() was introduced for, and the reason it cannot simply be deleted: a reward
  // claimed on this device seconds ago, with the debounced upload still in flight, so the
  // row this sign-in reads back is one step behind. It has to survive.
  ['reward claimed, upload still in flight', 120, 100, 100, 120],
  // ...and the half max() could not do. Same race, but the other device meanwhile spent, so
  // remote is LOWER than both local and the baseline. max() answered 120 and refunded the
  // purchase; the delta answers 60, which is 40 spent elsewhere plus 20 earned here.
  ['claimed here, spent there', 120, 40, 100, 60],

  // The refund exploit itself, at its simplest: this device is fully synced (local ===
  // baseline) and has nothing outstanding, so the cloud is simply right.
  ['idle device, purchase made elsewhere', 1000, 500, 1000, 500],
  ['idle device, earnings made elsewhere', 1000, 1500, 1000, 1500],

  // Two devices earning offline should ADD, not take the larger. max() lost the smaller
  // one's work every time.
  ['both earned offline', 150, 130, 100, 180],

  // Spending on this device, not yet uploaded, must not be undone by the read.
  ['spent here, not yet uploaded', 70, 100, 100, 70],

  // No baseline: a fresh install or blocked storage. Indistinguishable, so fall back to
  // max() — it can hand currency back, never take it.
  ['no baseline, local ahead', 120, 100, undefined, 120],
  ['no baseline, remote ahead', 100, 120, undefined, 120],
  ['no baseline, both zero', 0, 0, undefined, 0],

  // A row with no currency in it at all (a blob written before these fields existed) must
  // leave the local balance alone rather than reading undefined as zero.
  ['remote has no coins field', 250, undefined, 100, 250],

  // Clamped: both devices spent against the same balance while offline. The honest
  // arithmetic is -20; nobody is shown a debt.
  ['both spent offline, past zero', 30, 50, 100, 0],

  // The referral activation, which is the one payment the server writes into the row itself
  // AND the client mirrors locally. Both writes are 15, so the baseline is bumped by 15 too
  // and the delta comes out at zero — without that bump this row reads 130. See the
  // invariant note below the table.
  ['referral +15, server wrote it and the baseline was bumped', 115, 115, 115, 115],

  // Zero is a real balance, not a missing one — a player who has spent everything must not
  // have it handed back by a baseline that reads as absent.
  ['spent down to nothing', 0, 0, 0, 0],
  ['spent to zero here, remote stale', 0, 100, 100, 0],
];

const problems = [];

/* ── the out-of-band-write invariant ────────────────────────────────────────
 *
 * The delta merge rests on one assumption: the baseline is what the remote row holds as far
 * as this device knows. Almost every change to that row is this device pushing, so push() is
 * where the baseline is written — but a SECURITY DEFINER function can write a balance too,
 * and a client that also mirrors that credit locally has to advance its baseline by the same
 * amount or the merge counts the payment twice (local X+15, remote X+15, baseline X, so
 * remote + (local - baseline) = X+30). max() used to get this right by accident, because the
 * two sides came out equal.
 *
 * There is exactly one such write today — claim_referral_activation's +15 coins — and both
 * clients call their baseline bump beside it. This is the tripwire for the second one: adding
 * a server-side write to a balance without handling the baseline is a silent double-credit,
 * and the person adding it has no reason to know this file exists.
 */
const sqlWrites = (read('supabase/referrals.sql').match(/update\s+public\.user_progress/g) || []).length
  + (read('supabase/feedback.sql').match(/update\s+public\.user_progress/g) || []).length
  + (read('supabase/account-deletion.sql').match(/update\s+public\.user_progress/g) || []).length;
const KNOWN_SERVER_WRITES = 1; // claim_referral_activation, +15 coins to the referred player
if (sqlWrites !== KNOWN_SERVER_WRITES) {
  problems.push(
    `supabase/*.sql now has ${sqlWrites} server-side writes to user_progress, not `
    + `${KNOWN_SERVER_WRITES}. Every one that changes coins or diamonds AND is mirrored `
    + "locally by a client must also advance that client's currency baseline — see "
    + 'bumpCurrencyBaseline in app.js and mobile/src/lib/SupabaseSync.tsx. Update this count '
    + 'once the new write is handled.');
}
// Both clients must still HAVE the bump, and must still call it where the referral coins are
// mirrored. A rename that quietly drops the call reads as a tidy-up and is a double-credit.
for (const [label, src, decl] of [
  ['app.js', read('app.js'), 'function bumpCurrencyBaseline('],
  ['mobile/src/lib/SupabaseSync.tsx', read('mobile/src/lib/SupabaseSync.tsx'), 'function bumpCurrencyBaseline('],
]) {
  if (!src.includes(decl)) problems.push(`${label}: bumpCurrencyBaseline is gone — see the invariant note in this file.`);
  else if ((src.match(/bumpCurrencyBaseline\(/g) || []).length < 2) {
    problems.push(`${label}: bumpCurrencyBaseline is defined but never called.`);
  }
}

for (const [name, local, remote, baseline, expected] of CASES) {
  const web = webMerge(local, remote, baseline);
  const mob = mobileMerge(local, remote, baseline);
  const shown = `local ${local}, remote ${remote}, baseline ${baseline}`;
  if (web !== expected) problems.push(`${name} (${shown}): app.js says ${web}, the table says ${expected}`);
  if (mob !== expected) problems.push(`${name} (${shown}): currencyMerge.ts says ${mob}, the table says ${expected}`);
  if (web !== mob) problems.push(`${name} (${shown}): THE TWO APPS DISAGREE — app.js ${web}, mobile ${mob}`);
}

/* ── the idempotency property ────────────────────────────────────────────────
 *
 * A sign-in that is interrupted before its upload lands must not change the answer when it
 * happens again. Both clients re-anchor the baseline on the balance the READ returned (see
 * applyRemoteState in app.js and the load effect in SupabaseSync.tsx), which is what makes
 * that true; this asserts the property those two lines exist to provide.
 *
 * Without the re-anchor the merge drifts, and drifts in the direction that costs the player:
 * baseline 100, 20 earned here and not yet uploaded, 50 spent on the other device so the row
 * holds 50. The merge lands on 70. Killed before the push, the next launch computes
 * 50 + (70 - 100) = 20, and the one after 0 — the same purchase subtracted again on every
 * launch until the balance is gone.
 */
for (let local = 0; local <= 200; local += 20) {
  for (let remote = 0; remote <= 200; remote += 20) {
    for (const baseline of [undefined, 0, 40, 100, 200]) {
      const first = webMerge(local, remote, baseline);
      // The client now stores `remote` as the baseline, so a repeat of the same sign-in with
      // no push in between sees (first, remote, remote).
      const again = webMerge(first, remote, remote);
      if (again !== first) {
        problems.push(
          `idempotency: local ${local}, remote ${remote}, baseline ${baseline} -> ${first}, `
          + `but signing in again without pushing gives ${again}`);
      }
      if (mobileMerge(first, remote, remote) !== again) {
        problems.push(`idempotency: the two apps disagree at local ${local}, remote ${remote}, baseline ${baseline}`);
      }
    }
  }
}

// Both clients must actually DO the re-anchoring the property above assumes. A merge that is
// mathematically idempotent is no help if nobody moves the baseline, so this looks at the READ
// path specifically rather than counting calls file-wide — the push already writes a baseline,
// and counting would go on passing with the read-path call deleted.
//
// app.js: applyRemoteState has two of them, one in the resetToken branch that returns early
// and one after the merge. Both matter; the reset branch takes the row wholesale, so leaving
// it un-anchored makes the next load subtract the whole wiped balance again.
const applyRemote = functionFromSource(read('app.js'), 'applyRemoteState', 'app.js');
const anchors = (applyRemote.match(/recordCurrencyBaseline\(/g) || []).length;
if (anchors < 2) {
  problems.push(
    `app.js: applyRemoteState re-anchors the currency baseline ${anchors} time(s), expected 2 `
    + '(the resetToken branch and the merge path). Without that a load interrupted before its '
    + 'upload drains the balance a little more every time — see the idempotency note above.');
}

// mobile: the load effect anchors on `userId`, the push on `uid`. The distinct name is what
// separates the read path from the write path here.
if (!/writeCurrencyBaseline\(\s*userId/.test(read('mobile/src/lib/SupabaseSync.tsx'))) {
  problems.push(
    'mobile/src/lib/SupabaseSync.tsx: the sign-in load no longer re-anchors the currency '
    + 'baseline on the row it just read — see the idempotency note above.');
}

// Neither copy may ever invent currency out of a merge it was not given a reason for. This
// is the property that matters more than any single row: over a wide sweep, the answer is
// never above what the two sides plus the outstanding delta can justify.
for (let local = 0; local <= 200; local += 25) {
  for (let remote = 0; remote <= 200; remote += 25) {
    for (const baseline of [undefined, 0, 50, 100, 200]) {
      const got = webMerge(local, remote, baseline);
      const ceiling = baseline === undefined ? Math.max(local, remote) : remote + Math.max(0, local - baseline);
      if (got > ceiling) {
        problems.push(`sweep: local ${local}, remote ${remote}, baseline ${baseline} -> ${got}, above the justifiable ${ceiling}`);
      }
      if (got < 0) problems.push(`sweep: local ${local}, remote ${remote}, baseline ${baseline} -> ${got}, negative`);
      if (mobileMerge(local, remote, baseline) !== got) {
        problems.push(`sweep: local ${local}, remote ${remote}, baseline ${baseline} — the two apps disagree`);
      }
    }
  }
}

if (problems.length) {
  console.error('\nThe two apps do not agree about how a balance merges:\n');
  for (const p of problems.slice(0, 20)) console.error('  ' + p);
  if (problems.length > 20) console.error(`  ...and ${problems.length - 20} more`);
  console.error('\nBoth copies have to change together: app.js mergeCurrency and');
  console.error('mobile/src/lib/currencyMerge.ts. Update the table here if the rule really moved.\n');
  process.exit(1);
}

console.log(
  `Currency merge OK — app.js and mobile agree on all ${CASES.length} cases, across a `
  + '225-point sweep and a 550-point idempotency sweep; a stale read never loses an unsynced reward, and a purchase made on '
  + 'the other device is never refunded.');
