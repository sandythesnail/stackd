import { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Easing } from 'react-native';
import Reanimated, {
  FadeInDown, useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withDelay,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt, Button, Tag, Card, Hammy, Coin } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore, xpProgressPct, MAX_LEVEL } from '@/store';
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
  // Reflects what was ACTUALLY added to the player's xp, which is 0 on a replay of an
  // already-completed lesson/life-task — not the theoretical full `xpForLesson` reward,
  // which this screen used to show even when nothing was really added (see
  // completeLesson/completeLifeTask's `xpAwarded` return value).
  const [xpAwarded, setXpAwarded] = useState(0);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    const { xpAwarded: xp, coinsAwarded: coins } = isLifeTask
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
    setXpAwarded(xp);
    setCoinsEarned(coins);
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
  //
  // The two sheets are pushed — they're transparentModal overlays and belong ON TOP of what
  // is already there. Leaving for the Modules tab navigates instead.
  //
  // navigate, not push, and not replace. push stacked a SECOND (tabs) entry on top of the
  // one the lesson was launched from, leaving the whole finished lesson underneath it: two
  // stack entries per lesson, forever. Four lessons in a sitting and the Android back button
  // walked back through four old results screens, each still showing its confetti. replace()
  // is the fix that doesn't work here — it's unreliable crossing from this nested "learn"
  // stack into the root Stack, which is the "unmatched route"/blank-screen crash the comment
  // above is about. navigate resolves up the navigator tree to the root Stack, finds the
  // (tabs) entry already sitting below "learn", and returns to it, dropping the lesson
  // screens on the way. If it ever failed to find one it would push, i.e. degrade to exactly
  // the old behaviour rather than to a broken route.
  const continuePress = () => {
    if (tieredUp) { router.push({ pathname: '/sheet/levelup' }); return; }
    if (state.pendingLifeEventId) { router.push({ pathname: '/sheet/life-event' }); return; }
    router.navigate('/(tabs)/modules');
  };

  return (
    <LinearGradient colors={[colors.green, colors.greenDark]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* The 3-in-a-row streak face (not a generic 'happy' one) — this screen is
              already a celebration moment, so Hammy gets the same excited expression as an
              in-quest streak callout, not the default neutral face.
              floatAmplitude is turned down from the default 14 — at this tight marginTop,
              right under the screen's top edge, the default float rise clipped into the
              safe area on every cycle ("Hammy goes off screen"). */}
          <Hammy size={150} equipped={equippedMascotItems()} face={REACTION_FACES.streak} floatAmplitude={6} style={{ marginTop: 6 }} />
          {/* The whole screen arrives as a cascade rather than all at once: tag, then
              headline, then the rewards, then the level bar, then the report. Each step is a
              short rise-and-fade on a stagger, which is what turns a static summary into a
              sequence you watch land. Delays are cumulative and deliberately front-loaded —
              everything is on screen inside a second. */}
          <Reanimated.View entering={FadeInDown.delay(80).duration(340).springify()}>
            <Tag textColor={colors.greenDark} style={styles.tag}>🎉 LESSON COMPLETE</Tag>
          </Reanimated.View>
          <Reanimated.View entering={FadeInDown.delay(180).duration(360).springify()}>
            <Txt style={styles.title}>{titleWithDash(lesson?.title ?? mod.name)}{"\n"}{allCorrect ? "nailed it!" : "done!"}</Txt>
            {totalQ > 0 ? <Txt style={styles.scoreLine}>{correct}/{totalQ} correct</Txt> : null}
          </Reanimated.View>

          <Reanimated.View style={styles.rewards} entering={FadeInDown.delay(300).duration(380).springify()}>
            {/* Both reward numbers count up from zero rather than appearing at their final
                value — the XP and coins are the payoff for the whole lesson, so they get to
                be watched being earned. */}
            <Reward value={<CountUp to={xpAwarded} prefix="+" />} label="XP" />
            <Reward value={<Coin size={22} />} label="Coins" big={<CountUp to={coinsEarned} prefix="+" />} />
          </Reanimated.View>

          <Reanimated.View style={styles.levelWrap} entering={FadeInDown.delay(420).duration(380).springify()}>
            <View style={styles.levelRow}>
              <Txt style={styles.levelTiny}>LEVEL {level}</Txt>
              {/* xpProgressPct returns a flat 100 at the top level (its ceiling collapses onto
                  its floor), so this read "100% to Level 12" — a level that doesn't exist and
                  can never be reached — on the results screen after every lesson once a player
                  passed 2,200 XP. Same fix as the Progress tab's level card. */}
              <Txt style={styles.levelTiny}>
                {level >= MAX_LEVEL ? 'Max level reached' : `${Math.round(pct)}% to Level ${level + 1}`}
              </Txt>
            </View>
            <View style={styles.levelTrack}>
              {/* Grows from empty to the real percentage, so you see the progress you just
                  made rather than a bar that was always that full. */}
              <GrowBar pct={pct} />
            </View>
          </Reanimated.View>

          <Reanimated.View style={{ width: '100%' }} entering={FadeInDown.delay(540).duration(400).springify()}>
            <QuestReportCard report={report} learnedTerms={learnedTerms} equipped={equippedMascotItems()} />
          </Reanimated.View>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Continue" variant="pink" onPress={continuePress} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const NBSP = "\u00A0";
const EM_DASH = "\u2014";
/** Keeps a heading from ending on a single stranded word, and does nothing otherwise.
 *
 * The last two words are joined with a non-breaking space, and the trailing em dash is glued
 * to the final word so it can't be orphaned by itself either. That's deliberately narrower
 * than `text-wrap: balance`, which this replaced: balance re-flows EVERY line of EVERY title,
 * so short titles that were wrapping fine got shuffled too. This only ever changes the layout
 * in the one case being complained about — if the last two words already share a line, the
 * non-breaking space sits at a break the engine wasn't going to take, and nothing moves.
 *
 * Bails out under three words: with only two, binding them makes the whole title one
 * unbreakable run, which overflows instead of wrapping. Widow control everywhere else in the
 * app is still `text-wrap: pretty` from the global stylesheet (_layout.tsx); this is the
 * layout-free version for the one heading big enough to strand words regularly, and unlike
 * the CSS it also works on native. */
function titleWithDash(title: string) {
  const words = title.trim().split(/\s+/);
  // The em dash trails the title on the same line ("- nailed it!" is forced onto the next line
  // by an explicit break), so bind it to the final word: a lone dash is the worst widow of all.
  words[words.length - 1] += NBSP + EM_DASH;
  // Binding the last two words is the entire fix, and it is a no-op unless the last one was
  // about to be stranded: if they already share a line, the non-breaking space sits at a break
  // the engine was never going to take.
  if (words.length >= 3) words.splice(-2, 2, words.slice(-2).join(NBSP));
  return words.join(" ");
}

/** Ticks a number up from zero to `to`. Runs on a JS timer rather than a Reanimated worklet
 * because the thing being animated is the TEXT itself — there's no transform that turns "0"
 * into "42", so each frame has to re-render. Capped at ~28 steps regardless of the value, so
 * a 5-coin reward and a 400-XP one take the same time and neither floods the render queue. */
function CountUp({ to, prefix = '', duration = 900 }: { to: number; prefix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (to <= 0) { setN(to); return; }
    const steps = Math.min(28, Math.max(1, to));
    const stepMs = duration / steps;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      // Ease-out, so it sprints then settles rather than crawling linearly to the total.
      const t = i / steps;
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (i >= steps) { setN(to); clearInterval(id); }
    }, stepMs);
    return () => clearInterval(id);
  }, [to, duration]);
  return <Txt style={styles.rewardB}>{prefix}{n}</Txt>;
}

