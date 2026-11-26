import { LEVEL_COUNT, MIN_SCORE_AT_LEVEL, MIN_SCORE_HOME } from '@kimallus/shared';
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { scoreFor } from '../src/logic/score';
import { HOME_POINTS } from '../src/scenes/home-moment';

describe('score rules shared with the API', () => {
  it('match the track: the least distance to each level, and home after the last', () => {
    expect(LEVELS.length).toBe(LEVEL_COUNT);
    let distance = 0;
    LEVELS.forEach((level, i) => {
      expect(MIN_SCORE_AT_LEVEL[i]).toBe(scoreFor(distance));
      distance += level.gateAfter;
    });
    expect(MIN_SCORE_HOME).toBe(scoreFor(distance) + HOME_POINTS);
  });
});
