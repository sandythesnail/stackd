/** "Life happens…" events — the interruption that pops up mid-lesson and makes you spend a
 * decision instead of reading about one.
 *
 * The three GENERAL_LIFE_EVENTS below are ported from the website's LIFE_EVENTS (app.js) —
 * id/tag/title/scenario/choices/result text match exactly, so the two platforms tell the same
 * three stories. Everything in MODULE_LIFE_EVENTS is mobile-only for now: with only those
 * three in the pool, the same scenario came back over and over. `effect`
 * (savings/checking/creditScore) isn't modelled here since the mobile app has no financial-
 * simulation state to mutate yet; only `coinDelta` (which maps onto the real coins the app
 * does track) actually changes anything, and ambient events deliberately leave it unset so
 * adding thirty of them can't quietly inflate the economy. */
export type LifeEventChoice = {
  id: string;
  label: string;
  coinDelta?: number;
  result: string;
};

export type LifeEvent = {
  id: string;
  tag: string;
  title: string;
  scenario: string;
  choices: LifeEventChoice[];
  /** The module this scenario belongs to, if any. Tagged events are preferred when the event
   * fires during (or just after) that module's lessons, so the interruption is about the
   * thing being learned. Untagged events fit anywhere — see pickAmbientLifeEvent. */
  moduleId?: string;
};

/** Fits after any lesson, whatever the topic. Website-parity set. */
const GENERAL_LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'car_repair',
    tag: 'Uh oh!',
    title: "The Car Won't Start",
    scenario: "It's 7:45am and you have an 8am final. Your car won't start. The mechanic says it's the alternator: $380, and they can have it done by tomorrow if you say yes right now.",
    choices: [
      { id: 'a', label: 'Pay it from savings', result: 'You cover it in full. Your savings takes a hit, but you walk away with zero debt and a working car.' },
      { id: 'b', label: "Put it on a credit card you're still paying off", result: 'The card absorbs it today. If you only pay the minimum, this $380 repair could quietly cost you $500+ by the time it\'s paid off.' },
      { id: 'c', label: 'Ask a parent to cover it, pay them back over time', result: 'No interest, no credit hit, but you now owe someone who trusts you. Worth protecting that.' },
    ],
  },
  {
    id: 'roommate_ghosted',
    tag: 'Life happens...',
    title: 'Your Roommate Stopped Paying Rent',
    scenario: 'Your name is on the lease with a roommate. This month, they said they\'d "get you back" and never paid their $450 half. Rent is due in 2 days.',
    choices: [
      { id: 'a', label: 'Cover their half from your emergency savings', result: "You avoid a late fee and a landlord conversation, but now you're the one owed money, and collecting from a friend is its own project." },
      { id: 'b', label: 'Pay only your half and let the landlord chase them', result: 'Depending on your lease, a missed partial payment can still show up as a late payment on the whole unit, including your name.' },
      { id: 'c', label: "Pay your half, ask for a written payment plan on theirs", result: 'You keep the lease current and start a paper trail. Get any repayment agreement in writing, even a text.' },
    ],
  },
  {
    id: 'medical_bill',
    tag: 'Something unexpected happened!',
    title: "A Bill You Didn't See Coming",
    scenario: 'You went to urgent care for what turned out to be nothing serious. Three weeks later, a bill for $210 shows up. Your insurance covered less than you expected.',
    choices: [
      { id: 'a', label: 'Pay it in full right away', result: 'Handled. One less thing hanging over you, and no risk of it going to collections.' },
      { id: 'b', label: "Ignore it and deal with it later", result: 'Unpaid medical bills can go to collections faster than people expect, and a collections account can knock a credit score down hard for years.' },
      { id: 'c', label: 'Call the billing office and ask for a payment plan', result: 'Most providers have an interest-free payment plan, but almost nobody asks. A 5-minute call turns $210 into $35/month.' },
    ],
  },
];

/** Three per module, so the interruption is about whatever you're in the middle of learning.
 * Keys are module ids from @/data. */
