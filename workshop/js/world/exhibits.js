/* ==========================================================================
   exhibits.js — the projects as objects.

   Aether's orrery solves Kepler's equation on the homepage's orbits. The
   turbine stands on a test rig in front of a fan. MoonCamp's domes lift on
   (symbolic) magnets. BrickCast's mesh → grid → bricks is computed live from
   the habitat module's shape. The drawer underneath keeps the failures.
   ========================================================================== */
import { THREE, ease, mulberry32 } from './kit.js';
import { ORBITS, keplerTrace } from './architecture.js';
import { tileArtTexture, drawTileArt } from './fabrication.js';
import { MOONCAMP_MODULES } from '../content.js';

export function buildExhibits(kit, world) {
  const g = new THREE.Group();
  buildOrrery(kit, world, g);
  buildTurbine(kit, world, g);
  buildMoonCamp(kit, world, g);
  buildShelf(kit, world, g);

  world.addLocation('aether', [0.3, 1.6, -2.9], [0, 1.15, -5.05], ['aether']);
  world.addLocation('turbine', [2.05, 1.55, -2.3], [2.95, 1.0, -3.95], ['turbine']);
  world.addLocation('shelf', [-2.3, 1.62, -1.55], [-3.2, 0.95, -3.7], ['mooncamp', 'brickcast', 'lenstile-case', 'failed']);

  /* World-anchored labels for exploded views and lifted domes. */
  world.shared.labels3d = () => [...world.shared.turbine.labels(), ...world.shared.mooncamp.labels()];
  return g;
}

/* ── Aether orrery ──────────────────────────────────────────────────── */
function buildOrrery(kit, world, g) {
  const M = kit.mat;
  const P = { x: 0, z: -5.05 };
  const CY = 1.24;
  const plinth = kit.cyl(0.6, 0.62, 0.72, M.black, 40, P.x, 0.36, P.z, g);
  plinth.castShadow = plinth.receiveShadow = true;
  kit.cyl(0.625, 0.625, 0.02, M.blackGloss, 40, P.x, 0.73, P.z, g);
  kit.cyl(0.006, 0.006, CY - 0.74, M.steelLight, 8, P.x, 0.74 + (CY - 0.74) / 2, P.z, g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.004, 6, kit.seg(96)), M.steelDark);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(P.x, 0.745, P.z);
  g.add(ring);
  g.add(kit.blob(1.6, 1.6, P.x, P.z));

  const star = kit.sphere(0.05, new THREE.MeshBasicMaterial({ color: 0xffe2b8, name: 'star' }), 20, P.x, CY, P.z, g);
  star.userData.keep = true;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.washTexture(), color: 0xffd9a8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(0.5, 0.5, 1);
  glow.position.set(P.x, CY, P.z);
  g.add(glow);
  if (kit.q.lights >= 1) {
    const l = new THREE.PointLight(0xffe2b8, 0.8, 0, 2);
    l.position.set(P.x, CY, P.z);
    g.add(world.addLight(l, 2.2));
  }

  // Orbit geometry: the homepage's shapes, at true Keplerian speed.
  const shapes = ORBITS.shapes;
  const bodies = ORBITS.init.slice(1);
  let max = 0;
  bodies.forEach((b, i) => { for (const [x, y] of keplerTrace(b.r0, shapes[i], 200)) max = Math.max(max, Math.abs(x), Math.abs(y)); });
  const s = 0.6 / max;
  const incl = [[0.06, 0.2], [0.14, -0.6], [-0.1, 1.1], [0.18, 2.2]];
  const looks = [
    { r: 0.015, c: 0x8a8580 }, { r: 0.024, c: 0xb59a7a }, { r: 0.009, c: 0x6d6c69 }, { r: 0.032, c: 0x9aa8ae },
  ];
  const aOuter = bodies[3].r0 / (1 - shapes[3].e);
  const orbitSegs = [];
  // All four planets are one instanced draw call; so are their Hill spheres.
  const planets = new THREE.InstancedMesh(new THREE.SphereGeometry(1, kit.seg(16), kit.seg(10)), new THREE.MeshStandardMaterial({ roughness: 0.7, name: 'planets' }), bodies.length);
  const hills = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false, name: 'hills' }), bodies.length);
  planets.userData.dynamic = hills.userData.dynamic = true;
  planets.frustumCulled = hills.frustumCulled = false;
  hills.visible = false;
  g.add(planets, hills);
  const col = new THREE.Color();
  const orbiters = bodies.map((b, i) => {
    const sh = shapes[i];
    const pivot = new THREE.Object3D();
    pivot.position.set(P.x, CY, P.z);
    pivot.rotation.set(incl[i][0], incl[i][1], 0);
    pivot.updateMatrix();
    const pts = keplerTrace(b.r0, sh, kit.q.orbitPoints).map(([x, y]) => new THREE.Vector3(x * s, 0, -y * s).applyMatrix4(pivot.matrix));
    for (let k = 0; k < pts.length; k++) orbitSegs.push(pts[k], pts[(k + 1) % pts.length]);
    planets.setColorAt(i, col.setHex(looks[i].c));
    const a = b.r0 / (1 - sh.e);
    const rH = a * (1 - sh.e) * Math.cbrt(b.mass / (3 * ORBITS.init[0].mass));
    return { i, matrix: pivot.matrix, r: looks[i].r, hillR: Math.max(rH * s, looks[i].r * 1.6), e: sh.e, a, tilt: sh.tilt, stretch: sh.stretch, n: (Math.PI * 2 / 75) * Math.pow(aOuter / a, 1.5), M0: i * 1.7 };
  });
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(orbitSegs), M.line));

  const orrery = { paused: false, hill: false, time: 0 };
  const lp = new THREE.Vector3(), m4 = new THREE.Matrix4(), one = new THREE.Quaternion(), sc = new THREE.Vector3();
  const place = (o, t) => {
    const Mn = o.M0 + o.n * t;
    let E = Mn;
    for (let k = 0; k < 6; k++) E -= (E - o.e * Math.sin(E) - Mn) / (1 - o.e * Math.cos(E));
    const nu = 2 * Math.atan2(Math.sqrt(1 + o.e) * Math.sin(E / 2), Math.sqrt(1 - o.e) * Math.cos(E / 2));
    const r = o.a * (1 - o.e * Math.cos(E));
    const x = r * Math.cos(nu), y = r * Math.sin(nu);
    const c = Math.cos(o.tilt), sn = Math.sin(o.tilt);
    lp.set((x * c - y * sn) * s, 0, -((x * sn + y * c) * o.stretch) * s).applyMatrix4(o.matrix);
    planets.setMatrixAt(o.i, m4.compose(lp, one, sc.setScalar(o.r)));
    hills.setMatrixAt(o.i, m4.compose(lp, one, sc.setScalar(o.hillR)));
  };
  const placeAll = (t) => {
    orbiters.forEach((o) => place(o, t));
    planets.instanceMatrix.needsUpdate = true;
    hills.instanceMatrix.needsUpdate = true;
  };
  placeAll(0);
  world.shared.orrery = {
    get paused() { return orrery.paused; },
    get hill() { return orrery.hill; },
    setPaused(v) { orrery.paused = v; },
    setHill(v) { orrery.hill = v; hills.visible = v; },
  };
  world.onUpdate((dt, t, f) => {
    if (f.reduced || orrery.paused) return;
    orrery.time += dt;
    placeAll(orrery.time);
    glow.material.opacity = 0.45 + 0.05 * Math.sin(t * 0.8);
  });
  world.onNight((t) => { glow.material.opacity = 0.5 + 0.35 * t; });

  world.colliders.circles.push({ x: P.x, z: P.z, r: 0.66 });
  world.addOccluder([1.24, 0.74, 1.24], [P.x, 0.37, P.z]);
  world.addHotspot({
    id: 'aether', zone: 'aether', projectId: 'ag',
    anchor: [P.x, CY + 0.36, P.z + 0.35],
    hit: [[1.4, 0.95, 1.4], [P.x, CY - 0.05, P.z]],
    view: [[0.0, 1.55, -3.3], [P.x, CY - 0.08, P.z]],
  });
}

