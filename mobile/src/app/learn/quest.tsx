import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import RNSlider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, Card, Tag, Hammy, Speech } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';
import { REACTION_FACES } from '@/hammyFaces';
import { EMPTY_ANALYTICS, setPendingQuestAnalytics, type QuestAnalytics } from '@/questReport';
import type {
  Chapter, Question, StoryChapter, TeachChapter, MatchingChapter, HintChapter, DecisionChapter,
  MicrosimChapter, PollChapter, MythcardsChapter, KnowledgecheckChapter, SimulatorChapter,
  BossbattleChapter, SpotcheckChapter, PriceisrightChapter, ExplainbackChapter, UrlinspectChapter,
} from '@/content';

/** A chapter reports back how much XP it earned, and — for chapters with a clear
 * right/wrong answer — whether the player got it right, so the quest can tally a real
 * score for the results screen (mirrors how knowledgecheck/poll/mythcards/priceisright
 * work on the website). */
type Complete = (xpDelta: number, graded?: boolean) => void;

/** Ported verbatim from app.js — a limited "Ask Hammy for a hint" budget available during
 * interactive chapters only, so getting stuck doesn't leave the student with nowhere to turn. */
const HINT_BUDGET = 3;
const HINT_FREE_CHAPTER_TYPES = new Set(['story', 'teach', 'hint']);

type HintProps = { hintsRemaining: number; onUseHint: () => void };
/** Reports right/wrong to the persistent companion Hammy (see showHammyReaction on the
 * website) so its face/message reacts — happy, gentle, or a 3-in-a-row streak callout. */
type ReactProps = { reactTo: (isCorrect: boolean) => void };

/** A chapter's current primary action ("Next", "Continue →", "Check my answer", ...), or
 * null when it has nothing to show yet (e.g. a True/False chapter before it's answered).
 * Lifted into the header (top-right, next to the hint button) instead of trailing the
 * chapter's own content, so the primary action is always reachable without scrolling —
 * every chapter view reports its own action here instead of rendering a bottom button. */
type QuestAction = { label: string; onPress: () => void; variant?: 'green' | 'pink'; disabled?: boolean } | null;
type ActionProps = { onAction: (action: QuestAction) => void };

/** Feeds the end-of-lesson report (see @/questReport, results.tsx) — mirrors what the
 * website's per-chapter handlers write into `qp.analytics`. Only the chapter types the
 * website itself tracks (knowledgecheck/mythcards/matching/decision/bossbattle/explainback)
 * report anything; other types (story, teach, poll, microsim, etc.) don't call these. */
type ReportProps = {
  reportKnowledgeCheck: (question: string, isCorrect: boolean) => void;
  reportMythCard: (myth: string, guessedRight: boolean) => void;
  reportMatchingMistake: () => void;
  reportDecision: (title: string, choice: string) => void;
  reportExplainback: (term: string, tier: 'great' | 'ok' | 'retry') => void;
};

/** Ported from app.js's HAMMY_CORRECT_MSGS/HAMMY_GENTLE_MSGS, plus "Good job!"/"Nice try!"
 * added to each pool per direct request. Only two celebration emoji in rotation — hands
 * and confetti — per direct request (no checkmark or others). */
const HAMMY_CORRECT_MSGS = ['Nice! 🎉', 'Nice one! 🙌', 'You got it! 🙌', 'Great job! 🎉', 'Good job! 🙌', 'Awesome! 🎉'];
const HAMMY_GENTLE_MSGS = ["Not quite! Here's why:", "Not quite, let's learn from it:", "Close! Here's what's true:", 'Nice try!'];
const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];


/** Hammy's reaction speech bubble — ported from the website's .hammy-side-msg, which fades
 * in/out (opacity + a small rise) rather than popping instantly, AND colors the text green
 * for a right answer / pink for wrong (mirrors the website's feedback-panel text color).
 * Keeps showing the last message+mood while fading out so there's text to fade from.
 *
 * The reserved slot's height is measured from the bubble's own real layout (onLayout) and
 * only ever grows to the tallest message seen so far — sized to fit whatever's actually in
 * it instead of a guessed fixed height that left empty space under short one-line messages,
 * while still never letting Hammy jump when the bubble disappears or a later message is
 * shorter than an earlier one. */
