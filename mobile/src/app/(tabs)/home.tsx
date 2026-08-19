import {
  View, ScrollView, Pressable, StyleSheet, useWindowDimensions,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Screen, Header, Txt, Card, Button, ProgressBar, Stat, Speech, Hammy,
  SectionHead, BadgeMedal, AchievementDetailModal, DailyRewardsModal, Flame, Coin, Diamond,
  TourTarget, useOnboardingTour,
} from '@/components';
import { useUser } from '@clerk/clerk-expo';
import { colors, font } from '@/theme';
import { user, modules, type Module } from '@/data';
import { moduleContentById } from '@/content';
import { useStore, type AchievementView } from '@/store';
import { LessonPath } from '@/lessonPath/LessonPath';
import { authEnabled } from '@/lib/env';
import { useOnboardedAlready } from '@/lib/onboarded';
import { SURVEY_TRACKS } from '@/survey';
import { todaysHammyMood, hasModuleActivityToday } from '@/hammyMood';
import { MOOD_FACES } from '@/hammyFaces';

/** How long to let the tour's scroll-into-view animation run before declaring it landed and
 * telling the tour to place its spotlight. Native's animated scrollTo is ~300ms and web's
 * smooth scroll is in the same range; anything still moving after this is picked up by the
 * per-frame remeasure, which resumes at the same moment. Must stay under the tour's own
 * SETTLE_GRACE_MS (see OnboardingTour.tsx) — that's the "target never appeared" fallback, and
 * this should always get there first. */