/* ── Wind turbine test stand ────────────────────────────────────────── */
function buildTurbine(kit, world, g) {
  const M = kit.mat;
  const P = { x: 2.95, z: -3.95 };
  const T = 0.715;
  const root = new THREE.Group();
  root.position.set(P.x, 0, P.z);
  kit.box(1.1, 0.03, 0.56, M.steelDark, 0, T - 0.015, 0, root).receiveShadow = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.035, T - 0.03, 0.035, M.steelDark, sx * 0.51, (T - 0.03) / 2, sz * 0.24, root).castShadow = true;
  kit.box(1.0, 0.02, 0.02, M.steelDark, 0, 0.15, 0.24, root);
  root.add(kit.blob(1.3, 0.8, 0, 0));

  // pole + nacelle (rotor faces the fan at -x)
  const PX = 0.26, NY = 1.05;
  kit.box(0.12, 0.012, 0.12, M.steelDark, PX, T + 0.006, 0, root);
  kit.cyl(0.012, 0.014, NY - T - 0.03, M.steelLight, 10, PX, T + (NY - T - 0.03) / 2, 0, root);
  const nacelle = new THREE.Group();
  nacelle.position.set(PX, NY, 0);
  nacelle.userData.dynamic = true;
  const part = (name) => { const p = new THREE.Group(); p.name = name; nacelle.add(p); return p; };
  const bearing = part('bearing');
  const tb = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 8, kit.seg(20)), M.steelLight);
  tb.rotation.x = Math.PI / 2;
  tb.position.y = -0.03;
  bearing.add(tb);
  const motor = part('motor');
  kit.cyl(0.034, 0.034, 0.12, M.plaGrey, 20, 0, 0, 0, motor).rotation.z = Math.PI / 2;
  const cowl = part('cowl');
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035, kit.seg(20), kit.seg(10), 0, Math.PI * 2, 0, Math.PI / 2), M.pla);
  cap.rotation.z = Math.PI / 2;
  cap.scale.set(1, 1.3, 1);
  cap.position.x = -0.06;
  cowl.add(cap);
  const rotor = part('rotor');
  rotor.position.x = -0.11;
  const spinner = new THREE.Group();
  rotor.add(spinner);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.04, kit.seg(16)), M.pla);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = -0.02;
  spinner.add(hub);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(bladeGeometry(0.2, 0.034, 0.5), M.pla);
    blade.rotation.x = (i / 3) * Math.PI * 2;
    blade.castShadow = true;
    spinner.add(blade);
  }
  const tail = part('tail');
  const boom = kit.cyl(0.006, 0.006, 0.22, M.steelLight, 8, 0.17, 0.0, 0, tail);
  boom.rotation.z = Math.PI / 2;
  kit.box(0.12, 0.1, 0.003, M.pla, 0.29, 0.02, 0, tail);
  const brace = kit.cyl(0.0035, 0.0035, 0.13, M.steelLight, 6, 0.1, -0.022, 0, tail);
  brace.rotation.z = Math.PI / 2 + 0.33;
  kit.bake(spinner, { essential: false });
  for (const p of [bearing, motor, cowl, rotor, tail]) kit.bake(p);
  root.add(nacelle);

  // the fan: wind source, on a riser so it lines up with the rotor
  const fan = new THREE.Group();
  fan.position.set(-0.36, T, 0);
  kit.box(0.14, 0.13, 0.2, M.plastic, 0, 0.065, 0, fan);
  const fy = 0.13 + 0.19;
  for (const [y, z, w, h] of [[fy + 0.17, 0, 0.36, 0.024], [fy - 0.17, 0, 0.36, 0.024]]) kit.box(0.08, h, w, M.plasticMid, 0, y, z, fan);
  for (const z of [-0.17, 0.17]) kit.box(0.08, 0.36, 0.024, M.plasticMid, 0, fy, z, fan);
  for (const r of [0.06, 0.11, 0.155]) {
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0018, 4, kit.seg(40)), M.steel);
    t2.rotation.y = Math.PI / 2;
    t2.position.set(0.042, fy, 0);
    fan.add(t2);
  }
  kit.box(0.003, 0.32, 0.004, M.steel, 0.042, fy, 0, fan);
  kit.box(0.003, 0.004, 0.32, M.steel, 0.042, fy, 0, fan);
  const fanBlades = new THREE.Group();
  fanBlades.position.set(0.01, fy, 0);
  for (let i = 0; i < 5; i++) {
    const b = kit.box(0.004, 0.13, 0.06, M.plaGrey, 0, 0.075, 0, null);
    const holder = new THREE.Group();
    holder.rotation.x = (i / 5) * Math.PI * 2;
    b.rotation.y = 0.5;
    holder.add(b);
    fanBlades.add(holder);
  }
  kit.cyl(0.028, 0.028, 0.03, M.plastic, 16, 0, 0, 0, fanBlades).rotation.z = Math.PI / 2;
  kit.bake(fanBlades, { essential: false });
  fan.add(fanBlades);
  root.add(fan);

  // exposed charging chain on an acrylic plate
  const plate = new THREE.Group();
  plate.position.set(0.0, T, 0.16);
  kit.box(0.34, 0.004, 0.15, M.glass, 0, 0.022, 0, plate);
  for (const [x, z] of [[-0.16, -0.065], [0.16, -0.065], [-0.16, 0.065], [0.16, 0.065]]) kit.cyl(0.004, 0.004, 0.02, M.brass, 6, x, 0.01, z, plate);
  const navy = kit.tint(0x1e2a36, 'satin');
  kit.box(0.05, 0.002, 0.036, M.plastic, -0.11, 0.026, 0, plate);
  for (let i = 0; i < 4; i++) kit.cyl(0.0028, 0.0028, 0.012, M.black, 6, -0.125 + (i % 2) * 0.03, 0.03, -0.008 + Math.floor(i / 2) * 0.016, plate).rotation.z = Math.PI / 2;
  kit.box(0.045, 0.002, 0.022, navy, -0.03, 0.026, -0.03, plate);
  kit.box(0.045, 0.002, 0.022, navy, -0.03, 0.026, 0.03, plate);
  kit.box(0.028, 0.002, 0.018, navy, 0.045, 0.026, 0, plate);
  const chargeLed = new THREE.MeshBasicMaterial({ color: 0xff5a3c, name: 'chargeLed' });
  kit.box(0.003, 0.002, 0.003, chargeLed, 0.05, 0.028, 0.005, plate).userData.keep = true;
  kit.box(0.075, 0.018, 0.024, M.plastic, 0.12, 0.033, 0, plate);
  const cellTex = kit.labelTexture('18650', { w: 256, h: 64, size: 34, color: '#d8dde0', bg: '#33414a' });
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.065, kit.seg(16)), new THREE.MeshStandardMaterial({ map: cellTex, roughness: 0.45, name: 'cellWrap2' }));
  cell.rotation.z = Math.PI / 2;
  cell.position.set(0.12, 0.044, 0);
  cell.userData.keep = true;
  plate.add(cell);
  root.add(plate);
  const wire = (pts, mat) => kit.tube(pts.map(([x, y, z]) => [x, y, z]), 0.0016, mat, 20, root);
  wire([[PX, T + 0.02, 0.0], [PX - 0.05, T + 0.03, 0.1], [-0.11, T + 0.03, 0.16]], M.rubber);
  wire([[-0.085, T + 0.03, 0.16], [-0.06, T + 0.036, 0.13], [-0.03, T + 0.03, 0.13]], M.pla);
  wire([[0.0, T + 0.03, 0.19], [0.025, T + 0.036, 0.18], [0.045, T + 0.03, 0.16]], M.pla);
  wire([[0.06, T + 0.03, 0.16], [0.08, T + 0.04, 0.16], [0.09, T + 0.04, 0.16]], M.rubber);

  // V1: a blade that twisted, leaning on the leg
  const v1 = new THREE.Mesh(bladeGeometry(0.2, 0.036, 1.6, 0.05), M.plaWarm);
  v1.position.set(0.47, 0.11, 0.3);
  v1.rotation.set(0.25, 0.4, 0.2);
  v1.castShadow = true;
  root.add(v1);
  const tag = kit.labelPlane('V1', 0.04, { size: 60, color: '#1a1a1c', bg: '#e8e4dc', w: 128, h: 96 });
  tag.position.set(0.45, 0.03, 0.34);
  tag.rotation.x = -Math.PI / 2;
  root.add(tag);
  g.add(root);

  // exploded view targets (nacelle-local) and labels
  const parts = { rotor, cowl, motor, tail, bearing };
  const offsets = { rotor: [-0.17, 0, 0], cowl: [-0.09, 0.0, 0], motor: [0, 0.035, 0], tail: [0.14, 0, 0], bearing: [0, -0.1, 0] };
  const labels = {
    rotor: 'ROTOR · 3 BLADES', cowl: 'WEATHERPROOF COWLING', motor: 'MOTOR HOUSING · 24 / 32 MM',
    tail: 'ANTI-SAG TAIL BRACE', bearing: 'YAW BEARING · 27 × 15.5 MM',
  };
  const state = { exploded: 0, target: 0, fan: true, fanSpeed: 1, rotorSpeed: 0 };
  const lp = new THREE.Vector3();
  world.shared.turbine = {
    get exploded() { return state.target > 0.5; },
    get fan() { return state.fan; },
    setExploded(v, instant) { state.target = v ? 1 : 0; if (instant) state.exploded = state.target; },
    setFan(v) { state.fan = v; },
    labels() {
      if (state.exploded < 0.6) return Object.keys(parts).map((k) => ({ id: `t-${k}`, text: labels[k], pos: null, visible: false }));
      nacelle.updateMatrixWorld();
      // Staggered anchors so the five labels never sit on top of each other.
      const lift = { rotor: [0, 0.27], cowl: [0, -0.075], motor: [0.02, 0.12], tail: [0.3, 0.19], bearing: [0, -0.07] };
      return Object.keys(parts).map((k) => {
        parts[k].getWorldPosition(lp);
        const [ax, ay] = lift[k];
        lp.x += ax;
        lp.y += ay;
        return { id: `t-${k}`, text: labels[k], pos: lp.clone(), visible: true };
      });
    },
  };
  world.onUpdate((dt, t, f) => {
    const e0 = state.exploded;
    if (state.exploded !== state.target) {
      state.exploded = f.reduced ? state.target : THREE.MathUtils.clamp(state.exploded + Math.sign(state.target - state.exploded) * dt / 0.7, 0, 1);
    }
    if (e0 !== state.exploded) {
      const k = ease.inOutCubic(state.exploded);
      for (const [name, p] of Object.entries(parts)) {
        const o = offsets[name];
        p.position.set((name === 'rotor' ? -0.11 : 0) + o[0] * k, o[1] * k, o[2] * k);
      }
    }
    const wantFan = state.fan && !f.reduced ? 1 : 0;
    state.fanSpeed += (wantFan - state.fanSpeed) * Math.min(1, dt * 1.2);
    const wantRotor = state.fan && !f.reduced && state.exploded < 0.05 ? 1 : 0;
    state.rotorSpeed += (wantRotor - state.rotorSpeed) * Math.min(1, dt * 0.6);
    if (kit.q.detail > 0) {                 // LOW: fan and rotor are frozen and merged
      fanBlades.rotation.x -= dt * 14 * state.fanSpeed;
      spinner.rotation.x += dt * 6.5 * state.rotorSpeed;
    }
    chargeLed.color.setHex(state.rotorSpeed > 0.3 ? 0xff5a3c : 0x2a1210);
  });

  world.addBox(P.x - 0.57, P.x + 0.57, P.z - 0.3, P.z + 0.3);
  world.addOccluder([1.1, T, 0.56], [P.x, T / 2, P.z]);
  world.addHotspot({
    id: 'turbine', zone: 'turbine', projectId: 'wt',
    anchor: [P.x + PX, NY + 0.3, P.z],
    hit: [[1.15, 0.7, 0.62], [P.x, T + 0.32, P.z]],
    view: [[P.x - 0.5, 1.4, P.z + 1.2], [P.x + 0.05, T + 0.3, P.z]],
  });
}

