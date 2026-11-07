import type { Content } from '../data';
import { Decimal } from './num';

export interface GameStats {
  playTimeMs: number;
  bossKills: number;
}

export interface GameState {
  /** Every resource id in the content has an entry. */
  resources: Record<string, Decimal>;
  /** Tree/mine id -> number of plots/slots running it. */
  producers: Record<string, number>;
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
}

export const STARTING_DAMAGE = 1;

export function createInitialState(content: Content): GameState {
  const resources: Record<string, Decimal> = {};
  for (const resource of content.resources) resources[resource.id] = new Decimal(0);

  const producers: Record<string, number> = {};
  for (const producer of [...content.trees, ...content.mines]) {
    if (producer.startPlots > 0) producers[producer.id] = producer.startPlots;
  }

  return {
    resources,
    producers,
    damage: new Decimal(STARTING_DAMAGE),
    activeDungeonId: content.dungeons[0]?.id ?? null,
    bossHp: null,
    pity: {},
    inventory: {},
    prestigeCount: 0,
    stats: { playTimeMs: 0, bossKills: 0 },
  };
}

/** Copy with fresh containers so callers never mutate a previous state. Decimals are immutable. */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    resources: { ...state.resources },
    producers: { ...state.producers },
    pity: { ...state.pity },
    inventory: { ...state.inventory },
    stats: { ...state.stats },
  };
}
