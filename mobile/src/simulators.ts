/** Core math ported verbatim from the website's Tools page (app.js) — compound growth,
 * loan amortization/minimum payment, min-payment credit card debt. Each returns the full
 * month-by-month `points` series (not just a final total) so the Tools tab can chart them
 * the same way the website does (see charts.ts's buildStackedAreaChart). */

export type SeriesPoint = { month: number; [key: string]: number };

export function computeCompoundGrowth({
  startingAmount, monthlyContribution, annualRatePct, years,
}: { startingAmount: number; monthlyContribution: number; annualRatePct: number; years: number }): SeriesPoint[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const months = Math.round(years * 12);
  const points: SeriesPoint[] = [{ month: 0, balance: startingAmount, contributed: startingAmount }];
  let balance = startingAmount;
  let contributed = startingAmount;
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    contributed += monthlyContribution;
    points.push({ month: m, balance, contributed });
  }
  return points;
}

/** Minimum-payment credit card amortization — 2% of balance or a $25 floor, whichever is
 * greater, the same real formula the website's Compound Interest panel uses for its
 * "Credit Card Warning" chart. */
export function computeMinPaymentDebt({
  startingBalance, annualRatePct, months = 120,
}: { startingBalance: number; annualRatePct: number; months?: number }): SeriesPoint[] {
  const monthlyRate = annualRatePct / 100 / 12;
  let balance = startingBalance;
  let totalInterest = 0;
  const points: SeriesPoint[] = [{ month: 0, balance, totalInterest: 0 }];
  for (let m = 1; m <= months && balance > 0.5; m++) {
    const interest = balance * monthlyRate;
    const payment = Math.max(balance * 0.02, Math.min(25, balance));
    balance = Math.max(0, balance + interest - payment);
    totalInterest += interest;
    points.push({ month: m, balance, totalInterest });
  }
  return points;
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
}: { principal: number; annualRatePct: number; monthlyPayment: number; maxMonths?: number }): SeriesPoint[] | null {
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyPayment <= principal * monthlyRate) return null;
  let balance = principal;
  let totalInterest = 0;
  const points: SeriesPoint[] = [{ month: 0, balance, totalInterest: 0 }];
  for (let m = 1; m <= maxMonths && balance > 0.5; m++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(balance, monthlyPayment - interest);
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    points.push({ month: m, balance, totalInterest });
  }
  return points;
}