/* Twisted, tapered blade along +y (from the hub). `bend` curls it — for V1. */
function bladeGeometry(length, chord, twist, bend = 0) {
  const geo = new THREE.BoxGeometry(0.004, length, chord, 1, 10, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + length / 2;            // 0 … length
    const k = y / length;
    let x = p.getX(i), z = p.getZ(i) * (1 - 0.55 * k);
    const a = twist * (1 - k) * 0.9;
    const xr = x * Math.cos(a) - z * Math.sin(a), zr = x * Math.sin(a) + z * Math.cos(a);
    p.setXYZ(i, xr + bend * k * k, y + 0.02, zr);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ── MoonCamp ───────────────────────────────────────────────────────── */
function buildMoonCamp(kit, world, g) {
  const M = kit.mat;
  const P = { x: -3.15, z: -2.85 };
  const T = 0.74;
  const root = new THREE.Group();
  root.position.set(P.x, 0, P.z);
  kit.box(1.0, 0.04, 0.72, M.oakDark, 0, T - 0.02, 0, root).castShadow = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.04, T - 0.04, 0.04, M.steelDark, sx * 0.46, (T - 0.04) / 2, sz * 0.32, root).castShadow = true;
  root.add(kit.blob(1.2, 0.95, 0, 0));

  // regolith base with craters
  const base = new THREE.PlaneGeometry(0.92, 0.66, kit.seg(46), kit.seg(33));
  base.rotateX(-Math.PI / 2);
  const rnd = mulberry32(42);
  const craters = Array.from({ length: 9 }, () => ({ x: (rnd() - 0.5) * 0.85, z: (rnd() - 0.5) * 0.6, r: 0.02 + rnd() * 0.05 }));
  const pp = base.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), z = pp.getZ(i);
    let y = 0.004 * Math.sin(x * 31 + z * 17) * Math.cos(z * 23);
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1.3) y += d < 1 ? -0.006 * (1 - d * d) : 0.003 * (1.3 - d) / 0.3;
    }
    const edge = Math.min(0.46 - Math.abs(x), 0.33 - Math.abs(z));
    if (edge < 0.02) y -= (0.02 - edge) * 0.5;
    pp.setY(i, y);
  }
  base.computeVertexNormals();
  const ground = new THREE.Mesh(base, M.regolith);
  ground.position.y = T + 0.012;
  ground.receiveShadow = true;
  root.add(ground);

  // layout: control hub in the middle, eight modules around it
  const GY = T + 0.014;
  const ring = MOONCAMP_MODULES.filter((m) => m !== 'Control');
  const modules = [{ name: 'Control', x: 0, z: 0, r: 0.064 }];
  ring.forEach((name, i) => {
    const a = (i / ring.length) * Math.PI * 2 + 0.2;
    modules.push({ name, x: Math.cos(a) * 0.3, z: Math.sin(a) * 0.2, r: name === 'Rover' ? 0.058 : 0.048 });
  });
  const wallH = 0.032;
  const walls = [];
  modules.forEach((m) => {
    const w = kit.cyl(m.r, m.r, wallH, M.pla, 28, m.x, GY + wallH / 2, m.z, root);
    w.castShadow = true;
    walls.push(w);
    // interior: floor + a couple of fittings, revealed when the dome lifts
    kit.cyl(m.r * 0.92, m.r * 0.92, 0.002, M.plaGrey, 20, m.x, GY + wallH - 0.012, m.z, root);
    kit.box(m.r * 0.6, 0.008, m.r * 0.3, M.plasticMid, m.x - m.r * 0.2, GY + wallH - 0.006, m.z, root);
    kit.box(m.r * 0.3, 0.012, m.r * 0.3, M.plaWarm, m.x + m.r * 0.35, GY + wallH - 0.004, m.z + m.r * 0.2, root);
    if (m.name !== 'Control') {
      const dx = m.x, dz = m.z;
      const d = Math.hypot(dx, dz);
      const len = d - m.r - modules[0].r + 0.01;
      const mid = (modules[0].r + len / 2) / d;
      const c = kit.cyl(0.011, 0.011, len, M.pla, 12, dx * mid, GY + 0.012, dz * mid, root);
      c.rotation.set(0, -Math.atan2(dz, dx), Math.PI / 2);
      if (kit.detail(1)) {
        const door = kit.box(0.004, 0.02, 0.024, M.plaGrey, dx * ((m.r + d - m.r) / d) - (dx / d) * (m.r + 0.002), GY + 0.012, dz - (dz / d) * (m.r + 0.002), root);
        door.rotation.y = -Math.atan2(dz, dx);
      }
    }
  });
  // greenhouse plants
  const gh = modules.find((m) => m.name === 'Greenhouse');
  const leaf = kit.tint(0x5f7a5c, 'matte');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    kit.cyl(0.0, 0.008, 0.024, leaf, 6, gh.x + Math.cos(a) * 0.022, GY + wallH + 0.0, gh.z + Math.sin(a) * 0.022, root);
  }
  // rover parked by its garage
  const rv = modules.find((m) => m.name === 'Rover');
  const rover = new THREE.Group();
  rover.position.set(rv.x * 1.32, GY + 0.012, rv.z * 1.32);
  rover.rotation.y = 0.8;
  kit.box(0.04, 0.012, 0.026, M.plaGrey, 0, 0.006, 0, rover);
  for (const [x, z] of [[-0.015, -0.015], [0.015, -0.015], [-0.015, 0.015], [0.015, 0.015]]) {
    const wh = kit.cyl(0.006, 0.006, 0.005, M.plastic, 10, x, 0, z, rover);
    wh.rotation.x = Math.PI / 2;
  }
  kit.cyl(0.0015, 0.0015, 0.025, M.steelLight, 6, 0.012, 0.024, 0, rover);
  root.add(rover);

  // domes: one instanced mesh for the opaque ones, a translucent greenhouse
  const opaque = modules.filter((m) => m.name !== 'Greenhouse');
  const domeGeo = new THREE.SphereGeometry(1, kit.seg(24), kit.seg(12), 0, Math.PI * 2, 0, Math.PI / 2);
  const domes = new THREE.InstancedMesh(domeGeo, M.pla, opaque.length);
  domes.castShadow = true;
  domes.userData.dynamic = true;
  root.add(domes);
  const ghDome = new THREE.Mesh(domeGeo, M.greenhouse);
  ghDome.userData.dynamic = true;
  ghDome.renderOrder = 2;
  root.add(ghDome);
  if (kit.detail(1)) {
    const magnets = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 8), M.steelLight, modules.length * 8);
    const mm = new THREE.Matrix4();
    let k = 0;
    for (const m of modules) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      mm.makeTranslation(m.x + Math.cos(a) * m.r * 0.86, GY + wallH + 0.001, m.z + Math.sin(a) * m.r * 0.86);
      magnets.setMatrixAt(k++, mm);
    }
    magnets.userData.keep = true;
    root.add(magnets);
  }
  g.add(root);

  const lift = modules.map(() => ({ t: 0, target: 0 }));
  const mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), ax = new THREE.Vector3(1, 0, 0);
  const placeDomes = () => {
    let oi = 0;
    modules.forEach((m, i) => {
      const k = ease.outCubic(lift[i].t);
      ps.set(m.x, GY + wallH + k * 0.075, m.z);
      qq.setFromAxisAngle(ax.set(-m.z, 0, m.x).normalize().lengthSq() ? ax : ax.set(1, 0, 0), k * 0.25);
      sc.set(m.r, m.r * 0.92, m.r);
      mtx.compose(ps, qq, sc);
      if (m.name === 'Greenhouse') { ghDome.position.copy(ps); ghDome.quaternion.copy(qq); ghDome.scale.copy(sc); }
      else domes.setMatrixAt(oi++, mtx);
    });
    domes.instanceMatrix.needsUpdate = true;
  };
  placeDomes();
  const lp = new THREE.Vector3();
  world.shared.mooncamp = {
    modules: modules.map((m) => m.name),
    isLifted: (i) => lift[i].target > 0.5,
    toggle(i, reduced) { lift[i].target = lift[i].target > 0.5 ? 0 : 1; if (reduced) lift[i].t = lift[i].target; return lift[i].target > 0.5; },
    lowerAll(reduced) { lift.forEach((l) => { l.target = 0; if (reduced) l.t = 0; }); },
    labels() {
      return modules.map((m, i) => {
        lp.set(P.x + m.x, GY + wallH + 0.075 + m.r + 0.03, P.z + m.z);
        return { id: `mc-${i}`, text: m.name.toUpperCase(), pos: lp.clone(), visible: lift[i].t > 0.6 };
      });
    },
  };
  world.onUpdate((dt) => {
    let moved = false;
    for (const l of lift) {
      if (l.t === l.target) continue;
      l.t = THREE.MathUtils.clamp(l.t + Math.sign(l.target - l.t) * dt / 0.45, 0, 1);
      moved = true;
    }
    if (moved) placeDomes();
  });

  world.addBox(P.x - 0.52, P.x + 0.52, P.z - 0.38, P.z + 0.38);
  world.addOccluder([1.0, T, 0.72], [P.x, T / 2, P.z]);
  world.addHotspot({
    id: 'mooncamp', zone: 'shelf', projectId: 'mc',
    anchor: [P.x, T + 0.22, P.z + 0.1],
    hit: [[1.0, 0.3, 0.72], [P.x, T + 0.1, P.z]],
    view: [[P.x + 0.62, 1.36, P.z + 0.92], [P.x, T + 0.04, P.z]],
  });
}

