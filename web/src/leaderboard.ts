import { TOP, type ScoreRow } from '@kimallus/shared';
import { formatName, isValidName, rollName } from './logic/names';
import { seeded } from './logic/random';
import { DEMO, getJson, postJson } from './systems/api';
import { loadBest, loadName, sessionId, type BestRun } from './systems/storage';

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

async function fetchScores(): Promise<ScoreRow[]> {
  if (DEMO) return demoRows();
  const rows = await getJson<ScoreRow[]>('/api/leaderboard');
  // Never trust what comes over the network: only well-formed rows are shown.
  return (rows ?? []).filter((r) => isValidName(r.name) && Number.isFinite(r.score));
}

function cell(text: string, cls = ''): HTMLTableCellElement {
  const td = document.createElement('td');
  td.textContent = text;
  if (cls) td.className = cls;
  return td;
}

/**
 * Draws the leaderboard into `root`: the best scores from the server, with this browser's own best among them.
 * Without a server it shows the own best alone, so the layout is the same before and after the API exists.
 */
export async function showLeaderboard(root: HTMLElement): Promise<void> {
  const best = loadBest();
  const name = loadName();
  const own: ScoreRow | null = name && best.score > 0 ? { name, ...best } : null;
  const others = await fetchScores();

  const sorted = [...others].sort((a, b) => b.score - a.score).slice(0, TOP);
  // The own row goes where its score puts it; below the top it is shown last, without a rank.
  const at = own ? sorted.findIndex((r) => own.score >= r.score) : -1;
  const rows: { row: ScoreRow; rank: string; own: boolean }[] = sorted.map((row, i) => ({ row, rank: `${i + 1}.`, own: false }));
  if (own && (at >= 0 || sorted.length < TOP)) {
    rows.splice(at >= 0 ? at : rows.length, 0, { row: own, rank: '', own: true });
    rows.forEach((r, i) => (r.rank = `${i + 1}.`));
  } else if (own) {
    rows.push({ row: own, rank: '–', own: true });
  }

  const body = root.querySelector('tbody')!;
  body.replaceChildren(
    ...rows.map(({ row, rank, own: mine }) => {
      const tr = document.createElement('tr');
      if (mine) tr.className = 'own';
      const reached = '★'.repeat(row.level) + (row.home ? ' 🏠' : '');
      tr.append(cell(rank), cell(formatName(row.name) + (mine ? ' (sinä)' : '')), cell(reached, 'level'), cell(String(row.score)));
      return tr;
    }),
  );
  root.querySelector<HTMLElement>('table')!.hidden = rows.length === 0;
  const note = root.querySelector<HTMLElement>('.note')!;
  note.textContent =
    rows.length === 0
      ? 'Pelaa, niin paras tuloksesi tulee tähän.'
      : others.length === 0
        ? 'Tässä näkyy tämän laitteen paras tulos. Yhteinen taulukko tulee myöhemmin.'
        : '';
  note.hidden = note.textContent === '';
}
