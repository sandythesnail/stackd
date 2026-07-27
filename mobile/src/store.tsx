import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shopItemsReal, moduleContentById } from '@/content';
import type { RoomSlot, ShopItemReal } from '@/content';
import { ACHIEVEMENTS, BADGE_TIER_REWARD, MODULE_MASTERY_ACHIEVEMENT, type Achievement } from '@/achievements';
import { LIFE_EVENTS, LIFE_EVENT_UNLOCKS, LIFE_EVENT_CHANCE, LIFE_EVENT_COOLDOWN_SESSIONS, type LifeEvent } from '@/lifeEvents';

const STORAGE_KEY = 'stackd_state_v1';

/** MAX_EQUIPPED_ITEMS, MYSTERY_OWNED_WEIGHT_FACTOR, MYSTERY_DUPLICATE_REFUND_RATE, and
 * RARITY_WEIGHT are ported verbatim from the website's app.js (see handleShopAction,
 * pickMysteryItem, openMysteryBox). */
export const MAX_EQUIPPED_ITEMS = 3;
const MYSTERY_OWNED_WEIGHT_FACTOR = 0.35;
const MYSTERY_DUPLICATE_REFUND_RATE = 0.5;
/** Ported verbatim from finishQuest (app.js): coinsEarned = chapterScore*8 if the quest had
 * any graded chapters, else a flat 8 — and diamondsEarned is always 0 (diamonds only come
 * from streaks/daily-login/achievements, never a quest finish). */
export const QUEST_COIN_PER_CORRECT = 8;
export const QUEST_COIN_FLAT_FALLBACK = 8;

/** STREAK_DIAMOND_INTERVAL/REWARD ported verbatim from app.js (updateStreak) — a
 * once-per-calendar-day streak bonus, auto-credited at boot. DAILY_LOGIN_COINS is a flat
 * "thanks for showing up" coin drip claimed by tapping the streak card (claimDailyLoginBonus),
 * same as the website's click-to-collect flow. */
const STREAK_DIAMOND_INTERVAL = 3;
const STREAK_DIAMOND_REWARD = 5;
const DAILY_LOGIN_COINS = 15;
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const RARITY_WEIGHT: Record<string, number> = { common: 8, rare: 4, epic: 2, legendary: 1 };

/** LEVEL_THRESHOLDS ported verbatim from app.js — xp needed to REACH each level (index = level). */
const LEVEL_THRESHOLDS = [0, 90, 200, 330, 480, 660, 880, 1150, 1450, 1800, 2200];

/** Highest real level — a player at this level has no "next level" to progress toward.
 * Exported so screens showing "X XP to next level" (progress.tsx) can hide/adjust that
 * copy instead of promising a level (e.g. "Level 12") that doesn't exist and can never be
 * reached. */
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function xpForLevel(l: number) {
  return LEVEL_THRESHOLDS[Math.min(l, LEVEL_THRESHOLDS.length - 1)];
}

/** Ported from app.js's addXP loop, but computed fresh from total xp each time (no
 * incremental state.level field to drift out of sync). */
function levelForXp(xp: number) {
  let level = 1;
  while (level < LEVEL_THRESHOLDS.length && xp >= xpForLevel(level)) level++;
  return level;
}

export function xpProgressPct(xp: number, level: number) {
  const base = xpForLevel(level - 1);
  const ceil = xpForLevel(level);
  if (ceil === base) return 100;
  return Math.min(100, ((xp - base) / (ceil - base)) * 100);
}

/** TIERS ported verbatim from app.js — keyed by count of MASTERED modules (0-11), not level. */
const TIERS = [
  { min: 0, max: 2, name: 'Broke Freshman' },
  { min: 3, max: 4, name: 'Budget Apprentice' },
  { min: 5, max: 7, name: 'Money-Aware Sophomore' },
  { min: 8, max: 10, name: 'Money Manager' },
  { min: 11, max: 11, name: 'Financially Literate Graduate' },
];

function tierForMasteredCount(count: number) {
  return (TIERS.find((t) => count >= t.min && count <= t.max) ?? TIERS[TIERS.length - 1]).name;
}

export function itemRarity(item: Pick<ShopItemReal, 'rarity'>) {
  return item.rarity && RARITY_ORDER.includes(item.rarity) ? item.rarity : 'common';
}

const ROOM_SLOTS: RoomSlot[] = ['wallpaper', 'wall', 'rug', 'plant', 'bed', 'desk', 'lamp', 'window', 'garland'];

/** Ported verbatim from the website's Budget Calculator (renderBudgetCalculatorPanel/
 * computeBudgetTotals in app.js) — free-form add/remove income sources and fixed expenses,
 * plus the same 10 named variable-spending categories, rather than a simplified mobile-only
 * shape. Shared with the web schema (see lib/webState.ts) so edits on either platform sync. */
export type BudgetLineItem = { id: string; label: string; amount: number | '' };
export type BudgetPlan = {
  incomeSources: BudgetLineItem[];
  fixedExpenses: BudgetLineItem[];
  variableExpenses: Record<string, number | ''>;
  savingsGoal: number | '';
};

/** Clamps every numeric field to >= 0. The mobile UI itself can't type a negative number
 * (the amount field's onChangeText strips non-digits — see tools.tsx), but hydrateFromRemote
 * merges an incoming budgetPlan with a plain overwrite and no clamping of its own, so a
 * negative value arriving via sync (e.g. from a pre-fix web client, or any future non-UI
 * writer) would flow straight into totalIncome/totalExpenses/remaining unguarded. The app's
 * own input safety doesn't cover data arriving from sync — this closes that gap at the data
 * layer instead. */
function sanitizeBudgetPlan(plan: BudgetPlan): BudgetPlan {
  const clampAmount = (v: number | ''): number | '' => (v === '' ? '' : Math.max(0, v));
  return {
    incomeSources: plan.incomeSources.map((item) => ({ ...item, amount: clampAmount(item.amount) })),
    fixedExpenses: plan.fixedExpenses.map((item) => ({ ...item, amount: clampAmount(item.amount) })),
    variableExpenses: Object.fromEntries(
      Object.entries(plan.variableExpenses).map(([k, v]) => [k, clampAmount(v)]),
    ),
    savingsGoal: clampAmount(plan.savingsGoal),
  };
}

