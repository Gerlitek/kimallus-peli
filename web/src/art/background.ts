import { PALETTE as C } from './palette';
import { blob, softStar } from './shapes';
import { drawTwinkle, flash, GLITTER_COLORS } from './sparkle';
import { seeded } from '../logic/random';

interface Star { x: number; y: number; r: number; phase: number; speed: number }
interface Asteroid { x: number; y: number; r: number; seed: number }
interface Flake { x: number; y: number; size: number; phase: number; fall: number; color: string; depth: number }

const wrap = (v: number, span: number) => ((v % span) + span) % span;

/** Pink galaxy: twinkling sky, falling glitter, drifting asteroids, shooting stars and a glittery cloud floor. */
export class Background {
  private readonly stars: Star[] = [];
  private readonly twinkles: Star[] = [];
  private readonly asteroids: Asteroid[] = [];
  private readonly flakes: Flake[] = [];
  private readonly floorGlints: Star[] = [];

  constructor(private readonly width: number, private readonly height: number, private readonly groundY: number) {
    const rng = seeded(7);
    for (let i = 0; i < 130; i++) {
      this.stars.push({ x: rng() * width, y: rng() * groundY * 0.95, r: 0.8 + rng() * 2, phase: rng() * 6, speed: 1 + rng() * 3 });
    }
    for (let i = 0; i < 22; i++) {
      this.twinkles.push({ x: rng() * width, y: rng() * groundY * 0.85, r: 6 + rng() * 9, phase: rng() * 6, speed: 1.2 + rng() * 2 });
    }
    for (let i = 0; i < 6; i++) {
      this.asteroids.push({ x: rng() * width, y: 40 + rng() * groundY * 0.55, r: 10 + rng() * 26, seed: i });
    }
    for (let i = 0; i < 70; i++) {
      this.flakes.push({
        x: rng() * width,
        y: rng() * height,
        size: 1.5 + rng() * 2.5,
        phase: rng() * 6,
        fall: 12 + rng() * 25,
        color: GLITTER_COLORS[i % GLITTER_COLORS.length],
        depth: 0.3 + rng() * 0.7,
      });
    }
    for (let i = 0; i < 40; i++) {
      this.floorGlints.push({ x: rng() * width, y: groundY + 16 + rng() * (height - groundY - 22), r: 3 + rng() * 5, phase: rng() * 6, speed: 2 + rng() * 3 });
    }
  }

  draw(ctx: CanvasRenderingContext2D, scroll: number, t: number): void {
    const { width: w, height: h, groundY } = this;

    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, C.skyTop);
    sky.addColorStop(1, C.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Soft nebula glows
    for (const [nx, ny, nr, color] of [
      [0.25, 0.3, 220, 'rgba(255,255,255,0.18)'],
      [0.75, 0.2, 260, 'rgba(255,200,240,0.22)'],
      [0.55, 0.65, 200, 'rgba(220,190,255,0.2)'],
    ] as const) {
      const x = wrap(nx * w - scroll * 0.02, w + nr * 2) - nr;
      const g = ctx.createRadialGradient(x, ny * groundY, 0, x, ny * groundY, nr);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - nr, ny * groundY - nr, nr * 2, nr * 2);
    }

    // Tiny twinkling stars
    ctx.fillStyle = C.star;
    for (const s of this.stars) {
      const tw = (Math.sin(t * s.speed + s.phase) + 1) / 2;
      ctx.globalAlpha = 0.25 + tw * 0.75;
      ctx.fill(blob(wrap(s.x - scroll * 0.04, w), s.y, s.r, s.r, { points: 6, wobble: 0 }));
    }
    ctx.globalAlpha = 1;

    // Big flashing sparkles
    for (const s of this.twinkles) {
      const f = flash(t, s.speed, s.phase);
      drawTwinkle(ctx, wrap(s.x - scroll * 0.06, w), s.y, s.r * (0.5 + f * 0.7), 0.15 + f * 0.85, '#ffffff', t * 0.4 + s.phase);
    }

    this.shootingStar(ctx, t);

    for (const a of this.asteroids) {
      const span = w + 120;
      const x = wrap(a.x - scroll * 0.18, span) - 60;
      ctx.fillStyle = C.asteroid;
      ctx.fill(blob(x, a.y, a.r, a.r * 0.82, { seed: a.seed, wobble: 0.14, points: 8 }));
      ctx.fillStyle = C.asteroidShade;
      ctx.fill(blob(x + a.r * 0.25, a.y + a.r * 0.15, a.r * 0.22, a.r * 0.18, { seed: a.seed + 1 }));
      ctx.fill(blob(x - a.r * 0.3, a.y - a.r * 0.2, a.r * 0.14, a.r * 0.12, { seed: a.seed + 2 }));
      // A glint on each asteroid's rim
      drawTwinkle(ctx, x - a.r * 0.55, a.y - a.r * 0.5, a.r * 0.35, flash(t, 1.5, a.seed * 2));
    }

    // Falling glitter, each flake catching the light as it turns
    for (const f of this.flakes) {
      const x = wrap(f.x - scroll * 0.25 * f.depth + Math.sin(t * 1.3 + f.phase) * 12, w);
      const y = wrap(f.y + t * f.fall, h);
      const turn = Math.abs(Math.sin(t * 3 + f.phase));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f.phase + t);
      ctx.globalAlpha = 0.35 + turn * 0.65;
      ctx.fillStyle = f.color;
      ctx.fillRect(-f.size, -f.size * turn * 0.7 - 0.4, f.size * 2, f.size * turn * 1.4 + 0.8);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Cloud floor with glitter
    const floor = ctx.createLinearGradient(0, groundY - 10, 0, h);
    floor.addColorStop(0, C.floorTop);
    floor.addColorStop(1, C.floorBottom);
    ctx.fillStyle = floor;
    ctx.fillRect(0, groundY + 6, w, h - groundY);
    const bump = 46;
    const offset = scroll % bump;
    for (let x = -bump; x < w + bump; x += bump) {
      ctx.fill(blob(x - offset, groundY + 12, bump * 0.62, 14, { seed: Math.floor((x + scroll) / bump) }));
    }
    for (const g of this.floorGlints) {
      drawTwinkle(ctx, wrap(g.x - scroll, w), g.y, g.r, 0.2 + flash(t, g.speed, g.phase) * 0.8, '#ffffff', g.phase);
    }
  }

  /** Every few seconds a shooting star crosses the sky. */
  private shootingStar(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 5;
    const k = (t % period) / 0.9;
    if (k > 1) return;
    const n = Math.floor(t / period);
    const rng = seeded(n + 100);
    const x0 = this.width * (0.4 + rng() * 0.6);
    const y0 = 20 + rng() * this.groundY * 0.3;
    const x = x0 - k * 360;
    const y = y0 + k * 150;
    const tail = ctx.createLinearGradient(x, y, x + 120, y - 50);
    tail.addColorStop(0, 'rgba(255,255,255,0.9)');
    tail.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = tail;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1 - k * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 120, y - 50);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fill(softStar(x, y, 8, 2.5, t * 4));
  }
}
