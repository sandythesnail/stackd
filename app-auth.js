/*
 * Boot sequence for app.html: authenticate, then pull this account's cloud progress.
 *
 * app.html ships #app as visibility:hidden so a signed-out visitor never sees a flash of the
 * dashboard before being sent to login. That gate used to be released by the LAST line of
 * this file, at the end of an unbroken chain of awaits with no error handling anywhere in it
 * — Clerk.load, the Supabase client, a user_progress read, applyRemoteState, a referrals
 * insert. Anything throwing at any point (Clerk outage, an ad blocker or campus filter
 * killing the CDN, a bad row, a bug in applyRemoteState) meant the reveal never ran and the
 * student sat looking at a permanently blank page — no error, no retry, nothing to click.
 *
 * login.js and signup.js already learned this exact lesson and each carry a try/catch with a
 * Retry button; this file, where the same failure hides the entire app rather than one
 * widget, had none. It now has three rules:
 *   1. If Clerk itself can't load we can't tell signed-in from signed-out, so say so and
 *      offer Retry — never a blank page.
 *   2. Once the session IS confirmed, the app is revealed in a finally, so no later failure
 *      can keep it hidden.
 *   3. Cloud sync is best-effort. Without it the app still runs on local state, which is
 *      exactly what it does for a signed-out-but-local build already.
 */

/** Replaces the hidden app with a readable failure + Retry, for the one case we can't
 * recover from (no Clerk = no way to know whether this person is even signed in). */
function showBootError(message) {
  var el = document.getElementById('app');
  if (!el) return;
  el.innerHTML =
    '<div style="margin:auto;padding:32px 24px;max-width:420px;text-align:center;font-family:system-ui,sans-serif;color:#3B4A38">' +
    '<p style="font-size:17px;font-weight:600;margin:0 0 8px">' + message + '</p>' +
    '<p style="font-size:14px;color:#6B7A66;margin:0 0 18px">Check your connection and try again.</p>' +
    '<button type="button" id="app-boot-retry" style="font:inherit;font-weight:600;color:#4A6844;background:none;border:none;cursor:pointer;text-decoration:underline">Retry</button>' +
    '</div>';
  el.style.visibility = 'visible';
  var btn = document.getElementById('app-boot-retry');
  if (btn) btn.addEventListener('click', function () { location.reload(); });
}

window.addEventListener('load', async function () {
  const revealApp = () => {
    const el = document.getElementById('app');
    if (el) el.style.visibility = 'visible';
  };

  // Step 1 — the session. This is the only genuinely unrecoverable step: without it we
  // cannot know whether to show the app or redirect to login, so failing here shows an
  // error rather than guessing either way.
  try {
    await Clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor },
    });
  } catch (e) {
    console.error('Clerk failed to load:', e);
    showBootError("Couldn't sign you in.");
    return;
  }

  if (!Clerk.isSignedIn) {
    window.location.href = 'login.html';
    return;
  }

  // Step 2 — everything past here is enhancement. The user is authenticated and the app is
  // fully usable from local state, so the reveal in `finally` is unconditional: a failure
  // below costs cloud sync for this load, never the whole screen.
  try {
    // The Supabase library is a separate CDN script. If it was blocked or failed to load,
    // window.supabase is simply undefined — carry on local-only instead of throwing on
    // property access, which is what previously took the entire page down with it.
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      window.stackdSupabase = window.supabase.createClient(
        '__SUPABASE_URL__',
        '__SUPABASE_ANON_KEY__',
        { accessToken: () => Clerk.session.getToken() }
      );
    } else {
      console.error('Supabase client unavailable — continuing without cloud sync.');
    }

    // If the locally-cached snapshot belongs to a different account than the one now
    // signed in, discard it BEFORE reading/writing this account's row — otherwise the
    // previous account's progress bleeds into (and gets uploaded as) this account's.
    if (typeof window.ensureLocalStateOwner === 'function') {
      window.ensureLocalStateOwner(Clerk.user.id);
    }

    if (window.stackdSupabase) {
      const { data: remoteRow, error: remoteError } = await window.stackdSupabase
        .from('user_progress')
        .select('state')
        .eq('clerk_user_id', Clerk.user.id)
        .maybeSingle();
      if (remoteError) {
        console.error('Failed to load Supabase progress:', remoteError);
      } else if (remoteRow && typeof window.applyRemoteState === 'function') {
        // Guarded on its own: a single malformed field in a synced blob shouldn't cost the
        // user the rest of the boot (the referral capture and the account UI below).
        try {
          window.applyRemoteState(remoteRow.state);
        } catch (e) {
          console.error('Failed to apply remote progress:', e);
        }
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
      } else if (pendingRefCode) {
        // Self-referral, or a stale code for this same account — drop it. Deliberately NOT
        // cleared when there's no code at all and no client to record one with: a blocked
        // Supabase must not silently discard a referral the next load could still claim.
        localStorage.removeItem('stackd_referral_code');
      }
    }

    if (typeof window.maybeShowFirstTimeExperience === 'function') {
      window.maybeShowFirstTimeExperience();
    }
    // Picks up diamonds for any friend referrals that activated since this account's last
    // load. Safe to call every load: the server only ever pays out newly-activated,
    // not-yet-credited rows, so it's a cheap no-op once there's nothing pending.
    if (typeof window.maybeClaimReferrerRewards === 'function') {
      window.maybeClaimReferrerRewards();
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
  } catch (e) {
    console.error('App boot step failed, continuing with local state:', e);
  } finally {
    revealApp();
  }
});
