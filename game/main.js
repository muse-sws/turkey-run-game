// Gobble Dash boot: wires the canvas, the game loop, keyboard and mouse,
// and the ?shot= staging used to take the entry's screenshots.
import { GobbleDashGame } from './game.js';
import { VIEW_W, VIEW_H } from './world.js';

const canvas = document.getElementById('game');
const game = new GobbleDashGame(canvas);
game.pressedKeys = new Set();
window.__gobbleDash = game;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(320, Math.round(rect.width * dpr));
  canvas.height = Math.max(240, Math.round(rect.height * dpr));
}
window.addEventListener('resize', resizeCanvas);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Screenshot staging: a fixed scene, rendered once, no loop needed.
  canvas.width = 1280;
  canvas.height = 720;
  game.setupShot(shot);
  game.render();
} else {
  // Normal play: fit the canvas to the window and run the loop.
  canvas.style.width = 'min(1280px, 96vw)';
  canvas.style.height = 'min(720px, 78vh)';
  resizeCanvas();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (!event.repeat) {
    game.pressedKeys.add(event.code);
    game.onKey(event.code);
  }
});
window.addEventListener('keyup', (event) => {
  game.pressedKeys.delete(event.code);
});
window.addEventListener('blur', () => game.pressedKeys.clear());

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const vx = ((event.clientX - rect.left) / rect.width) * VIEW_W;
  const vy = ((event.clientY - rect.top) / rect.height) * VIEW_H;
  game.onClick(vx, vy);
});
