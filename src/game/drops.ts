import type { Dungeon } from '../data';
import type { Rng } from './rng';

export interface BossDropResult {
  /** The rare item dropped on this kill. */
  rare: boolean;
  /** New pity counter: consecutive kills without the rare item. */
  pity: number;
  /** Portal resource units granted by this kill. */
  portal: number;
}

/**
 * Rolls one boss kill.
 * - The rare item drops with `chance`, or is guaranteed once `pityThreshold - 1` kills in a row
 *   missed (so the threshold-th kill always drops). A drop resets the counter.
 * - The portal resource is granted on every kill, uniformly in [min, max].
 */
export function rollBossDrop(drops: Dungeon['drops'], pity: number, rng: Rng): BossDropResult {
  const { rare, portalResource } = drops;
  const guaranteed = pity + 1 >= rare.pityThreshold;
  const dropped = guaranteed || rng() < rare.chance;
  const span = portalResource.max - portalResource.min + 1;
  const portal = portalResource.min + Math.floor(rng() * span);
  return { rare: dropped, pity: dropped ? 0 : pity + 1, portal };
}
