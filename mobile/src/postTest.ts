/**
 * The final assessment's own question bank: two per module, twenty-two in all.
 *
 * WHY THIS EXISTS SEPARATELY from the lesson questions in content/modules.json, which is
 * where the post-test used to draw from:
 *
 *   - LENGTH GIVES THE ANSWER AWAY. In the lesson bank the correct option is very often the
 *     longest one, because it is the one carrying the full explanation — "Gross is what you
 *     earned before deductions; net is what hits your bank account" sitting beside "They are
 *     the same". You can score well on that pattern without knowing any of the material, which
 *     makes the result meaningless as a measure. Every option here is written to roughly the
 *     same length as its siblings, so the only way to pick the right one is to know it.
 *   - LENGTH ALSO MEANT SCROLLING. A long stem plus four long options doesn't fit a phone, so
 *     every question became a scroll before it could be answered. These are trimmed to fit.
 *
 * Rules this bank holds itself to, worth keeping if questions are added:
 *   - Stem under about 70 characters, and a real question rather than a scenario paragraph.
 *   - Four options, each 2-6 words, and no option more than about twice the shortest.
 *   - The correct answer is never the longest option in its group.
 *   - `exp` is one sentence: what the answer is, not a lecture.
 *
 * The questions are drawn from material the student has already been taught, which is the
 * point of a post-test: it measures what the course left behind.
 */

export type PostTestQuestion = {
  moduleId: string;
  q: string;
  opts: string[];
  correct: number;
  exp: string;
};

