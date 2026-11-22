import { describe, expect, it } from 'vitest';
import { OBSTACLES } from '../src/data/obstacles';
import { overlaps } from '../src/logic/collision';
import { seeded } from '../src/logic/random';
import { MAX_SPEED, scoreFor, speedAt, START_SPEED } from '../src/logic/score';
import { gapAfter, pickObstacle } from '../src/logic/spawn';

describe('pickObstacle', () => {
  it('only offers unlocked obstacles', () => {
    const rng = seeded(3);
    for (let i = 0; i < 200; i++) expect(pickObstacle(OBSTACLES, 0, rng).kind).toBe('diamond');
  });

  it('offers every obstacle later on', () => {
    const rng = seeded(3);
    const kinds = new Set(Array.from({ length: 200 }, () => pickObstacle(OBSTACLES, 1e6, rng).kind));
    expect(kinds).toEqual(new Set(OBSTACLES.map((o) => o.kind)));
  });
});

describe('gapAfter', () => {
  it('scales with speed and stays in range', () => {
    const rng = seeded(5);
    for (let i = 0; i < 100; i++) {
      const g = gapAfter(500, rng);
      expect(g).toBeGreaterThanOrEqual(500 * 1.6);
      expect(g).toBeLessThanOrEqual(500 * 2.6);
    }
  });
});

describe('score and speed', () => {
  it('speeds up to a cap', () => {
    expect(speedAt(0)).toBe(START_SPEED);
    expect(speedAt(1000)).toBe(MAX_SPEED);
  });

  it('counts lumens from distance and adds collected ones', () => {
    expect(scoreFor(0)).toBe(0);
    expect(scoreFor(399)).toBe(1);
    expect(scoreFor(400, 15)).toBe(17);
  });
});

describe('overlaps', () => {
  it('detects touching boxes and ignores separate ones', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps(a, { x: 0, y: 11, w: 10, h: 10 })).toBe(false);
  });
});
