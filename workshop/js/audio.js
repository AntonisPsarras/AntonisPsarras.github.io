/* ==========================================================================
   audio.js — every sound in the workshop is synthesized with WebAudio.
   No files, no streaming, no autoplay. Muted until the visitor turns it on;
   the AudioContext is only created inside that click.
   ========================================================================== */
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.enabled = false;
    this.failed = false;
  }

  /* Must be called from a user gesture. Returns the resulting state. */
  async setEnabled(on) {
    if (on && !this.ctx && !this.failed) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        this.noise = this.#noiseBuffer();
      } catch (err) {
        console.warn('[workshop] audio unavailable:', err?.message || err);
        this.failed = true;
        this.ctx = null;
      }
    }
    if (!this.ctx) { this.enabled = false; return false; }
    try {
      if (on) await this.ctx.resume(); else await this.ctx.suspend();
    } catch { /* ignore */ }
    this.enabled = on;
    return on;
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + 0.01;
      switch (name) {
        case 'chime':  this.#tone(659.25, t, 1.3, 0.22); this.#tone(523.25, t + 0.42, 1.6, 0.22); break;
        case 'lock':   this.#click(t, 1800, 0.18, 0.02); this.#tone(110, t + 0.01, 0.12, 0.2, 'triangle'); break;
        case 'door':   this.#swell(t, 0.9, 380, 0.16); break;
        case 'switch': this.#click(t, 3200, 0.22, 0.008); this.#click(t + 0.035, 2400, 0.12, 0.006); break;
        case 'magnet': this.#click(t, 4200, 0.25, 0.01); this.#tone(3150, t, 0.09, 0.05); break;
        case 'gate':   this.#sweep(t, 520, 780, 0.09, 0.07); break;
        case 'tick':   this.#tone(2400, t, 0.03, 0.035); break;
        case 'slide':  this.#swell(t, 0.35, 900, 0.07); break;
        default: break;
      }
    } catch { /* audio is decoration; never let it break anything */ }
  }

  dispose() {
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.enabled = false;
  }

  #noiseBuffer() {
    const len = Math.floor(this.ctx.sampleRate * 1.0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 1234567;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (s / 0x7fffffff) * 2 - 1;
    }
    return buf;
  }

  /* A bell-ish tone: fundamental plus a quiet inharmonic partial. */
  #tone(freq, t, dur, gain, type = 'sine') {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
    if (type === 'sine' && freq < 1500) {
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(gain * 0.18, t + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.45);
      g2.connect(this.master);
      const o2 = c.createOscillator();
      o2.frequency.setValueAtTime(freq * 2.76, t);
      o2.connect(g2);
      o2.start(t);
      o2.stop(t + dur);
    }
  }

  #click(t, freq, gain, dur) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.4;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5, dur + 0.03);
  }

  #swell(t, dur, cutoff, gain) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff * 0.4, t);
    f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  #sweep(t, f0, f1, dur, gain) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}
