/** Ported from the website's buildQuestReport (app.js) — the mastery calculation and
 * "Hammy's advice" logic, verbatim. The website only builds this for the two quest-based
 * modules (credit, scams); per product decision, mobile shows it after every lesson,
 * fed by whatever chapters that lesson actually contained (a lesson with no
 * knowledgecheck/mythcards/matching/decision/explainback chapters just reports an empty,
 * 100%-mastery report — see EMPTY_ANALYTICS). */

export type QuestAnalytics = {
  knowledgeCheck: { question: string; isCorrect: boolean }[];
  mythCards: { myth: string; guessedRight: boolean }[];
  /** Every OTHER right/wrong judgement the lesson put in front of the student: the poll's
   * true/false, each vocab concept's inline check, the price guess, and the spot-the-red-flag
   * chapters.
   *
   * These were graded on screen — "Correct!" / "Not quite", a reaction from Hammy, a
   * contribution to his answer streak — and then counted by nothing. The report only ever saw
   * knowledgeCheck and mythCards, which is 442 of the 937 graded moments in the content, so
   * the mastery ring routinely disagreed with the score printed directly above it on the same
   * screen: a lesson where the only miss was a poll showed "3/4 correct" at the top and a
   * 100% ring captioned "Every question right this time" underneath.
   *
   * One flat {label, isCorrect} shape rather than a typed bucket per chapter kind, because
   * the report does exactly two things with them — count them, and name the ones you got
   * wrong under "Worth another look" — and neither needs to know which chapter it came from. */
  checks: { label: string; isCorrect: boolean }[];
  matchingMistakes: number;
  decisions: { title: string; choice: string }[];
  explainback: { term: string; tier: 'great' | 'ok' | 'retry' } | null;
  /** Terms learned this quest (matching pairs + teach concepts), each with its own
   * definition and the chapter title it came from — ported from the website's
   * qp.learnedTerms, which is this same {term, plain, section} shape end to end (both the
   * live in-quest "look back" glossary tray and this results-screen chip list read off of
   * it). Also handed off in-memory rather than a URL param, same reasoning as the rest of
   * this type: terms like "50/30/20 Rule" or "Pay-Upfront / Overpayment Scam" contain "/" too. */
  learnedTerms: { term: string; plain: string; section: string }[];
};

export const EMPTY_ANALYTICS: QuestAnalytics = {
  knowledgeCheck: [],
  mythCards: [],
  checks: [],
  matchingMistakes: 0,
  decisions: [],
  explainback: null,
  learnedTerms: [],
};

/** Fills in anything a stored analytics blob is missing.
 *
 * An in-flight lesson's analytics is persisted (AppState.lessonProgress) and round-trips
 * through AsyncStorage and Supabase, so a save written before a field existed comes back
 * without it — and `checks` is brand new. Resuming into a lesson saved by the previous build
 * would then hand buildQuestReport an object with no `checks` array and take the results
 * screen down on `.filter` of undefined, which is about the worst possible moment for it.
 * TypeScript can't help here: the value is parsed JSON that has merely been asserted to fit
 * the type. */
export function normalizeAnalytics(a: Partial<QuestAnalytics> | null | undefined): QuestAnalytics {
  return { ...EMPTY_ANALYTICS, ...(a ?? {}) };
}

/** In-memory handoff from quest.tsx to results.tsx for the just-finished quest's analytics
 * — NOT passed as a URL param. Lesson/question text routinely contains "/" (dates, ratios
 * like "50/30/20", "and/or"), and Expo Router's web build doesn't reliably URL-encode a
 * large JSON blob dropped into router.replace's params; a stray "/" turned into extra path
 * segments and broke route matching ("unmatched route"). A module-level variable survives
 * the in-app SPA navigation between the two screens without touching the URL at all. */
let pendingAnalytics: QuestAnalytics | null = null;
export function setPendingQuestAnalytics(a: QuestAnalytics) {
  pendingAnalytics = a;
}
/** Reads and clears the handoff — call exactly once per results-screen mount (a direct
 * load of /learn/results with nothing pending falls back to EMPTY_ANALYTICS). */
