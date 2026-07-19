/** Ported from the website's buildQuestReport (app.js) — the mastery calculation and
 * "Hammy's advice" logic, verbatim. The website only builds this for the two quest-based
 * modules (credit, scams); per product decision, mobile shows it after every lesson,
 * fed by whatever chapters that lesson actually contained (a lesson with no
 * knowledgecheck/mythcards/matching/decision/explainback chapters just reports an empty,
 * 100%-mastery report — see EMPTY_ANALYTICS). */

export type QuestAnalytics = {
  knowledgeCheck: { question: string; isCorrect: boolean }[];
  mythCards: { myth: string; guessedRight: boolean }[];
  matchingMistakes: number;
  decisions: { title: string; choice: string }[];
  explainback: { term: string; tier: 'great' | 'ok' | 'retry' } | null;
  /** Terms learned this quest (matching pairs + teach concepts) — also handed off
   * in-memory rather than a URL param, same reasoning as the rest of this type: terms like
   * "50/30/20 Rule" or "Pay-Upfront / Overpayment Scam" contain "/" too. */
  learnedTerms: string[];
};

export const EMPTY_ANALYTICS: QuestAnalytics = {
  knowledgeCheck: [],
  mythCards: [],
  matchingMistakes: 0,
  decisions: [],
  explainback: null,
  learnedTerms: [],
};

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
export function buildQuestReport(moduleName: string, analytics: QuestAnalytics, hintsUsed: number): QuestReportData {
  const kcRight = analytics.knowledgeCheck.filter((x) => x.isCorrect);
  const kcWrong = analytics.knowledgeCheck.filter((x) => !x.isCorrect);
  const mythRight = analytics.mythCards.filter((x) => x.guessedRight);
  const mythWrong = analytics.mythCards.filter((x) => !x.guessedRight);
  const totalAnswered = analytics.knowledgeCheck.length + analytics.mythCards.length;
  const totalRight = kcRight.length + mythRight.length;
  const masteryPct = totalAnswered ? Math.round((totalRight / totalAnswered) * 100) : 100;

  const strengths = [...kcRight.map((x) => x.question), ...mythRight.map((x) => x.myth)];
  const weakSpots = [...kcWrong.map((x) => x.question), ...mythWrong.map((x) => x.myth)];

  // Tailored advice, built from whichever specific area was weakest — capped at two short
  // sentences instead of stacking a line for every flag that happened to trigger.
  const adviceParts: string[] = [];
  if (weakSpots.length === 0) {
    adviceParts.push(`Solid handle on ${moduleName.toLowerCase()}.`);
  } else if (kcWrong.length > 0) {
    adviceParts.push(`Reread the explanation for "${kcWrong[0].question}."`);
  } else if (mythWrong.length > 0) {
    adviceParts.push(`The statement "${mythWrong[0].myth}" is worth a second look.`);
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
