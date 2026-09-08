/**
 * Checks the Tools tab's three financial calculators against the standard closed forms.
 *
 * Every other check here compares the two apps to each other, which catches drift but not a
 * formula that is wrong in both. This one compares app.js's arithmetic to the maths itself,
 * recomputed independently below — so it fails when the app's answer is wrong, not merely
 * when it is inconsistent.
 *
 * These are numbers a student is invited to act on. "Paying $50 extra clears this loan four
 * years sooner and saves $3,100" is a claim about their actual debt, and it is the one kind
 * of mistake in this app that no amount of looking at the screen would reveal: a plausible
 * wrong number renders exactly as well as a right one.
 *
 * The functions are sliced out of app.js and evaluated on their own — app.js is a browser
 * script that cannot be require()d, and these three touch nothing but their arguments.
 *
 *   node scripts/check-tool-math.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

/** Slices a top-level function out of app.js, parameter list and all.
 *
 * The brace scan starts at the body rather than at the declaration: all three of these take a
 * DESTRUCTURED object, whose own braces would otherwise close the function on its first line
 * and hand back a fragment that doesn't parse. */
function fnFromAppJs(name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('app.js: no ' + name);
  let paren = 0, bodyStart = -1;
  for (let i = src.indexOf('(', start); i < src.length; i++) {
    if (src[i] === '(') paren++;
    else if (src[i] === ')') { paren--; if (paren === 0) { bodyStart = src.indexOf('{', i); break; } }
  }
  let depth = 0, end = -1;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('app.js: unterminated ' + name);
  return src.slice(start, end + 1);
}

const app = { Math };
vm.runInNewContext(
  [fnFromAppJs('computeCompoundGrowth'),
    fnFromAppJs('computeLoanMinPayment'),
    fnFromAppJs('computeLoanPayoff')].join('\n'), app);

const problems = [];
const note = (m) => { if (problems.length < 40) problems.push(m); };
const near = (actual, expected, tol, what) => {
  if (!(Math.abs(actual - expected) <= tol)) note(`${what}: app ${actual}, maths ${expected}`);
};

/* ── 1. The required monthly payment ──
 * P·r·(1+r)^n / ((1+r)^n − 1), and P/n at a zero rate. */