/* ── Project shelf: BrickCast, LensTile, the failures drawer ────────── */
function buildShelf(kit, world, g) {
  const M = kit.mat;
  const X0 = -4.2, X1 = -2.0, ZB = -4.5, D = 0.38;
  const cx = (X0 + X1) / 2, zc = ZB + D / 2;
  const root = new THREE.Group();
  // cabinet with two drawers
  kit.box(X1 - X0, 0.44, D, M.plastic, cx, 0.22, zc, root).castShadow = true;
  kit.box(X1 - X0 + 0.02, 0.02, D + 0.02, M.oakDark, cx, 0.45, zc, root);
  const leftFront = kit.box((X1 - X0) / 2 - 0.03, 0.36, 0.016, M.plasticMid, cx - (X1 - X0) / 4, 0.22, ZB + D + 0.008, root);
  leftFront.castShadow = false;
  kit.box(0.12, 0.012, 0.012, M.steelLight, cx - (X1 - X0) / 4, 0.33, ZB + D + 0.02, root);
  // uprights and shelves
  for (const x of [X0 + 0.02, cx, X1 - 0.02]) kit.box(0.025, 1.45, 0.025, M.steelDark, x, 0.46 + 0.725, ZB + D - 0.02, root);
  for (const x of [X0 + 0.02, cx, X1 - 0.02]) kit.box(0.025, 1.45, 0.025, M.steelDark, x, 0.46 + 0.725, ZB + 0.03, root);
  for (const y of [1.0, 1.5, 1.9]) kit.box(X1 - X0, 0.025, D, M.oak, cx, y, zc, root).receiveShadow = true;

  // failures drawer (right)
  const drawer = new THREE.Group();
  drawer.position.set(cx + (X1 - X0) / 4, 0, 0);
  drawer.userData.dynamic = true;
  const dw = (X1 - X0) / 2 - 0.03;
  kit.box(dw, 0.36, 0.016, M.plasticMid, 0, 0.22, ZB + D + 0.008, drawer);
  kit.box(0.12, 0.012, 0.012, M.steelLight, 0, 0.33, ZB + D + 0.02, drawer);
  const lbl = kit.labelPlane('LOG // FAILED ITERATIONS', 0.5, { size: 28, color: '#d8d4cc', spacing: 4 });
  lbl.position.set(0, 0.2, ZB + D + 0.0175);
  drawer.add(lbl);
  // tray
  const trayD = D - 0.06;
  kit.box(dw - 0.04, 0.008, trayD, M.plastic, 0, 0.08, ZB + D - trayD / 2, drawer);
  for (const sx of [-1, 1]) kit.box(0.008, 0.2, trayD, M.plastic, sx * (dw / 2 - 0.02), 0.18, ZB + D - trayD / 2, drawer);
  kit.box(dw - 0.04, 0.2, 0.008, M.plastic, 0, 0.18, ZB + 0.06, drawer);
  // contents
  const items = new THREE.Group();
  items.position.set(0, 0.084, ZB + D - trayD / 2);
  const warped = new THREE.BoxGeometry(0.148, 0.004, 0.053, 12, 1, 4);
  const wp = warped.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i) / 0.074, z = wp.getZ(i) / 0.0265;
    wp.setY(i, wp.getY(i) + 0.012 * Math.max(0, x) ** 3 + 0.006 * Math.max(0, -z) ** 2);
  }
  warped.computeVertexNormals();
  const wt = new THREE.Mesh(warped, M.plastic);
  wt.position.set(-0.3, 0.006, -0.05);
  wt.rotation.y = 0.2;
  items.add(wt);
  const enc = new THREE.Group();
  enc.position.set(-0.08, 0.025, 0.03);
  enc.rotation.y = -0.4;
  kit.box(0.09, 0.05, 0.06, M.pla, 0.01, 0, 0, enc);
  kit.box(0.03, 0.05, 0.035, M.pla, -0.05, 0, 0.012, enc);
  items.add(enc);
  const ringMis = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.007, 8, 20), M.plaWarm);
  ringMis.rotation.x = Math.PI / 2;
  ringMis.position.set(0.12, 0.007, -0.04);
  items.add(ringMis);
  kit.cyl(0.016, 0.016, 0.05, M.plaGrey, 14, 0.12, 0.03, 0.05, items).rotation.z = Math.PI / 2;
  const v2 = new THREE.Mesh(bladeGeometry(0.12, 0.024, 1.2, 0.03), M.plaWarm);
  v2.rotation.set(Math.PI / 2, 0, 0.6);
  v2.position.set(0.3, 0.006, 0.0);
  items.add(v2);
  for (const [txt, x, z] of [['V1', -0.3, 0.06], ['V2', -0.06, 0.1], ['V3', 0.15, 0.1], ['V1', 0.32, 0.09]]) {
    const t = kit.labelPlane(txt, 0.03, { size: 60, color: '#1a1a1c', bg: '#e8e4dc', w: 128, h: 96 });
    t.rotation.x = -Math.PI / 2;
    t.position.set(x, 0.002, z);
    items.add(t);
  }
  drawer.add(items);
  kit.bake(drawer);
  root.add(drawer);

  // BrickCast triptych on the middle shelf
  const bc = brickCast(kit);
  world.shared.brickLayers = bc.layers;
  const plinths = [-0.3, 0, 0.3];
  ['MESH', 'GRID', 'BRICKS'].forEach((txt, i) => {
    const px = -3.15 + plinths[i];
    kit.box(0.17, 0.04, 0.17, M.plastic, px, 1.0125 + 0.02, zc + 0.02, root);
    const l = kit.labelPlane(txt, 0.07, { size: 40, color: '#bdb8ae' });
    l.position.set(px, 1.0325, zc + 0.106);
    root.add(l);
  });
  bc.mesh.position.set(-3.45, 1.0525, zc + 0.02);
  bc.grid.position.set(-3.15, 1.0525, zc + 0.02);
  bc.bricks.position.set(-2.85, 1.0525, zc + 0.02);
  bc.studs.position.copy(bc.bricks.position);
  root.add(bc.mesh, bc.grid, bc.bricks, bc.studs);

  // LensTile case + spare tiles on the top shelf
  const arts = [tileArtTexture(kit, 'orbits'), tileArtTexture(kit, 'mooncamp'), tileArtTexture(kit, 'bricks')];
  const caseG = new THREE.Group();
  caseG.position.set(-2.52, 1.5125, zc + 0.03);
  caseG.rotation.y = -0.15;
  kit.roundBox(0.168, 0.044, 0.066, 0.016, M.plaGrey, 0, 0.022, 0, caseG).castShadow = true;
  const tileMat = new THREE.MeshStandardMaterial({ map: arts[0], roughness: 0.6, name: 'caseTile' });
  const tile = new THREE.Group();
  tile.userData.dynamic = true;
  kit.box(0.148, 0.004, 0.053, M.plastic, 0, 0, 0, tile);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.148, 0.053), tileMat);
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.0021;
  tile.add(face);
  tile.position.y = 0.046;
  kit.bake(tile);
  caseG.add(tile);
  root.add(caseG);
  for (const [i, x] of [[1, -2.32], [2, -2.75]]) {
    const st = new THREE.Group();
    st.position.set(x, 1.5125, ZB + 0.06);
    st.rotation.x = -0.25;
    kit.box(0.148, 0.053, 0.004, M.plastic, 0, 0.0265, 0, st);
    const f = kit.decal(0.148, 0.053, 592, 212, (c, w, h) => drawTileArt(c, w, h, i === 1 ? 'mooncamp' : 'bricks'), { lit: true });
    f.position.set(0, 0.0265, 0.0021);
    st.add(f);
    root.add(st);
  }
  // supplies
  for (const [x, y] of [[-3.95, 1.5125], [-3.7, 1.5125]]) {
    const sp = new THREE.Group();
    sp.position.set(x, y + 0.1, zc);
    for (const s of [-1, 1]) { const f = kit.cyl(0.1, 0.1, 0.004, M.plastic, 28, 0, s * 0.034, 0, sp); f.rotation.x = 0; }
    kit.cyl(0.086, 0.086, 0.06, x < -3.8 ? M.pla : M.plastic, 28, 0, 0, 0, sp);
    sp.rotation.x = Math.PI / 2;
    root.add(sp);
  }
  const box = kit.box(0.22, 0.14, 0.2, kit.tint(0x6b5a45, 'matte'), -3.85, 1.0125 + 0.07, zc, root);
  box.rotation.y = 0.08;
  const boxLbl = kit.labelPlane('PLA · 1.75', 0.12, { size: 40, color: '#1a1a1c' });
  boxLbl.position.set(-3.85, 1.0125 + 0.08, zc + 0.101);
  root.add(boxLbl);
  g.add(root);
  g.add(kit.blob(2.5, 0.7, cx, zc + 0.05));

  /* state + API */
  const st = { open: 0, target: 0, swap: null, art: 0, run: null };
  world.shared.drawer = {
    get open() { return st.target > 0.5; },
    set(v, reduced) { st.target = v ? 1 : 0; if (reduced) st.open = st.target; },
  };
  world.shared.lenstile = {
    swap(reduced) {
      if (st.swap) return false;
      if (reduced) { st.art = (st.art + 1) % arts.length; tileMat.map = arts[st.art]; return true; }
      st.swap = { t: 0, swapped: false };
      return true;
    },
  };
  world.shared.brickcast = { run(reduced) { if (reduced) { bc.reveal(1); return; } st.run = { t: 0 }; } };

  world.onUpdate((dt) => {
    if (st.open !== st.target) {
      st.open = THREE.MathUtils.clamp(st.open + Math.sign(st.target - st.open) * dt / 0.5, 0, 1);
      drawer.position.z = ease.inOutCubic(st.open) * 0.3;
    }
    if (st.swap) {
      const s = st.swap;
      s.t = Math.min(1, s.t + dt / 0.7);
      tile.position.y = 0.046 + Math.sin(Math.PI * s.t) * 0.035;
      tile.rotation.z = Math.sin(Math.PI * s.t) * 0.12;
      if (!s.swapped && s.t > 0.5) { s.swapped = true; st.art = (st.art + 1) % arts.length; tileMat.map = arts[st.art]; }
      if (s.t >= 1) st.swap = null;
    }
    if (st.run) {
      st.run.t += dt / 3.6;
      bc.reveal(Math.min(1, st.run.t));
      if (st.run.t >= 1) st.run = null;
    }
  });

  world.addBox(X0 - 0.05, X1 + 0.05, ZB, ZB + D + 0.05);
  world.addOccluder([X1 - X0, 0.46, D], [cx, 0.23, zc]);
  world.addHotspot({
    id: 'brickcast', zone: 'shelf', projectId: 'bc',
    anchor: [-3.15, 1.26, zc + 0.12],
    hit: [[0.9, 0.3, 0.3], [-3.15, 1.12, zc + 0.02]],
    view: [[-3.1, 1.34, -3.28], [-3.15, 1.1, zc]],
  });
  world.addHotspot({
    id: 'lenstile-case', zone: 'shelf', projectId: 'lt',
    anchor: [-2.52, 1.66, zc + 0.08],
    hit: [[0.62, 0.22, 0.32], [-2.52, 1.6, zc + 0.02]],
    view: [[-2.42, 1.76, -3.45], [-2.52, 1.56, zc]],
  });
  world.addHotspot({
    id: 'failed', zone: 'shelf',
    anchor: [cx + (X1 - X0) / 4, 0.5, ZB + D + 0.05],
    hit: [[dw + 0.04, 0.44, 0.42], [cx + (X1 - X0) / 4, 0.22, ZB + D - 0.1]],
    view: [[cx + (X1 - X0) / 4, 1.32, -3.25], [cx + (X1 - X0) / 4, 0.2, ZB + D + 0.12]],
  });
}

