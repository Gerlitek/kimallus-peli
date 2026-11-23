import type { ObstacleDef } from '../data/obstacles';
import type { Rng } from './random';

/** Picks an obstacle by weight among those unlocked at this distance. */
export function pickObstacle(defs: readonly ObstacleDef[], distance: number, rng: Rng): ObstacleDef {
  const open = defs.filter((d) => d.unlockAt <= distance);
  const pool = open.length > 0 ? open : [defs[0]];
  const total = pool.reduce((sum, d) => sum + d.weight, 0);
  let roll = rng() * total;
  for (const d of pool) {
    roll -= d.weight;
    if (roll < 0) return d;
  }
  return pool[pool.length - 1];
}

/** Empty space after an obstacle: `gap` is in seconds (set per level), so it stays fair at every speed. */
export function gapAfter(speed: number, rng: Rng, gap: { min: number; max: number }): number {
  return speed * (gap.min + rng() * (gap.max - gap.min));
}
