import { NAME_WORDS as W, type NameIndexes } from '@kimallus/shared';
import type { Rng } from './random';

// The word lists and the validity rule are shared with the API, which accepts only names the game could draw.
export { formatName, isValidName, type NameIndexes } from '@kimallus/shared';

/** Draws a random name. The two halves of the compound word are always different. */
export function rollName(rng: Rng): NameIndexes {
  const pick = (n: number) => Math.floor(rng() * n);
  const first = pick(W.theme.length);
  // Skip over `first`, so the same word is never used twice ("Tähtitähti").
  const second = (first + 1 + pick(W.theme.length - 1)) % W.theme.length;
  return [pick(W.look.length), first, second, pick(W.who.length)];
}
