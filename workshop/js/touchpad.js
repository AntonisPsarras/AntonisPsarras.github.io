/* ==========================================================================
   touchpad.js — the on-screen movement pad for Explore mode.

   A fixed joystick (analog walking in any direction) and an Interact button.
   Looking is not handled here: dragging anywhere else on the canvas already
   turns the view, and the stick captures its own pointer, so both thumbs work
   at once. The markup lives in index.html; this only binds behaviour.
   ========================================================================== */
const DEAD = 0.14;

export class TouchPad {
  constructor({ stick, thumb, act, onAxis, onAct }) {
    this.stick = stick;
    this.thumb = thumb;
    this.act = act;
    this.onAxis = onAxis;
    this.pid = null;
    this.rect = null;

    stick.addEventListener('pointerdown', (e) => this.#down(e));
    stick.addEventListener('pointermove', (e) => this.#move(e));
    stick.addEventListener('pointerup', (e) => this.#up(e));
    stick.addEventListener('pointercancel', (e) => this.#up(e));
    stick.addEventListener('lostpointercapture', (e) => this.#up(e));
    stick.addEventListener('contextmenu', (e) => e.preventDefault());
    act.addEventListener('click', () => onAct());
  }

  #down(e) {
    if (this.pid !== null) return;
    e.preventDefault();
    this.pid = e.pointerId;
    this.rect = this.stick.getBoundingClientRect();
    try { this.stick.setPointerCapture(e.pointerId); } catch { /* the pad still works without capture */ }
    this.stick.classList.add('is-held');
    this.#move(e);
  }

  #move(e) {
    if (e.pointerId !== this.pid) return;
    const r = this.rect;
    const radius = r.width / 2;
    let dx = (e.clientX - (r.left + radius)) / radius;
    let dy = (e.clientY - (r.top + radius)) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    // thumb follows the finger (clamped to the rim); the walking vector gets a deadzone
    const reach = radius * 0.5;
    this.thumb.style.transform = `translate(${(dx * reach).toFixed(1)}px, ${(dy * reach).toFixed(1)}px)`;
    const mag = Math.min(1, len);
    if (mag < DEAD) { this.onAxis(0, 0); return; }
    const k = (mag - DEAD) / (1 - DEAD);
    this.onAxis((dx / (len || 1)) * k, (-dy / (len || 1)) * k);
  }

  #up(e) {
    if (e.pointerId !== this.pid) return;
    this.reset();
  }

  /* Also called when the pad is hidden (card opened, mode changed). */
  reset() {
    if (this.pid !== null) {
      try { this.stick.releasePointerCapture(this.pid); } catch { /* already released */ }
    }
    this.pid = null;
    this.stick.classList.remove('is-held');
    this.thumb.style.transform = '';
    this.onAxis(0, 0);
  }
}
