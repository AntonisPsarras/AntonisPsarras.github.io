/* ==========================================================================
   programming.js — the desk where the code happens.

   The main monitor shows the real source of workshop-scene.js, fetched from
   this site and syntax-highlighted onto a canvas, with live renderer stats
   in its status bar. The second screen cycles through the live scene graph,
   a LensTile drawing, the ScholiLink emulator log and a BrickCast layer view.
   ========================================================================== */
import { THREE } from './kit.js';
import { SL_TERMINAL_LINES } from '../content.js';

const POS = { x: 5.12, z: -0.35 };
const ROT = -Math.PI / 2;
const TOP = 0.76;
const W = (lx, y, lz) => [POS.x - lz, y, POS.z + lx];

const FALLBACK_SOURCE = [
  '/* workshop-scene.js — assembles the room you are standing in. */',
  "import { THREE, Kit } from './world/kit.js';",
  '',
  'export async function buildWorkshop({ renderer, scene, quality }) {',
  '  const kit = new Kit(quality, renderer);',
  '  const world = new World(kit);',
  '  for (const [name, build] of ZONES) world.root.add(build(kit, world));',
  '  world.stats = kit.mergeStatic(world.root);',
  '  return world;',
  '}',
];

export function buildProgramming(kit, world) {
  const g = new THREE.Group();
  g.position.set(POS.x, 0, POS.z);
  g.rotation.y = ROT;
  const M = kit.mat;
  const hi = kit.q.detail >= 1;

  /* ── Desk ────────────────────────────────────────────────────────── */
  const top = kit.box(1.7, 0.035, 0.74, M.oak, 0, TOP - 0.0175, 0, g);
  top.castShadow = top.receiveShadow = true;
  for (const sx of [-1, 1]) {
    kit.box(0.05, TOP - 0.035, 0.6, M.steelDark, sx * 0.8, (TOP - 0.035) / 2, 0, g).castShadow = true;
  }
  kit.box(1.55, 0.25, 0.015, M.steelDark, 0, TOP - 0.17, -0.3, g);
  g.add(kit.blob(1.9, 0.9, 0, 0));

  /* ── Main monitor ────────────────────────────────────────────────── */
  const mon = new THREE.Group();
  mon.position.set(-0.12, TOP, -0.2);
  kit.box(0.2, 0.012, 0.14, M.steelDark, 0, 0.006, 0, mon);
  kit.box(0.04, 0.2, 0.025, M.steelDark, 0, 0.11, -0.03, mon);
  kit.box(0.64, 0.38, 0.025, M.blackGloss, 0, 0.375, -0.005, mon).castShadow = true;
  const mainRes = hi ? [1024, 592] : [768, 444];
  const mainCanvas = kit.canvas(...mainRes);
  const mainTex = kit.canvasTexture(mainCanvas);
  const mainScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.616, 0.356), new THREE.MeshBasicMaterial({ map: mainTex, toneMapped: false, name: 'mainScreen' }));
  mainScreen.position.set(0, 0.375, 0.0085);
  mainScreen.userData.keep = true;
  mon.add(mainScreen);
  // the sticky note
  const note = kit.decal(0.055, 0.055, 256, 256, (c) => {
    c.fillStyle = '#e6dfbf';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = 'rgba(40,38,30,0.85)';
    c.font = '500 30px "JetBrains Mono", monospace';
    c.fillText('// TODO:', 22, 96);
    c.fillText('fewer', 22, 146);
    c.fillText('TODOs', 22, 190);
  }, { lit: true });
  note.position.set(0.29, 0.2, 0.0095);
  note.rotation.z = -0.08;
  mon.add(note);
  g.add(mon);
  // bias light on the wall behind
  const bias = kit.wash(1.1, 0.8, 0xcfe0ff, 0.12);
  bias.position.set(-0.12, TOP + 0.42, -0.364);
  g.add(bias);

  /* ── Side monitor ────────────────────────────────────────────────── */
  const side = new THREE.Group();
  side.position.set(0.56, TOP, -0.12);
  side.rotation.y = -0.5;
  kit.box(0.16, 0.012, 0.12, M.steelDark, 0, 0.006, 0, side);
  kit.box(0.03, 0.16, 0.02, M.steelDark, 0, 0.09, -0.025, side);
  kit.box(0.44, 0.28, 0.022, M.blackGloss, 0, 0.3, -0.005, side).castShadow = true;
  const sideRes = hi ? [768, 476] : [512, 318];
  const sideCanvas = kit.canvas(...sideRes);
  const sideTex = kit.canvasTexture(sideCanvas);
  const sideScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.422, 0.262), new THREE.MeshBasicMaterial({ map: sideTex, toneMapped: false, name: 'sideScreen' }));
  sideScreen.position.set(0, 0.3, 0.0075);
  sideScreen.userData.keep = true;
  side.add(sideScreen);
  g.add(side);

  /* ── Keyboard & mouse ────────────────────────────────────────────── */
  const kb = new THREE.Group();
  kb.position.set(-0.12, TOP, 0.1);
  kit.roundBox(0.38, 0.016, 0.13, 0.008, M.plastic, 0, 0.008, 0, kb);
  const rows = [14, 14, 13, 12, 9];
  const keyGeo = new THREE.BoxGeometry(0.0175, 0.008, 0.0175);
  const keys = new THREE.InstancedMesh(keyGeo, M.plasticMid, rows.reduce((a, b) => a + b, 0));
  keys.userData.keep = true;
  const km = new THREE.Matrix4();
  let ki = 0;
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const wide = r === 4 && i === 4 ? 5 : 1;
      km.makeScale(wide, 1, 1).setPosition(-0.165 + i * 0.023 + r * 0.004 + (wide > 1 ? 0.046 : 0) + (r === 4 && i > 4 ? 0.092 : 0), 0.02, -0.048 + r * 0.023);
      keys.setMatrixAt(ki++, km);
    }
  });
  kb.add(keys);
  g.add(kb);
  kit.roundBox(0.06, 0.03, 0.1, 0.02, M.plastic, 0.25, TOP + 0.015, 0.12, g);
  kit.box(0.24, 0.002, 0.2, M.rubber, 0.25, TOP + 0.001, 0.12, g);

  /* ── ScholiLink station: tablet + emulator box (demo data only) ──── */
  const tab = new THREE.Group();
  tab.position.set(-0.64, TOP, -0.04);
  tab.rotation.y = 0.35;
  kit.box(0.09, 0.01, 0.07, M.steelDark, 0, 0.005, 0, tab);
  kit.box(0.012, 0.09, 0.012, M.steelDark, 0, 0.05, -0.02, tab).rotation.x = -0.35;
  const slab = new THREE.Group();
  slab.position.set(0, 0.11, -0.005);
  slab.rotation.x = -0.32;
  kit.roundBox(0.22, 0.155, 0.009, 0.012, M.blackGloss, 0, 0, 0, slab);
  const tabScreen = kit.decal(0.205, 0.142, 512, 360, drawTablet);
  tabScreen.position.z = 0.0048;
  slab.add(tabScreen);
  tab.add(slab);
  g.add(tab);
  const emu = new THREE.Group();
  emu.position.set(-0.42, TOP, -0.22);
  kit.roundBox(0.12, 0.04, 0.09, 0.008, M.plastic, 0, 0.02, 0, emu).castShadow = true;
  const emuLabel = kit.labelPlane('SL-EMU', 0.05, { size: 40, color: '#bdb8ae' });
  emuLabel.position.set(-0.025, 0.022, 0.0455);
  emu.add(emuLabel);
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.004, 0.002), new THREE.MeshBasicMaterial({ name: 'emuLeds' }), 3);
  const lm = new THREE.Matrix4(), lc = new THREE.Color();
  for (let i = 0; i < 3; i++) {
    leds.setMatrixAt(i, lm.makeTranslation(0.022 + i * 0.01, 0.022, 0.0455));
    leds.setColorAt(i, lc.setHex(0x1a1c1e));
  }
  leds.userData.keep = true;
  emu.add(leds);
  g.add(emu);

  /* ── Chair ───────────────────────────────────────────────────────── */
  const chair = new THREE.Group();
  chair.position.set(0.0, 0, 0.66);
  chair.rotation.y = 0.25;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = kit.box(0.28, 0.02, 0.03, M.steelDark, Math.cos(a) * 0.14, 0.06, Math.sin(a) * 0.14, chair);
    leg.rotation.y = -a;
    kit.sphere(0.02, M.rubber, 8, Math.cos(a) * 0.27, 0.025, Math.sin(a) * 0.27, chair);
  }
  kit.cyl(0.022, 0.022, 0.36, M.steelLight, 10, 0, 0.25, 0, chair);
  kit.roundBox(0.46, 0.06, 0.44, 0.04, M.plastic, 0, 0.46, 0, chair).castShadow = true;
  kit.box(0.04, 0.32, 0.03, M.steelDark, 0, 0.62, 0.21, chair);
  const back = kit.roundBox(0.44, 0.4, 0.05, 0.05, M.plastic, 0, 0.86, 0.24, chair);
  back.rotation.x = 0.1;
  back.castShadow = true;
  g.add(chair);
  g.add(kit.blob(0.75, 0.75, 0, 0.66));

  if (kit.q.lights >= 2) {
    const fill = new THREE.PointLight(0xcfdcff, 0.55, 0, 2);
    fill.position.set(-0.12, TOP + 0.38, 0.18);
    g.add(world.addLight(fill, 1.2));
  }

  /* ── Registration ────────────────────────────────────────────────── */
  world.addBox(POS.x - 0.39, POS.x + 0.4, POS.z - 0.87, POS.z + 0.87);
  const ch = W(0, 0, 0.66);
  world.colliders.circles.push({ x: ch[0], z: ch[2], r: 0.3 });
  world.addOccluder([0.76, TOP, 1.72], [POS.x, TOP / 2, POS.z]);
  world.addOccluder([0.03, 0.4, 0.66], [POS.x + 0.2, TOP + 0.38, POS.z - 0.12]);

  const hs = (id, extra, anchor, hitSize, hitC, view, target) => world.addHotspot({
    id, zone: 'programming', ...extra, anchor: W(...anchor), hit: [hitSize, W(...hitC), ROT], view: [W(...view), W(...target)],
  });
  hs('monitor-main', {}, [-0.12, TOP + 0.6, -0.18], [0.68, 0.44, 0.12], [-0.12, TOP + 0.375, -0.19], [-0.12, 1.2, 0.62], [-0.12, TOP + 0.37, -0.2]);
  hs('monitor-side', {}, [0.56, TOP + 0.48, -0.1], [0.46, 0.32, 0.14], [0.56, TOP + 0.3, -0.12], [0.3, 1.18, 0.5], [0.56, TOP + 0.3, -0.12]);
  hs('scholilink', { projectId: 'sl' }, [-0.6, TOP + 0.24, -0.06], [0.42, 0.24, 0.32], [-0.55, TOP + 0.09, -0.1], [-0.5, 1.16, 0.48], [-0.58, TOP + 0.09, -0.1]);

  world.addLocation('programming', [3.3, 1.55, -0.3], [5.25, 1.12, -0.35], ['monitor-main', 'monitor-side', 'scholilink']);

  /* ── Screens ─────────────────────────────────────────────────────── */
  let source = FALLBACK_SOURCE;
  fetch('js/workshop-scene.js', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
    .then((text) => { source = text.replace(/\r/g, '').split('\n'); })
    .catch(() => { /* fall back to the excerpt */ });

  let acc = 1, scroll = 0, t0 = 0;
  world.onUpdate((dt, t, f) => {
    for (let i = 0; i < 3; i++) {
      const on = f.reduced ? i !== 2 : Math.sin(t * (2.1 + i * 1.7) + i) > -0.2;
      leds.setColorAt(i, lc.setHex(on ? (i === 0 ? 0x7ee2a0 : 0xe8eef5) : 0x1a1c1e));
    }
    leds.instanceColor.needsUpdate = true;
    acc += dt;
    if (!f.reduced) scroll += dt * 0.55;
    if (acc < 1 / kit.q.canvasHz) return;
    acc = 0;
    t0 = t;
    drawCode(mainCanvas, source, scroll, f.stats);
    mainTex.needsUpdate = true;
    drawSide(sideCanvas, Math.floor(t0 / 7) % 4, t0 % 7, world, f);
    sideTex.needsUpdate = true;
  });

  return g;
}

