/* ==========================================================================
   controls.js — the camera, in two personalities.

   CameraRig  : yaw/pitch camera (never rolls) with eased flights along a
                curved path. Under reduced motion every flight becomes a cut.
   Walker     : Explore mode. WASD/arrows or the touch pad's analog stick, Shift
                to run, a small gait (bounce + footfalls). Looking is the rig's
                job (pointer lock or drag, see app.js). Tap the floor to walk
                there. No jumping, no physics engine — a circle sliding
                against boxes and wall segments.
   ========================================================================== */
import { THREE, ease, damp } from './world/kit.js';

const TAU = Math.PI * 2;
const tmp = new THREE.Vector3();

export function anglesTo(from, to) {
  const d = tmp.copy(to).sub(from);
  const len = d.length() || 1;
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(THREE.MathUtils.clamp(d.y / len, -1, 1)) };
}

function shortest(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';
    this.yaw = 0;
    this.pitch = 0;
    this.offYaw = 0;          // guided "look around" offsets
    this.offPitch = 0;
    this.flight = null;
  }

  get busy() { return !!this.flight; }

  setPose(position, target) {
    this.flight?.resolve(false);
    this.flight = null;
    this.camera.position.copy(position);
    const a = anglesTo(position, target);
    this.yaw = a.yaw;
    this.pitch = a.pitch;
    this.offYaw = this.offPitch = 0;
    this.apply();
  }

  /* Fly along a curve through optional waypoints, easing in and out. */
  flyTo(position, target, { duration, lift = 0.18, via = [], cut = false, onCut } = {}) {
    this.flight?.resolve(false);
    const to = position.clone();
    if (cut) {
      return new Promise((resolve) => {
        onCut?.(true);
        setTimeout(() => {
          this.setPose(to, target);
          onCut?.(false);
          resolve(true);
        }, 160);
      });
    }
    const from = this.camera.position.clone();
    const pts = [from, ...via.map((v) => v.clone()), to];
    const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : null;
    const dist = curve ? curve.getLength() : from.distanceTo(to);
    const a = anglesTo(to, target);
    const dur = duration ?? THREE.MathUtils.clamp(0.9 + dist * 0.2, 1.0, 2.8);
    return new Promise((resolve) => {
      this.flight = {
        t: 0, dur, from, to, curve, lift: dist > 0.6 ? lift : 0,
        yaw0: this.yaw + this.offYaw, pitch0: this.pitch + this.offPitch,
        dYaw: shortest(this.yaw + this.offYaw, a.yaw), pitch1: a.pitch,
        resolve,
      };
      this.offYaw = this.offPitch = 0;
    });
  }

  /* Bounded look-around (guided / inspect). Returns nothing; clamps internally. */
  nudge(dYaw, dPitch, limYaw = 0.45, limPitch = 0.25) {
    this.offYaw = THREE.MathUtils.clamp(this.offYaw + dYaw, -limYaw, limYaw);
    this.offPitch = THREE.MathUtils.clamp(this.offPitch + dPitch, -limPitch, limPitch);
  }

  /* Free look (explore). */
  look(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, -1.45, 1.45);
  }

  /* Fold guided offsets into the base angles (entering explore). */
  bake() {
    this.yaw += this.offYaw;
    this.pitch += this.offPitch;
    this.offYaw = this.offPitch = 0;
  }

  update(dt) {
    const f = this.flight;
    if (f) {
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = ease.inOutCubic(f.t);
      if (f.curve) f.curve.getPointAt(k, this.camera.position);
      else this.camera.position.lerpVectors(f.from, f.to, k);
      this.camera.position.y += Math.sin(Math.PI * k) * f.lift;
      this.yaw = f.yaw0 + f.dYaw * k;
      this.pitch = f.pitch0 + (f.pitch1 - f.pitch0) * k;
      if (f.t >= 1) {
        this.camera.position.copy(f.to);
        this.flight = null;
        f.resolve(true);
      }
    }
    this.apply();
  }

  apply() {
    this.camera.rotation.set(this.pitch + this.offPitch, this.yaw + this.offYaw, 0);
  }
}

/* ── Collision ─────────────────────────────────────────────────────────
   colliders = { boxes: [{minX,maxX,minZ,maxZ}], segments: [{ax,az,bx,bz,on?}],
                 circles: [{x,z,r,on?}] }                                   */
export function resolveCircle(p, r, colliders, iterations = 3) {
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (const b of colliders.boxes) {
      if (b.on === false) continue;
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      let dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        p.x += (dx / d) * (r - d);
        p.z += (dz / d) * (r - d);
      } else {
        // centre inside the box: leave by the shallowest face
        const pen = [p.x - b.minX, b.maxX - p.x, p.z - b.minZ, b.maxZ - p.z];
        const i = pen.indexOf(Math.min(...pen));
        if (i === 0) p.x = b.minX - r; else if (i === 1) p.x = b.maxX + r;
        else if (i === 2) p.z = b.minZ - r; else p.z = b.maxZ + r;
      }
      moved = true;
    }
    for (const s of colliders.segments) {
      if (s.on === false) continue;
      const ex = s.bx - s.ax, ez = s.bz - s.az;
      const len2 = ex * ex + ez * ez || 1e-9;
      const t = Math.max(0, Math.min(1, ((p.x - s.ax) * ex + (p.z - s.az) * ez) / len2));
      const cx = s.ax + ex * t, cz = s.az + ez * t;
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2);
      if (d > 1e-6) {
        p.x += (dx / d) * (r - d);
        p.z += (dz / d) * (r - d);
      } else {
        const l = Math.sqrt(len2);
        p.x += (-ez / l) * r;
        p.z += (ex / l) * r;
      }
      moved = true;
    }
    for (const c of colliders.circles) {
      if (c.on === false) continue;
      const dx = p.x - c.x, dz = p.z - c.z;
      const rr = r + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-10) continue;
      const d = Math.sqrt(d2);
      p.x += (dx / d) * (rr - d);
      p.z += (dz / d) * (rr - d);
      moved = true;
    }
    if (!moved) break;
  }
  return p;
}

