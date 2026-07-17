/*
 * Viewport router for trystacked.app.
 * The desktop/"wide" web experience is this vanilla site (served at the root).
 * The mobile experience is the Expo app, hosted under /m/. This script runs
 * render-blocking in <head> (injected by scripts/build.js into every page) so
 * that a phone / narrow viewport is bounced to the app before first paint.
 * Desktop widths stay on the vanilla site untouched.
 */
(function () {
  try {
    // Already inside the app — never loop.
    if (location.pathname === '/m' || location.pathname.indexOf('/m/') === 0) return;

    var narrow = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    var mobileUA = /Mobi|Android|iPhone|iPod|iPad|Windows Phone|BlackBerry/i.test(navigator.userAgent || '');

    if (narrow || mobileUA) {
      location.replace('/m/');
    }
  } catch (e) {
    /* if anything goes wrong, just stay on the vanilla site */
  }
})();
