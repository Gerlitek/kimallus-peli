import type { ObstacleKind } from '../data/obstacles';
import type { Rng } from './random';

/** Cupcake size for collecting. */
export const CUPCAKE = { w: 32, h: 40 } as const;

/** A cupcake position: dx from a reference x, h = bottom edge's height above the ground. */
export interface Spot {
  dx: number;
  h: number;
}

/** A row on the ground: collected just by running. */
export const ROW: readonly Spot[] = [
  { dx: 0, h: 4 },
  { dx: 48, h: 4 },
  { dx: 96, h: 4 },
];

/** An arc of at most three over an obstacle, centred on it: collected by jumping over at the right moment. */
export function arcOver(kind: ObstacleKind): readonly Spot[] {
  if (kind === 'river') {
    // Along the long jump over the river
    return [
      { dx: -60, h: 100 },
      { dx: 0, h: 130 },
      { dx: 60, h: 100 },
    ];
  }
  if (kind === 'mom') {
    return [
      { dx: -55, h: 95 },
      { dx: 0, h: 130 },
      { dx: 55, h: 95 },
    ];
  }
  if (kind === 'rainbow') {
    // Above the rainbow bar: only a held, high jump reaches them.
    return [
      { dx: -50, h: 150 },
      { dx: 0, h: 172 },
      { dx: 50, h: 150 },
    ];
  }
  return [
    { dx: -45, h: 85 },
    { dx: 0, h: 112 },
    { dx: 45, h: 85 },
  ];
}

export type CupcakePlan = 'none' | 'arc' | 'row';

/** What to place with a new obstacle: an arc over it, a row after it, or nothing. */
export function planCupcakes(rng: Rng): CupcakePlan {
  const r = rng();
  if (r < 0.35) return 'arc';
  if (r < 0.55) return 'row';
  return 'none';
}
