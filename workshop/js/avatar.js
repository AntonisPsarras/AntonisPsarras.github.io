/* ==========================================================================
   avatar.js — Antonis, as a low-poly figure.

   A person, not a mannequin: tapered limbs, a lofted torso with a hoodie
   (hood bunched at the back, ribbed cuffs, a front pocket), hands with
   fingers, sneakers, and a sculpted head with a face and black, medium-length
   hair. It is still a stylised stand-in, not a portrait: skin tone, hair and
   clothes are the constants in C below.

   Every body part is one vertex-coloured mesh (hair has its own, glossier
   material), about 13 draw calls in all, and motion is procedural: target
   poses per joint, blended with exponential damping. No animation library,
   no skinning.
   ========================================================================== */
import { THREE, damp, mulberry32 } from './world/kit.js';

const TAU = Math.PI * 2;

const C = {
  hoodie: 0x2a2b2e, hoodieLight: 0x333437, hoodieDark: 0x202124, cuff: 0x303134,
  trousers: 0x1b1b1e, shoe: 0x24262a, sole: 0xe8e6e1, lace: 0xeeede8, white: 0xeeede8,
  skin: 0xcf9a74, skinShade: 0xbb8764, lips: 0xb06a5a, mouth: 0x5e3029,
  eyeWhite: 0xf0ece5, iris: 0x3a2619, lash: 0x1a1210,
  hair: [0x0b0b0d, 0x101013, 0x151519, 0x0e0e11],
};

/* A head's half-sizes (m): narrower than it is tall, with room for hair on top. */
const HEAD = { x: 0.08, y: 0.112, z: 0.093 };

