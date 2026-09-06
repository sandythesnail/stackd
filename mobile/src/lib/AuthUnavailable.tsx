/**
 * What the sign-in and sign-up screens show when the app was BUILT without its auth keys.
 *
 * There is already a local stub for that case (StubSignIn/StubSignUp), and it is right for
 * development: no Clerk key on a laptop means "run the app local-only", and a demo form that
 * walks you into the app is what you want. It is completely wrong in a shipped build. The
 * stub's Sign in button authenticates nobody — its handler is a navigation — so a release
 * build missing one environment variable silently becomes an app with no accounts, no sync
 * and no sign-in, and it LOOKS like it works. That failure reaches the user as "Google
 * sign-in doesn't do anything", which sends you looking at Clerk and OAuth for a problem
 * that is neither.
 *
 * So the stub is now development-only, and this is what production shows instead: the truth,
 * plus the variable names to go and set. See missingAuthKeys in lib/env.ts for why a build
 * can be missing them when every local run has them.
 */
import { View, StyleSheet } from 'react-native';
import { Screen, Txt, Hammy } from '@/components';
import { colors, font } from '@/theme';
import { missingAuthKeys } from './env';

export function AuthUnavailable() {
  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={styles.wrap}>
        <Hammy size={120} bob={false} />
        <Txt variant="disp" style={{ textAlign: 'center' }}>Sign-in isn&apos;t available</Txt>
        <Txt style={styles.body}>
          This build of Stacked shipped without its sign-in configuration, so there&apos;s
          nothing here to sign in to. It isn&apos;t your account or your connection — the app
          needs rebuilding.
        </Txt>
        {/* The variable names, verbatim. Whoever sees this screen is either the developer or
            a TestFlight tester reporting to the developer, and "it says it's missing
            EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" is a report that fixes itself. */}
        {missingAuthKeys.length ? (
          <View style={styles.keys}>
            <Txt style={styles.keysLabel}>MISSING</Txt>
            {missingAuthKeys.map((k) => <Txt key={k} style={styles.key}>{k}</Txt>)}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  body: {
    fontFamily: font.semi, fontSize: 14.5, lineHeight: 21, color: colors.muted2,
    textAlign: 'center', maxWidth: 320,
  },
  keys: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 4, marginTop: 6,
  },
  keysLabel: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.6, color: colors.muted4 },
  key: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
});
