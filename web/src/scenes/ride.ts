import { Background } from '../art/background';
import { drawClip } from '../art/clips';
import { drawCupcake } from '../art/cupcake';
import { drawHeartShot, drawMoodCloud } from '../art/moods';
import { drawBottle, fillCoats } from '../art/nails';
import { drawDiamond, drawGate, drawHome, drawMom, drawPorridge, drawRainbowHurdle, drawRiver, GEMS } from '../art/props';
import { drawTwinkle, flash } from '../art/sparkle';
import { softStar } from '../art/shapes';
import { drawStar } from '../art/star';
import { drawDownArrow } from '../art/ui';
import { endCard, playCard } from './cards';
import { drawUnicorn, type Decor } from '../art/unicorn';
import { OBSTACLES, type ObstacleDef } from '../data/obstacles';
import type { ClipKind } from '../data/clips';
import { GATE_RETRY, LEVELS, MOM_BY, STATIONS_BEFORE_GATE } from '../data/levels';
import { POLISHES } from '../data/polishes';
import { overlaps, type Box } from '../logic/collision';
import { arcOver, planStars, ROW, STAR } from '../logic/stars';
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
import { restingRider, stepRider, type Rider } from '../logic/physics';
import { seeded, type Rng } from '../logic/random';
import { FIRST_STATION_AT, LUMENS, scoreFor, STATION_EVERY, STATION_RETRY } from '../logic/score';
import { gapAfter, pickObstacle } from '../logic/spawn';
import type { Input } from '../systems/input';
import { LumenOrbs } from '../systems/lumens';
import { Particles } from '../systems/particles';
import { submitScore } from '../leaderboard';
import { loadBest, saveBest } from '../systems/storage';
import { HomeMoment } from './home-moment';
import { ManeStation } from './mane-station';
import { NailStation } from './nail-station';
import { ShareMoment } from './share-moment';
import { GROUND_Y, HEIGHT, WIDTH, type Scene } from './scene';

type Phase = 'ready' | 'running' | 'fallen';
/** Things on the track that open a calm moment. */
type PickupKind = 'polish' | 'clip' | 'share' | 'gate' | 'home';

interface Obstacle {
  def: ObstacleDef;
  x: number;
  /** Which gemstone a diamond is. */
  variant: number;
  /** Already bumped into on a gentle level: it does not trip the unicorn twice. */
  bumped?: boolean;
}

