/**
 * Renders real screens of the web app to PNGs, so the CSS can be looked at instead of
 * reasoned about.
 *
 * scripts/check-app-renders.js proves the app doesn't throw. It cannot tell you that a tag
 * meant to hug its text is being stretched across the screen by the flex column it sits in,
 * or that a stat is labelled "$62 MoneyScore" — both of which were live, and both of which
 * were obvious the first time anyone looked at a picture. This is the missing half of that:
 * jsdom runs the app's own renderers to produce real markup, that markup is written into a
 * standalone page linked to the real stylesheets, and a headless browser shoots it.
 *
 * Deliberately NOT a visual-diff test. There are no golden images to keep up to date and
 * nothing fails; it just puts PNGs in _shots/ for a person (or a model) to look at.
 *
 * Animations and transitions are disabled in the harness page, so every shot is the settled
 * state rather than whatever frame the capture landed on.
 *
 * WHAT IT CANNOT SHOW: anything that only happens once the real page's JS is running.
 * Hammy's illustrated faces are the notable one — they are revealed by an onload callback
 * (see revealFaceOverlay in app.js) and jsdom never loads images, so every pig here wears his
 * resting CSS face. That is the correct fail-safe, not a bug in the shot.
 *
 *   npm i --no-save jsdom && node scripts/screenshot.js [name ...]
 *
 * Needs a Chromium-family browser; set BROWSER=/path/to/chrome if it isn't found.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (e) {
  console.log('screenshot: skipped, jsdom is not installed.');
  console.log('  npm i --no-save jsdom && node scripts/screenshot.js');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_shots');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ── the browser ─────────────────────────────────────────────────────────── */
const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } });
if (!browser) {
  console.log('screenshot: no Chromium-family browser found. Set BROWSER=/path/to/chrome.');
  console.log('  looked in:\n    ' + CANDIDATES.join('\n    '));
  process.exit(0);
}

/* ── the app, running headlessly ─────────────────────────────────────────── */
const html = read('app.html').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://trystacked.app/app.html' });
const { window } = dom;
window.console.error = (...a) => console.log('  app error:', ...a);
window.console.warn = () => {};
// jsdom has no layout; give the few readers of these something non-degenerate.
Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', { get() { return this.parentNode; } });
window.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 10, left: 10, right: 210, bottom: 60, width: 200, height: 50, x: 10, y: 10 });
window.HTMLElement.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};
window.matchMedia = (q) => ({ media: q, matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent: () => false });
for (const f of ['lesson-path.js', 'post-test.js', 'daily-rewards.js', 'app.js', 'hammy-intro.js']) {
  const sc = window.document.createElement('script');
  sc.textContent = read(f);
  window.document.body.appendChild(sc);
}
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

const api = window.eval('({ state, MODULES })');
const s = api.state;

/* ── an account part-way through, so rows have something to show ─────────── */
s.hasSeenOnboardingTour = true; s.metHammy = true;
s.xp = 740; s.level = 4; s.coins = 260; s.diamonds = 9; s.streak = 5;
s.onboardingSurvey = { completed: true, moduleFamiliarity: {}, focusGoals: [], trackId: 'debt_freedom', completedAt: '2026-01-01' };

const blankProgress = () => ({
  chapterIdx: 0, dashboard: {}, chapterScore: 0, chapterTotal: 0, streak: 0, done: false,
  learnedTerms: [], hintsUsed: 0, xpEarned: 0, isReplay: false,
  analytics: { knowledgeCheck: [], mythCards: [], polls: [], checks: [], matchingMistakes: 0, explainback: null, decisions: [], bossChoice: null },
});
const loans = api.MODULES.find((m) => m.id === 'loans');
const mainQuests = window.mainQuests(loans);
// One lesson finished and one left part-way, so a module row shows all three row states.
s.questProgress[window.questKey('loans', mainQuests[0].id)] = Object.assign(blankProgress(), { done: true });
s.questProgress[window.questKey('loans', mainQuests[2].id)] = Object.assign(blankProgress(), { chapterIdx: 4 });
s.activeModuleId = 'loans';

/* ── the shots ───────────────────────────────────────────────────────────── */
const shots = {};
const screen = (id) => `<div id="${id}" class="screen active">${window.document.getElementById(id).innerHTML}</div>`;

window.showPage('home');
window.renderHome();
shots.home = { w: 1100, h: 1500, body: '<div class="app-main"><div id="page-home" class="page active">' + window.document.getElementById('page-home').innerHTML + '</div></div>' };

window.showPage('modules');
window.renderModulesPage();
shots.modules = { w: 1100, h: 1500, body: '<div class="app-main"><div id="page-modules" class="page active">' + window.document.getElementById('page-modules').innerHTML + '</div></div>' };

