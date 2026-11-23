/**
 * Score is counted in lumens, the unit of light. Most light comes from what you collect
 * and from cheering clouds up; the ride itself gives only a little.
 */
export const LUMENS = {
  /** Distance for one lumen. */
  distancePerLumen: 200,
  star: 5,
  cloud: 10,
} as const;

/** Lumens from distance travelled, plus lumens collected. */
export function scoreFor(distance: number, bonus = 0): number {
  return Math.floor(distance / LUMENS.distancePerLumen) + bonus;
}

/** First station appears after this distance. */
export const FIRST_STATION_AT = 1800;
/** Distance to the next station after one was visited. */
export const STATION_EVERY = 6000;
/** A missed station comes back sooner. */
export const STATION_RETRY = 2500;
