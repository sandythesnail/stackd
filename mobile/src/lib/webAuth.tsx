import { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '@/theme';

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
    let ref = '';
    try {
      const r = new URLSearchParams(window.location.search).get('ref');
      if (r && page === 'signup') ref = `&ref=${encodeURIComponent(r)}`;
    } catch {}
    window.location.assign(`/${page}.html?redirect_url=${back}${ref}`);
  }, [page]);

  // Brief blank matching the app background while the redirect happens.
  return <View style={{ flex: 1, backgroundColor: colors.screen }} />;
}
