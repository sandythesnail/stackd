import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View, ScrollView, Pressable, PanResponder, TextInput, Modal, StyleSheet, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import Reanimated, { SlideInDown, FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import RNSlider from '@react-native-community/slider';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, Card, Tag, Hammy, LifeEventCard, ReactionFacePreloader } from '@/components';
import { colors, font, selectableInput } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import { useStore } from '@/store';
import { LIFE_EVENT_SHEET_MAX_HEIGHT_PCT } from '@/lifeEventLayout';
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
 * work on the website). Plain `boolean` is for chapters with exactly one graded item
 * (poll, priceisright, …) — a chapter that grades SEVERAL items in one pass
 * (knowledgecheck's several questions, mythcards' several cards) reports the
 * `{correct, total}` form instead of just the last item's result, so the headline score
 * this feeds into can't disagree with the per-item detail shown on the results screen. */
type Complete = (xpDelta: number, graded?: boolean | { correct: number; total: number }) => void;

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

/** Chapter types tall enough by construction that the companion Hammy would be competing
 * with the content for the screen: microsim stacks an income card, a card of sliders, a
 * running total and a feedback card ("Planning Around an Accurate W-4" is one of these);
 * simulator stacks a meter card on a list of decisions; spotcheck a whole posting whose
 * every segment can sprout an explanation. These always scroll, so Hammy steps aside and
 * lets the question have the screen.
 *
 * A fixed list of TYPES, not a measure-then-react rule — an earlier version hid him
 * whenever content happened to overflow, which pulled him off ordinary questions too and
 * made his presence unpredictable from one screen to the next. */
const TALL_CHAPTER_TYPES = new Set(['microsim', 'simulator', 'spotcheck']);

/* There used to be a second, MEASURED way to lose the companion: an allow-list of dense
 * chapter types (knowledgecheck, decision, bossbattle, mythcards, explainback, urlinspect,
 * priceisright) that started Hammy invisible-but-spaced, measured whether the laid-out
 * chapter overflowed, then either revealed him or collapsed his space.
 *
 * It's gone, because the invisible window WAS the "Hammy disappears for a second and comes
 * back" bug: the measurement is keyed per chapter, so every advance into one of those types
 * blanked him until the measurement landed (or until a 220ms fail-safe fired) — on every
 * Quick Check and every decision, not just on the rare chapter that genuinely overflowed.
 * Fading the reveal only made the gap smoother, not shorter.
 *
 * Chapters that don't fit now simply scroll, which they already did in every other respect.
 * TALL_CHAPTER_TYPES above still drops him, but that's a static per-type decision made before
 * the first paint, so it never flashes. */

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
 * nothing to show yet (e.g. a True/False chapter before it's answered). Lifted out of the
 * chapter's own content and into the screen's persistent bottom bar, so it always sits in
 * the same place at the bottom of every chapter — after everything there is to read, and
 * never somewhere the content has to be scrolled to reach. Every chapter view reports its
 * action here instead of rendering its own button. Always a single flat green unless a
 * chapter opts into something else. */
type QuestAction = { label: string; onPress: () => void; variant?: 'green' | 'pink'; disabled?: boolean } | null;
type ActionProps = { onAction: (action: QuestAction) => void };

/** Reported by a chapter that wants the header-level companion Hammy hidden in favor of its
 * own big centered Hammy — the story chapter's intro beat, and the 'hint' chapter (Hammy's
 * Tip), which gates its reveal behind tapping that big centered Hammy directly instead of
 * the small side companion (ported from the website's renderHintChapter/.hammy-tappable).
 * Set on mount, cleared on unmount/change via the effect's own cleanup, so a later chapter
 * that never calls this can't get stuck inheriting 'intro' from whatever the previous
 * chapter last reported. */
// 'full' hides the companion row + glossary tray same as 'intro', but leaves the content
// area as a plain scrollable list instead of a big centered Hammy stage — for a chapter
// dense enough (a full form walkthrough like the W-4) to be worth trading Hammy's header
// away for, see TeachChapter.fullScreen.
type LayoutMode = 'normal' | 'intro' | 'full';
type LayoutModeProps = { onLayoutMode: (mode: LayoutMode) => void };

/** The layout a chapter will ask for the moment it mounts, derived from the chapter itself.
 *
 * Each view reports its own mode from a mount effect, which runs a frame AFTER the chapter
 * first paints — so on entry the player briefly laid the chapter out in the OUTGOING mode.
 * Moving from Match It into Hammy's Tip, that meant one frame with the small companion
 * Hammy still mounted (and jumping from Match It's centered slot to the left-hand one)
 * before Hammy's Tip's own big Hammy replaced him: the flash of "Hammy glitching" on the
 * way into a tip. Seeding the mode from the chapter data closes that window; the views
 * still report as before, which is what drives the modes that change mid-chapter (the story
 * intro handing off to its dialogue log). */
/** Hint text for a teach chapter's true/false check.
 *
 * Not a single teach chapter in the content has an authored hintText — 0 of 329, while
 * knowledgecheck/decision/bossbattle are fully covered — so the hint button was permanently
 * dead on the true/false question, which is the most common graded question in the app. The
 * concept's own plain-English definition is sitting right there and is exactly what the
 * check is testing, so it's offered as the hint rather than leaving the button greyed out.
 *
 * Concepts with no check are informational, and get no hint (nothing to answer). TeachChapter
 * has no hintText field at all, so there's no authored value to prefer over this. */
function teachHint(chapter: TeachChapter, conceptIdx: number): string | undefined {
  const concept = chapter.concepts[conceptIdx];
  if (!concept?.check?.statement || !concept.plain) return undefined;
  return `Remember what ${concept.term} means — ${concept.plain}`;
}

function initialLayoutMode(chapter: Chapter): LayoutMode {
  // Hammy's Tip is always its own full stage with a big tappable Hammy (HintView).
  if (chapter.type === 'hint') return 'intro';
  // A story leads with its standalone intro screen whenever its first beat is scene-setting
  // rather than dialogue — the same test StoryView's own `hasIntro` makes.
  if (chapter.type === 'story') return chapter.beats[0]?.speaker === 'intro' ? 'intro' : 'normal';
  if (chapter.type === 'teach') return chapter.fullScreen ? 'full' : 'normal';
  return 'normal';
}

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

/** Banks a word in the Look-back book the instant it's taught — see quest.tsx's learnTerm.
 * Only the two chapter types that actually teach vocabulary take this (teach, matching). */
type LearnTermProps = { learnTerm: (t: LearnedTerm) => void };

/** Ported from app.js's HAMMY_CORRECT_MSGS/HAMMY_GENTLE_MSGS, plus "Good job!"/"Nice try!"
 * added to each pool per direct request. Only two celebration emoji in rotation — hands
 * and confetti — per direct request (no checkmark or others). */
const HAMMY_CORRECT_MSGS = ['Nice! 🎉', 'Nice one! 🙌', 'You got it! 🙌', 'Great job! 🎉', 'Good job! 🙌', 'Awesome! 🎉'];
const HAMMY_GENTLE_MSGS = ["Not quite! Here's why:", "Not quite, let's learn from it:", "Close! Here's what's true:", 'Nice try!'];
/** Matching has no explanation to point to (it's just a retry, not a right-answer reveal),
 * so a wrong match gets its own phrasing instead of HAMMY_GENTLE_MSGS's "here's why" —
 * ported from the website's HAMMY_TRYAGAIN_MSGS. */
// "below", not "above": Match It's definitions sit under the terms now.
const HAMMY_TRYAGAIN_MSGS = ['Not quite, try again!', 'Close, give it another shot!', "Not quite, look at the definitions below if you're stuck."];
const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/** Keeps a spoken reaction message short enough to never need truncating — the reaction
 * bubble is a small transient toast next to Hammy, not a place for a full paragraph (the
 * fuller explanation is always shown in the chapter's own content too). Takes just the
 * first sentence, then hard-caps it at a word boundary with no "…" if that's still too
 * long — an ellipsis reads as "there's more, go look elsewhere," which isn't true here;
 * this is the whole message, just shortened. */
function shortFeedback(text: string, maxLen = 60): string {
  const firstSentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
  const trimmed = firstSentence.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).replace(/\s+\S*$/, '');
}

/** Every one of the 22 "you did fine" microsim feedback tiers in the content opens with the
 * word "Solid" ("Solid. Hammy built this budget…", "Solid, taxes are covered…"). Hammy no
 * longer SAYS it (see MicrosimView's submit), but it was still the first word of the
 * feedback card itself. Swapped for the app's own "Good job!" at display time rather than
 * by editing modules.json, which is extracted verbatim from the website's data and is kept
 * that way so the two can be diffed against each other. Everything after the opener is left
 * exactly as written, just re-capitalised where the original ran on with a comma. */
