import { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
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
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        // push, not replace — this screen lives in the (onboarding) nested navigator, and
        // replace() doesn't reliably cross into a different top-level branch like (tabs)
        // (see results.tsx's continuePress for the full story of the "route doesn't
        // exist"/blank-screen crash this causes).
        router.push('/(tabs)/home');
      } else {
        setError('Additional verification needed. Try again or reset your password.');
      }
    } catch (e: unknown) {
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
        <Txt style={styles.footTxt}>New to Stackd? </Txt>
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

      <Button
        label="Continue with UConn NetID"
        variant="dark"
        left={<MsLogo />}
        onPress={() => router.push('/(tabs)/home')}
        style={{ marginTop: 6 }}
      />

      <View style={{ marginVertical: 6 }}>
        <Divider>or use email</Divider>
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
        <Txt style={styles.footTxt}>New to Stackd? </Txt>
        <Txt style={styles.link} onPress={() => router.push('/(onboarding)/signup')}>Create account</Txt>
      </View>
    </Screen>
  );
}

export function clerkError(e: unknown): string {
  const err = e as { errors?: { message?: string; longMessage?: string }[] };
  return err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Something went wrong. Please try again.';
}

function MsLogo() {
  const sq = (bg: string) => <View style={[styles.sq, { backgroundColor: bg }]} />;
  return (
    <View style={styles.ms}>
      <View style={styles.msRow}>{sq('#F35325')}{sq('#81BC06')}</View>
      <View style={styles.msRow}>{sq('#05A6F0')}{sq('#FFBA08')}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: font.extra, fontSize: 14, color: colors.green },
  error: { fontFamily: font.bold, fontSize: 13, color: colors.danger, marginTop: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  footTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.muted3 },
  ms: { gap: 2 },
  msRow: { flexDirection: 'row', gap: 2 },
  sq: { width: 9, height: 9 },
});
