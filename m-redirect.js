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
  function isNarrow() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  }
  function isMobileUA() {
    return /Mobi|Android|iPhone|iPod|iPad|Windows Phone|BlackBerry/i.test(navigator.userAgent || '');
  }

  function apply() {
    try {
      if (!underApp()) {
        // On the vanilla site: a phone or a narrow viewport belongs in the app.
        if (isNarrow() || isMobileUA()) location.replace('/m/');
      } else {
        // In the app: only a genuine wide desktop (not a phone in landscape) goes back.
        if (!isNarrow() && !isMobileUA()) location.replace('/');
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
})();
