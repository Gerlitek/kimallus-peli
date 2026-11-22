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

/** Empty space after an obstacle, as time at the current speed so it stays fair when the game speeds up. */
export function gapAfter(speed: number, rng: Rng, minTime = 1.1, maxTime = 2.1): number {
  return speed * (minTime + rng() * (maxTime - minTime));
}
