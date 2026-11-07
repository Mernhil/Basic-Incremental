import type { BurstJob } from '../data';

/** What happened during one advance() call, for notifications, animations and the away summary. */
export interface TickReport {
  bossKills: number;
  /** Rare item id -> times dropped. */
  drops: Record<string, number>;
  /** Material resource id (Cores, Glimmer Dust, Facet Shards) -> units gained. */
  materials: Record<string, number>;
  /** Bursts fired per job: signature attacks (fighting) and bonus harvests (logging, mining). */
  bursts: Record<BurstJob, number>;
  /** Dungeons and special dungeons cleared for the first time. */
  cleared: string[];
  /** Dungeons and special dungeons that became available. */
  unlockedDungeons: string[];
  /** Mine types unlocked by a clear. */
  unlockedMines: string[];
  /** Special dungeon attempts finished. */
  trialAttempts: number;
  /** Best score (0..1) among those attempts; 0 when there were none. */
  trialTopScore: number;
}

export function emptyReport(): TickReport {
  return {
    bossKills: 0,
    drops: {},
    materials: {},
    bursts: { fighting: 0, logging: 0, mining: 0 },
    cleared: [],
    unlockedDungeons: [],
    unlockedMines: [],
    trialAttempts: 0,
    trialTopScore: 0,
  };
}

export function mergeReports(into: TickReport, add: TickReport): TickReport {
  into.bossKills += add.bossKills;
  for (const [id, n] of Object.entries(add.drops)) into.drops[id] = (into.drops[id] ?? 0) + n;
  for (const [id, n] of Object.entries(add.materials)) {
    into.materials[id] = (into.materials[id] ?? 0) + n;
  }
  for (const job of Object.keys(into.bursts) as BurstJob[]) into.bursts[job] += add.bursts[job];
  into.cleared.push(...add.cleared);
  into.unlockedDungeons.push(...add.unlockedDungeons);
  into.unlockedMines.push(...add.unlockedMines);
  into.trialAttempts += add.trialAttempts;
  into.trialTopScore = Math.max(into.trialTopScore, add.trialTopScore);
  return into;
}
