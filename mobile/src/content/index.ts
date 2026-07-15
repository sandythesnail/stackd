import modulesJson from './modules.json';
import shopItemsJson from './shopItems.json';
import type { ModuleContent, ShopItemReal } from './types';

/** Real module content (hooks, flat quiz questions, lesson summaries, full quests),
 * extracted verbatim from the website's MODULES array. */
export const moduleContent = modulesJson as unknown as ModuleContent[];

/** Real shop catalog, extracted verbatim from the website's SHOP_ITEMS array. */
export const shopItemsReal = shopItemsJson as unknown as ShopItemReal[];

export const moduleContentById = (id: string) => moduleContent.find((m) => m.id === id);

export const shopItemById = (id: string) => shopItemsReal.find((i) => i.id === id);

export * from './types';