export const POST_TEST_QUESTIONS: PostTestQuestion[] = [
  // ---- 01 Earning
  {
    moduleId: 'earning',
    q: 'What is net pay?',
    opts: ['Your salary before tax', 'What lands in your account', 'Your hourly rate', 'Your total yearly offer'],
    correct: 1,
    exp: 'Net pay is take-home: gross pay minus tax and other deductions.',
  },
  {
    moduleId: 'earning',
    q: 'What does FICA on a payslip fund?',
    opts: ['Health insurance', 'State income tax', 'Social Security and Medicare', 'Your retirement fund'],
    correct: 2,
    exp: 'FICA is the payroll tax that funds Social Security and Medicare.',
  },

  // ---- 02 Spending
  {
    moduleId: 'spending',
    q: 'In a 50/30/20 budget, what is the 20?',
    opts: ['Needs', 'Wants', 'Saving and debt', 'Rent'],
    correct: 2,
    exp: 'Half to needs, a third to wants, and 20% to saving and paying down debt.',
  },
  {
    moduleId: 'spending',
    q: 'Which of these is a fixed cost?',
    opts: ['Groceries', 'Rent', 'Petrol', 'Nights out'],
    correct: 1,
    exp: 'Fixed costs are the same each month; rent is the classic one.',
  },

  // ---- 03 Saving
  {
    moduleId: 'saving',
    q: 'How big should an emergency fund be?',
    opts: ['One week of pay', 'Three to six months', 'Two full years', 'Whatever is spare'],
    correct: 1,
    exp: 'Three to six months of essential costs is the standard target.',
  },
  {
    moduleId: 'saving',
    q: 'What does compound interest pay you on?',
    opts: ['Only what you put in', 'Interest already earned too', 'Your monthly income', 'The bank’s profits'],
    correct: 1,
    exp: 'Compounding pays interest on your interest, which is why time matters most.',
  },

  // ---- 04 Investing
  {
    moduleId: 'investing',
    q: 'What does an index fund hold?',
    opts: ['One company', 'A whole market', 'Only bonds', 'Cash savings'],
    correct: 1,
    exp: 'An index fund buys the whole market at once, which spreads the risk.',
  },
  {
    moduleId: 'investing',
    q: 'Why start investing early?',
    opts: ['Fees are lower', 'Time compounds returns', 'Shares cost less', 'Tax is waived'],
    correct: 1,
    exp: 'Years in the market do more than the amount you start with.',
  },

  // ---- 05 Managing Credit
  {
    moduleId: 'credit',
    q: 'What most affects a credit score?',
    opts: ['Paying on time', 'Your salary', 'Your age', 'Your postcode'],
    correct: 0,
    exp: 'Payment history is the single biggest factor in a credit score.',
  },
  {
    moduleId: 'credit',
    q: 'What is credit utilisation?',
    opts: ['Cards you own', 'Limit you are using', 'Interest you owe', 'Length of history'],
    correct: 1,
    exp: 'It is the share of your limit in use; under 30% is the usual advice.',
  },

  // ---- 06 Managing Risk
  {
    moduleId: 'risk',
    q: 'What is an insurance deductible?',
    opts: ['Your monthly premium', 'What you pay first', 'The insurer’s profit', 'Your total cover'],
    correct: 1,
    exp: 'The deductible is what you pay before the insurer pays anything.',
  },
  {
    moduleId: 'risk',
    q: 'A higher deductible usually means what?',
    opts: ['A lower premium', 'A higher premium', 'No cover at all', 'Faster claims'],
    correct: 0,
    exp: 'Taking on more of the first loss lowers what you pay each month.',
  },

  // ---- 07 Loans
  {
    moduleId: 'loans',
    q: 'What does APR describe?',
    opts: ['The yearly cost', 'The monthly payment', 'The loan size', 'The credit limit'],
    correct: 0,
    exp: 'APR is the yearly cost of borrowing, including fees as well as interest.',
  },
  {
    moduleId: 'loans',
    q: 'Which loan is usually cheapest?',
    opts: ['Payday loan', 'Credit card debt', 'Federal student loan', 'Store card'],
    correct: 2,
    exp: 'Federal student loans carry the lowest rates and the best protections.',
  },

  // ---- 08 Taxes
  {
    moduleId: 'taxes',
    q: 'What is a tax deduction?',
    opts: ['Money off your bill', 'Money off your income', 'A refund cheque', 'A payroll tax'],
    correct: 1,
    exp: 'A deduction lowers taxable income; a credit lowers the bill itself.',
  },
  {
    moduleId: 'taxes',
    q: 'What does a W-2 report?',
    opts: ['Your yearly wages', 'Your bank balance', 'Your credit score', 'Your rent paid'],
    correct: 0,
    exp: 'A W-2 reports what an employer paid you and withheld for the year.',
  },

  // ---- 09 Consumer Psychology
  {
    moduleId: 'psychology',
    q: 'What is an anchor price?',
    opts: ['The cheapest option', 'A first number shown', 'The average price', 'A delivery fee'],
    correct: 1,
    exp: 'The first price you see sets what every later price feels like.',
  },
  {
    moduleId: 'psychology',
    q: 'Why do shops show a countdown timer?',
    opts: ['To rush the decision', 'To be transparent', 'To reduce fraud', 'To help budgeting'],
    correct: 0,
    exp: 'Urgency cuts the time you would spend thinking, which is the point of it.',
  },

  // ---- 10 Career & Salary
  {
    moduleId: 'career',
    q: 'When is the best time to negotiate?',
    opts: ['On day one', 'After the offer', 'At your review', 'When you resign'],
    correct: 1,
    exp: 'Once they have chosen you and before you accept is the strongest moment.',
  },
  {
    moduleId: 'career',
    q: 'What is a 401(k) employer match?',
    opts: ['A yearly bonus', 'Free money you earn', 'A loan from work', 'A tax refund'],
    correct: 1,
    exp: 'Your employer adds to your retirement account; not taking it leaves pay behind.',
  },

  // ---- 11 Scams & Fraud
  {
    moduleId: 'scams',
    q: 'What is the clearest sign of a scam?',
    opts: ['A spelling mistake', 'Urgency plus payment', 'An unknown sender', 'A long message'],
    correct: 1,
    exp: 'Pressure to act now, combined with a way to pay, is the pattern.',
  },
  {
    moduleId: 'scams',
    q: 'A caller asks for your bank code. Do what?',
    opts: ['Read it back', 'Hang up and call back', 'Text it instead', 'Give a partial code'],
    correct: 1,
    exp: 'Hang up and dial the number on your card; no real bank asks for a code.',
  },
];
