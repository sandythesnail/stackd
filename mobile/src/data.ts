/**
 * Mock content for the Stacked prototype. 11 financial-literacy modules,
 * badges, shop items, and the sample learner (Maya). Mirrors the design mockups.
 * Swap for Sandra's web content / Supabase later.
 */
import { moduleColor, moduleColorText } from '@/theme';

// Mutable game state (coins, diamonds, xp, level, streak, inventory, equipped) lives in
// the store (@/store) so it can persist and update live — this is just the static profile.
export const user = {
  name: 'Maya',
  fullName: 'Maya Rodriguez',
  email: 'maya.rodriguez@uconn.edu',
  tier: 'Sophomore Saver',
};

export type Module = {
  id: string;
  name: string;
  /** Zero-padded fixed number ("01".."11") — ported from the website's MODULES[i].icon
   * field, shown in the module badge instead of a two-letter abbreviation. */
  icon: string;
  color: string;
  textColor: string;
};

// Order, ids, and numbers match the website's MODULES array. Nothing is level-gated,
// matching the website's no-gating behavior — every module and lesson is reachable any time.
export const modules: Module[] = [
  { id: 'earning', name: 'Earning', icon: '01', color: moduleColor.earning, textColor: moduleColorText.earning },
  { id: 'spending', name: 'Spending', icon: '02', color: moduleColor.spending, textColor: moduleColorText.spending },
  { id: 'saving', name: 'Saving', icon: '03', color: moduleColor.saving, textColor: moduleColorText.saving },
  { id: 'investing', name: 'Investing', icon: '04', color: moduleColor.investing, textColor: moduleColorText.investing },
  { id: 'credit', name: 'Managing Credit', icon: '05', color: moduleColor.credit, textColor: moduleColorText.credit },
  { id: 'risk', name: 'Managing Risk', icon: '06', color: moduleColor.risk, textColor: moduleColorText.risk },
  { id: 'loans', name: 'Loans', icon: '07', color: moduleColor.loans, textColor: moduleColorText.loans },
  { id: 'taxes', name: 'Taxes', icon: '08', color: moduleColor.taxes, textColor: moduleColorText.taxes },
  { id: 'psychology', name: 'Consumer Psychology', icon: '09', color: moduleColor.psychology, textColor: moduleColorText.psychology },
  { id: 'career', name: 'Career & Salary', icon: '10', color: moduleColor.career, textColor: moduleColorText.career },
  { id: 'scams', name: 'Scams & Fraud Prevention', icon: '11', color: moduleColor.scams, textColor: moduleColorText.scams },
];

export const moduleById = (id: string) => modules.find((m) => m.id === id);

// Real shop catalog now lives in content/shopItems.json — see content/index.ts (shopItemsReal).
// Real badges/achievements now live in @/achievements — see store.tsx's achievements().
