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
    desc: 'First campus paycheck, W-2s, work-study income, FICA, and tax withholding.',
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
    desc: 'Semester budgeting, meal plan math, subscriptions, and managing spending on a student income.',
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
      }
    ],
    lessons: [
      { title: 'The 50/30/20 Rule', hook: 'It\'s week 6 of the semester. You had $800 for the month. You check your account and there\'s $23 left. You didn\'t buy anything big. How did this happen — and how do you stop it?', qIndices: [0, 1, 2] },
      { title: 'Budget Deficits & Emergency Funds', hook: 'You spent $900 this month but only earned $750. That\'s a $150 deficit. Your first instinct is to put it on a credit card. Is that the right move — and how do you prevent this next month?', qIndices: [3, 4] }
    ]
  },
  {
    id: 'saving', title: 'Saving', icon: '03', iconColor: 'mint', xpReward: 100,
    hook: 'Your laptop just died. It\'s finals week. A replacement costs $400. You have $47 in your checking account. This is what a missing emergency fund looks like - and it\'s completely avoidable.',
    desc: 'Emergency funds on a student income, high-yield savings accounts, and building savings habits early.',
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
    desc: 'Roth IRA basics, compound interest, index funds, and why starting at 18 is your biggest financial advantage.',
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
    desc: 'First credit card, APR, utilization, FICO scores, student loans, and BNPL risks.',
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
    desc: 'Student health insurance, renter\'s insurance for your apartment, and identity theft basics.',
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
  }
];

// ── Achievements ──────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first_paycheck', abbr: 'E',  label: 'First Paycheck',    desc: 'Complete Earning module',       check: s => s.completedModules.earning },
  { id: 'budget_boss',    abbr: 'BB', label: 'Budget Boss',        desc: 'Complete Spending module',      check: s => s.completedModules.spending },
  { id: 'safety_net',     abbr: 'SN', label: 'Safety Net',         desc: 'Complete Saving module',        check: s => s.completedModules.saving },
  { id: 'investor',       abbr: 'FM', label: 'Future Millionaire', desc: 'Complete Investing module',     check: s => s.completedModules.investing },
  { id: 'credit_champ',   abbr: 'CC', label: 'Credit Champ',       desc: 'Complete Managing Credit',     check: s => s.completedModules.credit },
  { id: 'risk_ready',     abbr: 'RR', label: 'Risk Ready',         desc: 'Complete Managing Risk',       check: s => s.completedModules.risk },
  { id: 'stackd_star',    abbr: 'S*', label: 'Stackd Star',        desc: 'Complete all 6 modules',       check: s => Object.keys(s.completedModules).length >= 6 },
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
};

function loadState() {
  try {
    const s = localStorage.getItem('stackd_v2');
    if (s) Object.assign(state, JSON.parse(s));
  } catch (_) {}
}

function saveState() {
  const { level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect } = state;
  localStorage.setItem('stackd_v2', JSON.stringify({ level, xp, streak, lastPlayedDate, completedModules, completedLessons, unlockedAchievements, hadPerfect }));
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

// ── HOME ───────────────────────────────────────
function renderHome() {
  showPage('home');
  updateSidebarStats();
  const tier = getTier(state.level);
  document.getElementById('h-tier').textContent = tier.name;
  const done = Object.keys(state.completedModules).length;
  document.getElementById('h-streak').textContent = state.streak;
  document.getElementById('h-done').textContent = done;
  document.getElementById('modules-home-sub').textContent = done === 6 ? 'All complete — replay to master!' : `${done}/6 complete`;
  renderModuleGrid('home-modules-grid');
  renderAchievementBadges('home-achievements-row', 'home-achieve-sub');
}

// ── MODULES PAGE ───────────────────────────────
function renderModulesPage() {
  updateSidebarStats();
  const done = Object.keys(state.completedModules).length;
  document.getElementById('modules-sub').textContent = done === 6 ? 'All complete — replay to master!' : `${done}/6 complete`;
  renderModuleGrid('modules-grid');
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
  const offset = +(circ * (1 - done / 6)).toFixed(2);

  // Column chart: XP per module, scaled to tallest
  const xpVals = MODULES.map(m => state.completedModules[m.id]?.xpEarned || 0);
  const maxXP = Math.max(...xpVals, 1);

  // Alternating bar colors
  const pinkMods = new Set(['spending', 'credit']);

  document.getElementById('progress-body').innerHTML = `
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
            <span class="pg-donut-den">/6</span>
          </div>
        </div>
        <div class="pg-donut-legend">
          <span class="pg-legend-item"><span class="pg-legend-dot pg-dot-green"></span>Completed (${done})</span>
          <span class="pg-legend-item"><span class="pg-legend-dot pg-dot-gray"></span>Remaining (${6 - done})</span>
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
  renderResults(mod, score, total, xpEarned, wasLessonDone, newAchs);

  if (leveled) {
    setTimeout(() => {
      document.getElementById('new-tier').textContent = getTier(state.level).name;
      document.getElementById('levelup-overlay').classList.add('visible');
    }, 700);
  }
}

function renderResults(mod, score, total, xpEarned, wasReplay, newAchs) {
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
    <div class="results-xp-card">
      <div class="results-xp-num">+${xpEarned} XP</div>
      <div class="results-xp-label">${getTier(state.level).name} · ${state.xp.toLocaleString()} total XP</div>
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
      if (page === 'home')     renderHome();
      else if (page === 'progress') renderProgressPage();
      else if (page === 'modules')  renderModulesPage();
      else if (page === 'badges')   renderBadgesPage();
      else if (page === 'settings') renderSettingsPage();
    });
  });

  document.getElementById('mod-detail-exit').addEventListener('click', renderHome);
  document.getElementById('hook-exit').addEventListener('click', () => showModuleDetail(state.activeModuleId));
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

  loadState();
  renderHome();
});
