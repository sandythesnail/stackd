import { ReactNode, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { Screen, Header, Txt, Button, Coin, Diamond, useOnboardingTour } from '@/components';
import { colors, font } from '@/theme';
import { user, modules } from '@/data';
import { useStore } from '@/store';
import { authEnabled } from '@/lib/env';
import { MODULE_SOURCES } from '@/references';

/** Screen 14 — Settings (invite, account, sources).
 *
 * Referral REWARD payout (REFERRAL_ACTIVATION_COINS=15 for the new signup,
 * server-determined diamonds for the referrer) is intentionally not ported here: on the
 * website it's paid out entirely server-side via Supabase RPCs (claim_referral_activation /
 * claim_referrer_rewards) tied to real Clerk accounts, specifically so a client can never
 * credit itself. What IS real here: a working referral LINK (see ReferralCard below) and
 * copy-to-clipboard. */
export default function Settings() {
  const router = useRouter();
  const { state, level, tierName, resetProgress, debugSimulateNewDay } = useStore();
  const { startTour } = useOnboardingTour();

  const replayTour = () => {
    // Doesn't touch hasSeenOnboardingTour — a manual replay shouldn't reset the "seen it"
    // flag, or the tour would just auto-play again on the very next app open too. Switches
    // to Home first since that's where both spotlighted elements actually live/are visible.
    router.push('/(tabs)/home');
    setTimeout(startTour, 300);
  };

  const confirmReset = () => {
    Alert.alert('Reset all progress?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetProgress();
          // push, not replace — this screen lives in the (tabs) nested navigator, and
          // replace() doesn't reliably cross into a different top-level branch like
          // (onboarding) (see results.tsx's continuePress for the full story of the "route
          // doesn't exist"/blank-screen crash this causes).
          router.push('/(onboarding)/welcome');
        },
      },
    ]);
  };
  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Settings</Txt>

        <ReferralCard />

        <View style={{ marginTop: 2 }}>
          {authEnabled ? <ClerkAccountRow /> : <Row icon="user" title="Account" sub={user.email} />}
          <Row icon="rotate-ccw" title="Retake onboarding survey" onPress={() => router.push('/(onboarding)/survey')} />
          <Row icon="compass" title="Replay welcome tour" sub="XP and the Shop, quick refresher" onPress={replayTour} />
          <Row icon="trash-2" title="Reset all progress" sub="Clears all XP, modules, and badges permanently." danger onPress={confirmReset} />
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
            <Row icon="log-out" title="Sign out" last onPress={() => router.push('/(onboarding)/signin')} />
          )}
        </View>

        <SourcesSection />
      </ScrollView>
    </Screen>
  );
}

/** The real, working referral link — ported from the website's referral card
 * (`${origin}/signup.html?ref=${Clerk.user.id}`, see app.js's referral-link-input setup).
 * The mobile equivalent points into the /m/ web app itself (WebAuthRedirect already
 * forwards a `?ref=` param through to signup.html once the recipient reaches sign-up, see
 * @/lib/webAuth), so this link works whether the recipient opens it on their phone browser
 * (routed into /m/) or a desktop (routed to the marketing site). Previously this showed a
 * static, fake code ("stackd.app/r/MAYA-UC" — wrong domain, not tied to any real account),
 * which is why sharing it never actually worked. */
const REFERRAL_ORIGIN = 'https://trystacked.app';
const referralLinkFor = (clerkUserId: string) => `${REFERRAL_ORIGIN}/m/?ref=${clerkUserId}`;

function ReferralCard() {
  return authEnabled ? <ClerkReferralCard /> : <ReferralCardBody link={null} />;
}

/** Only rendered when auth is on — reads the real signed-in Clerk user id. */
function ClerkReferralCard() {
  const { user: clerkUser } = useUser();
  return <ReferralCardBody link={clerkUser ? referralLinkFor(clerkUser.id) : null} />;
}

