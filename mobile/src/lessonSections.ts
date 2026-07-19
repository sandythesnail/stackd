/** Groups each module's lessons into labeled sections for the module-detail screen,
 * matching the website's MODULE_LESSON_SECTIONS (app.js) — a pink-labeled, collapsible
 * grouping of lesson tiles, never a gate.
 *
 * Every module now exposes all 9 of its real quests (see modules.json / the lesson-index
 * fix), so these are all fresh 9-lesson (career: 9, but only 2 sections, matching the
 * website) groupings built from the real, corrected lesson order — reusing the website's
 * section label wording wherever it fits the actual content, adapted where mobile's real
 * quest lineup doesn't match the website's section breakdown 1:1 (e.g. risk's real quests
 * are entirely insurance-themed, with no identity-theft content, unlike the website's
 * config). Counts must sum to the module's real lesson count — verified at render time in
 * learn/module/[id].tsx, which falls back to one flat ungrouped list if they don't (same
 * safety fallback as the website's groupLessonTiles). */

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
    { label: 'Building Your Safety Net', count: 3 },
    { label: 'Growing Your Savings', count: 3 },
    { label: 'Saving With a Goal in Mind', count: 3 },
  ],
  investing: [
    { label: 'Investing Fundamentals', count: 3 },
    { label: 'Getting Started', count: 3 },
    { label: 'Retirement & Account Types', count: 3 },
  ],
  credit: [
    { label: 'Building Credit From Zero', count: 3 },
    { label: 'Understanding Your Score & Reports', count: 3 },
    { label: 'Leveling Up & Paying It Down', count: 3 },
  ],
  risk: [
    { label: 'Health Coverage', count: 2 },
    { label: 'Everyday Insurance: Renters & Auto', count: 2 },
    { label: 'Life, Liability & the Fine Print', count: 5 },
  ],
  loans: [
    { label: 'Federal Loan Basics', count: 3 },
    { label: 'Repayment & Interest', count: 3 },
    { label: 'Planning Ahead', count: 3 },
  ],
  taxes: [
    { label: 'Filing Basics', count: 3 },
    { label: 'Getting It Right', count: 3 },
    { label: 'The Bigger Picture', count: 3 },
  ],
  psychology: [
    { label: 'Why We Overspend', count: 3 },
    { label: 'Modern Spending Traps', count: 3 },
    { label: 'Breaking the Pattern', count: 3 },
  ],
  career: [
    { label: 'Evaluating & Negotiating an Offer', count: 5 },
    { label: 'Thinking Long-Term & Starting Strong', count: 4 },
  ],
  scams: [
    { label: 'Scams Targeting Students', count: 3 },
    { label: 'Digital & Payment Scams', count: 3 },
    { label: 'Social Engineering & Staying Safe', count: 3 },
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