/* ── Code view ────────────────────────────────────────────────────────── */
const KW = /\b(import|export|from|const|let|var|function|return|await|async|for|of|in|if|else|new|class|this|default|while|break|continue|true|false|null|undefined)\b/;
const TOKEN = /(\/\/.*$)|('(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*")|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
const COL = { text: '#c9c6bf', kw: '#f4f1ea', str: '#e3c39b', num: '#aab6e8', com: '#6d6c69', fn: '#d9d6cf', gut: '#4a4a4c' };

function drawCode(canvas, lines, scroll, stats) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const s = w / 1024;
  c.fillStyle = '#0a0a0b';
  c.fillRect(0, 0, w, h);
  // tab bar
  c.fillStyle = '#121214';
  c.fillRect(0, 0, w, 34 * s);
  c.fillStyle = '#1b1b1e';
  c.fillRect(0, 0, 230 * s, 34 * s);
  c.font = `500 ${15 * s}px "JetBrains Mono", monospace`;
  c.fillStyle = '#f4f1ea';
  c.fillText('workshop-scene.js', 18 * s, 22 * s);
  c.fillStyle = '#6d6c69';
  c.fillText('kit.js', 250 * s, 22 * s);
  c.fillText('avatar.js', 330 * s, 22 * s);
  // body
  const lh = 19 * s;
  const bodyTop = 46 * s, bodyBottom = h - 30 * s;
  const visible = Math.floor((bodyBottom - bodyTop) / lh) + 1;
  const n = lines.length;
  const first = Math.floor(scroll) % n;
  const frac = (scroll % 1) * lh;
  c.save();
  c.beginPath();
  c.rect(0, bodyTop - 4 * s, w, bodyBottom - bodyTop + 4 * s);
  c.clip();
  c.font = `400 ${14 * s}px "JetBrains Mono", monospace`;
  let inBlock = false;
  // determine block-comment state at `first`
  for (let i = 0; i < first; i++) inBlock = blockState(lines[i], inBlock);
  const cursorRow = Math.floor(visible * 0.42);
  for (let r = 0; r < visible + 1; r++) {
    const li = (first + r) % n;
    const y = bodyTop + r * lh - frac + 12 * s;
    if (r === cursorRow) {
      c.fillStyle = 'rgba(255,255,255,0.045)';
      c.fillRect(0, y - 14 * s, w, lh);
    }
    c.fillStyle = COL.gut;
    c.textAlign = 'right';
    c.fillText(String(li + 1), 52 * s, y);
    c.textAlign = 'left';
    if (li === 0) inBlock = false;
    inBlock = drawLine(c, lines[li] || '', 70 * s, y, inBlock, w - 20 * s);
  }
  c.restore();
  // status bar
  c.fillStyle = '#121214';
  c.fillRect(0, h - 26 * s, w, 26 * s);
  c.font = `500 ${12.5 * s}px "JetBrains Mono", monospace`;
  c.fillStyle = '#9b9893';
  const ln = ((first + cursorRow) % n) + 1;
  const st = stats ? `${stats.calls} draw calls · ${fmtK(stats.triangles)} tris · ${stats.tier.toUpperCase()}` : '';
  c.fillText(`workshop-scene.js · Ln ${ln} · UTF-8 · ${st}`, 14 * s, h - 9 * s);
}

