/* ==========================================================================
   printers.js — the two printers on the central bench, and the filament.

     Enclosed : a Bambu Lab P2S — an enclosed CoreXY box. Industrial-grey
                panels over a darker base, a tinted-glass door and top lid with
                silver trim, a 5″ touchscreen at the front right, and the spool
                on a bracket on its left side.
     Open     : a Bambu Lab A1 — an open bed-slinger. Light-grey plastic
                (≈ #C4C3C5) with dark-grey end pieces, a black textured plate,
                a small front-right touchscreen, and the spool on an arm at the
                top left.

   Both are modelled from public specs and photos of the machines, with no
   logos or lettering. Everything that moves (bed, gantry, toolhead, spool) is
   returned as a handle for fabrication.js to animate.
   ========================================================================== */
import { THREE } from './kit.js';

const TAU = Math.PI * 2;

/* A filament spool: grey flanges, a coloured winding and a hub with a visible
   hole. The axis runs along local Y; `axis` turns it to X or Z. It always has
   something to sit on or hang from — see the callers. */
export function spool(kit, { color, parent, x = 0, y = 0, z = 0, axis = 'y', r = 0.1, w = 0.068 }) {
  const M = kit.mat;
  const outer = new THREE.Group();
  const spin = new THREE.Group();                    // the part that turns (A1: slowly, as it feeds)
  const flange = kit.tint(0x8f939a, 'satin');
  const winding = kit.tint(color, 'satin');
  const core = kit.tint(0xbaa98c, 'satin');
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.0035, kit.seg(26)), flange);
    f.position.y = s * (w / 2 - 0.00175);
    spin.add(f);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0285, 0.0285, 0.0042, kit.seg(14)), M.black);
    hole.position.y = s * (w / 2 - 0.00175);
    spin.add(hole);
  }
  spin.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, w - 0.007, kit.seg(26)), winding));
  spin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, w - 0.006, kit.seg(12)), core));
  spin.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  outer.add(spin);
  outer.userData.spin = spin;
  outer.position.set(x, y, z);
  if (axis === 'x') outer.rotation.z = Math.PI / 2;
  else if (axis === 'z') outer.rotation.x = Math.PI / 2;
  parent.add(outer);
  return outer;
}

