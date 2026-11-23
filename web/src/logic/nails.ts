/** Nail polish station rules: four nails, three brush strokes each, points for each finished nail, a bonus for all four. */

export const NAIL_COUNT = 4;
/** Brush strokes, side by side, that cover one nail. */
export const STROKES_PER_NAIL = 3;
export const POINTS_PER_NAIL = 5;
export const COMPLETION_BONUS = 10;

/** Polish id per nail, or null when the nail is still bare. */
export type Nails = readonly (string | null)[];

export function bareNails(count = NAIL_COUNT): Nails {
  return Array.from({ length: count }, () => null);
}

export interface PaintResult {
  nails: Nails;
  /** Points earned by this stroke. Repainting a nail is allowed but earns nothing. */
  points: number;
}

export function paint(nails: Nails, index: number, polishId: string): PaintResult {
  if (index < 0 || index >= nails.length) return { nails, points: 0 };
  const wasBare = nails[index] === null;
  const next = nails.map((n, i) => (i === index ? polishId : n));
  let points = wasBare ? POINTS_PER_NAIL : 0;
  if (wasBare && isComplete(next)) points += COMPLETION_BONUS;
  return { nails: next, points };
}

export function isComplete(nails: Nails): boolean {
  return nails.every((n) => n !== null);
}

/** Moves the polish selection left or right, wrapping around. */
export function cycle(index: number, step: number, count: number): number {
  return (((index + step) % count) + count) % count;
}
