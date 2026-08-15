import { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth, useSignUp } from '@clerk/clerk-expo';
import { Screen, Spacer, Txt, Button, Field, IconButton, CheckBox, Divider } from '@/components';
import { colors, font } from '@/theme';
import { authEnabled } from '@/lib/env';
import { clerkError } from '@/lib/clerkErrors';
import { fillMissingUsername, type ClerkSignUpResource } from '@/lib/clerkSignUp';
import { useOnboardedAlready } from '@/lib/onboarded';
import { WebAuthRedirect } from '@/lib/webAuth';
import { SocialAuth } from '@/lib/socialAuth';

/** Screen 3 — Sign up. On the web build we reuse the site's real Clerk sign-up (Google +
 * all methods) via WebAuthRedirect. On native it's Google/Microsoft SSO plus the in-app
 * Clerk email + password flow, or the local stub when auth isn't configured. */
export default function SignUp() {
  if (Platform.OS === 'web' && authEnabled) return <WebAuthRedirect page="signup" />;
  return authEnabled ? <ClerkSignUp /> : <StubSignUp />;
}

function ClerkSignUp() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Unticked. Agreeing to the Terms and Privacy Policy has to be an act the user performs —
  // a box that arrives already checked is opt-OUT consent, which isn't consent (GDPR Art.
  // 4(11) / Recital 32 call out pre-ticked boxes specifically). onCreate already refuses to
  // proceed without it, so nothing else needs to change.
  const [agreed, setAgreed] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');
  const onboardedAlready = useOnboardedAlready();

  // True from just before setActive until this screen has navigated itself — see the guard.
  const completing = useRef(false);

  // Bounces a signed-in user off a live, resubmittable sign-up form if they land here by
  // back-navigation. It must NOT fire during this screen's own sign-up, and it used to:
  // setActive() is what flips isSignedIn, so completing verification armed this guard at the
  // exact moment onVerify was navigating to the survey. Whichever won the race decided where
  // a brand-new account ended up, and when this one won, the student was dropped on Home
  // having never seen the survey — no track recorded, so no recommendation anywhere in the
  // app afterwards. `completing` makes the two mutually exclusive instead of concurrent.
  //
  // replace, not push: this is a form the user should not be able to come back to.
  useEffect(() => {
    if (isSignedIn && !completing.current) router.replace('/(tabs)/home');
  }, [isSignedIn, router]);

  /** Everything after a successful create/verify/update, driven by what Clerk reports the
   * sign-up still needs rather than by an assumption about the dashboard.
   *
   * This screen used to assume one shape: create, then unconditionally send an email code.
   * The instance now has "verify at sign up" switched OFF (user_settings
   * .attributes.email_address.verify_at_sign_up = false), so `create` returns a COMPLETE
   * sign-up and the old code went on to prepare a verification the sign-up no longer wanted
   * — which failed, so nobody could create an account from the app at all. Asking the
   * resource what it's missing works whether that setting is on or off.
   *
   * Navigation goes to the survey: it leads off onboarding, and the animated hammy-intro
   * plays after "Start learning" on its final (track recommendation) step. */
  const finish = async (res: ClerkSignUpResource) => {
    // Every caller already ran under `isLoaded` — repeated here because that narrowing is
    // what makes `setActive` defined, and it doesn't cross a function boundary.
    if (!isLoaded) return;
    if (res.status === 'complete') {
      // Claim the navigation BEFORE setActive, which is what makes isSignedIn true — see the
      // guard above. Set only once we know we're completing, so a failure doesn't leave the
      // guard disarmed on a screen that isn't going anywhere.
      completing.current = true;
      await setActive({ session: res.createdSessionId });
      // Straight to the survey, unless this device has already been through it — see the
      // SSO handler below for why a new account doesn't always mean a new person.
      router.replace(onboardedAlready ? '/' : '/(onboarding)/survey');
      return;
    }
    if (res.unverifiedFields.includes('email_address')) {
      await res.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingCode(true);
      return;
    }
    setError(
      res.missingFields.length
        ? `Your account still needs: ${res.missingFields.join(', ')}. Finish signing up at trystacked.app.`
        : 'Couldn’t finish creating your account. Please try again.',
    );
  };

  const onCreate = async () => {
    if (!isLoaded || busy) return;
    if (!agreed) { setError('Please accept the Terms to continue.'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await signUp.create({ emailAddress: email.trim(), password });
      // This instance requires a username, which this form doesn't collect — see
      // lib/clerkSignUp.ts. No-op if Clerk isn't asking for one.
      await finish(await fillMissingUsername(res, email.trim()));
    } catch (e: unknown) {
      completing.current = false;
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
      if (res.status !== 'complete' && res.unverifiedFields.includes('email_address')) {
        setError('That code didn’t verify. Check your email and try again.');
        return;
      }
      await finish(await fillMissingUsername(res, email.trim()));
    } catch (e: unknown) {
      // Re-arm: nothing navigated, so a signed-in user landing here still needs bouncing.
      completing.current = false;
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
    <Screen>
      {/* Scrollable for the same reason sign-in is: the two provider buttons and the divider
          push this past the height of a small phone once the keyboard is up. `flexGrow: 1`
          preserves <Spacer/>, so the CTA still sits at the bottom when everything fits. */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
      <View style={{ paddingTop: 2 }}>
        <IconButton name="chevron-left" onPress={() => router.back()} />
      </View>

      <View style={{ gap: 5, marginTop: 8 }}>
        <Txt variant="disp">Create your account</Txt>
        <Txt variant="lead">Free while Stacked is piloting at UConn.</Txt>
      </View>

      {/* One tap, no password to invent, and no email code to wait for — the same two
          providers the website offers. A student's UConn NetID is a Microsoft account.
          The email field below no longer autofocuses: raising the keyboard on arrival
          buried the two fastest ways to sign up under it before they'd been seen. */}
      <View style={{ marginTop: 18 }}>
        <SocialAuth
          completingRef={completing}
          // Same split as sign-in: new accounts owe the survey, returning ones go through the
          // splash so their cloud progress decides (see index.tsx) — and a new account on a
          // device that has already done onboarding is treated as returning, because the
          // person has seen it even though the account hasn't.
          onSignedIn={({ isNewUser }) =>
            router.replace(isNewUser && !onboardedAlready ? '/(onboarding)/survey' : '/')
          }
        />
      </View>

      <View style={{ marginVertical: 12 }}>
        <Divider>or sign up with email</Divider>
      </View>

      <View style={{ gap: 14 }}>
        <Field
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@uconn.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        {/* The same working Show/Hide control sign-in uses. This was a bare Feather "eye"
            with no handler — an icon that reads as "reveal my password" and did nothing,
            on the one field where you most want to check what you typed. */}
        <Field
          label="CREATE PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="password"
          right={<Txt style={styles.fieldLink} onPress={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</Txt>}
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
      </ScrollView>
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
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  terms: { flexDirection: 'row', gap: 11, marginTop: 16, alignItems: 'center' },
  termsTxt: { fontFamily: font.semi, fontSize: 12.5, color: colors.muted2, flexShrink: 1 },
  error: { fontFamily: font.bold, fontSize: 13, color: colors.danger, marginTop: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  footTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.muted3 },
  link: { fontFamily: font.extra, fontSize: 13.5, color: colors.green },
  // Matches sign-in's Show/Hide affordance so the two password fields behave identically.
  fieldLink: { fontFamily: font.extra, fontSize: 14, color: colors.green },
});
