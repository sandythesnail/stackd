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

const ROOM_SLOTS: RoomSlot[] = ['wallpaper', 'wall', 'rug', 'plant', 'bed', 'desk', 'lamp', 'window'];

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
};

const DEFAULT_STATE: AppState = {
  coins: 0,
  diamonds: 0,
  xp: 0,
  streak: 0,
  ownedItems: [],
  ownedRoomItems: [],
  equippedItems: [],
  equippedRoom: { wallpaper: null, wall: null, rug: null, plant: null, bed: null, desk: null, lamp: null, window: null },
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

/** Which achievements are met right now, given the subset of app.js's ACHIEVEMENTS checks
 * that the mobile app can actually evaluate today (see Achievement.available). */
function computeMetAchievementIds(s: AppState): string[] {
  const met = new Set<string>();
  for (const [moduleId, achievementId] of Object.entries(MODULE_MASTERY_ACHIEVEMENT)) {
    if (isModuleMastered(s.moduleProgress, s.completedLifeTaskIds, moduleId)) met.add(achievementId);
  }
  if (s.streak >= 7) met.add('on_fire');
  if (s.streak >= 30) met.add('marathoner');
  const roomFull = ROOM_SLOTS.every((slot) => !!s.equippedRoom[slot]);
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
  }) => number;
  /** Same reward shape as completeLesson (XP + the real coin formula), but for a module's
   * real-life step-by-step-guide lesson — never touches moduleProgress/mastery, and only
   * pays out once (replaying a finished life task earns nothing further). */
  completeLifeTask: (moduleId: string, xpEarned: number, opts?: {
    correctCount?: number; gradedTotal?: number; questId?: string; hintsUsed?: number; newTerms?: string[];
  }) => number;
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
  const today = new Date().toDateString();
  if (s.lastPlayedDate === today) return { next: s, streakDiamondsEarned: 0 };

  const yesterday = new Date(Date.now() - 86400000).toDateString();
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
        const owned = state.ownedItems.includes(itemId);
        const equipped = state.equippedItems.includes(itemId);
        const isDiamond = item.currency === 'diamond';

        if (equipped) {
          setState((s) => ({ ...s, equippedItems: s.equippedItems.filter((id) => id !== itemId) }));
          return true;
        }
        if (owned) {
          if (state.equippedItems.length >= MAX_EQUIPPED_ITEMS) return false;
          setState((s) => ({ ...s, equippedItems: [...s.equippedItems, itemId] }));
          return true;
        }
        const balance = isDiamond ? state.diamonds : state.coins;
        if (balance < item.price) return false;
        setState((s) => {
          const equippedItems = s.equippedItems.length < MAX_EQUIPPED_ITEMS ? [...s.equippedItems, itemId] : s.equippedItems;
          return {
            ...s,
            coins: isDiamond ? s.coins : s.coins - item.price,
            diamonds: isDiamond ? s.diamonds - item.price : s.diamonds,
            ownedItems: [...s.ownedItems, itemId],
            equippedItems,
          };
        });
        return true;
      },

      toggleRoomSlot: (itemId) => {
        const item = shopItemsReal.find((i) => i.id === itemId);
        if (!item || !item.slot) return false;
        const slot = item.slot;
        const owned = state.ownedRoomItems.includes(itemId);
        const equippedHere = state.equippedRoom[slot] === itemId;
        const isDiamond = item.currency === 'diamond';

        if (equippedHere) {
          setState((s) => applyAndReport(s, { ...s, equippedRoom: { ...s.equippedRoom, [slot]: null } }, setNewAchievementIds));
          return true;
        }
        if (owned) {
          setState((s) => applyAndReport(s, { ...s, equippedRoom: { ...s.equippedRoom, [slot]: itemId } }, setNewAchievementIds));
          return true;
        }
        const balance = isDiamond ? state.diamonds : state.coins;
        if (balance < item.price) return false;
        setState((s) => applyAndReport(s, {
          ...s,
          coins: isDiamond ? s.coins : s.coins - item.price,
          diamonds: isDiamond ? s.diamonds - item.price : s.diamonds,
          ownedRoomItems: [...s.ownedRoomItems, itemId],
          equippedRoom: { ...s.equippedRoom, [slot]: itemId },
        }, setNewAchievementIds));
        return true;
      },

      openMysteryBox: (itemId) => {
        const item = shopItemsReal.find((i) => i.id === itemId);
        if (!item || !item.isMysteryBox || !item.mysteryPool) return null;
        const balance = item.currency === 'diamond' ? state.diamonds : state.coins;
        if (balance < item.price) return null;
        if (!mysteryPoolUnowned(item.mysteryPool, state.ownedItems).length) return null;
        const won = pickMysteryItem(item.mysteryPool, state.ownedItems);
        if (!won) return null;

        const isDuplicate = state.ownedItems.includes(won.id);
        const refundAmount = isDuplicate ? Math.floor(item.price * MYSTERY_DUPLICATE_REFUND_RATE) : 0;
        const refundCurrency: 'coin' | 'diamond' = item.currency === 'diamond' ? 'diamond' : 'coin';
        const isDiamond = item.currency === 'diamond';

        setState((s) => {
          const spent = isDiamond
            ? { diamonds: s.diamonds - item.price + (isDuplicate ? refundAmount : 0) }
            : { coins: s.coins - item.price + (isDuplicate ? refundAmount : 0) };
          return {
            ...s,
            ...spent,
            ownedItems: isDuplicate ? s.ownedItems : [...s.ownedItems, won.id],
          };
        });

        return { item: won, isDuplicate, refundAmount, refundCurrency };
      },

      completeLesson: (moduleId, lessonIndex, xpEarned, opts) => {
        const { correctCount = 0, gradedTotal = 0, questId, bossWon, hintsUsed, newTerms } = opts ?? {};
        // Ported verbatim from finishQuest: coins = correct answers * 8 (or a flat 8 if
        // nothing in the quest was gradeable) — diamonds never come from a lesson finish.
        const coinsEarned = gradedTotal > 0 ? correctCount * QUEST_COIN_PER_CORRECT : QUEST_COIN_FLAT_FALLBACK;

        setState((s) => {
          const wasMastered = isModuleMastered(s.moduleProgress, s.completedLifeTaskIds, moduleId);
          const completed = s.moduleProgress[moduleId] ?? [];
          // Bounded against the 8 main quests, not moduleTotal's 9 — completeLesson only
          // ever tracks main-quest indices here; the real-life sub-quest's completion goes
          // through completeLifeTask/completedLifeTaskIds instead (see moduleDoneCount).
          const advanced = lessonIndex >= 0 && lessonIndex < mainLessonCount(moduleId) && !completed.includes(lessonIndex);
          const nextProgress = advanced
            ? { ...s.moduleProgress, [moduleId]: [...completed, lessonIndex].sort((a, b) => a - b) }
            : s.moduleProgress;
          let next: AppState = {
            ...s,
            xp: s.xp + xpEarned,
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

          // Life events: a guaranteed module-unlock event takes priority over an ambient roll.
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
          return next;
        });
        return coinsEarned;
      },

      completeLifeTask: (moduleId, xpEarned, opts) => {
        const { correctCount = 0, gradedTotal = 0, questId, hintsUsed, newTerms } = opts ?? {};
        const coinsEarned = gradedTotal > 0 ? correctCount * QUEST_COIN_PER_CORRECT : QUEST_COIN_FLAT_FALLBACK;

        setState((s) => {
          const firstTime = !s.completedLifeTaskIds.includes(moduleId);
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

          // Life events: a guaranteed module-unlock event takes priority over an ambient roll
          // — mirrors completeLesson's identical block.
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
          return next;
        });
        return coinsEarned;
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
        setState(DEFAULT_STATE);
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
        const merged: AppState = {
          ...state,
          ...partial,
          // Defensive: a remote snapshot written by an older client may still carry the
          // legacy numeric-count format — normalize either way.
          moduleProgress: partial.moduleProgress
            ? normalizeModuleProgress(partial.moduleProgress)
            : state.moduleProgress,
          coins: Math.max(state.coins, partial.coins ?? state.coins),
          diamonds: Math.max(state.diamonds, partial.diamonds ?? state.diamonds),
          xp: Math.max(state.xp, partial.xp ?? state.xp),
          // Same race the comment above describes: a stale remote snapshot resolving after
          // this device already finished/skipped the tour this session would otherwise flip
          // it back to false and show the tour again next launch. Once seen locally, it
          // stays seen no matter what a stale remote read says.
          hasSeenOnboardingTour: state.hasSeenOnboardingTour || !!partial.hasSeenOnboardingTour,
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
    };
  }, [state, hydrated, dailyLoginBanner, newAchievementIds, pendingStreakDiamonds]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
