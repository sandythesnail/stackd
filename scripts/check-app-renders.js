/**
 * Renders the whole web app headlessly and checks it still works.
 *
 * The other scripts/check-*.js files compare DATA between the two apps. This one runs the web
 * app's actual code: it loads app.html into jsdom, evaluates the five page scripts in the
 * order the page loads them, then paints every page in three account states (a fresh account,
 * mid-curriculum on a track, everything finished), drives the interactions, and asserts on
 * what came out. Anything thrown, and anything logged to console.error, fails the run.
 *
 * This is not a visual check. What it catches is the failure mode of any large change across
 * app.js / app.html / lesson-path.js: a renderer that throws, an id that moved, a handler
 * wired to an element that no longer exists — none of which a syntax check sees, and all of
 * which is a blank page for a student.
 *
 * DELIBERATELY not wired into `npm run check`, and jsdom is deliberately NOT a dependency of
 * this repo. Every other checker here is dependency-free and runs anywhere node does; this
 * one needs a DOM. Vercel installs root dependencies on every deploy and never runs this, so
 * putting jsdom in package.json would buy build time for nothing. Install it when you want to
 * run this:
 *
 *   npm i --no-save jsdom && node scripts/check-app-renders.js
 */
const fs = require('fs');
const path = require('path');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (e) {
  console.log('check-app-renders: skipped, jsdom is not installed.');
  console.log('  npm i --no-save jsdom && node scripts/check-app-renders.js');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Strip every <script> tag; we evaluate the local ones ourselves, in order, and the remote
// ones (Clerk) have no business running here.
const html = read('app.html').replace(/<script[\s\S]*?<\/script>/g, '');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://trystacked.app/app.html',
});
const { window } = dom;

const problems = [];
window.addEventListener('error', (e) => problems.push('window error: ' + (e.error?.stack || e.message)));
const realError = window.console.error.bind(window.console);
window.console.error = (...a) => { problems.push('console.error: ' + a.join(' ')); realError(...a); };
window.console.warn = () => {};

// jsdom has no layout, so every element reports a zero rect and a null offsetParent. The tour
// positioner reads both; give it something non-degenerate so its real code path runs instead
// of the "target missing" bail-out.
Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
  get() { return this.parentNode; },
});
window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { top: 10, left: 10, right: 210, bottom: 60, width: 200, height: 50, x: 10, y: 10 };
};
window.HTMLElement.prototype.scrollIntoView = function () {};
window.scrollTo = () => {};
// jsdom ships no matchMedia; the app asks it on every document click to decide whether the
// sidebar is a drawer. Desktop-shaped answer.
window.matchMedia = (q) => ({ media: q, matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null, dispatchEvent: () => false });

for (const f of ['lesson-path.js', 'post-test.js', 'daily-rewards.js', 'app.js', 'hammy-intro.js']) {
  const script = window.document.createElement('script');
  script.textContent = read(f);
  try {
    window.document.body.appendChild(script);
  } catch (e) {
    problems.push(`loading ${f}: ${e.stack}`);
  }
}

// app.js wires every global listener (the tour's Next/Skip, the nav, the badge filters) from
// a DOMContentLoaded handler. jsdom finished parsing before the harness appended the scripts,
// so that event has already been and gone — fire it by hand, or the page has markup and
// renderers but nothing is clickable.
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

async function stepAsync(name, fn) {
  try {
    await fn();
    console.log('  ok   ' + name);
  } catch (e) {
    problems.push(`${name}: ${e.stack}`);
    console.log('  FAIL ' + name);
  }
}

function step(name, fn) {
  try {
    fn();
    console.log('  ok   ' + name);
  } catch (e) {
    problems.push(`${name}: ${e.stack}`);
    console.log('  FAIL ' + name);
  }
}

