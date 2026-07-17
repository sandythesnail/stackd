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

  // Where to send the user after sign-up. Normally /app.html, but the mobile app (/m) links
  // here with ?redirect_url=/m/ to reuse this real Clerk sign-up and land back in the app.
  // Persisted across the OAuth round-trip and validated as a same-origin path.
  const dest = resolvePostAuthDest();
  const go = (url) => {
    try { sessionStorage.removeItem('stackd_post_auth_redirect'); } catch (e) {}
    window.location.href = url;
  };

  if (Clerk.isSignedIn) { go(dest); return; }

  // Stash a referral code from the URL (?ref=<referrer's Clerk user id>) so app-auth.js can
  // record it once this visitor actually has a Clerk user id of their own. Only stored when
  // we're actually showing the sign-up form (not for an already-signed-in visitor above),
  // since only a genuinely new signup should ever count as a referral.
  const refCode = new URLSearchParams(window.location.search).get('ref');
  if (refCode) localStorage.setItem('stackd_referral_code', refCode);

  Clerk.mountSignUp(document.getElementById('clerk-sign-up'), {
    fallbackRedirectUrl: dest,
    forceRedirectUrl: dest,
    signInUrl: window.location.origin + '/login.html' + window.location.search,
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
  if (raw && /^\/[^/]/.test(raw)) return origin + raw;
  return origin + '/app.html';
}