const MODULE_LIFE_EVENTS: Record<string, LifeEvent[]> = {
  earning: [
    {
      id: 'earn_first_paycheck',
      tag: 'Wait, what?',
      title: 'Your First Paycheck Is Short',
      scenario: 'You worked 20 hours at $16/hr at the campus library. You did the math: $320. The deposit says $271.44.',
      choices: [
        { id: 'a', label: 'Assume payroll made a mistake and email HR', result: "Worth checking, but the math usually holds up. That $48.56 is FICA (Social Security and Medicare) plus withholding — it left before you ever saw it. Gross is the promise, net is the paycheck." },
        { id: 'b', label: 'Read the pay stub line by line', result: 'Exactly the right move. The stub itemises every deduction, and it\'s the only way to catch a real error — like being taxed as if you work full-time all year.' },
        { id: 'c', label: 'Shrug and move on', result: "Understandable, but budgeting off gross pay is how people end up short every month. Build your budget on the number that actually lands." },
      ],
    },
    {
      id: 'earn_cash_shift',
      tag: 'Life happens...',
      title: 'Paid Under the Table',
      scenario: "A local cafe offers you weekend shifts at $18/hr, cash, no paperwork. That's better than your campus job pays, and they want an answer today.",
      choices: [
        { id: 'a', label: 'Take it — cash is cash', result: "More per hour today, but off-the-books work builds no earnings record: no W-2, no proof of income for an apartment application, and nothing paid into Social Security under your name." },
        { id: 'b', label: 'Ask to be put on the books instead', result: "The professional answer. You may net slightly less per hour, but you get a pay stub, legal protection if they stiff you, and income you can actually document." },
        { id: 'c', label: 'Turn it down', result: 'Fair. Just know the issue isn\'t cash itself — it\'s whether the work is reported. Plenty of legitimate jobs pay cash and still issue a W-2 or 1099.' },
      ],
    },
    {
      id: 'earn_overtime_clash',
      tag: 'Uh oh!',
      title: 'An Extra Shift, A Worse Grade',
      scenario: "Your manager offers a Sunday shift: 8 hours, $128 after tax. You have a midterm Monday in the class you're already sitting at a B-minus in.",
      choices: [
        { id: 'a', label: 'Take the shift, study after', result: "$128 is real money. So is a GPA — it gates scholarships, internships and grad school. Just make the trade knowingly instead of by default." },
        { id: 'b', label: 'Decline and study', result: "You protected the asset with the bigger long-run payoff. One shift is $128; a scholarship you keep is often thousands." },
        { id: 'c', label: 'Ask for a shorter shift', result: 'The move most people forget. Managers usually prefer four hours to none, and asking costs nothing.' },
      ],
    },
  ],

  spending: [
    {
      id: 'spend_meal_plan_gone',
      tag: 'Uh oh!',
      title: 'Your Meal Plan Ran Out in March',
      scenario: "You just tapped your student ID at the dining hall and it declined. Your meal plan is empty, and there are seven weeks of semester left.",
      choices: [
        { id: 'a', label: 'Add $400 to the plan', result: "Convenient, and campus dining is often priced above grocery cost per meal. Fine if you have it — just know you're paying for the convenience." },
        { id: 'b', label: 'Start cooking with a grocery budget', result: "Usually the cheapest path: $40-60/week of groceries beats most meal-plan top-ups. The real cost is time, and time in March is not free." },
        { id: 'c', label: 'Work out what went wrong first', result: 'The most useful five minutes you can spend. Dividing the plan by weeks in the semester gives you a per-week number, and that\'s the thing to track next term.' },
      ],
    },
    {
      id: 'spend_group_dinner',
      tag: 'Life happens...',
      title: 'Split It Evenly?',
      scenario: "Eight of you go out for someone's birthday. You ordered a $12 pasta and water. The table wants to split evenly: $34 each, because half the table ordered cocktails and appetisers.",
      choices: [
        { id: 'a', label: 'Pay the $34, keep the peace', result: "Sometimes that's the right call for a friendship. Just notice it's a $22 choice, not a $0 one — and that this table will do it again." },
        { id: 'b', label: 'Offer to pay for what you ordered', result: "Slightly awkward for ten seconds. Said plainly and without apology — \"I'll grab mine, I only had the pasta\" — it's almost never a problem." },
        { id: 'c', label: 'Say something before ordering next time', result: "The version that avoids the whole situation. Deciding how the bill splits at the start of dinner is much easier than renegotiating at the end." },
      ],
    },
    {
      id: 'spend_subscription_creep',
      tag: 'Something unexpected happened!',
      title: 'Seven Subscriptions',
      scenario: 'You scroll your bank app and count them: two streaming services, a music app, cloud storage, a fitness app you used twice, a game pass, and something called "PRO PLAN" for $9.99 you cannot identify. Total: $61/month.',
      choices: [
        { id: 'a', label: 'Cancel everything you did not use this month', result: "$61/month is $732/year. Cancelling the four you'd forgotten about is one of the highest hourly-rate things you'll do all semester." },
        { id: 'b', label: 'Keep them, they are only a few dollars each', result: "That's exactly the design. Individually trivial, collectively a phone bill. Subscriptions are priced to stay below the threshold where you'd bother to cancel." },
        { id: 'c', label: 'Track down the mystery $9.99 first', result: "Smart — an unrecognised recurring charge is sometimes a free trial you forgot, and sometimes card fraud. Either way you want to know which." },
      ],
    },
  ],

  saving: [
    {
      id: 'save_laptop_died',
      tag: 'Uh oh!',
      title: 'Your Laptop Died During Finals Week',
      scenario: "It won't power on. The campus tech desk says the board is gone and it isn't worth fixing. You have two papers due in five days and $600 in savings.",
      choices: [
        { id: 'a', label: 'Buy a $550 replacement today', result: "This is what the emergency fund was for. It hurts to watch it go, but you had it — that's the whole point, and you finish your papers." },
        { id: 'b', label: 'Use library computers and keep the savings', result: "Free, and genuinely workable for two papers. Just be honest about whether library hours actually cover your writing schedule during finals." },
        { id: 'c', label: 'Finance it at $46/month for 12 months', result: "$552 total if it's truly 0%, more if it isn't — read that carefully. Financing something you could pay for is trading real money for keeping your cushion intact." },
      ],
    },
    {
      id: 'save_spring_break',
      tag: 'Life happens...',
      title: 'Everyone Is Going',
      scenario: 'Your friends booked a spring break trip. Your share is $520 and they need it by Friday. You have $700 saved, most of it earmarked as your emergency fund.',
      choices: [
        { id: 'a', label: 'Go — you are only in college once', result: "A real reason, and worth something. But it leaves $180 between you and the next surprise, which is a thin margin for six more weeks of semester." },
        { id: 'b', label: 'Skip it', result: "Not the fun answer. It does keep the fund whole, and an emergency fund you keep raiding for non-emergencies is just a checking account with extra steps." },
        { id: 'c', label: 'Go, but earn it back before you leave', result: "The middle path most people don't consider: five or six extra shifts between now and break turns this into a spending decision instead of a savings one." },
      ],
    },
    {
      id: 'save_hysa_offer',
      tag: 'Something unexpected happened!',
      title: 'Your Savings Earned 4 Cents',
      scenario: 'Your statement arrives: $1,200 in savings, interest earned this month, $0.04. A high-yield account online is advertising 4.2% APY.',
      choices: [
        { id: 'a', label: 'Move it to the high-yield account', result: "$1,200 at 4.2% is roughly $50/year versus about 50 cents where it sits. Same money, same access, same FDIC insurance — check the transfer time before you move an emergency fund." },
        { id: 'b', label: 'Leave it — 4% of not much is not much', result: "It compounds, and the gap widens as the balance grows. On $1,200 it's a nice dinner; on $10,000 it's $420 a year for filling in one form." },
        { id: 'c', label: 'Check the fine print first', result: "Right instinct. Look for minimum balances, introductory rates that drop after a few months, and how long a withdrawal takes to reach you." },
      ],
    },
  ],

  investing: [
    {
      id: 'invest_roommate_tip',
      tag: 'Uh oh!',
      title: 'Your Roommate Has a Guaranteed Thing',
      scenario: 'Your roommate is up 60% on a coin he heard about in a Discord server. He says the next one launches tonight and wants you in for $200. "It literally cannot go down before the listing."',
      choices: [
        { id: 'a', label: 'Put in $200', result: 'You may win. But "cannot go down" is not a sentence that describes any real asset, and the person telling you has every reason to want more buyers.' },
        { id: 'b', label: 'Pass', result: "Being up 60% makes someone lucky, not informed. The people who tell you about their wins rarely mention the positions that went to zero." },
        { id: 'c', label: 'Put in what you would be fine losing', result: 'The honest framing. If $200 disappearing changes your month, it isn\'t play money — and speculation should only ever come out of play money.' },
      ],
    },
    {
      id: 'invest_market_drop',
      tag: 'Something unexpected happened!',
      title: 'Down 18% in Three Weeks',
      scenario: "You finally started investing — $600 into a broad index fund. Three weeks later the market has fallen and your account shows $492. Every headline uses the word 'plunge'.",
      choices: [
        { id: 'a', label: 'Sell before it gets worse', result: "This turns a paper loss into a real one. Selling after a drop is the single most common way beginners lose money that would have come back." },
        { id: 'b', label: 'Do nothing', result: 'Boring and usually correct. You didn\'t lose $108 — the price moved, and it only becomes a loss if you sell there. Your money was never meant for this month.' },
        { id: 'c', label: 'Buy more at the lower price', result: "Reasonable if the money is genuinely spare and your timeline is years out. Just don't confuse it with timing the bottom, which nobody reliably does." },
      ],
    },
    {
      id: 'invest_employer_match',
      tag: 'Life happens...',
      title: 'Free Money You Have to Opt Into',
      scenario: 'Your part-time employer offers a retirement plan: they match 100% of what you contribute, up to 3% of your pay. Enrolment closes at the end of the month. Contributing 3% costs you about $18 a paycheck.',
      choices: [
        { id: 'a', label: 'Enrol at 3%', result: "An instant 100% return before the market does anything. $18 becomes $36 every paycheck — there is no other investment that does this." },
        { id: 'b', label: 'Skip it, retirement is 45 years away', result: "That distance is the reason to start, not to wait. It's also the only time you can leave an employer match on the table without anyone stopping you." },
        { id: 'c', label: 'Enrol at 1% to be safe', result: 'Better than nothing, but you left two-thirds of the match unclaimed. Match up to the full percentage first, then decide about anything beyond it.' },
      ],
    },
  ],

  credit: [
    {
      id: 'credit_free_tshirt',
      tag: 'Life happens...',
      title: 'A Table, A Clipboard, A Free T-Shirt',
      scenario: 'On the main walkway there\'s a card sign-up table. Free t-shirt and a water bottle just for applying. The rep says "it builds your credit, and there\'s no annual fee."',
      choices: [
        { id: 'a', label: 'Apply — free stuff and free credit history', result: "The t-shirt costs them $4 and is aimed at exactly this decision. Some campus-table cards are fine; plenty carry 29% APR and low limits that are easy to max." },
        { id: 'b', label: 'Take the terms sheet, decide later', result: "The right pace. APR, fees and limit are all on that sheet, and no good card offer expires because you walked away to read it." },
        { id: 'c', label: 'Walk past', result: 'No harm done. A first card is genuinely useful for building history — just chosen deliberately, not because someone handed you a water bottle.' },
      ],
    },
    {
      id: 'credit_utilization',
      tag: 'Uh oh!',
      title: 'Maxed Out the Week Before',
      scenario: 'You have a $1,000 limit and a $940 balance from textbooks and a flight home. You pay it in full every month, so you have never paid interest. You are applying for a car loan in two weeks.',
      choices: [
        { id: 'a', label: 'Nothing to fix — you always pay in full', result: "Paying in full protects you from interest, not from utilisation. The balance reported on your statement date is what scores see, and 94% of your limit reads as maxed out." },
        { id: 'b', label: 'Pay it down before the statement closes', result: 'Exactly. Paying before the statement date, not just before the due date, is what changes the number the credit bureaus actually see.' },
        { id: 'c', label: 'Ask for a limit increase', result: 'Also works — the same $940 against a $2,500 limit is 38% instead of 94%. Just make sure the request is a soft pull, and that the bigger limit does not change how you spend.' },
      ],
    },
    {
      id: 'credit_cosign',
      tag: 'Something unexpected happened!',
      title: 'Can You Co-Sign?',
      scenario: 'Your cousin asks you to co-sign a $3,200 used car loan. They have a job, they say they are good for it, and they only need you because their credit is thin. Your name would be on it too.',
      choices: [
        { id: 'a', label: 'Sign — family is family', result: "A generous instinct with a hard mechanic behind it: co-signing means you owe the full amount, not half. Every missed payment lands on your credit report as well as theirs." },
        { id: 'b', label: 'Say no', result: "Uncomfortable, and often correct. \"I can't put my name on debt I can't pay off myself\" is a complete answer that doesn't require you to question their character." },
        { id: 'c', label: 'Offer to help another way', result: 'Often the best version — helping with a bigger down payment, or going with them to compare rates, gives real help without tying your credit to their next twelve months.' },
      ],
    },
  ],

  risk: [
    {
      id: 'risk_break_in',
      tag: 'Uh oh!',
      title: 'Someone Came Through the Window',
      scenario: 'You come back to your off-campus apartment and your laptop and headphones are gone, about $1,400 of stuff. Your landlord\'s insurance covers the building, not your belongings. You never got renters insurance.',
      choices: [
        { id: 'a', label: 'Absorb the loss', result: "$1,400 out of pocket. Renters insurance typically runs $10-20 a month — this is the year of premiums it would have taken to cover it, several times over." },
        { id: 'b', label: 'Check whether a parent policy covers you', result: "Genuinely worth a call: many homeowners policies extend to a dependent student's belongings away at school. Most students never think to ask." },
        { id: 'c', label: 'Get renters insurance now', result: "Doesn't help with this loss, but it's the correct lesson at the correct moment. Check whether it's replacement cost or actual cash value before you buy." },
      ],
    },
    {
      id: 'risk_health_waiver',
      tag: 'Life happens...',
      title: 'A $2,100 Charge You Can Remove',
      scenario: 'Your tuition bill includes the university health plan at $2,100 for the year. You are 20 and still on a parent\'s insurance. There is a waiver form, and the deadline is in four days.',
      choices: [
        { id: 'a', label: 'File the waiver', result: "$2,100 back for one form. Schools auto-enrol by default and the deadline is real — miss it and you're usually billed for the whole year regardless." },
        { id: 'b', label: 'Keep the school plan too', result: 'Rarely worth it. Double coverage doesn\'t pay you twice, and campus health centres normally bill outside insurance fine.' },
        { id: 'c', label: 'Check what the parent plan covers near campus first', result: 'The careful version. If your family plan is a narrow regional network and your school is out of state, the campus plan can genuinely be the better buy.' },
      ],
    },
    {
      id: 'risk_phone_deductible',
      tag: 'Something unexpected happened!',
      title: 'The Screen Is Spiderwebbed',
      scenario: "Your phone hit the sidewalk face down. You pay $8/month for phone insurance. You check the policy: the deductible for a screen replacement is $99. A repair shop two blocks away quotes $110.",
      choices: [
        { id: 'a', label: 'File the insurance claim', result: "Saves $11 today. Worth checking whether a claim raises your premium or counts against a claim limit — on a margin this thin, it often isn't worth using." },
        { id: 'b', label: 'Pay the repair shop', result: "$11 more, no claim on your record, and often faster. This is the calculation people forget to run: insurance you own isn't automatically the cheaper option." },
        { id: 'c', label: 'Reconsider the $8/month', result: "$96 a year plus a $99 deductible is $195 to fix one screen. Insurance is for losses you cannot absorb — a screen repair usually isn't one of them." },
      ],
    },
  ],

  loans: [
    {
      id: 'loans_refund_check',
      tag: 'Life happens...',
      title: 'A Surprise $2,400 in Your Account',
      scenario: 'Your loans and grants exceeded your tuition and fees, so the bursar refunded the difference: $2,400 just landed in your checking account. It is borrowed money, and it is accruing.',
      choices: [
        { id: 'a', label: 'Return it to the loan servicer', result: "Usually the best financial move if you don't need it. Most servicers let you return a disbursement within a set window with no interest charged at all." },
        { id: 'b', label: 'Keep it for rent and books', result: "Exactly what it's for, if that's what it goes to. The trap isn't spending a refund — it's spending it on things you'd never have borrowed for deliberately." },
        { id: 'c', label: 'Spend some, save the rest', result: "Fine, as long as you know the price. At around 6%, $2,400 held for four years plus repayment costs meaningfully more than $2,400 to pay back." },
      ],
    },
    {
      id: 'loans_grace_ending',
      tag: 'Uh oh!',
      title: 'Your Grace Period Ends in 30 Days',
      scenario: "An email from your servicer: first payment due in 30 days, $312/month on the standard plan. You're earning $2,400/month at your first job, and rent is $1,100.",
      choices: [
        { id: 'a', label: 'Take the standard plan', result: "Highest monthly payment, lowest total interest, done in ten years. If $312 fits, this is usually the cheapest way out." },
        { id: 'b', label: 'Ask about income-driven repayment', result: "Lowers the monthly payment to a share of your discretionary income — real breathing room, at the cost of more interest over a longer term. Worth knowing it exists before you need it." },
        { id: 'c', label: 'Ignore it for now', result: "The one genuinely bad option. Federal loans go delinquent at 90 days and default at 270, and default can mean wage garnishment and a wrecked credit report." },
      ],
    },
    {
      id: 'loans_private_gap',
      tag: 'Something unexpected happened!',
      title: 'Federal Aid Came Up $4,000 Short',
      scenario: 'Your aid package covers most of next year but leaves a $4,000 gap. A private lender pre-approves you at 11.5% variable. Your federal unsubsidised rate would be about 6.5% fixed, but you have not maxed it.',
      choices: [
        { id: 'a', label: 'Take the private loan', result: "Fast, and expensive. Variable means the rate can climb, and private loans skip income-driven repayment, deferment options and forgiveness programmes entirely." },
        { id: 'b', label: 'Max federal borrowing first', result: "The standard order of operations. Fixed rate, borrower protections, and you can still cover a remainder privately if a gap is left." },
        { id: 'c', label: 'Talk to the financial aid office', result: 'The step almost nobody takes. Appeals, emergency grants and payment plans exist, and a changed family circumstance can genuinely reopen a package.' },
      ],
    },
  ],

  taxes: [
    {
      id: 'taxes_should_i_file',
      tag: 'Life happens...',
      title: 'A W-2 Arrives and You Made $4,100',
      scenario: 'You earned $4,100 at your campus job last year — below the threshold where you are required to file. Your W-2 shows $290 of federal income tax withheld.',
      choices: [
        { id: 'a', label: 'Skip filing, you are not required to', result: "True, and it costs you $290. Withholding you didn't owe only comes back if you file a return to ask for it." },
        { id: 'b', label: 'File and claim the refund', result: "$290 back for maybe forty minutes of work, and free filing software covers a return this simple. Refunds are your money being returned, not a bonus." },
        { id: 'c', label: 'File and check for education credits', result: "Better still. Credits like the American Opportunity Credit can be worth far more than the withholding itself, and you have to file to claim any of them." },
      ],
    },
    {
      id: 'taxes_1099_surprise',
      tag: 'Uh oh!',
      title: 'Nobody Withheld Anything',
      scenario: 'You made $3,800 last year doing freelance design. A 1099-NEC arrives with $3,800 in box 1 and nothing withheld anywhere. You already spent all of it.',
      choices: [
        { id: 'a', label: 'Set aside money for the bill now', result: "The right reflex. Self-employment tax alone is about 15.3% on top of income tax, so roughly 25-30% of freelance income should never have felt like yours." },
        { id: 'b', label: 'Deduct your business expenses first', result: "Absolutely do — software, equipment and a share of your phone bill reduce the taxable amount. Keep receipts; this is why freelancers track expenses all year." },
        { id: 'c', label: 'Assume it is too small to matter', result: 'The IRS got the same 1099 you did. Under-reporting a form they already have on file is the most reliable way to get a letter.' },
      ],
    },
    {
      id: 'taxes_refund_cut',
      tag: 'Something unexpected happened!',
      title: '"I\'ll Do Your Taxes for 20% of the Refund"',
      scenario: 'Someone in your group chat is offering to file returns for students. They take 20% of whatever refund they get you, and they promise refunds "way bigger than the free software gives you".',
      choices: [
        { id: 'a', label: 'Let them do it', result: "A preparer paid a share of your refund has an incentive to inflate it — and you sign the return, so you own the penalties if it's wrong." },
        { id: 'b', label: 'Use free filing software instead', result: "IRS Free File and similar tools cover a student return easily, cost nothing, and leave the numbers as yours." },
        { id: 'c', label: 'Ask if they have a PTIN', result: "The right question. Anyone paid to prepare returns must have a Preparer Tax Identification Number and sign the return themselves — the ones who won't are telling you something." },
      ],
    },
  ],

  psychology: [
    {
      id: 'psych_bnpl',
      tag: 'Life happens...',
      title: 'Or 4 Payments of $37.25',
      scenario: 'You have $149 boots in your cart. At checkout, a button offers four interest-free payments of $37.25. The smaller number feels much easier to say yes to.',
      choices: [
        { id: 'a', label: 'Use the payment plan', result: "It's genuinely interest-free if you never miss one. The real effect is that $37 feels affordable when $149 didn't — which is exactly what it's designed to do." },
        { id: 'b', label: 'Pay the $149 outright', result: "You felt the full price, which is the point. If $149 gives you pause and $37.25 doesn't, the pause was the accurate signal." },
        { id: 'c', label: 'Close the tab and check back in two days', result: 'The cheapest test there is. Most impulse carts don\'t survive 48 hours, and the ones that do were probably worth buying.' },
      ],
    },
    {
      id: 'psych_limited_drop',
      tag: 'Uh oh!',
      title: 'Only 3 Left at This Price',
      scenario: 'A countdown timer says 11 minutes. A banner says only 3 left. A little popup says someone in your city just bought one. The price is $89, down from a "was" price of $160.',
      choices: [
        { id: 'a', label: 'Buy before the timer runs out', result: "Timers reset, stock counters are often decoration, and 'was $160' frequently means it was $160 for one week in order to be legal. All three exist to stop you thinking." },
        { id: 'b', label: 'Check the real price history', result: "The counter-move to anchoring. Price trackers and a quick search usually show $89 is just the price, and the discount is against a number nobody paid." },
        { id: 'c', label: 'Let the timer run out on purpose', result: "A useful experiment to run once. Watching the same deal reappear tomorrow permanently changes how much urgency you feel." },
      ],
    },
    {
      id: 'psych_free_trial',
      tag: 'Something unexpected happened!',
      title: 'The Free Trial Was Never Free',
      scenario: 'A $14.99 charge appears from a service you signed up to in October for a free month. You used it twice. It has been billing quietly for five months: $74.95.',
      choices: [
        { id: 'a', label: 'Cancel it', result: "Do it now, before the next cycle. Also ask for a refund on unused months — companies grant them more often than people expect, because the alternative is a chargeback." },
        { id: 'b', label: 'Cancel and audit every other trial', result: "The thorough version. Free trials that require a card are designed around the fact that most people forget — the business model depends on it." },
        { id: 'c', label: 'Set a reminder next time you start a trial', result: 'The fix that actually generalises: a calendar reminder two days before any trial ends turns a default into a decision.' },
      ],
    },
  ],

  career: [
    {
      id: 'career_first_offer',
      tag: 'Life happens...',
      title: 'They Offered $58,000',
      scenario: 'Your first full-time offer: $58,000. You researched the range for this role in this city and it runs $56,000 to $68,000. The recruiter needs an answer by Thursday.',
      choices: [
        { id: 'a', label: 'Accept — it is a good offer', result: "It is. It's also at the bottom of the band, and every future raise is a percentage of this number — a $5,000 gap now compounds across a whole career." },
        { id: 'b', label: 'Counter at $65,000 with your research', result: "The move that works far more often than people believe. A polite, specific counter backed by market data almost never costs you an offer." },
        { id: 'c', label: 'Ask for more time to decide', result: "Reasonable and normal. A few extra days is a standard request, and an employer who refuses one is telling you about themselves." },
      ],
    },
    {
      id: 'career_unpaid_internship',
      tag: 'Uh oh!',
      title: 'Great Experience, No Pay',
      scenario: 'A well-known company offers you a summer internship: unpaid, 40 hours a week, "incredible exposure". You also have a standing offer to keep your $17/hr job over the summer, which is about $8,800.',
      choices: [
        { id: 'a', label: 'Take the internship', result: 'Can absolutely pay off if it leads somewhere real. Ask directly what percentage of interns get return offers — a company proud of that number will tell you.' },
        { id: 'b', label: 'Keep the paying job', result: "$8,800 is a semester of not borrowing. Prestige is worth something, but it isn't worth an unlimited amount, and plenty of hiring managers value real work history." },
        { id: 'c', label: 'Ask if there is any stipend or credit', result: 'Worth asking every time. Many "unpaid" internships have housing stipends or course credit available that only appear when a candidate raises it.' },
      ],
    },
    {
      id: 'career_two_offers',
      tag: 'Something unexpected happened!',
      title: '$4,000 More, Or a 6% Match',
      scenario: 'Two offers. One pays $62,000 with no retirement match. The other pays $58,000 with a 6% employer match and better health coverage.',
      choices: [
        { id: 'a', label: 'Take the higher salary', result: "The bigger visible number. A 6% match on $58,000 is $3,480 a year of additional compensation, which closes almost the entire gap before you count the health plan." },
        { id: 'b', label: 'Take the one with the match', result: "You read total compensation instead of salary. The match is real money, it's yours once vested, and it compounds for decades." },
        { id: 'c', label: 'Ask the first company to match the benefits', result: 'The best of both. Naming a competing offer\'s specific benefit is one of the few negotiation levers that reliably moves a number.' },
      ],
    },
  ],

  scams: [
    {
      id: 'scam_fake_job_check',
      tag: 'Uh oh!',
      title: 'The Job That Sends You Money First',
      scenario: 'A "campus brand ambassador" role emails you from a lookalike address. They mail you a $2,450 check, tell you to deposit it, keep $450 as your first payment, and wire $2,000 to their equipment supplier today.',
      choices: [
        { id: 'a', label: 'Deposit it and send the $2,000', result: "This is the oldest version of the scam. The check bounces in about a week, the bank claws back the full $2,450, and the $2,000 you wired is gone for good." },
        { id: 'b', label: 'Delete it', result: "Correct. No legitimate employer sends money before you work, and none needs you to forward funds to a third party. Overpayment plus urgency is the entire tell." },
        { id: 'c', label: 'Report it to your school', result: "Even better. These campaigns target one campus at a time using scraped student directories — reporting it is how the next fifty students get warned." },
      ],
    },
    {
      id: 'scam_rental_deposit',
      tag: 'Something unexpected happened!',
      title: 'The Apartment Is Perfect and Cheap',
      scenario: 'A listing near campus is $400 below every comparable unit. The "owner" says he is abroad and cannot show it, but will mail the keys as soon as you send a $900 deposit by Zelle.',
      choices: [
        { id: 'a', label: 'Send the deposit before someone else takes it', result: "Zelle and similar apps are effectively cash — once it's sent it's unrecoverable. Below-market rent plus an absent landlord plus an irreversible payment is three tells at once." },
        { id: 'b', label: 'Insist on seeing it in person first', result: "The non-negotiable step. Anyone who cannot arrange for you or a friend to physically stand in a unit is not renting you that unit." },
        { id: 'c', label: 'Look up who actually owns the property', result: "Sharp. County property records are public and free, and they'll show you a name that either matches the person you're talking to or doesn't." },
      ],
    },
    {
      id: 'scam_accidental_payment',
      tag: 'Life happens...',
      title: '"Sorry, Wrong Person — Can You Send It Back?"',
      scenario: 'You get $300 on a payment app from a stranger. A minute later they message: wrong contact, please send it back. Your balance really does show $300.',
      choices: [
        { id: 'a', label: 'Send the $300 back', result: "The original $300 came from a stolen card or account. When the real owner reports it, that payment reverses — and the $300 you sent from your own money is simply gone." },
        { id: 'b', label: 'Tell them to have the app reverse it', result: "Exactly right. A genuine mistaken payment is fixed through the app's support, not by a second payment from you. Refusing costs you nothing if it's honest." },
        { id: 'c', label: 'Keep it', result: "Don't — it isn't yours and it will be reversed. But don't send it anywhere either. Report it in-app and let the platform unwind it." },
      ],
    },
  ],
};

