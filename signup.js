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

  if (Clerk.isSignedIn) {
    window.location.href = 'app.html';
    return;
  }

  // Stash a referral code from the URL (?ref=<referrer's Clerk user id>) so app-auth.js can
  // record it once this visitor actually has a Clerk user id of their own. Only stored when
  // we're actually showing the sign-up form (not for an already-signed-in visitor above),
  // since only a genuinely new signup should ever count as a referral.
  const refCode = new URLSearchParams(window.location.search).get('ref');
  if (refCode) localStorage.setItem('stackd_referral_code', refCode);

  Clerk.mountSignUp(document.getElementById('clerk-sign-up'), {
    fallbackRedirectUrl: window.location.origin + '/app.html',
    forceRedirectUrl: window.location.origin + '/app.html',
    signInUrl: window.location.origin + '/login.html',
  });

  Clerk.addListener(({ user }) => {
    if (user) window.location.href = 'app.html';
  });
});
