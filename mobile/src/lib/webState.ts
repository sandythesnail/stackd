/**
 * Translation + merge between the mobile app's `AppState` and the WEB app's `state`
 * shape (the canonical blob stored in Supabase `user_progress.state`). The web is the
 * source of truth for the schema and is never changed, so mobile must speak its shape.
 *
 * Design:
 *  - webToMobile: read the web blob into mobile's AppState (derive moduleProgress
 *    per-lesson index arrays from the web's questProgress map, map field-name differences).
 *  - mobileToWeb: write mobile's AppState back, MERGING onto the last-seen remote blob so
 *    web-only fields (budgetPlan, onboardingSurvey, financialState, …) are preserved,
 *    never clobbered. Mobile-only fields are stashed under `_mobile`.
 *
 * Real per-lesson completion on the web lives in `questProgress` (keyed
 * "moduleId::questId", see app.js's questKey/startQuest/finishQuest) — every module was
 * rebuilt as a full quest chain, and finishQuest never writes `completedLessons`/
 * `completedModules` per lesson anymore (those two fields are legacy, left over from the
 * pre-quest flat-quiz lessons, and are effectively frozen at whatever a module's very
 * first finished quest wrote there). Deriving moduleProgress from them instead of
 * questProgress silently undercounts — usually all the way to zero — every module a user
 * actually completed lessons in on the website, which is why synced percentages on mobile
 * used to read low/wrong. mainQuests/subQuestFor split (a module's 8 real lessons vs its
 * one real-life step-by-step-guide subquest) is ported verbatim into content.quests'
 * `parentQuestId` field, so mobile can group web's flat questProgress map back by module
 * without needing web's own MODULES array.
 *
 * Fidelity notes: going mobile→web we synthesize completed questProgress entries (done:
 * true, zeroed score/analytics) for lessons mobile completed that the web didn't already
 * have — so per-lesson "flawless/hadPerfect"-style detail can be slightly optimistic, but
 * completion + mastery + all currencies are exact.
 */
import { moduleContent, moduleContentById } from '@/content';
import type { AppState } from '@/store';
import type { StatDelta } from '@/content';

export type LessonRecord = { score: number; total: number; xpEarned: number };

/** Only the fields this file reads/writes on a web questProgress record — web owns the
 * full shape (see app.js's startQuest), the rest passes through untouched via the merge
 * in mobileToWeb (this file never replaces `remote.questProgress` wholesale, only adds
 * missing entries onto a copy of it). */
export type QuestProgressRecord = {
  done?: boolean;
  chapterIdx?: number;
  chapterScore?: number;
  chapterTotal?: number;
  streak?: number;
  dashboard?: StatDelta;
  learnedTerms?: unknown[];
  hintsUsed?: number;
  xpEarned?: number;
  analytics?: unknown;
};

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
  questProgress?: Record<string, QuestProgressRecord>;
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
  'questHintsUsed', 'termsLearned', 'lastModuleActivityDate', 'completedLifeTaskIds',
] as const;

function extractMobileOnly(m: AppState): Partial<AppState> {
  const out: Record<string, unknown> = {};
  for (const k of MOBILE_ONLY_KEYS) out[k] = (m as Record<string, unknown>)[k];
  return out as Partial<AppState>;
}

