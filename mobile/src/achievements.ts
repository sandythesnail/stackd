/** Ported from the website's ACHIEVEMENTS (app.js) — id/tier/label/desc/color/icon all match
 * exactly. `icon` is the raw Feather-style SVG markup fragment from app.js (the inner
 * `<path>`/`<circle>`/`<line>`/etc. elements, viewBox 0 0 24 24, stroke-based) — rendered via
 * BadgeMedal/BadgeIcon (react-native-svg's SvgXml), the same icon geometry as the website,
 * not a mobile-only substitute.
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
  color: string;
  /** Inner SVG markup only (no wrapping <svg>) — see BadgeIcon. */
  icon: string;
  available: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_paycheck', tier: 'bronze', label: 'First Paycheck', desc: 'Ace every lesson in the Earning module.', color: '#3FA65C', available: true,
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
  { id: 'budget_boss', tier: 'bronze', label: 'Budget Boss', desc: 'Ace Spending and finish both activities.', color: '#E08A2E', available: true,
    icon: '<path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V4.5A1.5 1.5 0 0 0 14.5 3h-6A1.5 1.5 0 0 0 7 4.5V7"/><circle cx="16" cy="13" r="1.4"/>' },
  { id: 'safety_net', tier: 'bronze', label: 'Safety Net', desc: 'Ace every lesson in the Saving module.', color: '#1C9C93', available: true,
    icon: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>' },
  { id: 'investor', tier: 'bronze', label: 'Future Millionaire', desc: 'Ace every lesson in the Investing module.', color: '#3B7FC4', available: true,
    icon: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
  { id: 'credit_champ', tier: 'bronze', label: 'Credit Champ', desc: "Ace both of Hammy's credit quests.", color: '#2E9BD6', available: true,
    icon: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
  { id: 'risk_ready', tier: 'bronze', label: 'Risk Ready', desc: 'Ace every lesson in the Managing Risk module.', color: '#5B6B8C', available: true,
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { id: 'loan_smart', tier: 'bronze', label: 'Loan Smart', desc: 'Ace every lesson in the Loans module.', color: '#A9713C', available: true,
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { id: 'tax_ready', tier: 'bronze', label: 'Tax Ready', desc: 'Ace every lesson in the Taxes module.', color: '#8B5FBF', available: true,
    icon: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>' },
  { id: 'mindful_money', tier: 'bronze', label: 'Mindful Spender', desc: 'Ace Consumer Psychology and finish both activities.', color: '#D6538A', available: true,
    icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  { id: 'offer_ready', tier: 'bronze', label: 'Offer Ready', desc: 'Ace every lesson in Career & Salary.', color: '#5C6BC0', available: true,
    icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
  { id: 'scam_spotter', tier: 'bronze', label: 'Scam Spotter', desc: 'Ace every scam quest, no wrong answers.', color: '#C0453A', available: true,
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { id: 'crisis_averted', tier: 'silver', label: 'Crisis Averted', desc: 'Beat a Credit boss battle.', color: '#E0A72E', available: true,
    icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { id: 'fraud_fighter', tier: 'silver', label: 'Fraud Fighter', desc: 'Beat a Scams boss battle.', color: '#B33A3A', available: true,
    icon: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
  { id: 'no_hints', tier: 'silver', label: 'No Hints Needed', desc: 'Finish the first credit quest with zero hints.', color: '#7952B3', available: true,
    icon: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>' },
  { id: 'word_nerd', tier: 'silver', label: 'Word Nerd', desc: 'Learn 15+ vocab terms across your quests.', color: '#3F8757', available: true,
    icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
  { id: 'homebody', tier: 'silver', label: 'Homebody', desc: "Fill every slot in Hammy's Room.", color: '#C08552', available: true,
    icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
  { id: 'on_fire', tier: 'gold', label: 'On a Roll', desc: 'Play 7 days in a row.', color: '#E8622C', available: true,
    icon: '<path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-2-1-3-1-3s2 1 2 4a5 5 0 0 1-10 0c0-5 4-6 4-10z"/>' },
  { id: 'iron_will', tier: 'gold', label: 'Iron Will', desc: 'Land the optimal path on both Boss Challenges.', color: '#4A4A57', available: false,
    icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>' },
  { id: 'excellent_credit', tier: 'gold', label: 'Excellent Credit', desc: 'Push your credit score to 800 or above.', color: '#1F9D6B', available: false,
    icon: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="M9 3l3 6-3 12"/><path d="M15 3l-3 6 3 12"/>' },
  { id: 'marathoner', tier: 'diamond', label: 'Marathoner', desc: 'Play 30 days in a row. Ultra rare.', color: '#2856A8', available: true,
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
  { id: 'stackd_star', tier: 'diamond', label: 'Stacked Star', desc: 'Master every module. Ultra rare.', color: '#D4A017', available: true,
    icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { id: 'grandmaster', tier: 'diamond', label: 'Grandmaster', desc: 'Unlock every other badge. The hardest one.', color: '#9B1B30', available: true,
    icon: '<path d="M2 18h20L19 8l-5 4-2-6-2 6-5-4z"/>' },
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
