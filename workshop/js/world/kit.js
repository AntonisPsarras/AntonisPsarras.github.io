/* ==========================================================================
   kit.js — the workshop's construction kit.

   Everything in the room is built from a small vocabulary: a shared material
   palette, procedural canvas textures, tier-aware segment counts, invisible
   hit proxies, blob shadows, and a static-geometry merger that collapses the
   hundreds of little meshes into roughly one draw call per material.
   ========================================================================== */
import * as THREE from '../../../vendor/three/three.module.js';

export { THREE };

/* Render layers: the camera only renders layer 0. Raycasts use 1 and 2, so hit
   volumes never draw and merged geometry is never ray-tested triangle by triangle. */
export const LAYER = Object.freeze({ PROXY: 1, OCCLUDER: 2 });

const PROXY_MAT = new THREE.MeshBasicMaterial({ visible: false });

export class Kit {
  constructor(quality, renderer) {
    this.q = quality;
    this.renderer = renderer;
    this.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.textures = new Set();
    this.mat = this.#palette();
  }

  /* Segment count scaled by quality tier (never below 3). */
  seg(n) { return Math.max(3, Math.round(n * this.q.segScale)); }
  /* Only build `detail` props on tiers that can afford them. */
  detail(level) { return this.q.detail >= level; }

