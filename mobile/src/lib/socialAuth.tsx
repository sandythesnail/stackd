/**
 * Google + Microsoft sign-in for the NATIVE app.
 *
 * Until now the native build had no social sign-in at all: the only real control on the
 * sign-in screen was email + password, and the one Microsoft-branded button that had existed
 * was a fake (it navigated to Home without authenticating anybody) and was removed. Both
 * providers are enabled and authenticatable on the production Clerk instance — the web app
 * has always offered them through Clerk's hosted widget, and the /m web build reuses that
 * widget by redirecting to /login.html (see webAuth.tsx). This is the same two providers,
 * done the way a native app has to do them.
 *
 * Clerk's SSO on native is a browser round-trip: `startSSOFlow` creates the sign-in, opens
 * the provider in an auth session (SFAuthenticationSession / Custom Tab, NOT a webview — the
 * providers block those), and comes back to `redirectUrl` with a nonce that Clerk exchanges
 * for a session.
 *
 * One thing outside this file has to be right, and it is not right by default: the redirect
 * URL below has to be authorized on the Clerk instance. `Linking.createURL('/sso-callback')`
 * resolves to `stackd://sso-callback` in a build (app.json's `scheme`) and to an `exp://…`
 * URL under Expo Go, and Clerk rejects BOTH until they're added to the instance's allowed
 * redirect URLs — verified against production, which answers a native sign-in with
 * `resource_missmatch`, "Redirect url mismatch", no matter which provider is asked for.
 * `npm run check:sso` asks Clerk directly and prints what it accepts.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSSO } from '@clerk/clerk-expo';
import { Button, Txt } from '@/components';
import { colors, font } from '@/theme';
import { clerkError } from './clerkErrors';
import { fillMissingUsername } from './clerkSignUp';

// Dismisses the auth session's popup on web and, on native, lets a redirect that arrives
// while the app is warm complete instead of being dropped. Module scope on purpose: it has
// to have run before any redirect can come back.
WebBrowser.maybeCompleteAuthSession();

type Strategy = 'oauth_google' | 'oauth_microsoft';

const PROVIDERS: { strategy: Strategy; name: string; Logo: () => React.JSX.Element }[] = [
  { strategy: 'oauth_google', name: 'Google', Logo: GoogleLogo },
  { strategy: 'oauth_microsoft', name: 'Microsoft', Logo: MicrosoftLogo },
];

export function SocialAuth({
  completingRef,
  onSignedIn,
}: {
  /** The screen's "I am navigating myself" guard. Armed before setActive, because setActive
   * is what flips isSignedIn and both sign-in screens have an effect watching that — see the
   * comments on those effects. Without arming it, the effect and this handler both navigate.
   * Named …Ref because the React Compiler's lint only permits writing through a prop it can
   * recognise as a ref by name. */
  completingRef: React.RefObject<boolean>;
  /** `isNewUser` is true when the provider round-trip CREATED the account (Clerk's transfer
   * path), which is the one case that still owes us the onboarding survey. */
  onSignedIn: (result: { isNewUser: boolean }) => void;
}) {
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState<Strategy | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The screen can unmount the moment we navigate; don't setState into the void afterwards.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // Android opens the provider in a Custom Tab; binding to it up front takes a noticeable
  // beat off the first tap. No-op on other platforms, and failure here is irrelevant.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    WebBrowser.warmUpAsync().catch(() => {});
    return () => { WebBrowser.coolDownAsync().catch(() => {}); };
  }, []);

  const start = async (strategy: Strategy, name: string) => {
    if (busy) return;
    setBusy(strategy);
    setError(null);
    try {
      const { createdSessionId, setActive, signUp, authSessionResult } = await startSSOFlow({
        strategy,
        redirectUrl: Linking.createURL('/sso-callback'),
      });

      let sessionId = createdSessionId;

      // No session yet, but a sign-up exists: Clerk transferred the OAuth identity into a
      // new account and is holding it for a required field. On this instance that field is
      // `username` (see clerkSignUp.ts), which we can supply without asking.
      if (!sessionId && signUp && signUp.status === 'missing_requirements') {
        const filled = await fillMissingUsername(signUp);
        sessionId = filled.createdSessionId;
      }

      if (!sessionId || !setActive) {
        // Backing out of the provider screen is a decision, not a failure — say nothing.
        const type = authSessionResult?.type;
        if (type === 'cancel' || type === 'dismiss' || type === 'locked') return;
        setError(`Couldn't finish signing in with ${name}. Please try again.`);
        return;
      }

      const isNewUser = Boolean(signUp?.createdSessionId);
      completingRef.current = true;
      await setActive({ session: sessionId });
      onSignedIn({ isNewUser });
    } catch (e: unknown) {
      completingRef.current = false;
      if (alive.current) setError(clerkError(e));
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {PROVIDERS.map(({ strategy, name, Logo }) => (
        <Button
          key={strategy}
          variant="ghost"
          label={busy === strategy ? `Opening ${name}…` : `Continue with ${name}`}
          left={<Logo />}
          disabled={busy !== null}
          onPress={() => { void start(strategy, name); }}
        />
      ))}
      {error ? <Txt style={styles.error}>{error}</Txt> : null}
    </View>
  );
}

/* Both marks are drawn rather than bundled as images: they're a handful of paths each, they
   stay crisp at any density, and they keep the providers' own colours, which both companies'
   branding terms require on a sign-in button. */

function GoogleLogo() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </Svg>
  );
}

function MicrosoftLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 23 23">
      <Rect x={1} y={1} width={10} height={10} fill="#F25022" />
      <Rect x={12} y={1} width={10} height={10} fill="#7FBA00" />
      <Rect x={1} y={12} width={10} height={10} fill="#00A4EF" />
      <Rect x={12} y={12} width={10} height={10} fill="#FFB900" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: font.bold, fontSize: 13, color: colors.danger, textAlign: 'center' },
});
