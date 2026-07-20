import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View, ScrollView, Pressable, PanResponder, TextInput, Modal, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import RNSlider from '@react-native-community/slider';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, Card, Tag, Hammy } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';
import type { LifeEvent } from '@/lifeEvents';
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

/** A vocab term the player has been taught so far this quest — ported from the website's
 * qp.learnedTerms (same {term, plain, section} shape end to end: pushLearnedTerm, the
 * live "look back" glossary tray, and the results-screen chip list all read off of this
 * one array). `section` is the chapter's own title, matching the website's exact grouping
 * (pushLearnedTerm(mod, c.term, c.plain, chapter.title)). */
type LearnedTerm = { term: string; plain: string; section: string };

/** Ported verbatim from app.js — a limited "Ask Hammy for a hint" budget available during
 * interactive chapters only, so getting stuck doesn't leave the student with nowhere to turn.
 * Separate from the 'hint' CHAPTER TYPE (Hammy's Tip, see HintView) — this is the small
 * always-available FAB used across other interactive chapters (renderHintBudget). */
const HINT_BUDGET = 3;
const HINT_FREE_CHAPTER_TYPES = new Set(['story', 'teach', 'hint']);

type HintProps = { hintsRemaining: number; onUseHint: () => void };
/** Reports right/wrong to the persistent companion Hammy (see showHammyReaction on the
 * website) so its face/message reacts — happy, gentle, or a 3-in-a-row streak callout. An
 * optional `customMsg` puts specific narration text in the bubble instead of a random
 * pick (ported from showHammyMessage — used by the simulator to narrate what a decision
 * actually does) and stays up longer (2.8s vs 1.4s), and doesn't touch the streak count. */
type ReactProps = {
  reactTo: (isCorrect: boolean, customMsg?: string, gentlePool?: string[]) => void;
  /** Cuts a still-showing reaction bubble/face short instead of waiting out its own 1.4-2.8s
   * timer — call this when a multi-step chapter (teach/knowledgecheck/mythcards) advances to
   * its NEXT concept/question/card. Without it, answering quickly enough could leave the
   * previous answer's "Not quite! Here's why:" (or its face) still up over a freshly-reset,
   * not-yet-answered new item — reads as Hammy commenting on nothing, or as his face going
   * blank/stale at a random moment when the old timer eventually fires mid-way through the
   * new item. Single-step-per-chapter views (poll, decision, ...) don't need this — their
   * "Next" always moves to a whole new CHAPTER, which already clears via the chapterIdx effect. */
  clearReaction: () => void;
};

/** A chapter's current primary action ("Next", "Check my answer", ...), or null when it has
 * nothing to show yet (e.g. a True/False chapter before it's answered). Lifted into the
 * header (top-right, next to the hint button) instead of trailing the chapter's own
 * content, so the primary action is always reachable without scrolling — every chapter
 * view reports its own action here instead of rendering a bottom button. Always a single
 * flat green unless a chapter opts into something else. */
type QuestAction = { label: string; onPress: () => void; variant?: 'green' | 'pink'; disabled?: boolean } | null;
type ActionProps = { onAction: (action: QuestAction) => void };

/** Reported by a chapter that wants the header-level companion Hammy hidden in favor of its
 * own big centered Hammy — the story chapter's intro beat, and the 'hint' chapter (Hammy's
 * Tip), which gates its reveal behind tapping that big centered Hammy directly instead of
 * the small side companion (ported from the website's renderHintChapter/.hammy-tappable).
 * Set on mount, cleared on unmount/change via the effect's own cleanup, so a later chapter
 * that never calls this can't get stuck inheriting 'intro' from whatever the previous
 * chapter last reported. */
type LayoutMode = 'normal' | 'intro';
type LayoutModeProps = { onLayoutMode: (mode: LayoutMode) => void };

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
/** Matching has no explanation to point to (it's just a retry, not a right-answer reveal),
 * so a wrong match gets its own phrasing instead of HAMMY_GENTLE_MSGS's "here's why" —
 * ported from the website's HAMMY_TRYAGAIN_MSGS. */
const HAMMY_TRYAGAIN_MSGS = ['Not quite, try again!', 'Close, give it another shot!', "Not quite, look at the definitions above if you're stuck."];
const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/** Hammy's reaction speech bubble, in the side column below him — ported from the website's
 * .hammy-side-msg (fades in/out with a small rise instead of popping instantly, and colors
 * green for a right answer / pink for wrong). Keeps showing the last message+mood while
 * fading out so there's text to fade from. The reserved slot's height is measured from the
 * bubble's own real layout and only ever grows to the tallest message seen so far. */
