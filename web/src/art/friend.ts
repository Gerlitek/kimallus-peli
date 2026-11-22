import { PALETTE as C } from './palette';
import { blob, heart, softStar } from './shapes';
import { drawTwinkle, flash } from './sparkle';

/** A chubby little star friend. Hopeful: big shiny eyes; happy: closed smiling eyes. */
export function drawStarFriend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  mood: 'hopeful' | 'happy',
): void {
  const bob = Math.sin(t * 3) * 4;
  const cy = y + bob;
  const glow = ctx.createRadialGradient(x, cy, size * 0.3, x, cy, size * 1.8);
  glow.addColorStop(0, 'rgba(255, 245, 190, 0.6)');
  glow.addColorStop(1, 'rgba(255, 245, 190, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 1.8, cy - size * 1.8, size * 3.6, size * 3.6);

  const g = ctx.createLinearGradient(x, cy - size, x, cy + size);
  g.addColorStop(0, '#fff2a6');
  g.addColorStop(1, '#ffc46b');
  ctx.fillStyle = g;
  ctx.fill(softStar(x, cy, size, size * 0.62, Math.sin(t * 2) * 0.06));

  const ex = size * 0.24;
  const ey = cy - size * 0.05;
  ctx.fillStyle = C.eye;
  ctx.strokeStyle = C.eye;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  if (mood === 'hopeful') {
    for (const s of [-1, 1]) {
      ctx.fill(blob(x + s * ex, ey, size * 0.09, size * 0.12));
      ctx.fillStyle = '#fff';
      ctx.fill(blob(x + s * ex + 2, ey - 3, size * 0.035, size * 0.045));
      ctx.fillStyle = C.eye;
    }
    ctx.beginPath();
    ctx.arc(x, cy + size * 0.2, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * ex, ey + 2, size * 0.08, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#e0458f';
    ctx.beginPath();
    ctx.arc(x, cy + size * 0.15, size * 0.12, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = C.blush;
  ctx.globalAlpha = 0.6;
  ctx.fill(blob(x - size * 0.38, cy + size * 0.12, size * 0.1, size * 0.06));
  ctx.fill(blob(x + size * 0.38, cy + size * 0.12, size * 0.1, size * 0.06));
  ctx.globalAlpha = 1;
  if (mood === 'happy') {
    ctx.fillStyle = C.heart;
    ctx.fill(heart(x + size * 0.9, cy - size * 0.9 - Math.sin(t * 4) * 4, size * 0.16));
  }
  drawTwinkle(ctx, x - size * 0.9, cy - size * 0.7, size * 0.18, flash(t, 2.5, 1));
}
