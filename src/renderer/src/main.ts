import { GAME_TITLE, formatVersionLabel } from '../../game';
import './style.css';

async function init(): Promise<void> {
  const title = document.getElementById('title');
  const version = document.getElementById('version');
  if (!title || !version) return;

  title.textContent = GAME_TITLE;
  version.textContent = formatVersionLabel(await window.api.getVersion());
}

void init();
