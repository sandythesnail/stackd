import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Screen, Header, Txt, Card, Button, ProgressBar, Tag, Stat, Speech, Hammy,
  SectionHead, MIcon, ModuleTile, BadgeMedal, AchievementDetailModal, Flame, Coin, Diamond, CurrencyChip,
  TourTarget, useOnboardingTour,
} from '@/components';
import { useUser } from '@clerk/clerk-expo';
import { colors, font } from '@/theme';
import { user, modules, type Module } from '@/data';
import { useStore, type AchievementView } from '@/store';
import { authEnabled } from '@/lib/env';
import { SURVEY_TRACKS } from '@/survey';
import { todaysHammyMood, hasModuleActivityToday } from '@/hammyMood';
import { MOOD_FACES } from '@/hammyFaces';

/** Morning/afternoon/evening by local device time — this used to always say "Good
 * afternoon" regardless of when the user actually opened the app. */
function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Greeting name from the real signed-in Clerk user when auth is on, else the local mock. */
function Greeting() {
  return <Txt variant="disp" style={{ fontSize: 23 }}>{timeOfDayGreeting()}, {authEnabled ? <ClerkName /> : user.name}</Txt>;
}
function ClerkName() {
  const { user: clerkUser } = useUser();
  const name = clerkUser?.firstName
    || clerkUser?.primaryEmailAddress?.emailAddress?.split('@')[0]
    || 'there';
  return <>{name}</>;
}