/** The level bar's fill, growing from empty to `pct` once on mount. */
function GrowBar({ pct }: { pct: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(520, withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [pct, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Reanimated.View style={[styles.levelFill, style]} />;
}

function Reward({ value, label, big }: { value: React.ReactNode; label: string; big?: React.ReactNode }) {
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
function MasteryRing({ pct, graded = true }: { pct: number; graded?: boolean }) {
  const size = 76;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Sweeps from empty to the real score instead of appearing already filled, so the ring
  // reads as your result being tallied. Driven through animatedProps rather than state —
  // strokeDashoffset is an SVG prop, not a style, so it can't ride a transform.
  const offset = useSharedValue(c);
  useEffect(() => {
    if (!graded) return;
    offset.value = withDelay(640, withTiming(c * (1 - pct / 100), { duration: 950, easing: Easing.out(Easing.cubic) }));
  }, [pct, c, offset, graded]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={colors.green} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Txt style={styles.ringPct}>{graded ? `${pct}%` : '—'}</Txt>
      </View>
    </View>
  );
}

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

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
  const statTiles = [
    report.kcTotal > 0 ? { num: `${report.kcRightCount}/${report.kcTotal}`, label: 'Quick Check' } : null,
    report.mythTotal > 0 ? { num: `${report.mythRightCount}/${report.mythTotal}`, label: 'True/False' } : null,
    report.matchingMistakes > 0 ? { num: String(report.matchingMistakes), label: 'Match Misses' } : null,
    report.hintsUsed > 0 ? { num: String(report.hintsUsed), label: 'Hints' } : null,
  ].filter((s): s is { num: string; label: string } => s !== null);
  return (
    <Card style={styles.reportCard}>
      <View style={styles.reportMastery}>
        {/* buildQuestReport reports 100% when nothing was answered — mathematically the only
            sensible default, but as a full green ring it claimed a perfect score for a lesson
            that never asked anything. An em dash on an empty track says the same thing the
            line beside it does. */}
        <MasteryRing pct={report.masteryPct} graded={report.totalAnswered > 0} />
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

      {/* Only the tiles this lesson actually earned. Lessons draw on different chapter types,
          so most have no Match It or no True/False at all — and a tile reading "0/0" doesn't
          say "there weren't any", it looks like a score of nothing. Hints shows whenever one
          was used; a spotless 0 there isn't a stat worth a tile either. */}
      {statTiles.length ? (
        <View style={styles.reportStatRow}>
          {statTiles.map((s) => <ReportStat key={s.label} num={s.num} label={s.label} />)}
        </View>
      ) : null}

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
      ) : report.totalAnswered > 0 ? (
        // Only when there were questions to get right. "No weak spots" and "no questions"
        // are the same empty list, so a lesson built entirely from story/teach/simulator
        // chapters was congratulated for a clean sweep of nothing — directly under the line
        // that says "Nothing graded this lesson" on the same card.
        <Txt style={styles.reportPerfect}>Every question right this time. 🎉</Txt>
      ) : null}

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
