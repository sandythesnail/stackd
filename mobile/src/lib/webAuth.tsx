import { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '@/theme';
import { pendingReferralCode } from './referral';

/**
 * On the WEB build (the /m responsive site), the app reuses trystacked.app's real Clerk
 * sign-in — which has Google + every configured method — instead of the app's bare
 * email/password form. We send the browser to the site's /login.html (or /signup.html)
 * asking it to return to /m/ once authenticated. Clerk's session is shared across the
 * trystacked.app domain, so when we land back in /m/ the app sees the user as signed in.
 *
 * Native (iOS/Android) never renders this — those screens keep the in-app Clerk flow.
 */
export function WebAuthRedirect({ page }: { page: 'login' | 'signup' }) {
  useEffect(() => {
    const back = encodeURIComponent('/m/');
    // The stored code, not `window.location.search`. By the time this screen mounts the
    // router has rewritten the address bar to this route, so the `?ref=` the friend actually
    // opened is long gone from it — reading it here only ever worked if sign-up happened to
    // be the very first route resolved. It's captured at boot instead (see lib/referral.ts),
    // and forwarding it on is now belt-and-braces: signup.html stashes it under the same key
    // in the same origin's localStorage, so it survives this hop either way.
    const stored = page === 'signup' ? pendingReferralCode() : null;
    const ref = stored ? `&ref=${encodeURIComponent(stored)}` : '';
    window.location.assign(`/${page}.html?redirect_url=${back}${ref}`);
  }, [page]);

  // Brief blank matching the app background while the redirect happens.
  return <View style={{ flex: 1, backgroundColor: colors.screen }} />;
}
