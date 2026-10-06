/* ==========================================================================
   study.js — the physics corner.

   Physics as motion, not just books: a Bloch sphere whose gates are exact
   rotations of the state vector, and twin double pendulums released a
   thousandth of a radian apart (RK4) that visibly part ways. The chalkboard
   carries the same equations the card lists as text.
   ========================================================================== */
import { THREE, mulberry32 as mulberry } from './kit.js';

/* Desk sits in the NE chamfer, facing into the room. */
const CHAMFER = { a: [5.5, -3.0], b: [4.2, -4.5] };
const TOP = 0.76;

export function buildStudy(kit, world) {
  const M = kit.mat;
  const [ax, az] = CHAMFER.a, [bx, bz] = CHAMFER.b;
  const len = Math.hypot(bx - ax, bz - az);
  const n = { x: (bz - az) / len, z: -(bx - ax) / len };   // inward normal
  const ROT = Math.atan2(n.x, n.z);
  const cx = (ax + bx) / 2 + n.x * 0.55, cz = (az + bz) / 2 + n.z * 0.55;
  const cos = Math.cos(ROT), sin = Math.sin(ROT);
  const W = (lx, y, lz) => [cx + lx * cos + lz * sin, y, cz - lx * sin + lz * cos];

  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.rotation.y = ROT;

  /* ── Desk ────────────────────────────────────────────────────────── */
  const top = kit.box(1.5, 0.035, 0.7, M.oakDark, 0, TOP - 0.0175, 0, g);
  top.castShadow = top.receiveShadow = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.035, TOP - 0.035, 0.035, M.steelDark, sx * 0.7, (TOP - 0.035) / 2, sz * 0.3, g).castShadow = true;
  g.add(kit.blob(1.7, 0.9, 0, 0));

  /* ── Chalkboard ──────────────────────────────────────────────────── */
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.98), new THREE.MeshStandardMaterial({ map: chalkboardTexture(kit), roughness: 0.96, name: 'chalkboard' }));
  board.position.set(0, 1.62, -0.535);
  board.userData.keep = true;
  g.add(board);
  kit.box(1.94, 0.04, 0.03, M.oakDark, 0, 2.13, -0.54, g);
  kit.box(1.94, 0.04, 0.03, M.oakDark, 0, 1.11, -0.54, g);
  kit.box(0.04, 1.06, 0.03, M.oakDark, -0.95, 1.62, -0.54, g);
  kit.box(0.04, 1.06, 0.03, M.oakDark, 0.95, 1.62, -0.54, g);
  kit.box(1.4, 0.015, 0.06, M.oakDark, 0, 1.09, -0.515, g);
  for (let i = 0; i < 3; i++) kit.cyl(0.0045, 0.0045, 0.06, M.pla, 6, -0.4 + i * 0.07, 1.104, -0.51, g).rotation.z = Math.PI / 2;

  /* ── Bloch sphere ────────────────────────────────────────────────── */
  const bloch = new THREE.Group();
  bloch.position.set(-0.42, TOP, 0.05);
  kit.cyl(0.05, 0.055, 0.014, M.steelDark, 20, 0, 0.007, 0, bloch);
  kit.cyl(0.004, 0.004, 0.11, M.steelLight, 8, 0, 0.065, 0, bloch);
  const R = 0.09, C = 0.21;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, kit.seg(32), kit.seg(20)), M.glass);
  shell.position.y = C;
  shell.renderOrder = 2;
  bloch.add(shell);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd8d4cc, transparent: true, opacity: 0.55, name: 'blochRing' });
  for (const [rx, ry] of [[Math.PI / 2, 0], [0, 0], [0, Math.PI / 2]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0011, 4, kit.seg(64)), ringMat);
    ring.rotation.set(rx, ry, 0);
    ring.position.y = C;
    bloch.add(ring);
  }
  const axes = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, C - R * 1.25, 0), new THREE.Vector3(0, C + R * 1.25, 0),
    new THREE.Vector3(-R * 1.15, C, 0), new THREE.Vector3(R * 1.15, C, 0),
    new THREE.Vector3(0, C, -R * 1.15), new THREE.Vector3(0, C, R * 1.15),
  ]), M.line);
  bloch.add(axes);
  for (const [txt, y] of [['|0⟩', C + R * 1.45], ['|1⟩', C - R * 1.45]]) {
    const l = kit.labelPlane(txt, 0.05, { size: 54, font: 'Cormorant Garamond', weight: 400, color: '#e9e6df', spacing: 0 });
    l.position.set(0.03, y, 0);
    bloch.add(l);
  }
  const vec = new THREE.Group();
  vec.userData.dynamic = true;
  vec.position.y = C;
  kit.cyl(0.0022, 0.0022, R * 0.86, M.ledWarm, 8, 0, R * 0.43, 0, vec);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 10), M.ledWarm);
  head.position.y = R * 0.9;
  vec.add(head);
  kit.bake(vec);
  bloch.add(vec);
  g.add(bloch);

  // Bloch state as a unit vector b = (x, y, z) in Bloch coordinates (z = |0⟩).
  const state = { b: new THREE.Vector3(Math.sin(1.0) * Math.cos(0.4), Math.sin(1.0) * Math.sin(0.4), Math.cos(1.0)), anim: null };
  const GATES = {
    X: { axis: new THREE.Vector3(1, 0, 0), angle: Math.PI },
    Z: { axis: new THREE.Vector3(0, 0, 1), angle: Math.PI },
    H: { axis: new THREE.Vector3(1, 0, 1).normalize(), angle: Math.PI },
    S: { axis: new THREE.Vector3(0, 0, 1), angle: Math.PI / 2 },
  };
  const toLocal = (b, out) => out.set(b.x, b.z, -b.y);   // Bloch → stand (proper rotation)
  const up = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3(), q = new THREE.Quaternion();
  function applyBloch() {
    toLocal(state.b, tmpV).normalize();
    vec.quaternion.setFromUnitVectors(up, tmpV);
  }
  applyBloch();
  function blochReadout() {
    const b = state.b;
    const theta = Math.acos(THREE.MathUtils.clamp(b.z, -1, 1));
    let phi = Math.atan2(b.y, b.x);
    if (phi < 0) phi += Math.PI * 2;
    const a0 = Math.cos(theta / 2), a1 = Math.sin(theta / 2);
    const deg = (r) => `${Math.round(r * 180 / Math.PI) % 360}°`;
    return `θ = ${deg(theta)}   φ = ${deg(phi)}\n|ψ⟩ = ${a0.toFixed(2)}|0⟩ + e^{i·${deg(phi)}}·${a1.toFixed(2)}|1⟩\nP(0) = ${(a0 * a0).toFixed(2)}   P(1) = ${(a1 * a1).toFixed(2)}`;
  }
  world.shared.bloch = {
    apply(name, reduced) {
      const gate = GATES[name];
      if (!gate) {
        state.anim = null;
        state.b.set(0, 0, 1);
        applyBloch();
        return;
      }
      const from = state.b.clone();
      if (reduced) {
        state.b.applyQuaternion(q.setFromAxisAngle(gate.axis, gate.angle));
        applyBloch();
        return;
      }
      state.anim = { from, axis: gate.axis, angle: gate.angle, t: 0 };
    },
    readout: blochReadout,
  };

  /* ── Twin double pendulums ───────────────────────────────────────── */
  const pend = new THREE.Group();
  pend.position.set(0.32, TOP, -0.08);
  kit.box(0.32, 0.012, 0.12, M.steelDark, 0, 0.006, 0, pend);
  for (const sx of [-1, 1]) kit.box(0.012, 0.42, 0.012, M.steelDark, sx * 0.14, 0.21, -0.03, pend);
  kit.box(0.3, 0.012, 0.016, M.steelDark, 0, 0.42, -0.03, pend);
  kit.cyl(0.006, 0.006, 0.05, M.steelLight, 10, 0, 0.405, -0.015, pend).rotation.x = Math.PI / 2;
  const L = 0.12;
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false, name: 'ghost' });
  const makeArm = (mat, z) => {
    const arm1 = new THREE.Group();
    arm1.position.set(0, 0.405, z);
    kit.box(0.006, L, 0.004, mat, 0, -L / 2, 0, arm1);
    kit.sphere(0.011, mat, 12, 0, -L, 0, arm1);
    const arm2 = new THREE.Group();
    arm2.position.y = -L;
    kit.box(0.005, L, 0.004, mat, 0, -L / 2, 0.004, arm2);
    kit.sphere(0.013, mat, 12, 0, -L, 0.004, arm2);
    kit.bake(arm2, { essential: false });
    arm1.add(arm2);
    kit.bake(arm1, { essential: false });
    pend.add(arm1);
    return { arm1, arm2 };
  };
  const solid = makeArm(M.steelLight, 0.006);
  const ghost = makeArm(ghostMat, 0.018);
  g.add(pend);

  const trailN = kit.detail(1) ? 140 : 0;
  const trails = [];
  if (trailN) {
    for (const [col, op, z] of [[0xf2c38f, 0.55, 0.01], [0xffffff, 0.22, 0.022]]) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailN * 3), 3));
      geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }));
      line.position.set(0, 0.405, z);
      line.frustumCulled = false;
      line.userData.dynamic = true;
      pend.add(line);
      trails.push({ geo, count: 0, head: 0, z });
    }
  }

  const sim = { a: null, b: null, clock: 0 };
  const release = () => {
    sim.a = [2.1, 2.6, 0, 0];
    sim.b = [2.101, 2.6, 0, 0];
    sim.clock = 0;
    for (const tr of trails) { tr.count = 0; tr.head = 0; tr.geo.setDrawRange(0, 0); }
  };
  release();
  world.shared.pendulum = { release };
  const pose = (arm, s) => { arm.arm1.rotation.z = s[0]; arm.arm2.rotation.z = s[1] - s[0]; };
  pose(solid, [0.6, 1.2]);
  pose(ghost, [0.6, 1.2]);

  /* ── Notebooks, sketch, lamp ─────────────────────────────────────── */
  const covers = [0x1f2733, 0x3a201c, 0x1f2b24, 0x232325].map((c) => kit.tint(c, 'matte'));
  const titles = ['CLASSICAL MECHANICS', 'QUANTUM MECHANICS', 'ELECTROMAGNETISM', 'ORBITAL MECHANICS'];
  titles.forEach((t, i) => {
    const y = TOP + 0.011 + i * 0.023;
    const book = kit.box(0.21, 0.022, 0.15, covers[i], -0.58 + (i % 2) * 0.008, y, -0.2, g);
    book.rotation.y = (i - 1.5) * 0.05;
    book.castShadow = true;
    kit.box(0.2, 0.018, 0.145, M.paper, -0.58 + (i % 2) * 0.008 + 0.004, y, -0.2, g).rotation.y = book.rotation.y;
    if (kit.detail(1)) {
      const spine = kit.labelPlane(t, 0.19, { w: 1024, h: 96, size: 46, color: '#d8d4cc', spacing: 6 });
      spine.position.set(-0.58 + (i % 2) * 0.008, y, -0.2 + 0.0752);
      spine.rotation.y = book.rotation.y;
      g.add(spine);
    }
  });
  const sketch = kit.decal(0.21, 0.297, 420, 594, drawSketch, { lit: true });
  sketch.rotation.x = -Math.PI / 2;
  sketch.rotation.z = 0.18;
  sketch.position.set(-0.05, TOP + 0.001, 0.12);
  g.add(sketch);
  kit.cyl(0.0035, 0.0035, 0.16, M.plaWarm, 6, 0.08, TOP + 0.004, 0.16, g).rotation.set(0, 0.6, Math.PI / 2);

  kit.cyl(0.055, 0.06, 0.018, M.black, 20, 0.63, TOP + 0.009, -0.24, g);
  kit.tube([[0.63, TOP + 0.02, -0.24], [0.6, TOP + 0.36, -0.28], [0.5, TOP + 0.44, -0.12]], 0.007, M.black, 24, g);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.11, kit.seg(24), 1, true), M.black);
  shade.position.set(0.47, TOP + 0.41, -0.08);
  shade.rotation.set(0.45, 0, 0.35);
  g.add(shade);
  kit.sphere(0.022, M.ledWarm, 12, 0.465, TOP + 0.385, -0.07, g).userData.keep = true;
  const pool = kit.wash(0.8, 0.6, 0xffc58a, 0.18);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.2, TOP + 0.002, 0.02);
  g.add(pool);
  if (kit.q.lights >= 2) {
    const lamp = new THREE.PointLight(0xffb46b, 1.4, 0, 2);
    lamp.position.set(0.45, TOP + 0.36, -0.04);
    g.add(world.addLight(lamp, 1.0));
  }

  /* ── Registration ────────────────────────────────────────────────── */
  const corners = [[-0.76, -0.36], [0.76, -0.36], [0.76, 0.36], [-0.76, 0.36]].map(([x, z]) => W(x, 0, z));
  for (let i = 0; i < 4; i++) {
    const p = corners[i], q2 = corners[(i + 1) % 4];
    world.addWall(p[0], p[2], q2[0], q2[2]);
  }
  world.addOccluder([1.5, TOP, 0.7], W(0, TOP / 2, 0), ROT);

  const hs = (id, extra, anchor, hitSize, hitC, view, target) => world.addHotspot({
    id, zone: 'physics', ...extra, anchor: W(...anchor), hit: [hitSize, W(...hitC), ROT], view: [W(...view), W(...target)],
  });
  hs('bloch', {}, [-0.42, TOP + 0.36, 0.05], [0.26, 0.36, 0.26], [-0.42, TOP + 0.18, 0.05], [-0.32, TOP + 0.48, 0.62], [-0.42, TOP + 0.2, 0.05]);
  hs('pendulum', {}, [0.32, TOP + 0.5, -0.08], [0.36, 0.48, 0.18], [0.32, TOP + 0.24, -0.08], [0.24, TOP + 0.44, 0.66], [0.32, TOP + 0.27, -0.08]);
  hs('chalkboard', {}, [0.0, 2.2, -0.5], [1.94, 1.06, 0.1], [0, 1.62, -0.52], [0.0, 1.6, 1.3], [0, 1.58, -0.54]);
  hs('notebooks', {}, [-0.58, TOP + 0.15, -0.2], [0.28, 0.14, 0.22], [-0.58, TOP + 0.05, -0.2], [-0.48, TOP + 0.48, 0.42], [-0.58, TOP + 0.05, -0.2]);

  world.addLocation('physics', W(0.05, 1.62, 1.75), W(0, 1.2, -0.3), ['bloch', 'pendulum', 'chalkboard', 'notebooks']);

  /* ── Animation ───────────────────────────────────────────────────── */
  const gEff = 9.81 * 0.32;   // slowed for legibility; same equations, gentler clock
  const tmpTrail = new THREE.Vector3();
  world.onUpdate((dt, t, f) => {
    // Bloch: gate animation, else slow Larmor-style precession about z
    if (state.anim) {
      const a = state.anim;
      a.t = Math.min(1, a.t + dt / 0.65);
      const k = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      state.b.copy(a.from).applyQuaternion(q.setFromAxisAngle(a.axis, a.angle * k));
      if (a.t >= 1) state.anim = null;
      applyBloch();
    } else if (!f.reduced) {
      state.b.applyAxisAngle(GATES.Z.axis, dt * 0.5);
      applyBloch();
    }
    if (f.inspecting === 'bloch') f.setReadout?.(blochReadout());

    // pendulums (frozen on the LOW tier, where they are merged into the room)
    if (f.reduced || kit.q.detail === 0) return;
    const steps = 4, h = Math.min(dt, 1 / 30) / steps;
    for (let i = 0; i < steps; i++) {
      rk4(sim.a, h, gEff, L);
      rk4(sim.b, h, gEff, L);
    }
    sim.clock += dt;
    if (sim.clock > 48) release();
    pose(solid, sim.a);
    pose(ghost, sim.b);
    trails.forEach((tr, i) => {
      const s = i === 0 ? sim.a : sim.b;
      const x = L * Math.sin(s[0]) + L * Math.sin(s[1]);
      const y = -L * Math.cos(s[0]) - L * Math.cos(s[1]);
      const arr = tr.geo.attributes.position.array;
      // shift-free ring buffer drawn in order by rewriting (small N)
      if (tr.count < trailN) tr.count++;
      arr.copyWithin(3, 0, (trailN - 1) * 3);
      tmpTrail.set(x, y, 0);
      arr[0] = tmpTrail.x; arr[1] = tmpTrail.y; arr[2] = 0;
      tr.geo.attributes.position.needsUpdate = true;
      tr.geo.setDrawRange(0, tr.count);
    });
  });

  return g;
}