function run(label, seed) {
  console.log('\n' + label);
  seed();
  step('renderHome', () => window.renderHome());
  step('renderProgressPage', () => window.renderProgressPage());
  step('renderModulesPage', () => window.renderModulesPage());
  step('renderToolsPage', () => window.renderToolsPage());
  step('renderBadgesPage', () => window.renderBadgesPage());
  step('renderShopPage (boutique)', () => { ev("shopActiveTab = 'boutique'"); window.renderShopPage(); });
  step('renderShopPage (room)', () => { ev("shopActiveTab = 'room'"); window.renderShopPage(); });
  step('renderRoomPage', () => { ev("roomActiveTab = 'room'"); window.renderRoomPage(); });
  step('renderWardrobeScene', () => { ev("roomActiveTab = 'wardrobe'"); window.renderRoomPage(); });
  step('renderSettingsPage', () => window.renderSettingsPage());
  step('renderLessonPath', () => window.renderLessonPath('home-lesson-path'));
}

// `let`/`const` at the top level of a classic script land in the global LEXICAL scope, not
// on `window` — so state, MODULES, SHOP_ITEMS, shopActiveTab and friends are unreachable as
// window properties. window.eval runs in that same global scope, which is how the harness
// gets at them. (Function declarations DO become window properties, so the renderers are
// callable directly.)
const ev = (expr) => window.eval(expr);
const api = ev('({ state, MODULES, SHOP_ITEMS, ACHIEVEMENTS })');
const s = api.state;

// 1. A brand-new account, no survey answered.
run('fresh account', () => {});

// 2. Mid-curriculum, on a track, with items owned/equipped and a streak going.
run('mid-curriculum, Debt Freedom track', () => {
  s.onboardingSurvey = { completed: true, moduleFamiliarity: {}, focusGoals: [], trackId: 'debt_freedom', completedAt: '2026-01-01' };
  s.xp = 700; s.level = 4; s.streak = 5; s.coins = 250; s.diamonds = 12;
  s.hasSeenOnboardingTour = true; s.metHammy = true;
  s.unlockedAchievements = ['first_paycheck', 'safety_net', 'on_fire', 'homebody', 'word_nerd'];
  const loans = api.MODULES.find((m) => m.id === 'loans');
  window.mainQuests(loans).slice(0, 3).forEach((q) => {
    s.questProgress[window.questKey('loans', q.id)] = { done: true, chapterIdx: 99, xpEarned: 30 };
  });
  s.activeModuleId = 'loans';
  s.ownedItems = api.SHOP_ITEMS.filter((i) => i.category === 'hat' && !i.isMysteryBox).slice(0, 4).map((i) => i.id);
  s.equippedItems = s.ownedItems.slice(0, 3);
  const roomItems = api.SHOP_ITEMS.filter((i) => i.slot);
  s.ownedRoomItems = roomItems.map((i) => i.id);
  roomItems.forEach((i) => { if (!s.equippedRoom[i.slot]) s.equippedRoom[i.slot] = i.id; });
});

// 3. Everything finished — the max-level / all-tiers / post-test branches.
run('everything complete', () => {
  s.xp = 5000; s.level = 11; s.streak = 42;
  api.MODULES.forEach((m) => {
    window.moduleUnits(m).forEach((q) => {
      s.questProgress[window.questKey(m.id, q.id)] = { done: true, chapterIdx: 99, xpEarned: 40 };
    });
    s.completedModules[m.id] = { score: 8, total: 8, xpEarned: 320 };
  });
  s.unlockedAchievements = api.ACHIEVEMENTS.map((a) => a.id);
});

