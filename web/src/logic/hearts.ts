import type { Rng } from './random';

/** A heart shot from the cat's tail. Screen coordinates, y grows down. */
export interface Heart {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** A cloud in the sky: sad until a heart hits it. */
export interface CloudTarget {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export const HEART = {
  /** Horizontal speed, pixels per second. */
  speed: 720,
  /** Upward speed: hearts fly gently up toward the clouds. */
  rise: 150,
  /** Shortest time between two hearts. */
  cooldown: 0.28,
  radius: 11,
} as const;

export const CLOUD = { rx: 46, ry: 28 } as const;

export const MOODS = ['smile', 'heart-eyes', 'hug', 'star-eyes'] as const;
export type Mood = (typeof MOODS)[number];

export function launchHeart(x: number, y: number): Heart {
  return { x, y, vx: HEART.speed, vy: -HEART.rise };
}

export function stepHeart(h: Heart, dt: number): Heart {
  return { ...h, x: h.x + h.vx * dt, y: h.y + h.vy * dt };
}

export function heartGone(h: Heart, width: number): boolean {
  return h.x > width + 40 || h.y < -40;
}

/** Ellipse test with the heart's radius added: forgiving on purpose. */
export function hitsCloud(h: Heart, c: CloudTarget): boolean {
  const dx = (h.x - c.x) / (c.rx + HEART.radius);
  const dy = (h.y - c.y) / (c.ry + HEART.radius);
  return dx * dx + dy * dy <= 1;
}

/** Seconds until the next sad cloud drifts in. */
export function nextCloudIn(rng: Rng): number {
  return 2 + rng() * 2.5;
}

/** Height of a new cloud on screen: from just above the unicorn's head up to high in the sky. */
export function cloudY(rng: Rng, groundY: number): number {
  return groundY - 150 - rng() * 150;
}

export function pickMood(rng: Rng): Mood {
  return MOODS[Math.floor(rng() * MOODS.length)];
}