/** Read the web blob into a partial mobile AppState (callers spread it over DEFAULT_STATE). */
export function webToMobile(web: WebState): Partial<AppState> {
  const questProgress = web.questProgress ?? {};
  // Real per-module completed lesson INDICES, derived from questProgress (see file
  // header) — a module's 8 real lessons are its quests without a parentQuestId; the 9th,
  // the real-life step-by-step-guide subquest, is tracked separately
  // (completedLifeTaskIds), same split store.tsx's moduleTotal/completeLifeTask make
  // locally. Indices, not a count: the web's questProgress is itself per-quest, so this
  // is a lossless mapping — lesson 3 done on the web is exactly [2] here, never [0,1,2].
  const moduleProgress: Record<string, number[]> = {};
  const webLifeTaskIds: string[] = [];
  for (const m of moduleContent) {
    const mainQuestIds = m.quests.filter((q) => !q.parentQuestId).map((q) => q.id);
    const doneIdxs = mainQuestIds
      .map((qid, i) => (questProgress[`${m.id}::${qid}`]?.done ? i : -1))
      .filter((i) => i >= 0);
    if (doneIdxs.length) moduleProgress[m.id] = doneIdxs;

    const subQuest = m.quests.find((q) => q.parentQuestId);
    if (subQuest && questProgress[`${m.id}::${subQuest.id}`]?.done) webLifeTaskIds.push(m.id);
  }

  // Restore any mobile-only fields we previously stashed (safe no-op if absent) — but
  // completedLifeTaskIds gets unioned with what we just read off the web, not overwritten
  // by it, since the subquest may have been finished on either device.
  const mobileExtras = (web._mobile ?? {}) as Partial<AppState>;
  const completedLifeTaskIds = Array.from(
    new Set([...(mobileExtras.completedLifeTaskIds ?? []), ...webLifeTaskIds])
  );

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
    ...mobileExtras,
    moduleProgress,
    completedLifeTaskIds,
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
const EMPTY_ANALYTICS = { knowledgeCheck: [], mythCards: [], polls: [], matchingMistakes: 0, explainback: null, decisions: [], bossChoice: null };

/** A completed questProgress record for a quest mobile finished but the web hasn't
 * recorded yet — shaped like app.js's startQuest default, just pre-marked done so the
 * website's own renderModuleList/mastery checks (which read questProgress, not
 * completedLessons) recognize it immediately. */
function finishedQuestRecord(chapters: number, initialState: StatDelta): QuestProgressRecord {
  return {
    chapterIdx: chapters,
    dashboard: { ...initialState },
    chapterScore: 0,
    chapterTotal: 0,
    streak: 0,
    done: true,
    learnedTerms: [],
    hintsUsed: 0,
    xpEarned: 0,
    analytics: EMPTY_ANALYTICS,
  };
}

export function mobileToWeb(mobile: AppState, remote: WebState | null): WebState {
  const base: WebState = remote ? { ...remote } : {};

  const completedLessons: Record<string, LessonRecord> = { ...(base.completedLessons ?? {}) };
  const completedModules: Record<string, LessonRecord> = { ...(base.completedModules ?? {}) };
  const questProgress: Record<string, QuestProgressRecord> = { ...(base.questProgress ?? {}) };

  for (const [modId, doneIdxs] of Object.entries(mobile.moduleProgress)) {
    const content = moduleContentById(modId);
    const mainQuests = content?.quests.filter((q) => !q.parentQuestId) ?? [];
    const total = mainQuests.length;
    const validIdxs = doneIdxs.filter((i) => i >= 0 && i < mainQuests.length);
    for (const i of validIdxs) {
      const quest = mainQuests[i];
      const key = `${modId}::${quest.id}`;
      if (!questProgress[key]?.done) questProgress[key] = finishedQuestRecord(quest.chapters.length, quest.initialState);
      // Legacy fields — no real reader left for real modules, kept only so an old client
      // still reading them (or a not-yet-migrated module) doesn't regress.
      const legacyKey = `${modId}_${i}`;
      if (!completedLessons[legacyKey]) completedLessons[legacyKey] = { score: 1, total: 1, xpEarned: 0 };
    }
    if (total && new Set(validIdxs).size >= total && !completedModules[modId]) {
      completedModules[modId] = { score: total, total, xpEarned: 0 };
    }
  }

  for (const modId of mobile.completedLifeTaskIds) {
    const subQuest = moduleContentById(modId)?.quests.find((q) => q.parentQuestId);
    if (!subQuest) continue;
    const key = `${modId}::${subQuest.id}`;
    if (!questProgress[key]?.done) questProgress[key] = finishedQuestRecord(subQuest.chapters.length, subQuest.initialState);
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
    questProgress,
    _mobile: extractMobileOnly(mobile),
  };
}
