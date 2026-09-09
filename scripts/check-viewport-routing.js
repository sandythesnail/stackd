/**
 * Runs m-redirect.js — the real file, in a fake browser — and asserts where it sends people.
 *
 * This script is the first thing that executes on every page of both apps, render-blocking in
 * <head>, and it can replace the location before anything else gets a frame. Nothing tested
 * it. It decides, for every path and every viewport, whether you stay or get bounced, and it
 * had no way to notice when the set of paths grew underneath it.
 *
 * Which is what happened. clerk-js uses path routing, so a mounted SignIn appends its own
 * steps as SUBPATHS of the page it lives on: /login.html/sso-callback coming back from Google
 * or Microsoft, /signup.html/verify-email-address, plus a bare /sso-callback. vercel.json
 * rewrites all of them onto the page that mounts the widget — added deliberately, because
 * they used to 404. m-redirect.js exempted `/login.html` and `/signup.html` by exact equality
 * and therefore exempted none of them, so on a phone the OAuth callback page loaded and was
 * replaced with /m/ before clerk-js could read the callback out of the URL: a round trip all
 * the way to the provider and back, ending in the app, signed out. Desktop never saw it.
 *
 * Two things are checked, and they are two halves of one requirement — a path Clerk can land
 * on has to be BOTH served and left alone:
 *
 *   1. ROUTING   every path × viewport lands where the table says.
 *   2. REACHABLE every path this file exempts is actually served — a real file at the root,
 *                or covered by a vercel.json rewrite. An exemption for a path that 404s is
 *                not an exemption, it is a 404 nobody redirected away from.
 *
 *   node scripts/check-viewport-routing.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('m-redirect.js');

const UA = {
  phone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
};

/**
 * Runs the real m-redirect.js against a fake window and reports where it navigated, or null
 * if it left the page alone. Only the load-time pass is exercised; the resize and
 * orientationchange listeners are captured and never fired.
 */
function run({ url, ua, width, store = {}, questActive = false }) {
  const u = new URL(url, 'https://trystacked.app');
  let replaced = null;
  const location = {
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
    replace: (to) => { if (replaced === null) replaced = to; },
  };
  const sandbox = {
    location,
    navigator: { userAgent: ua },
    setTimeout: () => 0,
    clearTimeout: () => {},
    document: {
      readyState: 'complete',
      addEventListener: () => {},
      // The mid-quest guard looks for an element with the 'active' class.
      getElementById: (id) => (id === 'screen-quest'
        ? { classList: { contains: (c) => questActive && c === 'active' } }
        : null),
    },
  };
  sandbox.window = sandbox;
  sandbox.window.location = location;
  sandbox.window.matchMedia = (q) => ({ matches: /max-width:\s*768px/.test(q) && width <= 768 });
  sandbox.window.addEventListener = () => {};
  sandbox.sessionStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  // Not provided on purpose: watchQuestExit bails without it, and this harness never fires
  // the deferred re-check anyway.
  sandbox.MutationObserver = undefined;

  vm.runInNewContext(SRC, sandbox);
  return replaced;
}

const problems = [];
const check = (name, got, want) => {
  if (got !== want) problems.push(`${name}\n      expected: ${want === null ? 'stay put' : want}\n      actually: ${got === null ? 'stayed put' : got}`);
};

/* ── 1. routing ─────────────────────────────────────────────────────────── */

// Every path clerk-js can land a user on mid-authentication. All of these are served by a
// vercel.json rewrite, and NONE of them may be viewport-redirected: the URL is the handshake.
const CLERK_PATHS = [
  '/login.html',
  '/signup.html',
  '/login.html/sso-callback',
  '/login.html/factor-one',
  '/signup.html/verify-email-address',
  '/signup.html/continue',
  '/sso-callback',
  '/sso-callback/anything',
];
for (const p of CLERK_PATHS) {
  check(`phone on ${p} must not be bounced (it is mid-handshake)`,
    run({ url: p + '?redirect_url=/m/', ua: UA.phone, width: 390 }), null);
  check(`narrow desktop on ${p} must not be bounced`,
    run({ url: p, ua: UA.desktop, width: 500 }), null);
  check(`wide desktop on ${p} must not be bounced`,
    run({ url: p, ua: UA.desktop, width: 1440 }), null);
}

