import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shopItemsReal } from '@/content';
import type { RoomSlot, ShopItemReal } from '@/content';

const STORAGE_KEY = 'stackd_state_v1';

/** MAX_EQUIPPED_ITEMS, MYSTERY_OWNED_WEIGHT_FACTOR, MYSTERY_DUPLICATE_REFUND_RATE, and
 * RARITY_WEIGHT are ported verbatim from the website's app.js (see handleShopAction,
 * pickMysteryItem, openMysteryBox). */
export const MAX_EQUIPPED_ITEMS = 3;
const MYSTERY_OWNED_WEIGHT_FACTOR = 0.35;
const MYSTERY_DUPLICATE_REFUND_RATE = 0.5;
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
const RARITY_WEIGHT: Record<string, number> = { common: 8, rare: 4, epic: 2, legendary: 1 };

export function itemRarity(item: Pick<ShopItemReal, 'rarity'>) {
  return item.rarity && RARITY_ORDER.includes(item.rarity) ? item.rarity : 'common';
}

const ROOM_SLOTS: RoomSlot[] = ['wallpaper', 'wall', 'rug', 'plant', 'bed', 'desk', 'lamp', 'window'];

export type AppState = {
  coins: number;
  diamonds: number;
  xp: number;
  level: number;
  streak: number;
  ownedItems: string[];
  ownedRoomItems: string[];
  equippedItems: string[];
  equippedRoom: Record<RoomSlot, string | null>;
};

const DEFAULT_STATE: AppState = {
  coins: 340,
  diamonds: 8,
  xp: 1240,
  level: 4,
  streak: 12,
  ownedItems: ['crown', 'sunglasses'],
  ownedRoomItems: [],
  equippedItems: ['crown', 'sunglasses'],
  equippedRoom: { wallpaper: null, wall: null, rug: null, plant: null, bed: null, desk: null, lamp: null, window: null },
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

type Ctx = {
  state: AppState;
  isOwned: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  equippedRoomItems: () => ShopItemReal[];
  equippedMascotItems: () => ShopItemReal[];
  /** Buy/equip/unequip toggle for non-room items (hats, accessories, exclusives). Mirrors
   * the website's handleShopAction non-slot branch. No-ops (returns false) if unaffordable. */
  buyOrEquipItem: (itemId: string) => boolean;
  /** Buy/equip/unequip toggle for room-category items (one equipped per slot). Mirrors
   * handleShopAction's slot branch. */
  toggleRoomSlot: (itemId: string) => boolean;
  /** Opens a mystery box: deducts price, rolls a weighted-random prize, partially refunds
   * duplicates. Returns null if unaffordable or the pool has nothing left to give. */
  openMysteryBox: (itemId: string) => MysteryResult | null;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
        } catch {
          // corrupt/incompatible saved state — fall back to defaults already set
        }
      }
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

    return {
      state,
      isOwned,
      isEquipped,
      equippedRoomItems: () =>
        ROOM_SLOTS.map((slot) => state.equippedRoom[slot]).filter((id): id is string => !!id)
          .map((id) => shopItemsReal.find((i) => i.id === id))
          .filter((i): i is ShopItemReal => !!i),
      equippedMascotItems: () =>
        state.equippedItems.map((id) => shopItemsReal.find((i) => i.id === id)).filter((i): i is ShopItemReal => !!i),

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
          setState((s) => ({ ...s, equippedRoom: { ...s.equippedRoom, [slot]: null } }));
          return true;
        }
        if (owned) {
          setState((s) => ({ ...s, equippedRoom: { ...s.equippedRoom, [slot]: itemId } }));
          return true;
        }
        const balance = isDiamond ? state.diamonds : state.coins;
        if (balance < item.price) return false;
        setState((s) => ({
          ...s,
          coins: isDiamond ? s.coins : s.coins - item.price,
          diamonds: isDiamond ? s.diamonds - item.price : s.diamonds,
          ownedRoomItems: [...s.ownedRoomItems, itemId],
          equippedRoom: { ...s.equippedRoom, [slot]: itemId },
        }));
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
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
