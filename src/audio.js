// Звуки хранятся в public и включаются в готовую сборку игры.
function createSound(filename, volume) {
  const sound = new Audio(`${import.meta.env.BASE_URL}sounds/${filename}`);
  sound.preload = 'auto';
  sound.volume = volume;
  let warned = false;

  return {
    play() {
      sound.currentTime = 0;
      sound.play().catch((error) => {
        // Повторный запуск или пауза могут отменить предыдущий запуск.
        if (error.name === 'AbortError') return;
        if (!warned) {
          console.warn(`Не удалось воспроизвести ${filename}:`, error);
          warned = true;
        }
      });
    },
    stop() {
      sound.pause();
      sound.currentTime = 0;
    }
  };
}

const cardFlipSound = createSound('card-flip.ogg', 0.35);
const buttonClickSound = createSound('button-click.wav', 0.3);
let lastPlayedAt = -Infinity;

export function playCardFlip() {
  const now = performance.now();

  // Две карточки закрываются одновременно — достаточно одного звука.
  if (now - lastPlayedAt < 40) return;
  lastPlayedAt = now;
  cardFlipSound.play();
}

export function stopCardFlip() {
  cardFlipSound.stop();
}

export function playButtonClick() {
  buttonClickSound.play();
}
