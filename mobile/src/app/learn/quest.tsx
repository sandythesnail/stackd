import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, View, ScrollView, Pressable, PanResponder, TextInput, Modal, StyleSheet, useWindowDimensions, LayoutChangeEvent, KeyboardAvoidingView, Platform } from 'react-native';
import Reanimated, {
  SlideInDown, FadeInDown, FadeIn, FadeInRight, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle, useReducedMotion, withTiming, withSpring, withSequence,
} from 'react-native-reanimated';
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
import { normalizeAnalytics, setPendingQuestAnalytics, type QuestAnalytics } from '@/questReport';
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
/** Finish this chapter, awarding `xpDelta`.
 *
 * There is no longer a second "and here's how they scored" argument. Only four chapter types
 * ever passed one, so the correct/graded counters it fed — the basis for the coin payout —
 * covered a different, smaller set of chapters than the results screen's own score. Both are
 * derived from the reported analytics now (see gradedTally), which is the same place the
 * mastery ring reads from, so a chapter type cannot be counted by one and not the other.
 * Grading is reported as it happens, via ReportProps; this just ends the chapter. */
type Complete = (xpDelta: number) => void;

/** A vocab term the player has been taught so far this quest — ported from the website's
 * qp.learnedTerms (same {term, plain, section} shape end to end: pushLearnedTerm, the
 * live "look back" glossary tray, and the results-screen chip list all read off of this
 * one array). `section` is the chapter's own title, matching the website's exact grouping
 * (pushLearnedTerm(mod, c.term, c.plain, chapter.title)). */
type LearnedTerm = { term: string; plain: string; section: string };

/* "Ask Hammy for a hint" used to be a budget of 3 per lesson, ported from app.js. It's gone:
 * a lesson runs a median 13 chapters, so spending the three early greyed the button out for
 * the whole rest of the lesson, which is why hints looked disabled on nearly every question.
 * Being stuck is exactly when you want the hint, and rationing them mostly punished the
 * students who needed them most. Hints are now available wherever one is authored, as often
 * as you like. hintsUsed is still counted and still reported to the results screen — it's a
 * signal about the lesson, it just no longer gates anything.
 *
 * (A HINT_FREE_CHAPTER_TYPES set lived here too, exempting story/teach/hint from the budget.
 * It was never referenced anywhere — dead since it was written — and with no budget left to
 * be exempt from there's nothing for it to do.) */

/** Chapter types tall enough by construction that the companion Hammy would be competing
 * with the content for the screen: microsim stacks an income card, a card of sliders, a
 * running total and a feedback card ("Planning Around an Accurate W-4" is one of these);
 * simulator stacks a meter card on a list of decisions; spotcheck a whole posting whose
 * every segment can sprout an explanation; bossbattle keeps its full choice list on screen
 * and then adds the outcome underneath it; knowledgecheck (Quick Check) stacks a question
 * stem, four options and an explanation card. These always scroll, so Hammy steps aside and
 * lets the question have the whole screen.
 *
 * A fixed list of TYPES, decided before the first paint — never a measure-then-react rule,
 * and never content-dependent. Both of those were tried and both went wrong: measuring made
 * him blink (the height isn't known until after layout, so he had to start hidden), and a
 * per-question size ESTIMATE was so unpredictable it took him off ordinary questions too.
 * Quick Checks are on the list wholesale for that reason — every one of them, not the long
 * ones, so his presence is never a surprise. Anything not listed keeps him and scrolls. */
// priceisright and explainback joined the list for the same reason the others are on it, not
// as a judgement call: both put a full-width control (a slider, a multiline text box) above an
// authored explanation that runs to a dozen lines, and neither could fit that beside him
// without shrinking the explanation to a size nobody would read. Both are also chapters you
// operate rather than converse with — a keyboard covers his corner of the screen on
// explainback anyway — so he loses least by stepping aside here.
const TALL_CHAPTER_TYPES = new Set(['microsim', 'simulator', 'spotcheck', 'bossbattle', 'knowledgecheck', 'priceisright', 'explainback']);

/** Ceiling on the boss-battle verdict sheet, as a fraction of screen height — the same shape
 * of cap LIFE_EVENT_SHEET_MAX_HEIGHT_PCT puts on the life-event sheet, so the two overlays
 * behave identically on a short screen. */
const BOSS_SHEET_MAX_HEIGHT_PCT = 0.8;

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

type HintProps = { onUseHint: () => void };
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
  return `Remember what ${concept.term} means: ${concept.plain}`;
}

/** Mount animation as an animated STYLE, never as Reanimated's `entering` prop.
 *
 * `entering` is unusable for anything that has siblings in flow on the web build, and this is
 * the actual, measured reason the story dialogue has been broken over and over:
 *
 *   Reanimated gives every view carrying an `entering` animation `position: absolute` on web,
 *   and leaves it there after the animation has finished.
 *
 * The dialogue log is a column of beats that accumulate down the screen. Take them out of flow
 * and every beat lands on the same spot — three bubbles stacked on top of each other at the
 * same y, only the newest readable, the earlier ones bleeding off the side. Pair that with the
 * `flex: 1` the bubble used to carry (flexBasis 0, so zero points wide with nothing to grow
 * into) and the log rendered as nothing whatsoever. That is the whole bug, and it is why it
 * read both as "the dialogue never shows up" and as "it does some weird animation".
 *
 * An animated style is driven by the same Reanimated timing but is only ever a transform, so
 * the view stays in normal flow and the column keeps stacking. It is fail-visible for free:
 * nothing here touches opacity, so if the animation never runs the content simply sits a few
 * pixels off and is perfectly readable.
 */
