import { softStar } from './shapes';
import { drawTwinkle, flash } from './sparkle';

const COLORS = ['#fff2a6', '#ffd9ef', '#d9f4ff'] as const;

/** A plump little star to collect. (x, bottom) is the centre of its lower edge. */
export function drawStar(ctx: CanvasRenderingContext2D, x: number, bottom: number, t: number, seed: number): void {
  const cy = bottom - 17;
  // Soft glow, so stars read as things to collect
  const glow = ctx.createRadialGradient(x, cy, 2, x, cy, 32);
  glow.addColorStop(0, 'rgba(255,255,255,0.5)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 32, cy - 32, 64, 64);

  const tilt = Math.sin(t * 1.5 + seed) * 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.fill(softStar(x, cy, 18, 9.5, tilt));
  ctx.fillStyle = COLORS[seed % COLORS.length];
  ctx.fill(softStar(x, cy, 15, 7.5, tilt));
  drawTwinkle(ctx, x + 11, cy - 12, 5, flash(t, 2, seed));
}