// Legal and support pages are destinations linked from inside the app and from the App Store
// listing, so a phone following one has to actually get there.
for (const p of ['/privacy.html', '/terms.html', '/support.html']) {
  check(`phone on ${p} must not be bounced`, run({ url: p, ua: UA.phone, width: 390 }), null);
}

// The ordinary viewport rule, in both directions.
check('phone on the vanilla site goes to the app',
  run({ url: '/app.html', ua: UA.phone, width: 390 }), '/m/');
check('narrow desktop on the vanilla site goes to the app',
  run({ url: '/app.html', ua: UA.desktop, width: 500 }), '/m/');
check('wide desktop on the vanilla site stays',
  run({ url: '/app.html', ua: UA.desktop, width: 1440 }), null);
check('wide desktop in the app goes back to the vanilla site',
  run({ url: '/m/', ua: UA.desktop, width: 1440 }), '/');
check('phone in the app stays, even in landscape',
  run({ url: '/m/', ua: UA.phone, width: 900 }), null);
check('narrow desktop in the app stays',
  run({ url: '/m/', ua: UA.desktop, width: 500 }), null);

// A referral link must survive the bounce in both directions — an invite that loses its ?ref
// credits nobody, and neither friend is ever paid.
check('a referral link opened on a phone keeps its code',
  run({ url: '/?ref=user_123', ua: UA.phone, width: 390 }), '/m/?ref=user_123');
check('a referral link opened on a laptop keeps its code',
  run({ url: '/m/?ref=user_123', ua: UA.desktop, width: 1440 }), '/?ref=user_123');
check('a deep link keeps its hash',
  run({ url: '/m/#/learn/quest', ua: UA.desktop, width: 1440 }), '/#/learn/quest');

// ?desktop=1 pins a tab to the app so the hover-only parts of the lesson path can be reached
// with a mouse; ?desktop=0 releases it.
check('?desktop=1 keeps a wide desktop in the app',
  run({ url: '/m/?desktop=1', ua: UA.desktop, width: 1440 }), null);
const pinned = { 'stackd:pin-app': '1' };
check('the pin persists for the rest of the tab',
  run({ url: '/m/', ua: UA.desktop, width: 1440, store: pinned }), null);
check('?desktop=0 releases the pin',
  run({ url: '/m/?desktop=0', ua: UA.desktop, width: 1440, store: { ...pinned } }), '/?desktop=0');

// Resizing mid-lesson must not discard an unfinished attempt. (Only reachable on a re-check;
// on the initial pass the element does not exist yet, which the file notes.)
check('a lesson in progress is not interrupted',
  run({ url: '/app.html', ua: UA.desktop, width: 500, questActive: true }), null);

// Nothing may bounce to where it already is.
for (const [name, url, ua, width] of [
  ['app page on a phone', '/m/', UA.phone, 390],
  ['vanilla page on a desktop', '/', UA.desktop, 1440],
]) {
  const to = run({ url, ua, width });
  if (to !== null && to.split('?')[0] === url.split('?')[0]) {
    problems.push(`${name}: redirects to itself (${to}) — that is a reload loop`);
  }
}

/* ── 2. every exempt path is actually served ────────────────────────────── */

const rewrites = JSON.parse(read('vercel.json')).rewrites || [];
/** Vercel rewrite sources are path patterns with regex groups; this is enough of that syntax
 *  for the handful in use, anchored so `/login.html` cannot match `/login.htmlx`. */
const served = (p) => {
  if (fs.existsSync(path.join(ROOT, p.replace(/^\//, '')))) return true;
  return rewrites.some((r) => new RegExp('^' + r.source.replace(/\(\.\*\)/g, '.*') + '$').test(p));
};
for (const p of CLERK_PATHS) {
  if (!served(p)) {
    problems.push(
      `${p} is exempt from the viewport bounce but nothing serves it — no file at the root and `
      + 'no vercel.json rewrite covers it, so it 404s. Being exempt from a redirect is not the '
      + 'same as being reachable.');
  }
}

if (problems.length) {
  console.error('Viewport routing FAILED:\n');
  for (const p of problems) console.error('  - ' + p);
  console.error('\nm-redirect.js runs render-blocking on every page of both apps and can');
  console.error('replace the location before anything else renders. Check its exemptions.\n');
  process.exit(1);
}

console.log(
  `Viewport routing OK — ${CLERK_PATHS.length} Clerk paths are served and never bounced, legal `
  + 'pages open on a phone, referral codes survive the switch in both directions, and the '
  + 'desktop pin holds.');
