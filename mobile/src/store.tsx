import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shopItemsReal, moduleContentById, mainLessonAbsoluteIndices } from '@/content';
import type { RoomSlot, ShopItemReal } from '@/content';
import { ACHIEVEMENTS, EARNABLE_ACHIEVEMENTS, BADGE_TIER_REWARD, MODULE_MASTERY_ACHIEVEMENT, type Achievement } from '@/achievements';
import { LIFE_EVENTS, LIFE_EVENT_UNLOCKS, LIFE_EVENT_CHANCE, LIFE_EVENT_COOLDOWN_SESSIONS, pickAmbientLifeEvent, type LifeEvent } from '@/lifeEvents';
import type { QuestAnalytics } from '@/questReport';
import { dailyRewardCoins, dailyRewardDiamonds, dailyRewardCycleFor, type DailyRewardCycle } from '@/dailyRewards';

const STORAGE_KEY = 'stackd_state_v1';

/** MAX_EQUIPPED_ITEMS, MYSTERY_OWNED_WEIGHT_FACTOR, MYSTERY_DUPLICATE_REFUND_RATE, and
 * RARITY_WEIGHT are ported verbatim from the website's app.js (see handleShopAction,
 * pickMysteryItem, openMysteryBox). */
export const MAX_EQUIPPED_ITEMS = 3;
const MYSTERY_OWNED_WEIGHT_FACTOR = 0.35;
const MYSTERY_DUPLICATE_REFUND_RATE = 0.5;
/** Ported verbatim from finishQuest (app.js): coinsEarned = chapterScore*8 if the quest had
 * any graded chapters, else a flat 8 — and diamondsEarned is always 0 (diamonds only come
 * from streaks/daily-login/achievements, never a quest finish).
 *
 * THE RATE IS THE WEBSITE'S; THE BASIS IS NO LONGER. The website counts a narrower set of
 * chapters than mobile now scores. Mobile pays per correct answer over every graded moment
 * the lesson showed (see questReport.gradedTally) — the same number the results screen puts
 * on screen — because paying on a different basis than the one displayed is what produced a
 * lesson scored "8/10" and paid as though it were 4/5.
 *
 * That widening roughly doubles lesson income: an average lesson goes from ~5.6 graded
 * moments to ~10.5, so at 75% accuracy it pays ~63 coins instead of ~34, and the median
 * 70-coin shop item drops from about two lessons of saving to one. That was a deliberate
 * call (keep score and reward honest, accept the softer grind), not an accident — if the
 * pacing needs winding back, this constant is the single knob: 4 restores roughly the old
 * coins-per-lesson while keeping the payout and the score in agreement. */
export const QUEST_COIN_PER_CORRECT = 4;
export const QUEST_COIN_FLAT_FALLBACK = 4;

/** STREAK_DIAMOND_INTERVAL/REWARD ported verbatim from app.js (updateStreak) — a
 * once-per-calendar-day streak bonus, auto-credited at boot.
 *
 * The click-to-collect COIN drip is no longer app.js's `10 + 2*(n-1)` capped at 20. That
 * formula counted lifetime claimed days and flattened out permanently on the sixth one, so
 * every day after that paid an identical 20 — see @/dailyRewards, which replaces it with a
 * seven-day ladder positioned by `streak` and a small per-week bonus. */
/** Diamonds paid for reaching a level, indexed by the level reached.
 *
 * Starts at 3 for level 2 and climbs by one a level. Deliberately small: diamonds buy the
 * Diamond Exclusives, and the whole point of that shelf is that it takes a while. A full
 * run to level 11 pays 3+4+...+12 = 75, against a 20-diamond mystery box, so levelling is a
 * real second source of diamonds alongside streaks without replacing them.
 *
 * Index 0 and 1 are zero: level 1 is where everyone starts, so nobody "reaches" it. */
const LEVEL_UP_DIAMONDS = [0, 0, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6];
export function levelUpDiamonds(level: number) {
  return LEVEL_UP_DIAMONDS[Math.min(level, LEVEL_UP_DIAMONDS.length - 1)] ?? 0;
}

const STREAK_DIAMOND_INTERVAL = 3;
const STREAK_DIAMOND_REWARD = 5;
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const RARITY_WEIGHT: Record<string, number> = { common: 8, rare: 4, epic: 2, legendary: 1 };

/** XP needed to REACH each level (index = level).
 *
 * No longer app.js's numbers: every threshold is scaled about 1.7x (90 -> 150 for level 2,
 * 2200 -> 3900 for the top), so levelling takes noticeably longer at every stage rather than
 * only at the end. Lesson XP is untouched — the pacing change is entirely here, so a lesson is
 * worth exactly what it was worth and the ladder is simply longer.
 *
 * This deliberately diverges from the website, which still runs the original ladder. The two
 * share progress through user_progress.state (see lib/webState.ts), so the SAME xp total reads
 * as a lower level here than there until the site is changed to match. Levels are derived from
 * xp on read, not stored, so nothing is corrupted by the disagreement — a player just sees two
 * different level numbers for the same work. */
