/* ==========================================================================
   electronics.js — the soldering bench.

   Process, not display: a used bench. Every readout points at another
   project — the scope shows the turbine's rectified sine, the multimeter
   reads an 18650 cell, the calipers read 53.00 mm (a LensTile's height),
   the parts tray holds the parts named in the portfolio.
   ========================================================================== */
import { THREE, mulberry32 as mulberry } from './kit.js';

const POS = { x: 5.12, z: 2.3 };
const ROT = -Math.PI / 2;
const TOP = 0.88;
/* local (x along the desk, z toward the room) → world */
const W = (lx, y, lz) => [POS.x - lz, y, POS.z + lx];

export function buildElectronics(kit, world) {
  const g = new THREE.Group();
  g.position.set(POS.x, 0, POS.z);
  g.rotation.y = ROT;
  const M = kit.mat;

  /* ── Desk & pegboard ─────────────────────────────────────────────── */
  const top = kit.box(1.7, 0.04, 0.74, M.oakDark, 0, TOP - 0.02, 0, g);
  top.castShadow = top.receiveShadow = true;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.04, TOP - 0.04, 0.04, M.steelDark, sx * 0.8, (TOP - 0.04) / 2, sz * 0.32, g).castShadow = true;
  kit.box(1.6, 0.03, 0.03, M.steelDark, 0, 0.2, -0.32, g);
  kit.box(1.44, 0.62, 0.014, M.plasticMid, 0, 1.36, -0.365, g);
  const peg = kit.decal(1.44, 0.62, 512, 224, drawPegboard, { lit: true });
  peg.position.set(0, 1.36, -0.357);
  g.add(peg);
  // tools on the pegboard
  for (let i = 0; i < 4; i++) {
    const x = -0.55 + i * 0.07;
    kit.cyl(0.009, 0.011, 0.09, i % 2 ? M.plastic : M.plaWarm, 10, x, 1.47, -0.33, g);
    kit.cyl(0.0025, 0.0025, 0.11, M.steelLight, 6, x, 1.37, -0.33, g);
  }
  const plier = new THREE.Group();
  plier.position.set(-0.1, 1.4, -0.335);
  kit.box(0.012, 0.14, 0.006, M.plasticMid, -0.008, -0.03, 0, plier).rotation.z = 0.12;
  kit.box(0.012, 0.14, 0.006, M.plasticMid, 0.008, -0.03, 0, plier).rotation.z = -0.12;
  kit.box(0.02, 0.05, 0.008, M.steelLight, 0, 0.06, 0, plier);
  g.add(plier);
  const solder = kit.cyl(0.03, 0.03, 0.03, M.steelLight, 16, 0.2, 1.42, -0.33, g);
  solder.rotation.x = Math.PI / 2;
  const wireSpool = kit.cyl(0.035, 0.035, 0.035, M.pla, 16, 0.32, 1.42, -0.33, g);
  wireSpool.rotation.x = Math.PI / 2;
  g.add(kit.blob(2.0, 1.0, 0, 0));

  /* ── Soldering station ───────────────────────────────────────────── */
  kit.roundBox(0.13, 0.075, 0.12, 0.012, M.plastic, -0.52, TOP + 0.0375, -0.13, g).castShadow = true;
  const stationScreen = kit.labelPlane('350°', 0.06, { w: 256, h: 112, size: 64, color: '#ffb36b', bg: '#0b0b0d', weight: 400, spacing: 2 });
  stationScreen.position.set(-0.535, TOP + 0.045, -0.069);
  g.add(stationScreen);
  kit.cyl(0.008, 0.008, 0.01, M.plasticMid, 12, -0.48, TOP + 0.045, -0.066, g).rotation.x = Math.PI / 2;
  // stand: weighted base + coil
  kit.cyl(0.045, 0.05, 0.016, M.steelDark, 20, -0.3, TOP + 0.008, -0.12, g);
  const coilPts = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i / 80) * Math.PI * 2 * 7;
    const along = (i / 80) * 0.1;
    coilPts.push(new THREE.Vector3(Math.cos(a) * 0.018, Math.sin(a) * 0.018, along));
  }
  const coil = kit.tube(coilPts, 0.0016, M.steelLight, 160, null);
  coil.position.set(-0.3, TOP + 0.05, -0.17);
  coil.rotation.x = -0.65;
  g.add(coil);
  // the iron, resting in the coil
  const iron = new THREE.Group();
  iron.position.set(-0.3, TOP + 0.075, -0.1);
  iron.rotation.x = -0.65 + Math.PI;
  kit.cyl(0.011, 0.012, 0.11, M.plastic, 12, 0, 0, -0.03, iron).rotation.x = Math.PI / 2;
  kit.cyl(0.004, 0.004, 0.06, M.steelLight, 8, 0, 0, 0.055, iron).rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.02, 8), M.brass);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.094;
  iron.add(tip);
  g.add(iron);
  kit.tube([[-0.5, TOP + 0.03, -0.18], [-0.42, TOP + 0.01, -0.26], [-0.34, TOP + 0.04, -0.2], [-0.3, TOP + 0.09, -0.15]], 0.0035, M.rubber, 24, g);
  kit.cyl(0.026, 0.028, 0.012, M.steelDark, 16, -0.2, TOP + 0.006, -0.17, g);
  kit.cyl(0.02, 0.02, 0.018, M.brass, 12, -0.2, TOP + 0.015, -0.17, g);

  /* ── Boards: REV C (current) and REV A (with a bodge wire) ───────── */
  const revC = pcbBoard(kit, 'REV C', 0.12, 0.08, false);
  revC.position.set(-0.12, TOP + 0.001, 0.08);
  revC.rotation.y = 0.06;
  g.add(revC);
  const revA = pcbBoard(kit, 'REV A', 0.12, 0.08, true);
  revA.position.set(0.05, TOP + 0.001, 0.15);
  revA.rotation.y = -0.28;
  g.add(revA);
  // breadboard + jumper wires
  kit.box(0.085, 0.009, 0.055, M.pla, -0.02, TOP + 0.0045, -0.12, g);
  for (let i = 0; i < 18; i++) kit.box(0.002, 0.0005, 0.04, M.plaGrey, -0.055 + i * 0.004, TOP + 0.0092, -0.12, g);
  const jumpers = [[M.pla, -0.04, 0.0], [M.plaGrey, -0.02, 0.01], [M.plaWarm, 0.0, -0.01]];
  for (const [mat, x, dz] of jumpers) {
    kit.tube([[x, TOP + 0.009, -0.12 + dz], [x + 0.01, TOP + 0.045, -0.07], [x - 0.04, TOP + 0.02, 0.02], [-0.11, TOP + 0.004, 0.06]], 0.0011, mat, 20, g);
  }

  /* ── Multimeter on an 18650 ──────────────────────────────────────── */
  const dmm = new THREE.Group();
  dmm.position.set(0.34, TOP, 0.03);
  dmm.rotation.y = 0.2;
  kit.roundBox(0.085, 0.024, 0.165, 0.012, M.plastic, 0, 0.012, 0, dmm).castShadow = true;
  kit.roundBox(0.095, 0.02, 0.175, 0.016, M.plasticMid, 0, 0.008, 0, dmm);
  const lcd = kit.labelPlane('3.71 V', 0.062, { w: 256, h: 128, size: 66, color: '#1c1f1a', bg: '#b4bbab', weight: 500, spacing: 1, lit: true });
  lcd.rotation.x = -Math.PI / 2;
  lcd.position.set(0, 0.0245, -0.045);
  dmm.add(lcd);
  kit.cyl(0.02, 0.02, 0.008, M.plasticMid, 20, 0, 0.026, 0.02, dmm);
  kit.box(0.004, 0.002, 0.018, M.pla, 0, 0.031, 0.012, dmm);
  g.add(dmm);
  // cell + holder
  kit.box(0.082, 0.02, 0.026, M.plastic, 0.52, TOP + 0.01, 0.15, g);
  const cellTex = kit.labelTexture('18650 · 3.7V', { w: 512, h: 128, size: 44, color: '#d8dde0', bg: '#33414a', spacing: 4 });
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.065, kit.seg(20)), new THREE.MeshStandardMaterial({ map: cellTex, roughness: 0.45, name: 'cellWrap' }));
  cell.rotation.z = Math.PI / 2;
  cell.position.set(0.52, TOP + 0.022, 0.15);
  cell.userData.keep = true;
  g.add(cell);
  const leadRed = kit.tint(0x7c2a22, 'satin');
  kit.tube([[0.31, TOP + 0.02, 0.1], [0.37, TOP + 0.05, 0.18], [0.46, TOP + 0.04, 0.2], [0.485, TOP + 0.025, 0.152]], 0.0018, leadRed, 24, g);
  kit.tube([[0.35, TOP + 0.02, 0.1], [0.45, TOP + 0.06, 0.14], [0.56, TOP + 0.045, 0.12], [0.555, TOP + 0.025, 0.15]], 0.0018, M.rubber, 24, g);

  /* ── Scope: the turbine's rectified sine ─────────────────────────── */
  const scope = new THREE.Group();
  scope.position.set(0.63, TOP, -0.2);
  scope.rotation.y = -0.25;
  kit.roundBox(0.17, 0.105, 0.12, 0.01, M.plastic, 0, 0.0525, 0, scope).castShadow = true;
  const scopeCanvas = kit.canvas(320, 208);
  const scopeTex = kit.canvasTexture(scopeCanvas);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.098, 0.064), new THREE.MeshBasicMaterial({ map: scopeTex, toneMapped: false, name: 'scopeScreen' }));
  scr.position.set(-0.025, 0.056, 0.0605);
  scr.userData.keep = true;
  scope.add(scr);
  for (let i = 0; i < 4; i++) kit.cyl(0.007, 0.007, 0.008, M.plasticMid, 12, 0.05 + (i % 2) * 0.022, 0.032 + Math.floor(i / 2) * 0.036, 0.062, scope).rotation.x = Math.PI / 2;
  g.add(scope);

  /* ── Calipers reading 53.00 ──────────────────────────────────────── */
  const cal = new THREE.Group();
  cal.position.set(-0.36, TOP + 0.002, 0.22);
  cal.rotation.y = 0.35;
  kit.box(0.17, 0.003, 0.016, M.steelLight, 0, 0, 0, cal);
  kit.box(0.006, 0.003, 0.045, M.steelLight, -0.082, 0, -0.022, cal);
  kit.box(0.006, 0.003, 0.045, M.steelLight, -0.026, 0, -0.022, cal);
  kit.box(0.05, 0.008, 0.026, M.plastic, -0.005, 0.004, 0.004, cal);
  const calLcd = kit.labelPlane('53.00', 0.032, { w: 256, h: 96, size: 62, color: '#1c1f1a', bg: '#b4bbab', weight: 500, spacing: 1, lit: true });
  calLcd.rotation.x = -Math.PI / 2;
  calLcd.position.set(-0.005, 0.0085, 0.003);
  cal.add(calLcd);
  g.add(cal);

  /* ── Parts tray ──────────────────────────────────────────────────── */
  kit.box(0.26, 0.032, 0.085, M.plasticMid, 0.18, TOP + 0.016, -0.27, g);
  for (let i = 1; i < 4; i++) kit.box(0.003, 0.03, 0.08, M.plastic, 0.05 + i * 0.065, TOP + 0.018, -0.27, g);
  const tray = kit.labelPlane('1N5819  TP4056  MT3608  ESP32', 0.26, { w: 1024, h: 64, size: 30, color: '#d8d4cc', bg: '#18181a', spacing: 2, lit: true });
  tray.position.set(0.18, TOP + 0.02, -0.2265);
  g.add(tray);
  const rnd = mulberry(5);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 5; k++) {
    kit.box(0.008, 0.004, 0.004, i === 3 ? M.steelLight : M.plastic, 0.085 + i * 0.065 + (rnd() - 0.5) * 0.04, TOP + 0.034, -0.27 + (rnd() - 0.5) * 0.05, g).rotation.y = rnd() * 3;
  }

  /* ── Lamps ───────────────────────────────────────────────────────── */
  // magnifier with a ring light, hovering over the boards
  kit.box(0.04, 0.05, 0.05, M.steelDark, -0.78, TOP + 0.025, -0.33, g);
  kit.tube([[-0.78, TOP + 0.05, -0.33], [-0.72, TOP + 0.35, -0.3], [-0.45, TOP + 0.42, -0.15], [-0.2, TOP + 0.33, 0.02]], 0.007, M.steelDark, 30, g);
  const mag = new THREE.Group();
  mag.position.set(-0.17, TOP + 0.3, 0.05);
  mag.rotation.x = -1.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, kit.seg(32)), M.plastic);
  mag.add(ring);
  const ringLed = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.003, 4, kit.seg(32)), M.ledCool);
  ringLed.position.z = -0.012;
  mag.add(ringLed);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.052, kit.seg(32)), M.glass);
  mag.add(lens);
  g.add(mag);
  // warm task lamp
  kit.cyl(0.06, 0.065, 0.02, M.black, 20, 0.76, TOP + 0.01, -0.26, g);
  kit.tube([[0.76, TOP + 0.02, -0.26], [0.74, TOP + 0.38, -0.3], [0.62, TOP + 0.5, -0.12]], 0.008, M.black, 24, g);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, kit.seg(24), 1, true), M.black);
  shade.position.set(0.58, TOP + 0.47, -0.08);
  shade.rotation.set(0.5, 0, 0.3);
  g.add(shade);
  kit.sphere(0.025, M.ledWarm, 12, 0.575, TOP + 0.44, -0.07, g);
  const pool = kit.wash(0.95, 0.7, 0xffc58a, 0.2);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.3, TOP + 0.002, 0.02);
  g.add(pool);
  if (kit.q.lights >= 1) {
    const lamp = new THREE.PointLight(0xffb46b, 1.8, 0, 2);
    lamp.position.set(0.56, TOP + 0.4, -0.04);
    g.add(world.addLight(lamp, 1.0));
  }

  /* ── Stool ───────────────────────────────────────────────────────── */
  const stool = new THREE.Group();
  stool.position.set(0.1, 0, 0.72);
  kit.cyl(0.17, 0.17, 0.045, M.plastic, 24, 0, 0.62, 0, stool).castShadow = true;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = kit.cyl(0.012, 0.012, 0.64, M.steelDark, 8, Math.cos(a) * 0.12, 0.31, Math.sin(a) * 0.12, stool);
    leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
  }
  g.add(stool);
  g.add(kit.blob(0.5, 0.5, 0.1, 0.72));

  /* ── Registration ────────────────────────────────────────────────── */
  world.addBox(POS.x - 0.39, POS.x + 0.4, POS.z - 0.87, POS.z + 0.87);
  const st = W(0.1, 0, 0.72);
  world.colliders.circles.push({ x: st[0], z: st[2], r: 0.2 });
  world.addOccluder([0.76, TOP, 1.72], [POS.x, TOP / 2, POS.z]);

  const hs = (id, anchor, hitSize, hitC, view, target) => world.addHotspot({
    id, zone: 'electronics', anchor: W(...anchor), hit: [hitSize, W(...hitC), ROT], view: [W(...view), W(...target)],
  });
  hs('soldering', [-0.45, TOP + 0.2, -0.08], [0.5, 0.32, 0.42], [-0.42, TOP + 0.12, -0.1], [-0.3, 1.36, 0.78], [-0.38, TOP + 0.04, -0.06]);
  hs('pcb-revisions', [-0.04, TOP + 0.08, 0.12], [0.32, 0.08, 0.2], [-0.04, TOP + 0.02, 0.12], [-0.06, 1.24, 0.5], [-0.04, TOP, 0.1]);
  hs('multimeter', [0.38, TOP + 0.08, 0.06], [0.36, 0.1, 0.26], [0.43, TOP + 0.03, 0.08], [0.34, 1.26, 0.56], [0.42, TOP, 0.06]);
  hs('scope', [0.63, TOP + 0.17, -0.18], [0.22, 0.16, 0.18], [0.63, TOP + 0.06, -0.2], [0.48, 1.24, 0.42], [0.62, TOP + 0.06, -0.18]);

  world.addLocation('electronics', [3.3, 1.6, 2.4], [5.2, 0.98, 2.3], ['soldering', 'pcb-revisions', 'multimeter', 'scope']);

  /* ── Animation: a scrolling, full-wave rectified sine ─────────────── */
  let acc = 1, phase = 0;
  drawScope(scopeCanvas, 0);
  world.onUpdate((dt, t, f) => {
    if (f.reduced) return;
    phase += dt * 0.9;
    acc += dt;
    if (acc < 1 / kit.q.canvasHz) return;
    acc = 0;
    drawScope(scopeCanvas, phase);
    scopeTex.needsUpdate = true;
  });

  return g;
}