const LOANS = [
  { principal: 10000, annualRatePct: 5, termYears: 10 },
  { principal: 27000, annualRatePct: 5.5, termYears: 10 },   // the tool's own defaults
  { principal: 27000, annualRatePct: 5.5, termYears: 25 },
  { principal: 250000, annualRatePct: 7, termYears: 30 },
  { principal: 5000, annualRatePct: 0, termYears: 5 },
];
for (const c of LOANS) {
  const r = c.annualRatePct / 100 / 12, n = Math.round(c.termYears * 12);
  const expect = r === 0 ? c.principal / n : (c.principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  near(app.computeLoanMinPayment(c), expect, 1e-9,
    `minimum payment on $${c.principal} at ${c.annualRatePct}% over ${c.termYears}y`);
}
/* An anchor that does not come from the formula above: $10,000 at 5% over 10 years is the
 * widely published $106.07/month. If both this and the closed form were rewritten wrongly in
 * the same way, this is the line that still fails. */
near(Math.round(app.computeLoanMinPayment(LOANS[0]) * 100) / 100, 106.07, 0.011,
  'the published $10k / 5% / 10-year payment');

/* ── 2. Paying exactly the minimum retires the loan in exactly the term ──
 * The two functions have to agree with each other, or the tool's headline contradicts the
 * payment it just told you to make. */
for (const c of LOANS.slice(0, 4)) {
  const pay = app.computeLoanMinPayment(c);
  const pts = app.computeLoanPayoff({ principal: c.principal, annualRatePct: c.annualRatePct, monthlyPayment: pay });
  if (!pts) { note(`payoff on $${c.principal} returned nothing at its own minimum payment`); continue; }
  const months = pts.length - 1;
  if (Math.abs(months - c.termYears * 12) > 1) {
    note(`paying the minimum on $${c.principal} took ${months} months, but its term is ${c.termYears * 12}`);
  }
  const last = pts[pts.length - 1];
  if (last.balance > 0.5) note(`paying the minimum on $${c.principal} left $${last.balance.toFixed(2)} owing`);
  if (!(last.totalInterest > 0) && c.annualRatePct > 0) note(`no interest accrued on $${c.principal}`);
}

/* ── 3. A payment that cannot cover the first month's interest is refused ──
 * Rather than looping to the cap and drawing a flat line that never reaches zero. */
if (app.computeLoanPayoff({ principal: 10000, annualRatePct: 12, monthlyPayment: 100 }) !== null) {
  note('a payment exactly equal to the first month of interest was not refused');
}
if (app.computeLoanPayoff({ principal: 10000, annualRatePct: 12, monthlyPayment: 100.01 }) === null) {
  note('a payment just above the first month of interest was refused');
}

/* ── 4. Paying more is never worse ──
 *
 * Both results are checked for null before being read. A wrong minimum-payment formula makes
 * the payment too small to cover the interest, computeLoanPayoff correctly refuses it, and
 * this section would then dereference null — so the checker would die with a TypeError
 * instead of reporting the wrong formula that caused it. A checker that crashes on the bug it
 * exists to find is worse than no checker: the stack trace says nothing about the formula. */
{
  const base = { principal: 27000, annualRatePct: 5.5 };
  const min = app.computeLoanMinPayment({ ...base, termYears: 10 });
  const a = app.computeLoanPayoff({ ...base, monthlyPayment: min });
  const b = app.computeLoanPayoff({ ...base, monthlyPayment: min + 100 });
  if (!a || !b) {
    note(`a $27,000 loan at 5.5% could not be amortised at its own minimum payment`
      + ` ($${min.toFixed(2)}/month) — the minimum-payment formula is the thing to look at`);
  } else {
    if (b.length >= a.length) note('paying $100 extra did not shorten the loan');
    if (b[b.length - 1].totalInterest >= a[a.length - 1].totalInterest) {
      note('paying $100 extra did not reduce the interest');
    }
  }
}

/* ── 5. Compound growth against the future value of an ordinary annuity ──
 * FV = P(1+r)^n + C·((1+r)^n − 1)/r. Contributions land at the END of each period, which is
 * what the loop does — interest first, then the deposit. */
const GROWTH = [
  { startingAmount: 1000, monthlyContribution: 100, annualRatePct: 7, years: 10 },
  { startingAmount: 0, monthlyContribution: 50, annualRatePct: 4.5, years: 5 },
  { startingAmount: 5000, monthlyContribution: 0, annualRatePct: 7, years: 30 },
  { startingAmount: 1000, monthlyContribution: 100, annualRatePct: 0, years: 3 },
];
for (const c of GROWTH) {
  const r = c.annualRatePct / 100 / 12, n = Math.round(c.years * 12);
  const fv = r === 0
    ? c.startingAmount + c.monthlyContribution * n
    : c.startingAmount * (1 + r) ** n + c.monthlyContribution * (((1 + r) ** n - 1) / r);
  const pts = app.computeCompoundGrowth(c);
  const label = `growth on $${c.startingAmount} + $${c.monthlyContribution}/mo at ${c.annualRatePct}% for ${c.years}y`;
  near(pts[pts.length - 1].balance, fv, Math.max(0.01, fv * 1e-9), label);
  if (pts.length !== n + 1) note(`${label}: ${pts.length} points, expected ${n + 1}`);
  const contributed = pts[pts.length - 1].contributed;
  const expectContributed = c.startingAmount + c.monthlyContribution * n;
  if (Math.abs(contributed - expectContributed) > 0.01) {
    note(`${label}: says $${contributed} was put in, arithmetic says $${expectContributed}`);
  }
  // The line the whole chart is FOR: at a positive rate, the balance must exceed the money
  // put in. If this ever inverted, the app would be illustrating compounding as a loss.
  if (c.annualRatePct > 0 && pts[pts.length - 1].balance <= contributed) {
    note(`${label}: balance is not above the money contributed`);
  }
}

/* ── 6. Nothing produces a number that cannot be printed ── */
for (const c of [
  { startingAmount: 0, monthlyContribution: 0, annualRatePct: 0, years: 0 },
  { startingAmount: 0, monthlyContribution: 0, annualRatePct: 5, years: 1 },
  { startingAmount: 100, monthlyContribution: 0, annualRatePct: 0, years: 1 },
]) {
  for (const p of app.computeCompoundGrowth(c)) {
    if (!Number.isFinite(p.balance) || !Number.isFinite(p.contributed)) {
      note('growth produced a non-finite point for ' + JSON.stringify(c));
      break;
    }
  }
}

if (problems.length) {
  console.error('Tool maths WRONG:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log(`Tool maths OK — ${LOANS.length} amortisation cases match the closed form (and the`
  + ` published $106.07 anchor), paying the minimum clears each loan in exactly its term,`
  + ` and ${GROWTH.length} growth cases match the annuity future value.`);
