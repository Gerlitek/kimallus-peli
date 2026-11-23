import { PALETTE as C } from './palette';
import { blob, heart, softStar } from './shapes';
import { drawTwinkle, flash } from './sparkle';

const FROSTING = ['#ff6fb0', '#ffd1ea', '#e7c9ff', '#ffe0b8'] as const;

/** A cupcake with swirly frosting and sprinkles; the topping is a heart or a star. (x, bottom) is the base centre. */
export function drawCupcake(ctx: CanvasRenderingContext2D, x: number, bottom: number, t: number, seed: number): void {
  // Soft glow, so cupcakes read as things to collect
  const glow = ctx.createRadialGradient(x, bottom - 22, 2, x, bottom - 22, 34);
  glow.addColorStop(0, 'rgba(255,255,255,0.45)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 34, bottom - 56, 68, 68);

  const wrapper = new Path2D();
  wrapper.moveTo(x - 13, bottom);
  wrapper.lineTo(x + 13, bottom);
  wrapper.lineTo(x + 17, bottom - 18);
  wrapper.lineTo(x - 17, bottom - 18);
  wrapper.closePath();
  const swirl = [
    blob(x, bottom - 22, 20, 9, { seed }),
    blob(x - 1, bottom - 30, 15, 8, { seed: seed + 1 }),
    blob(x + 1, bottom - 37, 9, 6, { seed: seed + 2 }),
  ];

  // A white edge all around, like a sticker: the cupcake stands out from the pink sky.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  for (const part of [wrapper, ...swirl]) ctx.stroke(part);

  // Pleated wrapper
  ctx.fillStyle = '#8f63e8';
  ctx.fill(wrapper);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(x + k * 13, bottom - 1);
    ctx.lineTo(x + k * 17, bottom - 17);
    ctx.stroke();
  }

  // Frosting swirl
  const frosting = FROSTING[seed % FROSTING.length];
  ctx.fillStyle = frosting;
  for (const part of swirl) ctx.fill(part);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill(blob(x - 7, bottom - 33, 4, 2.5, { seed }));

  // Sprinkles
  for (let i = 0; i < 7; i++) {
    const a = seed * 1.7 + i * 2.1;
    const sx = x + Math.cos(a) * 13;
    const sy = bottom - 27 + Math.sin(a * 1.3) * 7;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.fillStyle = C.rainbow[(seed + i) % C.rainbow.length];
    ctx.fillRect(-2.5, -1, 5, 2);
    ctx.restore();
  }

  // Topping: hearts and stars take turns
  if (seed % 2 === 0) {
    ctx.fillStyle = '#e8304a';
    ctx.fill(heart(x + 1, bottom - 45, 7));
  } else {
    ctx.fillStyle = '#ffd86b';
    ctx.fill(softStar(x + 1, bottom - 46, 8, 3.6, Math.sin(t * 2 + seed) * 0.2));
  }
  drawTwinkle(ctx, x + 12, bottom - 44, 5, flash(t, 2.5, seed));
}
