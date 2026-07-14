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

export const modules: Module[] = [
  { id: 'earning', name: 'Earning', abbr: 'Er', color: moduleColor.earning, quests: 6, done: 6, status: 'done' },
  { id: 'career', name: 'Career & Salary', abbr: 'Cs', color: moduleColor.career, quests: 5, done: 5, status: 'done' },
  { id: 'spending', name: 'Spending', abbr: 'Sp', color: moduleColor.spending, quests: 5, done: 3, status: 'active' },
  { id: 'saving', name: 'Saving', abbr: 'Sv', color: moduleColor.saving, quests: 6, done: 2, status: 'active' },
  { id: 'credit', name: 'Managing Credit', abbr: 'Cr', color: moduleColor.credit, quests: 5, done: 1, status: 'active' },
  { id: 'taxes', name: 'Taxes', abbr: 'Tx', color: moduleColor.taxes, quests: 4, done: 4, status: 'done' },
  { id: 'investing', name: 'Investing', abbr: 'Iv', color: moduleColor.investing, quests: 6, done: 0, status: 'locked', unlockLevel: 6 },
  { id: 'risk', name: 'Managing Risk', abbr: 'Rk', color: moduleColor.risk, quests: 5, done: 0, status: 'locked', unlockLevel: 6 },
  { id: 'loans', name: 'Loans', abbr: 'Ln', color: moduleColor.loans, quests: 5, done: 0, status: 'locked', unlockLevel: 7 },
  { id: 'psych', name: 'Consumer Psych.', abbr: 'Ps', color: moduleColor.psych, quests: 4, done: 0, status: 'locked', unlockLevel: 8 },
  { id: 'scams', name: 'Scams & Fraud', abbr: 'Sc', color: moduleColor.scams, quests: 5, done: 0, status: 'locked', unlockLevel: 9 },
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

export type ShopItem = {
  name: string;
  file: string;
  price: number;
  currency: 'coin' | 'diamond';
  owned?: boolean;
  category: 'Hats' | 'Glasses' | 'Outfits' | 'Room';
};

export const shopItems: ShopItem[] = [
  { name: 'Cozy Beanie', file: 'beanie.png', price: 120, currency: 'coin', category: 'Hats' },
  { name: 'Grad Cap', file: 'gradcap.png', price: 300, currency: 'coin', category: 'Hats' },
  { name: 'Party Hat', file: 'partyhat.png', price: 0, currency: 'coin', owned: true, category: 'Hats' },
  { name: 'Gold Crown', file: 'crown.png', price: 5, currency: 'diamond', category: 'Hats' },
  { name: 'Husky Ears', file: 'huskyhat.png', price: 180, currency: 'coin', category: 'Hats' },
  { name: 'Sun Visor', file: 'visor.png', price: 90, currency: 'coin', category: 'Hats' },
];

/** Quests inside the Saving module (screen 15). */
export const savingQuests = [
  { title: 'Why saving beats stress', status: 'done', note: '+80 XP earned' },
  { title: 'Pay yourself first', status: 'done', note: '+80 XP earned' },
  { title: 'Your first emergency fund', status: 'active', note: 'In progress · Quest 3/6' },
  { title: 'Saving on a student budget', status: 'locked', note: 'Finish quest 3 to unlock' },
  { title: 'Where to stash your cash', status: 'locked', note: '' },
  { title: 'Boss: your 3-month plan', status: 'boss', note: 'Final quest · +1 💎' },
] as const;
