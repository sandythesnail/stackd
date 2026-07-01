// Typewriter effect on hero subtitle
const typewriterEl = document.getElementById('hero-typewriter');
const typewriterText = 'Learn budgeting, saving, and investing through digestible and fun lessons, streaks, and rewards, built for the way students actually learn.';
let twIndex = 0;
function typeNextChar() {
  if (!typewriterEl || twIndex > typewriterText.length) return;
  typewriterEl.textContent = typewriterText.slice(0, twIndex);
  twIndex++;
  setTimeout(typeNextChar, 28);
}
window.addEventListener('load', () => setTimeout(typeNextChar, 600));

// Nav scroll shadow
const nav = document.getElementById('l-nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Animate admin bars when they scroll into view
const bars = document.querySelectorAll('.ab-fill');
const barObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.width = e.target.style.width;
      barObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
bars.forEach(b => barObserver.observe(b));

// Curriculum carousel: auto-scrolls right continuously, arrows nudge it,
// hover/touch/manual use pauses it briefly so it doesn't fight the reader.
const ccTrack = document.getElementById('cc-track');
const ccPrev = document.getElementById('cc-prev');
const ccNext = document.getElementById('cc-next');
let ccPaused = false;
let ccResumeTimer = null;
function ccPauseThenResume() {
  ccPaused = true;
  clearTimeout(ccResumeTimer);
  ccResumeTimer = setTimeout(() => { ccPaused = false; }, 2600);
}
if (ccTrack) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    function ccAutoScroll() {
      if (!ccPaused) {
        const halfWidth = ccTrack.scrollWidth / 2;
        ccTrack.scrollLeft += 0.6;
        if (ccTrack.scrollLeft >= halfWidth) ccTrack.scrollLeft -= halfWidth;
      }
      requestAnimationFrame(ccAutoScroll);
    }
    requestAnimationFrame(ccAutoScroll);
  }

  ccTrack.addEventListener('mouseenter', () => { ccPaused = true; });
  ccTrack.addEventListener('mouseleave', () => { ccPaused = false; });
  ccTrack.addEventListener('touchstart', () => { ccPaused = true; }, { passive: true });
  ccTrack.addEventListener('touchend', ccPauseThenResume, { passive: true });

  const ccStep = () => (ccTrack.querySelector('.cc-card')?.offsetWidth || 260) + 20;
  if (ccPrev) ccPrev.addEventListener('click', () => {
    ccTrack.scrollBy({ left: -ccStep(), behavior: 'smooth' });
    ccPauseThenResume();
  });
  if (ccNext) ccNext.addEventListener('click', () => {
    ccTrack.scrollBy({ left: ccStep(), behavior: 'smooth' });
    ccPauseThenResume();
  });
}

