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
if (ccTrack) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ccPaused = false;
  let ccResumeTimer = null;

  function ccPauseThenResume() {
    ccPaused = true;
    clearTimeout(ccResumeTimer);
    ccResumeTimer = setTimeout(() => { ccPaused = false; }, 2600);
  }

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
