import { View, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Header, Txt, Card, Stat, ProgressBar, MIcon } from '@/components';
import { colors, font } from '@/theme';
import { modules } from '@/data';
import { useStore, xpForLevel, xpProgressPct, MAX_LEVEL, TIERS } from '@/store';


/** Screen 8 — Progress. Ported from the website's renderProgressPage: 4 stat cards, a
 * "Modules Done" donut with legend, a Module Progress chart, an "XP Earned by
 * Module" column chart, and a Level Progress detail card — covering all 11 modules (the old
 * version only ever rendered 5, and had no per-module XP/score data to chart with; see
 * store.tsx's moduleStats). */
export default function Progress() {
  const {
    state, level, tierName, achievements, moduleDone, moduleTotal, moduleStatus,
  } = useStore();

  const masteredCount = modules.filter((m) => moduleStatus(m.id) === 'done').length;
  // The ring measures the same thing its own centre number and legend describe: modules
  // FINISHED, out of eleven.
  //
  // It used to be filled from `totalDone / totalQuests` — the fraction of individual lessons
  // done across the whole curriculum — while the number inside it read `masteredCount` and
  // the legend underneath read "Completed (0) / Remaining (11)". So a player part-way through
  // their first module saw a ring with a visible green arc wrapped around a big "0 / 11",
  // captioned "Completed (0)". Three readouts, two different questions. Per-lesson progress
  // hasn't been lost; it's the Module Progress card immediately below, which shows it per
  // module rather than as one blended average.
  const overallPct = modules.length ? masteredCount / modules.length : 0;
  // Reused instead of calling achievements() twice — each call re-runs the full
  // computeMetAchievementIds scan, so this was doubling that work on every render.
  const allAchievements = achievements();
  const unlockedBadges = allAchievements.filter((a) => a.earned).length;
  const totalBadges = allAchievements.length;

  const base = xpForLevel(level - 1);
  const ceil = xpForLevel(level);
  // The store's own function rather than a second copy of the formula — it clamps at BOTH
  // ends (this one only capped the top) and it's what the results screen's level bar uses,
  // so the two can't drift apart.
  const levelPct = xpProgressPct(state.xp, level);
  const xpToNext = Math.max(0, ceil - state.xp);
  // At the top level there is no next threshold: xpForLevel clamps to the last entry, so
  // `ceil` collapses onto `base` (both 2200) while xp keeps climbing past it. Every readout
  // below has to branch on this rather than print `ceil`.
  const atMaxLevel = level >= MAX_LEVEL;


  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Your progress</Txt>

        {/* Total XP used to lead this row. It's gone from the page entirely: the level below
            is what XP is actually for, and the raw running total was a number with nothing to
            compare it against and nothing to do about it. */}
        <View style={styles.statGrid}>
          <Stat value={`${level}/${MAX_LEVEL}`} label="Level" style={styles.statCell} />
          <Stat value={state.streak} label="Day streak" style={styles.statCell} />
          <Stat value={`${unlockedBadges}/${totalBadges}`} label="Badges" style={styles.statCell} />
        </View>

        <Card style={styles.ringCard}>
          <Txt variant="h2" style={{ alignSelf: 'flex-start' }}>Modules Done</Txt>
          <Ring pct={overallPct} done={masteredCount} of={modules.length} />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              {/* Matches the ring it labels — the site's brand green, not the button green. */}
              <View style={[styles.legendDot, { backgroundColor: colors.greenBrand }]} />
              <Txt style={styles.legendTxt}>Completed ({masteredCount})</Txt>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.track2 }]} />
              <Txt style={styles.legendTxt}>Remaining ({modules.length - masteredCount})</Txt>
            </View>
          </View>
        </Card>

        {/* Per-module lesson progress — "X out of 8", the module's counted lessons (see
            moduleTotal/moduleDone in store.tsx). The optional real-life sub-quest is NOT one
            of them and never has been since it stopped being able to hold a module hostage:
            a module reads 8/8 and completes whether or not the guide was done. The Modules
            tab keeps its own percent tags over the same count. */}
        <Card style={{ gap: 12 }}>
          <Txt variant="h2">Module Progress</Txt>
          <View style={{ gap: 10 }}>
            {modules.map((m) => {
              const done = moduleDone(m.id);
              const total = moduleTotal(m.id);
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


        <Card style={styles.levelCard}>
          <Txt variant="h2">Level Progress</Txt>
          <View style={styles.levelRow}>
            <View style={styles.levelBig}>
              {/* "Lv 11" alone read as an arbitrary number that couldn't be checked against
                  anything — and in Fredoka, "Lv 11" is an easy thing to misread. Stacking the
                  word over "11 of 11" says both what it is and where it ends. */}
              <Txt style={styles.levelBigCap}>LEVEL</Txt>
              <Txt style={styles.levelBigTxt}>{level}</Txt>
              <Txt style={styles.levelBigCap}>of {MAX_LEVEL}</Txt>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              {/* These two numbers flank the bar, so they have to be the BAR's endpoints —
                  the bar measures progress within the CURRENT level, so the labels are
                  per-level figures, not cumulative totals. */}
              <View style={styles.levelXpRow}>
                <Txt style={styles.levelXpTxt}>
                  {atMaxLevel
                    ? 'Highest level reached'
                    : `${(state.xp - base).toLocaleString()} / ${(ceil - base).toLocaleString()} XP this level`}
                </Txt>
                <Txt style={styles.levelXpTxt}>{atMaxLevel ? '' : `Level ${level + 1} next`}</Txt>
              </View>
              <ProgressBar value={levelPct / 100} height={10} />
              <Txt style={styles.levelSub}>
                {atMaxLevel
                  ? `Level ${MAX_LEVEL} is the last one. There's nothing above it.`
                  : `${xpToNext.toLocaleString()} more XP to reach Level ${level + 1}`}
              </Txt>
            </View>
          </View>
        </Card>

        {/* The rank ladder, stated outright.
            The header shows a tier name sitting directly under a level number, which reads as
            "my level earned me this rank". It doesn't: rank comes from how many modules are
            finished and has nothing to do with level or XP at all. Nowhere in the app said so,
            and nowhere listed what any tier costs — so a player could see "Money-Aware
            Sophomore" with no idea what it meant or how the next one arrives. */}
        <Card style={{ gap: 10 }}>
          <Txt variant="h2">Ranks</Txt>
          <Txt variant="lead" style={{ fontSize: 12.5, marginTop: -4 }}>
            Your rank comes from how many modules you finish, not from your level.
            You&apos;ve finished {masteredCount} of {modules.length}.
          </Txt>
          {TIERS.map((t) => {
            const current = t.name === tierName;
            const need = t.min === t.max ? `all ${t.max}` : `${t.min}`;
            return (
              <View key={t.name} style={[styles.tierRow, current && styles.tierRowOn]}>
                <Txt style={[styles.tierName, current && styles.tierNameOn]} numberOfLines={1}>{t.name}</Txt>
                <Txt style={[styles.tierNeed, current && styles.tierNeedOn]}>
                  {t.min === 0 ? 'from the start' : `${need} modules`}
                </Txt>
              </View>
            );
          })}
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
          stroke={colors.greenBrand}
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
  levelBigTxt: { fontFamily: font.display, fontSize: 24, lineHeight: 27, color: colors.greenDark },
  levelBigCap: { fontFamily: font.extra, fontSize: 8.5, letterSpacing: 0.5, color: colors.muted3 },
  levelXpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  levelXpTxt: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted3 },
  levelSub: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted4 },

  chartHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  axisLabel: { fontFamily: font.bold, fontSize: 10.5, color: colors.muted5 },

  tierRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingVertical: 8, paddingHorizontal: 11, borderRadius: 12, backgroundColor: colors.screen,
  },
  tierRowOn: { backgroundColor: colors.tagGreenBg, borderWidth: 1.5, borderColor: colors.greenSoft },
  tierName: { fontFamily: font.bold, fontSize: 12.5, color: colors.muted2, flexShrink: 1 },
  tierNameOn: { fontFamily: font.extra, color: colors.greenDark },
  tierNeed: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted5 },
  tierNeedOn: { color: colors.greenDark },
});
