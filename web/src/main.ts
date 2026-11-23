import './fonts';
import { drawUnicorn } from './art/unicorn';
import { RideScene } from './scenes/ride';
import { HEIGHT, WIDTH, type Scene } from './scenes/scene';
import { showLeaderboard } from './leaderboard';
import { formatName, rollName } from './logic/names';
import { Input } from './systems/input';
import { loadName, saveName } from './systems/storage';

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

// The player's name: drawn from word lists on the first visit and kept in this browser.
// The button draws a new one. Only the word indexes are stored, never free text.
const nameEl = document.querySelector<HTMLElement>('#player-name')!;
const scoresEl = document.querySelector<HTMLElement>('#scores')!;
const rerollEl = document.querySelector<HTMLButtonElement>('#reroll')!;
function showName(name = rollName(Math.random)): void {
  saveName(name);
  nameEl.textContent = formatName(name);
  void showLeaderboard(scoresEl);
}
showName(loadName() ?? undefined);
rerollEl.addEventListener('click', () => {
  showName();
  // Give the keyboard back to the game: the next space starts the ride, not this button.
  rerollEl.blur();
});
// N draws a new name too, but only on the start screen: never by accident in the middle of a ride.
let playing = false;
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyN' && !e.repeat && !playing) showName();
});

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

// Touch screens have no Esc: a small button leaves the game.
const TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const input = new Input(canvas, WIDTH, HEIGHT, document.querySelector<HTMLElement>('#shoot'));
document.querySelector<HTMLElement>('#quit')!.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  input.quit();
});
const lumensEl = document.querySelector<HTMLElement>('.lumens')!;
const scene: Scene = new RideScene({
  score: (v) => (scoreEl.textContent = `${v}`),
  best: (v) => (bestEl.textContent = v > 0 ? `★ ${v}` : ''),
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
  started: () => {
    playing = true;
    // Phones and tablets: the game fills the window (see body.playing), since not all of them have full screen.
    document.body.classList.toggle('playing', TOUCH);
    enterFullscreen();
  },
  ended: () => {
    playing = false;
    document.body.classList.remove('playing');
    exitFullscreen();
    void showLeaderboard(scoresEl);
  },
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
