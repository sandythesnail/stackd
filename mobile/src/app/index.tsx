import { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Hammy } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';
import { authEnabled } from '@/lib/env';

/** Screen 1 — Splash / launch. Hammy hatches while the app loads. When auth is enabled,
 * a signed-in user skips onboarding straight to Home; otherwise the local flow applies. */
export default function Splash() {
  return (
    <SplashView>
      {authEnabled ? <AuthRedirect /> : <TimedRedirect />}
    </SplashView>
  );
}

/** Local (no-auth) behavior: brief splash, then onboarding. */
function TimedRedirect() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(onboarding)/signup'), 1900);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}

/** How long to wait for the cloud read before deciding without it. Only reached when the
 * network is slow or down; the normal path is settled well inside this. */
const SETTLE_TIMEOUT_MS = 5000;

/**
 * Auth-aware routing: once Clerk resolves, go Home if signed in — unless this account has
 * never finished onboarding, in which case it owes the survey (and the hammy-intro that
 * plays off the end of it).
 *
 * That second half is the fix for a real hole. This used to route on `isSignedIn` alone, and
 * on the WEB build every new account arrives here: signing up hands off to the site's Clerk
 * widget (see lib/webAuth.tsx), which sends the finished account back to /m/ — this route.
 * So a student who created their account on a phone was dropped straight onto Home having
 * never seen the survey or the intro animation, with no track recorded, which is what every
 * track-based recommendation in the app keys off. Native was only better by accident: the
 * sign-up screen navigates to the survey itself, but force-quitting mid-survey and relaunching
 * landed on Home just the same.
 *
 * `onboardingTrackId` is the flag, set by the survey's finish() and stashed under the web
 * blob's `_mobile` key, so it survives a round trip through Supabase — which is exactly why
 * this waits for `remoteSettled` before reading it. A returning user's track lives in the
 * cloud, and for the moment before that read lands they look identical to a new account.
 * Deciding early would send an existing student back through onboarding.
 */
function AuthRedirect() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { state, hydrated, remoteSettled } = useStore();
  const [settleTimedOut, setSettleTimedOut] = useState(false);

  // A failed read still settles (see SupabaseSync), so this only covers a read that never
  // answers at all. Falling through to Home rather than the survey is deliberate: showing
  // onboarding to someone who has already done it is the worse of the two mistakes, and the
  // survey stays available from Settings.
  useEffect(() => {
    const t = setTimeout(() => setSettleTimedOut(true), SETTLE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const knowsProgress = hydrated && (remoteSettled || settleTimedOut);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && !knowsProgress) return;
    const target = !isSignedIn
      ? '/(onboarding)/signup'
      : state.onboardingTrackId
        ? '/(tabs)/home'
        : '/(onboarding)/survey';
    const t = setTimeout(() => router.replace(target), isSignedIn ? 300 : 1200);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, knowsProgress, state.onboardingTrackId, router]);
  return null;
}

function SplashView({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.wrap}>
          <Hammy size={190} />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Txt style={styles.logo}>Stacked</Txt>
            <Txt style={styles.tagline}>Grow your money smarts.</Txt>
          </View>
          <LoadingDots />
        </SafeAreaView>
      </View>
      {children}
    </LinearGradient>
  );
}

function LoadingDots() {
  const vals = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(v, { toValue: 1, duration: 440, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 440, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [vals]);
  return (
    <View style={styles.dots}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: v, transform: [{ scale: v }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 },
  logo: { fontFamily: font.displayBold, fontSize: 52, color: colors.cream, letterSpacing: -0.5 },
  tagline: { fontFamily: font.bold, fontSize: 16, color: colors.cream, opacity: 0.9 },
  dots: { flexDirection: 'row', gap: 9, marginTop: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.cream },
});
