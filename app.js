/* ══════════════════════════════════════════════
   STACKD app.js - PRD v1.0
══════════════════════════════════════════════ */

// Tuned so a first-time, all-correct pass through every module lands right around level 9-10 —
// leveling up should track finishing the whole curriculum, not just a couple of modules.
const LEVEL_THRESHOLDS = [0, 90, 200, 330, 480, 660, 880, 1150, 1450, 1800, 2200];

// Tier/rank is driven by how many modules are actually completed, not by level/XP — level
// tracks activity (quizzes, activities, replays) and can climb well past module count, so
// basing the "Graduate" label on level alone let players see it without finishing everything.
// Bands are tuned against MODULES.length (11): the top tier requires every module done.
const TIERS = [
  { min: 0, max: 2,  name: 'Broke Freshman' },
  { min: 3, max: 4,  name: 'Budget Apprentice' },
  { min: 5, max: 7,  name: 'Money-Aware Sophomore' },
  { min: 8, max: 10, name: 'Money Manager' },
  { min: 11, max: 11, name: 'Financially Literate Graduate' },
];

function getTier(modulesCompleted) {
  return TIERS.find(t => modulesCompleted >= t.min && modulesCompleted <= t.max) || TIERS[TIERS.length - 1];
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
    ],
    quests: [
      {
        id: 'gross_net_pay',
        topic: 'Understanding Your Paycheck: Gross vs. Net Pay',
        character: { name: 'Hammy', tagline: 'Opening a first paycheck and doing the math' },
        initialState: { checking: 0, savings: 0, moneyScore: 50 },
        bossAchievementId: 'paycheck_literate',
        chapters: [
          {
            id: 'gnp1', type: 'story', title: 'Where Did $59 Go?',
            beats: [
              { speaker: 'intro', text: "Hammy just worked their first shift at a campus job, 20 hours at $15/hour. That's $300. But the direct deposit that landed this morning says $241." },
              { speaker: 'Hammy', text: '"Wait, that\'s $59 short. Did payroll mess up my hours?"' },
              { speaker: 'narrator', text: "Before Hammy emails HR in a panic, let's actually look at what a paycheck is made of." },
              { speaker: 'Hammy', text: '"Okay. Walk me through it, because right now $59 just feels like it vanished."' }
            ]
          },
          {
            id: 'gnp_t1', type: 'teach', title: 'Gross Pay vs. Net Pay',
            concepts: [
              {
                term: 'Gross Pay',
                plain: "Gross pay is the full amount you earned before anything gets taken out, in Hammy's case, 20 hours × $15 = $300. It's the number on the offer letter, not the number in your bank account.",
                analogy: "It's like a restaurant bill before tax and tip get added, the menu price isn't what actually leaves your wallet.",
                check: { statement: "Gross pay is the amount that actually lands in your bank account.", isTrue: false }
              },
              {
                term: 'Net Pay',
                plain: "Net pay, sometimes called \"take-home pay,\" is what's left after taxes and other deductions come out. It's the number that actually hits your bank account, and the only number you should ever budget from.",
                analogy: "It's the amount you actually get to keep, after the restaurant bill, tax, and tip are all settled.",
                check: { statement: "You should build your budget around your net pay, not your gross pay.", isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'gnp_t2', type: 'teach', title: 'FICA & Payroll Deductions',
            concepts: [
              {
                term: 'FICA',
                plain: "FICA stands for the Federal Insurance Contributions Act, it's 7.65% of your gross pay (6.2% Social Security, 1.45% Medicare). This money isn't lost, it funds benefits you'll actually draw on later in life.",
                analogy: "Think of it like a mandatory subscription you're paying into now for a service, retirement and healthcare coverage, you'll use decades from now.",
                check: { statement: "FICA money simply disappears and funds nothing you'll ever use.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'gnp_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Gross Pay', definition: 'What you earned before any deductions come out.' },
              { term: 'Net Pay', definition: 'What actually lands in your bank account, after deductions.' },
              { term: 'FICA', definition: 'The 7.65% deduction funding Social Security and Medicare.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'gnp_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: FICA is split evenly in spirit, 6.2% goes to Social Security, 1.45% to Medicare. Self-employed and gig workers pay both the employee AND employer share themselves, which is exactly why setting money aside matters even more for gig income.",
            xpOnComplete: 1
          },
          {
            id: 'gnp_t3', type: 'teach', title: 'Federal Income Tax Withholding',
            concepts: [
              {
                term: 'Withholding',
                plain: "Beyond FICA, your employer also withholds federal (and often state) income tax, an estimate of what you'll owe in April, taken out a little at a time instead of all at once. How much gets withheld depends on the W-4 form you filled out when you were hired.",
                analogy: "It's like paying off a big bill in small installments throughout the year instead of one lump sum, so April doesn't blindside you.",
                check: { statement: "How much income tax gets withheld from each paycheck depends on the W-4 form filled out when you were hired.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'gnp_d1', type: 'decision',
            title: "First Paycheck Lands",
            prompt: "Hammy's $241 net pay just hit their account. What should they do with it first?",
            hintText: "Think back to Net Pay: this $241 is the real number to work with. What's a smart first move before it starts disappearing into small purchases?",
            choices: [
              {
                id: 'a', label: 'Spend it as it comes, no real plan',
                outcome: {
                  text: "Without a plan, small purchases quietly eat through the $241 within days, and Hammy has nothing to show for their first paycheck.",
                  delta: { checking: 241, savings: 0, moneyScore: -4 },
                  compare: [{ label: 'Saved from this check', value: 0 }, { label: 'Take-home pay', value: 241 }]
                }
              },
              {
                id: 'b', label: 'Move $40 to savings first, then budget the rest',
                outcome: {
                  text: "Hammy pays themselves first, savings grows immediately, and the remaining $201 is what's actually available to spend.",
                  delta: { checking: 201, savings: 40, moneyScore: 6 },
                  compare: [{ label: 'Saved from this check', value: 40 }, { label: 'Take-home pay', value: 241 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'gnp_ms1', type: 'microsim', title: "Budgeting From Net, Not Gross",
            prompt: "Hammy's actual take-home pay this month is $600, not the $720 their gross hours would suggest. Help them fit a savings deposit and phone bill into what they REALLY have.",
            hintText: "Add up the fixed cost ($75 phone). That leaves $525 of the real $600 net pay to split between the two sliders before going negative.",
            income: 600,
            fixedCosts: [
              { label: 'Phone bill', amount: 75 }
            ],
            sliders: [
              { id: 'savings', label: 'Savings deposit', min: 0, max: 300, step: 25, default: 0 },
              { id: 'spendingMoney', label: 'Discretionary spending', min: 25, max: 500, step: 25, default: 25 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative, this is exactly the mistake of planning around gross pay instead of net. Try smaller amounts.", ok: false },
              { maxLeftover: 24, text: "It fits, but there's almost nothing left over if net pay dips even slightly next month.", ok: true },
              { maxLeftover: Infinity, text: "Solid. Hammy built this budget around their REAL take-home number, exactly the right habit.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'gnp_t4', type: 'teach', title: 'Why the Offer-Letter Number Is Never the Whole Story',
            concepts: [
              {
                term: 'Take-Home Percentage',
                plain: "As a rough rule of thumb, expect somewhere around 70-80% of gross pay to actually reach your bank account, the rest goes to FICA and income tax withholding. Two jobs advertising the same hourly rate can still hand you different take-home amounts, depending on your withholding elections and where you live.",
                analogy: "It's like comparing two apartment listings by rent alone, without factoring in utilities and fees, the sticker price isn't the full cost of the decision.",
                check: { statement: "Two jobs with the identical advertised hourly rate are guaranteed to produce identical take-home pay.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'gnp_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Withholding', definition: "An estimate of income tax taken out of each paycheck, based on your W-4." },
              { term: 'Take-Home Percentage', definition: 'Roughly 70-80% of gross pay, after FICA and income tax withholding.' },
              { term: 'Pay Stub', definition: 'The document listing gross pay, every deduction, and net pay for that period.' }
            ],
            hintText: "One term is about the ESTIMATE taken out, one is the rough PORTION you keep, and one is the DOCUMENT showing it all.",
            xpOnComplete: 4
          },
          {
            id: 'gnp_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "Your gross salary is the number that actually lands in your bank account.",
            isTrue: false,
            explanation: "It's a myth. Taxes and FICA come out before you ever see the money, net pay, not gross, is what's actually available to spend or save.",
            xpOnComplete: 2
          },
          {
            id: 'gnp_myth1', type: 'mythcards', title: 'Paycheck Myths',
            cards: [
              { myth: "If you and a friend both make $15/hour, your take-home pay per hour is guaranteed to be identical.", isTrue: false, explanation: "Withholding elections, state taxes, and benefit deductions can all differ, even at the same hourly rate." },
              { myth: "FICA deductions fund benefits you can eventually use yourself, like Social Security and Medicare.", isTrue: true, explanation: "True, it's not a fee that disappears, it's funding programs you'll draw on later in life." },
              { myth: "A first paycheck can look smaller than expected due to how many days it actually covers.", isTrue: true, explanation: "True, pay periods don't always start on day one of a job, so a first check can cover fewer days than a full cycle." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'gnp_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 1],
            hintTexts: [
              "Think about which number is what you earned, and which is what actually hits your bank account.",
              "Think about what FICA actually stands for and which two programs it funds."
            ]
          },
          {
            id: 'gnp_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Paycheck Habits Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's money habits improve as they make smarter paycheck decisions. Tap each one to see the impact.",
            hintText: "Budgeting from net pay and catching pay stub errors protect money Hammy already earned, from being lost to mistakes or overspending.",
            decisions: [
              { id: 'd1', label: "Budget strictly from net pay, never gross", scoreDelta: 15, note: "This single habit prevents the most common new-earner budgeting mistake." },
              { id: 'd2', label: "Check every pay stub against actual hours worked", scoreDelta: 10, note: "Payroll errors happen, catching them early makes them easy to fix." },
              { id: 'd3', label: "Assume the offer letter's hourly rate is the take-home rate", scoreDelta: -12, note: "This mismatch is exactly what causes budgets to break in the first month." },
              { id: 'd4', label: "Move a set amount to savings the moment each paycheck lands", scoreDelta: 8, note: "Paying yourself first, before spending temptation kicks in, is a habit that compounds." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'gnp_t5', type: 'teach', title: 'Budget From Net, Always',
            concepts: [
              {
                term: 'The One Habit That Matters Most',
                plain: "Every paycheck-related mistake in this quest traces back to one thing: planning around the wrong number. Gross pay is what you earned, net pay is what you actually have. Build every budget, rent split, and spending plan around net, and most paycheck surprises disappear.",
                analogy: "It's like planning a road trip around your car's full tank size instead of how much gas is actually left after the drive to get there.",
                check: { statement: "Building a budget around gross pay instead of net pay is a safe, reliable habit.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'gnp_boss', type: 'bossbattle', title: 'The Rent Split Argument',
            scenario: "Hammy's roommate wants to split a shared expense based on each person's advertised hourly rate ($15/hour for Hammy, $18/hour for the roommate), not their actual take-home pay. Hammy's withholding is higher this year. What does Hammy do?",
            hintText: "Remember Take-Home Percentage: two different advertised rates don't guarantee two proportionally different real paychecks once deductions are factored in.",
            choices: [
              { id: 'a', label: "Explain net pay and suggest splitting based on actual take-home amounts", consequence: { text: "A slightly awkward conversation, but the split now reflects what each person can actually afford.", delta: { moneyScore: 10 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Go along with the gross-pay-based split to avoid the conversation", consequence: { text: "Hammy ends up overcommitted relative to their real take-home pay, the exact mistake this quest was built to prevent.", delta: { moneyScore: -10, checking: -30 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Offer to show both pay stubs side by side so the split is based on real numbers", consequence: { text: "Full transparency settles it fast, the split lands fairly for both people's actual paychecks.", delta: { moneyScore: 8 }, xpMultiplier: 1.1 } },
              { id: 'd', label: "Avoid the conversation entirely and quietly cut back on savings to cover the gap", consequence: { text: "It avoids conflict short-term, but it comes straight out of the savings habit Hammy just built.", delta: { moneyScore: -4, savings: -40 }, xpMultiplier: 0.75 } }
            ]
          }
        ]
      },
      {
        id: 'w4_withholding',
        topic: 'Tax Withholding & W-4s',
        character: { name: 'Hammy', tagline: 'Filling out a W-4 for a new job' },
        initialState: { checking: 0, savings: 0, moneyScore: 50 },
        bossAchievementId: 'withholding_smart',
        chapters: [
          {
            id: 'w4_1', type: 'story', title: 'The Form on Day One',
            beats: [
              { speaker: 'intro', text: "It's Hammy's first day at a new campus job, and HR just handed them a W-4 form before they've even found their desk." },
              { speaker: 'Hammy', text: '"Filing status? Multiple jobs worksheet? I just wanted to know where the breakroom is."' },
              { speaker: 'narrator', text: "This form quietly decides how much of every paycheck gets withheld all year, worth understanding before Hammy just checks random boxes." },
              { speaker: 'Hammy', text: '"Okay, if this affects every single paycheck, I want to actually get it right."' }
            ]
          },
          {
            id: 'w4_t1', type: 'teach', title: 'The W-4 Form',
            concepts: [
              {
                term: 'W-4 Form',
                plain: "A W-4 tells your employer how much federal income tax to withhold from each paycheck. You fill one out when you're hired, and you can submit a new one anytime your situation changes, a raise, a second job, or a life change.",
                analogy: "It's like setting a thermostat for your whole year of paychecks, one setting now controls the temperature of every check until you change it.",
                check: { statement: "A W-4 is only ever filled out once and can never be updated afterward.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'w4_t2', type: 'teach', title: 'Under-Withholding vs. Over-Withholding',
            concepts: [
              {
                term: 'Under-Withholding',
                plain: "If too little gets withheld, your paychecks look bigger now, but you'll owe the difference, sometimes with a penalty, when you file your taxes in April.",
                analogy: "It's like skipping a few loan payments because the cash feels nice now, the balance is still due, just later and possibly with a fee.",
                check: { statement: "Under-withholding means smaller paychecks now in exchange for a refund later.", isTrue: false }
              },
              {
                term: 'Over-Withholding',
                plain: "If too much gets withheld, you get a refund at tax time, but that's money you loaned to the government, interest-free, all year, that could've been in your own savings account instead.",
                analogy: "It's like handing a friend an extra $20 a month and getting it back in one lump sum a year later, with zero interest for the favor.",
                check: { statement: "A big tax refund means you lent the government your own money interest-free all year.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'w4_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'W-4 Form', definition: "Tells your employer how much federal income tax to withhold." },
              { term: 'Under-Withholding', definition: 'Too little taken out, bigger paychecks now, a bill (maybe with a penalty) in April.' },
              { term: 'Over-Withholding', definition: 'Too much taken out, smaller paychecks now, an interest-free refund later.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'w4_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: a huge tax refund might feel like a win, but it usually means too much was withheld all year. Adjusting your W-4 to get closer to $0 owed/refunded puts that money in YOUR paycheck (and your own savings account) all year instead.",
            xpOnComplete: 1
          },
          {
            id: 'w4_t3', type: 'teach', title: 'Claiming Exempt',
            concepts: [
              {
                term: 'Exempt Status',
                plain: "Claiming \"exempt\" on a W-4 stops federal income tax withholding completely, your paycheck looks bigger every period. But if you actually owe tax for the year, you'll face the ENTIRE bill at once in April, often with an underpayment penalty.",
                analogy: "It's like turning off your monthly insurance payment to save cash now, the risk doesn't disappear, it just all lands at once, at the worst possible time.",
                check: { statement: "Claiming exempt on a W-4 has no downside if you actually end up owing income tax.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'w4_d1', type: 'decision',
            title: "Bigger Paycheck, Right Now?",
            prompt: "Hammy's coworker suggests claiming exempt on the W-4 \"so more money hits your account every payday.\" Hammy does expect to owe some tax this year. What should they do?",
            hintText: "Think back to Exempt Status: if Hammy actually owes tax this year, what happens to that bill if nothing was withheld all along?",
            choices: [
              {
                id: 'a', label: 'Follow the advice and claim exempt for bigger paychecks',
                outcome: {
                  text: "Paychecks look great all year, until April, when Hammy owes the full tax bill at once, with no cushion set aside for it.",
                  delta: { moneyScore: -10, checking: 60 },
                  compare: [{ label: 'Tax bill due in April', value: 600 }, { label: 'Tax bill if withheld correctly', value: 0 }]
                }
              },
              {
                id: 'b', label: 'Fill out the W-4 accurately based on actual expected income',
                outcome: {
                  text: "Paychecks are a bit smaller now, but taxes are covered gradually, no surprise bill waiting in April.",
                  delta: { moneyScore: 8 },
                  compare: [{ label: 'Tax bill due in April', value: 0 }, { label: 'Tax bill if claimed exempt', value: 600 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'w4_ms1', type: 'microsim', title: "Planning Around an Accurate W-4",
            prompt: "Hammy's net pay after accurate withholding is $550/month. Fixed costs already use $310. Help them fit a savings deposit in without going negative, so April never comes as a surprise.",
            hintText: "Add up the fixed costs ($150 + $100 + $60 = $310). That leaves $240 of the $550 to split between the two sliders before going negative.",
            income: 550,
            fixedCosts: [
              { label: 'Rent share', amount: 150 },
              { label: 'Meal plan top-up', amount: 100 },
              { label: 'Phone & subscriptions', amount: 60 }
            ],
            sliders: [
              { id: 'savings', label: 'Savings deposit', min: 0, max: 200, step: 25, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 25, max: 225, step: 25, default: 25 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try a smaller savings deposit or discretionary amount.", ok: false },
              { maxLeftover: 24, text: "It fits, but there's very little cushion if an expense comes up.", ok: true },
              { maxLeftover: Infinity, text: "Solid. Hammy's living comfortably on their accurately-withheld paycheck.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'w4_t4', type: 'teach', title: 'Multiple Jobs & Side Income',
            concepts: [
              {
                term: 'Multiple Jobs Adjustment',
                plain: "If you work two jobs, or add gig income on top of a W-2 job, your W-4 has a specific section (Step 2) for this. Skipping it often means too little gets withheld overall, since each employer only withholds based on the pay THEY give you, not your combined total.",
                analogy: "It's like two separate faucets each filling the same tub to a level that's fine on its own, but together they overflow the tub if no one accounts for both.",
                check: { statement: "If you have two jobs, each employer automatically knows about and adjusts for the other job's pay.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'w4_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Exempt Status', definition: 'Stops federal withholding entirely, risky if you actually owe tax.' },
              { term: 'Multiple Jobs Adjustment', definition: 'The W-4 section accounting for combined income across more than one job.' },
              { term: 'Underpayment Penalty', definition: 'An extra charge for withholding too little tax over the year.' }
            ],
            hintText: "One term turns withholding OFF, one ADJUSTS it for multiple jobs, and one is the CONSEQUENCE of getting it wrong.",
            xpOnComplete: 4
          },
          {
            id: 'w4_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "A big tax refund every year is proof that you're managing your withholding well.",
            isTrue: false,
            explanation: "It's a myth. A large refund usually means too much was withheld all year, money that could've been in your own paycheck and earning you interest, instead of sitting with the government interest-free.",
            xpOnComplete: 2
          },
          {
            id: 'w4_myth1', type: 'mythcards', title: 'Withholding Myths',
            cards: [
              { myth: "You can only submit a W-4 once, on your very first day at a job.", isTrue: false, explanation: "You can submit a new W-4 anytime your situation changes, a raise, a second job, marriage, and more." },
              { myth: "Claiming exempt is risk-free if you genuinely expect to owe no tax for the year.", isTrue: true, explanation: "True, exempt status is meant for people who truly expect zero tax liability, the risk is claiming it when you don't actually qualify." },
              { myth: "Working two jobs means each employer automatically withholds the correct combined amount.", isTrue: false, explanation: "Each employer only sees the pay THEY give you, without the Multiple Jobs adjustment, combined withholding often comes up short." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'w4_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [2, 3],
            hintTexts: [
              "Think about what the W-4 actually controls for every paycheck going forward.",
              "Think about what happens in April if nothing at all was withheld during the year."
            ]
          },
          {
            id: 'w4_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Withholding IQ Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's money habits shift as they make W-4 and withholding decisions. Tap each one to see the impact.",
            hintText: "Accurate withholding and adjusting for multiple jobs protect Hammy from an ugly April surprise, that's where most of the impact comes from.",
            decisions: [
              { id: 'd1', label: "Fill out the W-4 accurately instead of guessing", scoreDelta: 14, note: "Accuracy here prevents both an underpayment penalty AND an interest-free loan to the government." },
              { id: 'd2', label: "Complete the Multiple Jobs adjustment after picking up a second job", scoreDelta: 10, note: "This keeps combined withholding accurate across both paychecks." },
              { id: 'd3', label: "Claim exempt despite expecting to owe tax this year", scoreDelta: -14, note: "This trades bigger paychecks now for a full, possibly penalized, tax bill in April." },
              { id: 'd4', label: "Update the W-4 after a raise instead of leaving it untouched", scoreDelta: 6, note: "Keeping the form current as income changes avoids withholding drifting out of sync." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'w4_t5', type: 'teach', title: 'You Can Always Update It',
            concepts: [
              {
                term: 'Revisiting Your W-4',
                plain: "A W-4 isn't a one-time, permanent decision. Anytime your income, jobs, or life situation changes, a raise, a second job, moving, you can submit a new W-4 to your employer to keep withholding accurate.",
                analogy: "It's less like a tattoo and more like a thermostat setting, easy to adjust the moment conditions change.",
                check: { statement: "Once submitted, a W-4 is locked in for the rest of your time at that job.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'w4_boss', type: 'bossbattle', title: 'The Second Job',
            scenario: "Hammy just picked up a second part-time job on top of their campus job. Their combined pay pushed them into owing more tax than either employer's individual withholding accounts for. What does Hammy do?",
            hintText: "Remember Multiple Jobs Adjustment: each employer only withholds based on the pay THEY give you, not your combined total from both jobs.",
            choices: [
              { id: 'a', label: "Update the W-4 at both jobs using the Multiple Jobs adjustment", consequence: { text: "Combined withholding now actually reflects both paychecks, no surprise bill waiting in April.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Leave both W-4s as they are and deal with it at tax time", consequence: { text: "Both employers keep under-withholding relative to the combined income, stacking up a bigger bill for April.", delta: { moneyScore: -10 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Set aside extra savings each month to cover the expected gap instead of adjusting withholding", consequence: { text: "Not the textbook fix, but proactively saving for the known gap still avoids an April crisis.", delta: { moneyScore: 6, savings: 40 }, xpMultiplier: 0.95 } },
              { id: 'd', label: "Quit the second job to avoid dealing with the paperwork", consequence: { text: "It sidesteps the withholding problem, but also gives up income Hammy was counting on.", delta: { moneyScore: -2, checking: -100 }, xpMultiplier: 0.7 } }
            ]
          }
        ]
      },
      {
        id: 'pay_stub',
        topic: 'Reading Your Pay Stub Line by Line',
        character: { name: 'Hammy', tagline: 'Trying to decode a pay stub for the first time' },
        initialState: {},
        chapters: [
          { id: 'pay_stub_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Reading Your Pay Stub Line by Line." }
            ]
          }
        ]
      },
      {
        id: 'work_study',
        topic: 'Work-Study & Campus Jobs',
        character: { name: 'Hammy', tagline: 'Weighing a work-study offer on campus' },
        initialState: {},
        chapters: [
          { id: 'work_study_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Work-Study & Campus Jobs." }
            ]
          }
        ]
      },
      {
        id: 'gig_income',
        topic: 'Gig Work & 1099 Income',
        character: { name: 'Hammy', tagline: 'Picking up gig work between classes' },
        initialState: {},
        chapters: [
          { id: 'gig_income_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Gig Work & 1099 Income." }
            ]
          }
        ]
      },
      {
        id: 'gig_taxes',
        topic: 'Setting Aside Taxes as a Gig Worker',
        character: { name: 'Hammy', tagline: 'Realizing gig income doesn\'t come with taxes withheld' },
        initialState: {},
        chapters: [
          { id: 'gig_taxes_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Setting Aside Taxes as a Gig Worker." }
            ]
          }
        ]
      },
      {
        id: 'negotiating_raises',
        topic: 'Negotiating Raises & Growing Your Income',
        character: { name: 'Hammy', tagline: 'Asking for a raise for the first time' },
        initialState: {},
        chapters: [
          { id: 'negotiating_raises_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Negotiating Raises & Growing Your Income." }
            ]
          }
        ]
      },
      {
        id: 'multiple_incomes',
        topic: 'Multiple Income Streams: Job + Side Gigs',
        character: { name: 'Hammy', tagline: 'Juggling a part-time job and a side hustle' },
        initialState: {},
        chapters: [
          { id: 'multiple_incomes_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Multiple Income Streams: Job + Side Gigs." }
            ]
          }
        ]
      },
      {
        id: 'direct_deposit',
        parentQuestId: 'pay_stub',
        topic: 'Setting Up Direct Deposit: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually setting up direct deposit for a first paycheck' },
        initialState: {},
        chapters: [
          {
            id: 'dd0', type: 'story', title: 'The New Job Paperwork',
            beats: [
              { speaker: 'intro', text: "Hammy just got hired for a campus job, and the onboarding paperwork asks for direct deposit information. Knowing what a pay stub says is one thing — actually setting up how the money gets there is another." }
            ]
          },
          {
            id: 'dd1', type: 'teach', title: 'Step 1 & 2: Find the Numbers, Fill the Form',
            concepts: [
              { term: 'Step 1: Find the Routing & Account Numbers', plain: "Both numbers are printed at the bottom of a paper check, or found in the banking app under account details. The routing number identifies the bank; the account number identifies the specific account.", analogy: "The routing number is like a zip code — it gets the deposit to the right bank. The account number is the exact address once it's there.", check: { statement: 'The routing number identifies your specific account, and the account number identifies your bank.', isTrue: false } },
              { term: 'Step 2: Fill Out the Employer Form', plain: "Most employers use a simple form or online portal asking for the bank name, routing number, account number, and whether it's checking or savings. Double-check every digit — one wrong number can send a paycheck to the wrong place.", analogy: "It's a one-time setup, like adding a new payment method, just in the other direction.", check: { statement: 'A single wrong digit on a direct deposit form has no real consequence.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'dd2', type: 'teach', title: 'Step 3 & 4: Confirm & Troubleshoot',
            concepts: [
              { term: 'Step 3: Confirm With the First Paycheck', plain: "The first deposit is the real test — check that the amount matches what's expected (gross pay minus deductions) and that it landed in the right account.", analogy: "Like double-checking a package tracking number the first time shipping somewhere new.", check: { statement: 'The first paycheck is a reasonable time to double-check that direct deposit is actually working correctly.', isTrue: true } },
              { term: "Step 4: If Pay Doesn't Show Up", plain: "Some employers take one pay cycle to fully activate direct deposit, and a paper check may be issued in the meantime. If a payment is genuinely missing on payday, contact HR or payroll directly — don't just wait and assume it'll appear.", analogy: "Think of it like a package marked delivered that never arrived — worth a call, not just a shrug.", check: {} }
            ],
            xpOnComplete: 3
          },
          {
            id: 'dd3', type: 'decision', title: 'The Onboarding Form',
            prompt: "Hammy is filling out the direct deposit form and isn't sure whether the 9-digit number on the check is the routing number or the account number.",
            hintText: "Which number identifies the BANK, and which identifies the specific account?",
            choices: [
              { id: 'a', label: 'Guess and fill it in quickly to finish the paperwork', outcome: { text: "Guessing risks sending the paycheck to the wrong place entirely — worth 30 extra seconds to check.", delta: {}, compare: [{ label: 'Risk of error', value: 1 }, { label: 'Time saved', value: 0 }] } },
              { id: 'b', label: "Check the bank's app or a sample check to confirm which number is which", outcome: { text: "A quick check confirms the routing number (bank) and account number (specific account) before submitting.", delta: {}, compare: [{ label: 'Risk of error', value: 0 }, { label: 'Time spent', value: 1 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'dd4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 8],
            hintTexts: [
              "Think about the difference between what you earned and what actually lands in the account.",
              "Think about what to do the moment a pay stub looks off."
            ]
          }
        ]
      }
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
      { title: 'Payment Plans & Closing the Gap', hook: 'After grants and scholarships, you\'re still $1,800 short for the semester. Loans aren\'t your only option, and neither is panicking. What else can actually close that gap?', qIndices: [7, 11] },
      {
        title: 'Opportunity Cost: The Real Price of Every Decision',
        type: 'decision-chain',
        hook: 'You just spent $80 on a concert ticket without a second thought. But that $80 didn\'t just disappear — it was a choice. What did you actually give up to make it?',
        activity: {
          intro: "Every dollar you spend is a dollar that could have gone somewhere else. That's opportunity cost — the value of the next-best thing you gave up. Over one week, you'll make three spending decisions. At the end, you'll see exactly what each one cost you beyond the price tag.",
          decisions: [
            {
              day: 'Monday',
              prompt: "Your friends invite you to a concert. Tickets are $80. You have $150 in checking and $65 saved toward a new laptop.",
              choices: [
                { id: 'a', label: 'Buy the ticket', cost: 80, gaveUp: 'about 3 weeks of groceries, or $80 closer to your laptop fund', good: false },
                { id: 'b', label: 'Skip it, keep the $80', cost: 0, gaveUp: 'a night out with friends', good: true }
              ]
            },
            {
              day: 'Wednesday',
              prompt: "Next semester's textbook is $110 new, or $70 used online with 3–5 day shipping. You need it by Friday for an assignment preview.",
              choices: [
                { id: 'a', label: 'Buy new today, guaranteed on time', cost: 110, gaveUp: '$40 that could have covered a week of gas', good: false },
                { id: 'b', label: 'Order used and borrow a friend\'s copy until it arrives', cost: 70, gaveUp: 'a little extra effort coordinating with a friend', good: true }
              ]
            },
            {
              day: 'Saturday',
              prompt: "A promo email offers 40% off a $60 hoodie — $36 for the next 2 hours. You weren't planning to buy anything.",
              choices: [
                { id: 'a', label: 'Buy it, the deal is too good to pass up', cost: 36, gaveUp: 'almost a whole week of your food delivery budget', good: false },
                { id: 'b', label: 'Close the email and think it over for 24 hours', cost: 0, gaveUp: 'the urgency-driven "deal" — if you still want it tomorrow, it\'ll likely still be there', good: true }
              ]
            }
          ],
          xpOnComplete: 8
        }
      },
      {
        title: 'Wants vs. Needs (And the Gray Zone)',
        type: 'sorter',
        hook: 'Marketing is designed to make wants feel like needs. Before your next purchase, can you actually tell the difference — and does it matter?',
        activity: {
          intro: "Sort each expense into Need, Want, or It Depends. There's no judgment here — the goal is just noticing the difference before you spend, not guilt after. Tap an item, then tap the bucket it belongs in.",
          items: [
            { id: 'i1', label: 'Rent', category: 'need' },
            { id: 'i2', label: 'Groceries', category: 'need' },
            { id: 'i3', label: 'Phone bill (basic plan)', category: 'need' },
            { id: 'i4', label: 'Textbooks required for class', category: 'need' },
            { id: 'i5', label: 'Bus pass or gas money for commuting to class', category: 'need' },
            { id: 'i6', label: 'Renter\'s or health insurance', category: 'need' },
            { id: 'i7', label: 'Emergency car repair', category: 'need' },
            { id: 'i8', label: 'DoorDash instead of cooking, twice a week', category: 'want' },
            { id: 'i9', label: 'Concert tickets', category: 'want' },
            { id: 'i10', label: 'A $6 coffee, every day', category: 'want' },
            { id: 'i11', label: 'The newest phone when yours still works fine', category: 'want' },
            { id: 'i12', label: 'All your streaming subscriptions, combined', category: 'depends', note: 'One is often a want you actually use — five you forgot you had is subscription creep.' },
            { id: 'i13', label: 'A gym membership you use 3x/week', category: 'depends', note: 'A want that supports your health — reasonable if it fits your budget and you actually use it.' },
            { id: 'i14', label: 'A new outfit for a one-time event', category: 'depends', note: 'Could be a want, or a need if you truly have nothing appropriate to wear.' },
            { id: 'i15', label: 'A haircut', category: 'depends', note: 'A basic trim is upkeep; a $150 salon visit before a big event leans want.' }
          ],
          subscriptionCreepNote: "Subscription creep: you sign up for one thing, forget about it, and a year later you're paying for seven. Once a month, scroll through your bank statement and cancel anything you can't remember using in the last 30 days.",
          xpOnComplete: 8
        }
      },
      {
        title: 'Boss Challenge: Survive the Last Week Before Your Refund Hits',
        type: 'boss-challenge',
        hook: 'You\'ve got $150 in checking and a full week of decisions before your financial aid refund posts. Every choice either protects that cushion or eats into it.',
        activity: {
          intro: "You're heading into the last week before your refund hits, with $150 in checking. Four decisions are coming at you this week. Each one either protects your balance or chips away at it — there's no pausing the week to think it over.",
          startLabel: 'Start the Week →',
          dashboardLabel: 'Checking',
          startingValue: 150,
          stages: [
            {
              tag: 'Monday',
              prompt: 'Your meal plan is unlimited, but you\'ve been skipping the dining hall to DoorDash instead, about $18 an order, four times this week so far.',
              choices: [
                { id: 'a', label: 'Keep DoorDashing, it\'s already how the week started', delta: -54, isOptimal: false, result: 'Another $54 gone on delivery fees for food you already had free access to.' },
                { id: 'b', label: 'Actually use your meal swipes for the rest of the week', delta: 0, isOptimal: true, result: 'Zero extra spent, the meal plan was already covering this.' }
              ]
            },
            {
              tag: 'Wednesday',
              prompt: 'Your favorite band just announced a surprise $45 show this weekend. Tickets are going fast.',
              choices: [
                { id: 'a', label: 'Buy the ticket now, before it sells out', delta: -45, isOptimal: false, result: 'Rent\'s still due in 2 days, and now there\'s less cushion than you\'d like heading into it.' },
                { id: 'b', label: 'Skip this one, catch the next show once your refund posts', delta: 0, isOptimal: true, result: 'A real skip, but nothing this week\'s budget couldn\'t afford to lose.' }
              ]
            },
            {
              tag: 'Friday',
              prompt: 'Rent auto-pays tomorrow: $110, already accounted for in your checking balance.',
              choices: [
                { id: 'a', label: 'Let it auto-pay as planned', delta: -110, isOptimal: true, result: 'Handled, exactly what that $110 was already budgeted for.' },
                { id: 'b', label: 'Panic and put $50 of it on a credit card "to save cash"', delta: -60, isOptimal: false, result: 'Now there\'s a card balance accruing interest on top of everything else, the "cash saved" cost more than it kept.' }
              ]
            },
            {
              tag: 'Saturday',
              prompt: 'A group of friends invites you to brunch, about $22, with two days left until the refund posts.',
              choices: [
                { id: 'a', label: 'Go to brunch', delta: -22, isOptimal: false, result: 'A nice morning, but that\'s $22 that could\'ve been the cushion between you and $0.' },
                { id: 'b', label: 'Suggest a free hangout instead, coffee and a study session at home', delta: 0, isOptimal: true, result: 'Same friends, same time together, $22 still in your pocket.' }
              ]
            }
          ],
          passThreshold: 0,
          endNoteAtOrAbove: 'You made it to refund day without going negative, exactly what that starting $150 was supposed to cover.',
          endNoteBelow: 'You hit $0 before the refund posted. That\'s not a moral failing, it\'s exactly the gap an emergency fund or a tighter week-one budget is meant to close.',
          takeaway: 'Every "small" decision this week either protected your cushion or ate into it, that\'s opportunity cost playing out in real time, not just a lesson.',
          xpOnComplete: 12,
          bonusXpForOptimalPath: 8
        }
      }
    ],
    quests: [
      {
        id: 'budget_rule',
        topic: 'The 50/30/20 Budget Rule',
        character: { name: 'Hammy', tagline: 'Building a budget from scratch' },
        initialState: { checking: 800, savings: 0, moneyScore: 50 },
        bossAchievementId: 'budget_builder',
        chapters: [
          {
            id: 'br1', type: 'story', title: 'Week 6, $23 Left',
            beats: [
              { speaker: 'intro', text: "It's week 6 of the semester. Hammy had $800 for the month. They check their account: $23 left. Nothing big was ever bought, just a steady drip of small purchases." },
              { speaker: 'Hammy', text: '"I didn\'t buy anything crazy. Where did $777 actually go?"' },
              { speaker: 'narrator', text: "Without a plan, money doesn't disappear all at once, it leaks out a little at a time. Today Hammy builds an actual plan." },
              { speaker: 'Hammy', text: '"Okay, I need a system, not just vibes."' }
            ]
          },
          {
            id: 'br_t1', type: 'teach', title: 'The 50/30/20 Rule',
            concepts: [
              {
                term: '50/30/20 Rule',
                plain: "A simple way to split your after-tax income: 50% to needs, 30% to wants, and 20% to savings or debt repayment. It's a starting framework, not a strict law, but it gives every dollar a job before it disappears.",
                analogy: "It's like dividing a pizza into three slices before anyone starts eating, instead of hoping there's enough left for everyone at the end.",
                check: { statement: "The 50/30/20 rule splits your PRE-tax income, before any deductions.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'br_t2', type: 'teach', title: 'Needs vs. Wants',
            concepts: [
              {
                term: 'Needs',
                plain: "Needs are the 50%, essentials you can't function without: rent, groceries, utilities, transportation to class or work. If skipping it would seriously disrupt your life, it's a need.",
                analogy: "Needs are the foundation of a house, skip them and everything else becomes unstable.",
                check: { statement: 'A monthly streaming subscription is generally classified as a "need."', isTrue: false }
              },
              {
                term: 'Wants',
                plain: "Wants are the 30%, things that make life more enjoyable but aren't essential: dining out, streaming services, concert tickets. Nothing wrong with wants, the rule just gives them a boundary.",
                analogy: "Wants are the furniture and decor, they make the house comfortable, but the house still stands without them.",
                check: { statement: 'Rent is generally classified as a "want" rather than a "need."', isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'br_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: '50/30/20 Rule', definition: 'Splits after-tax income into needs, wants, and savings/debt.' },
              { term: 'Needs', definition: "Essentials you can't function without, the 50% slice." },
              { term: 'Wants', definition: 'Things that make life more enjoyable but are not essential, the 30% slice.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'br_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: the 50/30/20 rule is a STARTING framework, not a strict law. Living in an expensive city might mean 60% goes to needs, and that's okay, the real value is that every dollar has a job before it's spent.",
            xpOnComplete: 1
          },
          {
            id: 'br_t3', type: 'teach', title: 'Budgeting From After-Tax Income',
            concepts: [
              {
                term: 'After-Tax Income',
                plain: "The 50/30/20 split applies to your after-tax (take-home) income, not what you earned before taxes and deductions came out. Building a budget on your gross number, before it's actually shrunk by taxes, leads straight to a budget that doesn't work.",
                analogy: "It's the same idea as budgeting from net pay instead of gross, you can only spend what's actually left after the government takes its cut.",
                check: { statement: "The 50/30/20 rule should be applied to gross income, before taxes are taken out.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'br_d1', type: 'decision',
            title: "Setting Up the Buckets",
            prompt: "Hammy takes home $800/month. A friend suggests just \"winging it\" instead of setting up buckets ahead of time. What should Hammy do?",
            hintText: "Think back to the 50/30/20 Rule: does giving every dollar a job BEFORE spending make a deficit more or less likely than deciding as you go?",
            choices: [
              {
                id: 'a', label: "Wing it and see how the month goes",
                outcome: {
                  text: "With no plan, small purchases add up unnoticed, this is exactly the pattern that left Hammy with $23 by week 6.",
                  delta: { checking: -50, moneyScore: -6 },
                  compare: [{ label: 'Typical shortfall by month end', value: 300 }, { label: 'Shortfall with a plan', value: 0 }]
                }
              },
              {
                id: 'b', label: "Set up needs/wants/savings buckets before spending a dollar",
                outcome: {
                  text: "Every dollar has a job from day one, wants and savings both fit inside a boundary that needs can't run over.",
                  delta: { savings: 40, moneyScore: 6 },
                  compare: [{ label: 'Shortfall with a plan', value: 0 }, { label: 'Typical shortfall without one', value: 300 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'br_ms1', type: 'microsim', title: 'Building the 50/30/20 Split',
            prompt: "Hammy's take-home pay is $800/month. Needs already lock up $400 (50%). Split the rest between wants and savings, and see how close to the 30/20 target Hammy lands.",
            hintText: "The needs bucket is fixed at $400. That leaves $400 to split between wants and savings, aim near $240 wants / $160 savings for a textbook 30/20 split.",
            income: 800,
            fixedCosts: [
              { label: 'Needs (rent, food, utilities)', amount: 400 }
            ],
            sliders: [
              { id: 'wants', label: 'Wants', min: 0, max: 400, step: 20, default: 100 },
              { id: 'savingsDebt', label: 'Savings / debt repayment', min: 0, max: 400, step: 20, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That goes negative, needs alone already use half the budget. Try smaller amounts.", ok: false },
              { maxLeftover: 39, text: "It fits, but check whether savings is getting shortchanged compared to wants.", ok: true },
              { maxLeftover: Infinity, text: "Nice, there's room left over, consider routing it toward savings instead of letting it sit unassigned.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'br_t4', type: 'teach', title: 'The 20% Isn\'t Just Savings',
            concepts: [
              {
                term: 'Savings & Debt Repayment',
                plain: "The 20% slice covers BOTH building savings and paying down debt beyond the minimum, credit card balances, student loan extra payments, and more. If you're carrying debt, extra payments toward it count as part of your 20%, not as a \"want.\"",
                analogy: "It's like one shared lane for two kinds of traffic, both savings deposits and extra debt payments are heading the same direction: a stronger financial position.",
                check: { statement: "Extra payments toward paying down debt faster count as part of the 20% savings/debt slice.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'br_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'After-Tax Income', definition: 'Take-home income after taxes, the number the 50/30/20 rule applies to.' },
              { term: 'Savings & Debt Repayment', definition: 'The 20% slice, covers both building savings and extra debt payments.' },
              { term: 'Budget', definition: "A plan that gives every dollar of income a job before it's spent." }
            ],
            hintText: "One term is the INCOME the rule applies to, one is the 20% SLICE itself, and one is the overall PLAN.",
            xpOnComplete: 4
          },
          {
            id: 'br_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "The 50/30/20 rule is a strict law, every category must be exactly on target every month.",
            isTrue: false,
            explanation: "It's a myth. It's a flexible starting framework, some months lean more toward needs, the real value is giving every dollar a job ahead of time.",
            xpOnComplete: 2
          },
          {
            id: 'br_myth1', type: 'mythcards', title: 'Budgeting Myths',
            cards: [
              { myth: "A budget only matters if you're bad with money.", isTrue: false, explanation: "A budget is a plan for EVERYONE's money, regardless of how responsible they already are, it just prevents small leaks from adding up." },
              { myth: "Extra debt payments count toward the 20% slice, not the 30% wants slice.", isTrue: true, explanation: "True, paying down debt faster is a financial-position builder, just like savings." },
              { myth: "If you're living somewhere expensive, needs might reasonably take up more than 50% of income.", isTrue: true, explanation: "True, the 50/30/20 split is a flexible starting point, not a rule that applies identically everywhere." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'br_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 1],
            hintTexts: [
              "Think about which slice of the 50/30/20 rule covers essentials you can't function without.",
              "Think about what percentage of $1,500 goes toward the SAVINGS slice specifically."
            ]
          },
          {
            id: 'br_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Budgeting Habits Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's money habits improve as they build real budgeting discipline. Tap each decision to see the impact.",
            hintText: "Assigning every dollar a job ahead of time is the single habit behind most of these gains.",
            decisions: [
              { id: 'd1', label: "Set up needs/wants/savings buckets before the month starts", scoreDelta: 15, note: "Planning ahead of spending is the core of the whole rule." },
              { id: 'd2', label: "Track spending weekly against the plan", scoreDelta: 10, note: "Catching drift early keeps small leaks from becoming a $23-by-week-6 situation." },
              { id: 'd3', label: "Classify a daily coffee run as a \"need\"", scoreDelta: -8, note: "Miscategorizing wants as needs quietly breaks the whole framework." },
              { id: 'd4', label: "Route extra cash at month's end into the savings/debt bucket", scoreDelta: 7, note: "Leftover money without a job tends to just get spent." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'br_t5', type: 'teach', title: 'A Framework, Not a Cage',
            concepts: [
              {
                term: 'Adjusting the Split',
                plain: "50/30/20 is a starting point. If your needs genuinely take up 60% because of where you live, the goal shifts to trimming wants, not ignoring the framework entirely. The real win is that every dollar has an assigned job, whatever the exact split ends up being.",
                analogy: "It's like a recipe you're allowed to season to taste, the structure holds even as the exact ratios flex to fit your real life.",
                check: { statement: "If your needs cost more than 50% of income, the entire 50/30/20 framework becomes useless.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'br_boss', type: 'bossbattle', title: 'The Mid-Semester Squeeze',
            scenario: "Week 9. Hammy's rent just went up $50/month and a friend wants to plan a weekend trip. Hammy's buckets are already tight. What does Hammy do?",
            hintText: "Remember: needs took a real hit here. Does the fix come from the wants bucket, the savings bucket, or ignoring the plan entirely?",
            choices: [
              { id: 'a', label: "Trim the wants bucket to absorb the higher rent, skip the trip this time", consequence: { text: "The plan flexes exactly as intended, needs stay covered, savings stays untouched.", delta: { moneyScore: 10, savings: 0 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Pull the difference from savings instead of adjusting wants", consequence: { text: "It covers the gap short-term, but quietly undoes the progress the savings bucket was making.", delta: { moneyScore: -6, savings: -50 }, xpMultiplier: 0.75 } },
              { id: 'c', label: "Ignore the plan entirely and put the trip on a credit card", consequence: { text: "The buckets get abandoned right when they mattered most, and now there's a balance to pay off too.", delta: { moneyScore: -12 }, xpMultiplier: 0.5 } },
              { id: 'd', label: "Skip the trip, and also pick up a few extra work-study hours to cover the rent increase", consequence: { text: "More effort, but it protects both the wants and savings buckets by growing income instead of shrinking them.", delta: { moneyScore: 9, checking: 50 }, xpMultiplier: 1.15 } }
            ]
          }
        ]
      },
      {
        id: 'needs_wants',
        topic: 'Needs vs. Wants: Staying in the Black',
        character: { name: 'Hammy', tagline: 'Deciding what actually belongs in the budget' },
        initialState: { checking: 200, savings: 0, moneyScore: 50 },
        bossAchievementId: 'black_not_red',
        chapters: [
          {
            id: 'nw1', type: 'story', title: 'Labeled Right, Spent Wrong',
            beats: [
              { speaker: 'intro', text: "Hammy carefully labeled rent as a need and brunch as a want, exactly like the 50/30/20 rule says. By the end of the month, they'd still spent more than they earned." },
              { speaker: 'Hammy', text: '"I did the categories right! How am I still in the red?"' },
              { speaker: 'narrator', text: "Labeling things correctly isn't the same as catching a deficit before it happens. Let's find the gap." },
              { speaker: 'Hammy', text: '"Okay, so knowing the categories isn\'t enough on its own. What am I missing?"' }
            ]
          },
          {
            id: 'nw_t1', type: 'teach', title: 'Budget Deficit',
            concepts: [
              {
                term: 'Budget Deficit',
                plain: "A deficit simply means your expenses exceeded your income for the period, you spent more than you actually had coming in. It's not about any one purchase, it's the total running behind the total.",
                analogy: "It's like a bathtub draining faster than the faucet fills it, even if every drop leaving is \"justified,\" the water level still falls.",
                check: { statement: 'A budget deficit means you saved more than 20% of your income this month.', isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'nw_t2', type: 'teach', title: 'The Gray Zone',
            concepts: [
              {
                term: 'Semi-Needs (the Gray Zone)',
                plain: "Some expenses aren't purely a need or a want, a $60 phone plan might be a need for safety and class coordination, but a $200 top-tier plan is partly a want. The mistake isn't miscategorizing occasionally, it's never questioning the categories at all.",
                analogy: "It's like a menu item that's \"healthy-ish,\" it's not automatically a splurge OR automatically fine, it depends on the specific choice.",
                check: { statement: 'Every expense fits perfectly into either "need" or "want" with zero gray area.', isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'nw_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Budget Deficit', definition: 'When expenses exceed income for the period.' },
              { term: 'Semi-Needs', definition: "Expenses that are part need, part want, and require real judgment." },
              { term: 'Tracking', definition: 'Checking actual spending against the plan as the month goes, not just at the end.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'nw_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: most deficits aren't caused by one big purchase, they're caused by several small \"it's just $8\" purchases that never got tracked. Checking your balance weekly catches drift while it's still small.",
            xpOnComplete: 1
          },
          {
            id: 'nw_t3', type: 'teach', title: 'Catching It Early',
            concepts: [
              {
                term: 'Mid-Month Check-In',
                plain: "A quick weekly glance at what's actually left in each bucket, compared to what should be left at this point in the month, catches a deficit while there's still time to adjust. Waiting until the statement arrives means the damage is already done.",
                analogy: "It's like checking the gas gauge on a road trip instead of finding out you're empty only when the car actually stops.",
                check: { statement: 'A weekly check-in against the budget can catch a developing deficit before the month ends.', isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'nw_d1', type: 'decision',
            title: "Week 3 Check-In",
            prompt: "Hammy checks their wants bucket at week 3 (of 4) and it's already 90% spent. What should they do?",
            hintText: "Think back to Mid-Month Check-In: is week 3 a good time to notice this, or too late to matter?",
            choices: [
              {
                id: 'a', label: "Notice, but keep spending the same way, it's only a feeling",
                outcome: {
                  text: "By week 4, the wants bucket runs out entirely and spending spills over into money meant for needs.",
                  delta: { checking: -60, moneyScore: -6 },
                  compare: [{ label: 'Overspend by month end', value: 60 }, { label: 'Overspend if adjusted now', value: 0 }]
                }
              },
              {
                id: 'b', label: "Pull back on wants spending for the rest of the month",
                outcome: {
                  text: "Catching it at week 3 leaves enough runway to adjust before it turns into an actual deficit.",
                  delta: { savings: 20, moneyScore: 6 },
                  compare: [{ label: 'Overspend if adjusted now', value: 0 }, { label: 'Overspend by month end', value: 60 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'nw_ms1', type: 'microsim', title: 'Recovering Mid-Month',
            prompt: "Hammy has $200 left in checking with 10 days left in the month. Fixed remaining needs are $90. Fit remaining wants spending and a savings top-up in without going negative.",
            hintText: "$90 is already committed to needs. That leaves $110 to split between the two sliders before going negative.",
            income: 200,
            fixedCosts: [
              { label: 'Remaining needs this month', amount: 90 }
            ],
            sliders: [
              { id: 'wants', label: 'Remaining wants spending', min: 0, max: 110, step: 10, default: 40 },
              { id: 'savings', label: 'Savings top-up', min: 0, max: 110, step: 10, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That goes negative with 10 days still left in the month. Pull back on one of the sliders.", ok: false },
              { maxLeftover: 19, text: "It fits, but it's tight for the rest of the month.", ok: true },
              { maxLeftover: Infinity, text: "Solid recovery, Hammy caught the drift with enough runway to fix it.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'nw_t4', type: 'teach', title: 'Fixing a Deficit After It Happens',
            concepts: [
              {
                term: 'Recovering From a Deficit',
                plain: "If a deficit already happened, the fix is the same either way: cut wants spending first (it's the most flexible category), then look for a short-term way to add income if the gap is large. Never treat a one-time deficit as reason to abandon the budget altogether.",
                analogy: "It's like course-correcting a bike after a wobble, small steering adjustments, not slamming the brakes and giving up on the ride.",
                check: { statement: "The recommended first move to fix a deficit is cutting the wants category before anything else.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'nw_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Mid-Month Check-In', definition: 'A weekly glance at spending against the plan, catches drift early.' },
              { term: 'Recovering From a Deficit', definition: 'Cut wants first, then look for short-term income if the gap is large.' },
              { term: 'Budget Deficit', definition: 'When expenses exceed income for the period.' }
            ],
            hintText: "One term is a HABIT that prevents deficits, one is the FIX after one happens, and one is the deficit itself.",
            xpOnComplete: 4
          },
          {
            id: 'nw_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "Correctly labeling every expense as a need or want automatically prevents a budget deficit.",
            isTrue: false,
            explanation: "It's a myth. Categorizing correctly matters, but a deficit still happens if you don't actually TRACK spending against the plan as the month goes.",
            xpOnComplete: 2
          },
          {
            id: 'nw_myth1', type: 'mythcards', title: 'Needs vs. Wants Myths',
            cards: [
              { myth: "A single small purchase is usually what causes a budget deficit.", isTrue: false, explanation: "Deficits are usually the sum of several small untracked purchases, not one big splurge." },
              { myth: "Some expenses genuinely fall in a gray area between need and want.", isTrue: true, explanation: "True, a basic phone plan versus a premium one is a good example, the categorization requires judgment, not a rigid rule." },
              { myth: "Waiting until the end-of-month statement is a fine way to catch a deficit.", isTrue: false, explanation: "By the time the statement arrives, the deficit already happened, a weekly check-in catches it while there's still time to adjust." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'nw_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [2, 3],
            hintTexts: [
              "Think about which category, need or want, an expense you truly can't function without belongs in.",
              "Think about what it means when total expenses end up higher than total income."
            ]
          },
          {
            id: 'nw_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Staying in the Black Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's money habits shift as they practice catching deficits before they happen. Tap each decision to see the impact.",
            hintText: "Weekly check-ins and cutting wants first when things get tight are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Check the wants bucket weekly instead of only at month's end", scoreDelta: 14, note: "Catching drift early is the single biggest deficit-prevention habit." },
              { id: 'd2', label: "Cut wants spending first when a bucket runs low", scoreDelta: 9, note: "Wants is the most flexible category, the natural first place to adjust." },
              { id: 'd3', label: "Ignore a bucket that's already 90% spent with a week still left", scoreDelta: -13, note: "Ignoring an early warning sign is exactly how small drift turns into a real deficit." },
              { id: 'd4', label: "Reclassify a daily $8 coffee habit as a \"need\" to justify it", scoreDelta: -7, note: "Miscategorizing wants as needs hides the real picture from yourself." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'nw_t5', type: 'teach', title: 'The Goal Is Awareness, Not Perfection',
            concepts: [
              {
                term: 'Staying in the Black',
                plain: "\"Staying in the black\" just means expenses stay at or below income, consistently. It doesn't require perfect categorization every time, it requires noticing drift early and adjusting before it becomes an actual deficit.",
                analogy: "It's less like a strict exam with one right answer, and more like driving with your eyes on the road, small corrections beat a single perfect starting angle.",
                check: { statement: '"Staying in the black" requires perfectly categorizing every single expense with no exceptions.', isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'nw_boss', type: 'bossbattle', title: 'The Group Trip Invite',
            scenario: "Hammy's wants bucket is already at 85% with a week left in the month when friends invite them on a $70 weekend trip. What does Hammy do?",
            hintText: "Remember Mid-Month Check-In: an 85% bucket with a week left is exactly the kind of early signal worth acting on.",
            choices: [
              { id: 'a', label: "Decline the trip this month, wants bucket is nearly spent", consequence: { text: "A hard pass, but the budget stays intact and next month isn't playing catch-up.", delta: { moneyScore: 10 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Go anyway and let the wants bucket run over", consequence: { text: "Fun for a weekend, but the overspend eats into money meant for needs or savings.", delta: { moneyScore: -9, checking: -70 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Ask if there's a cheaper way to join part of the trip instead of the full cost", consequence: { text: "A partial yes keeps the wants bucket mostly intact while still staying connected with friends.", delta: { moneyScore: 6, checking: -25 }, xpMultiplier: 1.05 } },
              { id: 'd', label: "Cover it by skipping this month's savings deposit instead", consequence: { text: "It avoids overspending the wants bucket, but quietly stalls the progress the savings bucket was making.", delta: { moneyScore: -4, savings: -40 }, xpMultiplier: 0.8 } }
            ]
          }
        ]
      },
      {
        id: 'campus_money',
        topic: 'Day-to-Day Money Management on Campus',
        character: { name: 'Hammy', tagline: 'Managing meal swipes, cash, and cards day to day' },
        initialState: { checking: 150 },
        chapters: [
          {
            id: 'cm0', type: 'story', title: 'The Last Week',
            beats: [
              { speaker: 'intro', text: "Hammy has $150 in checking and a full week of decisions before their financial aid refund posts. Every choice either protects that cushion or eats into it." }
            ]
          },
          {
            id: 'cm1', type: 'decision', title: 'Monday: Meal Swipes',
            prompt: "Hammy's meal plan is unlimited, but they've been skipping the dining hall to DoorDash instead, about $18 an order, four times this week so far.",
            hintText: "Is the meal plan already covering this for free?",
            choices: [
              { id: 'a', label: 'Keep DoorDashing, it\'s already how the week started', outcome: { text: 'Another $54 gone on delivery fees for food already free at the dining hall.', delta: { checking: -54 }, compare: [{ label: 'Spent', value: 54 }, { label: 'Kept', value: 0 }] } },
              { id: 'b', label: 'Actually use the meal swipes for the rest of the week', outcome: { text: 'Zero extra spent — the meal plan was already covering this.', delta: { checking: 0 }, compare: [{ label: 'Spent', value: 0 }, { label: 'Kept', value: 54 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'cm2', type: 'decision', title: 'Wednesday: The Surprise Show',
            prompt: "A favorite band just announced a surprise $45 show this weekend. Tickets are going fast.",
            hintText: "Rent is due in 2 days — how much cushion is left after that?",
            choices: [
              { id: 'a', label: 'Buy the ticket now, before it sells out', outcome: { text: 'Rent\'s still due in 2 days, and now there\'s less cushion heading into it.', delta: { checking: -45 }, compare: [{ label: 'Spent', value: 45 }, { label: 'Kept', value: 0 }] } },
              { id: 'b', label: 'Skip this one, catch the next show after the refund posts', outcome: { text: 'A real skip, but nothing this week\'s budget couldn\'t afford to lose.', delta: { checking: 0 }, compare: [{ label: 'Spent', value: 0 }, { label: 'Kept', value: 45 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'cm3', type: 'decision', title: 'Saturday: Brunch',
            prompt: "A group of friends invites Hammy to brunch, about $22, with two days left until the refund posts.",
            hintText: "Is there a free version of the same time together?",
            choices: [
              { id: 'a', label: 'Go to brunch', outcome: { text: 'A nice morning, but that\'s $22 that could\'ve been the cushion between Hammy and $0.', delta: { checking: -22 }, compare: [{ label: 'Spent', value: 22 }, { label: 'Kept', value: 0 }] } },
              { id: 'b', label: 'Suggest a free hangout instead — coffee and a study session at home', outcome: { text: 'Same friends, same time together, $22 still in checking.', delta: { checking: 0 }, compare: [{ label: 'Spent', value: 0 }, { label: 'Kept', value: 22 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'cm4', type: 'bossbattle', title: 'Friday: Rent Day',
            scenario: "Rent auto-pays tomorrow: $110, already accounted for in Hammy's checking balance. But a friend suggests putting $50 of it on a credit card instead, \"to save cash.\"",
            hintText: "Does moving money to a card actually save anything, or just add interest on top?",
            choices: [
              { id: 'a', label: 'Let rent auto-pay as planned', consequence: { text: 'Handled — exactly what that $110 was already budgeted for.', delta: { checking: -110 }, xpMultiplier: 1.25 } },
              { id: 'b', label: 'Panic and put $50 of it on a credit card "to save cash"', consequence: { text: 'Now there\'s a card balance accruing interest on top of everything else — the "cash saved" cost more than it kept.', delta: { checking: -60 }, xpMultiplier: 0.6 } }
            ]
          }
        ]
      },
      {
        id: 'fafsa_timeline',
        topic: 'The FAFSA & Financial Aid Timeline',
        character: { name: 'Hammy', tagline: 'Racing a FAFSA deadline' },
        initialState: {},
        chapters: [
          { id: 'fafsa_timeline_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on The FAFSA & Financial Aid Timeline." }
            ]
          }
        ]
      },
      {
        id: 'aid_offer',
        topic: 'Grants & Scholarships: Your Aid Offer',
        character: { name: 'Hammy', tagline: 'Reading a financial aid offer letter' },
        initialState: {},
        chapters: [
          { id: 'aid_offer_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Grants & Scholarships: Your Aid Offer." }
            ]
          }
        ]
      },
      {
        id: 'payment_plans',
        topic: 'Payment Plans & Closing the Tuition Gap',
        character: { name: 'Hammy', tagline: 'Figuring out how to cover the rest of tuition' },
        initialState: {},
        chapters: [
          { id: 'payment_plans_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Payment Plans & Closing the Tuition Gap." }
            ]
          }
        ]
      },
      {
        id: 'opportunity_cost',
        topic: 'Opportunity Cost of Spending Decisions',
        character: { name: 'Hammy', tagline: 'Weighing one purchase against another' },
        initialState: { checking: 150, savings: 65 },
        chapters: [
          {
            id: 'oc0', type: 'story', title: 'Every Dollar Has a Job',
            beats: [
              { speaker: 'intro', text: "Hammy just spent $80 on a concert ticket without a second thought. But that $80 didn't just disappear — it was a choice. Today, you'll help Hammy see exactly what three spending decisions this week actually cost beyond the price tag." }
            ]
          },
          {
            id: 'oc1', type: 'teach', title: 'Opportunity Cost',
            concepts: [
              { term: 'Opportunity Cost', plain: "Every dollar you spend is a dollar that could have gone somewhere else. Opportunity cost is the value of the next-best thing you gave up to make that purchase.", analogy: "It's not just what you bought — it's everything else that money could have been instead.", check: { statement: 'Opportunity cost only applies to big purchases, not everyday spending.', isTrue: false } }
            ],
            xpOnComplete: 2
          },
          {
            id: 'oc2', type: 'decision', title: 'Monday: The Concert',
            prompt: "Hammy's friends invite them to a concert. Tickets are $80. Hammy has $150 in checking and $65 saved toward a new laptop.",
            hintText: "Think about what that $80 could otherwise cover.",
            choices: [
              { id: 'a', label: 'Buy the ticket', outcome: { text: 'That\'s about 3 weeks of groceries, or $80 closer to the laptop fund, gone for one night out.', delta: { checking: -80 }, compare: [{ label: 'Spent', value: 80 }, { label: 'Kept', value: 0 }] } },
              { id: 'b', label: 'Skip it, keep the $80', outcome: { text: 'A night out with friends, given up — but the $80 stays put.', delta: { checking: 0 }, compare: [{ label: 'Spent', value: 0 }, { label: 'Kept', value: 80 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'oc3', type: 'decision', title: 'Wednesday: The Textbook',
            prompt: "Next semester's textbook is $110 new, or $70 used online with 3–5 day shipping. Hammy needs it by Friday for an assignment preview.",
            hintText: "Is guaranteed speed worth the extra $40?",
            choices: [
              { id: 'a', label: 'Buy new today, guaranteed on time', outcome: { text: 'That\'s $40 that could have covered a week of gas, spent on speed alone.', delta: { checking: -110 }, compare: [{ label: 'Spent', value: 110 }, { label: 'Alternative', value: 70 }] } },
              { id: 'b', label: 'Order used and borrow a friend\'s copy until it arrives', outcome: { text: 'A little extra coordinating, but $40 stays in checking.', delta: { checking: -70 }, compare: [{ label: 'Spent', value: 70 }, { label: 'Saved', value: 40 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'oc4', type: 'decision', title: 'Saturday: The Hoodie',
            prompt: "A promo email offers 40% off a $60 hoodie — $36 for the next 2 hours. Hammy wasn't planning to buy anything.",
            hintText: "Was this already on the list, or is the countdown doing the deciding?",
            choices: [
              { id: 'a', label: 'Buy it, the deal is too good to pass up', outcome: { text: 'Almost a whole week of food delivery budget, spent on something not planned.', delta: { checking: -36 }, compare: [{ label: 'Spent', value: 36 }, { label: 'Kept', value: 0 }] } },
              { id: 'b', label: 'Close the email and think it over for 24 hours', outcome: { text: 'If it\'s still wanted tomorrow, it\'ll likely still be there — the urgency wasn\'t real.', delta: { checking: 0 }, compare: [{ label: 'Spent', value: 0 }, { label: 'Kept', value: 36 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'oc5', type: 'bossbattle', title: 'The Week in Review',
            scenario: "Looking back at the week, Hammy realizes every \"yes\" had a real cost attached, even the small ones. One more offer shows up: a friend wants to split a $40 Uber to a party across town instead of taking a $6 bus.",
            hintText: "What's the actual gap between these two options, and what could that gap buy instead?",
            choices: [
              { id: 'a', label: 'Split the Uber, it\'s more fun and faster', consequence: { text: 'That\'s $14 more than the bus for the same trip — a real cost for convenience.', delta: { checking: -20 }, xpMultiplier: 0.75 } },
              { id: 'b', label: 'Take the bus and pocket the difference', consequence: { text: 'Same destination, more of that $40 still in checking — opportunity cost, applied.', delta: { checking: -6 }, xpMultiplier: 1.25 } }
            ]
          }
        ]
      },
      {
        id: 'gray_zone',
        topic: 'The Gray Zone: When Needs and Wants Overlap',
        character: { name: 'Hammy', tagline: "Arguing with themself over a \"need\"" },
        initialState: {},
        chapters: [
          {
            id: 'gz0', type: 'story', title: 'Sorting It Out',
            beats: [
              { speaker: 'intro', text: "Marketing is designed to make wants feel like needs. Before Hammy's next purchase, can they actually tell the difference — and does it matter?" }
            ]
          },
          {
            id: 'gz1', type: 'teach', title: 'Needs, Wants & the Gray Zone',
            concepts: [
              { term: 'Need', plain: "Something you can't reasonably go without — rent, groceries, a required textbook, insurance.", analogy: "If skipping it creates a real problem, it's a need.", check: { statement: 'A daily $6 coffee is generally considered a need.', isTrue: false } },
              { term: '"It Depends"', plain: "Some expenses genuinely depend on context — a gym membership used three times a week supports your health; one forgotten about is just a recurring charge.", analogy: "Same expense, different situation, different answer.", check: { statement: 'Every expense fits neatly into either "need" or "want" with no in-between.', isTrue: false } }
            ],
            xpOnComplete: 2
          },
          {
            id: 'gz2', type: 'matching', title: 'Match It! Need, Want, or Depends',
            pairs: [
              { term: 'Rent', definition: 'Need — a real problem if skipped' },
              { term: 'Concert tickets', definition: 'Want — nice to have, not essential' },
              { term: 'A gym membership used 3x/week', definition: 'Depends — a want that supports health, if actually used' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'gz3', type: 'decision', title: 'The Streaming Stack',
            prompt: "Hammy has five streaming subscriptions but can only remember actively watching two of them this month.",
            hintText: "Which category fits a subscription nobody remembers using?",
            choices: [
              { id: 'a', label: 'Keep all five, cancelling feels like a hassle', outcome: { text: 'The three forgotten subscriptions are pure subscription creep — a want quietly billing every month.', delta: {}, compare: [{ label: 'Monthly cost kept', value: 45 }, { label: 'Could be saved', value: 27 }] } },
              { id: 'b', label: 'Cancel the three unused ones', outcome: { text: 'A monthly reminder to check for creep pays off immediately.', delta: {}, compare: [{ label: 'Monthly cost kept', value: 18 }, { label: 'Saved', value: 27 }] } }
            ],
            xpOnComplete: 5
          }
        ]
      },
      {
        id: 'budget_setup',
        parentQuestId: 'budget_rule',
        topic: 'Setting Up a Real Budget: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually building a working budget instead of just knowing the rule' },
        initialState: { checking: 300 },
        chapters: [
          {
            id: 'bs0', type: 'story', title: 'Knowing It vs. Doing It',
            beats: [
              { speaker: 'intro', text: "Hammy can recite the 50/30/20 rule perfectly. The actual budget, though, has never been written down anywhere. Let's fix that." }
            ]
          },
          {
            id: 'bs1', type: 'teach', title: 'Step 1 & 2: Track & Sort',
            concepts: [
              { term: 'Step 1: Track a Real Week of Spending', plain: "Before building a budget, look at what actually gets spent — pull up a week or two of bank and card transactions. Most people are surprised by at least one category.", analogy: "You can't fix a leak without first finding where the water is going.", check: { statement: 'The most useful first step in budgeting is guessing spending amounts instead of checking real transactions.', isTrue: false } },
              { term: 'Step 2: Sort Into Needs, Wants, Savings', plain: "Label each expense from the tracked week as a need (rent, groceries), a want (dining out, subscriptions), or savings/debt payoff. This turns a vague sense of overspending into actual numbers per category.", analogy: "It's the same sorting exercise as needs vs. wants, just applied to real transactions instead of hypothetical examples.", check: {} }
            ],
            xpOnComplete: 3
          },
          {
            id: 'bs2', type: 'teach', title: 'Step 3 & 4: Pick a Tool & Review',
            concepts: [
              { term: 'Step 3: Pick a Tool to Track It', plain: "A budgeting app (many banks include one free), a simple spreadsheet, or even a notes app all work — the best tool is whichever one actually gets checked regularly. Set the 50/30/20 percentages as targets to compare against.", analogy: "The fanciest budgeting app in the world does nothing if it's never opened.", check: { statement: 'The most important feature of a budgeting tool is that it actually gets used consistently.', isTrue: true } },
              { term: 'Step 4: Review & Adjust Monthly', plain: "At the end of each month, compare actual spending against the 50/30/20 targets. Going over in one category isn't a failure — it's information for adjusting next month.", analogy: "A budget isn't a grade to pass or fail, it's a dashboard to check and steer by.", check: {} }
            ],
            xpOnComplete: 3
          },
          {
            id: 'bs3', type: 'decision', title: 'The First Month',
            prompt: "Hammy's first tracked month shows 42% went to wants instead of the targeted 30%. What's the best next move?",
            hintText: "Is one over-budget month a crisis, or a data point?",
            choices: [
              { id: 'a', label: 'Give up on budgeting since the numbers were already off', outcome: { text: "Abandoning the budget after one imperfect month means losing the exact data needed to actually improve.", delta: {}, compare: [{ label: 'Insight gained', value: 0 }, { label: 'Insight from adjusting', value: 1 }] } },
              { id: 'b', label: "Look at which specific \"want\" categories ran high and adjust next month's plan", outcome: { text: "Now there's a specific target to adjust instead of a vague sense of overspending.", delta: {}, compare: [{ label: 'Insight gained', value: 1 }, { label: 'Insight from quitting', value: 0 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'bs4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [1, 3],
            hintTexts: [
              "20% of a monthly take-home amount is one-fifth of it.",
              "Think about what it means when spending is bigger than income."
            ]
          }
        ]
      }
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
    ],
    quests: [
      {
        id: 'emergency_fund',
        topic: 'Building Your First Emergency Fund',
        character: { name: 'Hammy', tagline: 'Starting an emergency fund from zero' },
        initialState: { checking: 47, savings: 0, moneyScore: 50 },
        bossAchievementId: 'cushion_builder',
        chapters: [
          {
            id: 'ef1', type: 'story', title: 'The Laptop Died at the Worst Time',
            beats: [
              { speaker: 'intro', text: "Hammy's laptop just died. It's finals week. A replacement costs $400. Hammy has $47 in checking." },
              { speaker: 'Hammy', text: '"This is the WORST possible timing. What do I even do right now?"' },
              { speaker: 'narrator', text: "This is exactly what a missing emergency fund looks like, and it was completely avoidable. Let's fix that going forward." },
              { speaker: 'Hammy', text: '"Okay, I clearly need a cushion. Where do I even start with $47 to my name?"' }
            ]
          },
          {
            id: 'ef_t1', type: 'teach', title: 'The Emergency Fund',
            concepts: [
              {
                term: 'Emergency Fund',
                plain: "Money set aside specifically for genuine surprises, a broken laptop, a medical bill, a sudden car repair. It's kept separate from everyday spending money so it's never accidentally used on anything else.",
                analogy: "It's like a fire extinguisher mounted on the wall, you hope to never need it, but it's useless if it's not there when you do.",
                check: { statement: "An emergency fund is meant to be spent on planned expenses like a vacation.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ef_t2', type: 'teach', title: 'How Much Is Enough',
            concepts: [
              {
                term: 'Starter Emergency Fund',
                plain: "A full emergency fund covers 3-6 months of expenses, but that number is intimidating from zero. A starter goal of $500-$1,000 covers most single surprises, a dead laptop, a car repair, a medical copay, and is a realistic first target.",
                analogy: "It's like training for a marathon by first running a 5K, the smaller milestone builds real momentum toward the bigger goal.",
                check: { statement: "A $500-$1,000 starter fund is a reasonable first goal before working toward 3-6 months of expenses.", isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ef_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Emergency Fund', definition: 'Money set aside specifically for genuine surprises, kept separate from spending money.' },
              { term: 'Starter Emergency Fund', definition: 'A realistic first goal of $500-$1,000 before working toward a bigger cushion.' },
              { term: 'Full Emergency Fund', definition: 'Enough savings to cover 3-6 months of expenses.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ef_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: an emergency fund doesn't have to start big. Even $10/week builds a $500 cushion in about a year, and every dollar in it is a dollar that doesn't have to go on a credit card during a real crisis.",
            xpOnComplete: 1
          },
          {
            id: 'ef_t3', type: 'teach', title: 'Where It Lives',
            concepts: [
              {
                term: 'Keeping It Separate',
                plain: "An emergency fund works best in its own account, not mixed into everyday checking. Separate means you won't accidentally spend it on a normal Tuesday, and it stays easy to access quickly when an actual emergency hits.",
                analogy: "It's like keeping spare keys somewhere specific instead of loose in a junk drawer, separate and easy to find exactly when you need it.",
                check: { statement: "Keeping emergency fund money mixed into your everyday checking account makes it easier to protect.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ef_d1', type: 'decision',
            title: "The Financial Aid Refund",
            prompt: "Hammy's financial aid refund comes in $300 higher than expected. What's the smartest move?",
            hintText: "Think back to Starter Emergency Fund: Hammy currently has $0 saved. Does this windfall get them closer to a real cushion, or does it just disappear into spending?",
            choices: [
              {
                id: 'a', label: 'Treat it as free money and spend it',
                outcome: {
                  text: "The $300 disappears within days, and Hammy is right back to zero cushion, one surprise away from a crisis.",
                  delta: { checking: 300, moneyScore: -6 },
                  compare: [{ label: 'Emergency fund after', value: 0 }, { label: 'Emergency fund if saved', value: 300 }]
                }
              },
              {
                id: 'b', label: 'Move it directly into a new emergency fund',
                outcome: {
                  text: "Hammy goes from $0 to $300 toward their starter goal, more than halfway there, from one windfall.",
                  delta: { savings: 300, moneyScore: 8 },
                  compare: [{ label: 'Emergency fund if saved', value: 300 }, { label: 'Emergency fund if spent', value: 0 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'ef_ms1', type: 'microsim', title: "Fitting In a Monthly Deposit",
            prompt: "Hammy's monthly income is $650. Fixed costs already use $480. Help them fit an emergency fund deposit in without going negative.",
            hintText: "Add up the fixed costs ($250 + $130 + $60 + $40 = $480). That leaves $170 of the $650 to split between the two sliders before going negative.",
            income: 650,
            fixedCosts: [
              { label: 'Rent share', amount: 250 },
              { label: 'Meal plan top-up', amount: 130 },
              { label: 'Phone & subscriptions', amount: 60 },
              { label: 'Transit', amount: 40 }
            ],
            sliders: [
              { id: 'emergencyFund', label: 'Emergency fund deposit', min: 0, max: 150, step: 10, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 20, max: 170, step: 10, default: 20 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try a smaller emergency fund deposit or spending amount.", ok: false },
              { maxLeftover: 19, text: "It fits, but the emergency fund is growing slowly at this rate.", ok: true },
              { maxLeftover: Infinity, text: "Solid, the emergency fund is actually growing month over month.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ef_t4', type: 'teach', title: 'Replenishing After Use',
            concepts: [
              {
                term: 'Replenishing the Fund',
                plain: "Using the emergency fund for an actual emergency is exactly what it's for, that's a win, not a failure. The habit that matters most afterward is rebuilding it back to the target, treating the refill like any other recurring bill until it's whole again.",
                analogy: "It's like refilling a fire extinguisher after using it, using it correctly doesn't mean you're done maintaining it.",
                check: { statement: "Using your emergency fund for a real emergency means you failed at budgeting.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ef_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Keeping It Separate', definition: 'Storing emergency money apart from everyday checking so it stays protected.' },
              { term: 'Replenishing the Fund', definition: 'Rebuilding the fund back to target after using it for a real emergency.' },
              { term: 'Emergency Fund', definition: 'Money set aside specifically for genuine surprises.' }
            ],
            hintText: "One term is about WHERE it lives, one is about REBUILDING it after use, and one is the fund itself.",
            xpOnComplete: 4
          },
          {
            id: 'ef_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "You need a full 3-6 months of expenses saved before an emergency fund is worth having at all.",
            isTrue: false,
            explanation: "It's a myth. Even a small starter fund of $500-$1,000 prevents most everyday emergencies from turning into debt, it doesn't need to be the full target to already be useful.",
            xpOnComplete: 2
          },
          {
            id: 'ef_myth1', type: 'mythcards', title: 'Emergency Fund Myths',
            cards: [
              { myth: "A credit card is just as good as an emergency fund for surprise expenses.", isTrue: false, explanation: "A credit card charges interest on the balance, an emergency fund doesn't cost you anything to use." },
              { myth: "A $500 starter fund is genuinely useful, even though it's far from the full 3-6 month target.", isTrue: true, explanation: "True, it covers most single surprises and prevents the immediate need to borrow." },
              { myth: "Emergency fund money should sit in the same account as everyday spending money.", isTrue: false, explanation: "Keeping it separate protects it from being spent by accident on a normal day." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'ef_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [1, 10],
            hintTexts: [
              "Think about what the smartest first move is with a little extra money at month's end.",
              "Think about which savings goal should generally come first when money is tight."
            ]
          },
          {
            id: 'ef_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Cushion-Building Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's financial cushion grow as they build better saving habits. Tap each decision to see the impact.",
            hintText: "Automating deposits and redirecting windfalls into the fund are what drive most of the growth here.",
            decisions: [
              { id: 'd1', label: "Move a financial aid refund straight into the emergency fund", scoreDelta: 14, note: "A windfall used this way turns into a real cushion instead of disappearing." },
              { id: 'd2', label: "Set up a small automatic weekly transfer to the fund", scoreDelta: 12, note: "Consistency matters more than the size of any single deposit." },
              { id: 'd3', label: "Treat the emergency fund like a spare checking account", scoreDelta: -10, note: "Mixing it with everyday spending defeats the purpose of keeping it separate." },
              { id: 'd4', label: "Skip refilling the fund after using it for a real repair", scoreDelta: -6, note: "The fund only keeps protecting you if it gets rebuilt after use." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ef_t5', type: 'teach', title: 'A Cushion, Not a Cage',
            concepts: [
              {
                term: 'What the Fund Actually Buys You',
                plain: "An emergency fund isn't really about the dollar amount, it's about not having a $400 laptop death turn into a $400 credit card balance with interest. Even a small cushion changes a crisis into an inconvenience.",
                analogy: "It's the difference between a pothole that jolts the car and one that blows the tire, the cushion doesn't remove the bump, it just keeps it from becoming a much bigger problem.",
                check: { statement: "The main value of an emergency fund is avoiding high-interest debt when something unexpected happens.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ef_boss', type: 'bossbattle', title: 'The Replacement Laptop',
            scenario: "Hammy still needs that $400 laptop. Three months into building the habit, they now have $250 in their new emergency fund. What's the smartest way to cover the gap?",
            hintText: "Weigh using the $250 cushion against other options, remember what an emergency fund is actually FOR.",
            choices: [
              { id: 'a', label: "Use the $250 fund, cover the remaining $150 with a work-study shift this week", consequence: { text: "The fund does exactly its job, and the gap gets closed without any interest charges at all.", delta: { moneyScore: 12, savings: -250, checking: 150 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Put the whole $400 on a credit card instead of touching savings", consequence: { text: "The emergency fund sits untouched, but now there's a balance accruing interest for something it was literally built to cover.", delta: { moneyScore: -10 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Use the $250 fund and put the remaining $150 on a card, paid off next check", consequence: { text: "A reasonable middle ground, most of the cost is covered without debt, and the rest is paid off fast.", delta: { moneyScore: 6, savings: -250 }, xpMultiplier: 0.95 } },
              { id: 'd', label: "Borrow $400 from a friend instead of using the fund", consequence: { text: "It avoids touching savings, but trades a financial problem for a social one, and the fund still isn't doing its job.", delta: { moneyScore: -4 }, xpMultiplier: 0.8 } }
            ]
          }
        ]
      },
      {
        id: 'hy_savings',
        topic: 'High-Yield Savings Accounts Explained',
        character: { name: 'Hammy', tagline: 'Comparing savings accounts for the first time' },
        initialState: { checking: 200, savings: 1000, moneyScore: 50 },
        bossAchievementId: 'hysa_switcher',
        chapters: [
          {
            id: 'hy1', type: 'story', title: 'The Same $1,000, Two Different Banks',
            beats: [
              { speaker: 'intro', text: "Hammy checks their big bank's savings account: 0.01% APY. A friend mentions their online account pays 4.5%. Same $1,000 balance, same FDIC insurance." },
              { speaker: 'Hammy', text: '"Wait, that can\'t be a big difference... can it?"' },
              { speaker: 'narrator', text: "Let's actually run the numbers before Hammy assumes it doesn't matter." },
              { speaker: 'Hammy', text: '"Okay, show me. If it\'s free money just for switching banks, I want to know."' }
            ]
          },
          {
            id: 'hy_t1', type: 'teach', title: 'High-Yield Savings Accounts',
            concepts: [
              {
                term: 'High-Yield Savings Account (HYSA)',
                plain: "A HYSA is a savings account, usually at an online bank, that pays significantly more interest than a traditional big-bank savings account. Same FDIC-insured safety, dramatically different return for holding the exact same money.",
                analogy: "It's like two identical parking garages charging wildly different monthly rates, same safety and function, very different cost of holding your car there.",
                check: { statement: "A HYSA is riskier than a traditional savings account because it pays more interest.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'hy_t2', type: 'teach', title: 'APY',
            concepts: [
              {
                term: 'APY (Annual Percentage Yield)',
                plain: "APY is the rate your balance actually grows over a year, including compounding. A traditional big-bank savings account might pay 0.01% APY, a HYSA might pay 4-5%, on the same $1,000, that's the difference between about 10 cents and about $45 a year.",
                analogy: "It's like two gardens with the exact same seed, one gets almost no sunlight, the other gets full sun, same starting point, very different growth.",
                check: { statement: "APY measures how much your savings balance actually grows over a year.", isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'hy_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'High-Yield Savings Account', definition: 'A savings account, usually online, that pays significantly more interest.' },
              { term: 'APY', definition: 'The rate your balance grows over a year, including compounding.' },
              { term: 'FDIC Insurance', definition: 'Protection that covers deposits up to $250,000 per bank, per depositor.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'hy_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: moving idle savings from a 0.01% account into a 4.5% HYSA is one of the easiest wins in personal finance, it takes about 10 minutes to open an account online, and the money is exactly as safe as it was before.",
            xpOnComplete: 1
          },
          {
            id: 'hy_t3', type: 'teach', title: 'Checking vs. Savings',
            concepts: [
              {
                term: 'Checking vs. Savings',
                plain: "Checking is for everyday spending, debit swipes, bill pay, constant movement. Savings, especially a HYSA, is for money you're holding toward a goal, it earns interest and is meant to sit largely untouched.",
                analogy: "Checking is a wallet, money moves in and out constantly. Savings is a piggy bank on a shelf, mostly left alone to grow.",
                check: { statement: "Checking accounts are generally meant for holding money long-term to earn interest.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hy_d1', type: 'decision',
            title: "Switching Banks",
            prompt: "Hammy has $1,000 sitting in a 0.01% APY account. Opening a HYSA takes about 10 minutes online. What should they do?",
            hintText: "Think back to APY: on $1,000, what's the real difference between 0.01% and 4.5% over a year?",
            choices: [
              {
                id: 'a', label: "Leave it where it is, switching seems like a hassle",
                outcome: {
                  text: "The $1,000 earns about 10 cents this year, essentially nothing, for no real reason beyond avoiding a 10-minute signup.",
                  delta: { moneyScore: -4 },
                  compare: [{ label: 'Interest earned (0.01% APY)', value: 0 }, { label: 'Interest earned (4.5% APY)', value: 45 }]
                }
              },
              {
                id: 'b', label: "Open a HYSA and move the $1,000 over",
                outcome: {
                  text: "Same $1,000, same safety, but now it earns roughly $45 this year instead of pennies, for about 10 minutes of setup.",
                  delta: { moneyScore: 8 },
                  compare: [{ label: 'Interest earned (4.5% APY)', value: 45 }, { label: 'Interest earned (0.01% APY)', value: 0 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'hy_ms1', type: 'microsim', title: "Growing the HYSA Balance",
            prompt: "Hammy's monthly income is $600. Fixed costs already use $420. Help them fit a HYSA deposit in without going negative.",
            hintText: "Add up the fixed costs ($220 + $120 + $50 + $30 = $420). That leaves $180 of the $600 to split between the two sliders before going negative.",
            income: 600,
            fixedCosts: [
              { label: 'Rent share', amount: 220 },
              { label: 'Meal plan top-up', amount: 120 },
              { label: 'Phone & subscriptions', amount: 50 },
              { label: 'Transit', amount: 30 }
            ],
            sliders: [
              { id: 'hysaDeposit', label: 'HYSA deposit', min: 0, max: 150, step: 10, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 30, max: 180, step: 10, default: 30 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try a smaller HYSA deposit or spending amount.", ok: false },
              { maxLeftover: 19, text: "It fits, but the HYSA balance is growing slowly at this rate.", ok: true },
              { maxLeftover: Infinity, text: "Solid, the HYSA balance is compounding steadily now.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hy_price1', type: 'priceisright', title: 'The Price Is Right: A Year of Interest',
            prompt: 'Hammy deposits $500 into a HYSA paying 4.5% APY and leaves it untouched for a year. Guess how much interest they earn.',
            hintText: '4.5% of $500 is the starting point, APY compounding adds just a little more on top of that simple estimate.',
            actualValue: 23, guessRange: { min: 0, max: 100, step: 5 },
            explanation: '$500 × 4.5% ≈ $22.50, rounding to about $23 with compounding. Small on its own, but it scales up fast as the balance grows.',
            xpOnComplete: 5
          },
          {
            id: 'hy_t4', type: 'teach', title: 'Avoiding Overdraft With a Linked Backup',
            concepts: [
              {
                term: 'Overdraft Protection',
                plain: "Many banks let you link a savings account as free automatic backup for checking. If checking runs to $0 and a small charge hits, the bank pulls the shortfall from linked savings instead of charging a $30+ overdraft fee.",
                analogy: "It's like a spare tire in the trunk, you rarely need it, but it turns a roadside disaster into a quick fix.",
                check: { statement: "Linking a savings account as overdraft backup always costs extra money to set up.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hy_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Checking vs. Savings', definition: 'Checking is for daily spending, savings holds money toward a goal and earns interest.' },
              { term: 'Overdraft Protection', definition: 'A linked savings account that covers a checking shortfall instead of triggering a fee.' },
              { term: 'APY', definition: 'The rate your balance grows over a year, including compounding.' }
            ],
            hintText: "One pair is about the PURPOSE of two account types, one is a SAFETY NET between them, and one is the growth RATE.",
            xpOnComplete: 4
          },
          {
            id: 'hy_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "A high-yield savings account is meaningfully riskier than a traditional big-bank savings account.",
            isTrue: false,
            explanation: "It's a myth. Both are FDIC-insured up to the same limits, the only real difference is the interest rate.",
            xpOnComplete: 2
          },
          {
            id: 'hy_myth1', type: 'mythcards', title: 'Savings Account Myths',
            cards: [
              { myth: "Online HYSAs are less safe than a traditional big-bank savings account.", isTrue: false, explanation: "Both are FDIC-insured the same way, the interest rate is the only meaningful difference." },
              { myth: "A 0.01% APY versus a 4.5% APY makes almost no real difference on a typical student balance.", isTrue: false, explanation: "On $1,000, that's about 10 cents versus about $45 a year, a real difference for zero extra risk." },
              { myth: "Linking a savings account as overdraft backup can help you avoid a $30+ overdraft fee.", isTrue: true, explanation: "True, many banks pull small shortfalls from linked savings automatically instead of charging the fee." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'hy_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 5],
            hintTexts: [
              "Think about what actually makes a savings account \"high-yield\" compared to a standard one.",
              "Think about the dollar gap between 0.01% and 4.5% APY on the exact same $1,000 balance."
            ]
          },
          {
            id: 'hy_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Smarter Savings Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's money habits improve as they make smarter decisions about where their savings actually live. Tap each one to see the impact.",
            hintText: "Moving idle money into a HYSA and linking overdraft protection are the two biggest wins here.",
            decisions: [
              { id: 'd1', label: "Move idle savings from a 0.01% account into a HYSA", scoreDelta: 14, note: "Same safety, dramatically better return, for about 10 minutes of setup." },
              { id: 'd2', label: "Link savings as free automatic overdraft backup", scoreDelta: 9, note: "This turns a $30+ fee into a non-event." },
              { id: 'd3', label: "Keep thousands sitting in a checking account earning nothing", scoreDelta: -10, note: "Checking accounts virtually never pay meaningful interest, that money should be working harder." },
              { id: 'd4', label: "Let checking run to exactly $0 with no backup linked", scoreDelta: -7, note: "One surprise charge at $0 balance is exactly how overdraft fees happen." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hy_t5', type: 'teach', title: 'A Ten-Minute Decision, A Yearlong Payoff',
            concepts: [
              {
                term: 'Why This Is an Easy Win',
                plain: "Unlike investing, which carries real risk, moving savings into a HYSA is close to a free upgrade, same FDIC protection, same liquidity, meaningfully more interest. It's one of the few financial moves with almost no downside.",
                analogy: "It's like switching to a free upgrade at checkout, same product, same guarantee, just objectively better terms.",
                check: { statement: "Moving savings into a HYSA involves meaningfully more risk than a traditional savings account.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hy_boss', type: 'bossbattle', title: 'The Idle $1,000',
            scenario: "Hammy realizes $1,000 has been sitting in a 0.01% APY account for over a year, untouched. What's the smartest move now?",
            hintText: "Remember APY: the account itself hasn't changed, but the difference in what it COULD be earning has been adding up the whole time.",
            choices: [
              { id: 'a', label: "Open a HYSA today and move the full $1,000 over immediately", consequence: { text: "The money starts earning real interest immediately, with the exact same safety it had before.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Keep putting it off, it's been fine so far", consequence: { text: "Every extra month in the old account is more missed interest for literally no benefit.", delta: { moneyScore: -8 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Move half now, and half after comparing a couple more HYSA options", consequence: { text: "A reasonable middle ground, most of the money starts earning more right away while Hammy finishes comparing rates.", delta: { moneyScore: 8 }, xpMultiplier: 1.05 } },
              { id: 'd', label: "Ask a friend for a recommendation before doing anything", consequence: { text: "Research is reasonable, but the money keeps earning close to nothing every day this drags on.", delta: { moneyScore: 2 }, xpMultiplier: 0.85 } }
            ]
          }
        ]
      },
      {
        id: 'checking_vs_savings',
        topic: 'Checking vs. Savings: Avoiding Fees',
        character: { name: 'Hammy', tagline: 'Untangling checking and savings accounts' },
        initialState: {},
        chapters: [
          { id: 'checking_vs_savings_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Checking vs. Savings: Avoiding Fees." }
            ]
          }
        ]
      },
      {
        id: 'interest_consistency',
        topic: 'How Interest & Consistency Compound Over Time',
        character: { name: 'Hammy', tagline: 'Setting up a recurring transfer and forgetting about it' },
        initialState: {},
        chapters: [
          { id: 'interest_consistency_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on How Interest & Consistency Compound Over Time." }
            ]
          }
        ]
      },
      {
        id: 'automate_savings',
        topic: 'Automating Your Savings Habits',
        character: { name: 'Hammy', tagline: 'Trying to make saving automatic' },
        initialState: {},
        chapters: [
          { id: 'automate_savings_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Automating Your Savings Habits." }
            ]
          }
        ]
      },
      {
        id: 'sinking_funds',
        topic: 'Sinking Funds for Predictable Costs',
        character: { name: 'Hammy', tagline: 'Planning ahead for a cost they know is coming' },
        initialState: {},
        chapters: [
          { id: 'sinking_funds_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Sinking Funds for Predictable Costs." }
            ]
          }
        ]
      },
      {
        id: 'savings_goals',
        topic: 'Setting & Prioritizing Savings Goals',
        character: { name: 'Hammy', tagline: 'Juggling three savings goals at once' },
        initialState: {},
        chapters: [
          { id: 'savings_goals_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Setting & Prioritizing Savings Goals." }
            ]
          }
        ]
      },
      {
        id: 'big_purchase',
        topic: 'Saving for a Big Purchase (Study Abroad, Car, Moving Out)',
        character: { name: 'Hammy', tagline: 'Saving up for one big goal' },
        initialState: {},
        chapters: [
          { id: 'big_purchase_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Saving for a Big Purchase (Study Abroad, Car, Moving Out)." }
            ]
          }
        ]
      },
      {
        id: 'open_savings',
        parentQuestId: 'hy_savings',
        topic: 'Opening a High-Yield Savings Account: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually opening a savings account that pays real interest' },
        initialState: { savings: 0 },
        chapters: [
          {
            id: 'os0', type: 'story', title: 'Time to Actually Open One',
            beats: [
              { speaker: 'intro', text: "Hammy knows a high-yield savings account beats a big bank's 0.01% APY — but the account itself doesn't exist yet. Knowing the theory and actually doing the paperwork are two different things. Let's walk through it, step by step." }
            ]
          },
          {
            id: 'os1', type: 'teach', title: 'Step 1 & 2: Comparing & Applying',
            concepts: [
              {
                term: 'Step 1: Compare a Few Options',
                plain: "Look for the highest APY with no monthly fees and no minimum balance requirement — many online banks (Ally, Marcus, SoFi, Discover) offer 4%+ with none of those catches. FDIC insurance up to $250,000 is standard on real banks and non-negotiable — never open an account without it.",
                analogy: "Shopping for a savings account is like comparing phone plans — same basic service, but the fine print on fees and rates varies a lot.",
                check: { statement: 'FDIC insurance is an optional extra that most savings accounts don\'t include.', isTrue: false }
              },
              {
                term: 'Step 2: Apply Online',
                plain: "Most online banks let you apply in about 10 minutes: legal name, address, Social Security number, and a way to fund the initial deposit — often by linking an existing checking account.",
                analogy: "It's the same basic information as any account signup, just with a routing and account number at the end to link it.",
                check: { statement: 'Opening an online HYSA typically requires visiting a branch in person.', isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'os2', type: 'teach', title: 'Step 3 & 4: Funding & Automating',
            concepts: [
              {
                term: 'Step 3: Make the First Deposit',
                plain: "Transfer money from an existing checking account — this usually takes 1–3 business days to clear the first time. Many online banks have no minimum opening deposit at all.",
                analogy: "Think of it as the first move-in payment — after that, deposits and transfers move faster.",
                check: { statement: 'Most online HYSAs require a large minimum deposit just to open the account.', isTrue: false }
              },
              {
                term: 'Step 4: Automate a Recurring Transfer',
                plain: "Set up an automatic transfer for payday — even $25 per paycheck — so saving happens without having to remember. This is the single easiest way to actually build the habit.",
                analogy: "\"Pay yourself first\" — the transfer happens before there's a chance to spend it.",
                check: { statement: 'Automating a recurring transfer is one of the most effective ways to actually save consistently.', isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'os3', type: 'decision', title: 'Picking the Account',
            prompt: "Hammy is comparing two options: a big-name bank paying 0.01% APY with a familiar app, or an online bank paying 4.5% APY that Hammy's never heard of but is FDIC-insured.",
            hintText: "Does FDIC insurance depend on how famous the bank is?",
            choices: [
              { id: 'a', label: 'Stick with the familiar big-name bank', outcome: { text: "Same FDIC-insured safety as the online option, but $1,000 earns about $0.10 a year instead of $45.", delta: { savings: 0 }, compare: [{ label: 'Interest on $1,000/yr', value: 0 }, { label: 'Online bank option', value: 45 }] } },
              { id: 'b', label: 'Open the online bank account instead', outcome: { text: "Same insured safety, a less familiar name, and roughly $45 a year instead of $0.10 on the same $1,000.", delta: { savings: 0 }, compare: [{ label: 'Interest on $1,000/yr', value: 45 }, { label: 'Big-bank option', value: 0 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'os4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 4],
            hintTexts: [
              "Think about the interest-rate gap between a big bank and an online HYSA.",
              "Think about what actually makes saving happen without relying on willpower alone."
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'investing', title: 'Investing', icon: '04', iconColor: 'lav', xpReward: 35,
    hook: 'Two students each invest $1,000 into the same fund. Alex starts at 18, Sam starts at 28. At 65, Alex has $21,000. Sam has $10,700. They invested the exact same amount. What made the difference?',
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
      { title: 'Compound Interest & Time', hook: 'Two students each invest $1,000 into the same fund. Alex starts at 18, Sam starts at 28. At 65, Alex has $21,000. Sam has $10,700. Same amount invested. What made the difference?', qIndices: [1, 2] },
      { title: 'Roth IRA Basics', hook: 'You have $50/month to invest and someone says "open a Roth IRA." You\'ve heard the words but don\'t know if you even qualify — do you need a big salary, a certain age, or a special account first?', qIndices: [0, 6] },
      { title: 'Contribution Limits & Where to Save First', hook: 'Your job offers a 403(b) with a match, and you\'re also eligible for a Roth IRA with a $7,000 annual limit. You can\'t max out both right now — which comes first?', qIndices: [4, 9] },
      { title: 'Index Funds & Diversification', hook: 'A friend tells you to put your $500 savings into one stock they\'re sure will "blow up." Another friend says index funds are the smarter move. What\'s actually different about spreading your money across hundreds of companies?', qIndices: [3, 5] },
      { title: 'Risk, Time Horizon & Staying the Course', hook: 'The market drops 15% the same month you started investing, right as your 60-year-old parent\'s retirement account also takes a hit. Should you both be reacting the same way?', qIndices: [7, 11] },
      { title: 'Getting Started Small', hook: 'You only have $25/month to invest and figure it\'s not worth starting until you\'ve saved up more. Meanwhile a friend jumps into whatever fund had the best return last year. Is either of you making the smart move?', qIndices: [8, 10] }
    ],
    quests: [
      {
        id: 'compound_early',
        topic: 'Compound Interest & Why Starting Early Wins',
        character: { name: 'Hammy', tagline: "Wondering if it's too early to start investing" },
        initialState: { savings: 1000, portfolioValue: 1000, moneyScore: 50 },
        bossAchievementId: 'early_starter',
        chapters: [
          {
            id: 'ce1', type: 'story', title: 'Same $1,000, Ten Years Apart',
            beats: [
              { speaker: 'intro', text: "Hammy hears about two students who each invested $1,000 in the same fund. One started at 18, the other at 28. At 65, the early starter has $21,000. The later starter has $10,700." },
              { speaker: 'Hammy', text: '"Same amount invested. Ten years apart. That\'s a $10,000 difference?"' },
              { speaker: 'narrator', text: "That gap is entirely explained by one concept, and it's worth understanding before Hammy decides investing can wait." },
              { speaker: 'Hammy', text: '"Okay, I want to actually understand this before I talk myself into waiting."' }
            ]
          },
          {
            id: 'ce_t1', type: 'teach', title: 'Compound Interest',
            concepts: [
              {
                term: 'Compound Interest',
                plain: "Compound interest means you earn returns on your original investment AND on the returns it already earned. Every year, the base that's growing gets a little bigger, so the growth itself grows too.",
                analogy: "It's like a snowball rolling downhill, it doesn't just add snow at a steady rate, the bigger it gets, the more it picks up with every rotation.",
                check: { statement: "Compound interest only pays out on your original deposit, never on interest already earned.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ce_t2', type: 'teach', title: 'Time Horizon',
            concepts: [
              {
                term: 'Time Horizon',
                plain: "This is how long your money stays invested before you need it. A longer horizon means more compounding cycles, which is why 10 extra years mattered more than any difference in skill or luck between the two investors.",
                analogy: "It's like two identical plants, one gets 10 extra years of sunlight and water. The extra TIME, not a different seed, explains the size difference.",
                check: { statement: "A longer time horizon gives compound interest more cycles to work with.", isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ce_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Compound Interest', definition: 'Earning returns on both your original investment and its past returns.' },
              { term: 'Time Horizon', definition: 'How long money stays invested before it\'s needed.' },
              { term: 'Principal', definition: 'The original amount of money invested, before any growth.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ce_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: the Rule of 72 estimates how long money takes to double, divide 72 by the annual return rate. At 7% average returns, 72 ÷ 7 ≈ 10 years to double. That's a fast, rough way to see compounding's power without a calculator.",
            xpOnComplete: 1
          },
          {
            id: 'ce_t3', type: 'teach', title: 'The Cost of Waiting',
            concepts: [
              {
                term: 'The Cost of Waiting',
                plain: "Every year you delay investing isn't just \"one year less,\" it's one fewer compounding cycle stacked on top of all the others still to come. That's why the gap between starting at 18 versus 28 is $10,000, not just proportionally 10 years' worth of contributions.",
                analogy: "It's like joining a relay race late, you're not just missing your leg of the race, you're missing the momentum the whole team builds by starting together.",
                check: { statement: "Delaying investing by a few years only costs you those exact years' worth of contributions, nothing more.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ce_d1', type: 'decision',
            title: "Wait Until There's More?",
            prompt: "Hammy has $50 saved up and is tempted to wait until they have \"a real amount\" before opening an investment account. What should they do?",
            hintText: "Think back to The Cost of Waiting: does the delay only cost the amount not yet saved, or something bigger too?",
            choices: [
              {
                id: 'a', label: 'Wait a few years until there\'s more to invest',
                outcome: {
                  text: "Every year of waiting is a year of compounding that can never be recovered later, no matter how much gets invested afterward.",
                  delta: { moneyScore: -6 },
                  compare: [{ label: 'Portfolio at 65 if started now', value: 21000 }, { label: 'Portfolio at 65 if delayed 10 years', value: 10700 }]
                }
              },
              {
                id: 'b', label: 'Invest the $50 now and add more as it comes',
                outcome: {
                  text: "The exact dollar amount matters less than getting started, every year invested now is a compounding cycle that can't be bought back later.",
                  delta: { portfolioValue: 50, moneyScore: 8 },
                  compare: [{ label: 'Portfolio at 65 if started now', value: 21000 }, { label: 'Portfolio at 65 if delayed 10 years', value: 10700 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'ce_ms1', type: 'microsim', title: "Fitting In a Monthly Investment",
            prompt: "Hammy's monthly income is $700. Fixed costs already use $520. Help them fit a monthly investment contribution in without going negative.",
            hintText: "Add up the fixed costs ($280 + $140 + $60 + $40 = $520). That leaves $180 of the $700 to split between the two sliders before going negative.",
            income: 700,
            fixedCosts: [
              { label: 'Rent share', amount: 280 },
              { label: 'Meal plan top-up', amount: 140 },
              { label: 'Phone & subscriptions', amount: 60 },
              { label: 'Transit', amount: 40 }
            ],
            sliders: [
              { id: 'investing', label: 'Investment contribution', min: 0, max: 150, step: 10, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 30, max: 180, step: 10, default: 30 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try a smaller investment contribution or spending amount.", ok: false },
              { maxLeftover: 19, text: "It fits, but the contribution is small, even a small consistent amount compounds over decades.", ok: true },
              { maxLeftover: Infinity, text: "Solid, and remember: consistency matters far more than the size of any single contribution.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ce_t4', type: 'teach', title: 'Dollar-Cost Averaging',
            concepts: [
              {
                term: 'Dollar-Cost Averaging',
                plain: "This means investing a fixed amount on a regular schedule, regardless of whether the market is up or down that week. It removes the pressure to \"time\" the market perfectly, and it's exactly what waiting for a bigger lump sum tends to prevent.",
                analogy: "It's like watering a plant on a fixed schedule instead of waiting for the \"perfect\" weather, consistency beats waiting for ideal conditions that may never come.",
                check: { statement: "Dollar-cost averaging requires correctly predicting when the market will go up before investing.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ce_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'The Cost of Waiting', definition: 'Delaying investing costs more than the unsaved amount, it costs compounding cycles that can\'t be recovered.' },
              { term: 'Dollar-Cost Averaging', definition: 'Investing a fixed amount on a regular schedule, regardless of market conditions.' },
              { term: 'Rule of 72', definition: 'Divide 72 by the annual return rate to estimate years to double your money.' }
            ],
            hintText: "One term is about the RISK of delay, one is a HABIT for investing regularly, and one is a quick MATH shortcut.",
            xpOnComplete: 4
          },
          {
            id: 'ce_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "You need at least a few thousand dollars saved up before it's worth opening an investment account.",
            isTrue: false,
            explanation: "It's a myth. Many accounts have no minimum, and starting small now beats waiting for a bigger amount later, since the delay costs compounding time you can't buy back.",
            xpOnComplete: 2
          },
          {
            id: 'ce_myth1', type: 'mythcards', title: 'Compound Interest Myths',
            cards: [
              { myth: "The exact dollar amount you start with matters more than how early you start.", isTrue: false, explanation: "Time horizon has an outsized effect, 10 extra years turned the same $1,000 into nearly double." },
              { myth: "A market drop right after you start investing means you should sell to avoid further losses.", isTrue: false, explanation: "Selling during a dip locks in a loss that was only temporary on paper, staying invested lets you recover as markets historically have." },
              { myth: "Investing a small, consistent amount is generally better than waiting to invest a larger lump sum later.", isTrue: true, explanation: "True, the lost compounding time from waiting usually outweighs the benefit of a bigger starting amount." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'ce_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [1, 2],
            hintTexts: [
              "Think about the exact same $1,000 invested 10 years apart, who ends up with more at 65, and by how much?",
              "Think about what it means to earn returns on your returns, not just your original deposit."
            ]
          },
          {
            id: 'ce_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'The Long Game: Portfolio Climb',
            meterKey: 'portfolioValue', meterMin: 1000, meterMax: 21000,
            intro: "Watch Hammy's original $1,000 grow across a lifetime of decisions. Tap each one to see the impact on where it ends up by 65.",
            hintText: "Starting now and staying invested through dips are what separate the $21,000 outcome from the $10,700 one.",
            decisions: [
              { id: 'd1', label: "Start investing now instead of waiting a decade", scoreDelta: 8000, note: "This single decision is the entire gap between the two students in the story." },
              { id: 'd2', label: "Stay invested through a 15% market dip instead of selling", scoreDelta: 4000, note: "Selling during a dip locks in a loss that recovery would have erased." },
              { id: 'd3', label: "Chase last year's best-performing fund instead of staying diversified", scoreDelta: -3000, note: "Past performance doesn't reliably predict future returns." },
              { id: 'd4', label: "Keep contributing consistently instead of stopping during a busy semester", scoreDelta: 5000, note: "Consistency across decades is what compounding actually rewards." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ce_t5', type: 'teach', title: 'Time in the Market, Not Timing It',
            concepts: [
              {
                term: 'Time in the Market',
                plain: "Trying to perfectly predict market ups and downs (timing the market) is extremely difficult, even for professionals. Staying invested consistently over a long time horizon (time IN the market) has historically outperformed trying to guess the perfect moments to buy and sell.",
                analogy: "It's like trying to catch every green light across a whole city versus just consistently driving the route, one is nearly impossible, the other reliably gets you there.",
                check: { statement: "Historically, consistently staying invested over time has tended to outperform trying to perfectly time the market.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ce_boss', type: 'bossbattle', title: 'The 15% Drop',
            scenario: "The market drops 15% the same month Hammy started investing. A friend is panic-selling everything. What does Hammy do?",
            hintText: "Remember Time in the Market: with decades until retirement, does a temporary dip actually threaten Hammy's long-term outcome?",
            choices: [
              { id: 'a', label: "Stay invested and keep contributing on schedule", consequence: { text: "The dip is temporary on paper only if Hammy stays invested, staying the course keeps decades of compounding intact.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Sell everything to avoid further losses", consequence: { text: "Selling turns a temporary paper loss into a permanent one, and misses the recovery that historically follows.", delta: { moneyScore: -12, portfolioValue: -200 }, xpMultiplier: 0.5 } },
              { id: 'c', label: "Stop contributing for a while until things feel more stable", consequence: { text: "It avoids buying during the dip, but also means missing out on buying in at lower prices, which often pays off later.", delta: { moneyScore: -4 }, xpMultiplier: 0.8 } },
              { id: 'd', label: "Keep contributing AND treat the dip as buying in at a discount", consequence: { text: "Buying consistently through a dip means more shares purchased at lower prices, a textbook long-term-investor move.", delta: { moneyScore: 10, portfolioValue: 50 }, xpMultiplier: 1.2 } }
            ]
          }
        ]
      },
      {
        id: 'roth_ira',
        topic: 'Roth IRA Basics',
        character: { name: 'Hammy', tagline: 'Opening a first retirement account' },
        initialState: { savings: 200, portfolioValue: 0, moneyScore: 50 },
        bossAchievementId: 'roth_opener',
        chapters: [
          {
            id: 'ri1', type: 'story', title: '"Just Open a Roth IRA"',
            beats: [
              { speaker: 'intro', text: "Hammy has $50/month they could invest, and a friend keeps saying \"just open a Roth IRA.\" Hammy has heard the words, but has no idea if they even qualify." },
              { speaker: 'Hammy', text: '"Do I need a big salary for this? A certain age? A special account first?"' },
              { speaker: 'narrator', text: "None of those assumptions are actually true. Let's clear this up before Hammy talks themselves out of something they already qualify for." },
              { speaker: 'Hammy', text: '"Okay, let\'s actually figure out if this is something I can use right now."' }
            ]
          },
          {
            id: 'ri_t1', type: 'teach', title: 'The Roth IRA',
            concepts: [
              {
                term: 'Roth IRA',
                plain: "A Roth IRA is a retirement account where you contribute money you've already paid tax on. In exchange, all the growth AND every withdrawal in retirement is completely tax-free, forever.",
                analogy: "It's like paying tax on a seed once, then never owing tax again on the entire tree it grows into.",
                check: { statement: "Roth IRA withdrawals in retirement are taxed just like regular income.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ri_t2', type: 'teach', title: 'Earned Income Eligibility',
            concepts: [
              {
                term: 'Earned Income Eligibility',
                plain: "You don't need a big salary, a certain age, or a college degree to open a Roth IRA, you just need earned income. Babysitting, tutoring, and part-time jobs all count, even without formal paperwork.",
                analogy: "It's less about WHO you are and more about whether money came in from actual work, however informal that work was.",
                check: { statement: "Informal income like babysitting or tutoring does not count as earned income for Roth IRA eligibility.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ri_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Roth IRA', definition: 'A retirement account funded with after-tax money that grows and withdraws tax-free.' },
              { term: 'Earned Income Eligibility', definition: 'Qualification based on having earned income, not age or job type.' },
              { term: 'Tax-Free Growth', definition: 'Investment gains inside a Roth IRA are never taxed, even decades later.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ri_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: you can contribute to a Roth IRA up to whichever is SMALLER, your actual earned income for the year or the annual IRS limit. Even a summer of babysitting money can open the door.",
            xpOnComplete: 1
          },
          {
            id: 'ri_t3', type: 'teach', title: 'Contribution Limits',
            concepts: [
              {
                term: 'Annual Contribution Limit',
                plain: "The IRS sets a yearly cap on Roth IRA contributions, $7,000 for 2024. You can contribute up to that limit or your total earned income for the year, whichever is lower. Most students are nowhere near the cap, the limit exists to prevent very high earners from sheltering huge amounts.",
                analogy: "It's like a speed limit that's far above what a beginner driver is going anyway, it matters eventually, just not on day one.",
                check: { statement: "Most students contributing to a Roth IRA are limited by their earned income, not by the IRS annual cap.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ri_d1', type: 'decision',
            title: "\"It's Only $50/Month\"",
            prompt: "Hammy has $50/month available and wonders if that's even worth opening a Roth IRA for. What should they do?",
            hintText: "Think back to Compound Interest from the previous lesson, does a small consistent contribution matter less than the delay of waiting for a bigger one?",
            choices: [
              {
                id: 'a', label: "Wait until there's a bigger amount to justify opening one",
                outcome: {
                  text: "Every month of waiting is a month of tax-free growth that can never be recovered later.",
                  delta: { moneyScore: -6 },
                  compare: [{ label: 'Years of tax-free growth if started now', value: 40 }, { label: 'Years lost if delayed 2 years', value: 2 }]
                }
              },
              {
                id: 'b', label: "Open a Roth IRA now and contribute the $50/month",
                outcome: {
                  text: "$50/month starting now builds a real foundation, and every dollar in it grows completely tax-free from day one.",
                  delta: { portfolioValue: 50, moneyScore: 8 },
                  compare: [{ label: 'Years of tax-free growth if started now', value: 40 }, { label: 'Years lost if delayed 2 years', value: 2 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'ri_ms1', type: 'microsim', title: "Fitting In a Roth Contribution",
            prompt: "Hammy's monthly income is $650. Fixed costs already use $470. Help them fit a Roth IRA contribution in without going negative.",
            hintText: "Add up the fixed costs ($250 + $120 + $60 + $40 = $470). That leaves $180 of the $650 to split between the two sliders before going negative.",
            income: 650,
            fixedCosts: [
              { label: 'Rent share', amount: 250 },
              { label: 'Meal plan top-up', amount: 120 },
              { label: 'Phone & subscriptions', amount: 60 },
              { label: 'Transit', amount: 40 }
            ],
            sliders: [
              { id: 'rothContribution', label: 'Roth IRA contribution', min: 0, max: 150, step: 10, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 30, max: 180, step: 10, default: 30 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try a smaller Roth contribution or spending amount.", ok: false },
              { maxLeftover: 19, text: "It fits, and remember, even a small contribution is growing completely tax-free.", ok: true },
              { maxLeftover: Infinity, text: "Solid, this is real tax-free growth being built starting today.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ri_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Annual Contribution Limit', definition: 'The IRS yearly cap on Roth IRA contributions.' },
              { term: 'Employer Match', definition: 'Free money added by an employer when you contribute to a workplace plan like a 403(b).' },
              { term: 'Order of Operations', definition: 'Capture the full employer match first, then build a Roth IRA.' }
            ],
            hintText: "One term is the IRS's own CAP, one is FREE money from an employer plan, and one is the correct ORDER to use both.",
            xpOnComplete: 4
          },
          {
            id: 'ri_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "You need a college degree or a full-time salaried job to be eligible for a Roth IRA.",
            isTrue: false,
            explanation: "It's a myth. Eligibility is based on earned income, babysitting, tutoring, and part-time work all count, regardless of age or education.",
            xpOnComplete: 2
          },
          {
            id: 'ri_myth1', type: 'mythcards', title: 'Roth IRA Myths',
            cards: [
              { myth: "You must be at least 25 years old to open a Roth IRA.", isTrue: false, explanation: "There's no minimum age, only a requirement of having earned income." },
              { myth: "If your job offers an employer match, it's smart to capture the full match before maxing out a Roth IRA.", isTrue: true, explanation: "True, the employer match is an immediate guaranteed return, worth prioritizing before other accounts." },
              { myth: "Roth IRA growth and withdrawals in retirement are completely tax-free.", isTrue: true, explanation: "True, that's the entire point of the account, you pay tax once, upfront, and never again." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'ri_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 6],
            hintTexts: [
              "Think about WHEN taxes are paid on the money in a Roth IRA, and when they're not.",
              "Think about what actually determines Roth IRA eligibility, age, job type, or something else."
            ]
          },
          {
            id: 'ri_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Retirement Foundation Climb',
            meterKey: 'portfolioValue', meterMin: 0, meterMax: 5000,
            intro: "Watch Hammy's Roth IRA grow as they make smarter contribution decisions. Tap each one to see the impact.",
            hintText: "Starting now and capturing any available employer match first are what drive most of the growth here.",
            decisions: [
              { id: 'd1', label: "Open the Roth IRA now instead of waiting for a bigger amount", scoreDelta: 800, note: "Every month invested now is tax-free growth that can't be bought back later." },
              { id: 'd2', label: "Capture the full employer match before maxing out the Roth", scoreDelta: 600, note: "The match is free money, worth prioritizing first." },
              { id: 'd3', label: "Skip contributing during a busy semester", scoreDelta: -400, note: "Gaps in contributing are gaps in tax-free growth that don't come back." },
              { id: 'd4', label: "Withdraw contributions early to cover an unrelated expense", scoreDelta: -500, note: "Pulling money out defeats the purpose of decades of compounding tax-free." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ri_explain1', type: 'explainback',
            title: 'In Your Own Words',
            prompt: "In your own words: why does opening a Roth IRA at 19, even with just $50/month, matter more than it might seem right now?",
            keywords: ['tax-free', 'compound', 'decades', 'early', 'time'],
            fullDefinition: "Because a Roth IRA grows completely tax-free, every year it's open adds another year of compounding that never gets taxed, on the way in during retirement, or ever again. Starting at 19 instead of 29 isn't just 10 extra years of contributions, it's 10 extra years of tax-free compounding that can't be recreated later, no matter how much gets contributed afterward.",
            xpOnComplete: 3
          },
          {
            id: 'ri_boss', type: 'bossbattle', title: 'The Two Accounts',
            scenario: "Hammy's campus job offers a 403(b) with a 3% match, and Hammy is also eligible for a Roth IRA. They only have enough extra money to fully fund one this month. What's the smartest order?",
            hintText: "Remember Order of Operations: one of these accounts hands you free money immediately, guaranteed, the moment you contribute.",
            choices: [
              { id: 'a', label: "Contribute enough to the 403(b) to get the full match, then put anything extra into the Roth", consequence: { text: "This captures the guaranteed free money first, then builds tax-free growth with what's left, the textbook order.", delta: { moneyScore: 12, portfolioValue: 100 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Put everything into the Roth IRA and skip the 403(b) match entirely", consequence: { text: "The Roth is a fine account, but walking away from a guaranteed employer match leaves free money on the table.", delta: { moneyScore: -8 }, xpMultiplier: 0.7 } },
              { id: 'c', label: "Split the money evenly between both without checking the match threshold first", consequence: { text: "Close, but without hitting the exact match threshold, some of that free employer money still goes unclaimed.", delta: { moneyScore: 2 }, xpMultiplier: 0.9 } },
              { id: 'd', label: "Skip both this month and keep the cash in checking", consequence: { text: "No harm done today, but it's a missed month of both a guaranteed match and tax-free growth.", delta: { moneyScore: -5 }, xpMultiplier: 0.75 } }
            ]
          }
        ]
      },
      {
        id: 'index_funds',
        topic: 'Index Funds & Diversification',
        character: { name: 'Hammy', tagline: 'Picking a first investment' },
        initialState: {},
        chapters: [
          { id: 'index_funds_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Index Funds & Diversification." }
            ]
          }
        ]
      },
      {
        id: 'contribution_limits',
        topic: 'Contribution Limits & Where to Save First',
        character: { name: 'Hammy', tagline: 'Deciding where extra money should go first' },
        initialState: {},
        chapters: [
          { id: 'contribution_limits_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Contribution Limits & Where to Save First." }
            ]
          }
        ]
      },
      {
        id: 'risk_horizon',
        topic: 'Risk, Time Horizon & Staying the Course',
        character: { name: 'Hammy', tagline: 'Watching the market dip for the first time' },
        initialState: {},
        chapters: [
          { id: 'risk_horizon_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Risk, Time Horizon & Staying the Course." }
            ]
          }
        ]
      },
      {
        id: 'start_small',
        topic: 'Getting Started With Very Little Money',
        character: { name: 'Hammy', tagline: 'Starting to invest with not much to spare' },
        initialState: {},
        chapters: [
          { id: 'start_small_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Getting Started With Very Little Money." }
            ]
          }
        ]
      },
      {
        id: '401k_match',
        topic: '401(k)s & Employer Matches: Free Money on the Table',
        character: { name: 'Hammy', tagline: 'Signing up for a workplace retirement plan' },
        initialState: {},
        chapters: [
          { id: '401k_match_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on 401(k)s & Employer Matches: Free Money on the Table." }
            ]
          }
        ]
      },
      {
        id: 'brokerage_vs_retirement',
        topic: 'Brokerage vs. Retirement Accounts: Where to Invest',
        character: { name: 'Hammy', tagline: 'Deciding which account to open first' },
        initialState: {},
        chapters: [
          { id: 'brokerage_vs_retirement_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Brokerage vs. Retirement Accounts: Where to Invest." }
            ]
          }
        ]
      },
      {
        id: 'open_brokerage',
        parentQuestId: 'roth_ira',
        topic: 'Opening a Brokerage Account: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually opening a first investment account' },
        initialState: {},
        chapters: [
          {
            id: 'ob0', type: 'story', title: 'Ready to Actually Start',
            beats: [
              { speaker: 'intro', text: "Hammy understands compound interest and index funds now — but the account itself has never actually been opened. Knowing the theory and doing the paperwork are two different things. Let's walk through it." }
            ]
          },
          {
            id: 'ob1', type: 'teach', title: 'Step 1 & 2: Choosing & Opening',
            concepts: [
              {
                term: 'Step 1: Pick a Brokerage',
                plain: "Fidelity, Schwab, and Vanguard are common no-fee options for beginners — look for $0 account minimums, $0 commission on stock and ETF trades, and no monthly maintenance fees. Any of the major ones work fine for a first account.",
                analogy: "Picking a brokerage is like picking a bank — the big reputable ones are all safe bets, the differences are mostly app experience and fund selection.",
                check: { statement: 'You need thousands of dollars saved up before you can open a brokerage account.', isTrue: false }
              },
              {
                term: 'Step 2: Choose an Account Type',
                plain: "A Roth IRA is specifically for retirement money and comes with tax advantages, but has annual contribution limits. A standard taxable brokerage account has no limits and no withdrawal restrictions, but no special tax treatment. Most people eventually use both.",
                analogy: "A Roth IRA is a locked box with a tax reward for waiting. A taxable account is a regular drawer you can open any time.",
                check: { statement: 'A Roth IRA and a taxable brokerage account are the exact same thing with different names.', isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ob2', type: 'teach', title: 'Step 3 & 4: Funding & First Trade',
            concepts: [
              {
                term: 'Step 3: Link a Bank & Fund It',
                plain: "Connect a checking account the same way as any other online account — routing and account number, or a secure bank login. Most brokerages let you start with any amount, even $5 or $10, there's no minimum most of the time.",
                analogy: "Funding the account is just a transfer, like Venmo-ing money into a separate account that happens to invest it.",
                check: { statement: 'Most modern brokerages require a large minimum deposit before you can fund the account.', isTrue: false }
              },
              {
                term: 'Step 4: Buy an Index Fund',
                plain: "Once funded, search for a broad index fund (like one tracking the S&P 500), enter a dollar amount or number of shares, and place the order. A \"market order\" buys at the current price immediately — the simplest choice for a first trade.",
                analogy: "It's like checkout on a shopping site: pick the item, confirm the amount, submit.",
                check: { statement: 'A market order buys at whatever the current price happens to be right now.', isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ob3', type: 'decision', title: 'The First $50',
            prompt: "Hammy has $50 to invest for the first time. The brokerage account is open and funded. What's the smartest first move?",
            hintText: "Think back to diversification — one company, or many at once?",
            choices: [
              { id: 'a', label: 'Buy $50 of a single trending stock', outcome: { text: "One company's bad quarter can wipe out the investment — concentrated risk for a first trade.", delta: {}, compare: [{ label: 'Companies owned', value: 1 }, { label: 'Diversified option', value: 500 }] } },
              { id: 'b', label: 'Buy $50 of a broad index fund', outcome: { text: "Instant exposure to hundreds of companies at once, with the exact same $50.", delta: {}, compare: [{ label: 'Companies owned', value: 500 }, { label: 'Single-stock option', value: 1 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ob4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [3, 5],
            hintTexts: [
              "Think about what an index fund actually tracks and why it's recommended for beginners.",
              "Think about spreading money across many companies vs. betting everything on one."
            ]
          }
        ]
      }
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
      topic: 'Credit Cards & Building Your Credit Score',
      character: { name: 'Hammy', tagline: 'Just got their first credit card' },
      initialState: { creditScore: 640, checking: 200, savings: 0 },
      bossAchievementId: 'crisis_averted',
      chapters: [
        {
          id: 'c1', type: 'story', title: 'The Offer',
          beats: [
            { speaker: 'intro', text: "Hammy just started their first year of college, and like a lot of first-years, they've never had to manage their own money before. Today, you're going to help them handle something brand new: their very first credit card." },
            { speaker: 'Hammy', text: '"Wait, I get to make my OWN money decisions now? No pressure or anything..."' },
            { speaker: 'narrator', text: 'A table in the student union is handing out free t-shirts... for signing up for a credit card.' },
            { speaker: 'Hammy', text: '"A free tee AND a $1,000 limit? Sign me up."' },
            { speaker: 'narrator', text: 'Two weeks later the card arrives. Before Hammy uses it, let\'s make sure you know exactly what they\'re holding in their hands.' }
          ]
        },
        {
          id: 't0', type: 'teach', title: 'Your Mission Control', highlightDashboard: true,
          concepts: [
            {
              term: 'Checking vs. Savings',
              plain: 'Checking is Hammy\'s everyday spending money, for food, gas, and bills. Savings is money set aside and left alone, for emergencies or bigger goals later. You\'ll see both labeled at the top of your screen for the rest of this quest.',
              analogy: 'Checking is like a wallet, money moves in and out constantly. Savings is like a piggy bank you don\'t raid for a snack.',
              check: { statement: 'Checking is the account Hammy uses for everyday spending, like food and gas.', isTrue: true }
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
              check: { statement: 'A credit card is free money that Hammy never has to pay back.', isTrue: false }
            },
            {
              term: 'Credit Limit',
              plain: 'Your "limit" is the most the bank will let you borrow at once. Hammy\'s card has a $1,000 limit. That\'s a ceiling, not a goal to reach.',
              analogy: 'Think of it like a bucket that holds $1,000. Every purchase pours a little in; paying your bill empties it back out.',
              check: { statement: "Hammy's credit limit is a goal they should try to spend up to every month.", isTrue: false }
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 't2', type: 'teach', title: 'Your Credit Score', highlightDashboard: true,
          concepts: [
            {
              term: 'Credit Score',
              plain: 'A credit score is a 3-digit number, from 300 to 850, that tells lenders how reliable you\'ve been about paying back money you\'ve borrowed. Higher = more trustworthy. You\'ll see Hammy\'s score at the top of the screen for the rest of this quest.',
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
          id: 'h1', type: 'hint', tag: "🎉 Hammy's Tip",
          text: 'Fun fact: checking your OWN credit score is always free and 100% safe. It never lowers your score. Only applying for new credit cards or loans can cause a small dip, so check it often and stay in the know.',
          xpOnComplete: 1
        },
        {
          id: 't3', type: 'teach', title: 'The Cost of Borrowing',
          concepts: [
            {
              term: 'Interest (APR)',
              plain: 'If you don\'t pay your full bill, the bank charges you extra for the privilege of waiting, that\'s called interest. "APR" stands for Annual Percentage Rate, the yearly interest rate the bank charges you.',
              analogy: 'It\'s like a late fee that keeps growing the longer you wait to pay, except it\'s a percentage of what you still owe.',
              check: { statement: "If Hammy pays their full balance every month, they avoid paying interest.", isTrue: true }
            },
            {
              term: 'Minimum Payment',
              plain: 'Every statement lists a "minimum payment", the smallest amount you\'re allowed to pay to avoid a late fee. But paying only that leaves most of your bill, plus interest, unpaid and growing.',
              analogy: 'It\'s like bailing a little water out of a leaking boat. You\'re not sinking today, but you haven\'t fixed the leak either.',
              check: { statement: 'Paying only the minimum payment pays off your whole balance quickly.', isTrue: false }
            }
          ],
          xpOnComplete: 3
        },
        {
          id: 'c2', type: 'decision',
          title: 'Move-In Shopping',
          prompt: 'Hammy needs $800 in textbooks and dorm supplies. They have $200 in checking. What should they put on the new card?',
          hintText: "Think back to Interest (APR): does the bank charge extra for balances you DON'T pay off right away, or is carrying a balance free?",
          choices: [
            {
              id: 'a', label: 'Put it all on the card, pay only the minimum',
              outcome: {
                text: 'Hammy carries a $600 balance at 24% APR, projected around $300 in interest over the next 3 years, on top of the $600 they already owe.',
                delta: { creditScore: -10 },
                compare: [{ label: 'Their choice, interest paid', value: 300 }, { label: 'Pay-in-full path, interest paid', value: 0 }]
              }
            },
            {
              id: 'b', label: 'Charge $200, pay it off immediately; cover the rest with savings and a work-study shift',
              outcome: {
                text: 'Hammy pays their statement in full, so no interest ever gets charged, and they\'re using less of their limit, which helps their score too.',
                delta: { creditScore: 8 },
                compare: [{ label: 'Their choice, interest paid', value: 0 }, { label: 'Minimum-payment path, interest paid', value: 300 }]
              }
            }
          ],
          xpOnComplete: 5
        },
        {
          id: 'c3', type: 'microsim',
          title: 'The Monthly Squeeze',
          prompt: 'Hammy\'s paycheck is $600/month. Fixed costs already eat $430 of it. Help them fit in a card payment and some savings without going negative.',
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
            { maxLeftover: -1, text: 'That budget goes negative. Hammy can\'t sustain this. Try a smaller card payment or savings deposit.', ok: false },
            { maxLeftover: 24, text: 'Workable, but there\'s almost no cushion left for a surprise expense.', ok: true },
            { maxLeftover: Infinity, text: 'Solid. They\'re covering their bill and still building a cushion.', ok: true }
          ],
          xpOnComplete: 6
        },
        {
          id: 't5', type: 'teach', title: 'Credit Utilization',
          concepts: [
            {
              term: 'Credit Utilization',
              plain: 'This is how much of your credit limit you\'re currently using. If Hammy has a $1,000 limit and owes $300, they\'re using 30% of it. Lenders like to see this number stay low, under 30% is a good rule of thumb.',
              analogy: 'Picture your limit as a gas tank. Riding around on three-quarters of a tank looks fine to lenders. Riding around on empty, maxed out, looks risky, even if you always pay on time.',
              check: { statement: 'Using less of your available credit limit is better for your score than using almost all of it.', isTrue: true }
            }
          ],
          xpOnComplete: 2
        },
        {
          id: 'm2', type: 'matching', title: 'Match It! Round 2',
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
          intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
          statement: 'You need to already have good credit to get approved for your first credit card.',
          isTrue: false,
          explanation: "It's a myth. You don't need existing credit to start. Options built for beginners, like student cards or secured cards backed by a refundable deposit, let you build a credit history from zero.",
          xpOnComplete: 2
        },
        {
          id: 'c4', type: 'mythcards', title: 'Credit Myths',
          cards: [
            { myth: 'Carrying a small balance helps your credit score.', isTrue: false, explanation: 'Paying your bill in full every month is what actually helps. Carrying a balance just costs you extra in interest, it never boosts your score.' },
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
          intro: 'Watch Hammy\'s score move in real time over their first year of card use. Tap each decision below to see the impact.',
          hintText: 'Payment history and utilization are the two biggest score factors, decisions that touch those move the needle the most, for better or worse.',
          decisions: [
            { id: 'd1', label: 'Pay every statement in full, on time, for 6 months', scoreDelta: 35, note: 'Paying on time, every time, is the single biggest thing that helps your score.' },
            { id: 'd2', label: 'Keep utilization under 30% instead of maxing the card', scoreDelta: 15, note: 'Using less of your available credit is the second-biggest factor.' },
            { id: 'd3', label: 'Apply for two more store cards this month', scoreDelta: -12, note: 'Applying for several cards at once makes lenders nervous and dings your score a little.' },
            { id: 'd4', label: 'Keep their oldest card open, barely used', scoreDelta: 8, note: 'The longer you\'ve had credit, the more it helps, so old accounts are worth keeping open.' }
          ],
          xpOnComplete: 6
        },
        {
          id: 't6', type: 'teach', title: 'Building Credit From Zero',
          concepts: [
            {
              term: 'The Five Factors of Your Score',
              plain: "Your credit score is built from five weighted factors: payment history (35%), amounts owed (30%), length of credit history (15%), new credit (10%), and credit mix (10%). Payment history alone is worth more than the other four combined.",
              analogy: "Think of it like a report card where one class — showing up on time, every time — counts for over a third of your grade.",
              check: { statement: 'New credit inquiries and credit mix matter more to your score than payment history.', isTrue: false }
            },
            {
              term: 'Starting With Nothing',
              plain: "No credit history isn't a bad score, it's no score at all, and everyone starts there. The two most common ways to build from zero: a secured credit card, where a refundable deposit becomes your limit, then you use it like a debit card and pay it off monthly. Or become an authorized user on a family member's well-managed card.",
              analogy: "A secured card is training wheels — same bike, same rules, just a deposit backing you up until you've built trust.",
              check: { statement: 'You need to carry a balance from month to month to build credit — paying in full every month won\'t help as much.', isTrue: false }
            }
          ],
          xpOnComplete: 3
        },
        {
          id: 'c8', type: 'bossbattle', title: 'The Car Repair',
          scenario: 'Finals week. Hammy\'s car needs an $800 repair or they can\'t make it to their internship. They have $150 in savings and $700 of available credit (room left on their limit).',
          hintText: 'Compare the interest rates: a regular credit card is around 24% APR. A payday loan can be 300%+ APR. One of those is dramatically more expensive.',
          choices: [
            { id: 'a', label: 'Cover it with savings, put the rest on the card, pay it off in 2 months', consequence: { text: 'A smart trade-off, a little short-term interest, but they avoid an expensive loan and their credit stays healthy.', delta: { creditScore: 5, savings: -150 }, xpMultiplier: 1.25 } },
            { id: 'b', label: 'Put the whole $800 on the card, pay minimums', consequence: { text: 'They\'re now using almost all of their limit, with roughly $140 in projected interest ahead, both hurt their score.', delta: { creditScore: -15 }, xpMultiplier: 0.6 } },
            { id: 'c', label: 'Take a same-day payday loan (a very short-term loan, repaid fast, with steep fees)', consequence: { text: 'Fast cash, but payday loans often carry 300%+ APR, usually the most expensive option available, by far.', delta: { creditScore: -5 }, xpMultiplier: 0.5 } },
            { id: 'd', label: 'Ask a parent to cover it and pay them back over time', consequence: { text: 'No interest, but this only works as a safety net if that arrangement is actually reliable for both sides.', delta: { creditScore: 0 }, xpMultiplier: 0.9 } }
          ]
        }
      ]
      },
      {
        id: 'common_mistakes',
        topic: 'Common Mistakes That Hurt Your Score',
        character: { name: 'Hammy', tagline: 'About to make a classic credit mistake' },
        initialState: { creditScore: 700, checking: 200, savings: 100 },
        bossAchievementId: 'mistake_free',
        chapters: [
          {
            id: 'cm1', type: 'story', title: "A Friend's 60-Point Drop",
            beats: [
              { speaker: 'intro', text: "Hammy's friend just spent an afternoon \"cleaning up\" their credit: they co-signed a car loan for a sibling, and closed their oldest credit card the same week to simplify things. Their score dropped 60 points almost overnight." },
              { speaker: 'Hammy', text: '"Wait, they were trying to do the RESPONSIBLE thing. How did that tank their score?"' },
              { speaker: 'narrator', text: "Hammy has a card of their own now, in good standing. Today's about making sure they never make the same well-meaning mistakes." },
              { speaker: 'Hammy', text: '"Okay. If \'helping out\' can backfire this badly, I want to actually understand why before I do anything like that."' }
            ]
          },
          {
            id: 'cm_t1', type: 'teach', title: 'Co-Signing',
            concepts: [
              {
                term: 'Co-Signing',
                plain: "When you co-sign a loan, you're not vouching for someone, you're legally on the hook for the debt yourself. If they miss a payment, it hits YOUR credit report too, and the lender can come after you directly for the money.",
                analogy: "It's like putting your own name on someone else's rent lease. If they stop paying, the landlord doesn't shrug, they knock on your door next.",
                check: { statement: "Co-signing a loan only affects the other person's credit, never the co-signer's.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'cm_t2', type: 'teach', title: 'Length of Credit History',
            concepts: [
              {
                term: 'Length of Credit History',
                plain: "This is how long your accounts have existed, especially your oldest one. It's one of the five factors in your score, and it's the reason closing your oldest card, even one you barely use, can quietly hurt you.",
                analogy: "It's like a reference who's known you for ten years versus one you met last month. The long-standing one carries more weight, and you don't want to lose them.",
                check: { statement: "Closing a credit card you rarely use has zero effect on your credit score.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'cm_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Co-Signing', definition: 'Becoming legally responsible for someone else\'s loan if they stop paying.' },
              { term: 'Length of Credit History', definition: 'How long your accounts have existed, especially your oldest one.' },
              { term: 'Closing an Account', definition: 'Shortens your credit history and can raise your utilization, both can hurt your score.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'cm_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: getting removed as a co-signer is much harder than it sounds, most lenders require the primary borrower to refinance the whole loan on their own. Think of co-signing as permanent until proven otherwise.",
            xpOnComplete: 1
          },
          {
            id: 'cm_t3', type: 'teach', title: 'The Cost of Applying Around',
            concepts: [
              {
                term: 'Hard Inquiry',
                plain: "Every time you formally apply for a card or loan, the lender pulls your credit, that's a hard inquiry, and it causes a small, temporary dip. Apply for several cards in a short window and those dips stack up fast.",
                analogy: "One background check for a new apartment is normal. Five landlords all running one in the same week makes you look like you're scrambling.",
                check: { statement: "Applying for several new credit cards within the same month has no effect on your score.", isTrue: false }
              },
              {
                term: 'Soft Inquiry',
                plain: "Checking your own score, or a lender pre-qualifying you, is a soft inquiry, it never affects your score at all. Only a full application triggers the hard-inquiry dip.",
                analogy: "It's the difference between glancing at a menu and actually placing an order. Only the order commits you to anything.",
                check: { statement: "Checking your own credit score counts as a hard inquiry and can lower your score.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'cm_d1', type: 'decision',
            title: "Your Sibling Needs a Co-Signer",
            prompt: "Hammy's younger sibling wants a $6,000 car loan but has no credit history, so the dealership needs a co-signer. What should Hammy do?",
            hintText: "Think back to Co-Signing: if your sibling misses even one payment, whose credit report takes the hit alongside theirs?",
            choices: [
              {
                id: 'a', label: 'Co-sign the loan without any conditions',
                outcome: {
                  text: "Hammy is now fully on the hook for $6,000 if their sibling ever misses a payment, with zero say over how the car gets used or the loan gets paid.",
                  delta: { creditScore: -3 },
                  compare: [{ label: "Hammy's exposure if missed", value: 6000 }, { label: "Exposure if declined", value: 0 }]
                }
              },
              {
                id: 'b', label: 'Suggest their sibling build credit first with a secured card, and revisit the loan in a year',
                outcome: {
                  text: "It's a harder conversation, but Hammy keeps zero legal exposure, and their sibling starts building their OWN credit history instead of borrowing Hammy's.",
                  delta: { creditScore: 4 },
                  compare: [{ label: "Hammy's exposure if declined", value: 0 }, { label: "Exposure if co-signed", value: 6000 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'cm_ms1', type: 'microsim', title: "Building a Cushion Instead",
            prompt: "Hammy's paycheck is $700/month. Fixed costs already eat $460 of it. Help them fit in a card payment and an emergency cushion, so a future favor for a friend never has to mean co-signing a loan they can't actually back.",
            hintText: "Add up the fixed costs ($200 + $130 + $60 + $70 = $460). That leaves $240 of their $700 to split between the two sliders before they go negative.",
            income: 700,
            fixedCosts: [
              { label: 'Rent share', amount: 200 },
              { label: 'Meal plan top-up', amount: 130 },
              { label: 'Phone & subscriptions', amount: 60 },
              { label: 'Transit & gas', amount: 70 }
            ],
            sliders: [
              { id: 'cardPayment', label: 'Credit card payment', min: 25, max: 175, step: 25, default: 25 },
              { id: 'emergencyFund', label: 'Emergency fund deposit', min: 0, max: 150, step: 25, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Hammy can't sustain this. Try a smaller card payment or fund deposit.", ok: false },
              { maxLeftover: 24, text: "Workable, but there's almost no cushion left if a friend or family member ever needs real help.", ok: true },
              { maxLeftover: Infinity, text: "Solid. Hammy's covering their bill AND building a cushion, real help without co-signing anything.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'cm_t4', type: 'teach', title: 'Rate-Shopping the Right Way',
            concepts: [
              {
                term: 'Rate-Shopping Window',
                plain: "There's one big exception to the hard-inquiry rule: shopping around for the SAME type of loan (like an auto loan or mortgage) within a focused window, usually 14-45 days, gets counted as a single inquiry by most scoring models, not several.",
                analogy: "It's like a store that says 'the first three fitting-room trips today are free, only the fourth one costs you.' Scoring models know shopping for one big purchase looks different from applying for five separate credit cards.",
                check: { statement: "Comparing rates from several auto lenders within the same two-week window always counts as several separate hard inquiries.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'cm_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Hard Inquiry', definition: 'A credit check from a full application, causes a small, temporary dip.' },
              { term: 'Soft Inquiry', definition: "Checking your own score or getting pre-qualified, never affects your score." },
              { term: 'Rate-Shopping Window', definition: 'A focused period where comparing the SAME loan type counts as just one inquiry.' }
            ],
            hintText: "Two of these are about WHO is checking (you vs. a lender), the third is about a special TIMING rule.",
            xpOnComplete: 4
          },
          {
            id: 'cm_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: 'If your friend defaults on a loan you co-signed, it only shows up on their credit report, not yours.',
            isTrue: false,
            explanation: "It's a myth. Co-signers are equally liable, a missed payment reports to BOTH credit files, and the lender can pursue either person for the full balance.",
            xpOnComplete: 2
          },
          {
            id: 'cm_myth1', type: 'mythcards', title: 'Credit Mistake Myths',
            cards: [
              { myth: "Closing a credit card you don't use can't hurt your score.", isTrue: false, explanation: 'It can shorten your credit history and raise your utilization on the remaining cards, both can lower your score.' },
              { myth: 'Co-signing a loan makes you legally responsible for the debt if the other person misses a payment.', isTrue: true, explanation: "True, a co-signer isn't a reference, they're equally on the hook for the full balance." },
              { myth: 'Rate-shopping for the same type of loan within a couple weeks counts as just one inquiry, not several.', isTrue: true, explanation: 'True for most scoring models, comparing offers for ONE big purchase in a focused window is treated as a single inquiry.' }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'cm_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [3, 6],
            hintTexts: [
              "Think about the three habits covered so far: co-signing for someone else, closing your oldest card, or applying for several cards at once.",
              "Think about what makes store cards riskier than a regular card if you don't pay in full."
            ]
          },
          {
            id: 'cm_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Mistake Recovery Climb',
            intro: "Watch Hammy's score move as they face the same tempting shortcuts their friend fell for. Tap each decision below to see the impact.",
            hintText: "Declining a risky favor and spacing out applications protect the two biggest factors: payment history exposure and new-credit activity.",
            decisions: [
              { id: 'd1', label: "Decline co-signing, suggest their sibling build credit independently", scoreDelta: 12, note: "Zero legal exposure to someone else's debt is worth protecting." },
              { id: 'd2', label: 'Keep the oldest card open with one small recurring charge', scoreDelta: 18, note: 'Length of credit history is a real scoring factor, this keeps it intact.' },
              { id: 'd3', label: 'Apply for three unrelated store cards in one month', scoreDelta: -15, note: 'Multiple hard inquiries close together is exactly the pattern that spooks lenders.' },
              { id: 'd4', label: 'Rate-shop for ONE auto loan across lenders within a 2-week window', scoreDelta: 5, note: "Same loan type, tight window, most models count this as a single inquiry." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'cm_t5', type: 'teach', title: 'Mistakes Fade, They Don\'t Follow You Forever',
            concepts: [
              {
                term: 'Recovering From a Setback',
                plain: "A single mistake, a missed payment, a maxed-out card, a hard-inquiry cluster, isn't permanent. Most negative marks matter most in the first year or two and fade in impact well before they eventually drop off your report entirely. Consistent good habits going forward rebuild a score faster than most people expect.",
                analogy: "It's like a bad semester on a transcript. It doesn't disappear, but strong semesters afterward matter more to where you end up than that one rough stretch.",
                check: { statement: "One credit mistake permanently caps how high your score can ever recover.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'cm_boss', type: 'bossbattle', title: 'The Double Ask',
            scenario: "The same week Hammy's card issuer emails suggesting they \"declutter\" by closing an old, unused card, their sibling asks again about co-signing, this time for a $9,000 loan. What does Hammy do?",
            hintText: "Weigh both temptations against what you now know: closing your oldest card shortens your history, and co-signing makes you liable for someone else's full balance.",
            choices: [
              { id: 'a', label: 'Keep the old card open and decline to co-sign, offering to help research secured cards instead', consequence: { text: "Hammy protects their credit history AND avoids $9,000 of exposure, while still actually helping their sibling.", delta: { creditScore: 10, savings: 0 }, xpMultiplier: 1.25 } },
              { id: 'b', label: 'Close the old card, but decline to co-sign', consequence: { text: "Declining the co-sign was smart, but closing their oldest card still shortened their history and nudged their utilization up.", delta: { creditScore: -6 }, xpMultiplier: 0.85 } },
              { id: 'c', label: 'Keep the old card open, but co-sign the loan anyway', consequence: { text: "Good instinct on the card, but Hammy is now fully exposed to $9,000 of someone else's debt if a single payment gets missed.", delta: { creditScore: -8, savings: -200 }, xpMultiplier: 0.6 } },
              { id: 'd', label: 'Close the old card AND co-sign the loan', consequence: { text: "Both mistakes their friend made, in one week, shortened history, raised utilization, and $9,000 of exposure all at once.", delta: { creditScore: -18, savings: -200 }, xpMultiplier: 0.4 } }
            ]
          }
        ]
      },
      {
        id: 'credit_from_scratch',
        topic: 'Building Credit From Scratch',
        character: { name: 'Hammy', tagline: 'Starting with no credit history at all' },
        initialState: {},
        chapters: [
          { id: 'credit_from_scratch_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Building Credit From Scratch." }
            ]
          }
        ]
      },
      {
        id: 'fico_scale',
        topic: 'The FICO Scale',
        character: { name: 'Hammy', tagline: 'Trying to understand what actually makes up a credit score' },
        initialState: {},
        chapters: [
          { id: 'fico_scale_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on The FICO Scale." }
            ]
          }
        ]
      },
      {
        id: 'balance_transfers',
        topic: 'Balance Transfers: When They Actually Help',
        character: { name: 'Hammy', tagline: 'Considering a 0% APR balance transfer offer' },
        initialState: {},
        chapters: [
          { id: 'balance_transfers_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Balance Transfers: When They Actually Help." }
            ]
          }
        ]
      },
      {
        id: 'disputing_errors',
        topic: 'Credit Reports & Disputing Errors',
        character: { name: 'Hammy', tagline: 'Spotting something wrong on a credit report' },
        initialState: {},
        chapters: [
          { id: 'disputing_errors_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Credit Reports & Disputing Errors." }
            ]
          }
        ]
      },
      {
        id: 'secured_cards',
        topic: 'Secured Cards & Authorized-User Status',
        character: { name: 'Hammy', tagline: 'Looking for a way to build credit from zero' },
        initialState: {},
        chapters: [
          { id: 'secured_cards_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Secured Cards & Authorized-User Status." }
            ]
          }
        ]
      },
      {
        id: 'avalanche_snowball',
        topic: 'Paying Off Debt: Avalanche vs. Snowball',
        character: { name: 'Hammy', tagline: 'Deciding how to tackle multiple balances' },
        initialState: {},
        chapters: [
          { id: 'avalanche_snowball_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Paying Off Debt: Avalanche vs. Snowball." }
            ]
          }
        ]
      },
      {
        id: 'card_setup',
        parentQuestId: 'maya',
        topic: 'Opening & Setting Up Your Card: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually setting up the card that just arrived in the mail' },
        initialState: { checking: 200 },
        chapters: [
          {
            id: 'cs0', type: 'story', title: 'The Card Arrives',
            beats: [
              { speaker: 'intro', text: "Hammy's new credit card just showed up in the mail. Knowing what a credit card IS is one thing — actually setting it up correctly is another. Let's walk through it together, step by step." }
            ]
          },
          {
            id: 'cs1', type: 'teach', title: 'Step 1 & 2: Activate & Connect',
            concepts: [
              {
                term: 'Step 1: Activate & Log In',
                plain: "Every major card issuer — Chase, Discover, Capital One, Bank of America — has an app or web portal. After the card arrives, activate it (usually a quick phone call or a tap in the app), then create a login. This is command central for everything that follows.",
                analogy: "Like setting up any new account — one login, and everything else lives inside it.",
                check: { statement: 'A credit card can be used normally right out of the envelope, with no activation step.', isTrue: false }
              },
              {
                term: 'Step 2: Connect a Bank Account',
                plain: "To pay the bill, link a checking account using two numbers: the routing number (identifies the BANK) and the account number (identifies the specific account). Both are printed at the bottom of a paper check, or found in the bank's app.",
                analogy: "The routing number is like a zip code — it gets the payment to the right bank. The account number is the exact address once it's there.",
                check: { statement: 'The routing number identifies your bank, and the account number identifies your specific account.', isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'cs2', type: 'teach', title: 'Step 3 & 4: Autopay & Safety Net',
            concepts: [
              {
                term: 'Step 3: Set Up Autopay',
                plain: "Most apps let you set autopay to minimum due, a set amount, or full statement balance. Full balance is almost always the right choice — it guarantees no interest and no missed payments.",
                analogy: "Full-balance autopay is like paying off a group tab in full. Minimum autopay is chipping in $5 and letting the rest sit there, growing.",
                check: { statement: 'Setting autopay to the minimum due guarantees you\'ll never pay any interest.', isTrue: false }
              },
              {
                term: 'Step 4: If a Payment Is Missed',
                plain: "Autopay fails or the linked account is empty, and there's a late fee — 30+ days late, and it's reported to the credit bureaus, a real hit that can take months to recover from.",
                analogy: "A late payment is a single bruise. A carried balance is a slow leak — less dramatic in the moment, but it adds up.",
                linkOut: { label: 'See exactly how a carried balance grows', action: 'compound-interest' }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'cs3', type: 'decision', title: 'Setting the Autopay',
            prompt: "Hammy's app asks which autopay option to choose: minimum due, a fixed $50, or full statement balance.",
            hintText: "Which option guarantees zero interest, no matter what?",
            choices: [
              { id: 'a', label: 'Full statement balance', outcome: { text: "Every bill gets paid in full automatically — no interest, no missed payments, no thinking about it again.", delta: { checking: 0 }, compare: [{ label: 'Interest risk', value: 0 }, { label: 'Effort required', value: 0 }] } },
              { id: 'b', label: 'Minimum due, to keep more cash available', outcome: { text: "Late fees get avoided, but the rest of the balance sits there accruing interest every single day.", delta: { checking: 0 }, compare: [{ label: 'Interest risk', value: 1 }, { label: 'Effort required', value: 0 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'cs4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [2, 3],
            hintTexts: [
              "Think about what happens to a balance when only the minimum gets paid.",
              "Think about which habit — paying in full, on time — carries the most weight for your score."
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
    ],
    quests: [
      {
        id: 'health_basics',
        topic: 'Health Insurance Basics: Premiums & Deductibles',
        character: { name: 'Hammy', tagline: 'Picking a health plan for the first time' },
        initialState: { checking: 300, savings: 100, moneyScore: 50 },
        bossAchievementId: 'health_literate',
        chapters: [
          {
            id: 'hb1', type: 'story', title: 'The $2,000 Letter',
            beats: [
              { speaker: 'intro', text: "Hammy just turned 20 and got a letter asking if they want to enroll in their school's health plan, $2,000/year. They're pretty sure they're already covered under a parent's plan." },
              { speaker: 'Hammy', text: '"Premium, deductible, copay... I nod along at the doctor\'s office but I don\'t actually know what any of these mean."' },
              { speaker: 'narrator', text: "Before Hammy decides anything about this $2,000 letter, let's make the vocabulary make sense." },
              { speaker: 'Hammy', text: '"Okay, break it down for me, because right now this all just looks like a bill."' }
            ]
          },
          {
            id: 'hb_t1', type: 'teach', title: 'Premium',
            concepts: [
              {
                term: 'Premium',
                plain: "Your premium is what you pay, usually monthly, just to HAVE the insurance plan, whether or not you use it that month. It's the cost of having coverage in place at all.",
                analogy: "It's like a gym membership fee, you pay it whether or not you actually go that month, it's the cost of having access.",
                check: { statement: "A premium is only charged in months when you actually use your health insurance.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'hb_t2', type: 'teach', title: 'Deductible & Copay',
            concepts: [
              {
                term: 'Deductible',
                plain: "Your deductible is what you pay out of pocket BEFORE insurance starts covering costs. A $500 deductible means you pay the first $500 of care yourself, then insurance kicks in.",
                analogy: "It's like a cover charge at a venue, you pay it first, then everything after that follows the venue's normal pricing.",
                check: { statement: "A deductible is the amount insurance pays before you owe anything.", isTrue: false }
              },
              {
                term: 'Copay',
                plain: "A copay is a flat fee you pay per visit or service, often after your deductible is met, like $30 for a doctor's visit. It's predictable and separate from the deductible.",
                analogy: "It's like a flat cover charge every time you go out, regardless of how much you actually spend once you're inside.",
                check: { statement: "A copay is a flat fee paid per visit, separate from the deductible.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hb_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Premium', definition: 'What you pay, usually monthly, just to have coverage at all.' },
              { term: 'Deductible', definition: 'What you pay out of pocket before insurance starts covering costs.' },
              { term: 'Copay', definition: 'A flat fee paid per visit or service.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'hb_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: a plan with a lower premium usually has a higher deductible, and vice versa. There's no universally \"best\" plan, the right one depends on how often you expect to actually use care.",
            xpOnComplete: 1
          },
          {
            id: 'hb_t3', type: 'teach', title: 'The ACA Age-26 Rule',
            concepts: [
              {
                term: 'Coverage Until 26',
                plain: "Under the Affordable Care Act, you can typically stay on a parent's health insurance plan until you turn 26, regardless of student status, marriage, or where you live. A lot of students don't realize this and pay for duplicate coverage.",
                analogy: "It's like a family phone plan you don't get bumped off of just because you moved out, the coverage keeps applying until a specific age cutoff.",
                check: { statement: "You are automatically removed from a parent's health plan the moment you start college.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hb_d1', type: 'decision',
            title: "The $2,000 Letter, Again",
            prompt: "Hammy's school auto-bills $2,000/year for its health plan unless they take action. They're pretty sure they're still covered under a parent's plan. What should they do?",
            hintText: "Think back to Coverage Until 26: if Hammy is still eligible for a parent's plan, is paying for a second, separate plan actually necessary?",
            choices: [
              {
                id: 'a', label: "Just pay the $2,000, it's easier than dealing with paperwork",
                outcome: {
                  text: "Hammy pays for duplicate coverage they likely didn't need, on top of whatever their parent's plan already costs.",
                  delta: { checking: -300, moneyScore: -6 },
                  compare: [{ label: 'Cost if duplicate coverage paid', value: 2000 }, { label: 'Cost if waived with proof', value: 0 }]
                }
              },
              {
                id: 'b', label: "Verify parent's plan coverage first, then look into waiving the school plan",
                outcome: {
                  text: "A few minutes of checking saves $2,000 a year, assuming the parent's plan coverage checks out.",
                  delta: { checking: 100, moneyScore: 8 },
                  compare: [{ label: 'Cost if waived with proof', value: 0 }, { label: 'Cost if duplicate coverage paid', value: 2000 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'hb_ms1', type: 'microsim', title: "Budgeting Around a Health Plan Decision",
            prompt: "Hammy's monthly income is $600. Fixed costs already use $430. Help them fit a health-plan-related cost and some savings in without going negative.",
            hintText: "Add up the fixed costs ($220 + $120 + $50 + $40 = $430). That leaves $170 of the $600 to split between the two sliders before going negative.",
            income: 600,
            fixedCosts: [
              { label: 'Rent share', amount: 220 },
              { label: 'Meal plan top-up', amount: 120 },
              { label: 'Phone & subscriptions', amount: 50 },
              { label: 'Transit', amount: 40 }
            ],
            sliders: [
              { id: 'healthCosts', label: 'Health-related costs', min: 0, max: 120, step: 10, default: 20 },
              { id: 'savings', label: 'Savings deposit', min: 0, max: 150, step: 10, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try smaller amounts on one of the sliders.", ok: false },
              { maxLeftover: 19, text: "It fits, but there's little cushion for an unexpected medical cost.", ok: true },
              { maxLeftover: Infinity, text: "Solid, health costs are covered and savings is still growing.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hb_t4', type: 'teach', title: 'In-Network vs. Out-of-Network',
            concepts: [
              {
                term: 'In-Network vs. Out-of-Network',
                plain: "In-network providers have a negotiated rate with your insurance, meaning you pay less. Out-of-network providers don't, and can cost dramatically more, sometimes the full price with no insurance discount at all. Checking a provider's network status before an appointment can prevent a surprise bill.",
                analogy: "It's like a store that only honors a coupon for certain brands, walk in expecting the discount everywhere and you might get a very different total at checkout.",
                check: { statement: "Insurance typically covers in-network and out-of-network care at the exact same cost to you.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hb_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Coverage Until 26', definition: "The age up to which you can typically stay on a parent's health plan under the ACA." },
              { term: 'In-Network', definition: 'A provider with a negotiated rate with your insurance, meaning lower cost to you.' },
              { term: 'Out-of-Network', definition: 'A provider without a negotiated rate, often meaning a much higher cost.' }
            ],
            hintText: "One term is an AGE cutoff, and the other two describe whether a PROVIDER has a deal with your insurer.",
            xpOnComplete: 4
          },
          {
            id: 'hb_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "Once you start college, you're automatically dropped from a parent's health insurance plan.",
            isTrue: false,
            explanation: "It's a myth. Under the ACA, you can typically stay on a parent's plan until age 26, regardless of student status.",
            xpOnComplete: 2
          },
          {
            id: 'hb_myth1', type: 'mythcards', title: 'Health Insurance Myths',
            cards: [
              { myth: "A lower monthly premium always means a better overall deal.", isTrue: false, explanation: "Lower premiums usually come with higher deductibles, the better plan depends on how much care you actually expect to use." },
              { myth: "A copay and a deductible are the exact same thing.", isTrue: false, explanation: "A deductible is what you pay before coverage starts, a copay is a flat per-visit fee, they work differently." },
              { myth: "Going to an out-of-network provider can cost significantly more than an in-network one.", isTrue: true, explanation: "True, out-of-network providers don't have a negotiated rate with your insurer, which can mean a much higher bill." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'hb_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 5],
            hintTexts: [
              "Think about the specific age the ACA allows you to stay on a parent's health plan until.",
              "Think about which term describes money paid out of pocket BEFORE insurance starts covering costs."
            ]
          },
          {
            id: 'hb_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Health Plan Smarts Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's health-plan decisions get smarter. Tap each one to see the impact.",
            hintText: "Verifying existing coverage and checking network status before appointments are the two biggest wins here.",
            decisions: [
              { id: 'd1', label: "Verify parent's plan coverage before paying for a duplicate student plan", scoreDelta: 14, note: "This single check can save $2,000/year in unnecessary duplicate coverage." },
              { id: 'd2', label: "Check whether a provider is in-network before an appointment", scoreDelta: 9, note: "This avoids a surprise bill at the out-of-network rate." },
              { id: 'd3', label: "Skip reading the plan details and assume the cheapest premium is the best deal", scoreDelta: -10, note: "Cheapest premium often means a much higher deductible, the full picture matters." },
              { id: 'd4', label: "Miss the school's waiver deadline entirely", scoreDelta: -8, note: "A missed deadline means paying for coverage that may not have been needed." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hb_t5', type: 'teach', title: 'Reading a Plan Before You Need It',
            concepts: [
              {
                term: 'Reading the Plan Early',
                plain: "The best time to learn premium, deductible, copay, and network details is BEFORE you need care, not while sitting in an urgent care waiting room. A few minutes reading the plan summary now prevents confusion and surprise bills later.",
                analogy: "It's like reading the emergency exit card before takeoff, not useful information to learn for the first time during an actual emergency.",
                check: { statement: "The best time to understand your health plan's terms is after you've already needed care.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hb_boss', type: 'bossbattle', title: 'The Urgent Care Visit',
            scenario: "Hammy gets sick and needs urgent care. There's an in-network clinic 20 minutes away and an out-of-network one 5 minutes away. What does Hammy do?",
            hintText: "Remember In-Network vs. Out-of-Network: how different can the actual cost be for otherwise similar care?",
            choices: [
              { id: 'a', label: "Take the extra 15 minutes to go in-network", consequence: { text: "The negotiated rate keeps the bill manageable, a little extra travel time for a meaningfully lower cost.", delta: { moneyScore: 10, checking: -40 }, xpMultiplier: 1.2 } },
              { id: 'b', label: "Go to the closer out-of-network clinic without checking the cost difference", consequence: { text: "The bill comes back dramatically higher than expected, the full price with no insurance discount applied.", delta: { moneyScore: -10, checking: -220 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Call the insurance line first to confirm both options' actual costs before deciding", consequence: { text: "A few minutes on the phone gives Hammy real numbers instead of guessing, then they can choose with full information.", delta: { moneyScore: 8, checking: -40 }, xpMultiplier: 1.15 } },
              { id: 'd', label: "Skip care entirely to avoid any cost", consequence: { text: "It avoids a bill today, but delaying care for something that needed attention can turn into a bigger cost later.", delta: { moneyScore: -6 }, xpMultiplier: 0.7 } }
            ]
          }
        ]
      },
      {
        id: 'health_waiver',
        topic: 'Navigating Your Student Health Insurance Options',
        character: { name: 'Hammy', tagline: "Deciding whether to waive the school's health plan" },
        initialState: { checking: 300, savings: 100, moneyScore: 50 },
        bossAchievementId: 'waiver_ready',
        chapters: [
          {
            id: 'hw1', type: 'story', title: 'Move-In Day, Deadline Day',
            beats: [
              { speaker: 'intro', text: "It's move-in day. Hammy's school also has a health insurance waiver deadline buried somewhere in their email, easy to miss with everything else going on." },
              { speaker: 'Hammy', text: '"Wait, if I miss this deadline, do I just get auto-billed for a plan I don\'t need?"' },
              { speaker: 'narrator', text: "Exactly right, and that deadline is closer than Hammy thinks. Let's make sure it doesn't slip through the cracks." },
              { speaker: 'Hammy', text: '"Okay, tell me exactly what this waiver process actually involves."' }
            ]
          },
          {
            id: 'hw_t1', type: 'teach', title: 'The Health Insurance Waiver',
            concepts: [
              {
                term: 'Health Insurance Waiver',
                plain: "Many schools automatically enroll every student in their health plan and bill for it, unless you actively submit a waiver proving you already have comparable coverage. No waiver means no automatic exemption, even if you're covered elsewhere.",
                analogy: "It's like an opt-OUT subscription, silence isn't a no, you have to actually cancel it yourself.",
                check: { statement: "Being covered under a parent's plan automatically removes the school's health plan charge with no action needed.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'hw_t2', type: 'teach', title: 'The Waiver Deadline',
            concepts: [
              {
                term: 'Waiver Deadline',
                plain: "Waiver deadlines are hard cutoffs, often within the first few weeks of the semester. Miss it, and you're billed for the full plan regardless of what other coverage you actually have, there's typically no exception for forgetting.",
                analogy: "It's like a course drop deadline, missing it by even a day usually means you're stuck with the enrollment either way.",
                check: { statement: "Waiver deadlines are usually flexible and can be submitted any time during the semester.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'hw_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Health Insurance Waiver', definition: "A form proving comparable coverage exists, submitted to opt out of the school's plan." },
              { term: 'Waiver Deadline', definition: 'A hard cutoff, often early in the semester, with no exceptions for missing it.' },
              { term: 'Proof of Comparable Coverage', definition: "Documentation from your existing plan showing it meets the school's coverage requirements." }
            ],
            xpOnComplete: 4
          },
          {
            id: 'hw_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: waiver forms usually just need your existing insurance card info and policy details, most students can complete one in under 10 minutes once they have that information handy.",
            xpOnComplete: 1
          },
          {
            id: 'hw_t3', type: 'teach', title: 'Gathering Proof of Coverage',
            concepts: [
              {
                term: 'Proof of Comparable Coverage',
                plain: "Most waiver forms require specific details from your existing plan: insurer name, policy number, and effective dates. Having your insurance card or a parent's plan summary on hand before starting the waiver makes the process fast instead of a scramble.",
                analogy: "It's like gathering ingredients before cooking, having everything ready up front turns a stressful process into a quick one.",
                check: { statement: "Waiver forms typically require specific details from your existing insurance plan, not just a verbal confirmation.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hw_d1', type: 'decision',
            title: "The Buried Email",
            prompt: "Hammy finds the waiver deadline email three weeks deep in their inbox, it's due in 4 days. What should they do?",
            hintText: "Think back to Waiver Deadline: is a 4-day window still enough time, and what's the cost of letting it slip further?",
            choices: [
              {
                id: 'a', label: "Put it off for a few more days since move-in is hectic",
                outcome: {
                  text: "The deadline passes before Hammy gets to it, resulting in a $2,000 charge for coverage they didn't need.",
                  delta: { checking: -300, moneyScore: -8 },
                  compare: [{ label: 'Cost if waiver missed', value: 2000 }, { label: 'Cost if waiver submitted on time', value: 0 }]
                }
              },
              {
                id: 'b', label: "Gather the proof of coverage tonight and submit the waiver immediately",
                outcome: {
                  text: "A focused 15 minutes tonight avoids a $2,000 charge and one less thing to worry about all semester.",
                  delta: { checking: 50, moneyScore: 8 },
                  compare: [{ label: 'Cost if waiver submitted on time', value: 0 }, { label: 'Cost if waiver missed', value: 2000 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'hw_ms1', type: 'microsim', title: "Budgeting Move-In Week",
            prompt: "Hammy's move-in week budget is $250. Fixed costs already use $150. Help them fit dorm essentials and some savings in without going negative.",
            hintText: "Add up the fixed costs ($90 + $60 = $150). That leaves $100 of the $250 to split between the two sliders before going negative.",
            income: 250,
            fixedCosts: [
              { label: 'Dorm essentials already ordered', amount: 90 },
              { label: 'Move-in transportation', amount: 60 }
            ],
            sliders: [
              { id: 'extras', label: 'Additional move-in extras', min: 0, max: 80, step: 10, default: 20 },
              { id: 'savings', label: 'Savings deposit', min: 0, max: 100, step: 10, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That goes negative during an already expensive week. Try smaller amounts.", ok: false },
              { maxLeftover: 19, text: "It fits, move-in week is covered with a little left over.", ok: true },
              { maxLeftover: Infinity, text: "Solid, move-in week is covered and savings still gets a deposit.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hw_t4', type: 'teach', title: 'What Happens If You Miss It',
            concepts: [
              {
                term: 'Missing the Deadline',
                plain: "If the waiver deadline passes, most schools bill the FULL health plan cost with no exceptions, even with perfectly valid outside coverage. Some schools allow an appeal for extenuating circumstances, but it's not guaranteed, and it's far more work than submitting on time.",
                analogy: "It's like missing a flight versus rebooking before departure, one is a quick fix, the other is a much bigger hassle after the fact.",
                check: { statement: "Schools generally guarantee a full refund if you submit a waiver after the deadline with valid proof.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hw_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Missing the Deadline', definition: 'Usually results in the full plan cost billed, with no guaranteed exception.' },
              { term: 'Waiver Appeal', definition: 'A request to reconsider a missed deadline, not guaranteed to work.' },
              { term: 'Health Insurance Waiver', definition: "A form proving comparable coverage exists, submitted to opt out of the school's plan." }
            ],
            hintText: "One term is the CONSEQUENCE of missing it, one is a possible FIX after missing it, and one is the form itself.",
            xpOnComplete: 4
          },
          {
            id: 'hw_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "If you're already covered under a parent's plan, the school automatically knows and skips billing you.",
            isTrue: false,
            explanation: "It's a myth. Schools don't automatically know about outside coverage, you have to actively submit a waiver with proof before the deadline.",
            xpOnComplete: 2
          },
          {
            id: 'hw_myth1', type: 'mythcards', title: 'Health Waiver Myths',
            cards: [
              { myth: "Waiver deadlines are usually flexible if you have a good reason for being late.", isTrue: false, explanation: "Most schools enforce a hard cutoff, exceptions are rare and never guaranteed." },
              { myth: "A waiver form typically requires specific details like your insurer's name and policy number.", isTrue: true, explanation: "True, generic proof isn't enough, schools want the specific plan details on record." },
              { myth: "Missing the waiver deadline usually means paying for the full school health plan regardless of other coverage.", isTrue: true, explanation: "True, most schools don't make exceptions after the deadline passes." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'hw_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [6, 0],
            hintTexts: [
              "Think about what a student needs to submit, by a deadline, to avoid being billed for a school health plan they don't need.",
              "Think about the specific age the ACA allows you to stay on a parent's health plan until."
            ]
          },
          {
            id: 'hw_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Deadline Discipline Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's habits improve around deadlines and paperwork. Tap each decision to see the impact.",
            hintText: "Acting early on the waiver and having proof of coverage ready are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Submit the waiver with proof of coverage well before the deadline", scoreDelta: 15, note: "Early action avoids the entire $2,000 charge with zero stress." },
              { id: 'd2', label: "Set a calendar reminder for every school deadline during move-in week", scoreDelta: 8, note: "Move-in week is chaotic, a reminder protects against buried emails." },
              { id: 'd3', label: "Assume outside coverage is automatically recognized with no waiver", scoreDelta: -12, note: "Schools require an active waiver, assuming otherwise is exactly how the charge slips through." },
              { id: 'd4', label: "Wait until the deadline has already passed to start gathering proof", scoreDelta: -9, note: "By then, most schools no longer accept the waiver at all." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hw_t5', type: 'teach', title: 'Making It a Move-In Ritual',
            concepts: [
              {
                term: 'Building the Habit',
                plain: "The fix isn't remembering harder, it's building a simple move-in ritual: check for a waiver deadline, gather proof of coverage, and submit within the first few days. Doing this every year removes the risk of a buried email costing $2,000.",
                analogy: "It's like a pre-flight checklist, the same few steps, done every time, before things get busy.",
                check: { statement: "The most reliable fix for missing waiver deadlines is simply trying to remember better each year.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hw_boss', type: 'bossbattle', title: 'Three Days Left',
            scenario: "Hammy discovers the waiver deadline is in 3 days, and their parent's insurance card is at home, a two-hour drive away. What's the smartest move?",
            hintText: "Remember Proof of Comparable Coverage: is a physical card the only way to get the needed policy details?",
            choices: [
              { id: 'a', label: "Call the parent's insurance company or check the online portal for the policy details remotely", consequence: { text: "Most insurers provide digital access to policy details, no physical card or road trip required.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Give up and accept the school plan charge since the card isn't available", consequence: { text: "A $2,000 charge for coverage that likely wasn't needed, solvable with a phone call or app login.", delta: { moneyScore: -10, checking: -300 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Drive home to get the card in person", consequence: { text: "It works, but costs a 4-hour round trip during a busy week for information that was likely available online.", delta: { moneyScore: 4, checking: -30 }, xpMultiplier: 0.9 } },
              { id: 'd', label: "Ask a parent to email a photo of the insurance card today", consequence: { text: "Fast, simple, and gets the waiver submitted well within the deadline.", delta: { moneyScore: 10 }, xpMultiplier: 1.2 } }
            ]
          }
        ]
      },
      {
        id: 'renters_insurance',
        topic: 'Renter\'s Insurance: Protecting Your Stuff',
        character: { name: 'Hammy', tagline: 'Moving into a first apartment' },
        initialState: {},
        chapters: [
          { id: 'renters_insurance_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Renter's Insurance: Protecting Your Stuff." }
            ]
          }
        ]
      },
      {
        id: 'auto_insurance',
        topic: 'Auto Insurance Basics: What Coverage Actually Means',
        character: { name: 'Hammy', tagline: 'Getting a first car insurance policy' },
        initialState: {},
        chapters: [
          { id: 'auto_insurance_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Auto Insurance Basics: What Coverage Actually Means." }
            ]
          }
        ]
      },
      {
        id: 'insurance_payout',
        topic: 'What Insurance Actually Pays Out',
        character: { name: 'Hammy', tagline: 'Filing a claim for the first time' },
        initialState: {},
        chapters: [
          { id: 'insurance_payout_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on What Insurance Actually Pays Out." }
            ]
          }
        ]
      },
      {
        id: 'life_disability',
        topic: 'Life & Disability Insurance in Your 20s',
        character: { name: 'Hammy', tagline: 'Wondering if life insurance matters this early' },
        initialState: {},
        chapters: [
          { id: 'life_disability_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Life & Disability Insurance in Your 20s." }
            ]
          }
        ]
      },
      {
        id: 'umbrella_coverage',
        topic: 'Umbrella Coverage & Extra Liability Protection',
        character: { name: 'Hammy', tagline: 'Learning what an umbrella policy actually covers' },
        initialState: {},
        chapters: [
          { id: 'umbrella_coverage_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Umbrella Coverage & Extra Liability Protection." }
            ]
          }
        ]
      },
      {
        id: 'reading_policy',
        topic: 'Reading a Policy Before You Need It',
        character: { name: 'Hammy', tagline: 'Actually reading the fine print on a policy' },
        initialState: {},
        chapters: [
          { id: 'reading_policy_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Reading a Policy Before You Need It." }
            ]
          }
        ]
      },
      {
        id: 'health_enroll',
        parentQuestId: 'health_basics',
        topic: 'Enrolling in a Health Insurance Plan: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually enrolling in — or waiving — a health plan' },
        initialState: {},
        chapters: [
          {
            id: 'he0', type: 'story', title: 'The Enrollment Deadline',
            beats: [
              { speaker: 'intro', text: "Hammy's school just sent an email: enroll in the student health plan, or submit a waiver, by the deadline in two weeks. Understanding premiums and deductibles is one thing — actually doing the paperwork is another." }
            ]
          },
          {
            id: 'he1', type: 'teach', title: 'Step 1 & 2: Compare & Gather',
            concepts: [
              { term: 'Step 1: Compare the Real Options', plain: "If already covered under a parent's plan (allowed until age 26), compare that coverage against the school's plan — network of doctors, cost, and whether it covers care near campus.", analogy: "It's a side-by-side comparison, like comparing two phone plans before switching.", check: { statement: "Students can generally stay on a parent's health plan until age 26.", isTrue: true } },
              { term: "Step 2: Gather What's Needed", plain: "To waive the school's plan, proof of comparable existing coverage is required — usually the insurance card or a benefits summary showing the plan meets the school's minimum requirements.", analogy: "It's like providing proof of address — a specific document, not just a verbal claim.", check: {} }
            ],
            xpOnComplete: 3
          },
          {
            id: 'he2', type: 'teach', title: 'Step 3 & 4: Submit & Save',
            concepts: [
              { term: 'Step 3: Submit Before the Deadline', plain: "Waivers and enrollments both have hard deadlines, often within the first few weeks of the semester. Miss it, and the school's plan (and its cost) gets automatically billed with no way to reverse it until next term.", analogy: "It's like an opt-out window — miss it, and the default choice sticks for the whole term.", check: { statement: 'Missing a health plan waiver deadline usually has no real consequence.', isTrue: false } },
              { term: 'Step 4: Save the Confirmation', plain: "Whether waiving or enrolling, save the confirmation email or screenshot. If a bill shows up later that shouldn't be there, this proof makes it easy to get it corrected.", analogy: "A receipt for a decision that saves an argument later.", check: {} }
            ],
            xpOnComplete: 3
          },
          {
            id: 'he3', type: 'decision', title: 'The Auto-Bill',
            prompt: "Hammy's bursar bill shows a $2,000 student health plan charge, even though Hammy is already covered under a parent's plan. The waiver deadline was yesterday.",
            hintText: "Is a missed deadline always truly final, or worth a call first?",
            choices: [
              { id: 'a', label: 'Just pay the charge since the deadline already passed', outcome: { text: "Paying without checking first means possibly losing $2,000 that a quick call to the health services office might have resolved.", delta: {}, compare: [{ label: 'Cost paid', value: 2000 }, { label: 'Cost if resolved', value: 0 }] } },
              { id: 'b', label: 'Call the health services or bursar office to ask about a late waiver exception', outcome: { text: "Many schools allow a short grace period or exception process — worth asking before assuming the charge is final.", delta: {}, compare: [{ label: 'Cost if waived', value: 0 }, { label: 'Cost if not', value: 2000 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'he4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [5, 6],
            hintTexts: [
              "Think about what a deductible actually means before insurance starts paying.",
              "Think about what a school requires as proof before removing an automatic charge."
            ]
          }
        ]
      }
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
    ],
    quests: [
      {
        id: 'federal_loans',
        topic: 'Federal Loans: Subsidized vs. Unsubsidized',
        character: { name: 'Hammy', tagline: 'Comparing loan offers in a financial aid package' },
        initialState: { checking: 200, savings: 100, moneyScore: 50 },
        bossAchievementId: 'loan_literate',
        chapters: [
          {
            id: 'fl1', type: 'story', title: 'Two Loans, One Confusing Page',
            beats: [
              { speaker: 'intro', text: "Hammy's financial aid offer lists Direct Subsidized and Direct Unsubsidized loans, plus a mention of private loan options from a bank. They've never had to compare loan types before." },
              { speaker: 'Hammy', text: '"They\'re both just... loans, right? Does the label actually matter?"' },
              { speaker: 'narrator', text: "It matters more than Hammy expects, the difference shows up the moment interest starts accruing. Let's break it down." },
              { speaker: 'Hammy', text: '"Okay, walk me through what actually separates these."' }
            ]
          },
          {
            id: 'fl_t1', type: 'teach', title: 'Direct Subsidized Loans',
            concepts: [
              {
                term: 'Direct Subsidized Loan',
                plain: "A need-based federal loan where the government pays the interest while you're enrolled at least half-time. Nothing accrues against you while you're in school.",
                analogy: "It's like a loan on pause, the clock isn't running on interest while you're still a student.",
                check: { statement: "Interest accrues on a Direct Subsidized Loan while you're enrolled in school.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'fl_t2', type: 'teach', title: 'Direct Unsubsidized Loans',
            concepts: [
              {
                term: 'Direct Unsubsidized Loan',
                plain: "Not based on financial need, and interest starts accruing from day one, including the entire time you're still in school. If unpaid, that interest gets added to your balance later.",
                analogy: "Unlike the subsidized version, the clock starts running immediately, whether or not you're making payments yet.",
                check: { statement: "Interest on a Direct Unsubsidized Loan begins accruing immediately, even while you're still enrolled.", isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'fl_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Direct Subsidized Loan', definition: "Need-based, the government pays interest while you're enrolled at least half-time." },
              { term: 'Direct Unsubsidized Loan', definition: 'Not need-based, interest accrues starting immediately, even while in school.' },
              { term: 'Interest Accrual', definition: "Interest building up on a balance over time, whether or not it's being paid." }
            ],
            xpOnComplete: 4
          },
          {
            id: 'fl_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: even small interest payments on an unsubsidized loan while you're still in school can meaningfully reduce what you owe later, since that unpaid interest would otherwise get added to your principal after graduation.",
            xpOnComplete: 1
          },
          {
            id: 'fl_t3', type: 'teach', title: 'Federal vs. Private Loans',
            concepts: [
              {
                term: 'Federal vs. Private Loans',
                plain: "Federal loans come with built-in borrower protections by law, income-driven repayment, deferment, forgiveness programs, regardless of credit. Private loans come from banks or credit unions, often require a credit check or cosigner, and rarely offer the same flexibility. Exhaust federal options first.",
                analogy: "It's like a warranty that comes standard versus one you have to negotiate separately, one is built in no matter what, the other depends on the lender's terms.",
                check: { statement: "Private student loans generally offer the exact same borrower protections as federal loans.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fl_d1', type: 'decision',
            title: "Which Loan First?",
            prompt: "Hammy's aid offer includes both Subsidized and Unsubsidized loan amounts, but they only need part of the total offered. Which should they prioritize accepting first?",
            hintText: "Think back to the difference in Interest Accrual: which loan type costs nothing extra while Hammy is still in school?",
            choices: [
              {
                id: 'a', label: 'Accept the Unsubsidized amount first since it\'s listed first',
                outcome: {
                  text: "Interest starts piling up immediately on the unsubsidized portion, an avoidable cost if the subsidized amount alone would have covered the need.",
                  delta: { moneyScore: -6 },
                  compare: [{ label: 'Interest accrued in school (Unsubsidized first)', value: 180 }, { label: 'Interest accrued in school (Subsidized first)', value: 0 }]
                }
              },
              {
                id: 'b', label: 'Accept the Subsidized amount first, only add Unsubsidized if still needed',
                outcome: {
                  text: "No interest accrues on the subsidized portion while in school, the cheapest borrowing option gets used first.",
                  delta: { moneyScore: 8 },
                  compare: [{ label: 'Interest accrued in school (Subsidized first)', value: 0 }, { label: 'Interest accrued in school (Unsubsidized first)', value: 180 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'fl_ms1', type: 'microsim', title: "Budgeting on a Student Income With Loans in the Mix",
            prompt: "Hammy's monthly income (work-study + a small loan disbursement) is $700. Fixed costs already use $520. Help them fit a savings deposit in without going negative.",
            hintText: "Add up the fixed costs ($280 + $140 + $60 + $40 = $520). That leaves $180 of the $700 to split between the two sliders before going negative.",
            income: 700,
            fixedCosts: [
              { label: 'Rent share', amount: 280 },
              { label: 'Meal plan top-up', amount: 140 },
              { label: 'Phone & subscriptions', amount: 60 },
              { label: 'Transit', amount: 40 }
            ],
            sliders: [
              { id: 'savings', label: 'Savings deposit', min: 0, max: 150, step: 10, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 30, max: 180, step: 10, default: 30 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try smaller amounts on one of the sliders.", ok: false },
              { maxLeftover: 19, text: "It fits, but there's little room if a loan disbursement is ever delayed.", ok: true },
              { maxLeftover: Infinity, text: "Solid, the budget holds even with loan money as part of the income mix.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'fl_t4', type: 'teach', title: 'Enrollment Status & Eligibility',
            concepts: [
              {
                term: 'Enrollment Status & Loan Eligibility',
                plain: "Federal loan eligibility is tied to enrollment status, usually requiring at least half-time (commonly 6+ credits per semester). Drop below that threshold mid-semester and aid, including loans already disbursed, can be reduced or reversed.",
                analogy: "It's like a membership tier that changes if you drop below a usage minimum, the terms aren't fixed regardless of what you do afterward.",
                check: { statement: "Dropping below half-time enrollment mid-semester can affect federal loans already disbursed.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fl_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Federal vs. Private Loans', definition: 'Federal loans have built-in legal protections; private loans depend on the lender.' },
              { term: 'Enrollment Status & Eligibility', definition: 'Federal loans generally require at least half-time enrollment to stay eligible.' },
              { term: 'Master Promissory Note (MPN)', definition: 'A legal promise to repay, required before any federal loan funds disburse.' }
            ],
            hintText: "One term compares LENDER types, one is about your ENROLLMENT status, and one is a required legal DOCUMENT.",
            xpOnComplete: 4
          },
          {
            id: 'fl_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "Subsidized and Unsubsidized federal loans work exactly the same way, the names don't reflect any real difference.",
            isTrue: false,
            explanation: "It's a myth. On Subsidized loans, the government pays interest while you're in school. On Unsubsidized loans, interest accrues from day one, a real, meaningful difference.",
            xpOnComplete: 2
          },
          {
            id: 'fl_myth1', type: 'mythcards', title: 'Federal Loan Myths',
            cards: [
              { myth: "Interest never accrues on a federal student loan while you're still enrolled in school.", isTrue: false, explanation: "This is only true for Subsidized loans, Unsubsidized loans accrue interest the entire time, including while enrolled." },
              { myth: "Federal loans generally come with more borrower protections than private loans.", isTrue: true, explanation: "True, income-driven repayment, deferment, and forgiveness programs are built into federal loans by law." },
              { myth: "You can drop below half-time enrollment mid-semester with zero effect on already-disbursed federal loans.", isTrue: false, explanation: "Enrollment status changes can reduce or reverse aid, including loans already disbursed." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'fl_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 6],
            hintTexts: [
              "Think about which loan type has the government covering interest WHILE you're still in school.",
              "Think about what federal loans offer, by law, that private loans generally don't."
            ]
          },
          {
            id: 'fl_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Smart Borrowing Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's borrowing decisions get smarter. Tap each one to see the impact.",
            hintText: "Prioritizing subsidized loans and paying accruing interest early are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Accept Subsidized loan amounts before Unsubsidized ones", scoreDelta: 13, note: "No interest accrues on the subsidized portion while still in school." },
              { id: 'd2', label: "Pay small amounts toward accruing interest on Unsubsidized loans while still in school", scoreDelta: 8, note: "This prevents that interest from capitalizing into a bigger balance later." },
              { id: 'd3', label: "Accept the full loan amount offered without checking actual need", scoreDelta: -11, note: "Borrowing more than needed just means more interest and a bigger balance to repay." },
              { id: 'd4', label: "Drop below half-time enrollment without checking the effect on loan eligibility", scoreDelta: -9, note: "This can reduce or reverse aid already disbursed for the semester." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'fl_t5', type: 'teach', title: 'Every Dollar Borrowed Comes Back Around',
            concepts: [
              {
                term: 'Borrowing With the End in Mind',
                plain: "Federal loans are flexible and often necessary, but every dollar borrowed still needs to be repaid, with interest. Understanding the type of loan you're accepting, and only accepting what's actually needed, keeps that future payment manageable instead of a surprise.",
                analogy: "It's like packing for a trip knowing you'll be the one carrying the bag the whole way, worth being thoughtful about what actually goes in.",
                check: { statement: "The type of federal loan you accept has no real effect on your total cost of borrowing.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fl_boss', type: 'bossbattle', title: 'The Extra $2,300',
            scenario: "Hammy's offer includes $5,500 in loans, but only $3,200 is actually needed to cover the gap after grants. The extra $2,300 would be nice to have as a cushion. What does Hammy do?",
            hintText: "Remember: every dollar borrowed accrues interest and must be repaid, whether or not it was actually needed.",
            choices: [
              { id: 'a', label: "Accept only the $3,200 needed, decline the rest through the aid portal", consequence: { text: "Borrowing exactly what's needed keeps the future balance, and the interest on it, as small as possible.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Accept the full $5,500 as a cushion", consequence: { text: "The extra $2,300 accrues interest for years before it's ever needed, a cushion that costs real money to hold onto.", delta: { moneyScore: -10 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Accept the full amount but immediately pay back the unneeded portion", consequence: { text: "Some schools allow this within a short window, avoiding most of the interest, though it takes extra paperwork most students skip.", delta: { moneyScore: 6 }, xpMultiplier: 1.05 } },
              { id: 'd', label: "Decline all loans, even the $3,200 actually needed", consequence: { text: "Avoiding all debt sounds appealing, but it can leave Hammy short on genuinely necessary costs this semester.", delta: { moneyScore: -3, checking: -100 }, xpMultiplier: 0.85 } }
            ]
          }
        ]
      },
      {
        id: 'plus_loans',
        topic: 'Parent PLUS Loans & Who\'s Responsible',
        character: { name: 'Hammy', tagline: "Figuring out who's actually on the hook for a loan" },
        initialState: { checking: 200, savings: 100, moneyScore: 50 },
        bossAchievementId: 'plus_aware',
        chapters: [
          {
            id: 'pl1', type: 'story', title: "Whose Debt Is This, Really?",
            beats: [
              { speaker: 'intro', text: "Hammy's parent takes out a Parent PLUS loan to cover the remaining gap in Hammy's tuition bill. Hammy figures they'll just pay it off themselves after graduation." },
              { speaker: 'Hammy', text: '"It paid for MY school, so it\'s basically my debt too, right?"' },
              { speaker: 'narrator', text: "That assumption is actually wrong, and it's worth getting right before graduation, not after." },
              { speaker: 'Hammy', text: '"Wait, really? Okay, tell me exactly how this works."' }
            ]
          },
          {
            id: 'pl_t1', type: 'teach', title: 'The Parent PLUS Loan',
            concepts: [
              {
                term: 'Parent PLUS Loan',
                plain: "A federal loan taken out BY a parent, in the parent's name, to help cover their dependent student's education costs. It fills the gap after other financial aid is applied.",
                analogy: "It's like a parent co-signing a lease that's entirely in their own name, the apartment is for the student, but the paperwork and liability belong to the parent alone.",
                check: { statement: "A Parent PLUS loan is issued directly in the student's name.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'pl_t2', type: 'teach', title: 'Legal Responsibility',
            concepts: [
              {
                term: 'Legal Responsibility',
                plain: "The parent who took out a Parent PLUS loan is legally responsible for repaying it, even though it paid for the student's education. It cannot simply be transferred to the student's name after the fact, that requires a separate refinancing process through a private lender.",
                analogy: "It's like a car loan taken out by one family member for another to drive, the driver benefits, but the name on the loan is who the bank comes after.",
                check: { statement: "A Parent PLUS loan automatically becomes the student's legal responsibility once they graduate.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'pl_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Parent PLUS Loan', definition: "A federal loan taken out by a parent to help cover a dependent student's costs." },
              { term: 'Legal Responsibility', definition: 'Falls on the parent who took out the loan, not the student, unless refinanced.' },
              { term: 'Refinancing', definition: "A separate private process that can move the debt into the student's name." }
            ],
            xpOnComplete: 4
          },
          {
            id: 'pl_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: some families set up an informal agreement where the student pays the parent back directly, that's a personal arrangement, though, not something the loan servicer or the law recognizes. The parent remains legally on the hook either way.",
            xpOnComplete: 1
          },
          {
            id: 'pl_t3', type: 'teach', title: 'Grad PLUS Loans',
            concepts: [
              {
                term: 'Grad PLUS Loan',
                plain: "A related but different loan, taken out by GRADUATE or professional students themselves (not a parent), also to cover costs beyond other aid. Both PLUS loan types require a credit check and typically carry a higher interest rate than Direct loans, making them a last resort, not a first option.",
                analogy: "Same family of loan, different borrower, a Parent PLUS loan is the parent's name on it, a Grad PLUS loan is the graduate student's own name.",
                check: { statement: "PLUS loans, whether Parent or Grad, typically require a credit check.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'pl_d1', type: 'decision',
            title: "The Repayment Conversation",
            prompt: "Hammy wants to help cover the Parent PLUS loan payments after graduation. What's the smartest way to approach it?",
            hintText: "Think back to Legal Responsibility: does simply sending money casually change whose name is legally on the loan?",
            choices: [
              {
                id: 'a', label: 'Just send money whenever, no real plan or paperwork',
                outcome: {
                  text: "It might work out informally, but there's no legal protection for either side if income gets tight or plans change.",
                  delta: { moneyScore: -4 },
                  compare: [{ label: 'Clarity with a real plan', value: 1 }, { label: 'Clarity with an informal arrangement', value: 0 }]
                }
              },
              {
                id: 'b', label: "Set up a clear, written agreement, or look into refinancing into Hammy's name",
                outcome: {
                  text: "A real plan, written down or formally refinanced, protects both people and avoids confusion down the road.",
                  delta: { moneyScore: 8 },
                  compare: [{ label: 'Clarity with a real plan', value: 1 }, { label: 'Clarity with an informal arrangement', value: 0 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'pl_ms1', type: 'microsim', title: "Helping Without Overextending",
            prompt: "Hammy's first post-grad paycheck take-home is $2,200/month. Fixed costs already use $1,600. Help them fit a contribution toward the family's Parent PLUS payment and some savings in without going negative.",
            hintText: "Add up the fixed costs ($900 + $400 + $150 + $150 = $1,600). That leaves $600 of the $2,200 to split between the two sliders before going negative.",
            income: 2200,
            fixedCosts: [
              { label: 'Rent', amount: 900 },
              { label: 'Groceries & utilities', amount: 400 },
              { label: 'Transportation', amount: 150 },
              { label: 'Insurance & phone', amount: 150 }
            ],
            sliders: [
              { id: 'parentContribution', label: 'Contribution toward Parent PLUS payment', min: 0, max: 400, step: 25, default: 0 },
              { id: 'savings', label: 'Savings deposit', min: 0, max: 500, step: 25, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try a smaller contribution or savings amount.", ok: false },
              { maxLeftover: 49, text: "It fits, but there's little cushion left for Hammy's own expenses.", ok: true },
              { maxLeftover: Infinity, text: "Solid, Hammy can help the family AND keep building their own savings.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'pl_t4', type: 'teach', title: 'Why This Matters Before Graduation',
            concepts: [
              {
                term: 'Planning the Conversation Early',
                plain: "Having the who-pays-what conversation BEFORE the first Parent PLUS payment is due avoids confusion or resentment later. Understanding that the parent is legally responsible, regardless of any informal family arrangement, helps everyone plan realistically.",
                analogy: "It's like discussing chores before moving in together, not after the first disagreement about who was supposed to do what.",
                check: { statement: "It's better to have the repayment conversation with family before the first payment is due, not after.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'pl_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Grad PLUS Loan', definition: "A PLUS loan taken out by graduate students themselves, not a parent." },
              { term: 'Planning the Conversation Early', definition: 'Discussing repayment responsibility with family before the first payment is due.' },
              { term: 'Parent PLUS Loan', definition: "A federal loan taken out by a parent to help cover a dependent student's costs." }
            ],
            hintText: "One term is a DIFFERENT PLUS loan for grad students, one is a HABIT worth building early, and one is the loan itself.",
            xpOnComplete: 4
          },
          {
            id: 'pl_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "Once a student graduates, a Parent PLUS loan automatically transfers into the student's name.",
            isTrue: false,
            explanation: "It's a myth. The parent remains legally responsible unless the debt is formally refinanced into the student's name through a private lender.",
            xpOnComplete: 2
          },
          {
            id: 'pl_myth1', type: 'mythcards', title: 'Parent PLUS Loan Myths',
            cards: [
              { myth: "A Parent PLUS loan automatically becomes the student's responsibility after graduation.", isTrue: false, explanation: "It stays the parent's legal debt unless formally refinanced into the student's name." },
              { myth: "PLUS loans, unlike Direct Subsidized/Unsubsidized loans, typically require a credit check.", isTrue: true, explanation: "True, this is a key difference from Direct loans, which don't require a credit check." },
              { myth: "A Grad PLUS loan is taken out by a parent, just like a Parent PLUS loan.", isTrue: false, explanation: "A Grad PLUS loan is taken out by the graduate student themselves, not a parent." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'pl_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [1, 10],
            hintTexts: [
              "Think about who Direct PLUS loans, Grad or Parent, are actually designed for.",
              "Think about whose name legally stays on a Parent PLUS loan after the student graduates."
            ]
          },
          {
            id: 'pl_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Family Loan Clarity Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's family navigate the Parent PLUS loan more clearly. Tap each decision to see the impact.",
            hintText: "Clear agreements and early conversations are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Put the repayment plan in writing before the first payment is due", scoreDelta: 13, note: "Clarity upfront avoids confusion or resentment down the road." },
              { id: 'd2', label: "Look into refinancing into the student's name once income is stable", scoreDelta: 8, note: "This is the only way to formally shift legal responsibility." },
              { id: 'd3', label: "Assume the debt transfers to the student automatically at graduation", scoreDelta: -12, note: "It doesn't, the parent stays legally responsible unless refinanced." },
              { id: 'd4', label: "Avoid discussing repayment responsibility with family at all", scoreDelta: -7, note: "Avoiding the conversation just delays confusion instead of preventing it." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'pl_t5', type: 'teach', title: 'Helping Doesn\'t Require Confusion',
            concepts: [
              {
                term: 'Supporting Without Blurring the Lines',
                plain: "A student can absolutely help their family with a Parent PLUS loan, that's a generous, common choice. The key is doing it with a clear plan, whether that's a written agreement or formal refinancing, so everyone understands who's actually legally responsible.",
                analogy: "It's like helping a roommate with a bill they're technically responsible for, generous and fine, as long as everyone's clear on whose name is actually on the lease.",
                check: { statement: "Helping a parent repay a PLUS loan requires legally transferring the debt first.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'pl_boss', type: 'bossbattle', title: 'The First Payment Notice',
            scenario: "The first Parent PLUS payment notice arrives the same month Hammy starts their first job. Hammy's parent hasn't budgeted for it and hints that Hammy should just \"handle it.\"",
            hintText: "Remember Legal Responsibility: whose name is actually on this loan, and what does that mean for how this gets resolved?",
            choices: [
              { id: 'a', label: "Sit down with the parent, review the loan terms together, and agree on a clear, written contribution plan", consequence: { text: "A clear plan protects both people and turns an awkward assumption into an actual agreement.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Just start paying the full amount without any conversation", consequence: { text: "It solves the immediate problem, but sets an unclear precedent with no agreement on how long or how much this continues.", delta: { moneyScore: -6, checking: -100 }, xpMultiplier: 0.75 } },
              { id: 'c', label: "Ignore the hint entirely and let the parent handle their own loan", consequence: { text: "Legally accurate, since the parent IS responsible, but it may strain the relationship if help was genuinely expected.", delta: { moneyScore: 2 }, xpMultiplier: 0.9 } },
              { id: 'd', label: "Look into refinancing the loan into Hammy's name now that they have income", consequence: { text: "A bigger step, but it formally clarifies responsibility instead of leaving it as an ongoing assumption.", delta: { moneyScore: 9 }, xpMultiplier: 1.15 } }
            ]
          }
        ]
      },
      {
        id: 'loan_paperwork',
        topic: 'FAFSA Eligibility & Loan Paperwork',
        character: { name: 'Hammy', tagline: 'Wading through loan paperwork' },
        initialState: {},
        chapters: [
          { id: 'loan_paperwork_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on FAFSA Eligibility & Loan Paperwork." }
            ]
          }
        ]
      },
      {
        id: 'borrow_only_need',
        topic: 'Borrowing Only What You Need',
        character: { name: 'Hammy', tagline: 'Deciding how much to actually borrow' },
        initialState: {},
        chapters: [
          { id: 'borrow_only_need_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Borrowing Only What You Need." }
            ]
          }
        ]
      },
      {
        id: 'repayment_plans',
        topic: 'Loan Repayment Plans Explained',
        character: { name: 'Hammy', tagline: 'Picking a repayment plan after graduation' },
        initialState: {},
        chapters: [
          { id: 'repayment_plans_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Loan Repayment Plans Explained." }
            ]
          }
        ]
      },
      {
        id: 'capitalization',
        topic: 'Interest Capitalization: The True Cost of Waiting',
        character: { name: 'Hammy', tagline: 'Learning what happens to unpaid interest' },
        initialState: {},
        chapters: [
          { id: 'capitalization_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Interest Capitalization: The True Cost of Waiting." }
            ]
          }
        ]
      },
      {
        id: 'grace_periods',
        topic: 'Grace Periods & Planning Ahead',
        character: { name: 'Hammy', tagline: 'Planning for the day payments start' },
        initialState: {},
        chapters: [
          { id: 'grace_periods_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Grace Periods & Planning Ahead." }
            ]
          }
        ]
      },
      {
        id: 'private_loans',
        topic: 'Private Loans: When to Consider Them',
        character: { name: 'Hammy', tagline: 'Weighing a private loan against federal options' },
        initialState: {},
        chapters: [
          { id: 'private_loans_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Private Loans: When to Consider Them." }
            ]
          }
        ]
      },
      {
        id: 'accept_loan',
        parentQuestId: 'federal_loans',
        topic: 'Accepting Your Loan Offer on StudentAid.gov: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually accepting — or reducing — a federal loan offer' },
        initialState: {},
        chapters: [
          {
            id: 'al0', type: 'story', title: 'The Aid Offer Is In',
            beats: [
              { speaker: 'intro', text: "Hammy's financial aid offer just arrived with $5,500 in federal loans listed. Knowing subsidized from unsubsidized is one thing — actually accepting, reducing, or declining the offer is another." }
            ]
          },
          {
            id: 'al1', type: 'teach', title: 'Step 1 & 2: Log In & Complete Counseling',
            concepts: [
              { term: 'Step 1: Log Into StudentAid.gov', plain: "First-time federal borrowers need an FSA ID to log in. This account is the hub for everything: loan counseling, the Master Promissory Note, and later, servicing the loan after graduation.", analogy: "It's the single login that follows a federal loan through its entire life.", check: {} },
              { term: 'Step 2: Complete Entrance Counseling', plain: "Before any funds are disbursed, first-time borrowers must complete Loan Entrance Counseling — a short online module covering how interest works, repayment options, and borrower rights.", analogy: "It's like a short orientation before getting the keys — quick, but required.", check: { statement: 'Entrance Counseling is optional for first-time federal borrowers.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'al2', type: 'teach', title: 'Step 3 & 4: Sign & Decide',
            concepts: [
              { term: 'Step 3: Sign the Master Promissory Note', plain: "The MPN is the legal promise to repay the loan under its terms. It's typically only signed once and can cover multiple years of loans from the same school.", analogy: "It's the signature on the loan itself, not a form for questions.", check: {} },
              { term: 'Step 4: Accept, Reduce, or Decline Each Loan', plain: "The school's portal lists each loan offered. Nothing requires accepting the full amount — accept only what covers the actual gap after other aid, and reduce or decline the rest.", analogy: "It's a menu, not an all-or-nothing bundle.", check: { statement: 'A student must always accept the full loan amount offered in their aid package.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'al3', type: 'decision', title: 'The Extra $2,300',
            prompt: "After grants and savings, Hammy only needs $3,200 of the $5,500 in federal loans offered. What's the smartest move in the portal?",
            hintText: "Does extra loan money offered mean it has to be borrowed?",
            choices: [
              { id: 'a', label: 'Accept the full $5,500 for extra spending money', outcome: { text: "The extra $2,300 accrues interest like the rest and has to be repaid with interest after graduation.", delta: {}, compare: [{ label: 'Borrowed', value: 5500 }, { label: 'Actually needed', value: 3200 }] } },
              { id: 'b', label: 'Accept only the $3,200 needed and decline the rest', outcome: { text: "Only the amount actually needed gets borrowed — smaller balance, smaller future payments.", delta: {}, compare: [{ label: 'Borrowed', value: 3200 }, { label: 'Declined', value: 2300 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'al4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [3, 4],
            hintTexts: [
              "Think about what's required before any federal loan funds get disbursed.",
              "Think about whether a full loan offer has to be accepted in full."
            ]
          }
        ]
      }
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
    ],
    quests: [
      {
        id: 'first_return',
        topic: 'Filing Your First Tax Return',
        character: { name: 'Hammy', tagline: 'Filing a tax return for the first time' },
        initialState: { checking: 300, savings: 100, moneyScore: 50 },
        bossAchievementId: 'first_filer',
        chapters: [
          {
            id: 'fr1', type: 'story', title: "April, and a Blank Return",
            beats: [
              { speaker: 'intro', text: "It's April. Hammy has a W-2 from an on-campus job, a 1099 from a freelance gig, and has never filed a tax return in their life." },
              { speaker: 'Hammy', text: '"Where do I even start? Do I even NEED to file anything?"' },
              { speaker: 'narrator', text: "Most students do need to file, and it's far less intimidating once broken into steps. Let's start there." },
              { speaker: 'Hammy', text: '"Okay, walk me through this from the very beginning."' }
            ]
          },
          {
            id: 'fr_t1', type: 'teach', title: 'Do You Need to File',
            concepts: [
              {
                term: 'Filing Requirement',
                plain: "Many students, even with part-time or internship income, need to file a tax return. The first real step is gathering every income document, W-2s and 1099s, and confirming whether a parent claims you as a dependent, since that changes some of the numbers.",
                analogy: "It's like packing for a trip, gather everything first, THEN figure out how it all fits together.",
                check: { statement: "Students with only part-time or internship income never need to file a tax return.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'fr_t2', type: 'teach', title: 'Reading Box 1 on Your W-2',
            concepts: [
              {
                term: 'W-2 Box 1',
                plain: "Box 1 shows your TAXABLE wages, not your full gross pay. Pre-tax deductions, like retirement contributions, are already subtracted out. This is one of the numbers you'll actually enter on your return.",
                analogy: "It's like a receipt showing the post-discount price, not the full sticker price, some things were already taken off before this number was printed.",
                check: { statement: "Box 1 on a W-2 always equals your full gross pay for the year with nothing subtracted.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'fr_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Filing Requirement', definition: 'Whether you need to file a return, based on income and other factors.' },
              { term: 'W-2 Box 1', definition: 'Taxable wages after pre-tax deductions, not full gross pay.' },
              { term: 'Dependency Status', definition: "Whether a parent claims you, affects your standard deduction and available credits." }
            ],
            xpOnComplete: 4
          },
          {
            id: 'fr_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: many campuses host free VITA (Volunteer Income Tax Assistance) clinics during tax season, staffed by IRS-certified volunteers. Most students never need to pay a company to file a simple first return.",
            xpOnComplete: 1
          },
          {
            id: 'fr_t3', type: 'teach', title: 'The Filing Deadline & Free Options',
            concepts: [
              {
                term: 'Filing Deadline',
                plain: "The federal deadline is typically April 15th. Missing it when you owe money can add penalties, filing on time (or requesting an extension) avoids that entirely. Many students qualify for IRS Free File or a campus VITA clinic, both free.",
                analogy: "It's like a due date on a class assignment, submitting late has real consequences even if the content itself would've been fine.",
                check: { statement: "Most students filing a simple first return need to pay a tax prep company.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fr_d1', type: 'decision',
            title: "\"Taxes Were Already Withheld, So...\"",
            prompt: "Hammy's W-2 job already withheld taxes all year. A friend says that means there's nothing left to do. Should Hammy skip filing?",
            hintText: "Think back to Filing Requirement: does having taxes withheld already mean filing is pointless, or could it actually work in Hammy's favor?",
            choices: [
              {
                id: 'a', label: "Skip filing since taxes were already withheld",
                outcome: {
                  text: "If more was withheld than actually owed, that refund money just never gets claimed, left on the table entirely.",
                  delta: { checking: -80, moneyScore: -6 },
                  compare: [{ label: 'Refund left unclaimed', value: 80 }, { label: 'Refund if filed', value: 0 }]
                }
              },
              {
                id: 'b', label: "File anyway to see if a refund is owed",
                outcome: {
                  text: "Filing reveals over-withheld taxes come back as an actual refund, real money Hammy would've otherwise missed entirely.",
                  delta: { checking: 80, moneyScore: 8 },
                  compare: [{ label: 'Refund if filed', value: 80 }, { label: 'Refund left unclaimed', value: 0 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'fr_ms1', type: 'microsim', title: "Planning for Refund Season",
            prompt: "Hammy expects a $200 refund this year. Along with $500 of regular monthly income, help them fit a plan for the refund and monthly savings without going negative.",
            hintText: "The $500 monthly income is separate from the one-time $200 refund. Balance both sliders against the total $700 available this month.",
            income: 700,
            fixedCosts: [
              { label: 'Fixed monthly costs', amount: 400 }
            ],
            sliders: [
              { id: 'savings', label: 'Savings deposit (refund + monthly)', min: 0, max: 250, step: 10, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 20, max: 300, step: 10, default: 20 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try smaller amounts on one of the sliders.", ok: false },
              { maxLeftover: 49, text: "It fits, consider routing more of the refund toward savings instead of spending it all.", ok: true },
              { maxLeftover: Infinity, text: "Solid, the refund is helping build savings instead of just disappearing into spending.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'fr_t4', type: 'teach', title: 'Refunds From Over-Withholding',
            concepts: [
              {
                term: 'Refund From Over-Withholding',
                plain: "Many students have more withheld from each paycheck than they actually owe for the year, based on their total income. Filing is literally how that extra money gets returned, skipping the return means skipping the refund too.",
                analogy: "It's like a deposit you get back after moving out, you only get it if you actually ask for it back.",
                check: { statement: "A tax refund is money that automatically returns to you without filing a return.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fr_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Filing Deadline', definition: 'Typically April 15th for federal returns.' },
              { term: 'Refund From Over-Withholding', definition: 'Extra tax withheld throughout the year, returned only by filing.' },
              { term: 'VITA Clinic', definition: 'A free, IRS-certified tax prep service often available on campus.' }
            ],
            hintText: "One term is a DATE, one is MONEY you get back, and one is a free service available to you.",
            xpOnComplete: 4
          },
          {
            id: 'fr_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "If your employer already withheld taxes from every paycheck, filing a return is pointless.",
            isTrue: false,
            explanation: "It's a myth. Filing is exactly how you find out if too much was withheld, and get that difference back as a refund.",
            xpOnComplete: 2
          },
          {
            id: 'fr_myth1', type: 'mythcards', title: 'First-Return Myths',
            cards: [
              { myth: "You only need to file taxes once your income passes $50,000.", isTrue: false, explanation: "Filing requirements depend on total income and other factors, often at levels well below that." },
              { myth: "Free filing options like IRS Free File and VITA clinics can handle W-2s, 1099s, and education credits.", isTrue: true, explanation: "True, most students never need to pay a company for a simple first return." },
              { myth: "A W-2's Box 1 always shows your exact gross pay for the year.", isTrue: false, explanation: "Box 1 shows TAXABLE wages, after pre-tax deductions are already subtracted." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'fr_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 1],
            hintTexts: [
              "Think about the first concrete step recommended before filing any tax return.",
              "Think about what pre-tax deductions do to the number shown in Box 1 of a W-2."
            ]
          },
          {
            id: 'fr_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'First-Filer Smarts Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's tax-filing habits improve. Tap each decision to see the impact.",
            hintText: "Filing even when taxes were already withheld and using free resources drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "File even though taxes were already withheld all year", scoreDelta: 13, note: "This is exactly how an over-withholding refund gets claimed." },
              { id: 'd2', label: "Use a free VITA clinic instead of a paid tax prep service", scoreDelta: 8, note: "A simple first return rarely needs a paid preparer." },
              { id: 'd3', label: "Skip filing because \"it seems complicated\"", scoreDelta: -12, note: "Skipping filing risks leaving a real refund unclaimed entirely." },
              { id: 'd4', label: "Gather every income document before starting, W-2s and 1099s alike", scoreDelta: 7, note: "Having everything upfront turns filing from a scramble into a straightforward process." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'fr_t5', type: 'teach', title: 'A Yearly Habit, Not a Yearly Crisis',
            concepts: [
              {
                term: 'Building the Filing Habit',
                plain: "Your first tax return feels overwhelming mostly because it's unfamiliar. Once you've gathered documents, checked dependency status, and filed once, the process repeats in a very similar shape every year, and gets faster each time.",
                analogy: "It's like the first time doing your own laundry, confusing at first, routine within a semester.",
                check: { statement: "Filing a tax return is a fundamentally different, unpredictable process every single year.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fr_boss', type: 'bossbattle', title: 'The Two Forms',
            scenario: "It's finally time to file. Hammy has both a W-2 and a 1099 in hand, and a parent mentions they might still be claiming Hammy as a dependent. What does Hammy do?",
            hintText: "Remember Filing Requirement and Dependency Status: does having two income forms and being a dependent change whether Hammy still needs to file?",
            choices: [
              { id: 'a', label: "Confirm dependency status with the parent first, then gather both forms and file, using free VITA help if needed", consequence: { text: "Confirming dependency status first avoids errors, and using free help keeps the whole process at zero cost.", delta: { moneyScore: 12, checking: 80 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "File only the W-2 income and skip the 1099 since it feels optional", consequence: { text: "Unreported 1099 income is a common, costly mistake, the IRS still expects it reported even without automatic withholding.", delta: { moneyScore: -10 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Assume the dependency question doesn't matter and file as fully independent", consequence: { text: "Filing incorrectly on dependency status can cause issues on both Hammy's and the parent's returns.", delta: { moneyScore: -6 }, xpMultiplier: 0.75 } },
              { id: 'd', label: "Ask the parent directly, then gather all documents and use IRS Free File", consequence: { text: "Getting the facts straight first, then using a free tool, is exactly the right order of operations.", delta: { moneyScore: 10, checking: 60 }, xpMultiplier: 1.2 } }
            ]
          }
        ]
      },
      {
        id: 'w2_vs_1099',
        topic: 'W-2s vs. 1099s',
        character: { name: 'Hammy', tagline: 'Sorting out two different income forms' },
        initialState: { checking: 300, savings: 100, moneyScore: 50 },
        bossAchievementId: 'forms_sorted',
        chapters: [
          {
            id: 'wv1', type: 'story', title: 'Two Forms, Two Different Deals',
            beats: [
              { speaker: 'intro', text: "Hammy's friend did freelance design work over the summer and got a 1099-NEC. Hammy had a paid internship and got a normal W-2. They assume it's basically the same thing." },
              { speaker: 'Hammy', text: '"We both just got paid for work, right? Why would the form even matter?"' },
              { speaker: 'narrator', text: "It matters more than either of them realizes, especially when it comes to what's already been handled versus what hasn't." },
              { speaker: 'Hammy', text: '"Okay, what\'s actually different here?"' }
            ]
          },
          {
            id: 'wv_t1', type: 'teach', title: 'The W-2',
            concepts: [
              {
                term: 'W-2',
                plain: "A W-2 comes from a traditional employer. Taxes, federal income tax, Social Security, Medicare, are already withheld from every paycheck automatically. By tax time, most of the work is already done for you.",
                analogy: "It's like a subscription that auto-bills correctly every month, you don't have to remember to pay it yourself.",
                check: { statement: "A W-2 job automatically withholds taxes from each paycheck.", isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'wv_t2', type: 'teach', title: 'The 1099-NEC',
            concepts: [
              {
                term: '1099-NEC',
                plain: "A 1099-NEC reports freelance or gig income, with NO taxes withheld upfront. That responsibility shifts entirely to you, to track the income, set money aside, and report it yourself.",
                analogy: "It's like getting paid in cash with no automatic bill-pay set up, the full responsibility for handling it correctly falls on you.",
                check: { statement: "1099 income has taxes automatically withheld, just like W-2 income.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'wv_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'W-2', definition: 'Traditional employment income with taxes automatically withheld.' },
              { term: '1099-NEC', definition: 'Freelance or gig income with no taxes withheld upfront.' },
              { term: 'Self-Employment Tax', definition: 'An additional ~15.3% tax on 1099 net earnings over $400, covering Social Security and Medicare.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'wv_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: setting aside 20-30% of every 1099 payment the moment it's received means tax season never comes as a surprise, the money's already earmarked before it even feels like \"real\" spending money.",
            xpOnComplete: 1
          },
          {
            id: 'wv_t3', type: 'teach', title: 'Self-Employment Tax',
            concepts: [
              {
                term: 'Self-Employment Tax',
                plain: "Beyond regular income tax, 1099 earners may owe self-employment tax, roughly 15.3%, covering the same Social Security and Medicare that a W-2 employer would normally split with you. This kicks in once net 1099 earnings pass $400.",
                analogy: "As a W-2 employee, your employer covers half of this cost automatically. As a 1099 earner, you're covering both halves yourself.",
                check: { statement: "1099 earners may owe self-employment tax on top of regular income tax.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'wv_d1', type: 'decision',
            title: "The $900 Freelance Check",
            prompt: "Hammy earned $900 through a 1099-NEC freelance gig, with no taxes withheld. What should they do with it?",
            hintText: "Think back to Self-Employment Tax: is the full $900 actually Hammy's to spend, or does part of it already have a job?",
            choices: [
              {
                id: 'a', label: 'Spend the full $900, taxes can be figured out later',
                outcome: {
                  text: "Come tax time, a real bill is due with nothing set aside for it, an avoidable scramble.",
                  delta: { checking: 900, moneyScore: -8 },
                  compare: [{ label: 'Tax bill with nothing set aside', value: 250 }, { label: 'Tax bill if 25% set aside upfront', value: 0 }]
                }
              },
              {
                id: 'b', label: 'Set aside 25% for taxes immediately, keep the rest',
                outcome: {
                  text: "The tax portion is already earmarked, so April brings no surprise, just a bill that's already covered.",
                  delta: { checking: 675, savings: 225, moneyScore: 8 },
                  compare: [{ label: 'Tax bill if 25% set aside upfront', value: 0 }, { label: 'Tax bill with nothing set aside', value: 250 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'wv_ms1', type: 'microsim', title: "Splitting Freelance Income the Right Way",
            prompt: "Hammy earns $500 this month from a mix of W-2 and 1099 work. Help them fit a tax set-aside and savings deposit in without going negative.",
            hintText: "The 1099 portion needs a tax set-aside before anything else. Balance both sliders against the $500 total.",
            income: 500,
            fixedCosts: [
              { label: 'Fixed monthly costs', amount: 250 }
            ],
            sliders: [
              { id: 'taxSetAside', label: 'Tax set-aside (1099 portion)', min: 0, max: 125, step: 5, default: 0 },
              { id: 'savings', label: 'Savings deposit', min: 0, max: 125, step: 5, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try smaller amounts on one of the sliders.", ok: false },
              { maxLeftover: 24, text: "It fits, double check the tax set-aside is enough to cover the 1099 portion.", ok: true },
              { maxLeftover: Infinity, text: "Solid, taxes are covered and savings is still growing.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'wv_t4', type: 'teach', title: 'Filing Both Forms Together',
            concepts: [
              {
                term: 'Filing With Multiple Income Types',
                plain: "Having both a W-2 and a 1099 in the same year is common and completely fine, both get reported on the same tax return. The key difference is that the 1099 portion needs its own tax set-aside throughout the year, since nothing was withheld on it automatically.",
                analogy: "It's like combining two different paychecks into one budget, both count toward the total, but they arrived with very different amounts of prep work already done.",
                check: { statement: "Having both W-2 and 1099 income in the same year means they must be filed as two completely separate tax returns.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'wv_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Filing With Multiple Income Types', definition: 'W-2 and 1099 income in the same year are combined on one tax return.' },
              { term: 'Estimated Quarterly Payments', definition: '1099 earners expecting to owe $1,000+ may need to pay tax throughout the year, not just in April.' },
              { term: '1099-NEC', definition: 'Freelance or gig income with no taxes withheld upfront.' }
            ],
            hintText: "One term is about COMBINING income types on one return, one is about PAYING throughout the year, and one is the FORM itself.",
            xpOnComplete: 4
          },
          {
            id: 'wv_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "1099 income under $1,000 doesn't need to be reported on your tax return.",
            isTrue: false,
            explanation: "It's a myth. There's no blanket exemption like that, 1099 income generally needs to be reported regardless of the amount.",
            xpOnComplete: 2
          },
          {
            id: 'wv_myth1', type: 'mythcards', title: 'W-2 vs. 1099 Myths',
            cards: [
              { myth: "1099 income is taxed exactly like W-2 income, with taxes already withheld.", isTrue: false, explanation: "No taxes are withheld on 1099 income upfront, that responsibility shifts entirely to the earner." },
              { myth: "1099 earners may owe self-employment tax in addition to regular income tax.", isTrue: true, explanation: "True, roughly 15.3% on net earnings over $400, covering both halves of Social Security and Medicare." },
              { myth: "Having both a W-2 and a 1099 in the same year requires filing two separate tax returns.", isTrue: false, explanation: "Both income types are reported together on one combined tax return." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'wv_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [2, 3],
            hintTexts: [
              "Think about what's different about 1099 income compared to W-2 income when it comes to taxes withheld.",
              "Think about whether having taxes already withheld from a W-2 job means filing is optional."
            ]
          },
          {
            id: 'wv_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Freelance Tax Smarts Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's habits improve around managing income from multiple sources. Tap each decision to see the impact.",
            hintText: "Setting aside taxes immediately on 1099 income is what drives most of the gains here.",
            decisions: [
              { id: 'd1', label: "Set aside 25% of every 1099 payment immediately", scoreDelta: 14, note: "This turns a scary April bill into money that's already covered." },
              { id: 'd2', label: "Track 1099 income separately from W-2 income all year", scoreDelta: 8, note: "Clear records make filing far less stressful when the forms arrive." },
              { id: 'd3', label: "Spend 1099 income as if it were fully take-home pay", scoreDelta: -12, note: "Nothing was withheld, so this money isn't fully available to spend." },
              { id: 'd4', label: "Ignore self-employment tax entirely when budgeting freelance income", scoreDelta: -9, note: "This tax applies on top of regular income tax once net earnings pass $400." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'wv_t5', type: 'teach', title: 'Two Forms, One Responsible Habit',
            concepts: [
              {
                term: 'The Core Habit',
                plain: "Whether income comes with taxes withheld (W-2) or not (1099), the underlying habit is the same: know what's already been handled, and proactively handle what hasn't. That one habit prevents nearly every tax-season surprise.",
                analogy: "It's like knowing which chores are on autopilot in a shared house and which ones nobody's actually doing, the risk is always in the second category.",
                check: { statement: "The tax responsibility is identical for W-2 and 1099 income, since both eventually get reported.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'wv_boss', type: 'bossbattle', title: 'The Mixed-Income Year',
            scenario: "Hammy's first full year out of school includes a W-2 internship, a 1099 freelance side gig earning $6,000, and no idea whether estimated quarterly payments apply. What does Hammy do?",
            hintText: "Remember Estimated Quarterly Payments: this applies once you expect to owe $1,000+ in tax with no withholding on that income.",
            choices: [
              { id: 'a', label: "Calculate expected 1099 tax owed and set up quarterly estimated payments", consequence: { text: "Spreading the tax cost across the year avoids both a shocking April bill and an underpayment penalty.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Ignore quarterly payments and plan to pay everything in April", consequence: { text: "This risks an underpayment penalty on top of a large lump-sum bill, exactly what quarterly payments are meant to avoid.", delta: { moneyScore: -10, checking: -300 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Set aside 25% of 1099 income but skip the formal quarterly payment process", consequence: { text: "The money is there when April arrives, but skipping the formal quarterly process could still mean a penalty despite having the cash on hand.", delta: { moneyScore: 2 }, xpMultiplier: 0.9 } },
              { id: 'd', label: "Ask a free VITA clinic to help estimate and set up quarterly payments", consequence: { text: "Getting help estimating the right amount removes the guesswork entirely, at zero cost.", delta: { moneyScore: 10 }, xpMultiplier: 1.2 } }
            ]
          }
        ]
      },
      {
        id: 'education_credits',
        topic: 'Education Tax Credits & Your 1098-T',
        character: { name: 'Hammy', tagline: 'Trying to make sense of a 1098-T' },
        initialState: {},
        chapters: [
          { id: 'education_credits_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Education Tax Credits & Your 1098-T." }
            ]
          }
        ]
      },
      {
        id: 'dependency_status',
        topic: 'Dependency Status & Common Mistakes',
        character: { name: 'Hammy', tagline: 'Figuring out dependency status at tax time' },
        initialState: {},
        chapters: [
          { id: 'dependency_status_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Dependency Status & Common Mistakes." }
            ]
          }
        ]
      },
      {
        id: 'estimated_taxes',
        topic: 'Estimated Taxes for Freelance/Gig Income',
        character: { name: 'Hammy', tagline: 'Owing taxes nobody withheld' },
        initialState: {},
        chapters: [
          { id: 'estimated_taxes_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Estimated Taxes for Freelance/Gig Income." }
            ]
          }
        ]
      },
      {
        id: 'withholding_free_file',
        topic: 'Getting Withholding Right & Filing for Free',
        character: { name: 'Hammy', tagline: 'Fixing a withholding mistake' },
        initialState: {},
        chapters: [
          { id: 'withholding_free_file_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Getting Withholding Right & Filing for Free." }
            ]
          }
        ]
      },
      {
        id: 'tax_brackets',
        topic: 'How Tax Brackets Actually Work (Marginal vs. Effective Rate)',
        character: { name: 'Hammy', tagline: 'Trying to understand what tax bracket actually means' },
        initialState: {},
        chapters: [
          { id: 'tax_brackets_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on How Tax Brackets Actually Work (Marginal vs. Effective Rate)." }
            ]
          }
        ]
      },
      {
        id: 'deadlines_refunds',
        topic: 'Tax Deadlines, Extensions & Refunds: What to Expect',
        character: { name: 'Hammy', tagline: 'Waiting on a tax refund' },
        initialState: {},
        chapters: [
          { id: 'deadlines_refunds_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Tax Deadlines, Extensions & Refunds: What to Expect." }
            ]
          }
        ]
      },
      {
        id: 'file_free',
        parentQuestId: 'first_return',
        topic: 'Filing Your Taxes for Free: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually filing a first tax return without paying for it' },
        initialState: {},
        chapters: [
          {
            id: 'ff0', type: 'story', title: 'April Is Coming',
            beats: [
              { speaker: 'intro', text: "Hammy has a W-2 from a campus job and has never filed a tax return. Knowing what a W-2 means is one thing — actually filing the return is another." }
            ]
          },
          {
            id: 'ff1', type: 'teach', title: 'Step 1 & 2: Gather & Choose a Tool',
            concepts: [
              { term: 'Step 1: Gather the Documents', plain: "Collect every income form received — W-2s from jobs, 1099s from gig work or freelancing — plus a 1098-T if enrolled, and last year's return if one exists.", analogy: "It's like packing for a trip — everything is much easier with the full list gathered first.", check: {} },
              { term: 'Step 2: Pick a Free Filing Tool', plain: "IRS Free File is free for most students' income levels, and many schools host free VITA (Volunteer Income Tax Assistance) clinics. Paying a tax prep company usually isn't necessary for a simple return.", analogy: "Same result as a paid preparer, for most simple student returns, at no cost.", check: { statement: 'Most students with simple returns are required to pay a tax preparation company to file.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ff2', type: 'teach', title: 'Step 3 & 4: Enter & Submit',
            concepts: [
              { term: 'Step 3: Enter Info & Review', plain: "Most free tools walk through entering each form step by step, then flag likely credits — like education credits from a 1098-T — automatically. Review the summary before submitting; a small typo in a number can delay everything.", analogy: "It's a guided interview, not a blank form.", check: {} },
              { term: 'Step 4: Submit & Track the Refund', plain: "E-filing is faster than mailing a paper return, and most refunds arrive within 1-3 weeks. The IRS's own tracking tool shows exactly where a return stands.", analogy: "Like tracking a package instead of wondering when it'll show up.", check: { statement: 'E-filing a tax return is typically faster than mailing a paper return.', isTrue: true } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ff3', type: 'decision', title: 'The Paid App Ad',
            prompt: "Hammy sees an ad for a tax app charging $40 to file, right as free IRS Free File and a campus VITA clinic are also both available.",
            hintText: "Does a simple student return usually need a paid service?",
            choices: [
              { id: 'a', label: 'Pay the $40 since it looked professional in the ad', outcome: { text: "$40 spent for a result the free options would have produced identically for a simple return.", delta: {}, compare: [{ label: 'Cost', value: 40 }, { label: 'Free alternative', value: 0 }] } },
              { id: 'b', label: 'Use IRS Free File or the campus VITA clinic instead', outcome: { text: "Same accurate return, filed for $0 instead of $40.", delta: {}, compare: [{ label: 'Cost', value: 0 }, { label: 'Paid alternative', value: 40 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ff4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 11],
            hintTexts: [
              "Think about what documents and status need to be confirmed before filing anything.",
              "Think about what free options exist for a simple student return."
            ]
          }
        ]
      }
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
      { title: 'Automating Habits & Coping With Triggers', hook: 'You automated your savings transfer months ago and it\'s worked well — but during a stressful exam week you still found yourself online shopping at 1am for things you don\'t need. What\'s the next habit to build?', qIndices: [5, 11] },
      {
        title: 'Evaluating Tradeoffs Under Pressure',
        type: 'decision-chain',
        hook: "It's 9pm, your friends just texted about a $60 concert this weekend, and you're tight on cash. Everyone's waiting on your answer. Does the pressure to decide fast change the decision itself?",
        activity: {
          intro: "Being tight on time or money changes how you decide — that's the scarcity mindset: when resources feel scarce, your brain narrows in on the immediate problem and gets worse at weighing tradeoffs. Before any purchase over $50, run it through three questions: What's the actual cost? What's the consequence if I say yes? Can I undo this if I'm wrong — is it reversible? And when the pressure is social, not financial: an honest \"not this week, but let's do something free after\" almost always lands better with real friends than a vague excuse or an overspend you'll regret.",
          startLabel: 'See What Happens →',
          decisions: [
            {
              prompt: "Your friends are going to a $60 concert this weekend, but you're tight on money this week — rent is due Monday. The group chat is waiting on your answer. What do you do?",
              choices: [
                { id: 'a', label: "Say yes and put it on a credit card — you don't want to miss out", cost: 60, gaveUp: "you're now $60 closer to not covering rent, and it's on a card that charges interest if you can't pay it off in full", good: false },
                { id: 'b', label: "Make a vague excuse and skip it without explaining why", cost: 0, gaveUp: "Your money stays fine, but your friends are left guessing — and unexplained no's, repeated enough times, quietly create distance.", good: false },
                { id: 'c', label: "Be honest: \"I'm tight this week, but I'm in for something free after\"", cost: 0, gaveUp: "Nothing — rent stays covered, and most real friends respect honesty a lot more than a vague no or a $60 flex they never see repaid.", good: true }
              ]
            }
          ],
          finalChoiceLabel: 'See the Takeaway →',
          summaryIntro: "Here's what that choice set in motion.",
          takeaway: "Option C cost nothing and cascaded nothing forward — no debt, no awkwardness, no guessing games. The scarcity mindset makes \"yes\" feel like the only way to protect a friendship. It usually isn't — the cost/consequence/reversibility check and a little honesty almost always find a cheaper path.",
          xpOnComplete: 8
        }
      },
      {
        title: 'Boss Challenge: Resist the Pressure',
        type: 'boss-challenge',
        hook: 'A full day of classic spending triggers is coming at you back to back — a countdown timer, a group chat, a bad mood, a discount code. Every one is designed to make "yes" feel automatic.',
        activity: {
          intro: "Today's a gauntlet of the exact psychological triggers marketers and social pressure use to short-circuit good decisions: manufactured urgency, FOMO, mood spending, and fake exclusivity. Each time you resist one, that's real money that stays yours — this run tracks how much.",
          startLabel: 'Start the Day →',
          dashboardLabel: 'Resisted So Far',
          startingValue: 0,
          stages: [
            {
              tag: 'Morning',
              prompt: 'A checkout page shows "⏰ 2 left, offer ends in 9:58" for a $70 jacket you weren\'t planning to buy.',
              choices: [
                { id: 'a', label: 'Buy now, before the timer runs out', delta: 0, isOptimal: false, result: 'That timer resets for the next visitor too — the urgency was never really about the jacket running out.' },
                { id: 'b', label: 'Close the tab and give it 24 hours', delta: 70, isOptimal: true, result: 'Real scarcity is rare online. If it\'s still there tomorrow (it usually is), it was never actually about to disappear.' }
              ]
            },
            {
              tag: 'Afternoon',
              prompt: 'Your group chat is planning a spontaneous $85 day trip this weekend that you can\'t really afford right now.',
              choices: [
                { id: 'a', label: 'Say yes anyway — you don\'t want to be "the broke one"', delta: 0, isOptimal: false, result: 'Totally normal to want in, but saying yes here means catching up on a bill later this month.' },
                { id: 'b', label: 'Be honest with the group about your budget this month', delta: 85, isOptimal: true, result: 'The friends worth keeping don\'t need a fake excuse, and next time you can say yes without the guilt.' }
              ]
            },
            {
              tag: 'Evening',
              prompt: 'A rough exam grade lands right as an ad for a "$40 treat yourself" skincare set pops up.',
              choices: [
                { id: 'a', label: 'Buy it, you deserve it after today', delta: 0, isOptimal: false, result: 'The relief from an impulse purchase fades faster than the bill does.' },
                { id: 'b', label: 'Text a friend instead, revisit the idea tomorrow if you still want it', delta: 40, isOptimal: true, result: 'Still an option tomorrow, just without deciding while stressed.' }
              ]
            },
            {
              tag: 'Late Night',
              prompt: 'An influencer posts a "24-hours-only" 30%-off code for a $120 haircare bundle you don\'t currently need.',
              choices: [
                { id: 'a', label: 'Use the code, it\'s basically free money saved', delta: 0, isOptimal: false, result: 'A 30% discount on something you didn\'t need still costs the other 70% of $120 you didn\'t have to spend.' },
                { id: 'b', label: 'Skip it — a sale isn\'t a reason to buy something you weren\'t already buying', delta: 120, isOptimal: true, result: 'That\'s the actual rule: a discount only saves money on something you were already going to buy.' }
              ]
            }
          ],
          passThreshold: 0,
          endNoteAtOrAbove: 'Every dollar here is money that stayed in your account instead of funding someone else\'s urgency tactic.',
          endNoteBelow: 'Even $0 resisted today is data, not a verdict — notice which trigger got you, that\'s the one to watch for next time.',
          takeaway: 'None of today\'s triggers were really about the product. A countdown timer, a group chat, a bad mood, and a discount code are all designed to make you decide fast instead of well — the fix is always the same: slow down, and the "deal" almost always survives a day of thinking about it.',
          xpOnComplete: 12,
          bonusXpForOptimalPath: 8
        }
      }
    ],
    quests: [
      {
        id: 'knowing_not_enough',
        topic: 'Why Knowing Isn\'t Enough',
        character: { name: 'Hammy', tagline: 'Knowing the right answer and still overspending' },
        initialState: { checking: 150, savings: 0, moneyScore: 50 },
        bossAchievementId: 'gap_closer',
        chapters: [
          {
            id: 'kn1', type: 'story', title: 'The DoorDash Tag',
            beats: [
              { speaker: 'intro', text: 'Hammy knows they should be saving. Just last week they said out loud, "I need to stop spending on DoorDash." Twenty minutes later, a friend tags them in a group order.' },
              { speaker: 'Hammy', text: '"I LITERALLY just said that. Why did I say yes anyway?"' },
              { speaker: 'narrator', text: "Knowing the right move and actually doing it are two completely different skills. Let's figure out why." },
              { speaker: 'Hammy', text: '"Okay, because clearly just \'knowing better\' isn\'t working."' }
            ]
          },
          {
            id: 'kn_t1', type: 'teach', title: 'The Knowledge-Action Gap',
            concepts: [
              {
                term: 'Knowledge-Action Gap',
                plain: "This is the space between knowing the right financial move and actually doing it consistently. Financial decisions are driven as much by emotion, habit, and environment as by logic, so knowledge alone rarely changes behavior on its own.",
                analogy: "It's like knowing exactly how a treadmill works and still not using it, understanding isn't the same as doing.",
                check: { statement: "Knowing the right financial move is usually enough to guarantee you'll actually do it.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'kn_t2', type: 'teach', title: 'Willpower vs. Environment Design',
            concepts: [
              {
                term: 'Environment Design',
                plain: "Willpower fades, especially under stress or around friends. The more reliable fix is designing your environment, automatic transfers, separate accounts, fewer triggers, so the good choice takes less effort than the bad one.",
                analogy: "It's like removing snacks from the house instead of just promising yourself you won't eat them, the environment does the work willpower can't.",
                check: { statement: "Relying purely on willpower is generally the most reliable way to change financial behavior long-term.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'kn_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Knowledge-Action Gap', definition: 'The space between knowing the right move and actually doing it.' },
              { term: 'Environment Design', definition: 'Structuring your surroundings so the good choice takes less effort.' },
              { term: 'Trigger', definition: 'A specific emotion or situation, like boredom or a group chat, that sets off a spending urge.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'kn_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: a 24-hour waiting rule for non-essential purchases over a set amount, say $30, works because it doesn't require willpower in the moment, it just delays the decision until the emotional urge has already faded.",
            xpOnComplete: 1
          },
          {
            id: 'kn_t3', type: 'teach', title: 'Triggers & Friction',
            concepts: [
              {
                term: 'Adding Friction',
                plain: "Friction means making the impulsive choice slightly harder, deleting a saved card, adding a 24-hour rule, muting a group chat during a tight week. It doesn't remove the option, it just adds enough of a pause for the rational brain to weigh in.",
                analogy: "It's like putting the cookie jar on a high shelf instead of the counter, still reachable, just enough extra effort to make you pause and decide on purpose.",
                check: { statement: "Adding friction to a spending trigger means making the impulsive choice completely impossible.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'kn_d1', type: 'decision',
            title: "The Group Order Tag",
            prompt: "Hammy gets tagged in a $22 DoorDash group order twenty minutes after saying they'd cut back. What should they do?",
            hintText: "Think back to Adding Friction: is there a middle ground between an automatic yes and an awkward no?",
            choices: [
              {
                id: 'a', label: 'Say yes automatically, it\'s just $22',
                outcome: {
                  text: "One $22 order rarely breaks a budget alone, but saying yes automatically every time is exactly the pattern that adds up.",
                  delta: { checking: -22, moneyScore: -5 },
                  compare: [{ label: 'This week\'s food spending if joined', value: 22 }, { label: 'This week\'s food spending if skipped', value: 0 }]
                }
              },
              {
                id: 'b', label: 'Pause 5 minutes, check the budget, then decide',
                outcome: {
                  text: "A short pause turns an automatic yes into an actual decision, sometimes it's still yes, but now it's on purpose.",
                  delta: { moneyScore: 7 },
                  compare: [{ label: 'This week\'s food spending if skipped', value: 0 }, { label: 'This week\'s food spending if joined', value: 22 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'kn_ms1', type: 'microsim', title: "Building In Friction",
            prompt: "Hammy's monthly income is $600. Fixed costs already use $420. Help them fit a food/social spending cap and savings deposit in without going negative.",
            hintText: "Add up the fixed costs ($220 + $120 + $50 + $30 = $420). That leaves $180 of the $600 to split between the two sliders before going negative.",
            income: 600,
            fixedCosts: [
              { label: 'Rent share', amount: 220 },
              { label: 'Meal plan top-up', amount: 120 },
              { label: 'Phone & subscriptions', amount: 50 },
              { label: 'Transit', amount: 30 }
            ],
            sliders: [
              { id: 'foodSocial', label: 'Food & social spending cap', min: 20, max: 150, step: 10, default: 150 },
              { id: 'savings', label: 'Savings deposit', min: 0, max: 150, step: 10, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative. Try a smaller spending cap or savings amount.", ok: false },
              { maxLeftover: 19, text: "It fits, but the spending cap leaves little room for savings this month.", ok: true },
              { maxLeftover: Infinity, text: "Solid, the cap creates real friction and savings is still growing.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'kn_t4', type: 'teach', title: 'Automating the Right Choice',
            concepts: [
              {
                term: 'Automating Good Behavior',
                plain: "The most reliable habits run automatically, an auto-transfer to savings on payday, a spending cap that texts an alert, so the right choice happens by default instead of requiring a fresh decision every single time.",
                analogy: "It's like a sprinkler system on a timer instead of remembering to water the plants every day, it happens whether or not you remember.",
                check: { statement: "Habits that require remembering and willpower every time tend to be the most reliable long-term.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'kn_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Adding Friction', definition: 'Making an impulsive choice slightly harder, without making it impossible.' },
              { term: 'Automating Good Behavior', definition: 'Setting up the right choice to happen by default, without a fresh decision each time.' },
              { term: 'Knowledge-Action Gap', definition: 'The space between knowing the right move and actually doing it.' }
            ],
            hintText: "One term makes the BAD choice harder, one makes the GOOD choice automatic, and one names the GAP between the two.",
            xpOnComplete: 4
          },
          {
            id: 'kn_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "If you know the right financial move, willpower alone is usually enough to follow through consistently.",
            isTrue: false,
            explanation: "It's a myth. Willpower fades, especially under stress or social pressure, systems and environment design are far more reliable.",
            xpOnComplete: 2
          },
          {
            id: 'kn_myth1', type: 'mythcards', title: 'Knowledge-Action Myths',
            cards: [
              { myth: "Budgets simply don't work for most people.", isTrue: false, explanation: "The issue usually isn't the budget itself, it's relying on willpower instead of systems to follow it." },
              { myth: "A 24-hour waiting rule can meaningfully reduce impulse purchases.", isTrue: true, explanation: "True, it gives the emotional urge time to fade before a decision is finalized." },
              { myth: "Automatic transfers are less reliable than manually deciding to save each time.", isTrue: false, explanation: "Automation tends to be MORE reliable, since it doesn't depend on remembering or willpower in the moment." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'kn_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 1],
            hintTexts: [
              "Think about what usually causes a budget to fail even when someone genuinely knows the right moves.",
              "Think about what actually helps reduce impulse spending, willpower alone, or something else."
            ]
          },
          {
            id: 'kn_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Closing the Gap Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy's habits improve as they design their environment instead of relying on willpower. Tap each decision to see the impact.",
            hintText: "Automating good choices and adding friction to impulsive ones are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Set up an automatic transfer to savings on payday", scoreDelta: 13, note: "This removes the need for a fresh decision every single payday." },
              { id: 'd2', label: "Add a 24-hour rule for non-essential purchases over $30", scoreDelta: 9, note: "This gives the emotional urge time to fade before the money's spent." },
              { id: 'd3', label: "Rely purely on willpower with no systems in place", scoreDelta: -11, note: "Willpower fades fast, especially under stress or social pressure." },
              { id: 'd4', label: "Mute a group chat during a genuinely tight week", scoreDelta: 6, note: "Removing a known trigger is a small but real form of friction." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'kn_explain1', type: 'explainback',
            title: 'In Your Own Words',
            prompt: "In your own words: what's ONE personal trigger that tends to cause you to overspend, and what's one piece of friction you could add to it?",
            keywords: ['trigger', 'friction', 'habit', 'automatic', 'environment'],
            fullDefinition: "Whatever the specific trigger, boredom, a group chat, a stressful week, the fix is the same shape: you don't need more willpower, you need a small piece of friction (a waiting rule, a muted chat, a deleted saved card) that turns an automatic yes into an actual decision.",
            xpOnComplete: 3
          },
          {
            id: 'kn_boss', type: 'bossbattle', title: 'The Second Tag',
            scenario: "A week after building a spending cap, Hammy gets tagged in ANOTHER group order, right after a stressful exam. The old automatic-yes urge is strong. What does Hammy do?",
            hintText: "Remember Adding Friction and Automating Good Behavior: what system was already set up for exactly this moment?",
            choices: [
              { id: 'a', label: "Check the spending cap first, then decide based on what's actually left", consequence: { text: "The system does the work, Hammy decides with real numbers instead of an automatic yes.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Say yes automatically since it's been a stressful week", consequence: { text: "Stress is exactly the trigger this whole quest was about, and the automatic yes wins again without a system in place.", delta: { moneyScore: -9, checking: -20 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Skip the order and go for a walk instead, a non-spending stress response", consequence: { text: "Addressing the actual trigger, stress, instead of the group order itself, breaks the automatic link between the two.", delta: { moneyScore: 10 }, xpMultiplier: 1.2 } },
              { id: 'd', label: "Feel guilty, say yes anyway, and beat themselves up about it after", consequence: { text: "The guilt doesn't undo the spending, and it adds an emotional cost on top of the financial one.", delta: { moneyScore: -6, checking: -20 }, xpMultiplier: 0.7 } }
            ]
          }
        ]
      },
      {
        id: 'lifestyle_inflation',
        topic: 'Lifestyle Inflation: Why Spending Grows With Income',
        character: { name: 'Hammy', tagline: 'Noticing spending creep up with a raise' },
        initialState: { checking: 400, savings: 100, moneyScore: 50 },
        bossAchievementId: 'inflation_aware',
        chapters: [
          {
            id: 'li1', type: 'story', title: 'The Friend Group Upgrade',
            beats: [
              { speaker: 'intro', text: "Hammy's friend group keeps upgrading, concert tickets, new clothes, a spring break trip everyone's going on. Hammy's own spending has crept up to match, even though their income hasn't changed at all." },
              { speaker: 'Hammy', text: '"Wait, my paycheck is the same as six months ago. Why does it feel so much tighter?"' },
              { speaker: 'narrator', text: "This creep has a name, and understanding it is the first step to catching it before it goes further." },
              { speaker: 'Hammy', text: '"Okay, name it for me, because right now it just feels like bad luck."' }
            ]
          },
          {
            id: 'li_t1', type: 'teach', title: 'Lifestyle Inflation',
            concepts: [
              {
                term: 'Lifestyle Inflation',
                plain: "This is when spending rises to match perceived social norms or income increases, often without a matching rise in savings. It happens gradually, each individual \"yes\" feels small, but they add up fast over months.",
                analogy: "It's like a balloon that slowly fills to match whatever container it's in, spending naturally expands to meet whatever room feels available.",
                check: { statement: "Lifestyle inflation is when spending increases to match income or social norms, without a matching rise in savings.", isTrue: true }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'li_t2', type: 'teach', title: 'Why It Happens Gradually',
            concepts: [
              {
                term: 'The Gradual Creep',
                plain: "Lifestyle inflation rarely shows up as one big decision, it's a series of small, individually reasonable \"yeses\" that compound. That gradual pace is exactly what makes it hard to notice until a budget that used to work suddenly doesn't.",
                analogy: "It's like a slowly rising water level, no single wave is dramatic, but the overall level has changed a lot by the time you notice.",
                check: { statement: "Lifestyle inflation usually happens as one single large spending decision, not a series of small ones.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'li_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Lifestyle Inflation', definition: 'Spending rising to match income or social norms, without matching savings growth.' },
              { term: 'The Gradual Creep', definition: 'A series of small, individually reasonable spending increases that compound over time.' },
              { term: 'Spending Cap', definition: 'A pre-set limit for a category, like social activities, decided before the situation arises.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'li_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: naming the pattern out loud, \"this is lifestyle inflation\", tends to make it easier to catch. It turns a vague feeling of tightness into a specific, addressable habit.",
            xpOnComplete: 1
          },
          {
            id: 'li_t3', type: 'teach', title: 'Deciding Before the Raise Hits',
            concepts: [
              {
                term: 'Deciding Upfront',
                plain: "The most effective defense against lifestyle inflation is deciding, in advance, how much of any new income (a raise, a bonus) goes to savings or debt versus lifestyle spending, before it ever hits your account. Deciding after it arrives tends to default to \"spend it.\"",
                analogy: "It's like assigning seats before a party starts, much easier than sorting it out once everyone's already settled somewhere.",
                check: { statement: "Deciding how to split a raise before it arrives is more effective than deciding after it's already in your account.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'li_d1', type: 'decision',
            title: "The Raise Lands",
            prompt: "Hammy gets a raise from $16/hour to $17.50/hour. What's the smartest way to handle the extra income?",
            hintText: "Think back to Deciding Upfront: does waiting until the extra money is already in checking make it easier or harder to route some toward savings?",
            choices: [
              {
                id: 'a', label: 'Let the extra money flow into everyday spending without a plan',
                outcome: {
                  text: "Within a month, spending quietly rises to absorb the entire raise, and savings never sees a dime of it.",
                  delta: { moneyScore: -6 },
                  compare: [{ label: 'Extra saved per month if no plan', value: 0 }, { label: 'Extra saved per month if split upfront', value: 60 }]
                }
              },
              {
                id: 'b', label: 'Decide upfront to route half the raise to savings, half to lifestyle',
                outcome: {
                  text: "Hammy still gets to enjoy part of the raise, while savings grows with every single paycheck from now on.",
                  delta: { savings: 60, moneyScore: 8 },
                  compare: [{ label: 'Extra saved per month if split upfront', value: 60 }, { label: 'Extra saved per month if no plan', value: 0 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'li_ms1', type: 'microsim', title: "Splitting a Raise on Purpose",
            prompt: "Hammy's new monthly income after the raise is $720. Fixed costs still only use $480. Help them decide how the extra room gets used.",
            hintText: "Fixed costs are locked at $480. That leaves $240 of new room to split between the two sliders before going negative.",
            income: 720,
            fixedCosts: [
              { label: 'Fixed monthly costs', amount: 480 }
            ],
            sliders: [
              { id: 'savings', label: 'Additional savings from the raise', min: 0, max: 240, step: 20, default: 0 },
              { id: 'lifestyle', label: 'Additional lifestyle spending', min: 0, max: 240, step: 20, default: 240 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That goes negative, double check the two sliders add up to the $240 available.", ok: false },
              { maxLeftover: 239, text: "Notice how much of the raise is actually reaching savings versus lifestyle spending.", ok: true },
              { maxLeftover: Infinity, text: "The raise is intentionally split, exactly the habit that prevents lifestyle inflation.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'li_t4', type: 'teach', title: "Social Comparison's Role",
            concepts: [
              {
                term: 'Social Comparison',
                plain: "Lifestyle inflation is accelerated by comparison, spending often tracks the people around you rather than your actual budget or goals. Recognizing \"I want this because everyone around me has it\" versus \"I actually want this for myself\" helps interrupt the pattern.",
                analogy: "It's like adjusting your own thermostat based on a neighbor's setting instead of what's actually comfortable for you.",
                check: { statement: "Spending habits are generally unaffected by the spending patterns of the people around you.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'li_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Deciding Upfront', definition: 'Committing to a split for new income before it ever arrives.' },
              { term: 'Social Comparison', definition: "Spending that tracks the people around you rather than your own budget or goals." },
              { term: 'Lifestyle Inflation', definition: 'Spending rising to match income or social norms, without matching savings growth.' }
            ],
            hintText: "One term is a TIMING habit, one is about COMPARING to others, and one is the overall PATTERN.",
            xpOnComplete: 4
          },
          {
            id: 'li_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "Lifestyle inflation is usually the result of one big, obvious spending decision.",
            isTrue: false,
            explanation: "It's a myth. It's typically a series of small, individually reasonable increases that quietly compound over months.",
            xpOnComplete: 2
          },
          {
            id: 'li_myth1', type: 'mythcards', title: 'Lifestyle Inflation Myths',
            cards: [
              { myth: "A raise should always translate into a proportional increase in everyday spending.", isTrue: false, explanation: "Deciding upfront how much goes to savings versus lifestyle prevents the entire raise from disappearing into spending." },
              { myth: "Spending habits are influenced by the people you spend the most time around.", isTrue: true, explanation: "True, social comparison is a real accelerator of lifestyle inflation." },
              { myth: "Setting a spending cap for social activities before a situation arises makes it easier to stick to.", isTrue: true, explanation: "True, deciding in advance removes the pressure of deciding in the moment." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'li_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [2, 6],
            hintTexts: [
              "Think about what it's called when spending rises to match income or social norms without more savings to show for it.",
              "Think about the healthiest way to handle a friend group activity that doesn't fit your current budget."
            ]
          },
          {
            id: 'li_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Staying Ahead of the Creep Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy get better at catching lifestyle inflation before it takes hold. Tap each decision to see the impact.",
            hintText: "Deciding upfront and setting a spending cap for social activities are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Decide the savings split for a raise before it hits the account", scoreDelta: 14, note: "This is the single most effective defense against lifestyle inflation." },
              { id: 'd2', label: "Set a spending cap for social activities in advance", scoreDelta: 9, note: "Deciding the number ahead of time removes the in-the-moment pressure to match everyone else." },
              { id: 'd3', label: "Let every raise flow directly into matching a friend group's spending", scoreDelta: -12, note: "This is lifestyle inflation happening in real time, with zero of the raise reaching savings." },
              { id: 'd4', label: "Be upfront with friends about a budget instead of pretending otherwise", scoreDelta: 7, note: "Real friends tend to adjust, and honesty removes the pressure to overspend silently." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'li_t5', type: 'teach', title: 'A Raise Is a Choice Point, Not an Autopilot',
            concepts: [
              {
                term: 'Treating Every Raise as a Choice Point',
                plain: "Every raise, bonus, or windfall is a moment to consciously decide how it gets used, not a default signal to spend more. Treating it as a deliberate choice point, every time, is what actually breaks the lifestyle inflation cycle long-term.",
                analogy: "It's like being handed a blank check with your name on the memo line, worth pausing to fill it in on purpose instead of letting it fill itself in.",
                check: { statement: "The best long-term defense against lifestyle inflation is treating every raise as an automatic spending increase.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'li_boss', type: 'bossbattle', title: 'The Spring Break Trip',
            scenario: "Hammy's friend group is planning a spring break trip that doesn't fit their current budget, but everyone's going and it's all anyone talks about. What does Hammy do?",
            hintText: "Remember Deciding Upfront and Social Comparison: has Hammy actually set a number for this, or is the pressure driving the decision instead?",
            choices: [
              { id: 'a', label: "Decide a real budget first, then either find a cheaper way to join or opt out and say so honestly", consequence: { text: "A clear number and honest communication keep the friendship intact without blowing the budget.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Go anyway and figure out the money later, possibly on a credit card", consequence: { text: "This is lifestyle inflation and social comparison combining at full strength, exactly the pattern this quest was built to catch.", delta: { moneyScore: -12, checking: -300 }, xpMultiplier: 0.5 } },
              { id: 'c', label: "Make a vague excuse and skip it without explaining why", consequence: { text: "The budget stays safe, but an unexplained no, repeated enough times, can quietly strain friendships.", delta: { moneyScore: 2 }, xpMultiplier: 0.9 } },
              { id: 'd', label: "Suggest a cheaper group alternative everyone could actually afford", consequence: { text: "This reframes the pressure into a shared problem to solve together, instead of an individual budget to defend alone.", delta: { moneyScore: 9 }, xpMultiplier: 1.15 } }
            ]
          }
        ]
      },
      {
        id: 'social_pressure',
        topic: 'Social Pressure & Comparison Spending',
        character: { name: 'Hammy', tagline: 'Feeling pressure to keep up with friends\' spending' },
        initialState: {},
        chapters: [
          { id: 'social_pressure_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Social Pressure & Comparison Spending." }
            ]
          }
        ]
      },
      {
        id: 'subscription_creep',
        topic: 'Subscription Creep & Recurring Payments',
        character: { name: 'Hammy', tagline: 'Losing track of monthly subscriptions' },
        initialState: {},
        chapters: [
          { id: 'subscription_creep_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Subscription Creep & Recurring Payments." }
            ]
          }
        ]
      },
      {
        id: 'bnpl_cost',
        topic: 'Buy Now, Pay Later: The Real Cost',
        character: { name: 'Hammy', tagline: 'Considering a BNPL plan at checkout' },
        initialState: {},
        chapters: [
          { id: 'bnpl_cost_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Buy Now, Pay Later: The Real Cost." }
            ]
          }
        ]
      },
      {
        id: 'mental_accounting',
        topic: 'Mental Accounting & Targeted Ads',
        character: { name: 'Hammy', tagline: 'Noticing how ads target their spending habits' },
        initialState: {},
        chapters: [
          { id: 'mental_accounting_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Mental Accounting & Targeted Ads." }
            ]
          }
        ]
      },
      {
        id: 'sunk_cost',
        topic: 'Sunk Cost Fallacy & Breaking Spending Triggers',
        character: { name: 'Hammy', tagline: 'Stuck justifying a bad purchase' },
        initialState: {},
        chapters: [
          { id: 'sunk_cost_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Sunk Cost Fallacy & Breaking Spending Triggers." }
            ]
          }
        ]
      },
      {
        id: 'automate_habits',
        topic: 'Automating Good Habits & Coping With Triggers',
        character: { name: 'Hammy', tagline: 'Trying to build better spending habits automatically' },
        initialState: { checking: 200 },
        chapters: [
          {
            id: 'ah0', type: 'story', title: 'Nine PM, Tight on Cash',
            beats: [
              { speaker: 'intro', text: "It's 9pm and Hammy's friends just texted about a $60 concert this weekend. Hammy's tight on cash — rent is due Monday. Everyone's waiting on an answer. Does the pressure to decide fast change the decision itself?" }
            ]
          },
          {
            id: 'ah1', type: 'teach', title: 'The Scarcity Mindset',
            concepts: [
              { term: 'Scarcity Mindset', plain: "Being tight on time or money changes how you decide — when resources feel scarce, your brain narrows in on the immediate problem and gets worse at weighing tradeoffs. Before any purchase over $50, run it through three questions: what's the actual cost, what's the consequence if you say yes, and can you undo it if you're wrong?", analogy: "Pressure shrinks your field of view right when you need it widest.", check: { statement: 'Feeling rushed to decide has no real effect on decision quality.', isTrue: false } }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ah2', type: 'decision', title: 'The Group Chat',
            prompt: "Hammy's friends are going to a $60 concert this weekend, but rent is due Monday. The group chat is waiting. What does Hammy do?",
            hintText: "Is there an honest option that costs nothing and explains nothing away?",
            choices: [
              { id: 'a', label: "Say yes and put it on a credit card — don't want to miss out", outcome: { text: "Now $60 closer to not covering rent, on a card that charges interest if not paid in full.", delta: { checking: -60 }, compare: [{ label: 'Cost', value: 60 }, { label: 'Alternative', value: 0 }] } },
              { id: 'b', label: 'Make a vague excuse and skip it without explaining why', outcome: { text: 'Money stays fine, but friends are left guessing — repeated unexplained no\'s quietly create distance.', delta: { checking: 0 }, compare: [{ label: 'Cost', value: 0 }, { label: 'Social cost', value: 1 }] } },
              { id: 'c', label: '"I\'m tight this week, but I\'m in for something free after"', outcome: { text: 'Nothing lost — rent stays covered, and real friends respect honesty more than a vague no or an unrepaid flex.', delta: { checking: 0 }, compare: [{ label: 'Cost', value: 0 }, { label: 'Social cost', value: 0 }] } }
            ],
            xpOnComplete: 5
          },
          {
            id: 'ah3', type: 'decision', title: 'Morning: The Countdown Timer',
            prompt: 'A checkout page shows "⏰ 2 left, offer ends in 9:58" for a $70 jacket Hammy wasn\'t planning to buy.',
            hintText: "Does the timer reset for the next visitor too?",
            choices: [
              { id: 'a', label: 'Buy now, before the timer runs out', outcome: { text: 'That timer resets for the next visitor too — the urgency was never really about the jacket running out.', delta: { checking: -70 }, compare: [{ label: 'Spent', value: 70 }, { label: 'Kept', value: 0 }] } },
              { id: 'b', label: 'Close the tab and give it 24 hours', outcome: { text: 'Real scarcity is rare online — if it\'s still there tomorrow, it was never actually about to disappear.', delta: { checking: 0 }, compare: [{ label: 'Spent', value: 0 }, { label: 'Kept', value: 70 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ah4', type: 'decision', title: 'Evening: The Bad Grade',
            prompt: 'A rough exam grade lands right as an ad for a "$40 treat yourself" skincare set pops up.',
            hintText: "Does the relief from an impulse buy usually outlast the bill?",
            choices: [
              { id: 'a', label: 'Buy it, today earned it', outcome: { text: 'The relief from an impulse purchase fades faster than the bill does.', delta: { checking: -40 }, compare: [{ label: 'Spent', value: 40 }, { label: 'Kept', value: 0 }] } },
              { id: 'b', label: 'Text a friend instead, revisit tomorrow if still wanted', outcome: { text: 'Still an option tomorrow, just without deciding while stressed.', delta: { checking: 0 }, compare: [{ label: 'Spent', value: 0 }, { label: 'Kept', value: 40 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ah5', type: 'bossbattle', title: 'Late Night: The Influencer Code',
            scenario: "An influencer posts a \"24-hours-only\" 30%-off code for a $120 haircare bundle Hammy doesn't currently need.",
            hintText: "A discount only saves money on something you were already buying.",
            choices: [
              { id: 'a', label: 'Use the code, it\'s basically free money saved', consequence: { text: 'A 30% discount on something not needed still costs the other 70% that didn\'t have to be spent.', delta: { checking: -84 }, xpMultiplier: 0.6 } },
              { id: 'b', label: "Skip it — a sale isn't a reason to buy something not already on the list", consequence: { text: 'That\'s the actual rule: a discount only saves money on something already being bought.', delta: { checking: 0 }, xpMultiplier: 1.25 } }
            ]
          }
        ]
      },
      {
        id: 'autosave_setup',
        parentQuestId: 'automate_habits',
        topic: 'Setting Up Auto-Save & Spending Alerts: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually automating the habits instead of just meaning to' },
        initialState: { checking: 200 },
        chapters: [
          {
            id: 'as0', type: 'story', title: 'Meaning to vs. Doing It',
            beats: [
              { speaker: 'intro', text: "Hammy knows exactly why willpower alone doesn't stop late-night impulse spending. The auto-save rule and spending alerts that would actually help, though, have never been set up. Let's fix that." }
            ]
          },
          {
            id: 'as1', type: 'teach', title: 'Step 1 & 2: Pick a Tool & Automate',
            concepts: [
              { term: 'Step 1: Pick an App With Real Alerts', plain: "Most banking apps support custom alerts — a text or push notification when a balance drops below a set amount, or when a purchase exceeds a chosen threshold.", analogy: "It's a tripwire that notices before the balance gets to zero, not after.", check: {} },
              { term: 'Step 2: Set an Automatic Transfer Rule', plain: "Set a recurring transfer to savings for payday, even a small amount — $20-$25 per paycheck is enough to start. The habit matters more than the amount at first.", analogy: '"Pay yourself first" happens automatically instead of relying on remembering.', check: { statement: 'An automatic transfer rule needs to move a large amount to be worthwhile.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'as2', type: 'teach', title: 'Step 3 & 4: Set Limits & Review',
            concepts: [
              { term: 'Step 3: Set Spending Alerts & Category Limits', plain: "Many apps allow setting a monthly limit per category — like dining or shopping — and send an alert when getting close. This catches subscription creep and mood-spending patterns before the statement arrives.", analogy: "A speedometer for spending, instead of finding out the total at the end of the month.", check: {} },
              { term: 'Step 4: Review Once a Month', plain: "Automation isn't set-and-forget forever — a quick monthly check confirms the alerts and transfer amount still make sense as income or expenses change.", analogy: "Like checking tire pressure occasionally, even on a car that mostly runs fine.", check: { statement: 'Automated savings and alerts never need to be revisited once set up.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'as3', type: 'decision', title: 'The Late-Night Alert',
            prompt: "It's 1am, Hammy is about to make an impulse purchase, and a spending alert pops up showing this category is already near its monthly limit.",
            hintText: "What was the whole point of setting this alert up in the first place?",
            choices: [
              { id: 'a', label: 'Dismiss the alert and buy it anyway', outcome: { text: "The alert did its job — noticing it and buying anyway defeats the purpose it was set up for.", delta: { checking: -40 }, compare: [{ label: 'Category limit respected', value: 0 }, { label: 'Ignored', value: 1 }] } },
              { id: 'b', label: 'Close the app and revisit tomorrow if still wanted', outcome: { text: "The exact scenario this system was built for — a pause instead of an in-the-moment decision.", delta: { checking: 0 }, compare: [{ label: 'Category limit respected', value: 1 }, { label: 'Ignored', value: 0 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'as4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [5, 11],
            hintTexts: [
              "Think about what actually makes a financial habit stick long-term.",
              "Think about a better response to stress than an impulse purchase."
            ]
          }
        ]
      }
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
      { title: 'Building Your Network & Long-Term Impact', hook: 'You\'re only a sophomore with no job offers yet, but the $5,000 gap between two hypothetical starting salaries keeps nagging at you. Does anything you do now actually affect that gap years from now?', qIndices: [9, 5] },
      {
        title: 'Why Negotiating Compounds',
        type: 'callout',
        hook: 'Negotiating $5,000 more per year sounds like it\'s worth exactly $5,000 more per year. It isn\'t — and the real number is a lot bigger.',
        activity: {
          body: "Every negotiation skill in this module doesn't just affect this year's paycheck — it changes how much you can invest every single month, and money invested young has the most time to grow. Say negotiating adds $5,000/year starting at 22, and you invest all of it monthly at a 7% average return until 65. Here's what that one negotiation is actually worth by retirement:",
          example: { startingAmount: 0, monthlyContribution: 5000 / 12, annualRatePct: 7, years: 43, label: 'from one negotiated $5,000/year raise, starting at 22, invested at 7% until 65' },
          linkOut: { label: 'Run your own numbers in the Compound Interest Simulator', action: 'compound-interest' },
          xpOnComplete: 5
        }
      }
    ],
    quests: [
      {
        id: 'offer_letter',
        topic: 'Reading Your Offer Letter',
        character: { name: 'Hammy', tagline: 'Reading a job offer letter for the first time' },
        initialState: { checking: 200, savings: 100, moneyScore: 50 },
        bossAchievementId: 'offer_reader',
        chapters: [
          {
            id: 'ol1', type: 'story', title: 'The Fine Print',
            beats: [
              { speaker: 'intro', text: 'Hammy\'s offer letter lists "$70,000 total target compensation," plus a $5,000 signing bonus. There\'s a repayment clause near the bottom Hammy almost scrolled past entirely.' },
              { speaker: 'Hammy', text: '"Wait, do I have to pay this bonus BACK under some condition? I almost missed that."' },
              { speaker: 'narrator', text: "Offer letters are full of details like this, worth understanding before signing, not after." },
              { speaker: 'Hammy', text: '"Okay, let\'s actually go through this letter line by line."' }
            ]
          },
          {
            id: 'ol_t1', type: 'teach', title: 'Base Salary vs. Total Target Compensation',
            concepts: [
              {
                term: 'Total Target Compensation',
                plain: "This headline number usually combines your guaranteed base salary with a TARGET bonus that isn't guaranteed. A \"$70,000 total target compensation\" offer built from a $60,000 base and a $10,000 target bonus means only $60,000 is actually promised.",
                analogy: "It's like a restaurant menu price that includes an optional tip already factored in, the base price is what's actually guaranteed.",
                check: { statement: "The full total target compensation number, including bonus, is always guaranteed regardless of performance.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ol_t2', type: 'teach', title: 'Signing Bonus Clawback Clauses',
            concepts: [
              {
                term: 'Clawback Clause',
                plain: "Many signing bonuses must be repaid, often on a prorated basis, if you leave before a set period, commonly 1-2 years. It's not free money with zero conditions, it's money tied to a minimum commitment.",
                analogy: "It's like a phone carrier's device discount that gets clawed back if you cancel service early, the deal comes with strings attached.",
                check: { statement: "Signing bonuses are always yours to keep with zero conditions attached.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ol_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Total Target Compensation', definition: 'Base salary plus a target bonus that is often not fully guaranteed.' },
              { term: 'Clawback Clause', definition: 'A requirement to repay a signing bonus if you leave before a set period.' },
              { term: 'Base Salary', definition: 'The guaranteed, predictable portion of your pay.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ol_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: it's completely normal, and expected, to take 24-48 hours to review a full offer letter before responding. No reasonable employer rescinds an offer because you asked for a day to read it carefully.",
            xpOnComplete: 1
          },
          {
            id: 'ol_t3', type: 'teach', title: 'PTO as Compensation',
            concepts: [
              {
                term: 'PTO as Compensation',
                plain: "Paid time off has real financial value, unused time off is essentially unpaid time if you need it and don't have enough banked. Two offers with identical salary but different PTO amounts are NOT actually equal offers.",
                analogy: "It's like comparing two jobs with the same hourly rate but very different amounts of included sick days, the number alone doesn't tell the whole story.",
                check: { statement: "Two job offers with the same salary but different amounts of PTO are effectively identical offers.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ol_d1', type: 'decision',
            title: "The Clawback Clause",
            prompt: "Hammy is excited about the $5,000 signing bonus and about to accept without reading the repayment clause closely. What should they do?",
            hintText: "Think back to Clawback Clause: what's the actual condition attached to this bonus, and does it change how \"free\" it really is?",
            choices: [
              {
                id: 'a', label: 'Accept immediately, a bonus is a bonus',
                outcome: {
                  text: "Hammy later realizes leaving within 12 months means repaying a prorated portion, a detail worth knowing upfront, not after accepting.",
                  delta: { moneyScore: -6 },
                  compare: [{ label: 'Bonus risk understood before signing', value: 0 }, { label: 'Bonus risk discovered after signing', value: 5000 }]
                }
              },
              {
                id: 'b', label: 'Read the full clause and factor the commitment period into the decision',
                outcome: {
                  text: "Hammy goes in with full information, the bonus is real, just tied to staying at least 12 months, an easy condition once it's actually understood upfront.",
                  delta: { moneyScore: 8 },
                  compare: [{ label: 'Bonus risk understood before signing', value: 0 }, { label: 'Bonus risk discovered after signing', value: 5000 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'ol_ms1', type: 'microsim', title: "Budgeting Off the Guaranteed Base",
            prompt: "Hammy's offer has a $60,000 base ($4,300/month take-home) plus a NOT-guaranteed $10,000 target bonus. Build a budget using only the guaranteed base.",
            hintText: "Fixed costs use $2,800. That leaves $1,500 of the guaranteed $4,300 monthly take-home to split between the two sliders before going negative.",
            income: 4300,
            fixedCosts: [
              { label: 'Rent, utilities, groceries', amount: 2800 }
            ],
            sliders: [
              { id: 'savings', label: 'Savings deposit', min: 0, max: 1000, step: 50, default: 0 },
              { id: 'discretionary', label: 'Discretionary spending', min: 100, max: 1500, step: 50, default: 100 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That budget goes negative using only the guaranteed base. Try smaller amounts.", ok: false },
              { maxLeftover: 199, text: "It fits on the guaranteed base alone, if the bonus arrives too, it's a genuine bonus, not a bailout.", ok: true },
              { maxLeftover: Infinity, text: "Solid, this budget works even in a year the target bonus isn't fully paid out.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ol_spot1', type: 'spotcheck', title: 'Spot the Concerning Clauses',
            intro: "Here's a sample offer letter paragraph. Tap any parts that are worth a closer look before signing.",
            postingTitle: 'Offer Letter Excerpt',
            segments: [
              { id: 's1', text: "We are pleased to offer you a position with total target compensation of $70,000, ", isRedFlag: false, explanation: "A normal opening line, though remember: this figure blends guaranteed and non-guaranteed pay." },
              { id: 's2', text: "consisting of a $60,000 base salary and a $10,000 target annual bonus based on company and individual performance. ", isRedFlag: true, explanation: "Worth flagging: this confirms the bonus is NOT guaranteed, it depends on performance and company results." },
              { id: 's3', text: "You will also receive a $5,000 signing bonus, payable within your first 30 days. ", isRedFlag: false, explanation: "A clear, straightforward benefit on its own, the condition comes in the next line." },
              { id: 's4', text: "This signing bonus must be repaid in full if your employment ends within 12 months of your start date, ", isRedFlag: true, explanation: "This is the clawback clause, exactly the detail worth catching before accepting." },
              { id: 's5', text: "and you will be eligible for 15 days of PTO annually, accrued monthly.", isRedFlag: false, explanation: "Useful to know for comparing against other offers, but not a red flag on its own." }
            ],
            xpOnComplete: 5
          },
          {
            id: 'ol_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'PTO as Compensation', definition: 'Paid time off has real financial value, even though it isn\'t part of the salary number.' },
              { term: 'Target Bonus', definition: 'A bonus amount tied to performance or company results, not guaranteed.' },
              { term: 'Guaranteed Base', definition: "The part of an offer you can safely count on and budget around."}
            ],
            hintText: "One term is a non-salary BENEFIT, one is a NOT-guaranteed bonus, and one is what's actually PROMISED.",
            xpOnComplete: 4
          },
          {
            id: 'ol_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "A \"total target compensation\" number on an offer letter is fully guaranteed, just like a base salary.",
            isTrue: false,
            explanation: "It's a myth. The bonus portion is usually tied to performance or company results, and may not be fully paid out every year.",
            xpOnComplete: 2
          },
          {
            id: 'ol_myth1', type: 'mythcards', title: 'Offer Letter Myths',
            cards: [
              { myth: "A signing bonus is always yours to keep no matter what happens next.", isTrue: false, explanation: "Clawback clauses commonly require repayment if you leave before a set period." },
              { myth: "Two offers with identical salary but very different PTO amounts are financially equivalent.", isTrue: false, explanation: "PTO has real value, more paid time off is a meaningful part of total compensation." },
              { myth: "It's reasonable to take 24-48 hours to review a full offer before responding.", isTrue: true, explanation: "True, no reasonable employer penalizes a candidate for asking for a day to review the details." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'ol_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [11, 6],
            hintTexts: [
              "Think about which portion of a \"total target compensation\" offer is actually guaranteed.",
              "Think about what a signing bonus clawback clause requires if you leave too soon."
            ]
          },
          {
            id: 'ol_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Offer-Reading Smarts Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy get sharper at reading the fine print. Tap each decision to see the impact.",
            hintText: "Reading the full letter and budgeting off the guaranteed base are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Read the entire offer letter, including the fine print, before responding", scoreDelta: 13, note: "This is exactly how a clawback clause gets caught before it's a surprise." },
              { id: 'd2', label: "Budget off the guaranteed base salary, not the total target number", scoreDelta: 9, note: "A budget built on non-guaranteed bonus money is a risky budget." },
              { id: 'd3', label: "Accept a signing bonus without checking for a repayment condition", scoreDelta: -11, note: "This is exactly the kind of detail that can turn into an unexpected bill later." },
              { id: 'd4', label: "Ignore PTO differences when comparing two similarly-paid offers", scoreDelta: -6, note: "PTO is part of total compensation, ignoring it means comparing offers incompletely." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ol_t4', type: 'teach', title: 'Ask Before You Sign, Not After',
            concepts: [
              {
                term: 'Asking Clarifying Questions',
                plain: "Nothing in an offer letter is off-limits to ask about: what percentage of the target bonus is typically paid out historically, exactly what the clawback terms cover, when PTO starts accruing. Asking before signing is normal and expected, not pushy.",
                analogy: "It's like asking about a lease's early termination fee before signing, not after you've already moved in.",
                check: { statement: "Asking clarifying questions about bonus structure or clawback terms before signing is considered unprofessional.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ol_boss', type: 'bossbattle', title: 'The Signing Deadline',
            scenario: "Hammy's offer letter gives 3 days to sign. It includes a target bonus, a signing bonus with a clawback clause, and PTO details Hammy hasn't fully compared to a second offer yet. What does Hammy do?",
            hintText: "Remember: reading the full letter and asking clarifying questions is normal, even on a tight deadline.",
            choices: [
              { id: 'a', label: "Ask for a short extension if needed, read every clause, and ask clarifying questions before signing", consequence: { text: "A day or two of careful review, plus a few good questions, is worth far more than rushing a multi-year decision.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Sign immediately without reading the clawback or PTO details closely", consequence: { text: "Hammy accepts without understanding real conditions attached to the bonus and how the PTO stacks up against the other offer.", delta: { moneyScore: -10 }, xpMultiplier: 0.6 } },
              { id: 'c', label: "Compare the guaranteed base and PTO against the other offer, then decide based on those, not the bonus", consequence: { text: "Weighing the guaranteed parts most heavily is exactly the right instinct when comparing two offers.", delta: { moneyScore: 9 }, xpMultiplier: 1.15 } },
              { id: 'd', label: "Let the deadline pressure force a same-day decision without reviewing anything closely", consequence: { text: "Rushing a multi-year decision under artificial pressure risks missing a detail that mattered.", delta: { moneyScore: -6 }, xpMultiplier: 0.75 } }
            ]
          }
        ]
      },
      {
        id: 'negotiate_salary',
        topic: 'Negotiating Your First Salary',
        character: { name: 'Hammy', tagline: 'About to accept a salary offer without negotiating' },
        initialState: { checking: 200, savings: 100, moneyScore: 50 },
        bossAchievementId: 'negotiator',
        chapters: [
          {
            id: 'ns1', type: 'story', title: '$58,000, About to Accept on the Spot',
            beats: [
              { speaker: 'intro', text: "Hammy gets a job offer: $58,000. Thrilled, they're about to accept on the spot. A friend just negotiated theirs from $55,000 to $60,000 with a single email." },
              { speaker: 'Hammy', text: '"Wait, they just... asked? And it worked?"' },
              { speaker: 'narrator', text: "Before Hammy hits accept, let's talk about what that one email actually did, and why silence is the more expensive choice." },
              { speaker: 'Hammy', text: '"Okay, I want to understand this before I possibly leave money on the table."' }
            ]
          },
          {
            id: 'ns_t1', type: 'teach', title: 'Silence Is the Most Expensive Mistake',
            concepts: [
              {
                term: 'The Cost of Not Asking',
                plain: "The biggest mistake new grads make isn't negotiating badly, it's never asking at all, assuming the first number is final. Most starting offers have flexibility built in, and simply asking \"is there room to negotiate?\" costs nothing.",
                analogy: "It's like never asking for a discount at checkout because you assume the price is fixed, sometimes it genuinely is, but you'll never know unless you ask.",
                check: { statement: "Most companies expect their first salary offer to be final with zero room to negotiate.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ns_t2', type: 'teach', title: 'Anchoring to Market Research',
            concepts: [
              {
                term: 'Anchoring to Research',
                plain: "Effective negotiation isn't demanding a number out of thin air, it's researching market rate for the role and location (sites like Glassdoor or Levels.fyi, or a school's career center), then anchoring your ask to that data.",
                analogy: "It's like citing comparable home sales before making an offer, the number means a lot more backed by real data than a guess.",
                check: { statement: "Effective salary negotiation is best done without any market research to back up the number.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'ns_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'The Cost of Not Asking', definition: 'Assuming the first offer is final, when most have built-in flexibility.' },
              { term: 'Anchoring to Research', definition: 'Backing a counter-offer number with market rate data for the role and location.' },
              { term: 'Counter-Offer', definition: 'A professional, specific request for more, typically made in writing.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ns_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: you don't need a competing offer in hand to negotiate. A reasonable, researched ask is enough on its own, competing offers help, but they're not a requirement.",
            xpOnComplete: 1
          },
          {
            id: 'ns_t3', type: 'teach', title: 'Why the Gap Compounds',
            concepts: [
              {
                term: 'Compounding Salary Gaps',
                plain: "Future raises, bonuses, and even new job offers are often calculated as a percentage of your current salary. A $5,000 gap at your first job doesn't stay $5,000, it widens every year raises get calculated as a percentage, similar to compound interest.",
                analogy: "It's like two savings accounts starting at slightly different balances, both earning the same percentage return, the gap between them keeps growing every year, not shrinking.",
                check: { statement: "An early salary gap tends to widen over a career because future raises are often a percentage of current salary.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ns_d1', type: 'decision',
            title: "The Reply Email",
            prompt: "Hammy's $58,000 offer arrives with a request to reply within a week. What's the smartest move?",
            hintText: "Think back to The Cost of Not Asking: what's the actual risk of simply asking a professional, researched question?",
            choices: [
              {
                id: 'a', label: 'Accept immediately at $58,000',
                outcome: {
                  text: "Hammy never finds out if there was room to negotiate, and that gap compounds through every future percentage-based raise.",
                  delta: { moneyScore: -6 },
                  compare: [{ label: 'Salary if never negotiated', value: 58000 }, { label: 'Salary if negotiated up', value: 61000 }]
                }
              },
              {
                id: 'b', label: 'Send a professional counter-offer backed by market research',
                outcome: {
                  text: "A researched, professional ask costs nothing to send and can mean thousands more per year, compounding through every future raise.",
                  delta: { moneyScore: 8 },
                  compare: [{ label: 'Salary if negotiated up', value: 61000 }, { label: 'Salary if never negotiated', value: 58000 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'ns_ms1', type: 'microsim', title: "Budgeting the Negotiated Raise",
            prompt: "Hammy successfully negotiated from $58,000 to $61,000, about $250 more per month take-home. Decide how the extra room gets used.",
            hintText: "The extra $250/month is new room on top of an already-working budget. Split it between the two sliders.",
            income: 250,
            fixedCosts: [],
            sliders: [
              { id: 'savings', label: 'Additional savings from the negotiated raise', min: 0, max: 250, step: 25, default: 0 },
              { id: 'lifestyle', label: 'Additional lifestyle spending', min: 0, max: 250, step: 25, default: 250 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "Double check the two sliders add up to the $250 available.", ok: false },
              { maxLeftover: 249, text: "Notice how much of the negotiated gain is reaching savings versus lifestyle spending.", ok: true },
              { maxLeftover: Infinity, text: "The negotiated raise is intentionally split, getting real value from the negotiation instead of letting it quietly disappear.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ns_price1', type: 'priceisright', title: 'The Price Is Right: One Negotiation, Decades Later',
            prompt: "Hammy negotiates an extra $5,000/year starting at 22, and invests all of it monthly at a 7% average return until 65. Guess what that one negotiation is worth by retirement.",
            hintText: "This is compound interest at work across 43 years, the number is much bigger than $5,000 × 43.",
            actualValue: 1400000, guessRange: { min: 0, max: 2000000, step: 50000 },
            explanation: "Roughly $1.4 million. One negotiated $5,000/year raise, invested consistently from 22 to 65 at a 7% average return, compounds into a genuinely life-changing number, far more than the simple $5,000 × 43 years might suggest.",
            xpOnComplete: 5
          },
          {
            id: 'ns_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Compounding Salary Gaps', definition: 'An early salary difference that widens over a career through percentage-based raises.' },
              { term: 'Job-Hopping for Market Value', definition: 'Periodically checking outside offers, since internal raises are often smaller than external ones.' },
              { term: 'Anchoring to Research', definition: 'Backing a counter-offer number with market rate data for the role and location.' }
            ],
            hintText: "One term is about a GAP growing over time, one is about CHECKING your value elsewhere, and one is about BACKING an ask with data.",
            xpOnComplete: 4
          },
          {
            id: 'ns_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "You need a competing job offer in hand before you're allowed to negotiate a salary.",
            isTrue: false,
            explanation: "It's a myth. A reasonable, researched ask is enough on its own, a competing offer can help, but it's not a requirement.",
            xpOnComplete: 2
          },
          {
            id: 'ns_myth1', type: 'mythcards', title: 'Salary Negotiation Myths',
            cards: [
              { myth: "Asking if there's room to negotiate risks having the entire offer pulled.", isTrue: false, explanation: "A professional, reasonable question almost never results in a rescinded offer." },
              { myth: "A $5,000 starting salary gap tends to widen, not shrink, over a career.", isTrue: true, explanation: "True, since future raises are often a percentage of current salary, the gap compounds year after year." },
              { myth: "Switching employers periodically is a normal way to grow income, since internal raises are often smaller.", isTrue: true, explanation: "True, internal raises are frequently capped lower than what a new employer might offer." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'ns_kc1', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 1],
            hintTexts: [
              "Think about the single biggest mistake new grads make when they receive their first offer.",
              "Think about what backs up an effective salary negotiation ask, beyond just naming a number."
            ]
          },
          {
            id: 'ns_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Negotiation Confidence Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy get more confident negotiating. Tap each decision to see the impact.",
            hintText: "Asking the question and backing it with research are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Ask \"is there room to negotiate?\" instead of accepting immediately", scoreDelta: 14, note: "This single question costs nothing and can mean thousands more per year." },
              { id: 'd2', label: "Research market rate before naming a counter-offer number", scoreDelta: 9, note: "A researched ask lands far better than a number pulled from thin air." },
              { id: 'd3', label: "Accept the first offer immediately, assuming it's final", scoreDelta: -12, note: "This is the single most expensive mistake new grads make." },
              { id: 'd4', label: "Check market value every couple of years, even while happy at a job", scoreDelta: 7, note: "Knowing your market value keeps internal raises honest." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'ns_t5', type: 'teach', title: 'A Professional Ask, Every Time',
            concepts: [
              {
                term: 'Making It a Habit, Not a One-Time Event',
                plain: "Negotiating isn't a one-time trick for a first job, it's a habit worth repeating at every raise cycle and every new offer for the rest of a career. The specific number changes, the habit of asking, researching, and asking professionally in writing stays the same.",
                analogy: "It's like flossing, one good day doesn't matter nearly as much as making it a repeated habit over years.",
                check: { statement: "Negotiating is a one-time skill only relevant for a person's very first job offer.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ns_boss', type: 'bossbattle', title: 'The Second Offer',
            scenario: "Three years in, Hammy gets a competing offer paying 15% more for a similar role, while their current employer's typical raise is 3%. What does Hammy do?",
            hintText: "Remember Compounding Salary Gaps and Job-Hopping for Market Value: how does a bigger early number affect every future raise calculated as a percentage of it?",
            choices: [
              { id: 'a', label: "Bring the competing offer to the current employer as leverage, or take it if they can't match it", consequence: { text: "Either way, Hammy captures a bigger percentage gain now, which compounds through every future raise from here.", delta: { moneyScore: 12 }, xpMultiplier: 1.25 } },
              { id: 'b', label: "Stay loyal and ignore the competing offer entirely", consequence: { text: "Loyalty has value, but a 3% internal raise versus a 15% external one is a gap that compounds for years.", delta: { moneyScore: -6 }, xpMultiplier: 0.8 } },
              { id: 'c', label: "Take the competing offer without ever mentioning it to the current employer", consequence: { text: "This captures the raise, though a conversation first might have surfaced a counter-offer worth considering too.", delta: { moneyScore: 6 }, xpMultiplier: 1.05 } },
              { id: 'd', label: "Ignore market value checks entirely going forward since this worked out once", consequence: { text: "One good outcome doesn't replace the ongoing habit, market value is worth rechecking periodically, not just once.", delta: { moneyScore: 2 }, xpMultiplier: 0.9 } }
            ]
          }
        ]
      },
      {
        id: 'total_comp',
        topic: 'Benefits & Total Compensation',
        character: { name: 'Hammy', tagline: 'Comparing benefits packages between offers' },
        initialState: {},
        chapters: [
          { id: 'total_comp_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Benefits & Total Compensation." }
            ]
          }
        ]
      },
      {
        id: 'retirement_equity',
        topic: 'Retirement Match & Equity',
        character: { name: 'Hammy', tagline: 'Trying to understand an equity offer' },
        initialState: {},
        chapters: [
          { id: 'retirement_equity_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Retirement Match & Equity." }
            ]
          }
        ]
      },
      {
        id: 'comparing_offers',
        topic: 'Comparing Offers & Job-Hopping',
        character: { name: 'Hammy', tagline: 'Weighing two job offers against each other' },
        initialState: {},
        chapters: [
          { id: 'comparing_offers_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Comparing Offers & Job-Hopping." }
            ]
          }
        ]
      },
      {
        id: 'building_network',
        topic: 'Building Your Network for Long-Term Impact',
        character: { name: 'Hammy', tagline: 'Building a professional network from scratch' },
        initialState: {},
        chapters: [
          { id: 'building_network_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Building Your Network for Long-Term Impact." }
            ]
          }
        ]
      },
      {
        id: 'negotiating_compounds',
        topic: 'Why Negotiating Compounds Over Your Career',
        character: { name: 'Hammy', tagline: 'Wondering if negotiating this one offer really matters' },
        initialState: {},
        chapters: [
          { id: 'negotiating_compounds_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Why Negotiating Compounds Over Your Career." }
            ]
          }
        ]
      },
      {
        id: 'first_90_days',
        topic: 'Starting Your First Job: What to Expect in the First 90 Days',
        character: { name: 'Hammy', tagline: 'Starting a first full-time job' },
        initialState: {},
        chapters: [
          { id: 'first_90_days_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Starting Your First Job: What to Expect in the First 90 Days." }
            ]
          }
        ]
      },
      {
        id: 'negotiate_email',
        parentQuestId: 'negotiate_salary',
        topic: 'Negotiating Your Offer by Email: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually writing the counter-offer email' },
        initialState: {},
        chapters: [
          {
            id: 'ne0', type: 'story', title: 'The Offer Just Landed',
            beats: [
              { speaker: 'intro', text: "Hammy just got a $58,000 offer and knows negotiating is worth it in theory. Actually writing the email that asks for more is a different challenge entirely." }
            ]
          },
          {
            id: 'ne1', type: 'teach', title: 'Step 1 & 2: Research & Draft',
            concepts: [
              { term: 'Step 1: Research the Market Rate', plain: "Sites like Glassdoor, Levels.fyi, and LinkedIn Salary show typical pay for the role, location, and experience level. A specific number backed by data is far more persuasive than a vague request for more.", analogy: "Showing up with comparable listings, like researching a car's fair price before negotiating.", check: {} },
              { term: 'Step 2: Draft the Counter-Offer', plain: "A good counter-offer email thanks them for the offer, expresses enthusiasm for the role, states a specific target number backed by research, and asks if there's flexibility. Keep it short, professional, and non-confrontational.", analogy: "It reads like a business email, not a demand — friendly but specific.", check: { statement: 'A vague request for "more money" is generally more effective than a specific number backed by research.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ne2', type: 'teach', title: 'Step 3 & 4: Respond & Confirm',
            concepts: [
              { term: 'Step 3: Respond to Pushback', plain: "If the employer can't move on base salary, ask about other levers: signing bonus, extra PTO, an earlier review date, or remote flexibility. Many companies have more room on these than on the base number.", analogy: "If one door doesn't open, there are usually several other doors in the same room.", check: {} },
              { term: 'Step 4: Get the Final Offer in Writing', plain: "Once terms are agreed verbally or by phone, always ask for a written, updated offer letter before accepting or resigning from anything else. Verbal promises can be forgotten; written offers can't.", analogy: "A handshake is nice, but the signed paper is what actually holds.", check: { statement: 'A verbally agreed salary change is just as reliable as getting the updated offer in writing.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ne3', type: 'decision', title: 'The Reply',
            prompt: "The recruiter replies: \"We can't move on base salary, but we do have some flexibility on signing bonus and start date.\" What's the smartest next move?",
            hintText: "Is base salary the only lever worth pulling?",
            choices: [
              { id: 'a', label: "Drop the conversation since base salary won't change", outcome: { text: "The signing bonus and start-date flexibility mentioned go completely unexplored.", delta: {}, compare: [{ label: 'Value captured', value: 0 }, { label: 'Value available', value: 1 }] } },
              { id: 'b', label: 'Follow up asking specifically about the signing bonus and flexible start date', outcome: { text: "Real value on the table gets captured instead of left unaddressed.", delta: {}, compare: [{ label: 'Value captured', value: 1 }, { label: 'Value left unexplored', value: 0 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'ne4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [1, 6],
            hintTexts: [
              "Think about what actually makes a negotiation ask effective.",
              "Think about what to check before accepting a signing bonus offer."
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'scams', title: 'Scams & Fraud Prevention', icon: '11', iconColor: 'rust', xpReward: 30,
    hook: 'You get a text: "Your financial aid is on hold. Click here to verify your bank info within 24 hours or funds will be released to another account." Your stomach drops for a second. Is this real?',
    desc: 'The scams that specifically target college students — fake jobs, housing fraud, financial aid phishing, identity theft, P2P payment traps, and online shopping scams — and exactly how to spot them before they cost you anything.',
    questions: [
      {
        q: 'You\'re offered a remote job paying $35/hour with almost no interview. The recruiter only messages you on WhatsApp and asks for your bank routing number to "set up payroll" before you\'ve signed anything. What\'s the biggest red flag?',
        opts: ['The pay is too high for a remote job', 'Legitimate employers collect banking details through official onboarding after you\'ve accepted a signed offer, never before, and never over an unofficial channel like a personal chat app', 'WhatsApp is against most employers\' policy', 'Nothing — this is normal for remote jobs'],
        correct: 1,
        exp: 'Real employers set up direct deposit through HR onboarding after you\'re hired, not through a personal messaging app before you\'ve even had a real interview. Pay-first, verify-later is backwards for a reason.'
      },
      {
        q: 'A "company" sends you a check for $2,400 to cover home office equipment, and asks you to deposit it, keep $400, and wire the rest back to a vendor. What is this?',
        opts: ['A generous employer-provided equipment stipend', 'A classic overpayment check scam — the check will bounce days later, and you\'re on the hook for every dollar you already wired out', 'A normal part of remote onboarding', 'A sign the company is very well funded'],
        correct: 1,
        exp: 'Banks must let you access "available" funds within a few days, but a fraudulent check can take weeks to actually bounce. By the time it does, your wired money is gone and you owe the bank the full amount.'
      },
      {
        q: 'A listing for a $650/month apartment near campus (market rate is $1,100+) asks for a $500 deposit via Venmo before a showing, and the "landlord" says they\'re overseas and can\'t meet in person. What should you do?',
        opts: ['Send the deposit quickly before someone else takes it', 'Never pay any money before touring the actual unit in person and confirming the lister is the real owner or a licensed agent', 'Ask for a video call as a fair compromise', 'It\'s fine as long as the listing looks professional'],
        correct: 1,
        exp: 'A price dramatically below market, pressure to act fast, and an inability to meet or show the unit are the three classic housing-scam signals together. Never pay before you\'ve physically seen the place and verified who you\'re paying.'
      },
      {
        q: 'You found the listing on Zillow, a platform you trust. Does that guarantee it\'s a real listing from the actual owner?',
        opts: ['Yes — Zillow verifies every listing before it goes live', 'No — scammers regularly copy real listings and repost them on legitimate platforms, so the platform\'s reputation doesn\'t vouch for any one listing', 'Yes, but only for listings marked "verified"', 'No major platform has ever had a fake listing'],
        correct: 1,
        exp: 'Being on a reputable platform like Zillow or Apartments.com doesn\'t mean a listing was screened for fraud — it just means someone posted it. Scammers exploit that borrowed trust deliberately.'
      },
      {
        q: 'You get an email claiming to be from FAFSA asking you to "verify your account" by clicking a link and entering your Social Security number. The real site is studentaid.gov. What should you check first?',
        opts: ['Whether the email has an official-looking logo', 'The actual URL the link points to — phishing links often use lookalike domains that are NOT the real .gov domain, no matter how official the email looks', 'Whether the email is well-written', 'Whether it was sent during business hours'],
        correct: 1,
        exp: 'Real federal financial aid sites end in .gov. A lookalike domain is not the same domain, no matter how convincing the email around it is. Always check the actual URL before entering anything.'
      },
      {
        q: 'A scholarship offer requires a $75 "processing fee" before they\'ll release your award. What\'s the rule of thumb here?',
        opts: ['This is standard for competitive scholarships', 'Legitimate scholarships never require you to pay money to receive money — any fee required upfront is almost certainly a scam', '$75 is a small enough amount that it\'s worth the risk', 'Only fake scholarships are ever advertised by email'],
        correct: 1,
        exp: 'This is one of the most reliable rules in financial aid: real scholarships pay you, they never ask you to pay them first. A processing fee required before payout is a scam, full stop.'
      },
      {
        q: 'You get a text saying your bank account has been "locked for suspicious activity" with a link to "verify" your login, plus a countdown timer. What\'s the safest move?',
        opts: ['Click the link quickly since there\'s a time limit', 'Don\'t click the link — open your bank\'s app or site directly, typed in yourself, or call the number on the back of your card', 'Reply to the text asking if it\'s real', 'Forward it to a friend to ask what they think'],
        correct: 1,
        exp: 'Urgency and countdown timers are a manipulation tactic, not a real security feature. Legitimate banks don\'t threaten to lock your account in a text with a clickable link. Always navigate to your bank directly instead.'
      },
      {
        q: 'If someone\'s email and password get exposed in a data breach, and they only change their password on that one breached site, are they now safe?',
        opts: ['Yes, changing that one password fixes the problem', 'No — if they reused that password anywhere else, attackers run "credential stuffing" attacks trying the same combo across many other sites automatically', 'Yes, as long as they wait 30 days', 'Only if the breach was a bank'],
        correct: 1,
        exp: 'Credential stuffing is exactly why reusing passwords is risky: one breach can compromise every account that shares that password. The fix is changing it everywhere it was reused, plus a password manager and 2FA.'
      },
      {
        q: 'You sell a jacket online. The buyer "accidentally" sends you $50 more than agreed and asks you to refund the difference via Venmo right away. What\'s happening?',
        opts: ['They just made an honest mistake, refund them immediately', 'This is a common scam — the original payment is often reversed or fraudulent after you send the "refund," leaving you out the money you sent back', 'This is illegal on the buyer\'s part but harmless to you', 'It\'s fine as long as you get a screenshot first'],
        correct: 1,
        exp: 'The overpayment-then-refund-request pattern is well known: the first payment gets reversed after you\'ve already sent real money back. If a payment is "wrong," cancel the original transaction instead of sending new money.'
      },
      {
        q: 'Why is it riskier to pay a stranger through Venmo, Cash App, or Zelle than with a credit card?',
        opts: ['There\'s no real difference between them', 'P2P apps are built for paying people you already trust — once money is sent, there is generally no fraud protection or dispute process, unlike a credit card', 'P2P apps always charge higher fees', 'Credit cards are slower, which is the only real difference'],
        correct: 1,
        exp: 'Credit cards come with built-in fraud protection and a formal dispute process. Venmo, Cash App, and Zelle are designed for people you already know — once that money moves, it\'s very hard to get back, which is exactly why scammers prefer them.'
      },
      {
        q: 'A clearance site is selling everything at 80% off, was registered three weeks ago, and offers an extra 10% off if you pay with a gift card instead of a credit card. What\'s the biggest red flag?',
        opts: ['The discount is too generous to pass up', 'Pushing you toward a gift card — a payment method with no dispute or refund protection — instead of a credit card', 'The site has too many product categories', 'It offers free shipping over $25'],
        correct: 1,
        exp: 'Gift cards and wire transfers can\'t be reversed if an order never shows up. A site that specifically rewards you for using the least-protected payment method is showing its hand.'
      },
      {
        q: 'You\'re about to buy from an online store you\'ve never heard of. Which detail should worry you the most?',
        opts: ['It has a simple, modern-looking website', 'It was registered a few weeks ago, has no customer service number, and every review is five stars and posted this week', 'It sells more than one type of product', 'It has a countdown timer for a holiday sale'],
        correct: 1,
        exp: 'A brand-new site with no way to reach a real person and a wall of suspiciously uniform, recent reviews are the two most reliable warning signs of a fake storefront — much more telling than a countdown timer alone.'
      }
    ],
    lessons: [
      { title: 'Fake Job Offers', hook: 'A remote job posting offers $35/hour, almost no interview, and asks to talk over WhatsApp instead of email. It sounds like a huge win. What is it actually testing you on?', qIndices: [0, 1] },
      { title: 'Housing Scams', hook: 'A $650/month apartment shows up near campus — half the going rate — and the "landlord" just needs a deposit before showing it in person. Great deal, or something else?', qIndices: [2, 3] },
      { title: 'Financial Aid & Scholarship Fraud', hook: 'An email says your FAFSA needs "verification" and links to a login page that looks exactly like studentaid.gov. Does it matter that it looks right?', qIndices: [4, 5] },
      { title: 'Phishing & Identity Theft', hook: 'A text claims your bank account is locked, with a countdown clock and a link to fix it right now. Is the urgency the point, or a warning sign?', qIndices: [6, 7] },
      { title: 'Peer-to-Peer Payment Scams', hook: 'A buyer on a marketplace app "accidentally" overpays you and asks for the difference back over Venmo, right now. What actually happens to that first payment?', qIndices: [8, 9] },
      { title: 'Online Shopping & Marketplace Scams', hook: 'An ad promises a gadget at 80% off from a site that didn\'t exist a month ago, and only takes gift cards or wire transfers. Free shipping, or something else?', qIndices: [10, 11] }
    ],
    quests: [
      {
        id: 'job_scams',
        topic: 'Fake Job Offers',
        character: { name: 'Hammy', tagline: 'Applying to a dozen summer jobs online' },
        initialState: { savings: 450, checking: 200, moneyScore: 50 },
        bossAchievementId: 'scam_spotter',
        chapters: [
          {
            id: 'jb0', type: 'story', title: 'The Perfect Posting',
            beats: [
              { speaker: 'intro', text: "Hammy's applying to summer jobs between classes, mostly remote gigs that fit around a class schedule. One posting stands out immediately: great pay, almost no requirements." },
              { speaker: 'Hammy', text: '"$38 an hour for data entry? And they want to start THIS week? Okay, where do I sign?"' },
              { speaker: 'narrator', text: "Let's slow down before Hammy replies. A posting that looks too good is worth a second look." },
              { speaker: 'Hammy', text: '"Okay, walk me through what to actually check before I reply to anything."' }
            ]
          },
          {
            id: 'jb1', type: 'teach', title: 'Job Post Red Flags',
            concepts: [
              {
                term: 'Pay-Upfront / Overpayment Scam',
                plain: "This is when a \"job\" asks you to pay for training, equipment, or a background check before you start — or sends you a check that's bigger than it should be and asks you to wire part of it back. Either way, money is supposed to flow FROM the employer TO you, never the other way around before you're paid.",
                analogy: 'Think of it like a stranger handing you a $100 bill and asking for $80 back in cash right now, "just to make change." The first bill almost always turns out to be fake.',
                check: { statement: 'A legitimate employer might occasionally ask you to pay a small fee before your first paycheck.', isTrue: false }
              },
              {
                term: 'Vague, Too-Good, Personal-Channel Job Posts',
                plain: "Real job posts are specific about what you'll actually do day to day. Scam posts are often vague on duties but very specific on an unusually high hourly rate, and they push you off the platform fast — into WhatsApp or a personal email — where there's no paper trail and no one moderating.",
                analogy: "It's the same instinct as a stranger at a party who's suspiciously eager to move the conversation somewhere private before you've even exchanged last names.",
                check: { statement: 'Communicating only through a personal messaging app like WhatsApp is a normal part of most hiring processes.', isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'jb_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Pay-Upfront / Overpayment Scam', definition: 'A "job" asking you to pay first, or sending a check to partially wire back.' },
              { term: 'Personal-Channel Push', definition: 'Getting moved off the platform into WhatsApp or personal email, with no paper trail.' },
              { term: 'Direction of Money', definition: 'Money should flow FROM an employer TO you, never the reverse before you\'re paid.' }
            ],
            xpOnComplete: 4
          },
          {
            id: 'jb_h1', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "Fun fact: legitimate companies almost always have a verifiable presence, an official careers page, a LinkedIn company profile with real employees, reviews on Glassdoor. A quick search before replying costs nothing and catches most fakes instantly.",
            xpOnComplete: 1
          },
          {
            id: 'jb2', type: 'spotcheck', title: 'Spot the Red Flags',
            intro: "Below is a real-looking job posting. Tap every phrase you think is a red flag, then hit Continue to see what you caught.",
            postingTitle: 'Remote Data Entry Assistant — $38/hr, Start This Week!',
            segments: [
              { id: 's1', text: 'Fully remote, flexible hours, no experience required.', isRedFlag: false, explanation: "Plenty of real remote jobs advertise this honestly — on its own this isn't suspicious." },
              { id: 's2', text: '$38/hour for basic data entry, immediate start.', isRedFlag: true, explanation: "Pay far above market rate for the skill level described, combined with urgency to start immediately, is a classic lure." },
              { id: 's3', text: 'To begin, message our HR coordinator directly on WhatsApp.', isRedFlag: true, explanation: 'Legitimate companies onboard through official email and HR systems, not personal messaging apps.' },
              { id: 's4', text: 'We will mail you a check for $2,300 to purchase your home office equipment.', isRedFlag: true, explanation: "This is the classic overpayment check setup — you'll be asked to deposit it and wire part back before it bounces." },
              { id: 's5', text: 'Please reply with your full name and preferred start date.', isRedFlag: false, explanation: 'A normal, low-risk request on its own.' },
              { id: 's6', text: 'Before your first check can be issued, send your bank routing and account number to payroll@quik-hire-solutions.net.', isRedFlag: true, explanation: "Real employers collect direct deposit info through secure official onboarding after you're hired, not via a personal email address before any contract exists." }
            ],
            xpOnComplete: 4
          },
          {
            id: 'jb_t2', type: 'teach', title: 'Verifying an Employer Before Replying',
            concepts: [
              {
                term: 'Verifying an Employer',
                plain: "Before responding to any promising job post, a quick check helps: does the company have a real careers page, a LinkedIn company profile with actual employees listed, and reviews you can find independently? A company that's impossible to verify outside the job post itself is a major warning sign.",
                analogy: "It's like checking a restaurant has real reviews and an actual address before ordering, not just trusting the flyer someone handed you.",
                check: { statement: "A company that's impossible to find any information about outside the job posting itself is a warning sign.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'jb_d1', type: 'decision',
            title: "The 'Skills Assessment' Fee",
            prompt: "A different posting says Hammy passed the initial screening, but must pay a $45 'skills assessment platform fee' to proceed to the paid interview round. What should Hammy do?",
            hintText: "Think back to Direction of Money: does a real employer typically charge YOU to be considered for a job?",
            choices: [
              {
                id: 'a', label: "Pay the $45 fee to keep moving forward in the process",
                outcome: {
                  text: "The 'interview' never materializes, and the fee, along with the company, disappears entirely.",
                  delta: { checking: -45, moneyScore: -6 },
                  compare: [{ label: 'Lost to the fee', value: 45 }, { label: 'Lost if declined', value: 0 }]
                }
              },
              {
                id: 'b', label: "Decline, real employers don't charge candidates to be considered",
                outcome: {
                  text: "No loss, and no real interview was ever waiting on the other side of that fee anyway.",
                  delta: { moneyScore: 8 },
                  compare: [{ label: 'Lost if declined', value: 0 }, { label: 'Lost to the fee', value: 45 }]
                }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'jb_ms1', type: 'microsim', title: "Budgeting a Real Job Search",
            prompt: "Hammy has $150 set aside for summer job-search costs (professional clothes, transit to interviews). Help them fit real search costs and savings in without going negative.",
            hintText: "Real job-search costs should never include paying a company just to be considered. Balance both sliders against the $150 total.",
            income: 150,
            fixedCosts: [],
            sliders: [
              { id: 'searchCosts', label: 'Real job-search costs (clothes, transit)', min: 0, max: 100, step: 10, default: 50 },
              { id: 'savings', label: 'Savings deposit', min: 0, max: 150, step: 10, default: 0 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That goes negative. A real job search shouldn't cost more than this budget allows.", ok: false },
              { maxLeftover: 149, text: "Reasonable, and remember: no legitimate employer ever charges you a fee to be considered.", ok: true },
              { maxLeftover: Infinity, text: "Solid, a real job search costs very little, any request for a large upfront fee is the red flag itself.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'jb_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Verifying an Employer', definition: 'Checking for a real careers page, LinkedIn presence, and independent reviews.' },
              { term: 'Skills Assessment Fee Scam', definition: 'Being charged to advance in a hiring process, a request real employers don\'t make.' },
              { term: 'Overpayment Check Scam', definition: "A check for more than owed, with a request to wire back the difference before it bounces." }
            ],
            hintText: "One term is a research HABIT, and the other two are specific SCAM patterns.",
            xpOnComplete: 4
          },
          {
            id: 'jb_poll1', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before we bust some myths, take a guess. Tap True or False, then see the answer.",
            statement: "A job that pays significantly above market rate for the skill level required is usually just a great opportunity.",
            isTrue: false,
            explanation: "It's a myth. Pay far above market rate for simple work, especially paired with urgency, is one of the most common lures in job scams.",
            xpOnComplete: 2
          },
          {
            id: 'jb_myth1', type: 'mythcards', title: 'Job Scam Myths',
            cards: [
              { myth: "A bank deposits a check and clears the funds, so the check must be real.", isTrue: false, explanation: "Banks make funds available quickly, but a fraudulent check can still bounce weeks later, leaving you responsible for the full amount." },
              { myth: "Legitimate employers collect direct deposit information through official onboarding, after a signed offer.", isTrue: true, explanation: "True, never before, and never through a personal chat app." },
              { myth: "Being asked to pay a fee to advance in a hiring process is a normal part of competitive jobs.", isTrue: false, explanation: "Real employers never charge candidates to be considered or to advance in an interview process." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'jb3', type: 'knowledgecheck', title: 'Quick Check', qIndices: [0, 1],
            hintTexts: [
              "Think about WHEN a real employer needs your banking details — before or after you've signed something official?",
              "Think about the direction money is supposed to flow when you're the one being hired."
            ]
          },
          {
            id: 'jb_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Scam-Spotting Confidence Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy get sharper at spotting job scams. Tap each decision to see the impact.",
            hintText: "Verifying employers and refusing any upfront fee are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Verify a company's careers page and LinkedIn presence before replying", scoreDelta: 13, note: "A company that can't be found anywhere else is a major warning sign." },
              { id: 'd2', label: "Refuse to pay any fee to advance in a hiring process", scoreDelta: 12, note: "Real employers never charge candidates money to be considered." },
              { id: 'd3', label: "Send banking details before any signed offer, just to seem eager", scoreDelta: -14, note: "This is exactly the moment a job scam is designed to exploit." },
              { id: 'd4', label: "Deposit an unexpectedly large employer check and wire back the difference", scoreDelta: -13, note: "This is the classic overpayment scam, the check bounces after the wire is already gone." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'jb_t3', type: 'teach', title: 'Reporting Protects Other Students Too',
            concepts: [
              {
                term: 'Reporting a Scam Listing',
                plain: "Beyond protecting yourself, reporting a suspicious listing to the job board and your school's career center can get it taken down before it reaches other students. Scam job posts often target the exact same job boards repeatedly.",
                analogy: "It's like reporting a pothole, fixing it for yourself matters less than making sure the next person doesn't hit it too.",
                check: { statement: "Reporting a suspicious job listing can help protect other students searching the same job boards.", isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'jb4', type: 'bossbattle', title: 'GlobalHire Solutions',
            scenario: "Hammy applied to 12 jobs last week. An email arrives from \"GlobalHire Solutions\" offering $35/hour for a remote position — no interview required. The email says to start immediately and asks for direct deposit info to \"set up payroll\" before anything else is signed.",
            hintText: "Think back to the very first lesson: what's supposed to happen BEFORE an employer ever needs your banking details?",
            choices: [
              {
                id: 'a', label: "Send the direct deposit info right away so payroll is ready before the start date",
                consequence: { text: "Hammy sends the routing and account number. Within days, unauthorized charges show up on the linked account, and \"GlobalHire Solutions\" stops responding entirely. There was never a real job.", delta: { savings: -300 }, xpMultiplier: 0.75 }
              },
              {
                id: 'b', label: "Ignore the email and delete it without responding",
                consequence: { text: "Hammy deletes the email. Safe — but the listing stays up and keeps targeting other students searching the same job boards.", delta: { savings: 0 }, xpMultiplier: 1 }
              },
              {
                id: 'c', label: "Report the email to the job board and the school's career center, and don't send anything",
                consequence: { text: "Hammy reports it. The career center confirms three other students got the identical message this week and gets the listing taken down before it reaches anyone else.", delta: { savings: 0 }, xpMultiplier: 1.25 }
              }
            ]
          }
        ]
      },
      {
        id: 'housing_scams',
        topic: 'Housing & Rental Scams',
        character: { name: 'Hammy', tagline: "Apartment hunting for next year with two roommates" },
        initialState: { savings: 450, checking: 200, moneyScore: 50 },
        bossAchievementId: 'housing_savvy',
        chapters: [
          {
            id: 'hs0', type: 'story', title: 'The Listing',
            beats: [
              { speaker: 'intro', text: "Hammy and two roommates are hunting for a place near campus for next year, and rent nearby is brutal — most places are well over $1,000 a month." },
              { speaker: 'Hammy', text: '"Wait, this one\'s $650 a month and it looks amazing? That has to be a typo."' },
              { speaker: 'narrator', text: "Maybe. Or maybe it's designed to look too good to pass up. Let's check it out properly before anyone sends a dollar." },
              { speaker: 'Hammy', text: '"Okay, tell me exactly what to check before we get excited about this."' }
            ]
          },
          {
            id: 'hs1', type: 'teach', title: 'Apartment Hunting Red Flags',
            concepts: [
              {
                term: 'Deposit-Before-Viewing',
                plain: "A real landlord or leasing office lets you see the actual unit — in person or on a live video call — before asking for any money. If someone wants a deposit before you've verified the place is real and they're the actual owner or an authorized agent, that's the scam working exactly as designed.",
                analogy: "It's like being asked to pay for a car before test-driving it, sight unseen, from a seller who won't meet you.",
                check: { statement: "It's reasonable to send a deposit to hold an apartment before touring it, as long as the price seems fair.", isTrue: false }
              },
              {
                term: '"Overseas Landlord" + Urgency',
                plain: 'Scammers love a landlord who is conveniently "traveling," "out of the country," or has some other story that explains why they can\'t meet in person or show the unit. Pair that with pressure — "two other people are asking!" — and you\'ve got the two most common ingredients in a rental scam.',
                analogy: "It's the classic sales trick of manufactured scarcity, dressed up as a sympathetic personal story so you feel rude for questioning it.",
                check: { statement: "A landlord who says they are traveling and can't meet in person is, by itself, always a scam.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'hs_m1', type: 'matching', title: 'Match It! Round 1',
            pairs: [
              { term: 'Deposit-Before-Viewing', definition: 'Being asked for money before the unit is verified or shown, the scam working as designed.' },
              { term: '"Overseas Landlord" + Urgency', definition: 'A convenient excuse to avoid meeting, paired with pressure to act fast.' },
              { term: 'Borrowed Platform Trust', definition: "Assuming a listing is legitimate just because it's on a trusted site." }
            ],
            xpOnComplete: 4
          },
          {
            id: 'hs2', type: 'poll', title: 'What Do Most People Think?',
            intro: "Before Hammy deals with this listing, take a guess. Tap True or False, then see the answer.",
            statement: 'If an apartment listing is posted on Zillow or Apartments.com, it must be legitimate.',
            isTrue: false,
            explanation: "It's a myth. Scammers regularly post on trusted, legitimate platforms — the platform hosting a listing doesn't mean anyone verified who posted it or that the deal is real.",
            xpOnComplete: 2
          },
          {
            id: 'hs_t2', type: 'teach', title: 'Verifying the Real Owner',
            concepts: [
              {
                term: 'Verifying Ownership',
                plain: "Beyond touring the unit, it's worth confirming the person you're paying actually owns or manages the property, county property records are often public and searchable online, and a legitimate leasing office will have a real address and staff you can call.",
                analogy: "It's like checking a car's title matches the seller's name before handing over cash, ownership matters as much as the item itself.",
                check: { statement: "Touring a unit in person is enough on its own, without ever needing to confirm who actually owns it.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hs3', type: 'decision', title: 'The Move-In Deadline',
            prompt: "A listing near campus looks perfect: $650/month when everything else nearby runs $1,100+, photos look real, and the \"landlord\" says they're traveling for work but will mail the keys once you Venmo a $500 deposit. Move-in is in 3 days, and they mention two other people are asking about it too. What does Hammy do?",
            hintText: "Think about all three signals together: price, urgency, and whether the place can actually be verified.",
            choices: [
              {
                id: 'a', label: "Send the $500 deposit today so the apartment doesn't slip away",
                outcome: { text: "Hammy sends the deposit. The \"landlord\" stops responding within a day. There is no apartment, no keys, and no way to get the money back through Venmo.", delta: { savings: -500 }, compare: [{ label: 'Sent', value: 500 }, { label: 'Recovered', value: 0 }] }
              },
              {
                id: 'b', label: "Ask to tour the unit in person or on a live video call before sending anything",
                outcome: { text: "The \"landlord\" makes excuses and goes quiet once Hammy pushes for a real tour. That's $500 that never left the account for an apartment that never existed.", delta: { savings: 0 }, compare: [{ label: 'Lost', value: 0 }, { label: 'Deposit avoided', value: 500 }] }
              },
              {
                id: 'c', label: "Report the listing and start looking somewhere else",
                outcome: { text: "Hammy flags the listing to the platform and moves on. A few weeks later, a friend mentions the exact same photos showed up under a different \"landlord\" name — Hammy wasn't the only target.", delta: { savings: 0 }, compare: [{ label: 'Lost', value: 0 }, { label: 'Deposit avoided', value: 500 }] }
              }
            ],
            xpOnComplete: 5
          },
          {
            id: 'hs_ms1', type: 'microsim', title: "Budgeting a Real Deposit Safely",
            prompt: "Hammy's real, verified apartment needs a $500 deposit plus first month's $1,100 rent, split three ways with roommates. Help Hammy fit their $550 share and some savings in without going negative.",
            hintText: "Hammy's share of deposit + rent is $550 total. Balance that against savings from a $700 available amount.",
            income: 700,
            fixedCosts: [
              { label: "Hammy's share of deposit + first month's rent", amount: 550 }
            ],
            sliders: [
              { id: 'savings', label: 'Savings kept as a cushion', min: 0, max: 150, step: 10, default: 0 },
              { id: 'discretionary', label: 'Move-in extras', min: 0, max: 150, step: 10, default: 20 }
            ],
            feedbackTiers: [
              { maxLeftover: -1, text: "That goes negative. Try smaller amounts on one of the sliders.", ok: false },
              { maxLeftover: 19, text: "It fits, a verified deposit is a real cost worth planning for.", ok: true },
              { maxLeftover: Infinity, text: "Solid, the real deposit is covered with a cushion still intact.", ok: true }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hs_m2', type: 'matching', title: 'Match It! Round 2',
            pairs: [
              { term: 'Verifying Ownership', definition: 'Confirming the person collecting rent actually owns or manages the property.' },
              { term: 'Wire Transfer Risk', definition: 'A payment method with even less recourse than Venmo once money is sent.' },
              { term: 'Live Video Tour', definition: 'A reasonable substitute for an in-person tour when distance makes it hard to visit.' }
            ],
            hintText: "One term is about confirming WHO owns the place, one is about a risky PAYMENT method, and one is a reasonable ALTERNATIVE to an in-person visit.",
            xpOnComplete: 4
          },
          { id: 'hs4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [2, 3],
            hintTexts: [
              "Think about the three signals together: a price that's too good, pressure to act fast, and no way to actually see the place.",
              "A platform hosting a listing isn't the same as that platform verifying who posted it."
            ]
          },
          { id: 'hs5', type: 'hint', tag: "🎉 Hammy's Tip",
            text: "You don't need to treat every listing or DM like a threat — most apartments are exactly what they say they are. The goal isn't paranoia, it's knowing the handful of patterns that actually matter, so you can move fast and confident on the real ones.",
            xpOnComplete: 1
          },
          {
            id: 'hs_myth1', type: 'mythcards', title: 'Housing Scam Myths',
            cards: [
              { myth: "A listing on a trusted platform like Zillow is guaranteed to be legitimate.", isTrue: false, explanation: "Scammers regularly post on trusted platforms, the platform's reputation doesn't vouch for any one listing." },
              { myth: "A live video call touring the unit is a reasonable substitute for an in-person visit when distance is a factor.", isTrue: true, explanation: "True, the key is seeing the actual unit live, not just photos, regardless of the format." },
              { myth: "A wire transfer offers similar protection to a credit card if a rental deal turns out to be fake.", isTrue: false, explanation: "Wire transfers have very little recourse once sent, often even less than P2P apps like Venmo." }
            ],
            xpPerCorrect: 2
          },
          {
            id: 'hs_sim1', type: 'simulator', simulatorId: 'credit-climb', title: 'Housing-Search Confidence Climb',
            meterKey: 'moneyScore', meterMin: 0, meterMax: 100,
            intro: "Watch Hammy get sharper at spotting housing scams. Tap each decision to see the impact.",
            hintText: "Insisting on a real tour and verifying ownership are what drive most of the gains here.",
            decisions: [
              { id: 'd1', label: "Insist on touring the unit, in person or live video, before paying anything", scoreDelta: 14, note: "This single habit catches nearly every fake listing before money moves." },
              { id: 'd2', label: "Verify the actual owner through public property records", scoreDelta: 9, note: "Confirming who actually owns the property adds another layer of protection." },
              { id: 'd3', label: "Send a deposit because the listing said two other people were asking", scoreDelta: -13, note: "Manufactured urgency is one of the most common rental-scam tactics." },
              { id: 'd4', label: "Switch to a wire transfer because the \"landlord\" says Venmo is having issues", scoreDelta: -11, note: "A payment method switch away from any buyer protection is a major warning sign." }
            ],
            xpOnComplete: 6
          },
          {
            id: 'hs_t3', type: 'teach', title: 'When a Deal Is Actually Real',
            concepts: [
              {
                term: 'Confidence, Not Paranoia',
                plain: "The goal isn't suspicion of every listing, most apartments are exactly what they say they are. It's recognizing the handful of patterns, payment before viewing, urgency, an unreachable owner, so real deals can move fast with confidence and fake ones get caught early.",
                analogy: "It's like knowing the specific signs of a counterfeit bill, not distrusting every dollar you're handed, just knowing what to check.",
                check: { statement: "The goal of learning these patterns is to treat every listing with equal suspicion.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'hs6', type: 'bossbattle', title: 'The Wire Transfer "Upgrade"',
            scenario: "A different listing looks just as good, but this \"landlord\" says Venmo has been giving them trouble lately, and asks Hammy to wire the deposit directly to a bank account instead — for \"security.\" Move-in is supposedly next week.",
            hintText: "A payment method switch that removes buyer protection is still a payment-before-viewing problem underneath.",
            choices: [
              { id: 'a', label: 'Wire the deposit since a bank transfer sounds more official than Venmo', consequence: { text: "The account goes silent within hours. A wire transfer has even less recourse than Venmo — this money is gone for good.", delta: { savings: -500 }, xpMultiplier: 0.6 } },
              { id: 'b', label: 'Ask to see the unit in person first, regardless of payment method', consequence: { text: "The \"landlord\" stalls and eventually stops replying. No deposit was ever sent for a place that never existed.", delta: { savings: 0 }, xpMultiplier: 1.25 } },
              { id: 'c', label: 'Report the listing and keep looking', consequence: { text: "Hammy flags it and moves on — and the roommates find a legitimate place within the week by touring in person first.", delta: { savings: 0 }, xpMultiplier: 1 } }
            ]
          }
        ]
      },
      {
        id: 'aid_scams',
        topic: 'Financial Aid & Scholarship Fraud',
        character: { name: 'Hammy', tagline: 'Renewing FAFSA before the deadline' },
        initialState: { savings: 450 },
        chapters: [
          {
            id: 'af0', type: 'story', title: 'The Verification Email',
            beats: [
              { speaker: 'intro', text: "FAFSA renewal is due soon, and Hammy's inbox is full of financial aid emails — real reminders from the school, newsletter blasts, and now one that says the account needs \"urgent verification.\"" },
              { speaker: 'Hammy', text: '"It says click here to verify my info or my aid gets delayed. The logo looks right..."' },
              { speaker: 'narrator', text: "Looking right and being right aren't the same thing. Let's actually check where that link goes." }
            ]
          },
          {
            id: 'af1', type: 'teach', title: 'Reading a URL Like It Matters',
            concepts: [
              {
                term: 'Anatomy of a URL',
                plain: "A web address breaks into parts: the protocol (https://), then the actual domain — the part that matters most for trust — then anything after a slash (/), which is just a page on that site. Scammers exploit the fact that most people glance at a URL instead of reading it carefully.",
                analogy: 'Think of the domain like a street address. Scammers can put "123 Main Street" in big letters on a building that\'s actually located somewhere completely different — the big letters are for show.',
                check: { statement: "If a URL contains the words \"student aid\" or \"gov\" anywhere in the address, it's safe to trust.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'af2', type: 'urlinspect', title: 'Real URL or Fake?',
            intro: "Here's a link claiming to be from the FAFSA / Federal Student Aid office. Tap the part of the URL you think is suspicious, then hit Continue to see the full breakdown.",
            url: 'https://studentaid-gov.verify-account.net/login',
            parts: [
              { id: 'p1', segment: 'https://', isSuspicious: false, note: "HTTPS just means the connection is encrypted — scam sites can have this too. It doesn't prove legitimacy on its own." },
              { id: 'p2', segment: 'studentaid-gov.', isSuspicious: true, note: 'This LOOKS like "studentaid.gov" but it isn\'t — it\'s a made-up subdomain designed to trick a quick glance. It has nothing to do with the real government site.' },
              { id: 'p3', segment: 'verify-account.net', isSuspicious: true, note: 'This is the actual domain the link goes to — not a government site at all. Everything before it ("studentaid-gov") is just a decoy label the scammer chose.' },
              { id: 'p4', segment: '/login', isSuspicious: false, note: "A login path is completely normal on real sites too — the problem here isn't the path, it's the domain the whole URL actually points to." }
            ],
            correctAnswerNote: 'The real Federal Student Aid site is exactly studentaid.gov — no extra words before or after the domain. Anything else, no matter how official-looking, is not the government.',
            xpOnComplete: 4
          },
          {
            id: 'af3', type: 'mythcards', title: 'Financial Aid Myths',
            cards: [
              { myth: 'A scholarship that requires a small "processing fee" is fine as long as the payout is much bigger.', isTrue: false, explanation: 'Real scholarships never require you to pay to receive money. Any upfront fee — no matter how small compared to the promised award — is a hallmark of a scam.' },
              { myth: 'The real FAFSA / Federal Student Aid site is studentaid.gov, and legitimate government sites use the .gov domain.', isTrue: true, explanation: 'Correct — .gov is a restricted domain that scammers cannot simply purchase the way they can a lookalike .net or .com.' },
              { myth: 'If a financial aid email addresses you by name and mentions your actual school, it must be legitimate.', isTrue: false, explanation: 'Scammers can find your name and school easily — social media, public directories, even a previous data breach — and use them to make phishing feel personalized.' }
            ],
            xpPerCorrect: 2
          },
          { id: 'af4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [4, 5],
            hintTexts: [
              "Look at the actual domain, not just how official the surrounding email looks.",
              "Remember the one-sentence rule: real scholarships pay you, not the other way around."
            ]
          },
          {
            id: 'af5', type: 'bossbattle', title: 'The Scholarship "Processing Fee"',
            scenario: "A scholarship search site emails Hammy: you've been \"pre-selected\" for a $2,500 award, but a $75 refundable \"processing fee\" is required within 48 hours to release the funds.",
            hintText: "Which direction is money supposed to move when someone owes YOU an award?",
            choices: [
              { id: 'a', label: 'Pay the $75 fee to unlock the $2,500 award', consequence: { text: "The $75 goes through instantly. The promised $2,500 never arrives, and the site stops responding to emails.", delta: { savings: -75 }, xpMultiplier: 0.6 } },
              { id: 'b', label: "Skip it — real scholarships don't charge you to pay you", consequence: { text: "Hammy deletes the email. No award existed to begin with — this was the scam's entire business model.", delta: { savings: 0 }, xpMultiplier: 1.25 } },
              { id: 'c', label: "Report it to the school's financial aid office and ask if it's legitimate", consequence: { text: "The financial aid office confirms it's a known scam circulating that semester and helps get it reported.", delta: { savings: 0 }, xpMultiplier: 1.1 } }
            ]
          }
        ]
      },
      {
        id: 'phishing_scams',
        topic: 'Phishing & Identity Theft',
        character: { name: 'Hammy', tagline: 'A suspicious text about a "locked" bank account' },
        initialState: { savings: 450 },
        chapters: [
          {
            id: 'ph0', type: 'story', title: 'The Countdown Timer',
            beats: [
              { speaker: 'intro', text: "A text lands on Hammy's phone: \"Your account has been locked for suspicious activity. Verify now or funds may be restricted.\" There's a countdown clock ticking down from 10 minutes." },
              { speaker: 'Hammy', text: '"Ten minutes? Okay, I need to click this right now before something bad happens."' },
              { speaker: 'narrator', text: "That rush to act fast is the whole point of the message. Let's figure out what's actually going on before tapping anything." }
            ]
          },
          {
            id: 'ph1', type: 'teach', title: 'Spotting Phishing',
            concepts: [
              {
                term: 'Spoofed Senders & Urgency Language',
                plain: "Scammers can make an email or text LOOK like it's from your bank, your school, or the government — the display name and even the sender address can be faked or made to look extremely close to the real one. Pair that with words like \"immediately\" or a countdown timer, and it's designed to make you act before you think.",
                analogy: "It's a fire alarm pulled by someone who wants you running toward the exit they chose, not thinking clearly about whether there's actually a fire.",
                check: { statement: "If a message looks like it's from your bank and creates a sense of urgency, that combination alone is a reason to slow down, not speed up.", isTrue: true }
              },
              {
                term: 'Fake Login Pages',
                plain: "A phishing link often leads to a page that looks nearly identical to a real login screen — same logo, same colors, sometimes the same layout. The only reliable way to tell is the URL in your browser's address bar, not how the page looks.",
                analogy: "It's a stage set built to look exactly like a real store from the front, but there's nothing behind the wall.",
                check: { statement: "If a login page looks exactly like your bank's real site, that's enough proof it's safe to enter your password.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ph2', type: 'poll', title: 'What Do Most People Think?',
            intro: "Take a guess before we move on. Tap True or False, then see the answer.",
            statement: 'If someone\'s email and password are exposed in a data breach, changing the password on that one site is enough to stay safe.',
            isTrue: false,
            explanation: "It's a myth. Credential stuffing means attackers try that same email/password combo across many other sites automatically — reused passwords are the real risk, not just the one breached site.",
            xpOnComplete: 2
          },
          {
            id: 'ph3', type: 'teach', title: 'If Your Identity Is Stolen',
            concepts: [
              {
                term: 'Reporting & Freezing',
                plain: "If you think your identity has been stolen — someone opened an account, filed taxes, or applied for aid in your name — report it at IdentityTheft.gov (run by the FTC) for a personalized recovery plan, and place a free credit freeze with all three credit bureaus (Equifax, Experian, TransUnion) so no new accounts can be opened in your name.",
                analogy: "A credit freeze is like changing the locks — it doesn't undo what already happened, but it stops anyone from walking back in through that same door.",
                check: { statement: 'A credit freeze costs money and can only be placed a limited number of times per year.', isTrue: false }
              },
              {
                term: 'Tell Your School',
                plain: "If the theft touches your financial aid — a fake FAFSA submission, a compromised student portal login — notify your school's financial aid office directly. They can flag your account and make sure a fraudulent submission doesn't mess with your real aid.",
                analogy: "Your financial aid office is the one place that can actually undo damage done inside the financial aid system itself — the credit bureaus can't touch that part.",
                check: { statement: "Once you've frozen your credit, there's no need to also tell your school's financial aid office about aid-related identity theft.", isTrue: false }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'ph4', type: 'poll', title: 'What Do Most People Think?',
            intro: "One more before the quick check. Tap True or False, then see the answer.",
            statement: 'Financial aid offices will sometimes email students asking them to confirm their bank account details.',
            isTrue: false,
            explanation: "It's a myth — and an important one. Real financial aid offices will never ask you to confirm bank account details over email. Any message that does is impersonating them.",
            xpOnComplete: 2
          },
          { id: 'ph5', type: 'knowledgecheck', title: 'Quick Check', qIndices: [6, 7],
            hintTexts: [
              "Focus on what's designed to make you feel rushed, not on how official the message looks.",
              "Think about what actually protects you: your own habits, not how much time has passed."
            ]
          },
          {
            id: 'ph6', type: 'bossbattle', title: 'The Locked Account Text',
            scenario: "The countdown from that text hits zero. A second, more urgent message arrives with a link and the words \"FINAL NOTICE.\"",
            hintText: "What did the URL-anatomy lesson say to check before trusting any link, no matter how urgent it looks?",
            choices: [
              { id: 'a', label: 'Tap the link now, before the account actually gets locked', consequence: { text: "The page looks exactly like the real bank login — because it's built to. Hammy's real credentials just went straight to a scammer.", delta: { savings: -200 }, xpMultiplier: 0.6 } },
              { id: 'b', label: "Ignore the text and open the bank's app directly to check", consequence: { text: "The real app shows nothing wrong — no lock, no alert. The text was fake from the start.", delta: { savings: 0 }, xpMultiplier: 1.25 } },
              { id: 'c', label: 'Call the number on the back of the debit card to ask', consequence: { text: "The real bank confirms there's no issue and flags the number the text came from as a known scam line.", delta: { savings: 0 }, xpMultiplier: 1.1 } }
            ]
          }
        ]
      },
      {
        id: 'p2p_scams',
        topic: 'Peer-to-Peer Payment Scams',
        character: { name: 'Hammy', tagline: 'Selling old textbooks and furniture online' },
        initialState: { savings: 450 },
        chapters: [
          {
            id: 'p2p0', type: 'story', title: 'The Accidental Overpayment',
            beats: [
              { speaker: 'intro', text: "Hammy's selling a mini fridge and a stack of old textbooks on a local marketplace app before moving out for the summer. A buyer messages about the fridge right away." },
              { speaker: 'Hammy', text: '"They just sent me $50 more than we agreed on and asked for the difference back over Venmo. Weird, but I guess people fat-finger the amount sometimes?"' },
              { speaker: 'narrator', text: "Maybe. Or maybe that first payment isn't as real as it looks. Let's check before sending anything back." }
            ]
          },
          {
            id: 'p2p1', type: 'teach', title: 'Peer-to-Peer Payment Scams',
            concepts: [
              {
                term: 'No Fraud Protection, No Undo Button',
                plain: "Venmo, Cash App, and Zelle are built to move money between people who already trust each other — splitting rent, paying a friend back. Once you hit send, that money is very hard or impossible to get back, and unlike a credit card, there's generally no formal dispute process on the other end.",
                analogy: "It's the difference between handing someone cash and swiping a credit card — cash doesn't come with a receipt you can dispute later.",
                check: { statement: "Remember from Managing Credit: credit cards can dispute fraudulent charges, while P2P apps like Venmo generally cannot reverse a payment once it's sent.", isTrue: true }
              },
              {
                term: 'The Overpayment-Then-Refund Trap',
                plain: "A buyer \"accidentally\" sends too much and asks for the difference back. The catch: their original payment often gets reversed or turns out fraudulent AFTER the refund is sent — leaving the seller out both the refund and whatever was never actually paid.",
                analogy: "It's a shell game where the first payment is the shell that disappears right after you look away.",
                check: { statement: 'If someone overpays and asks for a refund of the difference, the safest move is to cancel the original payment rather than send a new one.', isTrue: true }
              }
            ],
            xpOnComplete: 3
          },
          {
            id: 'p2p2', type: 'poll', title: 'What Do Most People Think?',
            intro: "Take a guess before we go further. Tap True or False, then see the answer.",
            statement: 'If a buyer overpays and asks for the difference back, sending the refund quickly is the safest way to resolve it.',
            isTrue: false,
            explanation: "It's a myth. The safest move is to cancel or reverse the ORIGINAL payment through the app first — sending a fresh refund on top of a payment that might not be real just doubles the loss.",
            xpOnComplete: 2
          },
          {
            id: 'p2p3', type: 'decision', title: 'The Refund Request',
            prompt: "The buyer is messaging again, more urgently: \"Can you send that $50 back now? I need to fix this before my bank notices.\" What does Hammy do?",
            hintText: "What happens to the ORIGINAL payment after a refund like this gets sent?",
            choices: [
              { id: 'a', label: 'Send the $50 back right away to be helpful', outcome: { text: "A day later, the original payment reverses as fraudulent. Hammy is out the $50 refund plus the fridge, which the buyer already picked up.", delta: { savings: -50 }, compare: [{ label: 'Lost', value: 50 }, { label: 'Avoided', value: 0 }] } },
              { id: 'b', label: 'Cancel the original transaction through the app instead of sending anything new', outcome: { text: "The app flags the original payment as fraudulent before anything is sent back. Nothing is lost.", delta: { savings: 0 }, compare: [{ label: 'Lost', value: 0 }, { label: 'Avoided', value: 50 }] } }
            ],
            xpOnComplete: 5
          },
          { id: 'p2p4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [8, 9],
            hintTexts: [
              "Think about what happens to the FIRST payment after the refund is sent.",
              "Compare what a credit card can do that Venmo, Cash App, and Zelle can't."
            ]
          },
          {
            id: 'p2p5', type: 'bossbattle', title: 'The Too-Fast Textbook Buyer',
            scenario: "A different buyer wants all of Hammy's old textbooks, sight unseen, and offers to pay double the asking price by Zelle immediately, no questions asked, then asks Hammy to ship them same-day.",
            hintText: "An unusually generous, rushed offer is a pattern worth recognizing by now.",
            choices: [
              { id: 'a', label: 'Accept and ship immediately since the payment already went through', consequence: { text: "The Zelle payment reverses days later as unauthorized. The textbooks are gone and the money is gone with them.", delta: { savings: -120 }, xpMultiplier: 0.6 } },
              { id: 'b', label: 'Wait a few days to confirm the payment fully clears before shipping anything', consequence: { text: "The payment reverses within 48 hours, exactly as expected. Nothing shipped, nothing lost.", delta: { savings: 0 }, xpMultiplier: 1.25 } },
              { id: 'c', label: 'Ask the buyer to meet in person for a local, in-hand exchange instead', consequence: { text: "The buyer stops responding the moment cash-in-hand is suggested — a strong sign it was never a real sale.", delta: { savings: 0 }, xpMultiplier: 1.1 } }
            ]
          }
        ]
      },
      {
        id: 'shopping_scams',
        topic: 'Online Shopping & Marketplace Scams',
        character: { name: 'Hammy', tagline: 'Hunting for a cheap deal on dorm essentials' },
        initialState: { savings: 450 },
        chapters: [
          {
            id: 'sh0', type: 'story', title: 'The Too-Good Deal',
            beats: [
              { speaker: 'intro', text: "Hammy needs a new laptop stand and a couple of dorm essentials, and a targeted ad shows up for a clearance site selling everything at 80% off." },
              { speaker: 'Hammy', text: '"Wait, this laptop stand is $8 instead of $40? And the whole site is like this? I\'m stocking up."' },
              { speaker: 'narrator', text: "Before Hammy fills a cart, let's actually look at what's on this page." }
            ]
          },
          {
            id: 'sh1', type: 'teach', title: 'Fake Storefronts & Too-Good Deals',
            concepts: [
              {
                term: 'Brand-New, Reviewless Stores',
                plain: "Scam storefronts are often only weeks old, with no reviews outside the ones built into the site itself, and no verifiable business address or customer service phone number. A real retailer selling everything at 80% off with zero track record is a contradiction.",
                analogy: "It's like a pop-up shop with no name on the door and no way to find them again if something goes wrong.",
                check: { statement: "A store with glowing reviews only on its own website is a reliable sign that it's trustworthy.", isTrue: false }
              },
              {
                term: 'Checkout Red Flags',
                plain: "Legitimate stores let you pay with a credit card. Scam storefronts often push you toward payment methods with no buyer protection — wire transfer, gift cards, or cryptocurrency — sometimes offering an extra discount specifically for using them.",
                analogy: "A cashier who only takes cash under the table isn't operating like a normal cashier.",
                check: { statement: "A discount for paying with gift cards or crypto instead of a credit card is a bonus with no downside.", isTrue: false }
              }
            ],
            xpOnComplete: 2
          },
          {
            id: 'sh2', type: 'spotcheck', title: 'Spot the Red Flags',
            intro: "Below is a real-looking product page. Tap every phrase you think is a red flag, then hit Continue to see what you caught.",
            postingTitle: 'MEGA CLEARANCE — Everything 80% Off, Today Only!',
            segments: [
              { id: 's1', text: 'Free shipping on orders over $25.', isRedFlag: false, explanation: "A totally normal, common offer on its own." },
              { id: 's2', text: 'Founded 3 weeks ago, no customer service number listed.', isRedFlag: true, explanation: "A brand-new store with no way to reach a real person is a serious warning sign, especially paired with steep discounts." },
              { id: 's3', text: 'Pay by gift card for an extra 10% off.', isRedFlag: true, explanation: "Gift cards can't be reversed or disputed — legitimate stores don't need to push you toward the one payment method with zero protection." },
              { id: 's4', text: 'Countdown timer: "Sale ends in 09:58!"', isRedFlag: true, explanation: "Manufactured urgency is a pressure tactic to stop you from thinking it through or comparing prices elsewhere." },
              { id: 's5', text: '30-day return policy.', isRedFlag: false, explanation: "A normal policy to state, though it only matters if the company is actually reachable when you need it." },
              { id: 's6', text: 'All reviews are 5 stars and posted this week.', isRedFlag: true, explanation: "A wall of suspiciously uniform, brand-new reviews is a common way scam sites fake social proof." }
            ],
            xpOnComplete: 4
          },
          {
            id: 'sh3', type: 'decision', title: 'Checkout Time',
            prompt: "At checkout, the site offers 10% off for paying with a gift card instead of a credit card. What does Hammy do?",
            hintText: "Which payment method actually lets you dispute a charge if the order never shows up?",
            choices: [
              { id: 'a', label: 'Take the extra discount and pay with a gift card', outcome: { text: "The order never arrives. Since gift card payments can't be disputed or reversed, the money is simply gone.", delta: { savings: -80 }, compare: [{ label: 'Lost', value: 80 }, { label: 'Protected', value: 0 }] } },
              { id: 'b', label: 'Skip the discount and pay with a credit card instead', outcome: { text: "The order never arrives either way — but Hammy disputes the charge with the credit card company and gets a full refund.", delta: { savings: 0 }, compare: [{ label: 'Lost', value: 0 }, { label: 'Refunded via dispute', value: 80 }] } }
            ],
            xpOnComplete: 5
          },
          { id: 'sh4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [10, 11],
            hintTexts: [
              "Think about which payment methods actually let you dispute a charge versus which ones are final the moment you pay.",
              "A brand-new store with no way to contact a real person is a pattern worth remembering."
            ]
          },
          {
            id: 'sh5', type: 'bossbattle', title: 'The Viral Gadget Ad',
            scenario: "A social media ad shows a popular gadget at 75% off, ships from overseas, only accepts payment via wire transfer or crypto, and the site was registered two weeks ago.",
            hintText: "Count how many red-flag patterns from this quest are stacked in one place.",
            choices: [
              { id: 'a', label: 'Order it — the ad looked professional and the price is amazing', consequence: { text: "Weeks pass with no package. The site goes offline entirely, and the wire transfer has no way to be reversed.", delta: { savings: -60 }, xpMultiplier: 0.6 } },
              { id: 'b', label: "Look up the exact product on a retailer with a real return policy and pay by credit card instead", consequence: { text: "Hammy finds the same item for a bit more, but from a real store — and it actually arrives, with dispute protection if it hadn't.", delta: { savings: 0 }, xpMultiplier: 1.25 } },
              { id: 'c', label: 'Search the store\'s name plus "scam" before ordering anything', consequence: { text: "The search turns up several recent reports of the same site taking payment and never shipping. Order skipped entirely.", delta: { savings: 0 }, xpMultiplier: 1.1 } }
            ]
          }
        ]
      },
      {
        id: 'romance_scams',
        topic: 'Romance & Social Media Scams',
        character: { name: 'Hammy', tagline: 'Talking to someone online who seems a little too perfect' },
        initialState: {},
        chapters: [
          { id: 'romance_scams_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Romance & Social Media Scams." }
            ]
          }
        ]
      },
      {
        id: 'tech_support_scams',
        topic: 'Tech Support & Impersonation Scams',
        character: { name: 'Hammy', tagline: 'Getting a call claiming to be tech support' },
        initialState: {},
        chapters: [
          { id: 'tech_support_scams_0', type: 'story', title: 'Coming Soon',
            beats: [
              { speaker: 'narrator', text: "This lesson quest is still in the works — check back soon for the full interactive experience on Tech Support & Impersonation Scams." }
            ]
          }
        ]
      },
      {
        id: 'freeze_credit',
        parentQuestId: 'phishing_scams',
        topic: 'Freezing Your Credit & Setting Fraud Alerts: A Step-by-Step Guide',
        character: { name: 'Hammy', tagline: 'Actually locking down accounts after a scare' },
        initialState: {},
        chapters: [
          {
            id: 'fc0', type: 'story', title: 'After the Close Call',
            beats: [
              { speaker: 'intro', text: "Hammy almost fell for a phishing text last week. Knowing identity theft is a risk is one thing — actually freezing credit and setting up fraud alerts is another." }
            ]
          },
          {
            id: 'fc1', type: 'teach', title: 'Step 1 & 2: Contact & Freeze',
            concepts: [
              { term: 'Step 1: Contact All Three Bureaus', plain: "A credit freeze only works if placed at all three bureaus — Equifax, Experian, and TransUnion — since lenders can pull from any one of them. Each has its own free online portal.", analogy: "Locking one door out of three still leaves two open.", check: { statement: 'Freezing your credit at just one bureau is enough to fully protect you.', isTrue: false } },
              { term: 'Step 2: Place the Freeze', plain: "Placing a freeze is free by law and takes about 10 minutes per bureau online. It blocks new accounts from being opened in your name without explicit approval.", analogy: "Like changing the locks — it doesn't undo the past, but stops new break-ins.", check: {} }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fc2', type: 'teach', title: 'Step 3 & 4: Secure & Know the Lift',
            concepts: [
              { term: 'Step 3: Set a PIN', plain: "Each bureau provides a PIN or password when the freeze is placed — save it somewhere secure. That PIN is required to lift the freeze later, so losing it means an extra identity-verification step.", analogy: "It's the key to the lock just placed — worth keeping somewhere safe.", check: {} },
              { term: 'Step 4: Know How to Lift It Later', plain: "A freeze can be lifted temporarily (for a specific lender) or permanently, usually instantly online with the PIN. This matters when applying for a new credit card, apartment, or loan down the line.", analogy: "The lock can be opened again anytime — it's not a permanent barrier, just a default off switch.", check: { statement: 'Once placed, a credit freeze can never be lifted again.', isTrue: false } }
            ],
            xpOnComplete: 3
          },
          {
            id: 'fc3', type: 'decision', title: 'Applying for a New Card',
            prompt: "Six months after freezing credit at all three bureaus, Hammy wants to apply for a new credit card. The application gets rejected due to the freeze.",
            hintText: "Is a credit freeze permanent, or does it need one extra step first?",
            choices: [
              { id: 'a', label: 'Assume credit is permanently broken and give up on the application', outcome: { text: "The freeze is still active and just needs to be lifted first — nothing is actually broken.", delta: {}, compare: [{ label: 'Extra steps needed', value: 1 }, { label: 'Steps if unfrozen first', value: 0 }] } },
              { id: 'b', label: 'Log into the bureau site with the saved PIN and lift the freeze before reapplying', outcome: { text: "A quick PIN-based lift clears the way for the application to go through normally.", delta: {}, compare: [{ label: 'Extra steps needed', value: 0 }, { label: 'Steps if left frozen', value: 1 }] } }
            ],
            xpOnComplete: 4
          },
          {
            id: 'fc4', type: 'knowledgecheck', title: 'Quick Check', qIndices: [6, 7],
            hintTexts: [
              "Think about what actually protects you when a message creates urgency.",
              "Think about what changing just one password does or doesn't fix."
            ]
          }
        ]
      }
    ]
  }
];

// ── Shop items ────────────────────────────────
const SHOP_ITEMS = [
  // ── HATS ──
  {
    id: 'hat_mystery_box', name: 'Hat Mystery Box', category: 'hat', price: 150,
    isMysteryBox: true, mysteryPool: 'hat',
    viewBox: '20 20 80 75',
    desc: 'A random hat, ribbon and all. You never know what you\'ll get!',
    svg: `<defs><linearGradient id="hb-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8FB8"/><stop offset="100%" stop-color="#E0507F"/></linearGradient></defs>
          <rect x="35" y="45" width="50" height="40" rx="3" fill="url(#hb-g)"/>
          <rect x="35" y="45" width="50" height="10" fill="rgba(255,255,255,0.2)"/>
          <rect x="55" y="45" width="10" height="40" fill="#FFD700"/>
          <rect x="35" y="60" width="50" height="10" fill="#FFD700"/>
          <path d="M60,45 Q48,32 40,38 Q38,45 48,46 Q54,46 60,45Z" fill="#FFD700"/>
          <path d="M60,45 Q72,32 80,38 Q82,45 72,46 Q66,46 60,45Z" fill="#FFD700"/>
          <circle cx="60" cy="45" r="4" fill="#FFE87A"/>`
  },
  {
    id: 'party_hat', name: 'Party Hat', category: 'hat', price: 50,
    mysteryOnly: true, mysteryPool: 'hat',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 5 },
    desc: 'Every lesson deserves a celebration.',
    svg: `<defs>
            <linearGradient id="ph-g" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stop-color="#FF8A75"/>
              <stop offset="50%" stop-color="#E5372B"/>
              <stop offset="100%" stop-color="#8A1010"/>
            </linearGradient>
            <linearGradient id="ph-rim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FF5A4A"/>
              <stop offset="100%" stop-color="#7A1010"/>
            </linearGradient>
            <clipPath id="ph-clip"><path d="M 60 4 L 37 27 L 83 27 Z"/></clipPath>
          </defs>
          <ellipse cx="60" cy="28.3" rx="25" ry="5.2" fill="#5E0A0A"/>
          <ellipse cx="60" cy="27" rx="24" ry="4.6" fill="url(#ph-rim)" stroke="#6E0E0E" stroke-width="0.8"/>
          <ellipse cx="60" cy="26.2" rx="18.5" ry="2.4" fill="#3E0606"/>
          <path d="M 60 4 L 37 27 L 83 27 Z" fill="url(#ph-g)"/>
          <path d="M 60 4 L 46 27 L 53 27 Z" fill="rgba(255,255,255,0.22)"/>
          <path d="M 60 4 L 72 27 L 65 27 Z" fill="rgba(0,0,0,0.16)"/>
          <line x1="60" y1="4" x2="60" y2="27" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
          <g clip-path="url(#ph-clip)">
            <circle cx="56" cy="10" r="2" fill="#FFE45A"/>
            <circle cx="65" cy="9" r="1.8" fill="#5AC8FA"/>
            <circle cx="60" cy="14" r="1.6" fill="#FF9ED8"/>
            <circle cx="50" cy="15" r="1.8" fill="#7BE0A0"/>
            <circle cx="70" cy="16" r="1.7" fill="#FFE45A"/>
            <circle cx="58" cy="19" r="1.8" fill="#5AC8FA"/>
            <circle cx="45" cy="20" r="1.6" fill="#FF9ED8"/>
            <circle cx="66" cy="21" r="1.7" fill="#7BE0A0"/>
            <circle cx="75" cy="22" r="1.5" fill="#FFE45A"/>
            <circle cx="41" cy="24" r="1.6" fill="#5AC8FA"/>
            <circle cx="52" cy="25" r="1.7" fill="#FF9ED8"/>
            <circle cx="63" cy="25.5" r="1.6" fill="#7BE0A0"/>
            <circle cx="73" cy="25" r="1.5" fill="#FFE45A"/>
            <circle cx="45" cy="26.5" r="1.4" fill="#FFE45A"/>
            <circle cx="79" cy="26" r="1.4" fill="#5AC8FA"/>
          </g>
          <circle cx="55" cy="0.5" r="3" fill="#FFCE30"/>
          <circle cx="65" cy="0.5" r="3" fill="#FFCE30"/>
          <circle cx="60" cy="-3.5" r="3" fill="#FFDD60"/>
          <circle cx="60" cy="1.5" r="3.6" fill="#FFD240"/>
          <circle cx="58" cy="-1.5" r="1.6" fill="rgba(255,255,255,0.7)"/>`
  },
  {
    id: 'flower_crown', name: 'Flower Crown', category: 'hat', price: 80,
    mysteryOnly: true, mysteryPool: 'hat', rarity: 'epic',
    desc: 'Bloom where you are planted.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 45 },
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
    mysteryOnly: true, mysteryPool: 'hat',
    desc: 'Put a spell on your debt.',
    svg: `<defs>
            <linearGradient id="wh-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#3D2458"/><stop offset="100%" stop-color="#120828"/></linearGradient>
            <radialGradient id="wh-brim-g" cx="45%" cy="30%" r="70%"><stop offset="0%" stop-color="#4A2C68"/><stop offset="100%" stop-color="#160A2C"/></radialGradient>
            <radialGradient id="wh-hl" cx="42%" cy="8%" r="55%"><stop offset="0%" stop-color="rgba(255,255,255,0.22)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient>
            <clipPath id="wh-clip"><path d="M 60 3 L 37 29 L 84 29 Z"/></clipPath>
          </defs>
          <ellipse cx="60" cy="29.5" rx="27" ry="5" fill="url(#wh-brim-g)"/>
          <ellipse cx="60" cy="30.5" rx="27" ry="4.2" fill="#120828"/>
          <ellipse cx="55" cy="27.7" rx="15" ry="1.6" fill="rgba(255,255,255,0.09)"/>
          <path d="M 60 3 L 37 29 L 84 29 Z" fill="url(#wh-g)"/>
          <rect x="37" y="3" width="47" height="26" fill="url(#wh-hl)" clip-path="url(#wh-clip)"/>
          <rect x="36" y="17" width="48" height="6" fill="#7B3FB0" clip-path="url(#wh-clip)"/>
          <rect x="36" y="17" width="48" height="2.4" fill="#8F4FC8" clip-path="url(#wh-clip)"/>
          <rect x="53" y="18.5" width="14" height="5" rx="1.2" fill="#1C0E30"/>
          <rect x="55.2" y="19.5" width="9.6" height="3" rx="0.6" fill="none" stroke="#FFD700" stroke-width="1.3"/>
          <line x1="60" y1="19.5" x2="60" y2="23" stroke="#FFD700" stroke-width="1.3"/>`
  },
  {
    id: 'santa_hat', name: 'Santa Hat', category: 'hat', price: 100,
    mysteryOnly: true, mysteryPool: 'hat',
    desc: 'Ho ho ho, compound interest!',
    svg: `<defs>
            <linearGradient id="sh-g" x1="30%" y1="0%" x2="70%" y2="100%"><stop offset="0%" stop-color="#FF4848"/><stop offset="100%" stop-color="#B81818"/></linearGradient>
            <radialGradient id="sh-hl" cx="38%" cy="15%" r="60%"><stop offset="0%" stop-color="rgba(255,150,150,0.55)"/><stop offset="100%" stop-color="rgba(255,150,150,0)"/></radialGradient>
            <clipPath id="sh-clip"><path d="M 60 4 C 65 8 73 18 76 29 L 36 29 C 40 18 50 10 60 4 Z"/></clipPath>
          </defs>
          <path d="M 60 4 C 65 8 73 18 76 29 L 36 29 C 40 18 50 10 60 4 Z" fill="url(#sh-g)"/>
          <rect x="36" y="4" width="40" height="25" fill="url(#sh-hl)" clip-path="url(#sh-clip)"/>
          <path d="M 60 4 Q 70 1 77 8 Q 82 14 76 19 Q 70 22 63 17 Q 57 11 60 4 Z" fill="url(#sh-g)"/>
          <path d="M 60 4 Q 66 1 72 5" stroke="rgba(255,255,255,0.3)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          <path d="M 34 29 Q 38 23.5 42 27 Q 46 23.5 50 27 Q 54 23.5 58 27 Q 62 23.5 66 27 Q 70 23.5 74 27 Q 78 23.5 82 27 Q 86 29 86 29 L 34 29 Z" fill="white"/>
          <path d="M 34 28 Q 38 23 42 26 Q 46 23 50 26 Q 54 23 58 26 Q 62 23 66 26 Q 70 23 74 26 Q 78 23 82 26 Q 86 28 86 28" stroke="#E8E8E8" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <circle cx="76" cy="18" r="8" fill="white"/>
          <circle cx="73.5" cy="15.5" r="4" fill="#F4F4F4"/>
          <circle cx="79" cy="16.5" r="3.8" fill="#EEEEEE"/>
          <circle cx="76" cy="21.5" r="3.6" fill="#F0F0F0"/>
          <circle cx="73" cy="14.5" r="2.4" fill="rgba(255,255,255,0.92)"/>`
  },
  {
    id: 'top_hat', name: 'Top Hat', category: 'hat', price: 120,
    mysteryOnly: true, mysteryPool: 'hat',
    desc: 'Old money energy.',
    svg: `<defs>
            <linearGradient id="th-cyl" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1C1C1C"/><stop offset="35%" stop-color="#2E2E2E"/><stop offset="100%" stop-color="#0E0E0E"/></linearGradient>
            <linearGradient id="th-brim" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#252525"/><stop offset="100%" stop-color="#080808"/></linearGradient>
          </defs>
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
    mysteryOnly: true, mysteryPool: 'hat', rarity: 'rare',
    desc: 'Cooking up a budget.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 6 },
    svg: `<defs><linearGradient id="ch-dome" x1="30%" y1="0%" x2="70%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#DCDCDC"/></linearGradient></defs>
          <ellipse cx="60" cy="31" rx="24" ry="5" fill="#C4C4C4"/>
          <rect x="39" y="21" width="42" height="11" rx="3" fill="#F0F0F0" stroke="#CCCCCC" stroke-width="1"/>
          <line x1="46" y1="21" x2="46" y2="32" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="53" y1="21" x2="53" y2="32" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="60" y1="21" x2="60" y2="32" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="67" y1="21" x2="67" y2="32" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="74" y1="21" x2="74" y2="32" stroke="#D0D0D0" stroke-width="1.1"/>
          <path d="M 39 21 L 36 -5 Q 36 -9 40 -9 L 80 -9 Q 84 -9 84 -5 L 81 21 Z" fill="url(#ch-dome)" stroke="#D8D8D8" stroke-width="0.6"/>
          <line x1="45" y1="-7.5" x2="46" y2="21" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="52.5" y1="-8.7" x2="53" y2="21" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="60" y1="-9" x2="60" y2="21" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="67.5" y1="-8.7" x2="67" y2="21" stroke="#D0D0D0" stroke-width="1.1"/>
          <line x1="75" y1="-7.5" x2="74" y2="21" stroke="#D0D0D0" stroke-width="1.1"/>
          <ellipse cx="60" cy="-9" rx="22" ry="3" fill="#E8E8E8"/>
          <ellipse cx="52" cy="-6" rx="8" ry="4" fill="rgba(255,255,255,0.5)"/>`
  },
  {
    id: 'cowboy_hat', name: 'Cowboy Hat', category: 'hat', price: 150,
    mysteryOnly: true, mysteryPool: 'hat', rarity: 'rare',
    desc: 'Riding off into a debt-free sunset.',
    svg: `<defs>
            <linearGradient id="cw-crown" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#A87040"/><stop offset="100%" stop-color="#5A3618"/></linearGradient>
            <linearGradient id="cw-brim" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#8C5C28"/><stop offset="100%" stop-color="#482C10"/></linearGradient>
          </defs>
          <ellipse cx="61" cy="30" rx="38" ry="8.5" fill="#3A1C08"/>
          <ellipse cx="60" cy="28.5" rx="37" ry="7.5" fill="url(#cw-brim)"/>
          <path d="M 25 27.5 Q 60 21 95 27.5" stroke="#A06830" stroke-width="2.5" fill="none"/>
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
    mysteryOnly: true, mysteryPool: 'hat', rarity: 'epic',
    desc: 'Yarr, no debt on this ship.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 18 },
    svg: `<defs><linearGradient id="pi-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#282828"/><stop offset="100%" stop-color="#0C0C0C"/></linearGradient></defs>
          <path d="M 32 29 Q 25 10 40 2 Q 48 8 60 4 Q 72 8 80 2 Q 95 10 88 29 Z" fill="#060606"/>
          <path d="M 32 29 Q 25 9 40 1 Q 48 7 60 3 Q 72 7 80 1 Q 95 9 88 29 Z" fill="url(#pi-g)"/>
          <path d="M 32 29 Q 25 9 40 1 Q 44 4 41 14 L 38 29 Z" fill="rgba(255,255,255,0.07)"/>
          <path d="M 22 24 C 25 15 32 7 38 4 L 32 29 C 28 28 24 26 22 24 Z" fill="#1C1C1C"/>
          <path d="M 22 24 C 25 15 32 7 38 4 L 36 12 C 30 15 25 19 22 24 Z" fill="rgba(255,255,255,0.06)"/>
          <path d="M 98 24 C 95 15 88 7 82 4 L 88 29 C 92 28 96 26 98 24 Z" fill="#1C1C1C"/>
          <path d="M 22 24 C 25 15 32 7 38 4" stroke="#C8A038" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 98 24 C 95 15 88 7 82 4" stroke="#C8A038" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <line x1="32" y1="29" x2="88" y2="29" stroke="#C8A038" stroke-width="2"/>
          <ellipse cx="60" cy="30" rx="29" ry="5.5" fill="#080808"/>
          <ellipse cx="60" cy="29" rx="28" ry="4.5" fill="#161616"/>
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
    mysteryOnly: true, mysteryPool: 'hat', rarity: 'legendary',
    desc: 'The financially literate royalty.',
    svg: `<defs>
            <linearGradient id="cr-body" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFE440"/><stop offset="50%" stop-color="#C88010"/><stop offset="100%" stop-color="#FFD030"/></linearGradient>
            <linearGradient id="cr-band" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#E8A820"/><stop offset="100%" stop-color="#A86010"/></linearGradient>
          </defs>
          <path d="M 33 30 L 38 15 L 51 24 L 60 8 L 69 24 L 82 15 L 87 30 Z" fill="url(#cr-body)"/>
          <path d="M 33 30 L 38 15 L 43 22 Z" fill="rgba(0,0,0,0.18)"/>
          <path d="M 51 24 L 60 8 L 65 23 Z" fill="rgba(0,0,0,0.14)"/>
          <path d="M 38 15 L 51 24 L 47 24 L 37 17 Z" fill="rgba(255,255,255,0.22)"/>
          <path d="M 60 8 L 51 24 L 55 24 Z" fill="rgba(255,255,255,0.28)"/>
          <path d="M 69 24 L 72 24 L 82 15 L 80 17 Z" fill="rgba(255,255,255,0.18)"/>
          <rect x="33" y="26" width="54" height="8" rx="3" fill="url(#cr-band)"/>
          <rect x="33" y="26" width="54" height="4" rx="2" fill="#E8A828"/>
          <rect x="35" y="26.5" width="50" height="2" rx="1" fill="rgba(255,255,255,0.28)"/>
          <ellipse cx="38" cy="17" rx="4.2" ry="3.8" fill="#CC2020"/>
          <ellipse cx="38" cy="16.5" rx="4.2" ry="3.3" fill="#E83030"/>
          <ellipse cx="37" cy="15.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.5)"/>
          <ellipse cx="60" cy="10" rx="5" ry="4.5" fill="#1040CC"/>
          <ellipse cx="60" cy="9.5" rx="5" ry="4" fill="#2060EE"/>
          <ellipse cx="58.5" cy="8" rx="2.2" ry="1.6" fill="rgba(255,255,255,0.58)"/>
          <ellipse cx="82" cy="17" rx="4.2" ry="3.8" fill="#108030"/>
          <ellipse cx="82" cy="16.5" rx="4.2" ry="3.3" fill="#20A040"/>
          <ellipse cx="81" cy="15.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.5)"/>
          <circle cx="44" cy="29" r="2.8" fill="#E83030"/>
          <circle cx="60" cy="29" r="2.8" fill="#2060EE"/>
          <circle cx="76" cy="29" r="2.8" fill="#20A040"/>
          <circle cx="37" cy="29" r="1.8" fill="#FFE060"/>
          <circle cx="52" cy="29" r="1.8" fill="#FFE060"/>
          <circle cx="68" cy="29" r="1.8" fill="#FFE060"/>
          <circle cx="83" cy="29" r="1.8" fill="#FFE060"/>`
  },
  // ── ACCESSORIES (glasses) ──
  {
    id: 'round_glasses', name: 'Round Glasses', category: 'accessory', price: 60,
    mysteryOnly: true, mysteryPool: 'accessory',
    viewBox: '6 41 108 34',
    desc: 'For the bookish budgeter.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 },
    svg: `<circle cx="36" cy="61" r="10" fill="rgba(180,220,255,0.15)" stroke="#6B4C3A" stroke-width="2.2"/>
          <circle cx="85" cy="61" r="10" fill="rgba(180,220,255,0.15)" stroke="#6B4C3A" stroke-width="2.2"/>
          <path d="M 30 54 A 8 8 0 0 1 42 54" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <path d="M 79 54 A 8 8 0 0 1 91 54" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <line x1="46" y1="61" x2="75" y2="61" stroke="#6B4C3A" stroke-width="2.2"/>
          <line x1="17" y1="59" x2="26" y2="60" stroke="#6B4C3A" stroke-width="2.2"/>
          <line x1="95" y1="60" x2="104" y2="59" stroke="#6B4C3A" stroke-width="2.2"/>`
  },
  {
    id: 'sunglasses', name: 'Sunglasses', category: 'accessory', price: 75,
    mysteryOnly: true, mysteryPool: 'accessory', rarity: 'rare',
    viewBox: '6 41 108 34',
    desc: 'Too cool for financial stress.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 },
    svg: `<rect x="24" y="52" width="24" height="18" rx="8" fill="#1A1A1A"/>
          <rect x="73" y="52" width="24" height="18" rx="8" fill="#1A1A1A"/>
          <rect x="25" y="53" width="22" height="7" rx="5" fill="rgba(255,255,255,0.08)"/>
          <rect x="74" y="53" width="22" height="7" rx="5" fill="rgba(255,255,255,0.08)"/>
          <line x1="48" y1="60" x2="73" y2="60" stroke="#1A1A1A" stroke-width="3.5"/>
          <line x1="15" y1="58" x2="24" y2="60" stroke="#1A1A1A" stroke-width="2.5"/>
          <line x1="97" y1="60" x2="106" y2="58" stroke="#1A1A1A" stroke-width="2.5"/>
          <path d="M 27 54 Q 32 51 39 54" stroke="rgba(255,255,255,0.4)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <path d="M 76 54 Q 81 51 88 54" stroke="rgba(255,255,255,0.4)" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
  },
  {
    id: 'heart_glasses', name: 'Heart Glasses', category: 'accessory', price: 90,
    mysteryOnly: true, mysteryPool: 'accessory', rarity: 'epic',
    viewBox: '6 41 108 34',
    desc: 'In love with compound interest.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 },
    svg: `<path d="M 36 56 C 33 50 24 50 24 58 C 24 64 30 68 36 76 C 42 68 48 64 48 58 C 48 50 39 50 36 56 Z" fill="#FF6B8A"/>
          <path d="M 85 56 C 82 50 73 50 73 58 C 73 64 79 68 85 76 C 91 68 97 64 97 58 C 97 50 88 50 85 56 Z" fill="#FF6B8A"/>
          <path d="M 27 55 C 28 51 31 50 34 51" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <path d="M 76 55 C 77 51 80 50 83 51" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <line x1="48" y1="58" x2="73" y2="58" stroke="#CC2255" stroke-width="2.5"/>
          <line x1="15" y1="56" x2="24" y2="58" stroke="#CC2255" stroke-width="2.2"/>
          <line x1="97" y1="58" x2="106" y2="56" stroke="#CC2255" stroke-width="2.2"/>`
  },
  {
    id: 'star_glasses', name: 'Star Glasses', category: 'accessory', price: 110,
    mysteryOnly: true, mysteryPool: 'accessory', rarity: 'legendary',
    viewBox: '6 41 108 34',
    desc: 'Your portfolio is looking stellar.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 },
    svg: `<polygon points="36,48 41.9,52.9 48.4,57.0 45.5,64.1 43.6,71.5 36,71 28.4,71.5 26.5,64.1 23.6,57.0 30.1,52.9" fill="#FFD700"/>
          <polygon points="85,48 90.9,52.9 97.4,57.0 94.5,64.1 92.6,71.5 85,71 77.4,71.5 75.5,64.1 72.6,57.0 79.1,52.9" fill="#FFD700"/>
          <path d="M 31.5 54 L 34.5 59" stroke="rgba(255,255,255,0.55)" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M 80.5 54 L 83.5 59" stroke="rgba(255,255,255,0.55)" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="48.4" y1="57" x2="72.6" y2="57" stroke="#C0A010" stroke-width="2.5"/>
          <line x1="14.6" y1="55" x2="23.6" y2="57" stroke="#C0A010" stroke-width="2.2"/>
          <line x1="97.4" y1="57" x2="106.4" y2="55" stroke="#C0A010" stroke-width="2.2"/>`
  },
  // ── ACCESSORIES ──
  {
    id: 'accessory_mystery_box', name: 'Accessory Mystery Box', category: 'accessory', price: 110,
    isMysteryBox: true, mysteryPool: 'accessory',
    viewBox: '20 20 80 75',
    desc: 'A random accessory to complete the look.',
    svg: `<defs><linearGradient id="ab-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#C9A0FF"/><stop offset="100%" stop-color="#8A3FE0"/></linearGradient></defs>
          <rect x="35" y="45" width="50" height="40" rx="3" fill="url(#ab-g)"/>
          <rect x="35" y="45" width="50" height="10" fill="rgba(255,255,255,0.2)"/>
          <rect x="55" y="45" width="10" height="40" fill="#FFD700"/>
          <rect x="35" y="60" width="50" height="10" fill="#FFD700"/>
          <path d="M60,45 Q48,32 40,38 Q38,45 48,46 Q54,46 60,45Z" fill="#FFD700"/>
          <path d="M60,45 Q72,32 80,38 Q82,45 72,46 Q66,46 60,45Z" fill="#FFD700"/>
          <circle cx="60" cy="45" r="4" fill="#FFE87A"/>`
  },
  {
    id: 'bow_tie', name: 'Bow Tie', category: 'accessory', price: 65,
    mysteryOnly: true, mysteryPool: 'accessory',
    desc: 'Business casual, pig casual.',
    svg: `<path d="M44,93 L57,98 L44,103 Z" fill="#6B8F65"/>
          <path d="M76,93 L63,98 L76,103 Z" fill="#6B8F65"/>
          <path d="M44,93 L57,98 L50,93 Z" fill="rgba(255,255,255,0.22)"/>
          <ellipse cx="60" cy="98" rx="5.5" ry="4.5" fill="#4A6844"/>
          <ellipse cx="60" cy="97" rx="5.5" ry="2.5" fill="#7BA173"/>
          <circle cx="60" cy="98" r="2" fill="#6B8F65"/>`
  },
  {
    id: 'necktie', name: 'Necktie', category: 'accessory', price: 70,
    mysteryOnly: true, mysteryPool: 'accessory', rarity: 'rare',
    desc: 'Dressed for a shareholder meeting.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 55 },
    svg: `<path d="M53,78 L67,78 L63,86 L57,86 Z" fill="#8B2635"/>
          <path d="M53,78 L67,78 L63,86 L57,86 Z" fill="rgba(255,255,255,0.15)"/>
          <path d="M57,86 L63,86 L67,104 L60,110 L53,104 Z" fill="#A6304A"/>
          <path d="M57,86 L63,86 L65,98 L60,101 L55,98 Z" fill="rgba(0,0,0,0.12)"/>
          <line x1="55" y1="92" x2="65" y2="93" stroke="#7A1F2C" stroke-width="1" opacity="0.5"/>
          <line x1="54" y1="100" x2="66" y2="101" stroke="#7A1F2C" stroke-width="1" opacity="0.5"/>`
  },
  {
    id: 'cape', name: 'Cape', category: 'accessory', price: 130,
    mysteryOnly: true, mysteryPool: 'accessory', rarity: 'legendary',
    viewBox: '-10 68 144 72',
    desc: 'The hero of your own budget.',
    layer: 'back',
    fit: { a: 3.28, b: 0, c: 0, d: 4.33, e: 23, f: -132 },
    svg: `<defs><linearGradient id="cp-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#C9A0FF"/><stop offset="55%" stop-color="#8A3FE0"/><stop offset="100%" stop-color="#4A1A8A"/></linearGradient></defs>
          <path d="M 8 82 Q 60 72 112 82 L 124 132 Q 60 122 -4 132 Z" fill="url(#cp-g)" stroke="#3D1470" stroke-width="1"/>
          <path d="M 8 82 Q 60 72 112 82 L 109 94 Q 60 84 11 94 Z" fill="rgba(255,255,255,0.22)"/>
          <path d="M 8 82 Q 60 96 112 82" stroke="#3D1470" stroke-width="1" fill="none" opacity="0.4"/>
          <path d="M 30 88 L 34 128" stroke="#EEDCFF" stroke-width="1.2" opacity="0.4"/>
          <path d="M 60 84 L 60 130" stroke="#EEDCFF" stroke-width="1.2" opacity="0.4"/>
          <path d="M 90 88 L 86 128" stroke="#EEDCFF" stroke-width="1.2" opacity="0.4"/>`
  },
  {
    id: 'necklace', name: 'Charm Necklace', category: 'accessory', price: 95,
    mysteryOnly: true, mysteryPool: 'accessory', rarity: 'epic',
    viewBox: '10 58 100 52',
    desc: 'A little sparkle for your budget glow-up.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 37 },
    svg: `<path d="M20,64 Q60,90 100,64 L100,70 Q60,96 20,70 Z" fill="#C0C0C8"/>
          <path d="M20,64 Q60,90 100,64 L98,66 Q60,92 22,66 Z" fill="#EFEFF4" opacity="0.6"/>
          <circle cx="60" cy="88" r="6" fill="#4A90D9"/>
          <circle cx="60" cy="88" r="6" fill="none" stroke="#2C6FB8" stroke-width="1.5"/>
          <circle cx="58" cy="86" r="2" fill="rgba(255,255,255,0.6)"/>`
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
    id: 'diamond_mystery_box', name: 'Diamond Mystery Box', category: 'exclusive', currency: 'diamond', price: 20,
    isMysteryBox: true, mysteryPool: 'exclusive',
    viewBox: '20 20 80 75',
    desc: 'Crack open a dazzling diamond-tier surprise.',
    svg: `<defs><linearGradient id="db-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8FE3F5"/><stop offset="100%" stop-color="#2AA8C4"/></linearGradient></defs>
          <rect x="35" y="45" width="50" height="40" rx="3" fill="#1C1C2E"/>
          <rect x="35" y="45" width="50" height="40" rx="3" fill="none" stroke="url(#db-g)" stroke-width="2"/>
          <rect x="55" y="45" width="10" height="40" fill="url(#db-g)"/>
          <rect x="35" y="60" width="50" height="10" fill="url(#db-g)"/>
          <path d="M60,38 L67,45 L60,54 L53,45 Z" fill="url(#db-g)" stroke="#E8FBFF" stroke-width="0.8"/>
          <path d="M28,40 L29,37 L30,40 L33,41 L30,42 L29,45 L28,42 L25,41 Z" fill="#FFF7C4" opacity="0.85"/>
          <path d="M92,50 L92.8,47.6 L93.6,50 L96,50.8 L93.6,51.6 L92.8,54 L92,51.6 L89.6,50.8 Z" fill="#FFF7C4" opacity="0.7"/>`
  },
  {
    id: 'diamond_crown', name: 'Diamond Crown', category: 'exclusive', currency: 'diamond', price: 15,
    mysteryOnly: true, mysteryPool: 'exclusive',
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
    mysteryOnly: true, mysteryPool: 'exclusive', rarity: 'rare',
    viewBox: '6 41 108 34',
    desc: 'Too cool to be affordable in coins.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 },
    svg: `<defs><linearGradient id="ds-lens" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFD6F0"/><stop offset="50%" stop-color="#C7A6FF"/><stop offset="100%" stop-color="#7FD9FF"/></linearGradient></defs>
          <path d="M 20 61 Q 20 49 34 49 L 46 49 Q 54 49 55 58 L 65 58 Q 66 49 74 49 L 87 49 Q 101 49 101 61 Q 101 73 87 73 L 74 73 Q 66 73 65 64 L 55 64 Q 54 73 46 73 L 34 73 Q 20 73 20 61 Z" fill="#2B2B2B"/>
          <circle cx="36" cy="61" r="9.5" fill="url(#ds-lens)"/>
          <circle cx="85" cy="61" r="9.5" fill="url(#ds-lens)"/>
          <circle cx="32" cy="57" r="2.4" fill="rgba(255,255,255,0.7)"/>
          <circle cx="81" cy="57" r="2.4" fill="rgba(255,255,255,0.7)"/>
          <path d="M 20 59 L 12 57" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round"/>
          <path d="M 101 59 L 109 57" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round"/>
          <path d="M 36 53 L 37 50 L 38 53 L 41 54 L 38 55 L 37 58 L 36 55 L 33 54 Z" fill="#FFF" opacity="0.9"/>
          <path d="M 85 53 L 86 50 L 87 53 L 90 54 L 87 55 L 86 58 L 85 55 L 82 54 Z" fill="#FFF" opacity="0.9"/>`
  },
  {
    id: 'golden_cape', name: 'Golden Cape', category: 'exclusive', currency: 'diamond', price: 25,
    mysteryOnly: true, mysteryPool: 'exclusive', rarity: 'epic',
    viewBox: '-10 68 144 72',
    desc: 'The rarest flex in Hammy\'s closet.',
    layer: 'back',
    fit: { a: 3.28, b: 0, c: 0, d: 4.33, e: 23, f: -132 },
    svg: `<defs><linearGradient id="gc-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFE9A6"/><stop offset="55%" stop-color="#FFC93F"/><stop offset="100%" stop-color="#C68A0A"/></linearGradient></defs>
          <path d="M 8 82 Q 60 72 112 82 L 124 132 Q 60 122 -4 132 Z" fill="url(#gc-g)" stroke="#A66E08" stroke-width="1"/>
          <path d="M 8 82 Q 60 72 112 82 L 109 94 Q 60 84 11 94 Z" fill="rgba(255,255,255,0.25)"/>
          <path d="M 8 82 Q 60 96 112 82" stroke="#A66E08" stroke-width="1" fill="none" opacity="0.4"/>
          <path d="M 30 88 L 34 128" stroke="#FFF3CC" stroke-width="1.2" opacity="0.4"/>
          <path d="M 60 84 L 60 130" stroke="#FFF3CC" stroke-width="1.2" opacity="0.4"/>
          <path d="M 90 88 L 86 128" stroke="#FFF3CC" stroke-width="1.2" opacity="0.4"/>
          <circle cx="10" cy="92" r="4.5" fill="#8FE3F5"/>
          <circle cx="10" cy="92" r="2.3" fill="#E8FBFF"/>
          <circle cx="110" cy="92" r="4.5" fill="#8FE3F5"/>
          <circle cx="110" cy="92" r="2.3" fill="#E8FBFF"/>`
  },
  {
    id: 'gold_chain', name: 'Gold Chain', category: 'exclusive', currency: 'diamond', price: 35,
    mysteryOnly: true, mysteryPool: 'exclusive', rarity: 'legendary',
    viewBox: '12 56 96 52',
    desc: 'The ultimate flex for a maxed-out savings account.',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 32 },
    svg: `<defs><linearGradient id="gch-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFF3B0"/><stop offset="50%" stop-color="#FFD23F"/><stop offset="100%" stop-color="#C68A0A"/></linearGradient></defs>
          <path d="M20,64 Q60,90 100,64 L100,70 Q60,96 20,70 Z" fill="url(#gch-g)" stroke="#A66E08" stroke-width="1"/>
          <path d="M20,64 Q60,90 100,64 L98,66 Q60,92 22,66 Z" fill="#FFF9DD" opacity="0.5"/>
          <circle cx="32" cy="73.6" r="2.6" fill="none" stroke="#A66E08" stroke-width="1.4"/>
          <circle cx="44" cy="77.9" r="2.6" fill="none" stroke="#A66E08" stroke-width="1.4"/>
          <circle cx="54" cy="79.7" r="2.6" fill="none" stroke="#A66E08" stroke-width="1.4"/>
          <circle cx="66" cy="79.7" r="2.6" fill="none" stroke="#A66E08" stroke-width="1.4"/>
          <circle cx="76" cy="77.9" r="2.6" fill="none" stroke="#A66E08" stroke-width="1.4"/>
          <circle cx="88" cy="73.6" r="2.6" fill="none" stroke="#A66E08" stroke-width="1.4"/>
          <path d="M51,83 L69,83 L60,99 Z" fill="url(#gch-g)" stroke="#A66E08" stroke-width="1"/>
          <circle cx="60" cy="89" r="4.5" fill="#8FE3F5"/>
          <circle cx="60" cy="89" r="2.3" fill="#E8FBFF"/>
          <path d="M53,85 L59,86.5" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>`
  },

  // ── REWARDS (not for sale — auto-awarded for major milestones) ──
  {
    id: 'graduation_cap', name: 'Graduation Cap', category: 'reward', reward: true,
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
  {
    id: 'grandmaster_halo', name: 'Angelic Halo', category: 'reward', reward: true,
    rewardHint: 'Unlock every other achievement to earn this',
    viewBox: '14 -8 92 40',
    desc: 'Awarded for unlocking every single achievement. Can\'t be bought, only earned.',
    svg: `<defs><linearGradient id="gh-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFF3B0"/><stop offset="50%" stop-color="#FFD23F"/><stop offset="100%" stop-color="#C68A0A"/></linearGradient></defs>
          <ellipse cx="60" cy="10" rx="26" ry="7" fill="none" stroke="url(#gh-g)" stroke-width="4"/>
          <ellipse cx="60" cy="9" rx="26" ry="7" fill="none" stroke="#FFF3B0" stroke-width="1.5" opacity="0.6"/>
          <path d="M32 6 L33 3 L34 6 L37 7 L34 8 L33 11 L32 8 L29 7 Z" fill="#FFF7C4"/>
          <path d="M88 6 L89 3 L90 6 L93 7 L90 8 L89 11 L88 8 L85 7 Z" fill="#FFF7C4" opacity="0.85"/>
          <circle cx="60" cy="3" r="2.4" fill="#FFE87A"/>`
  },
  {
    id: 'marathon_medal', name: 'Marathon Medal', category: 'reward', reward: true,
    rewardHint: 'Reach a 30-day streak to earn this',
    viewBox: '10 58 100 56',
    fit: { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: 32 },
    desc: 'Awarded for a 30-day streak without missing a day. Can\'t be bought, only earned.',
    svg: `<defs><linearGradient id="mm-g" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#FFE9A6"/><stop offset="55%" stop-color="#FFC93F"/><stop offset="100%" stop-color="#C68A0A"/></linearGradient></defs>
          <path d="M20,64 Q60,90 100,64 L100,70 Q60,96 20,70 Z" fill="#3B5FA0"/>
          <path d="M20,64 Q60,90 100,64 L98,66 Q60,92 22,66 Z" fill="#7B9FE0" opacity="0.5"/>
          <circle cx="60" cy="90" r="9" fill="url(#mm-g)" stroke="#A66E08" stroke-width="1.5"/>
          <circle cx="60" cy="90" r="6" fill="none" stroke="#FFF3B0" stroke-width="1.2"/>
          <polygon points="60,85.5 61.1,88.5 64.3,88.6 61.7,90.6 62.7,93.6 60,91.8 57.4,93.6 58.3,90.6 55.7,88.6 58.9,88.5" fill="#FFF3B0"/>`
  },
];

// ── Achievements ──────────────────────────────
// Every achievement below requires real mastery, not just showing up — "mastered" for a
// quiz-based module means every lesson in it has been answered perfectly at least once
// (replays count, so it's always earnable, just not on the first pass through); for the two
// narrative-quest modules (Credit, Scams) it means every quest in that module finished with
// a flawless run (every knowledge check, myth card, and poll guessed right, zero matching
// mistakes) — checked directly against the quest's own analytics rather than a separate flag.
function hasMasteredModule(s, modId) {
  const mod = MODULES.find(m => m.id === modId);
  if (!mod) return false;
  if (hasQuest(mod)) return moduleQuestsFlawless(s, modId);
  return mod.lessons.every((lesson, idx) => {
    const rec = s.completedLessons[`${modId}_${idx}`];
    return !!rec && rec.score === rec.total;
  });
}

function questWasFlawless(qp) {
  if (!qp || !qp.done) return false;
  const a = qp.analytics;
  return a.knowledgeCheck.every(x => x.isCorrect)
    && a.mythCards.every(x => x.guessedRight)
    && a.polls.every(x => x.guessedRight)
    && (a.matchingMistakes || 0) === 0;
}

function moduleQuestsFlawless(s, modId) {
  const mod = MODULES.find(m => m.id === modId);
  if (!mod || !hasQuest(mod)) return false;
  return mainQuests(mod).every(q => questWasFlawless(s.questProgress[questKey(modId, q.id)]));
}

// Sums every vocab term learned across every quest ever played (both Credit quests + Scams).
function totalTermsLearned(s) {
  return Object.values(s.questProgress || {}).reduce((sum, qp) => sum + (qp.learnedTerms || []).length, 0);
}

// True only if that module's boss-challenge activity was finished on the optimal path at
// least once — bonus XP only gets added when every choice in the run was the strongest one.
function bossChallengeOptimal(s, modId) {
  const mod = MODULES.find(m => m.id === modId);
  const idx = mod ? mod.lessons.findIndex(l => l.type === 'boss-challenge') : -1;
  if (idx === -1) return false;
  const rec = s.completedLessons[`${modId}_${idx}`];
  if (!rec) return false;
  return rec.xpEarned > mod.lessons[idx].activity.xpOnComplete;
}

// Tiers are purely a difficulty/rarity label used for badge color + the modal's tier chip —
// they don't affect check() logic at all. Bronze = single-module mastery. Silver = finishing
// a hard optional challenge. Gold = a sustained or precise behavioral bar. Diamond = the
// small handful of genuinely ultra-hard, multi-week or "beat everything" achievements.
const ACHIEVEMENTS = [
  { id: 'first_paycheck', tier: 'bronze', color: '#3FA65C', label: 'First Paycheck',    desc: 'Ace every lesson in the Earning module — every quiz question right on at least one attempt each.', check: s => hasMasteredModule(s, 'earning'),
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
  { id: 'budget_boss', tier: 'bronze', color: '#E08A2E', label: 'Budget Boss', desc: 'Master the Spending module — perfect quiz scores across every lesson, plus both interactive activities completed.', check: s => hasMasteredModule(s, 'spending'),
    icon: '<path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V4.5A1.5 1.5 0 0 0 14.5 3h-6A1.5 1.5 0 0 0 7 4.5V7"/><circle cx="16" cy="13" r="1.4"/>' },
  { id: 'safety_net', tier: 'bronze', color: '#1C9C93', label: 'Safety Net', desc: 'Master the Saving module — perfect quiz scores on every single lesson.', check: s => hasMasteredModule(s, 'saving'),
    icon: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>' },
  { id: 'investor', tier: 'bronze', color: '#3B7FC4', label: 'Future Millionaire', desc: 'Master the Investing module — perfect quiz scores on every single lesson.', check: s => hasMasteredModule(s, 'investing'),
    icon: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
  { id: 'credit_champ', tier: 'bronze', color: '#2E9BD6', label: 'Credit Champ', desc: 'Flawlessly complete every credit quest — both of Hammy\'s — with every knowledge check, myth card, and poll guessed right.', check: s => hasMasteredModule(s, 'credit'),
    icon: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
  { id: 'risk_ready', tier: 'bronze', color: '#5B6B8C', label: 'Risk Ready', desc: 'Master the Managing Risk module — perfect quiz scores on every single lesson.', check: s => hasMasteredModule(s, 'risk'),
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { id: 'loan_smart', tier: 'bronze', color: '#A9713C', label: 'Loan Smart', desc: 'Master the Loans module — perfect quiz scores on every single lesson.', check: s => hasMasteredModule(s, 'loans'),
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { id: 'tax_ready', tier: 'bronze', color: '#8B5FBF', label: 'Tax Ready', desc: 'Master the Taxes module — perfect quiz scores on every single lesson.', check: s => hasMasteredModule(s, 'taxes'),
    icon: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>' },
  { id: 'mindful_money', tier: 'bronze', color: '#D6538A', label: 'Mindful Spender', desc: 'Master Consumer Psychology — perfect quiz scores on every lesson, plus both interactive activities completed.', check: s => hasMasteredModule(s, 'psychology'),
    icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  { id: 'offer_ready', tier: 'bronze', color: '#5C6BC0', label: 'Offer Ready', desc: 'Master Career & Salary — perfect quiz scores on every single lesson.', check: s => hasMasteredModule(s, 'career'),
    icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
  { id: 'scam_spotter', tier: 'bronze', color: '#C0453A', label: 'Scam Spotter', desc: 'Flawlessly complete every scam quest — every knowledge check, myth card, and poll guessed right.', check: s => hasMasteredModule(s, 'scams'),
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { id: 'crisis_averted', tier: 'silver', color: '#E0A72E', label: 'Crisis Averted', desc: 'Beat the Credit boss battle — finish either of the credit quests through to its final scenario.', check: s => (s.questBossesWon || []).includes('credit'),
    icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { id: 'fraud_fighter', tier: 'silver', color: '#B33A3A', label: 'Fraud Fighter', desc: 'Beat a Scams boss battle — finish any one of Hammy\'s scam quests through to its final scenario.', check: s => (s.questBossesWon || []).includes('scams'),
    icon: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
  { id: 'no_hints', tier: 'silver', color: '#7952B3', label: 'No Hints Needed', desc: 'Finish Hammy\'s first credit quest from start to finish without using a single hint.', check: s => { const qp = s.questProgress['credit::maya']; return !!(qp && qp.done && (qp.hintsUsed || 0) === 0); },
    icon: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>' },
  { id: 'word_nerd', tier: 'silver', color: '#3F8757', label: 'Word Nerd', desc: 'Learn 15 or more vocabulary terms across every quest played.', check: s => totalTermsLearned(s) >= 15,
    icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
  { id: 'homebody', tier: 'silver', color: '#C08552', label: 'Homebody', desc: 'Fully decorate Hammy\'s Room — every slot (wall art, lamp, plant, bed, rug) filled with a purchased item.', check: s => s.equippedRoom && Object.keys(s.equippedRoom).length > 0 && Object.values(s.equippedRoom).every(v => !!v),
    icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { id: 'on_fire', tier: 'gold', color: '#E8622C', label: 'On a Roll', desc: 'Play Stackd 7 days in a row without missing a day.', check: s => s.streak >= 7,
    icon: '<path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-2-1-3-1-3s2 1 2 4a5 5 0 0 1-10 0c0-5 4-6 4-10z"/>' },
  { id: 'discipline', tier: 'gold', color: '#2AA8C4', label: 'Discipline', desc: 'Self-report 7 days in a row of skipping an impulse buy on the Home dashboard.', check: s => !!(s.noImpulseStreak && s.noImpulseStreak.count >= 7),
    icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
  { id: 'iron_will', tier: 'gold', color: '#4A4A57', label: 'Iron Will', desc: 'Land the optimal path on both Boss Challenges — Budgeting\'s and Consumer Psychology\'s — resisting or avoiding every costly choice.', check: s => bossChallengeOptimal(s, 'spending') && bossChallengeOptimal(s, 'psychology'),
    icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>' },
  { id: 'excellent_credit', tier: 'gold', color: '#1F9D6B', label: 'Excellent Credit', desc: 'Push your simulated credit score to 800 or above — years of consistently good life-event decisions.', check: s => !!(s.financialState && s.financialState.creditScore >= 800),
    icon: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="M9 3l3 6-3 12"/><path d="M15 3l-3 6 3 12"/>' },
  { id: 'marathoner', tier: 'diamond', color: '#2856A8', label: 'Marathoner', desc: 'Play Stackd 30 days in a row without missing a single day. Ultra rare — most students never make it this far.', check: s => s.streak >= 30,
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
  { id: 'untouchable', tier: 'diamond', color: '#6A3FA0', label: 'Untouchable', desc: 'Self-report 30 days in a row of skipping an impulse buy. A full month of discipline, ultra rare.', check: s => !!(s.noImpulseStreak && s.noImpulseStreak.count >= 30),
    icon: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>' },
  { id: 'stackd_star', tier: 'diamond', color: '#D4A017', label: 'Stackd Star', desc: 'Master every single module in Stackd — the full curriculum, flawlessly. Ultra rare.', check: s => MODULES.every(m => hasMasteredModule(s, m.id)),
    icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { id: 'grandmaster', tier: 'diamond', color: '#9B1B30', label: 'Grandmaster', desc: 'Unlock every other badge in Stackd. The single hardest badge in the app — there is nothing beyond this one.', check: s => ACHIEVEMENTS.filter(x => x.id !== 'grandmaster').every(x => (s.unlockedAchievements || []).includes(x.id)),
    icon: '<path d="M2 18h20L19 8l-5 4-2-6-2 6-5-4z"/>' },
];

// ── Life Events ────────────────────────────────
// A small, ambient "random life happens" layer on top of the module/quest system. It fires
// mid-lesson — right after the player advances past a concept, quiz question, or decision,
// never on the final step of a lesson/chapter — so it reads as "you just learned this, now
// apply it" rather than a post-lesson bonus round. Each scenario nudges
// state.financialState (checking/savings/creditScore). Purely additive — never blocks or
// replaces the XP/streak/diamond flow it hooks into.
const LIFE_EVENTS = [
  {
    id: 'car_repair',
    tag: 'Uh oh!',
    title: 'The Car Won’t Start',
    scenario: 'It’s 7:45am and you have an 8am final. Your car won’t start. The mechanic says it’s the alternator — $380, and they can have it done by tomorrow if you say yes right now.',
    choices: [
      { id: 'a', label: 'Pay it from savings', effect: { savings: -380 }, result: 'You cover it in full. Your savings takes a hit, but you walk away with zero debt and a working car.' },
      { id: 'b', label: 'Put it on a credit card you’re still paying off', effect: { creditScore: -8 }, result: 'The card absorbs it today. If you only pay the minimum, this $380 repair could quietly cost you $500+ by the time it’s paid off.' },
      { id: 'c', label: 'Ask a parent to cover it, pay them back over time', effect: { checking: -130 }, result: 'No interest, no credit hit — but you now owe someone who trusts you. Worth protecting that.' }
    ]
  },
  {
    id: 'roommate_ghosted',
    tag: 'Life happens...',
    title: 'Your Roommate Stopped Paying Rent',
    scenario: 'Your name is on the lease with a roommate. This month, they said they’d "get you back" and never paid their $450 half. Rent is due in 2 days.',
    choices: [
      { id: 'a', label: 'Cover their half from your emergency savings', effect: { savings: -450 }, result: 'You avoid a late fee and a landlord conversation — but now you’re the one owed money, and collecting from a friend is its own project.' },
      { id: 'b', label: 'Pay only your half and let the landlord chase them', effect: { creditScore: -15 }, result: 'Depending on your lease, a missed partial payment can still show up as a late payment on the whole unit — including your name.' },
      { id: 'c', label: 'Pay your half, ask for a written payment plan on theirs', effect: { checking: -225 }, result: 'You keep the lease current and start a paper trail. Get any repayment agreement in writing, even a text.' }
    ]
  },
  {
    id: 'medical_bill',
    tag: 'Something unexpected happened!',
    title: 'A Bill You Didn’t See Coming',
    scenario: 'You went to urgent care for what turned out to be nothing serious. Three weeks later, a bill for $210 shows up — your insurance covered less than you expected.',
    choices: [
      { id: 'a', label: 'Pay it in full right away', effect: { checking: -210 }, result: 'Handled. One less thing hanging over you, and no risk of it going to collections.' },
      { id: 'b', label: 'Ignore it — you’ll deal with it later', effect: { creditScore: -25 }, result: 'Unpaid medical bills can go to collections faster than people expect, and a collections account can knock a credit score down hard for years.' },
      { id: 'c', label: 'Call the billing office and ask for a payment plan', effect: { checking: -35 }, result: 'Most providers have an interest-free payment plan, but almost nobody asks. A 5-minute call turns $210 into $35/month.' }
    ]
  }
];

// One-time scenarios tied to finishing a specific module, keyed by module id. Fires the first
// time that module is completed, bypassing the normal cooldown since it's a direct payoff of
// the content the player just went through, not part of the ambient random pool.
const LIFE_EVENT_UNLOCKS = {
  scams: {
    id: 'phishing_text_test',
    tag: 'Uh oh!',
    title: 'A Text From "Financial Aid"',
    scenario: 'You get a text: "Your financial aid disbursement is on hold. Verify your bank account within 24 hours: studentaid-verify.net/login" You just finished the Scams module. This one’s on you.',
    choices: [
      { id: 'a', label: 'Click the link and check it out', effect: { creditScore: -40, checking: -150 }, result: 'That wasn’t studentaid.gov — it was a lookalike domain. Entering your bank login handed it straight to a scammer. This is exactly the pattern you just learned to spot.' },
      { id: 'b', label: 'Ignore it and check your real aid portal directly', effect: {}, coinDelta: 15, result: 'Exactly right. You went straight to the source instead of trusting the link. Real disbursement holds show up in your official portal — never a text with a countdown.' },
      { id: 'c', label: 'Report it as phishing and delete', effect: {}, coinDelta: 20, result: 'Even better — reporting it helps your school’s IT/security team warn other students before they fall for the same message.' }
    ]
  }
};

const LIFE_EVENT_COOLDOWN_SESSIONS = 2;
const LIFE_EVENT_CHANCE = 0.5;

// Checked at the moment a module is first completed — a guaranteed, one-time payoff testing
// what the player just learned. Bypasses the ambient cooldown entirely.
function checkModuleUnlockLifeEvent(mod) {
  const le = state.lifeEvents;
  const unlock = LIFE_EVENT_UNLOCKS[mod.id];
  if (unlock && !le.history.includes(unlock.id)) return unlock;
  return null;
}

// Checked at mid-lesson checkpoints (advancing past a concept, quiz question, or decision).
// Returns null most of the time — this is meant to feel occasional, not clockwork. The
// session-based cooldown means it naturally won't fire more than once every couple of
// visits even though it's rolled at several points within a single lesson.
function maybeTriggerAmbientLifeEvent() {
  const le = state.lifeEvents;
  const sessionsSince = le.sessionCount - le.lastTriggeredSession;
  if (sessionsSince < LIFE_EVENT_COOLDOWN_SESSIONS) return null;
  if (Math.random() > LIFE_EVENT_CHANCE) return null;

  const unseen = LIFE_EVENTS.filter(e => !le.history.includes(e.id));
  const pool = unseen.length ? unseen : LIFE_EVENTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function applyLifeEventChoice(event, choice) {
  const fs = state.financialState;
  const eff = choice.effect || {};
  if (eff.checking)    fs.checking    = Math.max(0, fs.checking + eff.checking);
  if (eff.savings)     fs.savings     = Math.max(0, fs.savings + eff.savings);
  if (eff.creditScore) fs.creditScore = Math.min(850, Math.max(300, fs.creditScore + eff.creditScore));
  if (choice.coinDelta) state.coins = Math.max(0, (state.coins || 0) + choice.coinDelta);
  if (!state.lifeEvents.history.includes(event.id)) state.lifeEvents.history.push(event.id);
  state.lifeEvents.lastTriggeredSession = state.lifeEvents.sessionCount;
  saveState();
}

function buildLifeEventEffectChips(choice) {
  const eff = choice.effect || {};
  const chips = [];
  if (eff.checking)    chips.push(`<span class="lifeevent-chip ${eff.checking < 0 ? 'neg' : 'pos'}">Checking ${eff.checking < 0 ? '−' : '+'}$${Math.abs(eff.checking)}</span>`);
  if (eff.savings)     chips.push(`<span class="lifeevent-chip ${eff.savings < 0 ? 'neg' : 'pos'}">Savings ${eff.savings < 0 ? '−' : '+'}$${Math.abs(eff.savings)}</span>`);
  if (eff.creditScore) chips.push(`<span class="lifeevent-chip ${eff.creditScore < 0 ? 'neg' : 'pos'}">Credit Score ${eff.creditScore < 0 ? '−' : '+'}${Math.abs(eff.creditScore)}</span>`);
  if (choice.coinDelta) chips.push(`<span class="lifeevent-chip pos">+${choice.coinDelta} coins</span>`);
  if (!chips.length) chips.push(`<span class="lifeevent-chip neutral">No financial impact</span>`);
  return chips.join('');
}

// onContinue fires when the player dismisses the result — defaults to going home (used by
// the post-module-completion unlock event), but mid-lesson callers pass a callback that
// resumes exactly where the lesson left off instead of bouncing the player out of it.
function showLifeEvent(event, onContinue) {
  document.getElementById('lifeevent-mascot').innerHTML = getHammyFaceMarkup(0.3);
  document.getElementById('lifeevent-tag').textContent = event.tag || 'Life happens...';
  document.getElementById('lifeevent-title').textContent = event.title;
  document.getElementById('lifeevent-scenario').textContent = event.scenario;
  const choicesEl = document.getElementById('lifeevent-choices');
  const resultEl = document.getElementById('lifeevent-result');
  const continueBtn = document.getElementById('lifeevent-continue');

  resultEl.classList.remove('show');
  resultEl.innerHTML = '';
  continueBtn.style.display = 'none';
  choicesEl.style.display = '';
  choicesEl.innerHTML = event.choices.map(c => `<button type="button" class="lifeevent-choice-btn" data-id="${c.id}">${c.label}</button>`).join('');
  choicesEl.querySelectorAll('.lifeevent-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = event.choices.find(c => c.id === btn.dataset.id);
      applyLifeEventChoice(event, choice);
      choicesEl.style.display = 'none';
      resultEl.innerHTML = `<div class="lifeevent-effect-row">${buildLifeEventEffectChips(choice)}</div><p class="lifeevent-result-text">${choice.result}</p>`;
      resultEl.classList.add('show');
      continueBtn.style.display = '';
    });
  });
  continueBtn.onclick = () => {
    document.getElementById('lifeevent-overlay').classList.remove('visible');
    (onContinue || renderHome)();
  };
  document.getElementById('lifeevent-overlay').classList.add('visible');
}

// Shared by finishQuiz/finishQuest/finishBonusActivity: checks for a guaranteed
// module-completion life event and, if the player also leveled up this completion, defers
// it until after the level-up overlay is dismissed so the two never visually collide.
function maybeShowPostCompletionOverlays(mod, leveled) {
  const lifeEvent = checkModuleUnlockLifeEvent(mod);
  if (leveled) {
    pendingLifeEvent = lifeEvent;
    setTimeout(() => {
      document.getElementById('new-tier').textContent = getTier(Object.keys(state.completedModules).length).name;
      document.getElementById('levelup-overlay').classList.add('visible');
    }, 700);
  } else if (lifeEvent) {
    setTimeout(() => showLifeEvent(lifeEvent), 700);
  }
}

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
  budgetPlan: {
    incomeSources: [],
    fixedExpenses: [],
    variableExpenses: {
      groceries: 0, diningOut: 0, foodDelivery: 0, coffee: 0, clothing: 0,
      beauty: 0, transportation: 0, entertainment: 0, textbooks: 0, gym: 0,
    },
    savingsGoal: 0,
  },
  // A simulated, ambient financial snapshot that Life Events nudge up or down over time —
  // separate from any single quest's own dashboard, and never touched by lessons/quizzes directly.
  financialState: { checking: 600, savings: 200, creditScore: 650 },
  lifeEvents: { history: [], sessionCount: 0, lastTriggeredSession: -99 },
  // Separate from the main daily streak — an honor-system self-report for "I skipped an
  // impulse buy today," checked in at most once per calendar day.
  noImpulseStreak: { count: 0, lastCheckinDate: null },
};

function loadState() {
  try {
    const s = localStorage.getItem('stackd_v2');
    if (s) Object.assign(state, JSON.parse(s));
  } catch (_) {}
}

function saveState() {
  const { level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect, coins, diamonds, ownedItems, equippedItem, ownedRoomItems, equippedRoom, metHammy, questProgress, questBossesWon, onboardingSurvey, budgetPlan, financialState, lifeEvents, noImpulseStreak } = state;
  localStorage.setItem('stackd_v2', JSON.stringify({ level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect, coins, diamonds, ownedItems, equippedItem, ownedRoomItems, equippedRoom, metHammy, questProgress, questBossesWon, onboardingSurvey, budgetPlan, financialState, lifeEvents, noImpulseStreak }));
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

// ── No-Impulse-Buy Streak (honor system) ────────
// A second, independent streak from the main daily one: the player self-reports "I skipped
// an impulse buy today," at most once per calendar day, same date-comparison convention as
// updateStreak(). Never punitive — missing a day just resets the count, no other penalty.
const NO_IMPULSE_AVOIDED_PER_DAY = 12;
const NO_IMPULSE_MILESTONES = [3, 7, 14, 30];
let noImpulseMilestoneJustHit = null;

function checkInNoImpulseBuy() {
  const ns = state.noImpulseStreak;
  const today = new Date().toDateString();
  if (ns.lastCheckinDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  ns.count = ns.lastCheckinDate === yesterday ? ns.count + 1 : 1;
  ns.lastCheckinDate = today;
  saveState();
  noImpulseMilestoneJustHit = NO_IMPULSE_MILESTONES.includes(ns.count) ? ns.count : null;
  renderHome();
}

function renderNoImpulseBuyWidget() {
  const ns = state.noImpulseStreak;
  const today = new Date().toDateString();
  const checkedInToday = ns.lastCheckinDate === today;
  const savedEstimate = ns.count * NO_IMPULSE_AVOIDED_PER_DAY;
  const milestoneHtml = noImpulseMilestoneJustHit
    ? `<p class="noimpulse-milestone">🎉 ${noImpulseMilestoneJustHit}-day streak! That's roughly $${(noImpulseMilestoneJustHit * NO_IMPULSE_AVOIDED_PER_DAY).toLocaleString()} in avoided impulse spending, keep it up.</p>`
    : '';
  noImpulseMilestoneJustHit = null;
  return `
    <div class="noimpulse-head">
      <h3>No-Impulse-Buy Streak</h3>
      <span class="noimpulse-count">${ns.count} day${ns.count === 1 ? '' : 's'}</span>
    </div>
    <p class="noimpulse-sub">Self-reported, honor system — about $${savedEstimate.toLocaleString()} estimated avoided spending at $${NO_IMPULSE_AVOIDED_PER_DAY}/day.</p>
    ${milestoneHtml}
    <button type="button" class="noimpulse-btn" id="noimpulse-checkin-btn" ${checkedInToday ? 'disabled' : ''}>
      ${checkedInToday ? '✓ Checked in today' : 'I skipped an impulse buy today'}
    </button>`;
}

function buildStreakDiamondBanner(diamondsEarned) {
  return `<div class="streak-diamond-banner">
    <span class="diamond-icon">💎</span>
    <div><strong>${state.streak}-Day Streak!</strong><span>+${diamondsEarned} diamonds earned, spend them on the exclusive shop items.</span></div>
  </div>`;
}

function buildRewardBanner(icon, title, message) {
  return `<div class="graduation-banner">
    <span class="graduation-icon">${icon}</span>
    <div><strong>${title}</strong><span>${message}</span></div>
  </div>`;
}

function buildGraduationBanner() {
  return buildRewardBanner('🎓', 'You Graduated!', 'Every module complete. Your Graduation Cap is equipped, check out your pig.');
}

function buildMilestoneRewardBanner(newAchs) {
  if (newAchs.some(a => a.id === 'grandmaster')) {
    return buildRewardBanner('🏆', 'Grandmaster!', 'Every achievement unlocked. Your Angelic Halo is equipped, check out your pig.');
  }
  if (newAchs.some(a => a.id === 'marathoner')) {
    return buildRewardBanner('🏅', '30-Day Streak!', 'A full month with no missed days. Your Marathon Medal is equipped, check out your pig.');
  }
  return '';
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
  // Unlocking every other achievement auto-awards the Angelic Halo — the hardest badge in the app.
  if (newOnes.some(a => a.id === 'grandmaster') && !(state.ownedItems || []).includes('grandmaster_halo')) {
    state.ownedItems = [...(state.ownedItems || []), 'grandmaster_halo'];
    state.equippedItem = 'grandmaster_halo';
  }
  // A 30-day streak auto-awards the Marathon Medal.
  if (newOnes.some(a => a.id === 'marathoner') && !(state.ownedItems || []).includes('marathon_medal')) {
    state.ownedItems = [...(state.ownedItems || []), 'marathon_medal'];
    state.equippedItem = 'marathon_medal';
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
  const subnav = document.querySelector('.nav-subnav');
  if (subnav) subnav.classList.toggle('mobile-open', id === 'shop');
  if (id === 'shop') updateShopNavHighlight();
  window.scrollTo(0, 0);
}

function updateShopNavHighlight() {
  document.querySelectorAll('.nav-subitem[data-shop-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.shopTab === shopActiveTab);
  });
}

function updateSidebarStats() {
  const tier = getTier(Object.keys(state.completedModules).length);
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

  // Modules always stay in their fixed numeric order (01–11) — personalization only
  // affects which one gets the "Recommended" highlight below, never the list order, so
  // the module list reads as a stable, predictable sequence.
  const survey = state.onboardingSurvey;
  const topRecommendedId = survey && survey.completed
    ? (MODULES.map((m, i) => ({ m, i, score: computeModulePriority(m, survey) }))
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .find(x => x.score > 0) || {}).m?.id
    : null;

  MODULES.forEach(m => {
    const quest = hasQuest(m);
    const lessonsDone = quest ? 0 : m.lessons.filter((_, i) => !!state.completedLessons[`${m.id}_${i}`]).length;
    const allDone = quest
      ? mainQuests(m).every(q => { const qp = state.questProgress[questKey(m.id, q.id)]; return !!(qp && qp.done); })
      : lessonsDone === m.lessons.length;

    const isRecommended = !allDone && m.id === topRecommendedId;
    const row = document.createElement('div');
    row.className = 'module-row' + (allDone ? ' completed' : '') + (isRecommended ? ' recommended' : '');

    const badge = allDone
      ? `<span class="card-badge badge-done">✓ Complete</span>`
      : isRecommended
        ? `<span class="card-badge badge-recommend">★ Recommended</span>`
        : `<span class="card-badge badge-xp">+${m.xpReward} XP</span>`;

    let bodyHtml;
    if (quest) {
      bodyHtml = `<div class="module-row-lessons">${mainQuests(m).map((q, idx) => {
        const qp = state.questProgress[questKey(m.id, q.id)];
        const done = !!(qp && qp.done);
        const cta = done ? '↻ Replay Quest' : (qp && qp.chapterIdx > 0 ? `Resume — ${questLabel(m, q)} →` : 'Begin Quest →');
        const sub = subQuestFor(m, q.id);
        const subDone = sub && !!state.questProgress[questKey(m.id, sub.id)]?.done;
        const subHtml = sub ? `<div class="lt-subquest${subDone ? ' done' : ''}" data-module="${m.id}" data-quest="${sub.id}">${subDone ? '✓' : '🎯'} Real-life sub-quest: ${sub.topic} →</div>` : '';
        return `<div class="lesson-tile quest-tile${done ? ' done' : ''}" data-module="${m.id}" data-quest="${q.id}">
          <div class="lt-body">
            <div class="lt-num">Lesson ${idx + 1}</div>
            <div class="lt-title">${q.topic || q.character.name}</div>
            <div class="lt-meta">${q.character.tagline} · ${q.chapters.length} chapters</div>
            ${subHtml}
          </div>
          <span class="lt-cta">${cta}</span>
        </div>`;
      }).join('')}</div>`;
    } else {
      bodyHtml = `<div class="module-row-lessons">${m.lessons.map((lesson, idx) => {
        const key = `${m.id}_${idx}`;
        const lessonData = state.completedLessons[key];
        const done = !!lessonData;
        const isActivity = !!lesson.type;
        const meta = done
          ? `Score: ${lessonData.score}/${lessonData.total} · ${lessonData.xpEarned} XP`
          : isActivity ? 'Interactive' : `${lesson.qIndices.length} questions`;
        const cta = done ? '↻ Replay' : 'Start →';
        return `<div class="lesson-tile${done ? ' done' : ''}${isActivity ? ' activity-tile' : ''}" data-module="${m.id}" data-lesson="${idx}">
          <div class="lt-body">
            <div class="lt-num">Lesson ${idx + 1}</div>
            <div class="lt-title">${lesson.title}${isActivity ? ' <span class="quest-tag">Interactive</span>' : ''}</div>
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
            <div class="mrh-title">${m.title}</div>
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
      row.querySelectorAll('.lt-subquest').forEach(hint => {
        hint.addEventListener('click', (e) => {
          e.stopPropagation();
          startQuest(hint.dataset.module, hint.dataset.quest);
        });
      });
    } else {
      row.querySelectorAll('.lesson-tile').forEach(tile => {
        const lessonIdx = parseInt(tile.dataset.lesson);
        const lesson = m.lessons[lessonIdx];
        tile.addEventListener('click', () => {
          if (lesson.type) startBonusActivity(tile.dataset.module, lessonIdx);
          else startHook(tile.dataset.module, lessonIdx);
        });
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
  scams: ["I'd probably click first and ask questions later", 'I can spot a scam from the subject line alone'],
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
    ? mainQuests(m).every(q => { const qp = state.questProgress[questKey(m.id, q.id)]; return !!(qp && qp.done); })
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

// onlyUnlocked: Home's version — a trophy case of what's actually been earned, not the
// full locked/unlocked roster (that's what the dedicated Badges page is for).
function renderAchievementBadges(containerId, subId, onlyUnlocked = false) {
  const unlocked = state.unlockedAchievements.length;
  if (subId) document.getElementById(subId).textContent = onlyUnlocked ? `${unlocked} earned` : `${unlocked}/${ACHIEVEMENTS.length} unlocked`;
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const list = onlyUnlocked ? ACHIEVEMENTS.filter(a => state.unlockedAchievements.includes(a.id)) : ACHIEVEMENTS;
  if (onlyUnlocked && list.length === 0) {
    container.innerHTML = `<p class="ach-empty">No badges yet — complete a lesson to start earning them.</p>`;
    return;
  }
  list.forEach(a => {
    const isUnlocked = state.unlockedAchievements.includes(a.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `ach-badge${a.tier === 'diamond' ? ' tier-diamond' : ''}`;
    el.style.setProperty('--ach-color', a.color);
    el.innerHTML = `
      <div class="ach-icon ${a.tier === 'diamond' ? 'tier-diamond ' : ''}${isUnlocked ? 'unlocked' : 'locked'}">
        ${isUnlocked && a.tier === 'diamond' ? '<span class="ach-shine"></span>' : ''}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26">${a.icon}</svg>
      </div>
      <span class="ach-label">${a.label}</span>`;
    el.addEventListener('click', () => showAchievementDetail(a, isUnlocked));
    container.appendChild(el);
  });
}

const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };

function getAchievementModal() {
  let modal = document.getElementById('achievement-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'achievement-modal';
    modal.className = 'achievement-modal-overlay';
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
  }
  return modal;
}

function showAchievementDetail(a, isUnlocked) {
  const modal = getAchievementModal();
  modal.innerHTML = `
    <div class="achievement-modal-card${a.tier === 'diamond' ? ' tier-diamond' : ''}" style="--ach-color: ${a.color}">
      <div class="achievement-modal-tier-chip tier-${a.tier}">${TIER_LABELS[a.tier]} Tier</div>
      <div class="achievement-modal-icon ${a.tier === 'diamond' ? 'tier-diamond ' : ''}${isUnlocked ? 'unlocked' : 'locked'}">
        ${isUnlocked && a.tier === 'diamond' ? '<span class="ach-shine"></span>' : ''}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="40" height="40">${a.icon}</svg>
      </div>
      <div class="achievement-modal-status ${isUnlocked ? 'unlocked' : 'locked'}">${isUnlocked ? '✓ Unlocked' : '🔒 Locked'}</div>
      <h2 class="achievement-modal-title">${a.label}</h2>
      <p class="achievement-modal-desc">${a.desc}</p>
      <button class="btn-primary" id="achievement-modal-close">Close</button>
    </div>`;
  modal.classList.add('show');
  document.getElementById('achievement-modal-close').addEventListener('click', () => modal.classList.remove('show'));
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
  if (level >= 9)  return 'Every pig accessory unlocked — bow, glasses, and cap.';
  if (level >= 7)  return 'Graduation cap unlocked · Reach Level 9 to unlock every accessory';
  if (level >= 5)  return 'Glasses unlocked · Reach Level 7 to unlock the graduation cap';
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

// Default transform for items without their own custom `fit` — matches the shared hat
// coordinate convention (local x-center 60 lands on the pig's head-center, local y around
// 0-31 sits on top of the head). Most items need their OWN tuned fit, though, since hats,
// glasses, and neckwear each live in a very different part of the pig's own 440×460 frame.
const DEFAULT_ITEM_FIT = { a: 3.28, b: 0, c: 0, d: 3.4, e: 23, f: -15 };

function getPigWithItemMarkup(scale, item) {
  let svg = '', fit = DEFAULT_ITEM_FIT, layer = 'front';
  if (typeof item === 'string') {
    svg = item;
  } else if (item && item.svg) {
    svg = item.svg;
    fit = item.fit || DEFAULT_ITEM_FIT;
    layer = item.layer || 'front';
  }
  const matrixStr = `matrix(${fit.a},${fit.b},${fit.c},${fit.d},${fit.e},${fit.f})`;
  const overlaySvg = svg ? `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;width:440px;height:460px;pointer-events:none;overflow:visible"><g transform="${matrixStr}">${svg}</g></svg>` : '';
  // Front-layer items (hats, glasses, neckwear) paint above the head/body; back-layer items
  // (capes) are inserted as the FIRST child of .pig so they paint behind body/arms/head —
  // draped over the shoulders instead of floating in front covering the whole pig.
  const overlayBack = svg && layer === 'back' ? overlaySvg : '';
  const overlayFront = svg && layer !== 'back' ? overlaySvg.replace('pointer-events:none;', 'pointer-events:none;z-index:10;') : '';
  return `<div class="pig-stage" style="--pig-scale:${scale}">
  <div class="pig-inner">
    <div class="pig-shadow"></div>
    <div class="pig">
      ${overlayBack}
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
      ${overlayFront}
    </div>
  </div>
</div>`;
}

// The player's own equipped cosmetic (bought and worn from the Shop) — used everywhere
// "their" Hammy appears (Home, Progress, quest/activity companion, quest story portraits,
// results) so a purchase visibly shows up across the whole app, not just on the Room page.
function getEquippedItem() {
  if (!state.equippedItem) return null;
  return SHOP_ITEMS.find(i => i.id === state.equippedItem) || null;
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

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const RARITY_WEIGHT = { common: 8, rare: 4, epic: 2, legendary: 1 };
const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const RARITY_COLOR = { common: '#2F9E44', rare: '#2E6FE0', epic: '#9B3FD6', legendary: '#C9781A' };
function itemRarity(item) { return RARITY_ORDER.includes(item.rarity) ? item.rarity : 'common'; }

function mysteryPoolAll(poolKey) {
  return SHOP_ITEMS.filter(i => i.mysteryPool === poolKey && !i.isMysteryBox);
}

function mysteryPoolUnowned(poolKey) {
  return mysteryPoolAll(poolKey).filter(i => !(state.ownedItems || []).includes(i.id));
}

function mysteryBoxNameFor(poolKey) {
  const box = SHOP_ITEMS.find(i => i.isMysteryBox && i.mysteryPool === poolKey);
  return box ? box.name : 'a Mystery Box';
}

function mysteryDropChance(item) {
  const pool = mysteryPoolAll(item.mysteryPool);
  const total = pool.reduce((sum, i) => sum + RARITY_WEIGHT[itemRarity(i)], 0);
  if (!total) return 0;
  return (RARITY_WEIGHT[itemRarity(item)] / total) * 100;
}

function mysteryOddsLabel(item) {
  const pct = mysteryDropChance(item);
  const pctStr = pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
  const rarity = itemRarity(item);
  return `<span style="color:${RARITY_COLOR[rarity]}">${RARITY_LABEL[rarity]} · ${pctStr}%</span>`;
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
  if (item.isMysteryBox) {
    const remaining = mysteryPoolUnowned(item.mysteryPool).length;
    if (!remaining) {
      btn = `<button class="shop-btn shop-btn-broke" disabled>✓ All items collected!</button>`;
    } else {
      btn = `<button class="shop-btn shop-btn-buy${canAfford ? '' : ' shop-btn-broke'}" data-id="${itemId}"${canAfford ? '' : ' disabled'}>🎁 Open Box · ${shopPriceLabel(item)}</button>`;
    }
  } else if (equipped) {
    btn = `<button class="shop-btn shop-btn-unequip" data-id="${itemId}">✓ ${isWallpaper ? 'Applied' : isRoom ? 'Placed' : 'Equipped'} · Remove</button>`;
  } else if (owned) {
    btn = `<button class="shop-btn shop-btn-equip" data-id="${itemId}">${isWallpaper ? 'Apply' : isRoom ? 'Place in room' : 'Equip'}</button>`;
  } else if (item.mysteryOnly) {
    btn = `<button class="shop-btn shop-btn-broke" disabled>🎁 Only from the ${mysteryBoxNameFor(item.mysteryPool)}</button>`;
  } else if (item.reward) {
    btn = `<button class="shop-btn shop-btn-broke" disabled>🎓 ${item.rewardHint || 'Complete all 10 modules to earn this'}</button>`;
  } else {
    btn = `<button class="shop-btn shop-btn-buy${canAfford ? '' : ' shop-btn-broke'}" data-id="${itemId}"${canAfford ? '' : ' disabled'}>${shopPriceLabel(item)}</button>`;
  }
  const vb = item.viewBox || CAT_VIEWBOX[item.category] || '0 0 120 120';
  document.getElementById('shop-modal-pig').innerHTML = (isWallpaper)
    ? `<div class="wallpaper-swatch" style="${item.wallCss}"></div>`
    : (isRoom || item.isMysteryBox)
      ? `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${item.svg}</svg>`
      : getPigWithItemMarkup(0.42, item);
  document.getElementById('shop-modal-accessory').innerHTML = (isRoom || item.isMysteryBox)
    ? ''
    : `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${item.svg}</svg>`;
  document.getElementById('shop-modal-name').textContent = item.name;
  document.getElementById('shop-modal-desc').innerHTML = item.desc + (item.mysteryPool && !item.isMysteryBox
    ? `<br><span class="shop-modal-odds">${mysteryOddsLabel(item)}</span>`
    : '');
  document.getElementById('shop-modal-btn-wrap').innerHTML = btn;
}

function showMysteryReveal(item) {
  const vb = item.viewBox || CAT_VIEWBOX[item.category] || '0 0 120 120';
  document.getElementById('shop-modal-pig').innerHTML = getPigWithItemMarkup(0.42, item);
  document.getElementById('shop-modal-accessory').innerHTML = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${item.svg}</svg>`;
  document.getElementById('shop-modal-name').textContent = `🎉 You got: ${item.name}!`;
  document.getElementById('shop-modal-desc').textContent = item.desc;
  document.getElementById('shop-modal-btn-wrap').innerHTML = `<button class="shop-btn shop-btn-equip" data-id="${item.id}">Nice!</button>`;
}

function openShopModal(itemId) {
  refreshShopModal(itemId);
  document.getElementById('shop-modal').removeAttribute('hidden');
}

function closeShopModal() {
  document.getElementById('shop-modal').setAttribute('hidden', '');
}

// ── SHOP ───────────────────────────────────────
let shopActiveTab = 'boutique';

const SHOP_CATEGORIES = [
  { key: 'exclusive', label: 'Diamond Exclusives', icon: '💎', tab: 'boutique' },
  { key: 'hat',     label: 'Hats',    icon: '🎩', tab: 'boutique' },
  { key: 'accessory', label: 'Accessories', icon: '🕶️', tab: 'boutique' },
  { key: 'reward',  label: 'Rewards', icon: '🏆', tab: 'boutique' },
  { key: 'room',    label: 'Room Decor', icon: '🛋️', tab: 'room' },
];

const CAT_VIEWBOX = {
  hat:     '14 -4 92 46',
  accessory: '6 72 108 62',
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

  const categoriesHtml = SHOP_CATEGORIES.filter(cat => cat.tab === shopActiveTab).map(cat => {
    const items = SHOP_ITEMS.filter(i => i.category === cat.key).slice().sort((a, b) => {
      if (!!a.isMysteryBox !== !!b.isMysteryBox) return a.isMysteryBox ? -1 : 1;
      const aIsPool = !!a.mysteryPool && !a.isMysteryBox;
      const bIsPool = !!b.mysteryPool && !b.isMysteryBox;
      if (aIsPool && bIsPool) return RARITY_ORDER.indexOf(itemRarity(a)) - RARITY_ORDER.indexOf(itemRarity(b));
      return 0;
    });
    const isExclusiveCat = cat.key === 'exclusive';
    const isRewardCat = cat.key === 'reward';
    const cardsHtml = items.map(item => {
      const isRoom = !!item.slot;
      const isDiamond = item.currency === 'diamond';
      const isReward = !!item.reward;
      const isBox = !!item.isMysteryBox;
      const isPoolItem = !!item.mysteryPool && !isBox;
      const owned = isRoom ? (state.ownedRoomItems || []).includes(item.id) : (state.ownedItems || []).includes(item.id);
      const equipped = isRoom ? state.equippedRoom[item.slot] === item.id : state.equippedItem === item.id;
      const isLocked = !!item.mysteryOnly && !owned;
      const boxRemaining = isBox ? mysteryPoolUnowned(item.mysteryPool).length : 0;
      const canAfford = isReward ? false : isLocked ? false : (isBox && !boxRemaining) ? false : shopBalanceFor(item) >= item.price;
      const statusLabel = isBox
        ? (boxRemaining ? `🎁 ${shopPriceLabel(item)}` : '✓ All collected!')
        : equipped
        ? (item.slot === 'wallpaper' ? '✓ Applied' : isRoom ? '✓ Placed' : '✓ Equipped')
        : owned ? 'Owned'
        : isLocked ? `🎁 ${mysteryBoxNameFor(item.mysteryPool)}`
        : isReward ? '🎓 Locked'
        : shopPriceLabel(item);
      const oddsLabel = isPoolItem ? `<div class="shop-item-odds">${mysteryOddsLabel(item)}</div>` : '';
      const preview = item.slot === 'wallpaper'
        ? `<div class="wallpaper-swatch" style="${item.wallCss}"></div>`
        : (isRoom || isBox)
          ? `<svg viewBox="${item.viewBox}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">${item.svg}</svg>`
          : getPigWithItemMarkup(0.29, item);
      return `<div class="shop-card${equipped ? ' shop-equipped' : ''}${owned && !equipped ? ' shop-owned' : ''}${!owned && !canAfford ? ' shop-broke' : ''}${isDiamond ? ' shop-exclusive-card' : ''}${(isReward || isLocked) && !owned ? ' shop-reward-card' : ''}" data-item-id="${item.id}">
        ${isDiamond && !isBox ? '<span class="shop-exclusive-ribbon">Mystery</span>' : ''}
        ${isBox ? '<span class="shop-exclusive-ribbon">Mystery</span>' : ''}
        ${isLocked && !isDiamond ? '<span class="shop-reward-ribbon">Mystery</span>' : ''}
        ${isReward && !owned ? '<span class="shop-reward-ribbon">Reward</span>' : ''}
        <div class="shop-preview">
          ${preview}
        </div>
        <div class="shop-card-body">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-price${isDiamond ? ' shop-price-diamond' : ''}${isReward || isLocked ? ' shop-price-reward' : ''}">${statusLabel}</div>
          ${oddsLabel}
        </div>
      </div>`;
    }).join('');
    return `<div class="shop-category${isExclusiveCat ? ' shop-category-exclusive' : ''}">
      <div class="shop-cat-header">
        <span class="shop-cat-icon">${cat.icon}</span>
        <h2 class="shop-cat-title">${cat.label}</h2>
        ${isExclusiveCat ? '<span class="shop-cat-tag">Earned via streaks, not coins</span>' : ''}
        ${isRewardCat ? '<span class="shop-cat-tag">Earned through major milestones, not bought</span>' : ''}
      </div>
      <div class="shop-items-grid">${cardsHtml}</div>
    </div>`;
  }).join('');

  const filledRoomSlots = Object.values(state.equippedRoom || {}).filter(Boolean).length;
  const storefrontHtml = shopActiveTab === 'room'
    ? `<div class="shop-storefront shop-storefront-room">
        <div class="shop-storefront-awning">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="shop-storefront-inner">
          <div class="shop-storefront-room-icon">🛋️</div>
          <div class="shop-storefront-text">
            <div class="shop-storefront-sign">The Furniture Farm</div>
            <div class="shop-storefront-sub">${filledRoomSlots ? `${filledRoomSlots} piece${filledRoomSlots === 1 ? '' : 's'} furnished so far` : 'Furnish Hammy\'s room — every cozy upgrade compounds!'}</div>
            <div class="shop-earn-tip">Earn 🪙 coins by completing lessons · 💎 diamonds every 3-day streak</div>
          </div>
        </div>
      </div>`
    : `<div class="shop-storefront">
        <div class="shop-storefront-awning">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="shop-storefront-inner">
          <div class="shop-storefront-pig">${getPigWithItemMarkup(0.2, getEquippedItem())}</div>
          <div class="shop-storefront-text">
            <div class="shop-storefront-sign">Porky's Boutique</div>
            <div class="shop-storefront-sub">${equippedItem ? `Currently wearing: <strong>${equippedItem.name}</strong>` : 'Pick something cute for your pig!'}</div>
            <div class="shop-earn-tip">Earn 🪙 coins by completing lessons · 💎 diamonds every 3-day streak</div>
          </div>
        </div>
      </div>`;

  grid.innerHTML = `
    ${storefrontHtml}
    ${categoriesHtml}`;

  grid.querySelectorAll('.shop-card[data-item-id]').forEach(card => {
    card.addEventListener('click', () => openShopModal(card.dataset.itemId));
  });

  updateShopNavHighlight();
}

function pickMysteryItem(poolKey) {
  const pool = mysteryPoolAll(poolKey);
  const unowned = pool.filter(i => !(state.ownedItems || []).includes(i.id));
  const candidates = unowned.length ? unowned : pool;
  const weighted = [];
  candidates.forEach(item => {
    const weight = RARITY_WEIGHT[itemRarity(item)];
    for (let k = 0; k < weight; k++) weighted.push(item);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function openMysteryBox(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item || !item.isMysteryBox) return null;
  if (shopBalanceFor(item) < item.price) return null;
  if (!mysteryPoolUnowned(item.mysteryPool).length) return null;
  const won = pickMysteryItem(item.mysteryPool);
  if (!won) return null;
  if (item.currency === 'diamond') state.diamonds -= item.price; else state.coins -= item.price;
  state.ownedItems = [...(state.ownedItems || []), won.id];
  saveState();
  return won;
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
        <div class="room-pig">${getPigWithItemMarkup(0.42, equippedOutfit || '')}</div>
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
function renderFinancialDashboardWidget() {
  const fs = state.financialState;
  const netWorth = fs.checking + fs.savings;
  return `
    <div class="findash-head">
      <h3>Your Simulated Finances</h3>
      <span class="findash-sub">Shifts as life events happen — practice, not real money</span>
    </div>
    <div class="findash-row">
      <div class="findash-stat">
        <div class="findash-label">Checking</div>
        <div class="findash-num">$${fs.checking.toLocaleString()}</div>
      </div>
      <div class="findash-stat">
        <div class="findash-label">Savings</div>
        <div class="findash-num">$${fs.savings.toLocaleString()}</div>
      </div>
      <div class="findash-stat">
        <div class="findash-label">Credit Score</div>
        <div class="findash-num">${fs.creditScore}</div>
      </div>
      <div class="findash-stat">
        <div class="findash-label">Net Worth</div>
        <div class="findash-num">$${netWorth.toLocaleString()}</div>
      </div>
    </div>`;
}

function renderHome() {
  showPage('home');
  updateSidebarStats();
  const done = Object.keys(state.completedModules).length;
  const tier = getTier(done);
  document.getElementById('h-tier').textContent = tier.name;
  document.getElementById('modules-home-sub').textContent = done === MODULES.length ? 'All complete — replay to master!' : `${done}/${MODULES.length} complete`;

  document.getElementById('home-mascot-card').innerHTML = `
    <div class="mascot-pig-wrap">${getPigWithItemMarkup(0.25, getEquippedItem())}</div>
    <div class="mascot-info">
      <div class="mascot-tier-name">${tier.name}</div>
      <div class="mascot-unlock">${getPigAccessoryDesc(state.level)}</div>
    </div>`;

  document.getElementById('home-findash').innerHTML = renderFinancialDashboardWidget();

  document.getElementById('home-noimpulse').innerHTML = renderNoImpulseBuyWidget();
  const checkinBtn = document.getElementById('noimpulse-checkin-btn');
  if (checkinBtn) checkinBtn.addEventListener('click', checkInNoImpulseBuy);

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
  renderAchievementBadges('home-achievements-row', 'home-achieve-sub', true);
}

// ── MODULES PAGE ───────────────────────────────
function renderModulesPage() {
  updateSidebarStats();
  const done = Object.keys(state.completedModules).length;
  document.getElementById('modules-sub').textContent = done === MODULES.length ? 'All complete — replay to master!' : `${done}/${MODULES.length} complete`;
  renderModuleList('modules-grid');
}

// Exiting a lesson, quiz, or quest always returns to the Modules tab (not Home), since
// that's where every one of these is launched from.
function exitToModules() {
  showPage('modules');
  renderModulesPage();
}

// ── BADGES PAGE ────────────────────────────────
function renderBadgesPage() {
  updateSidebarStats();
  renderAchievementBadges('achievements-row', 'achieve-sub');
}

// ── PROGRESS PAGE ──────────────────────────────
function renderProgressPage() {
  updateSidebarStats();
  const done = Object.keys(state.completedModules).length;
  const tier = getTier(done);
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
      <div class="pg-mascot-pig">${getPigWithItemMarkup(0.25, getEquippedItem())}</div>
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

// ── TOOLS PAGE (Budget Calculator + Compound Interest Simulator) ──────────────
// A persistent utility, not a lesson — reachable any time from the sidebar, independent of
// module progress. Both panels reuse existing chart/input conventions (.pg-bar-chart for
// category breakdowns, the same range-slider look as the quest engine's microsim sliders)
// rather than introducing new visual language.
const BUDGET_CATEGORY_LABELS = {
  groceries: 'Groceries', diningOut: 'Dining Out', foodDelivery: 'Food Delivery (DoorDash, Uber Eats, etc.)',
  coffee: 'Coffee', clothing: 'Clothing / Thrift', beauty: 'Beauty / Personal Care',
  transportation: 'Transportation', entertainment: 'Entertainment', textbooks: 'Textbooks', gym: 'Gym',
};
const BUDGET_CATEGORY_ORDER = ['groceries', 'diningOut', 'foodDelivery', 'coffee', 'clothing', 'beauty', 'transportation', 'entertainment', 'textbooks', 'gym'];

function computeBudgetTotals(plan) {
  const totalIncome = plan.incomeSources.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalFixed = plan.fixedExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalVariable = BUDGET_CATEGORY_ORDER.reduce((s, k) => s + (Number(plan.variableExpenses[k]) || 0), 0);
  const totalExpenses = totalFixed + totalVariable;
  const remaining = totalIncome - totalExpenses;
  const deliveryBeautyTotal = (Number(plan.variableExpenses.foodDelivery) || 0) + (Number(plan.variableExpenses.beauty) || 0);
  return { totalIncome, totalFixed, totalVariable, totalExpenses, remaining, deliveryBeautyTotal };
}

function renderToolsPage() {
  document.querySelectorAll('.tools-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tools-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'budget') renderBudgetCalculatorPanel();
      else renderCompoundInterestPanel();
    };
  });
  const activeTab = document.querySelector('.tools-tab.active');
  if (activeTab && activeTab.dataset.tab === 'compound') renderCompoundInterestPanel();
  else renderBudgetCalculatorPanel();
}

// Deep-link into the Tools page's Compound Interest tab from anywhere in the app (the
// Credit quest's payment-mechanics walkthrough and the Career & Salary callout both point
// here) — one simulator, referenced from multiple places, per spec. Remembers where the
// student came from so the panel can offer a way back to exactly that lesson/quest.
let compoundInterestReturnTo = null;
let pendingLifeEvent = null;
function openCompoundInterestSimulator() {
  // state.activeQuestId is never cleared after leaving a quest (it's not a "current screen"
  // flag, just "last quest touched"), so it stays truthy long after the user has moved on to
  // something else entirely. Check inBonusActivity first, and only trust activeQuestId if the
  // quest screen is actually the one on screen right now with a real, resolvable quest.
  const onQuestScreen = document.getElementById('screen-quest').classList.contains('active');
  const activeMod = MODULES.find(m => m.id === state.activeModuleId);
  const activeQuest = onQuestScreen && activeMod && activeMod.quests && activeMod.quests.find(q => q.id === state.activeQuestId);

  if (state.inBonusActivity) {
    compoundInterestReturnTo = { type: 'activity', moduleId: state.activeModuleId, lessonIdx: state.activeLessonIdx };
  } else if (activeQuest) {
    compoundInterestReturnTo = { type: 'quest', moduleId: state.activeModuleId, questId: state.activeQuestId };
  } else {
    compoundInterestReturnTo = null;
  }
  showPage('tools');
  document.querySelectorAll('.tools-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.tools-tab[data-tab="compound"]').classList.add('active');
  renderToolsPage();
}

function returnFromCompoundInterestSimulator() {
  const ret = compoundInterestReturnTo;
  if (!ret) { renderHome(); return; }
  compoundInterestReturnTo = null;
  if (ret.type === 'quest') startQuest(ret.moduleId, ret.questId);
  else startBonusActivity(ret.moduleId, ret.lessonIdx);
}

function renderBudgetCalculatorPanel() {
  const panel = document.getElementById('tools-panel');
  const plan = state.budgetPlan;
  if (plan.incomeSources.length === 0) plan.incomeSources.push({ id: 'inc0', label: 'Part-time job', amount: '' });
  if (plan.fixedExpenses.length === 0) plan.fixedExpenses.push({ id: 'fix0', label: 'Rent', amount: '' });

  panel.innerHTML = `
    <div class="budget-grid">
      <div class="budget-col">
        <div class="budget-card">
          <div class="budget-card-title">Monthly Income</div>
          <div class="budget-row-list" id="income-rows"></div>
          <button class="budget-add-btn" id="add-income" type="button">+ Add income source</button>
        </div>
        <div class="budget-card">
          <div class="budget-card-title">Fixed Expenses</div>
          <div class="budget-row-list" id="fixed-rows"></div>
          <button class="budget-add-btn" id="add-fixed" type="button">+ Add fixed expense</button>
        </div>
        <div class="budget-card">
          <div class="budget-card-title">Variable Expenses</div>
          <div class="budget-note">Food delivery and beauty services add up faster than most students expect — see your monthly total below.</div>
          <div class="budget-row-list" id="variable-rows"></div>
        </div>
        <div class="budget-card">
          <div class="budget-card-title">Savings Goal</div>
          <div class="budget-row">
            <span class="budget-row-label">I want to save</span>
            <div class="budget-input-wrap"><span class="budget-input-prefix">$</span><input type="number" id="savings-goal-input" class="budget-input" min="0" step="5" value="${plan.savingsGoal || ''}" placeholder="0"></div>
            <span class="budget-row-label">per month</span>
          </div>
        </div>
      </div>
      <div class="budget-col">
        <div class="budget-card budget-summary-card" id="budget-summary"></div>
        <div class="budget-card">
          <div class="budget-card-title">Spending by Category</div>
          <div class="pg-bar-chart" id="budget-bar-chart"></div>
        </div>
        <div class="budget-card">
          <div class="budget-card-title">What If?</div>
          <div class="budget-whatif" id="budget-whatif"></div>
        </div>
      </div>
    </div>`;

  function rowHtml(item, kind) {
    return `<div class="budget-row" data-id="${item.id}" data-kind="${kind}">
      <input type="text" class="budget-input budget-input-label" value="${item.label}" placeholder="Label" data-field="label">
      <div class="budget-input-wrap"><span class="budget-input-prefix">$</span><input type="number" class="budget-input" min="0" step="5" value="${item.amount}" placeholder="0" data-field="amount"></div>
      <button class="budget-row-remove" data-remove="${item.id}" type="button" aria-label="Remove">×</button>
    </div>`;
  }

  function renderRows() {
    document.getElementById('income-rows').innerHTML = plan.incomeSources.map(x => rowHtml(x, 'income')).join('');
    document.getElementById('fixed-rows').innerHTML = plan.fixedExpenses.map(x => rowHtml(x, 'fixed')).join('');
    document.getElementById('variable-rows').innerHTML = BUDGET_CATEGORY_ORDER.map(key => {
      const isCallout = key === 'foodDelivery' || key === 'beauty';
      return `<div class="budget-row${isCallout ? ' budget-row-callout' : ''}" data-key="${key}">
        <span class="budget-row-label">${BUDGET_CATEGORY_LABELS[key]}</span>
        <div class="budget-input-wrap"><span class="budget-input-prefix">$</span><input type="number" class="budget-input" min="0" step="5" value="${plan.variableExpenses[key] || ''}" placeholder="0" data-varkey="${key}"></div>
      </div>`;
    }).join('');

    document.querySelectorAll('#income-rows .budget-input, #fixed-rows .budget-input').forEach(wireRowInput);
    document.querySelectorAll('#income-rows .budget-row-remove, #fixed-rows .budget-row-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.budget-row');
        const kind = row.dataset.kind;
        const list = kind === 'income' ? plan.incomeSources : plan.fixedExpenses;
        const idx = list.findIndex(x => x.id === row.dataset.id);
        if (idx >= 0) list.splice(idx, 1);
        saveState();
        renderRows();
        renderSummaryAndChart();
      });
    });
    document.querySelectorAll('#variable-rows .budget-input').forEach(input => {
      input.addEventListener('input', () => {
        plan.variableExpenses[input.dataset.varkey] = input.value === '' ? 0 : Number(input.value);
        saveState();
        renderSummaryAndChart();
        highlightCallout();
      });
    });
    highlightCallout();
  }

  function highlightCallout() {
    const totals = computeBudgetTotals(plan);
    document.querySelectorAll('.budget-row-callout').forEach(row => {
      row.classList.toggle('over-threshold', totals.deliveryBeautyTotal > 100);
    });
  }

  function wireRowInput(input) {
    input.addEventListener('input', () => {
      const row = input.closest('.budget-row');
      const kind = row.dataset.kind;
      const list = kind === 'income' ? plan.incomeSources : plan.fixedExpenses;
      const item = list.find(x => x.id === row.dataset.id);
      if (!item) return;
      item[input.dataset.field] = input.dataset.field === 'amount' ? (input.value === '' ? '' : Number(input.value)) : input.value;
      saveState();
      renderSummaryAndChart();
    });
  }

  function renderSummaryAndChart() {
    const totals = computeBudgetTotals(plan);
    const summary = document.getElementById('budget-summary');
    const goalGap = plan.savingsGoal > 0 ? totals.remaining - plan.savingsGoal : null;
    let goalMsg = '';
    if (plan.savingsGoal > 0) {
      goalMsg = goalGap >= 0
        ? `<p class="budget-goal-msg ok">On track — this leaves $${goalGap.toFixed(0)}/month beyond your $${plan.savingsGoal} goal.</p>`
        : `<p class="budget-goal-msg bad">You'd need to cut about $${Math.abs(goalGap).toFixed(0)}/month to hit your $${plan.savingsGoal} savings goal.</p>`;
    }
    summary.innerHTML = `
      <div class="budget-card-title">Summary</div>
      <div class="budget-summary-row"><span>Total income</span><strong>$${totals.totalIncome.toFixed(0)}</strong></div>
      <div class="budget-summary-row"><span>Fixed expenses</span><strong>$${totals.totalFixed.toFixed(0)}</strong></div>
      <div class="budget-summary-row"><span>Variable expenses</span><strong>$${totals.totalVariable.toFixed(0)}</strong></div>
      <div class="budget-summary-divider"></div>
      <div class="budget-summary-row budget-remaining ${totals.remaining < 0 ? 'negative' : ''}"><span>Remaining balance</span><strong>$${totals.remaining.toFixed(0)}</strong></div>
      ${goalMsg}`;

    const maxVal = Math.max(totals.totalFixed, ...BUDGET_CATEGORY_ORDER.map(k => Number(plan.variableExpenses[k]) || 0), 1);
    const chart = document.getElementById('budget-bar-chart');
    chart.innerHTML = `
      <div class="pg-bar-row"><span class="pg-bar-label">Fixed Expenses</span><div class="pg-bar-track"><div class="pg-bar-fill pg-bar-pink" style="width:${Math.min(100, totals.totalFixed / maxVal * 100)}%"></div></div><span class="pg-bar-val">$${totals.totalFixed.toFixed(0)}</span></div>
      ${BUDGET_CATEGORY_ORDER.map(key => {
        const val = Number(plan.variableExpenses[key]) || 0;
        return `<div class="pg-bar-row"><span class="pg-bar-label">${BUDGET_CATEGORY_LABELS[key].replace(/\s*\(.*?\)/, '')}</span><div class="pg-bar-track"><div class="pg-bar-fill" style="width:${Math.min(100, val / maxVal * 100)}%"></div></div><span class="pg-bar-val">$${val.toFixed(0)}</span></div>`;
      }).join('')}`;

    renderWhatIf(totals);
  }

  function renderWhatIf(totals) {
    const whatif = document.getElementById('budget-whatif');
    const savedCategory = whatif.dataset.category || 'foodDelivery';
    const savedCut = Number(whatif.dataset.cut || 0);
    const currentVal = Number(plan.variableExpenses[savedCategory]) || 0;
    const maxCut = Math.min(100, currentVal);
    const cut = Math.min(savedCut, maxCut);
    const newRemaining = totals.remaining + cut;

    whatif.innerHTML = `
      <div class="budget-whatif-row">
        <select class="budget-input" id="whatif-category">
          ${BUDGET_CATEGORY_ORDER.map(key => `<option value="${key}" ${key === savedCategory ? 'selected' : ''}>${BUDGET_CATEGORY_LABELS[key].replace(/\s*\(.*?\)/, '')}</option>`).join('')}
        </select>
      </div>
      <input type="range" class="microsim-range" id="whatif-slider" min="0" max="${Math.max(1, maxCut)}" step="5" value="${cut}">
      <p class="budget-whatif-result">Cut this by <strong>$${cut.toFixed(0)}</strong> → remaining balance becomes <strong>$${newRemaining.toFixed(0)}</strong>${plan.savingsGoal > 0 ? (newRemaining >= plan.savingsGoal ? ' — enough to hit your savings goal.' : `, still $${Math.max(0, plan.savingsGoal - newRemaining).toFixed(0)} short of your goal.`) : '.'}</p>`;

    document.getElementById('whatif-category').addEventListener('change', (e) => {
      whatif.dataset.category = e.target.value;
      whatif.dataset.cut = 0;
      renderWhatIf(computeBudgetTotals(plan));
    });
    document.getElementById('whatif-slider').addEventListener('input', (e) => {
      whatif.dataset.category = savedCategory;
      whatif.dataset.cut = e.target.value;
      renderWhatIf(computeBudgetTotals(plan));
    });
  }

  document.getElementById('add-income').addEventListener('click', () => {
    plan.incomeSources.push({ id: 'inc' + Date.now(), label: 'New source', amount: '' });
    saveState();
    renderRows();
    renderSummaryAndChart();
  });
  document.getElementById('add-fixed').addEventListener('click', () => {
    plan.fixedExpenses.push({ id: 'fix' + Date.now(), label: 'New expense', amount: '' });
    saveState();
    renderRows();
    renderSummaryAndChart();
  });
  document.getElementById('savings-goal-input').addEventListener('input', (e) => {
    plan.savingsGoal = e.target.value === '' ? 0 : Number(e.target.value);
    saveState();
    renderSummaryAndChart();
  });

  renderRows();
  renderSummaryAndChart();
}

// Monthly-compounding projection with a monthly contribution. Used for both the savings/
// growth simulator and (with contribution 0 and a payment tracked separately) as the basis
// for the credit-card minimum-payment illustration below.
function computeCompoundGrowth({ startingAmount, monthlyContribution, annualRatePct, years }) {
  const monthlyRate = annualRatePct / 100 / 12;
  const months = Math.round(years * 12);
  const points = [{ month: 0, balance: startingAmount, contributed: startingAmount }];
  let balance = startingAmount;
  let contributed = startingAmount;
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    contributed += monthlyContribution;
    points.push({ month: m, balance, contributed });
  }
  return points;
}

// Minimum-payment credit card amortization — a common real formula (2% of balance or a $25
// floor, whichever is greater) so this illustrates the actual, not exaggerated, trap.
function computeMinPaymentDebt({ startingBalance, annualRatePct, months = 120 }) {
  const monthlyRate = annualRatePct / 100 / 12;
  let balance = startingBalance;
  let totalInterest = 0;
  const points = [{ month: 0, balance, totalInterest: 0 }];
  for (let m = 1; m <= months && balance > 0.5; m++) {
    const interest = balance * monthlyRate;
    const payment = Math.max(balance * 0.02, Math.min(25, balance));
    balance = Math.max(0, balance + interest - payment);
    totalInterest += interest;
    points.push({ month: m, balance, totalInterest });
  }
  return points;
}

// Generic stacked-area chart builder — the one genuinely new chart type in this app (the
// existing donut/bar/column components have no time-series/line chart equivalent). Two
// series stack: a base value (e.g. contributed) and a delta on top (e.g. interest earned),
// so the gap between the two lines reads as its own visual quantity.
function buildStackedAreaChart(points, baseKey, totalKey, { width = 480, height = 220, padding = 8 } = {}) {
  const maxY = Math.max(...points.map(p => p[totalKey]), 1);
  const n = points.length;
  const xAt = i => padding + (i / (n - 1)) * (width - padding * 2);
  const yAt = val => height - padding - (val / maxY) * (height - padding * 2);
  const baseline = height - padding;

  const basePts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[baseKey]).toFixed(1)}`);
  const totalPts = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[totalKey]).toFixed(1)}`);

  const baseArea = `M${padding},${baseline} L${basePts.join(' L')} L${(width - padding).toFixed(1)},${baseline} Z`;
  const deltaArea = `M${basePts[0]} L${basePts.join(' L')} L${totalPts.slice().reverse().join(' L')} Z`;
  const totalLine = `M${totalPts.join(' L')}`;

  return { baseArea, deltaArea, totalLine, width, height };
}

function renderCompoundInterestPanel() {
  const panel = document.getElementById('tools-panel');
  const sim = { startingAmount: 500, monthlyContribution: 100, annualRatePct: 8, years: 10, rateMode: 'index' };

  const returnBtnHtml = compoundInterestReturnTo
    ? `<button class="ci-return-btn" id="ci-return-btn" type="button">← Back to ${MODULES.find(m => m.id === compoundInterestReturnTo.moduleId).title}</button>`
    : '';

  panel.innerHTML = `
    ${returnBtnHtml}
    <div class="budget-grid">
      <div class="budget-col">
        <div class="budget-card">
          <div class="budget-card-title">Your Numbers</div>
          <div class="microsim-slider-row">
            <div class="microsim-slider-label"><span>Starting amount</span><span class="microsim-slider-val" id="ci-start-val">$${sim.startingAmount}</span></div>
            <input type="range" class="microsim-range" id="ci-start" min="0" max="5000" step="50" value="${sim.startingAmount}">
          </div>
          <div class="microsim-slider-row">
            <div class="microsim-slider-label"><span>Monthly contribution</span><span class="microsim-slider-val" id="ci-contrib-val">$${sim.monthlyContribution}</span></div>
            <input type="range" class="microsim-range" id="ci-contrib" min="0" max="1000" step="10" value="${sim.monthlyContribution}">
          </div>
          <div class="microsim-slider-row">
            <div class="microsim-slider-label"><span>Years</span><span class="microsim-slider-val" id="ci-years-val">${sim.years}</span></div>
            <input type="range" class="microsim-range" id="ci-years" min="1" max="47" step="1" value="${sim.years}">
          </div>
          <div class="ci-rate-presets" id="ci-rate-presets">
            <button class="ci-preset-btn" data-mode="hysa" type="button">HYSA<span>4–5%</span></button>
            <button class="ci-preset-btn active" data-mode="index" type="button">Index Fund<span>7–10%</span></button>
            <button class="ci-preset-btn" data-mode="custom" type="button">Custom</button>
          </div>
          <div class="microsim-slider-row">
            <div class="microsim-slider-label"><span>Annual interest rate</span><span class="microsim-slider-val" id="ci-rate-val">${sim.annualRatePct}%</span></div>
            <input type="range" class="microsim-range" id="ci-rate" min="1" max="12" step="0.5" value="${sim.annualRatePct}">
          </div>
          <button class="budget-add-btn" id="ci-compare-toggle" type="button">Compare: start at 18 vs. start at 28 →</button>
        </div>
        <div class="budget-card ci-warning-card">
          <div class="budget-card-title">⚠ Credit Card Warning</div>
          <p class="budget-note" style="margin-top:-0.2rem;">A $1,000 balance at 24% APR, paying only the minimum (2% of balance or $25, whichever is more) every month:</p>
          <div class="ci-chart-wrap" id="ci-debt-chart"></div>
          <p class="ci-debt-summary" id="ci-debt-summary"></p>
        </div>
      </div>
      <div class="budget-col">
        <div class="budget-card ci-result-card">
          <div class="budget-card-title">Where You'll Land</div>
          <div class="ci-headline" id="ci-headline"></div>
          <div class="ci-chart-wrap" id="ci-chart"></div>
          <div class="ci-legend">
            <span class="ci-legend-item"><span class="ci-swatch ci-swatch-contrib"></span>What you put in</span>
            <span class="ci-legend-item"><span class="ci-swatch ci-swatch-interest"></span>What interest earned</span>
          </div>
        </div>
        <div class="budget-card" id="ci-compare-card" style="display:none;"></div>
      </div>
    </div>`;

  function renderMainChart() {
    const points = computeCompoundGrowth(sim);
    const final = points[points.length - 1];
    document.getElementById('ci-headline').innerHTML =
      `<span class="ci-headline-num">$${Math.round(final.balance).toLocaleString()}</span>
       <span class="ci-headline-sub">after ${sim.years} year${sim.years === 1 ? '' : 's'} — you'll have put in $${Math.round(final.contributed).toLocaleString()}, interest earned the rest: $${Math.round(final.balance - final.contributed).toLocaleString()}</span>`;
    const chart = buildStackedAreaChart(points, 'contributed', 'balance');
    const chartEl = document.getElementById('ci-chart');
    chartEl.innerHTML = `
      <svg viewBox="0 0 ${chart.width} ${chart.height}" class="ci-svg">
        <path d="${chart.baseArea}" class="ci-area-contrib"></path>
        <path d="${chart.deltaArea}" class="ci-area-interest"></path>
        <path d="${chart.totalLine}" class="ci-line-total" pathLength="1000"></path>
      </svg>`;
    requestAnimationFrame(() => chartEl.querySelector('.ci-line-total').classList.add('drawn'));
  }

  function renderDebtChart() {
    const points = computeMinPaymentDebt({ startingBalance: 1000, annualRatePct: 24 });
    const final = points[points.length - 1];
    const chart = buildStackedAreaChart(points.map(p => ({ ...p, zero: 0 })), 'zero', 'balance');
    const chartEl = document.getElementById('ci-debt-chart');
    chartEl.innerHTML = `
      <svg viewBox="0 0 ${chart.width} ${chart.height}" class="ci-svg">
        <path d="${chart.deltaArea}" class="ci-area-debt"></path>
        <path d="${chart.totalLine}" class="ci-line-debt" pathLength="1000"></path>
      </svg>`;
    requestAnimationFrame(() => chartEl.querySelector('.ci-line-debt').classList.add('drawn'));
    const years = (points.length - 1) / 12;
    document.getElementById('ci-debt-summary').innerHTML = final.balance <= 0.5
      ? `Paid off after about ${years.toFixed(1)} years — total interest paid: <strong>$${Math.round(final.totalInterest).toLocaleString()}</strong>, more than the original balance.`
      : `Still not paid off after 10 years — total interest paid so far: <strong>$${Math.round(final.totalInterest).toLocaleString()}</strong>, and $${Math.round(final.balance).toLocaleString()} of the balance remains.`;
  }

  function renderComparison() {
    const card = document.getElementById('ci-compare-card');
    const gap = 65 - 18;
    const early = computeCompoundGrowth({ startingAmount: 0, monthlyContribution: sim.monthlyContribution, annualRatePct: sim.annualRatePct, years: gap });
    const late = computeCompoundGrowth({ startingAmount: 0, monthlyContribution: sim.monthlyContribution, annualRatePct: sim.annualRatePct, years: gap - 10 });
    const earlyFinal = early[early.length - 1].balance;
    const lateFinal = late[late.length - 1].balance;
    card.innerHTML = `
      <div class="budget-card-title">Start at 18 vs. Start at 28</div>
      <p class="budget-note" style="margin-top:-0.2rem;">Same $${sim.monthlyContribution}/month, same ${sim.annualRatePct}% rate, both stop contributing at 65. A 10-year head start:</p>
      <div class="ci-compare-row"><span>Start at 18</span><strong>$${Math.round(earlyFinal).toLocaleString()}</strong></div>
      <div class="ci-compare-row"><span>Start at 28</span><strong>$${Math.round(lateFinal).toLocaleString()}</strong></div>
      <div class="ci-compare-gap">The 10-year head start is worth <strong>$${Math.round(earlyFinal - lateFinal).toLocaleString()}</strong> more by 65 — from the same monthly amount.</div>`;
  }

  document.querySelectorAll('.ci-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ci-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.rateMode = btn.dataset.mode;
      if (btn.dataset.mode === 'hysa') sim.annualRatePct = 4.5;
      else if (btn.dataset.mode === 'index') sim.annualRatePct = 8.5;
      document.getElementById('ci-rate').value = sim.annualRatePct;
      document.getElementById('ci-rate-val').textContent = sim.annualRatePct + '%';
      renderMainChart();
      if (document.getElementById('ci-compare-card').style.display !== 'none') renderComparison();
    });
  });
  document.getElementById('ci-start').addEventListener('input', (e) => {
    sim.startingAmount = Number(e.target.value);
    document.getElementById('ci-start-val').textContent = '$' + sim.startingAmount;
    renderMainChart();
  });
  document.getElementById('ci-contrib').addEventListener('input', (e) => {
    sim.monthlyContribution = Number(e.target.value);
    document.getElementById('ci-contrib-val').textContent = '$' + sim.monthlyContribution;
    renderMainChart();
    if (document.getElementById('ci-compare-card').style.display !== 'none') renderComparison();
  });
  document.getElementById('ci-years').addEventListener('input', (e) => {
    sim.years = Number(e.target.value);
    document.getElementById('ci-years-val').textContent = sim.years;
    renderMainChart();
  });
  document.getElementById('ci-rate').addEventListener('input', (e) => {
    sim.annualRatePct = Number(e.target.value);
    sim.rateMode = 'custom';
    document.querySelectorAll('.ci-preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.ci-preset-btn[data-mode="custom"]').classList.add('active');
    document.getElementById('ci-rate-val').textContent = sim.annualRatePct + '%';
    renderMainChart();
    if (document.getElementById('ci-compare-card').style.display !== 'none') renderComparison();
  });
  document.getElementById('ci-compare-toggle').addEventListener('click', () => {
    const card = document.getElementById('ci-compare-card');
    const showing = card.style.display !== 'none';
    card.style.display = showing ? 'none' : 'block';
    document.getElementById('ci-compare-toggle').textContent = showing ? 'Compare: start at 18 vs. start at 28 →' : 'Hide comparison ▴';
    if (!showing) renderComparison();
  });

  if (compoundInterestReturnTo) {
    document.getElementById('ci-return-btn').addEventListener('click', returnFromCompoundInterestSimulator);
  }

  renderMainChart();
  renderDebtChart();
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
    const isActivity = !!lesson.type;
    const card = document.createElement('div');
    card.className = 'lesson-card' + (done ? ' done' : '');
    card.innerHTML = `
      <div class="lesson-num">Lesson ${idx + 1}</div>
      <div class="lesson-title">${lesson.title}${isActivity ? ' <span class="quest-tag">Interactive</span>' : ''}</div>
      <div class="lesson-meta">${done
        ? `Score: ${lessonData.score}/${lessonData.total} · ${lessonData.xpEarned} XP earned`
        : isActivity ? 'Interactive' : `${lesson.qIndices.length} questions`}
      </div>
      <div class="lesson-action">${done ? '↻ Replay' : 'Start →'}</div>`;
    card.addEventListener('click', () => {
      if (isActivity) startBonusActivity(moduleId, idx);
      else startHook(moduleId, idx);
    });
    container.appendChild(card);
  });

  showScreen('screen-module');
}

// ── BONUS ACTIVITY LESSONS (decision-chain / sorter) ───────────────────────────
// A handful of lessons need richer interaction than a multiple-choice quiz, but their
// module (Spending) is a plain lessons[]/questions[] module with no quest engine — giving
// it a `quests` array would hijack renderModuleList's hasQuest() gate and hide every other
// lesson. Instead these lessons carry `lesson.type` + `lesson.activity` and reuse the quest
// screen's chrome (title row, continue button, Hammy avatar, .option-btn/.pg-column-chart
// visual language) directly, without touching questProgress/getQP or the quest system at
// all — this is a standalone, self-contained flow parallel to startHook/startQuiz.
function startBonusActivity(moduleId, lessonIdx) {
  const mod = MODULES.find(m => m.id === moduleId);
  const lesson = mod.lessons[lessonIdx];
  state.activeModuleId = moduleId;
  state.activeLessonIdx = lessonIdx;
  state.inBonusActivity = true;
  state.activeQuestId = null;

  showScreen('screen-quest');
  document.getElementById('quest-dashboard').innerHTML = '';
  document.getElementById('quest-dashboard').classList.remove('highlight');
  document.getElementById('glossary-tray').innerHTML = '';
  document.getElementById('glossary-tray').classList.remove('show');
  document.getElementById('hint-budget').innerHTML = '';
  document.getElementById('quest-side').style.display = 'flex';
  document.getElementById('hammy-side-avatar').innerHTML = getPigWithItemMarkup(window.innerWidth <= 768 ? 0.28 : 0.64, getEquippedItem());
  document.getElementById('hammy-side-avatar').className = 'hammy-side-avatar';
  document.getElementById('hammy-side-msg').textContent = '';
  document.getElementById('hammy-side-msg').className = 'hammy-side-msg';
  document.getElementById('quest-counter').textContent = lesson.title;
  document.getElementById('quest-prog-fill').style.width = '0%';
  document.getElementById('quest-pct').textContent = '';
  const titleRow = document.getElementById('quest-title-row');
  titleRow.textContent = lesson.title;
  titleRow.classList.remove('centered');
  clearQuestContinue();

  if (lesson.type === 'decision-chain') renderDecisionChainActivity(mod, lesson);
  else if (lesson.type === 'sorter') renderSorterActivity(mod, lesson);
  else if (lesson.type === 'callout') renderCalloutActivity(mod, lesson);
  else if (lesson.type === 'boss-challenge') renderBossChallengeActivity(mod, lesson);
}

// bonusXp: extra, purely additive XP on top of the normal reward — used by the
// boss-challenge activity type's optimal-path reward, never punitive if omitted/0.
function finishBonusActivity(mod, lesson, lessonIdx, bonusXp = 0) {
  state.inBonusActivity = false;
  const activity = lesson.activity;
  const wasDone = !!state.completedLessons[`${mod.id}_${lessonIdx}`];
  const xpEarned = (wasDone ? Math.round(activity.xpOnComplete * 0.5) : activity.xpOnComplete) + bonusXp;
  const coinsEarned = wasDone ? 6 : 16;
  state.coins = (state.coins || 0) + coinsEarned;
  state.completedLessons[`${mod.id}_${lessonIdx}`] = { score: 1, total: 1, xpEarned };
  const prev = state.completedModules[mod.id];
  if (!prev) state.completedModules[mod.id] = { score: 1, total: 1, xpEarned };

  const diamondsEarned = updateStreak();
  const leveled = addXP(xpEarned);
  const newAchs = checkAchievements();
  saveState();
  showScreen('screen-results');
  renderResults(mod, 1, 1, xpEarned, wasDone, newAchs, coinsEarned, diamondsEarned);
  maybeShowPostCompletionOverlays(mod, leveled);
}

// ── Activity type: decision-chain (opportunity cost) ───────────────────────────
function renderDecisionChainActivity(mod, lesson) {
  const activity = lesson.activity;
  const main = document.getElementById('quest-main');
  const results = [];
  let idx = 0;
  const totalSteps = activity.decisions.length + 1; // + the summary screen

  function updateActivityProgress(step) {
    const pct = Math.round((step / totalSteps) * 100);
    document.getElementById('quest-prog-fill').style.width = pct + '%';
    document.getElementById('quest-pct').textContent = pct + '%';
  }

  function renderIntro() {
    updateActivityProgress(0);
    clearQuestContinue();
    main.innerHTML = `<p class="quest-prompt">${activity.intro}</p>`;
    setQuestContinue(activity.startLabel || 'Start →', () => { idx = 0; renderDecision(); }, true);
  }

  function renderDecision() {
    updateActivityProgress(idx);
    clearQuestContinue();
    const d = activity.decisions[idx];
    main.innerHTML = `
      ${d.day ? `<div class="opcost-day-tag">${d.day}</div>` : ''}
      <p class="quest-prompt">${d.prompt}</p>
      <div class="decision-choices" id="opcost-choices"></div>`;
    const choicesEl = document.getElementById('opcost-choices');
    d.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'option-btn decision-choice-btn';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => {
        choicesEl.querySelectorAll('button').forEach(b => b.disabled = true);
        results.push({ day: d.day, choiceLabel: choice.label, cost: choice.cost, gaveUp: choice.gaveUp, good: choice.good });
        showHammyMessage(choice.good ? "Nice — that adds up over time!" : "Worth noticing what that traded off.", choice.good);
        const outcome = document.createElement('div');
        outcome.className = 'decision-outcome';
        outcome.innerHTML = `<p class="quest-outcome-text">${choice.cost > 0 ? `That's $${choice.cost} spent. What you gave up instead: ${choice.gaveUp}.` : (choice.gaveUp ? choice.gaveUp : `You kept the $${d.choices.find(c => c.cost > 0) ? d.choices.find(c => c.cost > 0).cost : ''} in your pocket.`)}</p>`;
        main.appendChild(outcome);
        const isLast = idx === activity.decisions.length - 1;
        setQuestContinue(isLast ? (activity.finalChoiceLabel || 'See the Results →') : (activity.nextLabel || 'Next →'), () => {
          if (isLast) {
            renderSummary();
          } else {
            const advance = () => { idx++; renderDecision(); };
            const lifeEvent = maybeTriggerAmbientLifeEvent();
            if (lifeEvent) showLifeEvent(lifeEvent, advance); else advance();
          }
        }, true);
      });
      choicesEl.appendChild(btn);
    });
  }

  function renderSummary() {
    updateActivityProgress(totalSteps);
    clearQuestContinue();
    const takeawayHtml = activity.takeaway
      ? `<div class="opcost-takeaway"><span class="myth-card-tag">KEY TAKEAWAY</span><p>${activity.takeaway}</p></div>` : '';

    if (results.length === 1) {
      // A single decision doesn't need a week-long bar chart — just the outcome plus the
      // broader lesson it's illustrating.
      const r = results[0];
      main.innerHTML = `
        <p class="quest-prompt">${activity.summaryIntro || "Here's what that choice set in motion."}</p>
        <div class="opcost-summary" id="opcost-summary">
          <div class="opcost-summary-item"><strong>You chose:</strong> ${r.choiceLabel}</div>
        </div>
        ${takeawayHtml}`;
    } else {
      const totalSpent = results.reduce((s, r) => s + r.cost, 0);
      const maxVal = Math.max(...results.map(r => r.cost), 1);
      const barsHtml = results.map(r => `
        <div class="pg-col">
          <div class="pg-col-val">$${r.cost}</div>
          <div class="pg-col-bar-wrap"><div class="pg-col-bar${r.cost === 0 ? ' pg-col-pink' : ''}" style="height:${Math.max(4, r.cost / maxVal * 100)}%"></div></div>
          <div class="pg-col-name">${r.day}</div>
        </div>`).join('');
      main.innerHTML = `
        <p class="quest-prompt">${activity.summaryIntro || "Here's your week — the path you took, and what each choice actually cost beyond the price tag."}</p>
        <div class="pg-column-chart">${barsHtml}</div>
        <div class="opcost-summary" id="opcost-summary">
          ${results.map(r => `<div class="opcost-summary-item"><strong>${r.day}:</strong> ${r.choiceLabel}${r.cost > 0 ? ` — <span class="opcost-gave-up">gave up: ${r.gaveUp}</span>` : ''}</div>`).join('')}
          <p class="opcost-total">Total spent this week: <strong>$${totalSpent}</strong></p>
        </div>
        ${takeawayHtml}`;
    }
    setQuestContinue('Finish →', () => finishBonusActivity(mod, lesson, state.activeLessonIdx), true);
  }

  renderIntro();
}

// ── Activity type: boss-challenge (multi-stage decision gauntlet with a running dashboard
// stat and a bonus-XP-only "optimal path" reward) ──────────────────────────────
// Reuses the real quest engine's .quest-stat-chip dashboard chip and tween/animate approach
// (see renderQuestDashboard/applyQuestStateDelta) against a local value instead of
// qp.dashboard, since this lesson has no quest/questProgress behind it.
function renderBossChallengeActivity(mod, lesson) {
  const activity = lesson.activity;
  const main = document.getElementById('quest-main');
  const totalSteps = activity.stages.length + 1;
  let idx = 0;
  let value = activity.startingValue;
  let allOptimal = true;

  function renderDashboard() {
    document.getElementById('quest-dashboard').innerHTML = `
      <div class="quest-stat-chip" data-key="bossVal">
        <span class="qs-label">${activity.dashboardLabel}</span>
        <span class="qs-val">${formatMoney(value)}</span>
      </div>`;
  }

  function animateDashboard(from, to) {
    const chipWrap = document.querySelector('.quest-stat-chip[data-key="bossVal"]');
    if (!chipWrap) return;
    const chipVal = chipWrap.querySelector('.qs-val');
    chipWrap.classList.remove('qs-up', 'qs-down');
    if (to !== from) chipWrap.classList.add(to > from ? 'qs-up' : 'qs-down');
    tweenNumber(chipVal, from, to, { money: true });
    setTimeout(() => chipWrap.classList.remove('qs-up', 'qs-down'), 1400);
  }

  function updateProgress(step) {
    const pct = Math.round((step / totalSteps) * 100);
    document.getElementById('quest-prog-fill').style.width = pct + '%';
    document.getElementById('quest-pct').textContent = pct + '%';
  }

  function renderIntro() {
    renderDashboard();
    updateProgress(0);
    clearQuestContinue();
    main.innerHTML = `<p class="quest-prompt">${activity.intro}</p>`;
    setQuestContinue(activity.startLabel || 'Start the Challenge →', () => { idx = 0; renderStage(); }, true);
  }

  function renderStage() {
    updateProgress(idx);
    clearQuestContinue();
    const s = activity.stages[idx];
    main.innerHTML = `
      ${s.tag ? `<div class="opcost-day-tag">${s.tag}</div>` : ''}
      <p class="quest-prompt">${s.prompt}</p>
      <div class="decision-choices" id="bossc-choices"></div>`;
    const choicesEl = document.getElementById('bossc-choices');
    s.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'option-btn decision-choice-btn';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => {
        choicesEl.querySelectorAll('button').forEach(b => b.disabled = true);
        const from = value;
        value += choice.delta;
        animateDashboard(from, value);
        if (!choice.isOptimal) allOptimal = false;
        showHammyMessage(choice.isOptimal ? "Nice — that's the smarter play." : "Worth noticing what that cost you.", choice.isOptimal);
        const outcome = document.createElement('div');
        outcome.className = 'decision-outcome';
        outcome.innerHTML = `<p class="quest-outcome-text">${choice.result}</p>`;
        main.appendChild(outcome);
        const isLast = idx === activity.stages.length - 1;
        setQuestContinue(isLast ? (activity.finalChoiceLabel || 'See the Results →') : (activity.nextLabel || 'Next →'), () => {
          if (isLast) {
            renderSummary();
          } else {
            const advance = () => { idx++; renderStage(); };
            const lifeEvent = maybeTriggerAmbientLifeEvent();
            if (lifeEvent) showLifeEvent(lifeEvent, advance); else advance();
          }
        }, true);
      });
      choicesEl.appendChild(btn);
    });
  }

  function renderSummary() {
    updateProgress(totalSteps);
    clearQuestContinue();
    const threshold = activity.passThreshold ?? 0;
    const endNote = value >= threshold ? (activity.endNoteAtOrAbove || '') : (activity.endNoteBelow || '');
    const takeawayHtml = activity.takeaway
      ? `<div class="opcost-takeaway"><span class="myth-card-tag">KEY TAKEAWAY</span><p>${activity.takeaway}</p></div>` : '';
    const bonusXp = allOptimal ? (activity.bonusXpForOptimalPath || 0) : 0;
    const bonusHtml = bonusXp > 0
      ? `<div class="bossc-bonus"><span class="myth-card-tag">OPTIMAL PATH</span><p>Every choice this run was the strongest option on the table — +${bonusXp} bonus XP.</p></div>` : '';

    main.innerHTML = `
      <p class="quest-prompt">${activity.summaryIntro || "Here's how the challenge played out."}</p>
      <div class="opcost-summary" id="bossc-summary">
        <div class="opcost-summary-item"><strong>${activity.dashboardLabel} ended at:</strong> ${formatMoney(value)}</div>
        ${endNote ? `<div class="opcost-summary-item">${endNote}</div>` : ''}
      </div>
      ${bonusHtml}
      ${takeawayHtml}`;
    setQuestContinue('Finish →', () => finishBonusActivity(mod, lesson, state.activeLessonIdx, bonusXp), true);
  }

  renderIntro();
}

// ── Activity type: sorter (wants vs needs vs it depends) ───────────────────────
function renderSorterActivity(mod, lesson) {
  const activity = lesson.activity;
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  const placements = {}; // itemId -> bucket key
  let selectedId = null;

  main.innerHTML = `
    <p class="quest-prompt">${activity.intro}</p>
    <div class="sorter-pool" id="sorter-pool"></div>
    <div class="sorter-buckets">
      <div class="sorter-bucket" data-bucket="need"><div class="sorter-bucket-title">Need</div><div class="sorter-bucket-items" id="bucket-need"></div></div>
      <div class="sorter-bucket" data-bucket="want"><div class="sorter-bucket-title">Want</div><div class="sorter-bucket-items" id="bucket-want"></div></div>
      <div class="sorter-bucket" data-bucket="depends"><div class="sorter-bucket-title">It Depends</div><div class="sorter-bucket-items" id="bucket-depends"></div></div>
    </div>
    <div class="sorter-progress" id="sorter-progress"></div>`;

  function renderPool() {
    const pool = document.getElementById('sorter-pool');
    const remaining = activity.items.filter(it => !placements[it.id]);
    const placedCount = activity.items.length - remaining.length;
    pool.innerHTML = remaining.map(it => `<button class="sorter-chip${it.id === selectedId ? ' selected' : ''}" data-id="${it.id}">${it.label}</button>`).join('');
    pool.querySelectorAll('.sorter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedId = chip.dataset.id === selectedId ? null : chip.dataset.id;
        renderPool();
      });
    });
    document.getElementById('sorter-progress').textContent = `${placedCount} of ${activity.items.length} sorted`;
    const pct = Math.round((placedCount / activity.items.length) * 100);
    document.getElementById('quest-prog-fill').style.width = pct + '%';
    document.getElementById('quest-pct').textContent = pct + '%';
  }

  function renderBuckets() {
    ['need', 'want', 'depends'].forEach(bucket => {
      const el = document.getElementById(`bucket-${bucket}`);
      const items = activity.items.filter(it => placements[it.id] === bucket);
      el.innerHTML = items.map(it => `<span class="sorter-chip placed" data-id="${it.id}">${it.label}</span>`).join('');
    });
  }

  document.querySelectorAll('.sorter-bucket').forEach(bucketEl => {
    bucketEl.addEventListener('click', (e) => {
      if (e.target.closest('.sorter-chip.placed')) return;
      if (!selectedId) return;
      placements[selectedId] = bucketEl.dataset.bucket;
      selectedId = null;
      renderPool();
      renderBuckets();
      if (Object.keys(placements).length === activity.items.length) {
        setQuestContinue('Check My Sorting →', revealResults, true);
      }
    });
  });

  function revealResults() {
    clearQuestContinue();
    document.querySelectorAll('.sorter-chip.placed').forEach(chipEl => {
      const item = activity.items.find(it => it.id === chipEl.dataset.id);
      const placedBucket = placements[item.id];
      const correct = item.category === 'depends' || placedBucket === item.category;
      chipEl.classList.add(correct ? 'correct' : 'wrong');
      if (item.note) {
        const note = document.createElement('div');
        note.className = 'sorter-note';
        note.textContent = item.note;
        chipEl.after(note);
      }
    });
    const correctCount = activity.items.filter(it => it.category === 'depends' || placements[it.id] === it.category).length;
    showHammyMessage(correctCount === activity.items.length ? "You caught every one!" : "A few gray areas — that's normal, that's the point.", correctCount === activity.items.length);
    const note = document.createElement('p');
    note.className = 'sorter-final-note';
    note.textContent = activity.subscriptionCreepNote || '';
    document.getElementById('sorter-progress').after(note);
    setQuestContinue('Finish →', () => finishBonusActivity(mod, lesson, state.activeLessonIdx), true);
  }

  renderPool();
  renderBuckets();
}

// ── Activity type: callout (single-screen informational note with a live example) ──
function renderCalloutActivity(mod, lesson) {
  const activity = lesson.activity;
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  document.getElementById('quest-prog-fill').style.width = '100%';
  document.getElementById('quest-pct').textContent = '100%';

  let exampleHtml = '';
  if (activity.example) {
    const points = computeCompoundGrowth(activity.example);
    const final = points[points.length - 1];
    exampleHtml = `
      <div class="callout-example">
        <div class="callout-example-num">$${Math.round(final.balance).toLocaleString()}</div>
        <p class="callout-example-sub">${activity.example.label}</p>
      </div>`;
  }

  main.innerHTML = `
    <p class="quest-prompt">${activity.body}</p>
    ${exampleHtml}
    ${activity.linkOut ? `<button class="teach-linkout-btn" id="callout-linkout-btn" type="button">${activity.linkOut.label} →</button>` : ''}`;

  if (activity.linkOut) {
    document.getElementById('callout-linkout-btn').addEventListener('click', () => {
      if (activity.linkOut.action === 'compound-interest') openCompoundInterestSimulator();
    });
  }

  setQuestContinue('Got it →', () => finishBonusActivity(mod, lesson, state.activeLessonIdx), true);
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

  maybeShowPostCompletionOverlays(mod, leveled);
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
    `<div class="new-ach-banner"><span class="ach-abbr" style="--ach-color: ${a.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${a.icon}</svg></span><div><strong>Unlocked: ${a.label}</strong><span>${a.desc}</span></div></div>`
  ).join('');
  const diamondHtml = diamondsEarned > 0 ? buildStreakDiamondBanner(diamondsEarned) : '';
  const gradHtml = (newAchs.some(a => a.id === 'stackd_star') ? buildGraduationBanner() : '') + buildMilestoneRewardBanner(newAchs);

  document.getElementById('results-wrap').innerHTML = `
    <div class="results-grade">${grade}</div>
    <h2 class="results-title">${title}</h2>
    <p class="results-score">You got <strong>${score} out of ${total}</strong> correct${wasReplay ? ' · replay (0.5× XP)' : ''}</p>
    <div class="results-rewards-row">
      <div class="results-xp-card">
        <div class="results-xp-num">+${xpEarned} XP</div>
        <div class="results-xp-label">${getTier(Object.keys(state.completedModules).length).name} · ${state.xp.toLocaleString()} total</div>
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
      <button class="btn-primary" id="res-home">Back to Modules</button>
      <button class="btn-secondary" id="res-replay">Replay Module</button>
    </div>`;

  document.getElementById('res-home').addEventListener('click', exitToModules);
  document.getElementById('res-replay').addEventListener('click', () => showModuleDetail(mod.id));
}

// ══════════════════════════════════════════════
// QUEST ENGINE — narrative-driven modules (Phase 1 pilot: Credit)
// ══════════════════════════════════════════════

function hasQuest(mod) { return Array.isArray(mod.quests) && mod.quests.length > 0; }
// Core lesson quests only — excludes "real-life" sub-quests (bonus practical walkthroughs
// attached to a parent quest via parentQuestId), so module completion/mastery and the tile
// grid don't require the bonus content to be counted as one of the module's lessons.
function mainQuests(mod) { return (mod.quests || []).filter(q => !q.parentQuestId); }
function subQuestFor(mod, questId) { return (mod.quests || []).find(q => q.parentQuestId === questId); }
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
  state.inBonusActivity = false;
  const key = questKey(moduleId, questId);
  const existing = state.questProgress[key];
  // Repairs saves left over from the old Continue-button bug, where chapterIdx climbed
  // past the quest's actual chapter count instead of the quest ever being marked done.
  if (existing && !existing.done && existing.chapterIdx >= quest.chapters.length) {
    existing.done = true;
  }
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
// (their small inline dialogue portrait already appears within the story beats themselves).
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
  spotcheck: 'Spot the Red Flags',
  urlinspect: 'Real URL or Fake?',
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
  hammySide.innerHTML = getPigWithItemMarkup(window.innerWidth <= 768 ? 0.28 : 0.64, getEquippedItem());
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
    case 'spotcheck': renderSpotcheckChapter(chapter, mod, onDone); break;
    case 'urlinspect': renderUrlInspectChapter(chapter, mod, onDone); break;
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
  if (qp.chapterIdx < getActiveQuest(mod).chapters.length) {
    saveState();
    renderChapter(mod, qp.chapterIdx);
  } else {
    // Sub-quests (real-life step-by-step guides) end on a knowledgecheck instead of a
    // bossbattle, so there's no finishQuest() call to close them out — without this,
    // chapterIdx climbed past the chapter array on every extra Continue click, which
    // both broke the progress bar (>100%) and crashed the next render (chapters[idx]
    // was undefined), making Continue look dead.
    finishSubQuest(mod);
  }
}

// ── Sub-quest finish (no boss battle — closes out via a lighter congrats screen) ──
function finishSubQuest(mod) {
  const qp = getQP(mod);
  qp.done = true;
  const newAchs = checkAchievements();
  saveState();
  showScreen('screen-results');
  renderSubQuestResults(mod, qp, newAchs);
}

function renderSubQuestResults(mod, qp, newAchs) {
  const quest = getActiveQuest(mod);
  // Sub-quest chapters award their XP as they go (via each chapter's own xpOnComplete),
  // so the total here is just what those chapters are worth — nothing left to add now.
  const xpEarned = quest.chapters.reduce((sum, c) => sum + (c.xpOnComplete || 0), 0);
  const achHtml = newAchs.map(a =>
    `<div class="new-ach-banner"><span class="ach-abbr" style="--ach-color: ${a.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${a.icon}</svg></span><div><strong>Unlocked: ${a.label}</strong><span>${a.desc}</span></div></div>`
  ).join('');

  document.getElementById('results-wrap').innerHTML = `
    <div class="subquest-celebrate-hammy hammy-side-avatar streak">${getPigWithItemMarkup(0.55, getEquippedItem())}</div>
    <div class="results-grade">Sub-Quest Complete</div>
    <h2 class="results-title">${quest.topic}</h2>
    <p class="results-score">Hammy just walked through this one step by step, for real — here's what stuck.</p>
    <div class="results-rewards-row">
      <div class="results-xp-card">
        <div class="results-xp-num">+${xpEarned} XP</div>
        <div class="results-xp-label">${getTier(Object.keys(state.completedModules).length).name} · ${state.xp.toLocaleString()} total</div>
      </div>
    </div>
    ${achHtml}
    ${buildQuestReport(mod, qp)}
    <div class="results-actions">
      <button class="btn-primary" id="res-home">Back to Modules</button>
      <button class="btn-secondary" id="res-replay">Replay Sub-Quest</button>
    </div>`;

  document.getElementById('res-home').addEventListener('click', exitToModules);
  document.getElementById('res-replay').addEventListener('click', () => startQuest(mod.id, state.activeQuestId));
}

// Per-module quests track different dashboard stats (credit score, portfolio value, a
// mistake-avoidance meter, etc.) — this is the one place that knows how to label/format
// each. Unlisted keys default to a plain rounded number, not money.
const DASHBOARD_STAT_META = {
  creditScore: { label: 'Credit Score', isMoney: false },
  checking: { label: 'Checking', isMoney: true },
  savings: { label: 'Savings', isMoney: true },
  // Shared 0-100 "how are you doing" meter for every non-credit module's simulator chapter
  // (credit keeps its own 300-850 creditScore meter) — one generic gauge reused everywhere
  // instead of a bespoke dashboard stat per module.
  moneyScore: { label: 'Money Smarts', isMoney: false },
  portfolioValue: { label: 'Portfolio', isMoney: true },
};
function renderQuestDashboard(mod) {
  const dash = getQP(mod).dashboard;
  const el = document.getElementById('quest-dashboard');
  el.innerHTML = Object.keys(dash).map(key => {
    const meta = DASHBOARD_STAT_META[key] || { label: key, isMoney: false };
    return `<div class="quest-stat-chip" data-key="${key}">
      <span class="qs-label">${meta.label}</span>
      <span class="qs-val">${meta.isMoney ? formatMoney(dash[key]) : Math.round(dash[key])}</span>
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
    const isMoney = (DASHBOARD_STAT_META[key] || { isMoney: false }).isMoney;
    chipWrap.classList.remove('qs-up', 'qs-down');
    if (to !== from) chipWrap.classList.add(to > from ? 'qs-up' : 'qs-down');
    tweenNumber(chipVal, from, to, { money: isMoney });
    setTimeout(() => chipWrap.classList.remove('qs-up', 'qs-down'), 1400);
  });
  return changes;
}

// Compact Hammy face (reuses the existing pig markup, cropped to just the head via .pig-head-stage).
// Shows the player's own equipped item so a purchase shows up here too, not just full-body views.
function getHammyFaceMarkup(scale) {
  return getPigWithItemMarkup(scale, getEquippedItem()).replace('class="pig-stage"', 'class="pig-stage pig-head-stage"');
}

// Glossary tray — every term taught moves here once the student clicks past it, so they can
// always tap back and reread a definition instead of it disappearing for good. Terms are
// grouped by the chapter section they came from (e.g. "Credit Card Basics") so a long quest
// doesn't turn into one giant wall of chips — tap a section, then tap a word within it.
function pushLearnedTerm(mod, term, plain, section) {
  const qp = getQP(mod);
  if (!qp.learnedTerms) qp.learnedTerms = [];
  if (!qp.learnedTerms.some(t => t.term === term)) qp.learnedTerms.push({ term, plain, section: section || 'Other Terms' });
  saveState();
  renderGlossaryTray(mod);
}

function renderGlossaryTray(mod) {
  const tray = document.getElementById('glossary-tray');
  if (!tray) return;
  const terms = (getQP(mod).learnedTerms) || [];
  if (!terms.length) { tray.innerHTML = ''; tray.classList.remove('show'); return; }
  tray.classList.add('show');

  // Group into sections, preserving the order each section was first encountered.
  const sections = [];
  terms.forEach(t => {
    const name = t.section || 'Other Terms';
    let section = sections.find(s => s.name === name);
    if (!section) { section = { name, terms: [] }; sections.push(section); }
    section.terms.push(t);
  });

  tray.innerHTML = `<span class="glossary-label">📖 Look back:</span>` + sections.map((s, i) =>
    `<button class="glossary-chip glossary-section-chip" data-idx="${i}">${s.name} <span class="glossary-count">${s.terms.length}</span></button>`
  ).join('');
  tray.querySelectorAll('.glossary-section-chip').forEach(btn => {
    btn.addEventListener('click', () => showGlossarySectionPopup(sections[Number(btn.dataset.idx)]));
  });
}

function getGlossaryModal() {
  let modal = document.getElementById('glossary-popup');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'glossary-popup';
    modal.className = 'glossary-popup-overlay';
    document.getElementById('screen-quest').appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
  }
  return modal;
}

// Step 1 of the look-back flow: tapping a section shows just the words taught in it.
function showGlossarySectionPopup(section) {
  const modal = getGlossaryModal();
  modal.innerHTML = `<div class="glossary-popup-card">
    <div class="glossary-popup-section-title">${section.name}</div>
    <div class="glossary-popup-word-grid" id="glossary-popup-word-grid"></div>
    <button class="btn-secondary" id="glossary-popup-close">Close</button>
  </div>`;
  const grid = document.getElementById('glossary-popup-word-grid');
  section.terms.forEach((t, i) => {
    const chip = document.createElement('button');
    chip.className = 'glossary-popup-word-chip';
    chip.textContent = t.term.replace(/\s*\(.*?\)/, '');
    chip.addEventListener('click', () => showGlossaryPopup(t, section));
    grid.appendChild(chip);
  });
  modal.classList.add('show');
  document.getElementById('glossary-popup-close').addEventListener('click', () => modal.classList.remove('show'));
}

// Step 2: tapping a word within a section shows its definition, with a way back to the
// section's word list so re-checking a few words in a row doesn't mean re-opening the tray
// each time.
function showGlossaryPopup(term, backToSection) {
  const modal = getGlossaryModal();
  modal.innerHTML = `<div class="glossary-popup-card">
    ${backToSection ? `<button class="glossary-popup-back" id="glossary-popup-back">← Back to ${backToSection.name}</button>` : ''}
    <div class="glossary-popup-term">${term.term}</div>
    <p class="glossary-popup-def">${term.plain}</p>
    <button class="btn-primary" id="glossary-popup-close">Got it</button>
  </div>`;
  modal.classList.add('show');
  document.getElementById('glossary-popup-close').addEventListener('click', () => modal.classList.remove('show'));
  if (backToSection) {
    document.getElementById('glossary-popup-back').addEventListener('click', () => showGlossarySectionPopup(backToSection));
  }
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
// correct-streak for 3-in-a-row — no new avatar is created, they're always already there. The
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
        ${c.linkOut ? `<button class="teach-linkout-btn" id="teach-linkout-btn" type="button">${c.linkOut.label} →</button>` : ''}
      </div>
      <div class="word-check" id="word-check"></div>`;

    if (c.linkOut) {
      document.getElementById('teach-linkout-btn').addEventListener('click', () => {
        // Clicking through to an external tool from the final step of a walkthrough finishes
        // that step — resuming later should continue forward into the next chapter (the boss
        // battle), not restart this whole walkthrough back at step 1. Reuses the exact same
        // "Got it →" completion path (award XP, advance) rather than duplicating it.
        if (isLast) {
          const continueBtn = document.getElementById('quest-continue-btn');
          if (continueBtn) continueBtn.click();
        }
        if (c.linkOut.action === 'compound-interest') openCompoundInterestSimulator();
      });
    }

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
      pushLearnedTerm(mod, c.term, c.plain, chapter.title);
      setQuestContinue(isLast ? 'Got it →' : 'Next Word →', () => {
        if (isLast) {
          if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
          onDone();
        } else {
          const advance = () => { idx++; renderConcept(); };
          const lifeEvent = maybeTriggerAmbientLifeEvent();
          if (lifeEvent) showLifeEvent(lifeEvent, advance); else advance();
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
      <p class="teach-plain hint-placeholder">Tap Hammy to hear what they have to say.</p>
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

  // The establishing "intro" beat(s) — Hammy's whole body plus a caption — get their own
  // screen. Once the story shifts into back-and-forth dialogue, Continue reveals one beat
  // at a time, but they build up together on that same second screen instead of replacing
  // each other — the log only clears once, right at that intro-to-dialogue handoff.
  let splitIdx = 0;
  while (splitIdx < chapter.beats.length && chapter.beats[splitIdx].speaker === 'intro') splitIdx++;

  let beatIdx = 0;
  showBeat();

  function showBeat() {
    const beat = chapter.beats[beatIdx];
    const isLast = beatIdx === chapter.beats.length - 1;
    if (beatIdx === 0 || beatIdx === splitIdx) log.innerHTML = '';
    const entry = document.createElement('div');
    // Title centers to match the centered establishing shot, then moves back to the left
    // edge once the beats shift into back-and-forth dialogue.
    document.getElementById('quest-title-row').classList.toggle('centered', beat.speaker === 'intro');

    // "intro" beats are a big establishing shot — the character front-and-center with a
    // caption, used to set the scene before the story shifts into back-and-forth dialogue.
    if (beat.speaker === 'intro') {
      entry.className = 'intro-scene';
      // Measure the room actually left under the sticky header in real pixels (instead of
      // guessing with a vh-minus-constant), then size the protagonist to fit inside it — so
      // this is always centered with zero scrolling regardless of viewport height.
      const available = computeAvailableQuestHeight();
      const captionBudget = 210; // rough space reserved for the caption + gap below the avatar
      const maxScale = window.innerWidth <= 640 ? 0.62 : 0.85;
      const introScale = Math.max(0.4, Math.min(maxScale, (available - captionBudget) / 460));
      entry.innerHTML = `<div class="intro-avatar">${getPigWithItemMarkup(introScale, getEquippedItem())}</div><p class="intro-caption">${beat.text}</p>`;
      entry.style.minHeight = Math.max(240, available) + 'px';
    } else {
      const isNarrator = beat.speaker === 'narrator';
      const isProtagonist = beat.speaker === charName;
      entry.className = `story-beat ${isNarrator ? 'is-narrator' : ''}`;
      // Narration isn't Hammy talking, so it gets no avatar at all — showing Hammy's face
      // next to narrator text made it read as if Hammy were narrating, which was confusing.
      const avatarDiv = isNarrator ? '' : `<div class="story-avatar has-character">${isProtagonist ? getHammyFaceMarkup(0.13) : beat.speaker.charAt(0)}</div>`;
      entry.innerHTML = `
        ${avatarDiv}
        <div class="story-bubble ${isNarrator ? 'narrator' : ''}">${beat.text}</div>`;
    }
    log.appendChild(entry);

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
      // Net effect across every dashboard stat the choice touches — not just creditScore —
      // so modules whose decisions move checking/savings/etc. still get an accurate
      // positive/negative Hammy reaction instead of always reading as "good."
      const deltaSum = Object.values(choice.outcome.delta || {}).reduce((a, b) => a + b, 0);
      const wasGoodChoice = deltaSum >= 0;
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
    showHammyReaction(mod, tier.ok);
    // Swap the interactive sliders out for a compact recap of what was chosen, instead of
    // appending the result underneath everything — that extra height was pushing the page
    // past the viewport and forcing a scroll right when the result appears.
    const chosenHtml = chapter.sliders.map(s => `<div class="microsim-cost-row"><span>${s.label}</span><span>$${sliderValues[s.id]}</span></div>`).join('');
    main.innerHTML = `
      <p class="quest-prompt">${chapter.prompt}</p>
      <div class="microsim-costs">
        <div class="microsim-cost-row microsim-income-row"><span>Monthly income</span><span>$${chapter.income}</span></div>
        ${costsHtml}
        ${chosenHtml}
      </div>
      <div class="microsim-leftover-row"><span>Left over</span><span class="microsim-leftover ${leftover < 0 ? 'negative' : ''}">$${leftover}</span></div>
      <div class="microsim-result ${tier.ok ? 'ok' : 'bad'}">
        <p>${tier.text}</p>
        ${tier.ok ? '' : '<button class="btn-secondary" id="microsim-retry-btn">Try Again</button>'}
      </div>`;
    if (tier.ok) {
      setQuestContinue('Continue →', () => {
        if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
        onDone();
      }, true);
    } else {
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

      // No claimed crowd statistics here — we don't have real survey data backing any
      // specific percentage, so the reveal sticks to the actual true/false answer and why,
      // the same way a myth card does, instead of implying a poll that never happened.
      const revealEl = document.getElementById('poll-reveal');
      revealEl.innerHTML = `
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

// ── Chapter type: spotcheck (tap-to-flag red flags in a block of content) ──────
// Mirrors the myth-card-tag/is-true/is-false reveal convention so tapping through a fake
// job posting reads as the same "test your instincts, then see the answer" language as
// polls and myth cards elsewhere in the quest engine.
function renderSpotcheckChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  const flaggedIds = new Set();

  function segmentHtml(seg, revealed) {
    if (!revealed) {
      return `<span class="spotcheck-segment" data-id="${seg.id}">${seg.text}</span> `;
    }
    const wasFlagged = flaggedIds.has(seg.id);
    let cls = 'correct-safe';
    if (seg.isRedFlag && wasFlagged) cls = 'correct-flag';
    else if (seg.isRedFlag && !wasFlagged) cls = 'missed-flag';
    else if (!seg.isRedFlag && wasFlagged) cls = 'false-positive';
    return `<span class="spotcheck-segment revealed ${cls}" data-id="${seg.id}">${seg.text}</span> `;
  }

  function render(revealed) {
    if (!revealed) {
      main.innerHTML = `
        <p class="quest-prompt">${chapter.intro}</p>
        <div class="spotcheck-posting">
          <div class="spotcheck-title">${chapter.postingTitle}</div>
          <p class="spotcheck-body">${chapter.segments.map(s => segmentHtml(s, false)).join('')}</p>
        </div>`;
      main.querySelectorAll('.spotcheck-segment').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          if (flaggedIds.has(id)) { flaggedIds.delete(id); el.classList.remove('flagged'); }
          else { flaggedIds.add(id); el.classList.add('flagged'); }
        });
      });
      setQuestContinue('Check My Answers →', () => render(true), true);
    } else {
      // The posting collapses behind a toggle once revealed — every flagged phrase already
      // gets quoted in its own summary card below, so keeping the full posting expanded too
      // just doubles the same text on screen and forces a scroll on shorter viewports.
      const flags = chapter.segments.filter(s => s.isRedFlag);
      const caughtCount = flags.filter(s => flaggedIds.has(s.id)).length;
      main.innerHTML = `
        <p class="quest-prompt">${chapter.intro}</p>
        <button class="spotcheck-toggle" id="spotcheck-toggle" type="button">Show the original posting ▾</button>
        <div class="spotcheck-posting collapsed" id="spotcheck-posting">
          <div class="spotcheck-title">${chapter.postingTitle}</div>
          <p class="spotcheck-body">${chapter.segments.map(s => segmentHtml(s, true)).join('')}</p>
        </div>
        <div class="spotcheck-summary" id="spotcheck-summary">
          <p class="spotcheck-score">You caught ${caughtCount} of ${flags.length} red flags.</p>
          ${flags.map(s => `
            <div class="spotcheck-summary-item ${flaggedIds.has(s.id) ? 'caught' : 'missed'}">
              <span class="myth-card-tag">${flaggedIds.has(s.id) ? '✓ YOU CAUGHT THIS' : 'YOU MISSED THIS'}</span>
              <p class="spotcheck-summary-text">"${s.text}"</p>
              <p class="spotcheck-summary-exp">${s.explanation}</p>
            </div>`).join('')}
        </div>`;
      const toggleBtn = document.getElementById('spotcheck-toggle');
      const postingEl = document.getElementById('spotcheck-posting');
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = postingEl.classList.toggle('collapsed');
        toggleBtn.textContent = isCollapsed ? 'Show the original posting ▾' : 'Hide the original posting ▴';
      });
      showHammyReaction(mod, caughtCount === flags.length);
      setQuestContinue('Continue →', () => {
        if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
        onDone();
      }, true);
    }
  }

  render(false);
}

// ── Chapter type: urlinspect (tap parts of a URL to identify what's suspicious) ─
function renderUrlInspectChapter(chapter, mod, onDone) {
  const main = document.getElementById('quest-main');
  clearQuestContinue();
  const flaggedIds = new Set();

  function partHtml(part, revealed) {
    if (!revealed) {
      return `<span class="urlinspect-part" data-id="${part.id}">${part.segment}</span>`;
    }
    const wasFlagged = flaggedIds.has(part.id);
    let cls = 'correct-safe';
    if (part.isSuspicious && wasFlagged) cls = 'correct-flag';
    else if (part.isSuspicious && !wasFlagged) cls = 'missed-flag';
    else if (!part.isSuspicious && wasFlagged) cls = 'false-positive';
    return `<span class="urlinspect-part revealed ${cls}" data-id="${part.id}">${part.segment}</span>`;
  }

  function render(revealed) {
    if (!revealed) {
      main.innerHTML = `
        <p class="quest-prompt">${chapter.intro}</p>
        <div class="urlinspect-bar">${chapter.parts.map(p => partHtml(p, false)).join('')}</div>`;
      main.querySelectorAll('.urlinspect-part').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          if (flaggedIds.has(id)) { flaggedIds.delete(id); el.classList.remove('flagged'); }
          else { flaggedIds.add(id); el.classList.add('flagged'); }
        });
      });
      setQuestContinue('Check My Answer →', () => render(true), true);
    } else {
      // Collapse the URL bar behind a toggle once revealed — same reasoning as spotcheck:
      // every part is already quoted in its own summary card below.
      const suspicious = chapter.parts.filter(p => p.isSuspicious);
      const caughtCount = suspicious.filter(p => flaggedIds.has(p.id)).length;
      main.innerHTML = `
        <p class="quest-prompt">${chapter.intro}</p>
        <button class="spotcheck-toggle" id="urlinspect-toggle" type="button">Show the full URL ▾</button>
        <div class="urlinspect-bar collapsed" id="urlinspect-bar-wrap">${chapter.parts.map(p => partHtml(p, true)).join('')}</div>
        <div class="spotcheck-summary" id="urlinspect-summary">
          <p class="spotcheck-score">You caught ${caughtCount} of ${suspicious.length} suspicious part${suspicious.length === 1 ? '' : 's'}.</p>
          ${chapter.parts.map(p => `
            <div class="spotcheck-summary-item ${!p.isSuspicious ? 'caught' : flaggedIds.has(p.id) ? 'caught' : 'missed'}">
              <span class="myth-card-tag">${p.isSuspicious ? (flaggedIds.has(p.id) ? '✓ YOU CAUGHT THIS' : 'YOU MISSED THIS') : 'THIS PART IS FINE'}</span>
              <p class="spotcheck-summary-text">"${p.segment}"</p>
              <p class="spotcheck-summary-exp">${p.note}</p>
            </div>`).join('')}
          <p class="urlinspect-final-note">${chapter.correctAnswerNote}</p>
        </div>`;
      const toggleBtn = document.getElementById('urlinspect-toggle');
      const barEl = document.getElementById('urlinspect-bar-wrap');
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = barEl.classList.toggle('collapsed');
        toggleBtn.textContent = isCollapsed ? 'Show the full URL ▾' : 'Hide the full URL ▴';
      });
      showHammyReaction(mod, caughtCount === suspicious.length);
      setQuestContinue('Continue →', () => {
        if (chapter.xpOnComplete) { addXP(chapter.xpOnComplete); saveState(); }
        onDone();
      }, true);
    }
  }

  render(false);
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
  // A live meter that climbs/falls as one-shot decisions are clicked. Originally hardcoded
  // to "credit score, 300-850" — now reads meterKey/meterMin/meterMax from chapter data
  // (defaulting to those exact values) so every module can reuse the same mechanic with its
  // own topic-appropriate meter (savings rate, mistake-avoidance score, etc.).
  'credit-climb': {
    render(container, chapter, mod, onDone) {
      const qp = getQP(mod);
      const meterKey = chapter.meterKey || 'creditScore';
      const min = chapter.meterMin ?? 300;
      const max = chapter.meterMax ?? 850;
      let score = qp.dashboard[meterKey];
      const usedIds = new Set();
      const pctFor = s => Math.max(0, Math.min(100, (s - min) / (max - min) * 100));

      function render() {
        container.innerHTML = `
          <p class="quest-prompt">${chapter.intro}</p>
          <div class="sim-meter-wrap">
            <div class="sim-meter-score" id="sim-score">${Math.round(score)}</div>
            <div class="sim-meter-track"><div class="sim-meter-marker" id="sim-marker" style="left:${pctFor(score)}%"></div></div>
            <div class="sim-meter-scale"><span>${min}</span><span>${max}</span></div>
          </div>
          <div class="sim-decisions" id="sim-decisions">
            ${chapter.decisions.map(d => `<button class="option-btn sim-decision-btn" data-id="${d.id}" ${usedIds.has(d.id) ? 'disabled' : ''}>${d.label}</button>`).join('')}
          </div>`;

        container.querySelectorAll('.sim-decision-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const d = chapter.decisions.find(x => x.id === btn.dataset.id);
            usedIds.add(d.id);
            const from = score;
            score = Math.max(min, Math.min(max, score + d.scoreDelta));
            qp.dashboard[meterKey] = score;
            saveState();
            renderQuestDashboard(mod);
            document.getElementById('sim-marker').style.left = pctFor(score) + '%';
            tweenNumber(document.getElementById('sim-score'), from, score, {});
            // Hammy narrates the actual explanation for this decision, in their speech bubble,
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

  maybeShowPostCompletionOverlays(mod, leveled);
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
        <div class="hammy-report-avatar">${getPigWithItemMarkup(0.4, getEquippedItem())}</div>
        <p><strong>Hammy's advice:</strong> ${advice}</p>
      </div>
    </div>`;
}

function renderQuestResults(mod, xpEarned, coinsEarned, newAchs, consequenceText, qp, diamondsEarned) {
  const achHtml = newAchs.map(a =>
    `<div class="new-ach-banner"><span class="ach-abbr" style="--ach-color: ${a.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${a.icon}</svg></span><div><strong>Unlocked: ${a.label}</strong><span>${a.desc}</span></div></div>`
  ).join('');
  const diamondHtml = diamondsEarned > 0 ? buildStreakDiamondBanner(diamondsEarned) : '';
  const gradHtml = (newAchs.some(a => a.id === 'stackd_star') ? buildGraduationBanner() : '') + buildMilestoneRewardBanner(newAchs);

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
        <div class="results-xp-label">${getTier(Object.keys(state.completedModules).length).name} · ${state.xp.toLocaleString()} total</div>
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
      <button class="btn-primary" id="res-home">Back to Modules</button>
      <button class="btn-secondary" id="res-replay">Replay Quest</button>
    </div>`;

  document.getElementById('res-home').addEventListener('click', exitToModules);
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
      else if (page === 'tools')    { compoundInterestReturnTo = null; renderToolsPage(); }
      else if (page === 'badges')   renderBadgesPage();
      else if (page === 'room')     renderRoomPage();
      else if (page === 'shop')     renderShopPage();
      else if (page === 'settings') renderSettingsPage();
    });
  });

  const shopSubnav = document.getElementById('nav-shop-subnav');
  document.getElementById('nav-shop-btn').addEventListener('click', () => {
    shopSubnav.classList.toggle('open');
    document.getElementById('nav-shop-btn').classList.toggle('collapsed', !shopSubnav.classList.contains('open'));
  });

  document.querySelectorAll('.nav-subitem[data-shop-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      shopActiveTab = btn.dataset.shopTab;
      shopSubnav.classList.add('open');
      document.getElementById('nav-shop-btn').classList.remove('collapsed');
      showPage('shop');
      renderShopPage();
    });
  });

  document.getElementById('mod-detail-exit').addEventListener('click', exitToModules);
  document.getElementById('hook-exit').addEventListener('click', exitToModules);
  document.getElementById('hook-start').addEventListener('click', startQuiz);
  document.getElementById('quiz-exit').addEventListener('click', () => {
    if (confirm('Exit quiz? Your progress for this session will be lost.')) exitToModules();
  });
  document.getElementById('quest-exit').addEventListener('click', () => {
    if (state.inBonusActivity) {
      state.inBonusActivity = false;
      exitToModules();
      return;
    }
    if (confirm('Exit the quest? Your progress is saved up to your last completed chapter.')) exitToModules();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (state.currentQ < state.sessionQuestions.length - 1) {
      const advance = () => { state.currentQ++; renderQuestion(); };
      const lifeEvent = maybeTriggerAmbientLifeEvent();
      if (lifeEvent) showLifeEvent(lifeEvent, advance); else advance();
    } else {
      finishQuiz();
    }
  });
  document.getElementById('levelup-ok').addEventListener('click', () => {
    document.getElementById('levelup-overlay').classList.remove('visible');
    if (pendingLifeEvent) {
      const ev = pendingLifeEvent;
      pendingLifeEvent = null;
      setTimeout(() => showLifeEvent(ev), 300);
    }
  });

  const shopModal = document.getElementById('shop-modal');
  shopModal.addEventListener('click', e => {
    if (e.target === shopModal) { closeShopModal(); return; }
    const btn = e.target.closest('.shop-btn[data-id]');
    if (btn) {
      const clickedItem = SHOP_ITEMS.find(i => i.id === btn.dataset.id);
      if (clickedItem && clickedItem.isMysteryBox) {
        const won = openMysteryBox(btn.dataset.id);
        if (won) showMysteryReveal(won);
        renderShopPage();
      } else {
        handleShopAction(btn.dataset.id);
        refreshShopModal(btn.dataset.id);
        renderShopPage();
      }
    }
  });
  document.getElementById('shop-modal-close').addEventListener('click', closeShopModal);

  loadState();
  state.lifeEvents.sessionCount++;
  saveState();
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
