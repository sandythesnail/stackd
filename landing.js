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
