import { drawBottle, drawBrush, fillCoats } from '../art/nails';
import { PALETTE as C } from '../art/palette';
import { blob, heart, softStar } from '../art/shapes';
import { drawTwinkle } from '../art/sparkle';
import { drawDownArrow, drawMomentBackground } from '../art/ui';
import { drawUnicorn, hoofOnScreen, type Decor, type HoofBox, type UnicornPose } from '../art/unicorn';
import { POLISHES } from '../data/polishes';
import { easeInOut } from '../logic/ease';
import { bareNails, cycle, isComplete, paint, STROKES_PER_NAIL, type Nails } from '../logic/nails';
import type { Rng } from '../logic/random';
import type { Input } from '../systems/input';
import { Particles } from '../systems/particles';
import { WIDTH } from './scene';

/** Close-up for painting: the hooves fill the view, the body is mostly out of sight above. */
const CLOSE = { x: 470, y: 335, scale: 4.5, hoofScale: 1.5, legAngles: [-0.6, 0.05, -0.05, 0.6] };
/** The whole unicorn, shown at the end to admire the result. */
const FAR = { x: 470, y: 380, scale: 1.8, hoofScale: 1.7, legAngles: [-0.35, 0.1, 0.15, 0.45] };
/** Hooves from left to right on screen. */
const ORDER = [0, 2, 1, 3] as const;

const BOTTLE_BOTTOM = 508;
const BOTTLE_X = POLISHES.map((_, i) => WIDTH / 2 + (i - (POLISHES.length - 1) / 2) * 96);
/** Seconds for a brush stroke: the first ones are slow to watch, after that the brush is quicker so it does not get boring. */
const SLOW_STROKE = 1.1;
const QUICK_STROKE = 0.6;
const SLOW_STROKES = 2;
/** Seconds for zooming out, and for admiring the painted hooves. */
const ZOOM_TIME = 1.6;
const ADMIRE = 4;

export interface StationHud {
  message(html: string | null): void;
  /** Points earned here are added to the run's score right away. */
  addPoints(points: number): void;
}

/**
 * A calm stop on the ride: paint the unicorn's four hooves, seen up close.
 * Every tap or key press is one brush stroke, and a hoof takes three strokes side by side.
 * Tap a bottle (or use left/right) to change the polish, also between strokes.
 */
export class NailStation {
  private time = 0;
  private selected = 0;
  /** Polish of each brush stroke, per hoof. */
  private coats: string[][] = [[], [], [], []];
  private nails: Nails = bareNails();
  /** The stroke being painted right now: always the newest coat of its hoof. */
  private stroke: { hoof: number; time: number; duration: number } | null = null;
  private strokesDone = 0;
  private readonly sparkles = new Particles(40);
  /** Seconds since the last hoof was finished, or -1. */
  private doneTime = -1;
  /** When each hoof got its sticker, or -1. */
  private stickerAt = [-1, -1, -1, -1];

  /** `decor` is what the unicorn already wears: here the clips in its mane. */
  constructor(private readonly rng: Rng, private readonly hud: StationHud, private readonly decor: Decor) {
    hud.message(null);
  }

  /** The brush strokes of each hoof, so the ride keeps showing the hooves exactly as they were painted. */
  get painted(): readonly (readonly string[])[] {
    return this.coats;
  }

  /** Close up while painting; when all is done the view glides out and the unicorn hops slowly for joy. */
  private pose(): UnicornPose {
    const z = this.doneTime < 0 ? 0 : easeInOut(this.doneTime / ZOOM_TIME);
    const mix = (a: number, b: number) => a + (b - a) * z;
    const hop = this.doneTime > ZOOM_TIME ? Math.abs(Math.sin((this.doneTime - ZOOM_TIME) * 2.2)) * 18 : 0;
    return {
      ...this.decor(this.time),
      x: mix(CLOSE.x, FAR.x),
      y: mix(CLOSE.y, FAR.y) - hop,
      scale: mix(CLOSE.scale, FAR.scale),
      hoofScale: mix(CLOSE.hoofScale, FAR.hoofScale),
      legAngles: CLOSE.legAngles.map((a, i) => mix(a, FAR.legAngles[i])),
      run: 0,
      grounded: true,
      sx: 1,
      sy: 1,
      cat: { dx: 0, dy: 0, rot: 0 },
      t: this.time,
      hoof: (ctx, path, box, i) => this.drawHoof(ctx, path, box, i),
    };
  }

  private nextHoof(): number | undefined {
    return ORDER.find((i) => this.coats[i].length < STROKES_PER_NAIL);
  }

  /** Returns true when the player is done and the ride should continue. */
  update(dt: number, input: Input): boolean {
    this.time += dt;
    this.sparkles.update(dt, 0);
    const tap = input.takeTap();
    const pressed = input.takePress();
    const keys = input.takeKeys();

    if (this.doneTime >= 0) {
      this.doneTime += dt;
      // Continues by itself after admiring: nothing to press.
      return this.doneTime > ZOOM_TIME + ADMIRE;
    }

    if (this.stroke) {
      this.stroke.time += dt;
      if (this.stroke.time >= this.stroke.duration) this.finishStroke(this.stroke.hoof);
    }

    for (const k of keys) {
      const step = k === 'ArrowLeft' || k === 'KeyA' ? -1 : 1;
      this.selected = cycle(this.selected, step, POLISHES.length);
    }

    const bottle = tap ? BOTTLE_X.findIndex((x) => Math.abs(tap.x - x) < 42 && tap.y > BOTTLE_BOTTOM - 100 && tap.y < BOTTLE_BOTTOM + 20) : -1;
    if (bottle >= 0) {
      this.selected = bottle;
    } else if (pressed && !this.stroke && this.doneTime < 0) {
      // One stroke at a time. A tap on a hoof paints that one; any other press paints the next in turn.
      const pose = this.pose();
      const tapped = ORDER.find((i) => {
        const h = hoofOnScreen(pose, i);
        return tap && this.coats[i].length < STROKES_PER_NAIL && Math.hypot(tap.x - h.x, tap.y - h.y) < h.r + 14;
      });
      const hoof = tapped ?? this.nextHoof();
      if (hoof !== undefined) {
        this.coats[hoof].push(POLISHES[this.selected].id);
        this.stroke = { hoof, time: 0, duration: this.strokesDone < SLOW_STROKES ? SLOW_STROKE : QUICK_STROKE };
      }
    }
    return false;
  }

