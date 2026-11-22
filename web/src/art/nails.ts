import type { Polish } from '../data/polishes';
import { seeded } from '../logic/random';
import { blob, smoothClosed } from './shapes';
import { drawTwinkle, flash } from './sparkle';

/** Fills a path with a polish: base colour, depth, metallic shine and glitter. */
export function fillPolish(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  box: { x: number; y: number; w: number; h: number },
  polish: Polish,
  t: number,
  seed: number,
  /** Larger values give finer glitter, for shapes drawn small and scaled up. */
  detail = 1,
): void {
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  g.addColorStop(0, polish.color);
  g.addColorStop(1, polish.shade);
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  if (polish.metallic) {
    const band = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    band.addColorStop(0.25, 'rgba(255,255,255,0)');
    band.addColorStop(0.45, 'rgba(255,255,240,0.6)');
    band.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }

  if (polish.glitter) {
    const rng = seeded(seed);
    const count = Math.max(12, Math.round(((box.w * box.h) / 70) * detail * detail));
    for (let i = 0; i < count; i++) {
      const x = box.x + rng() * box.w;
      const y = box.y + rng() * box.h;
      const color = polish.glitter[Math.floor(rng() * polish.glitter.length)];
      const phase = rng() * 6;
      ctx.globalAlpha = 0.45 + flash(t, 3, phase) * 0.55;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, (1.6 + rng() * 1.6) / detail, (1.6 + rng() * 1.6) / detail);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const f = flash(t, 2.2 + i * 0.5, seed + i * 2);
      drawTwinkle(ctx, box.x + rng() * box.w, box.y + rng() * box.h, 6 / detail, f, '#ffffff', t + i);
    }
  }

  // Glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill(blob(box.x + box.w * 0.3, box.y + box.h * 0.3, box.w * 0.12, box.h * 0.22, { seed }));
  ctx.restore();
}

/** The bottle's brush: gold cap as the handle, bristles dipped in polish. Tip at (x, y). */
export function drawBrush(ctx: CanvasRenderingContext2D, x: number, y: number, polish: Polish, angle = -0.45, scale = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  // Stem
  ctx.fillStyle = '#d9c3e6';
  ctx.fillRect(-1.5, -46, 3, 26);
  // Cap as the handle
  const cap = ctx.createLinearGradient(-10, 0, 10, 0);
  cap.addColorStop(0, '#f5b85c');
  cap.addColorStop(0.45, '#fff1b8');
  cap.addColorStop(1, '#e0a447');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.roundRect(-10, -84, 20, 40, 8);
  ctx.fill();
  // Bristles, tapered and wet with polish
  ctx.fillStyle = polish.color;
  ctx.beginPath();
  ctx.moveTo(-5, -22);
  ctx.quadraticCurveTo(-6, -6, 0, 0);
  ctx.quadraticCurveTo(6, -6, 5, -22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(-2.5, -19, 1.5, 12);
  ctx.restore();
}

/** A nail polish bottle standing on (x, bottom). */
export function drawBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  bottom: number,
  polish: Polish,
  t: number,
  seed: number,
  scale = 1,
): void {
  ctx.save();
  ctx.translate(x, bottom);
  ctx.scale(scale, scale);

  // Cap
  const cap = ctx.createLinearGradient(-11, 0, 11, 0);
  cap.addColorStop(0, '#f5b85c');
  cap.addColorStop(0.45, '#fff1b8');
  cap.addColorStop(1, '#e0a447');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.roundRect(-11, -92, 22, 38, 8);
  ctx.fill();

  // Glass and lacquer
  const glass = smoothClosed(
    [
      [-14, -58],
      [14, -58],
      [26, -36],
      [24, -6],
      [0, 0],
      [-24, -6],
      [-26, -36],
    ],
    0.7,
  );
  fillPolish(ctx, glass, { x: -27, y: -60, w: 54, h: 61 }, polish, t, seed);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2.5;
  ctx.stroke(glass);
  // Little heart label
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.bezierCurveTo(-9, -24, -6, -33, 0, -28);
  ctx.bezierCurveTo(6, -33, 9, -24, 0, -18);
  ctx.fill();

  ctx.restore();
}