export type AppState = {
  coins: number;
  diamonds: number;
  xp: number;
  streak: number;
  ownedItems: string[];
  ownedRoomItems: string[];
  equippedItems: string[];
  equippedRoom: Record<RoomSlot, string | null>;
  /** Completed lesson INDICES per module id — the real source of truth for module
   * progress. A set of indices (not a count): completing lesson 3 first marks exactly one
   * lesson done, not lessons 1-3 — the old "highest index + 1" count claimed every earlier
   * lesson too, which is how finishing one lesson could read "3 completed / 38%". Mirrors
   * the website's per-quest questProgress map (see lib/webState.ts). */
  moduleProgress: Record<string, number[]>;
  /** Per-module XP earned and cumulative graded-question accuracy, accumulated once per
   * lesson the first time it's completed (mirrors the `advanced`-gated coin payout below, so
   * replaying an already-completed lesson doesn't re-count or skew the accuracy) — powers the
   * Progress page's per-module XP/score charts (ported from the website's
   * state.completedModules[id].xpEarned/score/total, adapted to accumulate across every
   * lesson in the module rather than a single snapshot). */
  moduleStats: Record<string, { xp: number; correct: number; total: number }>;
  unlockedAchievementIds: string[];
  /** Guaranteed-unlock life events (LIFE_EVENT_UNLOCKS) already shown, so each fires once. */
  shownLifeEventIds: string[];
  /** Set when a life event should be shown next; cleared once the player dismisses it. */
  pendingLifeEventId: string | null;
  /** Sessions remaining before an ambient life event can roll again (LIFE_EVENT_COOLDOWN_SESSIONS). */
  lifeEventCooldown: number;
  /** toDateString() of the last day the streak/daily-login check ran. */
  lastPlayedDate: string | null;
  /** toDateString() -> coins awarded that day, so the coin drip only ever pays out once/day. */
  dailyLoginLog: Record<string, number>;
  /** Track chosen at the end of the onboarding survey (getRecommendedTrack, or a manual
   * switch) — see @/survey. */
  onboardingTrackId: string | null;
  /** Module ids where a bossbattle-ending quest has been finished at least once — powers
   * the crisis_averted/fraud_fighter achievements. */
  questBossesWon: string[];
  /** `${moduleId}::${questId}` -> hints used, recorded when that quest finishes — powers
   * the no_hints achievement (credit::maya finished with 0). */
  questHintsUsed: Record<string, number>;
  /** Unique vocab terms encountered across matching/teach chapters — powers word_nerd. */
  termsLearned: string[];
  /** toDateString() of the last day a lesson was finished — Home's mascot shows a "happy
   * today" face once this is today instead of the deterministic daily mood. */
  lastModuleActivityDate: string | null;
  /** Module ids whose real-life "step-by-step guide" quest (see LessonSummary.isLifeTask)
   * has been completed — tracked separately from moduleProgress/mastery, see
   * RealLifeSubQuestRow and completeLifeTask below. */
  completedLifeTaskIds: string[];
  /** Whether the first-login spotlight tour (XP, then the Shop tab) has already played —
   * mirrors the website's state.hasSeenOnboardingTour, see components/OnboardingTour.tsx. */
  hasSeenOnboardingTour: boolean;
  /** Mirrors the website's state.budgetPlan exactly — see BudgetPlan above. */
  budgetPlan: BudgetPlan;
  /** Mirrors the website's state.resetToken (app.js) — bumped to Date.now() only by an
   * explicit "Reset all progress" (here or on web), never by ordinary play. Lets
   * hydrateFromRemote tell "a real reset happened on some device since I last synced"
   * apart from an ordinary stale/racy remote read, which otherwise look identical (remote's
   * numbers are lower than local's either way). See hydrateFromRemote below. */
  resetToken: number;
};

const DEFAULT_STATE: AppState = {
  coins: 0,
  diamonds: 0,
  xp: 0,
  streak: 0,
  ownedItems: [],
  ownedRoomItems: [],
  equippedItems: [],
  equippedRoom: { wallpaper: null, wall: null, rug: null, plant: null, bed: null, desk: null, lamp: null, window: null, garland: null },
  // Empty on purpose: progress only ever reflects lessons the player actually finished.
  // This used to be seeded with Maya's mock-story counts (earning: 6, saving: 2, ...),
  // which made a brand-new player's very first lesson finish read as "3 completed / 38%"
  // — phantom progress they never earned. See LEGACY_DEMO_SEEDS below, which strips those
  // same phantom counts back out of previously-saved states.
  moduleProgress: {},
  moduleStats: {},
  unlockedAchievementIds: [],
  shownLifeEventIds: [],
  pendingLifeEventId: null,
  lifeEventCooldown: 0,
  // No streak/login history yet — runDailyCheck seeds this correctly on first real day.
  lastPlayedDate: null,
  dailyLoginLog: {},
  onboardingTrackId: null,
  questBossesWon: [],
  questHintsUsed: {},
  termsLearned: [],
  lastModuleActivityDate: null,
  completedLifeTaskIds: [],
  hasSeenOnboardingTour: false,
  // Matches app.js's own default state literal exactly — the income/fixed-expense starter
  // rows ("Part-time job"/"Rent") are lazily seeded by the Tools screen itself whenever
  // either list is empty, same as the website's renderBudgetCalculatorPanel, rather than
  // baked in here.
  budgetPlan: {
    incomeSources: [],
    fixedExpenses: [],
    variableExpenses: {
      groceries: 0, diningOut: 0, foodDelivery: 0, coffee: 0, clothing: 0,
      beauty: 0, transportation: 0, entertainment: 0, textbooks: 0, gym: 0,
    },
    savingsGoal: 0,
  },
  resetToken: 0,
};

export type MysteryResult = {
  item: ShopItemReal;
  isDuplicate: boolean;
  refundAmount: number;
  refundCurrency: 'coin' | 'diamond';
};

function mysteryPoolAll(poolKey: string) {
  return shopItemsReal.filter((i) => i.mysteryPool === poolKey && !i.isMysteryBox);
}

export function mysteryPoolUnowned(poolKey: string, ownedItems: string[]) {
  return mysteryPoolAll(poolKey).filter((i) => !ownedItems.includes(i.id));
}

function pickMysteryItem(poolKey: string, ownedItems: string[]): ShopItemReal | null {
  const pool = mysteryPoolAll(poolKey);
  const weighted: ShopItemReal[] = [];
  pool.forEach((item) => {
    const owned = ownedItems.includes(item.id);
    const baseWeight = RARITY_WEIGHT[itemRarity(item)];
    const weight = owned ? Math.max(1, Math.round(baseWeight * MYSTERY_OWNED_WEIGHT_FACTOR)) : baseWeight;
    for (let k = 0; k < weight; k++) weighted.push(item);
  });
  if (!weighted.length) return null;
  return weighted[Math.floor(Math.random() * weighted.length)];
}

/** This item's odds of dropping from its own mystery box — e.g. "Epic · 8.3%". */
export function mysteryDropChance(item: ShopItemReal): number {
  if (!item.mysteryPool) return 0;
  const pool = mysteryPoolAll(item.mysteryPool);
  const total = pool.reduce((sum, i) => sum + RARITY_WEIGHT[itemRarity(i)], 0);
  if (!total) return 0;
  return (RARITY_WEIGHT[itemRarity(item)] / total) * 100;
}

const ALL_MODULE_IDS = Object.keys(MODULE_MASTERY_ACHIEVEMENT);

/** Main-quest count only (excludes the real-life sub-quest) — used internally to validate
 * moduleProgress indices, which only ever record main-quest completions. The sub-quest's
 * own completion lives separately, in completedLifeTaskIds (see moduleDoneCount) — it's
 * always the module's last lesson (guaranteed by content, see LessonSummary.isLifeTask). */
function mainLessonCount(moduleId: string) {
  return moduleContentById(moduleId)?.lessons.filter((l) => !l.isLifeTask).length ?? 0;
}

/** Every real lesson in a module: 8 main quests + the real-life sub-quest = 9. The
 * sub-quest is a required 9th lesson — a module isn't "done"/mastered until it's finished
 * too, same as any other lesson. */
function moduleTotal(moduleId: string) {
  return moduleContentById(moduleId)?.lessons.length ?? 0;
}

/** Adds one lesson's XP/graded results onto a module's running totals — see moduleStats. */
function accumulateModuleStats(
  moduleStats: AppState['moduleStats'], moduleId: string, xpEarned: number, correctCount: number, gradedTotal: number,
): AppState['moduleStats'] {
  const prev = moduleStats[moduleId] ?? { xp: 0, correct: 0, total: 0 };
  return {
    ...moduleStats,
    [moduleId]: { xp: prev.xp + xpEarned, correct: prev.correct + correctCount, total: prev.total + gradedTotal },
  };
}

