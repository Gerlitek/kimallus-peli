/** A bouncing arrow pointing down at something to collect or tap. */
export function drawDownArrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number): void {
  const by = y + Math.abs(Math.sin(t * 2.5)) * -size * 0.4;
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