// 4. The interactions the parity work added or rewired.
console.log('\ninteractions');
step('shop in-page tab chip', () => {
  ev("shopActiveTab = 'boutique'");
  window.renderShopPage();
  const chip = window.document.querySelector('[data-shop-page-tab="room"]');
  if (!chip) throw new Error('no room chip rendered');
  chip.click();
  if (ev('shopActiveTab') !== 'room') throw new Error('chip did not switch tab');
});
step('room in-page tab chip', () => {
  ev("roomActiveTab = 'room'");
  window.renderRoomPage();
  const chip = window.document.querySelector('[data-room-page-tab="wardrobe"]');
  if (!chip) throw new Error('no wardrobe chip rendered');
  chip.click();
  if (ev('roomActiveTab') !== 'wardrobe') throw new Error('chip did not switch tab');
});
step('room has no empty-slot placeholders', () => {
  s.equippedRoom = { wall: null, lamp: null, plant: null, bed: null, rug: null, wallpaper: null, window: null, desk: null, garland: null };
  ev("roomActiveTab = 'room'");
  window.renderRoomPage();
  const empties = window.document.querySelectorAll('#room-scene .room-slot');
  if (empties.length) throw new Error(`${empties.length} slot boxes drawn for an empty room`);
});
step('home badge row caps at 4', () => {
  window.renderHome();
  const badges = window.document.querySelectorAll('#home-achievements-row .ach-badge');
  if (badges.length > 4) throw new Error(`${badges.length} badges on Home`);
});
step('home greeting names the reader', () => {
  const t = window.document.getElementById('home-greeting').textContent;
  if (!/^Good (morning|afternoon|evening), /.test(t)) throw new Error('greeting reads: ' + t);
});
step('progress page has Level Progress and Ranks', () => {
  window.renderProgressPage();
  const body = window.document.getElementById('progress-body').textContent;
  for (const want of ['Level Progress', 'Ranks', 'Frugal Freshman', 'Financially Literate Graduate']) {
    if (!body.includes(want)) throw new Error('missing: ' + want);
  }
  if (body.includes('XP Earned by Module')) throw new Error('XP-by-module chart is still rendered');
});
step('badges page has no status filter', () => {
  if (window.document.getElementById('badges-status-filter')) throw new Error('status filter still in the DOM');
});
step('settings has no referral card, has delete + privacy', () => {
  window.renderSettingsPage();
  const body = window.document.getElementById('page-settings').textContent;
  if (body.includes('Invite Friends')) throw new Error('referral card still present');
  for (const want of ['Delete my account', 'Your data']) {
    if (!body.includes(want)) throw new Error('missing: ' + want);
  }
});
step('reset asks with the styled dialog, not window.confirm', () => {
  window.confirm = () => { throw new Error('window.confirm was called'); };
  window.renderSettingsPage();
  window.document.getElementById('reset-btn').click();
  const card = window.document.querySelector('#confirm-dialog .confirm-dialog-card');
  if (!card) throw new Error('no confirm dialog rendered');
  if (!card.textContent.includes('Reset all progress?')) throw new Error('wrong dialog: ' + card.textContent.slice(0, 60));
  window.document.getElementById('confirm-dialog-cancel').click();
});
step('track ordering drives the next module', () => {
  s.questProgress = {};
  s.completedModules = {};
  s.onboardingSurvey = { completed: true, moduleFamiliarity: {}, focusGoals: [], trackId: 'stay_protected', completedAt: '2026-01-01' };
  const next = window.nextModuleForUser();
  if (next.id !== 'risk') throw new Error('next module is ' + next.id + ', expected risk (Stay Protected leads with it)');
  window.renderHome();
  const card = window.document.getElementById('home-mascot-card').textContent;
  if (!card.includes('Managing Risk')) throw new Error('continue card names: ' + card.slice(0, 80));
});
step('tour runs all six steps', () => {
  s.hasSeenOnboardingTour = false;
  window.startOnboardingTour();
  const total = window.document.getElementById('tour-step-label').textContent;
  if (!/of 6$/.test(total)) throw new Error('step label reads: ' + total);
  const titles = [];
  for (let i = 0; i < 6; i++) {
    titles.push(window.document.getElementById('tour-title').textContent);
    const next = window.document.getElementById('tour-next');
    if (next.style.display === 'none') break;
    next.click();
  }
  if (titles[0] !== 'Come back every day') throw new Error('step 1 is: ' + titles[0]);
  if (titles[4] !== 'Pick your first lesson') throw new Error('step 5 is: ' + titles[4]);
  window.document.getElementById('tour-skip').click();
});
step('lesson-path node click opens the preview and advances the tour', () => {
  s.hasSeenOnboardingTour = false;
  window.startOnboardingTour();
  for (let i = 0; i < 4; i++) window.document.getElementById('tour-next').click();
  const node = window.document.querySelector('#home-lesson-path .lp-hit[aria-current="true"]');
  if (!node) throw new Error('no recommended node on the path');
  node.click();
  if (!window.document.getElementById('lp-preview-start')) throw new Error('preview did not open');
  if (window.document.getElementById('tour-title').textContent !== 'Now start it') {
    throw new Error('tour did not advance to the final step');
  }
  window.document.getElementById('tour-skip').click();
  window.document.getElementById('lp-preview-close').click();
});
step('daily reward calendar opens itself when a day is uncollected', () => {
  s.hasSeenOnboardingTour = true;
  s.dailyLoginLog = {};
  ev('homeAutoOpenedRewards = false');
  window.renderHome();
  if (!window.document.querySelector('.dr-overlay.show, #daily-rewards-overlay.show, .dr-modal')) {
    throw new Error('no reward modal after a Home render with a pending day');
  }
});

