import { MAX_SCORE, parseScoreEntry } from '@kimallus/shared';
import { describe, expect, it } from 'vitest';
import { counterKey, scoreItem, scoreRow } from '../src/logic/items';

const valid = { session: '3f2b8c1e-9a4d-4e6f-8b1a-2c3d4e5f6a7b', name: [1, 1, 2, 0], score: 248, level: 3, home: true };

describe('score validation', () => {
  it('accepts a score from the game and drops unknown fields', () => {
    expect(parseScoreEntry({ ...valid, extra: '<script>' })).toEqual(valid);
  });

  it('rejects everything else', () => {
    const bad: unknown[] = [
      null,
      'text',
      [],
      { ...valid, session: 'me' },
      { ...valid, name: [0, 1, 1, 0] },
      { ...valid, name: 'Tähti' },
      { ...valid, score: MAX_SCORE + 1 },
      { ...valid, score: 1.5 },
      { ...valid, score: '148' },
      { ...valid, level: 4 },
      { ...valid, level: 0 },
      { ...valid, home: 'yes' },
      // Home is behind the last level.
      { ...valid, level: 1, home: true },
      // Too few points for the track it claims to have covered.
      { ...valid, score: 199 },
      { ...valid, score: 109, home: false },
      { ...valid, score: 69, level: 2, home: false },
    ];
    for (const value of bad) expect(parseScoreEntry(value)).toBeNull();
  });
});

describe('table items', () => {
  const item = scoreItem(parseScoreEntry(valid)!, new Date('2026-11-25T18:00:00Z'));

  it('keys a score by its session and puts it on the leaderboard index', () => {
    expect(item).toEqual({ pk: `SESSION#${valid.session}`, board: 'all', name: valid.name, score: 248, level: 3, home: true, at: '2026-11-25T18:00:00.000Z' });
  });

  it('shows only the public fields', () => {
    expect(scoreRow(item as unknown as Record<string, unknown>)).toEqual({ name: valid.name, score: 248, level: 3, home: true });
  });
});

describe('daily counters', () => {
  it('keys a counter by route and UTC day and lets it expire a day after the day ends', () => {
    const { pk, expires } = counterKey('scores', new Date('2026-11-25T23:59:00Z'));
    expect(pk).toBe('COUNT#scores#2026-11-25');
    expect(new Date(expires * 1000).toISOString()).toBe('2026-11-27T00:00:00.000Z');
  });
});
