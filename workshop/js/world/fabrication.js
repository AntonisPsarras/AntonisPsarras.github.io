/* ==========================================================================
   fabrication.js — the central bench, its two printers and the filament.

   The enclosed printer is an enclosed CoreXY printer and the open one an open bed-slinger printer,
   modelled in printers.js from public specs and photos (no logos). The P2S
   prints a LensTile carrying Aether's orbit art; the A1 prints a MoonCamp
   dome. Prints grow with clipping planes, so the part really appears layer by
   layer (or line by line).

   The rest of the bench is a working surface: spools stacked on the shelf
   below, a filament dry box, a tool caddy, a parts bin and cords that run to
   a power strip. Nothing floats — everything rests on, hangs from or leans
   against something.
   ========================================================================== */
import { THREE } from './kit.js';
import { ORBITS, keplerTrace } from './architecture.js';
import { buildP2S, buildA1, spoolStack, dryBox, toolCaddy, partsBin, powerRouting } from './printers.js';

const TOP = 0.92;
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
  const shelfTop = 0.23;
  kit.box(BENCH.w - 0.16, 0.02, BENCH.d - 0.12, M.steelDark, 0, shelfTop - 0.01, BENCH.z, g).receiveShadow = true;
  // filament, stacked flat on the shelf with the hubs showing; a bin of failed prints beside it
  spoolStack(kit, g, -1.1, shelfTop, -0.2, [0xe8e6e1, 0x7d8186, 0x1b1b1d]);
  spoolStack(kit, g, -0.7, shelfTop, -0.2, [0xe0742a, 0x3c6ea5]);
  spoolStack(kit, g, -0.3, shelfTop, -0.2, [0x4d8c5c, 0xe8e6e1, 0xb8312f]);
  spoolStack(kit, g, 0.1, shelfTop, -0.2, [0xd8b04c, 0x7d8186]);
  partsBin(kit, g, 0.72, shelfTop, -0.22);
  g.add(kit.blob(3.5, 1.5, BENCH.x, BENCH.z));
  world.addBox(BENCH.x - BENCH.w / 2 - 0.02, BENCH.x + BENCH.w / 2 + 0.02, BENCH.z - BENCH.d / 2 - 0.02, BENCH.z + BENCH.d / 2 + 0.02);
  world.addOccluder([BENCH.w, TOP, BENCH.d], [BENCH.x, TOP / 2, BENCH.z]);

  /* ── Printer A: enclosed CoreXY (enclosed CoreXY) ────────────────────── */
  const A = { x: -0.85, z: -0.32 };
  const clipA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const p2s = buildP2S(kit, { artTex: tileArtTexture(kit, 'orbits'), clipPlane: clipA });
  p2s.group.position.set(A.x, TOP, A.z);
  g.add(p2s.group);
  // while a flat tile prints the bed sits right up under the gantry
  p2s.bed.position.y = 0.3;
  p2s.gantry.position.y = 0.372;
  g.add(kit.blob(0.78, 0.62, A.x - 0.1, A.z, 0.925));

  world.addHotspot({
    id: 'printer-enclosed', zone: 'fabrication',
    anchor: [A.x, TOP + p2s.H + 0.06, A.z + 0.1],
    hit: [[p2s.W + 0.2, p2s.H + 0.04, p2s.D + 0.04], [A.x - 0.07, TOP + p2s.H / 2, A.z]],
    view: [[A.x + 0.3, 1.42, 0.5], [A.x, TOP + 0.22, A.z]],
  });

  /* ── Printer B: open bed-slinger (open bed-slinger) ────────────────────── */
  const B = { x: 0.9, z: -0.32 };
  const clipB = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const domeMat = M.pla.clone();
  domeMat.name = 'domePrint';
  domeMat.clippingPlanes = [clipB];
  domeMat.clipShadows = true;
  const a1 = buildA1(kit, { clipPlane: clipB, domeMat });
  a1.group.position.set(B.x, TOP, B.z);
  g.add(a1.group);
  g.add(kit.blob(0.78, 0.62, B.x - 0.05, B.z, 0.925));
  // a live filament strand from the spool to the toolhead
  const strandGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new THREE.Vector3()));
  const strand = new THREE.Line(strandGeo, new THREE.LineBasicMaterial({ color: 0xe0742a, transparent: true, opacity: 0.85 }));
  strand.userData.dynamic = true;
  strand.frustumCulled = false;
  a1.group.add(strand);

  world.addHotspot({
    id: 'printer-open', zone: 'fabrication',
    anchor: [B.x, TOP + 0.58, B.z + 0.05],
    hit: [[a1.W + 0.2, 0.62, a1.D + 0.04], [B.x - 0.07, TOP + 0.28, B.z]],
    view: [[B.x - 0.02, 1.42, 0.52], [B.x - 0.05, TOP + 0.2, B.z]],
  });
  world.shared.printerNear = new THREE.Vector3(B.x, 1.2, B.z);

  /* ── Working surface: dry box, tools, cords ────────────────────────── */
  dryBox(kit, g, 1.27, TOP, -0.2);
  toolCaddy(kit, g, -1.12, TOP, 0.12);
  // nozzle box and a pair of cutters lying beside the caddy
  kit.box(0.07, 0.022, 0.05, kit.tint(0xd9622b, 'satin'), -0.9, TOP + 0.011, 0.2, g).rotation.y = 0.3;
  kit.box(0.06, 0.006, 0.022, M.steelDark, -0.92, TOP + 0.003, 0.03, g).rotation.y = -0.5;
  powerRouting(kit, g, TOP, BENCH.z - BENCH.d / 2, [
    { x: A.x, y: TOP + 0.045, z: A.z - p2s.D / 2 },
    { x: B.x, y: TOP + 0.035, z: B.z - a1.D / 2 },
  ]);

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
  // a CAD sheet on a cutting mat, a spatula
  kit.box(0.46, 0.003, 0.3, M.rubber, -0.32, TOP + 0.0015, 0.14, g);
  const sheet = kit.decal(0.3, 0.21, 600, 420, drawCadSheet, { lit: true });
  sheet.rotation.x = -Math.PI / 2;
  sheet.rotation.z = 0.08;
  sheet.position.set(-0.33, TOP + 0.0035, 0.14);
  g.add(sheet);
  kit.box(0.11, 0.002, 0.022, M.steelLight, -0.08, TOP + 0.002, 0.3, g).rotation.y = 0.5;
  kit.box(0.06, 0.012, 0.018, M.oakDark, -0.0, TOP + 0.006, 0.34, g).rotation.y = 0.5;

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
  let lastPctA = -1, lastPctB = -1;
  const strandEnd = new THREE.Vector3();
  const strandMid = new THREE.Vector3();
  const headA = p2s.head, gantryA = p2s.gantry;
  const bedB = a1.bed, gantryB = a1.gantry, headB = a1.head;
  const plateTop = TOP + 0.087 + 0.0095;

  world.onUpdate((dt, t, f) => {
    const still = f.reduced || kit.q.detail === 0;   // LOW: the printers are frozen and merged
    // A: line-by-line art reveal over ~100 s, then a pause and a fresh tile
    const pA = still ? 0.63 : cycle(t, 110, 8);
    clipA.constant = tileWorldX + pA * 0.148;
    const hx = still ? 0 : Math.sin(t * 2.2) * 0.065;
    const gy = still ? 0 : Math.sin(t * 0.37) * 0.018;
    headA.position.x = THREE.MathUtils.clamp(-0.074 + pA * 0.148 + hx * 0.25, -0.16, 0.16);
    gantryA.position.z = gy;
    // B: the dome rises layer by layer
    const pB = still ? 0.62 : cycle(t + 40, 140, 10);
    const printTop = 0.071 * pB;
    gantryB.position.y = 0.087 + 0.0095 + printTop + a1.nozzleDrop;
    headB.position.x = still ? 0.02 : Math.sin(t * 1.9) * 0.05;
    bedB.position.z = still ? 0.02 : 0.02 + Math.sin(t * 1.3) * 0.045;
    a1.group.updateMatrixWorld();
    clipB.constant = plateTop + printTop;
    if (!still && a1.spool) a1.spool.rotation.y -= dt * 0.12;
    // strand: spool → toolhead, sagging a little
    headB.getWorldPosition(wp);
    a1.group.worldToLocal(wp);
    const start = a1.strandStart;
    const end = strandEnd.set(wp.x, wp.y + 0.034, wp.z + 0.05);
    const mid = strandMid.copy(start).lerp(end, 0.5);
    mid.y += 0.04;
    mid.z += 0.02;
    const attr = strandGeo.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const s = i / (attr.count - 1);
      const a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s;
      attr.setXYZ(i, a * start.x + b * mid.x + c * end.x, a * start.y + b * mid.y + c * end.y, a * start.z + b * mid.z + c * end.z);
    }
    attr.needsUpdate = true;
    // screens
    const pctA = Math.floor(pA * 100);
    if (pctA !== lastPctA) { lastPctA = pctA; drawScreenA(p2s.screenCanvas, pctA); p2s.screenTex.needsUpdate = true; }
    const pctB = Math.floor(pB * 100);
    if (pctB !== lastPctB) { lastPctB = pctB; drawScreenB(a1.screenCanvas, pctB); a1.screenTex.needsUpdate = true; }
  });

  return g;
}

