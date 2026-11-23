import { NAME_WORDS as W } from '../data/names';
import type { Rng } from './random';

/** A player name as indexes into the word lists: look, theme, theme, who. */
export type NameIndexes = readonly [number, number, number, number];

const SIZES = [W.look.length, W.theme.length, W.theme.length, W.who.length] as const;

/** Draws a random name. The two halves of the compound word are always different. */
export function rollName(rng: Rng): NameIndexes {
  const pick = (n: number) => Math.floor(rng() * n);
  const first = pick(W.theme.length);
  // Skip over `first`, so the same word is never used twice ("Tähtitähti").
  const second = (first + 1 + pick(W.theme.length - 1)) % W.theme.length;
  return [pick(W.look.length), first, second, pick(W.who.length)];
}

/** True for a name this game could have drawn. Anything read from storage (or later, sent to a server) is checked. */
export function isValidName(value: unknown): value is NameIndexes {
  return (
    Array.isArray(value) &&
    value.length === SIZES.length &&
    value.every((v, i) => Number.isInteger(v) && v >= 0 && v < SIZES[i]) &&
    value[1] !== value[2]
  );
}

export function formatName(name: NameIndexes): string {
  const [look, first, second, who] = name;
  return `${W.look[look]} ${W.theme[first]}${W.theme[second].toLowerCase()} ${W.who[who]}`;
}
