import { describe, expect, it } from 'vitest';
import { formatName, isValidName, rollName } from '../src/logic/names';
import { seeded } from '../src/logic/random';

describe('player names', () => {
  it('draws valid names whose compound word never repeats itself', () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      const name = rollName(rng);
      expect(isValidName(name)).toBe(true);
      expect(name[1]).not.toBe(name[2]);
    }
  });

  it('writes a name as three words, the middle one a compound', () => {
    expect(formatName([1, 1, 2, 0])).toBe('Säihkyvä Tähtisydän Yksisarvinen');
  });

  it('rejects anything that is not a drawn name', () => {
    expect(isValidName([0, 1, 1, 0])).toBe(false);
    expect(isValidName([0, 0, 1, 99])).toBe(false);
    expect(isValidName([0, 0, 1])).toBe(false);
    expect(isValidName('Tähti')).toBe(false);
    expect(isValidName(null)).toBe(false);
  });
});
