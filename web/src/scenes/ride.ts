import { Background } from '../art/background';
import { drawCupcake } from '../art/cupcake';
import { drawHeartShot, drawMoodCloud } from '../art/moods';
import { drawBottle, fillPolish } from '../art/nails';
import { drawDiamond, drawMom, drawRainbowHurdle, drawRiver } from '../art/props';
import { drawTwinkle, flash } from '../art/sparkle';
import { drawDownArrow } from '../art/ui';
import { heart } from '../art/shapes';
import { fallCard, playCard } from './cards';
import { drawUnicorn } from '../art/unicorn';
import { OBSTACLES, type ObstacleDef } from '../data/obstacles';
import { POLISHES } from '../data/polishes';
import { overlaps, type Box } from '../logic/collision';
import { arcOver, CUPCAKE, planCupcakes, ROW } from '../logic/cupcakes';
import {
  CLOUD,
  cloudY,
  HEART,
  heartGone,
  hitsCloud,
  launchHeart,
  nextCloudIn,
  pickMood,
  stepHeart,
  type Heart,
  type Mood,
} from '../logic/hearts';
import { bareNails, type Nails } from '../logic/nails';
import { restingRider, stepRider, type Rider } from '../logic/physics';
import { seeded, type Rng } from '../logic/random';
import { FIRST_STATION_AT, LUMENS, scoreFor, speedAt, START_SPEED, STATION_EVERY, STATION_RETRY } from '../logic/score';
import { gapAfter, pickObstacle } from '../logic/spawn';
import type { Input } from '../systems/input';
import { LumenOrbs } from '../systems/lumens';
import { Particles } from '../systems/particles';
import { loadBest, saveBest } from '../systems/storage';
import { NailStation } from './nail-station';
import { ShareMoment } from './share-moment';
import { GROUND_Y, HEIGHT, WIDTH, type Scene } from './scene';

type Phase = 'ready' | 'running' | 'fallen';

interface Obstacle {
  def: ObstacleDef;
  x: number;
  /** Set once the unicorn is past it. */
  passed?: boolean;
}

/** A little heart that floats up and fades: the cat's happy answer, without words. */
interface Floater {
  x: number;
  y: number;
  life: number;
}

interface Cupcake {
  x: number;
  /** Bottom edge's height above the ground. */
  h: number;
  seed: number;
}

interface SkyCloud {
  x: number;
  y: number;
  seed: number;
  /** Null while sad; set when a heart cheers it up. */
  mood: Mood | null;
  /** Seconds since it was cheered up: it rises and fades. */
  joy: number;
}

const UNICORN_X = 230;
/** Forgiving hit box around the unicorn's body and legs. */
const RIDER_HIT = { dx: -38, w: 76, h: 60 };
/** Tip of the cat's tail, relative to the unicorn's feet: hearts start here. */
const TAIL_TIP = { dx: -50, dy: -142 };
/** Where the lumen counter sits on screen; light orbs fly there. */
const COUNTER = { x: 34, y: 30 };
/** How long the fall is shown before returning to the start screen. */
const FALL_SHOW = 1.6;
/** Ignores presses right after returning, so a late jump does not start a new game by accident. */
const READY_GUARD = 0.5;
/** Sad clouds drift slower than the ground: they are far away. */
const CLOUD_DRIFT = 0.5;
/** The special sharing cupcake appears after this many cupcakes in a run. */
const SHARE_AFTER = 6;


export interface RideHud {
  score(value: number): void;
  best(value: number): void;
  message(html: string | null): void;
  /** A light orb reached the counter. */
  pulse(): void;
  /** A game starts: the page goes full screen. */
  started(): void;
  /** A game is over: back to the start screen. */
  ended(): void;
}

