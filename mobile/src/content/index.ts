import modulesJson from './modules.json';
import shopItemsJson from './shopItems.json';
import type { ModuleContent, ShopItemReal } from './types';

/** Real module content (hooks, flat quiz questions, lesson summaries, full quests),
 * extracted verbatim from the website's MODULES array. */
export const moduleContent = modulesJson as unknown as ModuleContent[];

/** Real shop catalog, extracted verbatim from the website's SHOP_ITEMS array. */
export const shopItemsReal = shopItemsJson as unknown as ShopItemReal[];

export const moduleContentById = (id: string) => moduleContent.find((m) => m.id === id);

/** For a module's lessons with the real-life sub-quest (LessonSummary.isLifeTask) filtered
 * out — the list ModuleLessonList actually renders and numbers 1..N — maps each row's
 * position in THAT filtered list back to its real position in `lessons`/`quests` (which
 * both include the sub-quest, wherever it happens to sit). QuestPlayer indexes `quests`
 * with the absolute position, so a caller that instead used the filtered position verbatim
 * would open the wrong lesson for everything after the sub-quest, the moment it wasn't the
 * module's very last lesson (today it always is, across all 11 modules' content, which is
 * the only reason this hasn't actually misfired yet — but nothing enforced that ordering,
 * so this mapping removes the assumption instead of relying on content staying that way). */
export function mainLessonAbsoluteIndices(content: ModuleContent | undefined): number[] {
  const out: number[] = [];
  (content?.lessons ?? []).forEach((l, absIdx) => { if (!l.isLifeTask) out.push(absIdx); });
  return out;
}

export const shopItemById = (id: string) => shopItemsReal.find((i) => i.id === id);

export * from './types';