/* ── Bambu Lab P2S — enclosed ───────────────────────────────────────────── */
export function buildP2S(kit, { artTex, clipPlane }) {
  const M = kit.mat;
  const W = 0.386, D = 0.392, TOPH = 0.405, BASEH = 0.096;
  const base = kit.tint(0x2b2e32, 'satin');         // darker base
  const body = kit.tint(0x50555b, 'satin');         // industrial grey panels
  const lighter = kit.tint(0x6a6f76, 'satin');
  const trim = kit.tint(0x33363a, 'satin');
  const pa = new THREE.Group();

  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(0.03, 0.008, 0.03, M.rubber, sx * (W / 2 - 0.03), 0.004, sz * (D / 2 - 0.03), pa);
  kit.box(W, BASEH - 0.008, D, base, 0, 0.008 + (BASEH - 0.008) / 2, 0, pa).castShadow = true;
  kit.box(W + 0.002, 0.004, D + 0.002, lighter, 0, BASEH - 0.002, 0, pa);                    // the seam where base meets body

  const panelH = TOPH - BASEH, panelY = BASEH + panelH / 2;
  kit.box(W - 0.024, panelH, 0.012, body, 0, panelY, -D / 2 + 0.006, pa).castShadow = true;
  for (const sx of [-1, 1]) {
    kit.box(0.012, panelH, D, body, sx * (W / 2 - 0.006), panelY, 0, pa).castShadow = true;
    kit.box(0.0015, 0.2, D - 0.11, lighter, sx * (W / 2 + 0.0004), 0.255, 0, pa);          // a shallow raised panel on each side
  }
  for (const sx of [-1, 1]) kit.box(0.018, panelH, 0.018, trim, sx * (W / 2 - 0.009), panelY, D / 2 - 0.009, pa);
  kit.box(W - 0.05, 0.26, 0.004, lighter, 0, 0.23, -D / 2 + 0.014, pa);                      // lighter chamber back wall
  // top rim, tinted glass lid and a thin silver edge
  kit.box(W, 0.02, 0.026, trim, 0, TOPH - 0.01, D / 2 - 0.013, pa);
  kit.box(W, 0.02, 0.026, trim, 0, TOPH - 0.01, -D / 2 + 0.013, pa);
  for (const sx of [-1, 1]) kit.box(0.026, 0.02, D - 0.052, trim, sx * (W / 2 - 0.013), TOPH - 0.01, 0, pa);
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.026, D - 0.026), M.glassSmoked);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = TOPH + 0.002;
  pa.add(lid);
  kit.box(W - 0.02, 0.003, 0.004, M.steelLight, 0, TOPH + 0.0035, D / 2 - 0.012, pa);
  kit.box(W - 0.02, 0.003, 0.004, M.steelLight, 0, TOPH + 0.0035, -D / 2 + 0.012, pa);
  for (const sx of [-1, 1]) kit.box(0.004, 0.003, D - 0.03, M.steelLight, sx * (W / 2 - 0.012), TOPH + 0.0035, 0, pa);
  // tinted glass door with a thin frame and a silver handle
  const doorH = panelH - 0.022;
  const doorY = BASEH + doorH / 2;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, doorH), M.glassSmoked);
  door.position.set(0, doorY, D / 2 - 0.004);
  door.renderOrder = 3;
  pa.add(door);
  for (const sx of [-1, 1]) kit.box(0.008, doorH, 0.007, trim, sx * (W / 2 - 0.027), doorY, D / 2 - 0.003, pa);
  kit.box(W - 0.05, 0.008, 0.007, trim, 0, BASEH + doorH - 0.004, D / 2 - 0.003, pa);
  kit.box(W - 0.05, 0.008, 0.007, trim, 0, BASEH + 0.004, D / 2 - 0.003, pa);
  kit.box(0.1, 0.007, 0.007, M.steelLight, 0, BASEH + doorH - 0.034, D / 2 + 0.012, pa);
  for (const sx of [-1, 1]) kit.box(0.006, 0.006, 0.014, M.steelLight, sx * 0.04, BASEH + doorH - 0.034, D / 2 + 0.005, pa);
  kit.box(W - 0.08, 0.004, 0.006, M.ledWhite, 0, TOPH - 0.026, D / 2 - 0.034, pa);          // chamber LEDs
  const glow = kit.wash(W - 0.04, panelH - 0.06, 0xe8eeff, 0.2);
  glow.position.set(0, 0.24, -D / 2 + 0.017);
  pa.add(glow);
  // motion system: Y rods, Z screws
  for (const sx of [-1, 1]) {
    kit.box(0.008, 0.008, D - 0.06, M.steelLight, sx * (W / 2 - 0.035), 0.345, 0, pa);
    kit.box(0.007, 0.25, 0.007, M.steelLight, sx * 0.14, 0.2, -D / 2 + 0.04, pa);
  }

  // touchscreen, front right of the base
  const screenCanvas = kit.canvas(256, 150);
  const screenTex = kit.canvasTexture(screenCanvas);
  kit.box(0.126, 0.08, 0.007, M.blackGloss, 0.104, 0.054, D / 2 + 0.0035, pa);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.108, 0.0633), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, name: 'printerScreen' }));
  screen.position.set(0.104, 0.054, D / 2 + 0.0075);
  screen.userData.keep = true;
  pa.add(screen);

  // heated bed, textured plate and the print
  const bed = new THREE.Group();
  kit.box(0.268, 0.012, 0.268, M.steel, 0, 0, 0, bed);
  kit.box(0.258, 0.0035, 0.258, kit.tint(0x1d1e20, 'satin'), 0, 0.0075, 0, bed);
  kit.box(0.148, 0.003, 0.053, M.plastic, 0, 0.0105, 0, bed);
  const artMat = new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.55, clippingPlanes: [clipPlane], name: 'tileArt' });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.148, 0.053), artMat);
  art.rotation.x = -Math.PI / 2;
  art.position.y = 0.0122;
  bed.add(art);
  bed.position.set(0, 0.17, 0);
  kit.bake(bed, { essential: false });
  pa.add(bed);

  // gantry beam with the toolhead
  const gantry = new THREE.Group();
  kit.box(W - 0.07, 0.016, 0.022, M.steelLight, 0, 0, 0, gantry);
  const head = new THREE.Group();
  kit.box(0.05, 0.058, 0.044, kit.tint(0x3a3d42, 'satin'), 0, -0.014, 0.014, head);
  kit.box(0.034, 0.003, 0.002, M.ledWhite, 0, 0.002, 0.0365, head);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 8), M.brass);
  nozzle.rotation.x = Math.PI;
  nozzle.position.set(0, -0.049, 0.014);
  head.add(nozzle);
  kit.bake(head, { essential: false });
  gantry.add(head);
  gantry.position.set(0, 0.36, 0);
  kit.bake(gantry, { essential: false });
  pa.add(gantry);

  // side spool holder: a bracket on the left panel and a rod the spool hangs on, plus a PTFE tube to the top
  const holder = kit.tint(0x3a3d42, 'satin');
  const armY = 0.325, armZ = -0.06;
  kit.box(0.006, 0.075, 0.07, holder, -W / 2 - 0.003, armY, armZ, pa);
  const rod = kit.cyl(0.0065, 0.0065, 0.105, M.steelLight, 12, -W / 2 - 0.0525, armY, armZ, pa);
  rod.rotation.z = Math.PI / 2;
  const rodCap = kit.cyl(0.016, 0.016, 0.004, holder, 16, -W / 2 - 0.105, armY, armZ, pa);
  rodCap.rotation.z = Math.PI / 2;
  const spoolX = -W / 2 - 0.058;
  spool(kit, { color: 0xe8e6e1, parent: pa, x: spoolX, y: armY, z: armZ, axis: 'x' });
  kit.tube([
    new THREE.Vector3(spoolX, armY + 0.102, armZ),
    new THREE.Vector3(spoolX + 0.012, armY + 0.14, armZ - 0.03),
    new THREE.Vector3(-W / 2 + 0.01, TOPH + 0.012, armZ - 0.06),
    new THREE.Vector3(-0.03, TOPH + 0.014, -D / 2 + 0.05),
    new THREE.Vector3(-0.0, TOPH - 0.004, -D / 2 + 0.03),
  ], 0.0028, M.plaWhite, 28, pa);

  return { group: pa, W, D, H: TOPH + 0.01, bed, gantry, head, screenCanvas, screenTex, bedTop: 0.17 + 0.0135 };
}

