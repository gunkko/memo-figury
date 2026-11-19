 // Настройки уровней сложности
export const DIFFICULTIES = {
  easy: {
    title: 'Лёгкая',
    columns: 4,
    rows: 3,
    seconds: 120
  },

  normal: {
    title: 'Обычная',
    columns: 4,
    rows: 4,
    seconds: 180
  },

  hard: {
    title: 'Сложная',
    columns: 5,
    rows: 4,
    seconds: 240
  }
};

// Читаем выбранную сложность из адреса страницы
const requestedDifficulty =
  new URLSearchParams(window.location.search).get('difficulty');

// По умолчанию используем обычную сложность
export const difficultyId =
  Object.keys(DIFFICULTIES).includes(requestedDifficulty)
    ? requestedDifficulty
    : 'normal';

export const settings = DIFFICULTIES[difficultyId];