window.addEventListener('load', async function () {
  try {
    await Clerk.load();
    if (Clerk.isSignedIn) {
      window.location.href = 'app.html';
      return;
    }
  } catch (e) {
    // Clerk failed to load; fall through and show the page anyway.
  }
  document.documentElement.style.visibility = 'visible';
});

// Typewriter effect on hero subtitle
const typewriterEl = document.getElementById('hero-typewriter');
const typewriterText = 'Budgeting, saving, and investing, taught in quick lessons that actually stick. Earn streaks and rewards while you learn.';
let twIndex = 0;
function typeNextChar() {
  if (!typewriterEl || twIndex > typewriterText.length) return;
  typewriterEl.textContent = typewriterText.slice(0, twIndex);
  twIndex++;
  setTimeout(typeNextChar, 28);
}
window.addEventListener('load', () => setTimeout(typeNextChar, 600));

// Topic ticker: clone the word list enough times to always fill the
// viewport (so wide screens never run out of content mid-loop), flipping
// colors on every other copy so pink/green keeps alternating across seams.
const tickerTrack = document.getElementById('ticker-track');
if (tickerTrack) {
  const baseItems = Array.from(tickerTrack.children);
  function buildVariant(flip) {
    return baseItems.map(el => {
      const clone = el.cloneNode(true);
      if (flip && clone.classList.contains('ticker-item')) {
        clone.classList.toggle('tick-pink');
        clone.classList.toggle('tick-green');
      }
      clone.setAttribute('aria-hidden', 'true');
      return clone.outerHTML;
    }).join('');
  }
  const unitWidth = tickerTrack.scrollWidth;
  const variantA = buildVariant(false);
  const variantB = buildVariant(true);
  // Copies must come in even A/B pairs: A followed by B keeps colors
  // alternating across the seam, and a whole A+B pair is pixel-identical
  // to the next A+B pair, so the scroll position can wrap every 2 units
  // without any visual jump.
  let pairsNeeded = Math.max(2, Math.ceil((window.innerWidth * 2) / (unitWidth * 2)) + 1);
  let html = tickerTrack.innerHTML;
  for (let i = 1; i < pairsNeeded * 2; i++) html += (i % 2 === 1 ? variantB : variantA);
  tickerTrack.innerHTML = html;

  const periodWidth = unitWidth * 2;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    let pos = 0;
    function tickerLoop() {
      pos -= 0.5;
      if (pos <= -periodWidth) pos += periodWidth;
      tickerTrack.style.transform = `translateX(${pos}px)`;
      requestAnimationFrame(tickerLoop);
    }
    requestAnimationFrame(tickerLoop);
  }
}

// Nav scroll shadow
const nav = document.getElementById('l-nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Scrollspy: highlight the nav link for whichever section is in view
const navAnchors = document.querySelectorAll('.l-nav-links a[href^="#"]');
const spySections = Array.from(navAnchors)
  .map(a => document.getElementById(a.getAttribute('href').slice(1)))
  .filter(Boolean);
if (spySections.length) {
  const navSpyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  spySections.forEach(s => navSpyObserver.observe(s));
}

// Back to top button
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 700);
  }, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Mascot eyes gently track the cursor (moves the eye-shine highlights,
// since .pig-eye's own transform is already used by the blink animation)
const pigShines = document.querySelectorAll('.pig-eye .shine1, .pig-eye .shine2');
if (pigShines.length) {
  window.addEventListener('mousemove', e => {
    const cx = e.clientX / window.innerWidth - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    pigShines.forEach(shine => {
      shine.style.transform = `translate(${cx * 5}px, ${cy * 5}px)`;
    });
  }, { passive: true });
}

// Animated count-up for stat numbers once they scroll into view
function animateCountUp(el) {
  const raw = el.textContent.trim();
  const match = raw.match(/[\d,.]+/);
  if (!match) return;
  const numStr = match[0].replace(/,/g, '');
  const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
  const target = parseFloat(numStr);
  const prefix = raw.slice(0, match.index);
  const suffix = raw.slice(match.index + match[0].length);
  const duration = 1200;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = (target * eased).toFixed(decimals);
    el.textContent = prefix + Number(current).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = raw;
  }
  requestAnimationFrame(step);
}
const countEls = document.querySelectorAll('.stat-num, .am-num');
if (countEls.length) {
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCountUp(e.target);
        countObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  countEls.forEach(el => countObserver.observe(el));
}