/* ── Bambu Lab A1 — open bed-slinger ────────────────────────────────────── */
export function buildA1(kit, { clipPlane, domeMat }) {
  const M = kit.mat;
  const W = 0.385, D = 0.41;
  const light = kit.tint(0xc4c3c5, 'satin');         // the A1's light-grey plastic
  const dark = kit.tint(0x4b4e53, 'satin');          // dark-grey end pieces
  const white = kit.tint(0xe9e8e4, 'satin');
  const pb = new THREE.Group();

  kit.box(W - 0.012, 0.012, D - 0.012, dark, 0, 0.006, 0, pb);
  const slab = kit.roundBox(W, D, 0.052, 0.022, light, 0, 0.038, 0, pb);       // plan-rounded base
  slab.rotation.x = -Math.PI / 2;
  slab.castShadow = true;
  for (const sx of [-1, 1]) kit.box(0.007, 0.006, D - 0.07, M.steelLight, sx * 0.085, 0.067, 0, pb);   // Y rails the bed rides on

  // front-right touchscreen, tilted back
  const screenCanvas = kit.canvas(256, 170);
  const screenTex = kit.canvasTexture(screenCanvas);
  const scr = new THREE.Group();
  scr.position.set(0.118, 0.082, D / 2 - 0.045);
  scr.rotation.x = -0.55;
  kit.box(0.09, 0.06, 0.008, M.blackGloss, 0, 0, 0, scr);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.077, 0.0512), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, name: 'a1Screen' }));
  screen.position.z = 0.0042;
  screen.userData.keep = true;
  scr.add(screen);
  pb.add(scr);

  // the two Z towers: light-grey columns with dark-grey caps and a silver screw
  const towerZ = -0.13, towerH = 0.34;
  for (const sx of [-1, 1]) {
    const tx = sx * (W / 2 - 0.03);
    kit.box(0.044, towerH, 0.05, light, tx, 0.066 + towerH / 2, towerZ, pb).castShadow = true;
    kit.box(0.047, 0.02, 0.053, dark, tx, 0.066 + towerH + 0.01, towerZ, pb);
    kit.box(0.047, 0.022, 0.053, dark, tx, 0.078, towerZ, pb);
    kit.cyl(0.0035, 0.0035, 0.3, M.steelLight, 8, tx - sx * 0.0265, 0.24, towerZ + 0.012, pb);
  }

  // bed: carrier, black textured plate, and the dome print (clipped to grow)
  const bed = new THREE.Group();
  kit.box(0.262, 0.009, 0.262, kit.tint(0x2d2f32, 'satin'), 0, 0, 0, bed);
  kit.box(0.254, 0.0035, 0.254, kit.tint(0x1a1b1d, 'satin'), 0, 0.0062, 0, bed);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.022, kit.seg(32), 1, false), domeMat);
  wall.position.y = 0.019;
  bed.add(wall);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.045, kit.seg(32), kit.seg(16), 0, TAU, 0, Math.PI / 2), domeMat);
  dome.position.y = 0.03;
  bed.add(dome);
  bed.position.set(0, 0.087, 0.02);
  kit.bake(bed, { essential: false });
  pb.add(bed);

  // X gantry and toolhead
  const gantry = new THREE.Group();
  kit.box(W - 0.075, 0.034, 0.042, light, 0, 0, 0, gantry);
  kit.box(W - 0.1, 0.008, 0.006, M.steelLight, 0, 0.004, 0.024, gantry);
  const head = new THREE.Group();
  kit.box(0.058, 0.072, 0.06, light, 0, -0.016, 0.044, head);
  kit.box(0.044, 0.034, 0.022, dark, 0, -0.04, 0.083, head);                  // fan shroud
  kit.box(0.03, 0.003, 0.002, M.ledWhite, 0, 0.012, 0.0745, head);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 8), M.brass);
  nozzle.rotation.x = Math.PI;
  nozzle.position.set(0, -0.066, 0.05);
  head.add(nozzle);
  kit.bake(head, { essential: false });
  gantry.add(head);
  gantry.position.set(0, 0.2, towerZ);
  kit.bake(gantry, { essential: false });
  pb.add(gantry);

  // top-left spool arm: a white bracket on the tower, a rod through the spool
  const tx0 = -(W / 2 - 0.03);
  kit.box(0.034, 0.03, 0.034, white, tx0 - 0.03, 0.066 + towerH + 0.012, towerZ, pb);
  const rodY = 0.066 + towerH + 0.026;
  const rod = kit.cyl(0.007, 0.007, 0.115, white, 12, tx0 - 0.0925, rodY, towerZ, pb);
  rod.rotation.z = Math.PI / 2;
  const cap = kit.cyl(0.017, 0.017, 0.004, white, 16, tx0 - 0.148, rodY, towerZ, pb);
  cap.rotation.z = Math.PI / 2;
  const spoolX = tx0 - 0.1;
  const spoolObj = spool(kit, { color: 0xe0742a, parent: pb, x: spoolX, y: rodY, z: towerZ, axis: 'x' });
  kit.bake(spoolObj.userData.spin, { essential: false });       // it turns slowly as the filament feeds

  return {
    group: pb, W, D, bed, gantry, head, spool: spoolObj.userData.spin, screenCanvas, screenTex,
    strandStart: new THREE.Vector3(spoolX, rodY + 0.095, towerZ + 0.012),
    towerZ, nozzleDrop: 0.072, bedTop: 0.087 + 0.0095,
  };
}

