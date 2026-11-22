/** localStorage can be missing or blocked; the game works without it. */
const BEST_KEY = 'kimallus.best';

export function loadBest(): number {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Not saved; nothing else to do.
  }
}
