/**
 * Levels of the ride. The speed is steady within a level; a gate on the track leads to the next one,
 * and jumping over the gate keeps the current level. After the last level comes home, the goal.
 */
export interface Level {
  /** Running speed, pixels per second. */
  speed: number;
  /** Seconds of empty track after an obstacle. */
  gap: { min: number; max: number };
  /** Hitting an obstacle only makes the unicorn stumble: nothing ends, there is no hurry. */
  gentle: boolean;
  /** Distance on this level before its gate (or home, on the last level) first appears. */
  gateAfter: number;
}

export const LEVELS: readonly Level[] = [
  { speed: 210, gap: { min: 3, max: 4.5 }, gentle: true, gateAfter: 14000 },
  { speed: 290, gap: { min: 2.4, max: 3.6 }, gentle: false, gateAfter: 8000 },
  { speed: 370, gap: { min: 1.9, max: 2.9 }, gentle: false, gateAfter: 8000 },
];

export const SLOWEST = LEVELS[0].speed;
export const FASTEST = LEVELS[LEVELS.length - 1].speed;

/** On the first level the gate also waits until this many calm stations have come up (visited or jumped over) and mum has been seen. */
export const STATIONS_BEFORE_GATE = 2;
/** If mum's porridge has not come up by this distance, it comes next: she is part of the first level. */
export const MOM_BY = 8000;
/** A gate that was jumped over comes back after this distance. */
export const GATE_RETRY = 4000;
