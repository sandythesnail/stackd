import { useEffect, useState } from 'react';
import { View, Platform, StyleSheet, Image } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
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
import { AchievementToast, ConfirmHost, OnboardingTourProvider, Txt, Button } from '@/components';
import { authEnabled, env } from '@/lib/env';
import { tokenCache } from '@/lib/tokenCache';
import { SupabaseSync } from '@/lib/SupabaseSync';
import { MOOD_FACES, REACTION_FACES } from '@/hammyFaces';

// All of Hammy's illustrated face overlays, deduped by image module — a bundled `require()`
// asset still isn't decoded into the image cache until something actually draws it, and
// Hammy's face-overlay swap (see Hammy.tsx) hides the default eyes/cheeks/snout the instant
// `face` is set, with nothing underneath while the overlay decodes for the first time. That
// gap is exactly what read as "Hammy's face goes blank for a second" right when a lesson
// question is answered — the very first time a given reaction face was needed. Warming every
// face here, before Hammy ever needs one, closes it; that warm is the ONLY thing standing
// between a cold first show and a blank beat, since the swap itself is deliberately ungated.
const HAMMY_FACE_MODULES = Array.from(
  new Set([...Object.values(MOOD_FACES), ...Object.values(REACTION_FACES)].map((f) => f.image)),
);

// `require()` of an image resolves to a numeric module id on native, and to a
// `{ uri, width, height }` object on web/Metro. Asset.loadAsync accepts either (see
// Asset.fromModule), hence the cast past its narrower typings — but it only actually
// FETCHES on native: expo-asset's web downloadAsync (ExpoAsset.web.ts) resolves the url
// straight back without touching the network, so on web this warms nothing at all.
// Image.prefetch does issue the request there, and populates react-native-web's own uri
// cache along with the browser's, so warm the web build through that instead.
const HAMMY_FACE_IMAGES = HAMMY_FACE_MODULES as number[];
const HAMMY_FACE_URIS = HAMMY_FACE_MODULES
  .map((m) => (typeof m === 'object' && m !== null && 'uri' in m ? (m as { uri: string }).uri : null))
  .filter((uri): uri is string => !!uri);

function warmHammyFaces(): Promise<unknown> {
  if (Platform.OS === 'web') {
    return Promise.all(HAMMY_FACE_URIS.map((uri) => Image.prefetch(uri)));
  }
  return Asset.loadAsync(HAMMY_FACE_IMAGES);
}

/* Document-level guard against stray text carets on the web build.
 *
 * The React-tree rule below (rootStyles.noSelect) can't be the whole story: react-native's
 * <Modal> renders through a DOM portal attached to document.body, so the Look-back glossary,
 * the hint popup and the achievement detail sheet all mount OUTSIDE this component tree and
 * inherit nothing from it — and so does the ErrorBoundary above, which renders in place of
 * the tree rather than inside it. Anything mounted that way was still selectable, and clicking
 * it parked a blinking caret at the click point.
 *
 * Declaring it on html/body instead covers the document, portals included, since user-select
 * inherits. Guarded on `document` because expo's static web output server-renders this module.
 * Real form fields opt back in here as well as at their own style (theme.ts's selectableInput)
 * — a portal-mounted input would otherwise inherit `none` with no component-level style to
 * save it. */
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('stackd-no-select')) {
  const noSelectStyle = document.createElement('style');
  noSelectStyle.id = 'stackd-no-select';
  noSelectStyle.textContent =
    'html,body,#root{-webkit-user-select:none;user-select:none;}'
    + 'input,textarea,select,[contenteditable="true"]{-webkit-user-select:text;user-select:text;}'
    // Widow control, app-wide. `pretty` is inherited, so declaring it once on the root reaches
    // every piece of text: it costs the last line a little length to avoid leaving one or two
    // words stranded on their own. Headings opt into `balance` on top of that (Txt's `balance`
    // prop, which sets data-balance), which evens ALL the lines rather than only rescuing the
    // last — better for short, often-centred display type like the results screen's lesson
    // title. Both degrade to normal wrapping on browsers that don't implement them.
    + 'html,body,#root{text-wrap:pretty;}'
    + '[data-balance]{text-wrap:balance;}';
  document.head.appendChild(noSelectStyle);
}

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
      // The app is served under a baseUrl ("/m", see app.json's experiments.baseUrl), so a
      // bare "/" is not this app's home — it's the vanilla marketing site at the domain root.
      // "Go home" from a crashed screen therefore dropped the student out of the app
      // entirely: on a phone m-redirect.js bounces them back through a second full page load
      // to /m/, and on a desktop-width window they simply stay on the landing page.
      //
      // EXPO_BASE_URL is inlined by the web export (it's what expo-router's own stripBaseUrl
      // reads), so this is "/m" + "/" in production and "" + "/" under `expo start --web`,
      // where the baseUrl isn't applied — correct in both without hardcoding it here.
      window.location.href = `${process.env.EXPO_BASE_URL ?? ''}/`;
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

/* Txt already sets userSelect:'none' per text node, but that can't reach what sits AROUND the
 * text — the Views a screen is built from, and Hammy, who is an <svg> on web. Clicking either
 * still started a native selection and parked a blinking text caret at the click point (the
 * "vertical line, as if you were typing" seen mid-question and over Hammy). user-select
 * inherits, so declaring it once on the root covers every descendant regardless of type;
 * Txt's own copy stays as the explicit per-text guarantee. Real TextInputs opt back in at
 * their own style (Field, explainback, the tools calculators, settings) — without that,
 * inheriting `none` would make the field's own text unselectable while typing in it. */
const rootStyles = StyleSheet.create({
  noSelect: { userSelect: 'none' } as object,
});

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
  const [fontsLoaded] = useFonts({
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
  const [facesLoaded, setFacesLoaded] = useState(false);
  useEffect(() => {
    // Best-effort: if a face image somehow fails to warm (shouldn't happen, these are all
    // bundled local assets), fall through anyway rather than stranding the app on the
    // splash screen forever.
    warmHammyFaces().catch(() => {}).finally(() => setFacesLoaded(true));
  }, []);

  const loaded = fontsLoaded && facesLoaded;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={[{ flex: 1 }, rootStyles.noSelect]}>
      <SafeAreaProvider>
        <AuthGate>
        <StoreProvider>
          {authEnabled ? <SupabaseSync /> : null}
          <StatusBar style="dark" />
          <OnboardingTourProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.screen },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" />
              {/* Deliberately fade rather than the default slide — this is the transition
                  out of the onboarding flow (Hammy intro → survey → tour) into the real
                  app, which reads better as a soft reveal than a lateral slide. */}
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="learn" />
              {/* These live under /sheet, not /modal: the web build's baseUrl is "/m"
                  (app.json) and Expo Router's stripBaseUrl() removes it as a raw string
                  prefix, so any route starting with "/m" (i.e. "/modal/*") gets its "m"
                  eaten and lands on the unmatched "/m/odal/*" route in production. Keeping
                  the segment off the letter "m" sidesteps the collision entirely. */}
              <Stack.Screen
                name="sheet/levelup"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
              <Stack.Screen
                name="sheet/life-event"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
              <Stack.Screen
                name="sheet/shop-item"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
            </Stack>
            <AchievementToast />
            {/* Hosts confirmDestructive's dialog (see lib/confirm.ts). Mounted once, here, so
                the "leave this lesson?" / "sign out?" / "reset progress?" prompts are the
                app's own card rather than the browser's OS-chrome window.confirm — which is
                what the /m web build every student uses was showing. */}
            <ConfirmHost />
          </OnboardingTourProvider>
        </StoreProvider>
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
