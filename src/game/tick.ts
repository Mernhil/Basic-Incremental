import type { Content } from '../data';
import { advanceCombat, advanceHarvestBursts } from './combat';
import { collectModifiers } from './modifiers';
import { Decimal } from './num';
import { productionPerSecond } from './production';
import { emptyReport, mergeReports, type TickReport } from './report';
import type { Rng } from './rng';
import { cloneState, type GameState } from './state';

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

  // Production: every active plot/slot yields its producer's rate per second.
  for (const [resource, perSecond] of Object.entries(
    productionPerSecond(state, content, modifiers),
  )) {
    const current = next.resources[resource] ?? new Decimal(0);
    next.resources[resource] = current.add(perSecond.mul(seconds));
  }
  // Harvest bursts: production ticks fill each job's gauge; full = a bonus harvest.
  advanceHarvestBursts(next, state, content, seconds, report, modifiers);

  // Combat: the boss is auto-fought in parallel and respawns for farming.
  advanceCombat(next, content, seconds, rng, report, modifiers);

  return { state: next, report };
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
