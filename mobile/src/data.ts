/**
 * Mock content for the Stackd prototype. 11 financial-literacy modules,
 * badges, shop items, and the sample learner (Maya). Mirrors the design mockups.
 * Swap for Sandra's web content / Supabase later.
 */
import { moduleColor } from '@/theme';

// Mutable game state (coins, diamonds, xp, level, streak, inventory, equipped) lives in
// the store (@/store) so it can persist and update live — this is just the static profile.
export const user = {
  name: 'Maya',
  fullName: 'Maya Rodriguez',
  email: 'maya.rodriguez@uconn.edu',
  tier: 'Sophomore Saver',
  referral: 'stackd.app/r/MAYA-UC',
};

export type Module = {
  id: string;
  name: string;
  abbr: string;
  color: string;
  /** Mobile's own level-gated progression — the website doesn't gate at all (see
   * mobile/CLAUDE.md). Undefined means unlocked from level 1. Done/total lesson counts
   * are now derived live from the store + real content, not stored here. */
  unlockLevel?: number;
};

// Order, ids, titles, and unlock levels match the website's MODULES array / mobile's
// original level-gating design.
export const modules: Module[] = [
  { id: 'earning', name: 'Earning', abbr: 'Er', color: moduleColor.earning },
  { id: 'spending', name: 'Spending', abbr: 'Sp', color: moduleColor.spending },
  { id: 'saving', name: 'Saving', abbr: 'Sv', color: moduleColor.saving },
  { id: 'investing', name: 'Investing', abbr: 'Iv', color: moduleColor.investing, unlockLevel: 6 },
  { id: 'credit', name: 'Managing Credit', abbr: 'Cr', color: moduleColor.credit },
  { id: 'risk', name: 'Managing Risk', abbr: 'Rk', color: moduleColor.risk, unlockLevel: 6 },
  { id: 'loans', name: 'Loans', abbr: 'Ln', color: moduleColor.loans, unlockLevel: 7 },
  { id: 'taxes', name: 'Taxes', abbr: 'Tx', color: moduleColor.taxes },
  { id: 'psychology', name: 'Consumer Psychology', abbr: 'Ps', color: moduleColor.psychology, unlockLevel: 8 },
  { id: 'career', name: 'Career & Salary', abbr: 'Cs', color: moduleColor.career },
  { id: 'scams', name: 'Scams & Fraud Prevention', abbr: 'Sc', color: moduleColor.scams, unlockLevel: 9 },
];

export const moduleById = (id: string) => modules.find((m) => m.id === id);

// Real shop catalog now lives in content/shopItems.json — see content/index.ts (shopItemsReal).
// Real badges/achievements now live in @/achievements — see store.tsx's achievements().
