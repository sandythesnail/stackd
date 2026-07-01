/* ══════════════════════════════════════════════
   STACKD app.js - PRD v1.0
══════════════════════════════════════════════ */

const LEVEL_THRESHOLDS = [0, 200, 450, 750, 1100, 1500, 2000, 2600, 3300, 4100, 5000];

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
    id: 'earning', title: 'Earning', icon: '01', iconColor: 'green', xpReward: 100,
    hook: 'You just got your first campus job paycheck. You worked 20 hours at $15/hour - that\'s $300. But your direct deposit shows $241. Where did $59 go?',
    desc: 'Paychecks, taxes, W-2s, and what gets taken before you see a dollar.',
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
        q: 'Your employer offers a 401(k) with a 3% match. What\'s the smartest move?',
        opts: ['Ignore it until you\'re older and earning more', 'Contribute at least 3% to capture the full employer match', 'Only contribute if you earn over $50,000', 'Avoid employer retirement plans entirely'],
        correct: 1,
        exp: 'Employer match is free money. Contributing enough to capture the full match is the single highest-return financial move available to you right now.'
      },
      {
        q: 'You earn $15/hour and work 40 hours/week. What is your gross bi-weekly paycheck?',
        opts: ['$600', '$900', '$1,200', '$1,500'],
        correct: 2,
        exp: '$15 × 40 hrs × 2 weeks = $1,200 gross. Your actual deposit will be less after taxes - usually 70–80% of gross.'
      }
    ],
    lessons: [
      { title: 'Your First Paycheck', hook: 'You just started your on-campus job and received your first paycheck. The stub says $300 gross but only $241 hit your bank. Where did $59 go — and what does "withholding" actually mean?', qIndices: [0, 1] },
      { title: 'Tax Forms & Benefits', hook: 'Your employer hands you a W-4 on day one and mentions the university offers a 403(b) retirement match up to 3%. You\'ve never seen either of these. What do you sign — and what should you sign up for?', qIndices: [2, 3, 4] }
    ]
  },
  {
    id: 'spending', title: 'Spending', icon: '02', iconColor: 'pink', xpReward: 100,
    hook: 'It\'s week 6 of the semester. You had $800 for the month. You check your account and there\'s $23 left. You didn\'t buy anything big. How did this happen - and how do you stop it?',
    desc: 'Budgeting on a student income, meal plans, paying for college, and where money actually goes.',
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
      }
    ],
    lessons: [
      { title: 'The 50/30/20 Rule', hook: 'It\'s week 6 of the semester. You had $800 for the month. You check your account and there\'s $23 left. You didn\'t buy anything big. How did this happen — and how do you stop it?', qIndices: [0, 1, 2] },
      { title: 'Budget Deficits & Emergency Funds', hook: 'You spent $900 this month but only earned $750. That\'s a $150 deficit. Your first instinct is to put it on a credit card. Is that the right move — and how do you prevent this next month?', qIndices: [3, 4] },
      { title: 'Paying for College', hook: 'It\'s October 1st and your inbox reminds you: FAFSA is open. Last year you put it off, missed a scholarship deadline, and scrambled to understand a confusing financial aid offer in August. This year, what\'s the plan?', qIndices: [5, 6, 7] }
    ]
  },
  {
    id: 'saving', title: 'Saving', icon: '03', iconColor: 'mint', xpReward: 100,
    hook: 'Your laptop just died. It\'s finals week. A replacement costs $400. You have $47 in your checking account. This is what a missing emergency fund looks like - and it\'s completely avoidable.',
    desc: 'Emergency funds, high-yield savings accounts, and building habits early.',
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
      }
    ],
    lessons: [
      { title: 'High-Yield Savings', hook: 'Your laptop just died during finals week. A replacement costs $400. You have $47 in your checking account. This is what a missing emergency fund looks like — and it\'s completely avoidable.', qIndices: [0, 1] },
      { title: 'Building Habits', hook: 'You\'ve decided to start saving, but at the end of every month there\'s nothing left. You keep saying "I\'ll save whatever\'s left" — but there\'s never anything left. What changes?', qIndices: [2, 3, 4] }
    ]
  },
  {
    id: 'investing', title: 'Investing', icon: '04', iconColor: 'lav', xpReward: 150,
    hook: 'Two students each invest $1,000 into the same fund. Alex starts at 18, Jordan starts at 28. At 65, Alex has $21,000. Jordan has $10,700. They invested the exact same amount. What made the difference?',
    desc: 'Compound interest, Roth IRAs, and why starting at 18 changes everything.',
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
      }
    ],
    lessons: [
      { title: 'Compound Interest & Time', hook: 'Two students each invest $1,000 into the same fund. Alex starts at 18, Jordan starts at 28. At 65, Alex has $21,000. Jordan has $10,700. Same amount invested. What made the difference?', qIndices: [0, 1, 2] },
      { title: 'Roth IRA & Index Funds', hook: 'You have $50/month to invest and someone says "open a Roth IRA and put it in an index fund." You\'ve heard these words but don\'t fully understand them. What are they — and why does everyone keep recommending them?', qIndices: [3, 4] }
    ]
  },
  {
    id: 'credit', title: 'Managing Credit', icon: '05', iconColor: 'sky', xpReward: 125,
    hook: 'You just got your first credit card with a $1,000 limit. You spend $800 on textbooks and dorm supplies. You pay the minimum each month. In 3 years, you\'ve paid nearly $300 in interest - and still owe $600. What went wrong?',
    desc: 'APR, credit scores, utilization, and how to avoid common traps.',
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
      }
    ],
    lessons: [
      { title: 'APR & Utilization', hook: 'You got your first credit card with a $1,000 limit. Textbooks and dorm supplies ran you $800. You pay the minimum each month. Three years later, you\'ve paid $300 in interest and still owe $600. What went wrong?', qIndices: [0, 1] },
      { title: 'Credit Scores', hook: 'Your roommate got an apartment at a better rate because their credit score was 720. Yours was 610. Same income. What is a credit score — and how do you build yours before graduation?', qIndices: [2, 3, 4] }
    ]
  },
  {
    id: 'risk', title: 'Managing Risk', icon: '06', iconColor: 'peach', xpReward: 100,
    hook: 'You\'re moving off-campus next fall. A pipe bursts in your apartment and ruins your laptop, TV, and clothes. Your landlord\'s insurance covers the building - not your stuff. You owe $2,000 in replacements. What should you have had?',
    desc: 'Health coverage, renter\'s insurance, and identity theft protection.',
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
      }
    ],
    lessons: [
      { title: 'Insurance Basics', hook: 'You\'re moving off-campus. A pipe bursts in your apartment and ruins your laptop, TV, and clothes. Your landlord\'s insurance covers the building — not your stuff. You owe $2,000 in replacements. What should you have had?', qIndices: [0, 1, 2] },
      { title: 'Identity Theft', hook: 'You get an alert: someone opened a credit card in your name in another state. You\'re a student with no real assets — but this wrecks your credit and your identity. How do you protect yourself before this happens?', qIndices: [3, 4] }
    ]
  },
  {
    id: 'loans', title: 'Loans', icon: '07', iconColor: 'amber', xpReward: 125,
    hook: 'Your financial aid offer shows $5,500 in federal loans available for the year. You only need $3,200 to cover the gap after grants. It\'s tempting to take it all as extra cash. Should you?',
    desc: 'Federal loan types, how eligibility works, and what to do before your first dollar arrives.',
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
      }
    ],
    lessons: [
      { title: 'Federal Loan Types', hook: 'Your financial aid offer lists three different kinds of loans — Direct Subsidized, Direct Unsubsidized, and PLUS — plus a note about your enrollment status. You\'ve never seen any of these terms before. What do they actually mean for what you\'ll owe?', qIndices: [0, 1, 2] },
      { title: 'Borrowing Responsibly', hook: 'You\'re about to accept federal loans for the first time. Before any money shows up, studentaid.gov is asking you to complete a Master Promissory Note and Entrance Counseling — and your offer includes more than you actually need. What do you do?', qIndices: [3, 4, 5] }
    ]
  },
  {
    id: 'taxes', title: 'Taxes', icon: '08', iconColor: 'slate', xpReward: 125,
    hook: 'It\'s April. You have a W-2 from your on-campus job, a 1099 from a freelance gig, and you\'ve never filed a tax return in your life. Where do you even start?',
    desc: 'Filing your first return, W-2s vs. 1099s, education credits, and the mistakes that cost students the most.',
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
      }
    ],
    lessons: [
      { title: 'Your First Return', hook: 'It\'s April. You have a W-2 from your on-campus job and a 1099 from a freelance gig you did on weekends. You\'ve never filed a tax return in your life. Where do you even start — and what do these forms actually mean?', qIndices: [0, 1, 2] },
      { title: 'Credits & Common Mistakes', hook: 'Your friend says they got $600 back after filing, but you didn\'t even think you needed to file since you were "just an intern." What are you missing — and what do first-time filers usually get wrong?', qIndices: [3, 4, 5] }
    ]
  },
  {
    id: 'psychology', title: 'Consumer Psychology', icon: '09', iconColor: 'berry', xpReward: 100,
    hook: 'You know you should be saving. You even said out loud last week, "I need to stop spending on DoorDash." Then a friend tags you in a group order twenty minutes later. Why isn\'t knowing enough?',
    desc: 'Impulse spending, social pressure, lifestyle inflation, subscriptions, and BNPL — the behavioral side of money.',
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
      }
    ],
    lessons: [
      { title: 'Why Knowing Isn\'t Enough', hook: 'You know you should be saving — you even said it out loud last week. Then a friend tags you in a group order twenty minutes later. Why does knowing what to do never seem to be enough?', qIndices: [0, 1, 2] },
      { title: 'Subscriptions, BNPL & Building Habits', hook: 'You check out online and see "Buy Now, Pay Later — 4 payments of $50, no interest." It feels harmless. Combined with the six subscriptions already on your card, is it?', qIndices: [3, 4, 5] }
    ]
  },
  {
    id: 'career', title: 'Career & Salary', icon: '10', iconColor: 'indigo', xpReward: 125,
    hook: 'You get a job offer: $58,000. You\'re thrilled and about to accept on the spot. Your friend negotiated theirs from $55,000 to $60,000 with one email. Did you just leave money on the table?',
    desc: 'Negotiating your first salary, reading a benefits package, and why early career decisions compound for decades.',
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
      }
    ],
    lessons: [
      { title: 'Negotiating & Benefits', hook: 'You get a job offer: $58,000. You\'re about to accept on the spot. Your friend negotiated theirs from $55,000 to $60,000 with one email — and the benefits summary you haven\'t even opened yet might matter just as much as the number. What are you missing?', qIndices: [0, 1, 2] },
      { title: 'Comparing Offers & Long-Term Impact', hook: 'You have two offers on the table — one with a slightly higher salary, the other with a stronger 401(k) match and a clearer promotion path. Your instinct says take the bigger number. Is that actually the smarter long-term move?', qIndices: [3, 4, 5] }
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
];

