import { DIFFICULTIES, difficultyId } from './config.js';
import { playButtonClick } from './audio.js';

export const HUD_HEIGHT = 160;

const panel = document.createElement('header');

panel.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: ${HUD_HEIGHT}px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f6f9fb;
  border-bottom: 1px solid #cbd8e2;
  font-family: Arial, sans-serif;
  color: #24384a;
  z-index: 10;
`;

// Общее оформление кнопок
const buttonStyle = `
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  background: #3478b8;
  color: white;
  font-size: 15px;
  cursor: pointer;
`;

panel.innerHTML = `
  <strong id="title" style="font-size: 22px">
    Мемо фигуры
  </strong>
   <label style="
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
  ">
    Сложность:
    <select id="difficulty" style="
      padding: 6px 10px;
      border: 1px solid #b8cbd9;
      border-radius: 6px;
      background: #ffffff;
      color: #24384a;
      font: inherit;
    "></select>
  </label>
  <div style="display: flex; gap: 28px; font-size: 16px">
    <span>Пары: <b id="pairs">0/8</b></span>
    <span>Попытки: <b id="attempts">0</b></span>
    <span>Время: <b id="time">03:00</b></span>
  </div>

  <div style="display: flex; gap: 12px">
    <button id="start" type="button"
      style="${buttonStyle}">Начать</button>
      <button id="pause" type="button" disabled
  style="${buttonStyle}; opacity: 0.5; cursor: default">
  Пауза
</button>
    <button id="restart" type="button"
      style="${buttonStyle}">Заново</button>
  </div>
`;

document.body.appendChild(panel);
const difficultySelect = panel.querySelector('#difficulty');

// Заполняем список уровнями из файла настроек
for (const [id, level] of Object.entries(DIFFICULTIES)) {
  const option = document.createElement('option');
  const pairs = (level.columns * level.rows) / 2;

  option.value = id;
  option.textContent = `${level.title} — ${pairs} пар`;

  difficultySelect.appendChild(option);
}

// Показываем текущую сложность
difficultySelect.value = difficultyId;

// При выборе другого уровня открываем его с начала
difficultySelect.addEventListener('change', () => {
  const url = new URL(window.location.href);
  url.searchParams.set('difficulty', difficultySelect.value);

  window.location.assign(url.href);
});

const titleLabel = panel.querySelector('#title');
const pairsLabel = panel.querySelector('#pairs');
const attemptsLabel = panel.querySelector('#attempts');
const startButton = panel.querySelector('#start');

panel.querySelector('#restart').addEventListener('click', (event) => {
  event.currentTarget.disabled = true;
  playButtonClick();
  // Даём короткому щелчку прозвучать до перезагрузки страницы.
  window.setTimeout(() => window.location.reload(), 120);
});

// Главный файл передаст сюда действие для начала игры
export function onStart(callback) {
  startButton.addEventListener('click', () => {
    playButtonClick();
    startButton.disabled = true;
    startButton.textContent = 'Игра идёт';
    startButton.style.opacity = '0.6';
    startButton.style.cursor = 'default';

    difficultySelect.disabled = true;
    setPauseAvailable(true);

    callback();
  });
}

export function updateHUD(foundPairs, totalPairs, attempts) {
  pairsLabel.textContent = `${foundPairs}/${totalPairs}`;
  attemptsLabel.textContent = attempts;

  const won = foundPairs === totalPairs;

  titleLabel.textContent = won
    ? 'Победа! Все пары найдены'
    : 'Мемо фигуры';

  if (won) {
    startButton.textContent = 'Раунд завершён';
    setPauseAvailable(false);
    difficultySelect.disabled = false;
  }
  
}
const timeLabel = panel.querySelector('#time');

export function updateTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  const text =
    `${String(minutes).padStart(2, '0')}:` +
    `${String(rest).padStart(2, '0')}`;

  if (timeLabel.textContent !== text) {
    timeLabel.textContent = text;
  }
}

export function showTimeout() {
  titleLabel.textContent = 'Время вышло! Попробуй ещё раз';
  startButton.textContent = 'Раунд завершён';

  setPauseAvailable(false);
  difficultySelect.disabled = false;
}
export function onPause(callback) {
  panel.querySelector('#pause').addEventListener('click', () => {
    playButtonClick();
    callback();
  });
}

function setPauseAvailable(available) {
  const button = panel.querySelector('#pause');

  button.disabled = !available;
  button.style.opacity = available ? '1' : '0.5';
  button.style.cursor = available ? 'pointer' : 'default';
}
