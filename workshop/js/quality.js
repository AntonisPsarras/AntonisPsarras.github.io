/* ==========================================================================
   quality.js — LOW / MEDIUM / HIGH, chosen locally and forgotten on exit.

   Signals are coarse and never leave the page: pointer type, screen size,
   Save-Data, CPU thread count, device memory (where the browser exposes it)
   and the GPU's max texture size. No GPU names are read, nothing is stored.
   ========================================================================== */
export const TIERS = {
  low: {
    name: 'low', label: 'Low', dpr: 1, antialias: false, shadows: false, shadowSize: 0,
    lights: 0, env: false, awardTex: 'texLow', segScale: 0.6, detail: 0, canvasHz: 2, orbitPoints: 160,
  },
  medium: {
    name: 'medium', label: 'Medium', dpr: 1.25, antialias: true, shadows: true, shadowSize: 1024,
    lights: 1, env: true, awardTex: 'tex', segScale: 0.85, detail: 1, canvasHz: 4, orbitPoints: 256,
  },
  high: {
    name: 'high', label: 'High', dpr: 1.5, antialias: true, shadows: true, shadowSize: 2048,
    lights: 2, env: true, awardTex: 'tex', segScale: 1, detail: 2, canvasHz: 6, orbitPoints: 384,
  },
};

const ORDER = ['low', 'medium', 'high'];

export function detectQuality(params) {
  const forced = params.get('quality');
  if (forced && Object.hasOwn(TIERS, forced)) {
    return { tier: forced, auto: false, reason: 'set by URL' };
  }
  const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
  const coarse = mm('(pointer: coarse)');
  const shortSide = Math.min(window.screen?.width || 1280, window.screen?.height || 800);
  const phone = coarse && shortSide < 820;
  const saveData = navigator.connection?.saveData === true;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;

  let tier = 'high';
  let reason = 'desktop';
  if (saveData) { tier = 'low'; reason = 'data saver'; }
  else if (phone) { tier = cores >= 8 && memory >= 6 ? 'medium' : 'low'; reason = 'phone'; }
  else if (coarse) { tier = 'medium'; reason = 'touch device'; }
  else if (cores <= 4 || memory <= 4) { tier = 'medium'; reason = 'modest hardware'; }
  return { tier, auto: true, reason, touch: coarse };
}

/* After the renderer exists, a tiny GPU limit can still force LOW. */
export function refineWithRenderer(choice, renderer) {
  if (!choice.auto) return choice;
  const maxTex = renderer.capabilities.maxTextureSize || 4096;
  if (maxTex < 4096 && choice.tier !== 'low') return { ...choice, tier: 'low', reason: 'GPU limits' };
  return choice;
}

export function lowerTier(name) {
  const i = ORDER.indexOf(name);
  return i > 0 ? ORDER[i - 1] : null;
}

/* Watches real frame times once the visitor is inside. If the median frame is
   slow it steps the pixel ratio down, then drops shadows. One-way, rate-limited. */
export class FrameMonitor {
  constructor({ onStep }) {
    this.onStep = onStep;
    this.samples = [];
    this.cooldown = 3;        // seconds before the first judgement
    this.steps = 0;
    this.enabled = true;
  }

  sample(dt) {
    if (!this.enabled || dt <= 0 || dt > 0.25) return;
    if (this.cooldown > 0) { this.cooldown -= dt; return; }
    this.samples.push(dt);
    if (this.samples.length < 90) return;
    const sorted = this.samples.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.samples.length = 0;
    if (median > 1 / 38) {
      const stepped = this.onStep(this.steps++);
      this.cooldown = 4;
      if (!stepped) this.enabled = false;
    } else if (this.steps === 0) {
      this.cooldown = 6;      // healthy: check again occasionally
    }
  }
}