// 5. The two results screens, painted directly rather than by playing a whole lesson.
console.log('\nresults screens');
function fakeQp(over) {
  return Object.assign({
    done: true, chapterIdx: 99, chapterScore: 0, chapterTotal: 0, streak: 0,
    hintsUsed: 0, xpEarned: 40, learnedTerms: [], dashboard: { checking: 500, creditScore: 700 },
    analytics: { knowledgeCheck: [], mythCards: [], polls: [], matchingMistakes: 0, explainback: null, decisions: [], bossChoice: null, checks: [] },
  }, over);
}
function paintResults(qp) {
  const mod = api.MODULES.find((m) => m.id === 'credit');
  s.activeModuleId = mod.id;
  s.activeQuestId = window.mainQuests(mod)[0].id;
  window.renderQuestResults(mod, 40, 12, [], 'Hammy came out ahead.', qp, 0);
  return window.document.getElementById('results-wrap').textContent;
}
step('results: nothing graded shows an em dash, not 100%', () => {
  const t = paintResults(fakeQp());
  if (!t.includes('Nothing graded this lesson')) throw new Error('missing the ungraded line');
  if (t.includes('100%')) throw new Error('still claims 100% for an ungraded lesson');
  if (t.includes('Every question right this time')) throw new Error('congratulates a clean sweep of nothing');
  if (t.includes('Words you learned')) throw new Error('empty terms section still rendered');
  if (t.includes('Quick Check')) throw new Error('0/0 stat tile still rendered');
});
step('results: a perfect lesson reads "nailed it!"', () => {
  const t = paintResults(fakeQp({
    learnedTerms: [{ term: 'APR' }, { term: 'Utilization' }],
    analytics: Object.assign(fakeQp().analytics, {
      knowledgeCheck: [{ question: 'q1', isCorrect: true }, { question: 'q2', isCorrect: true }],
    }),
  }));
  if (!t.includes('nailed it!')) throw new Error('headline: ' + t.slice(0, 120));
  if (!t.includes('2/2 correct')) throw new Error('missing the tally');
  if (!t.includes('Every question right this time')) throw new Error('missing the perfect line');
  if (!t.includes('LESSON COMPLETE')) throw new Error('does not say LESSON COMPLETE');
  if (t.includes('Quest Complete')) throw new Error('still says Quest Complete');
  if (!t.includes('Words you learned')) throw new Error('terms section missing when there are terms');
});
step('results: weak spots cap at two with a "+N more"', () => {
  const wrong = [1, 2, 3, 4, 5].map((n) => ({ question: 'missed ' + n, isCorrect: false }));
  paintResults(fakeQp({
    analytics: Object.assign(fakeQp().analytics, { knowledgeCheck: wrong }),
  }));
  const wrap = window.document.getElementById('results-wrap');
  const shown = wrap.querySelectorAll('.report-weak-list:not(.report-weak-rest) li');
  if (shown.length !== 2) throw new Error(shown.length + ' weak spots shown before expanding');
  const more = wrap.querySelector('.report-weak-more');
  if (!more || !more.textContent.includes('+ 3 more')) throw new Error('no expander: ' + (more && more.textContent));
  more.click();
  if (wrap.querySelector('.report-weak-rest').hidden) throw new Error('expander did not open the rest');
  if (!wrap.textContent.includes('done!')) throw new Error('headline should say done!, not nailed it!');
});
step('results: level bar is present and honest at max level', () => {
  s.level = 4; s.xp = 700;
  let t = paintResults(fakeQp());
  if (!/LEVEL 4/.test(t) || !/to Level 5/.test(t)) throw new Error('level bar reads: ' + t.slice(0, 200));
  s.level = 11; s.xp = 5000;
  t = paintResults(fakeQp());
  if (!t.includes('Max level reached')) throw new Error('promises a level past the ladder');
  if (/to Level 12/.test(t)) throw new Error('promises Level 12');
});

