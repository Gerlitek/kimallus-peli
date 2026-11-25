import type { ScoreEntry, ScoreRow } from '@kimallus/shared';

/**
 * How a score is laid out in the DynamoDB table.
 *
 * Table key `pk`: one item per browser session, so a second score from the same session cannot be added.
 * Index `leaderboard`: partition key `board` (the same value on every score) and sort key `score`,
 * so the best scores are read in order with one Query. Items without `board` are not in the index.
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