export function takePendingQuestAnalytics(): QuestAnalytics {
  const a = pendingAnalytics ?? EMPTY_ANALYTICS;
  pendingAnalytics = null;
  return a;
}

export type QuestReportData = {
  masteryPct: number;
  totalAnswered: number;
  totalRight: number;
  kcRightCount: number;
  kcTotal: number;
  mythRightCount: number;
  mythTotal: number;
  matchingMistakes: number;
  hintsUsed: number;
  decisions: { title: string; choice: string }[];
  explainback: { term: string; tier: 'great' | 'ok' | 'retry' } | null;
  strengths: string[];
  weakSpots: string[];
  advice: string;
};

/** Ported verbatim from app.js's buildQuestReport — same mastery %, same "what you got
 * right" / "worth another look" split, same two-sentence-max advice-building logic. */
export function buildQuestReport(moduleName: string, raw: QuestAnalytics, hintsUsed: number): QuestReportData {
  // Tolerates a save written before `checks` existed — see normalizeAnalytics.
  const analytics = normalizeAnalytics(raw);
  const kcRight = analytics.knowledgeCheck.filter((x) => x.isCorrect);
  const kcWrong = analytics.knowledgeCheck.filter((x) => !x.isCorrect);
  const mythRight = analytics.mythCards.filter((x) => x.guessedRight);
  const mythWrong = analytics.mythCards.filter((x) => !x.guessedRight);
  const checkRight = analytics.checks.filter((x) => x.isCorrect);
  const checkWrong = analytics.checks.filter((x) => !x.isCorrect);
  // Every graded moment, not just the two chapter types that happened to have their own
  // analytics bucket — see QuestAnalytics.checks for what this was getting wrong.
  const totalAnswered = analytics.knowledgeCheck.length + analytics.mythCards.length + analytics.checks.length;
  const totalRight = kcRight.length + mythRight.length + checkRight.length;
  const masteryPct = totalAnswered ? Math.round((totalRight / totalAnswered) * 100) : 100;

  const strengths = [...kcRight.map((x) => x.question), ...mythRight.map((x) => x.myth), ...checkRight.map((x) => x.label)];
  const weakSpots = [...kcWrong.map((x) => x.question), ...mythWrong.map((x) => x.myth), ...checkWrong.map((x) => x.label)];

  // Tailored advice, built from whichever specific area was weakest — capped at two short
  // sentences instead of stacking a line for every flag that happened to trigger.
  const adviceParts: string[] = [];
  if (weakSpots.length === 0) {
    adviceParts.push(`Solid handle on ${moduleName.toLowerCase()}.`);
  } else if (kcWrong.length > 0) {
    adviceParts.push(`Reread the explanation for "${kcWrong[0].question}."`);
  } else if (mythWrong.length > 0) {
    adviceParts.push(`The statement "${mythWrong[0].myth}" is worth a second look.`);
  } else if (checkWrong.length > 0) {
    // Last, so a missed Quick Check or myth card still leads — but no longer silently
    // absent, which is what left a lesson whose only miss was a poll or a vocab check
    // being congratulated for a clean sweep.
    adviceParts.push(`Worth rereading: "${checkWrong[0].label}"`);
  }
  if (analytics.explainback && analytics.explainback.tier === 'retry') {
    adviceParts.push(`Also reread the definition for "${analytics.explainback.term}."`);
  } else if (analytics.matchingMistakes > 4) {
    adviceParts.push('More repetition on the matching rounds would help.');
  }
  const advice = adviceParts.slice(0, 2).join(' ');

  return {
    masteryPct,
    totalAnswered,
    totalRight,
    kcRightCount: kcRight.length,
    kcTotal: analytics.knowledgeCheck.length,
    mythRightCount: mythRight.length,
    mythTotal: analytics.mythCards.length,
    matchingMistakes: analytics.matchingMistakes,
    hintsUsed,
    decisions: analytics.decisions,
    explainback: analytics.explainback,
    strengths,
    weakSpots,
    advice,
  };
}