/** How many of this module's 9 real lessons are done — the 8 main quests (distinct valid
 * indices in moduleProgress) plus the real-life sub-quest (completedLifeTaskIds). */
function moduleDoneCount(moduleProgress: Record<string, number[]>, completedLifeTaskIds: string[], moduleId: string) {
  const mainDone = new Set((moduleProgress[moduleId] ?? []).filter((i) => i >= 0 && i < mainLessonCount(moduleId))).size;
  return mainDone + (completedLifeTaskIds.includes(moduleId) ? 1 : 0);
}

function isModuleMastered(moduleProgress: Record<string, number[]>, completedLifeTaskIds: string[], moduleId: string) {
  const total = moduleTotal(moduleId);
  return total > 0 && moduleDoneCount(moduleProgress, completedLifeTaskIds, moduleId) >= total;
}

function masteredCount(moduleProgress: Record<string, number[]>, completedLifeTaskIds: string[]) {
  return ALL_MODULE_IDS.filter((id) => isModuleMastered(moduleProgress, completedLifeTaskIds, id)).length;
}

/** The old DEFAULT_STATE shipped Maya's mock-story progress counts baked into every fresh
 * install. When migrating a saved state from the legacy count format to per-lesson index
 * arrays, subtract these phantom counts back out: a legacy count of 3 in `saving` (seed 2)
 * means the player really finished ONE lesson — index 2, the "next up" lesson the UI
 * pointed them at — so it becomes [2], not [0,1,2]. */
const LEGACY_DEMO_SEEDS: Record<string, number> = {
  earning: 6, spending: 5, saving: 2, investing: 0, credit: 1, risk: 0,
  loans: 0, taxes: 6, psychology: 0, career: 7, scams: 0,
};

/** Accepts either format from persisted/remote state: per-lesson index arrays (current)
 * pass through cleaned; legacy numeric counts are converted via LEGACY_DEMO_SEEDS. */
function normalizeModuleProgress(raw: unknown): Record<string, number[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number[]> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      const idxs = [...new Set(v.filter((n): n is number => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b);
      if (idxs.length) out[id] = idxs;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      const idxs: number[] = [];
      for (let i = LEGACY_DEMO_SEEDS[id] ?? 0; i < v; i++) idxs.push(i);
      if (idxs.length) out[id] = idxs;
    }
  }
  return out;
}

/** Union two per-module completed-lesson-index maps (never drops an index either side has)
 * — see the "stale remote must never regress local progress" note on hydrateFromRemote below.
 * A stale remote snapshot that hasn't caught up to a lesson finished locally must not erase
 * that lesson's completion by replacing the whole array; it can only ever add to it. */
function unionModuleProgress(
  a: Record<string, number[]>, b: Record<string, number[]>,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[id] = [...new Set([...(a[id] ?? []), ...(b[id] ?? [])])].sort((x, y) => x - y);
  }
  return out;
}

/** Which achievements are met right now, given the subset of app.js's ACHIEVEMENTS checks
 * that the mobile app can actually evaluate today (see Achievement.available). */
function computeMetAchievementIds(s: AppState): string[] {
  const met = new Set<string>();
  for (const [moduleId, achievementId] of Object.entries(MODULE_MASTERY_ACHIEVEMENT)) {
    if (isModuleMastered(s.moduleProgress, s.completedLifeTaskIds, moduleId)) met.add(achievementId);
  }
  if (s.streak >= 7) met.add('on_fire');
  if (s.streak >= 30) met.add('marathoner');
  // 'plant' excluded: its only two purchasable items (Potted Pothos, Succulent Trio) were
  // removed from the catalog, so the slot can never be filled again — leaving it in this
  // check would make "Homebody" permanently unearnable instead of just requiring every
  // slot that can actually still be furnished.
  const roomFull = ROOM_SLOTS.filter((slot) => slot !== 'plant').every((slot) => !!s.equippedRoom[slot]);
  if (roomFull) met.add('homebody');
  if (masteredCount(s.moduleProgress, s.completedLifeTaskIds) === ALL_MODULE_IDS.length) met.add('stackd_star');
  if (s.questBossesWon.includes('credit')) met.add('crisis_averted');
  if (s.questBossesWon.includes('scams')) met.add('fraud_fighter');
  if (s.questHintsUsed['credit::maya'] === 0) met.add('no_hints');
  if (s.termsLearned.length >= 15) met.add('word_nerd');
  const otherIds = ACHIEVEMENTS.filter((a) => a.id !== 'grandmaster').map((a) => a.id);
  if (otherIds.every((id) => met.has(id))) met.add('grandmaster');
  return [...met];
}

export type AchievementView = Achievement & { earned: boolean };

const ALL_LIFE_EVENTS: LifeEvent[] = [...LIFE_EVENTS, ...Object.values(LIFE_EVENT_UNLOCKS)];
function findLifeEvent(id: string | null) {
  return id ? ALL_LIFE_EVENTS.find((e) => e.id === id) ?? null : null;
}

