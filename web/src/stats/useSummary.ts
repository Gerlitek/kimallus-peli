import { useEffect, useState } from 'react';
import { isSummary, type Summary } from './summary';

export type SummaryState =
  | { status: 'loading' }
  /** No stats.json yet (the game is not published or not played), or it could not be read. */
  | { status: 'waiting' }
  | { status: 'ready'; summary: Summary; demo: boolean };

/** Loads the nightly summary once. In demo mode the made-up numbers are imported instead, as their own small chunk. */
export function useSummary(demo: boolean, url = '../stats.json'): SummaryState {
  const [state, setState] = useState<SummaryState>({ status: 'loading' });

  useEffect(() => {
    // Abort on unmount, and on React's double effect run in development, so a late answer never sets stale state.
    const controller = new AbortController();
    loadSummary(demo, url, controller.signal).then((next) => {
      if (!controller.signal.aborted) setState(next);
    });
    return () => controller.abort();
  }, [demo, url]);

  return state;
}

async function loadSummary(demo: boolean, url: string, signal: AbortSignal): Promise<SummaryState> {
  if (demo) {
    const { DEMO_SUMMARY } = await import('./demo');
    return { status: 'ready', summary: DEMO_SUMMARY, demo: true };
  }
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return { status: 'waiting' };
    const data: unknown = await res.json();
    return isSummary(data) ? { status: 'ready', summary: data, demo: false } : { status: 'waiting' };
  } catch {
    return { status: 'waiting' };
  }
}