function blockState(line, inBlock) {
  let s = line;
  while (true) {
    if (inBlock) {
      const e = s.indexOf('*/');
      if (e < 0) return true;
      s = s.slice(e + 2);
      inBlock = false;
    } else {
      const lc = s.indexOf('//');
      const b = s.indexOf('/*');
      if (b < 0 || (lc >= 0 && lc < b)) return false;
      s = s.slice(b + 2);
      inBlock = true;
    }
  }
}

function drawLine(c, line, x, y, inBlock, maxX) {
  const text = line.length > 110 ? line.slice(0, 110) + '…' : line;
  if (inBlock || /^\s*(\/\*|\*)/.test(text)) {
    c.fillStyle = COL.com;
    c.fillText(text, x, y);
    return blockState(line, inBlock);
  }
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(text)) && x < maxX) {
    const [tok, com, str, num, word] = m;
    c.fillStyle = com ? COL.com : str ? COL.str : num ? COL.num : word && KW.test(word) ? COL.kw : COL.text;
    c.fillText(tok, x, y);
    x += c.measureText(tok).width;
    if (com) break;
  }
  return blockState(line, false);
}

function fmtK(n) { return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n); }

/* ── Second screen ────────────────────────────────────────────────────── */
function drawSide(canvas, view, local, world, f) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const s = w / 768;
  c.fillStyle = '#09090a';
  c.fillRect(0, 0, w, h);
  const titles = ['01 // SCENE GRAPH', '02 // CAD · TILE V1', '03 // SCHOLILINK EMULATOR', '04 // BRICKCAST · LAYERS'];
  c.fillStyle = '#121214';
  c.fillRect(0, 0, w, 30 * s);
  c.font = `500 ${13 * s}px "JetBrains Mono", monospace`;
  c.fillStyle = '#bdb8ae';
  c.fillText(titles[view], 14 * s, 20 * s);
  for (let i = 0; i < 4; i++) {
    c.fillStyle = i === view ? '#f4f1ea' : '#3a3a3d';
    c.fillRect(w - (70 - i * 14) * s, 13 * s, 8 * s, 4 * s);
  }
  c.save();
  c.translate(0, 30 * s);
  const H = h - 30 * s;
  if (view === 0) sceneGraph(c, s, world);
  else if (view === 1) cad(c, s, w, H);
  else if (view === 2) terminal(c, s, f.reduced ? 99 : local);
  else bricks(c, s, w, H, world.shared.brickLayers, f.reduced ? 1 : local / 7);
  c.restore();
}

