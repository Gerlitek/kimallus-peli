import { drawBottle, drawBrush, fillPolish } from '../art/nails';
import { PALETTE as C } from '../art/palette';
import { blob, heart, softStar } from '../art/shapes';
import { drawTwinkle } from '../art/sparkle';
import { drawDownArrow, drawMomentBackground } from '../art/ui';
import { drawUnicorn, hoofOnScreen, type HoofBox, type UnicornPose } from '../art/unicorn';
import { POLISHES } from '../data/polishes';
import { bareNails, cycle, isComplete, nextBare, paint, type Nails } from '../logic/nails';
import type { Rng } from '../logic/random';
import type { Input } from '../systems/input';
import { Particles } from '../systems/particles';
import { WIDTH } from './scene';

/** The unicorn stands big on a cushion, legs apart so every hoof is easy to see and tap. */
const POSE_BASE = {
  x: 470,
  y: 380,
  scale: 1.8,
  hoofScale: 1.7,
  legAngles: [-0.35, 0.1, 0.15, 0.45],
  run: 0,
  grounded: true,
  sx: 1,
  sy: 1,
  cat: { dx: 0, dy: 0, rot: 0 },
} as const;

const BOTTLE_BOTTOM = 508;
const BOTTLE_X = POLISHES.map((_, i) => WIDTH / 2 + (i - (POLISHES.length - 1) / 2) * 96);
const PAINT_TIME = 0.75;

export interface StationHud {
  message(html: string | null): void;
  /** Points earned here are added to the run's score right away. */
  addPoints(points: number): void;
}

interface Floater {
  x: number;
  y: number;
  life: number;
}

/**
 * A calm stop on the ride: paint the unicorn's four hooves.
 * Mouse or touch: tap a bottle, then a hoof. Keyboard: left/right picks a polish, space paints the next bare hoof.
 */
export class NailStation {
  private time = 0;
  private selected = 0;
  private nails: Nails = bareNails();
  /** Brush progress per hoof, 0..1. */
  private progress = [1, 1, 1, 1];
  private floaters: Floater[] = [];
  private readonly sparkles = new Particles(120);
  private doneTime = -1;
  /** When the unicorn last hopped for joy (a hoof was finished). */
  private hopAt = -10;
  /** When each hoof got its sticker, or -1. */
  private stickerAt = [-1, -1, -1, -1];
  private rainTimer = 0;

  constructor(private readonly rng: Rng, private readonly hud: StationHud) {
    hud.message(null);
  }

  /** Polish per hoof, so the ride can keep showing the painted hooves. */
  get painted(): Nails {
    return this.nails;
  }

  /** The unicorn hops after each finished hoof and dances when all four are done. */
  private pose(): UnicornPose {
    const since = this.time - this.hopAt;
    let hop = since < 0.5 ? Math.sin((since / 0.5) * Math.PI) * 30 : 0;
    let squash = since >= 0.5 && since < 0.7 ? 1 - (since - 0.5) / 0.2 : 0;
    if (this.doneTime >= 0) {
      const beat = Math.abs(Math.sin(this.time * 6));
      hop = beat * 24;
      squash = beat < 0.25 ? 1 - beat * 4 : 0;
    }
    return {
      ...POSE_BASE,
      y: POSE_BASE.y - hop,
      sx: 1 + squash * 0.08,
      sy: 1 - squash * 0.08,
      t: this.time,
      hoof: (ctx, path, box, i) => this.drawHoof(ctx, path, box, i),
    };
  }

  /** Returns true when the player is done and the ride should continue. */
  update(dt: number, input: Input): boolean {
    this.time += dt;
    const before = this.progress;
    this.progress = this.progress.map((p) => Math.min(1, p + dt / PAINT_TIME));
    // A hoof just finished: hop for joy and pop a sticker on it.
    this.progress.forEach((p, i) => {
      if (before[i] < 1 && p >= 1) {
        this.hopAt = this.time;
        this.stickerAt[i] = this.time;
        const h = hoofOnScreen(this.pose(), i);
        for (let k = 0; k < 14; k++) this.sparkles.emit(h.x, h.y - 10, this.rng, { spread: 40, speed: 150, size: 7 });
        this.floaters.push({ x: h.x, y: h.y - 50, life: 1.2 });
      }
    });
    if (this.doneTime >= 0) {
      // Sparkle rain while the unicorn dances
      this.rainTimer -= dt;
      if (this.rainTimer <= 0) {
        this.rainTimer = 0.06;
        this.sparkles.emit(60 + this.rng() * (WIDTH - 120), 20, this.rng, { spread: 10, speed: 40, size: 8, life: 1.6 });
      }
    }
    this.floaters = this.floaters.map((f) => ({ ...f, y: f.y - 40 * dt, life: f.life - dt })).filter((f) => f.life > 0);
    this.sparkles.update(dt, 0);

    const tap = input.takeTap();
    const pressed = input.takePress();
    const keys = input.takeKeys();

    if (this.doneTime >= 0) {
      this.doneTime += dt;
      // Continues by itself after the little dance: nothing to press.
      return this.doneTime > 2.4;
    }

    for (const k of keys) {
      const step = k === 'ArrowLeft' || k === 'KeyA' ? -1 : 1;
      this.selected = cycle(this.selected, step, POLISHES.length);
    }

    if (tap) {
      const pose = this.pose();
      const bottle = BOTTLE_X.findIndex((x) => Math.abs(tap.x - x) < 42 && tap.y > BOTTLE_BOTTOM - 100 && tap.y < BOTTLE_BOTTOM + 20);
      const hoof = [0, 1, 2, 3].find((i) => {
        const h = hoofOnScreen(pose, i);
        return Math.hypot(tap.x - h.x, tap.y - h.y) < h.r + 14;
      });
      if (bottle >= 0) this.selected = bottle;
      else if (hoof !== undefined) this.paintNail(hoof);
    } else if (pressed) {
      const next = nextBare(this.nails);
      if (next >= 0) this.paintNail(next);
    }
    return false;
  }

