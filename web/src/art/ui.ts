import { heart } from './shapes';

/** A bouncing arrow from one point toward another, with a heart at its tail: "give this there". */
export function drawGiveArrow(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, t: number): void {
  const shift = Math.sin(t * 5) * 8;
  ctx.save();
  ctx.translate(shift, 0);
  ctx.strokeStyle = '#ff5fa2';
  ctx.fillStyle = '#ff5fa2';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2 - 18, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - 26, y - 20);
  ctx.lineTo(x2 - 26, y + 20);
  ctx.closePath();
  ctx.fill();
  ctx.fill(heart(x1 - 4, y, 12));
  ctx.restore();
}

/** A bouncing arrow pointing down at something to collect or tap. */
export function drawDownArrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number): void {
  const by = y + Math.abs(Math.sin(t * 5)) * -size * 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffa6d2';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.3, by - size);
  ctx.lineTo(x + size * 0.3, by - size);
  ctx.lineTo(x + size * 0.3, by - size * 0.45);
  ctx.lineTo(x + size * 0.6, by - size * 0.45);
  ctx.lineTo(x, by);
  ctx.lineTo(x - size * 0.6, by - size * 0.45);
  ctx.lineTo(x - size * 0.3, by - size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A bowl of food with steam: means "time to eat". */
export function drawBowl(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.strokeStyle = 'rgba(160, 120, 190, 0.7)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const dx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y - 6);
    ctx.quadraticCurveTo(x + dx + 4 * Math.sin(t * 4 + dx), y - 12, x + dx, y - 18);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7fc8ff';
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 2);
  ctx.quadraticCurveTo(x, y + 22, x + 16, y - 2);
  ctx.closePath();
  ctx.fill();
}

/** Background for calm moments over the paused ride: colourful, the galaxy shows through. */
export function drawMomentBackground(ctx: CanvasRenderingContext2D, width: number, height: number, t: number, twinkle: (x: number, y: number, k: number) => void): void {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  // Deep plum to rose, like the sky: the white unicorn and pastel things stand out.
  g.addColorStop(0, 'rgba(100, 36, 124, 0.9)');
  g.addColorStop(1, 'rgba(190, 70, 150, 0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 14; i++) twinkle(40 + ((i * 131) % (width - 60)), 30 + ((i * 89) % (height - 60)), (Math.sin(t * (2 + (i % 3)) + i) + 1) / 2);
}
