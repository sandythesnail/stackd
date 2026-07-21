import { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Card, Hammy, Coin } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore, xpProgressPct } from '@/store';
import { buildQuestReport, takePendingQuestAnalytics } from '@/questReport';
import { REACTION_FACES } from '@/hammyFaces';

/** Screen 19 — Results (rewards & streak). Reflects the lesson just finished — actually
 * records XP/coins/module progress into the store (not just decorative numbers). */
export default function Results() {
  const router = useRouter();
  const {
    moduleId, lessonIndex, correctCount, total, xpEarned, questId, hintsUsed, bossWon, isLifeTask,
  } = useLocalSearchParams<{
    moduleId: string; lessonIndex: string; correctCount: string; total: string; xpEarned?: string;
    questId?: string; hintsUsed?: string; bossWon?: string; isLifeTask?: string;
  }>();
  const mod = moduleById(moduleId ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const li = Number(lessonIndex ?? 0);
  const lesson = content?.lessons[li];
  const correct = Number(correctCount ?? 0);
  const totalQ = Number(total ?? 0);
  const allCorrect = totalQ > 0 && correct === totalQ;
  // The quest player (learn/quest.tsx) accumulates real XP across its chapters; the flat
  // quiz path falls back to the module's flat per-lesson reward.
  const xpForLesson = xpEarned !== undefined ? Number(xpEarned) : (content?.xpReward ?? 0);
  // Read-and-clear exactly once per mount (a ref, not useMemo, so it survives whatever
  // render-count quirks Strict Mode introduces without taking the handoff value twice).
  // Learned terms travel in here too now, not as a URL param — see @/questReport.
  const analyticsCapture = useRef<ReturnType<typeof takePendingQuestAnalytics> | null>(null);
  if (analyticsCapture.current === null) analyticsCapture.current = takePendingQuestAnalytics();
  const analytics = analyticsCapture.current;
  const learnedTerms = analytics.learnedTerms;
  const learnedTermNames = useMemo(() => learnedTerms.map((t) => t.term), [learnedTerms]);
  const report = useMemo(() => buildQuestReport(mod.name, analytics, Number(hintsUsed ?? 0)), [mod.name, analytics, hintsUsed]);

  const { state, level, tierName, completeLesson, completeLifeTask, equippedMascotItems } = useStore();
  const tierBefore = useRef(tierName).current;
  const recorded = useRef(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    const earned = isLifeTask
      ? completeLifeTask(mod.id, xpForLesson, {
        correctCount: correct,
        gradedTotal: totalQ,
        questId,
        hintsUsed: hintsUsed !== undefined ? Number(hintsUsed) : undefined,
        newTerms: learnedTermNames.length ? learnedTermNames : undefined,
      })
      : completeLesson(mod.id, li, xpForLesson, {
        correctCount: correct,
        gradedTotal: totalQ,
        questId,
        bossWon: bossWon === '1',
        hintsUsed: hintsUsed !== undefined ? Number(hintsUsed) : undefined,
        newTerms: learnedTermNames.length ? learnedTermNames : undefined,
      });
    setCoinsEarned(earned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = xpProgressPct(state.xp, level);
  // The big level-up overlay is reserved for an actual TIER change (mirrors the website's
  // maybeShowPostCompletionOverlays) — a numeric level-up alone doesn't get a full screen.
  // A life event (if one triggered) is deferred until after that overlay, same as the website.
  const tieredUp = tierName !== tierBefore;
  // These overlays live under /sheet, not /modal. The web build's baseUrl is "/m"
  // (mobile/app.json) and Expo Router's stripBaseUrl() removes it as a raw *string* prefix,
  // so ANY route beginning with "/m" (i.e. "/modal/*") gets its "m" eaten during path
  // resolution and lands on the unmatched "/m/odal/life-event" route — in the production
  // web export only (stripBaseUrl no-ops in dev, which is why it never reproduced locally).
  // This is form-independent: object-form { pathname } with no params resolves to the same
  // bare string as a plain push, so it does NOT dodge the collision. The only robust fix is
  // to keep the segment off the letter "m"; `npm run check:routes` guards against /m* routes.
  // (push() is still required for the cross-navigator hops below: replace() doesn't reliably
  // cross from this nested "learn" stack into the root Stack.)
  const continuePress = () => {
    if (tieredUp) { router.push({ pathname: '/sheet/levelup' }); return; }
    if (state.pendingLifeEventId) { router.push({ pathname: '/sheet/life-event' }); return; }
    router.push('/(tabs)/modules');
  };

  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* The 3-in-a-row streak face (not a generic 'happy' one) — this screen is
              already a celebration moment, so Hammy gets the same excited expression as an
              in-quest streak callout, not the default neutral face. */}
          <Hammy size={150} equipped={equippedMascotItems()} face={REACTION_FACES.streak} style={{ marginTop: 6 }} />
          <Tag textColor={colors.greenDark} style={styles.tag}>🎉 LESSON COMPLETE</Tag>
          <Txt style={styles.title}>{lesson?.title ?? mod.name} —{'\n'}{allCorrect ? 'nailed it!' : 'done!'}</Txt>
          {totalQ > 0 ? <Txt style={styles.scoreLine}>{correct}/{totalQ} correct</Txt> : null}

          <View style={styles.rewards}>
            <Reward value={`+${xpForLesson}`} label="XP" />
            <Reward value={<Coin size={22} />} label="Coins" big={`+${coinsEarned}`} />
          </View>

          <View style={styles.levelWrap}>
            <View style={styles.levelRow}>
              <Txt style={styles.levelTiny}>LEVEL {level}</Txt>
              <Txt style={styles.levelTiny}>{Math.round(pct)}% to Level {level + 1}</Txt>
            </View>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: `${pct}%` }]} />
            </View>
          </View>

          <QuestReportCard report={report} learnedTerms={learnedTerms} equipped={equippedMascotItems()} />
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Continue" variant="pink" onPress={continuePress} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Reward({ value, label, big }: { value: React.ReactNode; label: string; big?: string }) {
  return (
    <View style={styles.reward}>
      {typeof value === 'string' ? (
        <Txt style={styles.rewardB}>{value}</Txt>
      ) : (
        <View style={styles.rewardIconRow}>
          {value}
          {big ? <Txt style={styles.rewardB}>{big}</Txt> : null}
        </View>
      )}
      <Txt style={styles.rewardEm}>{label}</Txt>
    </View>
  );
}

