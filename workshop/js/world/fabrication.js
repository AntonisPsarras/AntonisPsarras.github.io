/* ==========================================================================
   fabrication.js — the central bench and its two printers.

   Both printers are original, stylized designs that read as "modern FDM":
   an enclosed CoreXY box and an open bed-slinger. No brand geometry, no
   logos. The enclosed one prints a LensTile carrying Aether's orbit art;
   the open one prints a MoonCamp dome. Prints grow with clipping planes,
   so the part really appears layer by layer (or line by line).
   ========================================================================== */
import { THREE } from './kit.js';
import { ORBITS, keplerTrace } from './architecture.js';

const TOP = 0.92;
const DECOR = { essential: false };   // frozen and merged on the LOW tier
const BENCH = { x: 0, z: -0.2, w: 3.0, d: 1.0 };

export function buildFabrication(kit, world) {
  const g = new THREE.Group();
  const M = kit.mat;

  /* ── The bench ─────────────────────────────────────────────────────── */
  const top = kit.box(BENCH.w, 0.05, BENCH.d, M.oak, BENCH.x, TOP - 0.025, BENCH.z, g);
  top.castShadow = top.receiveShadow = true;
  M.oak.map.repeat.set(1, 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = kit.box(0.05, TOP - 0.05, 0.05, M.steelDark, sx * (BENCH.w / 2 - 0.1), (TOP - 0.05) / 2, BENCH.z + sz * (BENCH.d / 2 - 0.08), g);
    leg.castShadow = true;
  }
  kit.box(BENCH.w - 0.2, 0.03, 0.04, M.steelDark, 0, 0.82, BENCH.z + BENCH.d / 2 - 0.08, g);
  kit.box(BENCH.w - 0.2, 0.03, 0.04, M.steelDark, 0, 0.82, BENCH.z - BENCH.d / 2 + 0.08, g);
  kit.box(BENCH.w - 0.16, 0.02, BENCH.d - 0.12, M.steelDark, 0, 0.22, BENCH.z, g).receiveShadow = true;
  // filament spools on the lower shelf
  const spoolColors = [M.pla, M.plaGrey, M.plastic, M.plaWarm];
  spoolColors.forEach((core, i) => spool(kit, g, -1.05 + i * 0.32, 0.33, BENCH.z + 0.08, core, false));
  g.add(kit.blob(3.5, 1.5, BENCH.x, BENCH.z));
  world.addBox(BENCH.x - BENCH.w / 2 - 0.02, BENCH.x + BENCH.w / 2 + 0.02, BENCH.z - BENCH.d / 2 - 0.02, BENCH.z + BENCH.d / 2 + 0.02);
  world.addOccluder([BENCH.w, TOP, BENCH.d], [BENCH.x, TOP / 2, BENCH.z]);

  /* ── Printer A: enclosed CoreXY ────────────────────────────────────── */
  const A = { x: -0.85, z: -0.32, w: 0.4, d: 0.42, h: 0.48 };
  const pa = new THREE.Group();
  pa.position.set(A.x, TOP, A.z);
  kit.box(A.w, 0.08, A.d, M.plastic, 0, 0.04, 0, pa).castShadow = true;
  kit.box(A.w, A.h - 0.08, 0.012, M.plasticMid, 0, 0.08 + (A.h - 0.08) / 2, -A.d / 2 + 0.006, pa).castShadow = true;
  for (const sx of [-1, 1]) {
    kit.box(0.012, A.h - 0.08, A.d, M.plastic, sx * (A.w / 2 - 0.006), 0.08 + (A.h - 0.08) / 2, 0, pa).castShadow = true;
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.02, A.h, 0.02, M.steelDark, sx * (A.w / 2 - 0.01), A.h / 2, sz * (A.d / 2 - 0.01), pa);
  kit.box(A.w, 0.018, A.d, M.steelDark, 0, A.h - 0.009, 0, pa);
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(A.w - 0.04, A.d - 0.04), M.glassSmoked);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = A.h + 0.001;
  pa.add(lid);
  const doorA = new THREE.Mesh(new THREE.PlaneGeometry(A.w - 0.03, A.h - 0.1), M.glassSmoked);
  doorA.position.set(0, 0.08 + (A.h - 0.1) / 2, A.d / 2 - 0.004);
  doorA.renderOrder = 3;
  pa.add(doorA);
  kit.box(0.012, 0.16, 0.012, M.steelLight, A.w / 2 - 0.04, 0.27, A.d / 2 + 0.004, pa);
  kit.box(A.w - 0.08, 0.004, 0.008, M.ledWhite, 0, A.h - 0.03, A.d / 2 - 0.05, pa);
  const glowA = kit.wash(A.w - 0.04, A.h - 0.1, 0xe8eeff, 0.2);
  glowA.position.set(0, 0.24, -A.d / 2 + 0.014);
  pa.add(glowA);
  // rails
  for (const sx of [-1, 1]) kit.box(0.012, 0.012, A.d - 0.05, M.steelLight, sx * (A.w / 2 - 0.03), 0.405, 0, pa);
  // front status screen
  const screenCanvas = kit.canvas(256, 112);
  const screenTex = kit.canvasTexture(screenCanvas);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.046), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, name: 'printerScreen' }));
  screen.position.set(-0.09, 0.04, A.d / 2 + 0.001);
  screen.userData.keep = true;
  pa.add(screen);
  // bed + print
  const bedA = new THREE.Group();
  kit.box(0.27, 0.01, 0.27, M.steelDark, 0, 0, 0, bedA);
  kit.box(0.26, 0.002, 0.26, M.plasticMid, 0, 0.006, 0, bedA);
  kit.box(0.148, 0.003, 0.053, M.plastic, 0, 0.0085, 0, bedA);
  const artTex = tileArtTexture(kit, 'orbits');
  const clipA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const artMat = new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.55, clippingPlanes: [clipA], name: 'tileArt' });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.148, 0.053), artMat);
  art.rotation.x = -Math.PI / 2;
  art.position.y = 0.0104;
  bedA.add(art);
  bedA.position.set(0, 0.17, 0.0);
  kit.bake(bedA, DECOR);
  pa.add(bedA);
  // gantry: Y carriage + X toolhead
  const gantryA = new THREE.Group();
  kit.box(A.w - 0.06, 0.016, 0.022, M.steelLight, 0, 0, 0, gantryA);
  const headA = new THREE.Group();
  kit.box(0.05, 0.06, 0.045, M.plastic, 0, -0.012, 0.014, headA);
  kit.box(0.034, 0.003, 0.002, M.ledWhite, 0, 0.0, 0.0375, headA);
  const nozzleA = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 8), M.brass);
  nozzleA.rotation.x = Math.PI;
  nozzleA.position.set(0, -0.048, 0.014);
  headA.add(nozzleA);
  kit.bake(headA, DECOR);
  gantryA.add(headA);
  gantryA.position.set(0, 0.405, 0);
  kit.bake(gantryA, DECOR);
  pa.add(gantryA);
  g.add(pa);

  world.addHotspot({
    id: 'printer-enclosed', zone: 'fabrication',
    anchor: [A.x, TOP + A.h + 0.06, A.z + 0.1],
    hit: [[A.w + 0.04, A.h + 0.04, A.d + 0.04], [A.x, TOP + A.h / 2, A.z]],
    view: [[A.x + 0.28, 1.42, 0.5], [A.x, TOP + 0.24, A.z]],
  });

  /* ── Printer B: open bed-slinger ───────────────────────────────────── */
  const B = { x: 0.9, z: -0.32 };
  const pb = new THREE.Group();
  pb.position.set(B.x, TOP, B.z);
  kit.roundBox(0.34, 0.07, 0.36, 0.02, M.plastic, 0, 0.035, 0, pb).castShadow = true;
  kit.box(0.04, 0.012, 0.34, M.steelLight, 0, 0.076, 0, pb);
  for (const sx of [-1, 1]) {
    const up = kit.box(0.032, 0.4, 0.04, M.plasticMid, sx * 0.19, 0.07 + 0.2, -0.13, pb);
    up.castShadow = true;
    kit.box(0.008, 0.36, 0.008, M.steelLight, sx * 0.19 - sx * 0.012, 0.27, -0.105, pb);
  }
  kit.box(0.42, 0.03, 0.04, M.plasticMid, 0, 0.485, -0.13, pb).castShadow = true;
  kit.box(0.07, 0.035, 0.004, M.ledCool, 0.11, 0.04, 0.181, pb);
  // spool on a side arm
  kit.box(0.02, 0.02, 0.1, M.steelDark, 0.2, 0.47, -0.08, pb);
  const spoolB = new THREE.Group();
  spool(kit, spoolB, 0, 0, 0, M.pla, true);
  spoolB.position.set(0.26, 0.47, -0.04);
  kit.bake(spoolB, DECOR);
  pb.add(spoolB);
  // bed
  const bedB = new THREE.Group();
  kit.box(0.24, 0.008, 0.24, M.steelDark, 0, 0, 0, bedB);
  const clipB = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const domeMat = M.pla.clone();
  domeMat.name = 'domePrint';
  domeMat.clippingPlanes = [clipB];
  domeMat.clipShadows = true;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.022, kit.seg(32), 1, false), domeMat);
  wall.position.y = 0.015;
  bedB.add(wall);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.045, kit.seg(32), kit.seg(16), 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.y = 0.026;
  bedB.add(dome);
  bedB.position.set(0, 0.087, 0.02);
  kit.bake(bedB, DECOR);
  pb.add(bedB);
  // gantry
  const gantryB = new THREE.Group();
  kit.box(0.38, 0.022, 0.026, M.steelLight, 0, 0, 0, gantryB);
  const headB = new THREE.Group();
  kit.box(0.05, 0.065, 0.05, M.plastic, 0, -0.01, 0.03, headB);
  kit.box(0.03, 0.003, 0.002, M.ledWhite, 0, 0.012, 0.0555, headB);
  const nozzleB = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 8), M.brass);
  nozzleB.rotation.x = Math.PI;
  nozzleB.position.set(0, -0.048, 0.03);
  headB.add(nozzleB);
  kit.bake(headB, DECOR);
  gantryB.add(headB);
  gantryB.position.set(0, 0.2, -0.13);
  kit.bake(gantryB, DECOR);
  pb.add(gantryB);
  // a live filament strand from spool to toolhead
  const strandGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => new THREE.Vector3()));
  const strand = new THREE.Line(strandGeo, new THREE.LineBasicMaterial({ color: 0xd8d4cc, transparent: true, opacity: 0.6 }));
  strand.userData.dynamic = true;
  strand.frustumCulled = false;
  pb.add(strand);
  g.add(pb);
  g.add(kit.blob(0.6, 0.6, B.x, B.z, 0.925));
  g.add(kit.blob(0.62, 0.62, A.x, A.z, 0.925));

  world.addHotspot({
    id: 'printer-open', zone: 'fabrication',
    anchor: [B.x, TOP + 0.58, B.z + 0.05],
    hit: [[0.46, 0.56, 0.46], [B.x, TOP + 0.27, B.z]],
    view: [[B.x + 0.05, 1.42, 0.52], [B.x, TOP + 0.2, B.z]],
  });
  world.shared.printerNear = new THREE.Vector3(B.x, 1.2, B.z);

  /* ── Bench samples: Smooth vs Relief, and the local-first card ─────── */
  const tiles = new THREE.Group();
  tiles.position.set(0.0, TOP, 0.1);
  const smooth = new THREE.Group();
  smooth.position.set(-0.1, 0.002, 0);
  smooth.rotation.y = 0.12;
  kit.box(0.148, 0.004, 0.053, M.plastic, 0, 0, 0, smooth);
  const smoothArt = kit.decal(0.148, 0.053, 592, 212, (c, w, h) => drawTileArt(c, w, h, 'mooncamp'), { lit: true });
  smoothArt.rotation.x = -Math.PI / 2;
  smoothArt.position.y = 0.0021;
  smooth.add(smoothArt);
  tiles.add(smooth);
  const relief = reliefTile(kit, tileArtTexture(kit, 'orbits', true));
  relief.position.set(0.1, 0.002, 0.01);
  relief.rotation.y = -0.08;
  tiles.add(relief);
  for (const [txt, x] of [['SMOOTH', -0.1], ['RELIEF', 0.1]]) {
    const l = kit.labelPlane(txt, 0.06, { size: 40, color: '#bdb8ae' });
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, 0.0012, 0.05);
    tiles.add(l);
  }
  // folded card
  const card = new THREE.Group();
  card.position.set(0.27, 0, -0.02);
  card.rotation.y = -0.35;
  const face = kit.labelPlane('LOCAL-FIRST // NO UPLOADS', 0.12, { w: 512, h: 128, size: 30, color: '#1a1a1c', bg: '#e8e4dc', spacing: 3, lit: true });
  face.position.set(0, 0.017, 0.006);
  face.rotation.x = -0.2;
  card.add(face);
  kit.box(0.12, 0.03, 0.001, M.paper, 0, 0.015, -0.004, card).rotation.x = 0.25;
  tiles.add(card);
  g.add(tiles);
  // a CAD sheet on a cutting mat, a spatula, a spare spool
  kit.box(0.46, 0.003, 0.3, M.rubber, -0.32, TOP + 0.0015, 0.14, g);
  const sheet = kit.decal(0.3, 0.21, 600, 420, drawCadSheet, { lit: true });
  sheet.rotation.x = -Math.PI / 2;
  sheet.rotation.z = 0.08;
  sheet.position.set(-0.33, TOP + 0.0035, 0.14);
  g.add(sheet);
  kit.box(0.11, 0.002, 0.022, M.steelLight, -0.08, TOP + 0.002, 0.3, g).rotation.y = 0.5;
  kit.box(0.06, 0.012, 0.018, M.oakDark, -0.0, TOP + 0.006, 0.34, g).rotation.y = 0.5;
  spool(kit, g, 1.35, TOP + 0.1, -0.15, M.plaGrey, false);

  world.addHotspot({
    id: 'bench-tiles', zone: 'fabrication',
    anchor: [0.05, TOP + 0.12, 0.1],
    hit: [[0.56, 0.12, 0.24], [0.05, TOP + 0.04, 0.1]],
    view: [[0.12, 1.32, 0.78], [0.05, TOP, 0.06]],
  });

  world.addLocation('fabrication', [0.35, 1.72, 1.55], [0.0, 1.02, -0.3], ['printer-enclosed', 'printer-open', 'bench-tiles']);

  /* ── Animation ─────────────────────────────────────────────────────── */
  const wp = new THREE.Vector3();
  const tileWorldX = A.x - 0.074;
  let lastPct = -1;
  const strandStart = new THREE.Vector3(0.24, 0.4, -0.04);
  const strandEnd = new THREE.Vector3();
  const strandMid = new THREE.Vector3();

  world.onUpdate((dt, t, f) => {
    const still = f.reduced || kit.q.detail === 0;   // LOW: printers are frozen and merged
    // A: line-by-line art reveal over ~100 s, then a pause and a fresh tile
    const pA = still ? 0.63 : cycle(t, 110, 8);
    clipA.constant = tileWorldX + pA * 0.148;
    const hx = still ? 0 : Math.sin(t * 2.2) * 0.065;
    const gy = still ? 0 : Math.sin(t * 0.37) * 0.018;
    headA.position.x = THREE.MathUtils.clamp(-0.074 + pA * 0.148 + hx * 0.25, -0.16, 0.16);
    gantryA.position.z = gy;
    // B: dome rises layer by layer
    const pB = still ? 0.62 : cycle(t + 40, 140, 10);
    const printTop = 0.071 * pB;
    gantryB.position.y = 0.087 + 0.004 + printTop + 0.06;
    headB.position.x = still ? 0.02 : Math.sin(t * 1.9) * 0.05;
    bedB.position.z = still ? 0.02 : 0.02 + Math.sin(t * 1.3) * 0.045;
    pb.updateMatrixWorld();
    clipB.constant = TOP + 0.087 + 0.004 + printTop;
    if (!still) spoolB.rotation.x -= dt * 0.12;
    // strand: spool → toolhead
    headB.getWorldPosition(wp);
    pb.worldToLocal(wp);
    const start = strandStart;
    const end = strandEnd.set(wp.x, wp.y + 0.03, wp.z + 0.03);
    const mid = strandMid.copy(start).lerp(end, 0.5);
    mid.y += 0.07;
    mid.z += 0.02;
    const attr = strandGeo.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const s = i / (attr.count - 1);
      const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s;
      attr.setXYZ(i, a * start.x + b * mid.x + c * end.x, a * start.y + b * mid.y + c * end.y, a * start.z + b * mid.z + c * end.z);
    }
    attr.needsUpdate = true;
    // screen
    const pct = Math.floor(pA * 100);
    if (pct !== lastPct) { lastPct = pct; drawScreen(screenCanvas, pct); screenTex.needsUpdate = true; }
  });

  return g;
}

