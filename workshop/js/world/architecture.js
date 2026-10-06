/* ==========================================================================
   architecture.js — corridor, door, room shell, ceiling, main lights.

   The plan is deliberately invented: an irregular studio with chamfered
   corners, a gallery wall angled outward and a semicircular apse — nothing
   about it corresponds to a real building. The ceiling coffer carries the
   same Keplerian traces as the portfolio's hero canvas.
   ========================================================================== */
import { THREE, ease } from './kit.js';

export const H = 3.4;
export const DOOR = { x0: -0.55, x1: 0.55, h: 2.3, zIn: 4.5, zOut: 4.7, z: 4.6 };
export const CORRIDOR = { x: 1.1, z0: 4.7, z1: 9.2, h: 2.8 };
export const APSE = { x: 0, z: -4.5, r: 1.8 };
export const COFFER = { x: 0, z: -0.3, r: 2.4, depth: 0.32 };
export const GALLERY_WALL = { a: [-5.6, -3.4], b: [-4.7, 4.5] };
export const BOUNDS = { minX: -6, maxX: 6, minZ: -6.6, maxZ: 9.3 };

/* Room outline, clockwise from the door's east jamb (x, z). The apse arc is
   inserted between [1.8,-4.5] and [-1.8,-4.5]. */
function roomOutline(arcSegs) {
  const pts = [[0.6, 4.5], [4.5, 4.5], [5.5, 3.5], [5.5, -3.0], [4.2, -4.5], [1.8, -4.5]];
  for (let i = 1; i < arcSegs; i++) {
    const a = (i / arcSegs) * Math.PI;
    pts.push([APSE.x + APSE.r * Math.cos(a), APSE.z - APSE.r * Math.sin(a)]);
  }
  pts.push([-1.8, -4.5], [-4.3, -4.5], [-5.6, -3.4], [-4.7, 4.5], [-0.6, 4.5]);
  return pts;
}

/* Homepage orbit shapes (script.js → initOrbitalCanvas), mirrored here so the
   ceiling and the hero canvas draw the same system. */
export const ORBITS = {
  init: [
    { mass: 1000, r0: 0 },
    { mass: 10, r0: 60 },
    { mass: 50, r0: 110 },
    { mass: 0.5, r0: 35 },
    { mass: 150, r0: 180 },
  ],
  shapes: [
    { e: 0.10, tilt: 0.00, stretch: 1.00 },
    { e: 0.55, tilt: 1.20, stretch: 0.58 },
    { e: 0.32, tilt: 0.55, stretch: 0.68 },
    { e: 0.50, tilt: -0.80, stretch: 0.52 },
  ],
  G: 0.8,
  advance: 0.18 * 60,   // homepage: 0.18 trace points per frame at 60 fps
};

export function keplerTrace(r0, shape, ptsRef = 360) {
  const { e, tilt, stretch } = shape;
  const p = r0 * (1 + e);
  const n = Math.max(32, Math.round(ptsRef * Math.pow(r0 / 180, 1.5)));
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const out = [];
  for (let k = 0; k < n; k++) {
    const th = (k / n) * Math.PI * 2;
    const r = p / (1 + e * Math.cos(th));
    const x = r * Math.cos(th), y = r * Math.sin(th);
    out.push([x * c - y * s, (x * s + y * c) * stretch]);
  }
  return out;
}

