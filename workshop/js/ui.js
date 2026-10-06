/* ==========================================================================
   ui.js — the DOM interface around the canvas. Everything here is semantic
   HTML built with createElement/textContent; no markup strings.
   ========================================================================== */
const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.app = $('ws-app');
    this.card = $('ws-card');
    this.bubbleEl = $('ws-bubble');
    this.bubbleText = $('ws-bubble-text');
    this.target = $('ws-target');
    this.reticle = $('ws-reticle');
    this.labelsEl = $('ws-labels');
    this.padEl = $('ws-pad');
    this.actEl = $('ws-act');
    this.resumeEl = $('ws-resume');
    this.controls = new Map();
    this.labelEls = new Map();
    this.#bind();
  }

  #bind() {
    const h = this.h;
    const on = (id, fn) => $(id)?.addEventListener('click', fn);
    on('ws-mode-guided', () => h.onMode('guided'));
    on('ws-mode-explore', () => h.onMode('explore'));
    on('ws-lights', () => h.onLights());
    on('ws-sound', () => h.onSound());
    on('ws-help', () => h.onHelp());
    on('ws-ring', () => h.onRing());
    on('ws-direct', () => h.onDirect());
    on('ws-skip-intro', () => h.onSkipIntro());
    on('ws-choose-guided', () => h.onChoose('guided'));
    on('ws-choose-explore', () => h.onChoose('explore'));
    on('ws-card-back', () => h.onCardBack());
    on('ws-card-prev', () => h.onCardStep(-1));
    on('ws-card-next', () => h.onCardStep(1));
    on('ws-prev-loc', () => h.onLocationStep(-1));
    on('ws-next-loc', () => h.onLocationStep(1));
    on('ws-touchctl', () => h.onTouchControls());
    on('ws-resume', () => h.onResume());
    on('ws-bubble-next', () => h.onBubbleNext());
    on('ws-ask', () => h.onAsk());
    document.querySelectorAll('[data-exit]').forEach((a) => a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      h.onExit();
    }));
    document.querySelectorAll('#ws-quality [data-quality]').forEach((b) => b.addEventListener('click', () => h.onQuality(b.dataset.quality)));
    document.querySelectorAll('#ws-look [data-look]').forEach((b) => b.addEventListener('click', () => h.onLook(b.dataset.look)));
    on('ws-motion', () => h.onMotion());
  }

  /* ── Global state flags (drive CSS) ─────────────────────────────────── */
  setInside(on) { this.app.dataset.inside = String(on); }
  setTouch(on) { this.app.dataset.touch = String(on); }
  setCursor(type) { if (this.app.dataset.cursor !== type) this.app.dataset.cursor = type || ''; }
  setLocked(on) { this.app.dataset.locked = String(on); }

  /* On-screen controls: auto-enabled on touch devices, toggled by the Pad chip. */
  setTouchControls(on) {
    this.app.dataset.tc = String(on);
    $('ws-touchctl').setAttribute('aria-pressed', String(on));
  }

  /* The pad itself is only shown while exploring with controls on. */
  setPad(on) {
    if (this.padShown === on) return;
    this.padShown = on;
    this.padEl.hidden = !on;
    this.h.onPadShown?.(on);
  }

  /* "Click to look around": shown whenever Explore wants the mouse but doesn't have it. */
  setResume(on) {
    if (this.resumeShown === on) return;
    this.resumeShown = on;
    this.resumeEl.hidden = !on;
  }

  /* Interact button label (touch). A null label dims the button. */
  setInteract(label) {
    const b = this.actEl;
    const text = label || 'Interact';
    if (b.dataset.label === text) return;
    b.dataset.label = text;
    b.querySelector('.ws-act-label').textContent = text;
    b.classList.toggle('is-ready', !!label);
    b.setAttribute('aria-label', label ? `Interact: ${label}` : 'Interact');
  }

  setLook(key) {
    document.querySelectorAll('#ws-look [data-look]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === key)));
  }

  setMode(mode) {
    this.app.dataset.mode = mode;
    $('ws-mode-guided').setAttribute('aria-pressed', String(mode === 'guided'));
    $('ws-mode-explore').setAttribute('aria-pressed', String(mode === 'explore'));
    $('ws-explore-hint').hidden = mode !== 'explore';
    if (mode === 'explore') this.#quietHint();
  }

  #quietHint() {
    const hint = $('ws-explore-hint');
    hint.classList.remove('is-quiet');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => hint.classList.add('is-quiet'), 7000);
  }

  setLights(night) {
    const b = $('ws-lights');
    b.setAttribute('aria-pressed', String(night));
    b.querySelector('.ws-btn-label').textContent = night ? 'Night on' : 'Night';
  }

  setSound(on, failed = false) {
    const b = $('ws-sound');
    b.setAttribute('aria-pressed', String(on));
    $('ws-sound-label').textContent = failed ? 'Sound unavailable' : on ? 'Sound on' : 'Sound off';
    b.disabled = failed;
  }

  setQuality(choice, active) {
    document.querySelectorAll('#ws-quality [data-quality]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.quality === choice));
    });
    $('ws-quality-note').textContent = `Running at ${active}. Auto picks a level from coarse hints on this device; nothing is stored or sent.`;
  }

  setMotion(reduced, systemReduced) {
    const b = $('ws-motion');
    b.setAttribute('aria-pressed', String(!reduced));
    b.textContent = reduced ? 'Play animations' : 'Animations playing';
    b.title = systemReduced ? 'Your system asks for reduced motion' : '';
  }

  /* ── Entry / intro / chooser ────────────────────────────────────────── */
  showEntry(on) {
    $('ws-entry').hidden = !on;
    if (on) requestAnimationFrame(() => $('ws-ring').focus({ preventScroll: true }));
  }
  showSkip(on) { $('ws-skip-intro').hidden = !on; }
  showChooser(on, suggested = 'guided') {
    $('ws-chooser').hidden = !on;
    if (!on) return;
    $('ws-choose-guided').classList.toggle('is-suggested', suggested === 'guided');
    $('ws-choose-explore').classList.toggle('is-suggested', suggested === 'explore');
    requestAnimationFrame(() => $(suggested === 'explore' ? 'ws-choose-explore' : 'ws-choose-guided').focus({ preventScroll: true }));
  }
  get chooserOpen() { return !$('ws-chooser').hidden; }

  /* ── Guided list ────────────────────────────────────────────────────── */
  buildLocations(list) {
    const ol = $('ws-locations');
    ol.replaceChildren();
    list.forEach((loc, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ws-loc-btn';
      b.dataset.loc = loc.id;
      const idx = document.createElement('span');
      idx.className = 'ws-loc-idx';
      idx.textContent = String(i).padStart(2, '0');
      idx.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.textContent = loc.label;
      b.append(idx, name);
      b.addEventListener('click', () => this.h.onLocation(loc.id));
      li.appendChild(b);
      ol.appendChild(li);
    });
    const li = document.createElement('li');
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'ws-loc-btn';
    const idx = document.createElement('span');
    idx.className = 'ws-loc-idx';
    idx.setAttribute('aria-hidden', 'true');
    idx.textContent = '→';
    const name = document.createElement('span');
    name.textContent = 'Exit to portfolio';
    exit.append(idx, name);
    exit.addEventListener('click', () => this.h.onExit());
    li.appendChild(exit);
    ol.appendChild(li);
  }

  setLocation(id, objects) {
    document.querySelectorAll('#ws-locations .ws-loc-btn').forEach((b) => {
      if (b.dataset.loc) b.setAttribute('aria-current', String(b.dataset.loc === id));
    });
    const ul = $('ws-objects');
    ul.replaceChildren();
    for (const o of objects) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ws-obj-btn';
      b.dataset.hotspot = o.id;
      b.textContent = o.label;
      b.addEventListener('click', () => this.h.onObject(o.id));
      b.addEventListener('mouseenter', () => this.h.onObjectHover?.(o.id, true));
      b.addEventListener('mouseleave', () => this.h.onObjectHover?.(o.id, false));
      b.addEventListener('focus', () => this.h.onObjectHover?.(o.id, true));
      b.addEventListener('blur', () => this.h.onObjectHover?.(o.id, false));
      li.appendChild(b);
      ul.appendChild(li);
    }
  }

  setHotObject(id) {
    document.querySelectorAll('#ws-objects .ws-obj-btn').forEach((b) => b.classList.toggle('is-hot', b.dataset.hotspot === id));
  }

  focusLocation(id) {
    document.querySelector(`#ws-locations .ws-loc-btn[data-loc="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }

  /* ── Inspect card ───────────────────────────────────────────────────── */
  showCard(spec) {
    this.controls.clear();
    $('ws-card-sys').textContent = spec.sys || '';
    $('ws-card-title').textContent = spec.title || '';
    const body = $('ws-card-body');
    body.replaceChildren();
    if (spec.list) {
      const ul = document.createElement('ul');
      for (const t of spec.body) { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }
      body.appendChild(ul);
    } else {
      for (const t of spec.body || []) {
        const p = document.createElement('p');
        p.textContent = t;
        if (t.startsWith('“')) p.className = 'is-quote';
        body.appendChild(p);
      }
    }
    if (spec.readout) {
      const pre = document.createElement('pre');
      pre.className = 'ws-readout';
      pre.id = 'ws-card-readout';
      pre.setAttribute('aria-live', 'polite');
      pre.textContent = spec.readout;
      body.appendChild(pre);
    }

    const ctr = $('ws-card-controls');
    ctr.replaceChildren();
    for (const c of spec.controls || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ws-chipbtn';
      b.textContent = c.label;
      if (c.pressed != null) b.setAttribute('aria-pressed', String(!!c.pressed));
      if (c.title) b.title = c.title;
      b.addEventListener('click', () => c.onClick(b));
      ctr.appendChild(b);
      if (c.id) this.controls.set(c.id, b);
    }

    const act = $('ws-card-actions');
    act.replaceChildren();
    for (const a of spec.actions || []) act.appendChild(this.#action(a));

    $('ws-card-prev').hidden = !spec.step;
    $('ws-card-next').hidden = !spec.step;
    this.card.hidden = false;
    this.app.dataset.card = 'true';
    this.card.scrollTop = 0;
    if (spec.focus !== false) requestAnimationFrame(() => $('ws-card-title').focus({ preventScroll: true }));
  }

  #action(a) {
    if (a.href) {
      const link = document.createElement('a');
      link.className = 'card-link';
      link.href = a.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = a.label;
      return link;
    }
    const b = document.createElement('button');
    b.type = 'button';
    if (a.primary) {
      b.className = 'inspect-btn';
      const label = document.createElement('span');
      label.className = 'inspect-label';
      label.textContent = a.label;
      const icon = document.createElement('span');
      icon.className = 'inspect-icon';
      icon.setAttribute('aria-hidden', 'true');
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', '12');
      svg.setAttribute('height', '12');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      for (const [x1, y1, x2, y2] of [[12, 5, 12, 19], [5, 12, 19, 12]]) {
        const l = document.createElementNS(SVG_NS, 'line');
        l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
        svg.appendChild(l);
      }
      icon.appendChild(svg);
      b.append(label, icon);
    } else {
      b.className = 'card-link';
      b.textContent = a.label;
    }
    b.addEventListener('click', a.onClick);
    return b;
  }

  updateControl(id, { label, pressed } = {}) {
    const b = this.controls.get(id);
    if (!b) return;
    if (label != null) b.textContent = label;
    if (pressed != null) b.setAttribute('aria-pressed', String(!!pressed));
  }

  setReadout(text) {
    const el = $('ws-card-readout');
    if (el && el.textContent !== text) el.textContent = text;
  }

  hideCard() {
    this.card.hidden = true;
    this.app.dataset.card = 'false';
    this.controls.clear();
  }

  get cardOpen() { return !this.card.hidden; }

  /* ── Speech bubble ──────────────────────────────────────────────────── */
  get bubble() {
    return {
      show: (text) => {
        this.bubbleText.textContent = text;
        this.bubbleEl.hidden = false;
        $('ws-bubble-next').hidden = false;
      },
      setText: (text) => { this.bubbleText.textContent = text; },
      hide: () => { this.bubbleEl.hidden = true; },
    };
  }

  placeBubble(x, y, docked) {
    const el = this.bubbleEl;
    if (el.hidden) return;
    el.classList.toggle('is-docked', docked);
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left, top;
    if (docked) {
      const phone = vw <= 760;
      left = phone ? 12 : Math.max(12, (vw - w) / 2);
      const below = phone
        ? (this.cardOpen ? this.card.offsetHeight + 10 : this.app.dataset.mode === 'guided' ? 128 : 96)
        : 24;
      top = Math.max(64, vh - h - below);
    } else {
      left = Math.min(Math.max(12, x - w / 2), vw - w - 12);
      top = Math.min(Math.max(64, y - h - 14), vh - h - 12);
      el.style.setProperty('--tail-x', `${Math.min(Math.max(16, x - left), w - 16)}px`);
    }
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  /* ── Ask menu ───────────────────────────────────────────────────────── */
  buildAsk(questions) {
    const ul = $('ws-ask-list');
    ul.replaceChildren();
    for (const q of questions) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ws-ask-btn';
      b.dataset.ask = q.id;
      b.textContent = q.q;
      b.addEventListener('click', () => this.h.onAskQuestion(q.id));
      li.appendChild(b);
      ul.appendChild(li);
    }
  }
  setAskVisible(on) { $('ws-ask').hidden = !on; if (!on) this.setAskOpen(false); }
  setAskOpen(open) {
    $('ws-ask-menu').hidden = !open;
    $('ws-ask').setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(() => document.querySelector('#ws-ask-list .ws-ask-btn')?.focus({ preventScroll: true }));
  }
  get askOpen() { return !$('ws-ask-menu').hidden; }
  markAsked(id) { document.querySelector(`#ws-ask-list [data-ask="${CSS.escape(id)}"]`)?.classList.add('is-seen'); }
  focusAsk() { $('ws-ask').focus({ preventScroll: true }); }

  /* ── Explore targeting ──────────────────────────────────────────────── */
  setTarget(label, x, y) {
    if (!label) { this.target.classList.remove('is-on'); this.reticle.classList.remove('is-hot'); return; }
    if (this.target.dataset.label !== label) {
      this.target.dataset.label = label;
      this.target.replaceChildren();
      const k = document.createElement('kbd');
      k.textContent = 'E';
      this.target.append(document.createTextNode(`${label}  `), k);
    }
    this.target.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y + 12)}px)`;
    this.target.classList.add('is-on');
    this.reticle.classList.add('is-hot');
  }

  /* World-anchored DOM labels (exploded view, MoonCamp modules). */
  setLabels(list) {
    const keep = new Set();
    for (const l of list) {
      keep.add(l.id);
      let el = this.labelEls.get(l.id);
      if (!el) {
        el = document.createElement('span');
        el.className = 'ws-label3d';
        el.textContent = l.text;
        this.labelsEl.appendChild(el);
        this.labelEls.set(l.id, el);
      }
      el.style.transform = `translate(${Math.round(l.x)}px, ${Math.round(l.y)}px) translate(-50%, -100%)`;
      el.classList.toggle('is-visible', !!l.visible);
    }
    for (const [id, el] of this.labelEls) {
      if (!keep.has(id)) { el.remove(); this.labelEls.delete(id); }
    }
  }

  /* ── Feedback ───────────────────────────────────────────────────────── */
  announce(text) {
    const live = $('ws-live');
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  }

  toast(text, ms = 2600) {
    const t = $('ws-toast');
    t.textContent = text;
    t.classList.add('is-on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('is-on'), ms);
  }

  setDiag(text) {
    const d = $('ws-diag');
    if (text == null) { d.hidden = true; return; }
    d.hidden = false;
    d.textContent = text;
  }

  /* ── Loader ─────────────────────────────────────────────────────────── */
  loaderStep(n, label) {
    const li = document.createElement('li');
    const a = document.createElement('span');
    a.textContent = `[${String(n).padStart(2, '0')}] ${label}`;
    const b = document.createElement('span');
    b.className = 'ws-loader-state';
    b.textContent = '…';
    li.append(a, b);
    $('ws-loader-lines').appendChild(li);
    return {
      progress: (text) => { b.textContent = text; },
      done: (text = 'OK') => { b.textContent = text; li.classList.add('is-ok'); },
      fail: (text = 'FAILED') => { b.textContent = text; li.classList.add('is-fail'); },
    };
  }

  loaderDone() { $('ws-loader').classList.add('is-done'); }

  /* Arrival bloom (only exists in the DOM flow when ?via=portal). */
  arrive() {
    const el = $('ws-arrive');
    if (!el) return;
    el.classList.remove('is-on');
    void el.offsetWidth;                  // restart the animation
    el.classList.add('is-on');
    clearTimeout(this.arriveTimer);
    this.arriveTimer = setTimeout(() => el.classList.remove('is-on'), 1900);
  }

  fade(on, label = null) {
    const f = $('ws-fade');
    if (label) $('ws-fade-label').textContent = label;
    f.classList.toggle('is-on', on);
    f.classList.toggle('is-label', on && !!label);
  }
}