export function buildAvatar(kit, world) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, name: 'avatar' });
  const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05, name: 'avatarHair' });
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
  const body = (parent, pieces, material = mat) => {
    const m = new THREE.Mesh(bake(pieces), material);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  /* Piece helpers: each returns { geo, color, pos, rot, scale } for bake(). */
  const sph = (r, color, pos, scale = [1, 1, 1], rot, seg = 12) => ({ geo: new THREE.SphereGeometry(r, S(seg), S(Math.max(6, seg * 0.7))), color, pos, scale, rot });
  const cyl = (rTop, rBot, h, color, pos, scale = [1, 1, 1], rot, seg = 14) => ({ geo: new THREE.CylinderGeometry(rTop, rBot, h, S(seg), 1), color, pos, scale, rot });
  const box = (w, h, d, color, pos, rot) => ({ geo: new THREE.BoxGeometry(w, h, d), color, pos, rot });
  const tor = (r, tube, color, pos, rot, scale, arc = TAU, seg = 20) => ({ geo: new THREE.TorusGeometry(r, tube, 6, S(seg), arc), color, pos, rot, scale });

  const J = {};
  J.hips = joint(root, 0, 0.94, 0, 'hips');
  body(J.hips, [
    sph(0.105, C.trousers, [0, -0.025, 0], [1.38, 0.82, 0.95], undefined, 14),
    cyl(0.152, 0.152, 0.03, 0x161618, [0, 0.06, 0], [1, 1, 0.64], undefined, 20),     // belt, under the hoodie hem
  ]);
  J.spine = joint(J.hips, 0, 0.07, 0, 'spine');
  J.chest = joint(J.spine, 0, 0.2, 0, 'chest');

  /* Torso: a lathe through a hoodie-shaped profile, flattened front to back. */
  const torsoProfile = [
    [0.150, -0.335], [0.158, -0.302], [0.155, -0.25], [0.150, -0.15], [0.158, -0.05],
    [0.170, 0.05], [0.178, 0.12], [0.176, 0.15], [0.138, 0.19], [0.1, 0.212], [0.075, 0.228],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  body(J.chest, [
    { geo: new THREE.LatheGeometry(torsoProfile, S(28)), color: C.hoodie, pos: [0, 0, 0], scale: [1, 1, 0.64] },
    tor(0.152, 0.012, C.cuff, [0, -0.318, 0], [Math.PI / 2, 0, 0], [1, 0.64, 1], TAU, 28),      // ribbed hem
    sph(0.088, C.hoodieLight, [0, 0.185, -0.07], [1.2, 0.78, 0.82], undefined, 14),              // the hood, bunched behind the neck
    tor(0.076, 0.021, C.hoodie, [0, 0.215, 0.004], [Math.PI / 2 - 0.12, 0, 0], [1, 0.86, 1], TAU, 22),   // hood opening / collar
    box(0.2, 0.1, 0.018, C.hoodieDark, [0, -0.195, 0.097], [-0.06, 0, 0]),                       // kangaroo pocket
    box(0.006, 0.098, 0.02, C.hoodie, [0, -0.195, 0.098], [-0.06, 0, 0]),
    cyl(0.0045, 0.0045, 0.09, C.white, [0.032, 0.115, 0.1], undefined, [0.12, 0, 0], 6),         // drawstrings
    cyl(0.0045, 0.0045, 0.08, C.white, [-0.032, 0.12, 0.1], undefined, [0.12, 0, 0], 6),
    sph(0.0065, C.white, [0.033, 0.066, 0.104], [1, 1.6, 1], undefined, 6),                      // their aglets
    sph(0.0065, C.white, [-0.033, 0.075, 0.104], [1, 1.6, 1], undefined, 6),
    tor(0.018, 0.0022, C.white, [0.07, 0.065, 0.106], [0.15, 0, 0], undefined, TAU, 20),         // the tiny orbit ring
    tor(0.009, 0.0016, C.white, [0.07, 0.065, 0.107], [0.15, 0.9, 0.4], undefined, TAU, 14),
    cyl(0.04, 0.047, 0.1, C.skin, [0, 0.255, 0.004], [1, 1, 0.94], undefined, 16),               // neck rides with the chest
  ]);
  J.neck = joint(J.chest, 0, 0.22, 0, 'neck');
  J.head = joint(J.neck, 0, 0.07, 0, 'head');
  body(J.head, buildFace(S));
  body(J.head, buildHair(S), hairMat);

  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint(J.chest, sx * 0.182, 0.152, 0, `shoulder${side}`);
    body(sh, [
      sph(0.053, C.hoodie, [0, -0.012, 0], [1, 0.9, 0.96], undefined, 14),                       // shoulder cap
      cyl(0.05, 0.043, 0.285, C.hoodie, [0, -0.14, 0], [1, 1, 0.95]),                            // sleeve, a little loose
    ]);
    const el = joint(sh, 0, -0.28, 0, `elbow${side}`);
    const inward = -sx;
    body(el, [
      sph(0.046, C.hoodie, [0, 0, 0], [1, 1, 0.96], undefined, 12),                              // elbow
      cyl(0.045, 0.038, 0.23, C.hoodie, [0, -0.118, 0], [1, 1, 0.95]),                           // forearm sleeve
      cyl(0.035, 0.035, 0.034, C.cuff, [0, -0.238, 0], [1, 1, 0.94], undefined, 12),             // ribbed cuff
      sph(0.04, C.skin, [0, -0.292, 0.002], [0.95, 1.2, 0.42], undefined, 12),                   // palm
      ...[[-0.0135, 0.052], [-0.0045, 0.058], [0.0045, 0.055], [0.0135, 0.046]].map(([fx, len], i) => (
        { geo: new THREE.CapsuleGeometry(0.0082, len, S(3), S(8)), color: C.skin, pos: [fx, -0.318 - len / 2 + 0.01, 0.006 + i * 0.001], rot: [0.28 + i * 0.03, 0, 0] }
      )),
      { geo: new THREE.CapsuleGeometry(0.0095, 0.036, S(3), S(8)), color: C.skin, pos: [inward * 0.032, -0.285, 0.014], rot: [0.5, 0, inward * 0.45] },   // thumb, forward and inward
    ]);
    J[`shoulder${side}`] = sh;
    J[`elbow${side}`] = el;
    const hip = joint(J.hips, sx * 0.095, -0.05, 0, `hip${side}`);
    body(hip, [
      sph(0.072, C.trousers, [0, -0.005, 0], undefined, undefined, 12),
      cyl(0.072, 0.056, 0.43, C.trousers, [0, -0.215, 0], [1, 1, 0.97]),                         // thigh
    ]);
    const knee = joint(hip, 0, -0.43, 0, `knee${side}`);
    body(knee, [
      sph(0.057, C.trousers, [0, 0, 0], undefined, undefined, 12),
      cyl(0.056, 0.044, 0.39, C.trousers, [0, -0.195, 0], [1, 1, 0.97]),                         // shin
      cyl(0.049, 0.05, 0.034, C.trousers, [0, -0.392, 0.002], undefined, undefined, 12),         // the trouser break
      // sneaker: heel block, rounded toe box, tongue, laces, a collar, a white sole with a toe cap
      box(0.09, 0.066, 0.11, C.shoe, [0, -0.41, -0.012]),
      sph(0.047, C.shoe, [0, -0.428, 0.112], [1.0, 0.68, 1.5], undefined, 14),
      box(0.05, 0.05, 0.012, 0x34363b, [0, -0.397, 0.052], [-0.5, 0, 0]),
      ...[0.038, 0.06, 0.082].map((z) => box(0.056, 0.004, 0.009, C.lace, [0, -0.41 - (z - 0.05) * 0.4, z + 0.006], [-0.3, 0, 0])),
      tor(0.04, 0.012, 0x1c1d20, [0, -0.396, -0.004], [Math.PI / 2 - 0.1, 0, 0], [1, 1.05, 1], TAU, 16),
      box(0.102, 0.024, 0.205, C.sole, [0, -0.456, 0.012 + 0.0]),
      sph(0.051, C.sole, [0, -0.456, 0.115], [1.0, 0.25, 1.55], undefined, 14),
      sph(0.047, C.sole, [0, -0.456, -0.092], [1.0, 0.25, 0.8], undefined, 10),
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

/* ── The head ─────────────────────────────────────────────────────────── */

/* Pull a sphere into a head: a jaw that narrows to a chin, a face that slopes
   back below the nose, a slightly fuller forehead. Positions are in the head's
   own frame (before it is lifted onto the neck). */
function sculptHead(geo) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = THREE.MathUtils.clamp(-y / HEAD.y, 0, 1);                 // 0 at the eye line → 1 at the chin
    x *= 1 - 0.34 * Math.pow(t, 1.3);
    if (z > 0) z *= 1 - 0.1 * t;
    if (z > 0.02 && y < -0.075) z += 0.012 * Math.min(1, (-y - 0.075) / 0.03) * Math.max(0, 1 - Math.abs(x) / 0.05);   // the chin
    if (y > 0.045) z *= 1 + 0.02 * ((y - 0.045) / 0.067);
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
}

/* Where the face's surface is, front to back, at (x, y): features sit on it. */
function faceZ(x, y) {
  const t = THREE.MathUtils.clamp(-y / HEAD.y, 0, 1);
  const xx = x / (1 - 0.34 * Math.pow(t, 1.3));
  let z = HEAD.z * Math.sqrt(Math.max(0, 1 - (xx / HEAD.x) ** 2 - (y / HEAD.y) ** 2));
  z *= 1 - 0.1 * t;
  if (y > 0.045) z *= 1 + 0.02 * ((y - 0.045) / 0.067);
  return z;
}

function buildFace(S) {
  const HC = [0, 0.1, 0.005];                      // the head's centre, in the head joint's space
  const pieces = [];
  const at = (x, y, z) => [x + HC[0], y + HC[1], z + HC[2]];
  const part = (r, color, x, y, dz, scale, rot, seg = 10) => ({
    geo: new THREE.SphereGeometry(r, S(seg), S(Math.max(5, seg * 0.7))), color, pos: at(x, y, faceZ(x, y) + dz), scale, rot,
  });

  const skull = new THREE.SphereGeometry(1, S(34), S(24));
  skull.scale(HEAD.x, HEAD.y, HEAD.z);
  sculptHead(skull);
  pieces.push({ geo: skull, color: C.skin, pos: HC });

  for (const sx of [-1, 1]) {
    const x = sx * 0.034, y = 0.014;
    pieces.push(part(0.0105, C.eyeWhite, x, y, -0.002, [1.15, 0.7, 0.55]));                    // sclera
    pieces.push(part(0.0062, C.iris, x - sx * 0.0004, y, 0.003, [1, 1, 0.35], undefined, 8));  // iris
    pieces.push(part(0.003, 0x0a0705, x - sx * 0.0004, y, 0.0045, [1, 1, 0.3], undefined, 6)); // pupil
    pieces.push(part(0.0013, 0xffffff, x + 0.0022, y + 0.0022, 0.0053, [1, 1, 0.5], undefined, 5));  // catch-light
    pieces.push(part(0.0125, C.lash, x, y + 0.0088, 0.0004, [1.1, 0.2, 0.55]));                // upper lid line
    pieces.push(part(0.011, C.skinShade, x, y - 0.0088, 0.0, [1.1, 0.15, 0.5]));               // lower lid
    pieces.push(part(0.011, C.hair[0], x, 0.04, 0.001, [2.6, 0.36, 0.55], [0, 0, sx * 0.14])); // eyebrow
    pieces.push({ geo: new THREE.SphereGeometry(0.019, S(10), S(8)), color: C.skin, pos: at(sx * (HEAD.x - 0.002), -0.006, -0.004), scale: [0.36, 1, 0.7], rot: [0, 0, sx * 0.08] });   // ear
  }
  // nose: bridge, tip and wings, with dark nostrils
  pieces.push(part(0.012, C.skin, 0, 0.002, 0.004, [0.55, 1.6, 0.8]));
  pieces.push(part(0.0125, C.skin, 0, -0.026, 0.012, [1, 0.85, 0.95], undefined, 12));
  for (const sx of [-1, 1]) {
    pieces.push(part(0.0085, C.skin, sx * 0.0115, -0.029, 0.004, [1, 0.9, 0.9]));
    pieces.push(part(0.0038, C.mouth, sx * 0.0072, -0.0325, 0.0105, [1, 0.7, 0.6], undefined, 6));
  }
  // mouth
  pieces.push(part(0.0105, C.lips, 0, -0.0545, 0.001, [2.1, 0.3, 0.6]));
  pieces.push(part(0.0105, C.lips, 0, -0.0618, 0.0005, [1.8, 0.34, 0.62]));
  for (const sx of [-1, 1]) pieces.push(part(0.0068, C.mouth, sx * 0.0078, -0.0572, 0.0013, [1.9, 0.1, 0.32], [0, 0, sx * 0.3], 8));   // a slight, easy smile
  return pieces;
}

/* Black, medium-length, ear-covering, with a side-swept fringe: a tilted skull
   cap (hairline above the brows, down over the ears and the nape), then layers
   of flattened locks that flow downhill over it. Deterministic. */
function buildHair(S) {
  const rand = mulberry32(21);
  const HC = new THREE.Vector3(0, 0.1, 0.005);
  const cap = { x: HEAD.x * 1.08, y: HEAD.y * 1.13, z: HEAD.z * 1.09 };
  const pieces = [];

  const capGeo = new THREE.SphereGeometry(1, S(32), S(20), 0, TAU, 0, 1.95);
  capGeo.rotateX(-0.9);                            // tilt back: the hairline rises in front, drops at the nape
  capGeo.scale(cap.x, cap.y, cap.z);
  pieces.push({ geo: capGeo, color: C.hair[0], pos: HC.toArray() });

  const up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);
  const P = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3(), d = new THREE.Vector3(), u = new THREE.Vector3();
  const lock = (elevDeg, azDeg, len, baseR, o = {}) => {
    const e = (elevDeg * Math.PI) / 180, a = (azDeg * Math.PI) / 180;
    u.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
    P.set(u.x * cap.x, u.y * cap.y, u.z * cap.z).multiplyScalar(0.97);
    n.set(u.x / cap.x, u.y / cap.y, u.z / cap.z).normalize();
    t.copy(down).addScaledVector(n, -down.dot(n));
    if (t.lengthSq() < 1e-4) t.set(0, 0, -1);
    t.normalize();                                 // downhill, along the surface
    d.copy(t).multiplyScalar(o.flow ?? 0.9).addScaledVector(n, o.out ?? 0.28);
    if (o.sweep) d.applyAxisAngle(up, o.sweep);
    if (o.forward) d.z += o.forward;
    d.normalize();
    const geo = new THREE.CylinderGeometry(baseR * 0.3, baseR, len, S(8), 2, true);   // blunt tip: clumps, not spikes
    geo.translate(0, len / 2, 0);
    orientLock(geo, P, d, n, o.flat ?? 0.5);
    pieces.push({ geo, color: C.hair[Math.floor(rand() * C.hair.length)], pos: HC.toArray() });
  };

  for (let i = 0; i < 18; i++) lock(58 + rand() * 28, (i / 18) * 360 + rand() * 12, 0.085 + rand() * 0.035, 0.032 + rand() * 0.01, { flow: 1.0, out: 0.1, flat: 0.5 });    // crown
  for (let i = 0; i < 12; i++) lock(50 + rand() * 18, -48 + (i / 11) * 96, 0.08 + rand() * 0.02, 0.03 + rand() * 0.008, { flow: 1.0, out: 0.12, sweep: 0.35, forward: 0.1, flat: 0.45 });   // fringe
  for (const sgn of [-1, 1]) for (let i = 0; i < 8; i++) lock(8 + rand() * 30, sgn * (62 + (i / 7) * 52 + rand() * 6), 0.09 + rand() * 0.03, 0.03 + rand() * 0.008, { flow: 1, out: 0.1, flat: 0.45 });   // over the ears
  for (let i = 0; i < 12; i++) lock(5 + rand() * 40, 128 + (i / 11) * 104, 0.1 + rand() * 0.035, 0.032 + rand() * 0.01, { flow: 1, out: 0.08, flat: 0.5 });                              // nape
  return pieces;
}

/* Stand a cone's base on P, its tip along d, flattened against the surface normal n. */
function orientLock(geo, P, d, n, flat) {
  const y = d.clone();
  const z = n.clone().addScaledVector(y, -n.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  geo.scale(1, 1, flat);
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).setPosition(P));
}