  private finishStroke(hoof: number): void {
    this.stroke = null;
    this.strokesDone += 1;
    const coats = this.coats[hoof];
    if (coats.length < STROKES_PER_NAIL) return;
    // The hoof is done: a sticker, a few slow sparkles and the points.
    const result = paint(this.nails, hoof, coats[coats.length - 1]);
    this.nails = result.nails;
    this.stickerAt[hoof] = this.time;
    const h = hoofOnScreen(this.pose(), hoof);
    for (let k = 0; k < 4; k++) this.sparkles.emit(h.x, h.y - 30, this.rng, { spread: 90, speed: 30, size: 7, life: 1.6 });
    if (result.points > 0) this.hud.addPoints(result.points);
    if (isComplete(this.nails)) this.doneTime = 0;
  }

  /** How far down the hoof the given coat reaches, 0..1. */
  private reach(hoof: number, coat: number): number {
    const current = this.stroke?.hoof === hoof && coat === this.coats[hoof].length - 1;
    return current ? easeInOut(this.stroke!.time / this.stroke!.duration) : 1;
  }

  /** Bare hooves show a soft dashed outline; each brush stroke covers its own band of the hoof. */
  private drawHoof(ctx: CanvasRenderingContext2D, path: Path2D, box: HoofBox, i: number): void {
    const coats = this.coats[i];
    if (coats.length < STROKES_PER_NAIL) {
      const pulse = (Math.sin(this.time * 2 + i) + 1) / 2;
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = `rgba(224, 69, 143, ${0.45 + pulse * 0.4})`;
      ctx.lineWidth = 0.7;
      ctx.stroke(path);
      ctx.restore();
    }

    fillCoats(ctx, path, box, coats, this.time, i * 17 + 3, 3, (s) => this.reach(i, s));

    // A sticker pops onto each finished hoof: hearts and stars take turns.
    const at = this.stickerAt[i];
    if (at >= 0) {
      const pop = easeInOut((this.time - at) / 0.6);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const r = box.h * 0.24 * pop;
      ctx.fillStyle = '#ffffff';
      if (i % 2 === 0) {
        // A heart reaches less far from its centre than a star, so it gets a bigger size.
        ctx.fill(heart(cx, cy + r * 0.15, r * 1.75));
        ctx.fillStyle = C.heart;
        ctx.fill(heart(cx, cy + r * 0.15, r * 1.25));
      } else {
        ctx.fill(softStar(cx, cy, r * 1.3, r * 0.6));
        ctx.fillStyle = '#ffc94a';
        ctx.fill(softStar(cx, cy, r * 0.95, r * 0.42));
      }
    }
  }

  /** Where coat number `coat` of a hoof starts on screen (top of its band), and how long the stroke is. */
  private band(pose: UnicornPose, hoof: number, coat: number): { x: number; top: number; length: number } {
    const h = hoofOnScreen(pose, hoof);
    const half = h.r * 0.625;
    return { x: h.x - h.r + (coat + 0.5) * ((h.r * 2) / STROKES_PER_NAIL), top: h.y - half, length: half * 2 };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    drawMomentBackground(ctx, WIDTH, 540, t, (x, y, k) => drawTwinkle(ctx, x, y, 8, k * k * k));

    const pose = this.pose();
    const s = (pose.scale ?? 1) / FAR.scale;
    // Cushion under the hooves
    ctx.fillStyle = '#ffc2e3';
    ctx.fill(blob(pose.x + 10, pose.y + 1 + 13 * s, 190 * s, 16 + 6 * s, { seed: 3, wobble: 0.03 }));

    drawUnicorn(ctx, pose);

    const next = this.nextHoof();
    if (this.stroke) {
      // The brush moves slowly down the hoof and leaves a band of polish behind.
      const { hoof, time, duration } = this.stroke;
      const coat = this.coats[hoof].length - 1;
      const polish = POLISHES.find((q) => q.id === this.coats[hoof][coat]);
      const b = this.band(pose, hoof, coat);
      // The bristles bend most in the middle of the stroke, when the brush moves fastest.
      const bend = Math.sin(Math.PI * Math.min(1, time / duration));
      if (polish) drawBrush(ctx, b.x, b.top + this.reach(hoof, coat) * b.length, polish, 0.45, 2.8, bend);
    } else if (next !== undefined) {
      // Pictures instead of words: an arrow over the place of the next stroke.
      const b = this.band(pose, next, this.coats[next].length);
      drawDownArrow(ctx, b.x, b.top - 8, 34, t);
    }

    // Bottles, hidden once everything is painted; the chosen one is lifted and glows.
    if (this.doneTime < 0) {
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
        const lift = (chosen ? 10 : 0) + Math.sin(t * 1.5 + i) * 2;
        drawBottle(ctx, x, BOTTLE_BOTTOM - lift, polish, t, i * 31 + 7, chosen ? 0.9 : 0.75);
      });
    }

    this.sparkles.draw(ctx);
  }
}
