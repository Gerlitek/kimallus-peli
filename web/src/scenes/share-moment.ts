import { drawCupcake } from '../art/cupcake';
import { drawStarFriend } from '../art/friend';
import { drawMoodCloud } from '../art/moods';
import { blob } from '../art/shapes';
import { drawGiveArrow, drawMomentBackground } from '../art/ui';
import { drawUnicorn } from '../art/unicorn';
import type { Rng } from '../logic/random';
import type { Input } from '../systems/input';
import { Particles } from '../systems/particles';
import type { StationHud } from './nail-station';
import { WIDTH } from './scene';

export const SHARE_POINTS = 15;

/** The cat has two cupcakes on its plate; the friend's plate is empty. */
const CAT_PLATE = { x: 410, y: 440 };
const FRIEND_PLATE = { x: 720, y: 440 };
const FRIEND = { x: 720, y: 320 };
const SCALE = 1.9;
/** Seconds after the press: the cupcake flies, then both eat in three bites. */
const FLY = 1.1;
const BITE = 0.45;
const BITES = 3;
const DONE = FLY + BITE * BITES + 0.4;

/**
 * A feelings moment told with things you can count and faces, not words:
 * the cat has two cupcakes, the star friend has none and wishes for one.
 * The cat is sad to give one away; on a press one cupcake flies to the friend's plate.
 * Then both eat, bite by bite, and both are happy: one and one is more fun than two and none.
 */
export class ShareMoment {
  private time = 0;
  private sharedAt = -1;
  private rewarded = false;
  private readonly sparkles = new Particles(140);

  constructor(private readonly rng: Rng, private readonly hud: StationHud) {
    hud.message(null);
  }

  private get since(): number {
    return this.sharedAt < 0 ? -1 : this.time - this.sharedAt;
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
      if (pressed && this.time > 1.2) this.sharedAt = this.time;
      return false;
    }

    const since = this.since;
    // After the last bite: a few hearts and the points. Kept calm on purpose.
    if (!this.rewarded && since >= FLY + BITE * BITES) {
      this.rewarded = true;
      this.hud.addPoints(SHARE_POINTS);
      for (const plate of [CAT_PLATE, FRIEND_PLATE]) {
        for (let i = 0; i < 6; i++) this.sparkles.emit(plate.x, plate.y - 90, this.rng, { spread: 30, speed: 70, size: 7 });
      }
    }
    // Continues by itself once both have eaten: nothing to press.
    return since > DONE + 0.6;
  }

  /** The giving arc from the cat's plate to the friend's plate. */
  private flyPos(k: number): { x: number; y: number } {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const from = { x: CAT_PLATE.x + 30, y: CAT_PLATE.y - 8 };
    const to = { x: FRIEND_PLATE.x, y: FRIEND_PLATE.y - 8 };
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - Math.sin(e * Math.PI) * 190 };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    const since = this.since;
    const shared = since >= 0;
    const landed = since >= FLY;
    const happy = since >= FLY + BITE * BITES;

    drawMomentBackground(ctx, WIDTH, 540, t, () => {});

    drawUnicorn(ctx, {
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
      catMood: landed ? 'happy' : 'sad',
    });

    const friendX = FRIEND.x + Math.max(0, 1 - t / 0.8) * 320;
    drawStarFriend(ctx, friendX, FRIEND.y, 58, t, landed ? 'happy' : 'hopeful');

    this.plate(ctx, CAT_PLATE.x, CAT_PLATE.y);
    this.plate(ctx, friendX, FRIEND_PLATE.y);

    // Each bite makes both cupcakes a step smaller.
    const bites = landed ? Math.min(BITES, Math.floor((since - FLY) / BITE) + 1) : 0;
    const size = SCALE * (1 - (bites / BITES) * 0.7);
    const chew = landed && !happy ? 1 + Math.sin(t * 28) * 0.05 : 1;

    if (!happy) {
      // The cat's own cupcake always stays on its plate.
      this.cupcake(ctx, CAT_PLATE.x - 32, CAT_PLATE.y - 8, landed ? size * chew : SCALE, t, 0);
      if (!shared) {
        // The second one wiggles: this is the one to give.
        const wiggle = Math.sin(t * 8) * 0.08;
        this.cupcake(ctx, CAT_PLATE.x + 30, CAT_PLATE.y - 8, SCALE * (1 + Math.sin(t * 5) * 0.05), t, 1, wiggle);
        if (t > 1.2) drawGiveArrow(ctx, CAT_PLATE.x + 90, friendX - 90, 360, t);
        this.thought(ctx, friendX + 40, 160, t);
      } else if (!landed) {
        const p = this.flyPos(since / FLY);
        this.cupcake(ctx, p.x, p.y, SCALE * 1.15, t, 1, Math.sin(since * 10) * 0.2);
      } else {
        this.cupcake(ctx, friendX, FRIEND_PLATE.y - 8, size * chew, t, 1);
      }
    }

    // Feeling clouds: the cat's is sad until the friend has a cupcake too.
    drawMoodCloud(ctx, 210, 100, 64, 38, landed ? 'heart-eyes' : null, t, 3);

    this.sparkles.draw(ctx);
  }

  private plate(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = 'rgba(150, 60, 140, 0.18)';
    ctx.fill(blob(x, y + 6, 78, 14));
    ctx.fillStyle = '#ffffff';
    ctx.fill(blob(x, y, 74, 14));
    ctx.fillStyle = '#ffe3f2';
    ctx.fill(blob(x, y - 2, 52, 8));
  }

  private cupcake(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, t: number, seed: number, rot = 0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    drawCupcake(ctx, 0, 0, t, seed);
    ctx.restore();
  }

  /** A round thought bubble with a cupcake inside: the friend wishes for one. */
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
    this.cupcake(ctx, x, y + 26, 1.1, t, 1);
  }
}
