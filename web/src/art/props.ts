import { PALETTE as C } from './palette';
import { blob, smoothClosed, softStar } from './shapes';
import { drawTwinkle, flash } from './sparkle';
import { drawBowl } from './ui';

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

/**
 * "Syömään!": mum in a classic flowery dress and brown curls, waving the player in to eat,
 * a bowl of food in her other hand. She waves harder as the unicorn comes close (`excite` 0..1).
 * (x, groundY) is the bottom-left corner.
 */
export function drawMom(ctx: CanvasRenderingContext2D, x: number, groundY: number, t: number, excite: number): void {
  const cx = x + 40;
  const gy = groundY;
  const skin = '#ffd9c2';
  const hair = '#8a5a3c';
  const dress = '#a9d8ff';

  // Shoes peeking out under the dress
  ctx.fillStyle = '#e0458f';
  ctx.fill(blob(cx - 9, gy - 3, 7, 4, { seed: 1 }));
  ctx.fill(blob(cx + 9, gy - 3, 7, 4, { seed: 2 }));

  // Long, flared dress with a flower print
  const dressPath = smoothClosed(
    [
      [cx - 13, gy - 62],
      [cx + 13, gy - 62],
      [cx + 30, gy - 8],
      [cx, gy - 4],
      [cx - 30, gy - 8],
    ],
    0.7,
  );
  ctx.fillStyle = dress;
  ctx.fill(dressPath);
  ctx.save();
  ctx.clip(dressPath);
  const flowers: Array<[number, number, string]> = [
    [-16, -14, '#ff7fb6'], [6, -22, '#ffffff'], [20, -10, '#ff7fb6'], [-6, -38, '#ffe27a'],
    [12, -46, '#ff7fb6'], [-20, -30, '#ffffff'], [0, -10, '#ffe27a'], [-2, -54, '#ffffff'],
  ];
  for (const [fx, fy, color] of flowers) {
    ctx.fillStyle = color;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + fx + Math.cos(a) * 3, gy + fy + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath();
    ctx.arc(cx + fx, gy + fy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // White collar
  ctx.fillStyle = '#ffffff';
  ctx.fill(blob(cx - 5, gy - 61, 7, 4, { seed: 3 }));
  ctx.fill(blob(cx + 5, gy - 61, 7, 4, { seed: 4 }));

  // Waving arm, up high: friendly, never toward the unicorn
  const wave = Math.sin(t * (6 + excite * 6)) * (0.35 + excite * 0.25);
  const sx = cx + 12;
  const sy = gy - 56;
  const hx = sx + 14 + Math.sin(wave) * 10;
  const hy = sy - 26 - Math.cos(wave) * 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = dress;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo((sx + hx) / 2, (sy + hy) / 2);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo((sx + hx) / 2, (sy + hy) / 2);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.fill(blob(hx, hy - 2, 6, 6, { seed: 5 }));

  // Other arm holds the bowl in front
  ctx.strokeStyle = skin;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - 12, gy - 54);
  ctx.quadraticCurveTo(cx - 22, gy - 40, cx - 14, gy - 34);
  ctx.stroke();
  drawBowl(ctx, cx - 16, gy - 34, t);

  // Brown curls behind and around the face
  const hy0 = gy - 80;
  ctx.fillStyle = hair;
  const curls: Array<[number, number, number]> = [
    [-14, -10, 8], [14, -10, 8], [-17, 2, 7], [17, 2, 7], [-15, 13, 7], [15, 13, 7],
    [-8, -16, 8], [8, -16, 8], [0, -18, 8], [-18, 20, 6], [18, 20, 6],
  ];
  for (const [dx, dy, r] of curls) {
    ctx.beginPath();
    ctx.arc(cx + dx, hy0 + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Face
  ctx.fillStyle = skin;
  ctx.fill(blob(cx, hy0 + 2, 13, 14, { seed: 9, wobble: 0.02 }));
  // Fringe of small curls
  ctx.fillStyle = hair;
  for (const dx of [-8, -2, 4, 9]) {
    ctx.beginPath();
    ctx.arc(cx + dx, hy0 - 10, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Smiling closed eyes with lashes, rosy cheeks, a happy calling mouth
  ctx.strokeStyle = C.eye;
  ctx.lineWidth = 1.8;
  for (const ex of [cx - 5, cx + 5]) {
    ctx.beginPath();
    ctx.arc(ex, hy0 + 1, 3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.fillStyle = C.blush;
  ctx.globalAlpha = 0.55;
  ctx.fill(blob(cx - 8, hy0 + 7, 3.5, 2.2));
  ctx.fill(blob(cx + 8, hy0 + 7, 3.5, 2.2));
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e0458f';
  ctx.beginPath();
  ctx.arc(cx, hy0 + 8, 3.6 + Math.abs(Math.sin(t * 8)) * 0.8, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  // Speech bubble with a bowl of food: "time to eat", without words
  const by = gy - 132 + Math.sin(t * 6) * 3;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#a9d8ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - 28, by - 24, 56, 44, 22);
  ctx.moveTo(cx - 6, by + 19);
  ctx.lineTo(cx + 2, by + 31);
  ctx.lineTo(cx + 8, by + 19);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(cx - 5, by + 15, 12, 6);
  drawBowl(ctx, cx, by + 4, t);
}

/**
 * A sparkle river that splits the whole landscape: a see-through stream of starlight falls from the top
 * of the sky, splashes down and flows on as deep blue water through the cloud floor, carrying gems.
 * Only the water at ground level is the obstacle. (x, groundY) is the bottom-left corner.
 */
export function drawRiver(ctx: CanvasRenderingContext2D, x: number, groundY: number, t: number): void {
  const w = 190;
  const bottom = 560;
  const surface = groundY - 2;

  // Starlight falling from the top of the sky: see-through, so the stars still show.
  const fall = ctx.createLinearGradient(0, 0, 0, surface);
  fall.addColorStop(0, 'rgba(150, 215, 255, 0.12)');
  fall.addColorStop(1, 'rgba(110, 200, 255, 0.5)');
  ctx.fillStyle = fall;
  ctx.fillRect(x + 22, 0, w - 44, surface);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 22, 0, w - 44, surface);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const lx = x + 34 + i * 24;
    const y = ((((i * 67 + t * 120) % (surface + 60)) + surface + 60) % (surface + 60)) - 60;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx, y + 40);
    ctx.stroke();
  }
  // Small stars falling with the stream
  for (let i = 0; i < 5; i++) {
    const sx = x + 40 + ((i * 29) % (w - 80));
    const sy = (((i * 113 + t * 70) % surface) + surface) % surface;
    ctx.fillStyle = i % 2 ? '#fff3a8' : '#ffffff';
    ctx.fill(softStar(sx, sy, 5, 2.2, t + i));
  }
  ctx.restore();

  // Water: a wavy surface, straight down to the bottom of the screen
  const water = new Path2D();
  water.moveTo(x + 6, bottom);
  water.lineTo(x + 6, surface);
  for (let i = 0; i <= w - 12; i += 6) {
    water.lineTo(x + 6 + i, surface + Math.sin(i * 0.09 + t * 4) * 3);
  }
  water.lineTo(x + w - 6, bottom);
  water.closePath();
  const g = ctx.createLinearGradient(0, surface, 0, bottom);
  g.addColorStop(0, '#5fc4ff');
  g.addColorStop(0.5, '#3d86e0');
  g.addColorStop(1, '#5b4fc9');
  ctx.fillStyle = g;
  ctx.fill(water);

  ctx.save();
  ctx.clip(water);
  // Flowing streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let row = 0; row < 5; row++) {
    const y = surface + 22 + row * 18;
    for (let k = 0; k < 3; k++) {
      const sx = x + ((((k * 70 + row * 31 - t * 90) % w) + w) % w);
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.quadraticCurveTo(sx + 12, y - 4, sx + 26, y);
      ctx.stroke();
    }
  }
  // Gems carried along by the stream
  for (let i = 0; i < 6; i++) {
    const px = x + ((((i * 41 - t * 60) % w) + w) % w);
    const py = surface + 30 + (i % 3) * 26 + Math.sin(t * 3 + i) * 3;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(t * 1.5 + i);
    ctx.fillStyle = C.gem[i % C.gem.length];
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Splash where the starlight meets the river
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 4; i++) {
    const sx = x + 40 + i * 36;
    ctx.fill(blob(sx, surface - 3 - Math.abs(Math.sin(t * 5 + i)) * 4, 11, 6, { seed: i + 7 }));
  }

  // White wave crests on the surface
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) {
    const wx = x + 14 + ((((i * 32 - t * 40) % (w - 28)) + (w - 28)) % (w - 28));
    ctx.fill(blob(wx, surface + Math.sin(wx * 0.09 + t * 4) * 3, 9, 3.5, { seed: i }));
  }

  // Round cloud banks on both sides make the river's edges clear.
  ctx.fillStyle = C.floorTop;
  for (const side of [x, x + w]) {
    ctx.fill(blob(side, groundY + 8, 14, 22, { seed: 3 }));
    ctx.fill(blob(side, groundY + 60, 12, 40, { seed: 4 }));
  }

  for (let i = 0; i < 3; i++) {
    drawTwinkle(ctx, x + 40 + i * 55, surface + 14 + (i % 2) * 20, 7, flash(t, 2, i * 2.2));
  }
}
