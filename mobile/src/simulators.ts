/** Core math ported verbatim from the website's Tools page (app.js) — compound growth,
 * loan amortization/minimum payment. Used by the mobile Tools tab's Compound Interest and
 * Loan Payoff calculators. */

export function computeCompoundGrowth({
  startingAmount, monthlyContribution, annualRatePct, years,
}: { startingAmount: number; monthlyContribution: number; annualRatePct: number; years: number }) {
  const monthlyRate = annualRatePct / 100 / 12;
  const months = Math.round(years * 12);
  let balance = startingAmount;
  let contributed = startingAmount;
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    contributed += monthlyContribution;
  }
  return { balance, contributed, interestEarned: balance - contributed };
}

export function computeLoanMinPayment({
  principal, annualRatePct, termYears,
}: { principal: number; annualRatePct: number; termYears: number }) {
  const monthlyRate = annualRatePct / 100 / 12;
  const n = Math.round(termYears * 12);
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

/** Amortizes `principal` at a fixed `monthlyPayment`. Returns null if the payment doesn't
 * even cover the first month's interest (balance would never go down). */
export function computeLoanPayoff({
  principal, annualRatePct, monthlyPayment, maxMonths = 600,
}: { principal: number; annualRatePct: number; monthlyPayment: number; maxMonths?: number }) {
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyPayment <= principal * monthlyRate) return null;
  let balance = principal;
  let totalInterest = 0;
  let months = 0;
  while (months < maxMonths && balance > 0.5) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(balance, monthlyPayment - interest);
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    months++;
  }
  return { months, totalInterest };
}
