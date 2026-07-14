import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Spacer, Txt, Button, Field, Hammy, Divider } from '@/components';
import { colors, font } from '@/theme';

/** Screen 4 — Sign in (NetID SSO + email). */
export default function SignIn() {
  const router = useRouter();
  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={{ alignItems: 'center', gap: 16, marginTop: 14 }}>
        <Hammy size={104} ring />
        <Txt variant="disp" style={{ textAlign: 'center' }}>Welcome back!</Txt>
      </View>

      <Button
        label="Continue with UConn NetID"
        variant="dark"
        left={<MsLogo />}
        onPress={() => router.replace('/(tabs)/home')}
        style={{ marginTop: 6 }}
      />

      <View style={{ marginVertical: 6 }}>
        <Divider>or use email</Divider>
      </View>

      <View style={{ gap: 12 }}>
        <Field label="EMAIL" value="maya.rodriguez@uconn.edu" />
        <Field
          label="PASSWORD"
          value="••••••••••"
          right={<Txt style={styles.link}>Show</Txt>}
        />
      </View>

      <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
        <Txt style={styles.link}>Forgot password?</Txt>
      </View>

      <Button label="Sign in" onPress={() => router.replace('/(tabs)/home')} style={{ marginTop: 10 }} />

      <Spacer />
      <View style={styles.footer}>
        <Txt style={styles.footTxt}>New to Stackd? </Txt>
        <Txt style={styles.link} onPress={() => router.push('/(onboarding)/signup')}>Create account</Txt>
      </View>
    </Screen>
  );
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  footTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.muted3 },
  ms: { gap: 2 },
  msRow: { flexDirection: 'row', gap: 2 },
  sq: { width: 9, height: 9 },
});
