/**
 * Mock content for the Stackd prototype. 11 financial-literacy modules,
 * badges, shop items, and the sample learner (Maya). Mirrors the design mockups.
 * Swap for Sandra's web content / Supabase later.
 */
import { moduleColor } from '@/theme';

export const user = {
  name: 'Maya',
  fullName: 'Maya Rodriguez',
  email: 'maya.rodriguez@uconn.edu',
  level: 4,
  tier: 'Sophomore Saver',
  xp: 1240,
  streak: 12,
  coins: 340,
  diamonds: 8,
  referral: 'stackd.app/r/MAYA-UC',
};

export type Module = {
  id: string;
  name: string;
  abbr: string;
  color: string;
  quests: number;
  done: number;
  status: 'done' | 'active' | 'locked';
  unlockLevel?: number;
};

// Order, ids, and titles match the website's MODULES array exactly (01-11). quests/done
// are the real lesson counts from content/modules.json — status/unlockLevel are mobile's
// own level-gated progression (the website doesn't gate at all; see mobile/CLAUDE.md).
export const modules: Module[] = [
  { id: 'earning', name: 'Earning', abbr: 'Er', color: moduleColor.earning, quests: 6, done: 6, status: 'done' },
  { id: 'spending', name: 'Spending', abbr: 'Sp', color: moduleColor.spending, quests: 9, done: 5, status: 'active' },
  { id: 'saving', name: 'Saving', abbr: 'Sv', color: moduleColor.saving, quests: 6, done: 2, status: 'active' },
  { id: 'investing', name: 'Investing', abbr: 'Iv', color: moduleColor.investing, quests: 6, done: 0, status: 'locked', unlockLevel: 6 },
  { id: 'credit', name: 'Managing Credit', abbr: 'Cr', color: moduleColor.credit, quests: 6, done: 1, status: 'active' },
  { id: 'risk', name: 'Managing Risk', abbr: 'Rk', color: moduleColor.risk, quests: 6, done: 0, status: 'locked', unlockLevel: 6 },
  { id: 'loans', name: 'Loans', abbr: 'Ln', color: moduleColor.loans, quests: 6, done: 0, status: 'locked', unlockLevel: 7 },
  { id: 'taxes', name: 'Taxes', abbr: 'Tx', color: moduleColor.taxes, quests: 6, done: 6, status: 'done' },
  { id: 'psychology', name: 'Consumer Psychology', abbr: 'Ps', color: moduleColor.psychology, quests: 8, done: 0, status: 'locked', unlockLevel: 8 },
  { id: 'career', name: 'Career & Salary', abbr: 'Cs', color: moduleColor.career, quests: 7, done: 7, status: 'done' },
  { id: 'scams', name: 'Scams & Fraud Prevention', abbr: 'Sc', color: moduleColor.scams, quests: 6, done: 0, status: 'locked', unlockLevel: 9 },
];

export const moduleById = (id: string) => modules.find((m) => m.id === id);

export type Badge = {
  name: string;
  char: string;
  tier: 'gold' | 'bronze' | 'silver' | 'diamond' | 'orange';
  earned: boolean;
};

export const badges: Badge[] = [
  { name: 'First Dollar', char: '$', tier: 'gold', earned: true },
  { name: '7-Day Streak', char: '🔥', tier: 'orange', earned: true },
  { name: 'Budget Boss', char: '✓', tier: 'silver', earned: true },
  { name: 'Rainy Day Fund', char: '◆', tier: 'diamond', earned: true },
  { name: 'Interest 101', char: '%', tier: 'bronze', earned: true },
  { name: 'Tax Rookie', char: '⚑', tier: 'silver', earned: true },
  { name: 'Scam Spotter', char: '🛡', tier: 'gold', earned: false },
  { name: 'Diamond Hands', char: '◆', tier: 'diamond', earned: false },
  { name: 'Debt Slayer', char: '★', tier: 'gold', earned: false },
];

// Real shop catalog now lives in content/shopItems.json — see content/index.ts (shopItemsReal).
