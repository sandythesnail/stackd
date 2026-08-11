import { Platform } from 'react-native';
import type { makeSupabase } from './supabase';

/**
 * Capturing and recording the "someone invited me" half of referrals.
 *
 * The other half — actually paying both sides — lives in SupabaseSync's claimReferralRewards.
 * This is the step that has to happen first and had no implementation on this platform at
 * all: a referral link creates a `referrals` row, and nothing under /m/ was ever creating
 * one, so every claim came back 'no_pending_referral' forever.
 *
 * Why it was missing: on the desktop site the row is inserted by app-auth.js, which boots
 * app.html. The /m/ build is an Expo export and only ever gets m-redirect.js injected into it
 * (see scripts/inject-m-redirect.js), so app-auth.js does not run here. A friend who followed
 * a mobile invite link signed up through the shared signup.html — which DID stash the code —
 * and was then returned to /m/, where nothing ever read it back out. The code sat in
 * localStorage indefinitely unless that person later happened to open the desktop app.
 *
 * WEB ONLY, deliberately. A referral link is an https URL, so on a phone it opens the browser
 * and lands in /m/; the native iOS/Android builds are never the thing that receives one. The
 * storage below is raw window.localStorage rather than AsyncStorage for the same reason it
 * has to be: the key is shared with signup.js on the main site, and AsyncStorage namespaces
 * its keys under react-native-web, so the two would not see each other's writes.
 */

/** Same key signup.js writes on the main site, so a code stashed by either entry point is
 * visible to both. */
const REFERRAL_KEY = 'stackd_referral_code';

const web = () => Platform.OS === 'web' && typeof window !== 'undefined';

/**
 * Reads `?ref=<referrer clerk id>` out of the URL and stores it.
 *
 * Called once at app boot, from the root layout's module scope, and the timing is the whole
 * point. The param cannot be read later on: Expo Router rewrites the address bar as soon as
 * it resolves the first route, and m-redirect.js may bounce the page before that. Reading it
 * where the code used to — inside WebAuthRedirect, at the moment the sign-up screen mounts —
 * meant looking at a URL several navigations removed from the one the friend actually opened.
 *
 * First code wins, matching signup.js: this is a single global slot rather than a per-tab
 * one, so last-write-wins would let a second invite link opened in another tab silently
 * re-credit a different referrer.
 */
export function captureReferralFromUrl() {
  if (!web()) return;
  try {
    const code = new URLSearchParams(window.location.search).get('ref');
    if (!code) return;
    if (window.localStorage.getItem(REFERRAL_KEY)) return;
    window.localStorage.setItem(REFERRAL_KEY, code);
  } catch {
    // Private mode / blocked storage. Nothing to do: the referral is simply not captured,
    // which is the same outcome as never having clicked the link.
  }
}

/** The stored code, if this browser arrived through an invite and hasn't been recorded yet. */
export function pendingReferralCode(): string | null {
  if (!web()) return null;
  try {
    return window.localStorage.getItem(REFERRAL_KEY);
  } catch {
    return null;
  }
}

function clearPendingReferral() {
  if (!web()) return;
  try {
    window.localStorage.removeItem(REFERRAL_KEY);
  } catch { /* nothing we can do, and nothing depends on it succeeding */ }
}

/**
 * Records the pending referral against this account, now that it has a real Clerk id.
 *
 * A direct mirror of app-auth.js's referral-capture block, including its error handling,
 * because the two clients write the same row into the same table under the same RLS policy
 * (referrals_insert_self_pending — the client may only ever name ITSELF as referred_id, in
 * pending/unpaid state, so this cannot credit anyone with anything).
 *
 * The clearing rules are the load-bearing part:
 *  - recorded, or 23505 (unique violation on referred_id, i.e. a row already exists): done,
 *    drop the code.
 *  - any other error (offline, RLS misconfigured, migration not run): KEEP the code so the
 *    next boot retries. Dropping it here is the exact bug app-auth.js documents having had.
 *  - self-referral: drop it, there is nothing to record.
 */
export async function recordPendingReferral(
  supabase: ReturnType<typeof makeSupabase>,
  userId: string,
) {
  const code = pendingReferralCode();
  if (!code) return;
  if (code === userId) { clearPendingReferral(); return; }

  const { error } = await supabase
    .from('referrals')
    .insert({ referrer_id: code, referred_id: userId });

  if (!error || error.code === '23505') {
    clearPendingReferral();
  } else {
    console.warn('[referral] could not record referral, will retry next launch:', error.message);
  }
}
