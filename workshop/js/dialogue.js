/* ==========================================================================
   dialogue.js — a deterministic line player. No model, no network.

   Lines come from content.js. A `say()` call queues a short script; higher
   priority scripts interrupt lower ones (an answer beats an idle comment).
   Contextual comments play once per visit and respect a cooldown so the
   host never narrates every click. Text is rendered with textContent only,
   and each line is announced once to assistive tech.
   ========================================================================== */
export const PRIORITY = Object.freeze({ COMMENT: 1, REACTION: 2, SCRIPT: 3 });

export class Dialogue {
  constructor({ bubble, announce, isReduced, onPose, onLine, onIdle }) {
    this.bubble = bubble;
    this.announce = announce;
    this.isReduced = isReduced;
    this.onPose = onPose;
    this.onLine = onLine;
    this.onIdle = onIdle;
    this.queue = [];
    this.current = null;
    this.seen = new Set();
    this.commentCooldown = 0;
  }

  get active() { return !!this.current; }
  get priority() { return this.current ? this.current.priority : 0; }

  /* Queue lines. Resolves when they have all been shown (or were interrupted). */
  say(lines, { priority = PRIORITY.SCRIPT } = {}) {
    const list = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? { text: l } : l));
    return new Promise((resolve) => {
      if (this.current && priority > this.current.priority) this.#interrupt();
      else if (this.current && priority < this.current.priority) { resolve(false); return; }
      const job = { lines: list, index: 0, priority, resolve };
      this.queue.push(job);
      if (!this.current) this.#nextJob();
    });
  }

  /* One-time contextual remark. Silently skipped when busy or too soon. */
  comment(key, entry, { force = false } = {}) {
    if (!entry || this.seen.has(key)) return false;
    if (!force && (this.current || this.commentCooldown > 0)) return false;
    this.seen.add(key);
    this.commentCooldown = 9;
    this.say([entry], { priority: PRIORITY.COMMENT });
    return true;
  }

  next() {
    if (!this.current) return;
    const line = this.current.line;
    if (line && line.revealed < line.text.length) {
      line.revealed = line.text.length;      // first press completes the line
      this.bubble.setText(line.text, true);
      line.hold = Math.min(line.hold, 1.2);
      return;
    }
    this.#advance();
  }

  cancel() {
    this.#interrupt();
    this.queue.length = 0;
    this.bubble.hide();
  }

  update(dt) {
    if (this.commentCooldown > 0) this.commentCooldown -= dt;
    const job = this.current;
    if (!job || !job.line) return;
    const line = job.line;
    if (line.revealed < line.text.length) {
      line.revealed = Math.min(line.text.length, line.revealed + dt * 48);
      this.bubble.setText(line.text.slice(0, Math.ceil(line.revealed)), line.revealed >= line.text.length);
      return;
    }
    line.hold -= dt;
    if (line.hold <= 0) this.#advance();
  }

  #nextJob() {
    this.current = this.queue.shift() || null;
    if (!this.current) {
      this.bubble.hide();
      this.onIdle?.();
      return;
    }
    this.#showLine();
  }

  #showLine() {
    const job = this.current;
    const src = job.lines[job.index];
    const reduced = this.isReduced();
    const text = src.text;
    job.line = {
      text,
      revealed: reduced ? text.length : 0,
      hold: Math.min(8, Math.max(2.2, 1.3 + text.length * 0.045)),
    };
    this.bubble.show(reduced ? text : '', reduced);
    this.announce(text);
    if (src.pose) this.onPose?.(src.pose);
    this.onLine?.(src);
  }

  #advance() {
    const job = this.current;
    if (!job) return;
    job.index++;
    if (job.index < job.lines.length) { this.#showLine(); return; }
    job.resolve(true);
    this.current = null;
    this.#nextJob();
  }

  #interrupt() {
    if (this.current) {
      this.current.resolve(false);
      this.current = null;
    }
    for (const job of this.queue) job.resolve(false);
    this.queue.length = 0;
  }
}
