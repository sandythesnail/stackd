import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Linking, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useUser, useClerk, useAuth } from '@clerk/clerk-expo';
import { Screen, Header, Txt, Button, Card } from '@/components';
import { colors, font, selectableInput } from '@/theme';
import { user, modules } from '@/data';
import { useStore } from '@/store';
import { SURVEY_TRACKS } from '@/survey';
import { authEnabled } from '@/lib/env';
import { makeSupabase } from '@/lib/supabase';
import { MODULE_SOURCES } from '@/references';

/** Screen 14 — Settings (account, feedback, sources). */
export default function Settings() {
  const router = useRouter();
  const { state, level, tierName, resetProgress, debugSimulateNewDay, setOnboardingTrack } = useStore();

  const [askingReset, setAskingReset] = useState(false);
  const [pickingTrack, setPickingTrack] = useState(false);

  const doReset = () => {
    setAskingReset(false);
    resetProgress();
    // Back to the very top of the app, not to Home and not to the survey directly. The splash
    // is the thing that decides where onboarding starts, and resetProgress() has just cleared
    // hasCompletedOnboarding — so it routes a signed-in, un-onboarded account into the survey
    // itself, and the survey hands off to the piggy-bank intro. Wiping your progress plays the
    // whole thing again, animation included, which is what "reset everything" should mean.
    router.replace('/');
  };
  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Settings</Txt>

        <View style={{ marginTop: 2 }}>
          {authEnabled ? <ClerkAccountRow /> : <Row icon="user" title="Account" sub={user.email} />}
          {/* Replaces "Retake onboarding survey". Sitting through eleven familiarity questions
              plus the piggy-bank intro was a long way round to change one setting, and the
              track is the only thing the survey actually produces that you might want to
              change later. This offers that thing directly. The survey itself still runs in
              full from the one place it belongs to — a reset, which is the case where nothing
              is known about you any more. */}
          <Row
            icon="compass"
            title="Change starting track"
            sub={SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId)?.title ?? 'Not set'}
            onPress={() => setPickingTrack(true)}
          />
          {/* The "Replay welcome tour" row is gone. The tour is still replayable from the
              help icon in Home's header (Header's onReplayTour), which is where it belongs —
              on the screen the tour actually walks through. */}
          <Row icon="trash-2" title="Reset all progress" sub="Erases everything. Can't be undone." danger onPress={() => setAskingReset(true)} />
          {/* Debug helpers live behind __DEV__ and MUST stay there.
           *
           * Two grant-style cheats ("Own everything", "Add 1,000 coins") used to sit here
           * ungated, on the reasoning that __DEV__ "wasn't reliably true in local web
           * testing". It is: __DEV__ is compiled out by `expo export`, and the row below is
           * genuinely absent from the exported bundle — what that note was really describing
           * is that the gate hides these under `expo start --web` too, which is a dev server
           * and not the build students get. The cost of the workaround was that every student
           * on /m/ could grant themselves the entire shop catalog and unlimited coins, which
           * is the whole economy: lesson rewards, streak diamonds, mystery boxes, the shop.
           * They're gone rather than gated — nothing outside a debug session wants them, and
           * store.devOwnEverything/devAddCoins went with them. */}
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
            <StubSignOutRow onSignOut={() => router.push('/(onboarding)/signin')} />
          )}
        </View>

        <FeedbackCard />

        <SourcesSection />
      </ScrollView>

      {/* Outside the ScrollView: a Modal is a portal either way, but there's no reason for a
          dialog to sit in scrolling content. */}
      <ConfirmDialog
        visible={askingReset}
        title="Reset all progress?"
        body="This wipes your XP, modules, badges, coins, diamonds, shop items, room decor, and budget plan. This cannot be undone."
        cancelLabel="Keep my progress"
        confirmLabel="Reset everything"
        confirmVariant="pink"
        onCancel={() => setAskingReset(false)}
        onConfirm={doReset}
      />

      <TrackPicker
        visible={pickingTrack}
        current={state.onboardingTrackId ?? null}
        onClose={() => setPickingTrack(false)}
        onPick={(id) => { setOnboardingTrack(id); setPickingTrack(false); }}
      />
    </Screen>
  );
}

/** Pick a different starting track, without re-answering the survey that produced the first
 * one.
 *
 * The track is an ORDERING, not a gate — it decides which modules Home recommends first (see
 * LessonPath's orderedModules) and nothing is ever locked behind it. So changing it is safe at
 * any point, costs no progress, and is the one onboarding answer worth revisiting; which is
 * why it gets a row of its own instead of a survey replay.
 *
 * Each track states the modules it leads with, because "Debt Freedom" is a name, not an
 * answer to "what will I be doing first". */
