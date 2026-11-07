import { formatVersionLabel } from '../../game';
import { startGame } from './app';
import { COPY } from './copy';
import './style.css';

function setupUpdateNotice(root: HTMLElement): void {
  const notice = document.createElement('div');
  notice.className = 'update-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  const text = document.createElement('span');
  text.textContent = COPY.update.message;
  const restart = document.createElement('button');
  restart.type = 'button';
  restart.textContent = COPY.update.action;
  restart.addEventListener('click', () => window.api.restartToInstall());
  notice.append(text, restart);
  root.append(notice);

  const show = (): void => {
    notice.hidden = false;
  };
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
  const root = document.getElementById('app');
  if (!root) return;
  const version = formatVersionLabel(await window.api.getVersion());
  await startGame(root, version);
  setupUpdateNotice(document.body);
}
