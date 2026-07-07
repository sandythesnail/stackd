window.addEventListener('load', async function () {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
  });

  if (!Clerk.isSignedIn) {
    window.location.href = 'login.html';
    return;
  }

  const nameEl = document.getElementById('settings-account-name');
  if (nameEl) {
    nameEl.textContent = Clerk.user.primaryEmailAddress?.emailAddress || Clerk.user.firstName || 'Account';
  }
  const signOutBtn = document.getElementById('settings-signout-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await Clerk.signOut({ redirectUrl: window.location.origin + '/' });
      window.location.href = window.location.origin + '/';
    });
  }

  document.getElementById('app').style.visibility = 'visible';
});
