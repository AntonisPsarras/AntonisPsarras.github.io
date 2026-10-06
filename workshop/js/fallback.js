/* fallback.js — the text version of the workshop.
   Used by choice (?view=text), when WebGL2 is missing, or if the 3D view
   fails to start. The static HTML already holds all the content; this only
   explains why it is showing and upgrades certificate links to the viewer. */
import { AWARDS } from './content.js';

const REASONS = {
  'no-webgl2': 'This browser could not start WebGL2, so here is the text version of the workshop.',
  forced: 'WebGL is switched off for this visit, so here is the text version of the workshop.',
  error: 'The 3D workshop could not start on this device, so here is the text version.',
};

let wired = false;

export async function showTextView(reason = 'chosen') {
  const html = document.documentElement;
  html.classList.remove('ws-3d');
  html.classList.add('ws-text');
  document.getElementById('ws-loader')?.classList.add('is-done');

  const note = document.getElementById('ws-text-reason');
  if (note && REASONS[reason]) {
    note.textContent = REASONS[reason];
    note.hidden = false;
  }
  if (wired) return;
  wired = true;

  try {
    const { Overlays } = await import('./overlays.js');
    const overlays = new Overlays();
    document.addEventListener('keydown', (e) => overlays.handleKey(e));
    document.querySelectorAll('.ws-award-thumb[data-award]').forEach((link) => {
      const index = AWARDS.findIndex((a) => a.id === link.dataset.award);
      if (index < 0) return;
      link.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        overlays.openCert(index);
      });
    });
  } catch (err) {
    console.warn('[workshop] certificate viewer unavailable; links open the images directly.', err?.message || err);
  }
}
