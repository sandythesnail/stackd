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
    // See login.js's identical fix — this page has nothing else to show, so an unhandled
    // Clerk.load() rejection used to leave #clerk-sign-up permanently empty with no error
    // and no way to recover short of knowing to manually reload.
    console.error('Clerk failed to load:', e);
    const mount = document.getElementById('clerk-sign-up');
    mount.innerHTML = '<p style="text-align:center;color:#666;padding:24px 0;">' +
      'Couldn\'t load sign-up. Check your connection and try again.<br>' +
      '<button type="button" id="clerk-load-retry" style="margin-top:12px;color:#4A6844;font-weight:600;background:none;border:none;cursor:pointer;text-decoration:underline;">Retry</button></p>';
    document.getElementById('clerk-load-retry').addEventListener('click', () => location.reload());
    return;
  }

  // Same as login.js: without this, the providers reuse the browser's existing account and
  // never ask which one to use. See clerk-account-picker.js.
  forceAccountPicker(Clerk);

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
  //
  // Only set if nothing's already pending: this key is a single global slot, not per-tab, so
  // opening two different ?ref= links in separate tabs before finishing sign-up in either
  // used to let whichever tab loaded last silently overwrite the first tab's code — crediting
  // the wrong referrer with no error shown. First link wins instead of last-write-wins.
  const refCode = new URLSearchParams(window.location.search).get('ref');
  if (refCode && !localStorage.getItem('stackd_referral_code')) localStorage.setItem('stackd_referral_code', refCode);

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
