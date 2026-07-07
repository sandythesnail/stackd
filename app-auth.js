window.addEventListener('load', async function () {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
    afterSignOutUrl: window.location.origin + '/',
  });

  if (!Clerk.isSignedIn) {
    window.location.href = 'login.html';
    return;
  }

  Clerk.mountUserButton(document.getElementById('clerk-user-button'));
  document.getElementById('app').style.visibility = 'visible';

  Clerk.addListener(({ user }) => {
    if (!user) window.location.href = 'index.html';
  });
});
