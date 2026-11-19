import * as THREE from 'three';
import { settings } from './config.js';
import { setupPause } from './pause.js';
import { playCardFlip, stopCardFlip } from './audio.js';
import {
  HUD_HEIGHT,
  updateHUD,
  onStart,
  onPause,
  updateTime,
  showTimeout
} from './ui.js';

document.title = 'Мемо фигуры';
document.body.style.margin = '0';

// Сцена
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce7ed');

// Камера
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

// Отрисовка
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.display = 'block';
document.querySelector('#app').replaceChildren(renderer.domElement);

// Освещение
scene.add(new THREE.HemisphereLight('#ffffff', '#718096', 2));

const light = new THREE.DirectionalLight('#ffffff', 3);
light.position.set(3, 4, 8);
scene.add(light);

// Все карточки используют одинаковую форму и материал
const geometry = new THREE.BoxGeometry(1.6, 2.2, 0.14);
const material = new THREE.MeshStandardMaterial({
  color: '#3478b8',
  roughness: 0.45,
  metalness: 0.1
});

const cards = [];
const columns = settings.columns;
const rows = settings.rows;
const stepX = 1.9;
const stepY = 2.5;

// Создаём карточки по рядам и столбцам
for (let row = 0; row < rows; row++) {
  for (let column = 0; column < columns; column++) {
    const card = new THREE.Mesh(geometry, material);

    // Центрируем всё поле относительно начала координат
    card.position.x = (column - (columns - 1) / 2) * stepX;
    card.position.y = ((rows - 1) / 2 - row) * stepY;

    scene.add(card);
    cards.push(card);
  }
}

// Подбираем расстояние камеры, чтобы поле помещалось в окно
function resize() {
  const width = window.innerWidth;
  const height = Math.max(1, window.innerHeight - HUD_HEIGHT);
renderer.domElement.style.marginTop = `${HUD_HEIGHT}px`;
  const aspect = width / height;

  camera.aspect = aspect;

  const fieldWidth = (columns - 1) * stepX + 1.6;
const fieldHeight = (rows - 1) * stepY + 2.2;

const visibleHeight = Math.max(
  fieldHeight + 1.2,
  (fieldWidth + 1.2) / aspect
);
  const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
  camera.position.set(0, 0, visibleHeight / (2 * Math.tan(halfAngle)));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

window.addEventListener('resize', resize);
resize();

// Выбираем столько фигур, сколько пар на поле
const symbols = [
  { sign: '●', color: '#d94b4b' },
  { sign: '■', color: '#3478b8' },
  { sign: '▲', color: '#27865b' },
  { sign: '★', color: '#b87910' },
  { sign: '◆', color: '#8651b5' },
  { sign: '✚', color: '#ca5488' },
  { sign: '◎', color: '#14818b' },
  { sign: '➜', color: '#b65e26' },
  { sign: '♥', color: '#b52e55' },
  { sign: '☾', color: '#4853a6' }
].slice(0, cards.length / 2);

// Рисуем лицо карточки и превращаем рисунок в текстуру
function createFaceMaterial(symbol) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 352;

  const context = canvas.getContext('2d');

  context.fillStyle = '#fff8eb';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = '#ded5c5';
  context.lineWidth = 4;
  context.strokeRect(12, 12, 232, 328);

  context.fillStyle = symbol.color;
  context.font = '150px "Segoe UI Symbol", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(symbol.sign, 128, 176);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.65
  });
}

// Один материал на каждую фигуру
const faceMaterials = symbols.map(createFaceMaterial);

// Создаём пары: каждый номер встречается дважды
const deck = symbols.flatMap((symbol, index) => [index, index]);

// Перемешивание Фишера — Йетса
for (let i = deck.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [deck[i], deck[j]] = [deck[j], deck[i]];
}

// Назначаем каждой карточке её фигуру
cards.forEach((card, index) => {
  const symbolId = deck[index];

  card.material = [
    material, material, material, material,
    material, faceMaterials[symbolId]
  ];

  card.userData.symbolId = symbolId;
  card.userData.open = false;
  card.userData.matched = false;
  card.userData.flip = null;
});