  private paintNail(index: number): void {
    const polish = POLISHES[this.selected];
    const result = paint(this.nails, index, polish.id);
    this.nails = result.nails;
    this.progress[index] = 0;
    const h = hoofOnScreen(this.pose(), index);
    for (let i = 0; i < 12; i++) this.sparkles.emit(h.x, h.y, this.rng, { spread: 50, speed: 110, size: 6 });
    if (result.points > 0) this.hud.addPoints(result.points);
    if (isComplete(this.nails)) {
      this.doneTime = 0;
      for (let i = 0; i < 40; i++) this.sparkles.emit(POSE_BASE.x, 250, this.rng, { spread: 380, speed: 160, size: 8, life: 1.4 });
    }
  }

  /** Bare hooves glow softly to invite a brush; painted ones show their polish. */
  private drawHoof(ctx: CanvasRenderingContext2D, path: Path2D, box: HoofBox, i: number): void {
    const polish = POLISHES.find((p) => p.id === this.nails[i]);
    if (!polish) {
      const pulse = (Math.sin(this.time * 4 + i) + 1) / 2;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.lineDashOffset = -this.time * 8;
      ctx.strokeStyle = `rgba(224, 69, 143, ${0.45 + pulse * 0.45})`;
      ctx.lineWidth = 1.4;
      ctx.stroke(path);
      ctx.restore();
      return;
    }
    // The brush paints from the top of the hoof down.
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x - 1, box.y - 1, box.w + 2, (box.h + 2) * this.progress[i]);
    ctx.clip();
    fillPolish(ctx, path, box, polish, this.time, i * 17 + 3, 2.2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.9;
    ctx.stroke(path);

    // A sticker pops onto each finished hoof: hearts and stars take turns.
    const at = this.stickerAt[i];
    if (at >= 0) {
      const k = Math.min(1, (this.time - at) / 0.25);
      const pop = k < 1 ? k * 1.3 : 1 + Math.sin((this.time - at) * 4) * 0.05;
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const r = box.h * 0.24 * pop;
      ctx.fillStyle = '#ffffff';
      if (i % 2 === 0) {
        ctx.fill(heart(cx, cy, r * 1.15));
        ctx.fillStyle = C.heart;
        ctx.fill(heart(cx, cy, r * 0.8));
      } else {
        ctx.fill(softStar(cx, cy, r * 1.3, r * 0.6));
        ctx.fillStyle = '#ffc94a';
        ctx.fill(softStar(cx, cy, r * 0.95, r * 0.42));
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    drawMomentBackground(ctx, WIDTH, 540, t, (x, y, k) => drawTwinkle(ctx, x, y, 8, k * k * k));

    // Cushion under the hooves
    ctx.fillStyle = '#ffc2e3';
    ctx.fill(blob(POSE_BASE.x + 10, POSE_BASE.y + 14, 190, 22, { seed: 3, wobble: 0.03 }));
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill(blob(POSE_BASE.x - 40, POSE_BASE.y + 6, 110, 7, { seed: 4 }));

    const pose = this.pose();
    drawUnicorn(ctx, pose);

    // While a hoof is being painted, the brush sweeps over it from top to bottom.
    this.progress.forEach((p, i) => {
      const polish = POLISHES.find((q) => q.id === this.nails[i]);
      if (p >= 1 || !polish) return;
      const h = hoofOnScreen(pose, i);
      const bx = h.x + Math.sin(p * Math.PI * 4) * h.r * 0.7;
      const by = h.y - h.r * 0.55 + p * h.r * 1.0;
      drawBrush(ctx, bx, by, polish, -0.45, 1.6);
    });

    // Bottles; the chosen one is lifted and glows.
    POLISHES.forEach((polish, i) => {
      const chosen = i === this.selected;
      const x = BOTTLE_X[i];
      if (chosen) {
        const glow = ctx.createRadialGradient(x, BOTTLE_BOTTOM - 36, 4, x, BOTTLE_BOTTOM - 36, 60);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 60, BOTTLE_BOTTOM - 96, 120, 120);
      }
      // Every bottle bobs a little; the chosen one is lifted higher.
      const lift = (chosen ? 8 + Math.sin(t * 4) * 2 : 0) + Math.sin(t * 3 + i) * 3;
      drawBottle(ctx, x, BOTTLE_BOTTOM - lift, polish, t, i * 31 + 7, chosen ? 0.9 : 0.75);
    });
    // Pictures instead of words: an arrow over the next bare hoof, a play button when all are done.
    const next = nextBare(this.nails);
    if (next >= 0 && this.progress.every((p) => p >= 1)) {
      const h = hoofOnScreen(pose, next);
      drawDownArrow(ctx, h.x, h.y - h.r - 14, 34, t);
    }

    this.sparkles.draw(ctx);

    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.fillStyle = C.heart;
      ctx.fill(heart(f.x, f.y, 14));
    }
    ctx.globalAlpha = 1;
  }
}
