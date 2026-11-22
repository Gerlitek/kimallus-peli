import { softStar } from '../art/shapes';
import type { Rng } from '../logic/random';

/** A lumen: a small ball of starlight, the game's unit of points. */
export function drawLumen(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number): void {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
  halo.addColorStop(0, 'rgba(255, 246, 200, 0.9)');
  halo.addColorStop(0.4, 'rgba(255, 210, 235, 0.45)');
  halo.addColorStop(1, 'rgba(255, 210, 235, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
  ctx.fillStyle = '#ffffff';
  ctx.fill(softStar(x, y, r * 1.25, r * 0.45, t * 2, 4));
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

/**
 * Light orbs that burst out of whatever gave lumens and fly to the counter.
 * The points are already counted; the orbs show where they went.
 */
export class LumenOrbs {
  private orbs: Orb[] = [];
  private t = 0;

  constructor(private readonly target: { x: number; y: number }, private readonly onArrive: () => void) {}

  burst(x: number, y: number, count: number, rng: Rng): void {
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const speed = 80 + rng() * 140;
      this.orbs.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 60, age: -i * 0.04 });
    }
  }

  clear(): void {
    this.orbs = [];
  }

  update(dt: number): void {
    this.t += dt;
    const { x: tx, y: ty } = this.target;
    const left: Orb[] = [];
    for (const o of this.orbs) {
      o.age += dt;
      if (o.age < 0.3) {
        // Burst outwards, slowing down
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.vx *= 1 - dt * 3;
        o.vy *= 1 - dt * 3;
      } else {
        // Home in on the counter, faster and faster
        const k = Math.min(1, dt * (3 + (o.age - 0.3) * 14));
        o.x += (tx - o.x) * k;
        o.y += (ty - o.y) * k;
      }
      if (o.age > 0.3 && Math.hypot(tx - o.x, ty - o.y) < 12) this.onArrive();
      else left.push(o);
    }
    this.orbs = left;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const o of this.orbs) drawLumen(ctx, o.x, o.y, 6, this.t + o.vx);
  }
}