function cycle(t, period, pause) {
  const local = t % (period + pause);
  return Math.min(1, local / period);
}

function spool(kit, parent, x, y, z, coreMat, axisZ) {
  const M = kit.mat;
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  const r = 0.1, w = 0.068;
  for (const s of [-1, 1]) {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.004, kit.seg(32)), M.plastic);
    flange.position.y = (s * w) / 2;
    grp.add(flange);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, w - 0.006, kit.seg(32)), coreMat);
  grp.add(core);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, w + 0.004, kit.seg(16)), M.steelDark);
  grp.add(hub);
  grp.rotation.z = Math.PI / 2;
  if (axisZ) grp.rotation.set(0, 0, Math.PI / 2);
  grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  parent.add(grp);
  return grp;
}

function drawScreen(canvas, pct) {
  const c = canvas.getContext('2d');
  c.fillStyle = '#07080a';
  c.fillRect(0, 0, 256, 112);
  c.fillStyle = 'rgba(255,255,255,0.88)';
  c.font = '500 22px "JetBrains Mono", monospace';
  c.fillText('LENSTILE · V1', 14, 34);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.font = '400 17px "JetBrains Mono", monospace';
  c.fillText(pct >= 100 ? 'DONE' : `PRINTING  ${String(pct).padStart(2, ' ')}%`, 14, 64);
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.fillRect(14, 82, 228, 6);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fillRect(14, 82, 228 * Math.min(1, pct / 100), 6);
}

