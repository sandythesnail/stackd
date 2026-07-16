import { useEffect, useRef } from 'react';
import { View, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Hammy } from '@/components';
import { colors, font } from '@/theme';
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
    const t = setTimeout(() => router.replace('/(onboarding)/welcome'), 1900);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}

/** Auth-aware routing: once Clerk resolves, go Home if signed in, else onboarding. */
function AuthRedirect() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(
      () => router.replace(isSignedIn ? '/(tabs)/home' : '/(onboarding)/welcome'),
      isSignedIn ? 300 : 1200,
    );
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, router]);
  return null;
}

function SplashView({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.wrap}>
          <Hammy size={190} ring />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Txt style={styles.logo}>Stackd</Txt>
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
