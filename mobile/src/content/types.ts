/**
 * Types for the real Stackd content ported from the web app (app.js MODULES / SHOP_ITEMS).
 * modules.json / shopItems.json are extracted verbatim from the website's own data — see
 * mobile/src/content/index.ts for the loader. Chapter types here cover all 15 quest-chapter
 * variants that exist in the extracted data; renderers for them land in later phases.
 */

export type Question = {
  q: string;
  opts: string[];
  correct: number;
  exp: string;
};

export type LessonSummary = {
  title: string;
  hook: string;
  qIndices: number[];
};

export type StatDelta = { checking?: number; savings?: number; moneyScore?: number };

export type StoryChapter = {
  id: string; type: 'story'; title?: string;
  beats: { speaker: string; text: string }[];
};

export type TeachChapter = {
  id: string; type: 'teach'; title: string;
  concepts: { term: string; plain: string; analogy: string; check: { statement: string; isTrue: boolean } }[];
  xpOnComplete?: number;
};

export type MatchingChapter = {
  id: string; type: 'matching'; title: string;
  pairs: { term: string; definition: string }[];
  hintText?: string; xpOnComplete?: number;
};

export type HintChapter = {
  id: string; type: 'hint'; tag: string; text: string; xpOnComplete?: number;
};

export type DecisionChapter = {
  id: string; type: 'decision'; title: string; prompt: string; hintText?: string;
  choices: { id: string; label: string; outcome: { text: string; delta: StatDelta; compare?: { label: string; value: number }[] } }[];
  xpOnComplete?: number;
};

export type MicrosimChapter = {
  id: string; type: 'microsim'; title: string; prompt: string; hintText?: string;
  income: number;
  fixedCosts: { label: string; amount: number }[];
  sliders: { id: string; label: string; min: number; max: number; step: number; default: number }[];
  feedbackTiers: { maxLeftover: number; text: string; ok: boolean }[];
  xpOnComplete?: number;
};

export type PollChapter = {
  id: string; type: 'poll'; title: string; intro: string; statement: string;
  isTrue: boolean; explanation: string; xpOnComplete?: number;
};

export type MythcardsChapter = {
  id: string; type: 'mythcards'; title: string;
  cards: { myth: string; isTrue: boolean; explanation: string }[];
  xpPerCorrect?: number;
};

export type KnowledgecheckChapter = {
  id: string; type: 'knowledgecheck'; title: string;
  qIndices: number[]; hintTexts?: string[];
};

export type SimulatorChapter = {
  id: string; type: 'simulator'; title: string; simulatorId: string;
  meterKey: string; meterMin: number; meterMax: number; intro: string; hintText?: string;
  decisions: { id: string; label: string; scoreDelta: number; note: string }[];
  xpOnComplete?: number;
};

export type BossbattleChapter = {
  id: string; type: 'bossbattle'; title: string; scenario: string; hintText?: string;
  choices: { id: string; label: string; consequence: { text: string; delta: StatDelta; xpMultiplier: number } }[];
};

export type SpotcheckChapter = {
  id: string; type: 'spotcheck'; title: string; intro: string; postingTitle: string;
  segments: { id: string; text: string; isRedFlag: boolean; explanation: string }[];
};

export type PriceisrightChapter = {
  id: string; type: 'priceisright'; title: string; prompt: string; hintText?: string;
  actualValue: number; guessRange: { min: number; max: number; step: number };
  explanation: string; xpOnComplete?: number;
};

export type ExplainbackChapter = {
  id: string; type: 'explainback'; title: string; prompt: string;
  keywords: string[]; fullDefinition: string; xpOnComplete?: number;
};

export type UrlinspectChapter = {
  id: string; type: 'urlinspect'; title: string; intro: string; url: string;
  parts: { id: string; segment: string; isSuspicious: boolean; note: string }[];
};

export type Chapter =
  | StoryChapter | TeachChapter | MatchingChapter | HintChapter | DecisionChapter
  | MicrosimChapter | PollChapter | MythcardsChapter | KnowledgecheckChapter
  | SimulatorChapter | BossbattleChapter | SpotcheckChapter | PriceisrightChapter
  | ExplainbackChapter | UrlinspectChapter;

export type Quest = {
  id: string;
  topic: string;
  character: { name: string; tagline: string };
  initialState: StatDelta;
  bossAchievementId?: string;
  parentQuestId?: string;
  chapters: Chapter[];
};

export type ModuleContent = {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
  xpReward: number;
  hook: string;
  desc: string;
  questions: Question[];
  lessons: LessonSummary[];
  quests: Quest[];
};

export type RoomSlot = 'wallpaper' | 'wall' | 'rug' | 'plant' | 'bed' | 'desk' | 'lamp' | 'window';

export type ShopItemReal = {
  id: string;
  name: string;
  category: 'hat' | 'accessory' | 'reward' | 'exclusive' | 'room';
  price: number;
  currency?: 'coin' | 'diamond';
  isMysteryBox?: boolean;
  mysteryOnly?: boolean;
  mysteryPool?: string;
  rarity?: string;
  viewBox?: string;
  desc: string;
  svg: string;
  fit?: { a: number; b: number; c: number; d: number; e: number; f: number };
  layer?: 'front' | 'back';
  /** Room-category items only: which room slot they occupy, and (for wallpaper) its CSS background. */
  slot?: RoomSlot;
  wallCss?: string;
  /** Achievement-only rewards — never purchasable, auto-equipped when earned (Phase 5). */
  reward?: boolean;
  rewardHint?: string;
};