function ReferralCardBody({ link }: { link: string | null }) {
  const [copied, setCopied] = useState(false);
  const copyReferral = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <LinearGradient colors={[colors.pinkBg, colors.pinkBorder]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.invite}>
      <Txt style={styles.inviteH}>Invite a friend</Txt>
      <View style={styles.inviteCopyRow}>
        <Txt variant="lead" style={styles.inviteCopyTxt}>Earn 25</Txt>
        <Diamond size={14} />
        <Txt variant="lead" style={styles.inviteCopyTxt}>
          when a friend joins with your link and finishes their first lesson. They get 15
        </Txt>
        <Coin size={14} />
        <Txt variant="lead" style={styles.inviteCopyTxt}>too.</Txt>
      </View>
      {link ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch', marginTop: 11 }}>
          <View style={styles.codeField}>
            <Txt style={styles.code} numberOfLines={1} ellipsizeMode="middle">{link}</Txt>
          </View>
          <Button label={copied ? 'Copied!' : 'Copy'} variant="pink" size="sm" onPress={copyReferral} style={{ paddingHorizontal: 18 }} />
        </View>
      ) : (
        <Txt variant="lead" style={{ fontSize: 12.5, marginTop: 11 }}>Sign in to get your link.</Txt>
      )}
    </LinearGradient>
  );
}

/** Real per-module citations, transcribed from the website's own Settings page
 * (app.html's `.sources-module` accordions) — see @/references. Previously this was one
 * generic hardcoded line ("CFPB · Investor.gov · UConn Financial Wellness · IRS.gov") that
 * didn't actually correspond to what any given module cites. */
function SourcesSection() {
  return (
    <View style={{ gap: 3, marginTop: 6 }}>
      <Txt style={styles.srcHead}>SOURCES & REFERENCES</Txt>
      <Txt variant="lead" style={{ fontSize: 12, marginBottom: 4 }}>
        Specific facts, rates, and figures used across the modules, and where they come from.
      </Txt>
      {modules.map((m) => <SourceModuleAccordion key={m.id} moduleId={m.id} title={m.name} />)}
    </View>
  );
}

function SourceModuleAccordion({ moduleId, title }: { moduleId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const refs = MODULE_SOURCES[moduleId] ?? [];
  if (!refs.length) return null;
  return (
    <View style={styles.srcModule}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.srcModuleHead}>
        <Txt style={styles.srcModuleTitle}>{title}</Txt>
        <Txt style={styles.srcChevron}>{open ? '−' : '+'}</Txt>
      </Pressable>
      {open ? (
        <View style={{ gap: 9, marginTop: 8, marginBottom: 2 }}>
          {refs.map((r, i) => (
            <Pressable key={i} onPress={() => Linking.openURL(r.url)} style={{ flexDirection: 'row', gap: 6 }}>
              <Txt style={styles.srcNum}>{i + 1}.</Txt>
              <Txt style={styles.srcTxt}>
                {r.text} <Txt style={styles.srcLink}>{r.domain}</Txt>
              </Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
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
          // push, not replace — this screen lives in the (tabs) nested navigator, and
          // replace() doesn't reliably cross into a different top-level branch like
          // (onboarding) (see results.tsx's continuePress for the full story of the "route
          // doesn't exist"/blank-screen crash this causes).
          router.push('/(onboarding)/welcome');
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
  inviteCopyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 5 },
  inviteCopyTxt: { fontSize: 13 },
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
  srcModule: { borderTopWidth: 1.5, borderTopColor: '#EFEFE7', paddingVertical: 11 },
  srcModuleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  srcModuleTitle: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  srcChevron: { fontFamily: font.bold, fontSize: 15, color: colors.muted4 },
  srcNum: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 1 },
  srcTxt: { flex: 1, fontFamily: font.reg, fontSize: 12, lineHeight: 17, color: colors.muted1 },
  srcLink: { fontFamily: font.bold, color: colors.green, textDecorationLine: 'underline' },
});
