import { POLISHES, type Polish } from '../data/polishes';
import { STROKES_PER_NAIL } from '../logic/nails';
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
  // The shape's uneven edge can reach a little outside its box: paint past the box, the clip keeps it tidy.
  const pad = Math.max(box.w, box.h) * 0.2;
  ctx.fillRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);

  if (polish.metallic) {
    const band = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    band.addColorStop(0.25, 'rgba(255,255,255,0)');
    band.addColorStop(0.45, 'rgba(255,255,240,0.6)');
    band.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
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

/**
 * Paints a nail from its brush strokes: each coat is a band side by side, in its own polish.
 * `reach` tells how far down a coat has got, 0..1 (a stroke still being painted).
 * The nail station and the ride both use this, so the hooves look the same in both.
 */
export function fillCoats(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  box: { x: number; y: number; w: number; h: number },
  coats: readonly string[],
  t: number,
  seed: number,
  detail: number,
  reach: (coat: number) => number = () => 1,
): void {
  const band = box.w / STROKES_PER_NAIL;
  const pad = Math.max(box.w, box.h) * 0.2;
  coats.forEach((id, s) => {
    const polish = POLISHES.find((p) => p.id === id);
    if (!polish) return;
    ctx.save();
    ctx.beginPath();
    // The outermost bands and the top and bottom reach past the box, so the nail's uneven edge is covered too.
    const left = s === 0 ? box.x - pad : box.x + s * band - 0.2;
    const right = s === STROKES_PER_NAIL - 1 ? box.x + box.w + pad : box.x + (s + 1) * band + 0.2;
    ctx.rect(left, box.y - pad, right - left, (box.h + pad * 2) * reach(s));
    ctx.clip();
    fillPolish(ctx, path, box, polish, t, seed, detail);
    ctx.restore();
  });
}

/**
 * The bottle's brush: gold cap as the handle and a flat tuft of soft bristles, wet with polish.
 * The bristle tips touch (x, y). `bend` 0..1 drags the handle ahead (down), so the bristles curve and spread
 * behind it like a real brush pulled along a nail.
 */
export function drawBrush(ctx: CanvasRenderingContext2D, x: number, y: number, polish: Polish, angle = 0.45, scale = 1, bend = 0): void {
  const len = 24 * scale;
  // Handle direction (up and to the side) and its normal
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const nx = -dy;
  const ny = dx;
  // Where the bristles leave the handle, and the point they curve around
  const bx = x + dx * len * (1 - bend * 0.35);
  const by = y + dy * len * (1 - bend * 0.35) + bend * len * 0.55;
  const cx = bx - dx * len * 0.6;
  const cy = by - dy * len * 0.6;
  const root = 3.5 * scale;
  const tip = (5.5 + bend * 2) * scale;

  const tuft = new Path2D();
  tuft.moveTo(bx - nx * root, by - ny * root);
  tuft.quadraticCurveTo(cx - nx * tip, cy - ny * tip, x - nx * tip, y - ny * tip);
  tuft.lineTo(x + nx * tip, y + ny * tip);
  tuft.quadraticCurveTo(cx + nx * tip, cy + ny * tip, bx + nx * root, by + ny * root);
  tuft.closePath();
  ctx.fillStyle = polish.color;
  ctx.fill(tuft);
  // Single bristles
  ctx.strokeStyle = polish.shade;
  ctx.lineWidth = 0.5 * scale;
  ctx.lineCap = 'round';
  for (const f of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(bx + nx * root * f, by + ny * root * f);
    ctx.quadraticCurveTo(cx + nx * tip * f, cy + ny * tip * f, x + nx * tip * f * 1.2, y + ny * tip * f * 1.2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  // Stem
  ctx.fillStyle = '#d9c3e6';
  ctx.fillRect(-1.5, -24, 3, 22);
  ctx.fillRect(-3.5, -4, 7, 5);
  // Cap as the handle
  const cap = ctx.createLinearGradient(-10, 0, 10, 0);
  cap.addColorStop(0, '#f5b85c');
  cap.addColorStop(0.45, '#fff1b8');
  cap.addColorStop(1, '#e0a447');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.roundRect(-10, -62, 20, 40, 8);
  ctx.fill();
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
