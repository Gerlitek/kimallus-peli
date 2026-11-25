import { isValidName, type NameIndexes } from './names';

/** One row of the leaderboard, as GET /api/leaderboard returns it. The name is word indexes, never free text. */
export interface ScoreRow {
  name: NameIndexes;
  score: number;
  /** Highest level reached, 1..3. */
  level: number;
  /** The ride got all the way home. */
  home: boolean;
}

/** What the browser sends to POST /api/scores: the row and the random id of this browser session. */
export interface ScoreEntry extends ScoreRow {
  session: string;
}

/** Rows on the leaderboard. */
export const TOP = 10;
export const LEVEL_COUNT = 3;
/** A full ride with everything collected stays far below this. Anything above is not from the game. */
export const MAX_SCORE = 5000;

/**
 * The least a ride has when it reaches each level, and when it gets home: the track to there alone gives this much.
 * A score below it with that level cannot come from the game. `web/test/score-rules.test.ts` ties these to the levels.
 */
export const MIN_SCORE_AT_LEVEL = [0, 70, 110] as const;
export const MIN_SCORE_HOME = 200;

/** The shape of `crypto.randomUUID()`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const intBetween = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/**
 * Checks a score sent over the network and returns it with only the known fields, or null.
 * Home is the end of the last level, so a ride that got home was on that level, and every level takes
 * a known length of track to reach. This stops careless fakes, not careful ones: the game runs in the browser.
 */
export function parseScoreEntry(value: unknown): ScoreEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const { session, name, score, level, home } = value as Record<string, unknown>;
  if (typeof session !== 'string' || !UUID.test(session)) return null;
  if (!isValidName(name)) return null;
  if (!intBetween(score, 0, MAX_SCORE) || !intBetween(level, 1, LEVEL_COUNT)) return null;
  if (typeof home !== 'boolean' || (home && level !== LEVEL_COUNT)) return null;
  if (score < (home ? MIN_SCORE_HOME : MIN_SCORE_AT_LEVEL[level - 1])) return null;
  return { session, name: [name[0], name[1], name[2], name[3]], score, level, home };
}
