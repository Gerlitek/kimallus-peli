import { PALETTE as C } from './palette';
import { blob, heart, smoothClosed } from './shapes';

export interface UnicornPose {
  /** Feet position on screen. */
  x: number;
  y: number;
  /** Running cycle in radians. */
  run: number;
  grounded: boolean;
  /** Horizontal and vertical scale for squash and stretch, around the feet. */
  sx: number;
  sy: number;
  /** Time in seconds, for idle wobble. */
  t: number;
  /** Cat offset and tilt when it falls off. */
  cat: { dx: number; dy: number; rot: number };
  /** The cat's face: happy by default, sad in a feelings moment. */
  catMood?: 'happy' | 'sad';
  /** Overall size; 1 in the game. */
  scale?: number;
  /** Fixed leg angles instead of the running cycle, in leg order (see LEGS). */
  legAngles?: readonly number[];
  /** Hoof size multiplier: the nail station shows big hooves. */
  hoofScale?: number;
  /** Draws over each hoof, e.g. nail polish. Coordinates are the unicorn's own. */
  hoof?: (ctx: CanvasRenderingContext2D, path: Path2D, box: HoofBox, index: number) => void;
}

export interface HoofBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Legs in drawing order: two far-side legs behind the body, then two near-side legs. */
const LEGS = [
  { hip: -30, phase: Math.PI },
  { hip: 22, phase: 0 },
  { hip: -18, phase: Math.PI * 0.5 },
  { hip: 34, phase: Math.PI * 1.5 },
] as const;

function legAngle(pose: UnicornPose, i: number): number {
  if (pose.legAngles) return pose.legAngles[i];
  const phase = LEGS[i].phase;
  return pose.grounded ? Math.sin(pose.run + phase) * 0.5 : -0.5 + phase * 0.05;
}

function foot(pose: UnicornPose, i: number): { hipX: number; angle: number; len: number; x: number; y: number } {
  const angle = legAngle(pose, i);
  const len = 44 - (pose.grounded ? 0 : 14);
  const hipX = LEGS[i].hip;
  return { hipX, angle, len, x: hipX + Math.sin(angle) * len, y: -48 + Math.cos(angle) * len };
}

function hoofBox(pose: UnicornPose, i: number): HoofBox {
  const f = foot(pose, i);
  const k = pose.hoofScale ?? 1;
  return { x: f.x + 2 - 8 * k, y: f.y + 1 - 5 * k, w: 16 * k, h: 10 * k };
}

/** Hoof centre on screen, for tapping. */
export function hoofOnScreen(pose: UnicornPose, i: number): { x: number; y: number; r: number } {
  const b = hoofBox(pose, i);
  const s = pose.scale ?? 1;
  return { x: pose.x + (b.x + b.w / 2) * s * pose.sx, y: pose.y + (b.y + b.h / 2) * s * pose.sy, r: (b.w / 2) * s };
}

function leg(ctx: CanvasRenderingContext2D, pose: UnicornPose, i: number): void {
  const { hipX, angle, len, x: footX, y: footY } = foot(pose, i);
  ctx.strokeStyle = C.unicornShade;
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hipX, -50);
  ctx.quadraticCurveTo(hipX + Math.sin(angle) * len * 0.4 + 3, footY - len * 0.5, footX, footY);
  ctx.stroke();
  const b = hoofBox(pose, i);
  const path = blob(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, { seed: hipX });
  ctx.fillStyle = C.hoof;
  ctx.fill(path);
  pose.hoof?.(ctx, path, b, i);
}

function tail(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.lineCap = 'round';
  C.rainbow.forEach((color, i) => {
    const sway = Math.sin(t * 6 + i * 0.6) * 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-44, -72 + i * 2);
    ctx.quadraticCurveTo(-74, -86 + i * 5 + sway, -82 - i * 2, -50 + i * 6 + sway);
    ctx.stroke();
  });
}

function mane(ctx: CanvasRenderingContext2D, t: number): void {
  const tufts: Array<[number, number, number]> = [
    [30, -132, 11],
    [24, -118, 12],
    [20, -103, 12],
    [17, -88, 11],
    [40, -140, 9],
  ];
  tufts.forEach(([x, y, r], i) => {
    ctx.fillStyle = C.rainbow[i % C.rainbow.length];
    ctx.fill(blob(x - Math.sin(t * 7 + i) * 2, y, r, r * 0.85, { seed: i + 3, phase: t * 3, wobble: 0.12 }));
  });
}