// 6. Life events: the pool, the module preference, and the no-repeat rotation.
console.log('\nlife events');
step('life events: the module-tagged pool reached the web', () => {
  const all = ev('LIFE_EVENTS');
  if (all.length !== 36) throw new Error(all.length + ' events, expected 36');
  const tagged = new Set(all.map((e) => e.moduleId).filter(Boolean));
  if (tagged.size !== 11) throw new Error(tagged.size + ' modules tagged, expected 11');
});
step('life events: prefers the module being worked through', () => {
  const le = { history: [], sessionCount: 0, lastTriggeredSession: -99 };
  for (let i = 0; i < 40; i++) {
    const e = window.pickAmbientLifeEvent('taxes', le);
    if (!e) throw new Error('picker returned nothing');
    if (e.moduleId !== 'taxes') throw new Error('drew ' + e.id + ' while working through taxes');
    if (le.history.length > 3) throw new Error('history grew past the module pool');
    le.history.push(e.id);
    // Once all three taxes events are seen the picker is allowed to fall back to the wider
    // pool, which is the behaviour the next assertion covers.
    if (le.history.length === 3) break;
  }
  const after = window.pickAmbientLifeEvent('taxes', le);
  if (after.moduleId === 'taxes') throw new Error('repeated a taxes event with all three seen');
});
step('life events: nothing repeats until the pool is exhausted', () => {
  const le = { history: [], sessionCount: 0, lastTriggeredSession: -99 };
  const seen = new Set();
  for (let i = 0; i < 36; i++) {
    const e = window.pickAmbientLifeEvent(undefined, le);
    if (seen.has(e.id)) throw new Error('repeat at draw ' + (i + 1) + ': ' + e.id);
    seen.add(e.id);
    le.history.push(e.id);
  }
  // Exhausted: the rotation restarts and forgets only the ambient half of the history.
  le.history.push('phishing_text_test');
  const next = window.pickAmbientLifeEvent(undefined, le);
  if (!next) throw new Error('picker gave up once the pool was exhausted');
  if (!le.history.includes('phishing_text_test')) throw new Error('the reset forgot an unlock id');
});

// 7. Badges earned away from a lesson.
console.log('\nbadges outside a lesson');
step('filling the room earns Homebody, with a toast', () => {
  s.unlockedAchievements = [];
  s.claimedBadgeRewards = [];
  s.equippedRoom = { wall: null, lamp: null, plant: null, bed: null, rug: null, wallpaper: null, window: null, desk: null, garland: null };
  const roomItems = api.SHOP_ITEMS.filter((i) => i.slot);
  s.ownedRoomItems = roomItems.map((i) => i.id);
  s.coins = 99999;
  // Place everything but the last slot by hand, then let the app place the final one.
  const bySlot = new Map();
  roomItems.forEach((i) => { if (!bySlot.has(i.slot)) bySlot.set(i.slot, i); });
  const slots = [...bySlot.keys()];
  const last = slots.pop();
  slots.forEach((slot) => { s.equippedRoom[slot] = bySlot.get(slot).id; });
  window.document.querySelectorAll('.toast').forEach((t) => t.remove());
  window.handleShopAction(bySlot.get(last).id);
  if (!s.unlockedAchievements.includes('homebody')) {
    throw new Error('Homebody not awarded after the last slot was filled');
  }
  const toast = window.document.querySelector('.toast-achievement');
  if (!toast) throw new Error('no badge toast');
  if (!toast.textContent.includes('Homebody')) throw new Error('toast names: ' + toast.textContent.trim());
});
step('a streak badge is awarded without finishing a lesson', () => {
  s.unlockedAchievements = [];
  s.claimedBadgeRewards = [];
  s.streak = 7;
  const coinsBefore = s.coins;
  const got = window.checkAchievementsAndAnnounce();
  if (!s.unlockedAchievements.includes('on_fire')) throw new Error('On a Roll not awarded at a 7-day streak');
  if (!got.some((a) => a.id === 'on_fire')) throw new Error('the unlock was not reported back');
  if (s.coins <= coinsBefore) throw new Error('the badge reward was not paid');
});

