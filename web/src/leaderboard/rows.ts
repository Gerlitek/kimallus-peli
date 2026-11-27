// What the leaderboard shows, without React: fetching the rows and placing the player's own best among them.
import { LEVEL_COUNT, TOP, type ScoreRow } from '@kimallus/shared';
import { isValidName, rollName } from '../logic/names';
import { seeded } from '../logic/random';
import { DEMO, getJson, postJson } from '../systems/api';
import { loadName, sessionId, type BestRun } from '../systems/storage';

/** Sends a finished run to the shared leaderboard. The server keeps this session's best. Nothing waits for it. */
export function submitScore(run: BestRun): void {
  const name = loadName();
  if (!name || run.score <= 0 || DEMO) return;
  void postJson('/api/scores', { session: sessionId(), name, ...run });
}

function demoRows(): ScoreRow[] {
  const rng = seeded(11);
  return Array.from({ length: TOP }, (_, i) => {
    const level = i < 3 ? 3 : i < 6 ? 2 : 1;
    return { name: rollName(rng), score: 640 - i * 55, level, home: i < 2 };
  });
}

/** The best scores from the server. Empty without a server. */
export async function fetchScores(): Promise<ScoreRow[]> {
  if (DEMO) return demoRows();
  const rows = await getJson<ScoreRow[]>('/api/leaderboard');
  // Never trust what comes over the network: only well-formed rows are shown.
  return (rows ?? []).filter(
    (r) => isValidName(r.name) && Number.isFinite(r.score) && Number.isInteger(r.level) && r.level >= 1 && r.level <= LEVEL_COUNT,
  );
}

export interface RankedRow {
  row: ScoreRow;
  /** "1." and so on, or "–" for the own row below the top. */
  rank: string;
  own: boolean;
}

/**
 * The top rows with this browser's own best among them. The own row goes where its score puts it;
 * below the top it is shown last, without a rank.
 */
export function rankRows(others: ScoreRow[], own: ScoreRow | null): RankedRow[] {
  const sorted = [...others].sort((a, b) => b.score - a.score).slice(0, TOP);
  const rows: RankedRow[] = sorted.map((row) => ({ row, rank: '', own: false }));
  if (own) {
    const at = sorted.findIndex((r) => own.score >= r.score);
    if (at >= 0 || sorted.length < TOP) {
      rows.splice(at >= 0 ? at : rows.length, 0, { row: own, rank: '', own: true });
    } else {
      return [...rows.map((r, i) => ({ ...r, rank: `${i + 1}.` })), { row: own, rank: '–', own: true }];
    }
  }
  return rows.map((r, i) => ({ ...r, rank: `${i + 1}.` }));
}
