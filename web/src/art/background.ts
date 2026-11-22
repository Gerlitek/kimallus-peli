import { PALETTE as C } from './palette';
import { blob, softStar } from './shapes';
import { drawTwinkle, GLITTER_COLORS } from './sparkle';
import { seeded } from '../logic/random';

interface Star { x: number; y: number; r: number; phase: number; speed: number }
interface Asteroid { x: number; y: number; r: number; seed: number }
interface CuteStar { x: number; y: number; r: number; phase: number; color: string }
interface Flake { x: number; y: number; size: number; phase: number; color: string }

const wrap = (v: number, span: number) => ((v % span) + span) % span;

/**
 * Pink galaxy, kept calm for small children but full of stars and sparkle:
 * plump pastel stars, soft twinkles and slowly drifting glitter. Nothing flashes;
 * every change of brightness is slow.
 */
export class Background {
  private readonly stars: Star[] = [];
  private readonly twinkles: Star[] = [];
  private readonly asteroids: Asteroid[] = [];
  private readonly cuteStars: CuteStar[] = [];
  private readonly flakes: Flake[] = [];

  constructor(private readonly width: number, private readonly height: number, private readonly groundY: number) {
    const rng = seeded(7);
    for (let i = 0; i < 70; i++) {
      this.stars.push({ x: rng() * width, y: rng() * groundY * 0.95, r: 0.8 + rng() * 2, phase: rng() * 6, speed: 0.6 + rng() * 1 });
    }
    for (let i = 0; i < 6; i++) {
      this.twinkles.push({ x: rng() * width, y: rng() * groundY * 0.85, r: 6 + rng() * 6, phase: rng() * 6, speed: 0.6 + rng() * 0.6 });
    }
    for (let i = 0; i < 3; i++) {
      this.asteroids.push({ x: rng() * width, y: 40 + rng() * groundY * 0.55, r: 10 + rng() * 26, seed: i });
    }
    const starColors = ['#fff3a8', '#ffffff', '#ffd1ea'];
    for (let i = 0; i < 8; i++) {
      this.cuteStars.push({ x: rng() * width, y: 30 + rng() * groundY * 0.7, r: 7 + rng() * 6, phase: rng() * 6, color: starColors[i % 3] });
    }
    for (let i = 0; i < 18; i++) {
      this.flakes.push({ x: rng() * width, y: rng() * height, size: 1.5 + rng() * 2, phase: rng() * 6, color: GLITTER_COLORS[i % GLITTER_COLORS.length] });
    }
  }

  draw(ctx: CanvasRenderingContext2D, scroll: number, t: number): void {
    const { width: w, height: h, groundY } = this;

    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, C.skyTop);
    sky.addColorStop(0.55, C.skyMid);
    sky.addColorStop(1, C.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Soft nebula glows
    for (const [nx, ny, nr, color] of [
      [0.25, 0.3, 220, 'rgba(255,150,220,0.16)'],
      [0.75, 0.2, 260, 'rgba(200,130,255,0.16)'],
      [0.55, 0.65, 200, 'rgba(255,170,220,0.14)'],
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

    // Plump pastel stars: the star theme, gently bobbing
    for (const s of this.cuteStars) {
      const x = wrap(s.x - scroll * 0.05, w);
      const y = s.y + Math.sin(t * 0.8 + s.phase) * 3;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.85;
      ctx.fill(softStar(x, y, s.r, s.r * 0.5, Math.sin(t * 0.4 + s.phase) * 0.15));
    }
    ctx.globalAlpha = 1;

    // Big sparkles
    for (const s of this.twinkles) {
      // Soft, slow pulse: never a sudden flash.
      const f = (Math.sin(t * s.speed + s.phase) + 1) / 2;
      drawTwinkle(ctx, wrap(s.x - scroll * 0.06, w), s.y, s.r * (0.7 + f * 0.3), 0.35 + f * 0.45, '#ffffff', s.phase);
    }


    for (const a of this.asteroids) {
      const span = w + 120;
      const x = wrap(a.x - scroll * 0.18, span) - 60;
      ctx.fillStyle = C.asteroid;
      ctx.fill(blob(x, a.y, a.r, a.r * 0.82, { seed: a.seed, wobble: 0.14, points: 8 }));
      ctx.fillStyle = C.asteroidShade;
      ctx.fill(blob(x + a.r * 0.25, a.y + a.r * 0.15, a.r * 0.22, a.r * 0.18, { seed: a.seed + 1 }));
      ctx.fill(blob(x - a.r * 0.3, a.y - a.r * 0.2, a.r * 0.14, a.r * 0.12, { seed: a.seed + 2 }));
    }

    // A little glitter drifting down slowly; it shimmers softly, never flickers.
    for (const f of this.flakes) {
      const x = wrap(f.x - scroll * 0.15 + Math.sin(t * 0.7 + f.phase) * 10, w);
      const y = wrap(f.y + t * 12, h);
      ctx.globalAlpha = 0.6 + Math.sin(t * 0.9 + f.phase) * 0.2;
      ctx.fillStyle = f.color;
      ctx.fill(softStar(x, y, f.size * 1.4, f.size * 0.6, f.phase, 4));
    }
    ctx.globalAlpha = 1;

    // Cloud floor
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
  }
}