function friendlyTierText(text: string): string {
  // The usual shape: "Solid" as a standalone opening verdict, punctuation and all.
  const opener = text.match(/^Solid\b[.,!]\s*/);
  if (opener) {
    const rest = text.slice(opener[0].length);
    return rest ? `Good job! ${rest.charAt(0).toUpperCase()}${rest.slice(1)}` : 'Good job!';
  }
  // "Solid recovery, …" — here it's an adjective on the next word, not a verdict, so
  // lifting it out would leave "Good job! Recovery, …". Swap the word itself instead.
  if (/^Solid\s+[a-z]/.test(text)) return text.replace(/^Solid\b/, 'Great');
  return text;
}

/** Hammy's reaction speech bubble — ported from the website's .hammy-side-msg (fades in/out
 * with a small rise instead of popping instantly, and colors green for a right answer /
 * pink for wrong), but centered directly above the companion rather than tucked off to one
 * side of him: when Hammy says "Good job!" the bubble now reads as coming from him, with a
 * tail pointing down at his head. Keeps showing the last message+mood while fading out so
 * there's text to fade from. */
function ReactionBubble({
  message, mood, centered = false,
}: {
  message: string | null;
  mood: 'happy' | 'gentle' | 'streak' | null;
  /** Sits above a centered Hammy with its tail pointing down at him, instead of beside a
   * left-aligned one with the tail pointing left. */
  centered?: boolean;
}) {
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
    <View style={centered ? styles.bubbleSlotCentered : styles.bubbleSlot} pointerEvents="none">
      {display ? (
        <Animated.View
          style={[
            centered ? styles.bubbleInnerCentered : styles.bubbleInner,
            { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
          ]}
        >
          <View style={styles.reactionBox}>
            {/* No numberOfLines/truncation here on purpose — every message that reaches
                this bubble is already kept short at the source (see shortFeedback), so
                there's nothing left that should ever need an ellipsis. */}
            <Txt style={[styles.reactionTxt, centered && styles.reactionTxtCentered, { color: textColor }]}>{display}</Txt>
            {/* A literal speech-bubble tail pointing at Hammy — two stacked triangles, the
                outer one the box's own border color and slightly larger, so a thin rim of it
                peeks past the inner white one, matching the box's own border stroke. Points
                down at him when he's centered below, left at him when he's beside it. */}
            <View style={centered ? styles.reactionTailDownBorder : styles.reactionTailBorder} />
            <View style={centered ? styles.reactionTailDownFill : styles.reactionTailFill} />
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
  // Which question a knowledgecheck chapter is currently showing — kept in sync via
  // KnowledgecheckView's onQuestionIndexChange, so the header's hint button can look up
  // that specific question's hintTexts entry (see hintText's computation below).
  const [kcQuestionIdx, setKcQuestionIdx] = useState(0);
  const [terms, setTerms] = useState<LearnedTerm[]>([]);
  // Mirrors `terms` synchronously. The final chapter's onComplete builds the results payload
  // in the same handler that can add the last word, and a setState isn't visible yet at that
  // point — same staleness dodge analyticsRef makes just below, for the same reason.
  const termsRef = useRef<LearnedTerm[]>([]);
  /** Puts a word in the Look-back book the moment it's actually taught.
   *
   * This used to happen in onComplete, i.e. only once the whole vocab/Match It chapter was
   * finished and left behind — so the book still read 0 while the student sat there reading
   * their first word, and every word landed one chapter later than it was learned. Now each
   * view calls this as it reveals a concept (or as a pair is matched), so 📖 ticks up in step
   * with the learning, first word included. Deduped by term: concepts are re-reported on
   * every re-render of a chapter, and the same word can be taught in more than one section. */
  const learnTerm = (t: LearnedTerm) => {
    if (termsRef.current.some((x) => x.term === t.term)) return;
    termsRef.current = [...termsRef.current, t];
    setTerms(termsRef.current);
  };
  const [bossWon, setBossWon] = useState(false);
  // Tagged with the chapter it belongs to. It used to be three loose values cleared by an
  // effect on chapterIdx, and an effect runs AFTER the new chapter has already rendered — so
  // the first frame of the next chapter still carried the last one's mood. On a chapter where
  // the companion was hidden, that was the first frame he existed: he mounted holding a
  // "gentle" reaction and played the wobble, so getting a question wrong with Hammy off
  // screen made him shake on arrival at the NEXT screen. Reading it per chapter means a
  // reaction simply doesn't exist outside the chapter that raised it.
  const [reaction, setReaction] = useState<
    { chapterIdx: number; mood: 'happy' | 'gentle' | 'streak'; msg: string; key: number } | null
  >(null);
  // Separate monotonic counter so repeat-same-mood reactions still replay the animation (see
  // Hammy's reactionKey) — it must not reset when a reaction is cleared.
  const reactionSeqRef = useRef(0);
  const [answerStreak, setAnswerStreak] = useState(0);
  // Each chapter view remounts on chapter change (see ChapterView's key={chapter.id} below)
  // and reports its own fresh action on mount, so no separate reset-on-chapterIdx effect is
  // needed here — a sibling effect that clears `action` would fire AFTER the child's mount
  // effect (React flushes passive effects child-before-parent), permanently wiping out any
  // action a chapter reports immediately on mount.
  const [action, setAction] = useState<QuestAction>(null);
  const onAction = (a: QuestAction) => setAction(a);
  // The bottom bar hands back a closure captured when the chapter reported this action.
  // Firing the SAME closure twice — a fast double-tap, or the web build delivering both a
  // synthetic touch and a click for one tap — re-runs an advance/onComplete that already
  // ran, which could double-count a chapter's XP and correct-answer tally or re-enter a
  // transition mid-flight and leave a multi-question chapter looking like it never moved.
  // Each action object may fire once; every chapter reports a brand-new object whenever its
  // state changes, so a legitimate second press is never blocked.
  const firedActionRef = useRef<QuestAction>(null);
  const fireAction = () => {
    if (!action || firedActionRef.current === action) return;
    firedActionRef.current = action;
    action.onPress();
  };
  // Only the story chapter's intro beat and the 'hint' chapter (Hammy's Tip, which now
  // shows its own big centered/tappable Hammy instead of the small side companion) ever
  // report 'intro'; every other chapter type leaves this at its default, and each of those
  // views resets it back to 'normal' on its own unmount — same reset-on-cleanup pattern
  // used elsewhere in this file — so nothing here can get stuck on the wrong layout.
  //
  // Tagged with the chapter it was reported for: until the incoming chapter reports its own
  // mode (a mount effect, one frame after it first paints) the mode falls back to what that
  // chapter is going to ask for anyway, rather than lingering on the outgoing chapter's.
  // See initialLayoutMode — that stale frame is what made Hammy flash on the way into a tip.
  // Keyed by chapter INDEX rather than chapter.id: ids are only unique by convention (they
  // repeat across quests) and nothing validates them, whereas the index is the actual
  // identity of the chapter being played. Same for longChapterIdx below.
  const [reportedLayout, setReportedLayout] = useState<{ chapterIdx: number; mode: LayoutMode } | null>(null);
  // An ambient life event (see rollAmbientLifeEvent) pauses a mid-quest chapter transition
  // the same way the website's maybeTriggerAmbientLifeEvent pauses its own "next" handlers
  // — the chapter doesn't actually advance until the event is dismissed. pendingAdvanceRef
  // (not state) holds that deferred transition since it's a plain callback, not something
  // that needs to trigger a render itself.
  const [ambientEventActive, setAmbientEventActive] = useState(false);
  const pendingAdvanceRef = useRef<(() => void) | null>(null);
  // The store's cooldown counts down per roll ATTEMPT (chapter transition), not per real app
  // session like the website's does — a long quest (13-15 chapters) can burn through that
  // 2-transition cooldown and roll a second popup in the same lesson. This ref caps it at
  // one fire per QuestPlayer mount, i.e. one per lesson, regardless of how many chapters
  // remain after that.
  const hasFiredAmbientRef = useRef(false);
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
  // knowledgecheck is the one chapter type whose hint text is PER-QUESTION (hintTexts[],
  // aligned to qIndices by position — see content/types.ts), not a single hintText like
  // every other chapter type. The generic cast below always resolved to undefined for
  // this type, so the hint button never rendered for any knowledge-check question even
  // though real authored hint content exists in the data for it (see KnowledgecheckView's
  // onQuestionIndexChange, which keeps kcQuestionIdx in sync with its internal question).
  const hintText = chapter.type === 'knowledgecheck'
    ? chapter.hintTexts?.[kcQuestionIdx]
    : chapter.type === 'teach'
      ? teachHint(chapter, kcQuestionIdx)
      : (chapter as { hintText?: string }).hintText;

  // Ported from showHammyReaction/showHammyMessage: the persistent companion's face/mood
  // reacts to every graded answer across the quest — happy, gentle, or (every 3rd correct
  // in a row) a streak callout. reactionKey bumps on every call (even repeat-same-mood) so
  // the body bounce/wobble replays each time, mirroring the website forcing its CSS
  // animation to restart.
  //
  // No auto-hide timer — the message/mood stay up (so the user has time to actually read
  // the feedback) until clearReaction() fires, which every chapter view already calls right
  // as it advances to the next question/concept (see e.g. TeachView/KnowledgecheckView's
  // next()). A chapter change drops it with no clearing step at all, since the reaction is
  // read per chapter (activeReaction below).
  useEffect(() => {
    setKcQuestionIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdx]);
  // Only the reaction raised by the chapter on screen counts — see `reaction`'s declaration.
  const activeReaction = reaction?.chapterIdx === chapterIdx ? reaction : null;
  const reactionMood = activeReaction?.mood ?? null;
  const reactionMsg = activeReaction?.msg ?? null;
  const reactionKey = activeReaction?.key ?? 0;
  const reactTo = (isCorrect: boolean, customMsg?: string, gentlePool?: string[]) => {
    let msg: string;
    let mood: 'happy' | 'gentle' | 'streak';
    if (customMsg) {
      msg = customMsg;
      mood = isCorrect ? 'happy' : 'gentle';
    } else {
      const nextStreak = isCorrect ? answerStreak + 1 : 0;
      setAnswerStreak(nextStreak);
      const isStreak = isCorrect && nextStreak > 0 && nextStreak % 3 === 0;
      mood = isCorrect ? (isStreak ? 'streak' : 'happy') : 'gentle';
      msg = isStreak ? `🎉 ${nextStreak} in a row! You're on fire!` : isCorrect ? pickRandom(HAMMY_CORRECT_MSGS) : pickRandom(gentlePool ?? HAMMY_GENTLE_MSGS);
    }
    reactionSeqRef.current += 1;
    setReaction({ chapterIdx, mood, msg, key: reactionSeqRef.current });
  };
  const clearReaction = () => setReaction(null);

  const onComplete: Complete = (xpDelta, graded) => {
    const nextXp = xpEarned + xpDelta;
    // See Complete's definition above: a multi-item chapter (knowledgecheck, mythcards)
    // reports its own {correct, total} instead of one flat point, so a chapter with (say)
    // 1 right out of 2 questions counts as 1/2 here too, not a full point for whichever
    // question happened to be graded last.
    const isTally = typeof graded === 'object' && graded !== null;
    const nextCorrect = correctCount + (isTally ? graded.correct : graded ? 1 : 0);
    const nextGraded = gradedTotal + (isTally ? graded.total : graded !== undefined ? 1 : 0);
    // Words are banked by learnTerm as they're taught, not swept up here on the way out —
    // see its comment. termsRef is read rather than `terms` so a word learned in this very
    // handler still makes the results payload.
    const nextBossWon = bossWon || chapter.type === 'bossbattle';
    const isFinalChapter = chapterIdx + 1 >= quest.chapters.length;

    const advance = () => {
      if (isFinalChapter) {
        setPendingQuestAnalytics({ ...analyticsRef.current, learnedTerms: termsRef.current });
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
      setBossWon(nextBossWon);
      setChapterIdx(chapterIdx + 1);
    };

    // Ambient random life events (ported from the website's maybeTriggerAmbientLifeEvent)
    // interrupt ordinary mid-quest chapter transitions, same as the site checks between
    // quiz questions / decision steps — not the final chapter though, since finishing the
    // whole lesson already has its own guaranteed-unlock + ambient roll (store.completeLesson,
    // surfaced via the results screen's own life-event hop); rolling here too would risk
    // double-firing one right after the other. Real-life sub-quests (isLifeTask, the
    // step-by-step guides in the Real Life tab) are excluded entirely — they're already a
    // real-world scenario walkthrough, so a random life-event popup mid-way doesn't fit.
    // hasFiredAmbientRef caps it at one popup per lesson (see its declaration above).
    if (!isLifeTask && !isFinalChapter && !hasFiredAmbientRef.current && rollAmbientLifeEvent()) {
      hasFiredAmbientRef.current = true;
      pendingAdvanceRef.current = advance;
      setAmbientEventActive(true);
    } else {
      advance();
    }
  };

  const layoutMode: LayoutMode = reportedLayout?.chapterIdx === chapterIdx
    ? reportedLayout.mode
    : initialLayoutMode(chapter);
  const onLayoutMode = (m: LayoutMode) => setReportedLayout({ chapterIdx, mode: m });

  // Hidden during a story chapter's intro beat or a 'hint' chapter, both of which already
  // show their own big Hammy in the content area instead (StoryView/HintView), so a second
  // one up here would just be a redundant duplicate; on the handful of chapter types that
  // are simply too tall to share a screen with him (see TALL_CHAPTER_TYPES) plus the dense
  // full-screen teach walkthroughs; and on an OVERFLOW_HIDEABLE_TYPES chapter that measured
  // taller than the screen.
  const showCompanion = layoutMode === 'normal' && !TALL_CHAPTER_TYPES.has(chapter.type);
  // Centered above the content, rather than off to its left, for the two chapter types
  // that read as a scene rather than a question: the story's dialogue (the conversation is
  // with him) and Match It (a centered grid).
  const companionCentered = chapter.type === 'story' || chapter.type === 'matching';
  // The story's dialogue log puts its title above the companion rather than at the top of
  // the scroller — the companion lives outside the scroller, so a heading rendered inside
  // StoryView always landed underneath him. Only the dialogue log; the intro screen keeps
  // its own title on its stage, directly above its big Hammy (see StoryView).
  const storyLogTitle = chapter.type === 'story' && layoutMode === 'normal' ? chapter.title : null;
  // Match It sits higher up the screen than the other centered chapter — Hammy tight under
  // the progress bar, and the grid lifted off centre rather than floating in the middle.
  const raised = chapter.type === 'matching';
  // Smaller on the vocab chapter, where the term card + its true/false check are what have to
  // fit without scrolling; a little bigger on Match It, which has room to spare.
  const companionSize = chapter.type === 'teach' ? 104 : chapter.type === 'matching' ? 144 : 130;

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Warms the three reaction faces' decode while the student is still on chapter 1, so
          the first graded answer already has its face ready — see Hammy.tsx. */}
      <ReactionFacePreloader />
      <View style={styles.stick}>
        <IconButton name="x" size={34} iconSize={16} onPress={goBack} />
        <ProgressBar value={chapterIdx / quest.chapters.length} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>{Math.round((chapterIdx / quest.chapters.length) * 100)}%</Txt>
        {/* Keyed per QUESTION, not just per chapter: a knowledge check runs several
            questions inside one chapter, each with its own authored hint, and a single
            instance carried its "already revealed" state across all of them — so question 2
            onward showed as pre-revealed and handed out its hint without spending budget.
            The fixed-width slot around it holds the space whether or not this chapter has a
            hint at all (only about a quarter of them do), so the progress bar and % beside
            it stop shifting as you move between chapters that have one and chapters that
            don't. */}
        <View style={styles.hintSlot}>
          <HintCorner
            key={`${chapter.id}:${kcQuestionIdx}`}
            hintText={hintText}
            hintsRemaining={hintsRemaining}
            onUseHint={onUseHint}
          />
        </View>
      </View>
      {storyLogTitle ? (
        <Txt style={[styles.storyTitle, styles.storyTitleAboveCompanion]}>{storyLogTitle}</Txt>
      ) : null}
      {/* Companion Hammy. Two arrangements: centered with his bubble above him (dialogue,
          Match It), or off to the left with the bubble beside him everywhere else. Either
          way the bubble is positioned relative to him, never the other way round. */}
      {showCompanion ? (
        <View style={[
          companionCentered ? styles.companionWrapCentered : styles.companionWrap,
          raised && styles.companionWrapRaised,
        ]}>
          {companionCentered ? <ReactionBubble message={reactionMsg} mood={reactionMood} centered /> : null}
          <Hammy
            size={companionSize}
            bob
            equipped={equippedMascotItems()}
            face={reactionMood ? REACTION_FACES[reactionMood] : undefined}
            reaction={reactionMood}
            reactionKey={reactionKey}
          />
          {companionCentered ? null : <ReactionBubble message={reactionMsg} mood={reactionMood} />}
        </View>
      ) : null}
      {/* One plain scroller for every chapter type. There used to be a second branch that
          shrank a chapter's content down to fit the viewport instead of scrolling, but
          scaling the screen is exactly what read as "the question minimizes" the moment an
          answer's explanation appeared — content that doesn't fit simply scrolls now. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          chapter.type === 'matching' && styles.contentCenter,
          raised && styles.contentRaised,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* flexGrow so the chapter actually fills the scroller's height rather than
            shrink-wrapping inside it — that's what lets a chapter whose own root asks to
            be centered (the story intro's stage, Match It's grid) have a height to center
            itself within. Without it those chapters just sat pinned to the top. */}
        <Reanimated.View key={chapter.id} entering={FadeIn.duration(260)} style={styles.chapterFill}>
          <ChapterView
            chapter={chapter}
            questions={content.questions}
            moduleXpReward={content.xpReward}
            charName={quest.character.name}
            onComplete={onComplete}
            reactTo={reactTo}
            clearReaction={clearReaction}
            onAction={onAction}
            onLayoutMode={onLayoutMode}
            onQuestionIndexChange={setKcQuestionIdx}
            learnTerm={learnTerm}
            {...reportProps}
          />
        </Reanimated.View>
      </ScrollView>
      {/* Persistent bottom bar: "Look back" pinned bottom-left, the chapter's primary action
          centered. Equal-width slots on both sides (the right one deliberately empty) rather
          than absolutely positioning the Look back button, so the action button is genuinely
          centered on screen AND can never grow into it however long its label runs ("Reveal
          the risky parts" is the worst case). Fixed height whether or not either control is
          showing, so the content above never shifts when a chapter's action appears or the
          quest's first vocab word gets taught. */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomSlot}>
          {terms.length > 0 ? <LookBackButton terms={terms} /> : null}
        </View>
        <View style={styles.bottomCenter}>
          {action ? (
            <Button
              label={action.label}
              onPress={fireAction}
              variant={action.variant ?? 'green'}
              disabled={action.disabled}
              size="sm"
              style={styles.bottomAction}
            />
          ) : null}
        </View>
        <View style={styles.bottomSlot} />
      </View>
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
  onQuestionIndexChange, reportKnowledgeCheck, reportMythCard, reportMatchingMistake, reportDecision, reportExplainback,
  learnTerm,
}: {
  chapter: Chapter; questions: Question[]; moduleXpReward: number; charName: string; onComplete: Complete;
  /** knowledgecheck-only: reports which question (position within its own qIndices) is
   * currently showing, so the parent can look up that question's own hintTexts entry —
   * see quest.tsx's hintText computation. */
  onQuestionIndexChange?: (i: number) => void;
} & ReactProps & ReportProps & ActionProps & LayoutModeProps & LearnTermProps) {
  const reactProps: ReactProps = { reactTo, clearReaction };
  switch (chapter.type) {
    case 'story': return <StoryView chapter={chapter} charName={charName} onComplete={onComplete} onAction={onAction} onLayoutMode={onLayoutMode} />;
    case 'teach': return <TeachView chapter={chapter} onComplete={onComplete} onAction={onAction} onLayoutMode={onLayoutMode} {...reactProps} onQuestionIndexChange={onQuestionIndexChange} learnTerm={learnTerm} />;
    case 'matching': return <MatchingView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportMatchingMistake={reportMatchingMistake} learnTerm={learnTerm} />;
    case 'hint': return <HintView chapter={chapter} onComplete={onComplete} onAction={onAction} onLayoutMode={onLayoutMode} />;
    case 'decision': return <DecisionView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportDecision={reportDecision} />;
    case 'microsim': return <MicrosimView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'poll': return <PollView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'mythcards': return <MythcardsView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportMythCard={reportMythCard} />;
    case 'knowledgecheck': return <KnowledgecheckView chapter={chapter} questions={questions} onComplete={onComplete} onAction={onAction} {...reactProps} reportKnowledgeCheck={reportKnowledgeCheck} onQuestionIndexChange={onQuestionIndexChange} />;
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

/** Hint control, pinned in the header's top-right corner beside the progress bar — ported
 * budget logic from renderHintBudget.
 *
 * Always rendered, on every chapter, so the corner never changes shape as you move through a
 * lesson — but greyed out and genuinely unpressable wherever there's no hint to give (a
 * story beat, a tip) or the budget's spent. It only opens on chapters that can actually
 * answer, and only those spend budget.
 *
 * Tapping opens a modal rather than pushing chapter content around, so revealing a hint
 * never moves anything else. */
function HintCorner({ hintText, hintsRemaining, onUseHint }: { hintText?: string } & HintProps) {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  // Nothing authored for this chapter, or the budget's gone: the tap still opens the modal,
  // which explains itself, instead of hitting a dead button with no feedback.
  const canGiveHint = !!hintText && (revealed || hintsRemaining > 0);
  const press = () => {
    if (!canGiveHint) return;
    if (!revealed) {
      onUseHint();
      setRevealed(true);
    }
    setOpen(true);
  };
  return (
    <>
      <Pressable
        style={[styles.hintFab, !canGiveHint && styles.hintFabDisabled]}
        disabled={!canGiveHint}
        onPress={press}
      >
        {/* numberOfLines so the label can never wrap onto a second line — the button is a
            single small pill and a wrapped "HINT 3" reads as a rendering glitch. */}
        <Txt style={styles.hintFabTxt} numberOfLines={1}>{revealed ? '💡 HINT' : `💡 HINT ${hintsRemaining}`}</Txt>
      </Pressable>
      {/* A real Modal instead of an anchored popover — Modal renders as its own top-level
          overlay outside the normal view tree, so it always sits above everything else
          regardless of DOM/paint order. The previous position:absolute popover was
          reported rendering behind Hammy/content instead of on top of it. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.hintScrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.hintModalCard} onPress={(e) => e.stopPropagation()}>
            <Tag tone="pink">HAMMY'S HINT</Tag>
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
 * app/sheet/life-event.tsx) so dismissing it just resumes the quest exactly where it paused,
 * with no "where does this route go back to" navigation to reason about. The event is
 * captured once via useState's lazy initializer at mount (QuestPlayer only ever mounts this
 * while ambientEventActive is true, remounting fresh each time), so it keeps showing through
 * the choice+result even after resolveLifeEvent clears state.pendingLifeEventId. */
function AmbientLifeEventModal({
  onDone, pendingLifeEvent, resolveLifeEvent,
}: { onDone: () => void; pendingLifeEvent: () => LifeEvent | null; resolveLifeEvent: (choiceId: string) => void }) {
  const [event] = useState(() => pendingLifeEvent());
  const { height: winH } = useWindowDimensions();

  if (!event) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.ambientLifeRoot}>
        <View style={[StyleSheet.absoluteFill, styles.ambientLifeScrim]} />
        <Reanimated.View entering={SlideInDown.duration(320)} style={[styles.ambientLifeSheet, { maxHeight: winH * LIFE_EVENT_SHEET_MAX_HEIGHT_PCT }]}>
          <ScrollView contentContainerStyle={styles.ambientLifeSheetContent} showsVerticalScrollIndicator={false}>
            <LifeEventCard event={event} onResolve={resolveLifeEvent} onDone={onDone} />
          </ScrollView>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

/** "Look back" — ported from the website's renderGlossaryTray/showGlossarySectionPopup/
 * showGlossaryPopup, collapsed from a row of per-section chips along the top of the screen
 * into ONE button in the bottom bar's left corner. The sections it used to spend a whole
 * screen row on are now just headings inside the popup, so a single tap shows every word
 * taught so far this quest at once instead of making the student pick a section first, and
 * the top of the screen goes back to the chapter. Tap a word to see its definition again,
 * with a way back to the full list so re-checking a few in a row doesn't mean reopening. */
function LookBackButton({ terms }: { terms: LearnedTerm[] }) {
  const [open, setOpen] = useState(false);
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

  const closeAll = () => { setOpenTerm(null); setOpen(false); };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.lookBackBtn} hitSlop={10}>
        <Txt style={styles.lookBackIcon}>📖</Txt>
        <Txt style={styles.lookBackCount}>{terms.length}</Txt>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeAll}>
        <Pressable style={styles.hintScrim} onPress={closeAll}>
          <Pressable style={styles.glossaryPopupCard} onPress={(e) => e.stopPropagation()}>
            {openTerm ? (
              <>
                <Pressable onPress={() => setOpenTerm(null)} hitSlop={8}>
                  <Txt style={styles.glossaryBackLink}>← Back to all words</Txt>
                </Pressable>
                <Txt style={styles.glossaryPopupTerm}>{openTerm.term}</Txt>
                <Txt style={styles.glossaryPopupDef}>{openTerm.plain}</Txt>
                <Button label="Got it" onPress={closeAll} style={{ marginTop: 16 }} />
              </>
            ) : (
              <>
                <Txt style={styles.glossaryPopupTitle}>📖 Look back</Txt>
                {/* Scrollable because this now holds EVERY section at once — by the last
                    chapter of a long quest that's well past a screenful. */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.glossaryPopupList}>
                  {sections.map((s) => (
                    <View key={s.name} style={{ gap: 8 }}>
                      <Txt style={styles.glossarySectionName}>{s.name}</Txt>
                      <View style={styles.glossaryWordGrid}>
                        {s.terms.map((t) => (
                          // Strips a trailing parenthetical qualifier for the chip label only
                          // (the full term still shows on the definition screen) — ported
                          // verbatim from the website's
                          // chip.textContent = t.term.replace(/\s*\(.*?\)/, '').
                          <Pressable key={t.term} onPress={() => setOpenTerm(t)} style={styles.glossaryWordChip}>
                            <Txt style={styles.glossaryWordChipTxt}>{t.term.replace(/\s*\(.*?\)/, '')}</Txt>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <Button label="Close" variant="ghost" onPress={closeAll} style={{ marginTop: 16 }} />
              </>
            )}
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
/** Hammy's head for the dialogue log — ported from the website's getHammyFaceMarkup /
 * .pig-head-stage: the SAME live pig, windowed to just the head with every body part
 * hidden (Hammy's `headOnly` mode). This replaces the old static hammy-head-icon.png,
 * whose long history of crop attempts only existed because cropping the FULL-body art
 * always leaked body slivers past the head silhouette — headOnly simply never draws the
 * body, so there's nothing to leak, ears are never clipped (the head window + SVG
 * overflow:visible, matching `.story-avatar.has-character { overflow: visible }`), and —
 * the actual point — equipped hats/glasses/neckwear show up in the dialogue picture too,
 * exactly like the website's story avatar. Default size 36.4 = 280 * 0.13, the exact
 * width getHammyFaceMarkup(0.13) renders at for the website's own story-avatar — the old
 * 56 here was noticeably bigger than the website's head in the same dialogue spot. */
function HammyHeadAvatar({ size = 36.4 }: { size?: number }) {
  const { equippedMascotItems } = useStore();
  return <Hammy headOnly size={size} bob={false} equipped={equippedMascotItems()} style={{ flexShrink: 0 }} />;
}

function StoryView({
  chapter, charName, onComplete, onAction, onLayoutMode,
}: { chapter: StoryChapter; charName: string; onComplete: Complete } & ActionProps & LayoutModeProps) {
  // Equipped cosmetics were missing from every big centered "intro" Hammy in the quest
  // player (this story intro, HintView's Hammy's Tip, and the companion row at line ~393
  // already had it) — the website renders equipped items on every pig instance via
  // withFaceOverlay/getPigWithItemMarkup regardless of context, so mobile should too.
  const { equippedMascotItems } = useStore();
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
    // The dialogue log is centered as a column (each beat sized to its own text and
    // centered on screen, under the centered companion Hammy) rather than a stack of
    // full-width rows pinned to the left edge.
    <View style={[{ gap: 10, flex: 1 }, !showIntro && styles.storyLog]}>
      {/* The title sits centered directly above Hammy on the intro screen — it's the whole
          headline of that screen, so it belongs with him rather than pinned off in the
          top-left corner while he's centered further down. On the dialogue log after it the
          title is rendered by QuestPlayer instead, above the companion Hammy (the companion
          lives outside this scroller, so a heading rendered here would always land under
          him); it stays fixed up there while each new beat appears below the last. */}
      {showIntro ? (
        <View style={styles.storyIntroStage}>
          {chapter.title ? <Txt style={[styles.storyTitle, styles.storyTitleCentered]}>{chapter.title}</Txt> : null}
          <Hammy size={220} bob equipped={equippedMascotItems()} />
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
            <Reanimated.View key={idx} entering={FadeInDown.duration(280)} style={styles.storyBeat}>
              {!isNarrator ? (isHammy ? <HammyHeadAvatar /> : (
                <View style={styles.storyAvatar}>
                  <Txt style={styles.storyAvatarTxt}>{beat.speaker.charAt(0)}</Txt>
                </View>
              )) : null}
              <View style={[styles.storyBubble, isNarrator && styles.storyBubbleNarrator]}>
                <Txt style={[styles.storyBubbleTxt, styles.storyBubbleTxtCentered, isNarrator && styles.storyBubbleNarratorTxt]}>{beat.text}</Txt>
              </View>
            </Reanimated.View>
          );
        })
      )}
    </View>
  );
}

/* ───────────────────────── teach ───────────────────────── */
function TeachView({
  chapter, onComplete, onAction, onLayoutMode, reactTo, clearReaction, onQuestionIndexChange, learnTerm,
}: {
  chapter: TeachChapter; onComplete: Complete;
  /** Reports which concept is showing, so the header's hint button can offer THAT concept's
   * definition (see teachHint) rather than the first one's. */
  onQuestionIndexChange?: (i: number) => void;
} & ReactProps & ActionProps & LayoutModeProps & LearnTermProps) {
  const router = useRouter();
  const [i, setI] = useState(0);
  useEffect(() => {
    onQuestionIndexChange?.(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  // Bank the word as it appears on screen, not when the chapter is finished — this is the
  // moment the student actually learns it, so 📖 should tick over now (including on the very
  // first concept of the very first vocab chapter, which used to sit at 0).
  useEffect(() => {
    const c = chapter.concepts[i];
    if (c) learnTerm({ term: c.term, plain: c.plain, section: chapter.title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, chapter.title]);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const concept = chapter.concepts[i];
  const last = i + 1 >= chapter.concepts.length;
  // Some concepts have no statement at all (check: {} or absent) — informational only, no quiz.
  const hasCheck = !!concept.check?.statement;

  useEffect(() => {
    onLayoutMode(chapter.fullScreen ? 'full' : 'normal');
    return () => onLayoutMode('normal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.fullScreen]);

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
    // Keyed to the concept index so each concept swap gets its own fade in/out instead of an
    // instant cut.
    <Reanimated.View key={i} entering={FadeIn.duration(220)} style={{ gap: 10, flex: 1, justifyContent: 'center' }}>
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
    </Reanimated.View>
  );
}

/* ───────────────────────── matching ───────────────────────── */
/** Matching's chips animate (see playPop below), so they need to be Animated hosts rather
 * than plain Pressables. Created once at module scope — createAnimatedComponent inside a
 * render would produce a brand-new component type every pass and remount every chip. */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function shuffle<T>(arr: T[]): T[] {
  return [...arr].map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

function MatchingView({
  chapter, onComplete, onAction, reactTo, reportMatchingMistake, learnTerm,
}: { chapter: MatchingChapter; onComplete: Complete } & ReactProps & Pick<ReportProps, 'reportMatchingMistake'> & ActionProps & LearnTermProps) {
  const [terms] = useState(() => shuffle(chapter.pairs.map((p) => p.term)));
  const [defs] = useState(() => shuffle(chapter.pairs.map((p) => p.definition)));
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selTerm, setSelTerm] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  // Set a beat after the last pair is matched (see the 950ms delay below) — separate from
  // just checking matched.size so the Next button doesn't appear mid-reaction, before Hammy's
  // "Nice! 🎉" bubble has actually had time to show.
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  // Every term/definition chip used to size itself to just its own text — a one-word term
  // ("Interest") sat in a visibly smaller pill than a full-sentence definition next to it,
  // which read as an inconsistent, unfinished-looking grid rather than a matching game.
  // Tracks the tallest chip actually measured so far (across BOTH columns) and applies that
  // as a shared minHeight to every chip once known. Converges after at most one extra
  // render per chapter: once minHeight reaches the true tallest chip's natural height, that
  // chip's measured height stops changing, so this stops updating too.
  const [maxChipH, setMaxChipH] = useState(0);
  const onChipLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setMaxChipH((cur) => (h > cur ? h : cur));
  };
  // A one-shot pop played on BOTH chips of a pair the instant it's matched — landing a
  // match used to only recolor the two chips, which is easy to miss when your finger is
  // still over one of them. One Animated.Value per pair (keyed by its term; the definition
  // chip looks up its own pair's term so the two animate as a unit), created lazily so a
  // chapter only ever allocates what it actually uses.
  const popValues = useRef<Record<string, Animated.Value>>({});
  const popFor = (term: string) => {
    if (!popValues.current[term]) popValues.current[term] = new Animated.Value(1);
    return popValues.current[term];
  };
  const playPop = (term: string) => {
    const v = popFor(term);
    v.setValue(1);
    Animated.sequence([
      Animated.timing(v, { toValue: 1.12, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(v, { toValue: 1, friction: 4.5, tension: 150, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    // Requires an actual tap on Next now, rather than auto-completing on a timer — this used
    // to call onComplete directly here, which silently carried the user into the NEXT
    // chapter (sometimes Hammy's Tip) with no button press at all, reported as "getting
    // automatically transported."
    onAction(readyToAdvance ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToAdvance]);

  const pickDef = (def: string) => {
    if (!selTerm) return;
    const correct = chapter.pairs.find((p) => p.term === selTerm)?.definition === def;
    reactTo(correct, undefined, HAMMY_TRYAGAIN_MSGS);
    if (!correct) reportMatchingMistake();
    if (correct) {
      const next = new Set(matched); next.add(selTerm);
      setMatched(next);
      setSelTerm(null);
      playPop(selTerm);
      // Into the Look-back book the moment the pair is matched — that's when this word is
      // learned, rather than when the whole grid is finished. See quest.tsx's learnTerm.
      learnTerm({ term: selTerm, plain: def, section: chapter.title });
      // Long enough for Hammy's "Nice! 🎉" reaction bubble to actually be seen (it fades in
      // over 250ms) before the Next button appears — at the old 400ms the button could show
      // up almost before the bubble finished appearing, reading as "Hammy didn't say anything."
      if (next.size === chapter.pairs.length) setTimeout(() => setReadyToAdvance(true), 950);
    } else {
      // Term chips aren't disabled during this flash window, so the player can tap a
      // DIFFERENT term while it's showing — capture which term was actually selected at
      // the moment of the mistake, and only clear it if it's still the current selection
      // when this fires. Previously this unconditionally cleared selTerm, so picking a
      // new term during the ~500ms window got silently wiped out from under the player
      // the instant this stale timeout landed, forcing a re-tap.
      const termAtMistake = selTerm;
      setWrongPair(def);
      setTimeout(() => {
        setWrongPair(null);
        setSelTerm((cur) => (cur === termAtMistake ? null : cur));
      }, 500);
    }
  };

  return (
    // The grid is centered in whatever height it's given rather than pinned to the top, and
    // both columns share one gap — with every chip already forced to the same height (see
    // maxChipH), that makes the two columns line up row-for-row and space out evenly down
    // the middle of the screen instead of reading as two ragged lists.
    <View style={styles.matchWrap}>
      <Txt variant="h2" style={styles.matchTitle}>{chapter.title}</Txt>
      <View style={styles.matchGrid}>
        <View style={styles.matchCol}>
          {terms.map((t) => (
            <AnimatedPressable
              key={t}
              disabled={matched.has(t)}
              onPress={() => setSelTerm(t)}
              onLayout={onChipLayout}
              style={[
                styles.matchChip,
                maxChipH > 0 && { minHeight: maxChipH },
                selTerm === t && styles.matchChipOn,
                matched.has(t) && styles.matchChipDone,
                { transform: [{ scale: popFor(t) }] },
              ]}
            >
              <Txt style={styles.matchChipTxt}>{t}</Txt>
            </AnimatedPressable>
          ))}
        </View>
        <View style={styles.matchCol}>
          {defs.map((d) => {
            const pairTerm = chapter.pairs.find((p) => p.definition === d)?.term;
            const isDone = !!pairTerm && matched.has(pairTerm);
            return (
              <AnimatedPressable
                key={d}
                disabled={isDone}
                onPress={() => pickDef(d)}
                onLayout={onChipLayout}
                style={[
                  styles.matchChip,
                  maxChipH > 0 && { minHeight: maxChipH },
                  wrongPair === d && styles.matchChipWrong,
                  isDone && styles.matchChipDone,
                  // Shares its pair's animation value, so a match pops the term and its
                  // definition together rather than one at a time.
                  { transform: [{ scale: popFor(pairTerm ?? d) }] },
                ]}
              >
                <Txt style={styles.matchChipTxt}>{d}</Txt>
              </AnimatedPressable>
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
  const { equippedMascotItems } = useStore();
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
    // Hammy sits at the BOTTOM of the stage with his bubble stacked above him in normal
    // flow. Bottom-packing is what gets both properties at once: revealing the tip grows the
    // bubble upward into the empty space above (so Hammy doesn't sink when he speaks), and
    // because the bubble is still a real laid-out sibling rather than positioned out of
    // flow, a long tip extends the stage and scrolls instead of running off the top of the
    // screen and having its first lines cut off.
    <View style={styles.hintStage}>
      <Reanimated.View
        key={revealed ? 'revealed' : 'prompt'}
        entering={FadeInDown.duration(320).springify()}
        style={styles.tipBubble}
      >
        <View style={styles.tipBubbleTailBorder} />
        <View style={styles.tipBubbleTailFill} />
        <Tag tone="warm">{chapter.tag || "Hammy's Tip"}</Tag>
        {revealed ? (
          <Txt style={[styles.tipCaption, { marginTop: 8 }]}>{chapter.text}</Txt>
        ) : (
          <Txt style={[styles.storyIntroCaption, { marginTop: 8, color: colors.muted3, fontStyle: 'italic' }]}>
            Tap Hammy to hear what they have to say.
          </Txt>
        )}
      </Reanimated.View>
      <Pressable onPress={tap} disabled={revealed} hitSlop={14}>
        <Hammy size={168} bob equipped={equippedMascotItems()} reaction={revealed ? 'happy' : null} reactionKey={tapTick} />
      </Pressable>
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
    // Centered rather than top-anchored: a short title/prompt + 2-3 white choice buttons
    // rarely fills the screen, so top-anchoring (the default) left all the slack as one big
    // empty gap under the buttons, above the fixed bottom action bar. Centering splits that
    // slack instead, pulling both the title/prompt and the buttons down off the top edge.
    <View style={{ gap: 10, flex: 1, justifyContent: 'center' }}>
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
  //
  // Deliberately NOT speaking tier.text here: every "ok" tier in the content opens with the
  // word "Solid", and shortFeedback trims a spoken message to its first sentence, so Hammy's
  // bubble came out as a bare "Solid." — flat, and out of character next to the rest of his
  // pool. He gets the normal "Good job!"/"Nice one!" celebration instead; the tier's actual
  // reasoning is still shown in full, unshortened, in the card below.
  const submit = () => { setSubmitted(true); reactTo(tier.ok); };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) }
      : { label: 'See how you did', onPress: submit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, tier.ok]);

  return (
    // Centered, so the slack a slider chapter has left over after its cards is shared above
    // and below instead of pooling into one dead band under the last card ("Budgeting From
    // Net, Not Gross" was mostly that band). These chapters hide the companion Hammy
    // (TALL_CHAPTER_TYPES), so there's a lot of height to distribute.
    <View style={{ gap: 10, flex: 1, justifyContent: 'center' }}>
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
        // Slides up as it fades in rather than just appearing — locking in a budget is the
        // payoff beat of this chapter type and it previously just popped into existence.
        <Reanimated.View entering={FadeInDown.duration(320)}>
          <Card><Txt style={{ fontFamily: font.semi, fontSize: 14, color: tier.ok ? colors.greenDark : colors.pinkDark }}>{friendlyTierText(tier.text)}</Txt></Card>
        </Reanimated.View>
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
    // Centered so the block sits lower and the slack isn't left as one gap above the bottom
    // action bar. Type sizes here are a notch under the shared defaults: with Hammy on screen,
    // an intro plus a statement plus the explanation card is right at the height where a
    // "What Do Most People Think?" would start scrolling, and a true/false shouldn't.
    <View style={{ gap: 9, flex: 1, justifyContent: 'center' }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 13.5, lineHeight: 19 }}>{chapter.intro}</Txt>
      <Card style={{ padding: 15 }}><Txt style={{ fontFamily: font.displayMed, fontSize: 14.5, color: colors.ink }}>{chapter.statement}</Txt></Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TrueFalseButton label="True" state={tfState(true, answered, chapter.isTrue)} onPress={answered === null ? () => pick(true) : undefined} />
        <TrueFalseButton label="False" state={tfState(false, answered, chapter.isTrue)} onPress={answered === null ? () => pick(false) : undefined} />
      </View>
      {answered !== null ? (
        <Reanimated.View entering={FadeInDown.duration(300)}>
          <Card style={{ padding: 15 }}>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === chapter.isTrue ? colors.greenDark : colors.pinkDark }}>
              {answered === chapter.isTrue ? 'Correct!' : 'Not quite.'}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 12.5, lineHeight: 17.5, marginTop: 4, color: answered === chapter.isTrue ? colors.greenDark : colors.pinkDark }}>{chapter.explanation}</Txt>
          </Card>
        </Reanimated.View>
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
    // Reports the real {correct, total} tally, not a flat `true` — the flat form used to
    // count a mythcards chapter as fully correct toward the headline lesson score no
    // matter how many cards were actually gotten right (even 0-for-N), same class of bug
    // as knowledgecheck's onComplete above. See Complete's definition.
    if (last) { onComplete((chapter.xpPerCorrect ?? 0) * correctSoFar, { correct: correctSoFar, total: chapter.cards.length }); return; }
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
              <Txt variant="lead" style={{ fontSize: 13, color: resolved.guessedRight ? colors.greenDark : colors.pinkDark }}>{card.explanation}</Txt>
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
  chapter, questions, onComplete, onAction, reactTo, clearReaction, reportKnowledgeCheck, onQuestionIndexChange,
}: {
  chapter: KnowledgecheckChapter; questions: Question[]; onComplete: Complete;
  onQuestionIndexChange?: (i: number) => void;
} & ReactProps & ActionProps & Pick<ReportProps, 'reportKnowledgeCheck'>) {
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  // Tallies every question answered in this chapter (not just the last one), so the
  // headline lesson score reflects the whole knowledge check — see onComplete's
  // {correct, total} form. Previously only the LAST question's correctness was reported,
  // so e.g. missing question 1 but getting question 2 (the last) right scored the whole
  // chapter as fully correct even though the per-question results screen showed 1/2.
  const [correctSoFar, setCorrectSoFar] = useState(0);
  const question = questions[chapter.qIndices[i]];
  const answered = sel !== null;
  const right = question ? sel === question.correct : false;
  const last = i + 1 >= chapter.qIndices.length;

  // Keeps the parent's kcQuestionIdx in sync with this view's own internal question index,
  // so the shared header hint button can show THIS question's hintTexts entry — see
  // quest.tsx's hintText computation, which previously had no way to know which question
  // of a multi-question knowledge check was actually on screen.
  useEffect(() => {
    onQuestionIndexChange?.(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const pick = (idx: number) => {
    setSel(idx);
    const isCorrect = question ? idx === question.correct : false;
    if (isCorrect) setCorrectSoFar((c) => c + 1);
    // A wrong answer speaks the actual explanation (also shown in the card below) instead
    // of a generic "Not quite! Here's why:" — a right answer keeps the plain celebratory
    // pool, since "Nice! 🎉" doesn't need anything more said about it.
    reactTo(isCorrect, isCorrect || !question ? undefined : shortFeedback(question.exp));
    if (question) reportKnowledgeCheck(question.q, isCorrect);
  };
  const next = () => {
    if (last) { onComplete(0, { correct: correctSoFar, total: chapter.qIndices.length }); return; }
    // Cuts a still-showing reaction bubble/face short instead of letting it linger over the
    // next, not-yet-answered question until its own timer happens to fire — see ReactProps.
    clearReaction();
    setI(i + 1);
    setSel(null);
  };

  useEffect(() => {
    onAction(answered ? { label: 'Next', onPress: next } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, last]);

  if (!question) return null;
  return (
    // Keyed to the question index so each question swap gets its own fade in/out instead of
    // an instant cut.
    <Reanimated.View key={i} entering={FadeIn.duration(220)} style={{ gap: 10, flex: 1, justifyContent: 'center' }}>
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
        // Shortened (not the raw question.exp) so the answer card stays compact enough that
        // the options above it and the Next button below stay on screen together. 110 chars,
        // not shortFeedback's default 60 (tuned for the narrow companion bubble) — this is a
        // full-width card with more room.
        <Card><Txt variant="lead" style={{ fontSize: 13, color: right ? colors.greenDark : colors.pinkDark }}>{shortFeedback(question.exp, 110)}</Txt></Card>
      ) : null}
    </Reanimated.View>
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
    reactTo(d.scoreDelta >= 0, shortFeedback(d.note));
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
  // Dismissible: the outcome opens over the choices, and closing it leaves them (and the
  // highlighted pick) readable while "Finish quest →" waits in the bottom bar.
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  const pick = (c: BossbattleChapter['choices'][number]) => {
    setPickedId(c.id);
    setOutcomeOpen(true);
    reportDecision('Boss battle', c.label);
    reactTo(c.consequence.xpMultiplier >= 1);
  };
  useEffect(() => {
    // Ported verbatim from finishQuest: bossXP = Math.round(module.xpReward * xpMultiplier).
    onAction(picked ? { label: 'Finish quest →', onPress: () => onComplete(Math.round(moduleXpReward * picked.consequence.xpMultiplier)) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);
  return (
    <View style={{ gap: 10, flex: 1, justifyContent: 'center' }}>
      <Tag tone="warm">⚔ BOSS CHALLENGE</Tag>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.scenario}</Txt>
      {/* The choices stay put once one is taken — the outcome arrives over them in a sheet
          rather than replacing them. Swapping the list out for the consequence card used to
          erase the question the moment it was answered, so there was nothing left on screen
          to read the outcome against: you couldn't see what you'd picked, or what the other
          options had been. The picked row now stays highlighted underneath. */}
      <View style={{ gap: 10 }}>
        {chapter.choices.map((c) => (
          <Option
            key={c.id}
            label={c.label}
            state={picked?.id === c.id ? 'on' : 'default'}
            onPress={picked ? undefined : () => pick(c)}
          />
        ))}
      </View>
      <Modal visible={!!picked && outcomeOpen} transparent animationType="fade" onRequestClose={() => setOutcomeOpen(false)}>
        <Pressable style={styles.hintScrim} onPress={() => setOutcomeOpen(false)}>
          <Reanimated.View entering={SlideInDown.duration(320)} style={{ width: '100%', alignItems: 'center' }}>
            <Pressable style={styles.bossOutcomeCard} onPress={(e) => e.stopPropagation()}>
              <Tag tone="warm">⚔ HOW IT PLAYED OUT</Tag>
              <Txt style={styles.bossOutcomePick}>You chose: {picked?.label}</Txt>
              <Txt variant="lead" style={{ fontSize: 14, color: colors.ink }}>{picked?.consequence.text}</Txt>
              <Button label="Got it" onPress={() => setOutcomeOpen(false)} style={{ marginTop: 4 }} />
            </Pressable>
          </Reanimated.View>
        </Pressable>
      </Modal>
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
  // Ported from the website's renderPriceIsRightChapter (app.js), which uses 0.15 — this
  // was 0.1 here, a stricter tolerance that could grade the exact same guess "wrong" on
  // mobile when the website would call it "Close enough!" and count it correct.
  const close = diff <= (max - min) * 0.15;

  // chapter.explanation as the spoken message, same reasoning as Microsim's tier.text —
  // Hammy actually explains the real number instead of a generic "Nice!"/"Not quite!".
  const submit = () => { setSubmitted(true); reactTo(close, shortFeedback(chapter.explanation)); };

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
          <Txt variant="lead" style={{ fontSize: 13, marginTop: 4, color: close ? colors.greenDark : colors.pinkDark }}>{chapter.explanation}</Txt>
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
  const inputRef = useRef<TextInput>(null);
  const hitKeywords = chapter.keywords.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  // Thresholds ported verbatim from app.js's explainback grading (renderExplainbackChapter).
  const submit = () => {
    // `editable={false}` alone leaves the box FOCUSED — on web it's a readOnly <textarea>,
    // which keeps painting its caret, so a text cursor went on blinking in a box that could
    // no longer be typed in, and kept blinking over the chapters after it (a chapter swap
    // doesn't move focus on its own). Dropping focus here is what actually puts the caret
    // away.
    inputRef.current?.blur();
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
        ref={inputRef}
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
          <Txt style={{ fontFamily: font.bold, fontSize: 13, color: hitKeywords.length ? colors.greenDark : colors.pinkDark }}>
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
  // No bottom border — a rule straight across the screen under the progress bar read as a
  // stray line rather than as structure.
  stick: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 9,
  },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  // Persistent bottom bar holding "Look back" (left) and the chapter's primary action
  // (centered). minHeight, not height, so it can't squeeze the 48px button; the two
  // bottomSlots are equal widths flanking a flex:1 middle, which is what keeps the action
  // button on the screen's true centre line while still leaving the left corner free.
  // No top border: a divider line directly above the action button read as a stray rule
  // across the screen rather than as structure, so the bar just sits on the page.
  // Bottom padding is deliberately heavier than the top, lifting the button off the very
  // edge of the screen — on the web build there's no home-indicator inset underneath it to
  // do that on its own.
  // height, not minHeight: at minHeight 68 the bar was SHORTER than its own contents
  // (8 + a 48px button + 22 = 78), so the moment a chapter's action button appeared the bar
  // grew by 10px and shoved the whole scroller — question, options, Hammy — up the screen.
  // Pinning it to the tallest state it can ever be means an action appearing or clearing
  // changes nothing above it.
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', height: 78,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 22,
  },
  bottomSlot: { width: 48, alignItems: 'flex-start', justifyContent: 'center' },
  bottomCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomAction: { paddingHorizontal: 20, minWidth: 148 },
  // Compact enough to leave the centered action button its full width even at its longest
  // label — the book glyph plus a count of everything learned so far reads as "your words"
  // without spending a labelled button's worth of the bar on it.
  lookBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 38, paddingHorizontal: 9, borderRadius: 14,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.borderCool,
  },
  lookBackIcon: { fontSize: 15 },
  lookBackCount: { fontFamily: font.bold, fontSize: 12, color: colors.muted3 },
  // Holds the hint button's footprint whether or not this chapter has a hint, so the
  // progress bar and % beside it don't jump between chapters that have one and chapters
  // that don't. Sized for the widest state, "💡 HINT 3", with room to spare — at 74 the
  // label had nowhere to go but onto a second line, which left the button looking broken
  // rather than like a hint.
  hintSlot: { width: 96, alignItems: 'flex-end', justifyContent: 'center' },
  hintFab: {
    minWidth: 34, height: 30, paddingHorizontal: 9, borderRadius: 15,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.borderCool,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  hintFabDisabled: { opacity: 0.4 },
  hintFabTxt: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  hintScrim: { flex: 1, backgroundColor: 'rgba(22,32,23,0.55)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  hintModalCard: {
    width: '100%', maxWidth: 340, backgroundColor: colors.pinkBg, borderWidth: 1.5,
    borderColor: colors.pinkBorder, borderRadius: 20, padding: 20,
  },
  bossOutcomeCard: {
    backgroundColor: colors.card, borderRadius: 24, borderWidth: 1.5, borderColor: colors.border,
    padding: 20, gap: 10, width: '100%', maxWidth: 420, alignItems: 'flex-start',
  },
  bossOutcomePick: { fontFamily: font.extra, fontSize: 13, color: colors.muted3 },
  glossaryPopupList: { gap: 16, paddingBottom: 2 },
  glossarySectionName: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, textTransform: 'uppercase', letterSpacing: 0.4 },
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
  // Hammy on the left, his bubble in the space beside him. A real flex row, so the bubble
  // sizes itself to whatever is left over rather than to a fixed width that would have to
  // be re-tuned every time his size or the screen's changes.
  companionWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4,
  },
  // The centered arrangement (dialogue, Match It): a column, bubble above Hammy.
  companionWrapCentered: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  // Match It only: pulls Hammy up tight under the progress bar. Paired with contentRaised.
  companionWrapRaised: { paddingTop: 0, paddingBottom: 0 },
  // No reserved height: the row's height is Hammy's, and he's far taller than any bubble
  // this can produce — so a message appearing or clearing can't move him or anything below.
  bubbleSlot: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  bubbleInner: { alignItems: 'flex-start' },
  // Stacked above Hammy, so here the height IS reserved from the first render (he has no
  // width to hide it in) — otherwise he and the whole chapter under him would drop by the
  // bubble's height the moment he first said anything. flex-end grows a longer message
  // upward from the tail; paddingBottom is the gap the tail itself lives in.
  bubbleSlotCentered: {
    minHeight: 70, width: '100%', paddingBottom: 13, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'flex-end',
  },
  bubbleInnerCentered: { alignItems: 'center', maxWidth: 300 },
  reactionBox: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, paddingVertical: 9, paddingHorizontal: 13,
  },
  reactionTxt: { fontFamily: font.bold, fontSize: 14, lineHeight: 18.5 },
  reactionTxtCentered: { textAlign: 'center' },
  // A literal speech-bubble tail on the box's left edge, pointing at Hammy (who sits to its
  // left) — the classic border-triangle trick (colored right border, transparent
  // top/bottom, zero width/height). Two stacked triangles (a larger border-colored one
  // behind, a smaller white one in front) fake the box's own 1.5px stroke carrying around
  // the point.
  reactionTailBorder: {
    position: 'absolute', top: '50%', left: -9, marginTop: -7,
    width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 9,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.border,
  },
  reactionTailFill: {
    position: 'absolute', top: '50%', left: -6.5, marginTop: -5.8,
    width: 0, height: 0, borderTopWidth: 5.8, borderBottomWidth: 5.8, borderRightWidth: 7.5,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.white,
  },
  // The same tail rotated for the centered arrangement: on the box's bottom edge, pointing
  // down at the Hammy directly below it.
  reactionTailDownBorder: {
    position: 'absolute', bottom: -11, left: '50%', marginLeft: -9,
    width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 11,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.border,
  },
  reactionTailDownFill: {
    position: 'absolute', bottom: -8.4, left: '50%', marginLeft: -7.4,
    width: 0, height: 0, borderLeftWidth: 7.4, borderRightWidth: 7.4, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.white,
  },
  // Story chapter title — pink, and the headline of its screen on both the intro stage and
  // the dialogue log, so it's sized to lead rather than to label.
  storyTitle: { fontFamily: font.display, fontSize: 27, lineHeight: 33, color: colors.pinkDark },
  storyTitleCentered: { textAlign: 'center', maxWidth: 320 },
  // The dialogue log's heading sits ABOVE the companion Hammy (rendered by QuestPlayer, not
  // by StoryView) — it's the headline of the screen, so it reads first. Deliberately NOT
  // paired with storyTitleCentered: it spans the full width of the screen rather than being
  // held to that style's 320 cap, so a long title uses the whole line before it wraps.
  storyTitleAboveCompanion: {
    alignSelf: 'stretch', width: '100%', textAlign: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2,
  },
  // space-evenly rather than center: it spreads the title, Hammy and the caption across the
  // stage at equal intervals, which lifts the title clear of Hammy instead of leaving the
  // three of them clustered in the middle with even gaps only between neighbours.
  storyIntroStage: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 24 },
  storyIntroCaption: {
    fontFamily: font.semi, fontSize: 17.5, lineHeight: 24, color: colors.ink,
    textAlign: 'center', maxWidth: 320,
  },
  // Hammy's Tip (funfact) — bottom-packed so Hammy sits low on the stage and the tip bubble
  // above him grows up into the empty space rather than pushing him down or spilling off
  // the top. See HintView's own comment.
  hintStage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 12, paddingBottom: 16 },
  tipCaption: {
    fontFamily: font.bold, fontSize: 17.5, lineHeight: 24, color: colors.ink,
    textAlign: 'center', maxWidth: 320,
  },
  tipBubble: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 10,
    alignItems: 'center', maxWidth: 340,
  },
  tipBubbleTailBorder: {
    position: 'absolute', bottom: -11, left: '50%', marginLeft: -11,
    width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderTopWidth: 13,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.border,
  },
  tipBubbleTailFill: {
    position: 'absolute', bottom: -8.5, left: '50%', marginLeft: -9,
    width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 10.5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.white,
  },
  // Ambient mid-quest life-event overlay — a bottom sheet, matching the post-lesson
  // route's own life-event screen so the two read as the same feature.
  ambientLifeRoot: { flex: 1, justifyContent: 'flex-end' },
  ambientLifeScrim: { backgroundColor: 'rgba(22,32,23,0.55)' },
  ambientLifeSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 20,
  },
  ambientLifeSheetContent: { paddingHorizontal: 22, paddingBottom: 34 },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 20, gap: 12, flexGrow: 1 },
  // Match It only. The grid is vertically centred (contentCenter), so the way to lift it is
  // to weight the bottom — extra paddingBottom shifts the centre of the free space upward.
  contentRaised: { paddingTop: 0, paddingBottom: 72 },
  chapterFill: { flexGrow: 1 },
  // Only for chapters whose content is fixed and doesn't grow as you interact with it (Match
  // It). Centering anything that GROWS — the dialogue log — would push everything already
  // on screen upward with each addition, which is what this used to do to the conversation.
  contentCenter: { justifyContent: 'center' },
  // Dialogue log: each beat sized to its own text and centered as a column.
  storyLog: { alignItems: 'center' },
  term: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  // Story beats — speaker-styled: white bordered bubble + pig-head avatar for Hammy, a
  // plain muted italic box with no avatar for the narrator (ported from .story-bubble /
  // .story-bubble.narrator / .story-avatar).
  // maxWidth so a beat centers as a column instead of stretching edge to edge; the row
  // itself still shrink-wraps to its bubble.
  storyBeat: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', maxWidth: '100%' },
  storyAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.screen,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
  },
  storyAvatarTxt: { fontSize: 22 },
  storyBubble: {
    flex: 1, flexShrink: 1, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.borderOpt,
    borderRadius: 16, padding: 14,
  },
  storyBubbleTxt: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 20, color: colors.ink },
  storyBubbleTxtCentered: { textAlign: 'center' },
  storyBubbleNarrator: { backgroundColor: colors.screen, borderColor: colors.border },
  storyBubbleNarratorTxt: { fontFamily: font.medium, fontStyle: 'italic', color: colors.muted2 },
  // Matching grid — centered as a block with one shared gap between every chip, so the two
  // columns read as evenly-spaced rows down the middle rather than two ragged lists.
  matchWrap: { gap: 14, flex: 1, justifyContent: 'center' },
  matchTitle: { textAlign: 'center' },
  matchGrid: { flexDirection: 'row', gap: 10 },
  matchCol: { flex: 1, gap: 10 },
  matchChip: {
    borderWidth: 1.5, borderColor: colors.borderOpt, borderRadius: 14,
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.white,
    justifyContent: 'center',
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
    textAlignVertical: 'top', ...selectableInput,
  },
  urlPart: {
    fontFamily: font.bold, fontSize: 13, color: colors.ink,
    paddingVertical: 4, paddingHorizontal: 2,
  },
  urlPartFlagged: { backgroundColor: colors.pinkBg2, borderRadius: 4 },
  urlPartBad: { backgroundColor: colors.dangerBg, color: colors.danger, borderRadius: 4 },
});