// Confetti burst
function fireConfetti(container) {
  if (!container) return;
  const colors = ['#6B8F65', '#D4899E', '#F2CDD7', '#B2C9AE', '#4A6844'];
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.background = colors[i % colors.length];
    piece.style.left = (50 + (Math.random() * 60 - 30)) + '%';
    piece.style.setProperty('--x', (Math.random() * 180 - 90) + 'px');
    piece.style.setProperty('--r', (Math.random() * 360) + 'deg');
    piece.style.animationDelay = (Math.random() * 0.15) + 's';
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 1400);
  }
}

// Animate admin dashboard bars one by one when they scroll into view
const adminBars = document.querySelector('.admin-bars');
if (adminBars) {
  const fills = adminBars.querySelectorAll('.ab-fill');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const barObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      fills.forEach((fill, i) => {
        const target = fill.dataset.width + '%';
        if (reduceMotion) {
          fill.style.width = target;
        } else {
          setTimeout(() => { fill.style.width = target; }, i * 200);
        }
      });
      barObserver.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  barObserver.observe(adminBars);
}

// Curriculum carousel: the continuous rightward auto-scroll is a pure CSS
// animation on .cc-track-inner (see landing.css) driven by the compositor,
// not JS on a timer — so it can't get stuck by touch-event or scroll-API
// quirks. The outer #cc-track stays a normal scrollable container, so
// native swipe and the arrow buttons both just nudge it as usual.
const ccTrack = document.getElementById('cc-track');
const ccPrev = document.getElementById('cc-prev');
const ccNext = document.getElementById('cc-next');
if (ccTrack) {
  const ccStep = () => (ccTrack.querySelector('.cc-card')?.offsetWidth || 260) + 20;
  if (ccPrev) ccPrev.addEventListener('click', () => {
    ccTrack.scrollBy({ left: -ccStep(), behavior: 'smooth' });
  });
  if (ccNext) ccNext.addEventListener('click', () => {
    ccTrack.scrollBy({ left: ccStep(), behavior: 'smooth' });
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

// WAITLIST MODAL
const waitlistOpenBtn = document.getElementById('waitlist-open-btn');
const waitlistOverlay = document.getElementById('waitlist-modal-overlay');
const waitlistClose = document.getElementById('waitlist-modal-close');
const waitlistForm = document.getElementById('waitlist-form');
const waitlistSuccess = document.getElementById('waitlist-success');

function openWaitlistModal() {
  if (!waitlistOverlay) return;
  waitlistOverlay.hidden = false;
  requestAnimationFrame(() => waitlistOverlay.classList.add('visible'));
}
function closeWaitlistModal() {
  if (!waitlistOverlay) return;
  waitlistOverlay.classList.remove('visible');
  setTimeout(() => {
    waitlistOverlay.hidden = true;
    waitlistForm.hidden = false;
    waitlistSuccess.hidden = true;
    waitlistForm.reset();
  }, 200);
}
if (waitlistOpenBtn && waitlistOverlay) {
  waitlistOpenBtn.addEventListener('click', openWaitlistModal);
  waitlistClose.addEventListener('click', closeWaitlistModal);
  waitlistOverlay.addEventListener('click', e => { if (e.target === waitlistOverlay) closeWaitlistModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && waitlistOverlay.classList.contains('visible')) closeWaitlistModal();
  });
  waitlistForm.addEventListener('submit', e => {
    e.preventDefault();
    waitlistForm.hidden = true;
    waitlistSuccess.hidden = false;
    fireConfetti(waitlistSuccess);
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
    navLinks.classList.toggle('nav-open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('nav-open'));
  });
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('nav-open') && !navLinks.contains(e.target) && e.target !== burger && !burger.contains(e.target)) {
      navLinks.classList.remove('nav-open');
    }
  });
}
