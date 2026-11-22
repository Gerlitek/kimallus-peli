import './fonts';
import { drawUnicorn } from './art/unicorn';
import { RideScene } from './scenes/ride';
import { HEIGHT, WIDTH, type Scene } from './scenes/scene';
import { Input } from './systems/input';

const canvas = document.querySelector<HTMLCanvasElement>('#play')!;
const ctx = canvas.getContext('2d')!;
const scoreEl = document.querySelector<HTMLElement>('#score')!;
const bestEl = document.querySelector<HTMLElement>('#best')!;
const messageEl = document.querySelector<HTMLElement>('#message')!;
const gameEl = document.querySelector<HTMLElement>('#game')!;

// Full screen while playing. The request runs within a moment of the key press or tap,
// so the browser still counts it as user-initiated. Where full screen is not available
// (e.g. iPhone), the game simply plays inside the page.
function enterFullscreen(): void {
  if (document.fullscreenElement || !gameEl.requestFullscreen) return;
  gameEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}

function exitFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// The logo next to the page title: the unicorn and the cat, drawn by the same code as in the game.
function drawLogo(): void {
  const logo = document.querySelector<HTMLCanvasElement>('#logo');
  const g = logo?.getContext('2d');
  if (!logo || !g) return;
  const size = 72;
  const dpr = window.devicePixelRatio || 1;
  logo.width = size * dpr;
  logo.height = size * dpr;
  g.setTransform(dpr * 0.38, 0, 0, dpr * 0.38, 0, 0);
  drawUnicorn(g, { x: 100, y: 186, run: 0, grounded: true, sx: 1, sy: 1, t: 0.5, cat: { dx: 0, dy: 0, rot: 0 } });
}
drawLogo();

// The canvas follows its container's size; the game always draws in WIDTH x HEIGHT logical pixels.
function resize(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
}
new ResizeObserver(resize).observe(canvas);
resize();

const input = new Input(canvas, WIDTH, HEIGHT, document.querySelector<HTMLElement>('#shoot'));
const lumensEl = document.querySelector<HTMLElement>('.lumens')!;
const scene: Scene = new RideScene({
  score: (v) => (scoreEl.textContent = `${v}`),
  best: (v) => (bestEl.textContent = v > 0 ? `Paras ${v}` : ''),
  pulse: () => {
    // Restart the CSS animation for each arriving orb.
    lumensEl.classList.remove('pulse');
    void lumensEl.offsetWidth;
    lumensEl.classList.add('pulse');
  },
  message: (html) => {
    messageEl.hidden = html === null;
    messageEl.innerHTML = html ?? '';
  },
  started: enterFullscreen,
  ended: exitFullscreen,
});
scene.enter();

// Fixed time step keeps the physics the same on every screen refresh rate.
const STEP = 1 / 120;
let acc = 0;
let last = performance.now();

function frame(now: number): void {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    scene.update(STEP, input);
    acc -= STEP;
  }
  scene.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
