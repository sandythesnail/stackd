/** Groups each module's lessons into labeled sections for the module-detail screen,
 * matching the website's MODULE_LESSON_SECTIONS (app.js) — a pink-labeled, collapsible
 * grouping of lesson tiles, never a gate.
 *
 * Mobile's lesson content isn't a 1:1 port of the website's (different lesson counts —
 * e.g. mobile's `earning` has 6 lessons vs. the website's 8), so the website's exact
 * section counts can't be reused verbatim. These groupings instead partition mobile's
 * actual lesson lists into 2-3 contiguous, thematically-matched sections, reusing the
 * website's section label wording wherever the underlying lesson content lines up
 * (earning, spending, taxes, psychology, career line up closely; the rest are adapted to
 * fit mobile's real lesson order). Counts must sum to the module's real lesson count —
 * verified at render time in learn/module/[id].tsx, which falls back to one flat
 * ungrouped list if they don't (same safety fallback as the website's groupLessonTiles). */

export type LessonSection = { label: string; count: number };

export const MODULE_LESSON_SECTIONS: Record<string, LessonSection[]> = {
  earning: [
    { label: 'Your Paycheck, Explained', count: 3 },
    { label: 'Campus & Gig Income', count: 3 },
    { label: 'Growing What You Earn', count: 3 },
  ],
  spending: [
    { label: 'Budgeting Basics', count: 3 },
    { label: 'Paying for College', count: 3 },
    { label: 'Smarter Spending Decisions', count: 3 },
  ],
  saving: [
    { label: 'Where to Keep Your Money', count: 2 },
    { label: 'Growing What You Save', count: 2 },
    { label: 'Saving With a Goal in Mind', count: 2 },
  ],
  investing: [
    { label: 'Investing Fundamentals', count: 2 },
    { label: 'Where & How to Invest', count: 2 },
    { label: 'Getting Started', count: 2 },
  ],
  credit: [
    { label: 'Credit Card Costs', count: 2 },
    { label: 'Building Credit From Zero', count: 2 },
    { label: 'Understanding Your Score & Reports', count: 2 },
  ],
  risk: [
    { label: 'Health & Auto Coverage', count: 2 },
    { label: 'Renters Insurance & Payouts', count: 2 },
    { label: 'Identity Theft & Staying Safe', count: 2 },
  ],
  loans: [
    { label: 'Federal Loan Basics', count: 2 },
    { label: 'Borrowing Wisely', count: 2 },
    { label: 'Repayment & Planning Ahead', count: 2 },
  ],
  taxes: [
    { label: 'Filing Basics', count: 2 },
    { label: 'Getting It Right', count: 2 },
    { label: 'The Bigger Picture', count: 2 },
  ],
  psychology: [
    { label: 'Why We Overspend', count: 3 },
    { label: 'Modern Spending Traps', count: 3 },
    { label: 'Breaking the Pattern', count: 2 },
  ],
  career: [
    { label: 'Evaluating & Negotiating an Offer', count: 4 },
    { label: 'Thinking Long-Term & Starting Strong', count: 3 },
  ],
  scams: [
    { label: 'Scams Targeting Students', count: 2 },
    { label: 'Financial Aid & Digital Scams', count: 2 },
    { label: 'Payment & Marketplace Scams', count: 2 },
  ],
};

export type ResolvedSection = { label: string; start: number; end: number };

/** Resolves a module's sections into lesson-index ranges, or null if there's no config
 * for this module or the counts don't sum to its real lesson total (safety fallback —
 * render callers should show one flat list in that case). */
export function resolveLessonSections(moduleId: string, totalLessons: number): ResolvedSection[] | null {
  const sections = MODULE_LESSON_SECTIONS[moduleId];
  if (!sections) return null;
  const sum = sections.reduce((s, x) => s + x.count, 0);
  if (sum !== totalLessons) return null;
  let idx = 0;
  return sections.map((s) => {
    const start = idx;
    idx += s.count;
    return { label: s.label, start, end: idx };
  });
}
