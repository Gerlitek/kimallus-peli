/** A tap or click in logical game coordinates. */
export interface Tap {
  x: number;
  y: number;
}

/**
 * One main button: space, up, W, Enter, left click and touch all mean "jump" (or "do it").
 * A second button shoots a heart: X, right click, or the heart button on touch screens.
 * Taps also carry a position, and left/right keys are queued for menus such as the polish station.
 */
export class Input {
  private pressedFlag = false;
  private down = false;
  private tap: Tap | null = null;
  private keys: string[] = [];
  private shootFlag = false;

  constructor(target: HTMLElement, width: number, height: number, shootButton?: HTMLElement | null) {
    const actionKeys = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter']);
    const navKeys = new Set(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD']);
    window.addEventListener('keydown', (e) => {
      if (actionKeys.has(e.code)) {
        e.preventDefault();
        if (!e.repeat) this.press();
      } else if (e.code === 'KeyX') {
        e.preventDefault();
        if (!e.repeat) this.shootFlag = true;
      } else if (navKeys.has(e.code)) {
        e.preventDefault();
        this.keys.push(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      if (actionKeys.has(e.code)) this.down = false;
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.button === 2) {
        this.shootFlag = true;
        return;
      }
      const r = target.getBoundingClientRect();
      this.tap = { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
      this.press();
    });
    shootButton?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.shootFlag = true;
    });
    window.addEventListener('pointerup', () => (this.down = false));
    window.addEventListener('pointercancel', () => (this.down = false));
    window.addEventListener('blur', () => (this.down = false));
  }

  private press(): void {
    this.pressedFlag = true;
    this.down = true;
  }

  /** True once per press. */
  takePress(): boolean {
    const p = this.pressedFlag;
    this.pressedFlag = false;
    return p;
  }

  /** True once per shot. */
  takeShoot(): boolean {
    const s = this.shootFlag;
    this.shootFlag = false;
    return s;
  }

  /** The latest tap position, once. */
  takeTap(): Tap | null {
    const t = this.tap;
    this.tap = null;
    return t;
  }

  /** Left/right keys pressed since the last call. */
  takeKeys(): string[] {
    const k = this.keys;
    this.keys = [];
    return k;
  }

  get held(): boolean {
    return this.down;
  }
}
