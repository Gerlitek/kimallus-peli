import type { ScoreRow } from '@kimallus/shared';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { formatName } from '../logic/names';
import { fetchScores, rankRows } from './rows';
import { getSnapshot, subscribe } from './store';

interface Props {
  /** Where the server rows come from. Tests pass their own. */
  load?: () => Promise<ScoreRow[]>;
}

/**
 * The best scores from the server with this browser's own best among them. Without a server it shows the own best
 * alone, so the layout is the same before and after the API exists.
 */
export function Leaderboard({ load = fetchScores }: Props) {
  const { own, round } = useSyncExternalStore(subscribe, getSnapshot);
  const [others, setOthers] = useState<ScoreRow[]>([]);

  // Fetch again after every round. A late answer from an earlier round is ignored.
  useEffect(() => {
    let current = true;
    void load().then((rows) => {
      if (current) setOthers(rows);
    });
    return () => {
      current = false;
    };
  }, [round, load]);

  const rows = rankRows(others, own);
  const note =
    rows.length === 0
      ? 'Pelaa, niin paras tuloksesi tulee tähän.'
      : others.length === 0
        ? 'Tässä näkyy tämän laitteen paras tulos. Yhteinen taulukko tulee myöhemmin.'
        : '';

  return (
    <>
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Pelinimi</th>
              <th>Taso</th>
              <th>Kimallusta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, rank, own: mine }, i) => (
              <tr key={i} className={mine ? 'own' : undefined}>
                <td>{rank}</td>
                <td>
                  {formatName(row.name)}
                  {mine && ' (sinä)'}
                </td>
                <td className="level">
                  {'★'.repeat(row.level)}
                  {row.home && ' 🏠'}
                </td>
                <td>{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {note && <p className="note">{note}</p>}
    </>
  );
}
