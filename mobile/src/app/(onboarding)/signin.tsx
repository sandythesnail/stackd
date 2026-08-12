import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useSignIn } from '@clerk/clerk-expo';
import { Screen, Spacer, Txt, Button, Field, Hammy, Divider } from '@/components';
import { colors, font } from '@/theme';
import { authEnabled } from '@/lib/env';
import { WebAuthRedirect } from '@/lib/webAuth';

/** Screen 4 — Sign in. On the web build we reuse the site's real Clerk sign-in (Google +
 * all methods) via WebAuthRedirect. On native it's the in-app Clerk email/password form
 * (or the local stub when auth isn't configured). */
export default function SignIn() {
  if (Platform.OS === 'web' && authEnabled) return <WebAuthRedirect page="login" />;
  return authEnabled ? <ClerkSignIn /> : <StubSignIn />;
}

function ClerkSignIn() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // True from just before setActive until this screen has navigated itself — see the guard.
  const completing = useRef(false);

  // Bounces a signed-in user off a live, resubmittable sign-in form if they reach it by
  // back-navigation. Skipped while this screen is completing its own sign-in: setActive()
  // is what flips isSignedIn, so without the flag this fired at the same moment onSignIn
  // was already navigating and BOTH ran — two pushes of (tabs)/home, i.e. a duplicate tab
  // stack per sign-in, which is the same problem results.tsx's continuePress documents.
  //
  // replace, not push: a sign-in form is not somewhere to come back to.
  useEffect(() => {
    if (isSignedIn && !completing.current) router.replace('/(tabs)/home');
  }, [isSignedIn, router]);

  const onSignIn = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.status === 'complete') {
        // Claim the navigation before setActive flips isSignedIn — see the guard above.
        completing.current = true;
        await setActive({ session: res.createdSessionId });
        router.replace('/(tabs)/home');
      } else {
        setError('Additional verification needed. Try again or reset your password.');
      }
    } catch (e: unknown) {
      // Nothing navigated — re-arm the guard.
      completing.current = false;
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={{ alignItems: 'center', gap: 16, marginTop: 14 }}>
        <Hammy size={104} />
        <Txt variant="disp" style={{ textAlign: 'center' }}>Welcome back!</Txt>
      </View>

      <View style={{ gap: 12, marginTop: 22 }}>
        <Field
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@uconn.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="password"
          right={<Txt style={styles.link} onPress={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</Txt>}
        />
      </View>

      {error ? <Txt style={styles.error}>{error}</Txt> : null}

      <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={onSignIn} style={{ marginTop: 16 }} />

      <Spacer />
      <View style={styles.footer}>
        <Txt style={styles.footTxt}>New to Stacked? </Txt>
        <Txt style={styles.link} onPress={() => router.push('/(onboarding)/signup')}>Create account</Txt>
      </View>
    </Screen>
  );
}

function StubSignIn() {
  const router = useRouter();
  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={{ alignItems: 'center', gap: 16, marginTop: 14 }}>
        <Hammy size={104} />
        <Txt variant="disp" style={{ textAlign: 'center' }}>Welcome back!</Txt>
      </View>

      {/* The Microsoft-branded "Continue with UConn NetID" button that used to sit here is
          gone. It carried the Microsoft logo and its entire handler was
          `router.push('/(tabs)/home')` — it authenticated nobody and just walked you into
          the app. That is survivable in a local dev stub and is not survivable in
          production, and this screen reaches production whenever the deployed build is
          missing any of the three EXPO_PUBLIC_* keys (see authEnabled in lib/env.ts), since
          the fallback is silent. Anyone who pressed it had every reason to report that
          Microsoft sign-in was broken: it never signed anyone in.

          Real SSO is not something this screen can offer. On web the app hands off to the
          site's Clerk widget (WebAuthRedirect), and on native no social provider is wired up
          at all. So the stub offers only what it can actually honour. */}
      <Txt style={styles.stubNote}>
        Running without a sign-in server, so this is a local demo account.
      </Txt>

      <View style={{ marginVertical: 6 }}>
        <Divider>demo sign-in</Divider>
      </View>

      <View style={{ gap: 12 }}>
        <Field label="EMAIL" value="maya.rodriguez@uconn.edu" />
        <Field label="PASSWORD" value="••••••••••" right={<Txt style={styles.link}>Show</Txt>} />
      </View>

      <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
        <Txt style={styles.link}>Forgot password?</Txt>
      </View>

      <Button label="Sign in" onPress={() => router.push('/(tabs)/home')} style={{ marginTop: 10 }} />

      <Spacer />
      <View style={styles.footer}>
        <Txt style={styles.footTxt}>New to Stacked? </Txt>
        <Txt style={styles.link} onPress={() => router.push('/(onboarding)/signup')}>Create account</Txt>
      </View>
    </Screen>
  );
}

export function clerkError(e: unknown): string {
  const err = e as { errors?: { message?: string; longMessage?: string }[] };
  return err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  link: { fontFamily: font.extra, fontSize: 14, color: colors.green },
  error: { fontFamily: font.bold, fontSize: 13, color: colors.danger, marginTop: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  footTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.muted3 },
  stubNote: {
    fontFamily: font.bold, fontSize: 12.5, color: colors.muted3,
    textAlign: 'center', marginTop: 10,
  },
});
