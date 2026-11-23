import { drawCupcake } from '../art/cupcake';
import { drawStarFriend } from '../art/friend';
import { blob } from '../art/shapes';
import { drawDownArrow, drawMomentBackground } from '../art/ui';
import { drawUnicorn, type Decor } from '../art/unicorn';
import { easeInOut } from '../logic/ease';
import type { Rng } from '../logic/random';
import type { Input } from '../systems/input';
import { Particles } from '../systems/particles';
import type { StationHud } from './nail-station';
import { WIDTH } from './scene';

export const SHARE_POINTS = 15;

/** One cupcake on a plate between the two friends. */
const PLATE = { x: 480, y: 440 };
const FRIEND = { x: 730, y: 310 };
/** After the cupcake is split, the friend floats this much closer: they eat together. */
const FRIEND_STEP = 120;
/** Where the cat holds its half, and where the friend's half is relative to the friend. */
const CAT_HALF = { x: 240, y: 278 };
const FRIEND_HALF = { dx: -92, dy: 44 };
/** Bite marks on a half, from the top down: x outwards from the cut, y up from the base (cupcake units). */
const BITE_MARKS = [
  [17, -42],
  [21, -22],
  [15, -2],
] as const;
const WHOLE = 2.8;
const HALF = 1.9;
/** Seconds: the friend floats in, the halves travel, then slow bites. Calm on purpose. */
const ARRIVE = 1.6;
const SPLIT = 1.8;
const BITE = 1.4;
const BITES = 4;
const AFTER = 2;

/**
 * A feelings moment told with pictures, not words: there is one cupcake, and a star friend who wishes for some.
 * On a press the cupcake splits in two, each gets a half, and they eat together for a while, bite by bite.
 */
export class ShareMoment {
  private time = 0;
  private sharedAt = -1;
  private rewarded = false;
  private readonly sparkles = new Particles(40);

  /** `decor` is what the unicorn already wears: painted hooves and clips. */
  constructor(private readonly rng: Rng, private readonly hud: StationHud, private readonly decor: Decor) {
    hud.message(null);
  }

  /** Returns true when the player is done and the ride should continue. */
  update(dt: number, input: Input): boolean {
    this.time += dt;
    this.sparkles.update(dt, 0);
    input.takeTap();
    input.takeKeys();
    input.takeShoot();
    const pressed = input.takePress();

    if (this.sharedAt < 0) {
      if (pressed && this.time > ARRIVE) this.sharedAt = this.time;
      return false;
    }

    const since = this.time - this.sharedAt;
    const eaten = SPLIT + BITE * BITES;
    // After the last bite: a few sparkles and the points.
    if (!this.rewarded && since >= eaten) {
      this.rewarded = true;
      this.hud.addPoints(SHARE_POINTS);
      for (let i = 0; i < 5; i++) this.sparkles.emit(PLATE.x - 60, 250, this.rng, { spread: 160, speed: 30, size: 7, life: 1.8 });
    }
    // Continues by itself once both have eaten: nothing to press.
    return since > eaten + AFTER;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    const shared = this.sharedAt >= 0;
    const since = shared ? t - this.sharedAt : 0;
    // 0 while the cupcake is whole on the plate, 1 when each holds a half.
    const k = easeInOut(since / SPLIT);

    drawMomentBackground(ctx, WIDTH, 540, t, () => {});

    drawUnicorn(ctx, {
      ...this.decor(t),
      x: 210,
      y: 480,
      scale: 1.4,
      legAngles: [-0.2, 0.1, 0.1, 0.3],
      run: 0,
      grounded: true,
      sx: 1,
      sy: 1,
      t,
      cat: { dx: 0, dy: 0, rot: 0 },
    });

    const friendX = FRIEND.x + (1 - easeInOut(t / ARRIVE)) * 320 - k * FRIEND_STEP;
    drawStarFriend(ctx, friendX, FRIEND.y, 58, t, shared ? 'happy' : 'hopeful');

    // Plate
    ctx.fillStyle = 'rgba(150, 60, 140, 0.18)';
    ctx.fill(blob(PLATE.x, PLATE.y + 6, 98, 16));
    ctx.fillStyle = '#ffffff';
    ctx.fill(blob(PLATE.x, PLATE.y, 94, 16));
    ctx.fillStyle = '#ffe3f2';
    ctx.fill(blob(PLATE.x, PLATE.y - 2, 66, 9));

    // Bites taken so far; each new one opens softly, then there is time to chew. The last bite finishes the half.
    const bite = Math.max(0, (since - SPLIT) / BITE);
    const eaten = Math.min(BITES, Math.floor(bite) + easeInOut((bite % 1) * 3));
    if (eaten < BITES - 0.5) {
      const size = WHOLE + (HALF - WHOLE) * k;
      const lift = Math.sin(k * Math.PI) * 50;
      const mix = (a: number, b: number) => a + (b - a) * k;
      this.half(ctx, mix(PLATE.x, CAT_HALF.x), mix(PLATE.y - 8, CAT_HALF.y) - lift, size, -1, t, eaten);
      this.half(ctx, mix(PLATE.x, friendX + FRIEND_HALF.dx), mix(PLATE.y - 8, FRIEND.y + FRIEND_HALF.dy) - lift, size, 1, t, eaten);
    }

    if (!shared && t > ARRIVE) {
      this.thought(ctx, friendX + 40, 150, t);
      drawDownArrow(ctx, PLATE.x, PLATE.y - 150, 40, t);
    }

    this.sparkles.draw(ctx);
  }

  /**
   * The left (-1) or right (1) half of the cupcake; the two halves side by side make a whole one.
   * `eaten` bites are missing from its outer edge, each a round bite mark.
   */
  private half(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, side: -1 | 1, t: number, eaten: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(side < 0 ? -40 : 0, -60, 40, 70);
    ctx.clip();
    BITE_MARKS.forEach(([bx, by], i) => {
      const r = 12 * Math.max(0, Math.min(1, eaten - i));
      if (r <= 0) return;
      // Everything except the bite: the outer rectangle minus a circle
      ctx.beginPath();
      ctx.rect(-50, -70, 100, 90);
      ctx.arc(side * bx, by, r, 0, Math.PI * 2);
      ctx.clip('evenodd');
    });
    drawCupcake(ctx, 0, 0, t, 0);
    ctx.restore();
  }

  /** A round thought bubble with a cupcake inside: the friend wishes for some. */
  private thought(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffc46b';
    ctx.lineWidth = 3;
    for (const [dx, dy, r] of [
      [-34, 96, 7],
      [-22, 74, 11],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(x, y + 26);
    ctx.scale(1.1, 1.1);
    drawCupcake(ctx, 0, 0, t, 0);
    ctx.restore();
  }
}
