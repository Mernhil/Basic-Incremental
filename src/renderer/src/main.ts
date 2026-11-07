import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';

const GALLERY_HASH = '#gallery';

if (import.meta.env.DEV) {
  // Dev only: Ctrl+Shift+G toggles the card gallery.
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g') {
      location.hash = location.hash === GALLERY_HASH ? '' : GALLERY_HASH;
      location.reload();
    }
  });
}

if (import.meta.env.DEV && location.hash === GALLERY_HASH) {
  void import('./gallery/gallery').then((m) => m.renderGallery());
} else {
  void import('./game-entry').then((m) => m.init());
}
