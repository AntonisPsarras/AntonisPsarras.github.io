/* main.js — module entry. Three.js is only requested when boot.js found WebGL2;
   otherwise the text version is wired up and nothing heavy is downloaded. */
import { showTextView } from './fallback.js';

const html = document.documentElement;

/* Flatten the module waterfall: the browser fetches these in parallel
   instead of discovering them one import level at a time. */
const MODULES = [
  '../../vendor/three/three.core.js',
  '../../vendor/three/three.module.js',
  './app.js', './content.js', './quality.js', './ui.js', './overlays.js', './dossiers.js',
  './interact.js', './controls.js', './dialogue.js', './audio.js', './avatar.js', './workshop-scene.js',
  './world/kit.js', './world/architecture.js', './world/gallery.js', './world/fabrication.js',
  './world/electronics.js', './world/programming.js', './world/study.js', './world/exhibits.js',
];

if (html.classList.contains('ws-3d')) {
  for (const path of MODULES) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = new URL(path, import.meta.url).href;
    document.head.appendChild(link);
  }
  import('./app.js')
    .then((m) => m.start())
    .catch((err) => {
      console.error('[workshop] the 3D view could not start:', err?.message || err);
      showTextView('error');
    });
} else {
  showTextView(html.getAttribute('data-ws-reason') || 'chosen');
}
