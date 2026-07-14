import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Screen, Header, Txt, Card, Button, ProgressBar, Tag, Stat, Speech, Hammy,
  SectionHead, MIcon, ModuleTile, BadgeMedal, MEDAL_GRAD, Flame, Coin, Diamond,
} from '@/components';
import { colors, font } from '@/theme';
import { user } from '@/data';

const HOME_MODULES = [
  { id: 'earning', abbr: 'Er', color: colors.green, name: 'Earning', pct: 1, tag: '✓ Done', tone: 'green' as const },
  { id: 'spending', abbr: 'Sp', color: colors.pink, name: 'Spending', pct: 0.6, tag: '60%', tone: 'pink' as const },
  { id: 'saving', abbr: 'Sv', color: '#4FA3B8', name: 'Saving', pct: 0.44, tag: '44%', tone: 'pink' as const },
  { id: 'investing', abbr: 'Iv', color: colors.lockIcon, name: 'Investing', pct: 0, tag: '🔒 Lvl 6', tone: 'lock' as const, locked: true },
];

const RECENT_BADGES = [
  { name: 'First Dollar', char: '$', tier: 'gold' },
  { name: '7-Day Streak', char: '🔥', tier: 'orange' },
  { name: 'Budget Boss', char: '✓', tier: 'silver' },
  { name: 'Rainy Day', char: '◆', tier: 'diamond' },
] as const;

/** Screen 7 — Home / Dashboard. */
export default function Home() {
  const router = useRouter();
  return (
    <Screen edges={['top']}>
      <Header level={user.level} name={user.tier} coins={user.coins} diamonds={user.diamonds} onGear={() => router.push('/(tabs)/settings')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Good afternoon, {user.name}</Txt>

        <Pressable style={styles.statRow} onPress={() => router.push('/(tabs)/progress')}>
          <Stat value={user.xp.toLocaleString()} label="XP" />
          <Stat value={<Row><Flame size={13} /><Num>{user.streak}</Num></Row>} label="Streak" />
          <Stat value={<Row><Coin /><Num>{user.coins}</Num></Row>} label="Coins" />
          <Stat value={<Row><Diamond /><Num>{user.diamonds}</Num></Row>} label="Diamonds" />
        </Pressable>

        {/* Continue quest */}
        <Card style={styles.questCard}>
          <View style={styles.questTop}>
            <Pressable onPress={() => router.push('/modal/life-event')}>
              <Hammy size={76} bob style={styles.questHammy} />
            </Pressable>
            <Speech>Ready for today&apos;s quest? You&apos;re just 2 lessons from Level 5!</Speech>
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={styles.questMeta}>
              <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: colors.ink }}>Saving · Emergency Fund</Txt>
              <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.pinkDark }}>Quest 3 / 6</Txt>
            </View>
            <ProgressBar value={0.44} tone="pink" />
          </View>
          <Button label="Continue quest" variant="pink" size="sm" onPress={() => router.push('/learn/hook')} style={{ marginTop: 13 }} />
        </Card>

        <SectionHead title="Keep learning" action="See all →" onAction={() => router.push('/(tabs)/modules')} />
        <View style={styles.grid}>
          {HOME_MODULES.map((m) => (
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

        <SectionHead title="Recent badges" action="All 9 →" onAction={() => router.push('/(tabs)/badges')} style={{ marginTop: 2 }} />
        <View style={styles.badgeRow}>
          {RECENT_BADGES.map((b) => (
            <View key={b.name} style={styles.badgeCell}>
              <BadgeMedal char={b.char} grad={MEDAL_GRAD[b.tier]} size={54} fontSize={20} />
              <Txt style={styles.badgeLbl}>{b.name}</Txt>
            </View>
          ))}
        </View>
      </ScrollView>
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
  questHammy: { shadowColor: colors.white, shadowOpacity: 0.6, shadowRadius: 6, elevation: 3 },
  questMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47.5%', flexGrow: 1 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniTag: { paddingVertical: 3, paddingHorizontal: 9 },
  tileName: { fontFamily: font.extra, fontSize: 13.5, color: colors.ink },
  badgeRow: { flexDirection: 'row', gap: 12, paddingBottom: 6 },
  badgeCell: { flex: 1, alignItems: 'center', gap: 8 },
  badgeLbl: { fontFamily: font.extra, fontSize: 10.5, color: colors.muted1, textAlign: 'center' },
});
