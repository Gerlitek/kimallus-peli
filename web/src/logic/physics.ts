/** Rider physics. Heights are measured upwards from the ground, in logical pixels. */

export interface Rider {
  /** Height of the feet above the ground. */
  y: number;
  /** Vertical speed, positive is up. */
  vy: number;
  grounded: boolean;
  /** How long the jump button has boosted this jump. */
  holdTime: number;
}

export interface JumpInput {
  /** Pressed during this step (edge). */
  pressed: boolean;
  /** Held down right now. */
  held: boolean;
}

export interface PhysicsConfig {
  gravity: number;
  jumpVelocity: number;
  /** Gravity multiplier while the button is held on the way up. */
  holdGravityScale: number;
  /** Longest time holding can boost one jump. */
  maxHold: number;
}

export const PHYSICS: PhysicsConfig = {
  gravity: 2600,
  jumpVelocity: 820,
  holdGravityScale: 0.45,
  maxHold: 0.32,
};

export interface StepResult {
  rider: Rider;
  jumped: boolean;
  landed: boolean;
}

export function restingRider(): Rider {
  return { y: 0, vy: 0, grounded: true, holdTime: 0 };
}

/** One fixed time step. Pure: returns a new rider. Tap for a short jump, hold for a high one. */
export function stepRider(rider: Rider, input: JumpInput, dt: number, p: PhysicsConfig = PHYSICS): StepResult {
  if (rider.grounded) {
    if (input.pressed) {
      return { rider: { y: 0, vy: p.jumpVelocity, grounded: false, holdTime: 0 }, jumped: true, landed: false };
    }
    return { rider, jumped: false, landed: false };
  }

  let gravity = p.gravity;
  let holdTime = rider.holdTime;
  if (input.held && rider.vy > 0 && holdTime < p.maxHold) {
    gravity *= p.holdGravityScale;
    holdTime += dt;
  } else {
    // Once released, the same jump cannot be boosted again.
    holdTime = p.maxHold;
  }

  const vy = rider.vy - gravity * dt;
  const y = rider.y + vy * dt;
  if (y <= 0) {
    return { rider: { y: 0, vy: 0, grounded: true, holdTime: 0 }, jumped: false, landed: true };
  }
  return { rider: { y, vy, grounded: false, holdTime }, jumped: false, landed: false };
}
