window.addEventListener('load', async function () {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
    appearance: {
      elements: {
        headerTitle: { color: '#4A6844' },
        footerAction: { display: 'none' },
      },
    },
  });

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