type Ctx = {
  state: AppState;
  /** True once the on-device AsyncStorage snapshot has been loaded into `state` — gates
   * anything (like SupabaseSync's account-owner check) that must not race that load. */
  hydrated: boolean;
  level: number;
  tierName: string;
  isOwned: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  equippedRoomItems: () => ShopItemReal[];
  equippedMascotItems: () => ShopItemReal[];
  moduleDone: (moduleId: string) => number;
  /** The exact lesson indices completed in this module — for per-lesson done/next markers. */
  moduleDoneIndices: (moduleId: string) => number[];
  /** First not-yet-completed lesson index (the one to open for "continue"), or -1 if all done. */
  nextLessonIndex: (moduleId: string) => number;
  /** Total real lessons in the module: 8 main quests + the real-life sub-quest = 9. The
   * same number for both display ("X out of 9") and mastery/achievement gating — the
   * sub-quest is a required 9th lesson, not a bonus extra. */
  moduleTotal: (moduleId: string) => number;
  moduleMastered: (moduleId: string) => boolean;
  /** 'done' once every lesson is complete, else 'active'. Nothing is level-gated —
   * every module is reachable from the start (matches the website's no-gating behavior). */
  moduleStatus: (moduleId: string) => 'done' | 'active';
  achievements: () => AchievementView[];
  /** Buy/equip/unequip toggle for non-room items (hats, accessories, exclusives). Mirrors
   * the website's handleShopAction non-slot branch. No-ops (returns false) if unaffordable. */
  buyOrEquipItem: (itemId: string) => boolean;
  /** Buy/equip/unequip toggle for room-category items (one equipped per slot). Mirrors
   * handleShopAction's slot branch. */
  toggleRoomSlot: (itemId: string) => boolean;
  /** Opens a mystery box: deducts price, rolls a weighted-random prize, partially refunds
   * duplicates. Returns null if unaffordable or the pool has nothing left to give. */
  openMysteryBox: (itemId: string) => MysteryResult | null;
  /** Records a finished lesson: advances moduleProgress (if this lesson is new progress,
   * not a replay), awards its XP + the real coin formula (chapterScore*8, or flat 8 — never
   * diamonds, mirrors finishQuest), checks for newly-unlocked achievements, and may queue a
   * life event (guaranteed module-unlock event, or an ambient random roll). */
  completeLesson: (moduleId: string, lessonIndex: number, xpEarned: number, opts?: {
    correctCount?: number; gradedTotal?: number;
    questId?: string; bossWon?: boolean; hintsUsed?: number; newTerms?: string[];
  }) => { xpAwarded: number; coinsAwarded: number };
  /** Same reward shape as completeLesson (XP + the real coin formula), but for a module's
   * real-life step-by-step-guide lesson — never touches moduleProgress/mastery, and only
   * pays out once (replaying a finished life task earns nothing further). */
  completeLifeTask: (moduleId: string, xpEarned: number, opts?: {
    correctCount?: number; gradedTotal?: number; questId?: string; hintsUsed?: number; newTerms?: string[];
  }) => { xpAwarded: number; coinsAwarded: number };
  pendingLifeEvent: () => LifeEvent | null;
  /** Applies a choice's coinDelta (if any), records the event as shown, and clears pending. */
  resolveLifeEvent: (choiceId: string) => void;
  /** Ambient random life-event roll, ported from the website's maybeTriggerAmbientLifeEvent
   * — checked at ordinary mid-quest "next" transitions (see quest.tsx's onComplete), not
   * just when a whole lesson finishes (completeLesson has its own separate guaranteed-unlock
   * + ambient roll for that). Same cooldown/chance gate as completeLesson's ambient branch.
   * Returns whether an event actually got queued, so the caller knows to pause and wait for
   * it to be dismissed before continuing. */
  rollAmbientLifeEvent: () => boolean;
  /** Set when a claimed reward is worth telling the player about; null once dismissed. */
  dailyLoginBanner: { streak: number; loginCoins: number; streakDiamonds: number } | null;
  dismissDailyLoginBanner: () => void;
  /** Whether the streak card should show its "come collect" yellow-outline treatment —
   * true if today's login coin drip hasn't been claimed yet, or a streak-diamond milestone
   * was just auto-credited and hasn't been shown to the player yet. */
  loginBonusPending: boolean;
  /** Claims today's login coin drip (if not already claimed) plus any pending streak-diamond
   * reward, adds them to the player's balance, and pops dailyLoginBanner. Ported from the
   * website's click-to-collect streak card (see hs-streak-card in app.js). */
  claimDailyLoginBonus: () => void;
  setOnboardingTrack: (trackId: string) => void;
  /** Marks the first-login spotlight tour as seen, whether it finished or was skipped —
   * see components/OnboardingTour.tsx. */
  markOnboardingTourSeen: () => void;
  /** Persists a Budget Calculator edit, same as the website calling saveState() after every
   * input change (see Tools.tsx). Accepts either a full replacement plan or an updater. */
  setBudgetPlan: (next: BudgetPlan | ((prev: BudgetPlan) => BudgetPlan)) => void;
  /** Achievements newly unlocked since the last dismissal — drives the global unlock toast. */
  newAchievements: () => AchievementView[];
  dismissNewAchievements: () => void;
  /** Ported from the website's Settings reset button: wipes local state back to defaults. */
  resetProgress: () => void;
  /** A different account signed in on this device than the one whose snapshot is cached
   * (see SupabaseSync's owner check): restart from a clean slate instead of inheriting
   * the previous account's progress. Returns the fresh state synchronously so the caller
   * can seed the new account's cloud row without racing React's setState. */
  resetForAccountSwitch: () => AppState;
  /** Merge a remote (cloud-synced) snapshot into local state — used by SupabaseSync after
   * translating the web's user_progress blob into mobile's AppState. */
  hydrateFromRemote: (partial: Partial<AppState>) => void;
  /** Dev-only: backdates lastPlayedDate by one day and re-runs the daily check, so the
   * streak/daily-login flow can be verified without waiting for a real day boundary. */
  debugSimulateNewDay: () => void;
  /** Dev-only: grants ownership (not equip — room slots/MAX_EQUIPPED_ITEMS still cap what's
   * actually worn/placed at once) of every real, buyable Furniture Farm and Porky's Boutique
   * item, so the full catalog can be browsed/equipped without grinding coins. Skips mystery
   * BOX items themselves (buying one is a currency sink, not something to "own") and the
   * 'reward' category (achievement-earned, not part of either shop tab, and not wired to
   * ownedItems by any real code path today). */
  devOwnEverything: () => void;
  /** Dev-only: credits `amount` coins, for testing purchases (the Grandfather Clock alone
   * is 320) without grinding lessons for XP-driven coin rewards. */
  devAddCoins: (amount: number) => void;
};

const StoreContext = createContext<Ctx | null>(null);

type DailyLoginBanner = { streak: number; loginCoins: number; streakDiamonds: number } | null;

function hasClaimedToday(s: AppState) {
  const today = new Date().toDateString();
  return !!s.dailyLoginLog[today];
}

/** Ported from app.js's updateStreak — runs once per calendar day at boot (or whenever a
 * fresher day boundary is discovered, e.g. via hydrateFromRemote). Advances the login
 * streak and auto-credits any diamond milestone reward immediately, same as the website.
 * Does NOT touch coins — that's a separate player-triggered claim (claimDailyLoginBonus).
 * No-ops if today was already checked. */
function runDailyCheck(s: AppState): { next: AppState; streakDiamondsEarned: number } {
  const now = new Date();
  const today = now.toDateString();
  if (s.lastPlayedDate === today) return { next: s, streakDiamondsEarned: 0 };

  // Subtracting a fixed 86400000ms (24h) instead of a calendar day breaks across a
  // spring-forward DST transition: the calendar day right after one is only 23 real hours
  // long, so for roughly an hour after local midnight on the FOLLOWING day, "now minus
  // 24h" lands one calendar day too early and no longer matches s.lastPlayedDate — the
  // streak spuriously resets to 1 even though the player genuinely played on consecutive
  // days. new Date(y, m, day-1) subtracts a calendar day instead, which normalizes
  // correctly across month/year boundaries too. Mirrors the same fix in app.js's
  // updateStreak.
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();
  const streak = s.lastPlayedDate === yesterday ? s.streak + 1 : 1;
  const streakDiamonds = streak % STREAK_DIAMOND_INTERVAL === 0 ? STREAK_DIAMOND_REWARD : 0;

  const next: AppState = {
    ...s,
    streak,
    lastPlayedDate: today,
    diamonds: s.diamonds + streakDiamonds,
  };
  return { next: applyAchievementUnlocks(next), streakDiamondsEarned: streakDiamonds };
}

/** Applies BADGE_TIER_REWARD for any newly-met achievement and records it as unlocked. */
/** Applies unlocks against `candidate`, reporting (via `report`) any achievement id that
 * wasn't already unlocked in `prev` — used to drive the global achievement-unlock toast. */
function applyAndReport(prev: AppState, candidate: AppState, report: (ids: string[]) => void): AppState {
  const applied = applyAchievementUnlocks(candidate);
  const newly = applied.unlockedAchievementIds.filter((id) => !prev.unlockedAchievementIds.includes(id));
  if (newly.length) report(newly);
  return applied;
}