/* LensTile artwork, 148 × 53 proportion. */
export function tileArtTexture(kit, kind, mono = false) {
  const c = kit.canvas(592, 212);
  drawTileArt(c.getContext('2d'), 592, 212, kind, mono);
  return kit.canvasTexture(c);
}

export function drawTileArt(ctx, w, h, kind, mono = false) {
  ctx.fillStyle = mono ? '#2a2a2d' : '#0c0c0e';
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round';
  if (kind === 'orbits') {
    const traces = ORBITS.init.map((b, i) => (i === 0 ? null : keplerTrace(b.r0, ORBITS.shapes[i - 1], 220)));
    let max = 0;
    for (const tr of traces) if (tr) for (const [x, y] of tr) max = Math.max(max, Math.abs(x), Math.abs(y) * 2.8);
    const s = (w * 0.46) / max;
    ctx.strokeStyle = '#e9e6df';
    ctx.lineWidth = 3;
    for (const tr of traces) {
      if (!tr) continue;
      ctx.beginPath();
      tr.forEach(([x, y], i) => (i ? ctx.lineTo(w * 0.62 + x * s, h / 2 - y * s) : ctx.moveTo(w * 0.62 + x * s, h / 2 - y * s)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.fillStyle = '#f2c38f';
    ctx.beginPath(); ctx.arc(w * 0.62, h / 2, 9, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'mooncamp') {
    ctx.fillStyle = '#e9e6df';
    ctx.beginPath(); ctx.arc(w * 0.8, h * 0.3, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2b2e';
    ctx.fillRect(0, h * 0.72, w, h);
    ctx.fillStyle = '#d8d4cc';
    for (const [x, r] of [[0.18, 34], [0.34, 26], [0.5, 40], [0.66, 24]]) {
      ctx.beginPath(); ctx.arc(w * x, h * 0.72, r, Math.PI, 0); ctx.fill();
    }
    ctx.fillRect(w * 0.18, h * 0.69, w * 0.48, 8);
  } else {
    const size = 26;
    for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size * 2) {
      const off = (y / size) % 2 ? size : 0;
      ctx.fillStyle = ((x + y) / size) % 3 < 1 ? '#d8d4cc' : '#5d5a55';
      ctx.fillRect(x + off + 2, y + 2, size * 2 - 4, size - 4);
    }
  }
}

/* Relief tile: heights quantized from the artwork's brightness. */
function reliefTile(kit, tex) {
  const src = tex.image;
  const sx = 74, sz = 27;
  const geo = new THREE.PlaneGeometry(0.148, 0.053, sx, sz);
  geo.rotateX(-Math.PI / 2);
  const ctx = src.getContext('2d');
  const data = ctx.getImageData(0, 0, src.width, src.height).data;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) / 0.148 + 0.5), v = (pos.getZ(i) / 0.053 + 0.5);
    const px = Math.min(src.width - 1, Math.floor(u * src.width));
    const py = Math.min(src.height - 1, Math.floor(v * src.height));
    const l = data[(py * src.width + px) * 4] / 255;
    pos.setY(i, 0.002 + (l > 0.5 ? 0.0016 : 0));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, flatShading: true, name: 'tileRelief' });
  const m = new THREE.Mesh(geo, mat);
  m.userData.keep = true;
  return m;
}

function drawCadSheet(ctx, w, h) {
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(30,30,32,0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 130, 444, 159);
  ctx.strokeStyle = 'rgba(30,30,32,0.4)';
  for (const x of [120, 464]) { ctx.beginPath(); ctx.arc(x, 209, 14, 0, Math.PI * 2); ctx.stroke(); }
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(70, 320); ctx.lineTo(514, 320); ctx.moveTo(545, 130); ctx.lineTo(545, 289); ctx.stroke();
  ctx.fillStyle = 'rgba(30,30,32,0.85)';
  ctx.font = '500 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('148.00', 292, 345);
  ctx.save(); ctx.translate(572, 210); ctx.rotate(-Math.PI / 2); ctx.fillText('53.00', 0, 0); ctx.restore();
  ctx.textAlign = 'left';
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillText('TILE V1 // 148 × 53 × 4', 70, 70);
  ctx.fillStyle = 'rgba(30,30,32,0.5)';
  ctx.font = '400 14px "JetBrains Mono", monospace';
  ctx.fillText('MAGNET RECESS Ø8 × 2', 70, 98);
  ctx.fillText('REV C', 470, 390);
}