// Two screens that are mostly prose rather than gameplay, and are where the app's legal and
// data notices live — the kind of thing that is easy to break and impossible to notice
// without looking at it.
window.showPage('tools');
window.renderToolsPage();
shots.tools = { w: 1100, h: 1400, body: '<div class="app-main"><div id="page-tools" class="page active">' + window.document.getElementById('page-tools').innerHTML + '</div></div>' };

window.showPage('settings');
window.renderSettingsPage();
shots.settings = { w: 1100, h: 2200, body: '<div class="app-main"><div id="page-settings" class="page active">' + window.document.getElementById('page-settings').innerHTML + '</div></div>' };

const quest = mainQuests[1];
window.startQuest('loans', quest.id);
for (const type of ['story', 'teach', 'matching', 'hint', 'poll', 'mythcards', 'knowledgecheck', 'decision', 'bossbattle']) {
  const idx = quest.chapters.findIndex((c) => c.type === type);
  if (idx < 0) continue;
  window.renderChapter(loans, idx);
  if (type === 'bossbattle') {
    // Mid-flow: a move picked and checked, so the verdict is up.
    const cards = [...window.document.querySelectorAll('.boss-choice-card')];
    if (cards.length) {
      cards[0].click();
      window.document.getElementById('quest-continue-btn').click();
      shots['quest-bossverdict'] = { w: 1000, h: 900, body: screen('screen-quest') + window.document.getElementById('boss-verdict-overlay').outerHTML };
    }
  }
  shots['quest-' + type] = { w: 1000, h: 900, body: screen('screen-quest') };
}

// A results screen with something in every section of the report.
const qp = s.questProgress[window.questKey('loans', quest.id)];
qp.analytics.knowledgeCheck = [{ question: 'What is capitalisation?', isCorrect: true }, { question: 'When does interest accrue?', isCorrect: false }];
qp.analytics.checks = [{ label: 'Grace period statement', isCorrect: true }, { label: 'Boss battle', isCorrect: true }];
qp.analytics.decisions = [{ title: 'The repayment conversation', choice: 'Talk it through first' }];
qp.learnedTerms = [{ term: 'Capitalisation', plain: 'x', section: 'a' }, { term: 'Grace period', plain: 'y', section: 'a' }];
window.finishQuest(loans, { text: 'She kept the payment manageable and the balance moving.', xpMultiplier: 1.25 });
shots.results = { w: 1000, h: 2000, body: screen('screen-results') };

/* ── write and shoot ─────────────────────────────────────────────────────── */
// Absolute file:// hrefs, because the harness pages are written into _shots/ and a relative
// stylesheet would resolve against that folder rather than the repo root. Same for the images
// the CSS pulls in (faces/, the module chips), which are all repo-root relative.
const fileUrl = (p) => 'file:///' + path.join(ROOT, p).split(String.fromCharCode(92)).join('/');
const page = (title, body, w) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<base href="${fileUrl('')}">
<link rel="stylesheet" href="${fileUrl('styles.css')}"><link rel="stylesheet" href="${fileUrl('app.css')}">
<style>
/* Settled state, not whichever animation frame the capture landed on. */
*, *::before, *::after { animation: none !important; transition: none !important; }
body { margin: 0; background: var(--bg); width: ${w}px; }
/* The two screens are viewport-sized flex columns in the real app. */
#screen-quest.active { display: flex; flex-direction: column; height: 900px; overflow: hidden; }
#screen-results.active { display: block; }
</style></head><body>${body}</body></html>`;

const only = process.argv.slice(2);
const names = Object.keys(shots).filter((n) => !only.length || only.includes(n));
fs.mkdirSync(OUT, { recursive: true });
for (const name of names) {
  const { w, h, body } = shots[name];
  const htmlPath = path.join(OUT, name + '.html');
  fs.writeFileSync(htmlPath, page(name, body, w));
  execFileSync(browser, [
    // A throwaway profile per run. Without it every launch contends for the user's real
    // browser profile, and a run that leaves a process behind makes the next one hang.
    `--user-data-dir=${path.join(OUT, '.profile')}`,
    '--no-first-run', '--no-default-browser-check',
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${path.join(OUT, name + '.png')}`,
    'file:///' + htmlPath.replace(/\\/g, '/'),
  ], { stdio: 'ignore', timeout: 60000 });
  console.log('  ' + path.relative(ROOT, path.join(OUT, name + '.png')));
}
console.log(`\n${names.length} shot(s) in _shots/ — open them, or pass names to narrow: ${Object.keys(shots).join(', ')}`);

// Explicit, because jsdom keeps the app own timers alive (the results screen arms several)
// and node would otherwise sit there long after the last PNG has been written.
window.close();
process.exit(0);