const SCROLL_LAND_MS = 420;

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
    equippedMascotItems, loginBonusPending, hydrated,
  } = useStore();
  const [selectedBadge, setSelectedBadge] = useState<AchievementView | null>(null);
  const [dailyRewardsOpen, setDailyRewardsOpen] = useState(false);
  const [pathWidth, setPathWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { startTour, activeTargetId, remeasureActive, activeRect } = useOnboardingTour();
  // Survey + piggy-bank intro both finished. See the tour effect below.
  const onboardedAlready = useOnboardedAlready();
  const { height: winH } = useWindowDimensions();
  // Live scroll offset, so the tour step below can convert the node's window position into an
  // absolute scroll target. A ref, not state — it changes on every scroll frame and nothing
  // renders from it.
  const scrollYRef = useRef(0);

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
  //
  // Gated on onboarding being DONE as well, not just on the tour's own flag. Home is a tab, so
  // it is already mounted behind Settings — the moment "Reset all progress" cleared the state,
  // this effect saw a fresh hasSeenOnboardingTour and started the tour right there, on the
  // screen behind the one being used, before the survey it is supposed to follow had even
  // opened. The tour explains a Home that the survey hasn't finished setting up yet, so it
  // waits for onboarding either way.
  useEffect(() => {
    if (state.hasSeenOnboardingTour || !onboardedAlready) return;
    const t = setTimeout(startTour, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasSeenOnboardingTour, onboardedAlready]);

  // The daily-reward calendar opens itself, once per visit to Home, when today's coins are
  // still uncollected. That's what a daily reward is for — the old behaviour was a yellow
  // outline on the Streak stat tile waiting to be noticed and tapped, and a player who never
  // worked out that the tile was a button never collected anything at all.
  //
  // Held back until the onboarding tour is out of the way. The tour auto-starts 450ms after
  // this screen mounts and owns the screen until it's finished; a modal on top of it would
  // cover the very elements it spends six steps pointing at.
  //
  // The "has the tour been seen" answer is latched on the first HYDRATED render, not read
  // live and not read on mount. Not live, because the flag flips the moment the tour ends —
  // which is the moment the final step has sent the player into a lesson, and popping a
  // reward modal over a quest they just started is worse than waiting for their next visit.
  // Not on mount, because the store is still loading from AsyncStorage then and every flag
  // reads as its DEFAULT_STATE value, so latching there would answer "false" for everyone,
  // forever.
  const tourSeenAtMount = useRef<boolean | null>(null);
  const didAutoOpenRewards = useRef(false);
  useEffect(() => {
    if (!hydrated || didAutoOpenRewards.current) return;
    if (tourSeenAtMount.current === null) tourSeenAtMount.current = state.hasSeenOnboardingTour;
    if (!tourSeenAtMount.current || !loginBonusPending) return;
    didAutoOpenRewards.current = true;
    setDailyRewardsOpen(true);
  }, [hydrated, loginBonusPending, state.hasSeenOnboardingTour]);

  // The tour's lesson-path step spotlights a node that sits well below the fold on this
  // screen — nothing else in the tour needs scrolling, since every other target is either the
  // stat row at the top or a tab-bar icon. Scroll it into view when that step opens.
  //
  // This scrolled to `pathY`, the top of the whole lesson path, which is NOT where the node
  // is. The path is a nine-node winding column, and the step points at the recommended
  // lesson — node 1 for a brand-new account, but anywhere down the column for anyone with
  // progress. So the scroll landed the top of the path at the top of the screen and left the
  // actual node below the fold: highlighted, spotlit, and completely off screen, with the
  // tour's own BlockRects swallowing every tap around it.
  //
  // Scroll by the measured DELTA instead: activeRect is the node's real position in window
  // coordinates, so `scrollY + rect.y - target` puts it exactly where we want it regardless
  // of how far down the path it sits. Aimed a bit above centre, leaving the lower half of the
  // screen for the tour card that has to appear beneath it.
  const tourNeedsPath = activeTargetId === 'tour-lesson-node';
  // One scroll per visit to the step. Without the latch this re-fires on its own result:
  // scrolling moves the node, onTourScroll remeasures, activeRect changes, and the effect
  // runs again — a feedback loop that fights the animation it just started.
  const didScrollToNode = useRef(false);
  // True for the length of the programmatic scroll only. See onScroll.
  const scrollingToNode = useRef(false);
  // Held in a ref rather than returned from the effect below as a cleanup. The effect's deps
  // include activeRect, which changes while the scroll is in flight (the provider measures
  // again at 200ms), so a cleanup-owned timer was cancelled by the very re-run that the latch
  // then made a no-op — the "scroll has landed" callback simply never fired, and the step only
  // appeared when the provider's 600ms grace period gave up on it.
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLandTimer = () => {
    if (landTimer.current) { clearTimeout(landTimer.current); landTimer.current = null; }
  };
  useEffect(() => clearLandTimer, []);
  useEffect(() => {
    if (tourNeedsPath) return;
    didScrollToNode.current = false;
    scrollingToNode.current = false;
    clearLandTimer();
  }, [tourNeedsPath]);
  useEffect(() => {
    if (!tourNeedsPath || didScrollToNode.current) return;
    // Nothing measured yet — the node hasn't mounted or laid out. The provider re-measures on
    // mount (registerTarget) and again at 200ms, so this effect will run again with a rect.
    if (!activeRect) return;
    didScrollToNode.current = true;
    const aimFor = winH * 0.38;
    const delta = activeRect.y - aimFor;
    // Already comfortably placed (a fresh account's node 1 usually is) — don't jolt the page
    // for a few pixels. Still has to report in: the tour is holding its spotlight back until
    // it hears that this screen has finished moving, and "it didn't need to move" is that.
    if (Math.abs(delta) < 24) { remeasureActive(); return; }
    scrollingToNode.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
    // Backstop for the onScroll tracking below: momentum/animated scrolls don't always emit
    // a final event exactly at rest, and if the path was already in view the scroll is a
    // no-op that emits nothing at all. Comfortably inside the provider's own grace period, so
    // this is what reveals the step rather than the timeout that exists for a missing target.
    landTimer.current = setTimeout(() => {
      landTimer.current = null;
      scrollingToNode.current = false;
      remeasureActive();
    }, SCROLL_LAND_MS);
  }, [tourNeedsPath, activeRect, winH, remeasureActive]);

  // Re-measure on every scroll frame while that step is live, so the spotlight hole travels
  // WITH the node when the USER scrolls — otherwise the cutout sits over whatever content
  // happens to slide under it. Attached only during that step, so ordinary scrolling costs
  // nothing.
  //
  // Deliberately NOT during our own scroll-into-view above. A remeasure sets state on the
  // tour provider, whose context value every consumer re-renders from — the whole lesson path
  // and its nine animated nodes included — so doing it sixty times a second was making the
  // animation it was trying to follow stutter. Nothing needs following there anyway: the
  // provider holds the spotlight back for the length of that scroll and lands it once, at the
  // end, from the landTimer above.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    if (tourNeedsPath && !scrollingToNode.current) remeasureActive();
  };

  const activeTrack = SURVEY_TRACKS.find((t) => t.id === state.onboardingTrackId);
  const trackModuleIds = activeTrack?.moduleIds ?? [];

  // nextModule below used to read straight off `modules` in its fixed catalog order
  // (earning, spending, saving, ...) regardless of trackModuleIds, which made the survey's
  // whole recommended-track result invisible after onboarding — it always resolved to
  // "earning", the first not-done entry in that fixed order, no matter which track was
  // picked. Putting the recommended track's modules first (falling back to catalog order
  // for the rest, or entirely once there's no track) fixes it.
  //
  // LessonPath repeats this ordering deliberately, so the continue-lesson card below and the
  // highlighted node on the path can never point at different lessons.
  const orderedModules: Module[] = trackModuleIds.length
    ? [
        ...trackModuleIds.map((id) => modules.find((m) => m.id === id)).filter((m): m is Module => !!m),
        ...modules.filter((m) => !trackModuleIds.includes(m.id)),
      ]
    : modules;

  const earnedBadges = achievements().filter((b) => b.earned).slice(0, 4);

  const nextModule = orderedModules.find((m) => moduleStatus(m.id) === 'active');
  const nextDone = nextModule ? moduleDone(nextModule.id) : 0;
  const nextTotal = nextModule ? moduleTotal(nextModule.id) : 0;
  const nextPct = nextTotal ? nextDone / nextTotal : 0;
  // First lesson not yet completed — progress is per-lesson now, so this can differ from
  // the done COUNT whenever lessons were finished out of order.
  const nextLesson = nextModule ? Math.max(0, nextLessonIndex(nextModule.id)) : 0;
  // Ask the content whether this lesson IS the sub-quest, rather than inferring it from
  // "it's the last one" — that arithmetic only held while the sub-quest was authored last in
  // every module, which nothing enforces, and getting it wrong sends quest.tsx the wrong
  // isLifeTask flag (wrong reward path, wrong resume behaviour) for an ordinary lesson.
  const nextIsLifeTask = !!(nextModule && moduleContentById(nextModule.id)?.lessons[nextLesson]?.isLifeTask);

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
  const ctaLabel = activeToday ? 'Keep Hammy happy, do another module' : 'Continue lesson';

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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Greeting />

        {/* Three tiles, not four. The raw lifetime XP total used to lead this row, and it was
            the one number here nobody could act on: coins and diamonds are spendable, the
            streak is collectable, XP is a score that only matters through the level it feeds
            — and the level is already in the header two lines above, with the full breakdown
            on Progress. */}
        <View style={styles.statRow}>
          {/* Always a button now, not only while something is pending — it opens the reward
              calendar rather than silently banking coins, and "see where I am in the week" is
              worth a tap on a day you've already collected. The yellow `reward` treatment
              still marks the days you haven't. */}
          <TourTarget id="tour-streak" style={{ flex: 1 }}>
            <Pressable onPress={() => setDailyRewardsOpen(true)}>
              <Stat
                value={<Row><Flame size={13} /><Num>{state.streak}</Num></Row>}
                label="Streak"
                reward={loginBonusPending}
              />
            </Pressable>
          </TourTarget>
          <Stat value={<Row><Coin /><Num>{state.coins}</Num></Row>} label="Coins" />
          <Stat value={<Row><Diamond /><Num>{state.diamonds}</Num></Row>} label="Diamonds" />
        </View>

        {/* Continue lesson */}
        {nextModule ? (
          <Card style={styles.questCard}>
            <View style={styles.questTop}>
              {/* Not pressable. Tapping Hammy used to push /sheet/life-event unconditionally,
                  which is only ever a real screen when the store has queued an event — every
                  other time (i.e. almost always) it opened a sheet reading "All quiet for now"
                  with a Close button. A mascot that responds to a tap with an empty modal
                  reads as a bug, and real life events reach the player on their own (after a
                  lesson, or mid-quest) without needing a door on the dashboard. */}
              <Hammy size={76} bob equipped={equippedMascotItems()} face={moodFace} />
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
                🔥 {state.streak}-day streak. Hammy will be even happier tomorrow
              </Txt>
            ) : null}
          </Card>
        ) : null}

        <SectionHead title="Keep learning" action="See all →" onAction={() => router.push('/(tabs)/modules')} />
        {/* The four-tile module grid is now a winding path of the CURRENT module's lessons
            (see @/lessonPath). It reads as a journey rather than a list, and it makes the
            recommendation unmistakable without dimming anything — every node stays at full
            contrast and stays tappable, including ones far ahead, because a dimmed node is
            indistinguishable from a locked one and nothing in this app is locked.
         *
         * The tour's "Start a lesson" stop lives INSIDE this, on the path's recommended node
         * rather than on the whole section — see LessonPath.tsx's MaybeTourTarget. (It used
         * to be wrapped in a TourTarget of its own, id "tour-module", but no step had pointed
         * at that id since the "start a module" step was replaced; it spotlighted nothing.)
         *
         * `width` is measured rather than assumed — the path positions its nodes at absolute
         * offsets computed from the column's centre, so it needs a real number, and the 22px
         * horizontal padding on this scroller means the screen width would be wrong. The
         * section's `y` used to be captured here too, for the tour's scroll-into-view — it
         * isn't any more, because the top of this section is not where the spotlighted node
         * is. See the scroll effect above. */}
        <View onLayout={(e) => setPathWidth(e.nativeEvent.layout.width)}>
          {pathWidth > 0 ? <LessonPath width={pathWidth} /> : null}
        </View>

        <SectionHead title="Recent badges" action={`All ${achievements().length} →`} onAction={() => router.push('/(tabs)/badges')} style={{ marginTop: 2 }} />
        <View style={styles.badgeRow}>
          {earnedBadges.length ? earnedBadges.map((b) => (
            <Pressable key={b.id} style={styles.badgeCell} onPress={() => setSelectedBadge(b)}>
              <BadgeMedal icon={b.icon} color={b.color} tier={b.tier} size={54} />
              <Txt style={styles.badgeLbl}>{b.label}</Txt>
            </Pressable>
          )) : (
            <Txt variant="lead" style={{ fontSize: 13 }}>No badges yet. Finish a lesson to earn your first one!</Txt>
          )}
        </View>
      </ScrollView>

      {/* Mounted only while open, so each visit gets a fresh snapshot of the week and a
          fresh face-down tile to uncover — see DailyRewardsModal's frozen `cycle`. This
          replaces the "Welcome back! N-day streak" card that used to appear AFTER a silent
          claim: same information, arriving before the reward instead of after it, with the
          week it belongs to around it. */}
      {dailyRewardsOpen ? <DailyRewardsModal onClose={() => setDailyRewardsOpen(false)} /> : null}
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
  badgeRow: { flexDirection: 'row', gap: 12, paddingBottom: 6 },
  badgeCell: { flex: 1, alignItems: 'center', gap: 8 },
  badgeLbl: { fontFamily: font.extra, fontSize: 10.5, color: colors.muted1, textAlign: 'center' },
});
