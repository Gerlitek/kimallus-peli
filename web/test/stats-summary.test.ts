import { describe, expect, it } from 'vitest';
import { DEMO_SUMMARY } from '../src/stats/demo';
import { isSummary, toCards, toTiles } from '../src/stats/summary';

describe('stats summary', () => {
  it('turns the summary into six tiles', () => {
    const tiles = toTiles(DEMO_SUMMARY);
    expect(tiles).toHaveLength(6);
    expect(tiles[2]).toEqual({ value: '15 %', label: 'pääsi kotiin asti' }); // 17 of 112
    expect(tiles[3].value).toBe('4 min 22 s'); // 262 s
  });

  it('does not divide by zero before anyone has played', () => {
    const empty = { ...DEMO_SUMMARY, games: { started: 0, home: 0, median_duration_s: 0, median_score: 0 } };
    expect(toTiles(empty)[2].value).toBe('–');
  });

  it('sorts the favourites from most to least and drops unknown clips', () => {
    const cards = toCards({ ...DEMO_SUMMARY, clips: { star: 3, bogus: 99, bow: 7 } });
    const clips = cards.find((c) => c.title === 'Suosituimmat klipsit')!;
    expect(clips.bars.map((b) => b.label)).toEqual(['Rusetti', 'Tähti']);
  });

  it('shows days as day.month.', () => {
    const days = toCards(DEMO_SUMMARY)[0];
    expect(days.bars[0]).toMatchObject({ label: '17.11.', value: 6 });
  });

  it('accepts only something shaped like a summary', () => {
    expect(isSummary(DEMO_SUMMARY)).toBe(true);
    expect(isSummary(null)).toBe(false);
    expect(isSummary({ games: {} })).toBe(false);
    expect(isSummary('<html>')).toBe(false);
  });
});
