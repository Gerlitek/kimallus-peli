import { isValidName, type NameIndexes } from '../logic/names';

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
