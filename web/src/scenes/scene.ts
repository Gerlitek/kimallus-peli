import type { Input } from '../systems/input';

/** Logical canvas size; the canvas is scaled to fit the window. */
export const WIDTH = 960;
export const HEIGHT = 540;
export const GROUND_Y = 440;

export interface Scene {
  enter(): void;
  update(dt: number, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
  exit(): void;
}
