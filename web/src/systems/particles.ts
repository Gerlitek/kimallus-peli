import { drawTwinkle, GLITTER_COLORS } from '../art/sparkle';
import type { Rng } from '../logic/random';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  spin: number;
}

/** Short-lived glitter: trails and bursts. */
export class Particles {
  private items: Particle[] = [];

  constructor(private readonly max = 160) {}

  emit(x: number, y: number, rng: Rng, opts: { spread?: number; speed?: number; size?: number; life?: number } = {}): void {
    if (this.items.length >= this.max) return;
    const { spread = 10, speed = 60, size = 5, life = 0.8 } = opts;
    const a = rng() * Math.PI * 2;
    this.items.push({
      x: x + (rng() - 0.5) * spread,
      y: y + (rng() - 0.5) * spread,
      vx: Math.cos(a) * speed * rng(),
      vy: Math.sin(a) * speed * rng() - 20,
      life: life * (0.6 + rng() * 0.4),
      maxLife: life,
      size: size * (0.5 + rng()),
      color: GLITTER_COLORS[Math.floor(rng() * GLITTER_COLORS.length)],
      spin: rng() * Math.PI,
    });
  }

  /** `drift` moves everything left with the world. */
  update(dt: number, drift: number): void {
    for (const p of this.items) {
      p.life -= dt;
      p.x += (p.vx - drift) * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;
      p.spin += dt * 3;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  clear(): void {
    this.items = [];
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const k = p.life / p.maxLife;
      drawTwinkle(ctx, p.x, p.y, p.size * (0.4 + k * 0.6), Math.min(1, k * 1.5), p.color, p.spin);
    }
  }
}
