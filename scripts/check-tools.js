/**
 * Guards the Tools tab's shared numbers against drift between the two apps.
 *
 * The three simulators ask their "which kind" questions with named options that carry a rate
 * or a term — "Index fund, about 8.5% a year", "Federal unsubsidized, about 7%", "Extended,
 * 20 years" — and the Budget calculator asks about ten fixed spending categories. All four
 * lists exist twice: app.js's CI_RATE_OPTIONS / LOAN_RATE_OPTIONS / LOAN_TERM_OPTIONS /
 * BUDGET_CATEGORY_LABELS, and the same lists in mobile/src/app/(tabs)/tools.tsx.
 *
 * These are not decoration. The option's `value` IS the rate fed to the compound-growth and
 * loan-amortisation maths, so a number that differs by half a point means the same student
 * asking the same question of the same product gets two different answers depending on which
 * device is in their hand — and a missing option means one app cannot even express a case the
 * other can. The labels matter almost as much: the whole reason these are named options
 * rather than a bare percentage slider is that the NAME is what a student can actually answer.
 *
 * The budget plan is synced (user_progress.state.budgetPlan), so its category keys have to
 * agree exactly or figures typed on one device land in the wrong row on the other.
 *
 *   node scripts/check-tools.js
 */
const fs = require('fs');
const path = require('path');
const { literal, normalizeQuotes: norm } = require('./lib/literal');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const appJs = read('app.js');
const toolsTsx = read('mobile/src/app/(tabs)/tools.tsx');

const problems = [];
const fail = (m) => problems.push(m);

/** The three option lists. Mobile calls the term one TERM_OPTIONS; everything else matches. */
const OPTION_LISTS = [
  { web: 'CI_RATE_OPTIONS', mobile: 'CI_RATE_OPTIONS', what: 'where the money sits' },
  { web: 'LOAN_RATE_OPTIONS', mobile: 'LOAN_RATE_OPTIONS', what: 'loan type' },
  { web: 'LOAN_TERM_OPTIONS', mobile: 'TERM_OPTIONS', what: 'repayment plan' },
];

for (const { web: wName, mobile: mName, what } of OPTION_LISTS) {
  const w = literal(appJs, wName, '[', 'app.js');
  const m = literal(toolsTsx, mName, '[', 'tools.tsx');
  if (w.length !== m.length) {
    fail(`${what}: app.js offers ${w.length} options, mobile offers ${m.length}`
      + `\n  app.js: ${w.map((o) => o.label).join(' | ')}`
      + `\n  mobile: ${m.map((o) => o.label).join(' | ')}`);
    continue;
  }
  // Order matters: it is the order the student reads, and the first entry is the default on
  // neither app but the top of the list on both.
  w.forEach((o, i) => {
    for (const k of ['value', 'label', 'sub']) {
      if (norm(o[k]) !== norm(m[i][k])) {
        fail(`${what}[${i}].${k}\n  app.js: ${JSON.stringify(o[k])}\n  mobile: ${JSON.stringify(m[i][k])}`);
      }
    }
  });
}

/* Budget categories. The web keeps the order in its own array; mobile relies on the object's
   own key order, which is stable in both JS and TS for string keys. Compare both the keys and
   the labels, in order. */
{
  const w = literal(appJs, 'BUDGET_CATEGORY_LABELS', '{', 'app.js');
  const wOrder = literal(appJs, 'BUDGET_CATEGORY_ORDER', '[', 'app.js');
  const m = literal(toolsTsx, 'BUDGET_CATEGORY_LABELS', '{', 'tools.tsx');

  const wKeys = Object.keys(w);
  const mKeys = Object.keys(m);
  if (wKeys.join(',') !== mKeys.join(',')) {
    fail(`budget categories differ\n  app.js: ${wKeys.join(', ')}\n  mobile: ${mKeys.join(', ')}`);
  } else {
    for (const k of wKeys) {
      if (norm(w[k]) !== norm(m[k])) {
        fail(`budget category ${k}\n  app.js: ${JSON.stringify(w[k])}\n  mobile: ${JSON.stringify(m[k])}`);
      }
    }
  }
  // The order array is what the web sums and charts with; a key missing from it is a category
  // the student can fill in and never see counted.
  const missing = wKeys.filter((k) => !wOrder.includes(k));
  const extra = wOrder.filter((k) => !wKeys.includes(k));
  if (missing.length) fail(`BUDGET_CATEGORY_ORDER omits: ${missing.join(', ')}`);
  if (extra.length) fail(`BUDGET_CATEGORY_ORDER names categories that do not exist: ${extra.join(', ')}`);
}

if (problems.length) {
  console.error('Tools DRIFT — ' + problems.length + ' difference(s):\n');
  console.error(problems.join('\n\n'));
  process.exit(1);
}

const counts = OPTION_LISTS.map(({ web }) => literal(appJs, web, '[', 'app.js').length);
console.log(
  `Tools OK — ${counts[0]} savings/investment rates, ${counts[1]} loan types, ${counts[2]} repayment plans `
  + `and ${Object.keys(literal(appJs, 'BUDGET_CATEGORY_LABELS', '{', 'app.js')).length} budget categories `
  + 'match between app.js and mobile.'
);