export function buildArchitecture(kit, world) {
  const g = new THREE.Group();
  const M = kit.mat;
  const q = kit.q;

  const plasterInner = M.plaster.clone();
  plasterInner.side = THREE.BackSide;
  plasterInner.name = 'plasterInner';
  const ceilingInner = M.ceiling.clone();
  ceilingInner.side = THREE.BackSide;
  ceilingInner.name = 'ceilingInner';
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.5, metalness: 0.25, name: 'door' });

  /* ── Floor & ceiling ─────────────────────────────────────────────── */
  const outline = roomOutline(kit.seg(16));
  const floorShape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  // Close the doorway gap so the floor meets the corridor floor
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape), M.concrete);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  M.concrete.map.repeat.set(0.28, 0.28);

  const sill = kit.box(1.2, 0.012, DOOR.zOut - DOOR.zIn, M.steelDark, 0, 0.006, (DOOR.zIn + DOOR.zOut) / 2, g);
  sill.receiveShadow = true;

  const ceilShape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)));
  const hole = new THREE.Path();
  hole.absarc(COFFER.x, COFFER.z, COFFER.r, 0, Math.PI * 2, true);
  ceilShape.holes.push(hole);
  const ceiling = new THREE.Mesh(new THREE.ShapeGeometry(ceilShape, kit.seg(24)), M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  g.add(ceiling);

  /* ── Walls ───────────────────────────────────────────────────────── */
  const centre = new THREE.Vector2(0, -0.5);
  const straight = [];
  for (let i = 0; i < outline.length - 1; i++) {
    const [ax, az] = outline[i], [bx, bz] = outline[i + 1];
    world.addWall(ax, az, bx, bz, H);
    const onArc = Math.hypot(ax - APSE.x, az - APSE.z) < APSE.r + 0.01 && Math.hypot(bx - APSE.x, bz - APSE.z) < APSE.r + 0.01 && az < APSE.z + 0.001 && bz < APSE.z + 0.001;
    if (!onArc) straight.push([ax, az, bx, bz]);
  }
  for (const [ax, az, bx, bz] of straight) {
    const len = Math.hypot(bx - ax, bz - az);
    const isGallery = Math.abs(ax - GALLERY_WALL.a[0]) < 0.01 && Math.abs(az - GALLERY_WALL.a[1]) < 0.01;
    const isSouth = Math.abs(az - 4.5) < 0.01 && Math.abs(bz - 4.5) < 0.01;
    const mat = isGallery ? M.gallery : M.plaster;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, H), mat);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    let nx = -(bz - az), nz = bx - ax;
    if (nx * (centre.x - mx) + nz * (centre.y - mz) < 0) { nx = -nx; nz = -nz; }
    wall.position.set(mx, H / 2, mz);
    wall.rotation.y = Math.atan2(nx, nz);
    wall.receiveShadow = !isSouth;
    g.add(wall);
    // skirting: a thin dark band that makes walls read as built, not rendered
    const sk = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.08), M.black);
    sk.position.set(mx + nx / Math.hypot(nx, nz) * 0.004, 0.04, mz + nz / Math.hypot(nx, nz) * 0.004);
    sk.rotation.y = wall.rotation.y;
    g.add(sk);
  }
  // header above the doorway (inside)
  const header = new THREE.Mesh(new THREE.PlaneGeometry(1.2, H - DOOR.h), M.plaster);
  header.position.set(0, DOOR.h + (H - DOOR.h) / 2, DOOR.zIn);
  header.rotation.y = Math.PI;
  g.add(header);

  // apse: one smooth curved wall with faint "projected" orbits
  const apseTex = apseOrbitTexture(kit);
  const apseMat = new THREE.MeshStandardMaterial({
    color: 0x131316, roughness: 0.95, side: THREE.BackSide, emissive: 0xffffff, emissiveMap: apseTex, emissiveIntensity: 0.28, name: 'apse',
  });
  const apse = new THREE.Mesh(new THREE.CylinderGeometry(APSE.r, APSE.r, H, kit.seg(40), 1, true, Math.PI / 2, Math.PI), apseMat);
  apse.position.set(APSE.x, H / 2, APSE.z);
  apse.userData.keep = true;
  g.add(apse);
  world.onNight((t) => { apseMat.emissiveIntensity = 0.28 + 0.75 * t; });

  /* ── Ceiling coffer with the homepage orbits ─────────────────────── */
  const coffer = new THREE.Mesh(new THREE.CylinderGeometry(COFFER.r, COFFER.r, COFFER.depth, kit.seg(48), 1, true), ceilingInner);
  coffer.position.set(COFFER.x, H + COFFER.depth / 2, COFFER.z);
  g.add(coffer);
  const cofferTop = new THREE.Mesh(new THREE.CircleGeometry(COFFER.r, kit.seg(48)), M.ceiling);
  cofferTop.rotation.x = Math.PI / 2;
  cofferTop.position.set(COFFER.x, H + COFFER.depth, COFFER.z);
  g.add(cofferTop);
  const ledRingMat = new THREE.MeshBasicMaterial({ color: 0x5c5852, name: 'ledRing' });
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(COFFER.r - 0.02, 0.006, 6, kit.seg(96)), ledRingMat);
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.set(COFFER.x, H + 0.02, COFFER.z);
  ledRing.userData.keep = true;
  g.add(ledRing);
  const ringDay = new THREE.Color(0x5c5852);
  world.onNight((t) => ledRingMat.color.copy(ringDay).multiplyScalar(1 - 0.8 * t));

  buildCeilingOrbits(kit, world, g);

  /* ── Corridor (arrival) ──────────────────────────────────────────── */
  const cLen = CORRIDOR.z1 - CORRIDOR.z0;
  const cMid = (CORRIDOR.z0 + CORRIDOR.z1) / 2;
  const cFloor = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR.x * 2, cLen), M.concrete);
  cFloor.rotation.x = -Math.PI / 2;
  cFloor.position.set(0, 0, cMid);
  cFloor.receiveShadow = true;
  g.add(cFloor);
  const cCeil = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR.x * 2, cLen), M.ceiling);
  cCeil.rotation.x = Math.PI / 2;
  cCeil.position.set(0, CORRIDOR.h, cMid);
  g.add(cCeil);
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(cLen, CORRIDOR.h), M.corridor);
    w.position.set(side * CORRIDOR.x, CORRIDOR.h / 2, cMid);
    w.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(w);
    world.addWall(side * CORRIDOR.x, CORRIDOR.z0, side * CORRIDOR.x, CORRIDOR.z1, CORRIDOR.h);
    for (let z = CORRIDOR.z0 + 1.1; z < CORRIDOR.z1; z += 1.15) {
      kit.box(0.004, CORRIDOR.h, 0.012, M.black, side * (CORRIDOR.x - 0.002), CORRIDOR.h / 2, z, g);
    }
  }
  const end = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR.x * 2, CORRIDOR.h), M.corridor);
  end.position.set(0, CORRIDOR.h / 2, CORRIDOR.z1);
  end.rotation.y = Math.PI;
  g.add(end);
  world.addWall(-CORRIDOR.x, CORRIDOR.z1, CORRIDOR.x, CORRIDOR.z1, CORRIDOR.h);
  // outer face of the workshop wall
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR.x - 0.6, CORRIDOR.h), M.corridor);
    w.position.set(side * (0.6 + (CORRIDOR.x - 0.6) / 2), CORRIDOR.h / 2, DOOR.zOut);
    g.add(w);
    // reveal (wall thickness) at the jambs
    const r = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.zOut - DOOR.zIn, DOOR.h), M.plaster);
    r.position.set(side * 0.6, DOOR.h / 2, (DOOR.zIn + DOOR.zOut) / 2);
    r.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(r);
    world.addWall(side * 0.6, DOOR.zIn, side * 0.6, DOOR.zOut);
  }
  const outHeader = new THREE.Mesh(new THREE.PlaneGeometry(1.2, CORRIDOR.h - DOOR.h), M.corridor);
  outHeader.position.set(0, DOOR.h + (CORRIDOR.h - DOOR.h) / 2, DOOR.zOut);
  g.add(outHeader);
  const headReveal = new THREE.Mesh(new THREE.PlaneGeometry(1.2, DOOR.zOut - DOOR.zIn), M.plaster);
  headReveal.rotation.x = Math.PI / 2;
  headReveal.position.set(0, DOOR.h, (DOOR.zIn + DOOR.zOut) / 2);
  g.add(headReveal);
  world.addWall(-CORRIDOR.x, DOOR.zOut, -0.6, DOOR.zOut);
  world.addWall(0.6, DOOR.zOut, CORRIDOR.x, DOOR.zOut);

  // a single line of light along the corridor ceiling, pointing at the door
  kit.box(0.012, 0.004, cLen - 0.6, M.ledCool, 0, CORRIDOR.h - 0.003, cMid + 0.15, g);

  // an orbit inlaid in the corridor wall — the first hint of what's inside
  const arcPts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const y = Math.sin(a) * 0.62, z = Math.cos(a) * 1.55;
    const tilt = 0.18;
    arcPts.push(new THREE.Vector3(-CORRIDOR.x + 0.003, 1.55 + y * Math.cos(tilt) + z * Math.sin(tilt) * 0.1, 7.05 + z));
  }
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), M.line);
  g.add(arc);
  kit.sphere(0.018, M.ledWhite, 10, -CORRIDOR.x + 0.01, 1.55 + 0.62 * 0.98, 7.05 + 0.25, g);
  kit.sphere(0.03, M.ledWarm, 10, -CORRIDOR.x + 0.01, 1.55, 7.05, g);

  // stencil above the door
  const stencil = kit.labelPlane('SYS_00 // WORKSHOP', 0.62, { size: 30, color: '#d8d4cc', spacing: 6, opacity: 0.85 });
  stencil.position.set(0, 2.55, DOOR.zOut + 0.003);
  g.add(stencil);

  // warm sconce beside the door
  const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, kit.seg(16), 1, false, 0, Math.PI), M.steelDark);
  sconce.position.set(-CORRIDOR.x, 2.02, 5.35);
  g.add(sconce);
  kit.box(0.06, 0.004, 0.12, M.ledWarm, -CORRIDOR.x + 0.035, 1.92, 5.35, g);
  const sconceWash = kit.wash(1.6, 1.9, 0xffc78a, 0.16);
  sconceWash.position.set(-CORRIDOR.x + 0.004, 1.4, 5.35);
  sconceWash.rotation.y = Math.PI / 2;
  g.add(sconceWash);
  const sconceLight = new THREE.PointLight(0xffb070, 2.6, 0, 2);
  sconceLight.position.set(-CORRIDOR.x + 0.25, 1.85, 5.35);
  g.add(world.addLight(sconceLight, 0.7));

  /* ── Door ────────────────────────────────────────────────────────── */
  // steel frame trims on both faces
  for (const z of [DOOR.zIn - 0.005, DOOR.zOut + 0.005]) {
    kit.box(0.05, DOOR.h + 0.05, 0.01, M.steelDark, -0.625, DOOR.h / 2, z, g);
    kit.box(0.05, DOOR.h + 0.05, 0.01, M.steelDark, 0.625, DOOR.h / 2, z, g);
    kit.box(1.3, 0.05, 0.01, M.steelDark, 0, DOOR.h + 0.025, z, g);
  }
  const hinge = new THREE.Group();
  hinge.position.set(DOOR.x0, 0, DOOR.z);
  const leaf = new THREE.Group();
  const W = DOOR.x1 - DOOR.x0, T = 0.05;
  const s0 = 0.70, s1 = 0.81, sy0 = 0.45, sy1 = 1.95;
  kit.box(s0, DOOR.h - 0.01, T, doorMat, s0 / 2, DOOR.h / 2, 0, leaf);
  kit.box(W - s1 - 0.005, DOOR.h - 0.01, T, doorMat, s1 + (W - s1) / 2 - 0.0025, DOOR.h / 2, 0, leaf);
  kit.box(s1 - s0, sy0, T, doorMat, (s0 + s1) / 2, sy0 / 2, 0, leaf);
  kit.box(s1 - s0, DOOR.h - sy1 - 0.01, T, doorMat, (s0 + s1) / 2, (sy1 + DOOR.h) / 2, 0, leaf);
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(s1 - s0, sy1 - sy0), M.frosted);
  slit.position.set((s0 + s1) / 2, (sy0 + sy1) / 2, 0);
  leaf.add(slit);
  const slitBack = slit.clone();
  slitBack.rotation.y = Math.PI;
  leaf.add(slitBack);
  for (const side of [-1, 1]) {
    kit.cyl(0.011, 0.011, 0.55, M.steelLight, 10, W - 0.09, 1.1, side * 0.06, leaf);
    kit.box(0.012, 0.012, 0.05, M.steelLight, W - 0.09, 0.88, side * 0.035, leaf);
    kit.box(0.012, 0.012, 0.05, M.steelLight, W - 0.09, 1.32, side * 0.035, leaf);
  }
  for (const y of [0.3, 1.15, 2.0]) kit.cyl(0.012, 0.012, 0.12, M.steel, 8, 0, y, 0, leaf);
  leaf.traverse((o) => { if (o.isMesh && o.material !== M.frosted) o.castShadow = true; });
  kit.mergeStatic(leaf);
  hinge.add(leaf);
  hinge.userData.dynamic = true;
  g.add(hinge);

  const doorClosed = world.addWall(DOOR.x0, DOOR.z, DOOR.x1, DOOR.z);
  const doorOpenSeg = world.addWall(DOOR.x0, DOOR.z, DOOR.x0 - 0.2, DOOR.z - 1.08);
  doorOpenSeg.on = false;
  const doorOcc = world.addOccluder([1.1, DOOR.h, 0.06], [0, DOOR.h / 2, DOOR.z]);

  const door = {
    t: 0, target: 0, speed: 1 / 1.1, onChange: null,
    get isOpen() { return this.target > 0.5; },
    open(duration = 1.1) { this.target = 1; this.speed = 1 / Math.max(0.05, duration); },
    close(duration = 1.1) { this.target = 0; this.speed = 1 / Math.max(0.05, duration); },
    setInstant(open) { this.t = this.target = open ? 1 : 0; apply(); },
  };
  const OPEN_ANGLE = 1.75;
  function apply() {
    hinge.rotation.y = ease.inOutSine(door.t) * OPEN_ANGLE;
    const open = door.t > 0.35;
    doorClosed.on = !open;
    doorOpenSeg.on = open;
    doorOcc.position.x = open ? 99 : 0;
    doorOcc.updateMatrixWorld();
    world.shared.shadowsDirty = true;
  }
  world.onUpdate((dt) => {
    if (door.t === door.target) return;
    const d = door.target - door.t;
    door.t = Math.abs(d) < dt * door.speed ? door.target : door.t + Math.sign(d) * dt * door.speed;
    apply();
    door.onChange?.(door.t);
  });
  world.shared.door = door;
  world.shared.doorSlit = slit;

  /* ── Guardian-inspired doorbell (outside) ────────────────────────── */
  const bell = new THREE.Group();
  bell.position.set(0.85, 1.32, DOOR.zOut);
  kit.roundBox(0.07, 0.16, 0.024, 0.012, M.blackGloss, 0, 0, 0.012, bell);
  kit.box(0.045, 0.02, 0.002, M.plasticMid, 0, 0.052, 0.025, bell);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, kit.seg(20)), M.steelDark);
  btn.rotation.x = Math.PI / 2;
  btn.position.set(0, -0.025, 0.027);
  btn.userData.keep = true;
  bell.add(btn);
  const bellLedMat = new THREE.MeshBasicMaterial({ color: 0x8aa6c8, name: 'bellLed' });
  const bellLed = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0018, 6, kit.seg(32)), bellLedMat);
  bellLed.position.set(0, -0.025, 0.026);
  bellLed.userData.keep = true;
  bell.add(bellLed);
  g.add(bell);
  const bellStates = { idle: 0x8aa6c8, ring: 0xffa040, open: 0xf4f1ea };
  let bellState = 'idle', bellPulse = 0;
  world.shared.doorbell = {
    set(state) { bellState = state; bellPulse = 0; },
    press() { btn.position.z = 0.023; setTimeout(() => { btn.position.z = 0.027; }, 160); },
  };
  world.onUpdate((dt, t, f) => {
    const c = new THREE.Color(bellStates[bellState]);
    if (bellState === 'ring' && !f.reduced) { bellPulse += dt; c.multiplyScalar(0.55 + 0.45 * (0.5 + 0.5 * Math.sin(bellPulse * 7))); }
    else if (bellState === 'idle' && !f.reduced) c.multiplyScalar(0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3)));
    bellLedMat.color.copy(c);
  });
  world.addHotspot({
    id: 'doorbell', zone: 'outside', kind: 'action',
    anchor: [0.85, 1.42, DOOR.zOut + 0.03],
    hit: [[0.16, 0.26, 0.12], [0.85, 1.32, DOOR.zOut + 0.04]],
    view: [[0.4, 1.5, 5.75], [0.85, 1.3, DOOR.zOut]],
  });

  /* ── Inside the entrance ─────────────────────────────────────────── */
  // Guardian-inspired panel: abstract status only, no PINs, no layout
  const panel = new THREE.Group();
  panel.position.set(1.2, 1.4, DOOR.zIn);
  panel.rotation.y = Math.PI;
  kit.roundBox(0.17, 0.27, 0.022, 0.014, M.blackGloss, 0, 0, 0.011, panel);
  const panelCanvas = kit.canvas(256, 384);
  const panelTex = kit.canvasTexture(panelCanvas);
  const panelScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.195), new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false, name: 'panelScreen' }));
  panelScreen.position.set(0, 0.012, 0.0235);
  panelScreen.userData.keep = true;
  panel.add(panelScreen);
  g.add(panel);
  let doorShown = null;
  function drawPanel(open) {
    const c = panelCanvas.getContext('2d');
    c.fillStyle = '#050607';
    c.fillRect(0, 0, 256, 384);
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 2;
    for (const [r, a] of [[62, 0.75], [44, 0.35], [26, 0.75]]) {
      c.globalAlpha = a;
      c.beginPath();
      c.arc(128, 120, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = open ? '#f4f1ea' : '#8aa6c8';
    c.beginPath(); c.arc(128, 120, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.font = '500 19px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.fillText('SYS_05 // ONLINE', 128, 226);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = '400 16px "JetBrains Mono", monospace';
    c.fillText(`DOOR   ${open ? 'OPEN' : 'CLOSED'}`, 128, 270);
    c.fillText('GUEST  YOU', 128, 298);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.font = '400 12px "JetBrains Mono", monospace';
    c.fillText('FICTIONAL PANEL', 128, 350);
    panelTex.needsUpdate = true;
  }
  drawPanel(false);
  world.onUpdate(() => {
    const open = door.t > 0.5;
    if (open !== doorShown) { doorShown = open; drawPanel(open); }
  });
  world.addHotspot({
    id: 'guardian-panel', zone: 'entrance', projectId: 'gs',
    anchor: [1.2, 1.6, DOOR.zIn - 0.03],
    hit: [[0.24, 0.34, 0.1], [1.2, 1.4, DOOR.zIn - 0.04]],
    view: [[1.05, 1.5, 3.55], [1.2, 1.38, DOOR.zIn]],
  });

  // light switch
  const sw = new THREE.Group();
  sw.position.set(-1.0, 1.18, DOOR.zIn);
  sw.rotation.y = Math.PI;
  kit.box(0.085, 0.12, 0.008, M.pla, 0, 0, 0.004, sw);
  const rocker = kit.box(0.034, 0.058, 0.012, M.plaGrey, 0, 0, 0.012, sw);
  rocker.userData.keep = true;
  sw.userData.dynamic = true;
  g.add(sw);
  world.shared.lightSwitch = { set(on) { rocker.rotation.x = on ? 0.16 : -0.16; } };
  world.shared.lightSwitch.set(false);
  world.addHotspot({
    id: 'light-switch', zone: 'entrance', kind: 'action',
    anchor: [-1.0, 1.3, DOOR.zIn - 0.03],
    hit: [[0.16, 0.2, 0.1], [-1.0, 1.18, DOOR.zIn - 0.04]],
    view: [[-0.75, 1.5, 3.4], [-1.0, 1.2, DOOR.zIn]],
  });

  // the workshop log plaque (drawn into the lit atlas)
  const plaque = kit.decal(0.46, 0.135, 1024, 300, (c) => {
    c.fillStyle = '#26272a';
    c.fillRect(0, 0, 1024, 300);
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.lineWidth = 2;
    c.strokeRect(14, 14, 996, 272);
    c.fillStyle = '#e9e6df';
    c.font = '500 54px "JetBrains Mono", monospace';
    c.fillText('LOG_ENTRY // WORKSHOP', 60, 120);
    c.fillStyle = 'rgba(233,230,223,0.6)';
    c.font = 'italic 300 46px "Cormorant Garamond", Georgia, serif';
    c.fillText('built from the things I work on', 60, 210);
  }, { lit: true });
  plaque.position.set(2.6, 1.55, DOOR.zIn - 0.004);
  plaque.rotation.y = Math.PI;
  g.add(plaque);
  world.addHotspot({
    id: 'workshop-log', zone: 'entrance',
    anchor: [2.6, 1.68, DOOR.zIn - 0.03],
    hit: [[0.56, 0.22, 0.08], [2.6, 1.55, DOOR.zIn - 0.04]],
    view: [[2.45, 1.6, 3.5], [2.6, 1.55, DOOR.zIn]],
  });

  world.addHotspot({
    id: 'exit-door', zone: 'entrance', kind: 'action',
    anchor: [0.15, 1.85, DOOR.zIn - 0.1],
    hit: [[1.1, 2.2, 0.16], [0, 1.1, DOOR.zIn - 0.1]],
    view: [[0, 1.65, 2.7], [0, 1.4, DOOR.zIn]],
  });

  world.addLocation('entrance', [0.25, 1.65, 2.35], [0.2, 1.35, 4.5], ['guardian-panel', 'light-switch', 'workshop-log', 'exit-door']);

  /* ── Lights ──────────────────────────────────────────────────────── */
  const hemi = new THREE.HemisphereLight(0xa4acbc, 0x1c1814, 4.2);
  g.add(world.addLight(hemi, 0.2));
  const fill = new THREE.AmbientLight(0x3a3530, 2.0);
  g.add(world.addLight(fill, 0.25));

  // pendant over the fabrication bench — the one real shadow caster
  const pendant = new THREE.Group();
  pendant.position.set(0, 0, -0.2);
  kit.cyl(0.004, 0.004, H - 2.42, M.black, 6, 0, 2.42 + (H - 2.42) / 2, 0, pendant);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 0.16, kit.seg(32), 1, true), M.black);
  shade.position.y = 2.34;
  pendant.add(shade);
  const shadeIn = new THREE.Mesh(new THREE.CircleGeometry(0.28, kit.seg(32)), M.ledWarm);
  shadeIn.rotation.x = Math.PI / 2;
  shadeIn.position.y = 2.27;
  pendant.add(shadeIn);
  g.add(pendant);
  const key = new THREE.SpotLight(0xffeedc, 20, 0, 0.66, 0.6, 2);
  key.position.set(0, 2.28, -0.2);
  key.target.position.set(0, 0.9, -0.2);
  if (q.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 4;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 3;
  }
  g.add(world.addLight(key, 0.18), key.target);
  world.shared.keyLight = key;

  if (q.lights >= 1) {
    const gal = new THREE.SpotLight(0xf3efe6, 24, 0, 0.62, 0.85, 2);
    gal.position.set(-2.3, 3.25, 0.75);
    gal.target.position.set(-5.1, 1.45, 0.7);
    g.add(world.addLight(gal, 1.0), gal.target);
  }

  return g;
}