function sceneGraph(c, s, world) {
  c.font = `400 ${12.5 * s}px "JetBrains Mono", monospace`;
  let y = 24 * s;
  const line = (depth, text, dim) => {
    c.fillStyle = dim ? '#6d6c69' : '#c9c6bf';
    c.fillText(`${'  '.repeat(depth)}${depth ? '└ ' : ''}${text}`, 16 * s, y);
    y += 17 * s;
  };
  line(0, `Scene · ${world.root.name}`);
  for (const zone of world.root.children) {
    if (y > 420 * s) break;
    if (!zone.name) continue;
    const kids = zone.children.filter((k) => k.name).slice(0, 2);
    line(1, `${zone.name}  (${zone.children.length})`, zone.name.startsWith('static'));
    for (const k of kids) line(2, k.name, true);
  }
}

function cad(c, s, w, H) {
  const x0 = 70 * s, y0 = 90 * s, tw = 560 * s, th = tw * (53 / 148);
  c.strokeStyle = 'rgba(220,226,235,0.85)';
  c.lineWidth = 1.5 * s;
  c.strokeRect(x0, y0, tw, th);
  c.strokeStyle = 'rgba(220,226,235,0.4)';
  for (const fx of [0.09, 0.91]) { c.beginPath(); c.arc(x0 + tw * fx, y0 + th / 2, 12 * s, 0, Math.PI * 2); c.stroke(); }
  c.setLineDash([6 * s, 5 * s]);
  c.beginPath(); c.moveTo(x0 - 20 * s, y0 + th / 2); c.lineTo(x0 + tw + 20 * s, y0 + th / 2); c.stroke();
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(x0, y0 + th + 34 * s); c.lineTo(x0 + tw, y0 + th + 34 * s);
  c.moveTo(x0 + tw + 34 * s, y0); c.lineTo(x0 + tw + 34 * s, y0 + th);
  c.stroke();
  c.fillStyle = '#dce2eb';
  c.font = `500 ${14 * s}px "JetBrains Mono", monospace`;
  c.textAlign = 'center';
  c.fillText('148.00', x0 + tw / 2, y0 + th + 54 * s);
  c.save(); c.translate(x0 + tw + 56 * s, y0 + th / 2); c.rotate(-Math.PI / 2); c.fillText('53.00', 0, 0); c.restore();
  c.textAlign = 'left';
  c.fillStyle = '#8d93a0';
  c.font = `400 ${12 * s}px "JetBrains Mono", monospace`;
  c.fillText('TILE V1 · 148 × 53 × 4 MM · MAGNET RECESS Ø8 × 2', x0, H - 40 * s);
}

