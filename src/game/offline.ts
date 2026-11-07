import type { Content } from '../data';
import { Decimal } from './num';
import type { Rng } from './rng';
import type { GameState } from './state';
import { advanceChunked } from './tick';

/** Offline progress is capped at 8 hours. */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
/** Below this, nothing is simulated and no summary is shown. */
export const MIN_OFFLINE_MS = 10_000;
const OFFLINE_CHUNK_MS = 60_000;

export interface OfflineSummary {
  /** Real time since the last save. */
  elapsedMs: number;
  /** Time actually simulated (elapsed, capped). */
  simulatedMs: number;
  capped: boolean;
  /** Resource id -> amount gained while away (only positive gains). */
  gains: Record<string, Decimal>;
  bossKills: number;
  drops: Record<string, number>;
}

/** Simulates the time between `savedAtMs` and `nowMs`, capped at OFFLINE_CAP_MS. */
export function simulateOffline(
  state: GameState,
  content: Content,
  savedAtMs: number,
  nowMs: number,
  rng: Rng,
): { state: GameState; summary: OfflineSummary | null } {
  const elapsedMs = nowMs - savedAtMs;
  // Clock moved backwards, or the gap is too small to be worth reporting.
  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_OFFLINE_MS) {
    return { state, summary: null };
  }

  const simulatedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
  const result = advanceChunked(state, content, simulatedMs, rng, OFFLINE_CHUNK_MS);

  const gains: Record<string, Decimal> = {};
  for (const [id, after] of Object.entries(result.state.resources)) {
    const gained = after.sub(state.resources[id] ?? new Decimal(0));
    if (gained.gt(0)) gains[id] = gained;
  }

  return {
    state: result.state,
    summary: {
      elapsedMs,
      simulatedMs,
      capped: elapsedMs > OFFLINE_CAP_MS,
      gains,
      bossKills: result.report.bossKills,
      drops: result.report.drops,
    },
  };
}