function TrackPicker({
  visible, current, onClose, onPick,
}: {
  visible: boolean;
  current: string | null;
  onClose: () => void;
  onPick: (trackId: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.trackRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.trackSheet}>
          <Txt variant="h2">Change starting track</Txt>
          <Txt variant="lead" style={{ marginTop: 2, marginBottom: 4 }}>
            This only changes which modules come first. Nothing is locked, and you keep all your progress.
          </Txt>
          {SURVEY_TRACKS.map((t) => {
            const on = t.id === current;
            return (
              <Pressable
                key={t.id}
                onPress={() => onPick(t.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.trackOpt, on && styles.trackOptOn]}
              >
                <View style={{ flex: 1 }}>
                  <Txt style={[styles.trackTitle, on && { color: colors.greenDark }]}>{t.title}</Txt>
                  <Txt style={styles.trackBlurb}>{t.blurb}</Txt>
                  <Txt style={styles.trackMods}>
                    {t.moduleIds
                      .map((id) => modules.find((m) => m.id === id)?.name ?? id)
                      .join(' · ')}
                  </Txt>
                </View>
                {on ? <Feather name="check" size={18} color={colors.greenDark} /> : null}
              </Pressable>
            );
          })}
          <Button label="Done" variant="ghost" onPress={onClose} style={{ marginTop: 4 }} />
        </View>
      </View>
    </Modal>
  );
}

// The "Invite a friend" card that used to live here — the referral link, its copy button and
// the 25-diamond / 15-coin reward chips — has been removed at the product's request. Settings
// no longer offers any way to obtain a referral link.
//
// The INBOUND half of referrals is deliberately left alone (lib/referral.ts, and the `?ref=`
// capture in the root layout). Links already shared still credit correctly if someone opens
// one; there is simply no longer a place in the app to mint a new one. Delete those too if
// referrals are being retired outright rather than reworked.

/** Feedback / bug-report box — writes straight to the shared `feedback` table (see
 * supabase/feedback.sql), same table the website's Settings page writes to. RLS only lets a
 * signed-in user insert rows tagged with their own clerk_user_id, so this is a one-way
 * "send us a note," not something that reads/lists anything back. */
function FeedbackCard() {
  return authEnabled ? <ClerkFeedbackCard /> : <FeedbackCardBody onSubmit={null} />;
}

/** Only rendered when auth is on — same client-creation pattern as SupabaseSync.tsx (a
 * Supabase client whose every request carries the current Clerk token, so RLS can trust
 * auth.jwt()->>'sub' as the real signed-in user). This is its own lightweight client just
 * for this one write, not the shared sync client. */
function ClerkFeedbackCard() {
  const { getToken, userId } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const supabase = useMemo(() => makeSupabase(() => getTokenRef.current()), []);

  const onSubmit = async (category: 'bug' | 'feedback', message: string) => {
    if (!userId) return false;
    const { error } = await supabase.from('feedback').insert({
      clerk_user_id: userId, category, message, app: 'mobile', page: 'settings',
    });
    return !error;
  };

  return <FeedbackCardBody onSubmit={userId ? onSubmit : null} />;
}

function FeedbackCardBody({
  onSubmit,
}: {
  onSubmit: ((category: 'bug' | 'feedback', message: string) => Promise<boolean>) | null;
}) {
  const [category, setCategory] = useState<'bug' | 'feedback'>('feedback');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    if (!onSubmit || !message.trim() || status === 'sending') return;
    setStatus('sending');
    // onSubmit's own supabase.from('feedback').insert(...) resolves to {error} for a
    // Postgrest-level failure, which the `ok` check below already handles — but a
    // network/fetch-level failure (offline, DNS) instead REJECTS the promise. Without this
    // try/catch, that rejection left `status` stuck at 'sending' forever: the Send button
    // stays disabled and stuck on "Sending…" with no way to retry short of leaving and
    // re-entering Settings.
    try {
      const ok = await onSubmit(category, message.trim());
      if (ok) {
        setStatus('sent');
        setMessage('');
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card style={{ gap: 4, marginTop: 6 }}>
      <Txt style={styles.feedbackH}>Feedback & bug reports</Txt>
      <Txt variant="lead" style={{ fontSize: 12.5 }}>
        Run into something broken, or just have a thought?
      </Txt>
      <View style={styles.feedbackChips}>
        {(['feedback', 'bug'] as const).map((c) => {
          const on = c === category;
          return (
            <Pressable key={c} onPress={() => setCategory(c)} style={[styles.fbChip, on && styles.fbChipOn]}>
              <Txt style={[styles.fbChipTxt, on && { color: colors.white }]}>{c === 'bug' ? 'Bug' : 'Feedback'}</Txt>
            </Pressable>
          );
        })}
      </View>
      {onSubmit ? (
        <>
          <TextInput
            style={styles.feedbackInput}
            value={message}
            onChangeText={setMessage}
            placeholder={category === 'bug' ? "What happened, and what did you expect instead?" : "What's on your mind?"}
            placeholderTextColor={colors.muted6}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Button
            label={status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent, thank you!' : 'Send'}
            variant={status === 'sent' ? 'ghost' : 'green'}
            size="sm"
            disabled={!message.trim() || status === 'sending'}
            onPress={send}
            style={{ marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 22 }}
          />
          {status === 'error' ? (
            <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.danger, marginTop: 2 }}>
              Couldn&apos;t send that. Check your connection and try again.
            </Txt>
          ) : null}
        </>
      ) : (
        <Txt variant="lead" style={{ fontSize: 12.5, marginTop: 4 }}>Sign in to send feedback.</Txt>
      )}
    </Card>
  );
}

