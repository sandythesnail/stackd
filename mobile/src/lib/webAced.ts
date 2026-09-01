/**
 * "Was this lesson answered perfectly?", asked of a WEB questProgress record.
 *
 * Ported from app.js's questWasFlawless, which asks its own questTally the same three
 * questions this does: every knowledge-check answer right, every myth card right, every other
 * graded moment (`checks` — the vocab true/falses, the price guess, spot-the-red-flag,
 * inspect-the-link, explain-back, the boss battle) right, and the matching board finished
 * without a mistake. `polls` is deliberately NOT counted: a poll records into `checks` too
 * (see app.js's renderPollChapter), so counting both would count it twice, which is exactly
 * why questTally leaves it out.
 *
 * The `total > 0` floor is the important one. `.every()` on an empty array is true, so a
 * record with no analytics at all would otherwise read as a perfect run — and mobileToWeb
 * writes exactly that (EMPTY_ANALYTICS) for every lesson finished on the phone, because
 * mobile keeps no analytics once a lesson is done. No record is not a perfect record.
 *
 * WHY THIS IS ITS OWN FILE, with no imports: it is a second copy of a rule app.js owns, and
 * two copies of a rule drift. Alone in a module with nothing to pull in, it can be compiled
 * on its own and run against the same fixture table the real web app is run against —
 * scripts/check-mastery.js does that, and fails if the two ever disagree. Keep it
 * import-free, or that check stops being possible.
 *
 * It exists at all because the two apps store a finished lesson differently: the web keeps
 * the analytics, mobile keeps a flat "was this aced" key (AppState.flawlessLessons). Reading
 * the web's form is the only way for mobile to know that a lesson aced on the laptop was aced.
 */

type Graded = { isCorrect?: boolean };
type Myth = { guessedRight?: boolean };

export type WebLessonAnalytics = {
  knowledgeCheck?: Graded[];
  mythCards?: Myth[];
  checks?: Graded[];
  matchingMistakes?: number;
};

export type WebLessonRecord = {
  done?: boolean;
  analytics?: unknown;
};

const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function webLessonWasAced(rec: WebLessonRecord | undefined | null): boolean {
  if (!rec || !rec.done) return false;
  const a = (rec.analytics ?? {}) as WebLessonAnalytics;
  const kc = list<Graded>(a.knowledgeCheck);
  const myth = list<Myth>(a.mythCards);
  const checks = list<Graded>(a.checks);
  if (kc.length + myth.length + checks.length === 0) return false;
  if (!kc.every((x) => !!(x && x.isCorrect))) return false;
  if (!myth.every((x) => !!(x && x.guessedRight))) return false;
  if (!checks.every((x) => !!(x && x.isCorrect))) return false;
  return (typeof a.matchingMistakes === 'number' ? a.matchingMistakes : 0) === 0;
}
