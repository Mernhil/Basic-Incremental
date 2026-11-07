import type { Content, ProductionJob } from '../data';
import { Decimal } from './num';
import type { CosmeticLoadout } from './theme';

export interface GameStats {
  playTimeMs: number;
  bossKills: number;
}

export interface GameState {
  /** Every resource id in the content has an entry. */
  resources: Record<string, Decimal>;
  /** Plots, slots, unlocked tree kinds and mine levels. See production.ts. */
  production: ProductionState;
  /** Dungeons cleared at least once. Kept through prestige; clearing one unlocks mine types. */
  clearedDungeons: string[];
  /** Base damage per second. Bought with resources, kept through prestige. */
  damage: Decimal;
  /** Dungeon whose boss is being auto-fought, or null. */
  activeDungeonId: string | null;
  /** Current boss HP; null means "spawn a fresh boss on the next tick". */
  bossHp: Decimal | null;
  /** Boss id -> consecutive kills without the rare drop (pity counter). */
  pity: Record<string, number>;
  /** Rare item id -> count owned. */
  inventory: Record<string, number>;
  prestigeCount: number;
  stats: GameStats;
  cosmetics: CosmeticState;
}

export interface OwnedCosmetic {
  /** Highest unlocked upgrade level (1-based). */
  level: number;
  /** Duplicate copies held, used to unlock levels. */
  copies: number;
}

export interface CosmeticState {
  loadout: CosmeticLoadout;
  /** Cosmetic id -> ownership. Owning grants the item's buff whether or not it is worn. */
  owned: Record<string, OwnedCosmetic>;
}

/** One production job (logging plots or mining slots). */
export interface JobProductionState {
  /** Plots/slots bought on top of the job's start count. Reset on prestige. */
  expansions: number;
  /** What runs in each plot/slot, by index; null = empty. May be shorter than the capacity
   *  (missing entries are empty); entries at or past the capacity are idle. */
  plots: (string | null)[];
}

export interface ProductionState {
  logging: JobProductionState;
  mining: JobProductionState;
  /** Tree kinds bought with wood (start kinds are always unlocked). Kept through prestige. */
  unlockedTrees: string[];
  /** Mine id -> level bought with ore. Reset on prestige. */
  mineLevels: Record<string, number>;
}

export const STARTING_DAMAGE = 1;

/** Production as in a brand-new game (or right after a prestige, minus the kept unlocks). */
export function initialProduction(content: Content): ProductionState {
  const job = (key: ProductionJob): JobProductionState => {
    const config = content.production[key];
    return {
      expansions: 0,
      plots: Array<string | null>(config.startPlots).fill(config.startProducer),
    };
  };
  return { logging: job('logging'), mining: job('mining'), unlockedTrees: [], mineLevels: {} };
}

export function createInitialState(content: Content): GameState {
  const resources: Record<string, Decimal> = {};
  for (const resource of content.resources) resources[resource.id] = new Decimal(0);

  return {
    resources,
    production: initialProduction(content),
    clearedDungeons: [],
    damage: new Decimal(STARTING_DAMAGE),
    activeDungeonId: content.dungeons[0]?.id ?? null,
    bossHp: null,
    pity: {},
    inventory: {},
    prestigeCount: 0,
    stats: { playTimeMs: 0, bossKills: 0 },
    cosmetics: {
      loadout: { slots: {}, cards: {} },
      owned: Object.fromEntries(
        Object.values(content.starterBySlot).map((c) => [c.id, { level: 1, copies: 1 }]),
      ),
    },
  };
}

/** Copy with fresh containers so callers never mutate a previous state. Decimals are immutable. */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    production: cloneProduction(state.production),
    clearedDungeons: [...state.clearedDungeons],
    pity: { ...state.pity },
    inventory: { ...state.inventory },
    stats: { ...state.stats },
    cosmetics: {
      loadout: {
        slots: { ...state.cosmetics.loadout.slots },
        cards: { ...state.cosmetics.loadout.cards },
      },
      owned: { ...state.cosmetics.owned },
    },
  };
}

export function cloneProduction(p: ProductionState): ProductionState {
  return {
    logging: { expansions: p.logging.expansions, plots: [...p.logging.plots] },
    mining: { expansions: p.mining.expansions, plots: [...p.mining.plots] },
    unlockedTrees: [...p.unlockedTrees],
    mineLevels: { ...p.mineLevels },
  };
}
