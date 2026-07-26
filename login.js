window.addEventListener('load', async function () {
  try {
    await Clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor },
      appearance: {
        elements: {
          headerTitle: { color: '#4A6844' },
          footerAction: { display: 'none' },
        },
      },
    });
  } catch (e) {
    // Unlike landing.js (which can just show the page and let the user click through to
    // login later), this page has nothing else to show — the sign-in widget IS the page.
    // Previously an unhandled rejection here (network hiccup, ad-blocker, CSP block, Clerk
    // outage) left #clerk-sign-in permanently empty with no error and no way to recover
    // short of knowing to manually reload.
    console.error('Clerk failed to load:', e);
    const mount = document.getElementById('clerk-sign-in');
    mount.innerHTML = '<p style="text-align:center;color:#666;padding:24px 0;">' +
      'Couldn\'t load sign-in. Check your connection and try again.<br>' +
      '<button type="button" id="clerk-load-retry" style="margin-top:12px;color:#4A6844;font-weight:600;background:none;border:none;cursor:pointer;text-decoration:underline;">Retry</button></p>';
    document.getElementById('clerk-load-retry').addEventListener('click', () => location.reload());
    return;
  }

  // Where to send the user after auth. Normally /app.html, but the mobile app (/m) links
  // here with ?redirect_url=/m/ so it can reuse this real Clerk sign-in (Google + all
  // methods) and land back in the app. Persisted in sessionStorage so it survives the
  // OAuth round-trip, and validated as a same-origin path to avoid open redirects.
  const dest = resolvePostAuthDest();
  const go = (url) => {
    try { sessionStorage.removeItem('stackd_post_auth_redirect'); } catch (e) {}
    window.location.href = url;
  };

  if (Clerk.isSignedIn) { go(dest); return; }

  Clerk.mountSignIn(document.getElementById('clerk-sign-in'), {
    fallbackRedirectUrl: dest,
    forceRedirectUrl: dest,
    signUpUrl: window.location.origin + '/signup.html' + window.location.search,
  });

  Clerk.addListener(({ user }) => {
    if (user) go(dest);
  });
});

// Resolve the post-auth destination from ?redirect_url= (persisted across OAuth), defaulting
// to /app.html. Only same-origin absolute paths like "/m/" are allowed.
function resolvePostAuthDest() {
  const origin = window.location.origin;
  let raw = null;
  try {
    raw = new URLSearchParams(window.location.search).get('redirect_url');
    if (raw) sessionStorage.setItem('stackd_post_auth_redirect', raw);
    else raw = sessionStorage.getItem('stackd_post_auth_redirect');
  } catch (e) {}
  if (raw && /^\/[^/]/.test(raw)) return origin + raw; // e.g. "/m/", never "//evil.com"
  return origin + '/app.html';
}
