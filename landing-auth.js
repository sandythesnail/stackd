window.addEventListener('load', async function () {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
  });

  function renderNavAuth() {
    const slot = document.getElementById('nav-auth-slot');
    if (Clerk.isSignedIn) {
      slot.innerHTML = '<a href="app.html" class="btn-sm">Go to Dashboard</a><div id="clerk-nav-user-button"></div>';
      Clerk.mountUserButton(document.getElementById('clerk-nav-user-button'));
    } else {
      slot.innerHTML = '<a href="login.html" class="btn-outline-sm">Sign In</a><a href="login.html" class="btn-sm">Get Started</a>';
    }
  }

  renderNavAuth();
  Clerk.addListener(renderNavAuth);
});
