import { drawClasp, drawClip } from '../art/clips';
import { blob } from '../art/shapes';
import { drawTwinkle } from '../art/sparkle';
import { drawDownArrow, drawMomentBackground } from '../art/ui';
import { drawUnicorn, TUFT_COUNT, tuftOnScreen, type Decor, type UnicornPose } from '../art/unicorn';
import { CLIPS, type ClipKind } from '../data/clips';
import { easeInOut } from '../logic/ease';
import { bareNails, cycle, isComplete, paint, type Nails } from '../logic/nails';
import type { Rng } from '../logic/random';
import type { Input } from '../systems/input';
import { Particles } from '../systems/particles';
import type { StationHud } from './nail-station';
import { WIDTH } from './scene';

/** Close-up of the mane, with the cat watching; and the whole unicorn, shown at the end. */
const CLOSE = { x: 386, y: 644, scale: 3.6 };
const FAR = { x: 470, y: 400, scale: 1.8 };
/** Mane tufts from the top down. */
const ORDER = [4, 0, 1, 2, 3] as const;

const TRAY_Y = 478;
const TRAY_X = CLIPS.map((_, i) => WIDTH / 2 + (i - (CLIPS.length - 1) / 2) * 110);
/** Seconds for a clip to float to the mane, for zooming out, and for admiring. */
const FLY_TIME = 1.3;
const ZOOM_TIME = 1.6;
const ADMIRE = 4;

/**
 * A calm stop on the ride: put a clip on each tuft of the unicorn's mane.
 * Tap a clip on the tray (or use left/right) to choose, then tap a tuft; any other press decorates the next tuft.
 * The rules are the same as for nails (points per slot, a bonus for all), so they come from logic/nails.
 */
export class ManeStation {
  private time = 0;
  private selected = 0;
  private clips: Nails = bareNails(TUFT_COUNT);
  /** The clip floating to the mane right now. */
  private flying: { slot: number; kind: ClipKind; from: number; time: number } | null = null;
  private placedAt = Array.from({ length: TUFT_COUNT }, () => -1);
  private doneTime = -1;
  private readonly sparkles = new Particles(40);

  /** `decor` is what the unicorn already wears: here the painted hooves. */
  constructor(private readonly rng: Rng, private readonly hud: StationHud, private readonly decor: Decor) {
    hud.message(null);
  }

  /** Clip per tuft, so the ride keeps showing the decorated mane. */
  get placed(): Nails {
    return this.clips;
  }

  private pose(): UnicornPose {
    const z = this.doneTime < 0 ? 0 : easeInOut(this.doneTime / ZOOM_TIME);
    const mix = (a: number, b: number) => a + (b - a) * z;
    const hop = this.doneTime > ZOOM_TIME ? Math.abs(Math.sin((this.doneTime - ZOOM_TIME) * 2.2)) * 18 : 0;
    return {
      ...this.decor(this.time),
      x: mix(CLOSE.x, FAR.x),
      y: mix(CLOSE.y, FAR.y) - hop,
      scale: mix(CLOSE.scale, FAR.scale),
      legAngles: [-0.2, 0.1, 0.1, 0.3],
      run: 0,
      grounded: true,
      sx: 1,
      sy: 1,
      cat: { dx: 0, dy: 0, rot: 0 },
      t: this.time,
      clip: (ctx, x, y, r, i) => {
        const kind = this.clips[i] as ClipKind | null;
        if (kind) drawClip(ctx, x, y, r * 0.62 * easeInOut((this.time - this.placedAt[i]) / 0.5 + 0.6), kind);
      },
    };
  }

  private nextSlot(): number | undefined {
    return ORDER.find((i) => this.clips[i] === null);
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
      return this.doneTime > ZOOM_TIME + ADMIRE;
    }

    if (this.flying) {
      this.flying.time += dt;
      if (this.flying.time >= FLY_TIME) this.land(this.flying.slot, this.flying.kind);
    }

