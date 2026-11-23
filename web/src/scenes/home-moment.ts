import { drawHome, drawMom, drawPorridge } from '../art/props';
import { blob, heart } from '../art/shapes';
import { drawMomentBackground } from '../art/ui';
import { drawUnicorn, type Decor } from '../art/unicorn';
import { easeInOut } from '../logic/ease';
import type { Input } from '../systems/input';
import type { StationHud } from './nail-station';
import { WIDTH } from './scene';

export const HOME_POINTS = 50;
/** Seconds: the unicorn walks in, then everyone is happy together for a while. */
const ARRIVE = 2.5;
const STAY = 5;

/** The goal of the ride: home, where mum waits with the porridge. Nothing to press; it ends by itself. */
export class HomeMoment {
  private time = 0;
  private rewarded = false;

  constructor(private readonly hud: StationHud, private readonly decor: Decor) {
    hud.message(null);
  }

  /** Returns true when the moment is over. */
  update(dt: number, input: Input): boolean {
    this.time += dt;
    input.takeTap();
    input.takeKeys();
    input.takePress();
    if (!this.rewarded && this.time >= ARRIVE) {
      this.rewarded = true;
      this.hud.addPoints(HOME_POINTS);
    }
    return this.time > ARRIVE + STAY;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    drawMomentBackground(ctx, WIDTH, 540, t, () => {});
    // Soft ground
    ctx.fillStyle = '#ffc2e3';
    ctx.fill(blob(WIDTH / 2, 500, 520, 60, { seed: 3, wobble: 0.03 }));

    drawHome(ctx, 760, 470, 3);

    ctx.save();
    ctx.translate(560, 474);
    ctx.scale(2, 2);
    drawMom(ctx, -40, 0, t);
    ctx.restore();
    ctx.save();
    ctx.translate(430, 484);
    ctx.scale(1.5, 1.5);
    drawPorridge(ctx, -35, 0, t);
    ctx.restore();

    const k = easeInOut(t / ARRIVE);
    drawUnicorn(ctx, {
      ...this.decor(t),
      x: -140 + k * 370,
      y: 480,
      scale: 1.5,
      run: k < 1 ? t * 5 : 0,
      legAngles: k < 1 ? undefined : [-0.2, 0.1, 0.1, 0.3],
      grounded: true,
      sx: 1,
      sy: 1,
      t,
      cat: { dx: 0, dy: 0, rot: 0 },
    });

    // Home at last: hearts rise slowly.
    if (t > ARRIVE) {
      ctx.fillStyle = '#ff5fa2';
      for (let i = 0; i < 5; i++) {
        const rise = ((t - ARRIVE) * 0.22 + i * 0.2) % 1;
        ctx.globalAlpha = Math.sin(rise * Math.PI);
        ctx.fill(heart(300 + i * 90, 250 - rise * 120 + (i % 2) * 30, 14));
      }
      ctx.globalAlpha = 1;
    }
  }
}