// Curriculum tags: click a beige tag to read a plain-language definition
const TAG_DEFINITIONS = {
  'Paychecks': "The payment you get from your job, usually deposited straight into your bank account every week or two.",
  'Payroll Taxes': "Money automatically taken out of your paycheck to fund Social Security and Medicare, before you ever see it.",
  'Tax Withholding': "The portion of each paycheck your employer holds back and sends to the government for you, based on the W-4 you filled out.",
  'Budgeting': "A plan for where your money goes each month, so you spend on purpose instead of wondering where it went.",
  'Meal Plans': "A prepaid account through your school's dining hall that you spend down as you eat — worth comparing against what you actually spend.",
  'Paying for College': "The mix of grants, scholarships, loans, and your own money that covers tuition and living costs — most of it starts with the FAFSA.",
  'Emergency Fund': "Money set aside just for unexpected costs, like a laptop repair or a medical bill, so a surprise expense doesn't turn into debt.",
  'High-Yield Savings': "A savings account that pays much more interest than a typical bank account, so your money actually grows while it sits there.",
  'Savings Goals': "A specific amount you're saving toward for a specific reason, like a security deposit — it makes saving feel less abstract.",
  'Retirement Accounts': "Special accounts, like a Roth IRA, built for saving toward retirement, with tax advantages that help your money grow faster.",
  'Compound Interest': "When the interest you earn starts earning its own interest, so your money grows faster the longer you leave it invested.",
  'Index Funds': "A single investment that automatically spreads your money across hundreds of companies, so you're not betting on just one.",
  'Credit Score': "A three-digit number, roughly 300–850, that tells lenders how reliably you pay back money — higher means better rates.",
  'Interest Rate': "The extra percentage you pay to borrow money. On a credit card this is called APR, and it's charged on any balance you carry.",
  'Credit Utilization': "How much of your available credit limit you're actually using — staying under 30% helps keep your credit score healthy.",
  'Health Insurance': "Coverage that pays part of your medical bills. As a student, you may still be covered under a parent's plan until you turn 26.",
  "Renter's Insurance": "A cheap monthly policy that replaces your stuff — laptop, clothes, furniture — if it's stolen, damaged, or destroyed.",
  'Identity Theft': "When someone uses your personal information, like your Social Security number, to open accounts or make charges without your OK.",
  'Financial Aid Application': "The FAFSA — the form that decides what grants, work-study, and loans you qualify for. It opens every October 1st and has to be resubmitted every year.",
  'Loan Agreement': "The Master Promissory Note — your legal promise to repay a federal student loan, signed once at studentaid.gov before funds are sent.",
  'Smart Borrowing': "Only accepting the loan amount you actually need, instead of the full amount offered — every dollar borrowed has to be repaid with interest.",
  'Employee vs. Freelance Income': "A W-2 job has taxes taken out for you automatically. Freelance or gig income, reported on a 1099, doesn't — you set that money aside yourself.",
  'Education Tax Credits': "Credits like the American Opportunity Credit that can lower your tax bill, or boost your refund, just for being a student paying tuition.",
  'Filing Your First Return': "Reporting your income to the IRS each year — even with a small part-time or internship income, filing can get you money back.",
  'Impulse Spending': "Buying something on the spot because it feels good in the moment, not because you planned for it — often triggered by stress or boredom.",
  'Buy Now, Pay Later': "Splitting a purchase into a few smaller payments instead of paying all at once — easy to overspend on and easy to lose track of.",
  'Money Habits': "The small, repeated financial behaviors, like checking your balance or automating savings, that shape your finances more than any single big decision.",
  'Salary Negotiation': "Asking for more than the initial number a job offers you — most starting offers have some room, and it's normal to ask.",
  'Employer Retirement Match': "Free money your employer adds to your retirement account when you contribute your own — not claiming it means leaving part of your pay unclaimed.",
  'Comparing Job Offers': "Looking beyond the salary number alone — factoring in benefits, cost of living, and growth potential to see what an offer is really worth.",
};

const termOverlay = document.getElementById('term-modal-overlay');
const termTitle = document.getElementById('term-modal-title');
const termDef = document.getElementById('term-modal-def');
const termClose = document.getElementById('term-modal-close');

function openTermModal(term) {
  const def = TAG_DEFINITIONS[term];
  if (!def || !termOverlay) return;
  termTitle.textContent = term;
  termDef.textContent = def;
  termOverlay.hidden = false;
  requestAnimationFrame(() => termOverlay.classList.add('visible'));
  ccPaused = true;
  clearTimeout(ccResumeTimer);
}
function closeTermModal() {
  if (!termOverlay) return;
  termOverlay.classList.remove('visible');
  setTimeout(() => { termOverlay.hidden = true; }, 200);
  ccPaused = false;
}
if (termOverlay) {
  document.querySelectorAll('.mp-tags span').forEach(tag => {
    const isDuplicate = !!tag.closest('[aria-hidden="true"]');
    tag.setAttribute('tabindex', isDuplicate ? '-1' : '0');
    tag.setAttribute('role', 'button');
    tag.addEventListener('click', () => openTermModal(tag.textContent.trim()));
    tag.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTermModal(tag.textContent.trim()); }
    });
  });
  termClose.addEventListener('click', closeTermModal);
  termOverlay.addEventListener('click', e => { if (e.target === termOverlay) closeTermModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && termOverlay.classList.contains('visible')) closeTermModal();
  });
}

// Scroll reveal (same pattern as crochet site)
const ro = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.07, rootMargin: '0px 0px -36px 0px' });
document.querySelectorAll('.reveal').forEach(el => ro.observe(el));
document.querySelectorAll('.reveal-el').forEach(el => ro.observe(el));
document.querySelectorAll('.phone-reveal').forEach(el => ro.observe(el));

// Mobile nav burger (simple toggle)
const burger = document.getElementById('nav-burger');
const navLinks = document.getElementById('nav-links');
if (burger && navLinks) {
  burger.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display = open ? '' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '60px';
    navLinks.style.right = '1.5rem';
    navLinks.style.background = 'white';
    navLinks.style.padding = '1rem';
    navLinks.style.borderRadius = '12px';
    navLinks.style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)';
    navLinks.style.border = '1.5px solid #D8EEE4';
    navLinks.style.gap = '0.75rem';
    if (open) navLinks.removeAttribute('style');
  });
}
