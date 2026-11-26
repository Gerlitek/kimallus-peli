// The bridge between the game and the React leaderboard. The game is not React: it only calls refreshLeaderboard()
// when something changes (a new name, a finished round). The island reads this with useSyncExternalStore.
import type { ScoreRow } from '@kimallus/shared';
import { loadBest, loadName } from '../systems/storage';

export interface LeaderboardSnapshot {
  /** This browser's best, or null before the first scored round. */
  own: ScoreRow | null;
  /** Grows on every refresh, so the island knows to fetch the server rows again. */
  round: number;
}

const listeners = new Set<() => void>();
let snapshot: LeaderboardSnapshot = read(0);

function read(round: number): LeaderboardSnapshot {
  const name = loadName();
  const best = loadBest();
  return { own: name && best.score > 0 ? { name, ...best } : null, round };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The same object until the next refresh: useSyncExternalStore re-renders only when this changes. */
export function getSnapshot(): LeaderboardSnapshot {
  return snapshot;
}

export function refreshLeaderboard(): void {
  snapshot = read(snapshot.round + 1);
  for (const listener of listeners) listener();
}