/* Double pendulum, equal masses and lengths. s = [θ1, θ2, ω1, ω2]. */
function deriv(s, g, L) {
  const [t1, t2, w1, w2] = s;
  const d = t1 - t2;
  const den = 3 - Math.cos(2 * d);
  const a1 = (-3 * g * Math.sin(t1) - g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * (w2 * w2 * L + w1 * w1 * L * Math.cos(d))) / (L * den);
  const a2 = (2 * Math.sin(d) * (w1 * w1 * L * 2 + g * 2 * Math.cos(t1) + w2 * w2 * L * Math.cos(d))) / (L * den);
  return [w1, w2, a1, a2];
}

function rk4(s, h, g, L) {
  const k1 = deriv(s, g, L);
  const s2 = s.map((v, i) => v + (h / 2) * k1[i]);
  const k2 = deriv(s2, g, L);
  const s3 = s.map((v, i) => v + (h / 2) * k2[i]);
  const k3 = deriv(s3, g, L);
  const s4 = s.map((v, i) => v + h * k3[i]);
  const k4 = deriv(s4, g, L);
  for (let i = 0; i < 4; i++) s[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}

function chalkboardTexture(kit) {
  const w = 1536, h = 810;
  const c = kit.canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1e1c';
  ctx.fillRect(0, 0, w, h);
  // smudges
  const rnd = mulberry(23);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(230,230,220,${0.012 + rnd() * 0.02})`;
    ctx.beginPath();
    ctx.ellipse(rnd() * w, rnd() * h, 60 + rnd() * 200, 20 + rnd() * 60, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(240,238,228,0.88)';
  ctx.strokeStyle = 'rgba(240,238,228,0.75)';
  const serif = (size) => `italic 400 ${size}px "Cormorant Garamond", Georgia, serif`;
  ctx.font = serif(58);
  ctx.fillText('T² ∝ a³', 80, 120);
  ctx.fillText('F = G m₁ m₂ / r²', 80, 220);
  ctx.fillText('r_H ≈ a(1 − e) ∛(m / 3M)', 80, 320);
  ctx.fillText('d ≈ 2.44 R (ρ_M / ρ_m)^⅓', 80, 420);
  ctx.font = serif(52);
  ctx.fillText('|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩', 80, 560);
  ctx.font = '400 26px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(240,238,228,0.5)';
  ctx.fillText('// stability: Hill sphere vs Roche limit', 80, 650);
  ctx.fillText('// RK4, Δt = 1/240 s', 80, 700);
  // orbit sketch with Hill sphere
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(1180, 330, 250, 150, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(1010, 370, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1405, 260, 7, 0, Math.PI * 2); ctx.fill();
  ctx.setLineDash([10, 9]);
  ctx.beginPath(); ctx.arc(1405, 260, 48, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = serif(36);
  ctx.fillStyle = 'rgba(240,238,228,0.7)';
  ctx.fillText('r_H', 1460, 215);
  ctx.fillText('M', 985, 420);
  // a crossed-out attempt, because that's how boards look
  ctx.font = serif(40);
  ctx.fillStyle = 'rgba(240,238,228,0.4)';
  ctx.fillText('r_H ≈ a ∛(m/M)', 980, 650);
  ctx.beginPath(); ctx.moveTo(970, 638); ctx.lineTo(1250, 638); ctx.stroke();
  ctx.fillText('→ 3M', 1270, 650);
  return kit.canvasTexture(c);
}

function drawSketch(ctx, w, h) {
  ctx.fillStyle = '#e9e5dc';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(60,60,64,0.6)';
  ctx.lineWidth = 1.5;
  for (const [rx, ry, rot] of [[150, 90, 0.2], [110, 60, -0.4], [70, 40, 0.9]]) {
    ctx.beginPath(); ctx.ellipse(210, 260, rx, ry, rot, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,40,44,0.75)';
  ctx.beginPath(); ctx.arc(210, 260, 6, 0, Math.PI * 2); ctx.fill();
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillText('N-BODY // SKETCH', 30, 50);
  ctx.font = '400 15px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(40,40,44,0.6)';
  ctx.fillText('G = 0.8   M★ = 1000', 30, 470);
  ctx.fillText('softening ε² = 0.5', 30, 500);
  ctx.fillText('semi-implicit Euler?', 30, 530);
  ctx.fillText('→ analytic Kepler traces', 30, 560);
}
