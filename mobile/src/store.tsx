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

/** STREAK_DIAMOND_INTERVAL/REWARD and DAILY_LOGIN_BASE/STEP/CAP_COINS ported verbatim from
 * app.js (updateStreak / claimDailyLoginBonus) — a once-per-calendar-day streak+diamond
 * bonus, plus a separate escalating daily-login coin drip keyed by distinct days logged. */
const STREAK_DIAMOND_INTERVAL = 3;
const STREAK_DIAMOND_REWARD = 5;
const DAILY_LOGIN_BASE_COINS = 10;
const DAILY_LOGIN_STEP_COINS = 2;
const DAILY_LOGIN_CAP_COINS = 20;
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const RARITY_WEIGHT: Record<string, number> = { common: 8, rare: 4, epic: 2, legendary: 1 };

/** LEVEL_THRESHOLDS ported verbatim from app.js — xp needed to REACH each level (index = level). */
const LEVEL_THRESHOLDS = [0, 90, 200, 330, 480, 660, 880, 1150, 1450, 1800, 2200];

function xpForLevel(l: number) {
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

export type AppState = {
  coins: number;
  diamonds: number;
  xp: number;
  streak: number;
  ownedItems: string[];
  ownedRoomItems: string[];
  equippedItems: string[];
  equippedRoom: Record<RoomSlot, string | null>;
  /** Lessons completed per module id — the real source of truth for module progress,
   * replacing the old static mock done/quests fields. */
  moduleProgress: Record<string, number>;
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
};

const DEFAULT_STATE: AppState = {
  coins: 340,
  diamonds: 8,
  xp: 1240,
  streak: 12,
  ownedItems: ['crown', 'sunglasses'],
  ownedRoomItems: [],
  equippedItems: ['crown', 'sunglasses'],
  equippedRoom: { wallpaper: null, wall: null, rug: null, plant: null, bed: null, desk: null, lamp: null, window: null },
  // Seeded to match Maya's original mock story (some modules done, some in progress).
  moduleProgress: {
    earning: 6, spending: 5, saving: 2, investing: 0, credit: 1, risk: 0,
    loans: 0, taxes: 6, psychology: 0, career: 7, scams: 0,
  },
  unlockedAchievementIds: [],
  shownLifeEventIds: [],
  pendingLifeEventId: null,
  lifeEventCooldown: 0,
  // Seeded to "today" so a fresh install shows Maya's established streak as-is; real
  // day-to-day tracking (increment/reset/daily coin drip) begins from the next real day.
  lastPlayedDate: new Date().toDateString(),
  dailyLoginLog: {},
  onboardingTrackId: null,
  questBossesWon: [],
  questHintsUsed: {},
  termsLearned: [],
  lastModuleActivityDate: null,
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

function mysteryPoolUnowned(poolKey: string, ownedItems: string[]) {
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

function moduleTotal(moduleId: string) {
  return moduleContentById(moduleId)?.lessons.length ?? 0;
}

function isModuleMastered(moduleProgress: Record<string, number>, moduleId: string) {
  const total = moduleTotal(moduleId);
  return total > 0 && (moduleProgress[moduleId] ?? 0) >= total;
}

function masteredCount(moduleProgress: Record<string, number>) {
  return ALL_MODULE_IDS.filter((id) => isModuleMastered(moduleProgress, id)).length;
}

/** Which achievements are met right now, given the subset of app.js's ACHIEVEMENTS checks
 * that the mobile app can actually evaluate today (see Achievement.available). */
function computeMetAchievementIds(s: AppState): string[] {
  const met = new Set<string>();
  for (const [moduleId, achievementId] of Object.entries(MODULE_MASTERY_ACHIEVEMENT)) {
    if (isModuleMastered(s.moduleProgress, moduleId)) met.add(achievementId);
  }
  if (s.streak >= 7) met.add('on_fire');
  if (s.streak >= 30) met.add('marathoner');
  const roomFull = ROOM_SLOTS.every((slot) => !!s.equippedRoom[slot]);
  if (roomFull) met.add('homebody');
  if (masteredCount(s.moduleProgress) === ALL_MODULE_IDS.length) met.add('stackd_star');
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
  level: number;
  tierName: string;
  isOwned: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  equippedRoomItems: () => ShopItemReal[];
  equippedMascotItems: () => ShopItemReal[];
  moduleDone: (moduleId: string) => number;
  moduleTotal: (moduleId: string) => number;
  moduleMastered: (moduleId: string) => boolean;
  /** 'locked' if below unlockLevel (mobile's own level-gating), else 'done' once every
   * lesson is complete, else 'active'. */
  moduleStatus: (moduleId: string, unlockLevel?: number) => 'done' | 'active' | 'locked';
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
  pendingLifeEvent: () => LifeEvent | null;
  /** Applies a choice's coinDelta (if any), records the event as shown, and clears pending. */
  resolveLifeEvent: (choiceId: string) => void;
  /** Set once per calendar day when the streak/daily-login check awards something worth
   * telling the player about; null once dismissed. */
  dailyLoginBanner: { streak: number; loginCoins: number; streakDiamonds: number } | null;
  dismissDailyLoginBanner: () => void;
  setOnboardingTrack: (trackId: string) => void;
  /** Achievements newly unlocked since the last dismissal — drives the global unlock toast. */
  newAchievements: () => AchievementView[];
  dismissNewAchievements: () => void;
  /** Ported from the website's Settings reset button: wipes local state back to defaults. */
  resetProgress: () => void;
  /** Merge a remote (cloud-synced) snapshot into local state — used by SupabaseSync after
   * translating the web's user_progress blob into mobile's AppState. */
  hydrateFromRemote: (partial: Partial<AppState>) => void;
};

const StoreContext = createContext<Ctx | null>(null);

type DailyLoginBanner = { streak: number; loginCoins: number; streakDiamonds: number } | null;

/** Ported from app.js's updateStreak + claimDailyLoginBonus, combined into one once-per-day
 * check. No-ops (returns the same state, null banner) if today was already checked. */
function runDailyCheck(s: AppState): { next: AppState; banner: DailyLoginBanner } {
  const today = new Date().toDateString();
  if (s.lastPlayedDate === today) return { next: s, banner: null };

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const streak = s.lastPlayedDate === yesterday ? s.streak + 1 : 1;
  const streakDiamonds = streak % STREAK_DIAMOND_INTERVAL === 0 ? STREAK_DIAMOND_REWARD : 0;

  const dayNumber = Object.keys(s.dailyLoginLog).length + 1;
  const loginCoins = Math.min(DAILY_LOGIN_BASE_COINS + DAILY_LOGIN_STEP_COINS * (dayNumber - 1), DAILY_LOGIN_CAP_COINS);

  const next: AppState = {
    ...s,
    streak,
    lastPlayedDate: today,
    diamonds: s.diamonds + streakDiamonds,
    coins: s.coins + loginCoins,
    dailyLoginLog: { ...s.dailyLoginLog, [today]: loginCoins },
  };
  return { next: applyAchievementUnlocks(next), banner: { streak, loginCoins, streakDiamonds } };
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
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let loadedState = DEFAULT_STATE;
      if (raw) {
        try {
          loadedState = { ...DEFAULT_STATE, ...JSON.parse(raw) };
        } catch {
          // corrupt/incompatible saved state — fall back to defaults already set
        }
      }
      const { next, banner } = runDailyCheck(loadedState);
      setState(next);
      if (banner) setDailyLoginBanner(banner);
      loaded.current = true;
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
    const tierName = tierForMasteredCount(masteredCount(state.moduleProgress));

    return {
      state,
      level,
      tierName,
      isOwned,
      isEquipped,
      equippedRoomItems: () =>
        ROOM_SLOTS.map((slot) => state.equippedRoom[slot]).filter((id): id is string => !!id)
          .map((id) => shopItemsReal.find((i) => i.id === id))
          .filter((i): i is ShopItemReal => !!i),
      equippedMascotItems: () =>
        state.equippedItems.map((id) => shopItemsReal.find((i) => i.id === id)).filter((i): i is ShopItemReal => !!i),
      moduleDone: (moduleId) => Math.min(state.moduleProgress[moduleId] ?? 0, moduleTotal(moduleId)),
      moduleTotal,
      moduleMastered: (moduleId) => isModuleMastered(state.moduleProgress, moduleId),
      moduleStatus: (moduleId, unlockLevel) => {
        if (unlockLevel && level < unlockLevel) return 'locked';
        return isModuleMastered(state.moduleProgress, moduleId) ? 'done' : 'active';
      },
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
          const wasMastered = isModuleMastered(s.moduleProgress, moduleId);
          const current = s.moduleProgress[moduleId] ?? 0;
          const total = moduleTotal(moduleId);
          const advanced = lessonIndex + 1 > current;
          const nextProgress = advanced
            ? { ...s.moduleProgress, [moduleId]: Math.min(lessonIndex + 1, total) }
            : s.moduleProgress;
          let next: AppState = {
            ...s,
            xp: s.xp + xpEarned,
            coins: s.coins + (advanced ? coinsEarned : 0),
            moduleProgress: nextProgress,
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
          const justMastered = !wasMastered && isModuleMastered(next.moduleProgress, moduleId);
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

      dailyLoginBanner,
      dismissDailyLoginBanner: () => setDailyLoginBanner(null),
      setOnboardingTrack: (trackId) => setState((s) => ({ ...s, onboardingTrackId: trackId })),
      newAchievements: () => ACHIEVEMENTS.filter((a) => newAchievementIds.includes(a.id)).map((a) => ({ ...a, earned: true })),
      dismissNewAchievements: () => setNewAchievementIds([]),
      resetProgress: () => {
        AsyncStorage.removeItem(STORAGE_KEY);
        setState(DEFAULT_STATE);
        setDailyLoginBanner(null);
        setNewAchievementIds([]);
      },
      hydrateFromRemote: (partial) => setState((s) => ({ ...s, ...partial })),
    };
  }, [state, dailyLoginBanner, newAchievementIds]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