function terminal(c, s, local) {
  c.font = `400 ${12 * s}px "JetBrains Mono", monospace`;
  const shown = Math.min(SL_TERMINAL_LINES.length, Math.floor(local * 4.2) + 1);
  const start = Math.max(0, shown - 23);
  const col = { cmd: '#c9c6bf', info: '#c9c6bf', ok: '#7ee2a0', meta: '#6d6c69', fn: '#aab6e8', blank: '#000' };
  for (let i = start; i < shown; i++) {
    const l = SL_TERMINAL_LINES[i];
    c.fillStyle = col[l.t];
    c.fillText(l.s, 16 * s, (22 + (i - start) * 18) * s);
  }
}

function bricks(c, s, w, H, layers, p) {
  if (!layers || !layers.length) return;
  const li = Math.min(layers.length - 1, Math.floor(p * layers.length));
  const L = layers[li];
  const cell = Math.min((w - 80 * s) / L.size, (H - 90 * s) / L.size);
  const ox = (w - cell * L.size) / 2, oy = 22 * s;
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i <= L.size; i++) {
    c.beginPath(); c.moveTo(ox + i * cell, oy); c.lineTo(ox + i * cell, oy + L.size * cell); c.stroke();
    c.beginPath(); c.moveTo(ox, oy + i * cell); c.lineTo(ox + L.size * cell, oy + i * cell); c.stroke();
  }
  for (const b of L.bricks) {
    c.fillStyle = b.color;
    c.fillRect(ox + b.x * cell + 2, oy + b.z * cell + 2, b.w * cell - 4, b.d * cell - 4);
  }
  c.fillStyle = '#bdb8ae';
  c.font = `500 ${13 * s}px "JetBrains Mono", monospace`;
  c.fillText(`LAYER ${String(li + 1).padStart(2, '0')} / ${String(layers.length).padStart(2, '0')} · ${L.bricks.length} BRICKS`, ox, oy + L.size * cell + 30 * s);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(ox, oy + L.size * cell + 44 * s, L.size * cell, 4 * s);
  c.fillStyle = '#f4f1ea';
  c.fillRect(ox, oy + L.size * cell + 44 * s, L.size * cell * ((li + 1) / layers.length), 4 * s);
}