function drawScope(canvas, phase) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  c.fillStyle = '#05080a';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(160,200,220,0.12)';
  c.lineWidth = 1;
  for (let x = 0; x <= w; x += w / 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y <= h; y += h / 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  // faint input AC, bright rectified output
  const base = h * 0.78, amp = h * 0.5;
  c.strokeStyle = 'rgba(200,215,230,0.22)';
  c.lineWidth = 1.5;
  c.beginPath();
  for (let x = 0; x <= w; x += 2) { const y = h * 0.5 - Math.sin(x * 0.045 + phase * 3) * h * 0.28; x ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke();
  c.strokeStyle = 'rgba(210,245,230,0.95)';
  c.lineWidth = 2.5;
  c.beginPath();
  for (let x = 0; x <= w; x += 2) { const y = base - Math.abs(Math.sin(x * 0.045 + phase * 3)) * amp * 0.9; x ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke();
  c.fillStyle = 'rgba(210,245,230,0.75)';
  c.font = '500 15px "JetBrains Mono", monospace';
  c.fillText('CH1  |V|  BRIDGE OUT', 10, 20);
}

function pcbBoard(kit, label, w, d, bodge) {
  const M = kit.mat;
  const grp = new THREE.Group();
  kit.box(w, 0.0016, d, M.plastic, 0, 0.0008, 0, grp);
  const top = kit.decal(w, d, 384, 256, (c, pw, ph) => drawPcb(c, pw, ph, label), { lit: true });
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.00165;
  grp.add(top);
  const rnd = mulberry(label.length * 13);
  // ESP32-class module: board + shield can
  kit.box(0.026, 0.0016, 0.018, M.plastic, -0.022, 0.0024, -0.012, grp);
  kit.box(0.018, 0.0028, 0.016, M.steelLight, -0.024, 0.0045, -0.012, grp);
  for (let i = 0; i < 9; i++) {
    const big = rnd() < 0.3;
    kit.box(big ? 0.008 : 0.004, 0.0018, big ? 0.006 : 0.002, rnd() < 0.5 ? M.plastic : M.plaWarm, 0.012 + rnd() * 0.04, 0.0025, -0.03 + rnd() * 0.06, grp).rotation.y = rnd() < 0.5 ? 0 : Math.PI / 2;
  }
  kit.cyl(0.004, 0.004, 0.009, M.plastic, 10, 0.045, 0.006, 0.026, grp);
  if (bodge) kit.tube([[0.01, 0.003, 0.02], [0.02, 0.012, 0.03], [0.035, 0.003, 0.034]], 0.0006, M.pla, 12, grp);
  return grp;
}

function drawPcb(ctx, w, h, label) {
  ctx.fillStyle = '#0e1011';
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry(label.charCodeAt(4) || 3);
  ctx.strokeStyle = 'rgba(176,122,74,0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    let x = rnd() * w, y = rnd() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      if (rnd() < 0.5) x += (rnd() - 0.5) * 160; else y += (rnd() - 0.5) * 120;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200,160,110,0.8)';
  for (let i = 0; i < 40; i++) ctx.fillRect(rnd() * w, rnd() * h, 6, 6);
  ctx.strokeStyle = 'rgba(240,240,236,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = 'rgba(240,240,236,0.85)';
  ctx.font = '500 24px "JetBrains Mono", monospace';
  ctx.fillText(label, 22, h - 24);
}

function drawPegboard(ctx) {
  ctx.fillStyle = '#2a2b2e';
  ctx.fillRect(0, 0, 512, 224);
  ctx.fillStyle = '#121214';
  for (let y = 10; y < 224; y += 16) for (let x = 10; x < 512; x += 16) {
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}
