/** Ported from the website's ACHIEVEMENTS (app.js) — id/tier/label/desc match exactly.
 * Feather SVG icon paths are represented as a single emoji glyph instead, matching the
 * mobile app's existing BadgeMedal/char convention (see data.ts's old mock badges).
 *
 * `available` marks whether the unlock condition is checkable with what the mobile app
 * actually tracks today. Achievements gated on the boss-battle/financial-simulation/hint
 * system (Phase 8 — the full quest-chapter renderers) are marked unavailable and stay
 * locked rather than faked, until that system exists. */
export type Achievement = {
  id: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  label: string;
  desc: string;
  char: string;
  available: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_paycheck', tier: 'bronze', label: 'First Paycheck', desc: 'Ace every lesson in the Earning module.', char: '💵', available: true },
  { id: 'budget_boss', tier: 'bronze', label: 'Budget Boss', desc: 'Ace Spending and finish both activities.', char: '💼', available: true },
  { id: 'safety_net', tier: 'bronze', label: 'Safety Net', desc: 'Ace every lesson in the Saving module.', char: '🛟', available: true },
  { id: 'investor', tier: 'bronze', label: 'Future Millionaire', desc: 'Ace every lesson in the Investing module.', char: '📈', available: true },
  { id: 'credit_champ', tier: 'bronze', label: 'Credit Champ', desc: "Ace both of Hammy's credit quests.", char: '💳', available: true },
  { id: 'risk_ready', tier: 'bronze', label: 'Risk Ready', desc: 'Ace every lesson in the Managing Risk module.', char: '🛡️', available: true },
  { id: 'loan_smart', tier: 'bronze', label: 'Loan Smart', desc: 'Ace every lesson in the Loans module.', char: '📄', available: true },
  { id: 'tax_ready', tier: 'bronze', label: 'Tax Ready', desc: 'Ace every lesson in the Taxes module.', char: '%', available: true },
  { id: 'mindful_money', tier: 'bronze', label: 'Mindful Spender', desc: 'Ace Consumer Psychology and finish both activities.', char: '🧠', available: true },
  { id: 'offer_ready', tier: 'bronze', label: 'Offer Ready', desc: 'Ace every lesson in Career & Salary.', char: '🎓', available: true },
  { id: 'scam_spotter', tier: 'bronze', label: 'Scam Spotter', desc: 'Ace every scam quest, no wrong answers.', char: '🚨', available: true },
  { id: 'crisis_averted', tier: 'silver', label: 'Crisis Averted', desc: 'Beat a Credit boss battle.', char: '⚡', available: false },
  { id: 'fraud_fighter', tier: 'silver', label: 'Fraud Fighter', desc: 'Beat a Scams boss battle.', char: '🔒', available: false },
  { id: 'no_hints', tier: 'silver', label: 'No Hints Needed', desc: 'Finish the first credit quest with zero hints.', char: '🧭', available: false },
  { id: 'word_nerd', tier: 'silver', label: 'Word Nerd', desc: 'Learn 15+ vocab terms across your quests.', char: '📖', available: false },
  { id: 'homebody', tier: 'silver', label: 'Homebody', desc: "Fill every slot in Hammy's Room.", char: '🏠', available: true },
  { id: 'on_fire', tier: 'gold', label: 'On a Roll', desc: 'Play 7 days in a row.', char: '🔥', available: true },
  { id: 'iron_will', tier: 'gold', label: 'Iron Will', desc: 'Land the optimal path on both Boss Challenges.', char: '🎯', available: false },
  { id: 'excellent_credit', tier: 'gold', label: 'Excellent Credit', desc: 'Push your credit score to 800 or above.', char: '🏆', available: false },
  { id: 'marathoner', tier: 'diamond', label: 'Marathoner', desc: 'Play 30 days in a row. Ultra rare.', char: '🏃', available: true },
  { id: 'stackd_star', tier: 'diamond', label: 'Stacked Star', desc: 'Master every module. Ultra rare.', char: '⭐', available: true },
  { id: 'grandmaster', tier: 'diamond', label: 'Grandmaster', desc: 'Unlock every other badge. The hardest one.', char: '👑', available: true },
];

/** BADGE_TIER_REWARD, ported verbatim. */
export const BADGE_TIER_REWARD: Record<Achievement['tier'], { type: 'coins' | 'diamonds'; amount: number }> = {
  bronze: { type: 'coins', amount: 5 },
  silver: { type: 'coins', amount: 5 },
  gold: { type: 'coins', amount: 15 },
  diamond: { type: 'diamonds', amount: 10 },
};

export const TIER_LABELS: Record<Achievement['tier'], string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond',
};

/** Modules mapped to their "mastery" achievement, ported from each ACHIEVEMENTS check
 * (s => hasMasteredModule(s, 'earning')) etc. */
export const MODULE_MASTERY_ACHIEVEMENT: Record<string, string> = {
  earning: 'first_paycheck',
  spending: 'budget_boss',
  saving: 'safety_net',
  investing: 'investor',
  credit: 'credit_champ',
  risk: 'risk_ready',
  loans: 'loan_smart',
  taxes: 'tax_ready',
  psychology: 'mindful_money',
  career: 'offer_ready',
  scams: 'scam_spotter',
};
