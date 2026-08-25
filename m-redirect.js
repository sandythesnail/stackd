/*
 * Viewport router for trystacked.app.
 * Desktop / wide  -> the vanilla site at the root.
 * Phone / narrow  -> the Expo app under /m/.
 * Injected render-blocking into every page (vanilla via scripts/build.js, app pages via
 * scripts/inject-m-redirect.js), and re-checked on resize/orientation so shrinking a desktop
 * window switches to the app and widening it switches back. A phone (mobile UA) is never sent
 * back to the desktop site even in landscape, so rotating a phone won't kick you out of the app.
 */
(function () {
  function underApp() {
    return location.pathname === '/m' || location.pathname.indexOf('/m/') === 0;
  }
  // Shared Clerk sign-in / sign-up pages: usable on ANY viewport (the /m app sends mobile
  // users here to authenticate), so never viewport-redirect away from them.
  function isAuthPage() {
    var p = location.pathname;
    return p === '/login.html' || p === '/signup.html' || p === '/login' || p === '/signup';
  }
  // Legal + support pages, exempt for the same reason and then some: they are DESTINATIONS
  // people are sent to from inside the mobile app, and from the App Store listing.
  //
  // Without this, every one of those links was broken on the device most likely to follow it.
  // Settings' "Read the full privacy policy" opens trystacked.app/privacy.html in the phone's
  // browser; the phone is a mobile UA, so this script replaced it with /m/ before a word of
  // the policy rendered, and the student landed back in the app wondering what happened. The
  // signup screen's Terms of Use and Privacy Policy links do the same thing. So does the
  // Privacy Policy URL on the App Store listing when a reviewer taps it on an iPhone — which
  // is a metadata rejection, since the required policy is unreachable from the required link.
  //
  // These pages are also plain, self-contained documents that already read fine at any width,
  // so there is nothing for the viewport rule to improve by sending a phone elsewhere.
  function isLegalPage() {
    var p = location.pathname;
    return p === '/privacy.html' || p === '/privacy'
        || p === '/terms.html' || p === '/terms'
        || p === '/support.html' || p === '/support';
  }
  function isNarrow() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  }
  function isMobileUA() {
    return /Mobi|Android|iPhone|iPod|iPad|Windows Phone|BlackBerry/i.test(navigator.userAgent || '');
  }
  // Deliberate desktop visit to the app: `/m/?desktop=1` pins you there for the rest of the
  // browser tab, and `?desktop=0` releases it.
  //
  // The viewport rule below sends any genuine wide desktop back to the vanilla site, which
  // means the parts of the app only a mouse can reach — the lesson path's hover preview and
  // its lit-up node — cannot be seen or tested without dragging the window under 768px, and
  // phone emulation is no substitute because an emulated touch pointer produces no hover
  // events at all. This is the opt-out. Nothing changes for anyone who doesn't ask for it:
  // no param, no flag, same redirect as before.
  var PIN_KEY = 'stackd:pin-app';
  function pinned() {
    try {
      if (/[?&]desktop=1(&|$)/.test(location.search)) sessionStorage.setItem(PIN_KEY, '1');
      else if (/[?&]desktop=0(&|$)/.test(location.search)) sessionStorage.removeItem(PIN_KEY);
      return sessionStorage.getItem(PIN_KEY) === '1';
    } catch (e) {
      // Private-mode / blocked storage — fall back to the plain viewport rule.
      return false;
    }
  }
  // Don't yank the user out of an active lesson attempt via a resize-triggered redirect —
  // mid-quest session state (the current question, chosen answers, etc.) is intentionally
  // NOT persisted (see app.js's saveState — only questProgress, keyed by chapter, survives
  // a reload), so an instant location.replace() here would silently discard whatever the
  // user hasn't finished yet, just because they docked the window or opened DevTools.
  // Returns false (element doesn't exist yet) on the very first render-blocking call this
  // script makes in <head>, before the DOM has parsed — so the initial redirect on load is
  // unaffected; this only matters for the resize/orientationchange re-checks below.
  function midQuest() {
    var el = document.getElementById('screen-quest');
    return !!(el && el.classList.contains('active'));
  }

  // Carries the query string across a viewport redirect.
  //
  // These two redirects used to hand over a bare path, which quietly destroyed every referral
  // link that landed on the wrong side of the viewport rule. An invite is `/m/?ref=<id>`; open
  // one on a laptop and this bounced you to `/` with the ref gone, so the signup that followed
  // credited nobody and neither friend was ever paid. The reverse direction had the same hole
  // for a `/?ref=` link opened on a phone.
  //
  // The hash goes too: it costs nothing and a deep link is no more worth discarding than a
  // referral code was.
  function withQuery(path) {
    try {
      return path + (location.search || '') + (location.hash || '');
    } catch (e) {
      return path;
    }
  }

  function apply() {
    try {
      // Read first, and on every call: `pinned()` consumes ?desktop=1 into sessionStorage, and
      // the flag has to be recorded before this tab can be sent anywhere.
      var isPinned = pinned();
      if (isAuthPage() || isLegalPage()) return;
      if (midQuest()) return;
      if (!underApp()) {
        // On the vanilla site: a phone or a narrow viewport belongs in the app.
        if (isNarrow() || isMobileUA()) location.replace(withQuery('/m/'));
      } else {
        // In the app: only a genuine wide desktop (not a phone in landscape) goes back —
        // and not even then if this tab asked to stay.
        if (isPinned) return;
        if (!isNarrow() && !isMobileUA()) location.replace(withQuery('/'));
      }
    } catch (e) {
      /* on any error, stay put */
    }
  }

  apply();

  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(apply, 200);
  });
  window.addEventListener('orientationchange', apply);

  // A redirect deferred by midQuest() above needs some later trigger to actually happen —
  // otherwise a user who resizes once mid-quest and doesn't touch the window again until
  // long after finishing would be stuck on the wrong layout with no further resize event to
  // re-check. showScreen() (app.js) removes the 'active' class from #screen-quest the
  // moment any other screen shows, so watching for that class change re-runs the check
  // exactly when the deferred redirect becomes safe to take.
  function watchQuestExit() {
    var el = document.getElementById('screen-quest');
    if (!el || !window.MutationObserver) return;
    new MutationObserver(apply).observe(el, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchQuestExit);
  } else {
    watchQuestExit();
  }
})();