function ReactionBubble({ message, mood }: { message: string | null; mood: 'happy' | 'gentle' | 'streak' | null }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(message);
  const [displayMood, setDisplayMood] = useState(mood);
  const [slotHeight, setSlotHeight] = useState(0);
  useEffect(() => {
    if (message) { setDisplay(message); setDisplayMood(mood); }
    Animated.timing(anim, { toValue: message ? 1 : 0, duration: 250, easing: Easing.ease, useNativeDriver: true }).start(() => {
      if (!message) setDisplay(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, anim]);
  const textColor = displayMood === 'gentle' ? colors.pinkDark : displayMood ? colors.greenDark : colors.inkSoft;
  return (
    <View style={[styles.bubbleSlot, slotHeight ? { height: slotHeight } : null]} pointerEvents="none">
      {display ? (
        <Animated.View
          style={[styles.bubbleInner, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}
          onLayout={(e) => setSlotHeight((h) => Math.max(h, e.nativeEvent.layout.height))}
        >
          <Speech numberOfLines={2} style={styles.bubbleSpeech} textStyle={[styles.bubbleSpeechTxt, { color: textColor }]}>{display}</Speech>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Screen 17 (extended) — Quest player. Renders the website's full multi-chapter quest
 * content (story/teach/matching/decision/microsim/etc — all 15 chapter types) instead of
 * the flat single-quiz flow, one chapter at a time. */
export default function QuestPlayer() {
  const router = useRouter();
  const { equippedMascotItems } = useStore();
  const { moduleId, lessonIndex, isLifeTask } = useLocalSearchParams<{ moduleId: string; lessonIndex: string; isLifeTask?: string }>();
  const mod = moduleById(moduleId ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const li = Number(lessonIndex ?? 0);
  const quest = content?.quests[li];

  const [chapterIdx, setChapterIdx] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gradedTotal, setGradedTotal] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [terms, setTerms] = useState<string[]>([]);
  const [bossWon, setBossWon] = useState(false);
  const [reactionMood, setReactionMood] = useState<'happy' | 'gentle' | 'streak' | null>(null);
  const [reactionMsg, setReactionMsg] = useState<string | null>(null);
  const [reactionKey, setReactionKey] = useState(0);
  const [answerStreak, setAnswerStreak] = useState(0);
  const [action, setAction] = useState<QuestAction>(null);
  // Each chapter's own onAction call is only relevant while IT is mounted — clear
  // whatever the previous chapter left behind the instant the chapter changes, so a stale
  // action can never linger into the next chapter for even one frame.
  const onAction = (a: QuestAction) => setAction(a);
  useEffect(() => { setAction(null); }, [chapterIdx]);
  // A ref, not state — analytics never drives a render in this screen, it's only read once
  // at the final chapter's onComplete to build the results-screen params. A question's
  // "report" and the quest's final onComplete can fire in the very same handler (the last
  // knowledgecheck question's "next" click both reports and completes), and React state
  // updates from the same handler wouldn't be visible yet when onComplete reads them — a
  // ref sidesteps that staleness entirely by updating synchronously.
  const analyticsRef = useRef<QuestAnalytics>(EMPTY_ANALYTICS);
  const reportProps: ReportProps = {
    reportKnowledgeCheck: (question, isCorrect) => {
      analyticsRef.current = { ...analyticsRef.current, knowledgeCheck: [...analyticsRef.current.knowledgeCheck, { question, isCorrect }] };
    },
    reportMythCard: (myth, guessedRight) => {
      analyticsRef.current = { ...analyticsRef.current, mythCards: [...analyticsRef.current.mythCards, { myth, guessedRight }] };
    },
    reportMatchingMistake: () => {
      analyticsRef.current = { ...analyticsRef.current, matchingMistakes: analyticsRef.current.matchingMistakes + 1 };
    },
    reportDecision: (title, choice) => {
      analyticsRef.current = { ...analyticsRef.current, decisions: [...analyticsRef.current.decisions, { title, choice }] };
    },
    reportExplainback: (term, tier) => {
      analyticsRef.current = { ...analyticsRef.current, explainback: { term, tier } };
    },
  };

  // router.back() no-ops with nowhere to go — e.g. the web build reloaded directly on this
  // route (no in-app history) via a deep link or the /m viewport redirect. Fall back to the
  // module's own page so the X/Back button always goes somewhere.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/learn/module/${mod.id}`);
  };

  if (!quest || !content) {
    return (
      <Screen edges={['top']}>
        <View style={styles.content}>
          <Txt variant="h1">No quest found for this lesson.</Txt>
          <Button label="Back" onPress={goBack} style={{ marginTop: 14 }} />
        </View>
      </Screen>
    );
  }

  const chapter = quest.chapters[chapterIdx];
  const hintsRemaining = Math.max(0, HINT_BUDGET - hintsUsed);
  const onUseHint = () => setHintsUsed((h) => h + 1);
  const hintText = (chapter as { hintText?: string }).hintText;

  // Ported from showHammyReaction: the persistent companion's face/mood reacts to every
  // graded answer across the quest — happy, gentle, or (every 3rd correct in a row) a
  // streak callout. reactionKey bumps on every call (even repeat-same-mood) so the body
  // bounce/wobble replays each time, mirroring the website forcing its CSS animation to
  // restart.
  //
  // The face itself is sticky — it keeps showing the LAST reaction until a new one replaces
  // it (or the chapter changes, see the chapterIdx effect below), rather than reverting to
  // the plain default face on a timer. Chapters like matching space reactions out (pick a
  // term, THEN a definition, repeat), so a short auto-revert made Hammy's face flicker back
  // to blank/plain between nearly every attempt — reported as "Hammy's face goes blank in
  // the matching portion." Only the speech-bubble MESSAGE still auto-fades after a beat
  // (repeating "Nice! 🎉" indefinitely would look stale); the face doesn't.
  const reactionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reactionTimeout.current) clearTimeout(reactionTimeout.current); }, []);
  useEffect(() => {
    setReactionMood(null);
    setReactionMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdx]);
  const reactTo = (isCorrect: boolean) => {
    const nextStreak = isCorrect ? answerStreak + 1 : 0;
    setAnswerStreak(nextStreak);
    const isStreak = isCorrect && nextStreak > 0 && nextStreak % 3 === 0;
    setReactionMood(isCorrect ? (isStreak ? 'streak' : 'happy') : 'gentle');
    setReactionMsg(isStreak ? `🎉 ${nextStreak} in a row! You're on fire!` : isCorrect ? pickRandom(HAMMY_CORRECT_MSGS) : pickRandom(HAMMY_GENTLE_MSGS));
    setReactionKey((k) => k + 1);
    if (reactionTimeout.current) clearTimeout(reactionTimeout.current);
    reactionTimeout.current = setTimeout(() => {
      setReactionMsg(null);
      reactionTimeout.current = null;
    }, 1400);
  };

  const onComplete: Complete = (xpDelta, graded) => {
    const nextXp = xpEarned + xpDelta;
    const nextCorrect = correctCount + (graded ? 1 : 0);
    const nextGraded = gradedTotal + (graded !== undefined ? 1 : 0);
    const nextTerms = chapter.type === 'matching'
      ? [...new Set([...terms, ...chapter.pairs.map((p) => p.term)])]
      : chapter.type === 'teach'
        ? [...new Set([...terms, ...chapter.concepts.map((c) => c.term)])]
        : terms;
    const nextBossWon = bossWon || chapter.type === 'bossbattle';

    if (chapterIdx + 1 >= quest.chapters.length) {
      setPendingQuestAnalytics({ ...analyticsRef.current, learnedTerms: nextTerms });
      router.replace({
        pathname: '/learn/results',
        params: {
          moduleId: mod.id, lessonIndex: String(li),
          correctCount: String(nextCorrect), total: String(nextGraded), xpEarned: String(nextXp),
          questId: quest.id, hintsUsed: String(hintsUsed), bossWon: nextBossWon ? '1' : '0',
          ...(isLifeTask ? { isLifeTask } : {}),
        },
      });
      return;
    }
    setXpEarned(nextXp);
    setCorrectCount(nextCorrect);
    setGradedTotal(nextGraded);
    setTerms(nextTerms);
    setBossWon(nextBossWon);
    setChapterIdx(chapterIdx + 1);
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="x" size={34} iconSize={16} onPress={goBack} />
        <ProgressBar value={chapterIdx / quest.chapters.length} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>{Math.round((chapterIdx / quest.chapters.length) * 100)}%</Txt>
        <HintCorner key={chapter.id} hintText={hintText} hintsRemaining={hintsRemaining} onUseHint={onUseHint} />
      </View>
      {/* The chapter's own primary action ("Next", "Continue →", "Check my answer", ...),
          reported up via onAction — lives here, top-right, instead of trailing the
          chapter's scrollable content, so it's never something you have to scroll to find. */}
      {action ? (
        <View style={styles.actionBar}>
          <Button
            label={action.label}
            onPress={action.onPress}
            variant={action.variant ?? 'pink'}
            disabled={action.disabled}
            size="sm"
            style={{ paddingHorizontal: 20 }}
          />
        </View>
      ) : null}
      <View style={styles.companionWrap}>
        <ReactionBubble message={reactionMsg} mood={reactionMood} />
        <Hammy
          size={168}
          bob
          equipped={equippedMascotItems()}
          face={reactionMood ? REACTION_FACES[reactionMood] : undefined}
          reaction={reactionMood}
          reactionKey={reactionKey}
        />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ChapterView
          key={chapter.id}
          chapter={chapter}
          questions={content.questions}
          moduleXpReward={content.xpReward}
          onComplete={onComplete}
          reactTo={reactTo}
          onAction={onAction}
          {...reportProps}
        />
      </ScrollView>
    </Screen>
  );
}

function ChapterView({
  chapter, questions, moduleXpReward, onComplete, reactTo, onAction,
  reportKnowledgeCheck, reportMythCard, reportMatchingMistake, reportDecision, reportExplainback,
}: { chapter: Chapter; questions: Question[]; moduleXpReward: number; onComplete: Complete } & ReactProps & ReportProps & ActionProps) {
  const reactProps: ReactProps = { reactTo };
  switch (chapter.type) {
    case 'story': return <StoryView chapter={chapter} onComplete={onComplete} onAction={onAction} />;
    case 'teach': return <TeachView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'matching': return <MatchingView chapter={chapter} onComplete={onComplete} {...reactProps} reportMatchingMistake={reportMatchingMistake} />;
    case 'hint': return <HintView chapter={chapter} onComplete={onComplete} onAction={onAction} />;
    case 'decision': return <DecisionView chapter={chapter} onComplete={onComplete} onAction={onAction} reportDecision={reportDecision} />;
    case 'microsim': return <MicrosimView chapter={chapter} onComplete={onComplete} onAction={onAction} />;
    case 'poll': return <PollView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'mythcards': return <MythcardsView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportMythCard={reportMythCard} />;
    case 'knowledgecheck': return <KnowledgecheckView chapter={chapter} questions={questions} onComplete={onComplete} onAction={onAction} {...reactProps} reportKnowledgeCheck={reportKnowledgeCheck} />;
    case 'simulator': return <SimulatorView chapter={chapter} onComplete={onComplete} onAction={onAction} />;
    case 'bossbattle': return <BossbattleView chapter={chapter} moduleXpReward={moduleXpReward} onComplete={onComplete} onAction={onAction} reportDecision={reportDecision} />;
    case 'spotcheck': return <SpotcheckView chapter={chapter} onComplete={onComplete} onAction={onAction} />;
    case 'priceisright': return <PriceisrightView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'explainback': return <ExplainbackView chapter={chapter} onComplete={onComplete} onAction={onAction} reportExplainback={reportExplainback} />;
    case 'urlinspect': return <UrlinspectView chapter={chapter} onComplete={onComplete} onAction={onAction} />;
    default: return null;
  }
}

/** True/False (or Myth/Fact) choice button — ported from the website's `.option-btn`
 * correct/wrong treatment (app.css), used for every true/false-shaped chapter (teach's
 * inline check, poll, mythcards). Once answered, BOTH buttons recolor: whichever one holds
 * the correct answer turns green regardless of which was tapped, and the player's own wrong
 * tap (if any) turns pink — exactly the website's `classList.add('correct'/'wrong')` logic. */
function TrueFalseButton({
  label, state, onPress,
}: { label: string; state: 'default' | 'correct' | 'wrong'; onPress?: () => void }) {
  const c = TF_STATE[state];
  return (
    <Pressable disabled={state !== 'default' && !onPress} onPress={onPress} style={[styles.tfBtn, { borderColor: c.border, backgroundColor: c.bg }]}>
      <Txt style={[styles.tfBtnTxt, { color: c.text }]}>{label}</Txt>
    </Pressable>
  );
}
const TF_STATE: Record<'default' | 'correct' | 'wrong', { border: string; bg: string; text: string }> = {
  default: { border: colors.borderOpt, bg: colors.white, text: colors.ink },
  correct: { border: colors.green, bg: colors.tagGreenBg, text: colors.greenDark },
  wrong: { border: '#D98A9E', bg: colors.pinkBg2, text: colors.pinkDark },
};
/** The correct option always turns green once answered; the player's own wrong tap (if
 * any) turns pink — ported from app.js's `if (bIsTrue === isTrue) correct; else if
 * (b===btn) wrong`. */
function tfState(optionValue: boolean, answered: boolean | null, isTrue: boolean | undefined): 'default' | 'correct' | 'wrong' {
  if (answered === null) return 'default';
  if (optionValue === isTrue) return 'correct';
  if (optionValue === answered) return 'wrong';
  return 'default';
}

/** Floating hint control, pinned in the header's top-right corner — ported budget logic from
 * renderHintBudget (only rendered for chapters with hintText; story/teach/hint chapters never
 * spend budget since they have none). Tapping opens a popover anchored under the button
 * instead of pushing chapter content around, so revealing a hint never moves anything else. */
function HintCorner({ hintText, hintsRemaining, onUseHint }: { hintText?: string } & HintProps) {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  if (!hintText) return null;
  const press = () => {
    if (!revealed) {
      if (hintsRemaining <= 0) return;
      onUseHint();
      setRevealed(true);
    }
    setOpen((o) => !o);
  };
  return (
    <View style={styles.hintWrap}>
      <Pressable
        style={[styles.hintFab, hintsRemaining <= 0 && !revealed && styles.hintFabDisabled]}
        disabled={hintsRemaining <= 0 && !revealed}
        onPress={press}
      >
        <Txt style={styles.hintFabTxt}>{revealed ? '💡 HINT' : `💡 HINT ${hintsRemaining}`}</Txt>
      </Pressable>
      {open ? (
        <Card style={styles.hintPopover}>
          <Tag tone="pink">🐷 HAMMY'S HINT</Tag>
          <Txt variant="lead" style={{ fontSize: 13, marginTop: 6 }}>{hintText}</Txt>
        </Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── story ───────────────────────── */
function StoryView({ chapter, onComplete, onAction }: { chapter: StoryChapter; onComplete: Complete } & ActionProps) {
  const [i, setI] = useState(0);
  const beat = chapter.beats[i];
  const last = i + 1 >= chapter.beats.length;
  useEffect(() => {
    onAction({ label: last ? 'Continue →' : 'Next', onPress: () => (last ? onComplete(0) : setI(i + 1)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, last]);
  return (
    <View style={{ gap: 14, flex: 1 }}>
      {chapter.title ? <Txt variant="h2">{chapter.title}</Txt> : null}
      <Card style={{ gap: 6 }}>
        <Tag tone="pink">{beat.speaker}</Tag>
        <Txt variant="lead" style={{ fontSize: 15, color: colors.ink }}>{beat.text}</Txt>
      </Card>
    </View>
  );
}

/* ───────────────────────── teach ───────────────────────── */
function TeachView({ chapter, onComplete, onAction, reactTo }: { chapter: TeachChapter; onComplete: Complete } & ReactProps & ActionProps) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const concept = chapter.concepts[i];
  const last = i + 1 >= chapter.concepts.length;
  // Some concepts have no statement at all (check: {} or absent) — informational only, no quiz.
  const hasCheck = !!concept.check?.statement;

  const pick = (guess: boolean) => {
    setAnswered(guess);
    reactTo(guess === concept.check?.isTrue);
  };
  const next = () => {
    if (last) { onComplete(chapter.xpOnComplete ?? 0); return; }
    setI(i + 1);
    setAnswered(null);
  };

  useEffect(() => {
    onAction(!hasCheck || answered !== null ? { label: last ? 'Continue →' : 'Next concept', onPress: next } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheck, answered, last]);

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Card style={{ gap: 8 }}>
        <Txt style={styles.term}>{concept.term}</Txt>
        <Txt variant="lead" style={{ fontSize: 14 }}>{concept.plain}</Txt>
        <Txt style={{ fontFamily: font.semi, fontSize: 12.5, color: colors.muted3, fontStyle: 'italic' }}>{concept.analogy}</Txt>
        {concept.linkOut ? (
          <Button label={`${concept.linkOut.label} →`} variant="ghost" size="sm" onPress={() => router.push('/(tabs)/tools')} />
        ) : null}
      </Card>
      {hasCheck ? (
        <Card style={{ gap: 10 }}>
          <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: colors.ink }}>{concept.check?.statement}</Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TrueFalseButton label="True" state={tfState(true, answered, concept.check?.isTrue)} onPress={answered === null ? () => pick(true) : undefined} />
            <TrueFalseButton label="False" state={tfState(false, answered, concept.check?.isTrue)} onPress={answered === null ? () => pick(false) : undefined} />
          </View>
          {answered !== null ? (
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === concept.check?.isTrue ? colors.greenDark : colors.pinkDark }}>
              {answered === concept.check?.isTrue ? 'Correct!' : `Not quite — that's ${concept.check?.isTrue ? 'true' : 'false'}.`}
            </Txt>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── matching ───────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

function MatchingView({
  chapter, onComplete, reactTo, reportMatchingMistake,
}: { chapter: MatchingChapter; onComplete: Complete } & ReactProps & Pick<ReportProps, 'reportMatchingMistake'>) {
  const [terms] = useState(() => shuffle(chapter.pairs.map((p) => p.term)));
  const [defs] = useState(() => shuffle(chapter.pairs.map((p) => p.definition)));
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selTerm, setSelTerm] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<string | null>(null);

  const pickDef = (def: string) => {
    if (!selTerm) return;
    const correct = chapter.pairs.find((p) => p.term === selTerm)?.definition === def;
    reactTo(correct);
    if (!correct) reportMatchingMistake();
    if (correct) {
      const next = new Set(matched); next.add(selTerm);
      setMatched(next);
      setSelTerm(null);
      if (next.size === chapter.pairs.length) setTimeout(() => onComplete(chapter.xpOnComplete ?? 0), 400);
    } else {
      setWrongPair(def);
      setTimeout(() => { setWrongPair(null); setSelTerm(null); }, 500);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {terms.map((t) => (
            <Pressable
              key={t}
              disabled={matched.has(t)}
              onPress={() => setSelTerm(t)}
              style={[styles.matchChip, selTerm === t && styles.matchChipOn, matched.has(t) && styles.matchChipDone]}
            >
              <Txt style={styles.matchChipTxt}>{t}</Txt>
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {defs.map((d) => {
            const isDone = chapter.pairs.some((p) => p.definition === d && matched.has(p.term));
            return (
              <Pressable
                key={d}
                disabled={isDone}
                onPress={() => pickDef(d)}
                style={[styles.matchChip, wrongPair === d && styles.matchChipWrong, isDone && styles.matchChipDone]}
              >
                <Txt style={styles.matchChipTxt}>{d}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ───────────────────────── hint ───────────────────────── */
function HintView({ chapter, onComplete, onAction }: { chapter: HintChapter; onComplete: Complete } & ActionProps) {
  useEffect(() => {
    onAction({ label: 'Got it →', onPress: () => onComplete(chapter.xpOnComplete ?? 0) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Card style={{ gap: 8 }}>
        <Tag tone="warm">{chapter.tag}</Tag>
        <Txt variant="lead" style={{ fontSize: 14.5, color: colors.ink }}>{chapter.text}</Txt>
      </Card>
    </View>
  );
}

/* ───────────────────────── decision ───────────────────────── */
function DecisionView({
  chapter, onComplete, onAction, reportDecision,
}: { chapter: DecisionChapter; onComplete: Complete } & ActionProps & Pick<ReportProps, 'reportDecision'>) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  const pick = (c: DecisionChapter['choices'][number]) => {
    setPickedId(c.id);
    reportDecision(chapter.title, c.label);
  };
  useEffect(() => {
    onAction(picked ? { label: 'Continue →', onPress: () => onComplete(chapter.xpOnComplete ?? 0) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);
  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      {!picked ? (
        <View style={{ gap: 10 }}>
          {chapter.choices.map((c) => (
            <Option key={c.id} label={c.label} onPress={() => pick(c)} />
          ))}
        </View>
      ) : (
        <Card><Txt variant="lead" style={{ fontSize: 14, color: colors.ink }}>{picked.outcome.text}</Txt></Card>
      )}
    </View>
  );
}

/* ───────────────────────── microsim ───────────────────────── */
function MicrosimView({ chapter, onComplete, onAction }: { chapter: MicrosimChapter; onComplete: Complete } & ActionProps) {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(chapter.sliders.map((s) => [s.id, s.default])),
  );
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    onAction(submitted
      ? { label: 'Continue →', onPress: () => onComplete(chapter.xpOnComplete ?? 0) }
      : { label: 'See how you did', onPress: () => setSubmitted(true) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);
  const fixedTotal = chapter.fixedCosts.reduce((s, f) => s + f.amount, 0);
  const variableTotal = chapter.sliders.reduce((s, sl) => s + (values[sl.id] ?? 0), 0);
  const leftover = chapter.income - fixedTotal - variableTotal;
  // maxLeftover is null on the catch-all (highest) tier — treat as +Infinity, not 0, when sorting/matching.
  const cap = (v: number | null) => (v === null ? Infinity : v);
  const tier = [...chapter.feedbackTiers].sort((a, b) => cap(a.maxLeftover) - cap(b.maxLeftover)).find((t) => leftover <= cap(t.maxLeftover))
    ?? chapter.feedbackTiers[chapter.feedbackTiers.length - 1];

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      <Card style={{ gap: 4 }}>
        <Txt style={styles.term}>Income: ${chapter.income}</Txt>
        {chapter.fixedCosts.map((f) => (
          <View key={f.label} style={styles.rowBetween}>
            <Txt variant="lead" style={{ fontSize: 12.5 }}>{f.label}</Txt>
            <Txt style={{ fontFamily: font.bold, fontSize: 12.5 }}>${f.amount}</Txt>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 14 }}>
        {chapter.sliders.map((s) => (
          <View key={s.id} style={{ gap: 4 }}>
            <View style={styles.rowBetween}>
              <Txt style={{ fontFamily: font.semi, fontSize: 12.5, color: colors.muted1 }}>{s.label}</Txt>
              <Txt style={{ fontFamily: font.extra, fontSize: 12.5 }}>${values[s.id]}</Txt>
            </View>
            <RNSlider
              minimumValue={s.min} maximumValue={s.max} step={s.step} value={values[s.id]}
              onValueChange={(v) => setValues((prev) => ({ ...prev, [s.id]: v }))}
              minimumTrackTintColor={colors.green} maximumTrackTintColor={colors.track} thumbTintColor={colors.green}
            />
          </View>
        ))}
      </Card>
      <Card style={{ alignItems: 'center', gap: 2 }}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5 }}>LEFT OVER</Txt>
        <Txt style={{ fontFamily: font.display, fontSize: 28, color: leftover < 0 ? colors.danger : colors.greenDark }}>${leftover}</Txt>
      </Card>
      {submitted ? (
        <Card><Txt style={{ fontFamily: font.semi, fontSize: 14, color: tier.ok ? colors.greenDark : colors.pinkDark }}>{tier.text}</Txt></Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── poll ───────────────────────── */
function PollView({ chapter, onComplete, onAction, reactTo }: { chapter: PollChapter; onComplete: Complete } & ReactProps & ActionProps) {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const pick = (guess: boolean) => { setAnswered(guess); reactTo(guess === chapter.isTrue); };
  useEffect(() => {
    onAction(answered !== null ? { label: 'Continue →', onPress: () => onComplete(chapter.xpOnComplete ?? 0, answered === chapter.isTrue) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);
  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card><Txt style={{ fontFamily: font.displayMed, fontSize: 15, color: colors.ink }}>{chapter.statement}</Txt></Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TrueFalseButton label="True" state={tfState(true, answered, chapter.isTrue)} onPress={answered === null ? () => pick(true) : undefined} />
        <TrueFalseButton label="False" state={tfState(false, answered, chapter.isTrue)} onPress={answered === null ? () => pick(false) : undefined} />
      </View>
      {answered !== null ? (
        <Card>
          <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === chapter.isTrue ? colors.greenDark : colors.pinkDark }}>
            {answered === chapter.isTrue ? 'Correct!' : 'Not quite.'}
          </Txt>
          <Txt variant="lead" style={{ fontSize: 13, marginTop: 4 }}>{chapter.explanation}</Txt>
        </Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── mythcards ───────────────────────── */
function MythcardsView({
  chapter, onComplete, onAction, reactTo, reportMythCard,
}: { chapter: MythcardsChapter; onComplete: Complete } & ReactProps & ActionProps & Pick<ReportProps, 'reportMythCard'>) {
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [correctSoFar, setCorrectSoFar] = useState(0);
  const card = chapter.cards[i];
  const last = i + 1 >= chapter.cards.length;

  const pick = (guess: boolean) => {
    setAnswered(guess);
    reactTo(guess === card.isTrue);
    reportMythCard(card.myth, guess === card.isTrue);
    if (guess === card.isTrue) setCorrectSoFar((c) => c + 1);
  };
  const next = () => {
    if (last) {
      onComplete((chapter.xpPerCorrect ?? 0) * correctSoFar, true);
      return;
    }
    setI(i + 1);
    setAnswered(null);
  };

  useEffect(() => {
    onAction(answered !== null ? { label: last ? 'Continue →' : 'Next card', onPress: next } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, last]);

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Card style={{ gap: 8 }}>
        <Tag tone="warm">MYTH OR FACT?</Tag>
        <Txt style={{ fontFamily: font.displayMed, fontSize: 15, color: colors.ink }}>{card.myth}</Txt>
      </Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TrueFalseButton label="Myth" state={tfState(false, answered, card.isTrue)} onPress={answered === null ? () => pick(false) : undefined} />
        <TrueFalseButton label="Fact" state={tfState(true, answered, card.isTrue)} onPress={answered === null ? () => pick(true) : undefined} />
      </View>
      {answered !== null ? (
        <Card>
          <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === card.isTrue ? colors.greenDark : colors.pinkDark }}>
            {answered === card.isTrue ? 'Correct!' : `Actually, that's ${card.isTrue ? 'a fact' : 'a myth'}.`}
          </Txt>
          <Txt variant="lead" style={{ fontSize: 13, marginTop: 4 }}>{card.explanation}</Txt>
        </Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── knowledgecheck ───────────────────────── */
function KnowledgecheckView({
  chapter, questions, onComplete, onAction, reactTo, reportKnowledgeCheck,
}: { chapter: KnowledgecheckChapter; questions: Question[]; onComplete: Complete } & ReactProps & ActionProps & Pick<ReportProps, 'reportKnowledgeCheck'>) {
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const question = questions[chapter.qIndices[i]];
  const answered = sel !== null;
  const right = question ? sel === question.correct : false;
  const last = i + 1 >= chapter.qIndices.length;

  const pick = (idx: number) => {
    setSel(idx);
    const isCorrect = question ? idx === question.correct : false;
    reactTo(isCorrect);
    if (question) reportKnowledgeCheck(question.q, isCorrect);
  };
  const next = () => {
    if (last) { onComplete(0, right); return; }
    setI(i + 1);
    setSel(null);
  };

  useEffect(() => {
    onAction(answered ? { label: last ? 'Continue →' : 'Next question', onPress: next, variant: right ? 'green' : 'pink' } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, last, right]);

  if (!question) return null;
  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{question.q}</Txt>
      <View style={{ gap: 10 }}>
        {question.opts.map((c, idx) => {
          const st = !answered ? 'default' : idx === question.correct ? 'correct' : idx === sel ? 'wrong' : 'default';
          return (
            <Option
              key={c}
              label={c}
              control="radio"
              state={st}
              onPress={() => !answered && pick(idx)}
              right={st === 'correct' ? <Feather name="check" size={20} color={colors.greenDark} /> : st === 'wrong' ? <Feather name="x" size={20} color={colors.danger} /> : undefined}
            />
          );
        })}
      </View>
      {answered ? (
        <Card><Txt variant="lead" style={{ fontSize: 13 }}>{question.exp}</Txt></Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── simulator ───────────────────────── */
function SimulatorView({ chapter, onComplete, onAction }: { chapter: SimulatorChapter; onComplete: Complete } & ActionProps) {
  // meterKey/meterMin/meterMax are missing on 2/22 real chapters — fall back to a plain 0-100 score.
  const meterKey = chapter.meterKey ?? 'score';
  const meterMin = chapter.meterMin ?? 0;
  const meterMax = chapter.meterMax ?? 100;
  const [meter, setMeter] = useState((meterMin + meterMax) / 2);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<string[]>([]);

  const apply = (d: SimulatorChapter['decisions'][number]) => {
    setMeter((m) => Math.min(meterMax, Math.max(meterMin, m + d.scoreDelta)));
    setUsed((prev) => new Set(prev).add(d.id));
    setNotes((prev) => [...prev, d.note]);
  };
  const pct = (meter - meterMin) / (meterMax - meterMin);

  useEffect(() => {
    onAction(used.size > 0 ? { label: 'Continue →', onPress: () => onComplete(chapter.xpOnComplete ?? 0) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [used.size]);

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 6 }}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5, textTransform: 'uppercase' }}>{meterKey}</Txt>
        <Txt style={{ fontFamily: font.display, fontSize: 28, color: colors.greenDark }}>{Math.round(meter)}</Txt>
        <ProgressBar value={pct} height={9} />
      </Card>
      <View style={{ gap: 10 }}>
        {chapter.decisions.map((d) => (
          <Option key={d.id} label={d.label} state={used.has(d.id) ? 'on' : 'default'} onPress={() => !used.has(d.id) && apply(d)} />
        ))}
      </View>
      {notes.length ? (
        <Card style={{ gap: 6 }}>
          {notes.map((n, idx) => <Txt key={idx} variant="lead" style={{ fontSize: 12.5 }}>{n}</Txt>)}
        </Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── bossbattle ───────────────────────── */
function BossbattleView({
  chapter, moduleXpReward, onComplete, onAction, reportDecision,
}: { chapter: BossbattleChapter; moduleXpReward: number; onComplete: Complete } & ActionProps & Pick<ReportProps, 'reportDecision'>) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  const pick = (c: BossbattleChapter['choices'][number]) => {
    setPickedId(c.id);
    reportDecision('Boss battle', c.label);
  };
  useEffect(() => {
    // Ported verbatim from finishQuest: bossXP = Math.round(module.xpReward * xpMultiplier).
    onAction(picked ? { label: 'Finish quest →', onPress: () => onComplete(Math.round(moduleXpReward * picked.consequence.xpMultiplier)) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);
  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Tag tone="warm">⚔ BOSS CHALLENGE</Tag>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.scenario}</Txt>
      {!picked ? (
        <View style={{ gap: 10 }}>
          {chapter.choices.map((c) => (
            <Option key={c.id} label={c.label} onPress={() => pick(c)} />
          ))}
        </View>
      ) : (
        <Card><Txt variant="lead" style={{ fontSize: 14, color: colors.ink }}>{picked.consequence.text}</Txt></Card>
      )}
    </View>
  );
}

/* ───────────────────────── spotcheck ───────────────────────── */
function SpotcheckView({ chapter, onComplete, onAction }: { chapter: SpotcheckChapter; onComplete: Complete } & ActionProps) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  useEffect(() => {
    onAction(revealed ? { label: 'Continue →', onPress: () => onComplete(0) } : { label: 'Check my answers', onPress: () => setRevealed(true) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 10 }}>
        <Txt style={styles.term}>{chapter.postingTitle}</Txt>
        {chapter.segments.map((s) => {
          const isFlagged = flagged.has(s.id);
          const showResult = revealed;
          return (
            <Pressable key={s.id} disabled={revealed} onPress={() => toggle(s.id)}>
              <View style={[
                styles.segment,
                isFlagged && styles.segmentFlagged,
                showResult && s.isRedFlag && styles.segmentBad,
                showResult && !s.isRedFlag && isFlagged && styles.segmentOk,
              ]}>
                <Txt style={{ fontFamily: font.semi, fontSize: 13, color: colors.ink }}>{s.text}</Txt>
                {showResult ? <Txt variant="lead" style={{ fontSize: 12, marginTop: 4 }}>{s.explanation}</Txt> : null}
              </View>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

/* ───────────────────────── priceisright ───────────────────────── */
function PriceisrightView({
  chapter, onComplete, onAction, reactTo,
}: { chapter: PriceisrightChapter; onComplete: Complete } & ReactProps & ActionProps) {
  const { min, max, step } = chapter.guessRange;
  const [guess, setGuess] = useState(Math.round((min + max) / 2 / step) * step);
  const [submitted, setSubmitted] = useState(false);
  const diff = Math.abs(guess - chapter.actualValue);
  const close = diff <= (max - min) * 0.1;

  const submit = () => { setSubmitted(true); reactTo(close); };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Continue →', onPress: () => onComplete(chapter.xpOnComplete ?? 0, close) }
      : { label: 'Lock in my guess', onPress: submit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, guess]);

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      <Card style={{ gap: 8, alignItems: 'center' }}>
        <Txt style={{ fontFamily: font.display, fontSize: 32, color: colors.ink }}>${guess}</Txt>
        <RNSlider
          style={{ width: '100%' }}
          minimumValue={min} maximumValue={max} step={step} value={guess} disabled={submitted}
          onValueChange={setGuess}
          minimumTrackTintColor={colors.green} maximumTrackTintColor={colors.track} thumbTintColor={colors.green}
        />
      </Card>
      {submitted ? (
        <Card>
          <Txt style={{ fontFamily: font.bold, fontSize: 13, color: close ? colors.greenDark : colors.pinkDark }}>
            {close ? 'Close enough!' : `Actual: $${chapter.actualValue}`}
          </Txt>
          <Txt variant="lead" style={{ fontSize: 13, marginTop: 4 }}>{chapter.explanation}</Txt>
        </Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── explainback ───────────────────────── */
function ExplainbackView({
  chapter, onComplete, onAction, reportExplainback,
}: { chapter: ExplainbackChapter; onComplete: Complete } & ActionProps & Pick<ReportProps, 'reportExplainback'>) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const hitKeywords = chapter.keywords.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  // Thresholds ported verbatim from app.js's explainback grading (renderExplainbackChapter).
  const submit = () => {
    setSubmitted(true);
    const tier = hitKeywords.length >= 2 ? 'great' : hitKeywords.length === 1 ? 'ok' : 'retry';
    reportExplainback(chapter.title || 'In Your Own Words', tier);
  };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Continue →', onPress: () => onComplete(chapter.xpOnComplete ?? 0) }
      : { label: 'Check my answer', onPress: submit, disabled: !text.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, text]);

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      <TextInput
        style={styles.input}
        multiline
        editable={!submitted}
        value={text}
        onChangeText={setText}
        placeholder="Explain it in your own words…"
        placeholderTextColor={colors.muted6}
      />
      {submitted ? (
        <Card style={{ gap: 6 }}>
          <Txt style={{ fontFamily: font.bold, fontSize: 13, color: colors.greenDark }}>
            {hitKeywords.length ? `Nice — you covered: ${hitKeywords.join(', ')}` : "Here's the full picture:"}
          </Txt>
          <Txt variant="lead" style={{ fontSize: 13 }}>{chapter.fullDefinition}</Txt>
        </Card>
      ) : null}
    </View>
  );
}

/* ───────────────────────── urlinspect ───────────────────────── */
function UrlinspectView({ chapter, onComplete, onAction }: { chapter: UrlinspectChapter; onComplete: Complete } & ActionProps) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  useEffect(() => {
    onAction(revealed ? { label: 'Continue →', onPress: () => onComplete(0) } : { label: 'Reveal the risky parts', onPress: () => setRevealed(true) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return (
    <View style={{ gap: 14, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {chapter.parts.map((p) => {
            const isFlagged = flagged.has(p.id);
            return (
              <Pressable key={p.id} disabled={revealed} onPress={() => toggle(p.id)}>
                <Txt style={[
                  styles.urlPart,
                  isFlagged && styles.urlPartFlagged,
                  revealed && p.isSuspicious && styles.urlPartBad,
                ]}>
                  {p.segment}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </Card>
      {revealed ? (
        <Card style={{ gap: 8 }}>
          {chapter.parts.filter((p) => p.isSuspicious).map((p) => (
            <Txt key={p.id} variant="lead" style={{ fontSize: 12.5 }}>• {p.note}</Txt>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stick: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1.5, borderBottomColor: '#EFEFE7',
  },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  actionBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  hintWrap: { position: 'relative' },
  hintFab: {
    minWidth: 34, height: 30, paddingHorizontal: 8, borderRadius: 15,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.borderCool,
    alignItems: 'center', justifyContent: 'center',
  },
  hintFabDisabled: { opacity: 0.4 },
  hintFabTxt: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  hintPopover: {
    position: 'absolute', top: 38, right: 0, width: 230, zIndex: 30, elevation: 8,
    backgroundColor: colors.pinkBg, borderColor: colors.pinkBorder,
  },
  tfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10,
  },
  tfBtnTxt: { fontFamily: font.extra, fontSize: 15 },
  companionWrap: { alignItems: 'center', paddingTop: 4, paddingBottom: 2, gap: 4 },
  // Height is set imperatively once the bubble's real content is measured (see
  // ReactionBubble's onLayout) and only ever grows — sized to fit whatever's actually
  // inside instead of a guessed fixed height that left empty space under it.
  bubbleSlot: { width: '100%', alignItems: 'center' },
  bubbleInner: { alignItems: 'center' },
  bubbleSpeech: { flex: undefined, maxWidth: 300, paddingVertical: 12, paddingHorizontal: 16 },
  bubbleSpeechTxt: { fontSize: 15.5, lineHeight: 20 },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 28, gap: 14, flexGrow: 1 },
  term: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  matchChip: {
    borderWidth: 1.5, borderColor: colors.borderOpt, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.white,
  },
  matchChipOn: { borderColor: colors.green, backgroundColor: '#F1F6EF' },
  matchChipWrong: { borderColor: '#D98A9E', backgroundColor: colors.pinkBg2 },
  matchChipDone: { borderColor: colors.green, backgroundColor: colors.tagGreenBg, opacity: 0.6 },
  matchChipTxt: { fontFamily: font.semi, fontSize: 12.5, color: colors.ink },
  segment: { borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: colors.borderOpt },
  segmentFlagged: { borderColor: colors.pink, backgroundColor: colors.pinkBg2 },
  segmentBad: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  segmentOk: { borderColor: colors.lockBorder, backgroundColor: colors.lockBg },
  input: {
    borderWidth: 1.5, borderColor: colors.borderField, borderRadius: 16,
    padding: 14, minHeight: 100, fontFamily: font.semi, fontSize: 14, color: colors.ink,
    textAlignVertical: 'top',
  },
  urlPart: {
    fontFamily: font.bold, fontSize: 13, color: colors.ink,
    paddingVertical: 4, paddingHorizontal: 2,
  },
  urlPartFlagged: { backgroundColor: colors.pinkBg2, borderRadius: 4 },
  urlPartBad: { backgroundColor: colors.dangerBg, color: colors.danger, borderRadius: 4 },
});