// ── State ──────────────────────────────────────
let state = {
  level: 1, xp: 0, streak: 0, lastPlayedDate: null,
  completedModules: {}, completedLessons: {}, unlockedAchievements: [], hadPerfect: false,
  activeModuleId: null, activeLessonIdx: 0, sessionQuestions: [],
  currentQ: 0, sessionAnswers: [], sessionScore: 0,
  coins: 0, ownedItems: [], equippedItem: null,
  ownedRoomItems: [], equippedRoom: { wall: null, lamp: null, plant: null, bed: null, rug: null, wallpaper: null },
  metHammy: false,
};

function loadState() {
  try {
    const s = localStorage.getItem('stackd_v2');
    if (s) Object.assign(state, JSON.parse(s));
  } catch (_) {}
}

function saveState() {
  const { level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect, coins, ownedItems, equippedItem, ownedRoomItems, equippedRoom, metHammy } = state;
  localStorage.setItem('stackd_v2', JSON.stringify({ level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect, coins, ownedItems, equippedItem, ownedRoomItems, equippedRoom, metHammy }));
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

function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastPlayedDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  state.streak = state.lastPlayedDate === yesterday ? state.streak + 1 : 1;
  state.lastPlayedDate = today;
}

function checkAchievements() {
  const newOnes = [];
  ACHIEVEMENTS.forEach(a => {
    if (!state.unlockedAchievements.includes(a.id) && a.check(state)) {
      state.unlockedAchievements.push(a.id);
      newOnes.push(a);
    }
  });
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
}