  /* ── Materials ─────────────────────────────────────────────────────── */
  #palette() {
    const std = (color, roughness = 0.8, metalness = 0, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

    /* Noise maps are multiplicative (linear, centred just under 1.0). */
    const noise = this.noiseTexture(256, 0.88, 0.1);
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
    const floorNoise = this.noiseTexture(512, 0.84, 0.16, 3);
    floorNoise.wrapS = floorNoise.wrapT = THREE.RepeatWrapping;
    floorNoise.repeat.set(4, 4);
    const grain = this.grainTexture();

    const m = {
      plaster:     std(0x2c2c30, 0.96, 0, { map: noise }),
      gallery:     std(0x3a3a3f, 0.93, 0, { map: noise }),
      corridor:    std(0x2a2a2d, 0.9, 0, { map: noise }),
      ceiling:     std(0x1a1a1d, 1.0),
      concrete:    std(0x323235, 0.58, 0, { map: floorNoise }),
      steel:       std(0x2b2c30, 0.42, 0.85),
      steelLight:  std(0x8a8c91, 0.32, 0.9),
      steelDark:   std(0x161719, 0.55, 0.7),
      black:       std(0x0b0b0c, 0.75),
      blackGloss:  std(0x060607, 0.25, 0.1),
      rubber:      std(0x0e0e0f, 0.92),
      oak:         std(0x3b2b1f, 0.68, 0, { map: grain }),
      oakDark:     std(0x231a13, 0.72, 0, { map: grain }),
      plastic:     std(0x1f2023, 0.55),
      plasticMid:  std(0x3a3b3f, 0.5),
      pla:         std(0xd8d4cc, 0.55),
      plaWhite:    std(0xeceae3, 0.46),
      plaGrey:     std(0x8f8e8b, 0.6),
      plaWarm:     std(0xb59a7a, 0.6),
      paper:       std(0xe8e4dc, 0.95),
      mat:         std(0xe6e2d9, 0.97),
      brass:       std(0xb08250, 0.34, 1.0),
      copper:      std(0xb4774a, 0.4, 1.0),
      clay:        std(0xb7b0a6, 0.78),
      hoodie:      std(0x27282b, 0.92),
      trousers:    std(0x18181a, 0.88),
      sole:        std(0xe4e1da, 0.7),
      regolith:    std(0x6f6d69, 0.97),
      glass: new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false,
      }),
      glassSmoked: new THREE.MeshStandardMaterial({
        color: 0x101114, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.42, depthWrite: false,
      }),
      frosted: new THREE.MeshStandardMaterial({
        color: 0xd8d2c8, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false,
        emissive: 0x3a2a18, emissiveIntensity: 0.6,
      }),
      greenhouse: new THREE.MeshStandardMaterial({
        color: 0xb9c7b4, roughness: 0.2, transparent: true, opacity: 0.38, depthWrite: false,
      }),
      ledWhite:  basic(0xffffff),
      ledWarm:   basic(0xffc68a),
      ledCool:   basic(0xd9e6ff),
      ledAmber:  basic(0xffa040),
      ledRed:    basic(0xff5a3c),
      ledGreen:  basic(0x7ee2a0),
      screenOff: std(0x050506, 0.3, 0.2),
      line:      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }),
      lineDim:   new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }),
      chalkLine: new THREE.LineBasicMaterial({ color: 0xf0ede4, transparent: true, opacity: 0.55 }),
    };
    for (const k of Object.keys(m)) m[k].name = k;

    /* Material families. When static meshes are merged, members of a family
       collapse into ONE material with the member colour baked into vertex
       colours — e.g. six plastics become one draw call, not six. */
    this.families = {
      matte:    { roughness: 0.88, metalness: 0, members: ['black', 'rubber', 'paper', 'mat', 'clay', 'regolith', 'ceiling', 'hoodie', 'trousers', 'sole'] },
      satin:    { roughness: 0.55, metalness: 0, members: ['plastic', 'plasticMid', 'pla', 'plaWhite', 'plaGrey', 'plaWarm'] },
      metal:    { roughness: 0.42, metalness: 0.88, members: ['steel', 'steelLight', 'steelDark', 'brass', 'copper'] },
      plaster:  { roughness: 0.94, metalness: 0, map: noise, members: ['plaster', 'gallery', 'corridor'] },
      wood:     { roughness: 0.7, metalness: 0, map: grain, members: ['oak', 'oakDark'] },
      emissive: { basic: true, members: ['ledWhite', 'ledWarm', 'ledCool', 'ledAmber', 'ledRed', 'ledGreen'] },
    };
    for (const [name, fam] of Object.entries(this.families)) {
      for (const member of fam.members) m[member].userData.family = name;
    }
    this.familyMats = new Map();
    return m;
  }

  /* A one-off colour that still merges with its family's draw call. */
  tint(color, family = 'matte') {
    const f = this.families[family];
    const m = new THREE.MeshStandardMaterial({ color, roughness: f.roughness ?? 0.8, metalness: f.metalness ?? 0, name: `tint:${family}` });
    m.userData.family = family;
    return m;
  }

  familyMaterial(name, side) {
    const key = `${name}|${side}`;
    let mat = this.familyMats.get(key);
    if (!mat) {
      const f = this.families[name];
      mat = f.basic
        ? new THREE.MeshBasicMaterial({ vertexColors: true, side })
        : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: f.roughness, metalness: f.metalness, map: f.map || null, side });
      mat.name = `family:${name}`;
      this.familyMats.set(key, mat);
    }
    return mat;
  }

  /* ── Texture atlases ───────────────────────────────────────────────── */
  /* Labels, small screens and paper props are drawn into two shared
     canvases (unlit + lit) so they merge into two draw calls in total. */
  atlas(lit) {
    const key = lit ? '_atlasLit' : '_atlasBasic';
    if (this[key]) return this[key];
    const scale = this.q.detail === 0 ? 0.5 : 1;
    const W = 2048 * scale, H = 2048 * scale;
    const canvas = this.canvas(W, H);
    const tex = this.canvasTexture(canvas);
    tex.generateMipmaps = true;
    const material = lit
      ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0, name: 'atlasLit' })
      : new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, name: 'atlasBasic' });
    this[key] = { canvas, ctx: canvas.getContext('2d'), tex, material, W, H, scale, x: 0, y: 0, row: 0 };
    return this[key];
  }

  #alloc(a, w, h) {
    const pad = 6;
    const sw = Math.ceil(w * a.scale) + pad * 2, sh = Math.ceil(h * a.scale) + pad * 2;
    if (a.x + sw > a.W) { a.x = 0; a.y += a.row; a.row = 0; }
    if (a.y + sh > a.H || sw > a.W) return null;
    const slot = { x: a.x + pad, y: a.y + pad, w: sw - pad * 2, h: sh - pad * 2 };
    a.x += sw;
    a.row = Math.max(a.row, sh);
    return slot;
  }

  /* A plane (width × height metres) whose image is drawn by `draw(ctx, w, h)`
     in a w×h pixel box inside an atlas. Falls back to its own texture if full. */
  decal(width, height, pxW, pxH, draw, { lit = false } = {}) {
    const a = this.atlas(lit);
    const slot = this.#alloc(a, pxW, pxH);
    const geo = new THREE.PlaneGeometry(width, height);
    if (!slot) {
      const c = this.canvas(pxW, pxH);
      draw(c.getContext('2d'), pxW, pxH);
      const tex = this.canvasTexture(c);
      const mat = lit ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 }) : new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.userData.keep = true;
      return m;
    }
    const ctx = a.ctx;
    ctx.save();
    ctx.translate(slot.x, slot.y);
    ctx.beginPath();
    ctx.rect(0, 0, slot.w, slot.h);
    ctx.clip();
    ctx.scale(a.scale, a.scale);
    draw(ctx, pxW, pxH);
    ctx.restore();
    a.tex.needsUpdate = true;
    const uv = geo.attributes.uv;
    const u0 = slot.x / a.W, u1 = (slot.x + slot.w) / a.W;
    const v1 = 1 - slot.y / a.H, v0 = 1 - (slot.y + slot.h) / a.H;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    return new THREE.Mesh(geo, a.material);
  }

  /* ── Procedural textures ───────────────────────────────────────────── */
  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  track(tex) { this.textures.add(tex); return tex; }

  canvasTexture(canvas, { srgb = true, aniso = true } = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    if (aniso) tex.anisotropy = this.maxAniso;
    return this.track(tex);
  }

  /* Seeded value-noise so the room looks the same on every visit. */
  noiseTexture(size, base = 0.5, amp = 0.1, octaves = 2, seed = 7) {
    const c = this.canvas(size, size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const rand = mulberry32(seed);
    const grids = [];
    for (let o = 0; o < octaves; o++) {
      const n = 8 << o;
      const g = new Float32Array(n * n);
      for (let i = 0; i < g.length; i++) g[i] = rand();
      grids.push({ n, g });
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0, a = 1, norm = 0;
        for (const { n, g } of grids) {
          const fx = (x / size) * n, fy = (y / size) * n;
          const x0 = Math.floor(fx), y0 = Math.floor(fy);
          const tx = smooth(fx - x0), ty = smooth(fy - y0);
          const s = (ix, iy) => g[((iy % n + n) % n) * n + ((ix % n + n) % n)];
          const top = s(x0, y0) * (1 - tx) + s(x0 + 1, y0) * tx;
          const bot = s(x0, y0 + 1) * (1 - tx) + s(x0 + 1, y0 + 1) * tx;
          v += (top * (1 - ty) + bot * ty) * a;
          norm += a;
          a *= 0.5;
        }
        v = v / norm;
        const speck = rand() * 0.06 - 0.03;
        const l = Math.max(0, Math.min(1, base + (v - 0.5) * 2 * amp + speck));
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = l * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // Multiplicative map around mid-grey; material colour carries the tone.
    const tex = this.canvasTexture(c, { srgb: false });
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }

  grainTexture() {
    const w = 512, h = 128;
    const c = this.canvas(w, h);
    const ctx = c.getContext('2d');
    const rand = mulberry32(11);
    ctx.fillStyle = '#e2e2e2';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = rand() * h;
      const amp = 1 + rand() * 4;
      const freq = 0.004 + rand() * 0.01;
      const phase = rand() * 10;
      ctx.strokeStyle = `rgba(${rand() < 0.65 ? '90,90,90' : '255,255,255'},${0.06 + rand() * 0.14})`;
      ctx.lineWidth = 0.5 + rand() * 1.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin(x * freq + phase) * amp;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    const tex = this.canvasTexture(c, { srgb: false });
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /* Small mono label (short text only — never body copy). */
  labelTexture(text, opts = {}) {
    const w = opts.w ?? 512, h = opts.h ?? 96;
    const c = this.canvas(w, h);
    drawLabel(c.getContext('2d'), w, h, text, opts);
    return this.canvasTexture(c);
  }

  /* Label as an atlas decal: every label in the room shares one draw call. */
  labelPlane(text, width, opts = {}) {
    const w = opts.w ?? 512, h = opts.h ?? 96;
    return this.decal(width, width * (h / w), w, h, (ctx) => drawLabel(ctx, w, h, text, opts), { lit: !!opts.lit });
  }

  /* Radial blob shadow: cheap, convincing contact grounding. */
  blobTexture() {
    if (this._blob) return this._blob;
    const c = this.canvas(128, 128);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.38)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    this._blob = this.canvasTexture(c, { srgb: false, aniso: false });
    this._blobMat = new THREE.MeshBasicMaterial({ map: this._blob, transparent: true, depthWrite: false, opacity: 0.75 });
    this._blobMat.name = 'blob';
    return this._blob;
  }

  blob(w, d, x = 0, z = 0, y = 0.003) {
    this.blobTexture();
    const mat = this._blobMat;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.renderOrder = -1;
    return m;
  }

  /* Soft additive light wash (for picture lights, monitor glow, lamp pools). */
  washTexture() {
    if (this._wash) return this._wash;
    const c = this.canvas(128, 128);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 40, 2, 64, 64, 70);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    this._wash = this.canvasTexture(c, { srgb: false, aniso: false });
    return this._wash;
  }

  wash(w, h, color = 0xfff1dc, opacity = 0.35) {
    this._washMats ??= new Map();
    // Snap to two tints and two strengths so washes share draw calls.
    const c = new THREE.Color(color);
    color = c.b > c.r ? 0xd8e4ff : 0xffd6a8;
    opacity = opacity < 0.17 ? 0.14 : 0.2;
    const key = `${color}|${opacity}`;
    let mat = this._washMats.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: this.washTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      mat.name = `wash:${key}`;
      this._washMats.set(key, mat);
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.userData.wash = true;
    return m;
  }

  /* ── Geometry helpers ──────────────────────────────────────────────── */
  box(w, h, d, mat, x = 0, y = 0, z = 0, parent = null) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  cyl(rTop, rBot, h, mat, segs = 16, x = 0, y = 0, z = 0, parent = null, open = false) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, this.seg(segs), 1, open), mat);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  sphere(r, mat, segs = 16, x = 0, y = 0, z = 0, parent = null) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, this.seg(segs), this.seg(Math.max(6, segs * 0.6))), mat);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  /* Rounded box via an extruded rounded rectangle (for devices and enclosures). */
  roundBox(w, h, d, r, mat, x = 0, y = 0, z = 0, parent = null) {
    const shape = new THREE.Shape();
    const hw = w / 2 - r, hh = h / 2 - r;
    shape.moveTo(-hw, -h / 2);
    shape.lineTo(hw, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh);
    shape.lineTo(w / 2, hh);
    shape.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
    shape.lineTo(-hw, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
    shape.lineTo(-w / 2, -hh);
    shape.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
    const bevel = Math.min(r * 0.5, d * 0.2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: this.seg(5),
    });
    geo.translate(0, 0, -(d - bevel * 2) / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  tube(points, radius, mat, segs = 24, parent = null) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, this.seg(segs), radius, this.seg(6), false), mat);
    if (parent) parent.add(m);
    return m;
  }

  /* Invisible hit volume on the PROXY layer. `center` is world-space unless parented. */
  proxy(size, center, hotspotId, parent = null, rotationY = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), PROXY_MAT);
    m.position.set(center[0], center[1], center[2]);
    m.rotation.y = rotationY;
    m.layers.set(LAYER.PROXY);
    m.userData.hotspotId = hotspotId;
    m.userData.keep = true;
    m.userData.proxy = true;
    if (parent) parent.add(m);
    return m;
  }

  /* Coarse occluder (walls, big furniture) so clicks don't go through things. */
  occluder(size, center, parent = null, rotationY = 0, tag = 'occluder') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), PROXY_MAT);
    m.position.set(center[0], center[1], center[2]);
    m.rotation.y = rotationY;
    m.layers.set(LAYER.OCCLUDER);
    m.userData.keep = true;
    m.userData.proxy = true;
    m.userData.occluder = tag;
    if (parent) parent.add(m);
    return m;
  }

  /* ── Static merge ──────────────────────────────────────────────────── */
  /* Bakes every static mesh under `root` into one mesh per (material, shadow
     flags). Anything flagged userData.dynamic (and its subtree), userData.keep,
     instanced meshes, lines and proxies is left alone. Returns stats. */
  mergeStatic(root) {
    root.updateMatrixWorld(true);
    const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const rel = new THREE.Matrix4();
    const buckets = new Map();
    const victims = [];

    const visit = (obj, isRoot) => {
      if (obj.userData.dynamic && !isRoot) return;
      for (const child of obj.children.slice()) visit(child, false);
      if (!obj.isMesh || obj.isInstancedMesh || obj.isSkinnedMesh) return;
      if (obj.userData.keep || obj.userData.proxy || Array.isArray(obj.material)) return;
      const g = obj.geometry;
      if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
      const extra = Object.keys(g.attributes).some((k) => k !== 'position' && k !== 'normal' && k !== 'uv');
      if (extra || obj.morphTargetInfluences) return;
      const mat = obj.material;
      const fam = mat.userData.family && !mat.transparent && !mat.clippingPlanes ? mat.userData.family : null;
      const key = fam ? `family:${fam}|${mat.side}|${obj.renderOrder}` : `${mat.uuid}|${obj.renderOrder}`;
      let b = buckets.get(key);
      if (!b) {
        b = { material: fam ? this.familyMaterial(fam, mat.side) : mat, colored: !!fam, cast: false, receive: false, order: obj.renderOrder, parts: [] };
        buckets.set(key, b);
      }
      b.cast ||= obj.castShadow;
      b.receive ||= obj.receiveShadow;
      const geo = (g.index ? g.toNonIndexed() : g.clone());
      geo.applyMatrix4(rel.multiplyMatrices(toRoot, obj.matrixWorld));
      if (fam) {
        const n = geo.attributes.position.count;
        const col = new Float32Array(n * 3);
        const c = mat.color;
        for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      }
      b.parts.push(geo);
      victims.push(obj);
    };
    visit(root, true);

    for (const obj of victims) {
      obj.removeFromParent();
      obj.geometry.dispose();
    }

    const group = new THREE.Group();
    group.name = 'StaticMerged';
    let tris = 0;
    for (const b of buckets.values()) {
      const merged = concatGeometries(b.parts, b.colored);
      b.parts.forEach((p) => p.dispose());
      const mesh = new THREE.Mesh(merged, b.material);
      mesh.name = `static:${b.material.name || 'mat'}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.renderOrder = b.order;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
      tris += merged.attributes.position.count / 3;
    }
    root.add(group);
    return { merged: victims.length, drawCalls: buckets.size, triangles: Math.round(tris) };
  }

  /* Merge a moving assembly's own parts, then mark it dynamic so the global
     merge leaves it alone. Bake nested assemblies first (innermost out). */
  bake(group, { essential = true } = {}) {
    // On LOW, purely decorative motion freezes: the assembly stays static and
    // joins the global merge instead of costing its own draw calls.
    if (!essential && this.q.detail === 0) { group.userData.frozen = true; return group; }
    this.mergeStatic(group);
    group.userData.dynamic = true;
    return group;
  }
}

/* Concatenate non-indexed geometries that share position/normal/uv(/color). */
function concatGeometries(parts, colored = false) {
  let count = 0;
  for (const p of parts) count += p.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const col = colored ? new Float32Array(count * 3) : null;
  let o = 0;
  for (const p of parts) {
    const n = p.attributes.position.count;
    pos.set(p.attributes.position.array.subarray(0, n * 3), o * 3);
    nor.set(p.attributes.normal.array.subarray(0, n * 3), o * 3);
    uv.set(p.attributes.uv.array.subarray(0, n * 2), o * 2);
    if (col) col.set(p.attributes.color.array.subarray(0, n * 3), o * 3);
    o += n;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

function smooth(t) { return t * t * (3 - 2 * t); }

function drawLabel(ctx, w, h, text, { size = 34, color = '#e9e6df', bg = null, font = 'JetBrains Mono', weight = 500, align = 'center', spacing = 3, opacity = 1 } = {}) {
  ctx.globalAlpha = opacity;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "${font}", ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = align;
  const x = align === 'center' ? w / 2 : align === 'right' ? w - 12 : 12;
  ctx.fillText(text, x, h / 2 + 1);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Small math helpers shared by the zones. */
export const ease = {
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/* Dispose everything under an object (geometries, materials, textures). */
export function disposeTree(root) {
  const mats = new Set();
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
  });
  for (const m of mats) {
    for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
    m.dispose();
  }
}
