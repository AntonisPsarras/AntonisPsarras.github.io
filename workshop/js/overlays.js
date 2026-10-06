/* ==========================================================================
   overlays.js — the modal layer: project dossiers, the certificate viewer
   and the help panel. Pure DOM; never imports Three.js, so the text version
   can use it too.

   Every dialog: role="dialog" + aria-modal, the rest of the page made
   `inert`, Tab kept inside, Escape closes, focus returns to the opener.
   ========================================================================== */
import { PROJECTS, AWARDS, SL_TERMINAL_LINES } from './content.js';
import { buildDossier } from './dossiers.js';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export class Overlays {
  constructor({ onOpen, onClose, onCertChange, sound } = {}) {
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onCertChange = onCertChange;
    this.sound = sound;
    this.open = null;          // { kind, el, opener }
    this.reqId = 0;

    this.project = document.getElementById('project-modal');
    this.cert = document.getElementById('cert-viewer');
    this.help = document.getElementById('ws-help-panel');

    for (const el of [this.project, this.cert, this.help]) {
      el?.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    }
    this.#initCarousel();
    this.#initCert();
  }

  isOpen() { return !!this.open; }
  get kind() { return this.open?.kind || null; }

  /* ── Generic dialog plumbing ───────────────────────────────────────── */
  #show(kind, el, focusTarget) {
    if (this.open) this.#hide(false);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.open = { kind, el, opener };
    el.classList.add('is-open');
    el.removeAttribute('aria-hidden');
    setInert(true);
    this.onOpen?.(kind);
    const target = focusTarget || el.querySelector('.modal-close-btn');
    target?.focus({ preventScroll: true });
    if (document.activeElement !== target) requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  }

  #hide(restore = true) {
    const o = this.open;
    if (!o) return;
    o.el.classList.remove('is-open');
    o.el.setAttribute('aria-hidden', 'true');
    this.open = null;
    setInert(false);
    if (o.kind === 'project') this.#stopTerminal();
    if (o.kind === 'cert') this.#setZoom(false);
    this.onClose?.(o.kind);
    if (restore && o.opener && document.contains(o.opener)) o.opener.focus({ preventScroll: true });
  }

  close() { this.#hide(true); }

  /* Returns true when the key was consumed by an open dialog. */
  handleKey(e) {
    if (!this.open) return false;
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return true; }
    if (e.key === 'Tab') { trapTab(e, this.open.el); return true; }
    if (this.open.kind === 'project' && this.slideCount > 1 && !isTyping(e)) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.#setSlide(this.slide - 1); return true; }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.#setSlide(this.slide + 1); return true; }
    }
    if (this.open.kind === 'cert') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.#stepCert(-1); return true; }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.#stepCert(1); return true; }
    }
    return true; // a modal owns the keyboard while open
  }

  /* ── Project dossier ───────────────────────────────────────────────── */
  async openProject(id) {
    const p = PROJECTS[id];
    if (!p) return;
    const req = ++this.reqId;
    const card = this.project.querySelector('.modal-card');
    const body = document.getElementById('modal-body');
    body.replaceChildren();
    card.classList.remove('layout-side', 'layout-stack', 'gallery-left', 'gallery-right');
    if (p.layout === 'side') card.classList.add('layout-side', p.side === 'right' ? 'gallery-right' : 'gallery-left');
    else card.classList.add('layout-stack');
    this.project.setAttribute('aria-label', `${p.title} — project details`);
    this.#buildGallery(p);
    this.#show('project', this.project);

    let frag;
    try { frag = await buildDossier(id); } catch { frag = null; }
    if (req !== this.reqId || this.kind !== 'project') return;
    const content = document.createElement('div');
    content.className = 'modal-content is-active';
    if (frag) content.appendChild(frag);
    body.appendChild(content);
    body.scrollTop = 0;
    const term = content.querySelector('.terminal-body');
    if (term) this.#startTerminal(term, content.querySelector('.terminal-replay-btn'));
  }

  #buildGallery(p) {
    const gallery = document.getElementById('modal-gallery');
    const dots = document.getElementById('carousel-dots');
    const ctrls = document.getElementById('carousel-controls');
    gallery.replaceChildren();
    dots.replaceChildren();
    gallery.scrollLeft = 0;
    this.slide = 0;

    this.slideCount = p.images.length;
    p.images.forEach((file, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'glass-image-wrapper';
      wrap.setAttribute('role', 'listitem');
      const img = document.createElement('img');
      img.className = 'carousel-image';
      img.src = `../${file}`;
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.alt = p.images.length > 1 ? `${p.imageAlt} — view ${i + 1} of ${p.images.length}` : p.imageAlt;
      wrap.appendChild(img);
      gallery.appendChild(wrap);
      if (p.images.length > 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Show image ${i + 1} of ${p.images.length}`);
        dot.setAttribute('aria-selected', String(i === 0));
        dot.addEventListener('click', () => this.#setSlide(i));
        dots.appendChild(dot);
      }
    });
    ctrls.hidden = this.slideCount < 2;
    this.#setSlide(0, false);
  }

  #initCarousel() {
    const gallery = document.getElementById('modal-gallery');
    document.getElementById('carousel-prev')?.addEventListener('click', () => this.#setSlide(this.slide - 1));
    document.getElementById('carousel-next')?.addEventListener('click', () => this.#setSlide(this.slide + 1));
    let raf = 0;
    gallery?.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const i = Math.round(gallery.scrollLeft / (gallery.clientWidth || 1));
        if (i !== this.slide) this.#setSlide(i, false);
      });
    }, { passive: true });
  }

  #setSlide(index, scroll = true) {
    if (!this.slideCount) return;
    const gallery = document.getElementById('modal-gallery');
    this.slide = Math.max(0, Math.min(index, this.slideCount - 1));
    if (scroll) {
      const s = gallery.children[this.slide];
      if (s) gallery.scrollTo({ left: s.offsetLeft, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
    document.querySelectorAll('#carousel-dots .carousel-dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === this.slide);
      d.setAttribute('aria-selected', String(i === this.slide));
    });
    const prev = document.getElementById('carousel-prev');
    const next = document.getElementById('carousel-next');
    if (prev) prev.disabled = this.slide === 0;
    if (next) next.disabled = this.slide >= this.slideCount - 1;
  }

  /* ScholiLink boot log — same cadence as the homepage typewriter. */
  #startTerminal(body, replay) {
    const run = () => {
      this.#stopTerminal();
      body.replaceChildren();
      if (reducedMotion()) {
        for (const line of SL_TERMINAL_LINES) body.appendChild(termLine(line, line.s));
        return;
      }
      let li = 0, ci = 0, cur = null;
      const tick = () => {
        if (li >= SL_TERMINAL_LINES.length) {
          const c = document.createElement('span');
          c.className = 'terminal-cursor';
          cur?.appendChild(c);
          return;
        }
        const line = SL_TERMINAL_LINES[li];
        if (ci === 0) {
          if (line.t === 'blank') {
            body.appendChild(termLine(line, ''));
            li++;
            this.termTimer = setTimeout(tick, 55);
            return;
          }
          cur = termLine(line, '');
          body.appendChild(cur);
        }
        if (ci < line.s.length) {
          cur.textContent = line.s.slice(0, ++ci);
          this.termTimer = setTimeout(tick, line.t === 'cmd' ? 13 : 5);
        } else {
          li++; ci = 0;
          body.scrollTop = body.scrollHeight;
          this.termTimer = setTimeout(tick, 75);
        }
      };
      this.termTimer = setTimeout(tick, 500);
    };
    replay?.addEventListener('click', run);
    run();
  }

  #stopTerminal() {
    clearTimeout(this.termTimer);
    this.termTimer = null;
  }

  /* ── Certificate viewer ────────────────────────────────────────────── */
  #initCert() {
    this.certImg = document.getElementById('cert-img');
    this.certStage = document.getElementById('cert-stage');
    document.getElementById('cert-prev')?.addEventListener('click', () => this.#stepCert(-1));
    document.getElementById('cert-next')?.addEventListener('click', () => this.#stepCert(1));
    document.getElementById('cert-zoom')?.addEventListener('click', () => this.#setZoom(!this.zoomed));
    this.certImg?.addEventListener('click', () => this.#setZoom(!this.zoomed));
    this.certImg?.addEventListener('error', () => {
      this.certImg.hidden = true;
      document.getElementById('cert-missing').hidden = false;
    });

    /* Drag to pan when zoomed (touch already scrolls natively). */
    let drag = null;
    this.certStage?.addEventListener('pointerdown', (e) => {
      if (!this.zoomed || e.pointerType === 'touch') return;
      drag = { x: e.clientX, y: e.clientY, l: this.certStage.scrollLeft, t: this.certStage.scrollTop, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      this.certStage.scrollLeft = drag.l - dx;
      this.certStage.scrollTop = drag.t - dy;
    });
    window.addEventListener('pointerup', () => {
      if (drag?.moved) this.certImg.addEventListener('click', (ev) => ev.stopImmediatePropagation(), { once: true, capture: true });
      drag = null;
    });
  }

  openCert(index) {
    const a = AWARDS[index];
    if (!a) return;
    this.certIndex = index;
    this.#fillCert(a);
    if (this.kind !== 'cert') this.#show('cert', this.cert);
  }

  #fillCert(a) {
    const img = this.certImg;
    img.hidden = false;
    document.getElementById('cert-missing').hidden = true;
    img.alt = a.alt;
    img.src = a.full;
    document.getElementById('cert-sys').textContent = `${a.code} // ${String(a.index + 1).padStart(2, '0')} OF ${String(AWARDS.length).padStart(2, '0')}`;
    document.getElementById('cert-title').textContent = a.title;
    document.getElementById('cert-issuer').textContent = `${a.issuer} · ${a.issuerOriginal}`;
    document.getElementById('cert-original').textContent = a.original;
    this.#setZoom(false);
  }

  #stepCert(dir) {
    const n = AWARDS.length;
    this.certIndex = (this.certIndex + dir + n) % n;
    this.#fillCert(AWARDS[this.certIndex]);
    this.sound?.play('tick');
    this.onCertChange?.(this.certIndex);
  }

  #setZoom(on) {
    this.zoomed = on;
    this.certStage?.classList.toggle('is-zoomed', on);
    document.getElementById('cert-zoom')?.setAttribute('aria-pressed', String(on));
    if (on && this.certStage) {
      requestAnimationFrame(() => {
        const s = this.certStage;
        s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2;
        s.scrollTop = (s.scrollHeight - s.clientHeight) / 2;
      });
    }
  }

  /* ── Help ──────────────────────────────────────────────────────────── */
  openHelp() { this.#show('help', this.help); }
}

/* ── helpers ─────────────────────────────────────────────────────────── */
function setInert(on) {
  for (const sel of ['#ws-app', '#ws-text', '.ws-skip']) {
    document.querySelectorAll(sel).forEach((el) => { el.inert = on; });
  }
}

function trapTab(e, root) {
  const items = Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => !el.hidden && el.getClientRects().length > 0);
  if (!items.length) { e.preventDefault(); return; }
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
    e.preventDefault(); first.focus();
  }
}

function isTyping(e) {
  const t = e.target;
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

function reducedMotion() {
  return document.documentElement.classList.contains('ws-reduced');
}

function termLine(line, text) {
  const d = document.createElement('div');
  d.className = line.t === 'blank' ? 't-line t-line--blank' : `t-line t-line--${line.t}`;
  d.textContent = text;
  return d;
}