function cycle(t, period, pause) {
  const local = t % (period + pause);
  return Math.min(1, local / period);
}

/* The P2S's 5″ display: a plain layout in plain mono type. */
function drawScreenA(canvas, pct) {
  const c = canvas.getContext('2d');
  c.fillStyle = '#07080a';
  c.fillRect(0, 0, 256, 150);
  c.fillStyle = 'rgba(255,255,255,0.88)';
  c.font = '500 21px "JetBrains Mono", monospace';
  c.fillText('LENSTILE · V1', 14, 34);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.font = '400 17px "JetBrains Mono", monospace';
  c.fillText(pct >= 100 ? 'DONE' : `PRINTING  ${String(pct).padStart(2, ' ')}%`, 14, 66);
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.fillRect(14, 84, 228, 7);
  c.fillStyle = '#7ee2a0';
  c.fillRect(14, 84, 228 * Math.min(1, pct / 100), 7);
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.font = '400 13px "JetBrains Mono", monospace';
  c.fillText('NOZZLE 220°   BED 55°', 14, 116);
  c.fillText('CHAMBER  ON', 14, 136);
}

/* The A1's 3.5″ display. */
function drawScreenB(canvas, pct) {
  const c = canvas.getContext('2d');
  c.fillStyle = '#07080a';
  c.fillRect(0, 0, 256, 170);
  c.fillStyle = 'rgba(255,255,255,0.88)';
  c.font = '500 21px "JetBrains Mono", monospace';
  c.fillText('MOONCAMP DOME', 14, 36);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.font = '400 17px "JetBrains Mono", monospace';
  c.fillText(pct >= 100 ? 'DONE' : `PRINTING  ${String(pct).padStart(2, ' ')}%`, 14, 72);
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.fillRect(14, 92, 228, 8);
  c.fillStyle = '#7ee2a0';
  c.fillRect(14, 92, 228 * Math.min(1, pct / 100), 8);
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.font = '400 13px "JetBrains Mono", monospace';
  c.fillText('NOZZLE 215°   BED 60°', 14, 130);
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