/* ── Bench dressing ─────────────────────────────────────────────────────── */

/* Stacked flat spools on a shelf: always resting on something. */
export function spoolStack(kit, parent, x, shelfTop, z, colors) {
  colors.forEach((color, i) => {
    spool(kit, { color, parent, x: x + (i % 2 ? 0.004 : -0.003), y: shelfTop + 0.034 + i * 0.0705, z: z + (i % 2 ? -0.003 : 0.002), axis: 'y' });
  });
}

/* A translucent filament dry box with a spool lying inside. */
export function dryBox(kit, parent, x, top, z) {
  const M = kit.mat;
  const g = new THREE.Group();
  g.position.set(x, top, z);
  const W = 0.27, D = 0.27, H = 0.2;
  kit.box(W, 0.016, D, kit.tint(0xe4e2dd, 'satin'), 0, 0.008, 0, g);
  kit.box(W + 0.006, 0.014, D + 0.006, kit.tint(0xe4e2dd, 'satin'), 0, H + 0.007, 0, g);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box(0.012, H, 0.012, kit.tint(0xcfcdc8, 'satin'), sx * (W / 2 - 0.006), 0.016 + H / 2, sz * (D / 2 - 0.006), g);
  for (const [w, d, px, pz] of [[W, 0.003, 0, D / 2 - 0.0015], [W, 0.003, 0, -D / 2 + 0.0015], [0.003, D, W / 2 - 0.0015, 0], [0.003, D, -W / 2 + 0.0015, 0]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), M.glass);
    p.position.set(px, 0.016 + H / 2, pz);
    g.add(p);
  }
  // hygrometer on the front, and two little rollers the spool turns on
  const dial = kit.cyl(0.016, 0.016, 0.006, M.black, 18, 0.07, 0.04, D / 2 + 0.002, g);
  dial.rotation.x = Math.PI / 2;
  const face = kit.cyl(0.0135, 0.0135, 0.0015, M.paper, 18, 0.07, 0.04, D / 2 + 0.0055, g);
  face.rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) {
    const roller = kit.cyl(0.007, 0.007, 0.07, M.steelDark, 8, sx * 0.075, 0.03, 0, g);
    roller.rotation.x = Math.PI / 2;
  }
  spool(kit, { color: 0x4d8c5c, parent: g, x: 0, y: 0.1063, z: 0, axis: 'z', r: 0.1 });   // resting on the two rollers
  g.updateMatrixWorld(true);
  parent.add(g);
  return g;
}

