import type { Mood } from '../logic/hearts';
import { PALETTE as C } from './palette';
import { blob, heart, softStar } from './shapes';

/** A cloud with a face. `mood` null is the sad grey cloud; otherwise it has been cheered up. */
export function drawMoodCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  mood: Mood | null,
  t: number,
  seed: number,
): void {
  const happy = mood !== null;
  const body = happy ? '#ffffff' : '#b9afc9';
  const shade = happy ? '#ffd6ec' : '#9e93b3';

  // Puffy body: a base and three bumps
  ctx.fillStyle = shade;
  ctx.fill(blob(x, y + 4, rx, ry, { seed, wobble: 0.05 }));
  ctx.fillStyle = body;
  ctx.fill(blob(x, y, rx, ry * 0.9, { seed, wobble: 0.05, phase: t }));
  ctx.fill(blob(x - rx * 0.45, y - ry * 0.55, rx * 0.42, ry * 0.6, { seed: seed + 1 }));
  ctx.fill(blob(x + rx * 0.1, y - ry * 0.85, rx * 0.48, ry * 0.7, { seed: seed + 2 }));
  ctx.fill(blob(x + rx * 0.55, y - ry * 0.4, rx * 0.36, ry * 0.5, { seed: seed + 3 }));

  const eyeY = y - 2;
  const eyeDx = rx * 0.3;
  ctx.strokeStyle = C.eye;
  ctx.fillStyle = C.eye;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';

  if (!happy) {
    // Sad: droopy eyes, a small frown and a raindrop
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * eyeDx, eyeY - 4, 4, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y + 12, 6, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    const drop = (t * 0.9 + seed * 0.37) % 1;
    ctx.globalAlpha = 1 - drop;
    ctx.fillStyle = '#9fc4ff';
    const dy = y + ry + drop * 40;
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.4, dy - 6);
    ctx.quadraticCurveTo(x - rx * 0.4 + 5, dy + 2, x - rx * 0.4, dy + 4);
    ctx.quadraticCurveTo(x - rx * 0.4 - 5, dy + 2, x - rx * 0.4, dy - 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  // Happy faces
  ctx.fillStyle = C.blush;
  ctx.globalAlpha = 0.55;
  ctx.fill(blob(x - rx * 0.5, y + 6, 6, 3.5));
  ctx.fill(blob(x + rx * 0.5, y + 6, 6, 3.5));
  ctx.globalAlpha = 1;

  if (mood === 'heart-eyes') {
    ctx.fillStyle = C.heart;
    ctx.fill(heart(x - eyeDx, eyeY, 6));
    ctx.fill(heart(x + eyeDx, eyeY, 6));
  } else if (mood === 'star-eyes') {
    ctx.fillStyle = '#ffc94a';
    ctx.fill(softStar(x - eyeDx, eyeY, 7, 3, t));
    ctx.fill(softStar(x + eyeDx, eyeY, 7, 3, -t));
  } else {
    // Closed, smiling eyes
    ctx.strokeStyle = C.eye;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * eyeDx, eyeY + 2, 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }

  // Mouth: a big open smile for stars and hearts, a soft smile otherwise
  ctx.fillStyle = '#e0458f';
  ctx.strokeStyle = C.eye;
  if (mood === 'star-eyes' || mood === 'heart-eyes') {
    ctx.beginPath();
    ctx.arc(x, y + 7, 6, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y + 5, 6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  if (mood === 'hug') {
    // Little arms hugging a heart
    ctx.fillStyle = C.heart;
    ctx.fill(heart(x, y + ry * 0.75, 9));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * rx * 0.8, y + 4);
      ctx.quadraticCurveTo(x + s * rx * 0.55, y + ry * 0.95, x + s * 6, y + ry * 0.8);
      ctx.stroke();
    }
  }
}

/** A flying heart with a soft glow. */
export function drawHeartShot(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 30);
  glow.addColorStop(0, 'rgba(255,170,210,0.7)');
  glow.addColorStop(1, 'rgba(255,170,210,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 30, y - 30, 60, 60);
  const beat = 1 + Math.sin(t * 6) * 0.08;
  ctx.fillStyle = C.heart;
  ctx.fill(heart(x, y, 16 * beat));
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill(blob(x - 6, y - 6, 3.6, 2.4));
}
