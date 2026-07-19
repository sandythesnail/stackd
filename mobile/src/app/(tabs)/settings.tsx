import { ReactNode, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { Screen, Header, Txt, Field, Button } from '@/components';
import { colors, font } from '@/theme';
import { user } from '@/data';
import { useStore } from '@/store';
import { authEnabled } from '@/lib/env';

/** Screen 14 — Settings (invite, account, sources).
 *
 * Referral REWARD payout (REFERRAL_ACTIVATION_COINS=15 for the new signup,
 * server-determined diamonds for the referrer) is intentionally not ported here: on the
 * website it's paid out entirely server-side via Supabase RPCs (claim_referral_activation /
 * claim_referrer_rewards) tied to real Clerk accounts, specifically so a client can never
 * credit itself. The mobile app has no auth/backend wired up yet, so faking that payout
 * client-side would mean showing a reward for something that didn't actually happen. What
 * IS real here: the referral code and a working copy-to-clipboard. */
export default function Settings() {
  const router = useRouter();
  const { state, level, tierName, resetProgress, debugSimulateNewDay } = useStore();
  const [copied, setCopied] = useState(false);
  const copyReferral = async () => {
    await Clipboard.setStringAsync(user.referral);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmReset = () => {
    Alert.alert('Reset all progress?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetProgress();
          router.replace('/(onboarding)/welcome');
        },
      },
    ]);
  };
  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Settings</Txt>

        <LinearGradient colors={[colors.pinkBg, colors.pinkBorder]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.invite}>
          <Txt style={styles.inviteH}>Invite a friend, they get 15 🪙</Txt>
          <Txt variant="lead" style={{ fontSize: 13, marginTop: 5, marginBottom: 11 }}>
            You both get rewarded once they finish their first quest — diamonds for you, coins for them.
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
            <View style={styles.codeField}>
              <Txt style={styles.code}>{user.referral}</Txt>
            </View>
            <Button label={copied ? 'Copied!' : 'Copy'} variant="pink" size="sm" onPress={copyReferral} style={{ paddingHorizontal: 18 }} />
          </View>
        </LinearGradient>

        <View style={{ marginTop: 2 }}>
          {authEnabled ? <ClerkAccountRow /> : <Row icon="user" title="Account" sub={user.email} />}
          <Row icon="bell" title="Notifications" />
          <Row icon="rotate-ccw" title="Retake onboarding survey" onPress={() => router.push('/(onboarding)/survey')} />
          <Row icon="trash-2" title="Reset all progress" sub="Hammy goes back to a piglet" danger onPress={confirmReset} />
          {__DEV__ ? (
            <Row
              icon="fast-forward"
              title="Simulate next day (dev)"
              sub={`Streak: ${state.streak}`}
              onPress={debugSimulateNewDay}
            />
          ) : null}
          {authEnabled ? (
            <ClerkSignOutRow />
          ) : (
            <Row icon="log-out" title="Sign out" last onPress={() => router.replace('/(onboarding)/signin')} />
          )}
        </View>

        <Txt style={styles.srcHead}>SOURCES & REFERENCES</Txt>
        <Txt variant="lead" style={{ fontSize: 12.5 }}>CFPB · Investor.gov · UConn Financial Wellness · IRS.gov</Txt>
      </ScrollView>
    </Screen>
  );
}

/** Account row backed by the real signed-in Clerk user (only rendered when auth is on). */
function ClerkAccountRow() {
  const { user: clerkUser } = useUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.username ?? 'Account';
  return <Row icon="user" title="Account" sub={email} />;
}

/** Real Clerk sign-out (only rendered when auth is on). */
function ClerkSignOutRow() {
  const router = useRouter();
  const { signOut } = useClerk();
  const onSignOut = () => {
    Alert.alert('Sign out?', 'Your progress is saved to your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(onboarding)/welcome');
        },
      },
    ]);
  };
  return <Row icon="log-out" title="Sign out" last onPress={onSignOut} />;
}

function Row({
  icon,
  title,
  sub,
  danger,
  last,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  sub?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const tint = danger ? colors.danger : colors.green;
  return (
    <Pressable onPress={onPress} style={[styles.srow, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.srowIc, { backgroundColor: danger ? colors.dangerBg : '#F1F5EE' }]}>
        <Feather name={icon} size={19} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={[styles.srowT, danger && { color: colors.danger }]}>{title}</Txt>
        {sub ? <Txt style={[styles.srowSub, danger && { color: colors.dangerSoft }]}>{sub}</Txt> : null}
      </View>
      {!last && <Feather name="chevron-right" size={18} color={colors.muted5} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 12 },
  invite: { borderRadius: 24, borderWidth: 1.5, borderColor: colors.pinkBorder2, padding: 18 },
  inviteH: { fontFamily: font.displayMed, fontSize: 16, color: colors.pinkDark },
  codeField: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderField,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  code: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  srow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EFEFE7',
  },
  srowIc: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  srowT: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  srowSub: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 1 },
  srcHead: { fontFamily: font.extra, fontSize: 12, color: colors.muted5, letterSpacing: 0.6, marginTop: 4, textTransform: 'uppercase' },
});
