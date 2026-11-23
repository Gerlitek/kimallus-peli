import { isValidName, type NameIndexes } from '../logic/names';

/** localStorage can be missing or blocked; the game works without it. */
const BEST_KEY = 'kimallus.best';

/** The best run in this browser: the score, the level reached and whether the ride got home. */
export interface BestRun {
  score: number;
  level: number;
  home: boolean;
}

export function loadBest(): BestRun {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(BEST_KEY) ?? '0');
    // Earlier versions stored the score alone, as a number.
    if (typeof v === 'number' && Number.isFinite(v)) return { score: v, level: 1, home: false };
    const run = v as Partial<BestRun> | null;
    if (run && Number.isFinite(run.score) && Number.isFinite(run.level)) {
      return { score: Number(run.score), level: Number(run.level), home: run.home === true };
    }
  } catch {
    // Unreadable: start from nothing.
  }
  return { score: 0, level: 1, home: false };
}

export function saveBest(run: BestRun): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(run));
  } catch {
    // Not saved; nothing else to do.
  }
}

const NAME_KEY = 'kimallus.name';

/** The player's drawn name, or null when there is none yet (or it is no longer valid). */
export function loadName(): NameIndexes | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(NAME_KEY) ?? 'null');
    return isValidName(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveName(name: NameIndexes): void {
  try {
    localStorage.setItem(NAME_KEY, JSON.stringify(name));
  } catch {
    // Not saved; a new name is drawn next time.
  }
}
