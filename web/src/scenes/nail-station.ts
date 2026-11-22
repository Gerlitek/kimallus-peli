import { drawBottle, drawBrush, fillPolish } from '../art/nails';
import { PALETTE as C } from '../art/palette';
import { blob, heart } from '../art/shapes';
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
const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif';

export interface StationHud {
  message(html: string | null): void;
  /** Points earned here are added to the run's score right away. */
  addPoints(points: number): void;
}

interface Floater {
  x: number;
  y: number;
  text: string;
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
  private earned = 0;

  constructor(private readonly rng: Rng, private readonly hud: StationHud) {
    hud.message(null);
  }

  /** Polish per hoof, so the ride can keep showing the painted hooves. */
  get painted(): Nails {
    return this.nails;
  }

  private pose(): UnicornPose {
    return { ...POSE_BASE, t: this.time, hoof: (ctx, path, box, i) => this.drawHoof(ctx, path, box, i) };
  }

  /** Returns true when the player is done and the ride should continue. */
  update(dt: number, input: Input): boolean {
    this.time += dt;
    this.progress = this.progress.map((p) => Math.min(1, p + dt / PAINT_TIME));
    this.floaters = this.floaters.map((f) => ({ ...f, y: f.y - 40 * dt, life: f.life - dt })).filter((f) => f.life > 0);
    this.sparkles.update(dt, 0);

    const tap = input.takeTap();
    const pressed = input.takePress();
    const keys = input.takeKeys();

    if (this.doneTime >= 0) {
      this.doneTime += dt;
      if (this.doneTime > 0.9 && pressed) {
        this.hud.message(null);
        return true;
      }
      return false;
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
    if (result.points > 0) {
      this.earned += result.points;
      this.hud.addPoints(result.points);
      this.floaters.push({ x: h.x, y: h.y - 40, text: `+${result.points}`, life: 1.2 });
    }
    if (isComplete(this.nails)) {
      this.doneTime = 0;
      for (let i = 0; i < 40; i++) this.sparkles.emit(POSE_BASE.x, 250, this.rng, { spread: 380, speed: 160, size: 8, life: 1.4 });
      this.hud.message(
        `<div class="card"><h2>Ihanat kynnet!</h2><p>Yksisarvinen on tosi iloinen.</p><p>+${this.earned} lumenia</p><p>Jatka matkaa välilyönnillä tai napauttamalla.</p></div>`,
      );
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
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    // Soft veil over the paused ride
    ctx.fillStyle = 'rgba(255, 236, 248, 0.9)';
    ctx.fillRect(0, 0, WIDTH, 540);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e0458f';
    ctx.font = `800 32px ${FONT}`;
    ctx.fillText('Kynsien lakkaus', 28, 48);
    ctx.fillStyle = '#7a4a8a';
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('Valitse lakka ja napauta yksisarvisen kaviota.', 28, 74);
    ctx.fillText('Näppäimistöllä nuolet ja välilyönti.', 28, 94);

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
      const lift = chosen ? 8 + Math.sin(t * 4) * 2 : 0;
      drawBottle(ctx, x, BOTTLE_BOTTOM - lift, polish, t, i * 31 + 7, chosen ? 0.9 : 0.75);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7a4a8a';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(POLISHES[this.selected].name, BOTTLE_X[this.selected], BOTTLE_BOTTOM + 24);

    this.sparkles.draw(ctx);

    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.fillStyle = C.heart;
      ctx.fill(heart(f.x - 26, f.y - 7, 9));
      ctx.font = `800 24px ${FONT}`;
      ctx.fillText(f.text, f.x + 8, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }
}