const LEVEL_THRESHOLDS = [0, 150, 340, 570, 840, 1160, 1550, 2020, 2560, 3180, 3900];

/** Highest real level — a player at this level has no "next level" to progress toward.
 * Exported so screens showing "X XP to next level" (progress.tsx) can hide/adjust that
 * copy instead of promising a level (e.g. "Level 12") that doesn't exist and can never be
 * reached. */
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function xpForLevel(l: number) {
  return LEVEL_THRESHOLDS[Math.min(l, LEVEL_THRESHOLDS.length - 1)];
}

/** Credits the level-up reward when an XP award crosses a boundary, and arms the
 * celebration. A no-op when the level did not change, which is almost every lesson.
 *
 * Takes the BEFORE xp and the already-updated next state, because level is derived from
 * total xp rather than stored - there is no level field to compare, so the crossing has to
 * be computed from the two totals. Multi-level jumps pay only the level actually reached;
 * no single lesson is worth two levels at any point on the curve. */
function applyLevelUp(beforeXp: number, next: AppState): AppState {
  const before = levelForXp(beforeXp);
  const after = levelForXp(next.xp);
  if (after <= before) return next;
  const diamonds = levelUpDiamonds(after);
  return { ...next, diamonds: next.diamonds + diamonds, levelUpBanner: { level: after, diamonds } };
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
  // Clamped at both ends. The level is derived from xp, so xp should never sit below its own
  // level's floor — but a remote sync that lowers xp before the level recomputes would make
  // this negative, and it is fed straight into a `width: ${pct}%` on the results screen's
  // level bar, which is not a value a width can take.
  return Math.max(0, Math.min(100, ((xp - base) / (ceil - base)) * 100));
}

/** TIERS ported verbatim from app.js — keyed by count of MASTERED modules (0-11), not level.
 *
 * Exported because that distinction is invisible in the UI otherwise. The header shows a tier
 * name directly under a level number, which reads as "the level earned me this rank" — it
 * didn't, and no screen said what did. Progress now prints this table with its real
 * requirements. */
export const TIERS = [
  { min: 0, max: 2, name: 'Frugal Freshman' },
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
  /** Life events already shown. Guaranteed-unlock ones (LIFE_EVENT_UNLOCKS) live here so each
   * fires exactly once, ever; ambient ones are recorded too so the rotation doesn't repeat
   * itself until the pool is used up. See pickAmbientLifeEvent, which owns that distinction —
   * it resets only the ambient half. */
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
  /** The final assessment, once it has been sat: score out of total, and when.
   *
   * Null until every module is mastered AND the student takes it — the two are separate, so
   * finishing the curriculum doesn't silently count as passing an exam nobody answered. Kept
   * as a single result rather than a history because a post-test is a one-time measure of
   * "what did the whole course leave you with"; retaking is allowed and overwrites, which is
   * the honest thing to record when the questions are drawn from a pool the student has now
   * seen. */
  postTest: { score: number; total: number; takenAt: string } | null;
  /** Set the moment an XP award crosses a level boundary, cleared when the celebration is
   * dismissed. Transient in spirit but stored like dailyLoginBanner, so a level-up earned
   * on the last lesson before the app is closed is still announced when it reopens. */
  levelUpBanner: { level: number; diamonds: number } | null;
  /** Set once the first-run onboarding has been SEEN through to the end, and never unset.
   *
   * onboardingTrackId used to carry this by implication, but it answers a different
   * question: it is the track you chose, so anyone who backed out of the survey, or whose
   * track failed to reach the cloud, read as never having been onboarded and was sent
   * through the whole thing again. This says only "they have seen it", which is the thing
   * the routing actually needs to know. A retake from Settings deliberately does not clear
   * it: retaking is for changing your track, not for watching the intro again. */
  hasCompletedOnboarding: boolean;
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
  /** Module whose lesson was finished most recently. moduleStatus only knows 'done' vs
   * 'active' (nothing is gated, so every unfinished module is equally 'active'), which left
   * the Modules tab with no way to tell which module the player is actually working through
   * — it opened whichever unfinished module came first in the list. Null until the first
   * lesson is finished, and on states saved before this field existed. */
  lastModuleId: string | null;
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
  /** Lessons the player is partway through, keyed `${moduleId}:${lessonIndex}`.
   *
   * Nothing about an unfinished lesson used to be kept — the store only ever recorded one on
   * completion — so leaving chapter 12 of 15 threw away ten minutes and restarted from the
   * beginning. That is a punishment for being interrupted, and it lands hardest on exactly
   * the students this is for, doing a lesson between classes.
   *
   * Saved at CHAPTER granularity: resuming reopens the chapter you were on, from its start.
   * Each chapter view owns its own internal state (which concept a vocab chapter is showing,
   * which question of a Quick Check, which cards are resolved) and none of it is lifted into
   * the player, so mid-chapter resume would mean threading save/restore through all fifteen
   * chapter types. Replaying one chapter's opening beat is re-entry context, not lost work. */
  lessonProgress: Record<string, SavedLessonProgress>;
};

