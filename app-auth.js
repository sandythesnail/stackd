window.addEventListener('load', async function () {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
  });

  if (!Clerk.isSignedIn) {
    window.location.href = 'login.html';
    return;
  }

  window.stackdSupabase = window.supabase.createClient(
    'https://fapuxciloeyonxfvtgix.supabase.co',
    'sb_publishable_8i-NzWyy1fOlR5iER4k1dQ_gGN0HtkL',
    { accessToken: () => Clerk.session.getToken() }
  );

  const { data: remoteRow, error: remoteError } = await window.stackdSupabase
    .from('user_progress')
    .select('state')
    .eq('clerk_user_id', Clerk.user.id)
    .maybeSingle();
  if (remoteError) {
    console.error('Failed to load Supabase progress:', remoteError);
  } else if (remoteRow && typeof window.applyRemoteState === 'function') {
    window.applyRemoteState(remoteRow.state);
  }
  if (typeof window.maybeShowFirstTimeExperience === 'function') {
    window.maybeShowFirstTimeExperience();
  }
  if (typeof window.maybeClaimDailyLoginBonus === 'function') {
    window.maybeClaimDailyLoginBonus();
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
