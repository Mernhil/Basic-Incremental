import { GAME_TITLE, formatVersionLabel } from '../../game';
import { startGame } from './app';
import './style.css';

function setupUpdateNotice(): void {
  const notice = document.getElementById('update-notice');
  const restart = document.getElementById('update-restart');
  if (!notice || !restart) return;

  const show = (): void => {
    notice.hidden = false;
  };
  restart.addEventListener('click', () => window.api.restartToInstall());
  window.api.onUpdateReady(show);
  // The download may have finished before this window finished loading.
  window.api
    .isUpdateReady()
    .then((ready) => {
      if (ready) show();
    })
    .catch(() => undefined);
}

export async function init(): Promise<void> {
  const title = document.getElementById('title');
  const version = document.getElementById('version');
  if (!title || !version) return;

  title.textContent = GAME_TITLE;
  version.textContent = formatVersionLabel(await window.api.getVersion());
  setupUpdateNotice();
  await startGame();
}
