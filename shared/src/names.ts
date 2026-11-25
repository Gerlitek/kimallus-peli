import { NAME_WORDS as W } from './words';

/** A player name as indexes into the word lists: look, theme, theme, who. */
export type NameIndexes = readonly [number, number, number, number];

const SIZES = [W.look.length, W.theme.length, W.theme.length, W.who.length] as const;

/** True for a name this game could have drawn. Anything read from storage or sent to the server is checked. */
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