(async () => {
// 8. The lesson player's exit.
console.log('\nleaving a lesson');
const flush = () => new Promise((r) => setTimeout(r, 0));
async function leaveLessonAt(chapterIdx) {
  const mod = api.MODULES.find((m) => m.id === 'credit');
  const quest = window.mainQuests(mod)[0];
  window.startQuest(mod.id, quest.id);
  const qp = s.questProgress[window.questKey(mod.id, quest.id)];
  qp.chapterIdx = chapterIdx;
  window.document.querySelectorAll('#confirm-dialog').forEach((n) => n.remove());
  window.document.getElementById('quest-exit').click();
  await flush();
  return window.document.querySelector('#confirm-dialog .confirm-dialog-card');
}
await stepAsync('chapter one leaves without a prompt', async () => {
  const card = await leaveLessonAt(0);
  if (card) throw new Error('asked about progress there was none of: ' + card.textContent.trim().slice(0, 60));
});
await stepAsync('later chapters promise the place is kept, and name it', async () => {
  const card = await leaveLessonAt(3);
  if (!card) throw new Error('no dialog');
  const t = card.textContent;
  if (!t.includes('Leave this lesson?')) throw new Error('title reads: ' + t.slice(0, 60));
  if (!t.includes('Your place is saved')) throw new Error('does not reassure: ' + t.slice(0, 120));
  if (/quest/i.test(t)) throw new Error('still says "quest": ' + t.slice(0, 120));
  window.document.getElementById('confirm-dialog-cancel').click();
});


// 9. The badge ceiling has to be a real one.
console.log('\nbadge ceiling');
step('every badge on the grid can actually be won', () => {
  const earnable = ev('EARNABLE_ACHIEVEMENTS');
  const all = api.ACHIEVEMENTS;
  if (earnable.length >= all.length) throw new Error('nothing is marked unwinnable');
  const hidden = all.filter((a) => !earnable.includes(a)).map((a) => a.id).sort().join(',');
  if (hidden !== 'excellent_credit,iron_will') throw new Error('unexpected hidden set: ' + hidden);
  // The grid, and the counter above it, must both agree with that list.
  s.unlockedAchievements = [];
  window.renderBadgesPage();
  const tiles = window.document.querySelectorAll('#achievements-row .ach-badge');
  if (tiles.length !== earnable.length) throw new Error(tiles.length + ' tiles for ' + earnable.length + ' winnable badges');
  const sub = window.document.getElementById('achieve-sub').textContent;
  if (!sub.includes('/ ' + earnable.length)) throw new Error('counter reads: ' + sub);
});
step('Grandmaster is reachable', () => {
  const earnable = ev('EARNABLE_ACHIEVEMENTS');
  // Everything except Grandmaster itself, exactly as a player would arrive at it.
  s.unlockedAchievements = earnable.filter((a) => a.id !== 'grandmaster').map((a) => a.id);
  s.claimedBadgeRewards = [...s.unlockedAchievements];
  const got = window.checkAchievementsAndAnnounce();
  if (!got.some((a) => a.id === 'grandmaster')) {
    throw new Error('the hardest badge in the app still cannot be earned');
  }
});
step('the two unwinnable badges are never awarded', () => {
  s.unlockedAchievements = [];
  s.claimedBadgeRewards = [];
  // Conditions that would satisfy both of them if anything were reading them.
  s.financialState = { checking: 600, savings: 200, creditScore: 850 };
  window.checkAchievements();
  for (const id of ['iron_will', 'excellent_credit']) {
    if (s.unlockedAchievements.includes(id)) throw new Error(id + ' was awarded from a state nothing can reach');
  }
});

// 10. Replaying a finished lesson pays nothing, as on mobile.
console.log('\nreplay pays nothing');
step('a first run pays, a replay does not', () => {
  const mod = api.MODULES.find((m) => m.id === 'credit');
  const quest = window.mainQuests(mod)[0];
  const key = window.questKey(mod.id, quest.id);

  // First time through.
  delete s.questProgress[key];
  s.xp = 0; s.coins = 0; s.level = 1;
  window.startQuest(mod.id, quest.id);
  const qp = s.questProgress[key];
  qp.chapterScore = 5; qp.chapterTotal = 5;
  window.finishQuest(mod, { text: 'ok', xpMultiplier: 1 });
  const firstXp = s.xp, firstCoins = s.coins;
  if (firstXp <= 0 || firstCoins <= 0) throw new Error(`a first run paid ${firstXp} XP / ${firstCoins} coins`);

  // Same lesson again, now that it is done.
  window.startQuest(mod.id, quest.id);
  const qp2 = s.questProgress[key];
  if (!qp2.isReplay) throw new Error('the second run was not flagged as a replay');
  qp2.chapterScore = 5; qp2.chapterTotal = 5;
  window.finishQuest(mod, { text: 'ok', xpMultiplier: 1 });
  if (s.xp !== firstXp) throw new Error(`the replay paid ${s.xp - firstXp} XP`);
  if (s.coins !== firstCoins) throw new Error(`the replay paid ${s.coins - firstCoins} coins`);

  const wrap = window.document.getElementById('results-wrap').textContent;
  if (!wrap.includes('already finished this one')) throw new Error('a bare +0 with no explanation');
});

// 11. Hints: no budget, and no button where no hint was written.
console.log('\nhints');
step('a hint can be asked for as often as there are hints', () => {
  const mod = api.MODULES.find((m) => m.id === 'credit');
  // A chapter that carries a real authored hint.
  let target = null;
  for (const q of window.mainQuests(mod)) {
    const i = q.chapters.findIndex((c) => c.hintText);
    if (i >= 0) { target = { quest: q, idx: i }; break; }
  }
  if (!target) throw new Error('no authored hint to test with');

  delete s.questProgress[window.questKey(mod.id, target.quest.id)];
  window.startQuest(mod.id, target.quest.id);
  const qp = s.questProgress[window.questKey(mod.id, target.quest.id)];

  // Ask far more times than the old budget of three allowed.
  for (let i = 0; i < 6; i++) {
    window.renderChapter(mod, target.idx);
    const btn = window.document.getElementById('hint-ask-btn');
    if (!btn) throw new Error('no hint button on a chapter that has a hint (attempt ' + (i + 1) + ')');
    if (btn.disabled) throw new Error('the hint button greyed out after ' + i + ' uses');
    btn.click();
  }
  if ((qp.hintsUsed || 0) !== 6) throw new Error('hintsUsed is ' + qp.hintsUsed + ', expected 6');
});
step('no hint button where no hint was written', () => {
  const mod = api.MODULES.find((m) => m.id === 'credit');
  let target = null;
  for (const q of window.mainQuests(mod)) {
    const i = q.chapters.findIndex((c) => !c.hintText && !(c.hintTexts || []).some(Boolean) && c.type !== 'knowledgecheck');
    if (i >= 0) { target = { quest: q, idx: i }; break; }
  }
  if (!target) throw new Error('every chapter has a hint, nothing to test');
  delete s.questProgress[window.questKey(mod.id, target.quest.id)];
  window.startQuest(mod.id, target.quest.id);
  window.renderChapter(mod, target.idx);
  if (window.document.getElementById('hint-ask-btn')) {
    throw new Error('offered a hint on a chapter that has none');
  }
});

// 12. Tools: named options, and the loan tool asking only about the loan.
console.log('\ntools');
function openTool(tab) {
  window.showPage('tools');
  window.document.querySelectorAll('.tools-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  window.renderToolsPage();
  return window.document.getElementById('tools-panel');
}
step('the rate question is a named list, not a bare percentage', () => {
  const panel = openTool('compound');
  const sel = panel.querySelector('#ci-rate');
  if (!sel || sel.tagName !== 'SELECT') throw new Error('the rate is still a ' + (sel && sel.tagName));
  const labels = [...sel.options].map((o) => o.textContent);
  if (labels.length !== 5) throw new Error(labels.length + ' options, expected 5');
  if (!labels.some((l) => l.startsWith('Index fund'))) throw new Error('options read: ' + labels.join(' | '));
  if (Number(sel.value) !== 8.5) throw new Error('default rate is ' + sel.value);
  if (panel.querySelector('.ci-preset-btn')) throw new Error('the old preset chips are still there');
});
step('the loan tool asks about the loan and nothing else', () => {
  const panel = openTool('loan');
  for (const id of ['lp-income', 'lp-rent', 'lp-food', 'lp-other', 'lp-reality-card']) {
    if (panel.querySelector('#' + id)) throw new Error('#' + id + ' is still on the page');
  }
  const rate = panel.querySelector('#lp-rate');
  const term = panel.querySelector('#lp-term');
  if (!rate || rate.tagName !== 'SELECT') throw new Error('loan type is not a select');
  if (!term || term.tagName !== 'SELECT') throw new Error('repayment plan is not a select');
  if (rate.options.length !== 4) throw new Error(rate.options.length + ' loan types, expected 4');
  if (![...rate.options].some((o) => Number(o.value) === 12)) throw new Error('the 12% option is missing');
  if (term.options.length !== 3) throw new Error(term.options.length + ' repayment plans, expected 3');
});
step('extra payments are capped at doubling the minimum', () => {
  const panel = openTool('loan');
  const slider = panel.querySelector('#lp-extra');
  if (!slider) throw new Error('no extra-payment slider');
  // $27,000 at 5.5% over 10 years is about $293/month, so the cap should be near that.
  const max = Number(slider.max);
  if (max < 250 || max > 340) throw new Error('cap is ' + max + ', expected roughly the minimum payment');
});
step('changing the loan type re-runs the maths', () => {
  const panel = openTool('loan');
  const before = panel.querySelector('#lp-headline').textContent;
  const rate = panel.querySelector('#lp-rate');
  rate.value = '12';
  rate.dispatchEvent(new window.Event('change'));
  const after = window.document.querySelector('#lp-headline').textContent;
  if (before === after) throw new Error('the answer did not change when the rate went 5.5% -> 12%');
});

step('the budget shows five categories, with the rest behind a disclosure', () => {
  s.budgetPlan = {
    incomeSources: [], fixedExpenses: [], savingsGoal: 0,
    variableExpenses: { groceries: 0, diningOut: 0, foodDelivery: 0, coffee: 0, clothing: 0,
      beauty: 0, transportation: 0, entertainment: 0, textbooks: 0, gym: 0 },
  };
  ev('budgetMoreOpen = false');
  let panel = openTool('budget');
  const visible = [...panel.querySelectorAll('#variable-rows > .budget-row')];
  if (visible.length !== 5) throw new Error(visible.length + ' categories shown, expected 5');
  const more = panel.querySelector('#budget-more');
  if (!more || !more.hidden) throw new Error('the extra five are not tucked away');
  if (more.querySelectorAll('.budget-row').length !== 5) throw new Error('wrong number behind the disclosure');

  const btn = panel.querySelector('#budget-more-btn');
  if (!btn) throw new Error('no "More categories" button');
  btn.click();
  if (window.document.querySelector('#budget-more').hidden) throw new Error('the button did not open them');
});
step('a category with a figure in it opens itself', () => {
  s.budgetPlan.variableExpenses.textbooks = 60;
  ev('budgetMoreOpen = false');
  const panel = openTool('budget');
  const more = panel.querySelector('#budget-more');
  if (!more || more.hidden) throw new Error('a student came back to their own number hidden');
  // All ten still count, whether shown or not.
  const totals = window.computeBudgetTotals(s.budgetPlan);
  if (totals.totalVariable !== 60) throw new Error('a hidden category stopped counting: ' + totals.totalVariable);
});

console.log('\n' + (problems.length ? `FAILED (${problems.length})\n` + problems.join('\n\n') : 'PASS — no errors'));
process.exit(problems.length ? 1 : 0);
})();