function renderModuleGrid(containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = '';
  MODULES.forEach(m => {
    const lessonsDone = m.lessons.filter((_, i) => !!state.completedLessons[`${m.id}_${i}`]).length;
    const allDone = lessonsDone === m.lessons.length;
    const card = document.createElement('div');
    card.className = 'module-card' + (allDone ? ' completed' : '');
    const btnLabel = allDone ? 'Replay' : lessonsDone > 0 ? 'Continue' : 'Start';
    card.innerHTML = `
      <div class="card-top">
        <div class="mod-icon ${m.iconColor}">${m.icon}</div>
        ${allDone
          ? `<span class="card-badge badge-done">✓ Complete</span>`
          : `<span class="card-badge badge-xp">+${m.xpReward} XP</span>`}
      </div>
      <div class="mod-title">${m.title}</div>
      <div class="mod-desc">${m.desc}</div>
      <div class="card-footer">
        <span class="card-meta">${lessonsDone > 0 ? `${lessonsDone}/${m.lessons.length} lessons done` : '2 lessons'}</span>
        <button class="start-btn ${allDone ? 'replay' : ''}">${btnLabel}</button>
      </div>`;
    card.addEventListener('click', () => showModuleDetail(m.id));
    grid.appendChild(card);
  });
}

function renderModuleList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  MODULES.forEach(m => {
    const lessonsDone = m.lessons.filter((_, i) => !!state.completedLessons[`${m.id}_${i}`]).length;
    const allDone = lessonsDone === m.lessons.length;

    const row = document.createElement('div');
    row.className = 'module-row' + (allDone ? ' completed' : '');

    const badge = allDone
      ? `<span class="card-badge badge-done">✓ Complete</span>`
      : `<span class="card-badge badge-xp">+${m.xpReward} XP</span>`;

    const lessonsHtml = m.lessons.map((lesson, idx) => {
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
    }).join('');

    row.innerHTML = `
      <div class="module-row-header">
        <div class="mrh-left">
          <div class="mod-icon ${m.iconColor}">${m.icon}</div>
          <div class="mrh-info">
            <div class="mrh-title">${m.title}</div>
            <div class="mrh-desc">${m.desc}</div>
          </div>
        </div>
        <div class="mrh-right">${badge}</div>
      </div>
      <div class="module-row-lessons">${lessonsHtml}</div>`;

    row.querySelectorAll('.lesson-tile').forEach(tile => {
      tile.addEventListener('click', () => startHook(tile.dataset.module, parseInt(tile.dataset.lesson)));
    });

    container.appendChild(row);
  });
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
  const canAfford = (state.coins || 0) >= item.price;
  let btn;
  if (equipped) {
    btn = `<button class="shop-btn shop-btn-unequip" data-id="${itemId}">✓ ${isWallpaper ? 'Applied' : isRoom ? 'Placed' : 'Equipped'} · Remove</button>`;
  } else if (owned) {
    btn = `<button class="shop-btn shop-btn-equip" data-id="${itemId}">${isWallpaper ? 'Apply' : isRoom ? 'Place in room' : 'Equip'}</button>`;
  } else {
    btn = `<button class="shop-btn shop-btn-buy${canAfford ? '' : ' shop-btn-broke'}" data-id="${itemId}"${canAfford ? '' : ' disabled'}>🪙 ${item.price}</button>`;
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

function renderShopPage() {
  updateSidebarStats();
  const shopCoinCount = document.getElementById('shop-coin-count');
  if (shopCoinCount) shopCoinCount.textContent = (state.coins || 0).toLocaleString();

  const grid = document.getElementById('shop-grid');
  if (!grid) return;

  const equippedItem = SHOP_ITEMS.find(i => i.id === state.equippedItem);

  const categoriesHtml = SHOP_CATEGORIES.map(cat => {
    const items = SHOP_ITEMS.filter(i => i.category === cat.key);
    const cardsHtml = items.map(item => {
      const isRoom = !!item.slot;
      const owned = isRoom ? (state.ownedRoomItems || []).includes(item.id) : (state.ownedItems || []).includes(item.id);
      const equipped = isRoom ? state.equippedRoom[item.slot] === item.id : state.equippedItem === item.id;
      const canAfford = (state.coins || 0) >= item.price;
      const statusLabel = equipped
        ? (item.slot === 'wallpaper' ? '✓ Applied' : isRoom ? '✓ Placed' : '✓ Equipped')
        : owned ? 'Owned' : `🪙 ${item.price}`;
      const preview = item.slot === 'wallpaper'
        ? `<div class="wallpaper-swatch" style="${item.wallCss}"></div>`
        : isRoom
          ? `<svg viewBox="${item.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${item.svg}</svg>`
          : getPigWithItemMarkup(0.29, item.svg);
      return `<div class="shop-card${equipped ? ' shop-equipped' : ''}${owned && !equipped ? ' shop-owned' : ''}${!owned && !canAfford ? ' shop-broke' : ''}" data-item-id="${item.id}">
        <div class="shop-preview">
          ${preview}
        </div>
        <div class="shop-card-body">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-price">${statusLabel}</div>
        </div>
      </div>`;
    }).join('');
    return `<div class="shop-category">
      <div class="shop-cat-header">
        <span class="shop-cat-icon">${cat.icon}</span>
        <h2 class="shop-cat-title">${cat.label}</h2>
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
          <div class="shop-earn-tip">Earn 🪙 coins by completing lessons · 8 coins per correct answer</div>
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

  if (item.slot) {
    if (!state.equippedRoom) state.equippedRoom = { wall: null, lamp: null, plant: null, bed: null, rug: null, wallpaper: null };
    const owned = (state.ownedRoomItems || []).includes(itemId);
    const equipped = state.equippedRoom[item.slot] === itemId;
    if (equipped) {
      state.equippedRoom[item.slot] = null;
    } else if (owned) {
      state.equippedRoom[item.slot] = itemId;
    } else {
      if ((state.coins || 0) < item.price) return;
      state.coins -= item.price;
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
    if ((state.coins || 0) < item.price) return;
    state.coins -= item.price;
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

function renderQuestion() {
  const questions = state.sessionQuestions;
  const total = questions.length;
  const idx = state.currentQ;
  const q = questions[idx];

  document.getElementById('quiz-prog-fill').style.width = (idx / total * 100) + '%';
  document.getElementById('quiz-counter').textContent = `${idx + 1} / ${total}`;
  document.getElementById('question-text').textContent = q.q;

  const letters = ['A', 'B', 'C', 'D'];
  const container = document.getElementById('options');
  container.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span><span>${opt}</span>`;
    btn.addEventListener('click', () => selectAnswer(i));
    container.appendChild(btn);
  });

  document.getElementById('feedback-panel').classList.remove('visible', 'correct-state', 'wrong-state');
}

function selectAnswer(chosen) {
  const q = state.sessionQuestions[state.currentQ];
  const isCorrect = chosen === q.correct;
  if (isCorrect) state.sessionScore++;
  state.sessionAnswers.push({ chosen, correct: q.correct, isCorrect });

  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === chosen && !isCorrect) btn.classList.add('wrong');
  });

  const panel = document.getElementById('feedback-panel');
  panel.classList.add('visible', isCorrect ? 'correct-state' : 'wrong-state');
  panel.classList.remove(isCorrect ? 'wrong-state' : 'correct-state');
  document.getElementById('feedback-label').textContent = isCorrect ? 'Correct' : 'Not quite';
  document.getElementById('feedback-exp').textContent = q.exp;

  const isLast = state.currentQ === state.sessionQuestions.length - 1;
  document.getElementById('btn-next').textContent = isLast ? 'See Results →' : 'Next →';
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

  updateStreak();
  const leveled = addXP(xpEarned);
  const newAchs = checkAchievements();
  saveState();
  showScreen('screen-results');
  renderResults(mod, score, total, xpEarned, wasLessonDone, newAchs, coinsEarned);

  if (leveled) {
    setTimeout(() => {
      document.getElementById('new-tier').textContent = getTier(state.level).name;
      document.getElementById('levelup-overlay').classList.add('visible');
    }, 700);
  }
}

function renderResults(mod, score, total, xpEarned, wasReplay, newAchs, coinsEarned) {
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
    ${achHtml}
    <div class="results-breakdown">${breakdown}</div>
    <div class="results-actions">
      <button class="btn-primary" id="res-home">Back to Dashboard</button>
      <button class="btn-secondary" id="res-replay">Replay Module</button>
    </div>`;

  document.getElementById('res-home').addEventListener('click', renderHome);
  document.getElementById('res-replay').addEventListener('click', () => showModuleDetail(mod.id));
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

  if (!state.metHammy) {
    document.getElementById('birth-pig-wrap').innerHTML = getPigMarkup(0.22);
    document.getElementById('birth-overlay').classList.add('visible');
  }
  document.getElementById('birth-ok').addEventListener('click', () => {
    document.getElementById('birth-overlay').classList.remove('visible');
    state.metHammy = true;
    saveState();
  });

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
