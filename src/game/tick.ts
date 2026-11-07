import type { Content, Dungeon } from '../data';
import { rollBossDrop } from './drops';
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

/** Boss HP grows slowly with prestige count: base * (1 + scaling)^prestiges. */
export function bossMaxHp(dungeon: Dungeon, prestigeCount: number): Decimal {
  const growth = Decimal.pow(1 + dungeon.boss.hpScalingPerPrestige, prestigeCount);
  return dungeon.boss.hp.mul(growth);
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
  next.stats.playTimeMs += dtMs;

  // Production: every plot/slot running a tree or mine yields baseRate per second.
  for (const producer of [...content.trees, ...content.mines]) {
    const plots = next.producers[producer.id] ?? 0;
    if (plots <= 0) continue;
    const gained = producer.baseRate.mul(plots).mul(seconds);
    const current = next.resources[producer.resource] ?? new Decimal(0);
    next.resources[producer.resource] = current.add(gained);
  }

  // Combat: the boss is auto-fought in parallel and respawns for farming.
  const dungeon = next.activeDungeonId ? content.dungeonById.get(next.activeDungeonId) : undefined;
  if (dungeon) fightBoss(next, dungeon, seconds, rng, report);

  return { state: next, report };
}

function fightBoss(
  state: GameState,
  dungeon: Dungeon,
  seconds: number,
  rng: Rng,
  report: TickReport,
): void {
  const maxHp = bossMaxHp(dungeon, state.prestigeCount);
  const hp = state.bossHp ?? maxHp;
  const dealt = state.damage.mul(seconds);

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
  const portalId = dungeon.drops.portalResource.resource;
  let pity = state.pity[bossId] ?? 0;
  let portal = 0;
  let rares = 0;
  for (let i = 0; i < kills; i++) {
    const roll = rollBossDrop(dungeon.drops, pity, rng);
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
