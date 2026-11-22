import { Background } from '../art/background';
import { drawCupcake } from '../art/cupcake';
import { drawHeartShot, drawMoodCloud } from '../art/moods';
import { drawBottle, fillPolish } from '../art/nails';
import { drawDiamond, drawRainbowHurdle } from '../art/props';
import { drawTwinkle, flash } from '../art/sparkle';
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
import { GROUND_Y, HEIGHT, WIDTH, type Scene } from './scene';

type Phase = 'ready' | 'running' | 'fallen';

interface Obstacle {
  def: ObstacleDef;
  x: number;
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
  private trailTimer = 0;
  /** Lumens collected in this run (cupcakes, clouds, stations). */
  private bonus = 0;
  /** A polish bottle on the track: running into it opens the nail station. */
  private pickup: { x: number } | null = null;
  private nextStationAt = FIRST_STATION_AT;
  private station: NailStation | null = null;
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
    this.hud.message(
      '<div class="card"><h2>Kimallus</h2><p>Hyppää välilyönnillä tai napauttamalla. Pidä pohjassa, niin hyppy on korkeampi.</p><p>X tai hiiren oikea ampuu sydämen: se ilahduttaa surulliset pilvet.</p><p>Kerää valoa eli lumeneita.</p></div>',
    );
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
    this.station = null;
    this.hud.score(0);
  }

  private get score(): number {
    return scoreFor(this.distance, this.bonus);
  }

  /** Adds lumens and shows them flying from (x, y) to the counter. */
  private award(lumens: number, x: number, y: number): void {
    this.bonus += lumens;
    this.orbs.burst(x, y, Math.min(lumens, 8), this.rng);
    this.hud.score(this.score);
  }

  update(dt: number, input: Input): void {
    this.time += dt;
    this.orbs.update(dt);
    if (this.station) {
      input.takeShoot();
      if (this.station.update(dt, input)) this.leaveStation();
      return;
    }
    // Positions and arrow keys are only used by stations; drop them here.
    input.takeTap();
    input.takeKeys();
    const pressed = input.takePress();
    const shoot = input.takeShoot();
    this.glitter.update(dt, this.phase === 'running' ? this.speed : 0);

    if (this.phase === 'ready') {
      this.readyTime += dt;
      this.run += dt * 4;
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
      for (let i = 0; i < 10; i++) this.glitter.emit(UNICORN_X, GROUND_Y, this.rng, { spread: 50, speed: 120, size: 6 });
    }
    if (step.jumped) {
      for (let i = 0; i < 8; i++) this.glitter.emit(UNICORN_X, GROUND_Y, this.rng, { spread: 40, speed: 90 });
    }
    // Glitter trail from the rainbow tail
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.03;
      this.glitter.emit(UNICORN_X - 80, GROUND_Y - 50 - this.rider.y, this.rng, { spread: 24, speed: 30, size: 5, life: 0.9 });
    }
    this.squash = Math.max(0, this.squash - dt * 7);

    this.shootHearts(dt, shoot);
    this.updateClouds(dt, this.speed);

    for (const o of this.obstacles) o.x -= dx;
    this.obstacles = this.obstacles.filter((o) => o.x + o.def.width > -20);
    for (const c of this.cupcakes) c.x -= dx;
    this.cupcakes = this.cupcakes.filter((c) => c.x > -30);

    if (this.pickup) {
      this.pickup.x -= dx;
      if (this.pickup.x < -60) {
        this.pickup = null;
        this.nextStationAt = this.distance + STATION_RETRY;
      }
    }

    this.nextSpawnIn -= dx;
    if (this.nextSpawnIn <= 0) this.spawn();

    const me: Box = { x: UNICORN_X + RIDER_HIT.dx, y: this.rider.y, w: RIDER_HIT.w, h: RIDER_HIT.h };
    this.collectCupcakes(me);
    if (this.pickup && overlaps(me, { x: this.pickup.x - 24, y: 0, w: 48, h: 110 })) {
      this.enterStation();
      return;
    }
    if (this.obstacles.some((o) => overlaps(me, { x: o.x + o.def.hit.dx, y: 0, w: o.def.hit.w, h: o.def.hit.h }))) {
      this.fall();
      return;
    }

    this.hud.score(this.score);
  }

  private spawn(): void {
    if (!this.pickup && this.distance >= this.nextStationAt) {
      // The bottle takes an obstacle's place, so it never sits on top of one.
      this.pickup = { x: WIDTH + 40 };
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
        for (let i = 0; i < 8; i++) this.glitter.emit(c.x, sy, this.rng, { spread: 30, speed: 100, size: 6 });
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
        for (let i = 0; i < 16; i++) this.glitter.emit(cloud.x, cloud.y, this.rng, { spread: 60, speed: 140, size: 7 });
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
    this.station = new NailStation(this.rng, {
      message: (html) => this.hud.message(html),
      addPoints: (points) => this.award(points, WIDTH / 2, 300),
    });
  }

  private leaveStation(): void {
    this.hooves = this.station?.painted ?? this.hooves;
    this.station = null;
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
    this.hud.message(
      `<div class="card"><h2>Hups!</h2><p>Kissa putosi kyydistä.</p><p>Keräsit ${score} lumenia valoa${
        record ? '. Uusi ennätys!' : '.'
      }</p><p>Hyppää kyytiin uudelleen välilyönnillä tai napauttamalla.</p></div>`,
    );
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
      if (o.def.kind === 'diamond') drawDiamond(ctx, o.x, GROUND_Y + 4, t);
      else drawRainbowHurdle(ctx, o.x, GROUND_Y + 4, t);
    }
    for (const c of this.cupcakes) drawCupcake(ctx, c.x, GROUND_Y + 2 - c.h + Math.sin(t * 3 + c.seed) * 2, t, c.seed);

    const stretch = this.rider.grounded ? 0 : Math.max(-1, Math.min(1, this.rider.vy / 820));
    const squash = this.squash;
    const sy = 1 + stretch * 0.08 - squash * 0.14;
    const sx = 1 - stretch * 0.05 + squash * 0.12;

    if (this.pickup) this.drawPickup(ctx, this.pickup.x, t);
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

    // The station is drawn over the paused ride.
    this.station?.draw(ctx);
    this.orbs.draw(ctx);
  }

  private drawPickup(ctx: CanvasRenderingContext2D, x: number, t: number): void {
    const bottom = GROUND_Y - 6 + Math.sin(t * 3) * 5;
    const halo = ctx.createRadialGradient(x, bottom - 45, 4, x, bottom - 45, 60);
    halo.addColorStop(0, 'rgba(255,255,255,0.5)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 60, bottom - 105, 120, 120);
    drawBottle(ctx, x, bottom, POLISHES[Math.floor(t / 1.5) % POLISHES.length], t, 5, 0.85);
    drawTwinkle(ctx, x + 22, bottom - 80, 8, flash(t, 3, 0));
    drawTwinkle(ctx, x - 24, bottom - 40, 6, flash(t, 3, 2));

    // "Ota minut!" sign, so the bottle is clearly something to collect, not to jump over.
    const by = bottom - 150 + Math.sin(t * 5) * 4;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e0458f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 62, by - 22, 124, 40, 20);
    ctx.moveTo(x - 9, by + 18);
    ctx.lineTo(x, by + 32);
    ctx.lineTo(x + 9, by + 18);
    ctx.fill();
    ctx.stroke();
    // Hide the outline where the pointer meets the bubble.
    ctx.fillRect(x - 8, by + 14, 16, 6);
    ctx.fillStyle = '#e0458f';
    ctx.font = '800 19px ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ota minut!', x, by - 1);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}