interface Star {
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
const FALL_SHOW = 2.5;
/** Ignores presses right after returning, so a late jump does not start a new game by accident. */
const READY_GUARD = 0.5;
/** Sad clouds drift slower than the ground: they are far away. */
const CLOUD_DRIFT = 0.5;
/** Mum stands this far to the right of her bowl's left edge. */
const MOM_BEHIND = 70;
/** The cupcake to share appears after this many stars in a run. */
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
  private stars: Star[] = [];
  /** There is only one mum: she is seen once in a run, beside the first bowl of porridge. */
  private mom: { x: number } | null = null;
  private momSeen = false;
  private hearts: Heart[] = [];
  private clouds: SkyCloud[] = [];
  private nextSpawnIn = 0;
  private nextCloud = 0;
  private shootCooldown = 0;
  private time = 0;
  private distance = 0;
  private speed = LEVELS[0].speed;
  /** Index into LEVELS. Every run starts from the first, calm level. */
  private level = 0;
  private nextGateAt = LEVELS[0].gateAfter;
  private stationsThisRun = 0;
  /** 1 right after bumping into something on a gentle level, fading to 0: the unicorn slows for a moment. */
  private stumble = 0;
  /** The run ended at home, not in a fall. */
  private home = false;
  private run = 0;
  private squash = 0;
  private fallTime = 0;
  private readyTime = 0;
  private best = loadBest().score;
  /** The best score already written to the browser's storage; `best` follows it when a run ends. */
  private saved = this.best;
  private readonly glitter = new Particles();
  private readonly orbs: LumenOrbs;
  /** Lumens collected in this run (stars, clouds, stations). */
  private bonus = 0;
  /** Something special on the track: running into it opens a calm moment, jumping over skips it. */
  private pickup: { x: number; kind: PickupKind } | null = null;
  private nextShareAt = 0;
  private nextStationAt = FIRST_STATION_AT;
  /** A calm moment over the paused ride: a station or the sharing moment. */
  private pause: NailStation | ManeStation | ShareMoment | HomeMoment | null = null;
  /** Stations offered on the track during this visit: nails and mane take turns. */
  private stationsOffered = 0;
  private starsCollected = 0;
  private shared = false;
  /** Painted hooves stay for the rest of the visit, also in later runs. */
  private hooves: readonly (readonly string[])[] = [[], [], [], []];
  /** Clips in the mane stay too. */
  private clips: readonly (string | null)[] = [];

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
    this.stars = [];
    this.mom = null;
    this.momSeen = false;
    this.hearts = [];
    this.clouds = [];
    this.nextSpawnIn = 600;
    this.nextCloud = 1.5;
    this.distance = 0;
    this.speed = LEVELS[0].speed;
    this.level = 0;
    this.nextGateAt = LEVELS[0].gateAfter;
    this.stationsThisRun = 0;
    this.stumble = 0;
    this.home = false;
    this.squash = 0;
    this.fallTime = 0;
    this.glitter.clear();
    this.orbs.clear();
    this.bonus = 0;
    this.pickup = null;
    this.nextStationAt = FIRST_STATION_AT;
    this.pause = null;
    this.starsCollected = 0;
    this.shared = false;
    this.nextShareAt = 0;
    this.hud.score(0);
  }

  /** Painted hooves and clips: the same on the ride and in every calm moment. */
  private readonly decor: Decor = (t) => ({
    hoof: (c, path, box, i) => fillCoats(c, path, box, this.hooves[i], t, i * 17 + 3, 3),
    clip: (c, x, y, r, i) => {
      const kind = this.clips[i] as ClipKind | null | undefined;
      if (kind) drawClip(c, x, y, r * 0.62, kind);
    },
  });

  /**
   * Saves a new best score the moment it is reached, not only when a run ends:
   * a child may stop with Esc or simply close the window, and the first level never ends by itself.
   */
  private keepBest(): void {
    if (this.score <= this.saved) return;
    this.saved = this.score;
    saveBest({ score: this.saved, level: this.level + 1, home: false });
  }

  private get score(): number {
    return scoreFor(this.distance, this.bonus);
  }

  /** Adds lumens and shows them flying from (x, y) to the counter. */
  private award(lumens: number, x: number, y: number): void {
    this.bonus += lumens;
    this.orbs.burst(x, y, Math.min(lumens, 3), this.rng);
    this.hud.score(this.score);
    this.keepBest();
  }

  update(dt: number, input: Input): void {
    this.time += dt;
    // Esc leaves the game and returns to the start screen.
    if (input.takeQuit() && this.phase !== 'ready') {
      this.best = this.saved;
      this.hud.ended();
      this.enter();
      return;
    }
    this.orbs.update(dt);
    if (this.pause) {
      input.takeShoot();
      if (this.pause.update(dt, input)) this.leavePause();
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
      this.run += dt * 2.5;
      // Waiting to go: the unicorn hops gently on the spot.
      const hop = Math.max(0, Math.sin(this.time * 2.5)) * 30;
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

    // The speed is steady on a level and glides to the new one after a gate.
    const level = LEVELS[this.level];
    this.speed += (level.speed - this.speed) * Math.min(1, dt * 1.5);
    this.stumble = Math.max(0, this.stumble - dt);
    const dx = this.speed * (1 - 0.6 * this.stumble) * dt;
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

    for (const o of this.obstacles) o.x -= dx;
    this.obstacles = this.obstacles.filter((o) => o.x + o.def.width > -20);
    for (const s of this.stars) s.x -= dx;
    this.stars = this.stars.filter((s) => s.x > -30);
    if (this.mom) {
      this.mom.x -= dx;
      if (this.mom.x < -120) this.mom = null;
    }

    if (this.pickup) {
      this.pickup.x -= dx;
      if (this.pickup.x < -60) {
        // Skipped: it comes back a little later.
        const kind = this.pickup.kind;
        if (kind === 'gate' || kind === 'home') this.nextGateAt = this.distance + GATE_RETRY;
        else if (kind === 'share') this.nextShareAt = this.distance + STATION_RETRY;
        else this.nextStationAt = this.distance + STATION_RETRY;
        this.pickup = null;
      }
    }

    this.nextSpawnIn -= dx;
    if (this.nextSpawnIn <= 0) this.spawn();

    const me: Box = { x: UNICORN_X + RIDER_HIT.dx, y: this.rider.y, w: RIDER_HIT.w, h: RIDER_HIT.h };
    this.collectStars(me);
    if (this.pickup && overlaps(me, { x: this.pickup.x - 24, y: 0, w: 48, h: 110 })) {
      const kind = this.pickup.kind;
      if (kind === 'gate') this.enterLevel();
      else if (kind === 'home') this.enterHome();
      else if (kind === 'share') this.enterShare();
      else this.enterStation(kind);
      return;
    }
    const hit = this.obstacles.find((o) => !o.bumped && overlaps(me, { x: o.x + o.def.hit.dx, y: 0, w: o.def.hit.w, h: o.def.hit.h }));
    if (hit && level.gentle) {
      // On a gentle level nothing ends: the unicorn stumbles, slows for a moment and carries on.
      hit.bumped = true;
      this.stumble = 1;
      this.squash = 1;
    } else if (hit) {
      this.end(false);
      return;
    }

    this.hud.score(this.score);
    this.keepBest();
  }

  private spawn(): void {
    // A special pickup takes an obstacle's place, so it never sits on top of one.
    const share = !this.shared && this.starsCollected >= SHARE_AFTER && this.distance >= this.nextShareAt;
    const station = this.distance >= this.nextStationAt;
    // No hurry on the first level: its gate waits until the stations and mum have been met.
    const explored = this.level > 0 || (this.momSeen && this.stationsThisRun >= STATIONS_BEFORE_GATE);
    const gate = explored && this.distance >= this.nextGateAt;
    const gap = LEVELS[this.level].gap;
    if (!this.pickup && (share || station || gate)) {
      // Nails and mane take turns each time one is offered, so jumping over one brings the other next.
      const calm = this.stationsOffered % 2 === 0 ? 'polish' : 'clip';
      if (!share && station) {
        this.stationsOffered += 1;
        this.stationsThisRun += 1;
      }
      // After the last level the gate is home, the goal.
      const onward = this.level < LEVELS.length - 1 ? 'gate' : 'home';
      this.pickup = { x: WIDTH + 40, kind: share ? 'share' : station ? calm : onward };
      this.nextSpawnIn = 60 + gapAfter(this.speed, this.rng, gap);
      return;
    }
    const overdue = !this.momSeen && this.distance >= MOM_BY ? OBSTACLES.find((o) => o.kind === 'porridge') : undefined;
    const def = overdue ?? pickObstacle(OBSTACLES, this.distance, this.rng);
    const x = WIDTH + 40;
    const after = gapAfter(this.speed, this.rng, gap);
    this.obstacles.push({ def, x, variant: Math.floor(this.rng() * GEMS.length) });
    this.nextSpawnIn = def.width + after;
    if (def.kind === 'porridge' && !this.momSeen) {
      this.momSeen = true;
      this.mom = { x: x + MOM_BEHIND };
    }

    const plan = planStars(this.rng);
    const seed = Math.floor(this.rng() * 1000);
    if (plan === 'arc') {
      const centre = x + def.hit.dx + def.hit.w / 2;
      arcOver(def.kind).forEach((s, i) => this.stars.push({ x: centre + s.dx, h: s.h, seed: seed + i }));
    } else if (plan === 'row') {
      const start = x + def.width + after * 0.35;
      ROW.forEach((s, i) => this.stars.push({ x: start + s.dx, h: s.h, seed: seed + i }));
    }
  }

  private collectStars(me: Box): void {
    this.stars = this.stars.filter((c) => {
      const hit = overlaps(me, { x: c.x - STAR.w / 2, y: c.h, w: STAR.w, h: STAR.h });
      if (hit) {
        const sy = GROUND_Y - c.h - 17;
        this.award(LUMENS.star, c.x, sy);
        this.starsCollected += 1;
        for (let i = 0; i < 3; i++) this.glitter.emit(c.x, sy, this.rng, { spread: 24, speed: 50, size: 5 });
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

  private enterStation(kind: 'polish' | 'clip'): void {
    this.pickup = null;
    this.nextStationAt = this.distance + STATION_EVERY;
    this.rider = restingRider();
    this.glitter.clear();
    this.hearts = [];
    this.pause = kind === 'polish' ? new NailStation(this.rng, this.pauseHud(), this.decor) : new ManeStation(this.rng, this.pauseHud(), this.decor);
  }

  /** Through the gate: the next level begins. Its own gate comes after a while. */
  private enterLevel(): void {
    this.pickup = null;
    this.level += 1;
    this.nextGateAt = this.distance + LEVELS[this.level].gateAfter;
    for (let i = 0; i < 6; i++) this.glitter.emit(UNICORN_X, GROUND_Y - 80, this.rng, { spread: 90, speed: 40, size: 7, life: 1.4 });
  }

  /** Home after the last level: a calm moment with mum, and then the run ends happily. */
  private enterHome(): void {
    this.pickup = null;
    this.rider = restingRider();
    this.glitter.clear();
    this.hearts = [];
    this.pause = new HomeMoment(this.pauseHud(), this.decor);
  }

  private pauseHud() {
    return {
      message: (html: string | null) => this.hud.message(html),
      addPoints: (points: number) => this.award(points, WIDTH / 2, 300),
    };
  }

  /** Once per run: after sharing, the cupcake does not come again. */
  private enterShare(): void {
    this.pickup = null;
    this.shared = true;
    this.rider = restingRider();
    this.glitter.clear();
    this.hearts = [];
    this.pause = new ShareMoment(this.rng, this.pauseHud(), this.decor);
  }

  private leavePause(): void {
    if (this.pause instanceof NailStation) this.hooves = this.pause.painted;
    if (this.pause instanceof ManeStation) this.clips = this.pause.placed;
    const home = this.pause instanceof HomeMoment;
    this.pause = null;
    if (home) {
      this.end(true);
      return;
    }
    // Clear the track just ahead, so the ride does not continue straight into an obstacle.
    this.obstacles = this.obstacles.filter((o) => o.x > UNICORN_X + 500);
    this.nextSpawnIn = Math.max(this.nextSpawnIn, 300);
  }

  /** The run is over: a fall, or home at the goal. */
  private end(home: boolean): void {
    this.phase = 'fallen';
    this.home = home;
    this.fallTime = 0;
    this.hearts = [];
    const score = this.score;
    // Reaching home is part of the best run, so it is written again with that mark.
    if (home && score >= this.saved) saveBest({ score, level: this.level + 1, home });
    submitScore({ score, level: this.level + 1, home });
    const record = score > this.best;
    if (record) {
      this.best = score;
      this.hud.best(score);
    }
    this.hud.message(endCard(score, record, this.level + 1, home));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    this.bg.draw(ctx, this.distance, t);

    for (const c of this.clouds) {
      ctx.globalAlpha = c.mood ? Math.max(0, 1 - c.joy / 2.5) : 1;
      drawMoodCloud(ctx, c.x, c.y, CLOUD.rx, CLOUD.ry, c.mood, t, c.seed);
    }
    ctx.globalAlpha = 1;

    const gy = GROUND_Y + 4;
    // Mum stands a step back from the track, behind her bowl: the unicorn passes in front of her.
    if (this.mom) drawMom(ctx, this.mom.x, gy - 10, t);
    for (const o of this.obstacles) {
      if (o.def.kind === 'diamond') drawDiamond(ctx, o.x, gy, t, o.variant);
      else if (o.def.kind === 'rainbow') drawRainbowHurdle(ctx, o.x, gy, t);
      else if (o.def.kind === 'river') drawRiver(ctx, o.x, gy, t);
      else drawPorridge(ctx, o.x, gy, t);
    }
    for (const c of this.stars) drawStar(ctx, c.x, GROUND_Y + 2 - c.h + Math.sin(t * 2 + c.seed) * 2, t, c.seed);

    const stretch = this.rider.grounded ? 0 : Math.max(-1, Math.min(1, this.rider.vy / 640));
    const squash = this.squash;
    const sy = 1 + stretch * 0.08 - squash * 0.14;
    const sx = 1 - stretch * 0.05 + squash * 0.12;

    if (this.pickup) this.drawPickup(ctx, this.pickup, t);
    this.glitter.draw(ctx);

    const fall = this.phase === 'fallen' && !this.home ? Math.min(1, this.fallTime / 0.5) : 0;
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
      ...this.decor(t),
    });

    for (const h of this.hearts) drawHeartShot(ctx, h.x, h.y, t);

    // The level so far, as stars: no numbers to read.
    LEVELS.forEach((_, i) => {
      ctx.fillStyle = i <= this.level ? '#ffd23f' : 'rgba(255,255,255,0.25)';
      ctx.fill(softStar(WIDTH / 2 + (i - (LEVELS.length - 1) / 2) * 30, 28, 11, 5));
    });

    // Calm moments are drawn over the paused ride.
    this.pause?.draw(ctx);
    this.orbs.draw(ctx);
  }

  /** A polish bottle, a hair clip or the big sharing cupcake, glowing, with an arrow: collect it or jump over to skip. */
  private drawPickup(ctx: CanvasRenderingContext2D, pickup: { x: number; kind: PickupKind }, t: number): void {
    const x = pickup.x;
    const bottom = GROUND_Y - 6 + Math.sin(t * 2) * 5;
    const halo = ctx.createRadialGradient(x, bottom - 45, 4, x, bottom - 45, 70);
    halo.addColorStop(0, 'rgba(255,255,255,0.6)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 70, bottom - 115, 140, 140);
    if (pickup.kind === 'polish') {
      drawBottle(ctx, x, bottom, POLISHES[Math.floor(t / 3) % POLISHES.length], t, 5, 0.85);
    } else if (pickup.kind === 'gate') {
      drawGate(ctx, x, bottom + 4, this.level + 2, t);
    } else if (pickup.kind === 'home') {
      drawHome(ctx, x, bottom + 4, 1.1);
    } else if (pickup.kind === 'clip') {
      drawClip(ctx, x, bottom - 42, 32, 'bow');
    } else {
      // One big cupcake: the only treat on the ride, and meant for sharing.
      ctx.save();
      ctx.translate(x, bottom);
      ctx.scale(2, 2);
      drawCupcake(ctx, 0, 0, t, 0);
      ctx.restore();
    }
    drawTwinkle(ctx, x + 22, bottom - 80, 8, flash(t, 3, 0));
    drawTwinkle(ctx, x - 24, bottom - 40, 6, flash(t, 3, 2));

    // A bouncing arrow: collect this, do not jump over it.
    const tall = pickup.kind === 'gate' || pickup.kind === 'home';
    drawDownArrow(ctx, x, bottom - (tall ? 134 : 108), 40, t);
  }
}