/** Every ambient event, general and module-tagged, in one list. */
export const LIFE_EVENTS: LifeEvent[] = [
  ...GENERAL_LIFE_EVENTS,
  ...Object.entries(MODULE_LIFE_EVENTS).flatMap(([moduleId, events]) =>
    events.map((e) => ({ ...e, moduleId })),
  ),
];

/** Guaranteed one-time event unlocked by mastering a specific module — keyed by module id. */
export const LIFE_EVENT_UNLOCKS: Record<string, LifeEvent> = {
  scams: {
    id: 'phishing_text_test',
    tag: 'Uh oh!',
    title: 'A Text From "Financial Aid"',
    scenario: 'You get a text: "Your financial aid disbursement is on hold. Verify your bank account within 24 hours: studentaid-verify.net/login" You just finished the Scams module. This one\'s on you.',
    choices: [
      { id: 'a', label: 'Click the link and check it out', result: "That wasn't studentaid.gov. It was a lookalike domain. Entering your bank login handed it straight to a scammer. This is exactly the pattern you just learned to spot." },
      { id: 'b', label: 'Ignore it and check your real aid portal directly', coinDelta: 15, result: 'Exactly right. You went straight to the source instead of trusting the link. Real disbursement holds show up in your official portal, never a text with a countdown.' },
      { id: 'c', label: 'Report it as phishing and delete', coinDelta: 20, result: "Even better. Reporting it helps your school's IT/security team warn other students before they fall for the same message." },
    ],
  },
};

