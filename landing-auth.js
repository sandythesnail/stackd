window.addEventListener('load', async function () {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
  });

  if (Clerk.isSignedIn) {
    window.location.href = 'app.html';
  }
});