export class Walker {
  constructor(rig, colliders, bounds) {
    this.rig = rig;
    this.colliders = colliders;
    this.bounds = bounds;
    this.enabled = false;
    this.keys = new Set();
    this.axis = new THREE.Vector2();   // analog strafe (x) / forward (y) from the touch pad
    this.vel = new THREE.Vector2();
    this.speed = 1.6;
    this.runSpeed = 2.5;
    this.touchSpeed = 2.9;             // full push on the touch stick (it has no Shift)
    this.tapSpeed = 2.1;               // walking to a tapped point
    this.turnSpeed = 1.7;
    this.radius = 0.32;
    this.eye = 1.62;
    this.baseY = rig.camera.position.y;
    this.target = null;
    this.stuck = 0;
    this.bob = 0;                      // gait phase; one footfall per π
    this.bobAmt = 0;
    this.reduced = false;
    this.onStep = null;                // (running) => void, one call per footfall
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) this.baseY = this.rig.camera.position.y;
    if (!on) { this.keys.clear(); this.axis.set(0, 0); this.target = null; this.vel.set(0, 0); this.bobAmt = 0; }
  }

  key(code, down) {
    const map = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr', ShiftLeft: 'run', ShiftRight: 'run' };
    const k = map[code];
    if (!k) return false;
    if (down) { this.keys.add(k); if (k !== 'run') this.target = null; } else this.keys.delete(k);
    return true;
  }

  /* Touch pad: x = strafe right, y = forward, each in [-1, 1]. */
  setAxis(x, y) {
    this.axis.set(x, y);
    if (x || y) this.target = null;
  }

  walkTo(point) {
    this.target = new THREE.Vector2(point.x, point.z);
    this.stuck = 0;
  }

  get moving() { return this.vel.lengthSq() > 0.0004 || !!this.target; }

  update(dt) {
    if (!this.enabled) return;
    const cam = this.rig.camera;
    const k = this.keys;
    if (k.has('tl')) this.rig.yaw += this.turnSpeed * dt;
    if (k.has('tr')) this.rig.yaw -= this.turnSpeed * dt;

    const yaw = this.rig.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let ix = 0, iz = 0;
    if (k.has('f')) { ix += fx; iz += fz; }
    if (k.has('b')) { ix -= fx; iz -= fz; }
    if (k.has('r')) { ix += rx; iz += rz; }
    if (k.has('l')) { ix -= rx; iz -= rz; }
    if (this.axis.x || this.axis.y) {
      ix += rx * this.axis.x + fx * this.axis.y;
      iz += rz * this.axis.x + fz * this.axis.y;
    }

    if (!ix && !iz && this.target) {
      const dx = this.target.x - cam.position.x, dz = this.target.y - cam.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.12) this.target = null;
      else { const s = Math.min(1, d / 0.6); ix = (dx / d) * s; iz = (dz / d) * s; }
    }
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }

    const run = k.has('run') && il > 0.5;
    const analog = !!(this.axis.x || this.axis.y);
    const speed = run ? this.runSpeed : analog ? this.touchSpeed : this.target ? this.tapSpeed : this.speed;
    this.vel.x = damp(this.vel.x, ix * speed, 9, dt);
    this.vel.y = damp(this.vel.y, iz * speed, 9, dt);

    const prevX = cam.position.x, prevZ = cam.position.z;
    const p = { x: prevX + this.vel.x * dt, z: prevZ + this.vel.y * dt };
    resolveCircle(p, this.radius, this.colliders);
    const b = this.bounds;
    if (p.x < b.minX || p.x > b.maxX || p.z < b.minZ || p.z > b.maxZ) { p.x = prevX; p.z = prevZ; }
    const travelled = Math.hypot(p.x - prevX, p.z - prevZ);
    cam.position.x = p.x;
    cam.position.z = p.z;

    // Gait: a small vertical bounce and one footfall per half cycle. Gated on
    // real travel, so pushing against a wall doesn't bob in place.
    const planar = dt > 0 ? travelled / dt : 0;
    const walking = planar > 0.25;
    this.bobAmt = damp(this.bobAmt, walking && !this.reduced ? 1 : 0, 8, dt);
    if (walking) {
      const before = Math.floor(this.bob / Math.PI);
      this.bob += planar * dt * 3.8;
      if (Math.floor(this.bob / Math.PI) !== before && !this.reduced) this.onStep?.(run);
    }
    this.baseY = damp(this.baseY, this.eye, 6, dt);
    cam.position.y = this.baseY + (Math.abs(Math.sin(this.bob)) - 0.5) * 0.026 * this.bobAmt;

    if (this.target) {
      const progressed = travelled;
      this.stuck = progressed < 0.002 ? this.stuck + dt : 0;
      if (this.stuck > 0.35) this.target = null;   // blocked: stop rather than grind
    }
  }
}
