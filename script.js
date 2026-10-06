/* ==========================================================================
   Inline SVG icons (Lucide-compatible stroke paths)
   ========================================================================== */
const ICONS = {
  github:
    '<svg viewBox="0 0 24 24"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5A10.3 10.3 0 0 0 12 3c-1.27 0-2.4.43-3.5 1-2-1.5-3-1.5-3-1.5-.28 1.15-.28 2.35 0 3.5A5.4 5.4 0 0 0 5 10c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S10.15 17.75 10 19v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>',
  'arrow-up-right':
    '<svg viewBox="0 0 24 24"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
  zap:
    '<svg viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
  x:
    '<svg viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
};

function injectIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach((el) => {
    const svg = ICONS[el.getAttribute('data-icon')];
    if (svg) el.innerHTML = svg;
  });
}

/* ==========================================================================
   Smooth scroll — data-scroll="<section-id>" on any button
   Scrolls the main container directly for precise section targeting.
   ========================================================================== */
function initSmoothScroll() {
  const container = document.querySelector('.scroll-container');
  document.querySelectorAll('[data-scroll]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(btn.dataset.scroll);
      if (!el || !container) return;
      container.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   Terminal sequence — real architecture data from ScholiLink repo
   cmd  lines type at 13 ms/char (human key-by-key feel)
   all other lines render at 5 ms/char (instantaneous system output)
   ========================================================================== */
const SL_TERMINAL_LINES = [
  { t: 'cmd',   s: '$ firebase emulators:start --import=./seed --project student-dashboard-greece' },
  { t: 'info',  s: '  Starting emulators...' },
  { t: 'ok',    s: '  auth            localhost:9099    online' },
  { t: 'ok',    s: '  firestore       localhost:8080    online' },
  { t: 'ok',    s: '  functions       localhost:5001    online' },
  { t: 'ok',    s: '  storage         localhost:9199    online' },
  { t: 'blank', s: '' },
  { t: 'info',  s: 'Loading Firestore security rules...' },
  { t: 'meta',  s: '  47 rule clauses parsed' },
  { t: 'meta',  s: '  uid-scoped reads: verified' },
  { t: 'meta',  s: '  server-only paths [/internal /admin]: denied' },
  { t: 'blank', s: '' },
  { t: 'info',  s: 'Deploying Cloud Functions  (Node 22, TypeScript)...' },
  { t: 'fn',    s: '  [1/4]  tutoring-ai             callable    ready' },
  { t: 'fn',    s: '  [2/4]  safety-score            callable    ready' },
  { t: 'fn',    s: '  [3/4]  social-graph-mutate     callable    ready' },
  { t: 'fn',    s: '  [4/4]  gemini-orchestrator     callable    ready' },
  { t: 'blank', s: '' },
  { t: 'info',  s: 'Seeding demo environment...' },
  { t: 'meta',  s: '  student@example.com     uid: usr_7f3a2b    ok' },
  { t: 'meta',  s: '  teammate@example.com    uid: usr_9c1d4e    ok' },
  { t: 'meta',  s: '  18 Firestore documents written' },
  { t: 'blank', s: '' },
  { t: 'ok',    s: 'ScholiLink ready on http://localhost:3000' },
  { t: 'meta',  s: 'AI: Gemini mocked (deterministic)  |  Mode: EMULATOR' },
];

/* ==========================================================================
   Project data — image galleries and modal copy
   ========================================================================== */
const PROJECTS = {
  ag: {
    images: ['aether-gravity1.png', 'aether-gravity5.png', 'aether-gravity2.png', 'aether-gravity3.png', 'aether-gravity4.png', 'aether-gravity6.png', 'aether-gravity7.png', 'aether-gravity8.png'],
    imageAlt: 'Aether Gravity — N-body orbital sandbox screenshot',
    layout: 'stack',
  },
  sl: {
    images: ['scholilink1.png', 'scholilink2.png', 'scholilink3.png'],
    imageAlt: 'ScholiLink — student platform screenshot',
    layout: 'side',
    side: 'left',
  },
  wt: {
    images: ['turbine-animation.gif', 'turbine1.png', 'turbine2.jpg', 'turbine3.jpg'],
    imageAlt: 'Functional Wind Turbine System — hardware assembly',
    layout: 'side',
    side: 'right',
  },
  mc: {
    images: ['MoonCamp1.webp', 'MoonCamp2.webp', 'MoonCamp3.webp', 'MoonCamp4.webp', 'MoonCamp5.webp'],
    imageAlt: 'MoonCamp — modular magnetic lunar habitat scale model',
    layout: 'side',
    side: 'right',
  },
  lt: {
    images: ['LensTiles3.png', 'LensTiles2.png', 'LensTiles1.png', 'LensTiles4.png'],
    imageAlt: 'LensTile — modular glasses case and local-first tile app',
    layout: 'stack',
  },
  bc: {
    images: ['BrickCast4.png', 'BrickCast5.png', 'BrickCast2.png', 'BrickCast3.png', 'BrickCast1.png'],
    imageAlt: 'BrickCast — STL to interlocking brick converter',
    layout: 'stack',
  },
  gs: {
    images: ['Guardian1.jpg', 'Guardian2.jpg', 'Guardian3.jpg'],
    imageAlt: 'Guardian System — installed interior portal, outdoor doorbell, and door lamp',
    layout: 'side',
    side: 'right',
  },
};

/* ==========================================================================
   Project inspect — Floating Liquid Glass Modal
   Clicking .inspect-btn populates and opens the fixed modal overlay.
   The gallery is a horizontal scroll-snap carousel from PROJECTS[].images.
   Closing via: × button, backdrop click, or Escape key.
   ========================================================================== */
function initProjectInspect(terminal) {
  const modal         = document.getElementById('project-modal');
  const modalCard     = modal && modal.querySelector('.modal-card');
  const backdrop      = document.getElementById('modal-backdrop');
  const closeBtn      = document.getElementById('modal-close-btn');
  const gallery       = document.getElementById('modal-gallery');
  const carouselCtrls = document.getElementById('carousel-controls');
  const carouselDots  = document.getElementById('carousel-dots');
  const carouselPrev  = document.getElementById('carousel-prev');
  const carouselNext  = document.getElementById('carousel-next');
  const snapContainer = document.querySelector('.scroll-container');
  if (!modal || !modalCard || !backdrop || !closeBtn || !gallery) return;

  let lastFocused = null;
  let activeSlide = 0;
  let slideCount = 0;

  function clearLayoutClasses() {
    modalCard.classList.remove('layout-side', 'layout-stack', 'gallery-left', 'gallery-right');
  }

  function applyLayout(project) {
    clearLayoutClasses();
    if (project.layout === 'side') {
      modalCard.classList.add('layout-side');
      modalCard.classList.add(project.side === 'right' ? 'gallery-right' : 'gallery-left');
    } else if (project.layout === 'stack') {
      modalCard.classList.add('layout-stack');
    }
  }

  function setActiveSlide(index, scroll = true) {
    if (slideCount === 0) return;
    activeSlide = Math.max(0, Math.min(index, slideCount - 1));

    if (scroll) {
      const slide = gallery.children[activeSlide];
      if (slide) {
        gallery.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
      }
    }

    if (carouselDots) {
      carouselDots.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        const on = i === activeSlide;
        dot.classList.toggle('is-active', on);
        dot.setAttribute('aria-selected', String(on));
      });
    }

    if (carouselPrev) carouselPrev.disabled = activeSlide === 0;
    if (carouselNext) carouselNext.disabled = activeSlide >= slideCount - 1;
  }

  function syncSlideFromScroll() {
    const width = gallery.clientWidth || 1;
    const index = Math.round(gallery.scrollLeft / width);
    if (index !== activeSlide) setActiveSlide(index, false);
  }

  /* ── Build gallery images from PROJECTS data ────────────────────────────── */
  function populateGallery(projectId) {
    const project = PROJECTS[projectId];
    if (!project) return;

    gallery.innerHTML = '';
    if (carouselDots) carouselDots.innerHTML = '';
    gallery.scrollLeft = 0;
    activeSlide = 0;
    slideCount = project.images.length;

    project.images.forEach((src, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'glass-image-wrapper';
      wrapper.setAttribute('role', 'listitem');

      const img = document.createElement('img');
      img.src = src;
      img.className = 'carousel-image';
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.alt = project.images.length > 1
        ? `${project.imageAlt} — view ${i + 1} of ${project.images.length}`
        : project.imageAlt;

      wrapper.appendChild(img);
      gallery.appendChild(wrapper);

      if (carouselDots && project.images.length > 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Show image ${i + 1} of ${project.images.length}`);
        dot.setAttribute('aria-selected', String(i === 0));
        dot.addEventListener('click', () => setActiveSlide(i));
        carouselDots.appendChild(dot);
      }
    });

    if (carouselCtrls) {
      carouselCtrls.hidden = slideCount < 2;
    }
    setActiveSlide(0, false);
  }

  /* ── Open modal for a given project ─────────────────────────────────── */
  function openModal(projectId) {
    const project = PROJECTS[projectId];
    if (!project) return;

    lastFocused = document.activeElement;

    applyLayout(project);

    /* Populate gallery images */
    populateGallery(projectId);

    /* Show the matching content block, hide all others */
    modal.querySelectorAll('.modal-content').forEach((el) => {
      const active = el.id === `mcontent-${projectId}`;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
    });

    /* Reveal overlay */
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    /* Lock the scroll container so background content doesn't scroll */
    if (snapContainer) snapContainer.style.overflowY = 'hidden';

    /* Start Firebase boot terminal for ScholiLink (delay for modal entrance) */
    if (projectId === 'sl' && terminal) {
      setTimeout(() => terminal.start(), 650);
    }

    /* Update inspect button aria states */
    document.querySelectorAll('.inspect-btn').forEach((btn) => {
      btn.setAttribute('aria-expanded', String(btn.dataset.project === projectId));
    });

    /* Move focus to close button after transition starts */
    setTimeout(() => closeBtn.focus(), 50);
  }

  /* ── Close modal ─────────────────────────────────────────────────────── */
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    /* Restore scroll container scrolling */
    if (snapContainer) snapContainer.style.overflowY = '';

    /* Stop terminal typewriter if running */
    if (terminal) terminal.stop();

    document.querySelectorAll('.inspect-btn').forEach((btn) => {
      btn.setAttribute('aria-expanded', 'false');
    });

    /* Return focus to the element that triggered the modal */
    if (lastFocused) lastFocused.focus();

    /* Reset content state after the CSS transition finishes */
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) {
        modal.querySelectorAll('.modal-content').forEach((el) => {
          el.classList.remove('is-active');
          el.setAttribute('aria-hidden', 'true');
        });
        gallery.innerHTML = '';
        if (carouselDots) carouselDots.innerHTML = '';
        if (carouselCtrls) carouselCtrls.hidden = true;
        clearLayoutClasses();
        activeSlide = 0;
        slideCount = 0;
      }
    }, 450);
  }

  /* ── Bind inspect buttons ────────────────────────────────────────────── */
  document.querySelectorAll('.inspect-btn').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset.project));
  });

  /* ── Close button ────────────────────────────────────────────────────── */
  closeBtn.addEventListener('click', closeModal);

  /* ── Backdrop click closes ───────────────────────────────────────────── */
  backdrop.addEventListener('click', closeModal);

  /* ── Carousel navigation ─────────────────────────────────────────────── */
  if (carouselPrev) {
    carouselPrev.addEventListener('click', () => setActiveSlide(activeSlide - 1));
  }
  if (carouselNext) {
    carouselNext.addEventListener('click', () => setActiveSlide(activeSlide + 1));
  }
  gallery.addEventListener('scroll', () => {
    window.requestAnimationFrame(syncSlideFromScroll);
  }, { passive: true });

  /* ── Keyboard: Escape closes; arrows change slides when modal is open ─ */
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (slideCount < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveSlide(activeSlide - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveSlide(activeSlide + 1);
    }
  });
}

/* ==========================================================================
   Orbital Canvas — Passive N-body mechanics background (hero section only)

   Physics constants taken verbatim from Aether Gravity /constants.ts:
     G_CONSTANT = 0.8
   Body positions and initial velocities from PRESETS.Solar in constants.ts.

   Strategy:
     1. Pre-compute 2800 integration steps (offscreen, synchronous — <10 ms).
        These traces are drawn once to an offscreen canvas as static paths.
     2. Each rAF frame: composite the static trace image, then draw live body
        dots on top. The bodies orbit continuously at a slow, meditative pace.
     3. No mouse interaction, no color, no glow — only white line geometry.
   ========================================================================== */
function initOrbitalCanvas() {
  const canvas = document.getElementById('gravity-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* ── Physics constants (Aether Gravity constants.ts) ─────────────────── */
  const G = 0.8; /* from Aether Gravity constants.ts */

  /* How many trace-index steps to advance per animation frame.
     Each trace encodes exactly 1.05 orbits, so length ∝ orbital period.
     A constant ADVANCE rate naturally satisfies Kepler's 3rd law:
     inner bodies (fewer points) orbit faster than outer ones (more points).
     At 0.5 idx/frame @ 60 fps the Ice Giant completes one orbit in ~37 s. */
  const ADVANCE = 0.18; /* reduced from 0.5 — inner orbit ~3 s, outer ~33 s */

  /* ── Solar preset (Aether Gravity constants.ts → PRESETS.Solar) ─────── */
  const INIT = [
    { mass: 1000, x:   0, y:   0, vx: 0,   vy: 0   }, /* Star      */
    { mass:   10, x:  60, y:   0, vx: 0,   vy: 3.8  }, /* Planet    */
    { mass:   50, x: 110, y:   0, vx: 0,   vy: 2.8  }, /* Planet    */
    { mass:  0.5, x:  35, y:   0, vx: 0,   vy: 5.0  }, /* Dwarf     */
    { mass:  150, x: 180, y:   0, vx: 0,   vy: 2.2  }, /* Ice Giant */
  ];

  function cloneBodies(src) { return src.map((b) => ({ ...b })); }

  /* Semi-implicit Euler — in-place, stable for many-orbit integration */
  function stepBodies(bodies, dt) {
    const n  = bodies.length;
    const ax = new Float64Array(n);
    const ay = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const r2 = dx * dx + dy * dy + 0.5; /* softened — prevents singularity */
        const r  = Math.sqrt(r2);
        const f  = G * bodies[j].mass / r2;
        ax[i] += f * dx / r;
        ay[i] += f * dy / r;
      }
    }
    for (let i = 0; i < n; i++) {
      bodies[i].vx += ax[i] * dt;
      bodies[i].vy += ay[i] * dt;
      bodies[i].x  += bodies[i].vx * dt;
      bodies[i].y  += bodies[i].vy * dt;
    }
  }

  /* ── Analytical Keplerian traces — mathematically closed ellipses ───────
     Numerical integration drifts: start ≠ end after one orbit, causing the
     dot to teleport across the gap each loop. The fix is to skip integration
     entirely and compute the exact two-body conic section from the initial
     conditions via orbital mechanics.

     Given periapsis position r₀ = |body.pos| and tangential speed v₀:
       h  = r₀·v₀              (specific angular momentum)
       E  = ½v₀² − GM/r₀      (specific energy)
       p  = h²/(GM)            (semi-latus rectum)
       e  = √(1 + 2Eh²/(GM)²) (eccentricity)
       r(θ) = p / (1 + e·cosθ) (polar orbit equation)

     nPoints ∝ r₀^(3/2) ∝ orbital period (Kepler's 3rd law), so advancing
     all cursors at the same ADVANCE rate gives physically correct relative
     speeds — inner planets faster, outer planets slower.                   */

  const M_STAR  = INIT[0].mass; /* 1000                                     */
  const R_REF   = 180;          /* Ice Giant radius — reference orbit        */
  const PTS_REF = 360;          /* points on the reference (outermost) orbit */

  /* Visual orbital shapes — eccentricities and periapsis tilt angles.
     Eccentricities are intentionally varied (0.06–0.38) so some orbits read
     as clearly elliptical. Tilt angles ensure no two orbits share the same
     major-axis orientation, distinguishing this from the orrery's uniform
     perspective. Ordered to match INIT body indices 1–4.                   */
  const ORBIT_SHAPES = [
    { e: 0.10, tilt:  0.00, stretch: 1.00 },  /* inner Planet  — near-circular        */
    { e: 0.55, tilt:  1.20, stretch: 0.58 },  /* outer Planet  — high-e, flat oval    */
    { e: 0.32, tilt:  0.55, stretch: 0.68 },  /* Dwarf         — moderate oval, tilted */
    { e: 0.50, tilt: -0.80, stretch: 0.52 },  /* Ice Giant     — wide flat oval       */
  ];

  function keplerTrace(body, shapeIdx) {
    const r0    = Math.sqrt(body.x * body.x + body.y * body.y);
    const shape = ORBIT_SHAPES[shapeIdx];
    const e       = shape.e;
    const tilt    = shape.tilt;
    const stretch = shape.stretch ?? 1;

    /* For periapsis at r₀: semi-latus rectum p = r₀·(1+e)                */
    const p    = r0 * (1 + e);
    /* nPoints ∝ r₀^(3/2) ∝ orbital period — preserves Kepler's 3rd law  */
    const nPts = Math.max(32, Math.round(PTS_REF * Math.pow(r0 / R_REF, 1.5)));
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const pts = [];
    for (let k = 0; k < nPts; k++) {
      const theta = (k / nPts) * 2 * Math.PI;
      const r     = p / (1 + e * Math.cos(theta));
      /* Raw ellipse coordinates, then rotate periapsis by tilt angle */
      const xR = r * Math.cos(theta);
      const yR = r * Math.sin(theta);
      const xF = xR * cosT - yR * sinT;
      const yF = (xR * sinT + yR * cosT) * stretch;
      pts.push([xF, yF]);
    }
    return pts;
  }

  /* Map bodies to shapes: skip star (i=0), assign shape index i-1         */
  const traces = INIT.map((b, i) => i === 0 ? [] : keplerTrace(b, i - 1));

  /* ── Offscreen canvas — holds static trace lines, rebuilt on resize ──── */
  const offscreen = document.createElement('canvas');
  const offCtx    = offscreen.getContext('2d');

  /* ── Dot cursors — fractional index into each body's trace array ──────── */
  /* Stagger starting positions so no two bodies begin at the same angle    */
  const traceIdx = INIT.map((_, i) =>
    i === 0 ? 0 : Math.floor((traces[i].length * (i - 1)) / (INIT.length - 1))
  );

  /* ── Sizing helpers ───────────────────────────────────────────────────── */
  let W = 0, H = 0, sc = 1, ox = 0, oy = 0;

  /* Simulation y-axis is math-positive (up); canvas y increases downward */
  function toCanvas(x, y) { return [ox + x * sc, oy - y * sc]; }

  function buildOffscreen() {
    offscreen.width  = W;
    offscreen.height = H;
    offCtx.clearRect(0, 0, W, H);
    offCtx.lineWidth   = 0.75;
    offCtx.strokeStyle = 'rgba(255,255,255,0.22)';
    offCtx.lineJoin    = 'round';
    traces.forEach((trace, i) => {
      if (i === 0) return; /* skip the star — its "orbit" is a dot at origin */
      offCtx.beginPath();
      const [sx, sy] = toCanvas(trace[0][0], trace[0][1]);
      offCtx.moveTo(sx, sy);
      for (let p = 1; p < trace.length; p++) {
        const [px, py] = toCanvas(trace[p][0], trace[p][1]);
        offCtx.lineTo(px, py);
      }
      offCtx.closePath(); /* draws the final segment back to moveTo — seals the ellipse */
      offCtx.stroke();
    });
  }

  function simBounds() {
    let maxX = 0;
    let maxY = 0;
    traces.forEach((trace, i) => {
      if (i === 0) return;
      for (const [x, y] of trace) {
        maxX = Math.max(maxX, Math.abs(x));
        maxY = Math.max(maxY, Math.abs(y));
      }
    });
    return { maxX, maxY };
  }

  function resize() {
    /* Use the parent element (hero section) as the authoritative size source.
       Falls back to window dimensions to avoid the race where offsetWidth/Height
       returns 0 before the flex container has resolved its min-height: 100vh. */
    const p = canvas.parentElement;
    W = (p && p.offsetWidth)  || window.innerWidth;
    H = (p && p.offsetHeight) || window.innerHeight;
    if (W === 0 || H === 0) return;
    canvas.width  = W;
    canvas.height = H;
    /* Right-of-centre: text lives in the left ~60 %, orbits balance it on the right */
    ox = W * 0.72;
    oy = H * 0.50;

    /* Auto-fit: scale so the full system (including outer oval) stays inside the hero */
    const { maxX, maxY } = simBounds();
    const pad = 32;
    const scaleX = maxX > 0 ? Math.min(ox - pad, W - ox - pad) / maxX : 1;
    const scaleY = maxY > 0 ? Math.min(oy - pad, H - oy - pad) / maxY : 1;
    sc = Math.max(0.25, Math.min(scaleX, scaleY) * 0.90);

    buildOffscreen();
  }

  /* ── Animation loop ───────────────────────────────────────────────────── */
  let rafId;

  function frame() {
    /* Advance each dot along its pre-computed trace.
       No integration — zero drift, no escape possible. */
    for (let i = 1; i < INIT.length; i++) {
      traceIdx[i] = (traceIdx[i] + ADVANCE) % traces[i].length;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(offscreen, 0, 0); /* static trace ellipses */

    /* Draw dots: star fixed at origin, planets at their trace cursor */
    INIT.forEach((_, i) => {
      let cx, cy;
      if (i === 0) {
        [cx, cy] = toCanvas(0, 0); /* star stays at the simulation origin */
      } else {
        const pt = traces[i][Math.floor(traceIdx[i])];
        [cx, cy] = toCanvas(pt[0], pt[1]);
      }
      ctx.beginPath();
      ctx.arc(cx, cy, i === 0 ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0
        ? 'rgba(255,255,255,0.85)'
        : 'rgba(255,255,255,0.70)';
      ctx.fill();
    });

    rafId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else rafId = requestAnimationFrame(frame);
  });

  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  /* Safety net: if resize() returned early because layout wasn't ready,
     the next animation frame is guaranteed post-layout — re-run there. */
  requestAnimationFrame(() => { resize(); rafId = requestAnimationFrame(frame); });
}

/* ==========================================================================
   Orrery — Sharp SVG orbital scroll progress indicator

   Four elliptical rings of increasing size, one per section.
   Dots orbit continuously at Kepler-scaled angular velocities.
   Active ring and orbital dot brighten and ease into a larger highlight.
   Click a ring's hit area to scroll to that section.
   ========================================================================== */
function initOrrery() {
  const orrery    = document.getElementById('orrery');
  const container = document.querySelector('.scroll-container');
  if (!orrery || !container) return;

  const slides = Array.from(document.querySelectorAll('.slide'));
  const rings  = slides.map((_, i) => document.getElementById(`orrery-ring-${i}`));
  const dots   = slides.map((_, i) => document.getElementById(`orrery-dot-${i}`));
  if (rings.some((ring) => !ring) || dots.some((dot) => !dot)) return;

  /* Orbital parameters — angular velocity scaled to Kepler's third law:
     ω ∝ r^(-3/2), normalised so the innermost ring completes ~1 rev / 8 s  */
  const RINGS = [
    { rx: 18, ry: 10, omega: 0.00130 }, /* inner         — Hero     */
    { rx: 32, ry: 18, omega: 0.00075 }, /* second        — About    */
    { rx: 50, ry: 28, omega: 0.00042 }, /* third         — Projects */
    { rx: 57, ry: 35, omega: 0.00032 }, /* outermost     — Contact  */
  ];

  /* Stagger starting angles so no two dots overlap at t=0 */
  const angles = RINGS.map((_, i) => (Math.PI * 2 * i) / RINGS.length);
  let activeIdx = 0;
  let lastTime  = performance.now();
  let activeUpdateRaf = 0;

  /* ── Active-section detection ──────────────────────────────────────────
     The Projects slide can be much taller than the scroll viewport, so an
     IntersectionObserver threshold of 0.5 may never be reached. Track the
     section under the viewport's center instead; it remains active throughout
     the full length of tall sections. */
  function updateActiveFromScroll() {
    activeUpdateRaf = 0;
    const containerRect = container.getBoundingClientRect();
    const viewportCenter = containerRect.top + container.clientHeight / 2;
    let idx = slides.findIndex((slide) => {
      const rect = slide.getBoundingClientRect();
      return rect.top <= viewportCenter && rect.bottom > viewportCenter;
    });

    if (idx === -1 && slides.length) {
      idx = slides.reduce((closestIdx, slide, slideIdx) => {
        const rect = slide.getBoundingClientRect();
        const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportCenter);
        const closest = slides[closestIdx].getBoundingClientRect();
        const closestDistance = Math.abs((closest.top + closest.bottom) / 2 - viewportCenter);
        return distance < closestDistance ? slideIdx : closestIdx;
      }, 0);
    }

    if (idx !== -1) setActive(idx);
  }

  function scheduleActiveUpdate() {
    if (!activeUpdateRaf) activeUpdateRaf = requestAnimationFrame(updateActiveFromScroll);
  }

  container.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
  window.addEventListener('resize', scheduleActiveUpdate, { passive: true });

  function setActive(idx) {
    if (activeIdx === idx) return;
    activeIdx = idx;
    rings.forEach((r, i) => {
      if (!r) return;
      r.classList.toggle('is-active', i === idx);
    });
    dots.forEach((d, i) => {
      if (!d) return;
      d.classList.toggle('is-active', i === idx);
    });
  }

  /* ── Click-to-navigate via the invisible hit ellipses ────────────────── */
  orrery.querySelectorAll('.orrery-hit').forEach((el) => {
    el.addEventListener('click', () => {
      const idx    = parseInt(el.dataset.section, 10);
      const target = slides[idx];
      if (!target) return;
      container.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    });
  });

  /* ── Animation loop ───────────────────────────────────────────────────── */
  function frame(now) {
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;

    RINGS.forEach((ring, i) => {
      angles[i] += ring.omega * dt;
      const cx = (ring.rx * Math.cos(angles[i])).toFixed(2);
      const cy = (ring.ry * Math.sin(angles[i])).toFixed(2);
      if (dots[i]) {
        dots[i].setAttribute('cx', cx);
        dots[i].setAttribute('cy', cy);
      }
    });

    requestAnimationFrame(frame);
  }

  updateActiveFromScroll();
  requestAnimationFrame(frame);
}

/* ==========================================================================
   Terminal — ScholiLink Firebase boot-sequence typewriter

   Returns { start, stop } so the modal controller can trigger playback.
   cmd  lines: 13 ms per character (human typing cadence)
   other lines: 5 ms per character  (instantaneous system output)
   Blank lines: inserted as spacer divs with no typing delay.
   ========================================================================== */
function initTerminal() {
  const termBody  = document.getElementById('terminal-body');
  const replayBtn = document.getElementById('terminal-replay');
  if (!termBody || !replayBtn) return null;

  let timer     = null;
  let lineIdx   = 0;
  let charIdx   = 0;
  let currentEl = null;

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function reset() {
    stop();
    termBody.innerHTML = '';
    lineIdx   = 0;
    charIdx   = 0;
    currentEl = null;
  }

  function tick() {
    if (lineIdx >= SL_TERMINAL_LINES.length) {
      /* Sequence complete — append persistent blinking cursor */
      const cur = document.createElement('span');
      cur.className = 'terminal-cursor';
      if (currentEl) currentEl.appendChild(cur);
      return;
    }

    const line = SL_TERMINAL_LINES[lineIdx];

    if (charIdx === 0) {
      /* New line: create its container element */
      if (line.t === 'blank') {
        const el = document.createElement('div');
        el.className = 't-line t-line--blank';
        termBody.appendChild(el);
        lineIdx++;
        timer = setTimeout(tick, 55);
        return;
      }
      currentEl = document.createElement('div');
      currentEl.className = `t-line t-line--${line.t}`;
      termBody.appendChild(currentEl);
    }

    if (charIdx < line.s.length) {
      /* Type next character */
      currentEl.textContent = line.s.slice(0, charIdx + 1);
      charIdx++;
      timer = setTimeout(tick, line.t === 'cmd' ? 13 : 5);
    } else {
      /* Line complete — advance to next */
      lineIdx++;
      charIdx = 0;
      termBody.scrollTop = termBody.scrollHeight;
      timer = setTimeout(tick, 75);
    }
  }

  function start() {
    reset();
    timer = setTimeout(tick, 120);
  }

  replayBtn.addEventListener('click', start);
  return { start, stop };
}

/* ==========================================================================
   Scroll reveal — IntersectionObserver engine
   Root is the scroll container so observations fire as sections enter
   the viewport during free scroll, not based on window scroll position.
   ========================================================================== */
function initScrollReveal() {
  const slides = document.querySelectorAll('.slide');
  if (!slides.length) return;

  const container = document.querySelector('.scroll-container');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
        }
      });
    },
    {
      root: container,
      threshold: 0.15,
    }
  );

  slides.forEach((slide) => observer.observe(slide));
}

/* ==========================================================================
   Workshop entrance — orbits converge, the page goes dark, then navigate.
   Plain links underneath: new-tab / modified clicks behave normally, and
   reduced-motion visitors go straight there. Nothing is preloaded here.
   ========================================================================== */
function initWorkshopEntry() {
  const links = document.querySelectorAll('[data-workshop-entry]');
  if (!links.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const href = link.href;
      if (reduce.matches) {
        window.location.href = href;
        return;
      }
      document.body.classList.add('is-entering-workshop');
      setTimeout(() => { window.location.href = href; }, 680);
    });
  });

  /* Coming back with the browser's Back button restores this page from the
     back/forward cache — make sure it isn't still dark. */
  window.addEventListener('pageshow', () => document.body.classList.remove('is-entering-workshop'));
}

/* ==========================================================================
   Boot
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  injectIcons();
  initSmoothScroll();
  const terminal = initTerminal();
  initProjectInspect(terminal);
  initScrollReveal();
  initOrrery();
  initOrbitalCanvas();
  initWorkshopEntry();
});
