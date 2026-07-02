/* ══════════════════════════════════════════════
   STACKD app.js - PRD v1.0
══════════════════════════════════════════════ */

// Tuned so a first-time, all-correct pass through every module lands right around level 9-10 —
// leveling up should track finishing the whole curriculum, not just a couple of modules.
const LEVEL_THRESHOLDS = [0, 90, 200, 330, 480, 660, 880, 1150, 1450, 1800, 2200];

const TIERS = [
  { min: 1,  max: 2,  name: 'Broke Freshman' },
  { min: 3,  max: 4,  name: 'Budget Apprentice' },
  { min: 5,  max: 6,  name: 'Money-Aware Sophomore' },
  { min: 7,  max: 8,  name: 'Money Manager' },
  { min: 9,  max: 10, name: 'Financially Literate Graduate' },
];

function getTier(level) {
  return TIERS.find(t => level >= t.min && level <= t.max) || TIERS[TIERS.length - 1];
}

// ── Modules ──────────────────────────────────
const MODULES = [
  {
    id: 'earning', title: 'Earning', icon: '01', iconColor: 'green', xpReward: 25,
    hook: 'You just got your first campus job paycheck. You worked 20 hours at $15/hour - that\'s $300. But your direct deposit shows $241. Where did $59 go?',
    desc: 'Paychecks, work-study, gig income, and what gets taken before you see a dollar.',
    questions: [
      {
        q: 'What is the difference between gross pay and net pay?',
        opts: ['They are the same - just different terms', 'Gross is after taxes; net is before taxes', 'Gross is what you earned before deductions; net is what hits your bank account', 'Gross pay only applies to salaried employees'],
        correct: 2,
        exp: 'Gross = what you earned. Net = take-home after income tax, FICA, and other deductions. Always budget from your net pay.'
      },
      {
        q: 'What does FICA stand for, and what does it fund?',
        opts: ['Federal Income Collection Act - funds public schools', 'Federal Insurance Contributions Act - funds Social Security & Medicare', 'Financial Insurance Credit Act - funds unemployment', 'Federal Income Credit Allowance - funds Medicaid'],
        correct: 1,
        exp: 'FICA deducts 7.65% of your wages: 6.2% for Social Security and 1.45% for Medicare - benefits you\'ll receive later in life.'
      },
      {
        q: 'What is a W-4 form used for?',
        opts: ['Filing your annual federal tax return', 'Reporting freelance or gig income', 'Telling your employer how much federal income tax to withhold from each paycheck', 'Applying for a tax refund'],
        correct: 2,
        exp: 'You fill out a W-4 when starting a new job. Getting it right prevents a surprise tax bill - or over-withholding all year.'
      },
      {
        q: 'You filled out your W-4 claiming you\'re exempt from withholding to get a bigger paycheck now. What\'s the risk?',
        opts: ['There is no risk at all', 'If you actually owe income tax, you\'ll face the full bill - possibly with a penalty - at filing time since nothing was withheld', 'Employers aren\'t allowed to honor this request', 'It guarantees you a refund every year'],
        correct: 1,
        exp: 'Claiming exempt stops federal withholding completely. If your actual income means you owe tax, you\'ll face the entire bill in April instead of spreading it out - sometimes with an underpayment penalty on top.'
      },
      {
        q: 'What is Federal Work-Study, and how is it different from a regular part-time job?',
        opts: ['It\'s a loan you must repay after graduation', 'A need-based federal program that subsidizes part-time campus jobs and is awarded as part of your financial aid package - not a loan', 'Only available to graduate students', 'A guaranteed high-paying job off campus'],
        correct: 1,
        exp: 'Work-Study is awarded through your FAFSA-based aid package, not applied for like a normal job. The federal government subsidizes part of your wages, which is why these campus jobs are often easier to land. It\'s earned income - you never pay it back.'
      },
      {
        q: 'You\'re awarded $3,000 in Federal Work-Study for the year. Why does it matter how many hours you work each week?',
        opts: ['It doesn\'t - work as many hours as you want', 'Once you earn your full award amount, work-study pay stops - so pacing your hours across the semester matters', 'Work-study jobs cap you at 5 total hours per semester', 'More hours automatically increases your award amount'],
        correct: 1,
        exp: 'Your work-study award is a fixed dollar amount for the year, not an hourly guarantee. Work too many hours early on and you could hit the cap before the semester ends. Spread hours out and check with financial aid before picking up extra shifts.'
      },
      {
        q: 'You start walking dogs for cash through an app and get paid via Venmo - no W-4, no taxes withheld. What\'s different about this income compared to your campus job?',
        opts: ['Nothing - it\'s taxed exactly the same way', 'No one withholds taxes for you, so you\'re responsible for setting money aside and reporting it yourself', 'This income is completely tax-free', 'You only owe taxes on gig income over $10,000'],
        correct: 1,
        exp: 'W-2 jobs withhold taxes automatically. Gig and cash income doesn\'t - the responsibility shifts to you to track it and set money aside. The Taxes module covers exactly how to file this correctly.'
      },
      {
        q: 'What\'s a smart habit for money you earn from gig work or freelancing, where no taxes are withheld?',
        opts: ['Spend all of it since it\'s extra cash', 'Set aside roughly 20–30% in a separate savings account for taxes as soon as you\'re paid', 'Wait until April to figure out what you owe', 'Only worry about it once you earn over $50,000'],
        correct: 1,
        exp: 'Because nothing is withheld upfront, the tax bill can catch new gig workers off guard. Moving 20–30% of each payment into a separate "taxes" account the moment you\'re paid means it\'s already set aside when it\'s time to file.'
      },
      {
        q: 'Your pay stub shows gross pay, several deduction lines, and net pay - but the hours listed look wrong. What should you do?',
        opts: ['Ignore it - small errors aren\'t worth mentioning', 'Compare the stub against your own hours log and contact HR or payroll right away if there\'s a mismatch', 'Wait until the end of the semester to raise it', 'Assume payroll is always correct'],
        correct: 1,
        exp: 'Payroll errors happen - a missed shift, wrong rate, a duplicate deduction. Keep your own record of hours worked and check it against every stub. Catching an error within the same pay period makes it far easier to fix.'
      },
      {
        q: 'You earn $15/hour and work 40 hours/week. What is your gross bi-weekly paycheck?',
        opts: ['$600', '$900', '$1,200', '$1,500'],
        correct: 2,
        exp: '$15 × 40 hrs × 2 weeks = $1,200 gross. Your actual deposit will be less after taxes - usually 70–80% of gross.'
      },
      {
        q: 'Your employer offers a 401(k) with a 3% match. What\'s the smartest move?',
        opts: ['Ignore it until you\'re older and earning more', 'Contribute at least 3% to capture the full employer match', 'Only contribute if you earn over $50,000', 'Avoid employer retirement plans entirely'],
        correct: 1,
        exp: 'Employer match is free money. Contributing enough to capture the full match is the single highest-return financial move available to you right now.'
      },
      {
        q: 'You get a raise from $16/hour to $17.50/hour. What\'s the smartest way to handle the extra income?',
        opts: ['Automatically increase spending to match the new take-home pay', 'Decide in advance how much of the raise goes to savings or debt versus lifestyle spending, before it hits your account', 'Keep spending exactly the same and forget about it', 'Only think about it once you notice more money in checking'],
        correct: 1,
        exp: 'This is where lifestyle inflation quietly begins - extra income can just as easily disappear into slightly nicer everyday spending. Deciding upfront to route even half of a raise toward savings or debt keeps it actually building your financial position.'
      }
    ],
    lessons: [
      { title: 'Your First Paycheck', hook: 'You just started your on-campus job and received your first paycheck. The stub says $300 gross but only $241 hit your bank. Where did $59 go — and what does "withholding" actually mean?', qIndices: [0, 1] },
      { title: 'Tax Forms & Withholding', hook: 'Your employer hands you a W-4 on day one. Fill it out wrong and you could owe a surprise tax bill in April — or hand the government an interest-free loan all year. What should you actually put down?', qIndices: [2, 3] },
      { title: 'Work-Study & Campus Jobs', hook: 'Your financial aid offer includes $3,000 in Federal Work-Study — a term you\'ve never seen before. Is it a loan? A regular job? And does it matter how many hours you work?', qIndices: [4, 5] },
      { title: 'Gig Work & Side Income', hook: 'You start picking up dog-walking and tutoring gigs for extra cash, paid straight to Venmo. No W-4, no withholding — just money landing in your account. Is that too good to be true?', qIndices: [6, 7] },
      { title: 'Reading Your Pay Stub', hook: 'Your paycheck seems short this week. Before assuming payroll made a mistake — or missing one that actually happened — do you even know how to read everything on your pay stub?', qIndices: [8, 9] },
      { title: 'Raises & Growing Your Income', hook: 'Your manager offers you a raise from $16/hour to $17.50/hour, and mentions the university\'s 403(b) retirement match up to 3%. Between the raise and the match, what should you actually do with the extra money?', qIndices: [10, 11] }
    ]
  },
  {
    id: 'spending', title: 'Spending', icon: '02', iconColor: 'pink', xpReward: 35,
    hook: 'It\'s week 6 of the semester. You had $800 for the month. You check your account and there\'s $23 left. You didn\'t buy anything big. How did this happen - and how do you stop it?',
    desc: 'Budgeting on a student income, meal plans, and paying for college — FAFSA, scholarships, grants, and payment plans.',
    questions: [
      {
        q: 'The 50/30/20 rule splits your after-tax income. What does the "50" represent?',
        opts: ['50% for savings and investments', '50% for needs (rent, food, utilities)', '50% for wants (entertainment, dining out)', '50% for debt repayment'],
        correct: 1,
        exp: 'Half your income goes to needs - essentials you can\'t live without: rent, groceries, utilities, transportation.'
      },
      {
        q: 'You take home $1,500/month. Using 50/30/20, how much goes to savings?',
        opts: ['$750', '$450', '$300', '$150'],
        correct: 2,
        exp: '20% of $1,500 = $300. Even a small amount saved consistently builds a powerful financial cushion over a semester.'
      },
      {
        q: 'Which of these is a "need" in a student budget?',
        opts: ['Netflix subscription', 'Monthly rent', 'Brunch with friends', 'New headphones'],
        correct: 1,
        exp: 'Needs are essentials you can\'t function without. Rent is a need; streaming and dining out are wants that fall under the 30%.'
      },
      {
        q: 'What does a budget deficit mean?',
        opts: ['You saved more than 20% this month', 'Your expenses exceeded your income', 'You have too many bank accounts', 'Your credit score dropped'],
        correct: 1,
        exp: 'A deficit = spending more than you earn. If you spot one, cut wants first or find a way to increase income.'
      },
      {
        q: 'What is the recommended size of an emergency fund for a student?',
        opts: ['1 week of expenses', '1 month of expenses', '3–6 months of expenses', '12 months of expenses'],
        correct: 2,
        exp: 'A 3–6 month cushion protects you from unexpected costs like medical bills, car repairs, or sudden job loss. Start with $500–$1,000 if 3 months feels out of reach.'
      },
      {
        q: 'When can students first submit the FAFSA (Free Application for Federal Student Aid) for the upcoming academic year, and why does the timing matter?',
        opts: ['Anytime over the summer — timing doesn\'t matter', 'FAFSA opens October 1st each year, and applying early matters because many grants and state aid programs are awarded first-come, first-served until funds run out', 'Only after you\'ve already enrolled and started classes', 'FAFSA is a one-time application you only submit once, in your first year'],
        correct: 1,
        exp: 'The FAFSA opens every October 1st for the following academic year — put it on your calendar. It determines your eligibility for federal grants, work-study, and loans, plus most school and state aid. The application trips a lot of students up — income verification, tax data transfer, dependency questions — but gathering your tax documents ahead of time makes it far less stressful. You must resubmit it every single year you\'re in school to keep your aid.'
      },
      {
        q: 'After you submit the FAFSA, your school sends you a financial aid offer (sometimes called an award letter). What should you do with it?',
        opts: ['Ignore it — aid is automatically applied to your bill', 'Review each item individually — grants, scholarships, work-study, loans — and actively accept or decline each one; you\'re never required to accept loans just because they\'re offered', 'Accept the entire package as one bundled decision with no choices', 'Only respond if you plan on taking loans'],
        correct: 1,
        exp: 'A financial aid offer isn\'t one lump decision. Gift aid — grants and scholarships — is money you should almost always accept since it\'s never repaid. Loans are a separate choice: you can accept the full amount, accept less, or decline entirely. Read the offer line by line, confirm whether it covers a full year or just one semester, and know exactly what\'s free versus what you\'ll owe with interest.'
      },
      {
        q: 'You\'re still short on funds after grants and scholarships are applied to your bill. Besides borrowing more, what\'s another option worth exploring?',
        opts: ['There is no other option besides loans', 'A tuition payment plan through your school\'s bursar office, which splits your balance into smaller monthly installments — often interest-free', 'Skip the payment and hope the school doesn\'t notice', 'Put the balance on a credit card'],
        correct: 1,
        exp: 'Most schools offer a tuition payment plan that breaks your bill into monthly installments, often for just a small flat enrollment fee instead of interest. It won\'t lower what you owe, but it eases cash-flow pressure without taking on debt. Pair that with actively searching for outside scholarships — local organizations, employers, and community foundations all offer free money that doesn\'t show up on your school\'s offer automatically.'
      },
      {
        q: 'You have $1,200 in dining dollars for a 16-week semester. What\'s the smartest way to make sure it lasts?',
        opts: ['Spend it however you want since it resets each semester', 'Divide it into a weekly budget (about $75/week) and track your balance so you\'re not caught out before finals', 'Spend it all in the first month since it doesn\'t roll over anyway', 'Ignore your balance — the school will notify you when it\'s empty'],
        correct: 1,
        exp: 'Dining dollars work like any other budget — divide the total by the weeks remaining to get a spending target, and check your balance regularly. Students who don\'t track it often run out with weeks of the semester still left.'
      },
      {
        q: 'Which of these should you have on hand before starting your FAFSA?',
        opts: ['Nothing — the form asks for everything as you go', 'Your (and your parents\', if you\'re a dependent) prior-prior year tax information, Social Security numbers, and a list of schools you\'re applying to', 'Your college acceptance letter, and only that', 'Your final high school transcript'],
        correct: 1,
        exp: 'The FAFSA uses prior-prior year tax data pulled directly from the IRS in many cases. Gathering SSNs, tax info, and your school list ahead of time turns a stressful form into a 30-minute task.'
      },
      {
        q: 'Grants and scholarships versus work-study and loans — what\'s the key difference between these two categories of financial aid?',
        opts: ['There\'s no real difference — they\'re all just "aid"', 'Grants and scholarships are gift aid you never repay; work-study requires you to work for the money and loans must be repaid with interest', 'Loans are always a better deal because you get the money faster', 'Scholarships must be repaid once you graduate and start earning'],
        correct: 1,
        exp: 'Gift aid — grants and scholarships — is money you never pay back, so it should almost always be accepted first. Self-help aid — work-study (which you earn by working) and loans (which you repay with interest) — comes with a cost attached. Know which category each line on your aid offer falls into before deciding what to accept.'
      },
      {
        q: 'You\'re still short on funds after your school\'s aid offer. Besides taking on more loans, what\'s worth exploring?',
        opts: ['There\'s nothing else to try besides borrowing more', 'Outside/private scholarships from local organizations and community foundations, and employer tuition assistance if you work part-time', 'Asking your school to simply waive the remaining balance', 'Putting the remaining balance on a high-interest credit card'],
        correct: 1,
        exp: 'Outside scholarships — from local businesses, community foundations, cultural organizations, and even your parents\' employers — don\'t show up on your school\'s aid offer automatically, so you have to search separately. Some part-time employers also offer tuition assistance for enrolled students — always worth asking.'
      }
    ],
    lessons: [
      { title: 'The 50/30/20 Rule', hook: 'It\'s week 6 of the semester. You had $800 for the month. You check your account and there\'s $23 left. You didn\'t buy anything big. How did this happen — and how do you stop it?', qIndices: [0, 1] },
      { title: 'Needs vs. Wants & Staying in the Black', hook: 'You\'ve labeled your rent as a "need" and brunch as a "want" — but by the end of the month you\'ve spent more than you earned anyway. What happened, and how do you catch it before you\'re in the red?', qIndices: [2, 3] },
      { title: 'Day-to-Day Money on Campus', hook: 'You\'ve got $1,200 in dining dollars and $47 in your emergency fund, both meant to last the semester. One is about pacing spending, the other about surviving a surprise cost — how do you handle both?', qIndices: [4, 8] },
      { title: 'FAFSA & the Financial Aid Timeline', hook: 'It\'s October 1st and your inbox reminds you: FAFSA is open. Last year you put it off, missed a scholarship deadline, and scrambled to gather documents in August. This year, what\'s the plan?', qIndices: [5, 9] },
      { title: 'Grants, Scholarships & Your Aid Offer', hook: 'Your financial aid offer lists grants, a scholarship, work-study, and loans all on one page, and it feels like a single number to accept or reject. Is it — or does each line deserve its own decision?', qIndices: [6, 10] },
      { title: 'Payment Plans & Closing the Gap', hook: 'After grants and scholarships, you\'re still $1,800 short for the semester. Loans aren\'t your only option, and neither is panicking. What else can actually close that gap?', qIndices: [7, 11] }
    ]
  },
  {
    id: 'saving', title: 'Saving', icon: '03', iconColor: 'mint', xpReward: 25,
    hook: 'Your laptop just died. It\'s finals week. A replacement costs $400. You have $47 in your checking account. This is what a missing emergency fund looks like - and it\'s completely avoidable.',
    desc: 'Emergency funds, high-yield savings accounts, sinking funds, and building habits early.',
    questions: [
      {
        q: 'What is a high-yield savings account (HYSA)?',
        opts: ['An investment account that tracks the stock market', 'A savings account that earns significantly more interest than a standard bank account', 'A checking account with no monthly fees', 'A CD that locks your money for 5 years'],
        correct: 1,
        exp: 'HYSAs pay 10–20x more interest than traditional savings. Look for APYs of 4–5%. A game changer on a student budget.'
      },
      {
        q: 'You have $50 extra at the end of the month. What\'s the smartest first move?',
        opts: ['Invest it all in individual stocks', 'Spend it as a reward - you earned it', 'Add it to a small emergency fund until you have 1–3 months of expenses saved', 'Put it in a retirement account immediately'],
        correct: 2,
        exp: 'Build your emergency cushion first. Even $500–$1,000 prevents you from going into debt the next time something unexpected happens.'
      },
      {
        q: 'What is the key difference between a checking and a savings account?',
        opts: ['There is no real difference', 'Checking accounts earn higher interest', 'Checking is for daily transactions; savings earns interest and is for holding money toward a goal', 'Savings accounts have unlimited withdrawals'],
        correct: 2,
        exp: 'Use checking for everyday spending, savings for holding money. Keep them separate so you don\'t accidentally spend your emergency fund.'
      },
      {
        q: 'You deposit $500 into a HYSA with a 4.5% APY. How much interest do you earn in one year?',
        opts: ['$4.50', '$22.50', '$45.00', '$225.00'],
        correct: 1,
        exp: '$500 × 4.5% = $22.50. Not huge, but that\'s money earned by doing nothing extra. Scale this up as savings grow.'
      },
      {
        q: 'What is the most effective strategy to make saving automatic and painless?',
        opts: ['Check your balance daily and save whatever is left', 'Set up an automatic transfer to savings on payday before you can spend it', 'Only save when you feel you have extra money', 'Wait until you graduate to start saving'],
        correct: 1,
        exp: '"Pay yourself first" - automate a transfer to savings the day you get paid. You won\'t miss money you never see in your checking account.'
      },
      {
        q: 'A traditional big-bank savings account pays 0.01% APY. An online high-yield savings account pays 4.5% APY. On a $1,000 balance, what\'s the real difference after a year?',
        opts: ['Basically nothing, about $0.10 either way', 'About $0.10 in the traditional account versus about $45 in the HYSA — a huge gap for holding the exact same money', 'HYSAs are riskier, so the extra interest isn\'t worth it', 'Big banks always automatically match online rates'],
        correct: 1,
        exp: '$1,000 × 0.01% ≈ $0.10. $1,000 × 4.5% ≈ $45. Same FDIC-insured safety, wildly different return — moving idle savings into a HYSA is one of the easiest wins available to a student.'
      },
      {
        q: 'You keep your entire checking balance right at $0 and don\'t link a savings account as backup. What\'s the risk?',
        opts: ['There is no risk if you\'re careful', 'A single unexpected charge — a subscription renewal, a bounced Venmo request — can trigger an overdraft fee, often $30+ per incident', 'Banks won\'t charge fees to student accounts', 'Linking a backup account always costs extra'],
        correct: 1,
        exp: 'Overdraft fees stack quickly if your checking account runs at exactly $0. Many banks let you link a savings account as free automatic backup for small shortfalls — worth setting up even if you rarely need it.'
      },
      {
        q: 'Every December you scramble to afford a flight home, and every January you\'re caught off guard by $400 in textbooks. What kind of saving strategy prevents this?',
        opts: ['There\'s nothing you can do about predictable costs', 'A sinking fund — setting aside a little each month specifically for a known, recurring expense so the full amount is ready when it\'s due', 'Just put it on a credit card each time and pay it off eventually', 'Wait for a scholarship to cover it'],
        correct: 1,
        exp: 'A sinking fund is different from an emergency fund — it\'s for expenses you know are coming (textbooks, holiday flights, spring break), not surprises. Saving $50/month specifically earmarked for "textbooks" means the January bill is no longer an emergency.'
      },
      {
        q: 'You want to save more but keep forgetting to move money over manually. What\'s an easy way to build the habit passively?',
        opts: ['Rely on remembering to transfer money every week', 'Use a round-up feature or automatic savings app that rounds purchases to the next dollar and saves the difference', 'Only save large lump sums once a year', 'Avoid checking your balance so you\'re not tempted to spend it'],
        correct: 1,
        exp: 'Round-up tools save small, near-invisible amounts — rounding a $4.60 coffee to $5.00 — with zero ongoing effort. It won\'t replace a real savings plan, but it builds momentum quietly in the background.'
      },
      {
        q: 'You\'re saving for three things at once — an emergency fund, a laptop, and a spring break trip. What\'s the smartest way to organize this?',
        opts: ['Keep it all in one account and try to remember which portion is for what', 'Use named sub-accounts or savings "buckets" for each goal so you always know how close you are to each one', 'Only save for one goal at a time and ignore the others completely', 'Avoid setting specific goals since it makes saving stressful'],
        correct: 1,
        exp: 'Most online banks let you create multiple named savings buckets under one account. Separating goals keeps you from accidentally raiding one goal\'s progress for another, and makes progress toward each feel more real.'
      },
      {
        q: 'You only have $60 left this month to put toward savings, and you\'re torn between your emergency fund and a concert ticket fund. What\'s the smarter priority?',
        opts: ['Always split it evenly between every goal no matter what', 'Prioritize the emergency fund until it has at least a starter cushion (like $500–$1,000), since it protects you from going into debt', 'Always prioritize whichever goal is more fun', 'Skip saving entirely this month since it\'s not enough to matter'],
        correct: 1,
        exp: 'Not all savings goals carry the same risk if left unfunded. An emergency fund protects you from debt when something breaks or goes wrong — that safety net comes before discretionary goals, even if it feels less exciting to fund.'
      },
      {
        q: 'You commit to saving $50/month through an automatic transfer. After 12 months, how much have you saved, not counting interest?',
        opts: ['$50', '$300', '$600', '$1,200'],
        correct: 2,
        exp: '$50 × 12 = $600 saved with zero extra effort once the transfer is automated. Add even a modest HYSA interest rate on top and the number climbs a bit higher — proof that consistency, not the size of each deposit, is what builds the balance.'
      }
    ],
    lessons: [
      { title: 'High-Yield Savings', hook: 'You check your big bank\'s savings account: 0.01% APY. A friend mentions their online account pays 4.5%. Same FDIC insurance, same $1,000 balance — what\'s actually different?', qIndices: [0, 5] },
      { title: 'Checking vs. Savings & Avoiding Fees', hook: 'You keep your checking account hovering right around $0 between paychecks. One surprise subscription renewal later, you\'re hit with a $34 overdraft fee. What should you have set up?', qIndices: [2, 6] },
      { title: 'How Interest & Consistency Add Up', hook: 'You set up an automatic $50/month transfer to savings and mostly forget about it. A year later, you check the balance and don\'t recognize the number. How did doing basically nothing add up to this much?', qIndices: [3, 11] },
      { title: 'Sinking Funds for Predictable Costs', hook: 'Your laptop just died during finals week. A replacement costs $400. You have $47 in your checking account. This is what a missing emergency fund looks like — and it\'s completely avoidable.', qIndices: [7, 1] },
      { title: 'Automating Your Savings', hook: 'You\'ve decided to start saving, but at the end of every month there\'s nothing left. You keep saying "I\'ll save whatever\'s left" — but there\'s never anything left. What changes?', qIndices: [4, 8] },
      { title: 'Setting & Prioritizing Savings Goals', hook: 'You\'re saving for an emergency fund, a new laptop, and a spring break trip all at once, with only $60 free this month. Do you split it evenly, or does one of these actually matter more right now?', qIndices: [9, 10] }
    ]
  },
  {
    id: 'investing', title: 'Investing', icon: '04', iconColor: 'lav', xpReward: 35,
    hook: 'Two students each invest $1,000 into the same fund. Alex starts at 18, Jordan starts at 28. At 65, Alex has $21,000. Jordan has $10,700. They invested the exact same amount. What made the difference?',
    desc: 'Compound interest, Roth IRAs, diversification, and why starting at 18 changes everything.',
    questions: [
      {
        q: 'What is a Roth IRA?',
        opts: ['A student loan repayment program', 'A bank checking account with tax benefits', 'A retirement account where you contribute after-tax money, and all growth and withdrawals in retirement are tax-free', 'An investment account only for people over 30'],
        correct: 2,
        exp: 'A Roth IRA is the most powerful retirement tool for students. You contribute money you\'ve already paid tax on - it grows completely tax-free, forever.'
      },
      {
        q: 'You invest $1,000 at 18 vs. your friend who invests $1,000 at 28. Assuming 7% average annual return, who has more at 65?',
        opts: ['They end up the same - it\'s the same amount invested', 'Your friend - older and wiser', 'You - by tens of thousands of dollars, because of 10 extra years of compounding', 'Neither - the market is too unpredictable'],
        correct: 2,
        exp: 'You\'d have ~$21,000. Your friend? ~$10,700. That\'s a $10,000 difference from the same $1,000 - just 10 extra years of compound interest. Time is your biggest asset.'
      },
      {
        q: 'What does compound interest mean?',
        opts: ['Interest earned only on your original deposit', 'Earning interest on both your principal AND on the interest you\'ve already earned', 'A penalty charged for early withdrawal', 'A type of interest only offered by the government'],
        correct: 1,
        exp: 'Compounding is when your money makes money - and then that money makes more money. Einstein reportedly called it the eighth wonder of the world.'
      },
      {
        q: 'What is an index fund, and why is it recommended for beginner investors?',
        opts: ['A fund where an expert picks individual stocks for maximum return', 'A savings account guaranteed to return 10% yearly', 'A low-cost fund that tracks a broad market index (like the S&P 500), offering built-in diversification', 'A government bond with fixed interest'],
        correct: 2,
        exp: 'Index funds let you invest in hundreds of companies at once with minimal fees. Historically, they outperform most actively managed funds over long time horizons.'
      },
      {
        q: 'What is the 2024 annual contribution limit for a Roth IRA (for individuals with earned income)?',
        opts: ['$3,000', '$5,500', '$7,000', '$15,000'],
        correct: 2,
        exp: 'You can contribute up to $7,000/year (2024). Even $50/month starting at 18 builds a remarkable foundation. The earlier you start, the less you need to contribute overall.'
      },
      {
        q: 'You have $500 and a friend suggests putting it all into one company\'s stock because "it\'s going to blow up." What\'s the risk with this approach?',
        opts: ['There\'s no risk if you pick the right company', 'Putting all your money in one stock means your entire investment depends on that single company\'s performance — diversification spreads that risk across many companies', 'Diversification only matters for investors with over $100,000', 'Single stocks always outperform diversified funds'],
        correct: 1,
        exp: 'Even great companies can crash unexpectedly. Diversification — spreading money across many companies through something like an index fund — means one company\'s bad quarter doesn\'t wipe out your investment.'
      },
      {
        q: 'You\'re 19 and only have $2,000 in babysitting cash with no formal paperwork. Can you contribute to a Roth IRA?',
        opts: ['No, Roth IRAs are only for people over 25', 'No, you need a college degree first', 'Yes — as long as it\'s earned income, even informal work counts, and you can contribute up to that amount or the annual limit, whichever is lower', 'Yes, but only if a parent opens the account for you'],
        correct: 2,
        exp: 'Roth IRA eligibility is based on having earned income, not age or job type — babysitting, tutoring, and part-time jobs all count. You can contribute up to the amount you earned or the annual IRS limit, whichever is smaller.'
      },
      {
        q: 'You\'re 19 and investing for retirement decades away. A friend who\'s 60 and retiring soon has a very different portfolio. What should be different about yours?',
        opts: ['Nothing, everyone should invest identically regardless of age', 'With decades until retirement, you can typically afford to hold more stocks — higher short-term volatility, higher long-term growth — while someone near retirement shifts toward more stable investments like bonds', 'You should invest more conservatively than someone who is retiring soon', 'You should avoid the stock market entirely until you\'re older'],
        correct: 1,
        exp: 'Time horizon drives risk tolerance. Decades of runway mean you can ride out short-term stock market dips in exchange for higher long-term growth. Someone nearing retirement has less time to recover from a downturn, so they typically shift toward more stable investments.'
      },
      {
        q: 'You only have $25/month to invest and think it\'s not worth starting until you have more money saved up. What\'s the flaw in that thinking?',
        opts: ['It\'s correct — investing small amounts isn\'t worth it', 'Investing consistently, even in small amounts (dollar-cost averaging), gets your money into the market sooner and builds the habit — waiting for a "big enough" amount often means never starting', 'You need at least $1,000 to open any investment account', 'Small investments are illegal'],
        correct: 1,
        exp: 'Dollar-cost averaging — investing a fixed amount on a regular schedule — means you buy at different prices over time and don\'t have to correctly "time" the market. Waiting to invest until you have more money almost always costs you more in lost time than it saves.'
      },
      {
        q: 'Your job offers a 403(b) with a 3% match, and you\'re also eligible to open a Roth IRA. If you can\'t max out both, what\'s the typical smart order?',
        opts: ['Always max the Roth IRA first and ignore any employer match', 'Contribute enough to the 403(b) to get the full employer match first (free money), then direct extra savings to a Roth IRA', 'Only ever use one account — pick whichever has a better name', 'Employer plans and Roth IRAs cannot both be used by the same person'],
        correct: 1,
        exp: 'The order that maximizes free money: capture the full employer match first since it\'s an immediate guaranteed return, then build up a Roth IRA for its tax-free growth and broader investment choices. Both can be used together.'
      },
      {
        q: 'An index fund had a great year last year, so a friend suggests putting all your investing money into "whatever performed best last year." What\'s wrong with this strategy?',
        opts: ['Nothing, past winners always keep winning', 'Past performance doesn\'t guarantee future results — chasing last year\'s top performer is a common beginner mistake instead of sticking to a diversified, long-term strategy', 'You should always buy whatever underperformed last year instead', 'Fund performance never changes year to year'],
        correct: 1,
        exp: 'Markets are cyclical, and last year\'s top performer is not a reliable predictor of next year\'s results. A consistent, diversified, long-term strategy tends to beat chasing performance.'
      },
      {
        q: 'The stock market drops 15% right after you start investing. What\'s typically the smartest response for a young investor with a long time horizon?',
        opts: ['Sell everything immediately to avoid further losses', 'Stay invested (or keep contributing) since market dips are normal and selling locks in the loss — time in the market matters more than timing it', 'Stop investing completely for several years', 'Panic and move all your money to cash permanently'],
        correct: 1,
        exp: 'Market downturns are a normal, expected part of investing — not a signal to sell. Selling during a dip turns a temporary paper loss into a permanent one. With decades until retirement, staying invested lets you buy in at lower prices and recover as markets historically have.'
      }
    ],
    lessons: [
      { title: 'Compound Interest & Time', hook: 'Two students each invest $1,000 into the same fund. Alex starts at 18, Jordan starts at 28. At 65, Alex has $21,000. Jordan has $10,700. Same amount invested. What made the difference?', qIndices: [1, 2] },
      { title: 'Roth IRA Basics', hook: 'You have $50/month to invest and someone says "open a Roth IRA." You\'ve heard the words but don\'t know if you even qualify — do you need a big salary, a certain age, or a special account first?', qIndices: [0, 6] },
      { title: 'Contribution Limits & Where to Save First', hook: 'Your job offers a 403(b) with a match, and you\'re also eligible for a Roth IRA with a $7,000 annual limit. You can\'t max out both right now — which comes first?', qIndices: [4, 9] },
      { title: 'Index Funds & Diversification', hook: 'A friend tells you to put your $500 savings into one stock they\'re sure will "blow up." Another friend says index funds are the smarter move. What\'s actually different about spreading your money across hundreds of companies?', qIndices: [3, 5] },
      { title: 'Risk, Time Horizon & Staying the Course', hook: 'The market drops 15% the same month you started investing, right as your 60-year-old parent\'s retirement account also takes a hit. Should you both be reacting the same way?', qIndices: [7, 11] },
      { title: 'Getting Started Small', hook: 'You only have $25/month to invest and figure it\'s not worth starting until you\'ve saved up more. Meanwhile a friend jumps into whatever fund had the best return last year. Is either of you making the smart move?', qIndices: [8, 10] }
    ]
  },
  {
    id: 'credit', title: 'Managing Credit', icon: '05', iconColor: 'sky', xpReward: 30,
    hook: 'You just got your first credit card with a $1,000 limit. You spend $800 on textbooks and dorm supplies. You pay the minimum each month. In 3 years, you\'ve paid nearly $300 in interest - and still owe $600. What went wrong?',
    desc: 'APR, credit scores, utilization, building credit from scratch, and how to avoid common traps.',
    questions: [
      {
        q: 'What does APR stand for, and why does it matter for credit cards?',
        opts: ['Annual Payment Rate - the yearly card membership fee', 'Annual Percentage Rate - the yearly cost of carrying a balance on the card', 'Authorized Purchase Rate - a discount on eligible purchases', 'Average Payment Ratio - your credit utilization percentage'],
        correct: 1,
        exp: 'APR is the interest rate on unpaid balances. At 24% APR, a $1,000 balance you carry for a year costs an extra $240. Pay in full every month to avoid it entirely.'
      },
      {
        q: 'What is credit utilization ratio, and what\'s a healthy target?',
        opts: ['The number of credit cards you own - aim for 5+', 'How often you pay on time - aim for 100%', 'The % of your available credit limit you\'re using - keep it under 30%', 'Your monthly minimum payment - aim for 2x the minimum'],
        correct: 2,
        exp: 'Utilization = balance ÷ limit. Using $250 of a $1,000 limit = 25% - healthy. Maxing out your card signals financial stress to lenders.'
      },
      {
        q: 'What happens if you only pay the minimum balance each month?',
        opts: ['Your credit score improves significantly', 'You avoid all interest charges on the remaining balance', 'Interest compounds on the remaining balance, costing you far more over time', 'The remaining balance is forgiven after 12 months'],
        correct: 2,
        exp: 'Minimum payments are a trap. On $1,000 at 22% APR, making only minimum payments can take 5+ years and cost hundreds extra in interest.'
      },
      {
        q: 'Which action has the MOST positive impact on your credit score?',
        opts: ['Applying for several new credit cards at once', 'Consistently paying your bill in full and on time, every month', 'Closing old credit card accounts you no longer use', 'Maxing out one card to show high usage'],
        correct: 1,
        exp: 'Payment history is 35% of your FICO score - the single largest factor. Even one missed payment can drop your score significantly and linger for 7 years.'
      },
      {
        q: 'What is the FICO credit score range, and what\'s considered "Good"?',
        opts: ['0–100; Good is 80+', '100–900; Good is 700+', '300–850; Good is 670+', '300–850; Good is 800+'],
        correct: 2,
        exp: 'FICO scores range 300–850. 670+ is Good, 740+ is Very Good, 800+ is Exceptional. A good score unlocks lower interest rates - worth thousands over a lifetime.'
      },
      {
        q: 'You have no credit history at all. What\'s a common way for a student to start building credit safely?',
        opts: ['You can\'t build credit until you have a full-time job', 'Become an authorized user on a parent\'s card, get a secured or student credit card, and make small purchases you pay off in full each month', 'Take out the largest loan you can qualify for', 'Avoid all forms of credit until age 25'],
        correct: 1,
        exp: 'Options built for beginners — student credit cards, secured cards backed by a refundable deposit, or becoming an authorized user on a parent\'s well-managed card — let you start building payment history safely, often with a low limit while you learn the ropes.'
      },
      {
        q: 'Which of these is a common credit mistake students make?',
        opts: ['Paying the full statement balance every month', 'Co-signing a loan for a friend, closing their oldest credit card, or applying for several new cards in a short window', 'Keeping a card open even after they stop using it regularly', 'Checking their credit score for free once a year'],
        correct: 1,
        exp: 'Co-signing makes you equally responsible for someone else\'s debt if they miss a payment. Closing your oldest card can shorten your average credit history and hurt your score. Applying for multiple cards at once triggers several hard inquiries close together, which can also ding your score.'
      },
      {
        q: 'A store offers you 20% off today if you open their retail credit card. What\'s the hidden risk?',
        opts: ['There is no risk, store cards are identical to regular cards', 'Store cards often carry very high APRs (sometimes 25–30%+), so carrying a balance can cost far more than the discount was worth', 'Store cards never affect your credit score', 'You can only use store cards at that one retailer forever'],
        correct: 1,
        exp: 'Retail/store cards frequently carry some of the highest APRs available. A one-time 20% discount can be wiped out fast if you carry a balance at 28% APR for even a couple months. If you open one, treat it like any card — pay it off in full.'
      },
      {
        q: 'Beyond your three-digit credit score, what else lives on your credit report?',
        opts: ['Nothing else, the score is the entire report', 'A full history of your credit accounts, balances, payment history, and hard inquiries — all checkable for free once a year at annualcreditreport.com', 'Your bank account balance and daily spending habits', 'Your college GPA and academic record'],
        correct: 1,
        exp: 'Your credit report is the detailed record; your score is a single number summarizing it. Checking your full report yearly — free, from all three bureaus, via annualcreditreport.com — helps you catch errors or fraud that the score alone won\'t show.'
      },
      {
        q: 'You check your free credit report and spot a credit card account you never opened. What should you do?',
        opts: ['Ignore it, it will probably fall off eventually', 'File a dispute directly with the credit bureau reporting it, and consider a fraud alert if it looks like identity theft', 'Close all of your other accounts immediately', 'Wait until your score drops further before taking action'],
        correct: 1,
        exp: 'Errors and fraudulent accounts don\'t fix themselves. Dispute the item directly with the credit bureau (Equifax, Experian, or TransUnion) as soon as you spot it — the longer it sits, the more it can drag down your score.'
      },
      {
        q: 'Two students have the same on-time payment record, but one has had a credit card for 4 years and the other for 4 months. How does this affect their scores?',
        opts: ['Length of credit history has no impact on your score', 'A longer credit history generally helps your score, which is why closing your oldest card can quietly hurt you even if you stop using it', 'Only the newest account matters for scoring', 'Length of history only matters after you turn 30'],
        correct: 1,
        exp: 'Length of credit history is one of the standard FICO scoring factors. It\'s also why financial advice often says to keep your oldest card open — even with a small occasional charge — rather than closing it once you stop using it regularly.'
      },
      {
        q: 'You\'re rate-shopping for a car loan and a lender checks your credit as part of a pre-qualification quote. Is this the same as applying for a new credit card?',
        opts: ['Yes, both always hurt your score the same amount', 'Not necessarily — a "soft" inquiry like pre-qualification typically doesn\'t affect your score, while a "hard" inquiry like a full application can cause a small, temporary dip', 'Soft inquiries are illegal for lenders to run', 'Hard inquiries permanently and severely damage your score forever'],
        correct: 1,
        exp: 'Soft inquiries — pre-qualification checks, checking your own score — don\'t affect your score. Hard inquiries — a full application for a card or loan — cause a small, temporary dip and stay on your report for about two years.'
      }
    ],
    lessons: [
      { title: 'APR & Minimum Payments', hook: 'You got your first credit card with a $1,000 limit. Textbooks and dorm supplies ran you $800. You pay the minimum each month. Three years later, you\'ve paid $300 in interest and still owe $600. What went wrong?', qIndices: [0, 2] },
      { title: 'Utilization & Store Cards', hook: 'Your roommate got 20% off by opening a store credit card at checkout. Meanwhile you\'re both told to keep your credit utilization under 30%. Are these two things related?', qIndices: [1, 7] },
      { title: 'Building Credit From Scratch', hook: 'You\'ve never had a credit card, loan, or any credit history at all. Meanwhile you keep hearing that checking your own score doesn\'t hurt it, but applying for five cards at once might. What\'s actually true?', qIndices: [5, 11] },
      { title: 'Common Mistakes That Hurt Your Score', hook: 'Your friend co-signed a car loan for their sibling and closed their oldest credit card the same month "to simplify things." Their score dropped 60 points. What happened?', qIndices: [3, 6] },
      { title: 'The FICO Scale', hook: 'Your roommate got an apartment at a better rate because their credit score was 720. Yours was 610 — despite having a card for the same amount of time. What actually goes into that number?', qIndices: [4, 10] },
      { title: 'Credit Reports & Disputing Errors', hook: 'You get an alert that an account you don\'t recognize just showed up on your credit report. Before panicking, do you even know what\'s normally on there — or how to get it fixed?', qIndices: [8, 9] }
    ],
    quests: [
      {
      id: 'maya',
      topic: 'Your First Credit Card',
      character: { name: 'Maya', tagline: 'Sophomore who just got her first credit card' },
      initialState: { creditScore: 640, checking: 200, savings: 0 },
      bossAchievementId: 'crisis_averted',
      chapters: [
        {
          id: 'c0', type: 'story', title: 'Meet Maya',
          beats: [
            { speaker: 'intro', text: "This is Maya. She just started her first year of college, and like a lot of first-years, she's never had to manage her own money before. Today, you're going to help her handle something brand new: her very first credit card." }
          ]
        },
        {
          id: 'c0b', type: 'story', title: 'Meet Maya',
          beats: [
            { speaker: 'Maya', text: '"Wait, I get to make my OWN money decisions now? No pressure or anything..."' },
            { speaker: 'narrator', text: "Hi, I'm Hammy! I'll be right here the whole time, explaining anything confusing, one small piece at a time. Nothing is assumed here. We'll go step by step, together." }
          ]
        },
        {
          id: 'c1', type: 'story', title: 'The Offer',
          beats: [
            { speaker: 'narrator', text: 'A table in the student union is handing out free t-shirts... for signing up for a credit card.' },
            { speaker: 'Maya', text: '"A free tee AND a $1,000 limit? Sign me up."' },
            { speaker: 'narrator', text: 'Two weeks later the card arrives. Before Maya uses it, let\'s slow down and make sure you know exactly what she\'s holding in her hands, no assumptions, no jargon.' }
          ]
        },
        {
          id: 't0', type: 'teach', title: 'Your Mission Control', highlightDashboard: true,
          concepts: [
            {
              term: 'Checking Account',
              plain: 'This is like Maya\'s everyday spending money, the account she uses to pay for things like food, gas, and bills. You\'ll see it labeled "CHECKING" at the top of your screen for the rest of this quest.',
              analogy: 'Think of it like her wallet, money goes in, money goes out, all the time.',
              check: { statement: 'Checking is the money Maya sets aside and tries not to touch.', isTrue: false }
            },
            {
              term: 'Savings Account',
              plain: 'This is money Maya sets aside and tries not to touch, for emergencies or big goals later. You\'ll see it labeled "SAVINGS" at the top of your screen.',
              analogy: 'Think of it like a piggy bank she\'s not allowed to raid just because she wants a snack.',
              check: { statement: 'Savings is the account Maya uses for everyday spending, like food and gas.', isTrue: false }
            },
            {
              term: 'Credit Score (coming up next!)',
              plain: 'The third box at the top says "CREDIT SCORE", that one\'s a little more involved, so we\'re going to slow way down and cover it all on its own, right after this.',
              analogy: 'Think of this as a sneak peek, the full explanation is just one step away.'
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 't1', type: 'teach', title: 'Credit Card Basics',
          concepts: [
            {
              term: 'Credit Card',
              plain: 'A credit card isn\'t free money. It\'s a loan. When you swipe it, the bank pays the store for you, and you promise to pay the bank back later.',
              analogy: 'It\'s like borrowing $20 from a friend for lunch. You still owe them $20, a credit card just makes the borrowing invisible, since no cash changes hands.',
              check: { statement: 'A credit card is free money that Maya never has to pay back.', isTrue: false }
            },
            {
              term: 'Credit Limit',
              plain: 'Your "limit" is the most the bank will let you borrow at once. Maya\'s card has a $1,000 limit. That\'s a ceiling, not a goal to reach.',
              analogy: 'Think of it like a bucket that holds $1,000. Every purchase pours a little in; paying your bill empties it back out.',
              check: { statement: "Maya's credit limit is a goal she should try to spend up to every month.", isTrue: false }
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 't2', type: 'teach', title: 'Your Credit Score', highlightDashboard: true,
          concepts: [
            {
              term: 'Credit Score',
              plain: 'A credit score is a 3-digit number, from 300 to 850, that tells lenders how reliable you\'ve been about paying back money you\'ve borrowed. Higher = more trustworthy. You\'ll see Maya\'s score at the top of the screen for the rest of this quest.',
              analogy: 'Think of it like a trust rating. The same way a driver with a clean record gets cheaper car insurance, someone with a high credit score gets approved for apartments and loans at better rates.',
              check: { statement: 'A higher credit score means lenders trust you less.', isTrue: false }
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 'm1', type: 'matching', title: 'Match It! Round 1',
          pairs: [
            { term: 'Credit Card', definition: 'A loan you use to buy something now and pay the bank back later.' },
            { term: 'Credit Limit', definition: 'The most money the bank will let you borrow at once.' },
            { term: 'Credit Score', definition: 'A 3-digit number that shows lenders how trustworthy you are with borrowed money.' }
          ],
          xpOnComplete: 4
        },
        {
          id: 'e1', type: 'explainback', title: 'In Your Own Words',
          prompt: 'In your own words, what is a credit score, and why does it matter? Type a sentence or two. There\'s no wrong way to start.',
          keywords: ['number', 'trust', 'borrow', 'pay back', 'lend', '300', '850', 'reliable', 'score'],
          fullDefinition: 'A credit score is a 3-digit number (300–850) that tells lenders how reliable you\'ve been about paying back borrowed money. The higher it is, the more lenders trust you, which gets you approved for things like apartments and loans at better rates.',
          xpOnComplete: 3
        },
        {
          id: 'h1', type: 'hint', tag: "🎉 Hammy's Tip",
          text: 'Fun fact: checking your OWN credit score is always free and 100% safe. It never lowers your score. Only applying for new credit cards or loans can cause a small dip, so check it often and stay in the know.',
          xpOnComplete: 1
        },
        {
          id: 't3', type: 'teach', title: 'The Cost of Borrowing',
          concepts: [
            {
              term: 'Interest (APR)',
              plain: 'If you don\'t pay your full bill, the bank charges you extra for the privilege of waiting, that\'s called interest. The letters "APR" stand for Annual Percentage Rate, a fancy way of saying the yearly rate the bank charges you. You\'ll see "APR" a lot from here on, just remember it means "the yearly interest rate."',
              analogy: 'It\'s like a late fee that keeps growing the longer you wait to pay, except instead of a flat fee, it\'s a percentage of what you still owe.',
              check: { statement: "If Maya pays her full balance every month, she avoids paying interest.", isTrue: true }
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 't4', type: 'teach', title: 'The Minimum Payment',
          concepts: [
            {
              term: 'Minimum Payment',
              plain: 'Every statement lists a "minimum payment", the smallest amount you\'re allowed to pay to avoid a late fee. But paying only that leaves most of your bill, plus interest, unpaid and growing.',
              analogy: 'It\'s like bailing a little water out of a leaking boat. You\'re not sinking today, but you haven\'t fixed the leak either.',
              check: { statement: 'Paying only the minimum payment pays off your whole balance quickly.', isTrue: false }
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 'm2', type: 'matching', title: 'Match It! Round 2',
          pairs: [
            { term: 'Interest (APR)', definition: 'The extra money a bank charges you for not paying your full bill right away.' },
            { term: 'Minimum Payment', definition: 'The smallest amount you\'re allowed to pay to avoid a late fee, but it leaves most of your bill unpaid.' },
            { term: 'Credit Score', definition: 'A 3-digit number that shows lenders how trustworthy you are with borrowed money.' }
          ],
          hintText: "Both new words were just taught above, 'APR' is about the COST of not paying in full, and 'Minimum Payment' is about the SMALLEST amount allowed.",
          xpOnComplete: 4
        },
        {
          id: 'c2', type: 'decision',
          title: 'Move-In Shopping',
          prompt: 'Maya needs $800 in textbooks and dorm supplies. She has $200 in checking. What should she put on the new card?',
          hintText: "Think back to Interest (APR): does the bank charge extra for balances you DON'T pay off right away, or is carrying a balance free?",
          choices: [
            {
              id: 'a', label: 'Put it all on the card, pay only the minimum',
              outcome: {
                text: 'Maya carries a $600 balance at 24% APR, projected around $300 in interest over the next 3 years, on top of the $600 she already owes.',
                delta: { creditScore: -10 },
                compare: [{ label: 'Her choice, interest paid', value: 300 }, { label: 'Pay-in-full path, interest paid', value: 0 }]
              }
            },
            {
              id: 'b', label: 'Charge $200, pay it off immediately; cover the rest with savings and a work-study shift',
              outcome: {
                text: 'Maya pays her statement in full, so no interest ever gets charged, and she\'s using less of her limit, which helps her score too.',
                delta: { creditScore: 8 },
                compare: [{ label: 'Her choice, interest paid', value: 0 }, { label: 'Minimum-payment path, interest paid', value: 300 }]
              }
            }
          ],
          xpOnComplete: 5
        },
        {
          id: 'c3', type: 'microsim',
          title: 'The Monthly Squeeze',
          prompt: 'Maya\'s paycheck is $600/month. Fixed costs already eat $430 of it. Help her fit in a card payment and some savings without going negative.',
          hintText: 'Add up the fixed costs first ($45 + $150 + $35 + $100 + $100 = $430). That leaves $170 of her $600 to split between the two sliders before she goes negative.',
          income: 600,
          fixedCosts: [
            { label: 'Phone', amount: 45 },
            { label: 'Meal plan top-up', amount: 150 },
            { label: 'Subscriptions', amount: 35 },
            { label: 'Gas & transit', amount: 100 },
            { label: 'Rent share', amount: 100 }
          ],
          sliders: [
            { id: 'cardPayment', label: 'Credit card payment', min: 25, max: 200, step: 25, default: 25 },
            { id: 'savings', label: 'Savings deposit', min: 0, max: 150, step: 25, default: 0 }
          ],
          feedbackTiers: [
            { maxLeftover: -1, text: 'That budget goes negative. Maya can\'t sustain this. Try a smaller card payment or savings deposit.', ok: false },
            { maxLeftover: 24, text: 'Workable, but there\'s almost no cushion left for a surprise expense.', ok: true },
            { maxLeftover: Infinity, text: 'Solid. She\'s covering her bill and still building a cushion.', ok: true }
          ],
          xpOnComplete: 6
        },
        {
          id: 't5', type: 'teach', title: 'Credit Utilization',
          concepts: [
            {
              term: 'Credit Utilization',
              plain: 'This is how much of your credit limit you\'re currently using. If Maya has a $1,000 limit and owes $300, she\'s using 30% of it. Lenders like to see this number stay low, under 30% is a good rule of thumb.',
              analogy: 'Picture your limit as a gas tank. Riding around on three-quarters of a tank looks fine to lenders. Riding around on empty, maxed out, looks risky, even if you always pay on time.',
              check: { statement: 'Using less of your available credit limit is better for your score than using almost all of it.', isTrue: true }
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 'm3', type: 'matching', title: 'Match It! Round 3',
          pairs: [
            { term: 'Credit Utilization', definition: 'How much of your credit limit you\'re currently using, shown as a percentage.' },
            { term: 'Interest (APR)', definition: 'The extra money a bank charges you for not paying your full bill right away.' },
            { term: 'Minimum Payment', definition: 'The smallest amount you\'re allowed to pay to avoid a late fee, but it leaves most of your bill unpaid.' }
          ],
          hintText: "Utilization is about your LIMIT (how much you're using of what you're allowed to borrow), not about interest or payments.",
          xpOnComplete: 4
        },
        {
          id: 'poll1', type: 'poll', title: 'What Do Most People Think?',
          intro: "Before we bust some myths, guess what most people believe. Tap True or False, then see how the crowd voted.",
          statement: 'You need to already have good credit to get approved for your first credit card.',
          isTrue: false,
          sampleSize: '1,000 college students',
          pollResults: [
            { label: 'True', pct: 58 },
            { label: 'False', pct: 42 }
          ],
          explanation: "It's a myth. You don't need existing credit to start. Options built for beginners, like student cards or secured cards backed by a refundable deposit, let you build a credit history from zero.",
          xpOnComplete: 2
        },
        {
          id: 'c4', type: 'mythcards', title: 'Credit Myths',
          cards: [
            { myth: 'Carrying a small balance helps your credit score.', isTrue: false, explanation: 'Paying your bill in full every month is what actually helps. Carrying a balance just costs you extra in interest, it never boosts your score.' },
            { myth: 'Checking your own credit score hurts it.', isTrue: false, explanation: 'Checking your own score is always safe and free, and it never lowers it. Only applying for new credit causes a small, temporary dip.' },
            { myth: 'Closing an old, unused card can hurt your score.', isTrue: true, explanation: 'It can! Closing your oldest card shortens your credit history and raises your utilization, both of those can lower your score.' },
            { myth: 'Paying on time, every time, is the single biggest factor in your credit score.', isTrue: true, explanation: 'True, payment history matters more than anything else. It\'s worth more to your score than your utilization, your history length, or anything else combined.' }
          ],
          xpPerCorrect: 2
        },
        {
          id: 'c5', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 2],
          hintTexts: [
            "APR has the word \"Percentage\" in it, think about what yearly percentage of your balance the bank charges you for carrying it.",
            "Remember the leaking-boat analogy, does bailing out a LITTLE water each time actually fix the leak, or just keep you afloat?"
          ]
        },
        {
          id: 'c6', type: 'simulator', simulatorId: 'credit-climb', title: 'Credit Climb',
          intro: 'Watch Maya\'s score move in real time over her first year of card use. Tap each decision below to see the impact.',
          hintText: 'Payment history and utilization are the two biggest score factors, decisions that touch those move the needle the most, for better or worse.',
          decisions: [
            { id: 'd1', label: 'Pay every statement in full, on time, for 6 months', scoreDelta: 35, note: 'Paying on time, every time, is the single biggest thing that helps your score.' },
            { id: 'd2', label: 'Keep utilization under 30% instead of maxing the card', scoreDelta: 15, note: 'Using less of your available credit is the second-biggest factor.' },
            { id: 'd3', label: 'Apply for two more store cards this month', scoreDelta: -12, note: 'Applying for several cards at once makes lenders nervous and dings your score a little.' },
            { id: 'd4', label: 'Keep her oldest card open, barely used', scoreDelta: 8, note: 'The longer you\'ve had credit, the more it helps, so old accounts are worth keeping open.' }
          ],
          xpOnComplete: 6
        },
        {
          id: 'c7', type: 'priceisright',
          title: 'The Price Is Right: Minimum Payments',
          prompt: 'Maya carries a $1,000 balance at 24% APR for a year, paying only the $25 minimum each month. Guess the total interest she pays that year.',
          hintText: "24% APR means roughly a quarter of what she owes gets added back as interest over a full year if she barely pays it down. Start your guess near there.",
          actualValue: 230, guessRange: { min: 0, max: 500, step: 10 },
          explanation: 'Minimum payments barely dent what you actually owe, most of each payment goes toward interest first, and only a little toward the original balance.',
          xpOnComplete: 5
        },
        {
          id: 'c8', type: 'bossbattle', title: 'The Car Repair',
          scenario: 'Finals week. Maya\'s car needs an $800 repair or she can\'t make it to her internship. She has $150 in savings and $700 of available credit (room left on her limit).',
          hintText: 'Compare the interest rates: a regular credit card is around 24% APR. A payday loan can be 300%+ APR. One of those is dramatically more expensive.',
          choices: [
            { id: 'a', label: 'Cover it with savings, put the rest on the card, pay it off in 2 months', consequence: { text: 'A smart trade-off, a little short-term interest, but she avoids an expensive loan and her credit stays healthy.', delta: { creditScore: 5, savings: -150 }, xpMultiplier: 1.25 } },
            { id: 'b', label: 'Put the whole $800 on the card, pay minimums', consequence: { text: 'She\'s now using almost all of her limit, with roughly $140 in projected interest ahead, both hurt her score.', delta: { creditScore: -15 }, xpMultiplier: 0.6 } },
            { id: 'c', label: 'Take a same-day payday loan (a very short-term loan, repaid fast, with steep fees)', consequence: { text: 'Fast cash, but payday loans often carry 300%+ APR, usually the most expensive option available, by far.', delta: { creditScore: -5 }, xpMultiplier: 0.5 } },
            { id: 'd', label: 'Ask a parent to cover it and pay them back over time', consequence: { text: 'No interest, but this only works as a safety net if that arrangement is actually reliable for both sides.', delta: { creditScore: 0 }, xpMultiplier: 0.9 } }
          ]
        }
      ]
      },
      {
        id: 'jordan',
        topic: 'The Store Card Trap',
        character: { name: 'Jordan', tagline: 'Junior tempted by a store card discount at checkout' },
        initialState: { creditScore: 700, checking: 150, savings: 50 },
        bossAchievementId: 'store_card_smart',
        chapters: [
          {
            id: 'j1', type: 'story', title: 'Meet Jordan',
            beats: [
              { speaker: 'intro', text: "This is Jordan. He's a junior who's had a regular credit card for two years and always pays it off in full. Today, a checkout screen is about to test everything he knows." },
              { speaker: 'Jordan', text: '"Wait, sign up for a store card and save 20% right now? That\'s basically free money... right?"' },
              { speaker: 'narrator', text: "Let's slow down before Jordan taps \"Sign Up.\" A discount today can turn into an expensive mistake later, let's break down why." }
            ]
          },
          {
            id: 'jt1', type: 'teach', title: 'Store Credit Cards',
            concepts: [
              {
                term: 'Store Credit Card',
                plain: "A store card works just like a regular credit card, it's a loan you pay back later, but it usually only works at one retailer, and it often comes with a much higher interest rate than a regular card.",
                analogy: "It's like a regular credit card, but with a much steeper penalty if you don't pay it off in full.",
                check: { statement: 'A store card usually works at any store, just like a regular credit card.', isTrue: false }
              },
              {
                term: 'Store Card APR',
                plain: 'APR stands for Annual Percentage Rate, it just means the yearly interest rate a card charges you for carrying a balance. Store cards often charge a 25-30%+ APR, noticeably higher than most regular credit cards. A one-time discount can get wiped out fast if you carry a balance.',
                analogy: "It's like a discount coupon that expires the moment you don't pay in full, after that, it starts costing you more than you saved.",
                check: { statement: 'Store cards often have a HIGHER interest rate than regular credit cards.', isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'j2', type: 'decision', title: 'Sign Up at Checkout?',
            prompt: "The cashier offers Jordan 20% off his $150 purchase, $30 saved, if he opens the store's credit card right now. What should he do?",
            hintText: "Weigh the one-time $30 discount against what you just learned about store card APR. Does saying yes cost him anything besides a small score dip if he pays in full?",
            choices: [
              {
                id: 'a', label: 'Open the card for the discount, and pay the full statement immediately',
                outcome: {
                  text: 'Jordan saves $30 up front and pays his statement in full, so no interest hits, but the new account and credit check ding his score slightly.',
                  delta: { creditScore: -5 },
                  compare: [{ label: 'Total spent (with discount)', value: 120 }, { label: 'Total spent (no discount)', value: 150 }]
                }
              },
              {
                id: 'b', label: 'Skip the store card and pay full price with his regular card',
                outcome: {
                  text: 'Jordan skips the discount but keeps his credit file simple: no new inquiry, no new account to manage.',
                  delta: { creditScore: 0 },
                  compare: [{ label: 'Total spent (no discount)', value: 150 }, { label: 'Total spent (with discount)', value: 120 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'j3', type: 'microsim', title: "Jordan's Monthly Numbers",
            prompt: 'Jordan takes home $900/month. Fixed costs already use $650. Help him fit a credit card payment and some savings in without going negative.',
            hintText: 'Add up the fixed costs ($400 + $120 + $50 + $80 = $650). That leaves $250 of his $900 to split between the two sliders before he goes negative.',
            income: 900,
            fixedCosts: [
              { label: 'Rent share', amount: 400 },
              { label: 'Groceries', amount: 120 },
              { label: 'Phone', amount: 50 },
              { label: 'Car insurance', amount: 80 }
            ],
            sliders: [
              { id: 'cardPayment', label: 'Credit card payment', min: 25, max: 150, step: 25, default: 25 },
              { id: 'savings', label: 'Savings deposit', min: 0, max: 100, step: 25, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Jordan can't sustain this. Try a smaller card payment or savings deposit.", ok: false },
              { maxLeftover: 24, text: "Workable, but there's almost no cushion left for a surprise expense.", ok: true },
              { maxLeftover: Infinity, text: "Solid. He's covering his bill and still building a cushion.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'jm1', type: 'matching', title: 'Match It!',
            pairs: [
              { term: 'Store Credit Card', definition: 'A card that works like a loan but usually only at one retailer.' },
              { term: 'Store Card APR', definition: 'The often much-higher yearly interest rate many store cards charge.' },
              { term: 'Credit Utilization', definition: "How much of your credit limit you're currently using, shown as a percentage." }
            ],
            hintText: "The two Store Card terms were just taught above, 'Card' is the WHERE it works, 'APR' is the interest RATE.",
            xpOnComplete: 4
          },
          {
            id: 'jh1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: opening several store cards in a short time adds up fast, each one is a small ding to your score, and it's easy to lose track of multiple bills. One well-managed card often beats five barely-used ones.",
            xpOnComplete: 1
          },
          {
            id: 'jpoll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, guess what most people believe. Tap True or False, then see how the crowd voted.",
            statement: 'Signing up for a store card just to get the one-time discount is basically free money with no downside.',
            isTrue: false,
            sampleSize: '1,000 college students',
            pollResults: [
              { label: 'True', pct: 63 },
              { label: 'False', pct: 37 }
            ],
            explanation: "It's a myth. That new account triggers a credit check and lowers your average account age, both can ding your score. And if you carry a balance even one month at a high store-card APR, the interest can wipe out the discount entirely.",
            xpOnComplete: 2
          },
          {
            id: 'j4', type: 'mythcards', title: 'Store Card Myths',
            cards: [
              { myth: 'Store cards always have the same interest rate as regular credit cards.', isTrue: false, explanation: 'Store cards often charge noticeably higher APR than average credit cards, sometimes 29% or more.' },
              { myth: 'A discount from opening a store card is guaranteed to save you money overall.', isTrue: false, explanation: 'It only saves you money if you pay the balance in full. Carry it even one month at a high APR and the interest can erase the discount.' },
              { myth: 'Opening a new store card can cause a small, temporary dip in your credit score.', isTrue: true, explanation: 'New accounts trigger a credit check and lower your average account age, both can cause a small, temporary dip.' }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'j5', type: 'knowledgecheck', title: 'Quick Check', qIndices: [7, 6],
            hintTexts: [
              "Think about the APR difference you just learned: store cards usually charge MORE than regular cards, not the same or less.",
              "Think about the three score-hurting habits covered so far: co-signing for someone else, closing your oldest card, or applying for several cards at once."
            ]
          },
          {
            id: 'j6', type: 'priceisright',
            title: 'The Price Is Right: Store Card Interest',
            prompt: 'Jordan carries a $500 balance on a store card with 29% APR for a year, paying only the minimum each month. Guess the total interest he pays that year.',
            hintText: 'At 29% APR, interest costs roughly a bit more than a quarter of the balance over a full year if it\'s barely paid down. Start your guess near there.',
            actualValue: 145, guessRange: { min: 0, max: 300, step: 10 },
            explanation: 'At 29% APR, interest piles up fast, minimum payments barely touch the principal, so almost the whole payment goes toward interest first.',
            xpOnComplete: 5
          },
          {
            id: 'j7', type: 'bossbattle', title: 'The Second Store Card',
            scenario: "Another store offers Jordan 25% off a $300 purchase for opening yet another store card, his third one this year. What does he do?",
            hintText: "Remember Hammy's tip about opening several store cards in a short time, each one is a small ding, and it's easy to lose track of multiple bills.",
            choices: [
              { id: 'a', label: 'Decline: one store card is already enough to manage', consequence: { text: 'Keeping his credit file simple pays off: no new inquiry, no new bill to track.', delta: { creditScore: 5 }, xpMultiplier: 1.25 } },
              { id: 'b', label: 'Open it anyway for the discount', consequence: { text: 'Three store cards in one year is a lot to manage, and each one dinged his score a little.', delta: { creditScore: -10 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Ask if they'll honor the discount without opening a card", consequence: { text: 'Some stores will, worth asking before assuming a new card is the only way to save.', delta: { creditScore: 3 }, xpMultiplier: 1.1 } },
              { id: 'd', label: 'Put the purchase on his existing regular card instead, and skip the discount', consequence: { text: 'He loses the discount, but keeps everything on one card he already manages well.', delta: { creditScore: 2 }, xpMultiplier: 0.9 } }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'risk', title: 'Managing Risk', icon: '06', iconColor: 'peach', xpReward: 25,
    hook: 'You\'re moving off-campus next fall. A pipe bursts in your apartment and ruins your laptop, TV, and clothes. Your landlord\'s insurance covers the building - not your stuff. You owe $2,000 in replacements. What should you have had?',
    desc: 'Health coverage, renter\'s insurance, scams, and identity theft protection.',
    questions: [
      {
        q: 'As a college student, when does your coverage under your parents\' health insurance plan typically end?',
        opts: ['When you turn 18', 'When you graduate high school', 'When you turn 26', 'When you get a full-time job'],
        correct: 2,
        exp: 'Under the ACA, you can stay on a parent\'s health plan until age 26. Many students don\'t realize this - check your coverage before paying for a separate student plan.'
      },
      {
        q: 'What does renter\'s insurance cover?',
        opts: ['Damage to the building and structure', 'Your personal belongings, liability, and temporary housing if your unit becomes uninhabitable', 'Only your laptop and electronics', 'Medical bills from injuries outside your home'],
        correct: 1,
        exp: 'Renter\'s insurance protects your stuff - laptop, clothes, furniture - from theft, fire, and water damage. It typically costs $10–$20/month and is almost always worth it.'
      },
      {
        q: 'Your landlord\'s insurance covers what?',
        opts: ['Your personal belongings in the apartment', 'The building and structure only - not your possessions', 'Both the building and everything inside it', 'Your medical bills if you get hurt inside'],
        correct: 1,
        exp: 'Landlord insurance covers the property itself, not your stuff. If there\'s a fire, flood, or break-in, your belongings are only protected if you have renter\'s insurance.'
      },
      {
        q: 'Which action is the MOST important step to protect yourself from identity theft as a student?',
        opts: ['Use the same password for all accounts for easy remembering', 'Never use public WiFi for any online activity', 'Use unique, strong passwords and enable two-factor authentication on financial accounts', 'Avoid opening any credit accounts until after graduation'],
        correct: 2,
        exp: 'College students are prime targets for identity theft. Unique passwords + 2FA on financial accounts (bank, email, student loans) is the single most effective protection.'
      },
      {
        q: 'You notice an unfamiliar $47 charge on your debit card. What should you do first?',
        opts: ['Ignore it - it\'s probably just a forgotten subscription', 'Wait 30 days to see if another charge appears', 'Contact your bank immediately to dispute the charge and request a card replacement', 'Close your account and open a new one at a different bank'],
        correct: 2,
        exp: 'Dispute unauthorized charges immediately. Federal law limits your liability, but only if you report quickly. Your bank will investigate and usually reverse fraudulent charges.'
      },
      {
        q: 'Your health plan has a $500 deductible, a $30 copay, and a monthly premium. What does the deductible mean?',
        opts: ['The monthly amount you pay just to have coverage', 'The amount you pay out of pocket before your insurance starts covering costs', 'A one-time enrollment fee', 'The maximum amount insurance will ever pay you'],
        correct: 1,
        exp: 'Premium = what you pay monthly for coverage. Deductible = what you pay out of pocket before insurance kicks in. Copay = a flat fee per visit after that. Knowing these three terms helps you actually use your plan.'
      },
      {
        q: 'Your school automatically bills you for its student health insurance plan, but you\'re already covered under a parent\'s plan until 26. What should you do?',
        opts: ['Pay for both plans just to be safe', 'Submit a waiver by the school\'s deadline showing proof of existing coverage, so the school removes the charge from your bill', 'Ignore the charge, it will go away on its own', 'Cancel your parent\'s plan instead'],
        correct: 1,
        exp: 'Many schools auto-enroll and bill students for a health plan unless you actively waive it with proof of comparable coverage — and waivers have a hard deadline, often within the first few weeks of the semester.'
      },
      {
        q: 'You\'re bringing a car to campus for the first time. What should you check on your auto insurance before move-in?',
        opts: ['Nothing changes just because you\'re a student', 'Whether your policy still qualifies for a good-student or resident-student discount, and whether your coverage limits are adequate for a new location', 'Auto insurance is optional if you only drive occasionally', 'Your parents\' policy automatically covers you no matter what'],
        correct: 1,
        exp: 'Adding a car — or a student driver — to a policy changes the math. Insurers often offer good-student discounts, and coverage needs can shift based on where the car is garaged. A quick call before move-in can save money and avoid gaps.'
      },
      {
        q: 'You get an email that looks like it\'s from your school\'s financial aid office asking you to "verify your account" by clicking a link and entering your login. What should you do?',
        opts: ['Click the link immediately since it mentions financial aid', 'Check the sender\'s actual email address and go directly to the official site instead of clicking — schools and banks don\'t ask for login credentials by email', 'Forward it to your friends so they can verify it too', 'Reply with your student ID number to confirm you got it'],
        correct: 1,
        exp: 'Phishing emails impersonating financial aid offices, banks, and even professors are extremely common on college campuses. Legitimate institutions don\'t ask you to confirm login credentials through an emailed link.'
      },
      {
        q: 'A renter\'s insurance policy costs about $15/month and has a $500 deductible. Your $1,500 laptop is stolen. How does the payout typically work?',
        opts: ['You get nothing back since you have a deductible', 'After the $500 deductible, your policy would typically cover the remaining value up to your policy limit', 'You get the full $1,500 with no deductible applied', 'You must cancel the policy to file a claim'],
        correct: 1,
        exp: 'A deductible is the amount you pay first before insurance covers the rest, not money you lose entirely. On a $1,500 stolen laptop with a $500 deductible, you\'d typically be reimbursed for roughly $1,000 — often making the $15/month cost well worth it.'
      },
      {
        q: 'You need to check your bank balance while at a coffee shop using the shop\'s public WiFi. What\'s the safer way to do it?',
        opts: ['Log in directly over the public WiFi, it\'s fine for quick checks', 'Use your phone\'s cellular data or a trusted personal hotspot instead of public WiFi for anything involving financial accounts', 'Public WiFi is always encrypted and totally safe for banking', 'Only check your balance using the shop\'s shared computer'],
        correct: 1,
        exp: 'Public WiFi networks can expose your data to anyone else connected to the same network. Using cellular data or a personal hotspot for banking logins avoids that risk — combine it with two-factor authentication for extra protection.'
      },
      {
        q: 'Your wallet is stolen, including your debit card and student ID. What should be your first move?',
        opts: ['Wait a day to see if it turns up before doing anything', 'Immediately call your bank to freeze or cancel the card, then update any autopay subscriptions linked to it and report the loss to campus security', 'Cancel your bank account entirely and never open a new one', 'Post about it on social media and wait for someone to return it'],
        correct: 1,
        exp: 'Acting fast limits the damage — freezing or canceling the card stops unauthorized use immediately. Update any subscriptions or autopay linked to that card once you get a new one, and report the loss to campus security if your student ID was also taken.'
      }
    ],
    lessons: [
      { title: 'Health Insurance Basics', hook: 'You just turned 20 and get a letter asking if you want to enroll in your school\'s health plan for $2,000/year. You\'re already covered under a parent\'s plan. Do you need this — and what do all these insurance terms even mean?', qIndices: [0, 5] },
      { title: 'Health Waivers & Car Insurance', hook: 'It\'s move-in day. You\'ve got a car in the parking lot for the first time and a health insurance waiver deadline you almost forgot about. Both are the kind of things that quietly cost you money if you ignore them.', qIndices: [6, 7] },
      { title: 'Renter\'s & Landlord Insurance', hook: 'You\'re moving off-campus next fall. A pipe bursts in your apartment and ruins your laptop, TV, and clothes. Your landlord\'s insurance covers the building — not your stuff. You owe $2,000 in replacements. What should you have had?', qIndices: [1, 2] },
      { title: 'What Insurance Actually Pays Out', hook: 'In the same week, you notice a $47 charge you don\'t recognize on your debit card, and you\'re filing your first-ever renter\'s insurance claim after a burst pipe. Do you know what to expect from either process?', qIndices: [9, 4] },
      { title: 'Identity Theft & Staying Safe Online', hook: 'You get a text claiming to be your bank, asking you to confirm your login while you\'re on public coffee-shop WiFi. Something about it feels off, but you\'re not totally sure why.', qIndices: [3, 10] },
      { title: 'If Something Is Stolen or Compromised', hook: 'Your wallet gets stolen the same week you get a suspicious "verify your financial aid account" email. Reacting fast to both keeps a bad day from turning into months of cleanup.', qIndices: [11, 8] }
    ]
  },
  {
    id: 'loans', title: 'Loans', icon: '07', iconColor: 'amber', xpReward: 30,
    hook: 'Your financial aid offer shows $5,500 in federal loans available for the year. You only need $3,200 to cover the gap after grants. It\'s tempting to take it all as extra cash. Should you?',
    desc: 'Federal vs. private loans, subsidized vs. unsubsidized, Parent PLUS, repayment plans, and how borrowing today follows you after graduation.',
    questions: [
      {
        q: 'What is the key difference between a Direct Subsidized and a Direct Unsubsidized federal loan?',
        opts: ['Subsidized loans are only for graduate students', 'The government pays the interest on Subsidized loans while you\'re in school; Unsubsidized loans accrue interest the entire time, including while you\'re enrolled', 'Unsubsidized loans have no fixed interest rate while Subsidized loans do', 'There is no real difference — both are treated identically'],
        correct: 1,
        exp: 'Direct Subsidized Loans are need-based, and the government covers the interest while you\'re enrolled at least half-time. Direct Unsubsidized Loans aren\'t based on need, and interest starts accruing from day one — even before you graduate — so it\'s worth paying that interest if you can while still in school.'
      },
      {
        q: 'Who is a Direct PLUS Loan designed for?',
        opts: ['Undergraduate students who have exhausted their Subsidized and Unsubsidized loan limits', 'Graduate/professional students, or parents of dependent undergrads, who need to cover costs beyond other financial aid', 'First-year students only', 'Students with excellent credit who want a lower interest rate than other federal loans'],
        correct: 1,
        exp: 'PLUS Loans — Grad PLUS or Parent PLUS — fill the gap after other aid is applied. Unlike Direct Subsidized/Unsubsidized loans, they require a credit check and typically carry a higher interest rate, so they should be a last resort, not a first option.'
      },
      {
        q: 'How does the number of credits you\'re enrolled in affect your federal loan eligibility?',
        opts: ['It has no effect — loan amounts are fixed no matter what', 'You generally need to be enrolled at least half-time to qualify for federal student loans, and your eligible amount can be reduced if you drop credits', 'Only full-time students can borrow any federal loans at all', 'Enrollment status only affects scholarships, never loans'],
        correct: 1,
        exp: 'Federal loan eligibility is tied to enrollment status — usually at least half-time (commonly 6+ credits per semester). Drop below that threshold mid-semester and your aid, including loans already disbursed, can be adjusted or even reversed. Always check with your financial aid office before dropping a class.'
      },
      {
        q: 'Before a first-time borrower can receive any federal Direct Loan funds, what must they complete?',
        opts: ['Nothing — funds are automatically disbursed once FAFSA is approved', 'A Master Promissory Note (MPN) and Loan Entrance Counseling, both completed at studentaid.gov', 'A credit check and a co-signer application', 'An in-person meeting with a loan officer at a bank'],
        correct: 1,
        exp: 'Every first-time federal borrower must complete both a Master Promissory Note — your legal promise to repay — and Loan Entrance Counseling, which walks through your rights and responsibilities, before a single dollar is disbursed. Both are done directly at studentaid.gov, and skipping either one delays your funds.'
      },
      {
        q: 'Your school offers you $5,500 in federal loans, but after grants and savings you only need $3,200 to cover your costs. What\'s the smartest move?',
        opts: ['Accept the full $5,500 — extra cash is always useful', 'Accept only the $3,200 you actually need, and decline or reduce the rest through your school\'s financial aid portal', 'Decline all loans, even the amount you need, to avoid any debt at all', 'Accept the full amount and invest the difference'],
        correct: 1,
        exp: 'You are never required to accept a loan offer in full. Every dollar borrowed accrues interest and has to be repaid after graduation — borrowing only what covers your actual gap keeps your future monthly payments manageable. "It\'s offered" doesn\'t mean "you need it."'
      },
      {
        q: 'You completed your MPN and Entrance Counseling last year and borrowed federal loans. Do you need to do anything to keep borrowing this year?',
        opts: ['No — once you\'re approved for federal loans, you\'re approved permanently', 'Yes — you must submit the FAFSA again every academic year to maintain your eligibility for federal loans and other aid', 'Only if your GPA drops', 'Only if you change your major'],
        correct: 1,
        exp: 'FAFSA isn\'t a one-time form — it must be resubmitted every academic year to keep your federal loan eligibility (and any grants or work-study) active. Missing the renewal is one of the most common ways students accidentally lose aid they were counting on.'
      },
      {
        q: 'What\'s a key difference between federal and private student loans?',
        opts: ['They are identical in every way', 'Federal loans offer protections like income-driven repayment and deferment regardless of credit; private loans come from banks or credit unions, often require a credit check or cosigner, and offer fewer built-in protections', 'Private loans are always cheaper than federal loans', 'Federal loans require a credit check but private loans do not'],
        correct: 1,
        exp: 'Federal loans come with borrower protections baked in by law — income-driven repayment, deferment, forgiveness programs — regardless of your credit. Private loans are issued by banks or credit unions, often require good credit or a cosigner, and rarely offer the same flexibility if you hit financial trouble. Exhaust federal loan options before considering private ones.'
      },
      {
        q: 'You graduate in May. When do your federal student loan payments typically begin?',
        opts: ['Immediately upon graduation', 'Usually after a 6-month grace period, giving you time to find a job before your first payment is due', 'Payments are never required until you turn 30', 'Only once you\'ve paid off all interest that accrued'],
        correct: 1,
        exp: 'Most federal loans include a 6-month grace period after you graduate, leave school, or drop below half-time enrollment. Use that window to pick a repayment plan — but if you have unsubsidized loans, interest is still accruing during this period even though no payment is due yet.'
      },
      {
        q: 'You graduate with $28,000 in federal loans and a modest starting salary. Are you stuck with one fixed monthly payment?',
        opts: ['Yes, there is only one repayment option for everyone', 'No — beyond the Standard 10-year plan, income-driven repayment plans set your monthly payment as a percentage of your income, which can lower payments if you\'re earning less', 'You must pay off the entire balance within 2 years of graduating', 'Repayment plans can only be changed once, ever'],
        correct: 1,
        exp: 'Federal loans offer multiple repayment plans. The Standard Plan pays off the loan in 10 years with a fixed payment. Income-driven repayment (IDR) plans instead calculate your payment based on your income and family size — useful if your starting salary is tight, though you\'ll generally pay more interest over a longer term.'
      },
      {
        q: 'You put your unsubsidized loan into deferment for a year while unpaid interest builds up. When you leave deferment, what happens to that unpaid interest?',
        opts: ['It disappears automatically', 'It typically capitalizes — gets added to your principal balance — meaning you now pay interest on a larger amount going forward', 'It\'s automatically forgiven after any deferment period', 'It has no effect on your future payments'],
        correct: 1,
        exp: 'Interest capitalization means unpaid interest gets rolled into your principal balance, so you start paying interest on interest. This commonly happens at the end of a deferment or forbearance period. Paying at least the interest while it accrues — even a small amount — can prevent your balance from growing larger than what you actually borrowed.'
      },
      {
        q: 'A parent takes out a Parent PLUS loan to help cover your tuition. Who is legally responsible for repaying it?',
        opts: ['The student, once they graduate and start working', 'The parent who took out the loan — it cannot simply be transferred to the student\'s name after the fact', 'Whoever has the higher income', 'It splits automatically 50/50 between parent and student'],
        correct: 1,
        exp: 'A Parent PLUS loan is the parent\'s legal debt, not the student\'s — even though it paid for the student\'s education. Some families refinance it into the student\'s name later through a private lender, but the federal loan itself stays the parent\'s responsibility unless that happens.'
      },
      {
        q: 'Before accepting your final year of loans, what\'s a smart way to think about how borrowing today affects you after graduation?',
        opts: ['Borrowing decisions don\'t matter until the first payment is due', 'Estimate your total debt at graduation and compare the expected monthly payment against a realistic starting salary for your field — a rough rule of thumb is keeping total debt near or below your expected first-year salary', 'Always borrow the maximum offered since you can figure out repayment later', 'Only students in expensive majors need to think about this'],
        correct: 1,
        exp: 'A common guideline: try to keep total student loan debt at or below your expected first-year salary in your field. Running the numbers before you graduate — total balance, estimated interest, and a realistic starting salary — turns an abstract future payment into something you can actually plan around now.'
      }
    ],
    lessons: [
      { title: 'Federal Loan Types', hook: 'Your financial aid offer lists Direct Subsidized and Direct Unsubsidized loans, plus a mention of private loan options from your bank. You\'ve never had to compare loan types before — does it actually matter which one you take?', qIndices: [0, 6] },
      { title: 'PLUS Loans & Who\'s Responsible', hook: 'Your parent takes out a Parent PLUS loan to cover the gap in your bill. You figure you\'ll just pay it off yourself after graduation — but is that actually how it works?', qIndices: [1, 10] },
      { title: 'Eligibility & Paperwork', hook: 'Before a single dollar of your loan shows up, studentaid.gov wants you to complete a Master Promissory Note and Entrance Counseling — and you\'re not sure if dropping one class this semester puts your aid at risk.', qIndices: [2, 3] },
      { title: 'Borrowing Only What You Need', hook: 'Your financial aid offer shows $5,500 in federal loans available for the year. You only need $3,200 to cover the gap after grants. It\'s tempting to take it all as extra cash. Should you?', qIndices: [4, 5] },
      { title: 'Repayment Plans & Interest Capitalization', hook: 'You defer your loan for a semester while between jobs, and later hear terms like "income-driven repayment" and "capitalized interest" for the first time. Do you actually know what either means for your balance?', qIndices: [8, 9] },
      { title: 'Grace Periods & Planning Ahead', hook: 'You graduate in May with $28,000 in federal loans and a job offer that starts in July. When does your first payment actually hit — and how do you know if you can afford it?', qIndices: [7, 11] }
    ]
  },
  {
    id: 'taxes', title: 'Taxes', icon: '08', iconColor: 'slate', xpReward: 30,
    hook: 'It\'s April. You have a W-2 from your on-campus job, a 1099 from a freelance gig, and you\'ve never filed a tax return in your life. Where do you even start?',
    desc: 'Filing your first return, W-2s vs. 1099s, education credits, dependency status, and the mistakes that cost students the most.',
    questions: [
      {
        q: 'As a student filing your very first tax return, what\'s the most important first step?',
        opts: ['Guess your income and file whatever feels right', 'Gather your income documents (W-2s, 1099s), confirm whether a parent claims you as a dependent, and file by the deadline — typically April 15th', 'Wait until you owe money before filing anything', 'Only file if you made over $50,000'],
        correct: 1,
        exp: 'Even students with part-time or internship income often need to file. Collect every income document you received, confirm your dependency status (it changes your standard deduction), and file — free options like IRS Free File cover most students. The federal deadline is typically April 15th.'
      },
      {
        q: 'You open your W-2 and "Box 1: Wages" is lower than your actual gross pay for the year. Why?',
        opts: ['The employer made an error', 'Box 1 shows taxable wages after pre-tax deductions — like retirement contributions or certain benefits — are subtracted', 'Box 1 always equals your final paycheck of the year', 'W-2s only report your most recent paycheck'],
        correct: 1,
        exp: 'Box 1 reflects taxable wages, not gross pay — pre-tax deductions such as 401(k)/403(b) contributions are already removed. Other boxes show federal income tax, Social Security, and Medicare withheld. You\'ll need this form on hand to file your return.'
      },
      {
        q: 'You did freelance design work and earned $900 through a platform that sent you a 1099-NEC instead of a W-2. What\'s different about this income?',
        opts: ['Nothing — it\'s taxed exactly like W-2 wages with taxes already withheld', 'No taxes were withheld, so you\'re responsible for reporting it yourself and may owe self-employment tax on top of income tax', '1099 income is tax-free under $1,000', 'You don\'t need to report it since it wasn\'t a full-time job'],
        correct: 1,
        exp: '1099 income — freelance work, gig apps, a side business — has no taxes withheld upfront; that responsibility falls on you. Beyond income tax, you may owe self-employment tax (roughly 15.3% for Social Security and Medicare) once net earnings pass $400. Setting aside 20–30% of 1099 income as you earn it avoids a painful surprise bill.'
      },
      {
        q: 'You worked a paid summer internship and received a W-2 with taxes already withheld. Do you still need to file a return?',
        opts: ['No — since taxes were already withheld, there\'s nothing left to do', 'Possibly yes — filing may get you a refund of over-withheld taxes, and you\'re required to file once your income passes the filing threshold', 'Only if the internship was unpaid', 'Internship income is exempt from taxes for students'],
        correct: 1,
        exp: 'Internship pay is taxed like any other W-2 job. Many students have more withheld than they actually owe relative to their total annual income — filing is how you get that money back as a refund. Skipping the return can mean leaving money on the table.'
      },
      {
        q: 'What\'s the difference between the American Opportunity Tax Credit (AOTC) and the Lifetime Learning Credit (LLC)?',
        opts: ['They\'re the same credit under two different names', 'The AOTC applies to the first four years of undergraduate study and offers a larger credit; the LLC has no year limit and covers more types of coursework, but offers a smaller credit', 'The LLC is only for graduate students and the AOTC only for high schoolers', 'Neither can be claimed if the student is someone else\'s dependent'],
        correct: 1,
        exp: 'The AOTC is worth up to $2,500/year for the first four years of a degree, and up to 40% of it is refundable even if you owe no tax. The LLC is worth up to $2,000/year with no limit on how many years you can claim it, and covers a broader range of courses. If you\'re a dependent, it\'s usually your parent who claims these — confirm who\'s eligible before anyone files.'
      },
      {
        q: 'Which of these is a common mistake first-time student filers make?',
        opts: ['Filing electronically instead of by mail', 'Forgetting to report 1099/gig income, filing as independent when a parent still claims them as a dependent, or missing education credits they qualify for', 'Using IRS Free File to submit their return', 'Keeping copies of their tax documents after filing'],
        correct: 1,
        exp: 'The most common first-time mistakes: forgetting to report cash or 1099 gig income, filing as independent when a parent actually claims you as a dependent (which affects both returns), and missing education credits or deductions entirely. When in doubt, your school\'s financial aid office or a free VITA tax clinic can help for free.'
      },
      {
        q: 'Your parents claim you as a dependent on their tax return. How does this affect your own return?',
        opts: ['It means you\'re not allowed to file your own tax return at all', 'Your standard deduction may be lower than an independent filer\'s, and you generally can\'t claim certain credits your parents may claim instead', 'Being claimed as a dependent means you owe zero taxes automatically', 'It has no effect on either return'],
        correct: 1,
        exp: 'Being claimed as a dependent affects your standard deduction and which credits you can claim yourself versus which your parents claim, like education credits. You can still file your own return to report your income — dependency status just changes some of the numbers and who gets which benefit.'
      },
      {
        q: 'You get a Form 1098-T from your school in January. What is it for?',
        opts: ['It reports your part-time job wages', 'It reports tuition payments and scholarships/grants received during the year, used to calculate education tax credits', 'It\'s your official transcript for job applications', 'It only matters if you\'re in your final year of school'],
        correct: 1,
        exp: 'The 1098-T shows how much qualified tuition you paid and how much scholarship/grant aid you received. Whoever claims you — or you, if independent — uses these numbers to calculate education credits like the AOTC or LLC. Keep it with your other tax documents.'
      },
      {
        q: 'You earn $8,000 in freelance income this year with no taxes withheld. What might you need to do differently than a typical W-2 employee?',
        opts: ['Nothing, you can pay it all at once in April with no issues', 'If you expect to owe $1,000+ in tax, you may need to make estimated quarterly tax payments throughout the year to avoid an underpayment penalty', 'Freelance income under $10,000 is automatically tax-exempt', 'You must hire an accountant by law'],
        correct: 1,
        exp: 'The IRS expects tax to be paid as you earn, not just once a year. If you expect to owe $1,000 or more and have no withholding, quarterly estimated payments help you avoid an underpayment penalty — setting aside 20–30% of each payment as you go makes this easier.'
      },
      {
        q: 'You go to school in a different state than your permanent home, and you worked a part-time job there this year. Do you need to think about state taxes differently?',
        opts: ['No, state taxes only depend on where your parents live', 'Possibly — you may need to file a state return in the state where you worked or earned income, in addition to or instead of your home state, depending on each state\'s rules', 'State taxes are always waived for students', 'You only owe state taxes after graduating'],
        correct: 1,
        exp: 'Earning income in the state where you attend school can create a filing obligation there, separate from your home state\'s residency rules. Every state\'s rules differ, and some have no income tax at all — check both states involved if you worked while at school.'
      },
      {
        q: 'You got a much bigger tax bill than expected last year because too little was withheld from your paychecks. What can you do about it going forward?',
        opts: ['Nothing, withholding is fixed once you start a job', 'Submit an updated W-4 to your employer to adjust how much federal tax is withheld from each paycheck', 'Ask your employer to stop reporting your income', 'Simply skip filing next year'],
        correct: 1,
        exp: 'A W-4 isn\'t a one-time form — you can update it anytime, especially after a surprise tax bill or a big income change like adding a second job. Adjusting your withholding spreads the tax cost across the year instead of hitting you with one large bill in April.'
      },
      {
        q: 'As a student with a simple return, what\'s a smart way to file without paying a tax prep company?',
        opts: ['You must always pay a company to file correctly', 'IRS Free File (for eligible incomes) and free VITA (Volunteer Income Tax Assistance) clinics on many campuses can prepare and file simple returns at no cost', 'Free filing options are only available to people over 65', 'Filing for free means you can\'t claim any credits'],
        correct: 1,
        exp: 'Most students qualify for IRS Free File based on income, and many campuses host free VITA clinics staffed by IRS-certified volunteers during tax season. Both can handle W-2s, 1099s, and education credits — there\'s rarely a reason to pay for a simple first return.'
      }
    ],
    lessons: [
      { title: 'Your First Return', hook: 'It\'s April, and you\'ve never filed a tax return in your life. You have a W-2 from your on-campus job. Where do you even start — and what does everything on that form actually mean?', qIndices: [0, 1] },
      { title: '1099s & Internship Income', hook: 'Your friend says they got a 1099-NEC after doing freelance design work over the summer, while you had a paid internship with a normal W-2. Are you taxed the same way?', qIndices: [2, 3] },
      { title: 'Education Credits & Your 1098-T', hook: 'Your school sends you a Form 1098-T in January and your parents mention "education credits" at dinner. You have no idea what either of those means for anyone\'s tax bill.', qIndices: [4, 7] },
      { title: 'Dependency Status & Common Mistakes', hook: 'Your parents still claim you as a dependent, and your friend who got $600 back after filing says you should definitely file too, even though you were "just an intern." What are you both getting wrong or right?', qIndices: [6, 5] },
      { title: 'Freelance Income: Estimated Taxes & State Filing', hook: 'You earned $8,000 freelancing this year with nothing withheld, and half of it came from clients in the state where you go to school — not your home state. Is April the only deadline you need to worry about?', qIndices: [8, 9] },
      { title: 'Getting Your Withholding Right & Filing for Free', hook: 'Last year\'s tax bill caught you off guard, and this year a friend says campus has a free clinic that\'ll actually file your return for you. Do either of those things sound too good to be true?', qIndices: [10, 11] }
    ]
  },
  {
    id: 'psychology', title: 'Consumer Psychology', icon: '09', iconColor: 'berry', xpReward: 25,
    hook: 'You know you should be saving. You even said out loud last week, "I need to stop spending on DoorDash." Then a friend tags you in a group order twenty minutes later. Why isn\'t knowing enough?',
    desc: 'Impulse spending, social pressure, lifestyle inflation, subscriptions, BNPL, and the behavioral side of money.',
    questions: [
      {
        q: 'You know you should save, and you even have a budget — but by month\'s end there\'s nothing left. What\'s usually the real reason?',
        opts: ['Budgets simply don\'t work for anyone', 'Financial decisions are driven as much by emotion, habit, and environment as by logic — knowledge alone doesn\'t change behavior without systems that make good choices automatic', 'You simply don\'t earn enough money, full stop', 'Saving only matters once you have a high income'],
        correct: 1,
        exp: 'This is sometimes called the "knowledge-action gap" — knowing the right move and consistently doing it are different skills. Willpower fades, especially under stress or around friends. The fix isn\'t more willpower; it\'s designing your environment — automatic transfers, separate accounts, fewer triggers — so the right choice takes less effort than the wrong one.'
      },
      {
        q: 'What\'s the most effective way to reduce impulse spending?',
        opts: ['Rely purely on willpower to resist urges in the moment', 'Identify your personal triggers — boredom, stress, social media ads, being with certain friends — and add friction, like a 24-hour rule before non-essential purchases', 'Avoid checking your bank balance so you don\'t feel guilty', 'Impulse spending can\'t be reduced, only accepted'],
        correct: 1,
        exp: 'Impulse purchases are triggered by emotion and environment — late-night scrolling, a stressful week, seeing a friend post a new purchase. A 24-hour waiting rule for non-essential buys over a set amount (say, $30) lets the emotional urge fade and gives your rational brain a chance to weigh in.'
      },
      {
        q: 'Your friend group keeps upgrading — concert tickets, new clothes, trips — and your spending has crept up to match, even though your income hasn\'t changed. What is this called?',
        opts: ['Compound interest', 'Lifestyle inflation — spending rises to match perceived social norms or income increases, often without a matching increase in savings', 'Diversification', 'A one-time budget deficit, unrelated to social factors'],
        correct: 1,
        exp: 'Lifestyle inflation happens gradually — each "yes" feels small on its own, but they add up fast. Social pressure accelerates it, since spending often tracks the people around you rather than your actual budget. Naming the pattern helps: set a spending cap for social activities and be upfront with friends about it. Real friends adjust.'
      },
      {
        q: 'You review your bank statement and find six recurring subscriptions — some you forgot you even had. What\'s the best way to prevent this "subscription creep"?',
        opts: ['Subscriptions are small, so they\'re not worth tracking', 'Do a recurring-charge audit every month or two, cancel what you don\'t use, and set one overall "subscriptions" budget cap instead of stacking them one by one', 'Sign up for as many free trials as possible', 'Only cancel subscriptions once you\'re already in debt'],
        correct: 1,
        exp: 'Subscriptions are designed to be easy to start and easy to forget — $8 here, $12 there adds up to real money over a year. Scan your statement monthly for recurring charges, cancel what you don\'t use, and set a total budget line for subscriptions instead of letting each one sneak in separately.'
      },
      {
        q: 'A checkout page offers "Buy Now, Pay Later" — split a $200 purchase into 4 payments of $50 with no interest. What\'s the hidden risk?',
        opts: ['There is no risk — it\'s always interest-free and completely safe', 'BNPL can encourage overspending beyond what you\'d normally buy, stacking multiple plans gets hard to track, and missed payments can trigger late fees or hit your credit', 'BNPL only works for people with excellent credit', 'BNPL automatically improves your credit score'],
        correct: 1,
        exp: 'BNPL feels painless because it splits the cost into smaller pieces — which is exactly why it can lead to overspending. Juggling several BNPL plans across different apps makes it easy to lose track of what\'s due and when, and missed payments can mean late fees or credit damage depending on the provider. Ask yourself: would I still buy this if I had to pay the full amount today?'
      },
      {
        q: 'What\'s the most reliable way to build a financial habit that actually sticks?',
        opts: ['Rely on motivation and remember to do it manually every time', 'Automate the behavior — like an automatic savings transfer on payday — so the good choice happens by default without requiring willpower each time', 'Set an unrealistic goal so you\'re forced to try harder', 'Only check your spending once a year'],
        correct: 1,
        exp: 'Habits that depend on remembering and willpower fade fast. Habits that run automatically — an auto-transfer to savings, a bill on autopay, a set weekly check-in — stick because they don\'t require a fresh decision every time. Start small and automatic; consistency beats intensity.'
      },
      {
        q: 'Your friend group is planning a spring break trip you can\'t really afford, but everyone\'s going and it\'s all anyone talks about. What\'s the healthiest way to handle it?',
        opts: ['Go anyway and figure out the money later, even if it means a credit card balance you can\'t pay off', 'Decide your budget first, then either find a cheaper way to join or opt out and communicate it honestly — real friends adjust', 'Never hang out with this friend group again', 'Take out a personal loan to cover the trip without telling anyone'],
        correct: 1,
        exp: 'Social pressure is one of the strongest drivers of overspending precisely because saying no feels awkward in the moment. Deciding your number in advance — and being upfront about it — takes the emotional pressure out of the decision.'
      },
      {
        q: 'You get a $400 tax refund and immediately spend it on something you\'d never buy with a regular paycheck. What\'s happening here?',
        opts: ['Nothing unusual, all money is treated the same by everyone', 'This is "mental accounting" — treating money differently based on where it came from, even though a dollar from a refund spends exactly the same as a dollar from a paycheck', 'Tax refunds are not real money', 'Refunds should always be spent immediately by law'],
        correct: 1,
        exp: 'Mental accounting is a well-documented behavioral bias — people mentally label money as "bonus" or "free" and spend it more loosely than earned income, even though it\'s equally real money. Treating a refund like any other dollar helps you avoid this trap.'
      },
      {
        q: 'You open Instagram and within a minute see three targeted ads related to something you searched yesterday. You buy one on impulse. What\'s a practical defense against this?',
        opts: ['There\'s no defense, targeted ads always win', 'Add a personal rule like a 24-hour wait or a "sleep on it" cart before buying anything from a social media ad', 'Delete all social media accounts permanently', 'Only shop using incognito mode'],
        correct: 1,
        exp: 'Targeted ads are designed to catch you at your most impulsive moment. A simple waiting-period rule for anything discovered through an ad — even 24 hours — breaks the impulse loop and gives you a chance to decide with a clear head.'
      },
      {
        q: 'You\'ve been paying for a gym membership for 8 months but only went twice. You keep paying because "I already spent so much on it." What\'s this thinking called, and what should you actually do?',
        opts: ['It\'s smart to keep paying since you might use it eventually', 'This is the sunk cost fallacy — money already spent is gone either way, so the only real decision is whether it\'s worth paying for going forward', 'You should double your membership to get your money\'s worth', 'Gym memberships cannot be canceled once started'],
        correct: 1,
        exp: 'The sunk cost fallacy is continuing to invest in something because of what you\'ve already spent, not because it still makes sense. Money already spent is gone either way — the only real decision is whether the subscription is worth paying for going forward.'
      },
      {
        q: 'You keep seeing influencers post "get ready with me" hauls and feel like your wardrobe is suddenly inadequate, even though nothing in your life actually changed. What\'s driving this?',
        opts: ['Your wardrobe genuinely became outdated overnight', 'Social comparison — constantly seeing curated, filtered spending from influencers and peers resets your sense of what\'s "normal," even when it doesn\'t reflect your actual needs or budget', 'Influencers are legally required to be honest about affordability', 'This feeling means you should upgrade your whole wardrobe immediately'],
        correct: 1,
        exp: 'Social media constantly resets your baseline for what feels "normal" to own or spend, since you\'re comparing your everyday life to someone else\'s curated highlight reel. Recognizing the feeling as social comparison — not an actual need — is often enough to pause before buying.'
      },
      {
        q: 'You had a stressful exam week and found yourself online shopping late at night for things you don\'t really need. What\'s a more effective coping strategy than shopping?',
        opts: ['Nothing else works as well as a stress purchase', 'Identify the actual trigger — stress, boredom, loneliness — and build a non-spending response reserved specifically for those moments, like a walk or calling a friend', 'Just accept that stress spending is unavoidable', 'Cancel your bank card permanently'],
        correct: 1,
        exp: 'Stress spending works because shopping provides a quick dopamine hit, not because you actually need the item. Building an alternative response to the same trigger breaks the automatic link between feeling stressed and buying something.'
      }
    ],
    lessons: [
      { title: 'Why Knowing Isn\'t Enough', hook: 'You know you should be saving — you even said it out loud last week. Then a friend tags you in a group order twenty minutes later. Why does knowing what to do never seem to be enough?', qIndices: [0, 1] },
      { title: 'Lifestyle Inflation & Social Pressure', hook: 'Your friend group keeps upgrading — concert tickets, new clothes, a spring break trip everyone\'s going on — and you feel like you have to keep up even though your income hasn\'t changed. Where\'s the line between fitting in and financial trouble?', qIndices: [2, 6] },
      { title: 'Subscriptions & BNPL', hook: 'You check out online and see "Buy Now, Pay Later — 4 payments of $50, no interest." It feels harmless. Combined with the six subscriptions already on your card, is it?', qIndices: [3, 4] },
      { title: 'Mental Accounting & Targeted Ads', hook: 'You get a $400 tax refund and immediately blow it on something you\'d never normally buy, then open Instagram and buy a targeted ad\'s product on impulse ten minutes later. Is your brain treating this money differently than a regular paycheck?', qIndices: [7, 8] },
      { title: 'Sunk Cost & Comparison Spending', hook: 'You\'re still paying for a gym membership you\'ve used twice in 8 months, and you just spent an hour comparing your closet to an influencer\'s "haul" video. Neither decision is really about the gym or the clothes.', qIndices: [9, 10] },
      { title: 'Automating Habits & Coping With Triggers', hook: 'You automated your savings transfer months ago and it\'s worked well — but during a stressful exam week you still found yourself online shopping at 1am for things you don\'t need. What\'s the next habit to build?', qIndices: [5, 11] }
    ]
  },
  {
    id: 'career', title: 'Career & Salary', icon: '10', iconColor: 'indigo', xpReward: 30,
    hook: 'You get a job offer: $58,000. You\'re thrilled and about to accept on the spot. Your friend negotiated theirs from $55,000 to $60,000 with one email. Did you just leave money on the table?',
    desc: 'Negotiating your first salary, reading an offer letter, benefits and equity, networking, and why early career decisions compound for decades.',
    questions: [
      {
        q: 'You receive a job offer of $58,000. What\'s the biggest mistake new grads make in this moment?',
        opts: ['Taking 24–48 hours to review the full offer before responding', 'Accepting immediately without ever asking if there\'s room to negotiate, assuming the first number is final', 'Asking a clarifying question about the start date', 'Reading the benefits summary before responding'],
        correct: 1,
        exp: 'Most starting offers have some flexibility built in — employers often expect a counter. Simply asking "Is there room to negotiate?" costs nothing and can mean thousands more per year, which compounds through every future raise calculated as a percentage of your base. Silence is the most expensive mistake.'
      },
      {
        q: 'What\'s the most effective way to approach negotiating your first salary?',
        opts: ['Demand a specific number without justification and threaten to walk away', 'Research market rate for the role and location, then ask for a specific number backed by that research and your value — professionally and in writing when possible', 'Avoid mentioning a number at all and hope they offer more', 'Only negotiate if you already have a competing offer in hand'],
        correct: 1,
        exp: 'Come with data: sites like Glassdoor, Levels.fyi, or your school\'s career center can show market rate for your role and location. Anchor your ask to that research, stay professional, and follow up in writing. You don\'t need a competing offer to negotiate — you just need a reasonable, researched ask.'
      },
      {
        q: 'Two job offers both pay $60,000. Job A has a $2,000/year health insurance premium and no HSA. Job B has a $500/year premium and an HSA with employer contributions. What does this tell you?',
        opts: ['Nothing — if the salary is the same, the offers are equal', 'The "real" value of a compensation package includes benefits like health insurance premiums, dental, vision, and FSA/HSA options — not just the salary number', 'HSAs are only useful for people who are already sick', 'Health insurance premiums are always identical across employers'],
        correct: 1,
        exp: 'Salary is only part of total compensation. A lower premium and an employer-funded HSA — money that\'s yours, tax-advantaged, and often rolls over year to year — can be worth thousands annually, sometimes more than a modest salary bump. Always ask for the full benefits summary, not just the offer letter number.'
      },
      {
        q: 'Your new employer offers a 401(k) with a 4% match, but you\'re not contributing anything yet. What are you missing out on?',
        opts: ['Nothing significant — 401(k)s don\'t matter until you\'re older', 'Free money — an employer match is effectively part of your compensation, and not contributing enough to capture the full match means leaving a guaranteed, immediate return on the table', 'The match only applies after 10 years at the company', 'You can only access a match if you\'re a full-time salaried employee'],
        correct: 1,
        exp: 'An employer match is money your employer will only pay if you contribute your own money first. Not capturing the full 4% match on a $50,000 salary means leaving $2,000/year — guaranteed, before any investment growth — sitting unclaimed. It\'s the closest thing to a risk-free 100% return you\'ll ever be offered.'
      },
      {
        q: 'You\'re comparing two job offers: Job A pays $65,000 in a high-cost city; Job B pays $58,000 in a lower-cost city with better benefits and a clear promotion timeline. How should you evaluate them?',
        opts: ['Always take the higher salary number, regardless of other factors', 'Compare total compensation (salary plus benefits value), adjust for cost of living, and weigh growth potential — not just the headline number', 'Always take the lower-cost-of-living option automatically', 'Salary is the only factor that matters in any job decision'],
        correct: 1,
        exp: 'The headline salary can be misleading. A $65,000 offer in an expensive city may have less real purchasing power than $58,000 somewhere cheaper. Factor in benefits value (retirement match, health coverage, PTO) and growth potential — will this role lead to a promotion or raise within a year or two? — before comparing offers side by side.'
      },
      {
        q: 'Two grads take jobs with a $5,000 starting salary difference. Assuming similar raise structures over their careers, why does that early gap matter more than it seems?',
        opts: ['It doesn\'t — a $5,000 difference is minor and evens out over time', 'Future raises, bonuses, and even new job offers are often calculated as a percentage of your current salary, so an early gap compounds and widens over a career, similar to compound interest', 'Only the first year\'s salary difference matters; every year after resets to equal footing', 'Salary differences only matter for retirement savings, not day-to-day life'],
        correct: 1,
        exp: 'Raises are usually a percentage of your current salary, so a higher starting point keeps multiplying that gap year after year — and future employers often ask about salary history, anchoring your next offer too. A $5,000 gap in your first job can turn into tens of thousands of dollars in lifetime earnings. Early-career decisions carry outsized weight precisely because they compound.'
      },
      {
        q: 'Your offer letter includes a $5,000 signing bonus with a clause saying you must repay it if you leave within 12 months. What should you understand before accepting?',
        opts: ['Signing bonuses are always free money with no strings attached', 'Read the clawback clause carefully — many signing bonuses must be repaid on a prorated basis if you leave before a set period', 'Signing bonuses replace your salary entirely', 'You can never negotiate the size of a signing bonus'],
        correct: 1,
        exp: 'Signing bonus "clawback" clauses are common — leave before the vesting period (often 1-2 years) and you may owe some or all of it back. Read your offer letter closely for this detail before counting the bonus as guaranteed money.'
      },
      {
        q: 'Two offers pay the same salary, but Job A offers 10 days of PTO and Job B offers 20 days plus paid holidays. Does this matter?',
        opts: ['No, PTO has no real financial value', 'Yes — unused time off is essentially unpaid time if you need it, so more PTO is a meaningful part of total compensation even though it doesn\'t show up in the salary number', 'PTO only matters for employees over 40', 'You should always choose the job with fewer vacation days to show more commitment'],
        correct: 1,
        exp: 'Time off has real value — sick days, family emergencies, and rest all cost you unpaid time (or worse) without adequate PTO. When comparing offers with similar pay, benefits like vacation days and paid holidays are part of total compensation, not an afterthought.'
      },
      {
        q: 'A startup offers you a lower salary but includes stock options as part of the package. What should you know before valuing that offer?',
        opts: ['Stock options are always worth exactly what the company tells you', 'Stock options are a bet on the company\'s future value — they can be worth a lot or nothing at all, so weigh them as a bonus, not guaranteed income', 'Stock options can be cashed in immediately like a paycheck', 'Only executives receive stock options'],
        correct: 1,
        exp: 'Startup equity is inherently speculative — it could be worth significant money someday, or nothing if the company doesn\'t succeed or you leave before it vests. Don\'t accept a salary you can\'t actually live on today based on the hope that equity will make up the difference.'
      },
      {
        q: 'You\'re a sophomore with no full-time job yet. What\'s a low-cost way to start building professional relationships that pay off later in your job search?',
        opts: ['Wait until senior year to think about this at all', 'Reach out for informational interviews, attend campus career fairs, and keep an updated LinkedIn profile connecting with alumni in your field', 'Only network with people who already have a job offer to give you', 'Networking doesn\'t actually help with job searching'],
        correct: 1,
        exp: 'Many jobs are found through referrals and connections, not cold applications alone. Informational interviews, career fairs, and staying active on LinkedIn — even before you\'re job hunting — build a network that can turn into real opportunities when you actually need them.'
      },
      {
        q: 'Your typical annual raise at your current job is 3%, but a competing offer from another company would pay you 15% more for a similar role. What does this suggest about growing your income early in your career?',
        opts: ['You should never leave a job for more money elsewhere', 'Internal raises are often smaller than what you can gain by changing employers, so evaluating outside offers periodically is a normal part of growing income early in your career', 'Changing jobs always resets your salary to zero', 'Loyalty to one employer always pays more over a lifetime'],
        correct: 1,
        exp: 'Internal raises are frequently capped around a few percent, while switching employers can bring a much larger jump since a new employer isn\'t anchored to your current pay. This doesn\'t mean job-hop constantly, but periodically knowing your market value keeps you from leaving money on the table.'
      },
      {
        q: 'An offer letter lists $70,000 "total target compensation," made up of a $60,000 base salary and a $10,000 target bonus. What\'s important to understand about this number?',
        opts: ['The full $70,000 is guaranteed no matter what', 'Only the base salary ($60,000) is guaranteed; the bonus portion is often tied to performance or company results and may not be fully paid out every year', 'Bonuses are always paid before the base salary', 'The total number is meaningless and should be ignored'],
        correct: 1,
        exp: 'Base salary is the guaranteed, predictable part of your pay. Bonuses — performance-based, sign-on, or discretionary — can vary or even be $0 in a bad year. When comparing offers, weigh the guaranteed base most heavily and treat bonus targets as a possible upside, not a promise.'
      }
    ],
    lessons: [
      { title: 'Negotiating Your First Offer', hook: 'You get a job offer: $58,000. You\'re thrilled and about to accept on the spot. Your friend negotiated theirs from $55,000 to $60,000 with one email. Did you just leave money on the table?', qIndices: [0, 1] },
      { title: 'Reading Your Offer Letter', hook: 'Your offer letter lists "$70,000 total target compensation" plus a $5,000 signing bonus with a repayment clause you almost skipped past. Do you actually know what you\'re agreeing to?', qIndices: [11, 6] },
      { title: 'Benefits & Total Compensation', hook: 'Two offers pay the exact same salary — one gives you 10 PTO days, the other gives you 20 plus paid holidays. Does that difference actually matter, or is pay all that counts?', qIndices: [2, 7] },
      { title: 'Retirement Match & Equity', hook: 'Your new job offers a 401(k) match, while a startup offer instead dangles stock options rather than a higher salary. Which of these is actually real money, and which is a bet on the future?', qIndices: [3, 8] },
      { title: 'Comparing Offers & Job-Hopping', hook: 'You have two offers on the table — one with a slightly higher salary, the other with a stronger 401(k) match and a clearer promotion path — and a friend just left their job for a 15% raise elsewhere. How should all of this factor into your decision?', qIndices: [4, 10] },
      { title: 'Building Your Network & Long-Term Impact', hook: 'You\'re only a sophomore with no job offers yet, but the $5,000 gap between two hypothetical starting salaries keeps nagging at you. Does anything you do now actually affect that gap years from now?', qIndices: [9, 5] }
    ]
  }
];

// ── Shop items ────────────────────────────────
const SHOP_ITEMS = [
  // ── HATS ──
  {
    id: 'party_hat', name: 'Party Hat', category: 'hat', price: 50,
    desc: 'Every lesson deserves a celebration.',
    svg: `<defs><linearGradient id="ph-g" x1="25%" y1="0%" x2="75%" y2="100%"><stop offset="0%" stop-color="#FFCAE5"/><stop offset="100%" stop-color="#C84882"/></linearGradient></defs>
          <path d="M 62 5 L 85 27 L 87 27 Z" fill="rgba(0,0,0,0.1)"/>
          <path d="M 60 4 L 38 27 L 85 27 Z" fill="url(#ph-g)"/>
          <path d="M 60 4 L 48 27 L 39 27 Z" fill="rgba(255,255,255,0.22)"/>
          <path d="M 60 4 Q 54 15 51 27" stroke="rgba(255,255,255,0.48)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          <path d="M 60 4 Q 66 15 70 27" stroke="rgba(255,255,255,0.32)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <circle cx="53" cy="12.5" r="2.4" fill="white" opacity="0.82"/>
          <circle cx="67" cy="9.5" r="2" fill="white" opacity="0.72"/>
          <circle cx="65" cy="20" r="1.9" fill="white" opacity="0.65"/>
          <circle cx="51" cy="21.5" r="1.7" fill="white" opacity="0.6"/>
          <circle cx="72" cy="18.5" r="1.4" fill="white" opacity="0.5"/>
          <circle cx="57" cy="7" r="1.5" fill="white" opacity="0.58"/>
          <ellipse cx="60" cy="28.5" rx="26" ry="5.8" fill="#943060"/>
          <ellipse cx="60" cy="27" rx="25" ry="5" fill="#E285BA"/>
          <ellipse cx="57" cy="25.7" rx="14.5" ry="2.3" fill="rgba(255,255,255,0.3)"/>
          <circle cx="60.5" cy="5.2" r="5.8" fill="rgba(0,0,0,0.18)"/>
          <circle cx="56.5" cy="2.8" r="3.5" fill="#FFE468"/>
          <circle cx="63.5" cy="2.8" r="3.5" fill="#FFD240"/>
          <circle cx="60" cy="0.6" r="3.3" fill="#FFF088"/>
          <circle cx="60" cy="5.5" r="4" fill="#FFCE30"/>
          <circle cx="57.5" cy="1.6" r="2.1" fill="rgba(255,255,255,0.78)"/>
          <path d="M 79 8.5 L 80.3 5.8 L 81.6 8.5 L 84.3 9.5 L 81.6 10.5 L 80.3 13.2 L 79 10.5 L 76.3 9.5 Z" fill="#FFE840"/>
          <path d="M 42 15 L 43.1 12.7 L 44.2 15 L 46.5 16 L 44.2 17 L 43.1 19.3 L 42 17 L 39.7 16 Z" fill="#FFE840" opacity="0.8"/>`
  },
  {
    id: 'flower_crown', name: 'Flower Crown', category: 'hat', price: 80,
    desc: 'Bloom where you are planted.',
    svg: `<path d="M 20 30 C 35 22 50 18 60 15 C 70 18 85 22 100 30" stroke="#4A7840" stroke-width="5" fill="none" stroke-linecap="round"/>
          <path d="M 20 30 C 35 22 50 18 60 15 C 70 18 85 22 100 30" stroke="#88B870" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <ellipse cx="36" cy="20" rx="2.3" ry="5" fill="#F8B0C8" transform="rotate(0 36 25)"/>
          <ellipse cx="36" cy="20" rx="2.3" ry="5" fill="#F8B0C8" transform="rotate(60 36 25)"/>
          <ellipse cx="36" cy="20" rx="2.3" ry="5" fill="#F8B0C8" transform="rotate(120 36 25)"/>
          <ellipse cx="36" cy="20" rx="2.3" ry="5" fill="#F8B0C8" transform="rotate(180 36 25)"/>
          <ellipse cx="36" cy="20" rx="2.3" ry="5" fill="#F8B0C8" transform="rotate(240 36 25)"/>
          <ellipse cx="36" cy="20" rx="2.3" ry="5" fill="#F8B0C8" transform="rotate(300 36 25)"/>
          <circle cx="36" cy="25" r="3.8" fill="#FFDD70"/>
          <circle cx="36" cy="25" r="2.2" fill="#FFAA28"/>
          <circle cx="35" cy="24" r="1" fill="rgba(255,255,255,0.65)"/>
          <ellipse cx="60" cy="9.5" rx="3" ry="6.5" fill="#F090C0" transform="rotate(0 60 16)"/>
          <ellipse cx="60" cy="9.5" rx="3" ry="6.5" fill="#F090C0" transform="rotate(60 60 16)"/>
          <ellipse cx="60" cy="9.5" rx="3" ry="6.5" fill="#F090C0" transform="rotate(120 60 16)"/>
          <ellipse cx="60" cy="9.5" rx="3" ry="6.5" fill="#F090C0" transform="rotate(180 60 16)"/>
          <ellipse cx="60" cy="9.5" rx="3" ry="6.5" fill="#F090C0" transform="rotate(240 60 16)"/>
          <ellipse cx="60" cy="9.5" rx="3" ry="6.5" fill="#F090C0" transform="rotate(300 60 16)"/>
          <circle cx="60" cy="16" r="5" fill="#FFDD70"/>
          <circle cx="60" cy="16" r="3" fill="#FFAA28"/>
          <circle cx="58.5" cy="14.5" r="1.4" fill="rgba(255,255,255,0.7)"/>
          <ellipse cx="84" cy="20" rx="2.3" ry="5" fill="#C8D4FF" transform="rotate(0 84 25)"/>
          <ellipse cx="84" cy="20" rx="2.3" ry="5" fill="#C8D4FF" transform="rotate(60 84 25)"/>
          <ellipse cx="84" cy="20" rx="2.3" ry="5" fill="#C8D4FF" transform="rotate(120 84 25)"/>
          <ellipse cx="84" cy="20" rx="2.3" ry="5" fill="#C8D4FF" transform="rotate(180 84 25)"/>
          <ellipse cx="84" cy="20" rx="2.3" ry="5" fill="#C8D4FF" transform="rotate(240 84 25)"/>
          <ellipse cx="84" cy="20" rx="2.3" ry="5" fill="#C8D4FF" transform="rotate(300 84 25)"/>
          <circle cx="84" cy="25" r="3.8" fill="#FFDD70"/>
          <circle cx="84" cy="25" r="2.2" fill="#FFAA28"/>
          <circle cx="83" cy="24" r="1" fill="rgba(255,255,255,0.65)"/>
          <path d="M 50 27 Q 46 20 51 15 Q 55 21 50 27 Z" fill="#5A9050"/>
          <path d="M 50 27 Q 51 19 56 16 Q 56 23 50 27 Z" fill="#7AB870"/>
          <path d="M 70 27 Q 74 20 69 15 Q 65 21 70 27 Z" fill="#5A9050"/>
          <path d="M 70 27 Q 69 19 64 16 Q 64 23 70 27 Z" fill="#7AB870"/>`
  },
  {
    id: 'witch_hat', name: 'Witch Hat', category: 'hat', price: 90,
    desc: 'Put a spell on your debt.',
    svg: `<defs><linearGradient id="wh-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#3D2458"/><stop offset="100%" stop-color="#120828"/></linearGradient></defs>
          <path d="M 62 3.5 L 84 29 L 87 29 Z" fill="rgba(0,0,0,0.25)"/>
          <path d="M 60 3 L 37 29 L 84 29 Z" fill="url(#wh-g)"/>
          <path d="M 60 3 L 49 29 L 40 29 Z" fill="rgba(255,255,255,0.07)"/>
          <path d="M 49 22 Q 60 18 71 22 L 75 29 L 45 29 Z" fill="#581890"/>
          <path d="M 49 22 Q 60 18 71 22 L 73 26 L 47 26 Z" fill="#6820A8"/>
          <rect x="57" y="19" width="6" height="5.5" rx="1" fill="#28104A"/>
          <rect x="58.2" y="20" width="3.6" height="3.5" rx="0.4" fill="none" stroke="#FFD700" stroke-width="1.2"/>
          <line x1="60" y1="20" x2="60" y2="23.5" stroke="#FFD700" stroke-width="1.2"/>
          <ellipse cx="61" cy="30.5" rx="28" ry="6.5" fill="#0A0418"/>
          <ellipse cx="60" cy="29" rx="27" ry="5.5" fill="#28163A"/>
          <ellipse cx="55" cy="27.5" rx="16" ry="2.5" fill="rgba(255,255,255,0.07)"/>
          <path d="M 68 8 L 69.3 5.5 L 70.6 8 L 73 9 L 70.6 10 L 69.3 12.5 L 68 10 L 65.6 9 Z" fill="#FFD700" opacity="0.92"/>
          <path d="M 75 17.5 L 75.9 15.8 L 76.8 17.5 L 78.5 18.2 L 76.8 18.9 L 75.9 20.6 L 75 18.9 L 73.3 18.2 Z" fill="#FFD700" opacity="0.78"/>
          <path d="M 50 13 L 50.7 11.5 L 51.4 13 L 53 13.7 L 51.4 14.4 L 50.7 15.9 L 50 14.4 L 48.4 13.7 Z" fill="#CC88FF" opacity="0.82"/>
          <circle cx="50" cy="11" r="5" fill="#FFD700" opacity="0.82"/>
          <circle cx="52.5" cy="11" r="4.2" fill="#23103A"/>
          <path d="M 72 22 L 68.5 19 M 72 22 L 68 22 M 72 22 L 68.5 25" stroke="rgba(255,255,255,0.22)" stroke-width="0.9" fill="none"/>
          <path d="M 70.25 20.5 Q 68.5 22 70.25 23.5" stroke="rgba(255,255,255,0.18)" stroke-width="0.8" fill="none"/>
          <circle cx="72" cy="22" r="1" fill="rgba(255,255,255,0.3)"/>`
  },
  {
    id: 'santa_hat', name: 'Santa Hat', category: 'hat', price: 100,
    desc: 'Ho ho ho, compound interest!',
    svg: `<defs><linearGradient id="sh-g" x1="30%" y1="0%" x2="70%" y2="100%"><stop offset="0%" stop-color="#FF4848"/><stop offset="100%" stop-color="#B81818"/></linearGradient></defs>
          <path d="M 63 5 C 73 10 81 20 84 29 L 86 29 Z" fill="rgba(0,0,0,0.15)"/>
          <path d="M 60 4 C 65 8 73 18 76 29 L 36 29 C 40 18 50 10 60 4 Z" fill="url(#sh-g)"/>
          <path d="M 60 4 C 55 8 47 17 43 29 L 49 29 C 51 20 55 12 60 4 Z" fill="rgba(255,255,255,0.16)"/>
          <path d="M 60 4 C 63 8 67 14 70 19" stroke="rgba(0,0,0,0.15)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 34 29 Q 38 23.5 42 27 Q 46 23.5 50 27 Q 54 23.5 58 27 Q 62 23.5 66 27 Q 70 23.5 74 27 Q 78 23.5 82 27 Q 86 29 86 29 L 34 29 Z" fill="white"/>
          <path d="M 34 28 Q 38 23 42 26 Q 46 23 50 26 Q 54 23 58 26 Q 62 23 66 26 Q 70 23 74 26 Q 78 23 82 26 Q 86 28 86 28" stroke="#E8E8E8" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <circle cx="78" cy="13" r="7" fill="rgba(0,0,0,0.15)"/>
          <circle cx="77" cy="12" r="7" fill="white"/>
          <circle cx="74.5" cy="10" r="3.5" fill="#F4F4F4"/>
          <circle cx="80" cy="10.5" r="3.5" fill="#EEEEEE"/>
          <circle cx="77" cy="15.5" r="3.2" fill="#F0F0F0"/>
          <circle cx="74.5" cy="9.5" r="2.2" fill="rgba(255,255,255,0.92)"/>`
  },
  {
    id: 'top_hat', name: 'Top Hat', category: 'hat', price: 120,
    desc: 'Old money energy.',
    svg: `<defs>
            <linearGradient id="th-cyl" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1C1C1C"/><stop offset="35%" stop-color="#2E2E2E"/><stop offset="100%" stop-color="#0E0E0E"/></linearGradient>
            <linearGradient id="th-brim" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#252525"/><stop offset="100%" stop-color="#080808"/></linearGradient>
          </defs>
          <rect x="77" y="7" width="7" height="21" rx="2" fill="rgba(0,0,0,0.3)"/>
          <rect x="40" y="7" width="40" height="21" rx="3" fill="url(#th-cyl)"/>
          <ellipse cx="60" cy="7" rx="20" ry="4.5" fill="#2A2A2A"/>
          <ellipse cx="60" cy="6.8" rx="20" ry="3.8" fill="#343434"/>
          <rect x="43" y="9" width="4.5" height="19" rx="2" fill="rgba(255,255,255,0.065)"/>
          <rect x="40" y="23" width="40" height="5" fill="#0E0E0E"/>
          <rect x="40" y="23" width="40" height="2.5" fill="#181818"/>
          <line x1="46" y1="23" x2="46" y2="28" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <line x1="52" y1="23" x2="52" y2="28" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <line x1="58" y1="23" x2="58" y2="28" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <line x1="64" y1="23" x2="64" y2="28" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <line x1="70" y1="23" x2="70" y2="28" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <line x1="76" y1="23" x2="76" y2="28" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <ellipse cx="61" cy="30" rx="30" ry="6.5" fill="#040404"/>
          <ellipse cx="60" cy="28.5" rx="29" ry="5.8" fill="url(#th-brim)"/>
          <ellipse cx="60" cy="27" rx="24" ry="3.5" fill="#202020"/>
          <path d="M 33 28.5 Q 60 23 87 28.5" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" fill="none"/>
          <path d="M 55 25 C 52 23 49 24.5 51 26 C 53 27.5 56 26.5 60 25.5 C 64 26.5 67 27.5 69 26 C 71 24.5 68 23 65 25 C 63 25.8 61.5 26 60 25.5" fill="#1A1A1A" stroke="rgba(255,255,255,0.08)" stroke-width="0.8"/>
          <ellipse cx="60" cy="25.5" rx="2.2" ry="1.8" fill="#202020"/>`
  },
  {
    id: 'chef_hat', name: 'Chef Hat', category: 'hat', price: 125,
    desc: 'Cooking up a budget.',
    svg: `<defs><radialGradient id="ch-dome" cx="38%" cy="32%" r="65%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="80%" stop-color="#E4E4E4"/><stop offset="100%" stop-color="#D0D0D0"/></radialGradient></defs>
          <rect x="36" y="22" width="48" height="9" rx="2.5" fill="#ECECEC" stroke="#CCCCCC" stroke-width="1.2"/>
          <line x1="43" y1="22" x2="43" y2="31" stroke="#C4C4C4" stroke-width="1.3"/>
          <line x1="50" y1="22" x2="50" y2="31" stroke="#C4C4C4" stroke-width="1.3"/>
          <line x1="57" y1="22" x2="57" y2="31" stroke="#C4C4C4" stroke-width="1.3"/>
          <line x1="64" y1="22" x2="64" y2="31" stroke="#C4C4C4" stroke-width="1.3"/>
          <line x1="71" y1="22" x2="71" y2="31" stroke="#C4C4C4" stroke-width="1.3"/>
          <line x1="78" y1="22" x2="78" y2="31" stroke="#C4C4C4" stroke-width="1.3"/>
          <path d="M 36 26.5 Q 60 24 84 26.5" stroke="#C0C0C0" stroke-width="1" stroke-dasharray="2.5 2" fill="none"/>
          <ellipse cx="60" cy="22" rx="24" ry="5" fill="#DEDEDE"/>
          <ellipse cx="60" cy="21.5" rx="24" ry="4" fill="#EEEEEE"/>
          <ellipse cx="61" cy="11" rx="27" ry="21" fill="#C8C8C8"/>
          <ellipse cx="60" cy="10" rx="26" ry="20" fill="url(#ch-dome)"/>
          <ellipse cx="56" cy="5.5" rx="14" ry="9.5" fill="rgba(255,255,255,0.6)"/>
          <path d="M 60 3 Q 45 10 39 22" stroke="rgba(170,170,170,0.65)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <path d="M 60 3 Q 50 8 44 18" stroke="rgba(190,190,190,0.5)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
          <path d="M 60 3 Q 70 8 76 18" stroke="rgba(190,190,190,0.5)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
          <path d="M 60 3 Q 75 10 81 22" stroke="rgba(170,170,170,0.65)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
  },
  {
    id: 'cowboy_hat', name: 'Cowboy Hat', category: 'hat', price: 150,
    desc: 'Riding off into a debt-free sunset.',
    svg: `<defs>
            <linearGradient id="cw-crown" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#A87040"/><stop offset="100%" stop-color="#5A3618"/></linearGradient>
            <linearGradient id="cw-brim" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#8C5C28"/><stop offset="100%" stop-color="#482C10"/></linearGradient>
          </defs>
          <ellipse cx="61" cy="30" rx="38" ry="8.5" fill="#3A1C08"/>
          <ellipse cx="60" cy="28.5" rx="37" ry="7.5" fill="url(#cw-brim)"/>
          <path d="M 25 27.5 Q 60 21 95 27.5" stroke="#A06830" stroke-width="2.5" fill="none"/>
          <path d="M 82 28.5 C 84 21 84 14 82 9 L 86 9 C 88 14 88 22 86 28.5 Z" fill="rgba(0,0,0,0.2)"/>
          <path d="M 38 28.5 C 38 20 40 13 42 9 L 78 9 C 80 13 82 21 82 28.5 Z" fill="url(#cw-crown)"/>
          <path d="M 38 28.5 C 38 20 40 13 42 9 L 47 9 C 45 15 44 21 44 28.5 Z" fill="rgba(255,255,255,0.12)"/>
          <ellipse cx="60" cy="9" rx="19.5" ry="5.2" fill="#8C5C28"/>
          <ellipse cx="60" cy="8.5" rx="19.5" ry="4.2" fill="#A07038"/>
          <ellipse cx="60" cy="9" rx="14" ry="3.5" fill="#7A4C22"/>
          <path d="M 41 24.5 Q 60 20.5 79 24.5 L 79 28.5 Q 60 24.5 41 28.5 Z" fill="#3C1E0C"/>
          <path d="M 41 24.5 Q 60 20.5 79 24.5 L 79 26.5 Q 60 22.5 41 26.5 Z" fill="#5A3018"/>
          <rect x="57" y="21.5" width="6" height="5" rx="1" fill="#281408"/>
          <rect x="58.2" y="22.6" width="3.6" height="3" rx="0.5" fill="none" stroke="#C89050" stroke-width="1.2"/>
          <line x1="60" y1="22.6" x2="60" y2="25.6" stroke="#C89050" stroke-width="1.2"/>
          <path d="M 27 27.5 Q 60 22 93 27.5" stroke="rgba(200,160,100,0.45)" stroke-width="1" stroke-dasharray="2.5 2" fill="none"/>
          <path d="M 31 28 Q 60 22.5 89 28" stroke="rgba(200,160,100,0.3)" stroke-width="0.8" stroke-dasharray="2.5 2" fill="none"/>`
  },
  {
    id: 'pirate_hat', name: 'Pirate Hat', category: 'hat', price: 175,
    desc: 'Yarr, no debt on this ship.',
    svg: `<defs><linearGradient id="pi-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#282828"/><stop offset="100%" stop-color="#0C0C0C"/></linearGradient></defs>
          <path d="M 35 29 L 37 8 L 85 8 L 87 29 Z" fill="#060606"/>
          <path d="M 34 29 L 36 8 L 84 8 L 86 29 Z" fill="url(#pi-g)"/>
          <path d="M 34 29 L 36 8 L 42 8 L 40 29 Z" fill="rgba(255,255,255,0.06)"/>
          <path d="M 22 24 C 26 17 32 14 36 13 L 34 29 C 30 28 25 27 22 24 Z" fill="#1C1C1C"/>
          <path d="M 22 24 C 26 17 32 14 36 13 L 35 19 C 30 20 26 22 22 24 Z" fill="rgba(255,255,255,0.06)"/>
          <path d="M 98 24 C 94 17 88 14 84 13 L 86 29 C 90 28 95 27 98 24 Z" fill="#1C1C1C"/>
          <path d="M 22 24 C 26 17 32 14 36 13" stroke="#C8A038" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 98 24 C 94 17 88 14 84 13" stroke="#C8A038" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <line x1="34" y1="29" x2="86" y2="29" stroke="#C8A038" stroke-width="2"/>
          <ellipse cx="60" cy="30" rx="28" ry="5.5" fill="#080808"/>
          <ellipse cx="60" cy="29" rx="27" ry="4.5" fill="#161616"/>
          <line x1="48" y1="9" x2="72" y2="27" stroke="white" stroke-width="3" stroke-linecap="round"/>
          <line x1="72" y1="9" x2="48" y2="27" stroke="white" stroke-width="3" stroke-linecap="round"/>
          <circle cx="48" cy="9" r="3.2" fill="white"/>
          <circle cx="72" cy="9" r="3.2" fill="white"/>
          <circle cx="48" cy="27" r="3.2" fill="white"/>
          <circle cx="72" cy="27" r="3.2" fill="white"/>
          <circle cx="60" cy="17.5" r="8.5" fill="white"/>
          <circle cx="60" cy="17" r="8" fill="#F2F2F2"/>
          <ellipse cx="56.2" cy="15.5" rx="2.8" ry="3.2" fill="#161616"/>
          <ellipse cx="63.8" cy="15.5" rx="2.8" ry="3.2" fill="#161616"/>
          <circle cx="55.2" cy="14.3" r="1" fill="rgba(255,255,255,0.4)"/>
          <circle cx="62.8" cy="14.3" r="1" fill="rgba(255,255,255,0.4)"/>
          <path d="M 58.5 19.5 L 60 18 L 61.5 19.5 L 61 21.5 L 59 21.5 Z" fill="#161616"/>
          <rect x="56" y="21.5" width="2.3" height="2.5" rx="0.4" fill="#161616"/>
          <rect x="58.9" y="21.5" width="2.3" height="2.5" rx="0.4" fill="#161616"/>
          <rect x="61.7" y="21.5" width="2.3" height="2.5" rx="0.4" fill="#161616"/>`
  },
  {
    id: 'crown', name: 'Crown', category: 'hat', price: 200,
    desc: 'The financially literate royalty.',
    svg: `<defs>
            <linearGradient id="cr-body" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFE440"/><stop offset="50%" stop-color="#C88010"/><stop offset="100%" stop-color="#FFD030"/></linearGradient>
            <linearGradient id="cr-band" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#E8A820"/><stop offset="100%" stop-color="#A86010"/></linearGradient>
          </defs>
          <path d="M 34 31 L 39 16 L 52 25 L 61 9 L 71 25 L 85 16 L 90 31 Z" fill="#8A5A00" opacity="0.35"/>
          <path d="M 33 30 L 38 15 L 51 24 L 60 8 L 69 24 L 82 15 L 87 30 Z" fill="url(#cr-body)"/>
          <path d="M 33 30 L 38 15 L 43 22 Z" fill="rgba(0,0,0,0.18)"/>
          <path d="M 51 24 L 60 8 L 65 23 Z" fill="rgba(0,0,0,0.14)"/>
          <path d="M 87 30 L 82 15 L 78 22 Z" fill="rgba(0,0,0,0.18)"/>
          <path d="M 38 15 L 51 24 L 47 24 L 37 17 Z" fill="rgba(255,255,255,0.22)"/>
          <path d="M 60 8 L 51 24 L 55 24 Z" fill="rgba(255,255,255,0.28)"/>
          <path d="M 69 24 L 72 24 L 82 15 L 80 17 Z" fill="rgba(255,255,255,0.18)"/>
          <rect x="33" y="26" width="54" height="8" rx="3" fill="url(#cr-band)"/>
          <rect x="33" y="26" width="54" height="4" rx="2" fill="#E8A828"/>
          <rect x="35" y="26.5" width="50" height="2" rx="1" fill="rgba(255,255,255,0.28)"/>
          <ellipse cx="44" cy="20" rx="4.2" ry="3.8" fill="#CC2020"/>
          <ellipse cx="44" cy="19.5" rx="4.2" ry="3.3" fill="#E83030"/>
          <ellipse cx="43" cy="18.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.5)"/>
          <ellipse cx="60" cy="10" rx="5" ry="4.5" fill="#1040CC"/>
          <ellipse cx="60" cy="9.5" rx="5" ry="4" fill="#2060EE"/>
          <ellipse cx="58.5" cy="8" rx="2.2" ry="1.6" fill="rgba(255,255,255,0.58)"/>
          <ellipse cx="76" cy="20" rx="4.2" ry="3.8" fill="#108030"/>
          <ellipse cx="76" cy="19.5" rx="4.2" ry="3.3" fill="#20A040"/>
          <ellipse cx="75" cy="18.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.5)"/>
          <circle cx="44" cy="29" r="2.8" fill="#E83030"/>
          <circle cx="60" cy="29" r="2.8" fill="#2060EE"/>
          <circle cx="76" cy="29" r="2.8" fill="#20A040"/>
          <circle cx="37" cy="29" r="1.8" fill="#FFE060"/>
          <circle cx="52" cy="29" r="1.8" fill="#FFE060"/>
          <circle cx="68" cy="29" r="1.8" fill="#FFE060"/>
          <circle cx="83" cy="29" r="1.8" fill="#FFE060"/>`
  },
  // ── GLASSES ──
  {
    id: 'round_glasses', name: 'Round Glasses', category: 'glasses', price: 60,
    desc: 'For the bookish budgeter.',
    svg: `<circle cx="46" cy="58" r="11" fill="rgba(180,220,255,0.15)" stroke="#6B4C3A" stroke-width="2.5"/>
          <circle cx="74" cy="58" r="11" fill="rgba(180,220,255,0.15)" stroke="#6B4C3A" stroke-width="2.5"/>
          <path d="M 42 52 A 9 9 0 0 1 50 52" stroke="rgba(255,255,255,0.5)" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M 70 52 A 9 9 0 0 1 78 52" stroke="rgba(255,255,255,0.5)" stroke-width="2" fill="none" stroke-linecap="round"/>
          <line x1="57" y1="58" x2="63" y2="58" stroke="#6B4C3A" stroke-width="2"/>
          <line x1="20" y1="55" x2="35" y2="57" stroke="#6B4C3A" stroke-width="2"/>
          <line x1="85" y1="57" x2="100" y2="55" stroke="#6B4C3A" stroke-width="2"/>`
  },
  {
    id: 'sunglasses', name: 'Sunglasses', category: 'glasses', price: 75,
    desc: 'Too cool for financial stress.',
    svg: `<rect x="30" y="53" width="24" height="15" rx="7" fill="#1A1A1A"/>
          <rect x="60" y="53" width="24" height="15" rx="7" fill="#1A1A1A"/>
          <rect x="31" y="54" width="22" height="6" rx="5" fill="rgba(255,255,255,0.08)"/>
          <rect x="61" y="54" width="22" height="6" rx="5" fill="rgba(255,255,255,0.08)"/>
          <line x1="54" y1="60" x2="60" y2="60" stroke="#1A1A1A" stroke-width="3.5"/>
          <line x1="14" y1="57" x2="30" y2="60" stroke="#1A1A1A" stroke-width="2.5"/>
          <line x1="84" y1="60" x2="100" y2="57" stroke="#1A1A1A" stroke-width="2.5"/>
          <path d="M 34 55 Q 38 52 44 55" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M 64 55 Q 68 52 74 55" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none" stroke-linecap="round"/>`
  },
  {
    id: 'heart_glasses', name: 'Heart Glasses', category: 'glasses', price: 90,
    desc: 'In love with compound interest.',
    svg: `<path d="M35,54 C35,49 40,47 43,51 C46,47 51,49 51,54 C51,59 43,65 43,65 C43,65 35,59 35,54Z" fill="#FF6B8A"/>
          <path d="M63,54 C63,49 68,47 71,51 C74,47 79,49 79,54 C79,59 71,65 71,65 C71,65 63,59 63,54Z" fill="#FF6B8A"/>
          <path d="M 36 52 C 37 49 40 48 42 50" stroke="rgba(255,255,255,0.45)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <path d="M 64 52 C 65 49 68 48 70 50" stroke="rgba(255,255,255,0.45)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <line x1="51" y1="57" x2="63" y2="57" stroke="#CC2255" stroke-width="2.5"/>
          <line x1="16" y1="52" x2="35" y2="55" stroke="#CC2255" stroke-width="2"/>
          <line x1="79" y1="55" x2="104" y2="52" stroke="#CC2255" stroke-width="2"/>`
  },
  {
    id: 'star_glasses', name: 'Star Glasses', category: 'glasses', price: 110,
    desc: 'Your portfolio is looking stellar.',
    svg: `<polygon points="43,47 44.8,53 51,53 45.6,56.8 47.5,63 43,59.2 38.5,63 40.4,56.8 35,53 41.2,53" fill="#FFD700"/>
          <polygon points="71,47 72.8,53 79,53 73.6,56.8 75.5,63 71,59.2 66.5,63 68.4,56.8 63,53 69.2,53" fill="#FFD700"/>
          <path d="M 40 49 L 42 53" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M 68 49 L 70 53" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="51" y1="55" x2="63" y2="55" stroke="#C0A010" stroke-width="2.5"/>
          <line x1="18" y1="51" x2="36" y2="54" stroke="#C0A010" stroke-width="2"/>
          <line x1="78" y1="54" x2="102" y2="51" stroke="#C0A010" stroke-width="2"/>`
  },
  // ── CLOTHES ──
  {
    id: 'bow_tie', name: 'Bow Tie', category: 'clothes', price: 65,
    desc: 'Business casual, pig casual.',
    svg: `<path d="M44,93 L57,98 L44,103 Z" fill="#D4899E"/>
          <path d="M76,93 L63,98 L76,103 Z" fill="#D4899E"/>
          <path d="M44,93 L57,98 L50,93 Z" fill="rgba(255,255,255,0.22)"/>
          <path d="M76,103 L63,98 L70,103 Z" fill="rgba(0,0,0,0.1)"/>
          <ellipse cx="60" cy="98" rx="5.5" ry="4.5" fill="#B5607A"/>
          <ellipse cx="60" cy="97" rx="5.5" ry="2.5" fill="#C87090"/>
          <circle cx="60" cy="98" r="2" fill="#D4899E"/>`
  },
  {
    id: 'scarf', name: 'Cozy Scarf', category: 'clothes', price: 85,
    desc: 'Warm enough for bear market winters.',
    svg: `<path d="M27,87 Q60,81 93,87 Q93,95 60,95 Q27,95 27,87Z" fill="#6B8F65"/>
          <path d="M27,87 Q60,81 93,87 Q93,89.5 60,89.5 Q27,89.5 27,87Z" fill="rgba(255,255,255,0.18)"/>
          <rect x="53" y="95" width="9" height="22" rx="4.5" fill="#6B8F65"/>
          <rect x="53" y="95" width="9" height="4" rx="2" fill="rgba(255,255,255,0.18)"/>
          <line x1="55" y1="100" x2="61" y2="100" stroke="#8FB085" stroke-width="1.8" opacity="0.8"/>
          <line x1="55" y1="104" x2="61" y2="104" stroke="#8FB085" stroke-width="1.8" opacity="0.8"/>
          <line x1="55" y1="108" x2="61" y2="108" stroke="#8FB085" stroke-width="1.8" opacity="0.7"/>
          <line x1="55" y1="112" x2="61" y2="112" stroke="#8FB085" stroke-width="1.5" opacity="0.5"/>`
  },
  {
    id: 'cape', name: 'Cape', category: 'clothes', price: 130,
    desc: 'The hero of your own budget.',
    svg: `<path d="M24,90 C24,90 12,110 16,128 L104,128 C108,110 96,90 96,90 Q60,84 24,90Z" fill="#6B35B8" opacity="0.9"/>
          <path d="M24,90 Q60,84 96,90 L96,96 Q60,90 24,96Z" fill="rgba(255,255,255,0.15)"/>
          <path d="M24,90 Q60,97 96,90" stroke="#4A1A8A" stroke-width="2.5" fill="none"/>
          <path d="M16,128 L24,90 C27,92 30,94 32,128Z" fill="rgba(255,255,255,0.07)"/>
          <line x1="44" y1="91" x2="48" y2="108" stroke="#9B55E8" stroke-width="2.5" opacity="0.55"/>
          <line x1="60" y1="89" x2="60" y2="108" stroke="#9B55E8" stroke-width="2.5" opacity="0.55"/>
          <line x1="76" y1="91" x2="72" y2="108" stroke="#9B55E8" stroke-width="2.5" opacity="0.55"/>
          <ellipse cx="60" cy="89" rx="6" ry="3" fill="#5A28A0"/>`
  },
  {
    id: 'overalls', name: 'Overalls', category: 'clothes', price: 150,
    desc: 'From farmhand to fund manager.',
    svg: `<rect x="48" y="91" width="24" height="20" rx="3" fill="#4A7FCC"/>
          <rect x="48" y="91" width="24" height="5" rx="2" fill="rgba(255,255,255,0.2)"/>
          <path d="M50,91 C46,85 40,82 36,80" stroke="#4A7FCC" stroke-width="5.5" fill="none" stroke-linecap="round"/>
          <path d="M70,91 C74,85 80,82 84,80" stroke="#4A7FCC" stroke-width="5.5" fill="none" stroke-linecap="round"/>
          <path d="M50,91 C47,86 43,83 38,81" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <path d="M70,91 C73,86 77,83 82,81" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <rect x="55" y="97" width="10" height="8" rx="2" fill="#3A6FBC"/>
          <rect x="56" y="98" width="8" height="3.5" rx="1" fill="rgba(255,255,255,0.2)"/>
          <circle cx="50" cy="91" r="3" fill="#3A6FBC"/>
          <circle cx="70" cy="91" r="3" fill="#3A6FBC"/>
          <line x1="52" y1="105" x2="68" y2="105" stroke="#3A6FBC" stroke-width="1.5" opacity="0.6"/>`
  },
  // ── ROOM DECOR ──
  {
    id: 'wallpaper_sage', name: 'Sage Dot Wallpaper', category: 'room', slot: 'wallpaper', price: 40,
    desc: 'A calm little dotted backdrop.',
    wallCss: 'background-color: var(--green-pale); background-image: radial-gradient(circle, rgba(107,143,101,.3) 1.5px, transparent 1.5px); background-size: 16px 16px;'
  },
  {
    id: 'wallpaper_blush', name: 'Blush Dot Wallpaper', category: 'room', slot: 'wallpaper', price: 40,
    desc: 'Soft pink polka dots.',
    wallCss: 'background-color: var(--pink-pale); background-image: radial-gradient(circle, rgba(212,137,158,.3) 1.5px, transparent 1.5px); background-size: 16px 16px;'
  },
  {
    id: 'wallpaper_stripes', name: 'Mint Stripe Wallpaper', category: 'room', slot: 'wallpaper', price: 55,
    desc: 'Diagonal stripes, fully vibing.',
    wallCss: 'background: repeating-linear-gradient(45deg, var(--green-light), var(--green-light) 10px, var(--green-pale) 10px, var(--green-pale) 20px);'
  },
  {
    id: 'wallpaper_cream', name: 'Classic Cream Wallpaper', category: 'room', slot: 'wallpaper', price: 30,
    desc: 'Simple, clean, and cozy.',
    wallCss: 'background: var(--bg);'
  },
  {
    id: 'wall_money_poster', name: 'Money Tree Poster', category: 'room', slot: 'wall', price: 70,
    viewBox: '0 0 100 130',
    desc: 'Grows dollars, not leaves.',
    svg: `<rect x="4" y="4" width="92" height="122" rx="4" fill="var(--white)" stroke="var(--border)" stroke-width="4"/>
          <rect x="14" y="14" width="72" height="102" fill="var(--green-pale)"/>
          <rect x="46" y="80" width="8" height="30" fill="#8A6438"/>
          <circle cx="50" cy="60" r="30" fill="var(--green-light)"/>
          <circle cx="38" cy="70" r="6" fill="#FFD700"/>
          <circle cx="62" cy="72" r="6" fill="#FFD700"/>
          <circle cx="50" cy="52" r="6" fill="#FFD700"/>
          <text x="50" y="57" font-size="9" text-anchor="middle" fill="var(--green-dark)" font-weight="700">$</text>`
  },
  {
    id: 'wall_motivation_poster', name: 'You Got This Poster', category: 'room', slot: 'wall', price: 70,
    viewBox: '0 0 100 130',
    desc: 'A little pep talk on the wall.',
    svg: `<rect x="4" y="4" width="92" height="122" rx="4" fill="var(--white)" stroke="var(--border)" stroke-width="4"/>
          <rect x="14" y="14" width="72" height="102" fill="var(--pink-pale)"/>
          <circle cx="50" cy="50" r="22" fill="var(--pink-light)"/>
          <path d="M40,50 L47,58 L62,42" stroke="var(--pink-dark)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="50" y="95" font-size="10" text-anchor="middle" fill="var(--pink-dark)" font-weight="700">YOU GOT THIS</text>`
  },
  {
    id: 'rug_green', name: 'Sage Rug', category: 'room', slot: 'rug', price: 60,
    viewBox: '0 0 220 70',
    desc: 'Ties the room together.',
    svg: `<ellipse cx="110" cy="40" rx="105" ry="28" fill="var(--green-light)"/>
          <ellipse cx="110" cy="40" rx="80" ry="20" fill="none" stroke="var(--green-dark)" stroke-width="3" opacity="0.35"/>
          <ellipse cx="110" cy="40" rx="55" ry="13" fill="none" stroke="var(--green-dark)" stroke-width="2.5" opacity="0.3"/>`
  },
  {
    id: 'rug_pink', name: 'Blush Rug', category: 'room', slot: 'rug', price: 60,
    viewBox: '0 0 220 70',
    desc: 'Soft under those little hooves.',
    svg: `<ellipse cx="110" cy="40" rx="105" ry="28" fill="var(--pink-light)"/>
          <ellipse cx="110" cy="40" rx="80" ry="20" fill="none" stroke="var(--pink-dark)" stroke-width="3" opacity="0.35"/>
          <ellipse cx="110" cy="40" rx="55" ry="13" fill="none" stroke="var(--pink-dark)" stroke-width="2.5" opacity="0.3"/>`
  },
  {
    id: 'plant_pothos', name: 'Potted Pothos', category: 'room', slot: 'plant', price: 55,
    viewBox: '0 0 80 120',
    desc: 'Low maintenance, unlike your budget last semester.',
    svg: `<path d="M30,90 L26,116 L54,116 L50,90 Z" fill="#C87848"/>
          <rect x="28" y="86" width="24" height="8" fill="#A56238"/>
          <path d="M40,90 C34,70 20,64 12,50" stroke="#4A7840" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M40,90 C44,66 60,58 68,44" stroke="#4A7840" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M40,90 C40,64 40,50 40,30" stroke="#4A7840" stroke-width="4" fill="none" stroke-linecap="round"/>
          <ellipse cx="12" cy="48" rx="12" ry="8" fill="#7EC96A" transform="rotate(-30 12 48)"/>
          <ellipse cx="68" cy="42" rx="12" ry="8" fill="#7EC96A" transform="rotate(30 68 42)"/>
          <ellipse cx="40" cy="26" rx="10" ry="14" fill="#8FDD78"/>`
  },
  {
    id: 'plant_cactus', name: 'Tiny Cactus', category: 'room', slot: 'plant', price: 45,
    viewBox: '0 0 80 120',
    desc: 'Thrives on neglect. Relatable.',
    svg: `<path d="M28,90 L24,116 L56,116 L52,90 Z" fill="#D68A54"/>
          <rect x="26" y="86" width="28" height="8" fill="#B06A38"/>
          <rect x="34" y="40" width="12" height="50" rx="6" fill="#6FAE5C"/>
          <rect x="18" y="55" width="10" height="26" rx="5" fill="#6FAE5C"/>
          <rect x="52" y="48" width="10" height="30" rx="5" fill="#6FAE5C"/>
          <circle cx="40" cy="34" r="4" fill="#FF96B8"/>`
  },
  {
    id: 'bed_cozy', name: 'Cozy Bed', category: 'room', slot: 'bed', price: 140,
    viewBox: '0 0 160 100',
    desc: 'Every good saver needs good rest.',
    svg: `<rect x="10" y="50" width="140" height="40" rx="10" fill="var(--pink)"/>
          <rect x="10" y="50" width="140" height="14" rx="7" fill="var(--pink-light)"/>
          <rect x="16" y="34" width="34" height="26" rx="8" fill="var(--white)" stroke="var(--border)" stroke-width="2"/>
          <rect x="20" y="88" width="10" height="10" fill="#8A6438"/>
          <rect x="130" y="88" width="10" height="10" fill="#8A6438"/>`
  },
  {
    id: 'bed_bunk', name: 'Bunk Bed', category: 'room', slot: 'bed', price: 160,
    viewBox: '0 0 160 130',
    desc: 'For a piggy with big dreams.',
    svg: `<rect x="14" y="14" width="132" height="28" rx="6" fill="var(--green-light)"/>
          <rect x="14" y="14" width="132" height="10" rx="5" fill="var(--white)" opacity="0.6"/>
          <rect x="14" y="70" width="132" height="34" rx="6" fill="var(--green)"/>
          <rect x="14" y="70" width="132" height="12" rx="6" fill="var(--white)" opacity="0.4"/>
          <rect x="8" y="14" width="8" height="96" fill="#8A6438"/>
          <rect x="144" y="14" width="8" height="96" fill="#8A6438"/>`
  },
  {
    id: 'lamp_moon', name: 'Moon Lamp', category: 'room', slot: 'lamp', price: 50,
    viewBox: '0 0 70 110',
    desc: 'Soft light for late-night budgeting.',
    svg: `<rect x="30" y="90" width="10" height="16" fill="#8A6438"/>
          <ellipse cx="35" cy="106" rx="20" ry="4" fill="var(--border)"/>
          <line x1="35" y1="20" x2="35" y2="90" stroke="#B8935E" stroke-width="3"/>
          <circle cx="35" cy="18" r="18" fill="#FFF6D8"/>
          <circle cx="41" cy="12" r="4" fill="#F5E5A8"/>
          <circle cx="30" cy="24" r="2.5" fill="#F5E5A8"/>`
  },
  {
    id: 'lamp_fairy', name: 'Fairy Lights', category: 'room', slot: 'lamp', price: 65,
    viewBox: '0 0 70 120',
    desc: 'Twinkly and financially responsible.',
    svg: `<path d="M10,10 Q35,40 10,60 Q35,90 10,110" stroke="#B8935E" stroke-width="2" fill="none"/>
          <path d="M60,10 Q35,40 60,60 Q35,90 60,110" stroke="#B8935E" stroke-width="2" fill="none"/>
          <circle cx="10" cy="10" r="5" fill="#FFE45A"/>
          <circle cx="10" cy="60" r="5" fill="#FF96B8"/>
          <circle cx="10" cy="110" r="5" fill="#8FDD78"/>
          <circle cx="60" cy="10" r="5" fill="#8FDD78"/>
          <circle cx="60" cy="60" r="5" fill="#FFE45A"/>
          <circle cx="60" cy="110" r="5" fill="#FF96B8"/>`
  },

  // ── DIAMOND EXCLUSIVES (earned via 3-day streak bonuses, not coins) ──
  {
    id: 'diamond_crown', name: 'Diamond Crown', category: 'exclusive', currency: 'diamond', price: 15,
    viewBox: '14 -4 92 46',
    desc: 'Only streak-keepers get to wear this one.',
    svg: `<defs><linearGradient id="dc-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFF3B0"/><stop offset="55%" stop-color="#FFD23F"/><stop offset="100%" stop-color="#D4980A"/></linearGradient>
          <linearGradient id="dc-gem" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E8FBFF"/><stop offset="45%" stop-color="#8FE3F5"/><stop offset="100%" stop-color="#2AA8C4"/></linearGradient></defs>
          <path d="M 33 30 L 33 20 L 42 24 L 50 12 L 60 22 L 70 12 L 78 24 L 87 20 L 87 30 Z" fill="url(#dc-g)" stroke="#B8790A" stroke-width="1"/>
          <path d="M 35 28 L 35 22 L 42 25 L 50 15 L 60 24 L 70 15 L 78 25 L 85 22 L 85 28 Z" fill="rgba(255,255,255,0.25)"/>
          <circle cx="42" cy="24" r="3" fill="#FFE87A"/>
          <circle cx="60" cy="12" r="3.6" fill="#FFE87A"/>
          <circle cx="78" cy="24" r="3" fill="#FFE87A"/>
          <path d="M 60 17 L 65 22 L 60 30 L 55 22 Z" fill="url(#dc-gem)" stroke="#1C8CA8" stroke-width="0.8"/>
          <path d="M 60 17 L 65 22 L 60 24 L 55 22 Z" fill="rgba(255,255,255,0.55)"/>
          <circle cx="42" cy="24" r="1.6" fill="#FF6FA8"/>
          <circle cx="78" cy="24" r="1.6" fill="#FF6FA8"/>
          <path d="M 30 8 L 31 5 L 32 8 L 35 9 L 32 10 L 31 13 L 30 10 L 27 9 Z" fill="#FFF7C4"/>
          <path d="M 88 10 L 88.8 7.6 L 89.6 10 L 92 10.8 L 89.6 11.6 L 88.8 14 L 88 11.6 L 85.6 10.8 Z" fill="#FFF7C4" opacity="0.85"/>`
  },
  {
    id: 'diamond_shades', name: 'Diamond Shades', category: 'exclusive', currency: 'diamond', price: 20,
    viewBox: '6 41 108 34',
    desc: 'Too cool to be affordable in coins.',
    svg: `<defs><linearGradient id="ds-lens" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFD6F0"/><stop offset="50%" stop-color="#C7A6FF"/><stop offset="100%" stop-color="#7FD9FF"/></linearGradient></defs>
          <path d="M 30 60 Q 30 50 42 50 L 54 50 Q 60 50 60 56 Q 60 50 66 50 L 78 50 Q 90 50 90 60 Q 90 70 78 70 L 66 70 Q 60 70 60 64 Q 60 70 54 70 L 42 70 Q 30 70 30 60 Z" fill="#2B2B2B"/>
          <circle cx="45" cy="60" r="9" fill="url(#ds-lens)"/>
          <circle cx="75" cy="60" r="9" fill="url(#ds-lens)"/>
          <circle cx="41" cy="56" r="2.4" fill="rgba(255,255,255,0.7)"/>
          <circle cx="71" cy="56" r="2.4" fill="rgba(255,255,255,0.7)"/>
          <path d="M 30 58 L 20 55" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round"/>
          <path d="M 90 58 L 100 55" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round"/>
          <path d="M 45 52 L 46 49 L 47 52 L 50 53 L 47 54 L 46 57 L 45 54 L 42 53 Z" fill="#FFF" opacity="0.9"/>
          <path d="M 75 52 L 76 49 L 77 52 L 80 53 L 77 54 L 76 57 L 75 54 L 72 53 Z" fill="#FFF" opacity="0.9"/>`
  },
  {
    id: 'golden_cape', name: 'Golden Cape', category: 'exclusive', currency: 'diamond', price: 25,
    viewBox: '6 72 108 62',
    desc: 'The rarest flex in Hammy\'s closet.',
    svg: `<defs><linearGradient id="gc-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFE9A6"/><stop offset="55%" stop-color="#FFC93F"/><stop offset="100%" stop-color="#C68A0A"/></linearGradient></defs>
          <path d="M 30 82 Q 60 74 90 82 L 100 130 Q 60 122 20 130 Z" fill="url(#gc-g)" stroke="#A66E08" stroke-width="1"/>
          <path d="M 30 82 Q 60 74 90 82 L 88 92 Q 60 84 32 92 Z" fill="rgba(255,255,255,0.25)"/>
          <circle cx="60" cy="82" r="5" fill="#8FE3F5"/>
          <circle cx="60" cy="82" r="2.6" fill="#E8FBFF"/>
          <path d="M 25 92 Q 22 108 26 126" stroke="#A66E08" stroke-width="1" fill="none" opacity="0.5"/>
          <path d="M 95 92 Q 98 108 94 126" stroke="#A66E08" stroke-width="1" fill="none" opacity="0.5"/>`
  },

  // ── GRADUATION CAP (not for sale — auto-awarded for finishing every module) ──
  {
    id: 'graduation_cap', name: 'Graduation Cap', category: 'hat', reward: true,
    viewBox: '14 -4 92 46',
    desc: 'Awarded for completing all 10 modules. Can\'t be bought, only earned.',
    svg: `<defs><linearGradient id="gcp-top" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#3D3D3D"/><stop offset="100%" stop-color="#141414"/></linearGradient></defs>
          <ellipse cx="60" cy="27" rx="19" ry="7" fill="#1C1C1C"/>
          <ellipse cx="60" cy="25" rx="19" ry="6.4" fill="#2B2B2B"/>
          <path d="M 60 4 L 96 18 L 60 32 L 24 18 Z" fill="url(#gcp-top)" stroke="#000" stroke-width="0.6"/>
          <path d="M 60 4 L 96 18 L 60 20 L 24 18 Z" fill="rgba(255,255,255,0.08)"/>
          <circle cx="60" cy="18" r="3" fill="#C9A227"/>
          <path d="M 60 18 Q 66 24 66 30" stroke="#C9A227" stroke-width="1.4" fill="none"/>
          <path d="M 63 30 L 69 30 L 68 38 L 66 36 L 64 38 Z" fill="#D9B33E"/>
          <circle cx="66" cy="30" r="2" fill="#C9A227"/>`
  },
];

// ── Achievements ──────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first_paycheck', abbr: 'E',  label: 'First Paycheck',    desc: 'Complete Earning module',       check: s => s.completedModules.earning },
  { id: 'budget_boss',    abbr: 'BB', label: 'Budget Boss',        desc: 'Complete Spending module',      check: s => s.completedModules.spending },
  { id: 'safety_net',     abbr: 'SN', label: 'Safety Net',         desc: 'Complete Saving module',        check: s => s.completedModules.saving },
  { id: 'investor',       abbr: 'FM', label: 'Future Millionaire', desc: 'Complete Investing module',     check: s => s.completedModules.investing },
  { id: 'credit_champ',   abbr: 'CC', label: 'Credit Champ',       desc: 'Complete Managing Credit',     check: s => s.completedModules.credit },
  { id: 'risk_ready',     abbr: 'RR', label: 'Risk Ready',         desc: 'Complete Managing Risk',       check: s => s.completedModules.risk },
  { id: 'loan_smart',     abbr: 'LN', label: 'Loan Smart',         desc: 'Complete Loans module',        check: s => s.completedModules.loans },
  { id: 'tax_ready',      abbr: 'TX', label: 'Tax Ready',          desc: 'Complete Taxes module',        check: s => s.completedModules.taxes },
  { id: 'mindful_money',  abbr: 'MM', label: 'Mindful Spender',    desc: 'Complete Consumer Psychology', check: s => s.completedModules.psychology },
  { id: 'offer_ready',    abbr: 'CS', label: 'Offer Ready',        desc: 'Complete Career & Salary',     check: s => s.completedModules.career },
  { id: 'stackd_star',    abbr: 'S*', label: 'Stackd Star',        desc: 'Complete all modules',         check: s => Object.keys(s.completedModules).length >= MODULES.length },
  { id: 'perfect_score',  abbr: '5/5',label: 'Perfect Score',      desc: 'Answer all 5 questions right', check: s => s.hadPerfect },
  { id: 'on_fire',        abbr: '3D', label: 'On a Roll',          desc: '3-day streak',                 check: s => s.streak >= 3 },
  { id: 'leveled_up',     abbr: 'L3', label: 'Leveled Up',         desc: 'Reach Level 3',                check: s => s.level >= 3 },
  { id: 'crisis_averted', abbr: 'CR', label: 'Crisis Averted',     desc: 'Beat the Credit boss battle',  check: s => (s.questBossesWon || []).includes('credit') },
];

// ── State ──────────────────────────────────────
let state = {
  level: 1, xp: 0, streak: 0, lastPlayedDate: null,
  completedModules: {}, completedLessons: {}, unlockedAchievements: [], hadPerfect: false,
  activeModuleId: null, activeLessonIdx: 0, activeQuestId: null, sessionQuestions: [],
  currentQ: 0, sessionAnswers: [], sessionScore: 0,
  coins: 0, diamonds: 0, ownedItems: [], equippedItem: null,
  ownedRoomItems: [], equippedRoom: { wall: null, lamp: null, plant: null, bed: null, rug: null, wallpaper: null },
  metHammy: false,
  questProgress: {}, questBossesWon: [],
  onboardingSurvey: { completed: false, moduleFamiliarity: {}, focusGoals: [], completedAt: null },
};

function loadState() {
  try {
    const s = localStorage.getItem('stackd_v2');
    if (s) Object.assign(state, JSON.parse(s));
  } catch (_) {}
}

function saveState() {
  const { level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect, coins, diamonds, ownedItems, equippedItem, ownedRoomItems, equippedRoom, metHammy, questProgress, questBossesWon, onboardingSurvey } = state;
  localStorage.setItem('stackd_v2', JSON.stringify({ level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect, coins, diamonds, ownedItems, equippedItem, ownedRoomItems, equippedRoom, metHammy, questProgress, questBossesWon, onboardingSurvey }));
}

// ── XP / Level ─────────────────────────────────
function xpForLevel(l) { return LEVEL_THRESHOLDS[Math.min(l, LEVEL_THRESHOLDS.length - 1)]; }

function xpProgressPct() {
  const base = xpForLevel(state.level - 1);
  const ceil = xpForLevel(state.level);
  if (ceil === base) return 100;
  return Math.min(100, ((state.xp - base) / (ceil - base)) * 100);
}

function addXP(amount) {
  state.xp += amount;
  let leveled = false;
  while (state.level < LEVEL_THRESHOLDS.length && state.xp >= xpForLevel(state.level)) {
    state.level++;
    leveled = true;
  }
  return leveled;
}

// Every 3rd consecutive day played (3, 6, 9, ...) earns a diamond bonus — a slower, rarer
// currency than coins, meant for the small run of "super exclusive" shop items.
const STREAK_DIAMOND_INTERVAL = 3;
const STREAK_DIAMOND_REWARD = 5;

// Returns the number of diamonds earned this call (0 most days) so callers can show a banner.
function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastPlayedDate === today) return 0;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  state.streak = state.lastPlayedDate === yesterday ? state.streak + 1 : 1;
  state.lastPlayedDate = today;
  if (state.streak % STREAK_DIAMOND_INTERVAL === 0) {
    state.diamonds = (state.diamonds || 0) + STREAK_DIAMOND_REWARD;
    return STREAK_DIAMOND_REWARD;
  }
  return 0;
}

function buildStreakDiamondBanner(diamondsEarned) {
  return `<div class="streak-diamond-banner">
    <span class="diamond-icon">💎</span>
    <div><strong>${state.streak}-Day Streak!</strong><span>+${diamondsEarned} diamonds earned, spend them on the exclusive shop items.</span></div>
  </div>`;
}

function buildGraduationBanner() {
  return `<div class="graduation-banner">
    <span class="graduation-icon">🎓</span>
    <div><strong>You Graduated!</strong><span>Every module complete. Your Graduation Cap is equipped, check out your pig.</span></div>
  </div>`;
}

function checkAchievements() {
  const newOnes = [];
  ACHIEVEMENTS.forEach(a => {
    if (!state.unlockedAchievements.includes(a.id) && a.check(state)) {
      state.unlockedAchievements.push(a.id);
      newOnes.push(a);
    }
  });
  // Finishing every module auto-awards the Graduation Cap — it can't be bought, only earned —
  // and equips it immediately so the payoff is visible the moment they land back on the pig.
  if (newOnes.some(a => a.id === 'stackd_star') && !(state.ownedItems || []).includes('graduation_cap')) {
    state.ownedItems = [...(state.ownedItems || []), 'graduation_cap'];
    state.equippedItem = 'graduation_cap';
  }
  return newOnes;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === id);
  });
  window.scrollTo(0, 0);
}

function updateSidebarStats() {
  const tier = getTier(state.level);
  document.getElementById('sf-tier').textContent = tier.name;
  document.getElementById('sf-level').textContent = state.level;
  document.getElementById('sf-xp').textContent = state.xp.toLocaleString();
  document.getElementById('sf-bar-fill').style.width = xpProgressPct() + '%';
  const coinsEl = document.getElementById('sf-coins');
  if (coinsEl) coinsEl.textContent = (state.coins || 0).toLocaleString();
  const diamondsEl = document.getElementById('sf-diamonds');
  if (diamondsEl) diamondsEl.textContent = (state.diamonds || 0).toLocaleString();
}

function renderModuleList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // Personalize order once the onboarding survey is done: modules the student is least
  // familiar with, or that match a stated goal, float up top. Ties keep the original module
  // order. Already-finished modules are never pulled up or badged, this only steers where to
  // go next, it doesn't hide or gate anything.
  const survey = state.onboardingSurvey;
  const orderedModules = survey && survey.completed
    ? MODULES.map((m, i) => ({ m, i, score: computeModulePriority(m, survey) }))
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .map(x => x.m)
    : MODULES;
  const topRecommendedId = survey && survey.completed
    ? (orderedModules.find(m => computeModulePriority(m, survey) > 0) || {}).id
    : null;

  orderedModules.forEach(m => {
    const quest = hasQuest(m);
    const lessonsDone = quest ? 0 : m.lessons.filter((_, i) => !!state.completedLessons[`${m.id}_${i}`]).length;
    const allDone = quest
      ? m.quests.every(q => { const qp = state.questProgress[questKey(m.id, q.id)]; return !!(qp && qp.done); })
      : lessonsDone === m.lessons.length;

    const row = document.createElement('div');
    row.className = 'module-row' + (allDone ? ' completed' : '');

    const badge = allDone
      ? `<span class="card-badge badge-done">✓ Complete</span>`
      : m.id === topRecommendedId
        ? `<span class="card-badge badge-recommend">★ Recommended</span>`
        : `<span class="card-badge badge-xp">+${m.xpReward} XP</span>`;

    let bodyHtml;
    if (quest) {
      bodyHtml = `<div class="module-row-lessons">${m.quests.map((q, idx) => {
        const qp = state.questProgress[questKey(m.id, q.id)];
        const done = !!(qp && qp.done);
        const cta = done ? '↻ Replay Quest' : (qp && qp.chapterIdx > 0 ? `Resume — ${questLabel(m, q)} →` : 'Begin Quest →');
        return `<div class="lesson-tile quest-tile${done ? ' done' : ''}" data-module="${m.id}" data-quest="${q.id}">
          <div class="lt-body">
            <div class="lt-num">Lesson ${idx + 1}</div>
            <div class="lt-title">${q.topic || q.character.name}</div>
            <div class="lt-meta">${q.character.tagline} · ${q.chapters.length} chapters</div>
          </div>
          <span class="lt-cta">${cta}</span>
        </div>`;
      }).join('')}</div>`;
    } else {
      bodyHtml = `<div class="module-row-lessons">${m.lessons.map((lesson, idx) => {
        const key = `${m.id}_${idx}`;
        const lessonData = state.completedLessons[key];
        const done = !!lessonData;
        const meta = done
          ? `Score: ${lessonData.score}/${lessonData.total} · ${lessonData.xpEarned} XP`
          : `${lesson.qIndices.length} questions`;
        const cta = done ? '↻ Replay' : 'Start →';
        return `<div class="lesson-tile${done ? ' done' : ''}" data-module="${m.id}" data-lesson="${idx}">
          <div class="lt-body">
            <div class="lt-num">Lesson ${idx + 1}</div>
            <div class="lt-title">${lesson.title}</div>
            <div class="lt-meta">${meta}</div>
          </div>
          <span class="lt-cta">${cta}</span>
        </div>`;
      }).join('')}</div>`;
    }

    row.innerHTML = `
      <div class="module-row-header">
        <div class="mrh-left">
          <div class="mod-icon ${m.iconColor}">${m.icon}</div>
          <div class="mrh-info">
            <div class="mrh-title">${m.title}${quest ? ' <span class="quest-tag">Quest</span>' : ''}</div>
            <div class="mrh-desc">${m.desc}</div>
          </div>
        </div>
        <div class="mrh-right">${badge}</div>
      </div>
      ${bodyHtml}`;

    if (quest) {
      row.querySelectorAll('.quest-tile').forEach(tile => {
        tile.addEventListener('click', () => startQuest(tile.dataset.module, tile.dataset.quest));
      });
    } else {
      row.querySelectorAll('.lesson-tile').forEach(tile => {
        tile.addEventListener('click', () => startHook(tile.dataset.module, parseInt(tile.dataset.lesson)));
      });
    }

    container.appendChild(row);
  });
}

// ── ONBOARDING SURVEY ────────────────────────────
// Shown once, before the student ever really lands on the dashboard: a quick "what do you
// already know, what do you want out of this" check-in that personalizes module ordering
// without gating anything. Answers persist in state.onboardingSurvey until reset from Settings.
// One module per screen, each a slider between two relatable "low" and "high" phrases instead
// of a bank of generic multiple-choice buttons.
const SURVEY_MODULE_IDS = MODULES.map(m => m.id);
const SURVEY_FAMILIARITY_LABELS = {
  earning: ["I've never seen an actual paycheck", 'I know exactly what gets taken out before it hits my account'],
  spending: ['I never spend a cent', 'After every paycheck, shopping time!'],
  saving: ['Savings account? Never heard of her', "I've got three different savings goals going right now"],
  investing: ['Stocks are just numbers that go up and down, right?', "I'm already investing every month"],
  credit: ["Credit card, debit card, what's the difference?", 'I know my credit score off the top of my head'],
  risk: ["Insurance is a whole adult thing I've never touched", 'I could explain a deductible in my sleep'],
  loans: ['Loans are basically free money, right?', 'I know exactly how my loans get repaid'],
  taxes: ['Taxes are just scary and confusing', "I've already filed my own return"],
  psychology: ["If it's on sale, it's going in my cart", 'I can spot a marketing trick from a mile away'],
  career: ["I'll just take whatever salary they offer me", "I'm ready to negotiate my way into a better offer"],
};
const SURVEY_GOALS = [
  { id: 'avoid_debt', label: 'Avoid debt mistakes', moduleIds: ['loans', 'credit'] },
  { id: 'paycheck_taxes', label: 'Understand my paycheck & taxes', moduleIds: ['taxes', 'earning'] },
  { id: 'build_credit', label: 'Build credit', moduleIds: ['credit'] },
  { id: 'negotiate_salary', label: 'Negotiate salary', moduleIds: ['career'] },
  { id: 'curious', label: 'Just curious, exploring', moduleIds: [] },
];
const SURVEY_TOTAL_STEPS = SURVEY_MODULE_IDS.length + 1; // familiarity sliders + one goals step

let surveyStep = 1;
let surveyDraft = { moduleFamiliarity: {}, focusGoals: [] };

function isModuleFullyDone(m) {
  return hasQuest(m)
    ? m.quests.every(q => { const qp = state.questProgress[questKey(m.id, q.id)]; return !!(qp && qp.done); })
    : m.lessons.every((_, i) => !!state.completedLessons[`${m.id}_${i}`]);
}

// Lower familiarity (0-100, 0 = "never heard of it") and goal-matched modules score higher;
// finished modules always score 0 so they're never pulled to the top or badged "Recommended"
// once they're already done.
function computeModulePriority(m, survey) {
  if (!survey || isModuleFullyDone(m)) return 0;
  let score = 0;
  if (survey.moduleFamiliarity && Object.prototype.hasOwnProperty.call(survey.moduleFamiliarity, m.id)) {
    score += (100 - survey.moduleFamiliarity[m.id]) / 100 * 30;
  }
  (survey.focusGoals || []).forEach(goalId => {
    const goal = SURVEY_GOALS.find(g => g.id === goalId);
    if (goal && goal.moduleIds.includes(m.id)) score += 25;
  });
  return score;
}

function getRecommendedModule(survey) {
  let best = null, bestScore = 0;
  MODULES.forEach(m => {
    const score = computeModulePriority(m, survey);
    if (score > bestScore) { bestScore = score; best = m; }
  });
  if (!best) return null;
  const fam = survey.moduleFamiliarity[best.id];
  const goalHit = SURVEY_GOALS.find(g => survey.focusGoals.includes(g.id) && g.moduleIds.includes(best.id));
  let reason;
  if (goalHit && fam !== undefined && fam <= 33) {
    reason = `It lines up with "${goalHit.label}," and you're just getting started there.`;
  } else if (goalHit) {
    reason = `It lines up with "${goalHit.label}."`;
  } else {
    reason = "You said you're not very familiar with it yet, so it's a solid place to start.";
  }
  return Object.assign({}, best, { reason });
}

function showOnboardingSurvey() {
  surveyStep = 1;
  surveyDraft = { moduleFamiliarity: {}, focusGoals: [] };
  document.getElementById('onboarding-mascot').innerHTML = getHammyFaceMarkup(0.32);
  renderSurveyStep();
  document.getElementById('onboarding-overlay').classList.add('visible');
}

function finishOnboardingSurvey(skipped) {
  state.onboardingSurvey = {
    completed: true,
    moduleFamiliarity: skipped ? state.onboardingSurvey.moduleFamiliarity || {} : surveyDraft.moduleFamiliarity,
    focusGoals: skipped ? state.onboardingSurvey.focusGoals || [] : surveyDraft.focusGoals,
    completedAt: Date.now(),
  };
  saveState();
  document.getElementById('onboarding-overlay').classList.remove('visible');
  renderHome();
}

function renderSurveyStep() {
  const heading = document.getElementById('onboarding-heading');
  const sub = document.getElementById('onboarding-subheading');
  const stepLabel = document.getElementById('onboarding-step-label');
  const body = document.getElementById('onboarding-body');
  const nextBtn = document.getElementById('onboarding-next');
  const skipBtn = document.getElementById('onboarding-skip');
  const backBtn = document.getElementById('onboarding-back');

  backBtn.style.display = surveyStep > 1 ? '' : 'none';
  backBtn.onclick = () => { surveyStep--; renderSurveyStep(); };

  if (surveyStep <= SURVEY_MODULE_IDS.length) {
    const modId = SURVEY_MODULE_IDS[surveyStep - 1];
    const mod = MODULES.find(m => m.id === modId);
    const [lowLabel, highLabel] = SURVEY_FAMILIARITY_LABELS[modId] || ['Never heard of it', 'Could teach it'];
    const current = surveyDraft.moduleFamiliarity[modId] ?? 50;

    stepLabel.textContent = `Step ${surveyStep} of ${SURVEY_TOTAL_STEPS}`;
    heading.textContent = mod.title;
    sub.textContent = "Slide to where you're really at, no wrong answer, it just helps us know where to start you off.";
    body.innerHTML = `
      <div class="survey-slider-wrap">
        <input type="range" class="survey-slider" id="survey-slider" min="0" max="100" step="1" value="${current}">
        <div class="survey-slider-labels">
          <span class="survey-slider-left">${lowLabel}</span>
          <span class="survey-slider-right">${highLabel}</span>
        </div>
      </div>`;
    const slider = document.getElementById('survey-slider');
    slider.addEventListener('input', () => {
      surveyDraft.moduleFamiliarity[modId] = Number(slider.value);
    });
    surveyDraft.moduleFamiliarity[modId] = current;

    skipBtn.style.display = '';
    nextBtn.textContent = surveyStep === SURVEY_MODULE_IDS.length ? 'Last one →' : 'Next →';
    nextBtn.onclick = () => { surveyStep++; renderSurveyStep(); };
  } else if (surveyStep === SURVEY_MODULE_IDS.length + 1) {
    stepLabel.textContent = `Step ${surveyStep} of ${SURVEY_TOTAL_STEPS}`;
    heading.textContent = 'What do you want to get out of Stackd right now?';
    sub.textContent = 'Pick as many as you like.';
    body.innerHTML = `<div class="survey-goals-grid">${SURVEY_GOALS.map(g =>
      `<button type="button" class="survey-goal-chip${surveyDraft.focusGoals.includes(g.id) ? ' selected' : ''}" data-goal="${g.id}">${g.label}</button>`
    ).join('')}</div>`;
    body.querySelectorAll('.survey-goal-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const goalId = btn.dataset.goal;
        const idx = surveyDraft.focusGoals.indexOf(goalId);
        if (idx === -1) surveyDraft.focusGoals.push(goalId); else surveyDraft.focusGoals.splice(idx, 1);
        btn.classList.toggle('selected');
      });
    });
    skipBtn.style.display = '';
    nextBtn.textContent = 'See my starting path →';
    nextBtn.onclick = () => { surveyStep++; renderSurveyStep(); };
  } else {
    stepLabel.textContent = "You're all set";
    heading.textContent = 'Your starting path';
    sub.textContent = '';
    const rec = getRecommendedModule(surveyDraft);
    body.innerHTML = rec
      ? `<div class="survey-recommend-card">
          <div class="survey-recommend-icon"><div class="mod-icon ${rec.iconColor}">${rec.icon}</div></div>
          <div>
            <div class="survey-recommend-title">Start with ${rec.title}</div>
            <div class="survey-recommend-text">${rec.reason}</div>
          </div>
        </div>`
      : `<div class="survey-recommend-card">
          <div>
            <div class="survey-recommend-title">Explore at your own pace</div>
            <div class="survey-recommend-text">Jump into whatever module looks interesting on your dashboard, there's no set order.</div>
          </div>
        </div>`;
    backBtn.style.display = 'none';
    skipBtn.style.display = 'none';
    nextBtn.textContent = 'Take me to my dashboard →';
    nextBtn.onclick = () => finishOnboardingSurvey(false);
  }
}

function renderAchievementBadges(containerId, subId) {
  const unlocked = state.unlockedAchievements.length;
  if (subId) document.getElementById(subId).textContent = `${unlocked}/${ACHIEVEMENTS.length} unlocked`;
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = state.unlockedAchievements.includes(a.id);
    const el = document.createElement('div');
    el.className = 'ach-badge';
    el.title = a.desc;
    el.innerHTML = `<div class="ach-icon ${isUnlocked ? 'unlocked' : 'locked'}">${a.abbr}</div><span class="ach-label">${a.label}</span>`;
    container.appendChild(el);
  });
}

// ── PIG MASCOT ────────────────────────────────
function getPigAccessory(level) {
  if (level >= 9) return `
    <ellipse cx="60" cy="21" rx="30" ry="7" fill="#2C3E2D"/>
    <rect x="38" y="13" width="44" height="8" rx="2" fill="#2C3E2D"/>
    <line x1="78" y1="13" x2="87" y2="30" stroke="#D4899E" stroke-width="2.5"/>
    <line x1="87" y1="30" x2="84" y2="39" stroke="#D4899E" stroke-width="2"/>
    <line x1="87" y1="30" x2="87" y2="40" stroke="#D4899E" stroke-width="2"/>
    <line x1="87" y1="30" x2="90" y2="39" stroke="#D4899E" stroke-width="2"/>
    <circle cx="87" cy="41" r="2.5" fill="#D4899E"/>`;
  if (level >= 7) return `
    <ellipse cx="60" cy="21" rx="30" ry="7" fill="#2C3E2D"/>
    <rect x="38" y="13" width="44" height="8" rx="2" fill="#2C3E2D"/>
    <line x1="78" y1="13" x2="87" y2="28" stroke="#D4899E" stroke-width="2.5"/>
    <circle cx="87" cy="30" r="3.5" fill="#D4899E"/>`;
  if (level >= 5) return `
    <circle cx="46" cy="58" r="11.5" fill="none" stroke="#2C3E2D" stroke-width="2.5" opacity="0.75"/>
    <circle cx="74" cy="58" r="11.5" fill="none" stroke="#2C3E2D" stroke-width="2.5" opacity="0.75"/>
    <line x1="57.5" y1="57" x2="62.5" y2="57" stroke="#2C3E2D" stroke-width="2" opacity="0.75"/>
    <line x1="21" y1="54" x2="34.5" y2="57" stroke="#2C3E2D" stroke-width="2" opacity="0.75"/>
    <line x1="85.5" y1="57" x2="99" y2="54" stroke="#2C3E2D" stroke-width="2" opacity="0.75"/>`;
  if (level >= 3) return `
    <ellipse cx="45" cy="20" rx="12" ry="7.5" fill="#D4899E" transform="rotate(-18 45 20)"/>
    <ellipse cx="67" cy="20" rx="12" ry="7.5" fill="#D4899E" transform="rotate(18 67 20)"/>
    <circle cx="56" cy="21" r="5.5" fill="#B5607A"/>`;
  return '';
}

function getPigAccessoryDesc(level) {
  if (level >= 9)  return 'Fully graduated — all accessories unlocked.';
  if (level >= 7)  return 'Graduation cap unlocked · Reach Level 9 to fully graduate';
  if (level >= 5)  return 'Glasses unlocked · Reach Level 7 to earn a graduation cap';
  if (level >= 3)  return 'Bow unlocked · Reach Level 5 to unlock glasses';
  return 'Complete modules to unlock accessories for your pig!';
}

function getPigMarkup(scale) {
  return `<div class="pig-stage" style="--pig-scale:${scale}">
  <div class="pig-inner">
    <div class="pig-shadow"></div>
    <div class="pig">
      <div class="pig-foot l"></div><div class="pig-foot r"></div>
      <div class="pig-tail"></div>
      <div class="pig-body"></div><div class="pig-tummy"></div>
      <div class="pig-arm l"></div><div class="pig-arm r"></div>
      <div class="pig-ear l"><div class="pig-ear-inner"></div></div>
      <div class="pig-ear r"><div class="pig-ear-inner"></div></div>
      <div class="pig-head">
        <div class="pig-cheek l"></div><div class="pig-cheek r"></div>
        <div class="pig-eye l"><div class="shine1"></div><div class="shine2"></div></div>
        <div class="pig-eye r"><div class="shine1"></div><div class="shine2"></div></div>
        <div class="pig-snout"><div class="pig-nostril l"></div><div class="pig-nostril r"></div></div>
      </div>
    </div>
  </div>
</div>`;
}

function getPigWithItemMarkup(scale, itemSvg) {
  const overlay = itemSvg
    ? `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;width:440px;height:460px;pointer-events:none;z-index:10;overflow:visible"><g transform="matrix(3.28,0,0,3.4,23,-15)">${itemSvg}</g></svg>`
    : '';
  return `<div class="pig-stage" style="--pig-scale:${scale}">
  <div class="pig-inner">
    <div class="pig-shadow"></div>
    <div class="pig">
      <div class="pig-foot l"></div><div class="pig-foot r"></div>
      <div class="pig-tail"></div>
      <div class="pig-body"></div><div class="pig-tummy"></div>
      <div class="pig-arm l"></div><div class="pig-arm r"></div>
      <div class="pig-ear l"><div class="pig-ear-inner"></div></div>
      <div class="pig-ear r"><div class="pig-ear-inner"></div></div>
      <div class="pig-head">
        <div class="pig-cheek l"></div><div class="pig-cheek r"></div>
        <div class="pig-eye l"><div class="shine1"></div><div class="shine2"></div></div>
        <div class="pig-eye r"><div class="shine1"></div><div class="shine2"></div></div>
        <div class="pig-snout"><div class="pig-nostril l"></div><div class="pig-nostril r"></div></div>
      </div>
      ${overlay}
    </div>
  </div>
</div>`;
}

function buildPigPreviewSvg(itemSvg, viewBox = '0 0 120 162') {
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pm-body" x1="35%" y1="20%" x2="95%" y2="100%">
        <stop offset="0%" stop-color="#ffd4e4"/><stop offset="60%" stop-color="#ffc2d9"/><stop offset="100%" stop-color="#ffb4ce"/>
      </linearGradient>
      <linearGradient id="pm-head" x1="30%" y1="20%" x2="95%" y2="100%">
        <stop offset="0%" stop-color="#ffd9e7"/><stop offset="58%" stop-color="#ffc6db"/><stop offset="100%" stop-color="#ffb8d0"/>
      </linearGradient>
      <linearGradient id="pm-ear" x1="30%" y1="20%" x2="95%" y2="100%">
        <stop offset="0%" stop-color="#ffc6dc"/><stop offset="100%" stop-color="#ff9fc1"/>
      </linearGradient>
      <radialGradient id="pm-snout" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#ffb3cd"/><stop offset="100%" stop-color="#ff96b8"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="155" rx="30" ry="7" fill="rgba(214,120,160,0.2)"/>
    <rect x="39" y="140" width="13" height="17" rx="6.5" fill="#f7a8c4"/>
    <rect x="68" y="140" width="13" height="17" rx="6.5" fill="#f7a8c4"/>
    <ellipse cx="20" cy="108" rx="11" ry="9" fill="url(#pm-body)" transform="rotate(-20 20 108)"/>
    <ellipse cx="100" cy="108" rx="11" ry="9" fill="url(#pm-body)" transform="rotate(20 100 108)"/>
    <ellipse cx="60" cy="116" rx="36" ry="33" fill="url(#pm-body)"/>
    <ellipse cx="60" cy="113" rx="18" ry="16" fill="rgba(255,255,255,0.42)"/>
    <path d="M 97,105 C 103,99 109,102 107,109 C 105,114 98,111 101,107" fill="none" stroke="#f7a8c4" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="35" cy="40" rx="13" ry="17" fill="url(#pm-ear)"/>
    <ellipse cx="85" cy="40" rx="13" ry="17" fill="url(#pm-ear)"/>
    <ellipse cx="35" cy="40" rx="7.5" ry="11" fill="#f48bb0"/>
    <ellipse cx="85" cy="40" rx="7.5" ry="11" fill="#f48bb0"/>
    <ellipse cx="60" cy="65" rx="34" ry="36" fill="url(#pm-head)"/>
    <ellipse cx="33" cy="72" rx="10" ry="6.5" fill="rgba(255,100,150,0.32)"/>
    <ellipse cx="87" cy="72" rx="10" ry="6.5" fill="rgba(255,100,150,0.32)"/>
    <circle cx="44" cy="55" r="7.5" fill="#3a2230"/>
    <circle cx="76" cy="55" r="7.5" fill="#3a2230"/>
    <circle cx="47" cy="52" r="3" fill="white"/>
    <circle cx="79" cy="52" r="3" fill="white"/>
    <circle cx="44" cy="59" r="1.5" fill="rgba(255,255,255,0.65)"/>
    <circle cx="76" cy="59" r="1.5" fill="rgba(255,255,255,0.65)"/>
    <ellipse cx="60" cy="76" rx="19" ry="13" fill="url(#pm-snout)"/>
    <circle cx="53.5" cy="76.5" r="5" fill="#d9608c"/>
    <circle cx="66.5" cy="76.5" r="5" fill="#d9608c"/>
    ${itemSvg}
  </svg>`;
}

function refreshShopModal(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const isRoom = !!item.slot;
  const isWallpaper = item.slot === 'wallpaper';
  const owned = isRoom ? (state.ownedRoomItems || []).includes(itemId) : (state.ownedItems || []).includes(itemId);
  const equipped = isRoom ? state.equippedRoom[item.slot] === itemId : state.equippedItem === itemId;
  const canAfford = item.reward ? false : shopBalanceFor(item) >= item.price;
  let btn;
  if (equipped) {
    btn = `<button class="shop-btn shop-btn-unequip" data-id="${itemId}">✓ ${isWallpaper ? 'Applied' : isRoom ? 'Placed' : 'Equipped'} · Remove</button>`;
  } else if (owned) {
    btn = `<button class="shop-btn shop-btn-equip" data-id="${itemId}">${isWallpaper ? 'Apply' : isRoom ? 'Place in room' : 'Equip'}</button>`;
  } else if (item.reward) {
    btn = `<button class="shop-btn shop-btn-broke" disabled>🎓 Complete all 10 modules to earn this</button>`;
  } else {
    btn = `<button class="shop-btn shop-btn-buy${canAfford ? '' : ' shop-btn-broke'}" data-id="${itemId}"${canAfford ? '' : ' disabled'}>${shopPriceLabel(item)}</button>`;
  }
  const vb = item.viewBox || CAT_VIEWBOX[item.category] || '0 0 120 120';
  document.getElementById('shop-modal-pig').innerHTML = isWallpaper
    ? `<div class="wallpaper-swatch" style="${item.wallCss}"></div>`
    : isRoom
      ? `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${item.svg}</svg>`
      : getPigWithItemMarkup(0.42, item.svg);
  document.getElementById('shop-modal-accessory').innerHTML = isRoom
    ? ''
    : `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${item.svg}</svg>`;
  document.getElementById('shop-modal-name').textContent = item.name;
  document.getElementById('shop-modal-desc').textContent = item.desc;
  document.getElementById('shop-modal-btn-wrap').innerHTML = btn;
}

function openShopModal(itemId) {
  refreshShopModal(itemId);
  document.getElementById('shop-modal').removeAttribute('hidden');
}

function closeShopModal() {
  document.getElementById('shop-modal').setAttribute('hidden', '');
}

// ── SHOP ───────────────────────────────────────
const SHOP_CATEGORIES = [
  { key: 'exclusive', label: 'Diamond Exclusives', icon: '💎' },
  { key: 'hat',     label: 'Hats',    icon: '🎩' },
  { key: 'glasses', label: 'Glasses', icon: '🕶️' },
  { key: 'clothes', label: 'Clothes', icon: '👔' },
  { key: 'room',    label: 'Room Decor', icon: '🛋️' },
];

const CAT_VIEWBOX = {
  hat:     '14 -4 92 46',
  glasses: '6 41 108 34',
  clothes: '6 72 108 62',
};

function shopBalanceFor(item) { return item.currency === 'diamond' ? (state.diamonds || 0) : (state.coins || 0); }
function shopPriceLabel(item) { return item.currency === 'diamond' ? `💎 ${item.price}` : `🪙 ${item.price}`; }

function renderShopPage() {
  updateSidebarStats();
  const shopCoinCount = document.getElementById('shop-coin-count');
  if (shopCoinCount) shopCoinCount.textContent = (state.coins || 0).toLocaleString();
  const shopDiamondCount = document.getElementById('shop-diamond-count');
  if (shopDiamondCount) shopDiamondCount.textContent = (state.diamonds || 0).toLocaleString();

  const grid = document.getElementById('shop-grid');
  if (!grid) return;

  const equippedItem = SHOP_ITEMS.find(i => i.id === state.equippedItem);

  const categoriesHtml = SHOP_CATEGORIES.map(cat => {
    const items = SHOP_ITEMS.filter(i => i.category === cat.key);
    const isExclusiveCat = cat.key === 'exclusive';
    const cardsHtml = items.map(item => {
      const isRoom = !!item.slot;
      const isDiamond = item.currency === 'diamond';
      const isReward = !!item.reward;
      const owned = isRoom ? (state.ownedRoomItems || []).includes(item.id) : (state.ownedItems || []).includes(item.id);
      const equipped = isRoom ? state.equippedRoom[item.slot] === item.id : state.equippedItem === item.id;
      const canAfford = isReward ? false : shopBalanceFor(item) >= item.price;
      const statusLabel = equipped
        ? (item.slot === 'wallpaper' ? '✓ Applied' : isRoom ? '✓ Placed' : '✓ Equipped')
        : owned ? 'Owned'
        : isReward ? '🎓 Locked'
        : shopPriceLabel(item);
      const preview = item.slot === 'wallpaper'
        ? `<div class="wallpaper-swatch" style="${item.wallCss}"></div>`
        : isRoom
          ? `<svg viewBox="${item.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${item.svg}</svg>`
          : getPigWithItemMarkup(0.29, item.svg);
      return `<div class="shop-card${equipped ? ' shop-equipped' : ''}${owned && !equipped ? ' shop-owned' : ''}${!owned && !canAfford ? ' shop-broke' : ''}${isDiamond ? ' shop-exclusive-card' : ''}${isReward && !owned ? ' shop-reward-card' : ''}" data-item-id="${item.id}">
        ${isDiamond ? '<span class="shop-exclusive-ribbon">Exclusive</span>' : ''}
        ${isReward && !owned ? '<span class="shop-reward-ribbon">Reward</span>' : ''}
        <div class="shop-preview">
          ${preview}
        </div>
        <div class="shop-card-body">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-price${isDiamond ? ' shop-price-diamond' : ''}${isReward ? ' shop-price-reward' : ''}">${statusLabel}</div>
        </div>
      </div>`;
    }).join('');
    return `<div class="shop-category${isExclusiveCat ? ' shop-category-exclusive' : ''}">
      <div class="shop-cat-header">
        <span class="shop-cat-icon">${cat.icon}</span>
        <h2 class="shop-cat-title">${cat.label}</h2>
        ${isExclusiveCat ? '<span class="shop-cat-tag">Earned via streaks, not coins</span>' : ''}
      </div>
      <div class="shop-items-grid">${cardsHtml}</div>
    </div>`;
  }).join('');

  grid.innerHTML = `
    <div class="shop-storefront">
      <div class="shop-storefront-awning">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="shop-storefront-inner">
        <div class="shop-storefront-pig">${getPigMarkup(0.2)}</div>
        <div class="shop-storefront-text">
          <div class="shop-storefront-sign">Hammy's Boutique</div>
          <div class="shop-storefront-sub">${equippedItem ? `Currently wearing: <strong>${equippedItem.name}</strong>` : 'Pick something cute for your pig!'}</div>
          <div class="shop-earn-tip">Earn 🪙 coins by completing lessons · 💎 diamonds every 3-day streak</div>
        </div>
      </div>
    </div>
    ${categoriesHtml}`;

  grid.querySelectorAll('.shop-card[data-item-id]').forEach(card => {
    card.addEventListener('click', () => openShopModal(card.dataset.itemId));
  });
}

function handleShopAction(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  const isDiamond = item.currency === 'diamond';

  if (item.slot) {
    if (!state.equippedRoom) state.equippedRoom = { wall: null, lamp: null, plant: null, bed: null, rug: null, wallpaper: null };
    const owned = (state.ownedRoomItems || []).includes(itemId);
    const equipped = state.equippedRoom[item.slot] === itemId;
    if (equipped) {
      state.equippedRoom[item.slot] = null;
    } else if (owned) {
      state.equippedRoom[item.slot] = itemId;
    } else {
      if (shopBalanceFor(item) < item.price) return;
      if (isDiamond) state.diamonds -= item.price; else state.coins -= item.price;
      state.ownedRoomItems = [...(state.ownedRoomItems || []), itemId];
      state.equippedRoom[item.slot] = itemId;
    }
    saveState();
    renderShopPage();
    return;
  }

  const owned = (state.ownedItems || []).includes(itemId);
  const equipped = state.equippedItem === itemId;

  if (equipped) {
    state.equippedItem = null;
  } else if (owned) {
    state.equippedItem = itemId;
  } else {
    if (shopBalanceFor(item) < item.price) return;
    if (isDiamond) state.diamonds -= item.price; else state.coins -= item.price;
    state.ownedItems = [...(state.ownedItems || []), itemId];
    state.equippedItem = itemId;
  }
  saveState();
  renderShopPage();
}

// ── ROOM ───────────────────────────────────────
function renderRoomPage() {
  updateSidebarStats();
  const scene = document.getElementById('room-scene');
  if (!scene) return;

  const room = state.equippedRoom || {};
  const equippedOutfit = SHOP_ITEMS.find(i => i.id === state.equippedItem);

  function slotBlock(slotKey, emptyLabel) {
    const itemId = room[slotKey];
    const item = itemId ? SHOP_ITEMS.find(i => i.id === itemId) : null;
    if (item) {
      return `<div class="room-slot room-slot-${slotKey}" data-slot="${slotKey}">
        <svg viewBox="${item.viewBox}" xmlns="http://www.w3.org/2000/svg">${item.svg}</svg>
      </div>`;
    }
    return `<div class="room-slot room-slot-${slotKey} empty" data-slot="${slotKey}">
      <span class="room-slot-plus">+</span>
      <span class="room-slot-label">${emptyLabel}</span>
    </div>`;
  }

  const wallpaperId = room.wallpaper;
  const wallpaper = wallpaperId ? SHOP_ITEMS.find(i => i.id === wallpaperId) : null;

  scene.innerHTML = `
    <div class="room-backdrop">
      <div class="room-wall-zone" id="room-wall-zone" style="${wallpaper ? wallpaper.wallCss : ''}"></div>
      ${slotBlock('wall', 'Wall art')}
      ${slotBlock('lamp', 'Lamp')}
      ${slotBlock('plant', 'Plant')}
      ${slotBlock('bed', 'Bed')}
      <div class="room-floor">
        ${slotBlock('rug', 'Rug')}
        <div class="room-pig">${getPigWithItemMarkup(0.42, equippedOutfit ? equippedOutfit.svg : '')}</div>
      </div>
    </div>
    <p class="room-hint">Buy furniture, wallpaper, and decor in the <button class="room-shop-link" id="room-shop-link" type="button">Shop</button> to fill in the empty spots.</p>`;

  scene.querySelectorAll('.room-slot.empty').forEach(el => {
    el.addEventListener('click', () => { showPage('shop'); renderShopPage(); });
  });
  const shopLink = document.getElementById('room-shop-link');
  if (shopLink) shopLink.addEventListener('click', () => { showPage('shop'); renderShopPage(); });
}

// ── HOME ───────────────────────────────────────
function renderHome() {
  showPage('home');
  updateSidebarStats();
  const tier = getTier(state.level);
  document.getElementById('h-tier').textContent = tier.name;
  const done = Object.keys(state.completedModules).length;
  document.getElementById('modules-home-sub').textContent = done === MODULES.length ? 'All complete — replay to master!' : `${done}/${MODULES.length} complete`;

  document.getElementById('home-mascot-card').innerHTML = `
    <div class="mascot-pig-wrap">${getPigMarkup(0.25)}</div>
    <div class="mascot-info">
      <div class="mascot-tier-name">${tier.name}</div>
      <div class="mascot-unlock">${getPigAccessoryDesc(state.level)}</div>
    </div>`;

  document.getElementById('home-stats-row').innerHTML = `
    <div class="hs-card">
      <div class="hs-num">${state.xp.toLocaleString()}</div>
      <div class="hs-label">XP Earned</div>
    </div>
    <div class="hs-card">
      <div class="hs-num">${state.level}</div>
      <div class="hs-label">Level</div>
    </div>
    <div class="hs-card">
      <div class="hs-num">${state.streak}</div>
      <div class="hs-label">Day Streak</div>
    </div>
    <div class="hs-card">
      <div class="hs-num">${done}<span style="font-size:1rem;letter-spacing:0;color:var(--text-soft)">/${MODULES.length}</span></div>
      <div class="hs-label">Modules Done</div>
    </div>`;

  renderModuleList('home-modules-grid');
  renderAchievementBadges('home-achievements-row', 'home-achieve-sub');
}

// ── MODULES PAGE ───────────────────────────────
function renderModulesPage() {
  updateSidebarStats();
  const done = Object.keys(state.completedModules).length;
  document.getElementById('modules-sub').textContent = done === MODULES.length ? 'All complete — replay to master!' : `${done}/${MODULES.length} complete`;
  renderModuleList('modules-grid');
}

// ── BADGES PAGE ────────────────────────────────
function renderBadgesPage() {
  updateSidebarStats();
  renderAchievementBadges('achievements-row', 'achieve-sub');
}

// ── PROGRESS PAGE ──────────────────────────────
function renderProgressPage() {
  updateSidebarStats();
  const tier = getTier(state.level);
  const done = Object.keys(state.completedModules).length;
  const unlocked = state.unlockedAchievements.length;
  const pct = xpProgressPct();
  const nextXP = xpForLevel(state.level);

  // Donut chart math (SVG circle r=32, circumference ≈ 201)
  const r = 32;
  const circ = +(2 * Math.PI * r).toFixed(2);
  const offset = +(circ * (1 - done / MODULES.length)).toFixed(2);

  // Column chart: XP per module, scaled to tallest
  const xpVals = MODULES.map(m => state.completedModules[m.id]?.xpEarned || 0);
  const maxXP = Math.max(...xpVals, 1);

  // Alternating bar colors
  const pinkMods = new Set(['spending', 'credit', 'taxes']);

  const pigMsg = done === MODULES.length ? "You did it! All modules complete!"
    : done > 0 ? "Keep going, you're doing great!"
    : "Let's get started!";

  document.getElementById('progress-body').innerHTML = `
    <!-- Pig mascot -->
    <div class="pg-mascot-wrap">
      <div class="pg-mascot-pig">${getPigMarkup(0.25)}</div>
      <div class="pg-mascot-bubble">${pigMsg}</div>
    </div>

    <!-- Stat cards -->
    <div class="pg-stats-row">
      <div class="pg-stat-card">
        <div class="pg-stat-label">Total XP</div>
        <div class="pg-stat-num">${state.xp.toLocaleString()}</div>
        <div class="pg-stat-sub">${tier.name}</div>
      </div>
      <div class="pg-stat-card">
        <div class="pg-stat-label">Level</div>
        <div class="pg-stat-num">${state.level}</div>
        <div class="pg-stat-sub">${pct.toFixed(0)}% to Level ${state.level + 1}</div>
      </div>
      <div class="pg-stat-card">
        <div class="pg-stat-label">Day Streak</div>
        <div class="pg-stat-num">${state.streak}</div>
        <div class="pg-stat-sub">days in a row</div>
      </div>
      <div class="pg-stat-card">
        <div class="pg-stat-label">Badges</div>
        <div class="pg-stat-num">${unlocked}</div>
        <div class="pg-stat-sub">of ${ACHIEVEMENTS.length} unlocked</div>
      </div>
    </div>

    <!-- Donut + Module score bars -->
    <div class="pg-charts-row">
      <div class="pg-chart-card">
        <div class="pg-chart-title">Modules Done</div>
        <div class="pg-donut-wrap">
          <svg viewBox="0 0 80 80" class="pg-donut-svg">
            <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--border)" stroke-width="8"/>
            <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--green)" stroke-width="8"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              stroke-linecap="round" transform="rotate(-90 40 40)" class="pg-donut-fill"/>
          </svg>
          <div class="pg-donut-center">
            <span class="pg-donut-num">${done}</span>
            <span class="pg-donut-den">/${MODULES.length}</span>
          </div>
        </div>
        <div class="pg-donut-legend">
          <span class="pg-legend-item"><span class="pg-legend-dot pg-dot-green"></span>Completed (${done})</span>
          <span class="pg-legend-item"><span class="pg-legend-dot pg-dot-gray"></span>Remaining (${MODULES.length - done})</span>
        </div>
      </div>

      <div class="pg-chart-card">
        <div class="pg-chart-title">Module Scores</div>
        <div class="pg-bar-chart">
          ${MODULES.map(m => {
            const comp = state.completedModules[m.id];
            const scorePct = comp ? (comp.score / (comp.total || 5)) * 100 : 0;
            const isPink = pinkMods.has(m.id);
            return `<div class="pg-bar-row">
              <span class="pg-bar-label">${m.title}</span>
              <div class="pg-bar-track">
                <div class="pg-bar-fill${isPink ? ' pg-bar-pink' : ''}" style="width:${scorePct}%"></div>
              </div>
              <span class="pg-bar-val">${comp ? `${comp.score}/${comp.total || 5}` : '—'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- XP by module column chart -->
    <div class="pg-chart-card">
      <div class="pg-chart-title">XP Earned by Module</div>
      <div class="pg-column-chart">
        ${MODULES.map((m, i) => {
          const xp = xpVals[i];
          const hPct = Math.round((xp / maxXP) * 100);
          const isPink = pinkMods.has(m.id);
          return `<div class="pg-col">
            <span class="pg-col-val">${xp > 0 ? xp : ''}</span>
            <div class="pg-col-bar-wrap">
              <div class="pg-col-bar${isPink ? ' pg-col-pink' : ''}" style="height:${hPct}%"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="pg-col-labels">
        ${MODULES.map(m => `<span>${m.title.split(' ')[0]}</span>`).join('')}
      </div>
    </div>

    <!-- Level progress -->
    <div class="pg-chart-card">
      <div class="pg-chart-title">Level Progress</div>
      <div class="pg-level-row">
        <div class="pg-level-big">Lv ${state.level}</div>
        <div class="pg-level-info">
          <div class="pg-xp-row-detail">
            <span>${state.xp.toLocaleString()} XP earned</span>
            <span>${nextXP.toLocaleString()} XP needed</span>
          </div>
          <div class="pg-level-bar-track">
            <div class="pg-level-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="pg-xp-sub">${(nextXP - state.xp).toLocaleString()} XP to Level ${state.level + 1} · ${tier.name}</div>
        </div>
      </div>
    </div>`;
}

// ── SETTINGS PAGE ──────────────────────────────
function renderSettingsPage() {
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        localStorage.removeItem('stackd_v2');
        location.reload();
      }
    };
  }
  const retakeBtn = document.getElementById('retake-survey-btn');
  if (retakeBtn) {
    retakeBtn.onclick = () => {
      state.onboardingSurvey = { completed: false, moduleFamiliarity: {}, focusGoals: [], completedAt: null };
      saveState();
      showOnboardingSurvey();
    };
  }
}

// ── MODULE DETAIL ──────────────────────────────
function showModuleDetail(moduleId) {
  const mod = MODULES.find(m => m.id === moduleId);
  state.activeModuleId = moduleId;
  document.getElementById('mod-detail-chip').textContent = mod.title;

  const container = document.getElementById('mod-detail-lessons');
  container.innerHTML = '';
  mod.lessons.forEach((lesson, idx) => {
    const key = `${moduleId}_${idx}`;
    const lessonData = state.completedLessons[key];
    const done = !!lessonData;
    const card = document.createElement('div');
    card.className = 'lesson-card' + (done ? ' done' : '');
    card.innerHTML = `
      <div class="lesson-num">Lesson ${idx + 1}</div>
      <div class="lesson-title">${lesson.title}</div>
      <div class="lesson-meta">${done
        ? `Score: ${lessonData.score}/${lessonData.total} · ${lessonData.xpEarned} XP earned`
        : `${lesson.qIndices.length} questions`}
      </div>
      <div class="lesson-action">${done ? '↻ Replay' : 'Start →'}</div>`;
    card.addEventListener('click', () => startHook(moduleId, idx));
    container.appendChild(card);
  });

  showScreen('screen-module');
}

// ── HOOK ───────────────────────────────────────
function startHook(moduleId, lessonIdx) {
  const mod = MODULES.find(m => m.id === moduleId);
  const lesson = mod.lessons[lessonIdx];
  state.activeModuleId = moduleId;
  state.activeLessonIdx = lessonIdx;
  state.sessionQuestions = lesson.qIndices.map(i => mod.questions[i]);
  document.getElementById('hook-chip').textContent = `${mod.title} · ${lesson.title}`;
  document.getElementById('hook-scenario').textContent = lesson.hook;
  showScreen('screen-hook');
}

// ── QUIZ ───────────────────────────────────────
function startQuiz() {
  const mod = MODULES.find(m => m.id === state.activeModuleId);
  state.currentQ = 0;
  state.sessionAnswers = [];
  state.sessionScore = 0;
  const lesson = mod.lessons[state.activeLessonIdx];
  document.getElementById('quiz-chip').textContent = `${mod.title} · ${lesson.title}`;
  document.getElementById('feedback-panel').classList.remove('visible', 'correct-state', 'wrong-state');
  showScreen('screen-quiz');
  renderQuestion();
}

// Shared by the legacy quiz screen and the quest engine's knowledge-check chapters —
// renders one question's options into any host elements and reports the outcome back to the caller.
function buildQuestionBlock(q, els, onAnswered) {
  const { questionEl, optionsEl, feedbackPanelEl, feedbackLabelEl, feedbackExpEl } = els;
  if (questionEl) questionEl.textContent = q.q;

  const letters = ['A', 'B', 'C', 'D'];
  optionsEl.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span><span>${opt}</span>`;
    btn.addEventListener('click', () => {
      const isCorrect = i === q.correct;
      optionsEl.querySelectorAll('.option-btn').forEach((b, j) => {
        b.disabled = true;
        if (j === q.correct) b.classList.add('correct');
        else if (j === i && !isCorrect) b.classList.add('wrong');
      });
      feedbackPanelEl.classList.add('visible', isCorrect ? 'correct-state' : 'wrong-state');
      feedbackPanelEl.classList.remove(isCorrect ? 'wrong-state' : 'correct-state');
      feedbackLabelEl.textContent = isCorrect ? 'Correct' : 'Not quite';
      feedbackExpEl.textContent = q.exp;
      onAnswered(isCorrect, i);
    });
    optionsEl.appendChild(btn);
  });

  feedbackPanelEl.classList.remove('visible', 'correct-state', 'wrong-state');
}

function renderQuestion() {
  const questions = state.sessionQuestions;
  const total = questions.length;
  const idx = state.currentQ;
  const q = questions[idx];

  document.getElementById('quiz-prog-fill').style.width = (idx / total * 100) + '%';
  document.getElementById('quiz-counter').textContent = `${idx + 1} / ${total}`;

  buildQuestionBlock(q, {
    questionEl: document.getElementById('question-text'),
    optionsEl: document.getElementById('options'),
    feedbackPanelEl: document.getElementById('feedback-panel'),
    feedbackLabelEl: document.getElementById('feedback-label'),
    feedbackExpEl: document.getElementById('feedback-exp'),
  }, (isCorrect, chosen) => {
    if (isCorrect) state.sessionScore++;
    state.sessionAnswers.push({ chosen, correct: q.correct, isCorrect });
    const isLast = state.currentQ === state.sessionQuestions.length - 1;
    document.getElementById('btn-next').textContent = isLast ? 'See Results →' : 'Next →';
  });
}

// ── RESULTS ────────────────────────────────────
function finishQuiz() {
  const mod = MODULES.find(m => m.id === state.activeModuleId);
  const lessonIdx = state.activeLessonIdx;
  const lessonKey = `${mod.id}_${lessonIdx}`;
  const score = state.sessionScore;
  const total = state.sessionQuestions.length;
  const isPerfect = score === total;
  if (isPerfect) state.hadPerfect = true;

  const wasLessonDone = !!state.completedLessons[lessonKey];
  const base = Math.round(mod.xpReward * (score / total));
  const xpEarned = wasLessonDone ? Math.round(base * 0.5) : (isPerfect ? Math.round(mod.xpReward * 1.25) : base);
  const coinsEarned = wasLessonDone ? Math.round(score * 3) : score * 8;
  state.coins = (state.coins || 0) + coinsEarned;

  const prevLesson = state.completedLessons[lessonKey];
  if (!prevLesson || score > prevLesson.score) {
    state.completedLessons[lessonKey] = { score, total, xpEarned };
  }

  // Mark module complete (for achievements) when any lesson finishes
  const prev = state.completedModules[mod.id];
  if (!prev || score > prev.score) {
    state.completedModules[mod.id] = { score, total, xpEarned };
  }

  const diamondsEarned = updateStreak();
  const leveled = addXP(xpEarned);
  const newAchs = checkAchievements();
  saveState();
  showScreen('screen-results');
  renderResults(mod, score, total, xpEarned, wasLessonDone, newAchs, coinsEarned, diamondsEarned);

  if (leveled) {
    setTimeout(() => {
      document.getElementById('new-tier').textContent = getTier(state.level).name;
      document.getElementById('levelup-overlay').classList.add('visible');
    }, 700);
  }
}

function renderResults(mod, score, total, xpEarned, wasReplay, newAchs, coinsEarned, diamondsEarned) {
  const pct = score / total;
  let grade, title;
  if (pct === 1)       { grade = 'Perfect'; title = 'Perfect Score'; }
  else if (pct >= 0.8) { grade = 'Excellent'; title = 'Almost Perfect'; }
  else if (pct >= 0.6) { grade = 'Good'; title = 'Good Work'; }
  else                 { grade = 'Keep Going'; title = 'Keep Practicing'; }

  const breakdown = state.sessionAnswers.map((a, i) => {
    const q = state.sessionQuestions[i];
    const short = q.opts[q.correct].length > 42 ? q.opts[q.correct].substring(0, 42) + '…' : q.opts[q.correct];
    return `<div class="breakdown-item">
      <span class="result-q">Q${i+1}: ${short}</span>
      <span class="result-a ${a.isCorrect ? 'right' : 'wrong'}">${a.isCorrect ? 'Correct' : 'Wrong'}</span>
    </div>`;
  }).join('');

  const achHtml = newAchs.map(a =>
    `<div class="new-ach-banner"><span class="ach-abbr">${a.abbr}</span><div><strong>Unlocked: ${a.label}</strong><span>${a.desc}</span></div></div>`
  ).join('');
  const diamondHtml = diamondsEarned > 0 ? buildStreakDiamondBanner(diamondsEarned) : '';
  const gradHtml = newAchs.some(a => a.id === 'stackd_star') ? buildGraduationBanner() : '';

  document.getElementById('results-wrap').innerHTML = `
    <div class="results-grade">${grade}</div>
    <h2 class="results-title">${title}</h2>
    <p class="results-score">You got <strong>${score} out of ${total}</strong> correct${wasReplay ? ' · replay (0.5× XP)' : ''}</p>
    <div class="results-rewards-row">
      <div class="results-xp-card">
        <div class="results-xp-num">+${xpEarned} XP</div>
        <div class="results-xp-label">${getTier(state.level).name} · ${state.xp.toLocaleString()} total</div>
      </div>
      <div class="results-coins-card">
        <div class="results-coins-num">+${coinsEarned || 0} 🪙</div>
        <div class="results-xp-label">${(state.coins || 0).toLocaleString()} total coins</div>
      </div>
    </div>
    ${gradHtml}
    ${diamondHtml}
    ${achHtml}
    <div class="results-breakdown">${breakdown}</div>
    <div class="results-actions">
      <button class="btn-primary" id="res-home">Back to Dashboard</button>
      <button class="btn-secondary" id="res-replay">Replay Module</button>
    </div>`;

  document.getElementById('res-home').addEventListener('click', renderHome);
  document.getElementById('res-replay').addEventListener('click', () => showModuleDetail(mod.id));
}

// ══════════════════════════════════════════════
// QUEST ENGINE — narrative-driven modules (Phase 1 pilot: Credit)
// ══════════════════════════════════════════════

function hasQuest(mod) { return Array.isArray(mod.quests) && mod.quests.length > 0; }
function questKey(moduleId, questId) { return `${moduleId}::${questId}`; }
function getActiveQuest(mod) { return mod.quests.find(q => q.id === state.activeQuestId); }
function getQP(mod) { return state.questProgress[questKey(mod.id, state.activeQuestId)]; }

// Formats a plain number as "$N" or a negative one as "-$N" (never "$-N").
function formatMoney(val) {
  const rounded = Math.round(val);
  return rounded < 0 ? `-$${Math.abs(rounded)}` : `$${rounded}`;
}

function tweenNumber(el, from, to, { duration = 600, prefix = '', decimals = 0, money = false } = {}) {
  const start = performance.now();
  (function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + (to - from) * eased;
    el.textContent = money ? formatMoney(val) : prefix + val.toFixed(decimals);
    if (t < 1) requestAnimationFrame(frame);
  })(start);
}

function startQuest(moduleId, questId) {
  const mod = MODULES.find(m => m.id === moduleId);
  const quest = mod.quests.find(q => q.id === questId);
  state.activeModuleId = moduleId;
  state.activeQuestId = questId;
  const key = questKey(moduleId, questId);
  const existing = state.questProgress[key];
  if (!existing || existing.done) {
    state.questProgress[key] = {
      chapterIdx: 0,
      dashboard: { ...quest.initialState },
      chapterScore: 0,
      chapterTotal: 0,
      streak: 0,
      done: false,
      learnedTerms: [],
      hintsUsed: 0,
      analytics: { knowledgeCheck: [], mythCards: [], polls: [], matchingMistakes: 0, explainback: null, decisions: [], bossChoice: null },
    };
  } else {
    // Defensive backfill in case this progress was saved before these fields existed.
    existing.learnedTerms = existing.learnedTerms || [];
    existing.hintsUsed = existing.hintsUsed || 0;
    existing.analytics = existing.analytics || { knowledgeCheck: [], mythCards: [], polls: [], matchingMistakes: 0, explainback: null, decisions: [], bossChoice: null };
    existing.analytics.polls = existing.analytics.polls || [];
  }
  saveState();
  showScreen('screen-quest');
  renderChapter(mod, state.questProgress[key].chapterIdx);
}

// Status label for a specific quest tile in the module list (not necessarily the active quest).
function questLabel(mod, quest) {
  const qp = state.questProgress[questKey(mod.id, quest.id)];
  const total = quest.chapters.length;
  if (!qp) return `${total} chapters`;
  if (qp.done) return 'Quest complete';
  if (qp.chapterIdx > 0) return `Chapter ${qp.chapterIdx + 1}/${total}`;
  return `${total} chapters`;
}

// Chapter types that are pure narrative/reading — no live Hammy reaction avatar needed
// (his small inline dialogue portrait already appears within the story beats themselves).
const HAMMY_SIDE_HIDDEN_TYPES = ['story'];

// Every chapter type's big pink title now lives in one shared banner above the two-column
// layout (flush with the true left edge of the screen) instead of each renderer drawing its
// own copy indented inside the content column. Chapter types not listed keep their own
// in-content tag treatment (teach/hint use a small pill instead) and show no shared title.
const CHAPTER_TITLE_FALLBACK = {
  matching: 'Match It!',
  explainback: 'In Your Own Words',
  decision: 'Decision Point',
  microsim: 'Micro-Sim',
  mythcards: 'Myth or Fact?',
  simulator: 'Simulator',
  knowledgecheck: 'Quick Check',
  poll: 'Quick Poll',
};
function getChapterTitle(chapter) {
  if (chapter.type === 'bossbattle') return chapter.title ? `⚠ Boss Battle: ${chapter.title}` : '⚠ Boss Battle';
  if (chapter.type === 'priceisright') return 'Price Is Right';
  if (chapter.type === 'teach' || chapter.type === 'hint') return '';
  return chapter.title || CHAPTER_TITLE_FALLBACK[chapter.type] || '';
}

// Real pixel measurement of whatever room is left under the sticky header (instead of a vh
// guess), used to make the Hammy/content row fill the screen so both can be vertically
// centered together rather than sitting squished at the top when content is short.
function computeAvailableQuestHeight() {
  const screenEl = document.getElementById('screen-quest');
  const topbarH = document.querySelector('.quest-topbar').offsetHeight;
  const stickyH = document.getElementById('quest-sticky-header').offsetHeight;
  const bodyStyles = getComputedStyle(document.getElementById('quest-body'));
  const bodyPadV = parseFloat(bodyStyles.paddingTop) + parseFloat(bodyStyles.paddingBottom);
  const titleH = document.getElementById('quest-title-row').offsetHeight;
  return screenEl.clientHeight - topbarH - stickyH - bodyPadV - titleH;
}

function renderChapter(mod, idx) {
  const chapters = getActiveQuest(mod).chapters;
  const chapter = chapters[idx];
  const total = chapters.length;

  const pct = Math.round((idx / total) * 100);
  document.getElementById('quest-prog-fill').style.width = pct + '%';
  document.getElementById('quest-pct').textContent = pct + '%';
  document.getElementById('quest-counter').textContent = `Step ${idx + 1} of ${total}`;
  renderQuestDashboard(mod);
  document.getElementById('quest-dashboard').classList.toggle('highlight', !!chapter.highlightDashboard);
  renderGlossaryTray(mod);
  renderHintBudget(mod, chapter.type, chapter.hintText);
  clearQuestContinue();
  const titleRow = document.getElementById('quest-title-row');
  titleRow.textContent = getChapterTitle(chapter);
  titleRow.classList.remove('centered');
  document.getElementById('quest-layout').style.minHeight = Math.max(240, computeAvailableQuestHeight()) + 'px';

  // Reset the persistent Hammy to a neutral idle pose for the new chapter.
  const questSide = document.getElementById('quest-side');
  const hammySide = document.getElementById('hammy-side-avatar');
  const hammyMsg = document.getElementById('hammy-side-msg');
  questSide.style.display = HAMMY_SIDE_HIDDEN_TYPES.includes(chapter.type) ? 'none' : 'flex';
  hammySide.className = 'hammy-side-avatar';
  hammySide.innerHTML = getPigMarkup(window.innerWidth <= 768 ? 0.42 : 0.64);
  hammyMsg.className = 'hammy-side-msg';
  hammyMsg.textContent = '';

  document.getElementById('quest-main').innerHTML = '';

  const onDone = () => advanceChapter(mod);

  switch (chapter.type) {
    case 'story': renderStoryChapter(chapter, mod, onDone); break;
    case 'teach': renderTeachChapter(chapter, mod, onDone); break;
    case 'hint': renderHintChapter(chapter, mod, onDone); break;
    case 'matching': renderMatchingChapter(chapter, mod, onDone); break;
    case 'explainback': renderExplainbackChapter(chapter, mod, onDone); break;
    case 'decision': renderDecisionChapter(chapter, mod, onDone); break;
    case 'microsim': renderMicrosimChapter(chapter, mod, onDone); break;
    case 'poll': renderPollChapter(chapter, mod, onDone); break;
    case 'mythcards': renderMythCardsChapter(chapter, mod, onDone); break;
    case 'knowledgecheck': renderKnowledgeCheckChapter(chapter, mod, onDone); break;
    case 'simulator': renderSimulatorChapter(chapter, mod, onDone); break;
    case 'priceisright': renderPriceIsRightChapter(chapter, mod, onDone); break;
    case 'bossbattle': renderBossBattleChapter(chapter, mod); break;
  }
}

// Shared top-right Continue control — every chapter renderer calls this instead of
// building its own button, so Continue is always in the same reachable spot (never at
// the bottom of long content) and visually "lights up" green only once it's actually usable.
function setQuestContinue(label, onClick, enabled = true) {
  const el = document.getElementById('quest-continue-slot');
  el.innerHTML = `<button class="quest-continue-fab ${enabled ? 'ready' : ''}" id="quest-continue-btn" ${enabled ? '' : 'disabled'}>${label}</button>`;
  if (enabled && onClick) document.getElementById('quest-continue-btn').addEventListener('click', onClick);
}
function clearQuestContinue() {
  document.getElementById('quest-continue-slot').innerHTML = '';
}

function advanceChapter(mod) {
  const qp = getQP(mod);
  qp.chapterIdx++;
  saveState();
  if (qp.chapterIdx < getActiveQuest(mod).chapters.length) {
    renderChapter(mod, qp.chapterIdx);
  }
}

function renderQuestDashboard(mod) {
  const dash = getQP(mod).dashboard;
  const labels = { creditScore: 'Credit Score', checking: 'Checking', savings: 'Savings' };
  const el = document.getElementById('quest-dashboard');
  el.innerHTML = Object.keys(dash).map(key => {
    const isMoney = key !== 'creditScore';
    return `<div class="quest-stat-chip" data-key="${key}">
      <span class="qs-label">${labels[key] || key}</span>
      <span class="qs-val">${isMoney ? formatMoney(dash[key]) : Math.round(dash[key])}</span>
    </div>`;
  }).join('');
}

// Applies a {key: delta} object to a module's live quest dashboard, animates the affected
// chips in the sticky bar, and persists — used by decision/boss-battle chapters.
function applyQuestStateDelta(mod, delta) {
  const qp = getQP(mod);
  const changes = [];
  Object.keys(delta).forEach(key => {
    const from = qp.dashboard[key] ?? 0;
    let to = from + delta[key];
    if (key === 'creditScore') to = Math.max(300, Math.min(850, to));
    qp.dashboard[key] = to;
    changes.push({ key, from, to });
  });
  saveState();
  changes.forEach(({ key, from, to }) => {
    const chipWrap = document.querySelector(`.quest-stat-chip[data-key="${key}"]`);
    if (!chipWrap) return;
    const chipVal = chipWrap.querySelector('.qs-val');
    const isMoney = key !== 'creditScore';
    chipWrap.classList.remove('qs-up', 'qs-down');
    if (to !== from) chipWrap.classList.add(to > from ? 'qs-up' : 'qs-down');
    tweenNumber(chipVal, from, to, { money: isMoney });
    setTimeout(() => chipWrap.classList.remove('qs-up', 'qs-down'), 1400);
  });
  return changes;
}

// Compact Hammy face (reuses the existing pig markup, cropped to just the head via .pig-head-stage).
function getHammyFaceMarkup(scale) {
  return getPigMarkup(scale).replace('class="pig-stage"', 'class="pig-stage pig-head-stage"');
}

// Glossary tray — every term taught moves here once the student clicks past it, so they can
// always tap back and reread a definition instead of it disappearing for good.
function pushLearnedTerm(mod, term, plain) {
  const qp = getQP(mod);
  if (!qp.learnedTerms) qp.learnedTerms = [];
  if (!qp.learnedTerms.some(t => t.term === term)) qp.learnedTerms.push({ term, plain });
  saveState();
  renderGlossaryTray(mod);
}

function renderGlossaryTray(mod) {
  const tray = document.getElementById('glossary-tray');
  if (!tray) return;
  const terms = (getQP(mod).learnedTerms) || [];
  if (!terms.length) { tray.innerHTML = ''; tray.classList.remove('show'); return; }
  tray.classList.add('show');
  tray.innerHTML = `<span class="glossary-label">📖 Look back:</span>` + terms.map((t, i) =>
    `<button class="glossary-chip" data-idx="${i}">${t.term.replace(/\s*\(.*?\)/, '')}</button>`
  ).join('');
  tray.querySelectorAll('.glossary-chip').forEach(btn => {
    btn.addEventListener('click', () => showGlossaryPopup(terms[Number(btn.dataset.idx)]));
  });
}

function showGlossaryPopup(term) {
  let modal = document.getElementById('glossary-popup');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'glossary-popup';
    modal.className = 'glossary-popup-overlay';
    document.getElementById('screen-quest').appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
  }
  modal.innerHTML = `<div class="glossary-popup-card">
    <div class="glossary-popup-term">${term.term}</div>
    <p class="glossary-popup-def">${term.plain}</p>
    <button class="btn-primary" id="glossary-popup-close">Got it</button>
  </div>`;
  modal.classList.add('show');
  document.getElementById('glossary-popup-close').addEventListener('click', () => modal.classList.remove('show'));
}

// Limited "Ask Hammy for a hint" budget — available during interactive chapters only,
// so getting stuck on a decision/question doesn't leave the student with nowhere to turn.
const HINT_BUDGET = 3;
const HINT_FREE_CHAPTER_TYPES = ['story', 'teach', 'hint'];

function renderHintBudget(mod, chapterType, hintText) {
  const el = document.getElementById('hint-budget');
  if (!el) return;
  if (HINT_FREE_CHAPTER_TYPES.includes(chapterType)) {
    el.innerHTML = '';
    return;
  }
  const qp = getQP(mod);
  const remaining = Math.max(0, HINT_BUDGET - (qp.hintsUsed || 0));
  el.innerHTML = `<button class="hint-ask-btn" id="hint-ask-btn" ${remaining <= 0 ? 'disabled' : ''}>💡 Hint (${remaining} left)</button>`;
  const btn = document.getElementById('hint-ask-btn');
  if (btn && remaining > 0) {
    btn.addEventListener('click', () => {
      qp.hintsUsed = (qp.hintsUsed || 0) + 1;
      saveState();
      renderHintBudget(mod, chapterType, hintText);
      showGlossaryPopup({
        term: "🐷 Hammy's Hint",
        plain: hintText || "Reread the question closely. One phrase in the options usually gives it away."
      });
    });
  }
}

// Maya — same Hammy mascot, wearing a purple bow, so the story has a consistent
// character design instead of a separately-drawn human avatar. Custom bow (not the shared
// pink progression accessory), sitting on the side of her left ear at a jaunty tilt,
// Hello Kitty style, instead of centered low on the head.
const MAYA_BOW_SVG = `
  <g transform="translate(30,34) rotate(-20)">
    <path d="M0 0 C -6 -5, -13 -4, -12 2 C -11 7, -5 6, 0 0 Z" fill="#8A4FD6"/>
    <path d="M0 0 C 6 -5, 13 -4, 12 2 C 11 7, 5 6, 0 0 Z" fill="#8A4FD6"/>
    <path d="M-2 3 L -4.5 9 L -0.5 6 Z" fill="#6B35B8"/>
    <path d="M2 3 L 4.5 9 L 0.5 6 Z" fill="#6B35B8"/>
    <circle cx="0" cy="1" r="2.6" fill="#6B35B8"/>
  </g>
`;

function getMayaMarkup(scale) {
  return getPigWithItemMarkup(scale, MAYA_BOW_SVG);
}

// Maya's face only (no body) — used in dialogue avatars where a full-body illustration
// would be too large and unnecessary.
function getMayaFaceMarkup(scale) {
  return getPigWithItemMarkup(scale, MAYA_BOW_SVG).replace('class="pig-stage"', 'class="pig-stage pig-head-stage"');
}

const HAMMY_CORRECT_MSGS = ['Nice! 🎉', 'Nice one! 🙌', 'You got it!', 'Great job!'];
// "Here's why / here's what's true" only makes sense when an explanation is actually shown
// nearby (quick checks, myth cards, price guesses, decisions). Matching has no explanation to
// point to — it's just a retry — so it gets its own, context-appropriate phrasing.
const HAMMY_GENTLE_MSGS = ["Not quite! Here's why:", "Not quite, let's learn from it:", "Close! Here's what's true:"];
const HAMMY_TRYAGAIN_MSGS = ["Not quite, try again!", "Close, give it another shot!", "Not quite, look at the definitions above if you're stuck."];
const HAMMY_OUTCOME_GENTLE_MSGS = ["Hmm, that one stings a bit.", "That'll cost her some points.", "Not the best move there."];

// Shared emotional-feedback moment, used after EVERY activity across the whole quest (knowledge
// checks, myth cards, matching, decisions, the simulator, price guesses, the boss battle): the
// persistent Hammy pinned top-left reacts happy/gentle in place, and tracks a running
// correct-streak for 3-in-a-row — no new avatar is created, he's always already there. The
// bubble auto-clears itself a couple seconds later so it never sits stale through a later,
// unrelated activity in the same chapter (e.g. a second question, or a chapter with no
// true/false check at all).
function showHammyReaction(mod, isCorrect, context = 'answer') {
  const avatar = document.getElementById('hammy-side-avatar');
  const msgEl = document.getElementById('hammy-side-msg');
  if (!avatar || !msgEl) return;
  const qp = getQP(mod);
  qp.streak = isCorrect ? (qp.streak || 0) + 1 : 0;
  saveState();

  const gentleSet = context === 'match' ? HAMMY_TRYAGAIN_MSGS : context === 'outcome' ? HAMMY_OUTCOME_GENTLE_MSGS : HAMMY_GENTLE_MSGS;
  let msg = isCorrect
    ? HAMMY_CORRECT_MSGS[Math.floor(Math.random() * HAMMY_CORRECT_MSGS.length)]
    : gentleSet[Math.floor(Math.random() * gentleSet.length)];
  const isStreak = isCorrect && qp.streak > 0 && qp.streak % 3 === 0;
  if (isStreak) msg = `🎉 ${qp.streak} in a row! You're on fire!`;

  clearTimeout(msgEl._hideTimer);
  msgEl.textContent = msg;
  avatar.className = 'hammy-side-avatar';
  msgEl.className = 'hammy-side-msg';
  void avatar.offsetWidth; // restart CSS animations
  avatar.classList.add(isCorrect ? 'happy' : 'gentle');
  msgEl.classList.add('show', isCorrect ? 'happy' : 'gentle');
  if (isStreak) { avatar.classList.add('streak'); msgEl.classList.add('streak'); }
  setTimeout(() => avatar.classList.remove('happy', 'gentle', 'streak'), 1300);
  msgEl._hideTimer = setTimeout(() => {
    msgEl.classList.remove('show');
    setTimeout(() => { if (!msgEl.classList.contains('show')) msgEl.textContent = ''; }, 320);
  }, 2400);
}

// Puts specific, given text (rather than a random pick) in Hammy's speech bubble — used where
// the "reaction" IS the explanation itself (e.g. Credit Climb narrating what each decision
// actually does), so it needs longer on screen than a quick "Nice!".
function showHammyMessage(text, isGood) {
  const avatar = document.getElementById('hammy-side-avatar');
  const msgEl = document.getElementById('hammy-side-msg');
  if (!avatar || !msgEl) return;
  clearTimeout(msgEl._hideTimer);
  msgEl.textContent = text;
  avatar.className = 'hammy-side-avatar';
  msgEl.className = 'hammy-side-msg';
  void avatar.offsetWidth;
  avatar.classList.add(isGood ? 'happy' : 'gentle');
  msgEl.classList.add('show', isGood ? 'happy' : 'gentle');
  setTimeout(() => avatar.classList.remove('happy', 'gentle'), 1300);
  msgEl._hideTimer = setTimeout(() => {
    msgEl.classList.remove('show');
    setTimeout(() => { if (!msgEl.classList.contains('show')) msgEl.textContent = ''; }, 320);
  }, 4500);
}

// ── Chapter type: teach (plain-English concept explainer) ──
function renderTeachChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  const concepts = chapter.concepts;
  let idx = 0;

  function renderConcept() {
    const c = concepts[idx];
    const isLast = idx === concepts.length - 1;
    clearQuestContinue();
    main.innerHTML = `
      <div class="teach-tag">💡 New Word${concepts.length > 1 ? ` · ${idx + 1}/${concepts.length}` : ''}</div>
      <div class="speech-bubble teach-bubble">
        <div class="teach-term">${c.term}</div>
        <p class="teach-plain">${c.plain}</p>
        <div class="teach-analogy"><span class="teach-analogy-tag">Think of it like this</span>${c.analogy}</div>
      </div>
      <div class="word-check" id="word-check"></div>`;

    // A quick true/false recall check right after the word — so the student engages with
    // it once before moving on, instead of just clicking through a string of definitions.
    if (c.check) {
      const checkEl = document.getElementById('word-check');
      checkEl.innerHTML = `
        <div class="word-check-label">Quick check: true or false?</div>
        <p class="word-check-statement">${c.check.statement}</p>
        <div class="word-check-btns">
          <button class="option-btn word-check-btn" data-answer="true">True</button>
          <button class="option-btn word-check-btn" data-answer="false">False</button>
        </div>`;
      checkEl.querySelectorAll('.word-check-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const answer = btn.dataset.answer === 'true';
          const isCorrect = answer === c.check.isTrue;
          checkEl.querySelectorAll('.word-check-btn').forEach(b => {
            b.disabled = true;
            if ((b.dataset.answer === 'true') === c.check.isTrue) b.classList.add('correct');
            else if (b === btn) b.classList.add('wrong');
          });
          showHammyReaction(mod, isCorrect);
          readyToAdvance();
        });
      });
    } else {
      readyToAdvance();
    }

    function readyToAdvance() {
      pushLearnedTerm(mod, c.term, c.plain);
      setQuestContinue(isLast ? 'Got it →' : 'Next Word →', () => {
        if (isLast) {
          if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
          onDone();
        } else {
          idx++;
          renderConcept();
        }
      }, true);
    }
  }
  renderConcept();
}

// ── Chapter type: hint (Hammy's quick tips & fun facts) — tap Hammy to hear it ──
function renderHintChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  main.innerHTML = `
    <div class="hint-tag">${chapter.tag || "🎉 Hammy's Tip"}</div>
    <div class="speech-bubble teach-bubble hint-bubble" id="hint-bubble">
      <p class="teach-plain hint-placeholder">Tap Hammy to hear what he has to say.</p>
    </div>`;

  const hammySide = document.getElementById('hammy-side-avatar');
  hammySide.classList.add('hammy-tappable');
  hammySide.addEventListener('click', function revealTip() {
    document.getElementById('hint-bubble').innerHTML = `<p class="teach-plain">${chapter.text}</p>`;
    hammySide.classList.add('happy');
    hammySide.classList.remove('hammy-tappable');
    hammySide.removeEventListener('click', revealTip);
    setQuestContinue('Cool, got it →', () => {
      if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
      onDone();
    }, true);
  });
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Chapter type: matching (repeated-exposure term-to-definition game) ──
function renderMatchingChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  const pairs = chapter.pairs;
  const terms = shuffleArray(pairs.map((p, i) => ({ text: p.term, pairIdx: i })));
  const defs = shuffleArray(pairs.map((p, i) => ({ text: p.definition, pairIdx: i })));

  main.innerHTML = `
    <p class="quest-prompt">Tap a word, then tap the definition that matches it. Take your time, you can try again if you miss.</p>
    <div class="match-terms" id="match-terms"></div>
    <div class="match-defs" id="match-defs"></div>
    <div class="match-progress" id="match-progress">0 of ${pairs.length} matched</div>`;

  const termsEl = document.getElementById('match-terms');
  const defsEl = document.getElementById('match-defs');
  let selectedTermEl = null;
  let selectedPairIdx = null;
  let matchedCount = 0;

  terms.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'match-chip';
    btn.textContent = t.text;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('matched')) return;
      termsEl.querySelectorAll('.match-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTermEl = btn;
      selectedPairIdx = t.pairIdx;
    });
    termsEl.appendChild(btn);
  });

  defs.forEach(d => {
    const card = document.createElement('div');
    card.className = 'match-def-card';
    card.textContent = d.text;
    card.addEventListener('click', () => {
      if (card.classList.contains('matched') || selectedPairIdx === null) return;
      const isCorrect = d.pairIdx === selectedPairIdx;
      showHammyReaction(mod, isCorrect, 'match');
      if (isCorrect) {
        selectedTermEl.classList.remove('selected');
        selectedTermEl.classList.add('matched');
        card.classList.add('matched');
        matchedCount++;
        selectedTermEl = null;
        selectedPairIdx = null;
        document.getElementById('match-progress').textContent = `${matchedCount} of ${pairs.length} matched`;
        if (matchedCount === pairs.length) {
          if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
          setQuestContinue('Continue →', onDone, true);
        }
      } else {
        const qp = getQP(mod);
        qp.analytics.matchingMistakes++;
        saveState();
        const missedTermEl = selectedTermEl;
        card.classList.add('shake');
        missedTermEl.classList.add('shake');
        selectedTermEl = null;
        selectedPairIdx = null;
        setTimeout(() => {
          card.classList.remove('shake');
          missedTermEl.classList.remove('shake', 'selected');
        }, 420);
      }
    });
    defsEl.appendChild(card);
  });
}

// ── Chapter type: explainback (typed self-check, always reinforces the real definition) ──
function renderExplainbackChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  main.innerHTML = `
    <p class="quest-prompt">${chapter.prompt}</p>
    <textarea class="explainback-input" id="eb-input" rows="3" placeholder="Type your answer here. There's no wrong way to start."></textarea>
    <button class="btn-primary" id="eb-check">Check My Answer</button>`;

  document.getElementById('eb-check').addEventListener('click', () => {
    const val = document.getElementById('eb-input').value.toLowerCase();
    const matched = chapter.keywords.filter(k => val.includes(k.toLowerCase())).length;
    let feedbackText, tier;
    if (matched >= 2) { feedbackText = "You got the key idea. Here's the full definition, locked in:"; tier = 'great'; }
    else if (matched === 1) { feedbackText = "Good start, you're onto something. Here's the fuller picture:"; tier = 'ok'; }
    else { feedbackText = "No worries, this one's tricky. Let's go over it one more time:"; tier = 'retry'; }

    const qp = getQP(mod);
    qp.analytics.explainback = { term: chapter.title || 'In Your Own Words', tier };
    saveState();
    document.getElementById('eb-check').remove();
    document.getElementById('eb-input').disabled = true;
    showHammyReaction(mod, matched >= 1);

    const resultBlock = document.createElement('div');
    resultBlock.className = 'explainback-result';
    resultBlock.innerHTML = `
      <p class="explainback-feedback">${feedbackText}</p>
      <p class="explainback-definition">${chapter.fullDefinition}</p>`;
    main.appendChild(resultBlock);
    setQuestContinue('Continue →', () => {
      if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
      onDone();
    }, true);
  });
}

// ── Chapter type: story ─────────────────────────
// Story beats accumulate on screen as a running conversation log — nothing disappears when
// the student clicks Next, so they can never lose track of what's already been said.
function renderStoryChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  const charName = getActiveQuest(mod).character.name;
  main.innerHTML = `<div class="story-log" id="story-log"></div>`;
  const log = document.getElementById('story-log');
  let beatIdx = 0;
  showBeat();

  function showBeat() {
    const beat = chapter.beats[beatIdx];
    const isLast = beatIdx === chapter.beats.length - 1;
    const entry = document.createElement('div');
    // Title centers to match the centered establishing shot, then moves back to the left
    // edge once the beats shift into back-and-forth dialogue.
    document.getElementById('quest-title-row').classList.toggle('centered', beat.speaker === 'intro');

    // "intro" beats are a big establishing shot — the character front-and-center with a
    // caption, used to set the scene before the story shifts into back-and-forth dialogue.
    if (beat.speaker === 'intro') {
      entry.className = 'intro-scene';
      // Measure the room actually left under the sticky header in real pixels (instead of
      // guessing with a vh-minus-constant), then size Maya to fit inside it — so this is
      // always centered with zero scrolling regardless of viewport height.
      const available = computeAvailableQuestHeight();
      const captionBudget = 210; // rough space reserved for the caption + gap below the avatar
      const maxScale = window.innerWidth <= 640 ? 0.62 : 0.85;
      const introScale = Math.max(0.4, Math.min(maxScale, (available - captionBudget) / 460));
      entry.innerHTML = `<div class="intro-avatar">${getMayaMarkup(introScale)}</div><p class="intro-caption">${beat.text}</p>`;
      log.appendChild(entry);
      entry.style.minHeight = Math.max(240, available) + 'px';
    } else {
      const isNarrator = beat.speaker === 'narrator';
      const isMaya = beat.speaker === charName;
      const avatarHtml = isNarrator ? getHammyFaceMarkup(0.13) : isMaya ? getMayaFaceMarkup(0.13) : beat.speaker.charAt(0);
      entry.className = `story-beat ${isNarrator ? 'is-narrator' : ''}`;
      entry.innerHTML = `
        <div class="story-avatar ${isNarrator || isMaya ? 'has-character' : ''}">${avatarHtml}</div>
        <div class="story-bubble ${isNarrator ? 'narrator' : ''}">${beat.text}</div>`;
      log.appendChild(entry);
      entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setQuestContinue(`${isLast ? 'Continue' : 'Next'} →`, () => {
      if (isLast) onDone(); else { beatIdx++; showBeat(); }
    }, true);
  }
}

// ── Chapter type: decision ──────────────────────
function renderDecisionChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  main.innerHTML = `
    <p class="quest-prompt">${chapter.prompt}</p>
    <div class="decision-choices" id="decision-choices"></div>`;
  const choicesEl = document.getElementById('decision-choices');
  chapter.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'option-btn decision-choice-btn';
    btn.textContent = choice.label;
    btn.addEventListener('click', () => {
      choicesEl.querySelectorAll('button').forEach(b => b.disabled = true);
      applyQuestStateDelta(mod, choice.outcome.delta || {});
      const qp = getQP(mod);
      qp.analytics.decisions.push({ title: chapter.title, choice: choice.label });
      saveState();
      const wasGoodChoice = (choice.outcome.delta && choice.outcome.delta.creditScore || 0) >= 0;
      renderDecisionOutcome(chapter, choice.outcome, mod, wasGoodChoice, onDone);
    });
    choicesEl.appendChild(btn);
  });
}

function renderDecisionOutcome(chapter, outcome, mod, wasGoodChoice, onDone) {
  const main = document.getElementById('quest-main');
  const maxVal = Math.max(...outcome.compare.map(c => c.value), 1);
  const barsHtml = outcome.compare.map(c => `
    <div class="pg-col">
      <div class="pg-col-val">$${c.value}</div>
      <div class="pg-col-bar-wrap"><div class="pg-col-bar" style="height:${Math.max(4, c.value / maxVal * 100)}%"></div></div>
      <div class="pg-col-name">${c.label}</div>
    </div>`).join('');
  const outcomeBlock = document.createElement('div');
  outcomeBlock.className = 'decision-outcome';
  outcomeBlock.innerHTML = `
    <p class="quest-outcome-text">${outcome.text}</p>
    <div class="pg-column-chart">${barsHtml}</div>`;
  main.appendChild(outcomeBlock);
  showHammyReaction(mod, wasGoodChoice);
  setQuestContinue('Continue →', () => {
    if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
    onDone();
  }, true);
}

// ── Chapter type: microsim ──────────────────────
function renderMicrosimChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  const fixedTotal = chapter.fixedCosts.reduce((s, c) => s + c.amount, 0);
  const sliderValues = {};
  chapter.sliders.forEach(s => sliderValues[s.id] = s.default);

  const computeLeftover = () => chapter.income - fixedTotal - Object.values(sliderValues).reduce((a, b) => a + b, 0);

  const costsHtml = chapter.fixedCosts.map(c => `<div class="microsim-cost-row"><span>${c.label}</span><span>$${c.amount}</span></div>`).join('');
  const slidersHtml = chapter.sliders.map(s => `
    <div class="microsim-slider-row">
      <div class="microsim-slider-label"><span>${s.label}</span><span class="microsim-slider-val" id="ms-val-${s.id}">$${s.default}</span></div>
      <input type="range" class="microsim-range" id="ms-${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.default}">
    </div>`).join('');

  main.innerHTML = `
    <p class="quest-prompt">${chapter.prompt}</p>
    <div class="microsim-costs">
      <div class="microsim-cost-row microsim-income-row"><span>Monthly income</span><span>$${chapter.income}</span></div>
      ${costsHtml}
    </div>
    <div class="microsim-sliders">${slidersHtml}</div>
    <div class="microsim-leftover-row"><span>Left over</span><span class="microsim-leftover" id="microsim-leftover">$${computeLeftover()}</span></div>`;

  chapter.sliders.forEach(s => {
    document.getElementById(`ms-${s.id}`).addEventListener('input', (e) => {
      sliderValues[s.id] = parseInt(e.target.value, 10);
      document.getElementById(`ms-val-${s.id}`).textContent = `$${sliderValues[s.id]}`;
      const leftover = computeLeftover();
      const leftoverEl = document.getElementById('microsim-leftover');
      leftoverEl.textContent = `$${leftover}`;
      leftoverEl.classList.toggle('negative', leftover < 0);
    });
  });

  // Lock In Budget lives in the shared top-right Continue slot, same as every other chapter.
  function lockBudget() {
    const leftover = computeLeftover();
    const tier = chapter.feedbackTiers.find(t => leftover <= t.maxLeftover);
    clearQuestContinue();
    const resultBlock = document.createElement('div');
    resultBlock.className = `microsim-result ${tier.ok ? 'ok' : 'bad'}`;
    showHammyReaction(mod, tier.ok);
    if (tier.ok) {
      resultBlock.innerHTML = `<p>${tier.text}</p>`;
      main.appendChild(resultBlock);
      setQuestContinue('Continue →', () => {
        if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
        onDone();
      }, true);
    } else {
      resultBlock.innerHTML = `<p>${tier.text}</p><button class="btn-secondary" id="microsim-retry-btn">Try Again</button>`;
      main.appendChild(resultBlock);
      document.getElementById('microsim-retry-btn').addEventListener('click', () => {
        renderMicrosimChapter(chapter, mod, onDone);
      });
    }
  }
  setQuestContinue('Lock In Budget →', lockBudget, true);
}

// ── Chapter type: mythcards (swipeable stack) ───
// ── Chapter type: poll (crowd-guess before myth-busting) ───────────
// Mirrors the myth-cards tag/reveal styling that immediately follows it, so the two chapter
// types read as one continuous "test your assumptions" beat rather than two different UIs.
function renderPollChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  main.innerHTML = `
    <p class="quest-prompt">${chapter.intro || "Before we bust some myths, guess what most people believe."}</p>
    <div class="poll-card">
      <span class="myth-card-tag">TRUE OR FALSE?</span>
      <p class="poll-statement">${chapter.statement}</p>
      <div class="poll-choices" id="poll-choices">
        <button class="option-btn poll-choice-btn" data-choice="true">True</button>
        <button class="option-btn poll-choice-btn" data-choice="false">False</button>
      </div>
    </div>
    <div class="poll-reveal" id="poll-reveal"></div>`;

  document.getElementById('poll-choices').querySelectorAll('.poll-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const guessedTrue = btn.dataset.choice === 'true';
      const guessedRight = guessedTrue === chapter.isTrue;
      document.getElementById('poll-choices').querySelectorAll('button').forEach(b => {
        b.disabled = true;
        const bIsTrue = b.dataset.choice === 'true';
        if (bIsTrue === chapter.isTrue) b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
      });

      const qp = getQP(mod);
      qp.analytics.polls = qp.analytics.polls || [];
      qp.analytics.polls.push({ statement: chapter.statement, isTrue: chapter.isTrue, guessedRight });
      saveState();
      showHammyReaction(mod, guessedRight);

      const maxPct = Math.max(...chapter.pollResults.map(r => r.pct), 1);
      const barsHtml = chapter.pollResults.map(r => `
        <div class="pg-col">
          <div class="pg-col-val">${r.pct}%</div>
          <div class="pg-col-bar-wrap"><div class="pg-col-bar ${r.label === 'False' ? 'pg-col-pink' : ''}" style="height:${Math.max(4, r.pct / maxPct * 100)}%"></div></div>
          <div class="pg-col-name">${r.label}</div>
        </div>`).join('');

      const revealEl = document.getElementById('poll-reveal');
      revealEl.innerHTML = `
        <p class="poll-crowd-label">${chapter.sampleSize ? `Here's how ${chapter.sampleSize} voted:` : "Here's how the crowd voted:"}</p>
        <div class="pg-column-chart">${barsHtml}</div>
        <div class="poll-truth ${chapter.isTrue ? 'is-true' : 'is-false'}">
          <span class="myth-card-tag">${chapter.isTrue ? 'THIS IS A FACT' : 'THIS IS A MYTH'}</span>
          <p class="poll-explanation">${chapter.explanation}</p>
        </div>`;
      revealEl.classList.add('show');

      setQuestContinue('Continue →', () => {
        if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
        onDone();
      }, true);
    });
  });
}

function renderMythCardsChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  main.innerHTML = `
    <p class="quest-prompt">Read the card, then swipe right if you think it's <strong>true</strong>, left if you think it's <strong>false</strong>. Take your time. The answer stays on screen until you're ready to move on.</p>
    <div class="myth-card-stack" id="myth-card-stack"></div>
    <div class="myth-next-wrap" id="myth-next-wrap"></div>
    <div class="myth-progress" id="myth-progress">Card 1 of ${chapter.cards.length}</div>`;

  let correctCount = 0;
  const qp = getQP(mod);
  initMythCardStack(document.getElementById('myth-card-stack'), chapter.cards, (result) => {
    correctCount += result.guessedRight ? 1 : 0;
    const card = chapter.cards[result.cardIndex];
    qp.analytics.mythCards.push({ myth: card.myth, isTrue: card.isTrue, guessedRight: result.guessedRight });
    saveState();
    showHammyReaction(mod, result.guessedRight);
    const progressEl = document.getElementById('myth-progress');
    if (progressEl) progressEl.textContent = `Card ${Math.min(result.cardIndex + 2, chapter.cards.length)} of ${chapter.cards.length}`;
  }, () => {
    // Last card resolved — finish immediately, no extra recap screen or second Continue tap.
    if (chapter.xpPerCorrect) { addXP(correctCount * chapter.xpPerCorrect); saveState(); }
    onDone();
  });
}

// Swipeable myth/fact stack. Swiping commits a guess and flips the card to reveal the answer
// immediately, but the card does NOT auto-advance — the user reads at their own pace and taps
// "Next Card" when ready, so the reveal is never cut off.
function initMythCardStack(container, cards, onCardResolved, onAllDone) {
  let cardIdx = 0;
  const nextWrap = () => document.getElementById('myth-next-wrap');

  function renderCards() {
    container.innerHTML = '';
    if (nextWrap()) nextWrap().innerHTML = '';
    const visible = cards.slice(cardIdx, cardIdx + 3);
    visible.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'myth-card';
      el.innerHTML = `
        <div class="myth-card-inner">
          <div class="myth-card-front">
            <span class="myth-card-tag">MYTH OR FACT?</span>
            <p>${card.myth}</p>
            <span class="myth-swipe-hint">← False &nbsp;·&nbsp; True →</span>
          </div>
          <div class="myth-card-back ${card.isTrue ? 'is-true' : 'is-false'}">
            <span class="myth-card-tag">${card.isTrue ? 'THIS IS A FACT' : 'THIS IS A MYTH'}</span>
            <p class="myth-guess-line"></p>
            <p class="myth-explanation">${card.explanation}</p>
          </div>
        </div>`;
      container.appendChild(el);
      if (i === 0) wireDrag(el, card);
    });
  }

  function wireDrag(el, card) {
    let startX = 0, dx = 0, dragging = false;
    el.addEventListener('pointerdown', (e) => {
      dragging = true; startX = e.clientX; el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      el.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
      el.style.borderColor = dx > 30 ? 'var(--green)' : dx < -30 ? 'var(--pink)' : '';
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      if (Math.abs(dx) > 90) {
        const guessedTrue = dx > 0;
        const guessedRight = guessedTrue === card.isTrue;
        el.style.transform = `translateX(${dx > 0 ? 40 : -40}px) rotate(${dx / 30}deg)`;
        el.classList.add('flipped');

        const guessLine = el.querySelector('.myth-guess-line');
        guessLine.textContent = `You said ${guessedTrue ? 'True' : 'False'}, ${guessedRight ? 'and that is right.' : 'not quite.'}`;
        guessLine.classList.add(guessedRight ? 'right' : 'wrong');

        const resolvedIdx = cardIdx;
        onCardResolved({ cardIndex: resolvedIdx, guessedRight });

        const isLastCard = resolvedIdx === cards.length - 1;
        const btn = document.createElement('button');
        btn.className = 'btn-primary quest-continue-btn';
        btn.textContent = isLastCard ? 'Continue →' : 'Next Card →';
        btn.addEventListener('click', () => {
          el.classList.add(dx > 0 ? 'fly-right' : 'fly-left');
          btn.remove();
          setTimeout(() => {
            cardIdx++;
            if (cardIdx >= cards.length) onAllDone(); else renderCards();
          }, 400);
        });
        if (nextWrap()) nextWrap().appendChild(btn);
      } else {
        el.style.transform = '';
        el.style.borderColor = '';
      }
      dx = 0;
    }
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  }

  renderCards();
}

// ── Chapter type: simulator (registry) ──────────
const SIMULATORS = {
  'credit-climb': {
    render(container, chapter, mod, onDone) {
      const qp = getQP(mod);
      let score = qp.dashboard.creditScore;
      const usedIds = new Set();
      const pctFor = s => Math.max(0, Math.min(100, (s - 300) / (850 - 300) * 100));

      function render() {
        container.innerHTML = `
          <p class="quest-prompt">${chapter.intro}</p>
          <div class="sim-meter-wrap">
            <div class="sim-meter-score" id="sim-score">${Math.round(score)}</div>
            <div class="sim-meter-track"><div class="sim-meter-marker" id="sim-marker" style="left:${pctFor(score)}%"></div></div>
            <div class="sim-meter-scale"><span>300</span><span>850</span></div>
          </div>
          <div class="sim-decisions" id="sim-decisions">
            ${chapter.decisions.map(d => `<button class="option-btn sim-decision-btn" data-id="${d.id}" ${usedIds.has(d.id) ? 'disabled' : ''}>${d.label}</button>`).join('')}
          </div>`;

        container.querySelectorAll('.sim-decision-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const d = chapter.decisions.find(x => x.id === btn.dataset.id);
            usedIds.add(d.id);
            const from = score;
            score = Math.max(300, Math.min(850, score + d.scoreDelta));
            qp.dashboard.creditScore = score;
            saveState();
            renderQuestDashboard(mod);
            document.getElementById('sim-marker').style.left = pctFor(score) + '%';
            tweenNumber(document.getElementById('sim-score'), from, score, {});
            // Hammy narrates the actual explanation for this decision, in his speech bubble,
            // instead of a generic "Nice!"/"Not quite" reaction.
            showHammyMessage(d.note, d.scoreDelta >= 0);
            btn.disabled = true;
            if (usedIds.size === chapter.decisions.length) {
              setQuestContinue('Continue →', () => {
                if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
                onDone();
              }, true);
            }
          });
        });
      }
      render();
    }
  }
};

function renderSimulatorChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  main.innerHTML = '';
  const container = document.createElement('div');
  main.appendChild(container);
  const sim = SIMULATORS[chapter.simulatorId];
  if (sim) sim.render(container, chapter, mod, onDone);
}

// ── Chapter type: priceisright ──────────────────
function renderPriceIsRightChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  const range = chapter.guessRange;
  let guess = Math.round((range.min + range.max) / 2 / range.step) * range.step;
  main.innerHTML = `
    <p class="quest-prompt">${chapter.prompt}</p>
    <div class="price-guess-display" id="price-guess-display">$${guess}</div>
    <input type="range" class="microsim-range" id="price-slider" min="${range.min}" max="${range.max}" step="${range.step}" value="${guess}">
    <button class="btn-primary price-reveal-btn" id="price-reveal">Lock In Guess</button>`;

  document.getElementById('price-slider').addEventListener('input', (e) => {
    guess = parseInt(e.target.value, 10);
    document.getElementById('price-guess-display').textContent = `$${guess}`;
  });
  document.getElementById('price-reveal').addEventListener('click', () => {
    document.getElementById('price-reveal').remove();
    document.getElementById('price-slider').disabled = true;
    const diff = Math.abs(guess - chapter.actualValue);
    const wasClose = diff <= (range.max - range.min) * 0.15;
    tweenNumber(document.getElementById('price-guess-display'), guess, chapter.actualValue, { prefix: '$' });
    const revealBlock = document.createElement('div');
    revealBlock.className = 'price-reveal-block';
    revealBlock.innerHTML = `
      <p class="price-actual-label">Actual answer: $${chapter.actualValue} <span class="price-diff">(you were $${diff} off)</span></p>
      <p>${chapter.explanation}</p>`;
    main.appendChild(revealBlock);
    showHammyReaction(mod, wasClose);
    setQuestContinue('Continue →', () => {
      if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
      onDone();
    }, true);
  });
}

// ── Chapter type: knowledgecheck (reuses buildQuestionBlock) ──
function renderKnowledgeCheckChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  const qp = getQP(mod);
  const questions = chapter.qIndices.map(i => mod.questions[i]);
  let qIdx = 0;

  function renderQ() {
    clearQuestContinue();
    // Per-question hints (chapter.hintTexts is aligned with chapter.qIndices order).
    renderHintBudget(mod, 'knowledgecheck', chapter.hintTexts ? chapter.hintTexts[qIdx] : chapter.hintText);

    const q = questions[qIdx];
    main.innerHTML = `
      <div class="quest-kc-counter">Question ${qIdx + 1} of ${questions.length}</div>
      <div class="kc-split">
        <div class="kc-split-left">
          <p class="question-text" id="kc-question"></p>
          <div class="options" id="kc-options"></div>
        </div>
        <div class="kc-split-right">
          <div class="feedback-panel kc-panel" id="kc-feedback-panel">
            <div class="feedback-indicator"></div>
            <div class="feedback-text">
              <p class="feedback-label" id="kc-feedback-label"></p>
              <p class="feedback-exp" id="kc-feedback-exp"></p>
            </div>
            <button class="btn-next" id="kc-next">Next</button>
          </div>
        </div>
      </div>`;

    buildQuestionBlock(q, {
      questionEl: document.getElementById('kc-question'),
      optionsEl: document.getElementById('kc-options'),
      feedbackPanelEl: document.getElementById('kc-feedback-panel'),
      feedbackLabelEl: document.getElementById('kc-feedback-label'),
      feedbackExpEl: document.getElementById('kc-feedback-exp'),
    }, (isCorrect) => {
      qp.chapterTotal++;
      if (isCorrect) qp.chapterScore++;
      qp.analytics.knowledgeCheck.push({ question: q.q, isCorrect });
      saveState();
      showHammyReaction(mod, isCorrect);
      const isLast = qIdx === questions.length - 1;
      document.getElementById('kc-next').textContent = isLast ? 'Continue' : 'Next';
    });

    document.getElementById('kc-next').addEventListener('click', () => {
      if (qIdx < questions.length - 1) { qIdx++; renderQ(); } else { onDone(); }
    });
  }
  renderQ();
}

// ── Chapter type: bossbattle (terminal) ─────────
function renderBossBattleChapter(chapter, mod) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  main.innerHTML = `
    <div class="boss-banner">
      <p class="quest-prompt">${chapter.scenario}</p>
    </div>
    <div class="boss-split">
      <div class="boss-choices" id="boss-choices"></div>
      <div class="boss-outcome-col" id="boss-outcome-col"></div>
    </div>`;

  const choicesEl = document.getElementById('boss-choices');
  chapter.choices.forEach(choice => {
    const card = document.createElement('div');
    card.className = 'boss-choice-card';
    card.textContent = choice.label;
    card.addEventListener('click', () => {
      choicesEl.querySelectorAll('.boss-choice-card').forEach(c => c.classList.add('disabled'));
      applyQuestStateDelta(mod, choice.consequence.delta || {});
      const qp = getQP(mod);
      qp.analytics.bossChoice = choice.label;
      saveState();
      const outcomeBlock = document.createElement('div');
      outcomeBlock.className = 'boss-outcome';
      outcomeBlock.innerHTML = `<p>${choice.consequence.text}</p>`;
      document.getElementById('boss-outcome-col').appendChild(outcomeBlock);
      showHammyReaction(mod, (choice.consequence.xpMultiplier ?? 1) >= 1);
      setQuestContinue('See Results →', () => finishQuest(mod, choice.consequence), true);
    });
    choicesEl.appendChild(card);
  });
}

// ── Quest finish / results ──────────────────────
function finishQuest(mod, chosenConsequence) {
  const qp = getQP(mod);
  qp.done = true;
  const score = qp.chapterScore;
  const total = qp.chapterTotal || 1;
  if (qp.chapterTotal > 0 && qp.chapterScore === qp.chapterTotal) state.hadPerfect = true;

  const bossXP = Math.round(mod.xpReward * (chosenConsequence.xpMultiplier ?? 1));
  const coinsEarned = qp.chapterTotal > 0 ? qp.chapterScore * 8 : 8;
  state.coins = (state.coins || 0) + coinsEarned;

  const prev = state.completedModules[mod.id];
  if (!prev || bossXP > (prev.xpEarned || 0)) {
    state.completedModules[mod.id] = { score, total, xpEarned: bossXP };
  }
  if (!state.questBossesWon.includes(mod.id)) state.questBossesWon.push(mod.id);

  const diamondsEarned = updateStreak();
  const leveled = addXP(bossXP);
  const newAchs = checkAchievements();
  saveState();

  showScreen('screen-results');
  renderQuestResults(mod, bossXP, coinsEarned, newAchs, chosenConsequence.text, qp, diamondsEarned);

  if (leveled) {
    setTimeout(() => {
      document.getElementById('new-tier').textContent = getTier(state.level).name;
      document.getElementById('levelup-overlay').classList.add('visible');
    }, 700);
  }
}

// Comprehensive end-of-quest report: every term taught, a score breakdown per activity type,
// specific weak spots to revisit, and a short rule-based note from Hammy on what to work on.
function buildQuestReport(mod, qp) {
  const a = qp.analytics;
  const kcRight = a.knowledgeCheck.filter(x => x.isCorrect);
  const kcWrong = a.knowledgeCheck.filter(x => !x.isCorrect);
  const mythRight = a.mythCards.filter(x => x.guessedRight);
  const mythWrong = a.mythCards.filter(x => !x.guessedRight);
  const totalAnswered = a.knowledgeCheck.length + a.mythCards.length;
  const totalRight = kcRight.length + mythRight.length;
  const masteryPct = totalAnswered ? Math.round((totalRight / totalAnswered) * 100) : 100;

  const termsHtml = (qp.learnedTerms || []).map(t => `<span class="report-term-chip">${t.term}</span>`).join('')
    || '<span class="report-term-chip">None recorded</span>';

  const strengths = [...kcRight.map(x => x.question), ...mythRight.map(x => x.myth)];
  const weakSpots = [...kcWrong.map(x => x.question), ...mythWrong.map(x => x.myth)];

  const strengthsHtml = strengths.length
    ? `<div class="report-section"><div class="report-section-title">What you got right</div><ul class="report-strong-list">${strengths.map(w => `<li>${w}</li>`).join('')}</ul></div>`
    : '';
  const weakHtml = weakSpots.length
    ? `<div class="report-section"><div class="report-section-title">Worth another look</div><ul class="report-weak-list">${weakSpots.map(w => `<li>${w}</li>`).join('')}</ul></div>`
    : `<div class="report-section report-perfect">You got every question and myth card right this time.</div>`;

  const decisionsHtml = a.decisions.length
    ? `<div class="report-section"><div class="report-section-title">Choices you made</div><ul class="report-decision-list">${a.decisions.map(d => `<li><strong>${d.title}:</strong> ${d.choice}</li>`).join('')}${a.bossChoice ? `<li><strong>Boss battle:</strong> ${a.bossChoice}</li>` : ''}</ul></div>`
    : '';

  const explainbackHtml = a.explainback
    ? `<div class="report-section"><div class="report-section-title">Your written answer</div><p class="report-explainback-note">"${a.explainback.term}": ${
        a.explainback.tier === 'great' ? 'you got the key idea on your own.' :
        a.explainback.tier === 'ok' ? 'you were on the right track.' :
        "this one didn't click yet, and it's worth rereading."
      }</p></div>`
    : '';

  // Tailored advice, built from whichever specific area was weakest — capped at two short
  // sentences instead of stacking a line for every flag that happened to trigger.
  const adviceParts = [];
  if (weakSpots.length === 0) {
    adviceParts.push(`Solid handle on ${mod.title.toLowerCase()}.`);
  } else if (kcWrong.length > 0) {
    adviceParts.push(`Reread the explanation for "${kcWrong[0].question}."`);
  } else if (mythWrong.length > 0) {
    adviceParts.push(`The myth about "${mythWrong[0].myth}" is worth a second look.`);
  }
  if (a.explainback && a.explainback.tier === 'retry') {
    adviceParts.push(`Also reread the definition for "${a.explainback.term}."`);
  } else if (a.matchingMistakes > 4) {
    adviceParts.push('More repetition on the matching rounds would help.');
  }
  const advice = adviceParts.slice(0, 2).join(' ');

  return `
    <div class="quest-report">
      <div class="report-mastery">
        <div class="report-mastery-ring" style="--mastery-pct:${masteryPct}"><span>${masteryPct}%</span></div>
        <div class="report-mastery-label">Overall mastery this quest<br><span class="report-mastery-sub">${totalRight} of ${totalAnswered} correct across quick checks and myth cards</span></div>
      </div>
      <div class="report-section-title">Words you learned (${(qp.learnedTerms || []).length})</div>
      <div class="report-terms">${termsHtml}</div>
      <div class="report-stat-row">
        <div class="report-stat"><div class="report-stat-num">${kcRight.length}/${a.knowledgeCheck.length}</div><div class="report-stat-label">Quick Check</div></div>
        <div class="report-stat"><div class="report-stat-num">${mythRight.length}/${a.mythCards.length}</div><div class="report-stat-label">Myth Cards</div></div>
        <div class="report-stat"><div class="report-stat-num">${a.matchingMistakes}</div><div class="report-stat-label">Matching Misses</div></div>
        <div class="report-stat"><div class="report-stat-num">${qp.hintsUsed || 0}</div><div class="report-stat-label">Hints Used</div></div>
      </div>
      ${decisionsHtml}
      ${explainbackHtml}
      ${strengthsHtml}
      ${weakHtml}
      <div class="report-advice">
        <div class="hammy-report-avatar">${getPigMarkup(0.4)}</div>
        <p><strong>Hammy's advice:</strong> ${advice}</p>
      </div>
    </div>`;
}

function renderQuestResults(mod, xpEarned, coinsEarned, newAchs, consequenceText, qp, diamondsEarned) {
  const achHtml = newAchs.map(a =>
    `<div class="new-ach-banner"><span class="ach-abbr">${a.abbr}</span><div><strong>Unlocked: ${a.label}</strong><span>${a.desc}</span></div></div>`
  ).join('');
  const diamondHtml = diamondsEarned > 0 ? buildStreakDiamondBanner(diamondsEarned) : '';
  const gradHtml = newAchs.some(a => a.id === 'stackd_star') ? buildGraduationBanner() : '';

  const dashHtml = Object.entries(qp.dashboard).map(([key, val]) => {
    const isMoney = key !== 'creditScore';
    const label = key === 'creditScore' ? 'Credit Score' : key.charAt(0).toUpperCase() + key.slice(1);
    return `<div class="results-xp-card"><div class="results-xp-num">${isMoney ? formatMoney(val) : Math.round(val)}</div><div class="results-xp-label">${label}</div></div>`;
  }).join('');

  const quest = getActiveQuest(mod);
  document.getElementById('results-wrap').innerHTML = `
    <div class="results-grade">Quest Complete</div>
    <h2 class="results-title">${quest.topic || quest.character.name}</h2>
    <p class="results-score">${consequenceText}</p>
    <div class="results-rewards-row">
      <div class="results-xp-card">
        <div class="results-xp-num">+${xpEarned} XP</div>
        <div class="results-xp-label">${getTier(state.level).name} · ${state.xp.toLocaleString()} total</div>
      </div>
      <div class="results-coins-card">
        <div class="results-coins-num">+${coinsEarned || 0} 🪙</div>
        <div class="results-xp-label">${(state.coins || 0).toLocaleString()} total coins</div>
      </div>
    </div>
    ${gradHtml}
    ${diamondHtml}
    ${achHtml}
    <div class="results-breakdown quest-final-dashboard">${dashHtml}</div>
    ${buildQuestReport(mod, qp)}
    <div class="results-actions">
      <button class="btn-primary" id="res-home">Back to Dashboard</button>
      <button class="btn-secondary" id="res-replay">Replay Quest</button>
    </div>`;

  document.getElementById('res-home').addEventListener('click', renderHome);
  document.getElementById('res-replay').addEventListener('click', () => startQuest(mod.id, state.activeQuestId));
}

// ── Event listeners ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      showPage(page);
      if (page === 'home')          renderHome();
      else if (page === 'progress') renderProgressPage();
      else if (page === 'modules')  renderModulesPage();
      else if (page === 'badges')   renderBadgesPage();
      else if (page === 'room')     renderRoomPage();
      else if (page === 'shop')     renderShopPage();
      else if (page === 'settings') renderSettingsPage();
    });
  });

  document.getElementById('mod-detail-exit').addEventListener('click', renderHome);
  document.getElementById('hook-exit').addEventListener('click', renderHome);
  document.getElementById('hook-start').addEventListener('click', startQuiz);
  document.getElementById('quiz-exit').addEventListener('click', () => {
    if (confirm('Exit quiz? Your progress for this session will be lost.')) renderHome();
  });
  document.getElementById('quest-exit').addEventListener('click', () => {
    if (confirm('Exit the quest? Your progress is saved up to your last completed chapter.')) renderHome();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (state.currentQ < state.sessionQuestions.length - 1) {
      state.currentQ++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  });
  document.getElementById('levelup-ok').addEventListener('click', () => {
    document.getElementById('levelup-overlay').classList.remove('visible');
  });

  const shopModal = document.getElementById('shop-modal');
  shopModal.addEventListener('click', e => {
    if (e.target === shopModal) { closeShopModal(); return; }
    const btn = e.target.closest('.shop-btn[data-id]');
    if (btn) {
      handleShopAction(btn.dataset.id);
      refreshShopModal(btn.dataset.id);
      renderShopPage();
    }
  });
  document.getElementById('shop-modal-close').addEventListener('click', closeShopModal);

  loadState();
  renderHome();

  const maybeShowOnboardingSurvey = () => {
    if (!state.onboardingSurvey.completed) showOnboardingSurvey();
  };

  if (!state.metHammy) {
    document.getElementById('birth-pig-wrap').innerHTML = getPigMarkup(0.22);
    document.getElementById('birth-overlay').classList.add('visible');
  } else {
    maybeShowOnboardingSurvey();
  }
  document.getElementById('birth-ok').addEventListener('click', () => {
    document.getElementById('birth-overlay').classList.remove('visible');
    state.metHammy = true;
    saveState();
    maybeShowOnboardingSurvey();
  });
  document.getElementById('onboarding-skip').addEventListener('click', () => finishOnboardingSurvey(true));

  // Sidebar expand/collapse
  const SIDEBAR_KEY = 'stackd_sidebar_collapsed';
  const sidebar = document.getElementById('sidebar');
  const storedCollapsed = localStorage.getItem(SIDEBAR_KEY);
  sidebar.classList.toggle('collapsed', storedCollapsed === null ? true : storedCollapsed === '1');
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const collapsed = !sidebar.classList.contains('collapsed');
    sidebar.classList.toggle('collapsed', collapsed);
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  });
});