    for (const k of keys) {
      const step = k === 'ArrowLeft' || k === 'KeyA' ? -1 : 1;
      this.selected = cycle(this.selected, step, CLIPS.length);
    }

    const choice = tap ? TRAY_X.findIndex((x) => Math.abs(tap.x - x) < 50 && Math.abs(tap.y - TRAY_Y) < 50) : -1;
    if (choice >= 0) {
      this.selected = choice;
    } else if (pressed && !this.flying) {
      const pose = this.pose();
      const tapped = ORDER.find((i) => {
        const p = tuftOnScreen(pose, i);
        return tap && this.clips[i] === null && Math.hypot(tap.x - p.x, tap.y - p.y) < p.r;
      });
      const slot = tapped ?? this.nextSlot();
      if (slot !== undefined) this.flying = { slot, kind: CLIPS[this.selected], from: TRAY_X[this.selected], time: 0 };
    }
    return false;
  }

  private land(slot: number, kind: ClipKind): void {
    this.flying = null;
    const result = paint(this.clips, slot, kind);
    this.clips = result.nails;
    this.placedAt[slot] = this.time;
    const p = tuftOnScreen(this.pose(), slot);
    for (let k = 0; k < 3; k++) this.sparkles.emit(p.x, p.y, this.rng, { spread: 70, speed: 30, size: 7, life: 1.6 });
    if (result.points > 0) this.hud.addPoints(result.points);
    if (isComplete(this.clips)) this.doneTime = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    drawMomentBackground(ctx, WIDTH, 540, t, (x, y, k) => drawTwinkle(ctx, x, y, 8, k * k * k));
    const pose = this.pose();
    drawUnicorn(ctx, pose);

    if (this.doneTime < 0) {
      // Tray of clips, dark so the white-edged clips stand out; the chosen one is bigger and glows.
      ctx.fillStyle = 'rgba(74, 24, 100, 0.88)';
      ctx.fill(blob(WIDTH / 2, TRAY_Y + 4, 330, 46, { seed: 3, wobble: 0.03 }));
      CLIPS.forEach((kind, i) => {
        const chosen = i === this.selected;
        if (chosen) {
          const glow = ctx.createRadialGradient(TRAY_X[i], TRAY_Y, 4, TRAY_X[i], TRAY_Y, 56);
          glow.addColorStop(0, 'rgba(255,255,255,0.75)');
          glow.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(TRAY_X[i] - 56, TRAY_Y - 56, 112, 112);
        }
        drawClip(ctx, TRAY_X[i], TRAY_Y - (chosen ? 6 : 0) + Math.sin(t * 1.5 + i) * 2, chosen ? 30 : 23, kind);
      });
    }

    const next = this.nextSlot();
    if (this.flying) {
      // The clip floats in a soft arc from the tray to its tuft. Its clasp opens on the way
      // and snaps shut on the mane; once the clip sits in place, the clasp is hidden under it.
      const k = easeInOut(this.flying.time / FLY_TIME);
      const to = tuftOnScreen(pose, this.flying.slot);
      const x = this.flying.from + (to.x - this.flying.from) * k;
      const y = TRAY_Y + (to.y - TRAY_Y) * k - Math.sin(k * Math.PI) * 40;
      const size = 30 + (to.r * 0.62 - 30) * k;
      const open = k < 0.7 ? easeInOut(k / 0.7) : 1 - easeInOut((k - 0.7) / 0.3);
      // The mouth of the clasp points the way the clip is going: toward the mane.
      drawClasp(ctx, x, y, size, open, Math.atan2(to.y - TRAY_Y, to.x - this.flying.from));
      drawClip(ctx, x, y, size, this.flying.kind);
    } else if (next !== undefined) {
      const p = tuftOnScreen(pose, next);
      drawDownArrow(ctx, p.x, p.y - p.r * 0.7, 34, t);
    }

    this.sparkles.draw(ctx);
  }
}