export class RideScene implements Scene {
  private readonly bg = new Background(WIDTH, HEIGHT, GROUND_Y);
  private rng: Rng = seeded(1);
  private phase: Phase = 'ready';
  private rider: Rider = restingRider();
  private obstacles: Obstacle[] = [];
  private cupcakes: Cupcake[] = [];
  private hearts: Heart[] = [];
  private clouds: SkyCloud[] = [];
  private nextSpawnIn = 0;
  private nextCloud = 0;
  private shootCooldown = 0;
  private time = 0;
  private runTime = 0;
  private distance = 0;
  private speed = START_SPEED;
  private run = 0;
  private squash = 0;
  private fallTime = 0;
  private readyTime = 0;
  private best = loadBest();
  private readonly glitter = new Particles();
  private readonly orbs: LumenOrbs;
  /** Lumens collected in this run (cupcakes, clouds, stations). */
  private bonus = 0;
  /** A polish bottle on the track: running into it opens the nail station. */
  /** Something special on the track: running into it opens a calm moment, jumping over skips it. */
  private pickup: { x: number; kind: 'polish' | 'share' } | null = null;
  private nextShareAt = 0;
  private nextStationAt = FIRST_STATION_AT;
  /** A calm moment over the paused ride: the nail station or the sharing moment. */
  private pause: NailStation | ShareMoment | null = null;
  private cupcakesEaten = 0;
  private shared = false;
  private floaters: Floater[] = [];
  /** Painted hooves stay for the rest of the visit, also in later runs. */
  private hooves: Nails = bareNails();

  constructor(private readonly hud: RideHud) {
    this.orbs = new LumenOrbs(COUNTER, () => hud.pulse());
  }

  enter(): void {
    this.reset();
    this.phase = 'ready';
    this.readyTime = READY_GUARD;
    this.hud.best(this.best);
    this.hud.message(playCard());
  }

  exit(): void {
    this.hud.message(null);
  }

  private reset(): void {
    this.rng = seeded(Date.now());
    this.rider = restingRider();
    this.obstacles = [];
    this.cupcakes = [];
    this.hearts = [];
    this.clouds = [];
    this.nextSpawnIn = 600;
    this.nextCloud = 1.5;
    this.runTime = 0;
    this.distance = 0;
    this.speed = START_SPEED;
    this.squash = 0;
    this.fallTime = 0;
    this.glitter.clear();
    this.orbs.clear();
    this.bonus = 0;
    this.pickup = null;
    this.nextStationAt = FIRST_STATION_AT;
    this.pause = null;
    this.cupcakesEaten = 0;
    this.shared = false;
    this.nextShareAt = 0;
    this.floaters = [];
    this.hud.score(0);
  }

  private get score(): number {
    return scoreFor(this.distance, this.bonus);
  }

  /** Adds lumens and shows them flying from (x, y) to the counter. */
  private award(lumens: number, x: number, y: number): void {
    this.bonus += lumens;
    this.orbs.burst(x, y, Math.min(lumens, 3), this.rng);
    this.hud.score(this.score);
  }