/** Real per-module citations, transcribed from the website's own Settings page
 * (app.html's `.sources-module` accordions) — see @/references. Previously this was one
 * generic hardcoded line ("CFPB · Investor.gov · UConn Financial Wellness · IRS.gov") that
 * didn't actually correspond to what any given module cites. */
function SourcesSection() {
  // Closed by default, and it's the whole section that opens now rather than eleven separate
  // module accordions. Each one was already collapsed, but eleven collapsed headers plus a
  // caption is still eleven rows of chrome sitting under the feedback box on every visit to
  // Settings, for something almost nobody opens on any given visit. One row until asked.
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 3, marginTop: 6 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.srcSectionHead}>
        <Txt style={styles.srcHead}>SOURCES & REFERENCES</Txt>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted5} />
      </Pressable>
      {open ? (
        <>
          <Txt variant="lead" style={{ fontSize: 12, marginBottom: 4 }}>
            Specific facts, rates, and figures used across the modules, and where they come from.
          </Txt>
          {modules.map((m) => <SourceModuleAccordion key={m.id} moduleId={m.id} title={m.name} />)}
        </>
      ) : null}
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

/**
 * "Are you sure?", drawn in the app rather than handed to the platform.
 *
 * Both of this screen's serious actions used to confirm through confirmDestructive, which
 * shows the browser's own grey confirm box on web (which /m/ IS, for every phone that visits
 * the site) and the OS alert on native. Neither looks like Stacked, and the browser one is
 * easy to dismiss without reading. This is the same local <Modal> pattern the quest player
 * uses for "Leave this lesson?" (LeaveLessonDialog) — note that the warning in lib/confirm.ts
 * is about a GLOBAL dialog host, which is a different thing and was reverted for breaking the
 * web build. Per-screen, this is the approach that works on both platforms.
 *
 * Cancel leads, in both dialogs. Neither of these is what a mis-tap should accomplish, which
 * is the opposite of the quest player's dialog, where leaving is exactly what the X you just
 * pressed meant.
 */
function ConfirmDialog({
  visible, title, body, confirmLabel, cancelLabel, confirmVariant = 'ghost', onCancel, onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** ghost for signing out (recoverable — sign back in), pink for wiping progress, which
   * carries the weight of the thing it does. */
  confirmVariant?: 'ghost' | 'pink';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <View style={styles.dialogCard}>
          <Txt style={styles.dialogTitle}>{title}</Txt>
          <Txt style={styles.dialogBody}>{body}</Txt>
          <Button label={cancelLabel} onPress={onCancel} style={{ marginTop: 18 }} />
          <Button label={confirmLabel} variant={confirmVariant} onPress={onConfirm} style={{ marginTop: 10 }} />
        </View>
      </View>
    </Modal>
  );
}

const SIGN_OUT_BODY =
  'Your progress is saved to your account, so you can pick up where you left off when you '
  + 'sign back in.';

/** The sign-out question, which both the real and the stub row ask. */
function SignOutDialog({
  visible, onCancel, onSignOut,
}: { visible: boolean; onCancel: () => void; onSignOut: () => void }) {
  return (
    <ConfirmDialog
      visible={visible}
      title="Sign out?"
      body={SIGN_OUT_BODY}
      cancelLabel="Stay signed in"
      confirmLabel="Sign out"
      onCancel={onCancel}
      onConfirm={onSignOut}
    />
  );
}

/** The no-Clerk stub's sign-out. It signs nobody out (there's no session), but it leaves the
 * app, so it asks the same question rather than being the one row that acts on a mis-tap. */
