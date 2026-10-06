/* ==========================================================================
   avatar.js — a stylized stand-in for Antonis.

   Deliberately not a likeness: a neutral, featureless "clay" head, a charcoal
   hoodie with white drawstrings and a tiny orbit ring, dark trousers, white
   soles. Every limb is one vertex-coloured mesh (≈11 draw calls total), and
   motion is procedural: target poses per joint, blended with exponential
   damping. No animation library, no skinning.
   ========================================================================== */
import { THREE, damp } from './world/kit.js';

const C = {
  hoodie: 0x2a2b2e, trousers: 0x1a1a1c, clay: 0x8e8981, sole: 0xe6e3dc, white: 0xeeede8, shoe: 0x1c1c1e,
};

export function buildAvatar(kit, world) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, name: 'avatar' });
  const S = (n) => kit.seg(n);

  const root = new THREE.Group();
  root.name = 'Antonis';
  root.userData.dynamic = true;

  const joint = (parent, x, y, z, name) => {
    const j = new THREE.Group();
    j.name = name;
    j.position.set(x, y, z);
    parent.add(j);
    return j;
  };
  const body = (parent, pieces) => {
    const m = new THREE.Mesh(bake(pieces), mat);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const capsule = (r, len, color, y, sx = 1, sz = 1) => ({ geo: new THREE.CapsuleGeometry(r, len, S(4), S(12)), color, pos: [0, y, 0], scale: [sx, 1, sz] });

  const J = {};
  J.hips = joint(root, 0, 0.94, 0, 'hips');
  body(J.hips, [{ geo: new THREE.CapsuleGeometry(0.1, 0.12, S(3), S(12)), color: C.trousers, pos: [0, -0.02, 0], rot: [0, 0, Math.PI / 2], scale: [0.85, 1, 0.95] }]);
  J.spine = joint(J.hips, 0, 0.07, 0, 'spine');
  J.chest = joint(J.spine, 0, 0.2, 0, 'chest');
  body(J.chest, [
    capsule(0.152, 0.22, C.hoodie, -0.07, 1, 0.66),
    { geo: new THREE.TorusGeometry(0.08, 0.03, S(6), S(16), Math.PI * 1.25), color: C.hoodie, pos: [0, 0.19, -0.035], rot: [-Math.PI / 2 - 0.35, 0, -Math.PI * 0.125 + Math.PI], scale: [1, 1, 1] },
    { geo: new THREE.CylinderGeometry(0.0045, 0.0045, 0.09, 6), color: C.white, pos: [0.032, 0.115, 0.098], rot: [0.12, 0, 0] },
    { geo: new THREE.CylinderGeometry(0.0045, 0.0045, 0.08, 6), color: C.white, pos: [-0.032, 0.12, 0.098], rot: [0.12, 0, 0] },
    { geo: new THREE.TorusGeometry(0.018, 0.0022, 4, S(20)), color: C.white, pos: [0.065, 0.065, 0.1], rot: [0.15, 0, 0] },
    { geo: new THREE.TorusGeometry(0.009, 0.0016, 4, S(14)), color: C.white, pos: [0.065, 0.065, 0.101], rot: [0.15, 0.9, 0.4] },
    { geo: new THREE.CylinderGeometry(0.04, 0.044, 0.08, S(12)), color: C.clay, pos: [0, 0.25, 0] },   // neck rides with the chest
  ]);
  J.neck = joint(J.chest, 0, 0.22, 0, 'neck');
  J.head = joint(J.neck, 0, 0.07, 0, 'head');
  body(J.head, [{ geo: new THREE.SphereGeometry(0.105, S(24), S(16)), color: C.clay, pos: [0, 0.1, 0.005], scale: [0.9, 1.08, 0.98] }]);

  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint(J.chest, sx * 0.19, 0.16, 0, `shoulder${side}`);
    body(sh, [
      { geo: new THREE.SphereGeometry(0.058, S(12), S(8)), color: C.hoodie, pos: [0, 0, 0] },
      capsule(0.047, 0.2, C.hoodie, -0.14),
    ]);
    const el = joint(sh, 0, -0.28, 0, `elbow${side}`);
    body(el, [
      capsule(0.042, 0.18, C.hoodie, -0.11),
      { geo: new THREE.CylinderGeometry(0.044, 0.044, 0.025, S(12)), color: C.hoodie, pos: [0, -0.215, 0] },
      { geo: new THREE.SphereGeometry(0.042, S(12), S(8)), color: C.clay, pos: [0, -0.27, 0.005], scale: [0.72, 1.12, 0.5] },
    ]);
    J[`shoulder${side}`] = sh;
    J[`elbow${side}`] = el;
    const hip = joint(J.hips, sx * 0.095, -0.05, 0, `hip${side}`);
    body(hip, [capsule(0.064, 0.29, C.trousers, -0.21)]);
    const knee = joint(hip, 0, -0.43, 0, `knee${side}`);
    body(knee, [
      capsule(0.053, 0.3, C.trousers, -0.2),
      { geo: new THREE.BoxGeometry(0.094, 0.06, 0.24), color: C.shoe, pos: [0, -0.43, 0.05] },     // feet ride with the shins
      { geo: new THREE.BoxGeometry(0.1, 0.022, 0.255), color: C.sole, pos: [0, -0.468, 0.05] },
    ]);
    J[`hip${side}`] = hip;
    J[`knee${side}`] = knee;
  }

  const shadow = kit.blob(0.7, 0.7, 0, 0, 0.004);
  root.add(shadow);

  /* ── Pose system ────────────────────────────────────────────────────── */
  const names = Object.keys(J);
  const target = Object.fromEntries(names.map((n) => [n, new THREE.Euler()]));
  const tq = new THREE.Quaternion(), tmpE = new THREE.Euler();
  const st = {
    pos: new THREE.Vector3(), yaw: 0, yawTarget: 0,
    path: null, speed: 1.15, phase: 0, walkAmt: 0,
    gesture: null, gT: 0, gW: 0,
    look: null, pointAt: null,
    hipsBase: 0.94,
  };
  const collider = { x: 0, z: 0, r: 0.24 };
  world.colliders.circles.push(collider);

  function setTargets(t, reduced) {
    for (const n of names) target[n].set(0, 0, 0);
    const breathe = reduced ? 0 : Math.sin(t * 1.5);
    // idle
    target.spine.x = 0.02 * breathe;
    target.chest.x = -0.015 * breathe;
    target.shoulderL.z = 0.09; target.shoulderR.z = -0.09;
    target.elbowL.x = -0.14; target.elbowR.x = -0.14;
    target.hipL.z = 0.02; target.hipR.z = -0.02;
    if (!reduced) {
      target.hips.z = 0.012 * Math.sin(t * 0.37);
      target.head.z = 0.02 * Math.sin(t * 0.29 + 1);
    }
    // walk
    const w = st.walkAmt;
    if (w > 0.001) {
      const s = Math.sin(st.phase), c = Math.cos(st.phase);
      target.hipL.x = -0.42 * s * w; target.hipR.x = 0.42 * s * w;
      target.kneeL.x = (0.12 + 0.5 * Math.max(0, -Math.sin(st.phase - 0.9))) * w;
      target.kneeR.x = (0.12 + 0.5 * Math.max(0, Math.sin(st.phase - 0.9))) * w;
      target.shoulderL.x = 0.32 * s * w; target.shoulderR.x = -0.32 * s * w;
      target.elbowL.x -= 0.2 * w; target.elbowR.x -= 0.2 * w;
      target.hips.y = 0.05 * s * w;
      target.chest.y = -0.08 * s * w;
      J.hips.position.y = st.hipsBase + 0.012 * Math.abs(c) * w;
    } else {
      J.hips.position.y = st.hipsBase;
    }
    // gesture overlay (arms / head)
    const g = st.gesture, gw = st.gW;
    if (g && gw > 0.001) {
      const lerpTo = (n, x, y, z) => { const e = target[n]; e.set(e.x + (x - e.x) * gw, e.y + (y - e.y) * gw, e.z + (z - e.z) * gw); };
      const wave = reduced ? 0 : Math.sin(st.gT * 9);
      if (g === 'wave') { lerpTo('shoulderR', -0.15, 0, -2.55); lerpTo('elbowR', 0, 0, -0.35 + 0.38 * wave); }
      else if (g === 'gesture') { lerpTo('shoulderR', -0.85, 0.2, -0.5); lerpTo('elbowR', -0.4, 0, 0); }
      else if (g === 'shrug') { lerpTo('shoulderL', -0.25, 0, 0.32); lerpTo('shoulderR', -0.25, 0, -0.32); lerpTo('elbowL', -1.35, 0, 0); lerpTo('elbowR', -1.35, 0, 0); lerpTo('head', 0, 0, 0.12); }
      else if (g === 'reach') { lerpTo('shoulderR', -1.25, 0, -0.08); lerpTo('elbowR', -0.15, 0, 0); }
      else if (g === 'nod') { lerpTo('head', 0.18 * Math.max(0, Math.sin(st.gT * 6)), 0, 0); }
    }
  }

  const headW = new THREE.Vector3(), dir = new THREE.Vector3(), inv = new THREE.Quaternion();
  const down = new THREE.Vector3(0, -1, 0), pq = new THREE.Quaternion();

  function update(dt, t, reduced) {
    // locomotion
    if (st.path && st.path.length) {
      const p = st.path[0];
      const dx = p.x - st.pos.x, dz = p.z - st.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) {
        st.path.shift();
        if (!st.path.length) { st.path = null; st.onArrive?.(); st.onArrive = null; }
      } else {
        const step = Math.min(d, st.speed * dt * Math.min(1, 0.35 + st.walkAmt));
        st.pos.x += (dx / d) * step;
        st.pos.z += (dz / d) * step;
        st.yawTarget = Math.atan2(dx, dz);
        st.phase += step * (Math.PI * 2 / 1.25);
      }
    }
    st.walkAmt = damp(st.walkAmt, st.path ? 1 : 0, 7, dt);
    let dy = ((st.yawTarget - st.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    st.yaw += dy * (1 - Math.exp(-6 * dt));
    root.position.set(st.pos.x, 0, st.pos.z);
    root.rotation.y = st.yaw;
    collider.x = st.pos.x;
    collider.z = st.pos.z;

    // gesture timing
    if (st.gesture) {
      st.gT += dt;
      const inOut = st.gT < st.gDur ? 1 : 0;
      st.gW = damp(st.gW, inOut, 8, dt);
      if (st.gT > st.gDur && st.gW < 0.02) st.gesture = null;
    }

    setTargets(t, reduced);

    // head look-at (relative to chest)
    if (st.look) {
      root.updateMatrixWorld();
      J.neck.getWorldQuaternion(inv).invert();
      J.head.getWorldPosition(headW);
      dir.copy(st.look).sub(headW).applyQuaternion(inv);
      const yaw = THREE.MathUtils.clamp(Math.atan2(dir.x, dir.z), -1.0, 1.0);
      const pitch = THREE.MathUtils.clamp(-Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -0.45, 0.4);
      target.head.y += yaw;
      target.head.x += pitch;
    }

    const k = 1 - Math.exp(-10 * dt);
    for (const n of names) {
      tq.setFromEuler(tmpE.copy(target[n]));
      J[n].quaternion.slerp(tq, k);
    }
    // pointing overrides the right arm with an aim quaternion
    if (st.pointAt && st.gesture === 'point') {
      J.chest.updateWorldMatrix(true, false);
      J.shoulderR.getWorldPosition(headW);
      J.chest.getWorldQuaternion(inv).invert();
      dir.copy(st.pointAt).sub(headW).normalize().applyQuaternion(inv);
      pq.setFromUnitVectors(down, dir);
      J.shoulderR.quaternion.slerp(pq, k * st.gW);
      J.elbowR.quaternion.slerp(tq.identity(), k * st.gW);
    }
  }

  const api = {
    root,
    get position() { return st.pos; },
    get walking() { return !!st.path; },
    teleport(x, z, yaw = st.yaw) {
      st.pos.set(x, 0, z);
      st.yaw = st.yawTarget = yaw;
      st.path = null;
      root.position.set(x, 0, z);
      root.rotation.y = yaw;
    },
    walkTo(points, speed = 1.15) {
      return new Promise((resolve) => {
        st.onArrive?.();
        st.path = points.map((p) => new THREE.Vector3(p[0], 0, p[1]));
        st.speed = speed;
        st.onArrive = resolve;
      });
    },
    face(point) { st.yawTarget = Math.atan2(point.x - st.pos.x, point.z - st.pos.z); },
    lookAt(point) { st.look = point ? point.clone() : null; },
    gesture(name, duration = 2) {
      if (name === 'point') return;
      st.gesture = name; st.gT = 0; st.gDur = duration;
    },
    point(at, duration = 2.4) {
      st.pointAt = at.clone();
      st.gesture = 'point'; st.gT = 0; st.gDur = duration;
    },
    headWorld(out) { root.updateMatrixWorld(); return J.head.localToWorld(out.set(0, 0.12, 0)); },
    update,
    get visible() { return root.visible; },
    set visible(v) { root.visible = v; },
  };

  /* The avatar is itself a hotspot: click him to ask a question. */
  const hs = world.addHotspot({
    id: 'antonis', zone: 'overview', kind: 'host',
    anchor: [0, 1.95, 0],
    hit: [[0.55, 1.75, 0.45], [0, 0.88, 0]],
    view: [[0, 1.6, 1.4], [0, 1.4, 0]],
  });
  root.add(hs.proxy);
  hs.proxy.position.set(0, 0.88, 0);
  hs.follow = () => { api.headWorld(hs.anchor); hs.anchor.y += 0.12; };

  return api;
}

/* Merge transformed primitives into one geometry with a baked colour attribute. */
function bake(pieces) {
  const parts = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color();
  for (const pc of pieces) {
    let g = pc.geo.index ? pc.geo.toNonIndexed() : pc.geo.clone();
    pc.geo.dispose();
    p.set(...(pc.pos || [0, 0, 0]));
    e.set(...(pc.rot || [0, 0, 0]));
    s.set(...(pc.scale || [1, 1, 1]));
    g.applyMatrix4(m4.compose(p, q.setFromEuler(e), s));
    col.setHex(pc.color);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    parts.push(g);
  }
  let count = 0;
  for (const g of parts) count += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3]]) {
    const arr = new Float32Array(count * size);
    let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  parts.forEach((g) => g.dispose());
  out.computeBoundingSphere();
  return out;
}
