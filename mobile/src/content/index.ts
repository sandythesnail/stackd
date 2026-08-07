import modulesJson from './modules.json';
import shopItemsJson from './shopItems.json';
import type { ModuleContent, Quest, ShopItemReal } from './types';

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

/** The most XP one quest can pay, mirroring exactly what the player accumulates chapter by
 * chapter (see quest.tsx's onComplete calls) — a flat `xpOnComplete` for most types, one
 * `xpPerCorrect` per card for mythcards, and the module's own xpReward scaled by the best
 * available choice for a boss battle. Quick Checks pay no XP at all and contribute 0.
 *
 * Exists because `ModuleContent.xpReward` is NOT what a lesson pays. It's the website's flat
 * per-lesson reward, kept here because the boss battle multiplies against it — but mobile
 * moved to real per-chapter XP, so a module advertising "25 XP each" was handing out anywhere
 * from 10 to 79. It's still the fallback on results.tsx when a lesson reports no XP of its
 * own; it just shouldn't be quoted at students as a per-lesson figure. */
export function questMaxXp(quest: Quest, moduleXpReward: number): number {
  return quest.chapters.reduce((sum, c) => {
    if (c.type === 'mythcards') return sum + (c.xpPerCorrect ?? 0) * c.cards.length;
    if (c.type === 'bossbattle') {
      const best = Math.max(0, ...c.choices.map((ch) => ch.consequence.xpMultiplier ?? 0));
      return sum + Math.round(moduleXpReward * best);
    }
    return sum + ((c as { xpOnComplete?: number }).xpOnComplete ?? 0);
  }, 0);
}

/** Total XP a module can pay across every one of its lessons — the honest headline number
 * for a module, where a single "XP each" figure can't be right for all nine. */
export function moduleMaxXp(content: ModuleContent | undefined): number {
  if (!content) return 0;
  return content.quests.reduce((sum, q) => sum + questMaxXp(q, content.xpReward), 0);
}

export const shopItemById = (id: string) => shopItemsReal.find((i) => i.id === id);

export * from './types';
