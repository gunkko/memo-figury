import { HUD_HEIGHT } from './ui.js';
import { playButtonClick } from './audio.js';

export function setupPause({ canPause, onResume, onPause = () => {} }) {
  let paused = false;
  let pausedAt = 0;

  // Непрозрачная панель скрывает игровое поле
  const cover = document.createElement('div');
  cover.style.cssText = `
    position: fixed;
    top: ${HUD_HEIGHT}px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: #dce7ed;
    font-family: Arial, sans-serif;
    color: #24384a;
  `;

  cover.innerHTML = `
    <h2 style="margin: 0; font-size: 32px">Пауза</h2>
    <button type="button" style="
      padding: 12px 28px;
      border: none;
      border-radius: 8px;
      background: #3478b8;
      color: white;
      font-size: 18px;
      cursor: pointer;
    ">Продолжить</button>
  `;

  document.body.appendChild(cover);

  function pause() {
    if (paused || !canPause()) return;

    paused = true;
    pausedAt = performance.now();
    onPause();
    cover.style.display = 'flex';
  }

  function resume() {
    if (!paused || document.hidden) return;

    onResume(performance.now() - pausedAt);
    paused = false;
    cover.style.display = 'none';
  }

  cover.querySelector('button').addEventListener('click', () => {
    playButtonClick();
    resume();
  });

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape' || event.repeat) return;

    event.preventDefault();

    if (paused) resume();
    else pause();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  return {
    get paused() { return paused; },
    pause,
    resume
  };
}
