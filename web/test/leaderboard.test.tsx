// @vitest-environment jsdom
import { TOP, type NameIndexes, type ScoreRow } from '@kimallus/shared';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Leaderboard } from '../src/leaderboard/Leaderboard';
import { rankRows } from '../src/leaderboard/rows';
import { refreshLeaderboard } from '../src/leaderboard/store';
import { saveBest, saveName } from '../src/systems/storage';

const NAME: NameIndexes = [0, 0, 1, 0];
const row = (score: number): ScoreRow => ({ name: [1, 1, 2, 1], score, level: 1, home: false });

describe('rankRows', () => {
  it('places the own best where its score puts it', () => {
    const ranked = rankRows([row(300), row(100)], row(200));
    expect(ranked.map((r) => [r.rank, r.row.score, r.own])).toEqual([
      ['1.', 300, false],
      ['2.', 200, true],
      ['3.', 100, false],
    ]);
  });

  it('shows the own best last, without a rank, when it is below a full top', () => {
    const top = Array.from({ length: TOP }, (_, i) => row(1000 - i));
    const ranked = rankRows(top, row(5));
    expect(ranked).toHaveLength(TOP + 1);
    expect(ranked.at(-1)).toMatchObject({ rank: '–', own: true });
  });

  it('is empty with no rows and no own best', () => {
    expect(rankRows([], null)).toEqual([]);
  });
});

describe('Leaderboard island', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('asks to play when there is nothing to show', async () => {
    refreshLeaderboard();
    render(<Leaderboard load={async () => []} />);
    expect(await screen.findByText(/Pelaa, niin paras tuloksesi/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('follows the game: a finished round updates the own row without remounting', async () => {
    saveName(NAME);
    saveBest({ score: 120, level: 2, home: false });
    refreshLeaderboard();
    render(<Leaderboard load={async () => []} />);
    expect(await screen.findByText('120')).toBeTruthy();
    expect(screen.getByText(/Tässä näkyy tämän laitteen paras tulos/)).toBeTruthy();

    // The game saves a new best and tells the store; React re-renders from the new snapshot.
    saveBest({ score: 260, level: 3, home: true });
    act(() => refreshLeaderboard());
    expect(await screen.findByText('260')).toBeTruthy();
    expect(screen.queryByText('120')).toBeNull();
  });

  it('fetches the server rows again after every round', async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      return [row(500)];
    };
    refreshLeaderboard();
    render(<Leaderboard load={load} />);
    expect(await screen.findByText('500')).toBeTruthy();
    const before = calls;

    await act(async () => refreshLeaderboard());
    expect(calls).toBe(before + 1);
  });
});
