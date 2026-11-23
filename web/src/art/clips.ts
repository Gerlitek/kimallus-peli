import type { ClipKind } from '../data/clips';
import { blob, heart, softStar } from './shapes';

/** A hair clip centred on (x, y), about `size` in radius. Each has a white edge, so it shows on any mane colour. */
export function drawClip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, kind: ClipKind): void {
  const s = size;
  ctx.fillStyle = '#ffffff';
  if (kind === 'heart') {
    ctx.fill(heart(x, y + s * 0.1, s * 1.25));
    ctx.fillStyle = '#ff4f9a';
    ctx.fill(heart(x, y + s * 0.1, s * 0.95));
  } else if (kind === 'star') {
    ctx.fill(softStar(x, y, s * 1.15, s * 0.55));
    ctx.fillStyle = '#ffc94a';
    ctx.fill(softStar(x, y, s * 0.88, s * 0.4));
  } else if (kind === 'bow') {
    bow(ctx, x, y, s * 1.15, '#ffffff');
    bow(ctx, x, y, s * 0.95, '#ff4f9a');
    // Folds in the loops and a round knot
    ctx.strokeStyle = '#d82f80';
    ctx.lineWidth = s * 0.1;
    ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + d * s * 0.3, y);
      ctx.lineTo(x + d * s * 0.75, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fill(blob(x, y, s * 0.36, s * 0.4));
    ctx.fillStyle = '#ff8fc2';
    ctx.fill(blob(x, y, s * 0.25, s * 0.29));
  } else if (kind === 'flower') {
    for (const [k, color] of [[1, '#ffffff'], [0.76, '#b98aff']] as const) {
      ctx.fillStyle = color;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.5 * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // A cut diamond: flat table on top, a point below, and facets
    const gem = (k: number) => {
      const p = new Path2D();
      p.moveTo(x - s * 0.6 * k, y - s * 0.85 * k);
      p.lineTo(x + s * 0.6 * k, y - s * 0.85 * k);
      p.lineTo(x + s * 1.1 * k, y - s * 0.25 * k);
      p.lineTo(x, y + s * 1.05 * k);
      p.lineTo(x - s * 1.1 * k, y - s * 0.25 * k);
      p.closePath();
      return p;
    };
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = s * 0.3;
    ctx.stroke(gem(1));
    ctx.fill(gem(1));
    ctx.fillStyle = '#6fd0ff';
    ctx.fill(gem(0.86));
    // Lighter crown above the girdle, a darker side below
    const k = 0.86;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6 * k, y - s * 0.85 * k);
    ctx.lineTo(x + s * 0.6 * k, y - s * 0.85 * k);
    ctx.lineTo(x + s * 0.4 * k, y - s * 0.25 * k);
    ctx.lineTo(x - s * 0.4 * k, y - s * 0.25 * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(40, 90, 200, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.4 * k, y - s * 0.25 * k);
    ctx.lineTo(x + s * 1.1 * k, y - s * 0.25 * k);
    ctx.lineTo(x, y + s * 1.05 * k);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.moveTo(x - s * 1.1 * k, y - s * 0.25 * k);
    ctx.lineTo(x + s * 1.1 * k, y - s * 0.25 * k);
    ctx.moveTo(x - s * 0.4 * k, y - s * 0.25 * k);
    ctx.lineTo(x, y + s * 1.05 * k);
    ctx.lineTo(x + s * 0.4 * k, y - s * 0.25 * k);
    ctx.stroke();
  }
}

/** A bow's outline: two loops pinched in the middle, and two ribbon tails below. */
function bow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color;
  for (const d of [-1, 1]) {
    // Loop: narrow at the knot, wide and round at the end
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + d * s * 0.5, y - s * 1.0, x + d * s * 1.35, y - s * 0.8, x + d * s * 1.2, y);
    ctx.bezierCurveTo(x + d * s * 1.35, y + s * 0.8, x + d * s * 0.5, y + s * 1.0, x, y);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + d * s * 0.75, y + s * 1.15);
    ctx.lineTo(x + d * s * 0.4, y + s * 0.95);
    ctx.lineTo(x + d * s * 0.2, y + s * 1.2);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The metal clasp under a hair clip: two flat jaws hinged at the back, like a small alligator clip.
 * It points along `direction` (radians), mouth first, and `open` 0..1 spreads the jaws.
 * Shown only while a clip is on its way to the mane: it closes as it slides into the hair and is not seen after.
 */
export function drawClasp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, open: number, direction: number): void {
  const len = size * 1.9;
  const back = size * 0.3;
  const front = size * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(direction);
  // The ornament sits on the hinge end; the jaws reach out ahead of it and slide into the mane.
  ctx.translate(-size * 0.5, 0);
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.07;
  ctx.strokeStyle = '#7d6ea6';
  for (const side of [1, -1]) {
    // One jaw: wide at the hinge, narrowing to a rounded tip
    ctx.save();
    ctx.rotate(side * open * 0.42);
    ctx.beginPath();
    ctx.moveTo(0, -back);
    ctx.lineTo(len - front, -front);
    ctx.arc(len - front, 0, front, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(0, back);
    ctx.closePath();
    ctx.fillStyle = side > 0 ? '#cfc6e6' : '#f4f1fb';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Hinge with its spring
  ctx.fillStyle = '#f4f1fb';
  ctx.beginPath();
  ctx.arc(0, 0, back * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