export const LIFE_EVENT_CHANCE = 0.5;
export const LIFE_EVENT_COOLDOWN_SESSIONS = 2;

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Chooses the next ambient event, and returns the updated seen list to store alongside it.
 *
 * Two things this fixes over picking uniformly at random from the whole pool, which is what
 * it used to do. First, relevance: an event tagged to the module you're currently working
 * through is preferred, so finishing a Taxes lesson surfaces a tax scenario rather than a car
 * repair. Second, repetition — the real complaint. Uniform random over a small pool repeats
 * constantly (with three events it was better than even odds of a repeat within two draws),
 * so anything already seen is excluded until its pool is exhausted.
 *
 * `seenIds` is the store's shownLifeEventIds, shared with the guaranteed module-unlock
 * events. That's safe because unlock ids and ambient ids never overlap, and the exhaustion
 * reset below only ever clears ambient ids — an unlock must still fire exactly once, ever.
 */
export function pickAmbientLifeEvent(
  moduleId: string | undefined,
  seenIds: string[],
): { event: LifeEvent; seenIds: string[] } | null {
  if (!LIFE_EVENTS.length) return null;
  const seen = new Set(seenIds);
  const unseen = LIFE_EVENTS.filter((e) => !seen.has(e.id));

  // Everything's been seen: forget the ambient half of the history and start the rotation
  // again, keeping unlock ids (which are not in LIFE_EVENTS) untouched.
  if (!unseen.length) {
    const ambientIds = new Set(LIFE_EVENTS.map((e) => e.id));
    const keptIds = seenIds.filter((id) => !ambientIds.has(id));
    const event = pickRandom(moduleId ? preferModule(LIFE_EVENTS, moduleId) : LIFE_EVENTS);
    return { event, seenIds: [...keptIds, event.id] };
  }

  const event = pickRandom(moduleId ? preferModule(unseen, moduleId) : unseen);
  return { event, seenIds: [...seenIds, event.id] };
}

/** This module's events if it has any left, otherwise everything — never returns empty, so a
 * module with all three of its scenarios already seen still gets a general one rather than
 * silently skipping the event. */
function preferModule(pool: LifeEvent[], moduleId: string): LifeEvent[] {
  const matching = pool.filter((e) => e.moduleId === moduleId);
  return matching.length ? matching : pool;
}
