import { View, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Header, Txt, Card, Stat, ProgressBar, MIcon } from '@/components';
import { colors, font } from '@/theme';
import { modules } from '@/data';
import { useStore, xpForLevel } from '@/store';

/** Screen 8 — Progress. Ported from the website's renderProgressPage: 4 stat cards, a
 * "Modules Done" donut with legend, a "Module Scores" accuracy chart, an "XP Earned by
 * Module" column chart, and a Level Progress detail card — covering all 11 modules (the old
 * version only ever rendered 5, and had no per-module XP/score data to chart with; see
 * store.tsx's moduleStats). */
export default function Progress() {
  const {
    state, level, tierName, achievements, moduleDone, moduleTotal, moduleStatus,
    moduleDisplayTotal, moduleDisplayDone,
  } = useStore();

  const totalDone = modules.reduce((sum, m) => sum + moduleDone(m.id), 0);
  const totalQuests = modules.reduce((sum, m) => sum + moduleTotal(m.id), 0);
  const masteredCount = modules.filter((m) => moduleStatus(m.id) === 'done').length;
  const overallPct = totalQuests ? totalDone / totalQuests : 0;
  const unlockedBadges = achievements().filter((a) => a.earned).length;
  const totalBadges = achievements().length;

  const base = xpForLevel(level - 1);
  const ceil = xpForLevel(level);
  const levelPct = ceil === base ? 100 : Math.min(100, ((state.xp - base) / (ceil - base)) * 100);
  const xpToNext = Math.max(0, ceil - state.xp);

  const xpVals = modules.map((m) => state.moduleStats[m.id]?.xp ?? 0);
  const maxXp = Math.max(...xpVals, 1);

  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Your progress</Txt>

        <View style={styles.statGrid}>
          <Stat value={state.xp.toLocaleString()} label="Total XP" style={styles.statCell} />
          <Stat value={level} label="Level" style={styles.statCell} />
          <Stat value={state.streak} label="Day streak" style={styles.statCell} />
          <Stat value={`${unlockedBadges}/${totalBadges}`} label="Badges" style={styles.statCell} />
        </View>

        <Card style={styles.ringCard}>
          <Txt variant="h2" style={{ alignSelf: 'flex-start' }}>Modules Done</Txt>
          <Ring pct={overallPct} done={masteredCount} of={modules.length} />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
              <Txt style={styles.legendTxt}>Completed ({masteredCount})</Txt>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.track2 }]} />
              <Txt style={styles.legendTxt}>Remaining ({modules.length - masteredCount})</Txt>
            </View>
          </View>
        </Card>

        {/* Per-module lesson progress — "X out of 9" over every real lesson (8 main quests
            + the real-life sub-quest, via moduleDisplayDone/Total in store.tsx). This is the
            one place that count lives; the Modules tab keeps its original percent tags. */}
        <Card style={{ gap: 12 }}>
          <Txt variant="h2">Module Progress</Txt>
          <View style={{ gap: 10 }}>
            {modules.map((m) => {
              const done = moduleDisplayDone(m.id);
              const total = moduleDisplayTotal(m.id);
              return (
                <View key={m.id} style={styles.scoreRow}>
                  <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} size={28} r={9} fontSize={11} />
                  <Txt style={styles.scoreLabel} numberOfLines={1}>{m.name}</Txt>
                  <ProgressBar value={total ? done / total : 0} height={7} style={styles.scoreBar} />
                  <Txt style={styles.lessonVal}>{done} out of {total}</Txt>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h2">Module Scores</Txt>
          <View style={{ gap: 10 }}>
            {modules.map((m) => {
              const stats = state.moduleStats[m.id];
              const hasScore = !!stats && stats.total > 0;
              const pct = hasScore ? stats.correct / stats.total : 0;
              return (
                <View key={m.id} style={styles.scoreRow}>
                  <MIcon abbr={m.icon} color={m.color} textColor={m.textColor} size={28} r={9} fontSize={11} />
                  <Txt style={styles.scoreLabel} numberOfLines={1}>{m.name}</Txt>
                  <ProgressBar value={pct} height={7} style={styles.scoreBar} />
                  <Txt style={styles.scoreVal}>{hasScore ? `${stats.correct}/${stats.total}` : '—'}</Txt>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <Txt variant="h2">XP Earned by Module</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colScroll}>
            {modules.map((m, i) => {
              const xp = xpVals[i];
              const hPct = Math.max(2, Math.round((xp / maxXp) * 100));
              return (
                <View key={m.id} style={styles.col}>
                  <Txt style={styles.colVal}>{xp > 0 ? xp : ''}</Txt>
                  <View style={styles.colBarWrap}>
                    <View style={[styles.colBar, { height: `${hPct}%`, backgroundColor: m.color }]} />
                  </View>
                  <Txt style={styles.colLabel} numberOfLines={1}>{m.name.split(' ')[0]}</Txt>
                </View>
              );
            })}
          </ScrollView>
        </Card>

        <Card style={styles.levelCard}>
          <Txt variant="h2">Level Progress</Txt>
          <View style={styles.levelRow}>
            <View style={styles.levelBig}>
              <Txt style={styles.levelBigTxt}>Lv {level}</Txt>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={styles.levelXpRow}>
                <Txt style={styles.levelXpTxt}>{state.xp.toLocaleString()} XP earned</Txt>
                <Txt style={styles.levelXpTxt}>{ceil.toLocaleString()} XP needed</Txt>
              </View>
              <ProgressBar value={levelPct / 100} height={10} />
              <Txt style={styles.levelSub}>{xpToNext.toLocaleString()} XP to Level {level + 1} · {tierName}</Txt>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Ring({ pct, done, of }: { pct: number; done: number; of: number }) {
  const size = 140;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.green}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Txt style={styles.ringPct}>{done}</Txt>
        <Txt style={styles.ringLbl}>/{of}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 16 },
  statGrid: { flexDirection: 'row', gap: 8 },
  statCell: { minWidth: 0 },
  ringCard: { backgroundColor: '#EDF4E9', borderColor: '#D9E7D3', alignItems: 'center', gap: 12 },
  ringInner: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ringPct: { fontFamily: font.display, fontSize: 30, color: colors.greenDark },
  ringLbl: { fontFamily: font.bold, fontSize: 15, color: colors.muted4, marginTop: 8 },
  legendRow: { flexDirection: 'row', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendTxt: { fontFamily: font.bold, fontSize: 12, color: colors.muted2 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreLabel: { fontFamily: font.bold, fontSize: 12.5, color: colors.ink, width: 68 },
  scoreBar: { flex: 1 },
  scoreVal: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted4, width: 40, textAlign: 'right' },
  // Wider than scoreVal — "9 out of 9" needs the room that a "23/24" score never does.
  lessonVal: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted4, width: 64, textAlign: 'right' },

  colScroll: { gap: 16, paddingRight: 8, alignItems: 'flex-end' },
  col: { alignItems: 'center', width: 40, gap: 4 },
  colVal: { fontFamily: font.extra, fontSize: 10.5, color: colors.muted3, height: 14 },
  colBarWrap: { width: 20, height: 90, justifyContent: 'flex-end', backgroundColor: colors.screen, borderRadius: 6, overflow: 'hidden' },
  colBar: { width: '100%', borderRadius: 6 },
  colLabel: { fontFamily: font.bold, fontSize: 9.5, color: colors.muted4, maxWidth: 42 },

  levelCard: { gap: 14 },
  levelRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  levelBig: {
    width: 62, height: 62, borderRadius: 20, backgroundColor: colors.tagGreenBg,
    alignItems: 'center', justifyContent: 'center',
  },
  levelBigTxt: { fontFamily: font.display, fontSize: 16, color: colors.greenDark },
  levelXpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  levelXpTxt: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted3 },
  levelSub: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted4 },
});