function horn(ctx: CanvasRenderingContext2D): void {
  const path = smoothClosed(
    [
      [56, -138],
      [72, -178],
      [68, -136],
    ],
    0.2,
  );
  const g = ctx.createLinearGradient(56, -136, 72, -178);
  g.addColorStop(0, C.hornShade);
  g.addColorStop(1, C.horn);
  ctx.fillStyle = g;
  ctx.fill(path);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  for (const k of [0.3, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(57 + 12 * k, -138 - 40 * k);
    ctx.lineTo(67 + 4 * k, -136 - 36 * k);
    ctx.stroke();
  }
}

function cat(ctx: CanvasRenderingContext2D, t: number, grounded: boolean, mood: 'happy' | 'sad'): void {
  // Tail curls up and ends in a heart: that is where the hearts will fly from.
  ctx.strokeStyle = C.catShade;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  const sway = Math.sin(t * 4) * 5;
  ctx.beginPath();
  ctx.moveTo(-22, -100);
  ctx.bezierCurveTo(-44, -104, -46 + sway, -132, -32 + sway, -140);
  ctx.stroke();
  ctx.fillStyle = C.heart;
  ctx.fill(heart(-30 + sway, -146, 9));

  ctx.fillStyle = C.cat;
  ctx.fill(blob(-6, -102, 22, 17, { seed: 9, phase: t * 2, wobble: 0.04 }));

  const bob = grounded ? Math.sin(t * 14) * 1.5 : -2;
  const hx = 10;
  const hy = -128 + bob;
  // Ears
  ctx.fill(smoothClosed([[hx - 15, hy - 4], [hx - 13, hy - 24], [hx - 2, hy - 10]], 0.5));
  ctx.fill(smoothClosed([[hx + 2, hy - 10], [hx + 13, hy - 24], [hx + 15, hy - 4]], 0.5));
  ctx.fillStyle = C.blush;
  ctx.globalAlpha = 0.6;
  ctx.fill(smoothClosed([[hx - 12, hy - 8], [hx - 11, hy - 18], [hx - 5, hy - 11]], 0.5));
  ctx.fill(smoothClosed([[hx + 5, hy - 11], [hx + 11, hy - 18], [hx + 12, hy - 8]], 0.5));
  ctx.globalAlpha = 1;
  // Head
  ctx.fillStyle = C.cat;
  ctx.fill(blob(hx, hy, 17, 14, { seed: 4, wobble: 0.03 }));
  ctx.strokeStyle = C.eye;
  ctx.lineWidth = 2.2;
  if (mood === 'sad') {
    // Droopy eyes, a small frown and a tear: readable without words
    for (const ex of [hx - 6, hx + 6]) {
      ctx.beginPath();
      ctx.arc(ex, hy - 4, 3.5, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(hx, hy + 9, 3.5, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    ctx.fillStyle = '#8fc4ff';
    const drop = (t * 0.8) % 1;
    ctx.globalAlpha = 1 - drop * 0.6;
    ctx.fill(blob(hx - 8, hy + 2 + drop * 8, 1.8, 2.6));
    ctx.globalAlpha = 1;
  } else {
    // Happy closed eyes
    for (const ex of [hx - 6, hx + 6]) {
      ctx.beginPath();
      ctx.arc(ex, hy - 1, 3.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  ctx.fillStyle = C.catNose;
  ctx.fill(heart(hx, hy + 4, 2.6));
  ctx.fillStyle = C.blush;
  ctx.globalAlpha = 0.5;
  ctx.fill(blob(hx - 10, hy + 5, 4, 2.5));
  ctx.fill(blob(hx + 10, hy + 5, 4, 2.5));
  ctx.globalAlpha = 1;
}

export function drawUnicorn(ctx: CanvasRenderingContext2D, pose: UnicornPose): void {
  const { t, grounded } = pose;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  const s = pose.scale ?? 1;
  ctx.scale(pose.sx * s, pose.sy * s);

  tail(ctx, t);

  leg(ctx, pose, 0);
  leg(ctx, pose, 1);

  // Body
  const g = ctx.createRadialGradient(-6, -78, 6, 0, -64, 60);
  g.addColorStop(0, C.unicorn);
  g.addColorStop(1, C.unicornShade);
  ctx.fillStyle = g;
  const body = blob(0, -66, 52, 30, { seed: 1, phase: t * 2, wobble: 0.035 });
  ctx.fill(body);

  leg(ctx, pose, 2);
  leg(ctx, pose, 3);
  ctx.fillStyle = g;
  ctx.fill(body);

  // Neck and head
  ctx.fillStyle = C.unicorn;
  ctx.fill(blob(38, -96, 17, 28, { seed: 2, wobble: 0.04 }));
  ctx.fill(blob(54, -118, 27, 21, { seed: 5, wobble: 0.04, phase: t }));
  ctx.fillStyle = C.snout;
  ctx.fill(blob(73, -110, 14, 12, { seed: 6, wobble: 0.05 }));
  ctx.fillStyle = C.eye;
  ctx.fill(blob(77, -112, 1.6, 2.2));
  // Ear
  ctx.fillStyle = C.unicornShade;
  ctx.fill(smoothClosed([[40, -130], [44, -152], [52, -134]], 0.5));

  horn(ctx);
  mane(ctx, t);

  // Eye with sparkle and lashes
  ctx.fillStyle = C.eye;
  ctx.fill(blob(60, -120, 6, 7.5));
  ctx.fillStyle = '#fff';
  ctx.fill(blob(62, -123, 2.2, 2.6));
  ctx.fill(blob(58.5, -117, 1.1, 1.2));
  ctx.strokeStyle = C.eye;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of [
    [56, -126, 52, -130],
    [59, -128, 57, -133],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.fillStyle = C.blush;
  ctx.globalAlpha = 0.45;
  ctx.fill(blob(66, -106, 7, 4));
  ctx.globalAlpha = 1;

  // Cat on the back
  ctx.save();
  ctx.translate(pose.cat.dx - 20, pose.cat.dy + 4);
  ctx.rotate(pose.cat.rot);
  cat(ctx, t, grounded, pose.catMood ?? 'happy');
  ctx.restore();

  ctx.restore();
}
