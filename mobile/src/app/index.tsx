import { useEffect, useRef } from 'react';
import { View, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Hammy } from '@/components';
import { colors, font } from '@/theme';

/** Screen 1 — Splash / launch. Hammy hatches while the app loads. */
export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/(onboarding)/welcome'), 1900);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Pressable style={{ flex: 1 }} onPress={() => router.replace('/(onboarding)/welcome')}>
        <SafeAreaView style={styles.wrap}>
          <Hammy size={190} ring />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Txt style={styles.logo}>Stackd</Txt>
            <Txt style={styles.tagline}>Grow your money smarts.</Txt>
          </View>
          <LoadingDots />
        </SafeAreaView>
      </Pressable>
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