/* ScholiLink tablet: obviously-demo, Greek-first UI. No real data. */
function drawTablet(c, w, h) {
  c.fillStyle = '#0d0e10';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#16171a';
  c.fillRect(0, 0, w, 52);
  c.fillStyle = '#f4f1ea';
  c.font = 'italic 400 26px "Cormorant Garamond", Georgia, serif';
  c.fillText('ScholiLink', 20, 34);
  c.fillStyle = '#7ee2a0';
  c.font = '500 13px "JetBrains Mono", monospace';
  c.fillText('DEMO DATA', 380, 32);
  c.fillStyle = '#c9c6bf';
  c.font = '500 18px "Geist", system-ui, sans-serif';
  c.fillText('Σήμερα', 20, 88);
  const cards = [['08:15', 'Φυσική', 'Ταλαντώσεις'], ['10:05', 'Μαθηματικά', 'Ολοκληρώματα'], ['—', 'Εργασία', 'Κεφάλαιο 3 · αύριο']];
  cards.forEach(([time, title, sub], i) => {
    const y = 106 + i * 66;
    c.fillStyle = '#17181b';
    c.fillRect(20, y, 300, 54);
    c.fillStyle = i === 2 ? '#e3c39b' : '#aab6e8';
    c.fillRect(20, y, 3, 54);
    c.fillStyle = '#6d6c69';
    c.font = '500 13px "JetBrains Mono", monospace';
    c.fillText(time, 34, y + 22);
    c.fillStyle = '#f4f1ea';
    c.font = '500 17px "Geist", system-ui, sans-serif';
    c.fillText(title, 96, y + 23);
    c.fillStyle = '#8f8c86';
    c.font = '400 14px "Geist", system-ui, sans-serif';
    c.fillText(sub, 96, y + 43);
  });
  c.fillStyle = '#17181b';
  c.fillRect(340, 106, 152, 120);
  c.fillStyle = '#e3c39b';
  c.font = '500 30px "Geist", system-ui, sans-serif';
  c.fillText('✦ 120', 360, 160);
  c.fillStyle = '#8f8c86';
  c.font = '500 13px "JetBrains Mono", monospace';
  c.fillText('SPARKS', 362, 190);
  c.fillStyle = '#4a4a4c';
  c.font = '400 12px "JetBrains Mono", monospace';
  c.fillText('student@example.com · emulator', 20, h - 20);
}