function ReactionBubble({ message, mood }: { message: string | null; mood: 'happy' | 'gentle' | 'streak' | null }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(message);
  const [displayMood, setDisplayMood] = useState(mood);
  useEffect(() => {
    if (message) { setDisplay(message); setDisplayMood(mood); }
    Animated.timing(anim, { toValue: message ? 1 : 0, duration: 250, easing: Easing.ease, useNativeDriver: true }).start(() => {
      if (!message) setDisplay(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, anim]);
  const textColor = displayMood === 'gentle' ? colors.pinkDark : displayMood ? colors.greenDark : colors.inkSoft;
  return (
    // bubbleSlot's height is a fixed minHeight (see styles), reserved from the very first
    // render whether or not a message is showing — it used to only grow to fit once a
    // message's real height was measured after the fact, which visibly pushed the content
    // below down the first time Hammy ever had something to say.
    <View style={styles.bubbleSlot} pointerEvents="none">
      {display ? (
        <Animated.View
          style={[styles.bubbleInner, { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
        >
          <View style={styles.reactionBox}>
            <Txt style={[styles.reactionTxt, { color: textColor }]} numberOfLines={4}>{display}</Txt>
            {/* A literal speech-bubble tail pointing at Hammy (he sits just to the right of
                this bubble) — two stacked right-pointing triangles, the outer one the box's
                own border color and slightly larger, so a thin rim of it peeks past the
                inner white one, matching the box's own border stroke. */}
            <View style={styles.reactionTailBorder} />
            <View style={styles.reactionTailFill} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Screen 17 (extended) — Quest player. Renders the website's full multi-chapter quest
 * content (story/teach/matching/decision/microsim/etc — all 15 chapter types) instead of
 * the flat single-quiz flow, one chapter at a time. Hammy lives in a fixed side column
 * (matching the website's two-column .quest-layout) so the content column beside him stays
 * put — dialogue, questions and choices don't have to share scroll space with him. */
export default function QuestPlayer() {
  const router = useRouter();
  const { equippedMascotItems, rollAmbientLifeEvent, pendingLifeEvent, resolveLifeEvent } = useStore();
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
  const [terms, setTerms] = useState<LearnedTerm[]>([]);
  const [bossWon, setBossWon] = useState(false);
  const [reactionMood, setReactionMood] = useState<'happy' | 'gentle' | 'streak' | null>(null);
  const [reactionMsg, setReactionMsg] = useState<string | null>(null);
  const [reactionKey, setReactionKey] = useState(0);
  const [answerStreak, setAnswerStreak] = useState(0);
  // Each chapter view remounts on chapter change (see ChapterView's key={chapter.id} below)
  // and reports its own fresh action on mount, so no separate reset-on-chapterIdx effect is
  // needed here — a sibling effect that clears `action` would fire AFTER the child's mount
  // effect (React flushes passive effects child-before-parent), permanently wiping out any
  // action a chapter reports immediately on mount.
  const [action, setAction] = useState<QuestAction>(null);
  const onAction = (a: QuestAction) => setAction(a);
  // Only the story chapter's intro beat and the 'hint' chapter (Hammy's Tip, which now
  // shows its own big centered/tappable Hammy instead of the small side companion) ever
  // report 'intro'; every other chapter type leaves this at its default, and each of those
  // views resets it back to 'normal' on its own unmount — same reset-on-cleanup pattern
  // used elsewhere in this file — so nothing here can get stuck on the wrong layout.
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('normal');
  const onLayoutMode = (m: LayoutMode) => setLayoutMode(m);
  // An ambient life event (see rollAmbientLifeEvent) pauses a mid-quest chapter transition
  // the same way the website's maybeTriggerAmbientLifeEvent pauses its own "next" handlers
  // — the chapter doesn't actually advance until the event is dismissed. pendingAdvanceRef
  // (not state) holds that deferred transition since it's a plain callback, not something
  // that needs to trigger a render itself.
  const [ambientEventActive, setAmbientEventActive] = useState(false);
  const pendingAdvanceRef = useRef<(() => void) | null>(null);
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

  // Ported from showHammyReaction/showHammyMessage: the persistent companion's face/mood
  // reacts to every graded answer across the quest — happy, gentle, or (every 3rd correct
  // in a row) a streak callout. reactionKey bumps on every call (even repeat-same-mood) so
  // the body bounce/wobble replays each time, mirroring the website forcing its CSS
  // animation to restart.
  //
  // Mood and message clear together on the SAME timer (this is the actual fix the website
  // itself documents — see its showHammyReaction/showHammyMessage comments: they used to
  // clear on different timers, "leaving Hammy blank-faced under a still-visible message",
  // which is exactly what was reported here as "Hammy's face goes blank in the matching
  // portion." The fix is a synced revert, not making the face permanently sticky — Hammy
  // reacts, then reverts cleanly to the default face a beat later, every time.
  const reactionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reactionTimeout.current) clearTimeout(reactionTimeout.current); }, []);
  useEffect(() => {
    // Also clears any still-pending timeout from the previous chapter's last reactTo call
    // — without this, a stale timeout could still be sitting there ready to fire later
    // (harmless on its own, since it only sets already-null values back to null, but it's
    // dead weight this effect should have owned clearing in the first place).
    if (reactionTimeout.current) { clearTimeout(reactionTimeout.current); reactionTimeout.current = null; }
    setReactionMood(null);
    setReactionMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdx]);
  const reactTo = (isCorrect: boolean, customMsg?: string, gentlePool?: string[]) => {
    let msg: string;
    if (customMsg) {
      msg = customMsg;
      setReactionMood(isCorrect ? 'happy' : 'gentle');
    } else {
      const nextStreak = isCorrect ? answerStreak + 1 : 0;
      setAnswerStreak(nextStreak);
      const isStreak = isCorrect && nextStreak > 0 && nextStreak % 3 === 0;
      setReactionMood(isCorrect ? (isStreak ? 'streak' : 'happy') : 'gentle');
      msg = isStreak ? `🎉 ${nextStreak} in a row! You're on fire!` : isCorrect ? pickRandom(HAMMY_CORRECT_MSGS) : pickRandom(gentlePool ?? HAMMY_GENTLE_MSGS);
    }
    setReactionMsg(msg);
    setReactionKey((k) => k + 1);
    if (reactionTimeout.current) clearTimeout(reactionTimeout.current);
    reactionTimeout.current = setTimeout(() => {
      setReactionMood(null);
      setReactionMsg(null);
      reactionTimeout.current = null;
    }, customMsg ? 2800 : 1400);
  };
  const clearReaction = () => {
    if (reactionTimeout.current) { clearTimeout(reactionTimeout.current); reactionTimeout.current = null; }
    setReactionMood(null);
    setReactionMsg(null);
  };

  const onComplete: Complete = (xpDelta, graded) => {
    const nextXp = xpEarned + xpDelta;
    const nextCorrect = correctCount + (graded ? 1 : 0);
    const nextGraded = gradedTotal + (graded !== undefined ? 1 : 0);
    const known = new Set(terms.map((t) => t.term));
    const nextTerms = chapter.type === 'matching'
      ? [...terms, ...chapter.pairs.filter((p) => !known.has(p.term)).map((p) => ({ term: p.term, plain: p.definition, section: chapter.title }))]
      : chapter.type === 'teach'
        ? [...terms, ...chapter.concepts.filter((c) => !known.has(c.term)).map((c) => ({ term: c.term, plain: c.plain, section: chapter.title }))]
        : terms;
    const nextBossWon = bossWon || chapter.type === 'bossbattle';
    const isFinalChapter = chapterIdx + 1 >= quest.chapters.length;

    const advance = () => {
      if (isFinalChapter) {
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

    // Ambient random life events (ported from the website's maybeTriggerAmbientLifeEvent)
    // interrupt ordinary mid-quest chapter transitions, same as the site checks between
    // quiz questions / decision steps — not the final chapter though, since finishing the
    // whole lesson already has its own guaranteed-unlock + ambient roll (store.completeLesson,
    // surfaced via the results screen's own life-event hop); rolling here too would risk
    // double-firing one right after the other.
    if (!isFinalChapter && rollAmbientLifeEvent()) {
      pendingAdvanceRef.current = advance;
      setAmbientEventActive(true);
    } else {
      advance();
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="x" size={34} iconSize={16} onPress={goBack} />
        <ProgressBar value={chapterIdx / quest.chapters.length} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>{Math.round((chapterIdx / quest.chapters.length) * 100)}%</Txt>
        <HintCorner key={chapter.id} hintText={hintText} hintsRemaining={hintsRemaining} onUseHint={onUseHint} />
      </View>
      {/* Everything below shares one "header zone" so the chapter's own action button can
          float in its top-right corner (position: absolute) instead of claiming a whole
          row of its own — reclaims a full row of vertical space on every single chapter.
          minHeight only kicks in for the 'intro' layout (story intro / Hammy's Tip), where
          the companion row/glossary tray are hidden and there'd otherwise be nothing in
          this zone to reserve room for the floating button against. */}
      <View style={[styles.headerZone, layoutMode === 'intro' && styles.headerZoneIntro]}>
        {/* "Look back" glossary tray — ported from the website's #glossary-tray. Hidden
            during a big-centered-Hammy 'intro' screen same as the companion row, and
            naturally absent until the first teach/matching chapter has taught a term. */}
        {terms.length > 0 && layoutMode !== 'intro' ? <GlossaryTray terms={terms} /> : null}
        {/* Companion row — hidden during a story chapter's intro beat or a 'hint' chapter,
            both of which show their own big centered Hammy in the content area instead
            (see StoryView/HintView). hammyStage holds ONLY Hammy in normal flow, so
            centering it centers Hammy himself; the reaction bubble is a positioned overlay
            hugging his left side, not a flex sibling — it no longer has to fight for actual
            centering the way a shared flex row did. */}
        {layoutMode !== 'intro' ? (
          <View style={styles.companionWrap}>
            <View style={styles.hammyStage}>
              <ReactionBubble message={reactionMsg} mood={reactionMood} />
              <Hammy
                size={130}
                bob
                equipped={equippedMascotItems()}
                face={reactionMood ? REACTION_FACES[reactionMood] : undefined}
                reaction={reactionMood}
                reactionKey={reactionKey}
              />
            </View>
          </View>
        ) : null}
        {/* The chapter's own primary action ("Next", "Check my answer", ...), reported up
            via onAction. Floating instead of its own row is also why it never has to
            scroll to reach — it's always pinned to this same spot. Always flat green
            unless a chapter opts into a different variant. */}
        {action ? (
          <View style={styles.actionBarFloat}>
            <Button
              label={action.label}
              onPress={action.onPress}
              variant={action.variant ?? 'green'}
              disabled={action.disabled}
              size="sm"
              style={{ paddingHorizontal: 20 }}
            />
          </View>
        ) : null}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ChapterView
          key={chapter.id}
          chapter={chapter}
          questions={content.questions}
          moduleXpReward={content.xpReward}
          charName={quest.character.name}
          onComplete={onComplete}
          reactTo={reactTo}
          clearReaction={clearReaction}
          onAction={onAction}
          onLayoutMode={onLayoutMode}
          {...reportProps}
        />
      </ScrollView>
      {ambientEventActive ? (
        <AmbientLifeEventModal
          pendingLifeEvent={pendingLifeEvent}
          resolveLifeEvent={resolveLifeEvent}
          onDone={() => {
            setAmbientEventActive(false);
            const advance = pendingAdvanceRef.current;
            pendingAdvanceRef.current = null;
            advance?.();
          }}
        />
      ) : null}
    </Screen>
  );
}

function ChapterView({
  chapter, questions, moduleXpReward, charName, onComplete, reactTo, clearReaction, onAction, onLayoutMode,
  reportKnowledgeCheck, reportMythCard, reportMatchingMistake, reportDecision, reportExplainback,
}: {
  chapter: Chapter; questions: Question[]; moduleXpReward: number; charName: string; onComplete: Complete;
} & ReactProps & ReportProps & ActionProps & LayoutModeProps) {
  const reactProps: ReactProps = { reactTo, clearReaction };
  switch (chapter.type) {
    case 'story': return <StoryView chapter={chapter} charName={charName} onComplete={onComplete} onAction={onAction} onLayoutMode={onLayoutMode} />;
    case 'teach': return <TeachView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'matching': return <MatchingView chapter={chapter} onComplete={onComplete} {...reactProps} reportMatchingMistake={reportMatchingMistake} />;
    case 'hint': return <HintView chapter={chapter} onComplete={onComplete} onAction={onAction} onLayoutMode={onLayoutMode} />;
    case 'decision': return <DecisionView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportDecision={reportDecision} />;
    case 'microsim': return <MicrosimView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'poll': return <PollView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'mythcards': return <MythcardsView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportMythCard={reportMythCard} />;
    case 'knowledgecheck': return <KnowledgecheckView chapter={chapter} questions={questions} onComplete={onComplete} onAction={onAction} {...reactProps} reportKnowledgeCheck={reportKnowledgeCheck} />;
    case 'simulator': return <SimulatorView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'bossbattle': return <BossbattleView chapter={chapter} moduleXpReward={moduleXpReward} onComplete={onComplete} onAction={onAction} {...reactProps} reportDecision={reportDecision} />;
    case 'spotcheck': return <SpotcheckView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'priceisright': return <PriceisrightView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'explainback': return <ExplainbackView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportExplainback={reportExplainback} />;
    case 'urlinspect': return <UrlinspectView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    default: return null;
  }
}

/** True/False (or Myth/Fact) choice button — ported from the website's `.option-btn`
 * correct/wrong treatment (app.css), used for every true/false-shaped chapter (teach's
 * inline check, poll). Once answered, BOTH buttons recolor: whichever one holds the
 * correct answer turns green regardless of which was tapped, and the player's own wrong
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
    setOpen(true);
  };
  return (
    <>
      <Pressable
        style={[styles.hintFab, hintsRemaining <= 0 && !revealed && styles.hintFabDisabled]}
        disabled={hintsRemaining <= 0 && !revealed}
        onPress={press}
      >
        <Txt style={styles.hintFabTxt}>{revealed ? '💡 HINT' : `💡 HINT ${hintsRemaining}`}</Txt>
      </Pressable>
      {/* A real Modal instead of an anchored popover — Modal renders as its own top-level
          overlay outside the normal view tree, so it always sits above everything else
          regardless of DOM/paint order. The previous position:absolute popover was
          reported rendering behind Hammy/content instead of on top of it. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.hintScrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.hintModalCard} onPress={(e) => e.stopPropagation()}>
            <Tag tone="pink">🐷 HAMMY'S HINT</Tag>
            <Txt variant="lead" style={{ fontSize: 14, marginTop: 8 }}>{hintText}</Txt>
            <Button label="Got it" onPress={() => setOpen(false)} style={{ marginTop: 16 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Ambient random "Life happens…" popup, ported from the website's showLifeEvent — but
 * rendered right here as a local overlay (not a route push like the post-lesson version in
 * app/modal/life-event.tsx) so dismissing it just resumes the quest exactly where it paused,
 * with no "where does this route go back to" navigation to reason about. The event is
 * captured once via useState's lazy initializer at mount (QuestPlayer only ever mounts this
 * while ambientEventActive is true, remounting fresh each time), so it keeps showing through
 * the choice+result even after resolveLifeEvent clears state.pendingLifeEventId. */
function AmbientLifeEventModal({
  onDone, pendingLifeEvent, resolveLifeEvent,
}: { onDone: () => void; pendingLifeEvent: () => LifeEvent | null; resolveLifeEvent: (choiceId: string) => void }) {
  const [event] = useState(() => pendingLifeEvent());
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const answeredChoice = event?.choices.find((c) => c.id === answeredId);

  const pick = (choiceId: string) => {
    setAnsweredId(choiceId);
    resolveLifeEvent(choiceId);
  };

  if (!event) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.ambientLifeRoot}>
        <View style={[StyleSheet.absoluteFill, styles.ambientLifeScrim]} />
        <View style={styles.ambientLifeSheet}>
          <View style={styles.ambientLifeHandle} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={styles.ambientLifeEmoji}>
              <Txt style={{ fontSize: 34 }}>{answeredChoice ? (answeredChoice.coinDelta ? '🎉' : '😬') : '⚠️'}</Txt>
            </View>
            <Tag tone="warm" style={{ marginTop: 4 }}>✨ {event.tag.toUpperCase()}</Tag>
            <Txt variant="disp" style={{ fontSize: 18, marginTop: 2, textAlign: 'center' }}>{event.title}</Txt>
            <Txt variant="lead" style={{ textAlign: 'center', fontSize: 13.5 }}>
              {answeredChoice ? answeredChoice.result : event.scenario}
            </Txt>
          </View>
          {!answeredChoice ? (
            <View style={{ gap: 10, marginTop: 16 }}>
              {event.choices.map((c) => (
                <Option
                  key={c.id}
                  label={c.label}
                  state="default"
                  onPress={() => pick(c.id)}
                  right={c.coinDelta ? <Tag tone="green">🪙 +{c.coinDelta}</Tag> : undefined}
                />
              ))}
            </View>
          ) : (
            <Button label="Continue" onPress={onDone} style={{ marginTop: 14 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

/** "Look back" glossary tray — ported from the website's renderGlossaryTray/
 * showGlossarySectionPopup/showGlossaryPopup. Terms taught so far this quest, grouped by
 * the chapter they came from (so a long lesson doesn't turn into one giant wall of chips):
 * tap a section chip to see the words in it, tap a word to see its definition again, with a
 * way back to that section's list so re-checking a few words in a row doesn't mean
 * re-opening the tray each time. */
function GlossaryTray({ terms }: { terms: LearnedTerm[] }) {
  const [openSectionName, setOpenSectionName] = useState<string | null>(null);
  const [openTerm, setOpenTerm] = useState<LearnedTerm | null>(null);

  // Group into sections, preserving the order each section was first encountered.
  const sections = useMemo(() => {
    const list: { name: string; terms: LearnedTerm[] }[] = [];
    for (const t of terms) {
      let s = list.find((sec) => sec.name === t.section);
      if (!s) { s = { name: t.section, terms: [] }; list.push(s); }
      s.terms.push(t);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms.length]);
  const activeSection = sections.find((s) => s.name === openSectionName) ?? null;

  const closeAll = () => { setOpenTerm(null); setOpenSectionName(null); };

  return (
    <>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.glossaryTray} contentContainerStyle={styles.glossaryTrayContent}
      >
        <Txt style={styles.glossaryLabel}>📖 Look back:</Txt>
        {sections.map((s) => (
          <Pressable key={s.name} onPress={() => setOpenSectionName(s.name)} style={styles.glossaryChip}>
            <Txt style={styles.glossaryChipTxt}>{s.name}</Txt>
            <View style={styles.glossaryCount}><Txt style={styles.glossaryCountTxt}>{s.terms.length}</Txt></View>
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={!!activeSection} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.hintScrim} onPress={closeAll}>
          <Pressable style={styles.glossaryPopupCard} onPress={(e) => e.stopPropagation()}>
            {openTerm ? (
              <>
                <Pressable onPress={() => setOpenTerm(null)} hitSlop={8}>
                  <Txt style={styles.glossaryBackLink}>← Back to {openTerm.section}</Txt>
                </Pressable>
                <Txt style={styles.glossaryPopupTerm}>{openTerm.term}</Txt>
                <Txt style={styles.glossaryPopupDef}>{openTerm.plain}</Txt>
                <Button label="Got it" onPress={closeAll} style={{ marginTop: 16 }} />
              </>
            ) : activeSection ? (
              <>
                <Txt style={styles.glossaryPopupTitle}>{activeSection.name}</Txt>
                <View style={styles.glossaryWordGrid}>
                  {activeSection.terms.map((t) => (
                    // Strips a trailing parenthetical qualifier for the chip label only (the
                    // full term still shows on the definition screen) — ported verbatim from
                    // the website's chip.textContent = t.term.replace(/\s*\(.*?\)/, '').
                    <Pressable key={t.term} onPress={() => setOpenTerm(t)} style={styles.glossaryWordChip}>
                      <Txt style={styles.glossaryWordChipTxt}>{t.term.replace(/\s*\(.*?\)/, '')}</Txt>
                    </Pressable>
                  ))}
                </View>
                <Button label="Close" variant="ghost" onPress={closeAll} style={{ marginTop: 16 }} />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ───────────────────────── story ───────────────────────── */
/** One beat per screen, "Next" reveals the next line — ported from renderStoryChapter.
 * Speaker-styled: Hammy (or the story's protagonist/"intro" establishing beats) gets a
 * pig-head avatar and a white bordered bubble; the narrator gets no avatar at all and a
 * plain, muted, italic box — so it never reads as Hammy narrating. */
/** Hammy's actual illustrated head (not an emoji) — the same SVG the rest of the app uses,
 * rendered oversized inside a small clipped circle and shifted so only the head fills it,
 * roughly matching the website's getHammyFaceMarkup crop of the same pig. */
/** A square region of Hammy's 440x460 SVG stage containing the head AND ears — cropped by a
 * CIRCLE (the avatar's borderRadius: size/2), not the square itself, so what actually has to
 * fit is the circle inscribed in this square (center = x+size/2,y+size/2; radius = size/2).
 * Two constraints, both against Hammy.tsx's own shape coordinates:
 *  - top: the ears (translate(106/270, 54), ~64x74 boxes) sit near the square's top
 *    corners, which the previous crop's circle didn't reach — clipping them off.
 *  - bottom: the head ellipse (cx=220,cy=198,rx=138,ry=124) ends at y=322; the body ellipse
 *    (cy=287,ry=125, drawn BEHIND the head in z-order) is visible everywhere below that —
 *    the previous crop's circle bottom (y=326) reached past it, showing a sliver of
 *    body/tummy that read as a visible "neck". No amount of shifting fixes both at once with
 *    the OLD crop's radius — it has to shrink until the whole circle sits inside [ears-top,
 *    head-bottom]: center (220,158), radius 158 clears the ears' top corners (~154px out)
 *    with a few px of margin, and its bottom edge (y=316) stays a few px above the head's
 *    own bottom edge (y=322) — the head ellipse itself fully occludes the body up to y=322,
 *    so nothing below the chin is ever in frame. */
const HEAD_CROP = { x: 62, y: 0, size: 316 };

function HammyHeadAvatar({ size = 40 }: { size?: number }) {
  const scale = size / HEAD_CROP.size;
  return (
    <View style={[styles.storyAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Hammy
        size={440 * scale}
        bob={false}
        style={{ position: 'absolute', left: -HEAD_CROP.x * scale, top: -HEAD_CROP.y * scale }}
      />
    </View>
  );
}

function StoryView({
  chapter, charName, onComplete, onAction, onLayoutMode,
}: { chapter: StoryChapter; charName: string; onComplete: Complete } & ActionProps & LayoutModeProps) {
  // Every real story chapter's first beat is a scene-setting "intro" line (not a quoted
  // line of dialogue, unlike the beats after it) — used as the standalone intro screen's
  // context sentence instead of being folded into the dialogue log, so it isn't shown
  // twice. Falls back to treating every beat as dialogue (no intro screen) on the rare
  // chapter that doesn't lead with one.
  const hasIntro = chapter.beats.length > 0 && chapter.beats[0].speaker === 'intro';
  const introBeat = hasIntro ? chapter.beats[0] : null;
  const dialogueBeats = hasIntro ? chapter.beats.slice(1) : chapter.beats;
  const [showIntro, setShowIntro] = useState(hasIntro);
  const [i, setI] = useState(0);
  const last = i + 1 >= dialogueBeats.length;

  useEffect(() => {
    onLayoutMode(showIntro ? 'intro' : 'normal');
    return () => onLayoutMode('normal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro]);

  useEffect(() => {
    if (showIntro) {
      // A chapter that's nothing but its intro beat (no dialogue after it) completes
      // straight from the intro screen instead of flashing an empty dialogue screen.
      onAction({ label: 'Next', onPress: () => (dialogueBeats.length === 0 ? onComplete(0) : setShowIntro(false)) });
    } else {
      onAction({ label: 'Next', onPress: () => (last ? onComplete(0) : setI(i + 1)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro, i, last]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
      {chapter.title ? <Txt style={styles.storyTitle}>{chapter.title}</Txt> : null}
      {showIntro ? (
        <View style={styles.storyIntroStage}>
          <Hammy size={220} bob />
          {introBeat ? <Txt style={styles.storyIntroCaption}>{introBeat.text}</Txt> : null}
        </View>
      ) : (
        // Beats accumulate on screen as a running conversation log instead of replacing
        // each other — ported from renderStoryChapter ("nothing disappears when the
        // student clicks Next, so they can never lose track of what's already been said").
        dialogueBeats.slice(0, i + 1).map((beat, idx) => {
          const isNarrator = beat.speaker === 'narrator';
          const isHammy = beat.speaker === charName || beat.speaker === 'intro';
          return (
            <View key={idx} style={styles.storyBeat}>
              {!isNarrator ? (isHammy ? <HammyHeadAvatar /> : (
                <View style={styles.storyAvatar}>
                  <Txt style={styles.storyAvatarTxt}>{beat.speaker.charAt(0)}</Txt>
                </View>
              )) : null}
              <View style={[styles.storyBubble, isNarrator && styles.storyBubbleNarrator]}>
                <Txt style={[styles.storyBubbleTxt, isNarrator && styles.storyBubbleNarratorTxt]}>{beat.text}</Txt>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ───────────────────────── teach ───────────────────────── */
function TeachView({
  chapter, onComplete, onAction, reactTo, clearReaction,
}: { chapter: TeachChapter; onComplete: Complete } & ReactProps & ActionProps) {
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
    // Cuts a still-showing reaction bubble/face short instead of letting it linger over the
    // next, not-yet-answered concept until its own timer happens to fire — see ReactProps.
    clearReaction();
    setI(i + 1);
    setAnswered(null);
  };

  useEffect(() => {
    onAction(!hasCheck || answered !== null ? { label: last ? 'Next' : 'Got it', onPress: next } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheck, answered, last]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
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
    reactTo(correct, undefined, HAMMY_TRYAGAIN_MSGS);
    if (!correct) reportMatchingMistake();
    if (correct) {
      const next = new Set(matched); next.add(selTerm);
      setMatched(next);
      setSelTerm(null);
      // Long enough for Hammy's "Nice! 🎉" reaction bubble to actually be seen (it fades in
      // over 250ms) before the chapter transitions out from under it — at the old 400ms the
      // final correct match could advance almost before the bubble finished appearing,
      // reading as "Hammy didn't say anything."
      if (next.size === chapter.pairs.length) setTimeout(() => onComplete(chapter.xpOnComplete ?? 0), 950);
    } else {
      setWrongPair(def);
      setTimeout(() => { setWrongPair(null); setSelTerm(null); }, 500);
    }
  };

  return (
    <View style={{ gap: 10 }}>
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

/* ───────────────────────── hint (Hammy's Tip) ───────────────────────── */
/** Ported from renderHintChapter: the tip stays hidden behind a placeholder until the
 * player taps Hammy himself — now a big centered Hammy right here in the content (same
 * 'intro' layout StoryView's intro screen uses), not the small side companion, so tapping
 * him reads as a deliberate, prominent gesture instead of poking at a small far-off icon. */
function HintView({
  chapter, onComplete, onAction, onLayoutMode,
}: { chapter: HintChapter; onComplete: Complete } & ActionProps & LayoutModeProps) {
  const [revealed, setRevealed] = useState(false);
  const [tapTick, setTapTick] = useState(0);

  useEffect(() => {
    onLayoutMode('intro');
    return () => onLayoutMode('normal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onAction(revealed ? { label: 'Got it', onPress: () => onComplete(chapter.xpOnComplete ?? 0) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  const tap = () => {
    if (revealed) return;
    setRevealed(true);
    setTapTick((t) => t + 1);
  };

  return (
    <View style={styles.storyIntroStage}>
      <Pressable onPress={tap} disabled={revealed} hitSlop={14}>
        <Hammy size={168} bob reaction={revealed ? 'happy' : null} reactionKey={tapTick} />
      </Pressable>
      {/* A literal speech bubble pointing up at Hammy — same border-triangle tail trick as
          the in-quest reaction bubble, just rotated to point up instead of sideways since
          Hammy sits directly above this instead of beside it. */}
      <View style={styles.tipBubble}>
        <View style={styles.tipBubbleTailBorder} />
        <View style={styles.tipBubbleTailFill} />
        <Tag tone="warm">{chapter.tag || "🐷 Hammy's Tip"}</Tag>
        {revealed ? (
          <Txt style={[styles.storyIntroCaption, { marginTop: 8 }]}>{chapter.text}</Txt>
        ) : (
          <Txt style={[styles.storyIntroCaption, { marginTop: 8, color: colors.muted3, fontStyle: 'italic' }]}>
            Tap Hammy to hear what they have to say.
          </Txt>
        )}
      </View>
    </View>
  );
}

/* ───────────────────────── decision ───────────────────────── */
function DecisionView({
  chapter, onComplete, onAction, reactTo, reportDecision,
}: { chapter: DecisionChapter; onComplete: Complete } & ActionProps & ReactProps & Pick<ReportProps, 'reportDecision'>) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  const pick = (c: DecisionChapter['choices'][number]) => {
    setPickedId(c.id);
    reportDecision(chapter.title, c.label);
    const deltaSum = Object.values(c.outcome.delta).reduce((a: number, b) => a + (b ?? 0), 0);
    reactTo(deltaSum >= 0);
  };
  useEffect(() => {
    onAction(picked ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);
  return (
    <View style={{ gap: 10, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      {!picked ? (
        <View style={{ gap: 10 }}>
          {chapter.choices.map((c) => (
            <Option key={c.id} label={c.label} onPress={() => pick(c)} />
          ))}
        </View>
      ) : (
        <Card style={{ gap: 12 }}>
          <Txt variant="lead" style={{ fontSize: 14, color: colors.ink }}>{picked.outcome.text}</Txt>
          {/* Ported from the website's renderDecisionOutcome pg-column-chart — a real
              comparison chart instead of just prose, e.g. "saved this check" vs. "take-home
              pay" as two bars. Only some decision chapters carry `compare` data. */}
          {picked.outcome.compare ? <ColumnChart data={picked.outcome.compare} /> : null}
        </Card>
      )}
    </View>
  );
}

/** Vertical bar/column chart — ported from the website's .pg-column-chart (bars scaled to
 * the largest value in the set, value label on top, category label below). Currently used
 * by DecisionView's outcome comparisons; a generic enough shape to reuse elsewhere. */
function ColumnChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.columnChart}>
      {data.map((d) => (
        <View key={d.label} style={styles.columnChartCol}>
          <Txt style={styles.columnChartVal}>${d.value}</Txt>
          <View style={styles.columnChartBarWrap}>
            <View style={[styles.columnChartBar, { height: `${Math.max(4, (d.value / max) * 100)}%` }]} />
          </View>
          <Txt style={styles.columnChartName}>{d.label}</Txt>
        </View>
      ))}
    </View>
  );
}

/* ───────────────────────── microsim ───────────────────────── */
function MicrosimView({ chapter, onComplete, onAction, reactTo }: { chapter: MicrosimChapter; onComplete: Complete } & ActionProps & ReactProps) {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(chapter.sliders.map((s) => [s.id, s.default])),
  );
  const [submitted, setSubmitted] = useState(false);
  const fixedTotal = chapter.fixedCosts.reduce((s, f) => s + f.amount, 0);
  const variableTotal = chapter.sliders.reduce((s, sl) => s + (values[sl.id] ?? 0), 0);
  const leftover = chapter.income - fixedTotal - variableTotal;
  // maxLeftover is null on the catch-all (highest) tier — treat as +Infinity, not 0, when sorting/matching.
  const cap = (v: number | null) => (v === null ? Infinity : v);
  const tier = [...chapter.feedbackTiers].sort((a, b) => cap(a.maxLeftover) - cap(b.maxLeftover)).find((t) => leftover <= cap(t.maxLeftover))
    ?? chapter.feedbackTiers[chapter.feedbackTiers.length - 1];

  // Ported from the website's lockBudget — Hammy reacts the moment the budget is locked in,
  // same as every other graded chapter type. Mobile had never actually wired this one up.
  // tier.text as the spoken message (not just a generic "Nice!"/"Not quite!") so Hammy
  // actually explains why the split worked or didn't, matching what's shown in the card
  // below instead of leaving the reasoning to text-only.
  const submit = () => { setSubmitted(true); reactTo(tier.ok, tier.text); };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) }
      : { label: 'See how you did', onPress: submit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, tier.ok]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
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
      <Card style={{ gap: 11 }}>
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
    onAction(answered !== null ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0, answered === chapter.isTrue) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);
  return (
    <View style={{ gap: 10, flex: 1 }}>
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

/* ───────────────────────── mythcards (swipeable flashcards) ───────────────────────── */
/** Ported from initMythCardStack: swipe right for true, left for false. The card follows
 * the drag with a subtle rotation and its border tints green/pink once the drag clears a
 * small threshold, then flips to reveal the answer on release past the commit threshold —
 * it does NOT auto-advance, the player reads at their own pace and taps "Next card." */
const MYTH_SWIPE_COMMIT = 90;
const MYTH_SWIPE_TINT = 30;

function MythcardsView({
  chapter, onComplete, onAction, reactTo, clearReaction, reportMythCard,
}: { chapter: MythcardsChapter; onComplete: Complete } & ReactProps & ActionProps & Pick<ReportProps, 'reportMythCard'>) {
  const [i, setI] = useState(0);
  const [resolved, setResolved] = useState<{ guessedTrue: boolean; guessedRight: boolean } | null>(null);
  const [correctSoFar, setCorrectSoFar] = useState(0);
  const [dragDir, setDragDir] = useState<'true' | 'false' | null>(null);
  const card = chapter.cards[i];
  const last = i + 1 >= chapter.cards.length;
  const pan = useRef(new Animated.ValueXY()).current;

  const commit = (guessedTrue: boolean) => {
    const guessedRight = guessedTrue === card.isTrue;
    // Snap straight back to center instead of springing to a small offset — a spring can
    // get interrupted or (especially with mouse-emulated touch, e.g. desktop devtools'
    // mobile-view toggle) never resolve at all if release doesn't fire cleanly, which
    // could leave the card stuck wherever the drag left it, off-screen. An instant reset
    // has nothing to fail: the revealed answer is always exactly where the card started.
    pan.setValue({ x: 0, y: 0 });
    setDragDir(null);
    setResolved({ guessedTrue, guessedRight });
    if (guessedRight) setCorrectSoFar((c) => c + 1);
    reactTo(guessedRight);
    reportMythCard(card.myth, guessedRight);
  };

  // Recreated per card (not per render) so each new card starts from a clean pan/drag
  // state — panHandlers are only attached while unresolved (see the Animated.View below),
  // so there's no need to gate on `resolved` inside the responder itself.
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6,
    onPanResponderMove: (_, g) => {
      pan.setValue({ x: g.dx, y: 0 });
      setDragDir(g.dx > MYTH_SWIPE_TINT ? 'true' : g.dx < -MYTH_SWIPE_TINT ? 'false' : null);
    },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > MYTH_SWIPE_COMMIT) {
        commit(g.dx > 0);
      } else {
        setDragDir(null);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start();
      }
    },
    // If something else steals the gesture mid-drag (e.g. the page's own scroll) instead
    // of a clean release, snap back immediately rather than leaving the card wherever the
    // drag left off.
    onPanResponderTerminate: () => {
      setDragDir(null);
      pan.setValue({ x: 0, y: 0 });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [i]);

  const next = () => {
    if (last) { onComplete((chapter.xpPerCorrect ?? 0) * correctSoFar, true); return; }
    // Cuts a still-showing reaction bubble/face short instead of letting it linger over the
    // next, unresolved card until its own timer happens to fire — see ReactProps.
    clearReaction();
    pan.setValue({ x: 0, y: 0 });
    setDragDir(null);
    setResolved(null);
    setI(i + 1);
  };

  useEffect(() => {
    onAction(resolved ? { label: last ? 'Next' : 'Next card', onPress: next } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, last]);

  // Once resolved, the card snaps straight (0deg) instead of holding a tilt — read-length
  // text (the myth, the explanation) is meaningably harder to read at an angle, so legibility
  // wins over keeping a visual hint of which way was swiped.
  const rotate = resolved
    ? '0deg'
    : pan.x.interpolate({ inputRange: [-220, 0, 220], outputRange: ['-14deg', '0deg', '14deg'] });
  const borderColor = resolved
    ? (resolved.guessedTrue ? colors.green : '#D98A9E')
    : dragDir === 'true' ? colors.green : dragDir === 'false' ? '#D98A9E' : colors.borderOpt;

  return (
    <View style={{ gap: 10 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 13.5 }}>
        Read the card, then swipe right if you think it&apos;s <Txt style={{ fontFamily: font.extra }}>true</Txt>, left if you think
        it&apos;s <Txt style={{ fontFamily: font.extra }}>false</Txt>. Take your time — the answer stays on screen until you&apos;re
        ready to move on.
      </Txt>
      <Txt style={styles.mythProgress}>Card {i + 1} of {chapter.cards.length}</Txt>
      <View style={styles.mythStack}>
        <Animated.View
          {...(resolved ? {} : panResponder.panHandlers)}
          style={[styles.mythCard, { borderColor, transform: [{ translateX: pan.x }, { rotate }] }]}
        >
          {!resolved ? (
            <>
              <Tag tone="warm">TRUE OR FALSE?</Tag>
              <Txt style={styles.mythCardTxt}>{card.myth}</Txt>
              <Txt style={styles.mythSwipeHint}>← False   ·   True →</Txt>
            </>
          ) : (
            <>
              <Tag tone={resolved.guessedTrue ? 'green' : 'pink'}>{card.isTrue ? 'TRUE' : 'FALSE'}</Tag>
              <Txt style={[styles.mythGuessLine, { color: resolved.guessedRight ? colors.greenDark : colors.pinkDark }]}>
                You said {resolved.guessedTrue ? 'True' : 'False'}, {resolved.guessedRight ? 'and that is right.' : 'not quite.'}
              </Txt>
              <Txt variant="lead" style={{ fontSize: 13 }}>{card.explanation}</Txt>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

/* ───────────────────────── knowledgecheck ───────────────────────── */
const OPT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function KnowledgecheckView({
  chapter, questions, onComplete, onAction, reactTo, clearReaction, reportKnowledgeCheck,
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
    // A wrong answer speaks the actual explanation (also shown in the card below) instead
    // of a generic "Not quite! Here's why:" — a right answer keeps the plain celebratory
    // pool, since "Nice! 🎉" doesn't need anything more said about it.
    reactTo(isCorrect, isCorrect ? undefined : question?.exp);
    if (question) reportKnowledgeCheck(question.q, isCorrect);
  };
  const next = () => {
    if (last) { onComplete(0, right); return; }
    // Cuts a still-showing reaction bubble/face short instead of letting it linger over the
    // next, not-yet-answered question until its own timer happens to fire — see ReactProps.
    clearReaction();
    setI(i + 1);
    setSel(null);
  };

  useEffect(() => {
    onAction(answered ? { label: last ? 'Next' : 'Next question', onPress: next } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, last]);

  if (!question) return null;
  return (
    <View style={{ gap: 10, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{question.q}</Txt>
      <View style={{ gap: 10 }}>
        {question.opts.map((c, idx) => {
          const st = !answered ? 'default' : idx === question.correct ? 'correct' : idx === sel ? 'wrong' : 'default';
          return (
            <Option
              key={c}
              label={c}
              control="letter"
              letter={OPT_LETTERS[idx]}
              state={st}
              onPress={() => !answered && pick(idx)}
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

/* ───────────────────────── simulator (credit-climb meter) ───────────────────────── */
/** Fixed pink→gold→green gradient track spanning the full width with a thin marker that
 * slides smoothly to the score's position — ported from the website's exact
 * .sim-meter-track/.sim-meter-marker (a scale with a needle, NOT a bar that fills). */
function MeterTrack({ pct, height = 14 }: { pct: number; height?: number }) {
  const clamped = Math.max(0, Math.min(1, pct));
  const anim = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [clamped, anim]);
  const left = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: height + 12, justifyContent: 'center' }}>
      <LinearGradient
        colors={[colors.pink, '#F2C879', colors.green]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ height, borderRadius: 999 }}
      />
      <Animated.View style={[styles.meterMarker, { height: height + 12, left }]} />
    </View>
  );
}

function SimulatorView({ chapter, onComplete, onAction, reactTo }: { chapter: SimulatorChapter; onComplete: Complete } & ActionProps & ReactProps) {
  // meterKey/meterMin/meterMax are missing on 2/22 real chapters — fall back to a plain 0-100 score.
  const meterKey = chapter.meterKey ?? 'score';
  const meterMin = chapter.meterMin ?? 0;
  const meterMax = chapter.meterMax ?? 100;
  const [meter, setMeter] = useState((meterMin + meterMax) / 2);
  const [used, setUsed] = useState<Set<string>>(new Set());

  const apply = (d: SimulatorChapter['decisions'][number]) => {
    setMeter((m) => Math.min(meterMax, Math.max(meterMin, m + d.scoreDelta)));
    setUsed((prev) => new Set(prev).add(d.id));
    // Hammy narrates the actual explanation for this decision (ported from
    // showHammyMessage) instead of a generic "Nice!"/"Not quite".
    reactTo(d.scoreDelta >= 0, d.note);
  };
  const pct = (meter - meterMin) / (meterMax - meterMin);

  useEffect(() => {
    onAction(used.size > 0 ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [used.size]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 4 }}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5, textTransform: 'uppercase' }}>{meterKey}</Txt>
        <Txt style={{ fontFamily: font.display, fontSize: 28, color: colors.greenDark }}>{Math.round(meter)}</Txt>
        <MeterTrack pct={pct} />
        <View style={styles.rowBetween}>
          <Txt style={styles.meterScaleTxt}>{meterMin}</Txt>
          <Txt style={styles.meterScaleTxt}>{meterMax}</Txt>
        </View>
      </Card>
      <View style={{ gap: 10 }}>
        {chapter.decisions.map((d) => (
          <Option key={d.id} label={d.label} state={used.has(d.id) ? 'on' : 'default'} onPress={() => !used.has(d.id) && apply(d)} />
        ))}
      </View>
    </View>
  );
}

/* ───────────────────────── bossbattle ───────────────────────── */
function BossbattleView({
  chapter, moduleXpReward, onComplete, onAction, reactTo, reportDecision,
}: { chapter: BossbattleChapter; moduleXpReward: number; onComplete: Complete } & ActionProps & ReactProps & Pick<ReportProps, 'reportDecision'>) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  const pick = (c: BossbattleChapter['choices'][number]) => {
    setPickedId(c.id);
    reportDecision('Boss battle', c.label);
    reactTo(c.consequence.xpMultiplier >= 1);
  };
  useEffect(() => {
    // Ported verbatim from finishQuest: bossXP = Math.round(module.xpReward * xpMultiplier).
    onAction(picked ? { label: 'Finish quest →', onPress: () => onComplete(Math.round(moduleXpReward * picked.consequence.xpMultiplier)) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);
  return (
    <View style={{ gap: 10, flex: 1 }}>
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
function SpotcheckView({ chapter, onComplete, onAction, reactTo }: { chapter: SpotcheckChapter; onComplete: Complete } & ActionProps & ReactProps) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const reveal = () => {
    setRevealed(true);
    const flags = chapter.segments.filter((s) => s.isRedFlag);
    const caughtCount = flags.filter((s) => flagged.has(s.id)).length;
    reactTo(caughtCount === flags.length);
  };

  useEffect(() => {
    onAction(revealed ? { label: 'Next', onPress: () => onComplete(0) } : { label: 'Check my answers', onPress: reveal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
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

  // chapter.explanation as the spoken message, same reasoning as Microsim's tier.text —
  // Hammy actually explains the real number instead of a generic "Nice!"/"Not quite!".
  const submit = () => { setSubmitted(true); reactTo(close, chapter.explanation); };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0, close) }
      : { label: 'Lock in my guess', onPress: submit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, guess]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
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
  chapter, onComplete, onAction, reactTo, reportExplainback,
}: { chapter: ExplainbackChapter; onComplete: Complete } & ActionProps & ReactProps & Pick<ReportProps, 'reportExplainback'>) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const hitKeywords = chapter.keywords.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  // Thresholds ported verbatim from app.js's explainback grading (renderExplainbackChapter).
  const submit = () => {
    setSubmitted(true);
    const tier = hitKeywords.length >= 2 ? 'great' : hitKeywords.length === 1 ? 'ok' : 'retry';
    reportExplainback(chapter.title || 'In Your Own Words', tier);
    reactTo(hitKeywords.length >= 1);
  };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) }
      : { label: 'Check my answer', onPress: submit, disabled: !text.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, text]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
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
function UrlinspectView({ chapter, onComplete, onAction, reactTo }: { chapter: UrlinspectChapter; onComplete: Complete } & ActionProps & ReactProps) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const reveal = () => {
    setRevealed(true);
    const suspicious = chapter.parts.filter((p) => p.isSuspicious);
    const caughtCount = suspicious.filter((p) => flagged.has(p.id)).length;
    reactTo(caughtCount === suspicious.length);
  };

  useEffect(() => {
    onAction(revealed ? { label: 'Next', onPress: () => onComplete(0) } : { label: 'Reveal the risky parts', onPress: reveal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return (
    <View style={{ gap: 10, flex: 1 }}>
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
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 9,
    borderBottomWidth: 1.5, borderBottomColor: '#EFEFE7',
  },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  // Shared container for the glossary tray / companion row / floating action button — see
  // the big comment at its call site. position: relative so actionBarFloat below can anchor
  // to it. minHeight (headerZoneIntro) only applies for the 'intro' layout, where it'd
  // otherwise be the ONLY thing determining this zone's height (everything else in it is
  // hidden), and the floating button needs a floor to be positioned within.
  headerZone: { position: 'relative' },
  headerZoneIntro: { minHeight: 50 },
  // Floats over headerZone's top-right corner instead of claiming a full row of its own —
  // reclaims that whole row's height on every chapter (the single biggest lever pulled for
  // "reduce scrolling" — a real ~50px back on every single screen, not just spacing trims).
  actionBarFloat: { position: 'absolute', top: 4, right: 16 },
  hintFab: {
    minWidth: 34, height: 30, paddingHorizontal: 8, borderRadius: 15,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.borderCool,
    alignItems: 'center', justifyContent: 'center',
  },
  hintFabDisabled: { opacity: 0.4 },
  hintFabTxt: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  hintScrim: { flex: 1, backgroundColor: 'rgba(22,32,23,0.55)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  hintModalCard: {
    width: '100%', maxWidth: 340, backgroundColor: colors.pinkBg, borderWidth: 1.5,
    borderColor: colors.pinkBorder, borderRadius: 20, padding: 20,
  },
  // "Look back" glossary tray — a single-line horizontal scroller so it costs minimal
  // vertical space even with several sections taught so far.
  glossaryTray: { maxHeight: 34, flexGrow: 0 },
  glossaryTrayContent: { alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  glossaryLabel: { fontFamily: font.bold, fontSize: 12, color: colors.muted5 },
  glossaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: colors.borderCool, borderRadius: 14,
    paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.white,
  },
  glossaryChipTxt: { fontFamily: font.bold, fontSize: 11.5, color: colors.ink },
  glossaryCount: {
    minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.screen,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  glossaryCountTxt: { fontFamily: font.bold, fontSize: 10, color: colors.muted3 },
  glossaryPopupCard: {
    width: '100%', maxWidth: 360, maxHeight: '75%', backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, padding: 20,
  },
  glossaryPopupTitle: { fontFamily: font.display, fontSize: 17, color: colors.ink, marginBottom: 12 },
  glossaryWordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  glossaryWordChip: {
    borderWidth: 1.5, borderColor: colors.borderOpt, borderRadius: 14,
    paddingVertical: 9, paddingHorizontal: 12, backgroundColor: colors.screen,
  },
  glossaryWordChipTxt: { fontFamily: font.semi, fontSize: 12.5, color: colors.ink },
  glossaryBackLink: { fontFamily: font.bold, fontSize: 12.5, color: colors.green, marginBottom: 10 },
  glossaryPopupTerm: { fontFamily: font.display, fontSize: 18, color: colors.ink },
  glossaryPopupDef: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.muted1, marginTop: 6 },
  // Decision-outcome comparison chart.
  columnChart: { flexDirection: 'row', gap: 16, alignItems: 'flex-end', paddingTop: 4 },
  columnChartCol: { flex: 1, alignItems: 'center', gap: 5 },
  columnChartVal: { fontFamily: font.bold, fontSize: 12.5, color: colors.ink },
  columnChartBarWrap: {
    width: '68%', height: 92, justifyContent: 'flex-end',
    backgroundColor: colors.screen, borderRadius: 6, overflow: 'hidden',
  },
  columnChartBar: { width: '100%', backgroundColor: colors.green, borderRadius: 6 },
  columnChartName: { fontFamily: font.semi, fontSize: 10.5, color: colors.muted3, textAlign: 'center' },
  tfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10,
  },
  tfBtnTxt: { fontFamily: font.extra, fontSize: 15 },
  // alignItems: 'center' centers hammyStage — Hammy himself, truly, this time (the reaction
  // bubble no longer shares this flex row at all, see hammyStage/bubbleSlot below, so it
  // can't pull him off-center the way a shared row did). Extra paddingTop clears space
  // below the header so Hammy's reaction bounce/jump (see Hammy.tsx's reactY, up to -30)
  // never visually collides with the floating action button.
  companionWrap: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  // Holds ONLY Hammy in normal flow — its size IS Hammy's size, nothing else. The reaction
  // bubble is positioned absolutely against it (see bubbleSlot), so it can sit right next to
  // him without being a layout sibling that would fight his centering.
  hammyStage: { position: 'relative' },
  // right: '100%' parks the bubble's right edge at hammyStage's own left edge (i.e. Hammy's
  // left edge) regardless of Hammy's exact pixel width; marginRight adds the gap. top/bottom
  // 0 stretches it to Hammy's full height so justifyContent: 'center' vertically centers the
  // actual bubble within that — no measuring or magic numbers needed either way. Being fully
  // out of flow also means the bubble growing for a longer message can never shift anything
  // else on screen, which used to be a real problem when it was a flex sibling.
  bubbleSlot: {
    position: 'absolute', top: 0, bottom: 0, right: '100%', marginRight: 10,
    width: 200, justifyContent: 'center', alignItems: 'flex-end',
  },
  bubbleInner: { alignItems: 'flex-end' },
  reactionBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16,
  },
  reactionTxt: { fontFamily: font.bold, fontSize: 15.5, lineHeight: 20 },
  // A literal speech-bubble tail on the box's right edge, pointing at Hammy — the classic
  // border-triangle trick (colored left border, transparent top/bottom, zero width/height).
  // Two stacked triangles (a larger border-colored one behind, a smaller white one in
  // front) fake the box's own 1.5px stroke carrying around the point.
  reactionTailBorder: {
    position: 'absolute', top: '50%', right: -9, marginTop: -7,
    width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 9,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: colors.border,
  },
  reactionTailFill: {
    position: 'absolute', top: '50%', right: -6.5, marginTop: -5.8,
    width: 0, height: 0, borderTopWidth: 5.8, borderBottomWidth: 5.8, borderLeftWidth: 7.5,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: colors.white,
  },
  // Story chapter title — pink, and rendered in the exact same spot whether the intro
  // screen or the dialogue log is showing, so it visibly stays put across the transition.
  storyTitle: { fontFamily: font.display, fontSize: 19, color: colors.pinkDark },
  storyIntroStage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 24 },
  storyIntroCaption: {
    fontFamily: font.semi, fontSize: 17.5, lineHeight: 24, color: colors.ink,
    textAlign: 'center', maxWidth: 320,
  },
  // Hammy's Tip (funfact) speech bubble — a white bordered card with an upward-pointing
  // tail (Hammy sits directly above it, unlike the sideways reaction bubble).
  tipBubble: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, marginTop: 10,
    alignItems: 'center', maxWidth: 340,
  },
  tipBubbleTailBorder: {
    position: 'absolute', top: -11, left: '50%', marginLeft: -11,
    width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 13,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.border,
  },
  tipBubbleTailFill: {
    position: 'absolute', top: -8.5, left: '50%', marginLeft: -9,
    width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 10.5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.white,
  },
  // Ambient mid-quest life-event overlay — a bottom sheet, matching the post-lesson
  // route's own life-event screen so the two read as the same feature.
  ambientLifeRoot: { flex: 1, justifyContent: 'flex-end' },
  ambientLifeScrim: { backgroundColor: 'rgba(22,32,23,0.62)' },
  ambientLifeSheet: {
    backgroundColor: colors.screen, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 22, paddingTop: 10, paddingBottom: 34,
  },
  ambientLifeHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#D6DFCF', alignSelf: 'center', marginBottom: 16 },
  ambientLifeEmoji: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#F9E6C6',
    alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#FBF3E4',
  },
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20, gap: 12, flexGrow: 1 },
  term: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  // Story beats — speaker-styled: white bordered bubble + pig-head avatar for Hammy, a
  // plain muted italic box with no avatar for the narrator (ported from .story-bubble /
  // .story-bubble.narrator / .story-avatar).
  storyBeat: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  storyAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.screen,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
  },
  storyAvatarTxt: { fontSize: 18 },
  storyBubble: {
    flex: 1, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.borderOpt,
    borderRadius: 16, padding: 14,
  },
  storyBubbleTxt: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 20, color: colors.ink },
  storyBubbleNarrator: { backgroundColor: colors.screen, borderColor: colors.border },
  storyBubbleNarratorTxt: { fontFamily: font.medium, fontStyle: 'italic', color: colors.muted2 },
  matchChip: {
    borderWidth: 1.5, borderColor: colors.borderOpt, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.white,
  },
  matchChipOn: { borderColor: colors.green, backgroundColor: '#F1F6EF' },
  matchChipWrong: { borderColor: '#D98A9E', backgroundColor: colors.pinkBg2 },
  matchChipDone: { borderColor: colors.green, backgroundColor: colors.tagGreenBg, opacity: 0.6 },
  matchChipTxt: { fontFamily: font.semi, fontSize: 12.5, color: colors.ink },
  // Myth/fact swipeable flashcards.
  mythStack: { alignItems: 'center', paddingVertical: 4 },
  mythCard: {
    width: '100%', minHeight: 160, borderWidth: 2, borderRadius: 20,
    backgroundColor: colors.white, padding: 18, gap: 10, justifyContent: 'center',
  },
  mythProgress: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted5 },
  mythCardTxt: { fontFamily: font.displayMed, fontSize: 16, color: colors.ink, lineHeight: 22 },
  mythSwipeHint: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted5, marginTop: 4 },
  mythGuessLine: { fontFamily: font.bold, fontSize: 13.5 },
  // Simulator meter marker — a thin needle sliding over the fixed gradient track.
  meterMarker: {
    position: 'absolute', top: 0, width: 3, marginLeft: -1.5,
    backgroundColor: colors.ink, borderRadius: 2,
  },
  meterScaleTxt: { fontFamily: font.bold, fontSize: 10.5, color: colors.muted5 },
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