/* ── Ceiling orbits: the hero canvas, overhead ───────────────────────── */
function buildCeilingOrbits(kit, world, g) {
  const traces = ORBITS.init.map((b, i) => (i === 0 ? null : keplerTrace(b.r0, ORBITS.shapes[i - 1], kit.q.orbitPoints)));
  let max = 0;
  for (const tr of traces) if (tr) for (const [x, y] of tr) max = Math.max(max, Math.abs(x), Math.abs(y));
  const s = (COFFER.r - 0.28) / max;
  const y = H + COFFER.depth - 0.012;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, depthWrite: false, name: 'ceilingOrbit' });
  const toWorld = ([x, yy]) => new THREE.Vector3(COFFER.x + x * s, y, COFFER.z + yy * s);
  const segs = [];
  for (const tr of traces) {
    if (!tr) continue;
    const pts = tr.map(toWorld);
    for (let i = 0; i < pts.length; i++) segs.push(pts[i], pts[(i + 1) % pts.length]);
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), lineMat));
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, name: 'ceilingDots' });
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 10, 8), dotMat, 5);
  dots.userData.dynamic = true;
  g.add(dots);
  const idx = traces.map((tr, i) => (tr ? Math.floor((tr.length * (i - 1)) / 4) : 0));
  const m = new THREE.Matrix4();
  const place = () => {
    for (let i = 1; i < traces.length; i++) {
      const p = toWorld(traces[i][Math.floor(idx[i]) % traces[i].length]);
      m.makeTranslation(p.x, p.y - 0.01, p.z);
      dots.setMatrixAt(i - 1, m);
    }
    m.makeScale(1.75, 1.75, 1.75).setPosition(COFFER.x, y - 0.01, COFFER.z);   // the star
    dots.setMatrixAt(4, m);
    dots.instanceMatrix.needsUpdate = true;
  };
  place();
  world.onUpdate((dt, t, f) => {
    if (f.reduced) return;
    for (let i = 1; i < traces.length; i++) idx[i] = (idx[i] + ORBITS.advance * dt) % traces[i].length;
    place();
  });
  world.onNight((t) => {
    lineMat.opacity = 0.13 + 0.45 * t;
    dotMat.opacity = 0.55 + 0.45 * t;
  });
}

/* Faint sinusoids — an ellipse wrapped onto a cylinder reads as a sine. */
function apseOrbitTexture(kit) {
  const w = 2048, h = 512;
  const c = kit.canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const orbits = [
    { y: 0.42, a: 0.10, k: 1, ph: 0.4, alpha: 0.32 },
    { y: 0.38, a: 0.18, k: 1, ph: 2.1, alpha: 0.22 },
    { y: 0.47, a: 0.06, k: 2, ph: 1.0, alpha: 0.18 },
    { y: 0.34, a: 0.24, k: 1, ph: 4.0, alpha: 0.14 },
  ];
  ctx.lineWidth = 2;
  for (const o of orbits) {
    ctx.strokeStyle = `rgba(255,255,255,${o.alpha})`;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const yy = (o.y + o.a * Math.sin((x / w) * Math.PI * 2 * o.k * 0.5 + o.ph)) * h;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
    const dx = ((o.ph * 300) % w + w) % w;
    const dy = (o.y + o.a * Math.sin((dx / w) * Math.PI * o.k + o.ph)) * h;
    ctx.fillStyle = `rgba(255,255,255,${o.alpha + 0.3})`;
    ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
  }
  return kit.canvasTexture(c);
}
