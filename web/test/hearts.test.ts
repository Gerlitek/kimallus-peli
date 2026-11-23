import { describe, expect, it } from 'vitest';
import { OBSTACLES } from '../src/data/obstacles';
import { arcOver, ROW, STAR } from '../src/logic/stars';
import { CLOUD, heartGone, hitsCloud, launchHeart, stepHeart } from '../src/logic/hearts';
import { restingRider, stepRider } from '../src/logic/physics';

const WIDTH = 960;
const GROUND_Y = 440;
/** Tail tip when the unicorn stands on the ground. */
const TAIL = { x: 180, y: GROUND_Y + 6 - 142 };

describe('hearts', () => {
  it('fly right and gently up, then leave the screen', () => {
    let h = launchHeart(TAIL.x, TAIL.y);
    const start = h;
    h = stepHeart(h, 0.5);
    expect(h.x).toBeGreaterThan(start.x);
    expect(h.y).toBeLessThan(start.y);
    for (let i = 0; i < 20; i++) h = stepHeart(h, 0.1);
    expect(heartGone(h, WIDTH)).toBe(true);
  });

  it('hit a cloud they pass through and miss one far above', () => {
    const cloud = { x: 400, y: 300, ...CLOUD };
    expect(hitsCloud({ x: 400, y: 300, vx: 0, vy: 0 }, cloud)).toBe(true);
    expect(hitsCloud({ x: 400, y: 200, vx: 0, vy: 0 }, cloud)).toBe(false);
  });

  it('can reach clouds at every height from the ground, somewhere on screen', () => {
    for (let y = GROUND_Y - 300; y <= GROUND_Y - 150; y += 10) {
      let h = launchHeart(TAIL.x, TAIL.y);
      let hit = false;
      // A cloud waiting at x for the heart; try positions across the screen.
      for (let x = TAIL.x + 60; x < WIDTH && !hit; x += 20) {
        h = launchHeart(TAIL.x, TAIL.y);
        while (!heartGone(h, WIDTH) && !hit) {
          hit = hitsCloud(h, { x, y, ...CLOUD });
          h = stepHeart(h, 1 / 120);
        }
      }
      expect(hit, `cloud at y=${y}`).toBe(true);
    }
  });
});

describe('cupcakes', () => {
  const peak = (holdSeconds: number) => {
    let r = stepRider(restingRider(), { pressed: true, held: true }, 1 / 120).rider;
    let top = 0;
    let t = 0;
    while (!r.grounded) {
      t += 1 / 120;
      r = stepRider(r, { pressed: false, held: t < holdSeconds }, 1 / 120).rider;
      top = Math.max(top, r.y);
    }
    return top;
  };

  it('arcs sit above the obstacle, so they never hide inside it', () => {
    for (const o of OBSTACLES) {
      for (const s of arcOver(o.kind)) {
        const overBar = Math.abs(s.dx) < o.hit.w / 2;
        if (overBar) expect(s.h).toBeGreaterThan(o.hit.h);
      }
    }
  });

  it('the top of each arc is reachable: a tap for diamonds, a held jump for rainbows', () => {
    // The rider's 60 px tall box must reach a star's bottom edge.
    const reach = (jumpPeak: number) => jumpPeak + 60;
    for (const o of OBSTACLES) {
      const top = Math.max(...arcOver(o.kind).map((s) => s.h));
      expect(top, o.kind).toBeLessThan(reach(peak(o.jump === 'tap' ? 0 : 1)));
    }
  });

  it('arcs have at most three stars', () => {
    for (const o of OBSTACLES) expect(arcOver(o.kind).length).toBeLessThanOrEqual(3);
  });

  it('ground rows are collected just by running', () => {
    for (const s of ROW) expect(s.h).toBeLessThan(60);
    expect(STAR.h).toBeGreaterThan(0);
  });
});
