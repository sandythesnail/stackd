import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen, Header, Txt, Card, Button, ProgressBar, Tag, Stat, Speech, Hammy,
  SectionHead, MIcon, ModuleTile, BadgeMedal, MEDAL_GRAD, Flame, Coin, Diamond, CurrencyChip,
} from '@/components';
import { useUser } from '@clerk/clerk-expo';
import { colors, font } from '@/theme';
import { user, modules } from '@/data';
import { useStore } from '@/store';
import { authEnabled } from '@/lib/env';
import { todaysHammyMood, hasModuleActivityToday } from '@/hammyMood';
import { MOOD_FACES } from '@/hammyFaces';

/** Greeting name from the real signed-in Clerk user when auth is on, else the local mock. */
function Greeting() {
  return <Txt variant="disp" style={{ fontSize: 23 }}>Good afternoon, {authEnabled ? <ClerkName /> : user.name}</Txt>;
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
    state, level, tierName, moduleDone, moduleTotal, moduleStatus, achievements,
    equippedMascotItems, dailyLoginBanner, dismissDailyLoginBanner,
  } = useStore();

  const homeModules = modules.slice(0, 4).map((m) => {
    const status = moduleStatus(m.id, m.unlockLevel);
    const total = moduleTotal(m.id);
    const done = moduleDone(m.id);
    const pct = total ? done / total : 0;
    const tone = status === 'done' ? ('green' as const) : status === 'locked' ? ('lock' as const) : ('pink' as const);
    const tag = status === 'done' ? '✓ Done' : status === 'locked' ? `🔒 Lvl ${m.unlockLevel}` : `${Math.round(pct * 100)}%`;
    return { ...m, status, total, done, pct, tone, tag, locked: status === 'locked' };
  });

  const earnedBadges = achievements().filter((b) => b.earned).slice(0, 4);

  const nextModule = modules.find((m) => moduleStatus(m.id, m.unlockLevel) === 'active');
  const nextDone = nextModule ? moduleDone(nextModule.id) : 0;
  const nextTotal = nextModule ? moduleTotal(nextModule.id) : 0;
  const nextPct = nextTotal ? nextDone / nextTotal : 0;

  // One mood per calendar day (todaysHammyMood), unless a lesson's already been finished
  // today — then Hammy's just happy (satisfied) about that instead.
  const activeToday = hasModuleActivityToday(state.lastModuleActivityDate);
  const mood = todaysHammyMood();
  const speechMsg = activeToday
    ? "Hammy's had a great day — you already finished a module! Come back tomorrow for more."
    : mood.msg;
  const moodFace = activeToday ? MOOD_FACES.satisfied : MOOD_FACES[mood.id];

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} onGear={() => router.push('/(tabs)/settings')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Greeting />

        <Pressable style={styles.statRow} onPress={() => router.push('/(tabs)/progress')}>
          <Stat value={state.xp.toLocaleString()} label="XP" />
          <Stat value={<Row><Flame size={13} /><Num>{state.streak}</Num></Row>} label="Streak" />
          <Stat value={<Row><Coin /><Num>{state.coins}</Num></Row>} label="Coins" />
          <Stat value={<Row><Diamond /><Num>{state.diamonds}</Num></Row>} label="Diamonds" />
        </Pressable>

        {/* Continue quest */}
        {nextModule ? (
          <Card style={styles.questCard}>
            <View style={styles.questTop}>
              <Pressable onPress={() => router.push('/modal/life-event')}>
                <Hammy size={76} bob equipped={equippedMascotItems()} face={moodFace} />
              </Pressable>
              <Speech>{speechMsg}</Speech>
            </View>
            <View style={{ marginTop: 14 }}>
              <View style={styles.questMeta}>
                <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: colors.ink }}>{nextModule.name}</Txt>
                <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.pinkDark }}>Lesson {nextDone + 1} / {nextTotal}</Txt>
              </View>
              <ProgressBar value={nextPct} tone="pink" />
            </View>
            <Button
              label="Continue quest"
              variant="pink"
              size="sm"
              onPress={() => router.push({ pathname: '/learn/hook', params: { moduleId: nextModule.id, lessonIndex: String(nextDone) } })}
              style={{ marginTop: 13 }}
            />
          </Card>
        ) : null}

        <SectionHead title="Keep learning" action="See all →" onAction={() => router.push('/(tabs)/modules')} />
        <View style={styles.grid}>
          {homeModules.map((m) => (
            <ModuleTile key={m.id} locked={m.locked} onPress={() => router.push(`/learn/module/${m.id}`)} style={styles.gridItem}>
              <View style={styles.tileTop}>
                <MIcon abbr={m.abbr} color={m.color} />
                <Tag tone={m.tone} style={styles.miniTag}>{m.tag}</Tag>
              </View>
              <Txt style={[styles.tileName, m.locked && { color: colors.lockText }]}>{m.name}</Txt>
              <ProgressBar value={m.pct} tone={m.tone === 'pink' ? 'pink' : 'green'} height={7} track={m.locked ? '#E4E0D6' : colors.track} />
            </ModuleTile>
          ))}
        </View>

        <SectionHead title="Recent badges" action={`All ${achievements().length} →`} onAction={() => router.push('/(tabs)/badges')} style={{ marginTop: 2 }} />
        <View style={styles.badgeRow}>
          {earnedBadges.length ? earnedBadges.map((b) => (
            <View key={b.id} style={styles.badgeCell}>
              <BadgeMedal char={b.char} grad={MEDAL_GRAD[b.tier]} size={54} fontSize={20} />
              <Txt style={styles.badgeLbl}>{b.label}</Txt>
            </View>
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