/* A miniature of the idea: voxelize a habitat module, then pack each layer
   greedily into 2×2 / 2×1 / 1×1 bricks, alternating orientation per layer. */
function brickCast(kit) {
  const M = kit.mat;
  const R = 0.062, HC = 0.03, V = 0.0124;
  const N = Math.ceil((2 * R) / V);
  const layersN = Math.ceil((HC + R) / V);
  const inside = (x, y, z) => (y < HC ? x * x + z * z <= R * R : x * x + (y - HC) ** 2 + z * z <= R * R);
  const occ = [];
  for (let l = 0; l < layersN; l++) {
    const layer = [];
    for (let i = 0; i < N; i++) {
      layer.push([]);
      for (let k = 0; k < N; k++) {
        const x = (i + 0.5) * V - R, z = (k + 0.5) * V - R, y = (l + 0.5) * V;
        layer[i].push(inside(x, y, z));
      }
    }
    occ.push(layer);
  }
  const palette = ['#3a3a3d', '#56565a', '#9c958b', '#bfb8ad', '#d9d4ca'];
  const layers = [];
  const brickList = [];
  for (let l = 0; l < layersN; l++) {
    const used = occ[l].map((row) => row.map(() => false));
    const bricks = [];
    const shapes = l % 2 ? [[2, 2], [1, 2], [2, 1], [1, 1]] : [[2, 2], [2, 1], [1, 2], [1, 1]];
    for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
      if (!occ[l][i][k] || used[i][k]) continue;
      for (const [w, d] of shapes) {
        let ok = i + w <= N && k + d <= N;
        for (let a = 0; ok && a < w; a++) for (let b = 0; ok && b < d; b++) ok = occ[l][i + a][k + b] && !used[i + a][k + b];
        if (!ok) continue;
        for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) used[i + a][k + b] = true;
        const color = l * V < HC ? palette[(i + k + l) % 2] : palette[2 + Math.min(2, Math.floor(((l * V - HC) / R) * 3))];
        bricks.push({ x: i, z: k, w, d, color });
        brickList.push({ l, i, k, w, d, color });
        break;
      }
    }
    layers.push({ size: N, bricks });
  }

  // Mesh view: low-poly, flat-shaded, with its wireframe
  const meshG = new THREE.Group();
  const flat = new THREE.MeshStandardMaterial({ color: 0x8f8e8b, roughness: 0.7, flatShading: true, name: 'bcMesh' });
  const cylG = new THREE.CylinderGeometry(R, R, HC, 10, 1);
  cylG.translate(0, HC / 2, 0);
  const domeG = new THREE.SphereGeometry(R, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  domeG.translate(0, HC, 0);
  const wirePts = [];
  for (const geo of [cylG, domeG]) {
    meshG.add(new THREE.Mesh(geo, flat));
    const wf = new THREE.WireframeGeometry(geo).attributes.position;
    for (let i = 0; i < wf.count; i++) wirePts.push(new THREE.Vector3(wf.getX(i), wf.getY(i), wf.getZ(i)));
  }
  meshG.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wirePts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })));

  // Grid view
  const cells = [];
  for (let l = 0; l < layersN; l++) for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) if (occ[l][i][k]) cells.push([l, i, k]);
  const grid = new THREE.InstancedMesh(new THREE.BoxGeometry(V * 0.5, V * 0.5, V * 0.5), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.6, name: 'bcGrid' }), cells.length);
  const m4 = new THREE.Matrix4();
  cells.forEach(([l, i, k], idx) => { m4.makeTranslation((i + 0.5) * V - R, (l + 0.5) * V, (k + 0.5) * V - R); grid.setMatrixAt(idx, m4); });
  grid.userData.keep = true;

  // Bricks view
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, name: 'bcBricks' });
  const bricks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), brickMat, brickList.length);
  const gap = 0.0007;
  const col = new THREE.Color();
  brickList.forEach((b, idx) => {
    m4.makeScale(b.w * V - gap, V - gap, b.d * V - gap).setPosition(b.i * V + (b.w * V) / 2 - R, (b.l + 0.5) * V, b.k * V + (b.d * V) / 2 - R);
    bricks.setMatrixAt(idx, m4);
    bricks.setColorAt(idx, col.set(b.color));
  });
  bricks.userData.keep = true;
  bricks.castShadow = true;
  const studCells = [];
  brickList.forEach((b) => {
    for (let a = 0; a < b.w; a++) for (let c = 0; c < b.d; c++) {
      const above = b.l + 1 < layersN && occ[b.l + 1][b.i + a][b.k + c];
      if (!above) studCells.push([b.l, b.i + a, b.k + c, b.color]);
    }
  });
  const studs = new THREE.InstancedMesh(new THREE.CylinderGeometry(V * 0.3, V * 0.3, V * 0.18, 8), brickMat, studCells.length);
  studCells.forEach(([l, i, k, c], idx) => {
    m4.makeTranslation((i + 0.5) * V - R, (l + 1) * V + V * 0.09, (k + 0.5) * V - R);
    studs.setMatrixAt(idx, m4);
    studs.setColorAt(idx, col.set(c));
  });
  studs.userData.keep = true;

  // progressive reveal for "Run conversion": grid first, then bricks
  const brickStarts = [], studStarts = [];
  let bi = 0, si = 0;
  for (let l = 0; l <= layersN; l++) {
    while (bi < brickList.length && brickList[bi].l < l) bi++;
    while (si < studCells.length && studCells[si][0] < l) si++;
    brickStarts.push(bi);
    studStarts.push(si);
  }
  const cellStarts = [];
  let ci = 0;
  for (let l = 0; l <= layersN; l++) { while (ci < cells.length && cells[ci][0] < l) ci++; cellStarts.push(ci); }
  const reveal = (p) => {
    const pg = Math.min(1, p / 0.45), pb = Math.max(0, (p - 0.45) / 0.55);
    grid.count = cellStarts[Math.round(pg * layersN)];
    bricks.count = brickStarts[Math.round(pb * layersN)];
    studs.count = pb >= 1 ? studCells.length : studStarts[Math.round(pb * layersN)];
  };
  return { layers, mesh: meshG, grid, bricks, studs, reveal };
}
