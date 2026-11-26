import type { ScoreEntry, ScoreRow } from '@kimallus/shared';

/**
 * How items are laid out in the one DynamoDB table.
 *
 * Score: key `pk` = `SESSION#<id>`, one item per browser session holding the session's best run.
 * Index `leaderboard`: partition key `board` (the same value on every score) and sort key `score`,
 * so the best scores are read in order with one Query.
 * Daily counter: key `pk` = `COUNT#<route>#<day>`. It has no `board`, so it is not in the index (a sparse index).
 */
export const LEADERBOARD_INDEX = 'leaderboard';
export const BOARD = 'all';

export interface ScoreItem extends ScoreRow {
  pk: string;
  board: typeof BOARD;
  /** When the score was saved, ISO 8601. */
  at: string;
}

export function scoreItem(entry: ScoreEntry, now: Date): ScoreItem {
  const { session, ...row } = entry;
  return { pk: `SESSION#${session}`, board: BOARD, ...row, at: now.toISOString() };
}

/** The public row: the session id and the time stay in the table. */
export function scoreRow(item: Record<string, unknown>): ScoreRow {
  const { name, score, level, home } = item as unknown as ScoreItem;
  return { name, score, level, home };
}

const DAY_S = 24 * 60 * 60;

/**
 * The counter for `route` on the UTC day of `now`. `expires` is the TTL attribute (epoch seconds):
 * DynamoDB deletes the item by itself, without a write charge, a day after its day is over.
 */
export function counterKey(route: string, now: Date): { pk: string; expires: number } {
  const day = now.toISOString().slice(0, 10);
  const dayEnd = Date.parse(`${day}T00:00:00Z`) / 1000 + DAY_S;
  return { pk: `COUNT#${route}#${day}`, expires: dayEnd + DAY_S };
}