/** Screen 7 — Home / Dashboard. Real module progress, badges, and next-quest card. */
export default function Home() {
  const router = useRouter();
  const {
    state, level, tierName, moduleDone, moduleTotal, moduleStatus, nextLessonIndex, achievements,
    equippedMascotItems, dailyLoginBanner, dismissDailyLoginBanner,
    loginBonusPending, claimDailyLoginBonus,
  } = useStore();
  const [selectedBadge, setSelectedBadge] = useState<AchievementView | null>(null);
  const { startTour } = useOnboardingTour();

  // First-login spotlight tour (XP, then Shop) — gated on the persisted flag, right after a
  // new user lands here from the onboarding survey. The delay gives the survey->home screen
  // transition a beat to finish before measuring anything on screen.
  //
  // Depends on state.hasSeenOnboardingTour (not []): on mount, the store's AsyncStorage load
  // is still in flight and `state` is momentarily DEFAULT_STATE, where hasSeenOnboardingTour
  // is always false — with an empty dep array this effect fired once, saw that stale false,
  // and scheduled the tour regardless of what the real persisted value turned out to be a
  // moment later, so it replayed on every single reload no matter how many times it had
  // already been seen. Keying off the real field lets the effect re-run (and its cleanup
  // cancel the pending timeout) the instant the load resolves to true.
  useEffect(() => {
    if (state.hasSeenOnboardingTour) return;
    const t = setTimeout(startTour, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasSeenOnboardingTour]);

  const activeTrack = SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId);
  const trackModuleIds = activeTrack?.moduleIds ?? [];

  // Both the tiles below AND nextModule further down used to read straight off `modules`
  // in its fixed catalog order (earning, spending, saving, investing, ...) — regardless of
  // trackModuleIds. That made the survey's whole recommended-track result invisible after
  // onboarding: nextModule always resolved to "earning" (the first not-done entry in that
  // fixed order) no matter which track was picked, and homeModules only ever sliced the
  // first 4 catalog entries, so the "★ Recommended" tag could never even appear for a track
  // that didn't happen to include one of those 4. Reordering the recommended track's
  // modules to the front (falling back to catalog order for the rest, or entirely once
  // there's no track) fixes both at once.
  const orderedModules: Module[] = trackModuleIds.length
    ? [
        ...trackModuleIds.map((id) => modules.find((m) => m.id === id)).filter((m): m is Module => !!m),
        ...modules.filter((m) => !trackModuleIds.includes(m.id)),
      ]
    : modules;

  const homeModules = orderedModules.slice(0, 4).map((m) => {
    const status = moduleStatus(m.id);
    const total = moduleTotal(m.id);
    const done = moduleDone(m.id);
    const pct = total ? done / total : 0;
    const recommended = status === 'active' && trackModuleIds.includes(m.id);
    const tone = status === 'done' ? ('green' as const) : recommended ? ('gold' as const) : ('pink' as const);
    const tag = status === 'done' ? '✓ Done' : recommended ? '★ Recommended' : `${Math.round(pct * 100)}%`;
    return { ...m, status, total, done, pct, tone, tag, recommended };
  });

  const earnedBadges = achievements().filter((b) => b.earned).slice(0, 4);

  const nextModule = orderedModules.find((m) => moduleStatus(m.id) === 'active');
  const nextDone = nextModule ? moduleDone(nextModule.id) : 0;
  const nextTotal = nextModule ? moduleTotal(nextModule.id) : 0;
  const nextPct = nextTotal ? nextDone / nextTotal : 0;
  // First lesson not yet completed — progress is per-lesson now, so this can differ from
  // the done COUNT whenever lessons were finished out of order.
  const nextLesson = nextModule ? Math.max(0, nextLessonIndex(nextModule.id)) : 0;
  // The real-life sub-quest is always a module's LAST lesson (see mainLessonCount in
  // store.tsx) — its own route param quest.tsx needs, same as modules.tsx/module/[id].tsx's
  // "Real-life guide" row already passes.
  const nextIsLifeTask = nextModule ? nextLesson === nextTotal - 1 : false;

  // One mood per calendar day (todaysHammyMood), unless a lesson's already been finished
  // today — then Hammy's just happy (satisfied) about that instead. The copy here is
  // deliberately a forward invitation, not a "you're done" sign-off — the CTA below should
  // read as the obvious next step, not one option among several (no separate "come back
  // later" button; the ambient nudge under the button carries the "see you tomorrow" idea
  // instead of competing with the CTA for attention).
  const activeToday = hasModuleActivityToday(state.lastModuleActivityDate);
  const mood = todaysHammyMood();
  const speechMsg = activeToday
    ? "Hammy's had a great day already, thanks to you! Keep it going?"
    : mood.msg;
  const moodFace = activeToday ? MOOD_FACES.satisfied : MOOD_FACES[mood.id];
  // "Continue quest" used to sit directly above/below "Lesson N / M" on this same card —
  // "quest" is otherwise purely an internal/code term (Results and Modules consistently
  // say "lesson" throughout), so this one spot read as if quest and lesson were two
  // different things.
  const ctaLabel = activeToday ? 'Keep Hammy happy — do another module' : 'Continue lesson';

  return (
    <Screen edges={['top']}>
      <Header
        level={level}
        name={tierName}
        coins={state.coins}
        diamonds={state.diamonds}
        hideCurrency
        onReplayTour={startTour}
        onGear={() => router.push('/(tabs)/settings')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Greeting />

        <View style={styles.statRow}>
          <TourTarget id="tour-xp" style={{ flex: 1 }}>
            <Stat value={state.xp.toLocaleString()} label="XP" />
          </TourTarget>
          {loginBonusPending ? (
            <Pressable style={{ flex: 1 }} onPress={claimDailyLoginBonus}>
              <Stat
                value={<Row><Flame size={13} /><Num>{state.streak}</Num></Row>}
                label="Streak"
                reward
              />
            </Pressable>
          ) : (
            <Stat value={<Row><Flame size={13} /><Num>{state.streak}</Num></Row>} label="Streak" />
          )}
          <Stat value={<Row><Coin /><Num>{state.coins}</Num></Row>} label="Coins" />
          <Stat value={<Row><Diamond /><Num>{state.diamonds}</Num></Row>} label="Diamonds" />
        </View>

        {/* Continue lesson */}
        {nextModule ? (
          <Card style={styles.questCard}>
            <View style={styles.questTop}>
              <Pressable onPress={() => router.push({ pathname: '/sheet/life-event' })}>
                <Hammy size={76} bob equipped={equippedMascotItems()} face={moodFace} />
              </Pressable>
              <Speech>{speechMsg}</Speech>
            </View>
            <View style={{ marginTop: 14 }}>
              <View style={styles.questMeta}>
                <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: colors.ink }}>{nextModule.name}</Txt>
                {/* The real-life sub-quest is never called "Lesson N" anywhere else — the
                    Modules tab and ModuleLessonList both show it as its own unnumbered
                    "🎯 Real-life sub-quest" row below the 8 numbered lessons. This used to
                    say "Lesson 9 / 9" here specifically, the one place a user would see it
                    numbered like a regular lesson. */}
                <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.pinkDark }}>
                  {nextIsLifeTask ? 'Real-life sub-quest' : `Lesson ${nextLesson + 1} / ${nextTotal}`}
                </Txt>
              </View>
              <ProgressBar value={nextPct} tone="pink" />
            </View>
            <Button
              label={ctaLabel}
              variant="pink"
              size="sm"
              onPress={() => router.push({
                pathname: '/learn/quest',
                params: {
                  moduleId: nextModule.id, lessonIndex: String(nextLesson),
                  ...(nextIsLifeTask ? { isLifeTask: '1' } : {}),
                },
              })}
              style={{ marginTop: 13 }}
            />
            {activeToday ? (
              <Txt variant="lead" style={styles.ambientNudge}>
                🔥 {state.streak}-day streak — Hammy will be even happier tomorrow
              </Txt>
            ) : null}
          </Card>
        ) : null}

        <SectionHead title="Keep learning" action="See all →" onAction={() => router.push('/(tabs)/modules')} />
        <View style={styles.grid}>
          {homeModules.map((m, i) => {
            const isFirst = i === 0;
            const tile = (
              <ModuleTile
                key={m.id}
                recommended={m.recommended}
                onPress={() => router.push(`/learn/module/${m.id}`)}
                // The width/flexGrow that size this tile within the row move to the
                // TourTarget wrapper for the first tile — a percentage width on BOTH the
                // wrapper and its child would resolve against each other instead of the
                // row, shrinking the tile instead of just sizing it once.
                style={isFirst ? { flex: 1 } : styles.gridItem}
              >
                <View style={styles.tileTop}>
                  <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} />
                  <Tag tone={m.tone} style={styles.miniTag}>{m.tag}</Tag>
                </View>
                <Txt style={styles.tileName}>{m.name}</Txt>
                <ProgressBar value={m.pct} tone={m.tone === 'pink' ? 'pink' : 'green'} height={7} />
              </ModuleTile>
            );
            // Only the first tile is a tour stop (see OnboardingTour.tsx's "Start a
            // module" step) — same "point at a real, already-on-screen element" approach
            // as the XP/Shop steps.
            return isFirst ? <TourTarget key={m.id} id="tour-module" style={styles.gridItem}>{tile}</TourTarget> : tile;
          })}
        </View>

        <SectionHead title="Recent badges" action={`All ${achievements().length} →`} onAction={() => router.push('/(tabs)/badges')} style={{ marginTop: 2 }} />
        <View style={styles.badgeRow}>
          {earnedBadges.length ? earnedBadges.map((b) => (
            <Pressable key={b.id} style={styles.badgeCell} onPress={() => setSelectedBadge(b)}>
              <BadgeMedal icon={b.icon} color={b.color} tier={b.tier} size={54} />
              <Txt style={styles.badgeLbl}>{b.label}</Txt>
            </Pressable>
          )) : (
            <Txt variant="lead" style={{ fontSize: 13 }}>No badges yet — finish a lesson to earn your first one!</Txt>
          )}
        </View>
      </ScrollView>

      {dailyLoginBanner ? (
        <View style={styles.bannerRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissDailyLoginBanner} />
          <View style={styles.bannerCard}>
            <Txt style={{ fontSize: 32 }}>👋</Txt>
            <Txt variant="disp" style={{ fontSize: 19, marginTop: 6 }}>Welcome back!</Txt>
            <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center', marginTop: 2 }}>
              {dailyLoginBanner.streak}-day streak{dailyLoginBanner.streakDiamonds ? ' — bonus diamonds earned!' : '!'}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <CurrencyChip kind="coin" value={dailyLoginBanner.loginCoins} />
              {dailyLoginBanner.streakDiamonds ? <CurrencyChip kind="diamond" value={dailyLoginBanner.streakDiamonds} /> : null}
            </View>
            <Button label="Nice!" onPress={dismissDailyLoginBanner} style={{ marginTop: 16, width: '100%' }} />
          </View>
        </View>
      ) : null}
      <AchievementDetailModal achievement={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </Screen>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{children}</View>
);
const Num = ({ children }: { children: React.ReactNode }) => (
  <Txt style={{ fontFamily: font.display, fontSize: 19, color: colors.ink }}>{children}</Txt>
);

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 15 },
  statRow: { flexDirection: 'row', gap: 8 },
  questCard: { backgroundColor: colors.pinkBg, borderColor: colors.pinkBorder },
  questTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  ambientNudge: { fontSize: 11.5, textAlign: 'center', marginTop: 9, color: colors.pinkText },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47.5%', flexGrow: 1 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniTag: { paddingVertical: 3, paddingHorizontal: 9 },
  tileName: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },
  badgeRow: { flexDirection: 'row', gap: 12, paddingBottom: 6 },
  badgeCell: { flex: 1, alignItems: 'center', gap: 8 },
  badgeLbl: { fontFamily: font.extra, fontSize: 10.5, color: colors.muted1, textAlign: 'center' },
  bannerRoot: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,32,23,0.5)',
  },
  bannerCard: {
    width: '80%',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
