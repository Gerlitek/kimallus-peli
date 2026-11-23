export type ObstacleKind = 'diamond' | 'rainbow' | 'porridge' | 'river';

export interface ObstacleDef {
  kind: ObstacleKind;
  /** Drawn width. */
  width: number;
  /** Hit box relative to the obstacle's left edge. Kept smaller than the drawing to be forgiving. */
  hit: { dx: number; w: number; h: number };
  /** The jump it needs at the slowest speed: a tap or a held, long jump. Tested in physics.test.ts. */
  jump: 'tap' | 'hold';
  /** Relative chance once unlocked. */
  weight: number;
  /** Distance travelled before this obstacle can appear. */
  unlockAt: number;
}

export const OBSTACLES: readonly ObstacleDef[] = [
  // A short tap clears a diamond.
  { kind: 'diamond', width: 56, hit: { dx: 10, w: 36, h: 46 }, jump: 'tap', weight: 3, unlockAt: 0 },
  // A rainbow bar resting on two clouds needs a held, high jump.
  { kind: 'rainbow', width: 180, hit: { dx: 66, w: 48, h: 104 }, jump: 'hold', weight: 2, unlockAt: 2500 },
  // Mum has left a bowl of hot porridge to cool: a small hop over it, and only now and then.
  { kind: 'porridge', width: 70, hit: { dx: 16, w: 38, h: 34 }, jump: 'tap', weight: 0.7, unlockAt: 3500 },
  // A river of tumbling diamonds: low but long, a held jump carries over it.
  { kind: 'river', width: 190, hit: { dx: 40, w: 110, h: 18 }, jump: 'hold', weight: 1.5, unlockAt: 5000 },
];
