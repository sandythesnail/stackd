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
  // paid here, only claim_referral_activation() (called once the referred user finishes
  // their first lesson) can do that.
  const pendingRefCode = localStorage.getItem('stackd_referral_code');
  if (pendingRefCode && pendingRefCode !== Clerk.user.id) {
    const { error: refError } = await window.stackdSupabase
      .from('referrals')
      .insert({ referrer_id: pendingRefCode, referred_id: Clerk.user.id });
    // Only clear the pending code once it's actually recorded, or once we know a row for
    // this user already exists (23505 = unique violation on referred_id). Any other error
    // (network hiccup, RLS misconfig, table not migrated yet, etc.) leaves the code in
    // localStorage so the next app.html load retries instead of silently losing the
    // referral forever — this was the bug: a failed first attempt used to wipe the code
    // immediately, so the referral could never be recorded and neither side ever got paid.
    if (!refError || refError.code === '23505') {
      localStorage.removeItem('stackd_referral_code');
    } else {
      console.error('Referral record failed, will retry next load:', refError);
    }
  } else {
    localStorage.removeItem('stackd_referral_code');
  }
  if (typeof window.maybeShowFirstTimeExperience === 'function') {
    window.maybeShowFirstTimeExperience();
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