/** One in-flight lesson. Everything here is state the quest player accumulates ACROSS
 * chapters and would otherwise lose — per-chapter internal state is deliberately not
 * included (see AppState.lessonProgress). */
export type SavedLessonProgress = {
  /** Guards against resuming into content that has changed underneath the save. Both are
   * checked on read: a quest whose chapters were edited since would otherwise drop the player
   * into a different chapter than the one they left, with a score tallied from chapters that
   * no longer exist. A mismatch discards the save rather than trying to migrate it. */
  questId: string;
  chapterCount: number;
  /** The chapter to reopen — the one that was on screen, not the one after it. */
  chapterIdx: number;
  xpEarned: number;
  // correctCount/gradedTotal used to live here too. They were the player's own parallel
  // scoring counters, and `analytics` below already holds every graded moment they were
  // counting — the tally is derived from it now (gradedTally), so storing it as well was
  // storing the same answer twice and letting the two disagree. Saves written before this
  // still carry the two fields; they're simply ignored.
  hintsUsed: number;
  bossWon: boolean;
  terms: { term: string; plain: string; section: string }[];
  analytics: QuestAnalytics;
  /** Whether this lesson already spent its one ambient life-event roll. Held here rather than
   * in the player's own ref, which is per-MOUNT: without it, every resume would hand the same
   * lesson a fresh roll and a long lesson resumed twice could fire three popups. */
  ambientFired: boolean;
  /** Epoch ms, for "paused 2 days ago" style copy and for pruning if that's ever wanted. */
  savedAt: number;
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
  postTest: null,
  levelUpBanner: null,
  hasCompletedOnboarding: false,
  questBossesWon: [],
  questHintsUsed: {},
  termsLearned: [],
  lastModuleActivityDate: null,
  lastModuleId: null,
  completedLifeTaskIds: [],
  lessonProgress: {},
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
/** Key for AppState.lessonProgress. A module can have more than one lesson part-finished at
 * once (start one, get pulled away, start another), so this is keyed per lesson rather than
 * keeping a single "the" in-progress lesson. */
function lessonProgressKey(moduleId: string, lessonIndex: number) {
  return `${moduleId}:${lessonIndex}`;
}

/** How many part-finished lessons to keep. Generous — nobody has more than a couple genuinely
 * in flight — but bounded, which is the point. */
const MAX_SAVED_LESSONS = 12;

/** Splits a lessonProgress key back apart. Module ids contain no colon, and the index is
 * always the last segment, so the last separator is the real one. */
function parseLessonProgressKey(key: string): { moduleId: string; lessonIndex: number } | null {
  const at = key.lastIndexOf(':');
  if (at < 1) return null;
  const lessonIndex = Number(key.slice(at + 1));
  if (!Number.isInteger(lessonIndex) || lessonIndex < 0) return null;
  return { moduleId: key.slice(0, at), lessonIndex };
}

/** Drops saves that can never be used again, then caps what's left to the most recent.
 *
 * Nothing collected these. A save is written on every chapter advance and cleared only when
 * the lesson is FINISHED, so every lesson a student starts and wanders away from kept its
 * save forever — and lessonProgressFor merely ignores a save whose quest has been re-authored
 * since, it never removes it, so those became permanently unreachable and permanently stored.
 * Each save carries the lesson's full analytics (every question and check label it recorded):
 * about 3.4KB on average against real content, 5.2KB at worst, and sampling all 99 lessons
 * would bank roughly 330KB. That is written to AsyncStorage on every single state change and
 * uploaded inside `_mobile.lessonProgress` on every debounced Supabase push.
 *
 * Validity first, recency second — an unusable save is dropped however new it is, so a stale
 * entry can never occupy one of the retained slots. */
function pruneLessonProgress(saves: Record<string, SavedLessonProgress>): Record<string, SavedLessonProgress> {
  const usable = Object.entries(saves).filter(([key, save]) => {
    const parsed = parseLessonProgressKey(key);
    if (!parsed) return false;
    // The same validity test lessonProgressFor applies on read — applied here so the answer
    // is acted on rather than just returned.
    const quest = moduleContentById(parsed.moduleId)?.quests[parsed.lessonIndex];
    if (!quest || quest.id !== save.questId || quest.chapters.length !== save.chapterCount) return false;
    return save.chapterIdx >= 0 && save.chapterIdx < quest.chapters.length;
  });
  if (usable.length <= MAX_SAVED_LESSONS) return Object.fromEntries(usable);
  usable.sort((a, b) => (b[1].savedAt ?? 0) - (a[1].savedAt ?? 0));
  return Object.fromEntries(usable.slice(0, MAX_SAVED_LESSONS));
}

/** The main quests' real positions in `lessons`/`quests` — NOT 0..count-1.
 *
 * Everything that stores or navigates to a lesson (moduleProgress, quest.tsx's lessonIndex
 * param, lessonProgress keys) speaks absolute indices, so anything comparing against them has
 * to as well. This used to be a plain COUNT, and the comparisons were `i < mainLessonCount`,
 * which is only equivalent while the real-life sub-quest happens to be a module's last lesson.
 * That's true of all 11 modules today and nothing enforces it (see mainLessonAbsoluteIndices'
 * own note in content/index.ts) — the moment a sub-quest were authored anywhere but last, a
 * count-based check would mark the wrong lesson done and hand back the wrong "next" index. */
function mainIndicesFor(moduleId: string) {
  return mainLessonAbsoluteIndices(moduleContentById(moduleId));
}

/** Where this module's real-life sub-quest sits in `lessons`, or -1 if it has none. Its own
 * completion lives in completedLifeTaskIds, but callers still need the index to open it. */
function lifeTaskIndexFor(moduleId: string) {
  const idx = moduleContentById(moduleId)?.lessons.findIndex((l) => l.isLifeTask) ?? -1;
  return idx;
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
  const main = new Set(mainIndicesFor(moduleId));
  const mainDone = new Set((moduleProgress[moduleId] ?? []).filter((i) => main.has(i))).size;
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
  // EARNABLE_ACHIEVEMENTS, not ACHIEVEMENTS: the full catalog still carries `iron_will` and
  // `excellent_credit`, which are marked available:false because nothing in this file can
  // evaluate them. Requiring them here made "unlock every other badge" impossible to satisfy
  // — grandmaster could never fire, however complete the player's collection was.
  const otherIds = EARNABLE_ACHIEVEMENTS.filter((a) => a.id !== 'grandmaster').map((a) => a.id);
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
  /** True once the cloud read for the signed-in account has finished — see setRemoteSettled.
   * Always false when auth is off, since there is no cloud to consult. */
  remoteSettled: boolean;
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
  /** The saved mid-lesson state for this lesson, or null if there isn't a usable one.
   *
   * Validated on read, not on write: a save is discarded if the quest it belongs to has since
   * been edited (different id, or a different number of chapters), because resuming then would
   * drop the player into a chapter that isn't the one they left, carrying a score tallied from
   * chapters that may no longer exist. Returning null just means the lesson starts fresh. */
  lessonProgressFor: (moduleId: string, lessonIndex: number) => SavedLessonProgress | null;
  /** Writes (or overwrites) the save for one lesson. Called on every chapter advance. */
  saveLessonProgress: (moduleId: string, lessonIndex: number, progress: SavedLessonProgress) => void;
  /** Drops the save — on finishing the lesson, and on an explicit "start over". */
  clearLessonProgress: (moduleId: string, lessonIndex: number) => void;
  pendingLifeEvent: () => LifeEvent | null;
  /** Applies a choice's coinDelta (if any), records the event as shown, and clears pending. */
  resolveLifeEvent: (choiceId: string) => void;
  /** Ambient random life-event roll, ported from the website's maybeTriggerAmbientLifeEvent
   * — checked at ordinary mid-quest "next" transitions (see quest.tsx's onComplete), not
   * just when a whole lesson finishes (completeLesson has its own separate guaranteed-unlock
   * + ambient roll for that). Same cooldown/chance gate as completeLesson's ambient branch.
   * Returns whether an event actually got queued, so the caller knows to pause and wait for
   * it to be dismissed before continuing. Pass the module being played so the scenario can
   * match the topic — see pickAmbientLifeEvent. */
  rollAmbientLifeEvent: (moduleId?: string) => boolean;
  /** Set when a claimed reward is worth telling the player about; null once dismissed. */
  dailyLoginBanner: { streak: number; loginCoins: number; streakDiamonds: number } | null;
  dismissDailyLoginBanner: () => void;
  /** Whether the streak card should show its "come collect" yellow-outline treatment —
   * true if today's login coin drip hasn't been claimed yet, or a streak-diamond milestone
   * was just auto-credited and hasn't been shown to the player yet. */
  loginBonusPending: boolean;
  /** This week of the seven-day reward ladder — which slot today is, what each slot pays,
   * and which of the past ones were actually collected. Drives DailyRewardsModal; computed
   * here rather than in the component so the number the modal shows and the number
   * claimDailyLoginBonus pays can't drift apart. See @/dailyRewards. */
  dailyRewardCycle: DailyRewardCycle;
  /** Claims today's login coin drip (if not already claimed) plus any pending streak-diamond
   * reward, adds them to the player's balance, and pops dailyLoginBanner. Ported from the
   * website's click-to-collect streak card (see hs-streak-card in app.js). */
  claimDailyLoginBonus: () => void;
  /** Credits a referral payout that the SERVER has already authorised and recorded as paid
   * (claim_referral_activation / claim_referrer_rewards — see lib/SupabaseSync.tsx). Purely
   * the local mirror of a decision made in Postgres, so the player's balance reflects it now
   * instead of on the next full reload; it never decides an amount for itself. */
  creditReferralReward: (coins: number, diamonds: number) => void;
  setOnboardingTrack: (trackId: string) => void;
  /** Record a finished final assessment. Overwrites any previous sitting - see AppState. */
  recordPostTest: (score: number, total: number) => void;
  /** Marks first-run onboarding as seen. Idempotent and one-way. */
  markOnboardingComplete: () => void;
  /** Dismiss the level-up celebration. The diamonds are already credited by then. */
  dismissLevelUpBanner: () => void;
  /** Marks the first-login spotlight tour as seen, whether it finished or was skipped —
   * see components/OnboardingTour.tsx. */
  markOnboardingTourSeen: () => void;
  /** Persists a Budget Calculator edit, same as the website calling saveState() after every
   * input change (see Tools.tsx). Accepts either a full replacement plan or an updater. */
  setBudgetPlan: (next: BudgetPlan | ((prev: BudgetPlan) => BudgetPlan)) => void;
  /** Achievements newly unlocked since the last dismissal — drives the global unlock toast.
   * Can genuinely hold several at once (see dismissNewAchievement). */
  newAchievements: () => AchievementView[];
  /** Drops ONE badge from the queue, so the toast can show them in turn.
   *
   * The toast only ever rendered queue[0] and then cleared the entire array, which silently
   * swallowed every other badge unlocked in the same pass — and simultaneous unlocks aren't
   * an edge case here, they're guaranteed at the biggest moments: `grandmaster` requires all
   * 19 other earnable badges, so it can only ever fire alongside the last of them, and
   * mastering the 11th module unlocks that module's badge and `stackd_star` together. The
   * rewards were paid either way; the player just never heard about them. */
  dismissNewAchievement: (id: string) => void;
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
  /** Set by SupabaseSync once it has FINISHED consulting the cloud for the signed-in account
   * — row loaded, or no row to load, or the read failed. It says "this state is now as good
   * as it's going to get", which is different from `hydrated` (the local AsyncStorage
   * snapshot) and is what the splash waits on before deciding whether onboarding is owed.
   * Without it, a returning user whose progress lives in the cloud looks, for the moment
   * before the read lands, exactly like a brand-new one. */
  setRemoteSettled: (settled: boolean) => void;
  /** Dev-only, and gated behind __DEV__ at its only call site (Settings): backdates
   * lastPlayedDate by one day and re-runs the daily check, so the streak/daily-login flow
   * can be verified without waiting for a real day boundary. Grants nothing — it moves a
   * date, which is why this one survived the cull described below.
   *
   * Two sibling helpers (devOwnEverything, devAddCoins) were removed outright: their Settings
   * rows had been left ungated and shipped to students, handing out the whole shop catalog
   * and unlimited coins. Don't reintroduce a grant-style debug action here; if one is ever
   * genuinely needed, gate it AND keep it out of any exported build. */
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
  /** Same job for pendingStreakDiamonds that liveState does for state (see below): claiming
   * has to know the amount RIGHT NOW, and a setState updater can't tell it — updaters run
   * during the next render, not at call time, so reading the banked amount out of one would
   * always come back as the pre-claim value and let a double-tap bank it twice. Every write
   * to pendingStreakDiamonds goes through this ref as well. */
  const livePendingDiamonds = useRef(0);
  const bankStreakDiamonds = (n: number) => {
    livePendingDiamonds.current += n;
    setPendingStreakDiamonds((p) => p + n);
  };
  /** Drops any un-shown streak reward, ref and state together. For the two places that throw
   * the whole player away (a progress reset, an account switch): the diamonds those rewards
   * refer to were credited into a balance that no longer exists, so leaving the marker behind
   * left the streak card glowing "come collect" and a banner announcing bonus diamonds the
   * reset had already wiped. */
  const clearStreakDiamonds = () => {
    livePendingDiamonds.current = 0;
    setPendingStreakDiamonds(0);
  };
  const loaded = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [remoteSettled, setRemoteSettled] = useState(false);
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
            // Collects whatever the un-pruned versions left behind — a device that has been
            // in use since before pruning existed can be carrying saves for lessons finished
            // long ago or for quests that have since been re-authored. See pruneLessonProgress.
            lessonProgress: pruneLessonProgress(parsed.lessonProgress ?? {}),
          };
        } catch {
          // corrupt/incompatible saved state — fall back to defaults already set
        }
      }
      const { next, streakDiamondsEarned } = runDailyCheck(loadedState);
      setState(next);
      if (streakDiamondsEarned > 0) bankStreakDiamonds(streakDiamondsEarned);
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
      remoteSettled,
      setRemoteSettled,
      level,
      tierName,
      loginBonusPending,
      dailyRewardCycle: dailyRewardCycleFor(state.streak, state.dailyLoginLog),
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
      moduleDoneIndices: (moduleId) => {
        const main = new Set(mainIndicesFor(moduleId));
        return (state.moduleProgress[moduleId] ?? []).filter((i) => main.has(i));
      },
      nextLessonIndex: (moduleId) => {
        const done = new Set(state.moduleProgress[moduleId] ?? []);
        for (const idx of mainIndicesFor(moduleId)) if (!done.has(idx)) return idx;
        // Every main quest is done — the real-life sub-quest is next, unless it's already
        // finished too, in which case nothing's left. Its REAL index, not the main-quest
        // count: those coincide only while the sub-quest is the module's last lesson, and
        // this value is handed straight to quest.tsx as a lessonIndex param.
        const lifeIdx = lifeTaskIndexFor(moduleId);
        return lifeIdx >= 0 && !state.completedLifeTaskIds.includes(moduleId) ? lifeIdx : -1;
      },
      moduleTotal,
      moduleMastered: (moduleId) => isModuleMastered(state.moduleProgress, state.completedLifeTaskIds, moduleId),
      moduleStatus: (moduleId) => (isModuleMastered(state.moduleProgress, state.completedLifeTaskIds, moduleId) ? 'done' : 'active'),
      // Only badges this build can award. The two it can't were still being listed and
      // counted, so the Badges grid held two cells that could never light up and every
      // "X / Y earned" readout (Badges header, the Progress tab's stat tile) quoted a total
      // the player could not reach — 22, with a real ceiling of 19. See EARNABLE_ACHIEVEMENTS.
      achievements: () => {
        const met = new Set(computeMetAchievementIds(state));
        return EARNABLE_ACHIEVEMENTS.map((a) => ({ ...a, earned: met.has(a.id) }));
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
        // coins = correct answers * 8 (or a flat 8 if nothing in the lesson was gradeable) —
        // diamonds never come from a lesson finish. correctCount/gradedTotal arrive from the
        // results screen's own tally, which is the same one it displays; see
        // QUEST_COIN_PER_CORRECT for what changed about the basis and how to tune it.
        const coinsEarned = gradedTotal > 0 ? correctCount * QUEST_COIN_PER_CORRECT : QUEST_COIN_FLAT_FALLBACK;
        // Computed once here (against liveState.current, not just inside the setState
        // updater below) so the return value can tell results.tsx the REAL amount just
        // applied, not the theoretical full reward — this is only ever invoked once per
        // lesson finish (results.tsx guards it with a `recorded` ref), so there's no race
        // between this read and the updater's own use of the same value.
        const alreadyDone = (liveState.current.moduleProgress[moduleId] ?? []).includes(lessonIndex);
        // Must be a real main-quest position, not merely "below the main-quest count" — the
        // sub-quest's own index would satisfy a count check the moment it wasn't last, and
        // its completion belongs in completedLifeTaskIds (completeLifeTask), never here.
        const advanced = mainIndicesFor(moduleId).includes(lessonIndex) && !alreadyDone;

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
            lastModuleId: moduleId,
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
              // Prefers a scenario tagged to the module just played, and won't repeat one
              // until the pool runs out — see pickAmbientLifeEvent.
              const picked = pickAmbientLifeEvent(moduleId, next.shownLifeEventIds);
              if (picked) {
                next = {
                  ...next,
                  pendingLifeEventId: picked.event.id,
                  shownLifeEventIds: picked.seenIds,
                  lifeEventCooldown: LIFE_EVENT_COOLDOWN_SESSIONS,
                };
              }
            }
          }
          liveState.current = next;
          // Pays the level-up reward if this award crossed a boundary, and arms the
          // celebration. No-op otherwise, which is almost every lesson.
          next = applyLevelUp(s.xp, next);
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
            lastModuleId: moduleId,
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
              // Prefers a scenario tagged to the module just played, and won't repeat one
              // until the pool runs out — see pickAmbientLifeEvent.
              const picked = pickAmbientLifeEvent(moduleId, next.shownLifeEventIds);
              if (picked) {
                next = {
                  ...next,
                  pendingLifeEventId: picked.event.id,
                  shownLifeEventIds: picked.seenIds,
                  lifeEventCooldown: LIFE_EVENT_COOLDOWN_SESSIONS,
                };
              }
            }
          }
          liveState.current = next;
          // Pays the level-up reward if this award crossed a boundary, and arms the
          // celebration. No-op otherwise, which is almost every lesson.
          next = applyLevelUp(s.xp, next);
          return next;
        });
        return { xpAwarded: firstTime ? xpEarned : 0, coinsAwarded: firstTime ? coinsEarned : 0 };
      },

      pendingLifeEvent: () => findLifeEvent(state.pendingLifeEventId),

      lessonProgressFor: (moduleId, lessonIndex) => {
        const saved = state.lessonProgress[lessonProgressKey(moduleId, lessonIndex)];
        if (!saved) return null;
        const quest = moduleContentById(moduleId)?.quests[lessonIndex];
        // The quest this save belongs to is gone, or has been re-authored since. Either way
        // its chapter index no longer means what it meant when it was written.
        if (!quest || quest.id !== saved.questId || quest.chapters.length !== saved.chapterCount) return null;
        // Belt and braces on the index itself, so a save can never point past the end.
        if (saved.chapterIdx < 0 || saved.chapterIdx >= quest.chapters.length) return null;
        return saved;
      },

      saveLessonProgress: (moduleId, lessonIndex, progress) => {
        setState((s) => ({
          ...s,
          // Pruned on write rather than on a timer or at boot: this is the only place the map
          // grows, so it's the one place that can keep it bounded. The lesson being saved
          // right now carries the newest savedAt, so it always survives the cap.
          lessonProgress: pruneLessonProgress({
            ...s.lessonProgress,
            [lessonProgressKey(moduleId, lessonIndex)]: progress,
          }),
        }));
      },

      clearLessonProgress: (moduleId, lessonIndex) => {
        setState((s) => {
          const key = lessonProgressKey(moduleId, lessonIndex);
          if (!s.lessonProgress[key]) return s;
          // Rebuilt without the key rather than set to undefined — an undefined value would
          // survive into AsyncStorage as a real key and keep reading as "there's a save here".
          const { [key]: _dropped, ...rest } = s.lessonProgress;
          return { ...s, lessonProgress: rest };
        });
      },

      resolveLifeEvent: (choiceId) => {
        const event = findLifeEvent(state.pendingLifeEventId);
        const choice = event?.choices.find((c) => c.id === choiceId);
        setState((s) => ({
          ...s,
          coins: s.coins + (choice?.coinDelta ?? 0),
          pendingLifeEventId: null,
        }));
      },

      rollAmbientLifeEvent: (moduleId) => {
        if (state.pendingLifeEventId) return false;
        if (state.lifeEventCooldown > 0) {
          setState((s) => ({ ...s, lifeEventCooldown: s.lifeEventCooldown - 1 }));
          return false;
        }
        if (Math.random() >= LIFE_EVENT_CHANCE) return false;
        // Read through liveState rather than the `state` closure: this fires mid-quest, and
        // a roll on an earlier chapter may already have added to the seen list this tick.
        const picked = pickAmbientLifeEvent(moduleId, liveState.current.shownLifeEventIds);
        if (!picked) return false;
        setState((s) => ({
          ...s,
          pendingLifeEventId: picked.event.id,
          shownLifeEventIds: picked.seenIds,
          lifeEventCooldown: LIFE_EVENT_COOLDOWN_SESSIONS,
        }));
        return true;
      },

      dailyLoginBanner,
      dismissDailyLoginBanner: () => setDailyLoginBanner(null),
      claimDailyLoginBonus: () => {
        // Read/write against liveState.current (not the `state` closure) — see liveState's
        // comment. The streak card is a bare Pressable that isn't disabled between the tap
        // and the next render, so a double-tap called this twice in one tick: both reads saw
        // the same pre-claim state, both found today missing from dailyLoginLog, and both
        // credited the day's coins — paying the drip out twice for one day. Writing the log
        // entry back to liveState.current immediately means the second call sees the day as
        // already claimed and pays nothing, which is what hasClaimedToday was there to
        // guarantee in the first place.
        const s = liveState.current;
        const today = new Date().toDateString();
        const alreadyClaimed = hasClaimedToday(s);
        // Positional, from the streak — NOT `Object.keys(s.dailyLoginLog).length + 1` the way
        // this used to be. That counted every day ever collected, so a player who missed a
        // week came back to a bigger reward than they'd left with, and the seven-tile modal
        // this now feeds could never have shown a coherent week: the number it paid had no
        // relationship to the "Day N of 7" the player was looking at. See @/dailyRewards.
        const coins = alreadyClaimed ? 0 : dailyRewardCoins(s.streak);
        // Same race on the diamond half: read and zeroed through livePendingDiamonds, so the
        // second of two calls in a tick sees 0 rather than the pre-claim value and can't
        // bank the same milestone reward twice.
        // Day 7 pays diamonds rather than coins (see @/dailyRewards), so the claim can be
        // worth something with coins at zero.
        const dayDiamonds = alreadyClaimed ? 0 : dailyRewardDiamonds(s.streak);
        const diamonds = livePendingDiamonds.current + dayDiamonds;
        if (coins === 0 && diamonds === 0) return;
        livePendingDiamonds.current = 0;
        setPendingStreakDiamonds(0);
        const next = applyAchievementUnlocks({
          ...s,
          coins: s.coins + coins,
          diamonds: s.diamonds + dayDiamonds,
          // The log value has to stay TRUTHY: dailyRewardCycleFor reads it as "was this day
          // collected", and day 7 pays zero coins, so writing the coin figure there would
          // mark the biggest day of the week as missed the moment it was claimed.
          dailyLoginLog: alreadyClaimed ? s.dailyLoginLog : { ...s.dailyLoginLog, [today]: coins || dayDiamonds },
        });
        liveState.current = next;
        setState(next);
        setDailyLoginBanner({ streak: s.streak, loginCoins: coins, streakDiamonds: diamonds });
      },
      creditReferralReward: (coins, diamonds) => {
        if (coins <= 0 && diamonds <= 0) return;
        // Through liveState for the same reason claimDailyLoginBonus is: the two RPC results
        // are credited back-to-back within one async function, and reading the `state`
        // closure would make the second write land on a snapshot taken before the first.
        const s = liveState.current;
        const next = applyAchievementUnlocks({
          ...s, coins: s.coins + coins, diamonds: s.diamonds + diamonds,
        });
        liveState.current = next;
        setState(next);
      },
      setOnboardingTrack: (trackId) => setState((s) => ({ ...s, onboardingTrackId: trackId })),
      recordPostTest: (score, total) => setState((s) => ({
        ...s, postTest: { score, total, takenAt: new Date().toISOString() },
      })),
      markOnboardingComplete: () => setState((s) => (s.hasCompletedOnboarding ? s : { ...s, hasCompletedOnboarding: true })),
      dismissLevelUpBanner: () => setState((s) => (s.levelUpBanner ? { ...s, levelUpBanner: null } : s)),
      markOnboardingTourSeen: () => setState((s) => (s.hasSeenOnboardingTour ? s : { ...s, hasSeenOnboardingTour: true })),
      setBudgetPlan: (next) => setState((s) => ({
        ...s, budgetPlan: typeof next === 'function' ? next(s.budgetPlan) : next,
      })),
      // Ordered by newAchievementIds, not by catalog position, so badges are announced in the
      // order they were actually unlocked — grandmaster last, after the badge that earned it.
      newAchievements: () => newAchievementIds
        .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
        .filter((a): a is Achievement => !!a)
        .map((a) => ({ ...a, earned: true })),
      dismissNewAchievement: (id) => setNewAchievementIds((ids) => ids.filter((x) => x !== id)),
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
        clearStreakDiamonds();
      },
      resetForAccountSwitch: () => {
        // Same daily bookkeeping the initial load runs, but against pristine defaults —
        // the discarded snapshot belonged to a different account.
        const { next, streakDiamondsEarned } = runDailyCheck(DEFAULT_STATE);
        setState(next);
        setDailyLoginBanner(null);
        setNewAchievementIds([]);
        // Zero first, then bank through the ref-aware helper. This used to call
        // setPendingStreakDiamonds directly, which breaks the invariant livePendingDiamonds
        // is documented to hold ("every write goes through this ref as well"): the ref kept
        // the OUTGOING account's figure, so the first claim on the new account showed that
        // stale number in its banner instead of what this day actually earned.
        clearStreakDiamonds();
        if (streakDiamondsEarned > 0) bankStreakDiamonds(streakDiamondsEarned);
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
          if (streakDiamondsEarned > 0) bankStreakDiamonds(streakDiamondsEarned);
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
          // Local wins outright. An in-flight lesson is the one thing here that belongs to the
          // device it's being played on: this hydrate runs once at sign-in, and taking a
          // remote copy would either resurrect a lesson already finished elsewhere or — worse
          // — replace the save for the lesson being played right now with an older chapter
          // index. Merging per key wouldn't help either, since both sides claim the same key
          // with different chapter numbers and neither is "newer" in a way this can tell.
          lessonProgress: state.lessonProgress,
        };
        const { next, streakDiamondsEarned } = runDailyCheck(merged);
        setState(next);
        if (streakDiamondsEarned > 0) bankStreakDiamonds(streakDiamondsEarned);
      },
      debugSimulateNewDay: () => {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const { next, streakDiamondsEarned } = runDailyCheck({ ...state, lastPlayedDate: yesterday });
        setState(next);
        if (streakDiamondsEarned > 0) bankStreakDiamonds(streakDiamondsEarned);
      },
    };
    // remoteSettled belongs here: it is READ by the value above, so leaving it out would
    // freeze consumers on `false` — the splash would wait for a flag that never appears to
    // change and fall through on its timeout every single launch.
  }, [state, hydrated, remoteSettled, dailyLoginBanner, newAchievementIds, pendingStreakDiamonds]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