  update(dt: number, input: Input): void {
    this.time += dt;
    this.orbs.update(dt);
    if (this.pause) {
      input.takeShoot();
      if (this.pause.update(dt, input)) this.leavePause();
      return;
    }
    this.floaters = this.floaters.map((f) => ({ ...f, y: f.y - 35 * dt, life: f.life - dt })).filter((f) => f.life > 0);

    // Positions and arrow keys are only used by stations; drop them here.
    input.takeTap();
    input.takeKeys();
    const pressed = input.takePress();
    const shoot = input.takeShoot();
    this.glitter.update(dt, this.phase === 'running' ? this.speed : 0);

    if (this.phase === 'ready') {
      this.readyTime += dt;
      this.run += dt * 4;
      // Waiting to go: the unicorn hops happily on the spot.
      const hop = Math.max(0, Math.sin(this.time * 4)) * 34;
      this.rider = { ...restingRider(), y: hop, grounded: hop < 1 };
      if (pressed && this.readyTime > READY_GUARD) {
        this.reset();
        this.phase = 'running';
        this.hud.message(null);
        this.hud.started();
      }
      return;
    }

    if (this.phase === 'fallen') {
      this.fallTime += dt;
      this.updateClouds(dt, 0);
      if (this.fallTime > FALL_SHOW) {
        this.phase = 'ready';
        this.readyTime = 0;
        this.hud.ended();
      }
      return;
    }

    this.runTime += dt;
    this.speed = speedAt(this.runTime);
    const dx = this.speed * dt;
    this.distance += dx;
    this.run += dt * (this.speed / 30);

    const step = stepRider(this.rider, { pressed, held: input.held }, dt);
    this.rider = step.rider;
    if (step.landed) {
      this.squash = 1;
      for (let i = 0; i < 4; i++) this.glitter.emit(UNICORN_X, GROUND_Y, this.rng, { spread: 40, speed: 70, size: 5 });
    }
    this.squash = Math.max(0, this.squash - dt * 7);

    this.shootHearts(dt, shoot);
    this.updateClouds(dt, this.speed);

    for (const o of this.obstacles) {
      o.x -= dx;
      if (!o.passed && o.x + o.def.width < UNICORN_X - 30) {
        o.passed = true;
        // Past the call to come and eat: the cat giggles little hearts.
        if (o.def.kind === 'mom') {
          for (let i = 0; i < 4; i++) {
            this.floaters.push({ x: UNICORN_X - 40 + i * 18, y: GROUND_Y - 170 - this.rider.y - (i % 2) * 14, life: 1.4 + i * 0.1 });
          }
        }
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x + o.def.width > -20);
    for (const c of this.cupcakes) c.x -= dx;
    this.cupcakes = this.cupcakes.filter((c) => c.x > -30);

    if (this.pickup) {
      this.pickup.x -= dx;
      if (this.pickup.x < -60) {
        // Skipped: it comes back a little later.
        if (this.pickup.kind === 'polish') this.nextStationAt = this.distance + STATION_RETRY;
        else this.nextShareAt = this.distance + STATION_RETRY;
        this.pickup = null;
      }
    }

    this.nextSpawnIn -= dx;
    if (this.nextSpawnIn <= 0) this.spawn();

    const me: Box = { x: UNICORN_X + RIDER_HIT.dx, y: this.rider.y, w: RIDER_HIT.w, h: RIDER_HIT.h };
    this.collectCupcakes(me);
    if (this.pickup && overlaps(me, { x: this.pickup.x - 24, y: 0, w: 48, h: 110 })) {
      if (this.pickup.kind === 'polish') this.enterStation();
      else this.enterShare();
      return;
    }
    if (this.obstacles.some((o) => overlaps(me, { x: o.x + o.def.hit.dx, y: 0, w: o.def.hit.w, h: o.def.hit.h }))) {
      this.fall();
      return;
    }

    this.hud.score(this.score);
  }

  private spawn(): void {
    // A special pickup takes an obstacle's place, so it never sits on top of one.
    const share = !this.shared && this.cupcakesEaten >= SHARE_AFTER && this.distance >= this.nextShareAt;
    const polish = this.distance >= this.nextStationAt;
    if (!this.pickup && (share || polish)) {
      this.pickup = { x: WIDTH + 40, kind: share ? 'share' : 'polish' };
      this.nextSpawnIn = 60 + gapAfter(this.speed, this.rng);
      return;
    }
    const def = pickObstacle(OBSTACLES, this.distance, this.rng);
    const x = WIDTH + 40;
    const gap = gapAfter(this.speed, this.rng);
    this.obstacles.push({ def, x });
    this.nextSpawnIn = def.width + gap;

    const plan = planCupcakes(this.rng);
    const seed = Math.floor(this.rng() * 1000);
    if (plan === 'arc') {
      const centre = x + def.hit.dx + def.hit.w / 2;
      arcOver(def.kind).forEach((s, i) => this.cupcakes.push({ x: centre + s.dx, h: s.h, seed: seed + i }));
    } else if (plan === 'row') {
      const start = x + def.width + gap * 0.35;
      ROW.forEach((s, i) => this.cupcakes.push({ x: start + s.dx, h: s.h, seed: seed + i }));
    }
  }

  private collectCupcakes(me: Box): void {
    this.cupcakes = this.cupcakes.filter((c) => {
      const hit = overlaps(me, { x: c.x - CUPCAKE.w / 2, y: c.h, w: CUPCAKE.w, h: CUPCAKE.h });
      if (hit) {
        const sy = GROUND_Y - c.h - 20;
        this.award(LUMENS.cupcake, c.x, sy);
        this.cupcakesEaten += 1;
        for (let i = 0; i < 4; i++) this.glitter.emit(c.x, sy, this.rng, { spread: 24, speed: 70, size: 5 });
      }
      return !hit;
    });
  }

  private shootHearts(dt: number, shoot: boolean): void {
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    if (shoot && this.shootCooldown === 0) {
      this.shootCooldown = HEART.cooldown;
      this.hearts.push(launchHeart(UNICORN_X + TAIL_TIP.dx, GROUND_Y + 6 - this.rider.y + TAIL_TIP.dy));
    }
    const flying: Heart[] = [];
    for (const h of this.hearts) {
      const next = stepHeart(h, dt);
      const cloud = this.clouds.find((c) => c.mood === null && hitsCloud(next, { x: c.x, y: c.y, ...CLOUD }));
      if (cloud) {
        cloud.mood = pickMood(this.rng);
        this.award(LUMENS.cloud, cloud.x, cloud.y);
        for (let i = 0; i < 6; i++) this.glitter.emit(cloud.x, cloud.y, this.rng, { spread: 40, speed: 80, size: 6 });
      } else if (!heartGone(next, WIDTH)) {
        flying.push(next);
      }
    }
    this.hearts = flying;
  }

  private updateClouds(dt: number, speed: number): void {
    this.nextCloud -= dt;
    if (this.nextCloud <= 0 && speed > 0) {
      this.nextCloud = nextCloudIn(this.rng);
      this.clouds.push({ x: WIDTH + 80, y: cloudY(this.rng, GROUND_Y), seed: Math.floor(this.rng() * 100), mood: null, joy: 0 });
    }
    for (const c of this.clouds) {
      c.x -= speed * CLOUD_DRIFT * dt;
      if (c.mood) {
        c.joy += dt;
        c.y -= 40 * dt;
      }
    }
    this.clouds = this.clouds.filter((c) => c.x > -80 && c.joy < 2.5);
  }

  private enterStation(): void {
    this.pickup = null;
    this.nextStationAt = this.distance + STATION_EVERY;
    this.rider = restingRider();
    this.glitter.clear();
    this.hearts = [];
    this.pause = new NailStation(this.rng, this.pauseHud());
  }

  private pauseHud() {
    return {
      message: (html: string | null) => this.hud.message(html),
      addPoints: (points: number) => this.award(points, WIDTH / 2, 300),
    };
  }

  /** Once per run: after sharing, the special cupcake does not come again. */
  private enterShare(): void {
    this.pickup = null;
    this.shared = true;
    this.rider = restingRider();
    this.glitter.clear();
    this.hearts = [];
    this.pause = new ShareMoment(this.rng, this.pauseHud());
  }

  private leavePause(): void {
    if (this.pause instanceof NailStation) this.hooves = this.pause.painted;
    this.pause = null;
    // Clear the track just ahead, so the ride does not continue straight into an obstacle.
    this.obstacles = this.obstacles.filter((o) => o.x > UNICORN_X + 500);
    this.nextSpawnIn = Math.max(this.nextSpawnIn, 300);
  }

  private fall(): void {
    this.phase = 'fallen';
    this.fallTime = 0;
    this.hearts = [];
    const score = this.score;
    const record = score > this.best;
    if (record) {
      this.best = score;
      saveBest(score);
      this.hud.best(score);
    }
    this.hud.message(fallCard(score, record));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    this.bg.draw(ctx, this.distance, t);

    for (const c of this.clouds) {
      ctx.globalAlpha = c.mood ? Math.max(0, 1 - c.joy / 2.5) : 1;
      drawMoodCloud(ctx, c.x, c.y, CLOUD.rx, CLOUD.ry, c.mood, t, c.seed);
    }
    ctx.globalAlpha = 1;

    for (const o of this.obstacles) {
      const gy = GROUND_Y + 4;
      if (o.def.kind === 'diamond') drawDiamond(ctx, o.x, gy, t);
      else if (o.def.kind === 'rainbow') drawRainbowHurdle(ctx, o.x, gy, t);
      else if (o.def.kind === 'river') drawRiver(ctx, o.x, gy, t);
      else {
        // She waves harder as the unicorn comes close.
        const excite = Math.max(0, Math.min(1, 1 - (o.x - UNICORN_X - 60) / 220));
        drawMom(ctx, o.x, gy, t, excite);
      }
    }
    for (const c of this.cupcakes) drawCupcake(ctx, c.x, GROUND_Y + 2 - c.h + Math.sin(t * 3 + c.seed) * 2, t, c.seed);

    const stretch = this.rider.grounded ? 0 : Math.max(-1, Math.min(1, this.rider.vy / 820));
    const squash = this.squash;
    const sy = 1 + stretch * 0.08 - squash * 0.14;
    const sx = 1 - stretch * 0.05 + squash * 0.12;

    if (this.pickup) this.drawPickup(ctx, this.pickup, t);
    this.glitter.draw(ctx);

    const fall = this.phase === 'fallen' ? Math.min(1, this.fallTime / 0.5) : 0;
    drawUnicorn(ctx, {
      x: UNICORN_X,
      y: GROUND_Y + 6 - this.rider.y,
      run: this.run,
      grounded: this.rider.grounded,
      sx,
      sy,
      t,
      cat: { dx: -fall * 70, dy: fall * fall * 95, rot: -fall * 1.4 },
      hoofScale: 1.3,
      hoof: (c, path, box, i) => {
        const polish = POLISHES.find((p) => p.id === this.hooves[i]);
        if (polish) fillPolish(c, path, box, polish, t, i * 17 + 3, 3);
      },
    });

    for (const h of this.hearts) drawHeartShot(ctx, h.x, h.y, t);

    ctx.fillStyle = '#ff5fa2';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.fill(heart(f.x, f.y, 10));
    }
    ctx.globalAlpha = 1;

    // Calm moments are drawn over the paused ride.
    this.pause?.draw(ctx);
    this.orbs.draw(ctx);
  }