// Выбор карточки и состояние сравнения
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let selectedCards = [];
let phase = 'ready';
let closeAt = 0;
let foundPairs = 0;
let attempts = 0;
updateHUD(foundPairs, cards.length / 2, attempts);
const ROUND_SECONDS = settings.seconds;
let endsAt = null;

updateTime(ROUND_SECONDS);

onStart(() => {
  endsAt = performance.now() + ROUND_SECONDS * 1000;
  phase = 'selecting';
});

function checkTime(now) {
  if (endsAt === null || phase === 'won' || phase === 'lost') {
    return;
  }

  const remainingMs = Math.max(0, endsAt - now);
  updateTime(Math.ceil(remainingMs / 1000));

  if (remainingMs === 0) {
    phase = 'lost';
    showTimeout();
  }
}
const pauseControl = setupPause({
  onPause: stopCardFlip,
  canPause() {
    checkTime(performance.now());

    return [
      'selecting',
      'opening',
      'waiting',
      'closing'
    ].includes(phase);
  },

  onResume(duration) {
    // Время паузы не расходует лимит раунда
    endsAt += duration;

    // Сохраняем оставшееся время показа несовпавшей пары
    if (phase === 'waiting') {
      closeAt += duration;
    }

    // Перевороты продолжаются с того же момента
    cards.forEach((card) => {
      if (card.userData.flip) {
        card.userData.flip.started += duration;
      }
    });
  }
});
onPause(() => {
  pauseControl.pause();
});
function flipCard(card, open, now) {
  playCardFlip();
  card.userData.open = open;
  card.userData.flip = {
    started: now,
    from: card.rotation.y,
    to: open ? Math.PI : 0
  };
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (pauseControl.paused) return;

  checkTime(performance.now());
  if (event.button !== 0 || phase !== 'selecting') return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(cards, false)[0];
  if (!hit) return;

  const card = hit.object;
  const data = card.userData;

  if (data.open || data.matched || data.flip) return;

  selectedCards.push(card);
  flipCard(card, true, performance.now());

  // После второго выбора блокируем дальнейшие нажатия
  if (selectedCards.length === 2) {
  attempts++;
  updateHUD(foundPairs, cards.length / 2, attempts);
  phase = 'opening';
}
});

renderer.setAnimationLoop(() => {
  if (pauseControl.paused) return;

  const now = performance.now();
  checkTime(now)

  if (phase === 'lost' || phase === 'won') {
    renderer.render(scene, camera);
    return;
  }

  // Обновляем анимацию всех карточек
  cards.forEach((card) => {
    const flip = card.userData.flip;
    if (!flip) return;

    const progress = Math.min((now - flip.started) / 250, 1);
    const smooth = progress * progress * (3 - 2 * progress);
    card.rotation.y = flip.from + (flip.to - flip.from) * smooth;

    if (progress === 1) card.userData.flip = null;
  });

  // Сравниваем после полного открытия обеих карточек
  if (phase === 'opening' &&
      selectedCards.every((card) => !card.userData.flip)) {
    const [first, second] = selectedCards;

    if (first.userData.symbolId === second.userData.symbolId) {
      first.userData.matched = true;
      second.userData.matched = true;
      foundPairs++;
      updateHUD(foundPairs, cards.length / 2, attempts);

      document.title = `Мемо фигуры — пары ${foundPairs}/${cards.length / 2}`;
      selectedCards = [];
      phase = foundPairs === cards.length / 2 ? 'won' : 'selecting';
    } else {
      // Показываем разные фигуры ещё 0,9 секунды
      closeAt = now + 900;
      phase = 'waiting';
    }
  }

  if (phase === 'waiting' && now >= closeAt) {
    selectedCards.forEach((card) => flipCard(card, false, now));
    phase = 'closing';
  }

  // Разрешаем выбор после полного закрытия обеих карточек
  if (phase === 'closing' &&
      selectedCards.every((card) => !card.userData.flip)) {
    selectedCards = [];
    phase = 'selecting';
  }

  renderer.render(scene, camera);
});