function applyAchievementUnlocks(s: AppState): AppState {
  const met = computeMetAchievementIds(s);
  const newly = met.filter((id) => !s.unlockedAchievementIds.includes(id));
  if (!newly.length) return s;
  let coins = s.coins;
  let diamonds = s.diamonds;
  for (const id of newly) {
    const achievement = ACHIEVEMENTS.find((a) => a.id === id);
    if (!achievement) continue;
    const reward = BADGE_TIER_REWARD[achievement.tier];
    if (reward.type === 'coins') coins += reward.amount; else diamonds += reward.amount;
  }
  return { ...s, coins, diamonds, unlockedAchievementIds: [...s.unlockedAchievementIds, ...newly] };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [dailyLoginBanner, setDailyLoginBanner] = useState<DailyLoginBanner>(null);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  /** Diamonds auto-credited by the day's runDailyCheck but not yet shown to the player —
   * mirrors app.js's module-level `pendingStreakDiamonds` (in-memory only, not persisted,
   * so it naturally clears itself on next launch same as the website). */
  const [pendingStreakDiamonds, setPendingStreakDiamonds] = useState(0);
  const loaded = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  /** Mirrors `state`, but buyOrEquipItem/toggleRoomSlot/openMysteryBox update it
   * synchronously themselves (not just via the render-cycle sync below) whenever THEY
   * mutate state. Without that, two rapid invocations of the same action before React
   * re-renders (a fast double-tap, or any caller that doesn't disable its button between
   * the call and the next render) would both read the same stale `state` closure, both
   * pass the same affordability/ownership check against it, and both apply their
   * setState update on top of it: double-charging a purchase (coins can go negative),
   * duplicating an owned item, or misreporting a mystery-box pull as new when it was
   * actually a duplicate the first of the two calls already granted. Scoped to just
   * those three actions rather than every setState in this file — the narrow race that
   * was actually reported, not a full store-wide rewrite. */
  const liveState = useRef(state);
  liveState.current = state;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let loadedState = DEFAULT_STATE;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          loadedState = {
            ...DEFAULT_STATE,
            ...parsed,
            // Migrates legacy numeric counts (and strips the old fake demo seeds) into
            // per-lesson index arrays — see normalizeModuleProgress/LEGACY_DEMO_SEEDS.
            moduleProgress: normalizeModuleProgress(parsed.moduleProgress),
          };
        } catch {
          // corrupt/incompatible saved state — fall back to defaults already set
        }
      }
      const { next, streakDiamondsEarned } = runDailyCheck(loadedState);
      setState(next);
      if (streakDiamondsEarned > 0) setPendingStreakDiamonds((p) => p + streakDiamondsEarned);
      loaded.current = true;
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<Ctx>(() => {
    const isOwned = (id: string) => state.ownedItems.includes(id) || state.ownedRoomItems.includes(id);
    const isEquipped = (id: string) =>
      state.equippedItems.includes(id) || Object.values(state.equippedRoom).includes(id);
    const level = levelForXp(state.xp);
    const tierName = tierForMasteredCount(masteredCount(state.moduleProgress, state.completedLifeTaskIds));
    const loginBonusPending = !hasClaimedToday(state) || pendingStreakDiamonds > 0;

    return {
      state,
      hydrated,
      level,
      tierName,
      loginBonusPending,
      isOwned,
      isEquipped,
      equippedRoomItems: () =>
        ROOM_SLOTS.map((slot) => state.equippedRoom[slot]).filter((id): id is string => !!id)
          .map((id) => shopItemsReal.find((i) => i.id === id))
          .filter((i): i is ShopItemReal => !!i),
      equippedMascotItems: () =>
        state.equippedItems.map((id) => shopItemsReal.find((i) => i.id === id)).filter((i): i is ShopItemReal => !!i),
      moduleDone: (moduleId) => moduleDoneCount(state.moduleProgress, state.completedLifeTaskIds, moduleId),
      // Indices only ever cover the 8 main quests — the sub-quest's own completion lives in
      // completedLifeTaskIds, not as an index here (see moduleDoneCount).
      moduleDoneIndices: (moduleId) => (state.moduleProgress[moduleId] ?? []).filter((i) => i >= 0 && i < mainLessonCount(moduleId)),
      nextLessonIndex: (moduleId) => {
        const done = new Set(state.moduleProgress[moduleId] ?? []);
        const mainCount = mainLessonCount(moduleId);
        for (let i = 0; i < mainCount; i++) if (!done.has(i)) return i;
        // Every main quest is done — the real-life sub-quest (always the module's last
        // lesson) is next, unless it's already finished too, in which case nothing's left.
        return state.completedLifeTaskIds.includes(moduleId) ? -1 : mainCount;
      },
      moduleTotal,
      moduleMastered: (moduleId) => isModuleMastered(state.moduleProgress, state.completedLifeTaskIds, moduleId),
      moduleStatus: (moduleId) => (isModuleMastered(state.moduleProgress, state.completedLifeTaskIds, moduleId) ? 'done' : 'active'),
      achievements: () => {
        const met = new Set(computeMetAchievementIds(state));
        return ACHIEVEMENTS.map((a) => ({ ...a, earned: met.has(a.id) }));
      },

      buyOrEquipItem: (itemId) => {
        const item = shopItemsReal.find((i) => i.id === itemId);
        if (!item || item.slot || item.isMysteryBox) return false;
        // Read/write against liveState.current (not the `state` closure) so two rapid
        // calls in the same tick see each other's effect immediately — see liveState's
        // definition above for why.
        const s = liveState.current;
        const owned = s.ownedItems.includes(itemId);
        const equipped = s.equippedItems.includes(itemId);
        const isDiamond = item.currency === 'diamond';

        if (equipped) {
          const next = { ...s, equippedItems: s.equippedItems.filter((id) => id !== itemId) };
          liveState.current = next;
          setState(next);
          return true;
        }
        if (owned) {
          if (s.equippedItems.length >= MAX_EQUIPPED_ITEMS) return false;
          const next = { ...s, equippedItems: [...s.equippedItems, itemId] };
          liveState.current = next;
          setState(next);
          return true;
        }
        const balance = isDiamond ? s.diamonds : s.coins;
        if (balance < item.price) return false;
        const equippedItems = s.equippedItems.length < MAX_EQUIPPED_ITEMS ? [...s.equippedItems, itemId] : s.equippedItems;
        const next = {
          ...s,
          coins: isDiamond ? s.coins : s.coins - item.price,
          diamonds: isDiamond ? s.diamonds - item.price : s.diamonds,
          ownedItems: [...s.ownedItems, itemId],
          equippedItems,
        };
        liveState.current = next;
        setState(next);
        return true;
      },

      toggleRoomSlot: (itemId) => {
        const item = shopItemsReal.find((i) => i.id === itemId);
        if (!item || !item.slot) return false;
        const slot = item.slot;
        // Read/write against liveState.current (not the `state` closure) — see liveState's
        // definition above for why (same rapid-double-call race as buyOrEquipItem).
        const s = liveState.current;
        const owned = s.ownedRoomItems.includes(itemId);
        // Slot-agnostic on purpose, unlike a plain `state.equippedRoom[slot] === itemId`
        // check: 'lamp_fairy' (Fairy Lights) lives under slot 'lamp' in the WEBSITE's own
        // catalog but was reassigned to mobile's own 'garland' slot (the website has no
        // garland concept at all). A web sync writes that item's equip value under the key
        // the WEBSITE thinks it belongs to ('lamp'), and normalizeRoom (webState.ts) copies
        // equippedRoom key-for-key, so the id can end up parked under the stale 'lamp' key
        // on mobile. `isEquipped` (slot-agnostic, checks every value) then reports it as
        // equipped, but a slot-scoped check here would look at 'garland', find nothing, and
        // "equip" it there too instead of ever clearing it — the button re-equips on every
        // tap and can never reach the unequipped state. Checking/clearing every slot the id
        // is actually sitting in fixes that regardless of which key it landed under.
        const equippedHere = Object.values(s.equippedRoom).includes(itemId);
        const isDiamond = item.currency === 'diamond';
        const clearItem = (room: typeof s.equippedRoom) =>
          Object.fromEntries(Object.entries(room).map(([k, v]) => [k, v === itemId ? null : v])) as typeof s.equippedRoom;

        if (equippedHere) {
          const next = applyAndReport(s, { ...s, equippedRoom: clearItem(s.equippedRoom) }, setNewAchievementIds);
          liveState.current = next;
          setState(next);
          return true;
        }
        if (owned) {
          const next = applyAndReport(s, { ...s, equippedRoom: { ...clearItem(s.equippedRoom), [slot]: itemId } }, setNewAchievementIds);
          liveState.current = next;
          setState(next);
          return true;
        }
        const balance = isDiamond ? s.diamonds : s.coins;
        if (balance < item.price) return false;
        const next = applyAndReport(s, {
          ...s,
          coins: isDiamond ? s.coins : s.coins - item.price,
          diamonds: isDiamond ? s.diamonds - item.price : s.diamonds,
          ownedRoomItems: [...s.ownedRoomItems, itemId],
          equippedRoom: { ...clearItem(s.equippedRoom), [slot]: itemId },
        }, setNewAchievementIds);
        liveState.current = next;
        setState(next);
        return true;
      },

      openMysteryBox: (itemId) => {
        const item = shopItemsReal.find((i) => i.id === itemId);
        if (!item || !item.isMysteryBox || !item.mysteryPool) return null;
        // Read/write against liveState.current (not the `state` closure) — see liveState's
        // definition above for why. This matters especially here: without it, two rapid
        // taps could both compute `isDuplicate` off the same pre-mutation ownedItems, so
        // the second pull could be misreported as new (or a genuine duplicate could dodge
        // its refund) instead of correctly seeing what the first tap just granted.
        const s = liveState.current;
        const balance = item.currency === 'diamond' ? s.diamonds : s.coins;
        if (balance < item.price) return null;
        if (!mysteryPoolUnowned(item.mysteryPool, s.ownedItems).length) return null;
        const won = pickMysteryItem(item.mysteryPool, s.ownedItems);
        if (!won) return null;

        const isDuplicate = s.ownedItems.includes(won.id);
        const refundAmount = isDuplicate ? Math.floor(item.price * MYSTERY_DUPLICATE_REFUND_RATE) : 0;
        const refundCurrency: 'coin' | 'diamond' = item.currency === 'diamond' ? 'diamond' : 'coin';
        const isDiamond = item.currency === 'diamond';

        const spent = isDiamond
          ? { diamonds: s.diamonds - item.price + (isDuplicate ? refundAmount : 0) }
          : { coins: s.coins - item.price + (isDuplicate ? refundAmount : 0) };
        const next = {
          ...s,
          ...spent,
          ownedItems: isDuplicate ? s.ownedItems : [...s.ownedItems, won.id],
        };
        liveState.current = next;
        setState(next);

        return { item: won, isDuplicate, refundAmount, refundCurrency };
      },

      completeLesson: (moduleId, lessonIndex, xpEarned, opts) => {
        const { correctCount = 0, gradedTotal = 0, questId, bossWon, hintsUsed, newTerms } = opts ?? {};
        // Ported verbatim from finishQuest: coins = correct answers * 8 (or a flat 8 if
        // nothing in the quest was gradeable) — diamonds never come from a lesson finish.
        const coinsEarned = gradedTotal > 0 ? correctCount * QUEST_COIN_PER_CORRECT : QUEST_COIN_FLAT_FALLBACK;
        // Computed once here (against liveState.current, not just inside the setState
        // updater below) so the return value can tell results.tsx the REAL amount just
        // applied, not the theoretical full reward — this is only ever invoked once per
        // lesson finish (results.tsx guards it with a `recorded` ref), so there's no race
        // between this read and the updater's own use of the same value.
        const alreadyDone = (liveState.current.moduleProgress[moduleId] ?? []).includes(lessonIndex);
        const advanced = lessonIndex >= 0 && lessonIndex < mainLessonCount(moduleId) && !alreadyDone;

        setState((s) => {
          const wasMastered = isModuleMastered(s.moduleProgress, s.completedLifeTaskIds, moduleId);
          const completed = s.moduleProgress[moduleId] ?? [];
          const nextProgress = advanced
            ? { ...s.moduleProgress, [moduleId]: [...completed, lessonIndex].sort((a, b) => a - b) }
            : s.moduleProgress;
          let next: AppState = {
            ...s,
            // Gated behind `advanced` same as coins right below — previously xp was added
            // unconditionally, so replaying an already-completed lesson (nothing stops a
            // done lesson from being tapped again, see ModuleLessonList) paid full XP every
            // single time with no cap, an unlimited farm. Coins were already correctly
            // gated; xp wasn't. Mirrors completeLifeTask's identical `firstTime` gate below.
            xp: s.xp + (advanced ? xpEarned : 0),
            coins: s.coins + (advanced ? coinsEarned : 0),
            moduleProgress: nextProgress,
            moduleStats: advanced
              ? accumulateModuleStats(s.moduleStats, moduleId, xpEarned, correctCount, gradedTotal)
              : s.moduleStats,
            lastModuleActivityDate: new Date().toDateString(),
            questBossesWon: bossWon && !s.questBossesWon.includes(moduleId)
              ? [...s.questBossesWon, moduleId] : s.questBossesWon,
            questHintsUsed: advanced && questId && hintsUsed !== undefined
              ? { ...s.questHintsUsed, [`${moduleId}::${questId}`]: hintsUsed } : s.questHintsUsed,
            termsLearned: newTerms?.length
              ? [...new Set([...s.termsLearned, ...newTerms])] : s.termsLearned,
          };
          next = applyAndReport(s, next, setNewAchievementIds);

          // Life events: a guaranteed module-unlock event takes priority over an ambient
          // roll — but never overwrite an already-pending, unresolved event. Mirrors
          // rollAmbientLifeEvent's identical guard (`if (state.pendingLifeEventId) return
          // false;`). Without this, finishing a second lesson before the first one's
          // queued event was ever shown/resolved (e.g. two completions in quick
          // succession) silently discarded the first event — its coin payout never
          // applied, and since it's already recorded in shownLifeEventIds it could never
          // be re-offered either.
          if (!next.pendingLifeEventId) {
            const justMastered = !wasMastered && isModuleMastered(next.moduleProgress, next.completedLifeTaskIds, moduleId);
            const unlockEvent = justMastered ? LIFE_EVENT_UNLOCKS[moduleId] : undefined;
            if (unlockEvent && !next.shownLifeEventIds.includes(unlockEvent.id)) {
              next = { ...next, pendingLifeEventId: unlockEvent.id, shownLifeEventIds: [...next.shownLifeEventIds, unlockEvent.id] };
            } else if (next.lifeEventCooldown > 0) {
              next = { ...next, lifeEventCooldown: next.lifeEventCooldown - 1 };
            } else if (Math.random() < LIFE_EVENT_CHANCE) {
              const pick = LIFE_EVENTS[Math.floor(Math.random() * LIFE_EVENTS.length)];
              next = { ...next, pendingLifeEventId: pick.id, lifeEventCooldown: LIFE_EVENT_COOLDOWN_SESSIONS };
            }
          }
          liveState.current = next;
          return next;
        });
        return { xpAwarded: advanced ? xpEarned : 0, coinsAwarded: advanced ? coinsEarned : 0 };
      },

      completeLifeTask: (moduleId, xpEarned, opts) => {
        const { correctCount = 0, gradedTotal = 0, questId, hintsUsed, newTerms } = opts ?? {};
        const coinsEarned = gradedTotal > 0 ? correctCount * QUEST_COIN_PER_CORRECT : QUEST_COIN_FLAT_FALLBACK;
        // See completeLesson's identical comment above: computed once here (against
        // liveState.current) so the return value reflects the REAL amount just applied,
        // not the theoretical full reward on a replay that (correctly) adds nothing.
        const firstTime = !liveState.current.completedLifeTaskIds.includes(moduleId);

        setState((s) => {
          // Now that the real-life sub-quest is a required 9th lesson, finishing it can
          // itself be what pushes a module from not-mastered to mastered — same check
          // completeLesson does, just keyed off completedLifeTaskIds instead of moduleProgress.
          const wasMastered = isModuleMastered(s.moduleProgress, s.completedLifeTaskIds, moduleId);
          let next: AppState = {
            ...s,
            xp: s.xp + (firstTime ? xpEarned : 0),
            coins: s.coins + (firstTime ? coinsEarned : 0),
            moduleStats: firstTime
              ? accumulateModuleStats(s.moduleStats, moduleId, xpEarned, correctCount, gradedTotal)
              : s.moduleStats,
            completedLifeTaskIds: firstTime ? [...s.completedLifeTaskIds, moduleId] : s.completedLifeTaskIds,
            lastModuleActivityDate: new Date().toDateString(),
            questHintsUsed: firstTime && questId && hintsUsed !== undefined
              ? { ...s.questHintsUsed, [`${moduleId}::${questId}`]: hintsUsed } : s.questHintsUsed,
            termsLearned: newTerms?.length
              ? [...new Set([...s.termsLearned, ...newTerms])] : s.termsLearned,
          };
          next = applyAndReport(s, next, setNewAchievementIds);

          // Life events: a guaranteed module-unlock event takes priority over an ambient
          // roll — mirrors completeLesson's identical block, including the
          // never-overwrite-a-pending-event guard (see its comment there).
          if (!next.pendingLifeEventId) {
            const justMastered = !wasMastered && isModuleMastered(next.moduleProgress, next.completedLifeTaskIds, moduleId);
            const unlockEvent = justMastered ? LIFE_EVENT_UNLOCKS[moduleId] : undefined;
            if (unlockEvent && !next.shownLifeEventIds.includes(unlockEvent.id)) {
              next = { ...next, pendingLifeEventId: unlockEvent.id, shownLifeEventIds: [...next.shownLifeEventIds, unlockEvent.id] };
            } else if (next.lifeEventCooldown > 0) {
              next = { ...next, lifeEventCooldown: next.lifeEventCooldown - 1 };
            } else if (Math.random() < LIFE_EVENT_CHANCE) {
              const pick = LIFE_EVENTS[Math.floor(Math.random() * LIFE_EVENTS.length)];
              next = { ...next, pendingLifeEventId: pick.id, lifeEventCooldown: LIFE_EVENT_COOLDOWN_SESSIONS };
            }
          }
          liveState.current = next;
          return next;
        });
        return { xpAwarded: firstTime ? xpEarned : 0, coinsAwarded: firstTime ? coinsEarned : 0 };
      },

      pendingLifeEvent: () => findLifeEvent(state.pendingLifeEventId),

      resolveLifeEvent: (choiceId) => {
        const event = findLifeEvent(state.pendingLifeEventId);
        const choice = event?.choices.find((c) => c.id === choiceId);
        setState((s) => ({
          ...s,
          coins: s.coins + (choice?.coinDelta ?? 0),
          pendingLifeEventId: null,
        }));
      },

      rollAmbientLifeEvent: () => {
        if (state.pendingLifeEventId) return false;
        if (state.lifeEventCooldown > 0) {
          setState((s) => ({ ...s, lifeEventCooldown: s.lifeEventCooldown - 1 }));
          return false;
        }
        if (Math.random() >= LIFE_EVENT_CHANCE) return false;
        const pick = LIFE_EVENTS[Math.floor(Math.random() * LIFE_EVENTS.length)];
        setState((s) => ({ ...s, pendingLifeEventId: pick.id, lifeEventCooldown: LIFE_EVENT_COOLDOWN_SESSIONS }));
        return true;
      },

      dailyLoginBanner,
      dismissDailyLoginBanner: () => setDailyLoginBanner(null),
      claimDailyLoginBonus: () => {
        const today = new Date().toDateString();
        const alreadyClaimed = hasClaimedToday(state);
        const coins = alreadyClaimed ? 0 : DAILY_LOGIN_COINS;
        const diamonds = pendingStreakDiamonds;
        if (coins === 0 && diamonds === 0) return;
        setPendingStreakDiamonds(0);
        setState((s) =>
          applyAchievementUnlocks({
            ...s,
            coins: s.coins + coins,
            dailyLoginLog: alreadyClaimed ? s.dailyLoginLog : { ...s.dailyLoginLog, [today]: coins },
          }),
        );
        setDailyLoginBanner({ streak: state.streak, loginCoins: coins, streakDiamonds: diamonds });
      },
      setOnboardingTrack: (trackId) => setState((s) => ({ ...s, onboardingTrackId: trackId })),
      markOnboardingTourSeen: () => setState((s) => (s.hasSeenOnboardingTour ? s : { ...s, hasSeenOnboardingTour: true })),
      setBudgetPlan: (next) => setState((s) => ({
        ...s, budgetPlan: typeof next === 'function' ? next(s.budgetPlan) : next,
      })),
      newAchievements: () => ACHIEVEMENTS.filter((a) => newAchievementIds.includes(a.id)).map((a) => ({ ...a, earned: true })),
      dismissNewAchievements: () => setNewAchievementIds([]),
      resetProgress: () => {
        AsyncStorage.removeItem(STORAGE_KEY);
        // Stamped fresh so the ordinary debounced SupabaseSync push that follows this
        // setState (see SupabaseSync.tsx) marks the uploaded row as a real reset, not just
        // another low-numbers snapshot — otherwise the website's applyRemoteState (and this
        // same function on a second device) would union/max-merge it against their own
        // still-cached pre-reset progress and silently resurrect it.
        setState({ ...DEFAULT_STATE, resetToken: Date.now() });
        setDailyLoginBanner(null);
        setNewAchievementIds([]);
      },
      resetForAccountSwitch: () => {
        // Same daily bookkeeping the initial load runs, but against pristine defaults —
        // the discarded snapshot belonged to a different account.
        const { next, streakDiamondsEarned } = runDailyCheck(DEFAULT_STATE);
        setState(next);
        setDailyLoginBanner(null);
        setNewAchievementIds([]);
        setPendingStreakDiamonds(streakDiamondsEarned);
        return next;
      },
      // Merge the remote snapshot, then re-run the once-per-day check against the merged
      // result — otherwise a stale cloud streak/lastPlayedDate (from before today's local
      // increment) clobbers the increment we just computed on local load.
      // Coins/diamonds/xp are floored at whichever side is ahead (not just remote's
      // value) — the remote read is a snapshot fetched at sign-in time, which can resolve
      // AFTER a same-session action (e.g. tapping to collect the streak reward) has already
      // moved these forward locally. Blindly taking `partial`'s numbers would silently wipe
      // out that fresh local gain the moment the network response lands — this was reported
      // as "logs in and collects the streak reward, but coins/diamonds don't update": the
      // claim's setState really did land, then this hydrate clobbered it a moment later.
      hydrateFromRemote: (partial) => {
        // A newer resetToken means "Reset all progress" was pushed from this account (web's
        // Settings button, or this same function on another device) since we last synced.
        // That must win completely and skip every union/max merge below — those exist to
        // keep a stale remote read from undoing recent LOCAL progress, but a real reset is
        // the opposite: remote's near-empty state is correct, and local's still-cached
        // pre-reset numbers are what's stale. Merging them in here would silently
        // resurrect everything the reset just wiped, then re-upload it on the next
        // debounced push, undoing the reset. Reset to full DEFAULT_STATE (not just
        // `...state, ...partial`) so mobile-only fields the web reset has no concept of
        // (lifeEventCooldown, questHintsUsed, …) are wiped too, not left stale.
        if ((partial.resetToken ?? 0) > state.resetToken) {
          const { next, streakDiamondsEarned } = runDailyCheck({ ...DEFAULT_STATE, ...partial });
          setState(next);
          if (streakDiamondsEarned > 0) setPendingStreakDiamonds((p) => p + streakDiamondsEarned);
          return;
        }
        // Same race as coins/diamonds/xp below, but for streak/lastPlayedDate/unlocked
        // achievements: a stale remote row (Supabase upsert hasn't landed yet) must not
        // un-advance today's already-computed streak, or applyAchievementUnlocks below
        // would see a just-unlocked, just-rewarded achievement as "newly met" again and
        // pay its coin/diamond reward a second time. Mirrors web's applyRemoteState guard
        // (app.js) exactly — keep whichever side has the more recent lastPlayedDate.
        const localIsNewer = !!state.lastPlayedDate &&
          new Date(state.lastPlayedDate) >= new Date(partial.lastPlayedDate || 0);
        const lastPlayedDate = localIsNewer ? state.lastPlayedDate : (partial.lastPlayedDate ?? state.lastPlayedDate);
        const streak = localIsNewer
          ? Math.max(state.streak, partial.streak ?? 0)
          : (partial.streak ?? state.streak);
        const merged: AppState = {
          ...state,
          ...partial,
          // Defensive: a remote snapshot written by an older client may still carry the
          // legacy numeric-count format — normalize either way. Unioned (not replaced) with
          // local for the same reason as ownedItems/ownedRoomItems below: a stale remote
          // read (the debounced upload can still be in flight when the page reloads) must
          // never erase a lesson finished locally moments before the reload.
          moduleProgress: partial.moduleProgress
            ? unionModuleProgress(state.moduleProgress, normalizeModuleProgress(partial.moduleProgress))
            : state.moduleProgress,
          coins: Math.max(state.coins, partial.coins ?? state.coins),
          diamonds: Math.max(state.diamonds, partial.diamonds ?? state.diamonds),
          xp: Math.max(state.xp, partial.xp ?? state.xp),
          lastPlayedDate,
          streak,
          // See sanitizeBudgetPlan's comment above — this plain `...partial` spread would
          // otherwise carry a negative income/expense/savings-goal straight through unclamped.
          budgetPlan: partial.budgetPlan ? sanitizeBudgetPlan(partial.budgetPlan) : state.budgetPlan,
          // Union, not overwrite: an achievement unlocked (and rewarded) locally this
          // session must never be "forgotten" by a stale remote read — that would make
          // applyAchievementUnlocks pay its reward out a second time below.
          unlockedAchievementIds: Array.from(new Set([
            ...state.unlockedAchievementIds,
            ...(partial.unlockedAchievementIds ?? []),
          ])),
          // Same race the comment above describes: a stale remote snapshot resolving after
          // this device already finished/skipped the tour this session would otherwise flip
          // it back to false and show the tour again next launch. Once seen locally, it
          // stays seen no matter what a stale remote read says.
          hasSeenOnboardingTour: state.hasSeenOnboardingTour || !!partial.hasSeenOnboardingTour,
          // Below: the same "stale remote must never regress local" reasoning as coins/
          // diamonds/xp above, extended to fields that previously had no protection at all
          // (plain `...partial` above overwrote them wholesale) — this was reported as
          // buying/placing room decor, or finishing a lesson, then losing it on next reload:
          // the debounced Supabase upload (1.5s) hadn't landed before the page reloaded, so
          // the remote row this sign-in read back was one step behind, and blindly taking
          // its ownedItems/ownedRoomItems/questBossesWon erased the not-yet-synced local gain.
          ownedItems: Array.from(new Set([...state.ownedItems, ...(partial.ownedItems ?? [])])),
          ownedRoomItems: Array.from(new Set([...state.ownedRoomItems, ...(partial.ownedRoomItems ?? [])])),
          questBossesWon: Array.from(new Set([...state.questBossesWon, ...(partial.questBossesWon ?? [])])),
          // Previously: prefer local whenever it had anything equipped at all, only taking
          // remote's equip state on a genuinely fresh install. That was meant to guard the
          // same narrow race as ownedItems above (an equip made seconds before an abrupt
          // kill, before the debounced upload landed) — but since hydrateFromRemote only
          // ever runs ONCE per sign-in, before this session has made any local change, "local
          // has something equipped" is true on basically every real device forever after its
          // first equip, not just in that narrow window. In practice this meant mobile could
          // never pick up a room/wardrobe change made on the website (or another device) —
          // reported as "I equip something on web, open the phone, and it still shows the old
          // room." Trusting remote here (it always includes a full equippedRoom/equippedItems
          // once a row exists — see webToMobile) fixes that; the only remaining risk is losing
          // an equip made in the last ~1.5s before an abrupt app kill, a much narrower and
          // rarer case than "cross-device sync never worked."
          equippedItems: partial.equippedItems ?? state.equippedItems,
          equippedRoom: partial.equippedRoom ?? state.equippedRoom,
          // Coin drip is once-per-calendar-day keyed by date, so merging (not overwriting)
          // can only add a day either side is missing, never erase one either side already has.
          dailyLoginLog: { ...(partial.dailyLoginLog ?? {}), ...state.dailyLoginLog },
          // Keep the higher token regardless of which side's `...partial`/`...state` spread
          // above landed last, so a later hydrate can still tell a genuine reset apart from
          // an ordinary stale read (see the resetToken check at the top of this function).
          resetToken: Math.max(state.resetToken, partial.resetToken ?? 0),
        };
        const { next, streakDiamondsEarned } = runDailyCheck(merged);
        setState(next);
        if (streakDiamondsEarned > 0) setPendingStreakDiamonds((p) => p + streakDiamondsEarned);
      },
      debugSimulateNewDay: () => {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const { next, streakDiamondsEarned } = runDailyCheck({ ...state, lastPlayedDate: yesterday });
        setState(next);
        if (streakDiamondsEarned > 0) setPendingStreakDiamonds((p) => p + streakDiamondsEarned);
      },
      devOwnEverything: () => {
        const wearableIds = shopItemsReal
          .filter((i) => (i.category === 'hat' || i.category === 'accessory' || i.category === 'exclusive') && !i.isMysteryBox)
          .map((i) => i.id);
        const roomIds = shopItemsReal.filter((i) => i.category === 'room' && i.slot).map((i) => i.id);
        setState((s) => ({
          ...s,
          ownedItems: Array.from(new Set([...s.ownedItems, ...wearableIds])),
          ownedRoomItems: Array.from(new Set([...s.ownedRoomItems, ...roomIds])),
        }));
      },

      devAddCoins: (amount) => {
        setState((s) => ({ ...s, coins: s.coins + amount }));
      },
    };
  }, [state, hydrated, dailyLoginBanner, newAchievementIds, pendingStreakDiamonds]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
