import { describe, expect, it } from 'vitest';
import { OBSTACLES } from '../src/data/obstacles';
import { FASTEST as MAX_SPEED, LEVELS, SLOWEST as START_SPEED } from '../src/data/levels';
import { restingRider, stepRider, type Rider } from '../src/logic/physics';

const DT = 1 / 120;

/** Simulates one jump and returns the heights over time. */
function jump(holdSeconds: number): number[] {
  let rider: Rider = restingRider();
  const heights: number[] = [];
  let t = 0;
  rider = stepRider(rider, { pressed: true, held: true }, DT).rider;
  while (!rider.grounded && t < 3) {
    t += DT;
    rider = stepRider(rider, { pressed: false, held: t < holdSeconds }, DT).rider;
    heights.push(rider.y);
  }
  return heights;
}

const peak = (h: number[]) => Math.max(...h);
const timeAbove = (h: number[], level: number) => h.filter((y) => y > level).length * DT;

describe('stepRider', () => {
  it('stays on the ground without input', () => {
    const r = stepRider(restingRider(), { pressed: false, held: false }, DT);
    expect(r.rider.grounded).toBe(true);
    expect(r.jumped).toBe(false);
  });

  it('jumps on press and lands again', () => {
    const h = jump(0);
    expect(h.length).toBeGreaterThan(10);
    expect(h[h.length - 1]).toBe(0);
  });

  it('holding gives a clearly higher jump than tapping', () => {
    expect(peak(jump(1))).toBeGreaterThan(peak(jump(0)) * 1.4);
  });

  it('cannot jump again in mid-air', () => {
    let r = stepRider(restingRider(), { pressed: true, held: false }, DT).rider;
    const vy = r.vy;
    r = stepRider(r, { pressed: true, held: false }, DT).rider;
    expect(r.vy).toBeLessThan(vy);
  });
});

describe('obstacles are fair', () => {
  const diamond = OBSTACLES.find((o) => o.kind === 'diamond')!;
  const rainbow = OBSTACLES.find((o) => o.kind === 'rainbow')!;
  // Time needed above an obstacle: obstacle width plus rider width, at a given speed.
  const needed = (w: number, speed = MAX_SPEED) => (w + 76) / speed;

  it('a tap clears a diamond', () => {
    expect(timeAbove(jump(0), diamond.hit.h)).toBeGreaterThan(needed(diamond.hit.w));
  });

  // Every obstacle can be cleared at every speed with the jump it promises,
  // with room to spare: a child's timing is not perfect.
  const SLACK = 1.25;
  for (const o of OBSTACLES) {
    for (const { speed } of LEVELS) {
      it(`${o.kind} is cleared with a ${o.jump} at ${speed} px/s, with slack for timing`, () => {
        const jumpTime = o.jump === 'tap' ? 0 : 1;
        expect(timeAbove(jump(jumpTime), o.hit.h)).toBeGreaterThan(needed(o.hit.w, speed) * SLACK);
      });
    }
    if (o.jump === 'hold') {
      it(`${o.kind} needs more than a tap at the slowest speed`, () => {
        expect(timeAbove(jump(0), o.hit.h)).toBeLessThan(needed(o.hit.w, START_SPEED));
      });
    }
  }

  it('a tap does not clear a rainbow on the first level', () => {
    expect(timeAbove(jump(0), rainbow.hit.h)).toBeLessThan(needed(rainbow.hit.w, START_SPEED));
  });

  it('holding clears a rainbow even at the slowest speed', () => {
    expect(timeAbove(jump(1), rainbow.hit.h)).toBeGreaterThan(needed(rainbow.hit.w, START_SPEED));
  });
});
