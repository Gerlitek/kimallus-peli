import { softStar } from './shapes';

/** A four-pointed twinkle with a soft glow. `alpha` 0..1 fades it in and out. */
export function drawTwinkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  color = '#ffffff',
  rotation = 0,
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.6);
  glow.addColorStop(0, 'rgba(255,255,255,0.75)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 1.6, y - size * 1.6, size * 3.2, size * 3.2);
  ctx.fillStyle = color;
  ctx.fill(softStar(x, y, size, size * 0.18, rotation, 4));
  ctx.restore();
}

/** 0..1 pulse that stays dark most of the time and flashes briefly: reads as a sparkle, not a blink. */
export function flash(t: number, speed: number, phase: number): number {
  const s = (Math.sin(t * speed + phase) + 1) / 2;
  return s * s * s;
}

export const GLITTER_COLORS = ['#ffffff', '#fff1a8', '#ffc2e6', '#c9f3ff', '#e2ccff'] as const;
