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

  Clerk.mountSignUp(document.getElementById('clerk-sign-up'), {
    fallbackRedirectUrl: window.location.origin + '/app.html',
    forceRedirectUrl: window.location.origin + '/app.html',
    signInUrl: window.location.origin + '/login.html',
  });

  Clerk.addListener(({ user }) => {
    if (user) window.location.href = 'app.html';
  });
});
