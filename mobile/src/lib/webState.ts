/**
 * Translation + merge between the mobile app's `AppState` and the WEB app's `state`
 * shape (the canonical blob stored in Supabase `user_progress.state`). The web is the
 * source of truth for the schema and is never changed, so mobile must speak its shape.
 *
 * Design:
 *  - webToMobile: read the web blob into mobile's AppState (derive moduleProgress counts
 *    from the web's completedLessons map, map field-name differences).
 *  - mobileToWeb: write mobile's AppState back, MERGING onto the last-seen remote blob so
 *    web-only fields (budgetPlan, onboardingSurvey, financialState, questProgress, …) are
 *    preserved, never clobbered. Mobile-only fields are stashed under `_mobile`.
 *
 * Fidelity notes: the web tracks per-lesson score/total; mobile tracks a per-module
 * completed-count. Going mobile→web we synthesize {score:1,total:1} records for lessons
 * mobile completed that the web didn't already have — so "flawless/hadPerfect"-style
 * detail can be slightly optimistic, but completion + mastery + all currencies are exact.
 */
import { moduleContentById } from '@/content';
import type { AppState } from '@/store';

export type LessonRecord = { score: number; total: number; xpEarned: number };

/** The web `state` blob. Known fields are typed; unknown web-only fields pass through via
 * the index signature so mobile can preserve them on write. */
export type WebState = {
  level?: number;
  xp?: number;
  streak?: number;
  lastPlayedDate?: string | null;
  lastSeenTier?: string | null;
  completedModules?: Record<string, LessonRecord>;
  completedLessons?: Record<string, LessonRecord>;
  unlockedAchievements?: string[];
  coins?: number;
  diamonds?: number;
  ownedItems?: string[];
  equippedItems?: string[];
  ownedRoomItems?: string[];
  equippedRoom?: Record<string, string | null>;
  dailyLoginLog?: Record<string, number>;
  questBossesWon?: string[];
  /** Mobile-only fields stashed here so a mobile→mobile round-trip preserves them (the
   * web ignores this key). */
  _mobile?: Partial<AppState>;
  [key: string]: unknown;
};

const LEVEL_THRESHOLDS = [0, 90, 200, 330, 480, 660, 880, 1150, 1450, 1800, 2200];
function levelForXp(xp: number) {
  let level = 1;
  while (level < LEVEL_THRESHOLDS.length && xp >= LEVEL_THRESHOLDS[level]) level++;
  return level;
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Mobile-only AppState fields that the web schema has no home for (kept under `_mobile`). */
const MOBILE_ONLY_KEYS = [
  'shownLifeEventIds', 'pendingLifeEventId', 'lifeEventCooldown', 'onboardingTrackId',
  'questHintsUsed', 'termsLearned', 'lastModuleActivityDate',
] as const;

function extractMobileOnly(m: AppState): Partial<AppState> {
  const out: Record<string, unknown> = {};
  for (const k of MOBILE_ONLY_KEYS) out[k] = (m as Record<string, unknown>)[k];
  return out as Partial<AppState>;
}

/** Read the web blob into a partial mobile AppState (callers spread it over DEFAULT_STATE). */
export function webToMobile(web: WebState): Partial<AppState> {
  // Count completed lessons per module from keys shaped `${moduleId}_${lessonIdx}`.
  const moduleProgress: Record<string, number> = {};
  for (const key of Object.keys(web.completedLessons ?? {})) {
    const modId = key.slice(0, key.lastIndexOf('_'));
    if (modId) moduleProgress[modId] = (moduleProgress[modId] ?? 0) + 1;
  }
  // A fully-completed module is authoritative — clamp its count to the real lesson total.
  for (const modId of Object.keys(web.completedModules ?? {})) {
    const total = moduleContentById(modId)?.lessons.length ?? 0;
    if (total) moduleProgress[modId] = total;
  }

  const mobileExtras = (web._mobile ?? {}) as Partial<AppState>;
  return {
    coins: num(web.coins),
    diamonds: num(web.diamonds),
    xp: num(web.xp),
    streak: num(web.streak),
    lastPlayedDate: web.lastPlayedDate ?? null,
    ownedItems: arr(web.ownedItems),
    equippedItems: arr(web.equippedItems),
    ownedRoomItems: arr(web.ownedRoomItems),
    equippedRoom: normalizeRoom(web.equippedRoom),
    unlockedAchievementIds: arr(web.unlockedAchievements),
    questBossesWon: arr(web.questBossesWon),
    dailyLoginLog: (web.dailyLoginLog as Record<string, number>) ?? {},
    moduleProgress,
    // Restore any mobile-only fields we previously stashed (safe no-op if absent).
    ...mobileExtras,
  };
}

const ROOM_SLOTS = ['wallpaper', 'wall', 'rug', 'plant', 'bed', 'desk', 'lamp', 'window'] as const;
function normalizeRoom(room: Record<string, string | null> | undefined): AppState['equippedRoom'] {
  const out = {} as AppState['equippedRoom'];
  for (const slot of ROOM_SLOTS) out[slot] = (room?.[slot] as string | null) ?? null;
  return out;
}

/**
 * Merge mobile AppState onto the last-seen remote blob, preserving every web-only field.
 * Pass the remote we last read (or null for a first upload).
 */
export function mobileToWeb(mobile: AppState, remote: WebState | null): WebState {
  const base: WebState = remote ? { ...remote } : {};

  const completedLessons: Record<string, LessonRecord> = { ...(base.completedLessons ?? {}) };
  const completedModules: Record<string, LessonRecord> = { ...(base.completedModules ?? {}) };
  for (const [modId, count] of Object.entries(mobile.moduleProgress)) {
    const total = moduleContentById(modId)?.lessons.length ?? 0;
    for (let i = 0; i < count; i++) {
      const key = `${modId}_${i}`;
      if (!completedLessons[key]) completedLessons[key] = { score: 1, total: 1, xpEarned: 0 };
    }
    if (total && count >= total && !completedModules[modId]) {
      completedModules[modId] = { score: total, total, xpEarned: 0 };
    }
  }

  return {
    ...base,
    level: levelForXp(mobile.xp),
    xp: mobile.xp,
    streak: mobile.streak,
    lastPlayedDate: mobile.lastPlayedDate,
    coins: mobile.coins,
    diamonds: mobile.diamonds,
    ownedItems: mobile.ownedItems,
    equippedItems: mobile.equippedItems,
    ownedRoomItems: mobile.ownedRoomItems,
    equippedRoom: mobile.equippedRoom,
    unlockedAchievements: mobile.unlockedAchievementIds,
    questBossesWon: mobile.questBossesWon,
    dailyLoginLog: mobile.dailyLoginLog,
    completedLessons,
    completedModules,
    _mobile: extractMobileOnly(mobile),
  };
}
