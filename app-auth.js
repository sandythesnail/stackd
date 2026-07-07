window.addEventListener('load', async function () {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
  });

  if (!Clerk.isSignedIn) {
    window.location.href = 'login.html';
    return;
  }

  const accountEl = document.getElementById('clerk-user-button');
  if (accountEl) {
    const name = Clerk.user.firstName || Clerk.user.primaryEmailAddress?.emailAddress || 'Account';
    accountEl.innerHTML = `
      <span class="sf-account-name">${name}</span>
      <button type="button" class="sf-signout-btn" id="sf-signout-btn">Sign out</button>
    `;
    document.getElementById('sf-signout-btn').addEventListener('click', async () => {
      await Clerk.signOut({ redirectUrl: window.location.origin + '/' });
      window.location.href = window.location.origin + '/';
    });
  }

  document.getElementById('app').style.visibility = 'visible';
});
