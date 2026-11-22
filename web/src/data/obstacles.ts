export type ObstacleKind = 'diamond' | 'rainbow';

export interface ObstacleDef {
  kind: ObstacleKind;
  /** Drawn width. */
  width: number;
  /** Hit box relative to the obstacle's left edge. Kept smaller than the drawing to be forgiving. */
  hit: { dx: number; w: number; h: number };
  /** Relative chance once unlocked. */
  weight: number;
  /** Distance travelled before this obstacle can appear. */
  unlockAt: number;
}

export const OBSTACLES: readonly ObstacleDef[] = [
  // A short tap clears a diamond.
  { kind: 'diamond', width: 56, hit: { dx: 10, w: 36, h: 46 }, weight: 3, unlockAt: 0 },
  // A rainbow bar resting on two clouds needs a held, high jump.
  { kind: 'rainbow', width: 180, hit: { dx: 45, w: 90, h: 112 }, weight: 2, unlockAt: 2500 },
];