  /** A polish bottle or the big sharing cupcake, glowing, with an arrow: collect it or jump over to skip. */
  private drawPickup(ctx: CanvasRenderingContext2D, pickup: { x: number; kind: 'polish' | 'share' }, t: number): void {
    const x = pickup.x;
    const bottom = GROUND_Y - 6 + Math.sin(t * 3) * 5;
    const halo = ctx.createRadialGradient(x, bottom - 45, 4, x, bottom - 45, 70);
    halo.addColorStop(0, 'rgba(255,255,255,0.6)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 70, bottom - 115, 140, 140);
    if (pickup.kind === 'polish') {
      drawBottle(ctx, x, bottom, POLISHES[Math.floor(t / 1.5) % POLISHES.length], t, 5, 0.85);
    } else {
      // Twice the size of a normal cupcake: special, and meant for sharing.
      ctx.save();
      ctx.translate(x, bottom);
      ctx.scale(2, 2);
      drawCupcake(ctx, 0, 0, t, 0);
      ctx.restore();
    }
    drawTwinkle(ctx, x + 22, bottom - 80, 8, flash(t, 3, 0));
    drawTwinkle(ctx, x - 24, bottom - 40, 6, flash(t, 3, 2));

    // A bouncing arrow: collect this, do not jump over it.
    drawDownArrow(ctx, x, bottom - 108, 40, t);
  }
}
