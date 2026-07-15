/** Ported verbatim from the website's onboarding survey (app.js): per-module familiarity
 * (1-5 slider, with the real end-labels), goal selection, and the "recommended track"
 * scoring algorithm (computeModulePriority/computeTrackScore/getRecommendedTrack). Mobile
 * condenses the website's 12-step wizard (11 familiarity screens + 1 goals screen) into one
 * scrollable form, but every module/label/goal/track and the scoring math itself is real. */

export const SURVEY_FAMILIARITY_LABELS: Record<string, [string, string]> = {
  earning: ["I've never seen an actual paycheck", 'I know exactly what gets taken out before it hits my account'],
  spending: ['I never spend a cent', 'After every paycheck, shopping time!'],
  saving: ['Savings account? Never heard of her', "I've got three different savings goals going right now"],
  investing: ['Stocks are just numbers that go up and down, right?', "I'm already investing every month"],
  credit: ["Credit card, debit card, what's the difference?", 'I know my credit score off the top of my head'],
  risk: ["Insurance is a whole adult thing I've never touched", 'I could explain a deductible in my sleep'],
  loans: ['Loans are basically free money, right?', 'I know exactly how my loans get repaid'],
  taxes: ['Taxes are just scary and confusing', "I've already filed my own return"],
  psychology: ["If it's on sale, it's going in my cart", 'I can spot a marketing trick from a mile away'],
  career: ["I'll just take whatever salary they offer me", "I'm ready to negotiate my way into a better offer"],
  scams: ["I'd probably click first and ask questions later", 'I can spot a scam from the subject line alone'],
};

export type SurveyGoal = { id: string; label: string; moduleIds: string[] };

export const SURVEY_GOALS: SurveyGoal[] = [
  { id: 'avoid_debt', label: 'Avoid debt mistakes', moduleIds: ['loans', 'credit'] },
  { id: 'paycheck_taxes', label: 'Understand my paycheck & taxes', moduleIds: ['taxes', 'earning'] },
  { id: 'build_credit', label: 'Build credit', moduleIds: ['credit'] },
  { id: 'negotiate_salary', label: 'Negotiate salary', moduleIds: ['career'] },
  { id: 'curious', label: 'Just curious, exploring', moduleIds: [] },
];

export type SurveyTrack = { id: string; title: string; blurb: string; moduleIds: string[] };

export const SURVEY_TRACKS: SurveyTrack[] = [
  {
    id: 'starting_fresh', title: 'Starting Fresh',
    blurb: "You're just getting going, so let's cover the everyday basics first: where money comes from and where it goes.",
    moduleIds: ['earning', 'spending', 'saving'],
  },
  {
    id: 'debt_freedom', title: 'Debt Freedom',
    blurb: 'Get a handle on loans, credit, and your paycheck so debt stops being scary.',
    moduleIds: ['loans', 'credit', 'taxes'],
  },
  {
    id: 'building_wealth', title: 'Building Wealth',
    blurb: "You've got the basics covered, now let's grow what you have and earn more of it.",
    moduleIds: ['saving', 'investing', 'career'],
  },
  {
    id: 'stay_protected', title: 'Stay Protected',
    blurb: 'Sharpen your radar for scams, marketing tricks, and risk before they cost you.',
    moduleIds: ['risk', 'psychology', 'scams'],
  },
];

export type SurveyAnswers = { moduleFamiliarity: Record<string, number>; focusGoals: string[] };

/** Lower familiarity -> higher priority (up to 30pts), plus +25 per selected goal that
 * touches this module. */
function computeModulePriority(moduleId: string, survey: SurveyAnswers): number {
  let score = 0;
  const familiarity = survey.moduleFamiliarity[moduleId];
  if (familiarity !== undefined) score += ((5 - familiarity) / 4) * 30;
  survey.focusGoals.forEach((goalId) => {
    const goal = SURVEY_GOALS.find((g) => g.id === goalId);
    if (goal?.moduleIds.includes(moduleId)) score += 25;
  });
  return score;
}

function computeTrackScore(track: SurveyTrack, survey: SurveyAnswers): number {
  return track.moduleIds.reduce((sum, id) => sum + computeModulePriority(id, survey), 0);
}

export function getRecommendedTrack(survey: SurveyAnswers): SurveyTrack {
  let best = SURVEY_TRACKS[0];
  let bestScore = -1;
  for (const t of SURVEY_TRACKS) {
    const score = computeTrackScore(t, survey);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

export function trackReason(track: SurveyTrack, survey: SurveyAnswers): string {
  const goalHit = SURVEY_GOALS.find(
    (g) => survey.focusGoals.includes(g.id) && g.moduleIds.some((id) => track.moduleIds.includes(id)),
  );
  return goalHit ? `It lines up with "${goalHit.label}."` : track.blurb;
}