function StubSignOutRow({ onSignOut }: { onSignOut: () => void }) {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Row icon="log-out" title="Sign out" last onPress={() => setAsking(true)} />
      <SignOutDialog
        visible={asking}
        onCancel={() => setAsking(false)}
        onSignOut={() => { setAsking(false); onSignOut(); }}
      />
    </>
  );
}

/** Real Clerk sign-out (only rendered when auth is on). */
function ClerkSignOutRow() {
  const { signOut } = useClerk();
  const [asking, setAsking] = useState(false);

  const doSignOut = async () => {
    setAsking(false);
    // No navigation here on purpose. This used to push('/(onboarding)/signin'), which
    // put the sign-in screen ON TOP of a fully mounted, signed-in tab stack — one back
    // gesture (or browser Back) landed you inside the app with no session. The (tabs)
    // layout is now wrapped in RequireAuth, so dropping the session is itself what moves
    // you: the guard sees `isSignedIn` go false and REPLACES this route with sign-in,
    // tearing the signed-in tree down instead of leaving it in history behind us.
    await signOut();
  };

  return (
    <>
      <Row icon="log-out" title="Sign out" last onPress={() => setAsking(true)} />
      <SignOutDialog
        visible={asking}
        onCancel={() => setAsking(false)}
        onSignOut={() => { void doSignOut(); }}
      />
    </>
  );
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
      {/* Keyed off `onPress`, not off `last` as it used to be. A chevron is a promise that
          tapping goes somewhere, and the Account row has nowhere to go — it's a read-only
          display of the signed-in email, so it was pointing at a destination that doesn't
          exist. Rows that really do navigate still get one. */}
      {onPress ? <Feather name="chevron-right" size={18} color={colors.muted5} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Track picker. Centred rather than bottom-sheeted: it is a choice among four peers, and a
  // sheet implies a flow you are part-way through.
  trackRoot: { flex: 1, backgroundColor: 'rgba(20,28,20,0.42)', justifyContent: 'center', padding: 20 },
  trackSheet: { backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 8 },
  trackOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: colors.borderOpt, borderRadius: 16, padding: 12,
  },
  trackOptOn: { borderColor: colors.green, backgroundColor: colors.screen },
  trackTitle: { fontFamily: font.display, fontSize: 16, color: colors.ink },
  trackBlurb: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17, color: colors.muted2, marginTop: 2 },
  // The modules themselves, because a track name doesn't say what you'll actually be doing.
  trackMods: { fontFamily: font.semi, fontSize: 11, color: colors.muted4, marginTop: 5 },
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 12 },
  // Matched to the quest player's leave-lesson dialog, so the app has one confirm look.
  dialogRoot: {
    flex: 1, backgroundColor: 'rgba(22,32,23,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 26,
  },
  dialogCard: {
    width: '100%', maxWidth: 340, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, padding: 22,
  },
  dialogTitle: { fontFamily: font.display, fontSize: 20, lineHeight: 25, color: colors.ink },
  dialogBody: { fontFamily: font.semi, fontSize: 14, lineHeight: 20, color: colors.muted2, marginTop: 8 },
  feedbackH: { fontFamily: font.displayMed, fontSize: 16, color: colors.ink },
  feedbackChips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  fbChip: {
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: 16,
    backgroundColor: colors.screen, borderWidth: 1.5, borderColor: colors.borderOpt,
  },
  fbChipOn: { backgroundColor: colors.green, borderColor: colors.green },
  fbChipTxt: { fontFamily: font.extra, fontSize: 12.5, color: colors.muted3 },
  feedbackInput: {
    marginTop: 10, minHeight: 88, fontFamily: font.semi, fontSize: 14, color: colors.ink,
    backgroundColor: colors.screen, borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderOpt,
    paddingVertical: 12, paddingHorizontal: 14, ...selectableInput,
  },
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
  srcSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  srcHead: { fontFamily: font.extra, fontSize: 12, color: colors.muted5, letterSpacing: 0.6, textTransform: 'uppercase' },
  srcModule: { borderTopWidth: 1.5, borderTopColor: '#EFEFE7', paddingVertical: 11 },
  srcModuleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  srcModuleTitle: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  srcChevron: { fontFamily: font.bold, fontSize: 15, color: colors.muted4 },
  srcNum: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 1 },
  srcTxt: { flex: 1, fontFamily: font.reg, fontSize: 12, lineHeight: 17, color: colors.muted1 },
  srcLink: { fontFamily: font.bold, color: colors.green, textDecorationLine: 'underline' },
});
