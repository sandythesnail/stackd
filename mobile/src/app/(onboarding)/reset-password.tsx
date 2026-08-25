import { useRef, useState } from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { Screen, Spacer, Txt, Button, Field, IconButton } from '@/components';
import { colors, font } from '@/theme';
import { authEnabled } from '@/lib/env';
import { clerkError } from '@/lib/clerkErrors';
import { WebAuthRedirect } from '@/lib/webAuth';

/**
 * Password reset — the way back in for someone who can't sign in.
 *
 * This did not exist. The sign-in screen's only "Forgot password?" lived in StubSignIn (the
 * local-demo fallback shown when Clerk isn't configured) and was inert text, not even a
 * Pressable. The real Clerk form had none at all, while one of its own error strings said
 * "Try again or reset your password" — pointing at a door that wasn't there. Anyone who
 * forgot a password had no route back into their account from inside the app.
 *
 * It also matters for App Review specifically: a reviewer who mistypes the demo credentials,
 * or whose session is invalidated mid-review, is simply locked out of a fully account-gated
 * app (RequireAuth gates every screen), and "can't get in" is a rejection.
 *
 * Clerk models reset as a first factor on a sign-in rather than a separate resource:
 * `create` with strategy `reset_password_email_code` mails the code, then
 * `attemptFirstFactor` with the code AND the new password does the change and returns a
 * complete sign-in. So a successful reset signs you straight in, which is why this ends with
 * setActive rather than sending the user back to type the password it just set.
 */
export default function ResetPassword() {
  // The web build hands its whole auth story to the site's hosted Clerk widget, which has its
  // own reset flow — same reason signin/signup redirect there. Native keeps the in-app form.
  if (Platform.OS === 'web' && authEnabled) return <WebAuthRedirect page="login" />;
  // With no Clerk key there is no ClerkProvider mounted and no password to reset — useSignIn
  // would have nothing to talk to. The stub sign-in is local-only, so send them back to it.
  if (!authEnabled) return <Redirect href="/(onboarding)/signin" />;
  return <ClerkResetPassword />;
}

function ClerkResetPassword() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  // Carried over from the sign-in form so the student doesn't retype an address they just
  // typed. Optional — arriving here cold simply starts with an empty field.
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same guard the sign-in and sign-up screens keep: setActive is what flips isSignedIn, and
  // this screen navigates itself immediately afterwards. Nothing here watches isSignedIn
  // today, but the ref is what those screens' effects read, and a reset ends in exactly the
  // same "signed in, now navigating" state.
  const completing = useRef(false);

  const onSend = async () => {
    if (!isLoaded || busy) return;
    const identifier = email.trim();
    if (!identifier) { setError('Enter the email address on your account.'); return; }
    setBusy(true);
    setError(null);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier });
      setSent(true);
    } catch (e: unknown) {
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    if (!isLoaded || busy) return;
    if (!code.trim()) { setError('Enter the 6-digit code from your email.'); return; }
    if (password.length < 8) { setError('Your new password needs at least 8 characters.'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      });
      if (res.status === 'complete') {
        completing.current = true;
        await setActive({ session: res.createdSessionId });
        // To the splash, not Home — exactly as sign-in does. This account may never have
        // finished the mobile survey (someone who signed up on the website hasn't), and the
        // splash is the screen that waits for the cloud read before deciding where to land.
        router.replace('/');
        return;
      }
      if (res.status === 'needs_second_factor') {
        // The instance has no second factors configured, so reaching this means the dashboard
        // changed under us rather than anything this screen can walk the user through.
        setError('This account needs an extra verification step. Finish resetting at trystacked.app.');
        return;
      }
      setError(`Couldn’t finish the reset (${res.status}). Please try again.`);
    } catch (e: unknown) {
      completing.current = false;
      setError(clerkError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 2 }}>
          {/* Back steps within the flow first: from the code screen it returns to the email
              screen (a mistyped address is the likeliest reason the code never arrived), and
              only from there does it leave for sign-in. */}
          <IconButton
            name="chevron-left"
            onPress={() => { if (sent) { setSent(false); setError(null); } else router.back(); }}
          />
        </View>

        <View style={{ gap: 5, marginTop: 8 }}>
          <Txt variant="disp">{sent ? 'Check your email' : 'Reset your password'}</Txt>
          <Txt variant="lead">
            {sent
              ? `We sent a 6-digit code to ${email.trim()}. Enter it below with the password you'd like instead.`
              : 'We’ll email you a code to set a new one.'}
          </Txt>
        </View>

        {sent ? (
          <View style={{ gap: 12, marginTop: 20 }}>
            <Field
              label="RESET CODE"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoComplete="off"
            />
            <Field
              label="NEW PASSWORD"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="off"
              right={<Txt style={styles.link} onPress={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</Txt>}
            />
          </View>
        ) : (
          <View style={{ marginTop: 20 }}>
            <Field
              label="EMAIL"
              value={email}
              onChangeText={setEmail}
              placeholder="you@uconn.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
        )}

        {error ? <Txt style={styles.error}>{error}</Txt> : null}

        {sent ? (
          // Resending is a real need — codes land in spam, and the first address may have been
          // wrong. It re-runs the same create, so a corrected address works too.
          <Txt style={[styles.link, styles.resend]} onPress={busy ? undefined : onSend}>
            Didn’t get it? Send another code
          </Txt>
        ) : null}

        <Spacer />
        <Button
          label={busy ? (sent ? 'Resetting…' : 'Sending…') : (sent ? 'Set new password' : 'Send reset code')}
          onPress={sent ? onReset : onSend}
          style={{ marginBottom: 10 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  link: { fontFamily: font.extra, fontSize: 14, color: colors.green },
  resend: { marginTop: 16, textAlign: 'center' },
  error: { fontFamily: font.bold, fontSize: 13, color: colors.danger, marginTop: 12 },
});
