import { describe, expect, it } from 'vitest';
import { POLISHES } from '../src/data/polishes';
import { bareNails, COMPLETION_BONUS, cycle, isComplete, paint, POINTS_PER_NAIL } from '../src/logic/nails';
import { scoreFor } from '../src/logic/score';

describe('nail station', () => {
  it('gives points for each bare nail and a bonus for the last one', () => {
    let nails = bareNails();
    const earned: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = paint(nails, i, 'pink');
      nails = r.nails;
      earned.push(r.points);
    }
    expect(earned).toEqual([POINTS_PER_NAIL, POINTS_PER_NAIL, POINTS_PER_NAIL, POINTS_PER_NAIL + COMPLETION_BONUS]);
    expect(isComplete(nails)).toBe(true);
  });

  it('allows repainting without extra points', () => {
    const first = paint(bareNails(), 0, 'pink');
    const again = paint(first.nails, 0, 'gold');
    expect(again.points).toBe(0);
    expect(again.nails[0]).toBe('gold');
  });

  it('ignores nails that do not exist', () => {
    const nails = bareNails();
    expect(paint(nails, 9, 'pink')).toEqual({ nails, points: 0 });
  });

  it('wraps the polish selection both ways', () => {
    expect(cycle(0, -1, POLISHES.length)).toBe(POLISHES.length - 1);
    expect(cycle(POLISHES.length - 1, 1, POLISHES.length)).toBe(0);
  });

  it('has unique polish ids, including pink, red, gold and glitter', () => {
    const ids = POLISHES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['pink', 'red', 'gold']));
    expect(POLISHES.some((p) => p.glitter)).toBe(true);
  });

  it('adds bonus points to the distance score', () => {
    expect(scoreFor(100, 30)).toBe(30);
  });
});
