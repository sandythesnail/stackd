import { useState } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSignUp } from '@clerk/clerk-expo';
import { Screen, Spacer, Txt, Button, Field, IconButton, CheckBox } from '@/components';
import { colors, font } from '@/theme';
import { authEnabled } from '@/lib/env';
import { clerkError } from './signin';
import { WebAuthRedirect } from '@/lib/webAuth';

/** Screen 3 — Sign up. On the web build we reuse the site's real Clerk sign-up (Google +
 * all methods) via WebAuthRedirect. On native it's the in-app Clerk flow (email + password
 * with email-code verification), or the local stub when auth isn't configured. */
export default function SignUp() {
  if (Platform.OS === 'web' && authEnabled) return <WebAuthRedirect page="signup" />;
  return authEnabled ? <ClerkSignUp /> : <StubSignUp />;
}

function ClerkSignUp() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');

  const onCreate = async () => {
    if (!isLoaded || busy) return;
    if (!agreed) { setError('Please accept the Terms to continue.'); return; }
    setBusy(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingCode(true);
    } catch (e: unknown) {
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        // straight to the survey — the animated hammy-intro now runs after it
        router.replace('/(onboarding)/survey');
      } else {
        setError('That code didn’t verify. Check your email and try again.');
      }
    } catch (e: unknown) {
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  if (pendingCode) {
    return (
      <Screen style={{ paddingHorizontal: 22 }}>
        <View style={{ paddingTop: 2 }}>
          <IconButton name="chevron-left" onPress={() => setPendingCode(false)} />
        </View>
        <View style={{ gap: 5, marginTop: 8 }}>
          <Txt variant="disp">Check your email</Txt>
          <Txt variant="lead">We sent a 6-digit code to {email}.</Txt>
        </View>
        <View style={{ marginTop: 20 }}>
          <Field
            label="VERIFICATION CODE"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="off"
          />
        </View>
        {error ? <Txt style={styles.error}>{error}</Txt> : null}
        <Spacer />
        <Button label={busy ? 'Verifying…' : 'Verify & continue'} onPress={onVerify} style={{ marginBottom: 10 }} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={{ paddingTop: 2 }}>
        <IconButton name="chevron-left" onPress={() => router.back()} />
      </View>

      <View style={{ gap: 5, marginTop: 8 }}>
        <Txt variant="disp">Create your account</Txt>
        <Txt variant="lead">Free while Stacked is piloting at UConn.</Txt>
      </View>

      <View style={{ gap: 14, marginTop: 20 }}>
        <Field
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@uconn.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          focus
        />
        <Field
          label="CREATE PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          right={<Feather name="eye" size={20} color={colors.muted6} />}
        />
      </View>

      <Pressable style={styles.terms} onPress={() => setAgreed((a) => !a)}>
        <CheckBox on={agreed} />
        <Txt style={styles.termsTxt}>I agree to the Terms of Use and Privacy Policy.</Txt>
      </Pressable>

      {error ? <Txt style={styles.error}>{error}</Txt> : null}

      <Spacer />
      <Button label={busy ? 'Creating…' : 'Continue'} onPress={onCreate} style={{ marginBottom: 10 }} />
      <View style={styles.footer}>
        <Txt style={styles.footTxt}>Already have an account? </Txt>
        <Txt style={styles.link} onPress={() => router.push('/(onboarding)/signin')}>Sign in</Txt>
      </View>
    </Screen>
  );
}

function StubSignUp() {
  const router = useRouter();
  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={{ paddingTop: 2 }}>
        <IconButton name="chevron-left" onPress={() => router.back()} />
      </View>

      <View style={{ gap: 5, marginTop: 8 }}>
        <Txt variant="disp">Create your account</Txt>
        <Txt variant="lead">Free while Stacked is piloting at UConn.</Txt>
      </View>

      <View style={{ gap: 14, marginTop: 20 }}>
        <Field label="FULL NAME" value="Maya Rodriguez" />
        <Field label="UCONN EMAIL" value="maya.rodriguez@uconn.edu" focus />
        <Field
          label="CREATE PASSWORD"
          value="••••••••••"
          right={<Feather name="eye" size={20} color={colors.muted6} />}
        />
      </View>

      <View style={styles.terms}>
        <CheckBox on />
        <Txt style={styles.termsTxt}>I agree to the Terms of Use and Privacy Policy.</Txt>
      </View>

      <Spacer />
      <Button label="Continue" onPress={() => router.push('/(onboarding)/survey')} style={{ marginBottom: 10 }} />
      <View style={styles.footer}>
        <Txt style={styles.footTxt}>Already have an account? </Txt>
        <Txt style={styles.link} onPress={() => router.push('/(onboarding)/signin')}>Sign in</Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  terms: { flexDirection: 'row', gap: 11, marginTop: 16, alignItems: 'center' },
  termsTxt: { fontFamily: font.semi, fontSize: 12.5, color: colors.muted2, flexShrink: 1 },
  error: { fontFamily: font.bold, fontSize: 13, color: colors.danger, marginTop: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  footTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.muted3 },
  link: { fontFamily: font.extra, fontSize: 13.5, color: colors.green },
});
