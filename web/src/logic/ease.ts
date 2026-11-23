/** Smooth start and stop for k in 0..1: calm movement without sudden jumps. */
export function easeInOut(k: number): number {
  const c = Math.max(0, Math.min(1, k));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}
