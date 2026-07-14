import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen, Spacer, Txt, Button, Field, IconButton, CheckBox } from '@/components';
import { colors, font } from '@/theme';

/** Screen 3 — Sign up. */
export default function SignUp() {
  const router = useRouter();
  return (
    <Screen style={{ paddingHorizontal: 22 }}>
      <View style={{ paddingTop: 2 }}>
        <IconButton name="chevron-left" onPress={() => router.back()} />
      </View>

      <View style={{ gap: 5, marginTop: 8 }}>
        <Txt variant="disp">Create your account</Txt>
        <Txt variant="lead">Free while Stackd is piloting at UConn.</Txt>
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
      <Button label="Continue" onPress={() => router.push('/(onboarding)/piggy-born')} style={{ marginBottom: 10 }} />
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  footTxt: { fontFamily: font.bold, fontSize: 13.5, color: colors.muted3 },
  link: { fontFamily: font.extra, fontSize: 13.5, color: colors.green },
});