function useRise(from: number, axis: 'x' | 'y', duration: number, reduceMotion: boolean) {
  const offset = useSharedValue(reduceMotion ? 0 : from);
  useEffect(() => {
    offset.value = withTiming(0, { duration });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return useAnimatedStyle(() => ({
    transform: [axis === 'y' ? { translateY: offset.value } : { translateX: offset.value }],
  }));
}

/** Anything that should arrive under what is already on screen, rather than replacing it.
 *
 * Same rule as StoryBeat and for the same reason: an animated style, never Reanimated's
 * `entering` prop, which takes the view out of flow on web and stacks every sibling on one
 * spot. Reads its own reduced-motion setting so callers don't have to thread it. */
function RiseIn({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const rise = useRise(8, 'y', 220, reduceMotion);
  return <Reanimated.View style={rise}>{children}</Reanimated.View>;
}

/** One beat of the dialogue log. Its own component so the mount animation is a hook on
 * something that mounts exactly once per beat — 8px of rise over 220ms, no spring. A beat is
 * one line of conversation landing in a log that already has several, so it should read as
 * "another one just arrived" and nothing more; a story chapter plays up to four of them back
 * to back, and anything bigger turns every Next into an event of its own. */
function StoryBeat({ reduceMotion, children }: { reduceMotion: boolean; children: ReactNode }) {
  const rise = useRise(8, 'y', 220, reduceMotion);
  return <Reanimated.View style={[styles.storyBeat, rise]}>{children}</Reanimated.View>;
}

/** The chapter page-turn: 10px of travel over 170ms, meant to register as a page turn rather
 * than an animation you wait for. This wrapper used to carry an `entering` too, which made
 * every chapter's content `position: absolute` inside the scroller — so the scroll height had
 * nothing real to measure (783px of reported content for one 38px line of dialogue). Keyed on
 * the chapter id by its caller, so it mounts once per chapter. */
function ChapterFrame({ reduceMotion, children }: { reduceMotion: boolean; children: ReactNode }) {
  const slide = useRise(10, 'x', 170, reduceMotion);
  return <Reanimated.View style={[styles.chapterFill, slide]}>{children}</Reanimated.View>;
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
  /** Every other graded moment — the poll's true/false, a vocab concept's inline check, the
   * price guess, the spot-the-red-flag chapters. Call it wherever the chapter tells the
   * student they were right or wrong, so the results screen's score covers what they were
   * actually asked. `label` is what appears under "Worth another look", so pass the thing
   * they were judged on (the statement, the term) rather than the chapter's title.
   *
   * The test for whether a chapter belongs here is `reactTo` — if it tells the student they
   * were right or wrong and moves Hammy's answer streak, it is graded and has to be counted.
   * Going by "does it already call a report* function" is what previously left the boss
   * battle out: 88 chapters, the climax of 88 of the 99 quests, grading the optimal path
   * (the very thing the iron_will badge is defined on) and contributing nothing to the score
   * shown on the next screen.
   *
   * Deliberately NOT here: decision, microsim and simulator. Those call reactTo on
   * `deltaSum >= 0` / `scoreDelta >= 0` — how well the outcome went, not whether an answer
   * was right. They have no correct choice to get wrong, so counting them would score a
   * student on a scenario that was never a question. (Their reactions do still move the
   * answer streak, which is arguably its own inconsistency, but a streak is encouragement
   * rather than a score and it isn't reported anywhere.) */
  reportCheck: (label: string, isCorrect: boolean) => void;
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
    // The slot's height is fixed and reserved from the very first render, whether or not a
    // message is showing, and the bubble inside is out of flow — so nothing here can move
    // Hammy or the chapter below him, however long the message runs. See bubbleSlotCentered.
    <View style={centered ? styles.bubbleSlotCentered : styles.bubbleSlot} pointerEvents="none">
      {display ? (
        <Animated.View
          style={[
            centered ? styles.bubbleInnerCentered : styles.bubbleInner,
            { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
          ]}
        >
          <View style={[styles.reactionBox, centered && styles.reactionBoxCentered]}>
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
/** Holds the player back until the store has finished loading from AsyncStorage.
 *
 * QuestPlayerInner reads its saved resume point ONCE, in a lazy initialiser, which is the only
 * way to have every piece of its state seed from the same snapshot. That read is worthless
 * before hydration: `state` is still DEFAULT_STATE, so lessonProgress is empty, so a resumable
 * lesson would silently start from chapter 1 — and then the first advance would overwrite the
 * real save with that. Losing the save is exactly what this feature exists to prevent, so the
 * read has to wait rather than guess.
 *
 * Only matters when this route is the app's entry point — a reload or a deep link straight
 * into /learn/quest on the web build. Arriving from Home the store is long since hydrated and
 * this renders nothing at all. Keyed so the inner component mounts fresh once ready.
 */
export default function QuestPlayer() {
  const { hydrated } = useStore();
  if (!hydrated) return <Screen edges={['top', 'bottom']} />;
  return <QuestPlayerInner />;
}

function QuestPlayerInner() {
  const router = useRouter();
  const {
    equippedMascotItems, rollAmbientLifeEvent, pendingLifeEvent, resolveLifeEvent,
    lessonProgressFor, saveLessonProgress, clearLessonProgress,
  } = useStore();
  const { moduleId, lessonIndex, isLifeTask } = useLocalSearchParams<{
    moduleId: string; lessonIndex: string; isLifeTask?: string;
  }>();
  const mod = moduleById(moduleId ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const li = Number(lessonIndex ?? 0);
  const quest = content?.quests[li];

  /* Resume where the player left off.
   *
   * Read ONCE, into a lazy useState initialiser, rather than during render or in an effect.
   * Every piece of state below seeds from it, so it has to be the same object for the life of
   * this mount: reading it later would see the save this very screen is writing as it plays,
   * and an effect would run after the first chapter had already rendered — you'd watch chapter
   * 1 appear and then jump.
   *
   * This used to honour a `restart` route param, set by a "Start over from the beginning"
   * button under the preview sheet's Resume. That button is gone (see LessonPath's
   * PreviewSheet), and with it the only caller that ever passed the param — so the branch that
   * ignored the save, and the effect that cleared it on entry, were both unreachable.
   *
   * lessonProgressFor validates the save against the current content and returns null if the
   * quest has been re-authored since — see its comment in store.tsx. */
  const [resumed] = useState(() => lessonProgressFor(mod.id, li));

  const [chapterIdx, setChapterIdx] = useState(resumed?.chapterIdx ?? 0);
  const [xpEarned, setXpEarned] = useState(resumed?.xpEarned ?? 0);
  // No correctCount/gradedTotal state any more — the tally comes from analyticsRef via
  // gradedTally at finish time. See the Complete type.
  const [hintsUsed, setHintsUsed] = useState(resumed?.hintsUsed ?? 0);
  // Which question a knowledgecheck chapter is currently showing — kept in sync via
  // KnowledgecheckView's onQuestionIndexChange, so the header's hint button can look up
  // that specific question's hintTexts entry (see hintText's computation below).
  //
  // Tagged with the chapter it was reported for, the same pattern `reaction` and
  // `reportedLayout` use, and for the same two reasons. It reads as 0 for any chapter other
  // than the one that reported it, so the outgoing chapter's question number can't be used
  // to index the incoming chapter's hints for the frame before that chapter's own mount
  // effect lands. And it replaces a `useEffect(() => setKcQuestionIdx(0), [chapterIdx])`
  // that sat BELOW the `if (!quest || !content)` early return further down — a hook called
  // conditionally, so any render that went from no-quest to quest (or back) would change the
  // hook count and throw "rendered more hooks than during the previous render".
  const [kcQuestion, setKcQuestion] = useState<{ chapterIdx: number; idx: number } | null>(null);
  const kcQuestionIdx = kcQuestion?.chapterIdx === chapterIdx ? kcQuestion.idx : 0;
  const setKcQuestionIdx = (idx: number) => setKcQuestion({ chapterIdx, idx });
  // ONE ScrollView serves every chapter of the lesson — only the content inside it is keyed
  // and remounted — so the scroll offset carried straight over from one chapter to the next.
  // Finish a long chapter scrolled to the bottom, tap Next, and the next chapter opened
  // already scrolled: its title and question above the fold, the reader dropped into the
  // middle of something they hadn't started. Same on every step WITHIN the two multi-step
  // types (teach's concepts, the Quick Check's questions), which advance without remounting
  // the scroller either. Back to the top on every one of those.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [chapterIdx, kcQuestionIdx]);
  // Nothing follows the content down any more, and that is deliberate.
  //
  // There used to be a companion to the reset above: whenever a chapter grew under you, the
  // scroller jumped to the bottom of it. The reasoning was that chapters answer you by
  // appending — the Quick Check puts its explanation below four options, the poll below its
  // buttons — and on a long chapter that explanation can land below the fold, where the
  // always-visible Next button invites you straight past it.
  //
  // It cost more than it bought. A vocab definition that doesn't quite fit is the common case,
  // not the rare one, so in practice the screen yanked itself downward while you were still
  // reading the top of the card — and it fired on ANY growth of more than 8px, which includes
  // a bubble wrapping onto one more line. Being moved mid-sentence by the page is worse than
  // having to scroll: a scroll is something you chose, and you can see there is more.
  //
  // The reset-to-top on a new chapter or a new question stays. That one puts you at the START
  // of something you haven't read, which is where you were going anyway.
  const [terms, setTerms] = useState<LearnedTerm[]>(resumed?.terms ?? []);
  // Mirrors `terms` synchronously. The final chapter's onComplete builds the results payload
  // in the same handler that can add the last word, and a setState isn't visible yet at that
  // point — same staleness dodge analyticsRef makes just below, for the same reason.
  const termsRef = useRef<LearnedTerm[]>(resumed?.terms ?? []);
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
  const [bossWon, setBossWon] = useState(resumed?.bossWon ?? false);
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
  // Seeded from the save, not from `false`: this is a per-MOUNT ref, so a resumed lesson used
  // to arrive with a fresh roll available and a lesson resumed twice could fire three popups.
  const hasFiredAmbientRef = useRef(resumed?.ambientFired ?? false);
  // A ref, not state — analytics never drives a render in this screen, it's only read once
  // at the final chapter's onComplete to build the results-screen params. A question's
  // "report" and the quest's final onComplete can fire in the very same handler (the last
  // knowledgecheck question's "next" click both reports and completes), and React state
  // updates from the same handler wouldn't be visible yet when onComplete reads them — a
  // ref sidesteps that staleness entirely by updating synchronously.
  // normalizeAnalytics, not `?? EMPTY_ANALYTICS`: a save written by an older build really
  // does come back missing newer fields (see its comment), and every reporter below appends
  // to one of those arrays.
  const analyticsRef = useRef<QuestAnalytics>(normalizeAnalytics(resumed?.analytics));
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
    reportCheck: (label, isCorrect) => {
      analyticsRef.current = { ...analyticsRef.current, checks: [...analyticsRef.current.checks, { label, isCorrect }] };
    },
  };

  // router.back() no-ops with nowhere to go — e.g. the web build reloaded directly on this
  // route (no in-app history) via a deep link or the /m viewport redirect. Fall back to the
  // module's own page so the X/Back button always goes somewhere.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/learn/module/${mod.id}`);
  };

  // Asks before leaving, and the answer is now reassurance rather than a warning.
  //
  // The old copy said "your progress in this lesson isn't saved, so you'd start it again from
  // the beginning" — true at the time, and the actual problem: twelve minutes in, the choice
  // was lose the lot or don't leave. Once every chapter advance started writing a resume point
  // (see onComplete's advance) the prompt was removed altogether as friction over a harmless
  // action. That was wrong in practice: with nothing said at all, tapping X and having the
  // lesson vanish feels exactly like losing your work, and the "Paused" label that proves
  // otherwise is on a screen you haven't reached yet. The dialog is the one moment we can
  // actually tell the player their place is kept, so it says so, and names the chapter they
  // will come back to.
  //
  // Drawn in the screen (LeaveLessonDialog below), not handed to window.confirm. The browser's
  // own dialog is OS chrome prefixed "trystacked.app says:" — it looks nothing like the app,
  // at the most-tapped exit in the player. A global in-app dialog host was tried for every
  // confirm in the app and broke on web; this one is local to this screen and uses the same
  // <Modal> the hint popup and boss verdict already use here, which works on /m today.
  //
  // Chapter 1 still leaves without ceremony — no advance has happened, so there is no resume
  // point yet and nothing to reassure anyone about.
  const [leaveOpen, setLeaveOpen] = useState(false);
  const confirmQuit = () => {
    // `quest` in the guard as well as chapterIdx: this is declared above the "no quest found"
    // early return below, so it has to hold up on a lesson that doesn't resolve — there's
    // nothing to leave, and nothing to promise about, so just go.
    if (chapterIdx === 0 || !quest) { goBack(); return; }
    setLeaveOpen(true);
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

  const onComplete: Complete = (xpDelta) => {
    const nextXp = xpEarned + xpDelta;
    // Words are banked by learnTerm as they're taught, not swept up here on the way out —
    // see its comment. termsRef is read rather than `terms` so a word learned in this very
    // handler still makes the results payload.
    const nextBossWon = bossWon || chapter.type === 'bossbattle';
    const isFinalChapter = chapterIdx + 1 >= quest.chapters.length;

    const advance = () => {
      if (isFinalChapter) {
        // The lesson is over, so the resume point goes with it — otherwise finishing would
        // leave a save behind claiming the player is still partway through, and the module
        // list would offer to resume a lesson they'd just completed.
        clearLessonProgress(mod.id, li);
        // The whole lesson's grading travels in here, and the results screen derives both the
        // score it shows and the coins it pays from it (gradedTally). correctCount/total used
        // to ride along as route params from the player's own separate counters — that is the
        // duplicate this change removes, not just a tidy-up: those counters were fed by four
        // chapter types while the report read nine, so the payout and the score were computed
        // off different sets and drifted apart the moment either list changed.
        setPendingQuestAnalytics({ ...analyticsRef.current, learnedTerms: termsRef.current });
        router.replace({
          pathname: '/learn/results',
          params: {
            moduleId: mod.id, lessonIndex: String(li), xpEarned: String(nextXp),
            questId: quest.id, hintsUsed: String(hintsUsed), bossWon: nextBossWon ? '1' : '0',
            ...(isLifeTask ? { isLifeTask } : {}),
          },
        });
        return;
      }
      setXpEarned(nextXp);
      setBossWon(nextBossWon);
      setChapterIdx(chapterIdx + 1);
      // Write the resume point on every chapter advance — this is the whole feature.
      //
      // Built from the `next*` locals rather than from state, for the same staleness reason
      // analyticsRef exists: this runs in the same handler that just called setXpEarned and
      // friends, and those values aren't readable back yet. termsRef/analyticsRef are already
      // synchronous mirrors, so they can be read directly.
      //
      // Deliberately NOT saved for a real-life sub-quest: isLifeTask lessons are launched with
      // a lessonIndex that indexes `lessons`, not `quests`, so the key would collide with the
      // main quest at that same index and resume one into the other.
      if (!isLifeTask) {
        saveLessonProgress(mod.id, li, {
          questId: quest.id,
          chapterCount: quest.chapters.length,
          chapterIdx: chapterIdx + 1,
          xpEarned: nextXp,
          hintsUsed,
          bossWon: nextBossWon,
          terms: termsRef.current,
          analytics: analyticsRef.current,
          ambientFired: hasFiredAmbientRef.current,
          savedAt: Date.now(),
        });
      }
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
    if (!isLifeTask && !isFinalChapter && !hasFiredAmbientRef.current && rollAmbientLifeEvent(mod.id)) {
      hasFiredAmbientRef.current = true;
      pendingAdvanceRef.current = advance;
      setAmbientEventActive(true);
    } else {
      advance();
    }
  };

  // Gates the chapter page-turn (see ChapterFrame), as the lesson path gates its own.
  const reduceMotion = useReducedMotion();

  const layoutMode: LayoutMode = reportedLayout?.chapterIdx === chapterIdx
    ? reportedLayout.mode
    : initialLayoutMode(chapter);
  const onLayoutMode = (m: LayoutMode) => setReportedLayout({ chapterIdx, mode: m });

  // Hidden during a story chapter's intro beat or a 'hint' chapter, both of which already
  // show their own big Hammy in the content area instead (StoryView/HintView), so a second
  // one up here would just be a redundant duplicate; and on the handful of chapter types
  // that are simply too tall to share a screen with him (see TALL_CHAPTER_TYPES) plus the
  // dense full-screen teach walkthroughs.
  //
  // Nothing content-dependent decides this any more. A per-question height estimate was
  // tried, to drop him only on Quick Checks and vocab cards that wouldn't fit beside him —
  // but the threshold caught almost everything, so in practice he vanished from the ordinary
  // questions too. He's worth more on screen than the handful of scroll-free screens the
  // estimate bought; long chapters scroll instead.
  const showCompanion = layoutMode === 'normal' && !TALL_CHAPTER_TYPES.has(chapter.type);
  // Centered above the content, rather than off to its left, for the two chapter types
  // that read as a scene rather than a question: the story's dialogue (the conversation is
  // with him) and Match It (a centered grid).
  // Deliberately NOT the vocab chapter. Centring him over a definition was tried and reverted:
  // he belongs off to the left there, with the card beside him.
  const companionCentered = chapter.type === 'story' || chapter.type === 'matching';
  // The story's dialogue log puts its title above the companion rather than at the top of
  // the scroller — the companion lives outside the scroller, so a heading rendered inside
  // StoryView always landed underneath him. Only the dialogue log; the intro screen keeps
  // its own title on its stage, directly above its big Hammy (see StoryView).
  const storyLogTitle = chapter.type === 'story' && layoutMode === 'normal' ? chapter.title : null;
  // Match It sits higher up the screen than the other centered chapter — Hammy tight under
  // the progress bar, and the grid lifted off centre rather than floating in the middle.
  const raised = chapter.type === 'matching';
  // The grid is vertically centred, so the only way to lift it is to weight the bottom: extra
  // paddingBottom shifts the centre of the free space upward. How much free space there is
  // depends on the grid, and a weight tuned for a small one pushed a big one off the bottom
  // of the screen — so the full lift is only taken when there is genuinely room for it.
  //
  // Pair COUNT alone isn't the test: every chip is forced to the tallest chip's height (see
  // maxChipH), so one 137-character definition makes all three rows of a three-pair grid as
  // tall as a six-pair one. The definition length has to be in the condition too.
  //
  // Read straight off the chapter data, which cannot change while the chapter is on screen,
  // so this stays a static decision made before the first paint rather than the
  // measure-then-react rule this file has rejected elsewhere.
  const matchLift = chapter.type === 'matching'
    && chapter.pairs.length <= 4
    && chapter.pairs.every((p) => p.definition.length <= 70)
    ? 72 : 12;
  // Short chapter types leave a lot of room under the bottom action bar and read as
  // top-heavy at the default companion padding: the poll (a statement and two buttons),
  // decisions ("First Paycheck Lands" — a prompt and a couple of choices) and the swipe
  // cards (one fixed-height card). All drop Hammy further down the screen — the swipe cards
  // furthest, being the shortest content of the three.
  // Decisions go deepest of all. Before an answer they're only a prompt and two choices, and
  // after one the choices are REPLACED by the outcome card — so unlike the poll (which
  // appends its explanation) they never grow past what the screen already had room for, and
  // the space under them is dead either way. Applied to every decision, not just the ones
  // whose outcome carries a comparison chart: the two are indistinguishable until answered,
  // so moving Hammy only on the charted ones would look like he'd drifted at random.
  const companionDrop = chapter.type === 'decision'
    ? styles.companionWrapDeep
    : chapter.type === 'poll'
      ? styles.companionWrapLow
      : chapter.type === 'mythcards'
        ? styles.companionWrapLowest
        : null;
  // Smaller on the vocab chapter, where a 599-character definition is what has to fit without
  // scrolling. Match It used to take a larger 144 for having room to spare — it doesn't on a
  // six-pair grid, so it sits at the standard size like everything else now.
  const companionSize = chapter.type === 'teach' ? 104 : 130;

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Warms the three reaction faces' decode while the student is still on chapter 1, so
          the first graded answer already has its face ready — see Hammy.tsx. */}
      <ReactionFacePreloader />
      <View style={styles.stick}>
        <IconButton name="x" size={34} iconSize={16} onPress={confirmQuit} />
        {/* chapterIdx + 1, i.e. how far you've got INCLUDING the chapter you're reading.
            Counting only the chapters behind you meant a lesson opened at a flat 0% and its
            final chapter reported 93% — the bar could never fill, however much you did.
            The count beside it replaces a percentage, which was the bar's own information
            written out twice; "4/15" is the thing the bar can't tell you. */}
        <ProgressBar value={(chapterIdx + 1) / quest.chapters.length} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>{chapterIdx + 1}/{quest.chapters.length}</Txt>
        {/* Keyed per QUESTION, not just per chapter: a knowledge check runs several
            questions inside one chapter, each with its own authored hint, and a single
            instance carried its "already revealed" state across all of them — so question 2
            onward showed as pre-revealed. The fixed-width slot around it holds the space
            whether or not this chapter has a hint at all, so the progress bar and % beside
            it stop shifting as you move between chapters that have one and chapters that
            don't. */}
        <View style={styles.hintSlot}>
          <HintCorner
            key={`${chapter.id}:${kcQuestionIdx}`}
            hintText={hintText}
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
          companionDrop,
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
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          chapter.type === 'matching' && styles.contentCenter,
          raised && { paddingTop: 0, paddingBottom: matchLift },
        ]}
        showsVerticalScrollIndicator={false}
        // A student typing their answer on the explainback chapter has the keyboard up over
        // half the screen. Dragging the content now dismisses it, and taps land on what they
        // hit rather than being swallowed as "dismiss the keyboard" — on iOS a multiline box
        // has no return key to close with, so without these there was no way back out.
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* flexGrow so the chapter actually fills the scroller's height rather than
            shrink-wrapping inside it — that's what lets a chapter whose own root asks to
            be centered (the story intro's stage, Match It's grid) have a height to center
            itself within. Without it those chapters just sat pinned to the top. */}
        {/* Each chapter arrives from the right rather than cross-fading in place, so
            advancing through a quest reads as travelling forward through it. Keyed on the
            chapter id, so this plays once per chapter and never on a re-render within one.
            Kept deliberately small and quick: 10px of travel over 170ms, and no spring. The
            spring's overshoot plus the default 25px made every question visibly swing into
            place, which is a lot of movement to sit through on a fifteen-chapter quest — this
            is meant to register as a page turn, not as an animation you wait for.

            See pageTurn: the travel is the WHOLE animation, and nothing here touches opacity.
            This wrapper holds every chapter's content, so it must not be able to hide it. */}
        <ChapterFrame key={chapter.id} reduceMotion={reduceMotion}>
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
        </ChapterFrame>
      </ScrollView>
      {/* Persistent bottom bar: "Look back" pinned bottom-left, the chapter's primary action
          centered. Equal-width slots on both sides (the right one deliberately empty) rather
          than absolutely positioning the Look back button, so the action button is genuinely
          centered on screen AND can never grow into it however long its label runs ("Reveal
          the risky parts" is the worst case). Fixed height whether or not either control is
          showing, so the content above never shifts when a chapter's action appears or the
          quest's first vocab word gets taught. */}
      {/* Lifted clear of the keyboard. The bar lives OUTSIDE the scroller, pinned to the
          bottom of the screen, so on the explainback chapter — a multiline text box the
          student types a paragraph into — the keyboard came up directly over the "Check my
          answer" button they needed next. iOS doesn't move a fixed-position view on its own,
          and a multiline field has no return key to close the keyboard with, so the chapter
          could be finished only by guessing that a drag dismisses it. Android's own resize
          handling already does this, hence iOS only. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      </KeyboardAvoidingView>
      <LeaveLessonDialog
        visible={leaveOpen}
        onCancel={() => setLeaveOpen(false)}
        onLeave={() => { setLeaveOpen(false); goBack(); }}
      />
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
  reportCheck, learnTerm,
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
    case 'teach': return <TeachView chapter={chapter} onComplete={onComplete} onAction={onAction} onLayoutMode={onLayoutMode} {...reactProps} onQuestionIndexChange={onQuestionIndexChange} learnTerm={learnTerm} reportCheck={reportCheck} />;
    case 'matching': return <MatchingView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportMatchingMistake={reportMatchingMistake} learnTerm={learnTerm} />;
    case 'hint': return <HintView chapter={chapter} onComplete={onComplete} onAction={onAction} onLayoutMode={onLayoutMode} />;
    case 'decision': return <DecisionView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportDecision={reportDecision} />;
    case 'microsim': return <MicrosimView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'poll': return <PollView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportCheck={reportCheck} />;
    case 'mythcards': return <MythcardsView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportMythCard={reportMythCard} />;
    case 'knowledgecheck': return <KnowledgecheckView chapter={chapter} questions={questions} onComplete={onComplete} onAction={onAction} {...reactProps} reportKnowledgeCheck={reportKnowledgeCheck} onQuestionIndexChange={onQuestionIndexChange} />;
    case 'simulator': return <SimulatorView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} />;
    case 'bossbattle': return <BossbattleView chapter={chapter} moduleXpReward={moduleXpReward} onComplete={onComplete} onAction={onAction} {...reactProps} reportDecision={reportDecision} reportCheck={reportCheck} />;
    case 'spotcheck': return <SpotcheckView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportCheck={reportCheck} />;
    case 'priceisright': return <PriceisrightView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportCheck={reportCheck} />;
    case 'explainback': return <ExplainbackView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportExplainback={reportExplainback} reportCheck={reportCheck} />;
    case 'urlinspect': return <UrlinspectView chapter={chapter} onComplete={onComplete} onAction={onAction} {...reactProps} reportCheck={reportCheck} />;
    default: return null;
  }
}

/** True/False (or Myth/Fact) choice button — ported from the website's `.option-btn`
 * correct/wrong treatment (app.css), used for every true/false-shaped chapter (teach's
 * inline check, poll). Once answered, BOTH buttons recolor: whichever one holds the
 * correct answer turns green regardless of which was tapped, and the player's own wrong
 * tap (if any) turns pink — exactly the website's `classList.add('correct'/'wrong')` logic. */
/* It also moves, which it did not before this. Poll and every teach chapter's inline check run
 * through here, so this pair is the single most-tapped control in the whole player — and it was
 * the only one in the file that answered a tap purely by recolouring, with no squeeze under the
 * finger and no reaction to being right or wrong. The two channels are lifted wholesale from
 * `Option` (a confident pop on the correct button, a smaller sideways shake on a wrong one) so
 * that answering True/False feels the same as answering a Quick Check rather than like a
 * different, flatter control that happens to sit in the same lesson. */
function TrueFalseButton({
  label, state, onPress,
}: { label: string; state: 'default' | 'correct' | 'wrong'; onPress?: () => void }) {
  const c = TF_STATE[state];
  const press = useSharedValue(0);
  const verdict = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state === 'correct') {
      verdict.value = withSequence(
        withSpring(1, { damping: 9, stiffness: 320 }),
        withSpring(0, { damping: 14, stiffness: 260 }),
      );
    } else if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-4, { duration: 55 }),
        withTiming(4, { duration: 55 }),
        withTiming(-2.5, { duration: 50 }),
        withTiming(0, { duration: 45 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - press.value * 0.03 + verdict.value * 0.045 },
      { translateX: shake.value },
    ],
  }));
  return (
    <ReanimatedPressable
      disabled={state !== 'default' && !onPress}
      onPress={onPress}
      onPressIn={() => { press.value = withTiming(1, { duration: 70 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 18, stiffness: 400 }); }}
      style={[styles.tfBtn, { borderColor: c.border, backgroundColor: c.bg }, animStyle]}
    >
      <Txt style={[styles.tfBtnTxt, { color: c.text }]}>{label}</Txt>
    </ReanimatedPressable>
  );
}
/* Distinct from the `AnimatedPressable` further down, which Matching builds from React
 * Native's own Animated — this one has to be a Reanimated host because the style above comes
 * from useAnimatedStyle. Created once at module scope for the same reason as that one:
 * createAnimatedComponent inside a render makes a new component type every pass and remounts
 * the button. */
const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);
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
function HintCorner({ hintText, onUseHint }: { hintText?: string } & HintProps) {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  // Chapters with nothing authored render no button at all rather than a permanently greyed
  // one. A disabled control implies "you could have this, but not right now", which was a
  // lie here — story beats and Hammy's own Tip chapters are never getting a hint, so the
  // button could only ever sit there dead. The surrounding slot keeps its width either way,
  // so the progress bar beside it doesn't shift as chapters come and go.
  if (!hintText) return null;
  const press = () => {
    if (!revealed) {
      onUseHint();
      setRevealed(true);
    }
    setOpen(true);
  };
  return (
    <>
      <Pressable style={styles.hintFab} onPress={press}>
        {/* numberOfLines so the label can never wrap onto a second line — the button is a
            single small pill and a wrapped label reads as a rendering glitch. */}
        <Txt style={styles.hintFabTxt} numberOfLines={1}>💡 HINT</Txt>
      </Pressable>
      {/* A real Modal instead of an anchored popover — Modal renders as its own top-level
          overlay outside the normal view tree, so it always sits above everything else
          regardless of DOM/paint order. The previous position:absolute popover was
          reported rendering behind Hammy/content instead of on top of it. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.hintScrim} onPress={() => setOpen(false)}>
          {/* The yellow highlight is a real view wrapped around the card, not a shadow. A
              platform shadow was uneven on every side: shadowRadius spreads softly and
              `elevation` biases the whole thing downward on Android, so the glow read as
              thicker along the bottom than the top. A halo view with equal padding on all
              four sides is even by construction, on every platform, with nothing to tune. */}
          <Pressable style={styles.hintModalHalo} onPress={(e) => e.stopPropagation()}>
            <View style={styles.hintModalCard}>
              <Tag tone="gold">HAMMY'S HINT</Tag>
              {/* Capped and scrollable, the same shape the Look-back popup and the boss
                  verdict sheet already use. The card had neither, so its height was purely
                  the hint's length: the longest authored hint runs 310 characters, and the
                  teach chapters generate theirs from the concept's own definition (see
                  teachHint), where `plain` reaches 626. Past the screen's height the card
                  overflowed a centred scrim in BOTH directions at once, taking the "Got it"
                  button off the bottom and the tag off the top with nothing to scroll. The
                  button stays outside the scroller, so it is always reachable. */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <Txt variant="lead" style={{ fontSize: 14, marginTop: 8 }}>{hintText}</Txt>
              </ScrollView>
              <Button label="Got it" onPress={() => setOpen(false)} style={{ marginTop: 16 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** "Leave this lesson?" — the app's own dialog, drawn in this screen.
 *
 * Deliberately local to the quest player rather than a shared, globally-mounted host. That was
 * built once, for every confirm in the app at once, and broke the confirm on the web build —
 * the build /m actually serves. This uses the same <Modal transparent> the hint popup and the
 * boss verdict already use a few hundred lines up, on this same screen, which works there
 * today; the scrim/card arrangement is the preview sheet's (a full-bleed Pressable to dismiss,
 * with the card as its SIBLING rather than its child) so there's no nested-Pressable
 * stopPropagation to get wrong.
 *
 * The copy is the whole point of it existing. It used to warn that progress WASN'T saved,
 * which was true then and was the reason leaving was painful. Now it says the opposite, and
 * saying it is the job — with nothing on screen at all, tapping X and watching the lesson
 * vanish feels exactly like losing the work, whatever the store did. */
function LeaveLessonDialog({
  visible, onCancel, onLeave,
}: { visible: boolean; onCancel: () => void; onLeave: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.leaveRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Keep going" />
        <View style={styles.leaveCard}>
          <Txt style={styles.leaveTitle}>Leave this lesson?</Txt>
          <Txt style={styles.leaveBody}>Your progress will be saved.</Txt>
          {/* Leaving is what they asked for by tapping the X, so it leads. Staying is the
              quiet option rather than the defended one — there's nothing to defend against
              any more. */}
          <Button label="Leave" variant="pink" onPress={onLeave} style={{ marginTop: 18 }} />
          <Button label="Keep going" variant="ghost" onPress={onCancel} style={{ marginTop: 10 }} />
        </View>
      </View>
    </Modal>
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

  // Rendering nothing here used to strand the lesson for good. The chapter transition is
  // already paused waiting on this overlay (pendingAdvanceRef holds it), the action button
  // that started it has been spent (fireAction won't run the same action twice), and this
  // Modal deliberately ignores the Android back button — so an event id that doesn't resolve
  // to a real event meant no popup, no way to advance and no way to retry: the lesson simply
  // stopped. Releasing the paused transition turns that into a skipped popup instead.
  useEffect(() => {
    if (!event) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Closing only hides the modal; which screen it was showing is reset on the way IN, not on
  // the way out. Clearing openTerm here as well would swap the card back to the full word grid
  // while the fade-out is still playing, so dismissing a definition flashed the list on the
  // way past and read as an extra screen.
  const closeAll = () => setOpen(false);

  return (
    <>
      <Pressable onPress={() => { setOpenTerm(null); setOpen(true); }} style={styles.lookBackBtn} hitSlop={10}>
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
                {/* Scrollable, exactly like the word list on the other branch. The card is
                    capped at 75% of the screen and the longest definition in the content runs
                    626 characters — around fourteen lines here — so on a short screen the
                    definition ran past the bottom of the card with nothing to scroll and the
                    "Got it" button, the last thing in the column, was what got cut off. The
                    button stays outside the scroller so it's always reachable. */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Txt style={styles.glossaryPopupTerm}>{openTerm.term}</Txt>
                  <Txt style={styles.glossaryPopupDef}>{openTerm.plain}</Txt>
                </ScrollView>
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
  // Gates each beat's arrival animation (see StoryBeat), same as the chapter page-turn.
  const reduceMotion = useReducedMotion();
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
    <View style={[{ gap: 10, flexGrow: 1 }, !showIntro && styles.storyLog]}>
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
            // Only the newest beat animates: the ones already on screen are never remounted
            // (they keep their key and their place in the list), so an entering animation here
            // plays exactly once per beat, as it arrives under the previous one.
            //
            // See beatArrive for why it must not touch opacity. This is the same trap the
            // chapter wrapper above had, one level down, and it is the reason this used to be
            // a plain View with no animation at all — an earlier pass read the invisible
            // dialogue as "a nested entering animation never gets scheduled" and deleted the
            // animation rather than the opacity. Nested entering animations do run (measured:
            // REA-ENTERING keyframes are emitted for these beats), so the motion can come back
            // now that it can't take the text with it.
            <StoryBeat key={idx} reduceMotion={reduceMotion}>
              {!isNarrator ? (isHammy ? <HammyHeadAvatar /> : (
                <View style={styles.storyAvatar}>
                  <Txt style={styles.storyAvatarTxt}>{beat.speaker.charAt(0)}</Txt>
                </View>
              )) : null}
              <View style={[styles.storyBubble, isNarrator && styles.storyBubbleNarrator]}>
                <Txt style={[styles.storyBubbleTxt, styles.storyBubbleTxtCentered, isNarrator && styles.storyBubbleNarratorTxt]}>{beat.text}</Txt>
              </View>
            </StoryBeat>
          );
        })
      )}
    </View>
  );
}

/* ───────────────────────── teach ───────────────────────── */
function TeachView({
  chapter, onComplete, onAction, onLayoutMode, reactTo, clearReaction, onQuestionIndexChange, learnTerm, reportCheck,
}: {
  chapter: TeachChapter; onComplete: Complete;
  /** Reports which concept is showing, so the header's hint button can offer THAT concept's
   * definition (see teachHint) rather than the first one's. */
  onQuestionIndexChange?: (i: number) => void;
} & ReactProps & ActionProps & LayoutModeProps & LearnTermProps & Pick<ReportProps, 'reportCheck'>) {
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
  // Optional-chained through `concept` as well: a teach chapter with an empty concepts array
  // would otherwise throw here and take the whole lesson down with a red screen, rather than
  // degrading to a skippable chapter. No such chapter exists in the content today; this costs
  // nothing and means a future one can't crash a student mid-lesson.
  const hasCheck = !!concept?.check?.statement;

  useEffect(() => {
    onLayoutMode(chapter.fullScreen ? 'full' : 'normal');
    return () => onLayoutMode('normal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.fullScreen]);

  const pick = (guess: boolean) => {
    setAnswered(guess);
    reactTo(guess === concept.check?.isTrue);
    // 358 of these across the content — the single largest source of graded moments, and
    // previously counted by nothing at all. The statement is the label, since that's the
    // claim they judged; the term itself is already in the Look-back book.
    if (concept.check?.statement) reportCheck(concept.check.statement, guess === concept.check.isTrue);
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
  }, [hasCheck, answered, last, i]);

  // After every hook, so the hook order is identical whether or not there's a concept to show.
  if (!concept) return null;

  return (
    // Keyed to the concept index so each concept swap gets its own fade in/out instead of an
    // instant cut.
    // Top-anchored for the same reason as the poll and Quick Check above: the true/false
    // result appearing must not re-flow the definition being read.
    //
    // Definition and check share one screen. This was split across two beats to keep the
    // longest concepts inside a single screen (the longest `plain` in the content runs 599
    // characters), and put back by product decision — reading the definition and answering
    // its check belong together. The cost is that the densest vocab chapters scroll again;
    // the tightened card metrics below claw back some of it but not all.
    <Reanimated.View key={i} entering={FadeIn.duration(220)} style={{ gap: 10, flexGrow: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Card style={styles.conceptCard}>
        <Txt style={styles.term}>{concept.term}</Txt>
        <Txt variant="lead" style={styles.conceptPlain}>{concept.plain}</Txt>
        <Txt style={styles.conceptAnalogy}>{concept.analogy}</Txt>
        {concept.linkOut ? (
          <Button label={`${concept.linkOut.label} →`} variant="ghost" size="sm" onPress={() => router.push('/(tabs)/tools')} />
        ) : null}
      </Card>
      {hasCheck ? (
        <Card style={styles.conceptCheckCard}>
          <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: colors.ink }}>{concept.check?.statement}</Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TrueFalseButton label="True" state={tfState(true, answered, concept.check?.isTrue)} onPress={answered === null ? () => pick(true) : undefined} />
            <TrueFalseButton label="False" state={tfState(false, answered, concept.check?.isTrue)} onPress={answered === null ? () => pick(false) : undefined} />
          </View>
          {answered !== null ? (
            <AnswerFeedback>
              <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === concept.check?.isTrue ? colors.greenDark : colors.pinkDark }}>
                {answered === concept.check?.isTrue ? 'Correct!' : `Not quite. That's ${concept.check?.isTrue ? 'true' : 'false'}.`}
              </Txt>
            </AnswerFeedback>
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
    // Top-anchored, so the title and prompt sit directly under Hammy and STAY there. This
    // was centred, which looked balanced until you answered: the outcome card is a different
    // height from the choice list it replaces, so the whole column re-centred around it and
    // the question you'd just read jumped up the screen. Pinning it to the top means only
    // the part that actually changes moves. The slack that centring used to absorb is
    // handled by dropping the companion instead (companionWrapDeep).
    <View style={{ gap: 10, flexGrow: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      {/* Tighter leading than the shared `lead` variant: the longest scenario in the content
          runs 310 characters, which is seven lines here, and at 22 those seven lines plus the
          outcome card and its chart were the last thing in the player still overflowing. 19
          keeps this readable and buys the chart its room back without moving Hammy, whose
          position on this chapter type is deliberate (see companionWrapDeep). */}
      <Txt variant="lead" style={styles.decisionText}>{chapter.prompt}</Txt>
      {!picked ? (
        <View style={{ gap: 10 }}>
          {chapter.choices.map((c) => (
            <Option key={c.id} label={c.label} onPress={() => pick(c)} />
          ))}
        </View>
      ) : (
        // Deliberately NOT wrapped in AnswerFeedback, and the entrance is opacity-only. This
        // outcome REPLACES the choice list rather than being appended below it, so the whole
        // panel is already changing — and MOVING a card that contains a bar chart made the
        // bars themselves look like they were sliding, which reads as the numbers being
        // unstable. A plain fade has nothing to mistake for the data changing.
        <Reanimated.View entering={FadeIn.duration(260)}>
        <Card style={styles.decisionOutcomeCard}>
          <Txt variant="lead" style={styles.decisionText} color={colors.ink}>{picked.outcome.text}</Txt>
          {/* Ported from the website's renderDecisionOutcome pg-column-chart — a real
              comparison chart instead of just prose, e.g. "saved this check" vs. "take-home
              pay" as two bars. Only some decision chapters carry `compare` data. */}
          {picked.outcome.compare ? <ColumnChart data={picked.outcome.compare} /> : null}
        </Card>
        </Reanimated.View>
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

/** Wraps a chapter's answer feedback so every type reveals it the same way: a soft fade with
 * a barely-there nudge as it settles.
 *
 * Third pass at this. A rise-into-place read as the result shoving the question around (even
 * though nothing above it moves), and a proper ±7px shake was too loud for something that
 * fires on literally every answer in the lesson. This keeps the shape of a shake — a small
 * horizontal settle, so the eye catches the new block — at an amplitude you notice without
 * being interrupted by. Nothing on screen changes position.
 *
 * Runs once on mount (the block is conditionally rendered, so mount IS the reveal). Both
 * channels are transform/opacity only, hence useNativeDriver. */
function AnswerFeedback({ children }: { children: ReactNode }) {
  // useState's lazy initialiser rather than useRef().current: same "create once, keep the
  // same instance" behaviour, without reading a ref during render (which the react-hooks
  // lint rule flags, since a ref read at that point can't be relied on to be up to date).
  const [shake] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const step = (toValue: number, duration: number) =>
      Animated.timing(shake, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      // Two small beats and done — under 3px, so it registers as the block arriving rather
      // than as the block objecting.
      Animated.sequence([step(-2.5, 90), step(1.5, 90), step(0, 80)]),
    ]).start();
  }, [shake, fade]);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateX: shake }] }}>
      {children}
    </Animated.View>
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
    // Deliberately top-anchored. Centering this was tried and reverted: it bought a bit of
    // bottom space but shifted the sliders up the moment the feedback card appeared, so the
    // control you'd just been dragging moved out from under your finger as you read the
    // result. Everything above the feedback stays exactly where it was laid out.
    // gap 8 and tightened cards throughout: this chapter stacks four cards plus its feedback,
    // so every card's padding is paid five times over and the budget it left for the sliders
    // themselves was what pushed the longest ones (eight fixed costs, three sliders) past the
    // bottom of the screen.
    <View style={{ gap: 8, flexGrow: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={styles.simPrompt}>{chapter.prompt}</Txt>
      <Card style={styles.simCard}>
        <Txt style={styles.term}>Income: ${chapter.income}</Txt>
        {chapter.fixedCosts.map((f) => (
          <View key={f.label} style={styles.rowBetween}>
            <Txt variant="lead" style={styles.simRowTxt}>{f.label}</Txt>
            <Txt style={{ fontFamily: font.bold, fontSize: 12.5 }}>${f.amount}</Txt>
          </View>
        ))}
      </Card>
      <Card style={[styles.simCard, { gap: 8 }]}>
        {chapter.sliders.map((s) => (
          <View key={s.id} style={{ gap: 2 }}>
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
      <Card style={[styles.simCard, { alignItems: 'center', gap: 0 }]}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5 }}>LEFT OVER</Txt>
        <Txt style={{ fontFamily: font.display, fontSize: 24, color: leftover < 0 ? colors.danger : colors.greenDark }}>${leftover}</Txt>
      </Card>
      {submitted ? (
        <AnswerFeedback>
          <Card style={styles.simCard}><Txt style={{ fontFamily: font.semi, fontSize: 13.5, lineHeight: 18 }} color={tier.ok ? colors.greenDark : colors.pinkDark}>{friendlyTierText(tier.text)}</Txt></Card>
        </AnswerFeedback>
      ) : null}
    </View>
  );
}

/* ───────────────────────── poll ───────────────────────── */
function PollView({ chapter, onComplete, onAction, reactTo, reportCheck }: {
  chapter: PollChapter; onComplete: Complete;
} & ReactProps & ActionProps & Pick<ReportProps, 'reportCheck'>) {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const pick = (guess: boolean) => {
    setAnswered(guess);
    reactTo(guess === chapter.isTrue);
    // The statement, not the chapter title — it's what the student judged, and what
    // "Worth another look" needs to name back to them.
    reportCheck(chapter.statement, guess === chapter.isTrue);
  };
  useEffect(() => {
    onAction(answered !== null ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);
  return (
    // Top-anchored, NOT centered. Centering re-flowed the whole question upward the instant
    // the explanation appeared — the statement you were still reading slid out from under
    // you. Everything above the feedback now stays exactly where it started; the feedback
    // extends the column downward instead. Type is a notch under the shared defaults so the
    // question, both buttons and the explanation all fit beside Hammy without scrolling.
    //
    // paddingTop rather than centring is how this sits lower down the screen: it's a fixed
    // offset, so it uses the spare room without reintroducing the shift-on-answer.
    <View style={{ gap: 9, flexGrow: 1, paddingTop: 22 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 13.5, lineHeight: 19 }}>{chapter.intro}</Txt>
      <Card style={{ padding: 15 }}><Txt style={{ fontFamily: font.displayMed, fontSize: 14.5, color: colors.ink }}>{chapter.statement}</Txt></Card>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TrueFalseButton label="True" state={tfState(true, answered, chapter.isTrue)} onPress={answered === null ? () => pick(true) : undefined} />
        <TrueFalseButton label="False" state={tfState(false, answered, chapter.isTrue)} onPress={answered === null ? () => pick(false) : undefined} />
      </View>
      {answered !== null ? (
        <AnswerFeedback>
          <Card style={{ padding: 15 }}>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === chapter.isTrue ? colors.greenDark : colors.pinkDark }}>
              {answered === chapter.isTrue ? 'Correct!' : 'Not quite.'}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 12.5, lineHeight: 17.5, marginTop: 4, color: answered === chapter.isTrue ? colors.greenDark : colors.pinkDark }}>{chapter.explanation}</Txt>
          </Card>
        </AnswerFeedback>
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
/** Under this much travel a release counts as a tap rather than a short drag, and the card
 * demonstrates the swipe instead of just settling back. See onPanResponderRelease. */
const MYTH_TAP_SLOP = 4;

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
        return;
      }
      setDragDir(null);
      // A tap, not a short drag. The swipe is the only interaction in the player with no
      // button behind it, which is the point of this chapter — but it does mean a student
      // who taps the card the way they tap everything else gets nothing back, with no way to
      // find out why. So the card demonstrates itself: a tap rocks it right then left, the
      // two directions it wants, and settles. It answers nothing — this is the gesture being
      // taught, not performed.
      if (Math.abs(g.dx) < MYTH_TAP_SLOP) {
        Animated.sequence([
          Animated.timing(pan.x, { toValue: 18, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pan.x, { toValue: -18, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.spring(pan.x, { toValue: 0, friction: 6, useNativeDriver: true }),
        ]).start();
        return;
      }
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start();
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
    // correctSoFar still drives the XP (xpPerCorrect is per card), but the right/total tally
    // now comes from the per-card reportMythCard calls above — see the Complete type.
    if (last) { onComplete((chapter.xpPerCorrect ?? 0) * correctSoFar); return; }
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
  // Once resolved, the card's colour reports whether you were RIGHT — not which way you
  // swiped. It used to key off guessedTrue, so swiping "true" painted the card green even
  // when true was the wrong call, and swiping "false" painted it pink even when false was
  // correct. Half of all answers were coloured backwards, which is what made this screen
  // hard to read. While still dragging, the colour does track direction — there's no verdict
  // yet, so green/pink there is just a preview of which way you're about to commit.
  const borderColor = resolved
    ? (resolved.guessedRight ? colors.green : '#D98A9E')
    : dragDir === 'true' ? colors.green : dragDir === 'false' ? '#D98A9E' : colors.borderOpt;
  // A full tint behind the card as well as the border, so the verdict reads at a glance
  // rather than from a 2px edge.
  const cardBg = resolved
    ? (resolved.guessedRight ? colors.tagGreenBg : colors.pinkBg2)
    : colors.white;

  return (
    // Top-anchored with a fixed offset, the same shape PollView uses and for the same reason.
    // This was centred, to sit the card under the thumb rather than up by the header — but
    // the card is only fixed-height while it's unanswered. Resolving it swaps the myth for a
    // verdict line plus a full explanation, so the card grows, and a centred column re-centres
    // around the taller card: the title and the instructions you were reading slid up the
    // screen at the exact moment you were looking for the answer. The offset buys the same
    // lower placement without anything above the card ever moving.
    <View style={{ gap: 10, flexGrow: 1, paddingTop: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 13.5 }}>
        Read the card, then swipe right if you think it&apos;s <Txt style={{ fontFamily: font.extra }}>true</Txt>, left if you think
        it&apos;s <Txt style={{ fontFamily: font.extra }}>false</Txt>.
      </Txt>
      <Txt style={styles.mythProgress}>Card {i + 1} of {chapter.cards.length}</Txt>
      <View style={styles.mythStack}>
        <Animated.View
          {...(resolved ? {} : panResponder.panHandlers)}
          style={[styles.mythCard, { borderColor, backgroundColor: cardBg, transform: [{ translateX: pan.x }, { rotate }] }]}
        >
          {!resolved ? (
            <>
              <Tag tone="warm">TRUE OR FALSE?</Tag>
              <Txt style={styles.mythCardTxt}>{card.myth}</Txt>
              <Txt style={styles.mythSwipeHint}>← Swipe False   ·   Swipe True →</Txt>
            </>
          ) : (
            <>
              {/* Leads with the verdict, not the answer. This tag used to show the card's
                  actual truth ("TRUE"/"FALSE") but take its COLOUR from the swipe direction,
                  so it could read FALSE in green — the answer and the colour saying opposite
                  things at the same time. Correctness is what you want first; the actual
                  truth of the statement is in the line below and in the explanation. */}
              <Tag tone={resolved.guessedRight ? 'green' : 'pink'}>
                {resolved.guessedRight ? '✓ CORRECT' : '✕ NOT QUITE'}
              </Tag>
              <Txt style={[styles.mythGuessLine, { color: resolved.guessedRight ? colors.greenDark : colors.pinkDark }]}>
                You said {resolved.guessedTrue ? 'True' : 'False'}, and it&apos;s {card.isTrue ? 'True' : 'False'}.
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
  // No local tally. Every question reports itself through reportKnowledgeCheck as it's
  // answered, and the lesson's right/total is derived from those reports (see gradedTally),
  // so a per-chapter counter would only be a second copy of the same information.
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
    // A wrong answer speaks the actual explanation (also shown in the card below) instead
    // of a generic "Not quite! Here's why:" — a right answer keeps the plain celebratory
    // pool, since "Nice! 🎉" doesn't need anything more said about it.
    reactTo(isCorrect, isCorrect || !question ? undefined : shortFeedback(question.exp));
    if (question) reportKnowledgeCheck(question.q, isCorrect);
  };
  const next = () => {
    if (last) { onComplete(0); return; }
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
    // Top-anchored. Centering made the entire question jump upward the moment an answer was
    // tapped (the column re-centred around the newly added explanation card) — with the fade
    // on top of the shift, the question read as blinking out and coming back. The `key` still
    // scopes the fade to a real question CHANGE, so answering re-renders in place.
    <Reanimated.View key={i} entering={FadeIn.duration(220)} style={{ gap: 9, flexGrow: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={styles.kcQuestion}>{question.q}</Txt>
      {/* The options deal in one at a time rather than landing as a block. It's ~50ms apart,
          so the whole set is down well before anyone could have finished reading the stem —
          it isn't a wait, it's the difference between a question being dealt and a question
          being pasted. Scoped to a real question CHANGE by the parent's key={i}: these
          wrappers keep their keys when an answer is tapped, so nothing re-enters mid-question
          and the letters stay put while Option runs its own correct/wrong reaction. */}
      <View style={{ gap: 8 }}>
        {question.opts.map((c, idx) => {
          const st = !answered ? 'default' : idx === question.correct ? 'correct' : idx === sel ? 'wrong' : 'default';
          return (
            <Reanimated.View key={c} entering={FadeInDown.delay(idx * 50).duration(260).springify().damping(17)}>
              <Option
                label={c}
                control="letter"
                letter={OPT_LETTERS[idx]}
                state={st}
                onPress={() => !answered && pick(idx)}
              />
            </Reanimated.View>
          );
        })}
      </View>
      {answered ? (
        // The WHOLE explanation, not a shortened one.
        //
        // This used to render shortFeedback(question.exp, 85), to keep the card short enough
        // that the options above it and the Next button below stayed on screen together. The
        // cost of that was total: of the 196 Quick Check questions in the content, zero were
        // shown in full — 91 were cut off mid-sentence and the other 105 lost every sentence
        // after the first. And shortFeedback deliberately appends no ellipsis (see its
        // comment), so there was no sign anything was missing: gnp_kc1 ended on a dangling
        // "…and 1.45% for Medicare -", which reads as a rendering fault rather than as an
        // explanation. The longest one lost 373 of its 454 characters.
        //
        // This is the text the student just earned by answering, and the reason a wrong
        // answer is worth anything. It gets to be legible in full; if that means the card
        // runs past the fold, the scroller follows it down (see followContentGrowth).
        <AnswerFeedback>
          <Card style={styles.kcAnswerCard}><Txt variant="lead" style={styles.kcAnswerTxt} color={right ? colors.greenDark : colors.pinkDark}>{question.exp}</Txt></Card>
        </AnswerFeedback>
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

/** The meter's headline number, counted rather than cut to.
 *
 * It used to re-render straight to the new score while MeterTrack's needle took 600ms to slide
 * there, so the two halves of the same reading disagreed for the whole slide — the number was
 * already at 65 while the needle was visibly still leaving 50. Same duration and same
 * cubic-out curve as the needle, so they arrive together. */
function CountUpNumber({ value, style }: { value: number; style?: object }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const start = fromRef.current;
    const delta = value - start;
    if (delta === 0) return;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / 600);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Whatever the number had reached is where the next count starts from, so an interrupted
      // run (tapping a second habit mid-slide) continues from what's on screen instead of
      // snapping back to the previous resting value first.
      fromRef.current = value;
    };
  }, [value]);
  return <Txt style={style}>{Math.round(shown)}</Txt>;
}

/** A habit you try out, not an option you pick.
 *
 * These were plain `Option` rows — the same component the Quick Check uses for real
 * multiple-choice questions — which made a simulator look like a question with a right answer
 * you get one shot at. It isn't: every row is meant to be tapped, in any order, and the point
 * of tapping is to SEE what that habit does to the meter. So the row is built around the
 * reveal instead.
 *
 * Each one carries a score chip on its trailing edge, sized and positioned identically before
 * and after the tap. Unopened it's a muted "?", which is the whole invitation — there's a
 * number hidden there and tapping is how you read it. Opened, the chip pops into the real
 * delta in its own colour and the authored note unfolds underneath, so the explanation STAYS
 * on the row that earned it. (Hammy still narrates it too, but his bubble is gone in a couple
 * of seconds and takes the reasoning with it — which meant that on a four-habit chapter you
 * could finish having read every note and be able to see none of them.) */
/** The decision's `note` is deliberately NOT rendered here, and that is a product decision,
 * not an oversight — see e8a9ff4, "Climb tiles lose the wall of text". This screen is meant to
 * read as a quick tap-and-watch-the-needle-move, and unfolding a sentence under every tile
 * turns a four-habit chapter into a wall of text. The tile keeps the two things only it can
 * show: the habit and its score.
 *
 * It was re-added once, on the argument that Hammy's spoken copy is truncated and transient so
 * the note is otherwise unreadable. That observation is true (see SimulatorView's apply) but it
 * is not a reason to put the paragraph back — if the truncation matters, fix the truncation.
 * Don't restore this. */
function HabitChoice({
  label, delta, revealed, index, onPress,
}: { label: string; delta: number; revealed: boolean; index: number; onPress: () => void }) {
  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.02 }] }));
  const good = delta >= 0;
  return (
    <Reanimated.View entering={FadeInDown.delay(index * 60).duration(280).springify().damping(16)}>
      <Pressable
        disabled={revealed}
        onPress={onPress}
        onPressIn={() => { press.value = withTiming(1, { duration: 80 }); }}
        onPressOut={() => { press.value = withSpring(0, { damping: 20, stiffness: 400, overshootClamping: true }); }}
      >
        <Reanimated.View style={[styles.habit, revealed && (good ? styles.habitGood : styles.habitBad), animStyle]}>
          <View style={styles.habitHead}>
            <Txt style={styles.habitLabel}>{label}</Txt>
            {/* Keyed on `revealed` so the chip genuinely remounts and plays ZoomIn on the
                swap — without the key React reuses the node and the number would just
                change underneath the same static circle. */}
            <Reanimated.View
              key={revealed ? 'on' : 'off'}
              entering={revealed ? ZoomIn.duration(300).springify().damping(11) : undefined}
              style={[styles.habitChip, revealed && (good ? styles.habitChipGood : styles.habitChipBad)]}
            >
              <Txt style={[styles.habitChipTxt, revealed && styles.habitChipTxtOn]}>
                {revealed ? `${good ? '+' : '−'}${Math.abs(delta)}` : '?'}
              </Txt>
            </Reanimated.View>
          </View>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

function SimulatorView({ chapter, onComplete, onAction, reactTo }: { chapter: SimulatorChapter; onComplete: Complete } & ActionProps & ReactProps) {
  // meterKey/meterMin/meterMax are missing on 2/22 real chapters — fall back to a plain 0-100 score.
  const meterKey = chapter.meterKey ?? 'score';
  const meterMin = chapter.meterMin ?? 0;
  const meterMax = chapter.meterMax ?? 100;
  const [meter, setMeter] = useState((meterMin + meterMax) / 2);
  const [used, setUsed] = useState<Set<string>>(new Set());
  // The delta that floats up off the meter on each tap. Keyed by a counter rather than by the
  // value, so tapping two habits worth the same number still replays the animation.
  const [floatDelta, setFloatDelta] = useState<{ value: number; key: number } | null>(null);
  const floatSeqRef = useRef(0);
  const floatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (floatTimerRef.current) clearTimeout(floatTimerRef.current); }, []);

  const apply = (d: SimulatorChapter['decisions'][number]) => {
    setMeter((m) => Math.min(meterMax, Math.max(meterMin, m + d.scoreDelta)));
    setUsed((prev) => new Set(prev).add(d.id));
    floatSeqRef.current += 1;
    setFloatDelta({ value: d.scoreDelta, key: floatSeqRef.current });
    if (floatTimerRef.current) clearTimeout(floatTimerRef.current);
    floatTimerRef.current = setTimeout(() => setFloatDelta(null), 1400);
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
    <View style={{ gap: 10, flexGrow: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 4 }}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5, textTransform: 'uppercase' }}>{meterKey}</Txt>
        <View style={styles.meterValueRow}>
          <CountUpNumber value={meter} style={styles.meterValue} />
          {/* Rises out of the number it just changed, so the score's movement has a visible
              cause sitting right next to it rather than only being inferable from the needle. */}
          {floatDelta ? (
            <Reanimated.View key={floatDelta.key} entering={FadeInUp.duration(340)}>
              <Txt style={[styles.meterFloat, { color: floatDelta.value >= 0 ? colors.green : colors.pink }]}>
                {floatDelta.value >= 0 ? '+' : '−'}{Math.abs(floatDelta.value)}
              </Txt>
            </Reanimated.View>
          ) : null}
        </View>
        <MeterTrack pct={pct} />
        <View style={styles.rowBetween}>
          <Txt style={styles.meterScaleTxt}>{meterMin}</Txt>
          <Txt style={styles.meterScaleTxt}>{meterMax}</Txt>
        </View>
      </Card>
      <View style={{ gap: 9 }}>
        {chapter.decisions.map((d, i) => (
          <HabitChoice
            key={d.id}
            label={d.label}
            delta={d.scoreDelta}
            revealed={used.has(d.id)}
            index={i}
            onPress={() => apply(d)}
          />
        ))}
      </View>
    </View>
  );
}

/* ───────────────────────── bossbattle ───────────────────────── */
/** Pick a move, then Check answer, then a verdict popup.
 *
 * Fourth approach to this chapter. It has been an intrusive popup, then the full list kept on
 * screen with the outcome appended (which pushed the result below the fold on long scenarios),
 * then the list collapsing to just the chosen row. All three had the same underlying problem:
 * the boss battle is the graded finale of a quest and none of them ever said whether you got
 * it RIGHT. "How it played out" narrates a consequence and leaves the student to infer the
 * verdict from its tone, which is a lot to ask of a paragraph.
 *
 * So selection is now separate from commitment — tap a choice, change your mind freely, then
 * Check answer — and the verdict arrives as a popup that leads with a tick or a cross before
 * any prose. The consequence text is still the explanation, it just no longer has to carry the
 * grade as well.
 *
 * "Right" is the choice with the highest xpMultiplier. The content scores every boss choice on
 * a 0.4–1.25 scale with exactly one top option per chapter, so the best move is already
 * unambiguous in the data — nothing new had to be authored for this. */
function BossbattleView({
  chapter, moduleXpReward, onComplete, onAction, reactTo, reportDecision, reportCheck,
}: { chapter: BossbattleChapter; moduleXpReward: number; onComplete: Complete }
  & ActionProps & ReactProps & Pick<ReportProps, 'reportDecision' | 'reportCheck'>) {
  const { height: winH } = useWindowDimensions();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  const best = chapter.choices.reduce((a, b) => (b.consequence.xpMultiplier > a.consequence.xpMultiplier ? b : a));
  const isRight = !!picked && picked.id === best.id;

  const check = () => {
    if (!picked) return;
    setChecked(true);
    // Reported here rather than on selection: before Check answer a tap is just a highlight
    // the student can move around, so recording it then logged every option they hovered over
    // as a decision they made.
    reportDecision('Boss battle', picked.label);
    reactTo(isRight);
    // Counted, not just logged. reportDecision records WHICH choice was made (for the report's
    // decision list); this records whether it was the right one, which is what the score is
    // made of. Without it the last chapter of 88 of the 99 quests graded the student on screen
    // and then contributed nothing to the number they saw on the very next screen.
    reportCheck(chapter.title, isRight);
  };
  // Ported verbatim from finishQuest: bossXP = Math.round(module.xpReward * xpMultiplier).
  //
  // Guarded because there are now two ways to fire it — the popup's own button and the bottom
  // bar's, which is still live behind the scrim — and the boss battle is the last chapter of
  // its quest, so a double fire means completing the whole lesson twice.  The bottom bar has
  // its own per-action guard (see fireAction); this covers the popup's button and the Android
  // back button, which neither of them can see.
  const finishedRef = useRef(false);
  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete(Math.round(moduleXpReward * (picked?.consequence.xpMultiplier ?? 0)));
  };

  // No bottom-bar action once the verdict sheet is up. The scrim is only 55% opaque, so the
  // bar stayed visible underneath it — a second, dimmed "Finish quest →" sitting below the
  // sheet's own copy of the same button, which reads as the screen having two of them. The
  // sheet's button and the Android back gesture (onRequestClose) both reach `finish`, so
  // nothing is lost by clearing it.
  useEffect(() => {
    onAction(checked ? null : { label: 'Check answer', onPress: check, disabled: !pickedId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, pickedId]);

  return (
    // flexGrow rather than flex, for the reason spelled out on matchWrap: flexBasis 0 would
    // let a long scenario plus four choices overflow this box silently instead of extending
    // the scroller. The boss battle carries the longest scenario text in the app.
    <View style={{ gap: 10, flexGrow: 1, justifyContent: 'center' }}>
      <Tag tone="warm">⚔ BOSS CHALLENGE</Tag>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.scenario}</Txt>
      {/* Every choice stays on screen the whole time, before and after checking. Nothing here
          is scrollable by design: four rows and a scenario fit the screen this chapter type
          gets to itself (bossbattle is in TALL_CHAPTER_TYPES, so there is no companion Hammy),
          and the verdict now lives in a popup rather than competing for the same space. */}
      <View style={{ gap: 10 }}>
        {chapter.choices.map((c) => {
          // Before checking, the selected row is simply highlighted — no verdict is implied.
          // After, the rows carry the answer too, so the popup isn't the only place it exists.
          const state = !checked
            ? (c.id === pickedId ? 'on' : 'default')
            : c.id === best.id ? 'correct'
              : c.id === pickedId ? 'wrong' : 'default';
          return (
            <Option
              key={c.id}
              label={c.label}
              state={state}
              onPress={() => !checked && setPickedId(c.id)}
            />
          );
        })}
      </View>

      {/* A bottom sheet rather than a centred dialog, matching the ambient life-event overlay
          above so the two read as the same kind of interruption. It also rises from the same
          edge the Check answer button sits on, so the verdict arrives from where the tap
          happened, and it leaves the choice rows visible above it. */}
      <Modal visible={checked} transparent animationType="fade" onRequestClose={finish}>
        <View style={styles.bossSheetRoot}>
          <View style={[StyleSheet.absoluteFill, styles.ambientLifeScrim]} />
          {/* Capped and scrollable, the same shape the ambient life-event sheet uses. This
              sheet is now the ONLY way to finish the quest — the bottom bar's action is
              cleared while it's open, so its button can't be allowed to sit below the bottom
              of the screen on any device. The verdict prose runs to 190 characters and gains
              a "stronger move" block on a wrong answer, which fits today; the cap means it
              still can't strand anyone if a longer one is ever authored. The button is
              outside the scroller, so it's on screen whatever the text does. */}
          <Reanimated.View entering={SlideInDown.duration(300)} style={[styles.bossVerdictSheet, { maxHeight: winH * BOSS_SHEET_MAX_HEIGHT_PCT }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bossVerdictScroll}>
              {/* The mark comes first and is the biggest thing in the sheet — the whole point
                  of this popup is that the grade should not have to be inferred from the
                  prose under it. */}
              <View style={[styles.bossVerdictMark, isRight ? styles.bossVerdictMarkOk : styles.bossVerdictMarkBad]}>
                <Txt style={styles.bossVerdictGlyph}>{isRight ? '✓' : '✕'}</Txt>
              </View>
              <Txt style={[styles.bossVerdictTitle, { color: isRight ? colors.greenDark : colors.pinkDark }]}>
                {isRight ? 'Correct!' : 'Not quite'}
              </Txt>
              <Txt variant="lead" style={styles.bossVerdictBody}>{picked?.consequence.text}</Txt>
              {!isRight ? (
                <View style={styles.bossBetterMove}>
                  <Txt style={styles.bossBetterMoveLabel}>THE STRONGER MOVE</Txt>
                  <Txt variant="lead" style={styles.bossBetterMoveTxt}>{best.label}</Txt>
                </View>
              ) : null}
            </ScrollView>
            <Button label="Finish quest →" onPress={finish} style={{ marginTop: 16, width: '100%' }} />
          </Reanimated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ───────────────────────── spotcheck ───────────────────────── */
/** Two phases. First the document itself, with every line tappable. Then a walkthrough of the
 * lines that turned out to matter, one at a time.
 *
 * The walkthrough is the fix for this chapter type being the app's worst offender for
 * scrolling by a wide margin. Revealing used to expand EVERY segment's explanation inline at
 * once — seven segments each growing four or five lines inside one card, ~1070px of content
 * against the ~621px a chapter without Hammy gets. Collapsing the list once answered is the
 * same move BossbattleView already makes for the same reason ("the outcome takes the space
 * the other options were using"), and it brings the revealed state down to roughly 313px.
 *
 * The review set is deliberately not just the red flags: it's every red flag PLUS anything the
 * student flagged that was actually fine. A wrong flag is exactly the case where the
 * explanation is worth reading ("this math checks out, but still worth a quick multiply"), and
 * dropping it would silently skip feedback on the mistake they actually made. Lines that are
 * fine and weren't flagged have nothing to say and are left out. */
function SpotcheckView({ chapter, onComplete, onAction, reactTo, reportCheck }: {
  chapter: SpotcheckChapter; onComplete: Complete;
} & ActionProps & ReactProps & Pick<ReportProps, 'reportCheck'>) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const flags = chapter.segments.filter((s) => s.isRedFlag);
  const caught = flags.filter((s) => flagged.has(s.id));
  const review = chapter.segments.filter((s) => s.isRedFlag || flagged.has(s.id));
  const reveal = () => {
    setRevealed(true);
    // All-or-nothing, matching what Hammy reacts to on the line above: catching 2 of 3 red
    // flags is not "spotted the problem". One judgement per chapter, so the chapter title is
    // the right label here (unlike the poll, where each statement is its own question).
    const allCaught = caught.length === flags.length;
    reactTo(allCaught);
    reportCheck(chapter.title, allCaught);
  };

  // `flagged` has to be in the deps, not just `revealed`. The action object holds a closure,
  // and with only [revealed] the one reported on mount — captured when nothing was flagged
  // yet — was still the one the button fired. So `reveal` graded against an empty set and
  // Hammy reacted as though you'd caught nothing, every time, no matter how you actually did.
  // The verdicts shown in the review cards were always right (they read state during render),
  // which is what hid this: only his reaction was wrong.
  useEffect(() => {
    if (!revealed) { onAction({ label: 'Check my answers', onPress: reveal }); return; }
    const lastReview = reviewIdx + 1 >= review.length;
    onAction({
      label: lastReview ? 'Next' : 'Next line',
      onPress: () => (lastReview ? onComplete(0) : setReviewIdx(reviewIdx + 1)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, reviewIdx, review.length, flagged]);

  // Nothing to walk through: this posting had no red flags in it and the student flagged
  // nothing either. Without this branch the screen simply stayed on the document after
  // "Check my answers", unchanged, with the button quietly relabelled to Next — the one case
  // where the chapter answered a question by appearing to ignore it.
  if (revealed && !review.length) {
    return (
      <View style={{ gap: 10, flexGrow: 1 }}>
        <Txt variant="h2">{chapter.title}</Txt>
        <Reanimated.View entering={FadeIn.duration(220)}>
          <Card style={{ gap: 8 }}>
            <Tag tone="green">✓ NOTHING TO FLAG</Tag>
            <Txt variant="lead" style={{ fontSize: 13 }}>
              Right call. There was nothing wrong with this one, and you didn&apos;t flag anything that was fine.
            </Txt>
          </Card>
        </Reanimated.View>
      </View>
    );
  }

  if (revealed && review.length) {
    // The verdicts ACCUMULATE, the way the story log does: each Next appends the next one
    // under the last, and nothing leaves the screen. They used to replace each other one at a
    // time, so reading the third meant having forgotten the first — on a chapter whose whole
    // point is "here is everything you should have spotted", the list IS the answer, and you
    // cannot compare items you are only ever shown one at a time.
    const shown = review.slice(0, Math.min(reviewIdx, review.length - 1) + 1);
    return (
      <View style={{ gap: 10, flexGrow: 1 }}>
        <Txt variant="h2">{chapter.title}</Txt>
        <Txt style={styles.reviewProgress}>
          You caught {caught.length} of {flags.length} · {shown.length} of {review.length} reviewed
        </Txt>
        {shown.map((s) => {
          const wasFlagged = flagged.has(s.id);
          // Three verdicts, because "was it a red flag" and "did you catch it" are different
          // questions and the student needs both answered.
          const verdict = s.isRedFlag
            ? (wasFlagged ? { tone: 'green' as const, label: '✓ YOU CAUGHT THIS' } : { tone: 'pink' as const, label: '✕ YOU MISSED THIS' })
            : { tone: 'lock' as const, label: 'ACTUALLY FINE' };
          return (
            <RiseIn key={s.id}>
              <Card style={{ gap: 8 }}>
                <Tag tone={verdict.tone}>{verdict.label}</Tag>
                <Txt style={styles.segmentTxt}>{s.text}</Txt>
                <Txt variant="lead" style={{ fontSize: 13 }}>{s.explanation}</Txt>
              </Card>
            </RiseIn>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ gap: 10, flexGrow: 1 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={styles.spotcheckIntro}>{chapter.intro}</Txt>
      <Card style={styles.spotcheckCard}>
        <Txt style={styles.term}>{chapter.postingTitle}</Txt>
        {chapter.segments.map((s) => (
          <Pressable key={s.id} onPress={() => toggle(s.id)}>
            <View style={[styles.segment, flagged.has(s.id) && styles.segmentFlagged]}>
              <Txt style={styles.segmentTxt}>{s.text}</Txt>
            </View>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

/* ───────────────────────── priceisright ───────────────────────── */
function PriceisrightView({
  chapter, onComplete, onAction, reactTo, reportCheck,
}: { chapter: PriceisrightChapter; onComplete: Complete } & ReactProps & ActionProps & Pick<ReportProps, 'reportCheck'>) {
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
  const submit = () => {
    setSubmitted(true);
    reactTo(close, shortFeedback(chapter.explanation));
    reportCheck(chapter.prompt || chapter.title, close);
  };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) }
      : { label: 'Lock in my guess', onPress: submit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, guess]);

  return (
    <View style={{ gap: 10, flexGrow: 1 }}>
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
        <AnswerFeedback>
          <Card>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: close ? colors.greenDark : colors.pinkDark }}>
              {close ? 'Close enough!' : `Actual: $${chapter.actualValue}`}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 13, marginTop: 4, color: close ? colors.greenDark : colors.pinkDark }}>{chapter.explanation}</Txt>
          </Card>
        </AnswerFeedback>
      ) : null}
    </View>
  );
}

/* ───────────────────────── explainback ───────────────────────── */
function ExplainbackView({
  chapter, onComplete, onAction, reactTo, reportExplainback, reportCheck,
}: { chapter: ExplainbackChapter; onComplete: Complete }
  & ActionProps & ReactProps & Pick<ReportProps, 'reportExplainback' | 'reportCheck'>) {
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
    const label = chapter.title || 'In Your Own Words';
    reportExplainback(label, tier);
    // Same threshold Hammy reacts to on the line below, so the score agrees with what the
    // student was just told: landing at least one keyword counts, 'retry' does not.
    // reportExplainback only feeds the advice line and the tier sentence on the report card;
    // it never contributed to the score.
    reactTo(hitKeywords.length >= 1);
    reportCheck(label, hitKeywords.length >= 1);
  };

  useEffect(() => {
    onAction(submitted
      ? { label: 'Next', onPress: () => onComplete(chapter.xpOnComplete ?? 0) }
      : { label: 'Check my answer', onPress: submit, disabled: !text.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, text]);

  return (
    <View style={{ gap: 10, flexGrow: 1 }}>
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
        <AnswerFeedback>
          <Card style={{ gap: 6 }}>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: hitKeywords.length ? colors.greenDark : colors.pinkDark }}>
              {hitKeywords.length ? `Nice, you covered: ${hitKeywords.join(', ')}` : "Here's the full picture:"}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 13 }}>{chapter.fullDefinition}</Txt>
          </Card>
        </AnswerFeedback>
      ) : null}
    </View>
  );
}

/* ───────────────────────── urlinspect ───────────────────────── */
function UrlinspectView({ chapter, onComplete, onAction, reactTo, reportCheck }: {
  chapter: UrlinspectChapter; onComplete: Complete;
} & ActionProps & ReactProps & Pick<ReportProps, 'reportCheck'>) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const reveal = () => {
    setRevealed(true);
    const suspicious = chapter.parts.filter((p) => p.isSuspicious);
    const caughtCount = suspicious.filter((p) => flagged.has(p.id)).length;
    // Same all-or-nothing basis as SpotcheckView above, and reported for the same reason.
    const allCaught = caughtCount === suspicious.length;
    reactTo(allCaught);
    reportCheck(chapter.title, allCaught);
  };

  // `flagged` in the deps for the same reason as SpotcheckView's: without it the button keeps
  // firing the closure captured on mount, so `reveal` grades against an empty set and Hammy
  // reacts as though nothing was caught however well you did.
  useEffect(() => {
    onAction(revealed ? { label: 'Next', onPress: () => onComplete(0) } : { label: 'Reveal the risky parts', onPress: reveal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, flagged]);

  return (
    <View style={{ gap: 10, flexGrow: 1 }}>
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
        <AnswerFeedback>
          <Card style={{ gap: 8 }}>
            {/* Every risky part, PLUS any safe part the student flagged — the same review set
                SpotcheckView builds, and for the same reason: a wrong flag is precisely where
                the explanation is worth reading, and listing only the risky parts meant the
                mistake they actually made went unmentioned. Every safe segment in the content
                carries an authored note, so there's real text to show for it. Safe parts they
                left alone have nothing to say and stay out. */}
            {chapter.parts.filter((p) => p.isSuspicious || flagged.has(p.id)).map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', gap: 7 }}>
                <Txt style={{ fontFamily: font.bold, fontSize: 12.5, color: p.isSuspicious ? colors.pinkDark : colors.greenDark }}>
                  {p.isSuspicious ? '⚑' : '✓'}
                </Txt>
                <Txt variant="lead" style={{ flex: 1, fontSize: 12.5 }}>
                  {!p.isSuspicious ? <Txt style={{ fontFamily: font.extra }}>You flagged this, but it&apos;s fine: </Txt> : null}
                  {p.note}
                </Txt>
              </View>
            ))}
          </Card>
        </AnswerFeedback>
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
  // Fixed width, because the label changes LENGTH as you move through the lesson: "9/15" is
  // four characters and "10/15" is five. The progress bar beside it is flex:1, so without a
  // fixed slot the bar shrank by a character's width on the way past chapter 10 — the one
  // advance in the lesson where the bar visibly jumped instead of just growing.
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green, width: 38, textAlign: 'center' },
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
  // progress bar and counter beside it don't jump between chapters that have one and
  // chapters that don't.
  //
  // 96 was sized for "💡 HINT 3" — the per-lesson hint budget, which no longer exists (see
  // the note at the top of this file). The label has been a flat "💡 HINT" since, so a third
  // of this slot was reserved for a character that is never drawn, taken permanently out of
  // the progress bar's width on every chapter of every lesson. 70 fits the real label with
  // the same room to spare the old value had for its own.
  hintSlot: { width: 70, alignItems: 'flex-end', justifyContent: 'center' },
  hintFab: {
    minWidth: 34, height: 30, paddingHorizontal: 9, borderRadius: 15,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.borderCool,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  hintFabTxt: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  hintScrim: { flex: 1, backgroundColor: 'rgba(22,32,23,0.55)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  // "Leave this lesson?" — same scrim weight as the hint popup so the two read as one kind of
  // overlay, but centred as a plain card rather than a bottom sheet: this is a question you
  // answer, not content you read.
  leaveRoot: {
    flex: 1, backgroundColor: 'rgba(22,32,23,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 26,
  },
  leaveCard: {
    width: '100%', maxWidth: 340, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, padding: 22,
  },
  leaveTitle: { fontFamily: font.display, fontSize: 20, lineHeight: 25, color: colors.ink },
  leaveBody: { fontFamily: font.semi, fontSize: 14, lineHeight: 20, color: colors.muted2, marginTop: 8 },
  // White card with the yellow "come collect" outline, matching a recommended module tile
  // (mtileRecommended in ModuleBits) — a hint is an offer, so it gets the same reward glow
  // rather than the pink tint it used to share with Hammy's other speech.
  //
  // The glow is this halo view's padding rather than a platform shadow, so it is exactly as
  // thick on all four sides. The radii are kept in step deliberately: 20 inside + 5 of padding
  // = 25 outside, which is what keeps the ring an even width around the corners too instead of
  // pinching at them.
  // maxHeight resolves against hintScrim, which is flex:1 and so has a definite height (the
  // same thing that makes glossaryPopupCard's '75%' work). Without it a long hint pushed the
  // card past both ends of the centred scrim at once.
  hintModalHalo: {
    width: '100%', maxWidth: 350, maxHeight: '100%', backgroundColor: 'rgba(240,194,46,0.30)',
    borderRadius: 25, padding: 5,
  },
  // flexShrink so the card actually takes the cap above rather than keeping its content
  // height and overflowing the halo it's meant to be bounded by. That shrink is also what
  // gives the ScrollView inside it a definite height to scroll within.
  hintModalCard: {
    flexShrink: 1,
    backgroundColor: colors.white, borderWidth: 2,
    borderColor: colors.reward, borderRadius: 20, padding: 20,
  },
  // Boss-battle verdict — a bottom sheet, same shape and radius as the ambient life-event
  // overlay so the two read as one pattern rather than two different kinds of popup.
  bossSheetRoot: { flex: 1, justifyContent: 'flex-end' },
  bossVerdictSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 22, paddingHorizontal: 22, paddingBottom: 30, alignItems: 'stretch',
  },
  // alignItems moved off the sheet and onto the scroller's content: the sheet now holds a
  // ScrollView, and a ScrollView centred by its parent's alignItems collapses to its content's
  // width instead of filling the sheet.
  bossVerdictScroll: { alignItems: 'center' },
  bossVerdictMark: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  bossVerdictMarkOk: { backgroundColor: colors.green },
  bossVerdictMarkBad: { backgroundColor: colors.pink },
  bossVerdictGlyph: { fontFamily: font.extra, fontSize: 32, lineHeight: 38, color: colors.white },
  bossVerdictTitle: { fontFamily: font.display, fontSize: 23, marginTop: 10 },
  bossVerdictBody: { fontSize: 13.5, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  bossBetterMove: {
    width: '100%', backgroundColor: colors.screen, borderRadius: 14,
    padding: 12, marginTop: 14, gap: 4,
  },
  bossBetterMoveLabel: { fontFamily: font.extra, fontSize: 10.5, color: colors.muted5, letterSpacing: 0.4 },
  bossBetterMoveTxt: { fontSize: 13, lineHeight: 18, color: colors.ink },
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
  columnChart: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  columnChartCol: { flex: 1, alignItems: 'center', gap: 4 },
  columnChartVal: { fontFamily: font.bold, fontSize: 12.5, color: colors.ink },
  // 76, not 92: the bars only ever compare two or three values, so the extra height bought
  // no resolution and came straight out of the outcome text's budget on the decisions that
  // carry a chart — the tallest state this chapter type has.
  columnChartBarWrap: {
    width: '68%', height: 72, justifyContent: 'flex-end',
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
  // paddingTop well over paddingBottom on purpose: this row sits directly under the progress
  // header, and at even padding Hammy read as crowded up against it with all the slack left
  // below him. The extra top space centres him in the band between the header and the
  // question instead. Costs nothing in fit — the row's height is Hammy's either way.
  companionWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  // The centered arrangement (dialogue, Match It): a column, bubble above Hammy.
  companionWrapCentered: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  // Match It only: pulls Hammy up tight under the progress bar. Paired with contentRaised.
  companionWrapRaised: { paddingTop: 0, paddingBottom: 0 },
  // Poll / swipe-cards: pushes him further down the screen again, into the room those two
  // short chapter types leave spare. See companionDrop.
  companionWrapLow: { paddingTop: 28, paddingBottom: 10 },
  companionWrapLowest: { paddingTop: 40, paddingBottom: 12 },
  // Decisions only. Deliberately short of the point where the post-answer state (outcome
  // text plus a comparison chart, the tallest thing this type renders) would start to scroll —
  // which is exactly why this came down from 76: on the longest outcomes there was no spare
  // room to drop him into, and the padding meant to absorb slack was pushing the chart off
  // the bottom instead. 40 still reads as "lower than the others" on the short ones.
  companionWrapDeep: { paddingTop: 40, paddingBottom: 12 },
  // No reserved height: the row's height is Hammy's, and he's far taller than any bubble
  // this can produce — so a message appearing or clearing can't move him or anything below.
  bubbleSlot: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  bubbleInner: { alignItems: 'flex-start' },
  // Stacked above Hammy, so here the height IS reserved (he has no width to hide it in) —
  // otherwise he and the whole chapter under him move by the bubble's height whenever he
  // starts or stops speaking.
  //
  // TWO things keep it still, and both are load-bearing:
  //  1. A fixed `height`, not `minHeight`. At minHeight 56 the slot was SHORTER than a
  //     two-line message (a 58px box plus the 13px tail gap = 71), so the bubble grew the
  //     slot and shoved Hammy and the whole chapter down, then let them snap back up when it
  //     cleared. Only some messages did it, which is what made it look intermittent: of the
  //     three try-again lines Match It picks from at random, "Not quite, look at the
  //     definitions below if you're stuck." (57 chars) wraps to two lines and the other two
  //     don't. Same class of bug as bottomBar's height above, and the same fix — pin the slot
  //     to the tallest state it can ever be in.
  //  2. The bubble inside is absolutely positioned, so it is out of flow entirely and its
  //     height CANNOT feed back into the layout. 71 is sized for the two-line worst case that
  //     messages actually reach (they're capped at 60 chars by shortFeedback), but should
  //     anything ever render taller, it now overflows upward into the padding above Hammy
  //     instead of pushing the chapter around.
  //
  // Anchored by `bottom` on the bubble rather than paddingBottom on the slot, so the 13px
  // tail gap is measured from the slot's own bottom edge with no padding-box ambiguity for
  // the absolute child.
  bubbleSlotCentered: { height: 71, width: '100%' },
  bubbleInnerCentered: {
    position: 'absolute', left: 20, right: 20, bottom: 13, alignItems: 'center',
  },
  // maxWidth lives on the box itself now — the wrapper it used to sit on is stretched edge to
  // edge by left/right, so a cap there would no longer constrain the text.
  reactionBoxCentered: { maxWidth: 300 },
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
  storyIntroStage: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 24 },
  storyIntroCaption: {
    fontFamily: font.semi, fontSize: 17.5, lineHeight: 24, color: colors.ink,
    textAlign: 'center', maxWidth: 320,
  },
  // Hammy's Tip (funfact) — bottom-packed so Hammy sits low on the stage and the tip bubble
  // above him grows up into the empty space rather than pushing him down or spilling off
  // the top. See HintView's own comment.
  hintStage: { flexGrow: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 12, paddingBottom: 16 },
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
  // flexGrow, never `flex`, from here all the way down to each chapter view's own root —
  // this box and every descendant that wants to fill the scroller.
  //
  // `flex: 1` is flexBasis 0, i.e. "my content has no height of its own": the box takes
  // exactly the free space it is given and anything taller hangs outside it, where the
  // scroller has no height to scroll to and the overflow simply can't be reached. flexGrow
  // keeps the "fill the column so justifyContent has something to centre within" behaviour
  // that the story intro stage, Hammy's Tip and Match It all rely on, but lets the box grow
  // past the column when its content is the bigger of the two.
  //
  // This was found and fixed three times independently (matchWrap, mythcards, bossbattle)
  // while twelve other chapter roots kept the wrong one, which was survivable only because
  // the player used to fit the screen. It doesn't any more: the Quick Check now shows whole
  // explanations rather than 85 characters of one, and the simulator shows each habit's
  // reasoning, so chapters routinely run past the fold on the /m web build (where the
  // browser's toolbars take ~180px that the native app keeps). Every one of them is now
  // flexGrow, so "taller than the screen" means "scrolls" and never "cut off".
  chapterFill: { flexGrow: 1 },
  // Only for chapters whose content is fixed and doesn't grow as you interact with it (Match
  // It). Centering anything that GROWS — the dialogue log — would push everything already
  // on screen upward with each addition, which is what this used to do to the conversation.
  contentCenter: { justifyContent: 'center' },
  // Dialogue log: each beat sized to its own text and centered as a column.
  storyLog: { alignItems: 'center' },
  term: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  // The vocab definition card. Tighter than a default Card on both padding and leading,
  // because this is the one block in the app that regularly runs to fifteen lines and it has
  // to clear the screen on its own. 20/14 is still a 1.43 ratio — comfortable body leading,
  // just not the 22 the shared `lead` variant uses for short paragraphs.
  conceptCard: { gap: 8, padding: 15 },
  conceptCheckCard: { gap: 9, padding: 14 },
  conceptPlain: { fontSize: 14, lineHeight: 20 },
  conceptAnalogy: { fontFamily: font.semi, fontSize: 12.5, lineHeight: 16, color: colors.muted3, fontStyle: 'italic' },
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
  // flexShrink WITHOUT flex, and this is the whole reason the dialogue was invisible.
  //
  // `flex: 1` is flexBasis 0 — the same trap `content` above documents for heights, except
  // this row measures WIDTH. The log is a centered column (storyLog), so each beat row
  // shrink-wraps rather than filling the line, which leaves the row with no free space to
  // distribute. A basis of 0 plus nothing to grow into is a bubble exactly 0 points wide: the
  // text was laid out into a box with no width, so a story chapter rendered as a column of
  // Hammy heads with nothing beside them.
  //
  // Basis `auto` instead — the bubble starts at the width of its own text, which is what
  // "each beat sized to its own text" always meant — and flexShrink lets it give that width
  // back when a long beat hits storyBeat's maxWidth and has to wrap.
  storyBubble: {
    flexShrink: 1, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.borderOpt,
    borderRadius: 16, padding: 12,
  },
  storyBubbleTxt: { fontFamily: font.semi, fontSize: 14.5, lineHeight: 19, color: colors.ink },
  storyBubbleTxtCentered: { textAlign: 'center' },
  storyBubbleNarrator: { backgroundColor: colors.screen, borderColor: colors.border },
  storyBubbleNarratorTxt: { fontFamily: font.medium, fontStyle: 'italic', color: colors.muted2 },
  // Matching grid — centered as a block with one shared gap between every chip, so the two
  // columns read as evenly-spaced rows down the middle rather than two ragged lists.
  //
  // flexGrow, NOT flex. `flex: 1` is flexBasis 0, which tells the layout this box's own
  // content has no height — it takes exactly the free space it's given and anything longer
  // than that hangs outside it, where the scroller can't see it to scroll to. A six-pair grid
  // of long definitions is exactly that case. flexGrow keeps the "fill the screen so
  // justifyContent has something to centre within" behaviour, but the box still grows to fit
  // its content when the content is the bigger of the two.
  matchWrap: { gap: 10, flexGrow: 1, justifyContent: 'center' },
  matchTitle: { textAlign: 'center' },
  matchGrid: { flexDirection: 'row', gap: 10 },
  matchCol: { flex: 1, gap: 8 },
  matchChip: {
    borderWidth: 1.5, borderColor: colors.borderOpt, borderRadius: 14,
    paddingVertical: 7, paddingHorizontal: 11, backgroundColor: colors.white,
    justifyContent: 'center',
  },
  matchChipOn: { borderColor: colors.green, backgroundColor: '#F1F6EF' },
  matchChipWrong: { borderColor: '#D98A9E', backgroundColor: colors.pinkBg2 },
  matchChipDone: { borderColor: colors.green, backgroundColor: colors.tagGreenBg, opacity: 0.6 },
  matchChipTxt: { fontFamily: font.semi, fontSize: 12.5, lineHeight: 16, color: colors.ink },
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
  // baseline alignment, so the floating delta sits on the same line as the big number rather
  // than centred against its full 28px cap height.
  meterValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  meterValue: { fontFamily: font.display, fontSize: 28, color: colors.greenDark },
  meterFloat: { fontFamily: font.display, fontSize: 16 },
  // A habit tile, not a quiz option: no letter badge, and a trailing score chip that is the
  // reason to tap. Holds only the label and that chip — the explanation that used to unfold
  // underneath is Hammy's line to speak now (see HabitChoice).
  habit: {
    borderWidth: 1.75, borderColor: colors.borderOpt, borderRadius: 18,
    backgroundColor: colors.white, paddingVertical: 11, paddingHorizontal: 14,
  },
  habitGood: { borderColor: colors.green, backgroundColor: colors.tagGreenBg },
  habitBad: { borderColor: '#D98A9E', backgroundColor: colors.pinkBg2 },
  habitHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  habitLabel: { flex: 1, fontFamily: font.bold, fontSize: 14.5, lineHeight: 19, color: colors.ink },
  // Fixed width whether it holds "?" or "−12", so revealing a habit never re-wraps the label
  // beside it — the row's height is settled before the tap and the note is the only thing
  // that moves.
  habitChip: {
    minWidth: 46, height: 27, borderRadius: 999, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.track, borderWidth: 1.5, borderColor: colors.borderOpt,
  },
  habitChipGood: { backgroundColor: colors.green, borderColor: colors.green },
  habitChipBad: { backgroundColor: '#D98A9E', borderColor: '#D98A9E' },
  habitChipTxt: { fontFamily: font.extra, fontSize: 13, color: colors.muted4 },
  habitChipTxtOn: { color: colors.white },
  // Tighter than a default Card/gap pair: the unrevealed document is a list of up to eight
  // segments that all have to be on screen at once for "tap the suspicious lines" to be a
  // fair question, so the savings here are what keep the longest one inside a single screen.
  // (The revealed half no longer competes for this space at all — see SpotcheckView.)
  kcQuestion: { fontSize: 14, lineHeight: 19 },
  decisionText: { fontSize: 14, lineHeight: 19 },
  decisionOutcomeCard: { gap: 8, padding: 14 },
  simCard: { gap: 3, padding: 14 },
  simPrompt: { fontSize: 13.5, lineHeight: 19 },
  simRowTxt: { fontSize: 12.5, lineHeight: 18 },
  // The explanation card is now the tallest thing on a Quick Check — it holds the question's
  // whole `exp`, which runs to 454 characters, where it used to hold 85. So it gets the same
  // treatment conceptCard already gets for being the one block that regularly runs long:
  // padding pulled in, leading pulled in, and NOTHING taken off the type size.
  //
  // 11, not 14: this card holds a single paragraph with no internal structure to space out,
  // so its padding is pure margin around text that already sits inside the screen's own 18px
  // gutter. The horizontal side also buys back a little line length, which is the cheapest
  // height there is — wider lines mean fewer of them.
  kcAnswerCard: { padding: 11 },
  // 17, down from 18 (a 1.31 ratio at 13px). Deliberately the smallest lever pulled here and
  // the last one: font size stays at 13. The entire point of this card is that the student
  // can read the explanation they just earned, so shrinking the glyphs to make it fit would
  // undo the change it exists to serve — leading can give a little, legibility can't.
  kcAnswerTxt: { fontSize: 13, lineHeight: 17 },
  spotcheckIntro: { fontSize: 13.5, lineHeight: 19 },
  spotcheckCard: { gap: 6, padding: 15 },
  segment: { borderRadius: 12, padding: 8, borderWidth: 1.5, borderColor: colors.borderOpt },
  segmentTxt: { fontFamily: font.semi, fontSize: 13, lineHeight: 17, color: colors.ink },
  segmentFlagged: { borderColor: colors.pink, backgroundColor: colors.pinkBg2 },
  reviewProgress: { fontFamily: font.bold, fontSize: 11.5, color: colors.muted5 },
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