/** Circular mastery ring — same SVG-stroke technique as the Progress tab's Ring, ported
 * from the website's conic-gradient .report-mastery-ring at the same 84/64px proportions. */
function MasteryRing({ pct }: { pct: number }) {
  const size = 76;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={colors.green} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Txt style={styles.ringPct}>{pct}%</Txt>
      </View>
    </View>
  );
}

/** "Scroll down to see your progress report, then Hammy's advice" — ported from the
 * website's buildQuestReport/renderQuestResults (app.js), which only ever built this for
 * the two quest-based modules (credit, scams). Per product decision this now shows after
 * every lesson, using whatever chapters that lesson actually had — a lesson with no
 * knowledgecheck/mythcards/matching/decision/explainback chapters just shows the ring at
 * 100% with empty stat counts and a generic "solid handle on this module" note from Hammy,
 * same as the website would for a quest with nothing to grade. */
function QuestReportCard({
  report, learnedTerms, equipped,
}: {
  report: ReturnType<typeof buildQuestReport>;
  learnedTerms: { term: string; plain: string; section: string }[];
  equipped: Parameters<typeof Hammy>[0]['equipped'];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={styles.reportCard}>
      <View style={styles.reportMastery}>
        <MasteryRing pct={report.masteryPct} />
        <View style={{ flex: 1 }}>
          <Txt style={styles.reportMasteryLabel}>Mastery this lesson</Txt>
          <Txt style={styles.reportMasterySub}>
            {report.totalAnswered > 0 ? `${report.totalRight}/${report.totalAnswered} correct` : 'Nothing graded this lesson'}
          </Txt>
        </View>
      </View>

      {learnedTerms.length ? (
        <View>
          <Txt style={styles.reportSectionTitle}>Words you learned</Txt>
          <View style={styles.reportTerms}>
            {learnedTerms.map((t) => (
              <View key={t.term} style={styles.reportTermChip}><Txt style={styles.reportTermChipTxt}>{t.term}</Txt></View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.reportStatRow}>
        <ReportStat num={`${report.kcRightCount}/${report.kcTotal}`} label="Quick Check" />
        <ReportStat num={`${report.mythRightCount}/${report.mythTotal}`} label="True/False" />
        <ReportStat num={String(report.matchingMistakes)} label="Match Misses" />
        <ReportStat num={String(report.hintsUsed)} label="Hints" />
      </View>

      {report.explainback ? (
        <Txt style={styles.reportBody}>
          <Txt style={{ fontFamily: font.extra }}>&quot;{report.explainback.term}&quot;: </Txt>
          {report.explainback.tier === 'great' ? 'you got the key idea on your own.'
            : report.explainback.tier === 'ok' ? 'you were on the right track.'
              : "worth rereading — didn't quite click yet."}
        </Txt>
      ) : null}

      {report.weakSpots.length ? (
        <View>
          <Txt style={styles.reportSectionTitle}>Worth another look</Txt>
          {(expanded ? report.weakSpots : report.weakSpots.slice(0, 2)).map((s, i) => (
            <Txt key={i} style={styles.reportListItem}>• {s}</Txt>
          ))}
          {!expanded && report.weakSpots.length > 2 ? (
            <Pressable onPress={() => setExpanded(true)} hitSlop={6}>
              <Txt style={styles.reportMoreLink}>+ {report.weakSpots.length - 2} more</Txt>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Txt style={styles.reportPerfect}>Every question right this time. 🎉</Txt>
      )}

      <View style={styles.reportAdvice}>
        <Hammy size={92} bob={false} equipped={equipped} />
        <Txt style={styles.reportAdviceTxt}><Txt style={{ fontFamily: font.extra }}>Hammy&apos;s advice: </Txt>{report.advice}</Txt>
      </View>
    </Card>
  );
}

function ReportStat({ num, label }: { num: string; label: string }) {
  return (
    <View style={styles.reportStat}>
      <Txt style={styles.reportStatNum}>{num}</Txt>
      <Txt style={styles.reportStatLabel}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12 },
  tag: { backgroundColor: 'rgba(255,255,255,0.9)', marginTop: 16 },
  title: { fontFamily: font.display, fontSize: 32, color: colors.white, textAlign: 'center', marginTop: 10, lineHeight: 35 },
  scoreLine: { fontFamily: font.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  rewards: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 22 },
  reward: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 8,
  },
  rewardIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardB: { fontFamily: font.display, fontSize: 22, color: colors.white },
  rewardEm: { fontFamily: font.extra, fontSize: 10, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5 },
  levelWrap: { width: '100%', marginTop: 14 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelTiny: { fontFamily: font.extra, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  levelTrack: { height: 11, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 8, backgroundColor: colors.pinkBright },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8 },
  reportCard: { width: '100%', marginTop: 18, gap: 14, alignItems: 'stretch' },
  ringInner: {
    position: 'absolute', width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  ringPct: { fontFamily: font.display, fontSize: 16, color: colors.ink },
  reportMastery: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reportMasteryLabel: { fontFamily: font.displayMed, fontSize: 15, color: colors.ink },
  reportMasterySub: { fontFamily: font.medium, fontSize: 11.5, color: colors.muted3, marginTop: 4, lineHeight: 15 },
  reportSectionTitle: { fontFamily: font.displayMed, fontSize: 14.5, color: colors.ink },
  reportTerms: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  reportTermChip: { backgroundColor: colors.tagGreenBg, borderWidth: 1, borderColor: colors.greenSoft, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  reportTermChipTxt: { fontFamily: font.bold, fontSize: 12, color: colors.greenDark },
  reportStatRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  reportStat: { flex: 1, minWidth: 76, alignItems: 'center', backgroundColor: colors.screen, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6 },
  reportStatNum: { fontFamily: font.display, fontSize: 18, color: colors.ink },
  reportStatLabel: { fontFamily: font.bold, fontSize: 9.5, color: colors.muted5, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 3, textAlign: 'center' },
  reportListItem: { fontFamily: font.semi, fontSize: 12.5, color: colors.muted2, lineHeight: 18, marginTop: 4 },
  reportMoreLink: { fontFamily: font.extra, fontSize: 12.5, color: colors.green, marginTop: 6 },
  reportBody: { fontFamily: font.semi, fontSize: 12.5, color: colors.muted2, lineHeight: 18, marginTop: 4 },
  reportPerfect: { fontFamily: font.bold, fontSize: 12.5, color: colors.greenDark, backgroundColor: colors.tagGreenBg, borderRadius: 12, padding: 12 },
  reportAdvice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.screen, borderRadius: 14, padding: 12 },
  reportAdviceTxt: { flex: 1, fontFamily: font.semi, fontSize: 12.5, color: colors.muted1, lineHeight: 18 },
});