/* A tool caddy with hex keys, pliers and a screwdriver standing in it. */
export function toolCaddy(kit, parent, x, top, z) {
  const M = kit.mat;
  const g = new THREE.Group();
  g.position.set(x, top, z);
  const wall = kit.tint(0x3b3e43, 'satin');
  const W = 0.17, D = 0.085, H = 0.075;
  kit.box(W, 0.004, D, wall, 0, 0.002, 0, g);
  kit.box(W, H, 0.003, wall, 0, H / 2, D / 2 - 0.0015, g);
  kit.box(W, H * 0.8, 0.003, wall, 0, (H * 0.8) / 2, -D / 2 + 0.0015, g);
  for (const sx of [-1, 1]) kit.box(0.003, H * 0.9, D, wall, sx * (W / 2 - 0.0015), (H * 0.9) / 2, 0, g);
  kit.box(0.003, H * 0.9, D, wall, 0.02, (H * 0.9) / 2, 0, g);                     // divider
  // standing tools: screwdriver, pliers, scraper, hex keys
  const sd = kit.cyl(0.0065, 0.0065, 0.05, M.rubber, 10, -0.06, 0.04, 0.01, g);
  kit.cyl(0.0022, 0.0022, 0.05, M.steelLight, 8, -0.06, 0.1, 0.01, g);
  sd.rotation.set(0.06, 0, 0.04);
  for (const sx of [-1, 1]) kit.box(0.007, 0.075, 0.004, M.steelDark, -0.025 + sx * 0.004, 0.065, -0.005, g).rotation.z = sx * 0.07;
  kit.box(0.006, 0.07, 0.006, M.black, -0.025, 0.04, -0.005, g);
  const scraper = kit.box(0.032, 0.095, 0.0015, M.steelLight, 0.05, 0.075, 0.012, g);
  scraper.rotation.z = -0.1;
  for (let i = 0; i < 4; i++) {
    const k = kit.box(0.0035, 0.07 + i * 0.004, 0.0035, M.steelDark, 0.003 + i * 0.0045, 0.05 + i * 0.002, -0.015, g);
    k.rotation.z = -0.05 + i * 0.03;
  }
  parent.add(g);
  return g;
}

