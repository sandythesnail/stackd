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

  // Referral capture: if this browser arrived via a referral link before signing up,
  // record a pending row now that a real Clerk user id exists. The reward itself is never
  // paid here — only claim_referral_activation() (called once the referred user finishes
  // their first lesson) can do that. Safe to attempt every load: a unique constraint on
  // referred_id makes a repeat insert a harmless no-op.
  const pendingRefCode = localStorage.getItem('stackd_referral_code');
  if (pendingRefCode && pendingRefCode !== Clerk.user.id) {
    const { error: refError } = await window.stackdSupabase
      .from('referrals')
      .insert({ referrer_id: pendingRefCode, referred_id: Clerk.user.id });
    if (refError) console.error('Referral record failed (may already exist):', refError);
  }
  localStorage.removeItem('stackd_referral_code');
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
