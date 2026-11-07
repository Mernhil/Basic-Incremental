import type { Content, Dungeon, Mine, Tree } from '../data';
import { rollBossDrop } from './drops';
import { collectModifiers, statValue, type Modifier } from './modifiers';
import { Decimal } from './num';
import type { Rng } from './rng';
import { cloneState, type GameState } from './state';

/** Safety valve: never resolve more boss kills than this in one advance() call. */
export const MAX_KILLS_PER_ADVANCE = 100_000;

export interface TickReport {
  bossKills: number;
  /** Rare item id -> times dropped. */
  drops: Record<string, number>;
}

export function emptyReport(): TickReport {
  return { bossKills: 0, drops: {} };
}

export function mergeReports(into: TickReport, add: TickReport): TickReport {
  into.bossKills += add.bossKills;
  for (const [id, n] of Object.entries(add.drops)) into.drops[id] = (into.drops[id] ?? 0) + n;
  return into;
}

/**
 * Boss HP grows slowly with prestige count: base * (1 + scaling)^prestiges, then the
 * combat.bossHp modifiers apply.
 */
export function bossMaxHp(
  dungeon: Dungeon,
  prestigeCount: number,
  modifiers: readonly Modifier[] = [],
): Decimal {
  const growth = Decimal.pow(1 + dungeon.boss.hpScalingPerPrestige, prestigeCount);
  const base = dungeon.boss.hp.mul(growth);
  return Decimal.max(
    statValue('combat.bossHp', base, modifiers, { job: 'fighting', dungeon: dungeon.id }),
    1,
  );
}

/** Damage per second against this dungeon's boss, after modifiers. Never negative. */
export function effectiveDamage(
  state: GameState,
  dungeon: Dungeon,
  modifiers: readonly Modifier[],
): Decimal {
  const dps = statValue('combat.damage', state.damage, modifiers, {
    job: 'fighting',
    dungeon: dungeon.id,
  });
  return Decimal.max(dps, 0);
}

/** Output per second of one plot/slot running this producer, after modifiers. */
export function producerRate(
  producer: Tree | Mine,
  job: 'logging' | 'mining',
  modifiers: readonly Modifier[],
): Decimal {
  const rate = statValue('production.rate', producer.baseRate, modifiers, {
    job,
    producer: producer.id,
    resource: producer.resource,
  });
  return Decimal.max(rate, 0);
}

/** The dungeon's drop table after modifiers (chance clamped to 0..1, pity at least 1). */
export function effectiveDrops(dungeon: Dungeon, modifiers: readonly Modifier[]): Dungeon['drops'] {
  const ctx = { job: 'fighting' as const, dungeon: dungeon.id };
  const { rare, portalResource } = dungeon.drops;
  const chance = statValue('drops.rareChance', rare.chance, modifiers, ctx).toNumber();
  const pity = statValue('drops.pityThreshold', rare.pityThreshold, modifiers, ctx).toNumber();
  const portalCtx = { ...ctx, resource: portalResource.resource };
  const amount = (n: number): number =>
    Math.max(0, Math.floor(statValue('drops.portalAmount', n, modifiers, portalCtx).toNumber()));
  const min = amount(portalResource.min);
  return {
    ...dungeon.drops,
    rare: {
      ...rare,
      chance: Math.min(1, Math.max(0, chance)),
      pityThreshold: Math.max(1, Math.round(pity)),
    },
    portalResource: { ...portalResource, min, max: Math.max(min, amount(portalResource.max)) },
  };
}

/**
 * Advances the game by `dtMs` of real time. Pure: returns a new state.
 * Everything is rate * seconds, so splitting a span into many small steps or doing it
 * in one gives the same result (frame-rate independence).
 */
export function advance(
  state: GameState,
  content: Content,
  dtMs: number,
  rng: Rng,
): { state: GameState; report: TickReport } {
  const report = emptyReport();
  if (!Number.isFinite(dtMs) || dtMs <= 0) return { state, report };

  const next = cloneState(state);
  const seconds = dtMs / 1000;
  const modifiers = collectModifiers(state, content);
  next.stats.playTimeMs += dtMs;

  // Production: every plot/slot running a tree or mine yields baseRate per second.
  const producers = [
    ...content.trees.map((p) => [p, 'logging'] as const),
    ...content.mines.map((p) => [p, 'mining'] as const),
  ];
  for (const [producer, job] of producers) {
    const plots = next.producers[producer.id] ?? 0;
    if (plots <= 0) continue;
    const gained = producerRate(producer, job, modifiers).mul(plots).mul(seconds);
    const current = next.resources[producer.resource] ?? new Decimal(0);
    next.resources[producer.resource] = current.add(gained);
  }

  // Combat: the boss is auto-fought in parallel and respawns for farming.
  const dungeon = next.activeDungeonId ? content.dungeonById.get(next.activeDungeonId) : undefined;
  if (dungeon) fightBoss(next, dungeon, seconds, rng, report, modifiers);

  return { state: next, report };
}

function fightBoss(
  state: GameState,
  dungeon: Dungeon,
  seconds: number,
  rng: Rng,
  report: TickReport,
  modifiers: readonly Modifier[],
): void {
  const maxHp = bossMaxHp(dungeon, state.prestigeCount, modifiers);
  const hp = Decimal.min(state.bossHp ?? maxHp, maxHp);
  const dealt = effectiveDamage(state, dungeon, modifiers).mul(seconds);
  if (dealt.lte(0)) return;

  if (dealt.lt(hp)) {
    state.bossHp = hp.sub(dealt);
    return;
  }

  // At least one kill. Overflow damage carries into respawned bosses.
  let overflow = dealt.sub(hp);
  let kills = 1;
  const extra = Decimal.min(overflow.div(maxHp).floor(), MAX_KILLS_PER_ADVANCE - 1).toNumber();
  kills += extra;
  overflow = kills >= MAX_KILLS_PER_ADVANCE ? new Decimal(0) : overflow.sub(maxHp.mul(extra));
  // Remaining overflow is < maxHp; the floor guards against rounding pushing HP to <= 0.
  state.bossHp = Decimal.max(maxHp.sub(overflow), maxHp.mul(1e-9));

  const bossId = dungeon.boss.id;
  const drops = effectiveDrops(dungeon, modifiers);
  const portalId = drops.portalResource.resource;
  let pity = state.pity[bossId] ?? 0;
  let portal = 0;
  let rares = 0;
  for (let i = 0; i < kills; i++) {
    const roll = rollBossDrop(drops, pity, rng);
    pity = roll.pity;
    portal += roll.portal;
    if (roll.rare) rares++;
  }

  state.pity[bossId] = pity;
  state.stats.bossKills += kills;
  report.bossKills += kills;
  if (portal > 0) {
    state.resources[portalId] = (state.resources[portalId] ?? new Decimal(0)).add(portal);
  }
  if (rares > 0) {
    const item = dungeon.drops.rare.itemId;
    state.inventory[item] = (state.inventory[item] ?? 0) + rares;
    report.drops[item] = (report.drops[item] ?? 0) + rares;
  }
}

/** Same as advance() but split into steps of at most `chunkMs`. */
export function advanceChunked(
  state: GameState,
  content: Content,
  totalMs: number,
  rng: Rng,
  chunkMs: number,
): { state: GameState; report: TickReport } {
  const report = emptyReport();
  let current = state;
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(chunkMs, remaining);
    const result = advance(current, content, step, rng);
    current = result.state;
    mergeReports(report, result.report);
    remaining -= step;
  }
  return { state: current, report };
}