/* A small parts bin: an open box with a few failed prints in it. */
export function partsBin(kit, parent, x, top, z) {
  const M = kit.mat;
  const g = new THREE.Group();
  g.position.set(x, top, z);
  const wall = kit.tint(0x2f3236, 'satin');
  const W = 0.2, D = 0.14, H = 0.09;
  kit.box(W, 0.004, D, wall, 0, 0.002, 0, g);
  kit.box(W, H, 0.003, wall, 0, H / 2, D / 2 - 0.0015, g);
  kit.box(W, H, 0.003, wall, 0, H / 2, -D / 2 + 0.0015, g);
  for (const sx of [-1, 1]) kit.box(0.003, H, D, wall, sx * (W / 2 - 0.0015), H / 2, 0, g);
  // a pile of prints that didn't make it
  const pla = kit.tint(0xd8d4cc, 'satin');
  const warm = kit.tint(0xb59a7a, 'satin');
  const bits = [[-0.05, 0.02, -0.02, 0.05, 0.016, 0.034, 0.4, pla], [0.03, 0.026, 0.01, 0.06, 0.02, 0.03, -0.3, warm], [-0.01, 0.014, 0.035, 0.04, 0.022, 0.04, 0.9, pla], [0.065, 0.016, -0.03, 0.03, 0.03, 0.03, 0.2, M.plaGrey]];
  for (const [bx, by, bz, w, h, d, ry, mat] of bits) kit.box(w, h, d, mat, bx, by, bz, g).rotation.set(0.08, ry, 0.05);
  parent.add(g);
  return g;
}

/* A power strip under the bench's rear edge, with the printers' cords routed to it. */
export function powerRouting(kit, parent, benchTop, rearZ, drops) {
  const M = kit.mat;
  const stripY = benchTop - 0.07, stripZ = rearZ - 0.03;
  kit.box(0.34, 0.034, 0.055, M.black, 0.1, stripY, stripZ, parent);
  kit.box(0.34, 0.004, 0.057, M.steelDark, 0.1, stripY + 0.019, stripZ, parent);
  kit.box(0.008, 0.004, 0.004, M.ledGreen, 0.24, stripY + 0.019, stripZ + 0.02, parent);
  for (const sx of [-0.04, 0.24]) kit.box(0.02, 0.034, 0.014, M.steelDark, sx, stripY + 0.03, rearZ + 0.004, parent);  // brackets up to the underside
  // cords: over the rear edge and down to the strip, never through the bench
  drops.forEach(({ x, z, y }, i) => {
    const sx = 0.1 - 0.12 + i * 0.1;
    kit.tube([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x, benchTop + 0.006, (z + rearZ) / 2),
      new THREE.Vector3(x, benchTop + 0.004, rearZ + 0.012),
      new THREE.Vector3(x, benchTop - 0.02, rearZ - 0.016),
      new THREE.Vector3((x + sx) / 2, stripY + 0.04, rearZ - 0.03),
      new THREE.Vector3(sx, stripY + 0.012, stripZ + 0.002),
    ], 0.0036, M.rubber, 28, parent);
  });
}
