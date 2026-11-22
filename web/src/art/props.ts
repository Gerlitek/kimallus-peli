import { PALETTE as C } from './palette';
import { blob, smoothClosed } from './shapes';
import { drawTwinkle, flash } from './sparkle';

/** A glittering, soft-faceted diamond standing on the ground. (x, groundY) is its bottom-left corner. */
export function drawDiamond(ctx: CanvasRenderingContext2D, x: number, groundY: number, t: number): void {
  const top = groundY - 62;
  const cx = x + 28;
  const seed = x * 0.013;

  // Halo
  const halo = ctx.createRadialGradient(cx, top + 30, 4, cx, top + 30, 44);
  halo.addColorStop(0, 'rgba(255,255,255,0.18)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 44, top - 14, 88, 88);

  const gem = smoothClosed(
    [
      [x + 12, top],
      [x + 44, top],
      [x + 56, top + 18],
      [x + 28, groundY],
      [x, top + 18],
    ],
    0.15,
  );
  // Colours shift slowly, like light moving through the stone.
  const shift = Math.sin(t * 1.5 + seed) * 20;
  const g = ctx.createLinearGradient(x - shift, top, x + 56 + shift, groundY);
  g.addColorStop(0, C.gem[0]);
  g.addColorStop(0.5, C.gem[1]);
  g.addColorStop(1, C.gem[2]);
  ctx.fillStyle = g;
  ctx.fill(gem);

  // Facets: lighter crown, darker pavilion halves
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(x + 12, top);
  ctx.lineTo(x + 44, top);
  ctx.lineTo(x + 36, top + 18);
  ctx.lineTo(x + 20, top + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(150,80,200,0.15)';
  ctx.beginPath();
  ctx.moveTo(x + 36, top + 18);
  ctx.lineTo(x + 56, top + 18);
  ctx.lineTo(x + 28, groundY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 1, top + 18);
  ctx.lineTo(x + 55, top + 18);
  ctx.moveTo(x + 12, top);
  ctx.lineTo(x + 20, top + 18);
  ctx.lineTo(x + 28, groundY - 2);
  ctx.lineTo(x + 36, top + 18);
  ctx.lineTo(x + 44, top);
  ctx.stroke();

  // A band of light sweeps across now and then.
  const sweep = ((t * 0.6 + seed) % 3) / 1.2;
  if (sweep < 1) {
    ctx.save();
    ctx.clip(gem);
    const sx = x - 30 + sweep * 116;
    const band = ctx.createLinearGradient(sx - 14, 0, sx + 14, 0);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.translate(sx, top + 31);
    ctx.rotate(0.35);
    ctx.fillRect(-14, -50, 28, 100);
    ctx.restore();
  }

  // Sparkles on the corners, each on its own rhythm
  const points: Array<[number, number, number]> = [
    [x + 44, top + 1, 7],
    [x + 12, top + 2, 5],
  ];
  points.forEach(([px, py, size], i) => {
    const f = flash(t, 2 + i * 0.7, seed + i * 1.9);
    drawTwinkle(ctx, px, py, size * (0.5 + f * 0.7), f * 0.6, '#ffffff', t + i);
  });
}

/** A fluffy cloud made of overlapping blobs. */
export function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, seed: number): void {
  ctx.fillStyle = C.cloud;
  const parts: Array<[number, number, number]> = [
    [-0.55, 0.1, 0.5],
    [0, -0.2, 0.62],
    [0.55, 0.08, 0.5],
    [0, 0.25, 0.55],
  ];
  for (const [dx, dy, r] of parts) {
    ctx.fill(blob(cx + dx * size, cy + dy * size, r * size, r * size * 0.85, { seed: seed + dx * 10 }));
  }
}

/** A rainbow bar resting on two clouds, like a hurdle. (x, groundY) is the bottom-left corner. */
export function drawRainbowHurdle(ctx: CanvasRenderingContext2D, x: number, groundY: number, t: number): void {
  const cx = x + 90;
  const cy = groundY - 18;
  ctx.lineCap = 'round';
  C.rainbow.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, 92 - i * 7, Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  // Sparkles travelling along the arc
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (1.1 + ((t * 0.25 + i / 5) % 1) * 0.8);
    const r = 92 - (i % 3) * 14;
    drawTwinkle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 7, 0.3 + flash(t, 4, i * 1.3) * 0.7, '#ffffff', t + i);
  }
  // Clouds sit on the rainbow's feet and hide its ends.
  drawCloud(ctx, cx - 74, groundY - 22, 38, 1);
  drawCloud(ctx, cx + 74, groundY - 22, 38, 2);
}
