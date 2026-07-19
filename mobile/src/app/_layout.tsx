import { useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { ClerkProvider } from '@clerk/clerk-expo';
import { colors, font } from '@/theme';
import { StoreProvider } from '@/store';
import { AchievementToast, Txt, Button } from '@/components';
import { authEnabled, env } from '@/lib/env';
import { tokenCache } from '@/lib/tokenCache';
import { SupabaseSync } from '@/lib/SupabaseSync';

SplashScreen.preventAutoHideAsync();

/** Expo Router convention: exporting a named `ErrorBoundary` from a route/layout file
 * wraps it in a real React error boundary that renders this instead of the default
 * "unmatched route"/blank-crash behavior. Added because a navigation crash has been
 * reported repeatedly without a reproducible cause found in code review — this at minimum
 * turns "stuck on a broken screen" into "one tap back to a working app", and shows the
 * actual error text so it can be reported precisely instead of just "it broke". */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const goHome = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      retry();
    }
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={errStyles.wrap}>
        <Txt style={errStyles.title}>Something went wrong</Txt>
        <Txt style={errStyles.msg}>{error.message}</Txt>
        <View style={{ gap: 10, marginTop: 22, width: '100%' }}>
          <Button label="Try again" onPress={retry} />
          <Button label="Go home" variant="ghost" onPress={goHome} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const errStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.screen, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { fontFamily: font.display, fontSize: 22, color: colors.ink, textAlign: 'center' },
  msg: { fontFamily: font.semi, fontSize: 13.5, color: colors.muted2, textAlign: 'center', marginTop: 10, lineHeight: 19 },
});

/** Provide Clerk only when the public keys are configured; otherwise render children as-is
 * so the app keeps working locally (no sign-in gate, no sync). ClerkProvider sits OUTSIDE
 * StoreProvider so both auth and store contexts are available to <SupabaseSync/>. */
function AuthGate({ children }: { children: React.ReactNode }) {
  if (!authEnabled) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthGate>
        <StoreProvider>
          {authEnabled ? <SupabaseSync /> : null}
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.screen },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="learn" />
            <Stack.Screen
              name="modal/levelup"
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
            <Stack.Screen
              name="modal/life-event"
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
            <Stack.Screen
              name="modal/shop-item"
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
          </Stack>
          <AchievementToast />
        </StoreProvider>
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
