/* ==========================================================================
   guardian.js — the Guardian System's hardware, built from the project photos.

     Door lamp   : on the wall above the door, outside. Black printed body, three
                   frosted panels, a camera module tipped 45° down (Guardian3.jpg)
     Doorbell    : white printed box with a bell icon, on the corridor's left wall
                   (Guardian2.jpg)
     Portal      : inside, a frosted shell with a speaker, a small screen and a
                   3×4 keypad (Guardian1.jpg)
     Panel       : a wall tablet standing in for the project's custom Home
                   Assistant panel — two camera feeds, lamp, mode, events

   The devices follow the photos; the room around them stays fictional. The
   keypad is a demo: it has no code, unlocks nothing and stores nothing, and the
   screens say so. Every figure on the panel is demo data.

   One small state machine (world.shared.guardian) drives the 3D devices, the
   screens and the inspect-card controls, so they can't disagree.
   ========================================================================== */
import { THREE, damp } from './kit.js';
import { DOOR, CORRIDOR } from './architecture.js';

const TAU = Math.PI * 2;
const FEED_LAYER = 3;                       // the visitor's silhouette: only the feed cameras see it

const LAMP = { y: 2.5 };
const BELL = { x: -CORRIDOR.x, y: 1.3, z: 5.15 };
const PORTAL = { x: 1.2, y: 1.4 };
const TABLET = { x: 1.95, y: 1.42 };

/* Tablet screen: 640×400 px at 0.36875 mm per pixel. */
const TAB = { w: 640, h: 400, k: 0.236 / 640 };

export function buildGuardian(kit, world) {
  const g = new THREE.Group();
  const M = kit.mat;
  const door = world.shared.door;

  /* ── Shared state ────────────────────────────────────────────────────── */
  const G = {
    armed: true,
    mode: 'normal',                 // 'normal' | 'elevated'
    lamp: 'auto',                   // 'auto' | 'on' | 'off'
    cam: 'door',                    // 'door' | 'room'
    night: false,                   // night-vision tint on the feed
    code: '',                       // keypad buffer (masked on screen)
    note: '',                       // short message on the portal screen
    noteT: 0,
    challenge: 0,                   // seconds left to "present card + PIN" (elevated mode)
    alarm: 0,                       // seconds of demo alarm left
    guestHome: false,
    personDoor: false,
    events: [],
    listeners: new Set(),
    sound: () => {},                // set by the app
    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  };
  let clock = 0;
  let dirtyTft = true, dirtyTab = true;
  const touch = () => { dirtyTft = dirtyTab = true; for (const fn of G.listeners) fn(G); };
  const stamp = () => {
    const s = 22 * 3600 + 14 * 60 + 7 + Math.floor(clock);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(Math.floor(s / 3600) % 24)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  };
  G.stamp = stamp;
  G.log = (text) => { G.events.unshift({ at: stamp(), text }); if (G.events.length > 12) G.events.length = 12; touch(); };

  /* ======================================================================
     DOOR LAMP — above the door, outside, facing the corridor
     ====================================================================== */
  const lamp = new THREE.Group();
  lamp.position.set(0, LAMP.y, DOOR.zOut);
  g.add(lamp);

  const lampPanelMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, emissive: 0xffe2b4, emissiveIntensity: 0.05, roughness: 0.62, name: 'lampPanel' });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x040508, roughness: 0.07, metalness: 0.45, name: 'camLens' });
  const redDotMat = new THREE.MeshBasicMaterial({ color: 0xff3b2a, name: 'camLed' });
  const amberDotMat = new THREE.MeshBasicMaterial({ color: 0xffa040, name: 'camAmber' });

  // lower band, full width, with a hip-roofed pyramid carrying the camera block
  kit.box(0.29, 0.062, 0.05, M.blackGloss, 0, 0.031, 0.025, lamp);
  lamp.add(loft(
    [[-0.1, 0], [0.1, 0], [0.1, 0.088], [-0.1, 0.088]],
    [[-0.06, 0], [0.06, 0], [0.06, 0.058], [-0.06, 0.058]],
    0.062, M.blackGloss,
  ));
  // upper bay: floor and roof plates, four posts, three frosted panels (flat centre, two angled)
  const bay = [[-0.145, 0], [-0.145, 0.012], [-0.0525, 0.066], [0.0525, 0.066], [0.145, 0.012], [0.145, 0]];
  const y0 = 0.062, y1 = 0.15;
  lamp.add(plate(bay, y0, 0.008, M.black));
  lamp.add(plate(bay.map(([x, z]) => [x * 1.02, z * 1.02]), y1, 0.008, M.blackGloss));
  for (const [x, z] of [[-0.145, 0.012], [-0.0525, 0.066], [0.0525, 0.066], [0.145, 0.012]]) {
    kit.box(0.008, y1 - y0, 0.008, M.black, x, (y0 + y1) / 2 + 0.004, z, lamp);
  }
  const panelH = y1 - y0 - 0.006;
  const addPanel = (cx, cz, w, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, panelH), lampPanelMat);
    m.position.set(cx, (y0 + y1) / 2 + 0.005, cz);
    m.rotation.y = ry;
    lamp.add(m);                                   // the three panels share one material, so they merge into one draw call
  };
  const sideAng = Math.atan2(0.066 - 0.012, 0.145 - 0.0525);        // ≈ 30°
  addPanel(0, 0.0645, 0.093, 0);
  addPanel(-0.0988, 0.039, 0.1, -sideAng);
  addPanel(0.0988, 0.039, 0.1, sideAng);

  // camera module: a compact black block let into the centre facet, tipped so the lens looks 45° down.
  // Its top edge sits flush in the facade; its lower edge steps out below the band, as in Guardian3.jpg.
  const CAM_PITCH = Math.PI / 4;
  const camMod = new THREE.Group();
  camMod.position.set(0, 0.032, 0.068);
  camMod.rotation.x = CAM_PITCH;                   // +x tips local +z (the lens axis) down
  lamp.add(camMod);
  kit.box(0.07, 0.064, 0.045, M.black, 0, 0, 0.0025, camMod);
  kit.box(0.05, 0.0025, 0.022, M.steelDark, 0, -0.0325, 0.004, camMod);                // vent slot on the underside
  const lensRing = kit.cyl(0.0095, 0.0095, 0.004, M.steelDark, 20, 0.004, -0.01, 0.0245, camMod);
  lensRing.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0074, 0.0045, kit.seg(20)), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.004, -0.01, 0.0248);
  lens.userData.keep = true;
  camMod.add(lens);
  const redDot = new THREE.Mesh(new THREE.CircleGeometry(0.0016, 10), redDotMat);
  redDot.position.set(0.004, -0.01, 0.0273);
  redDot.userData.keep = true;
  camMod.add(redDot);
  const amberDot = new THREE.Mesh(new THREE.CircleGeometry(0.0017, 10), amberDotMat);
  amberDot.position.set(-0.026, -0.004, 0.0254);
  amberDot.userData.keep = true;
  camMod.add(amberDot);
  lamp.updateMatrixWorld(true);
  const lensWorld = new THREE.Vector3(0.004, -0.01, 0.0275).applyMatrix4(camMod.matrixWorld);   // the door camera sits at the lens (world space: the groups above are unrotated)
  const lensDir = new THREE.Vector3(0, -Math.sin(CAM_PITCH), Math.cos(CAM_PITCH));

  // what the lamp does to the corridor
  // a point light just in front of the panels, like the sconce it replaces: it washes the door,
  // the wall around it and the corridor
  const lampSpot = new THREE.PointLight(0xffdcae, 0, 0, 2);
  lampSpot.position.set(0, LAMP.y - 0.06, DOOR.zOut + 0.28);
  g.add(lampSpot);
  // a soft halo that fades to nothing inside its own bounds (the shared wash texture doesn't)
  const glowCanvas = kit.canvas(128, 128);
  {
    const c = glowCanvas.getContext('2d');
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.4)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 128, 128);
  }
  const glowTex = kit.canvasTexture(glowCanvas, { srgb: false, aniso: false });
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  lampGlow.scale.set(0.8, 0.5, 1);
  lampGlow.position.set(0, LAMP.y + 0.1, DOOR.zOut + 0.1);
  g.add(lampGlow);
  let lampLevel = 0, lampWant = 0;

  /* ======================================================================
     DOORBELL — corridor's left wall, white printed box with a bell icon
     ====================================================================== */
  const bell = new THREE.Group();
  bell.position.set(BELL.x, BELL.y, BELL.z);
  bell.rotation.y = Math.PI / 2;                     // local +z → world +x, into the corridor
  g.add(bell);
  kit.roundBox(0.064, 0.074, 0.02, 0.012, M.plaWhite, 0, 0, 0.01, bell);              // back shell
  const cap = new THREE.Group();                                                     // front cap, offset like the print
  kit.roundBox(0.056, 0.066, 0.012, 0.010, M.plaWhite, 0, 0, 0, cap);
  const bellIconTex = kit.canvasTexture(drawBellIcon(kit));
  const bellIcon = new THREE.Mesh(new THREE.PlaneGeometry(0.0285, 0.033), new THREE.MeshBasicMaterial({ map: bellIconTex, transparent: true, depthWrite: false, toneMapped: false, name: 'bellIcon' }));
  bellIcon.position.set(-0.002, 0.003, 0.0066);
  bellIcon.userData.keep = true;
  cap.add(bellIcon);
  cap.position.set(-0.004, -0.004, 0.0275);
  cap.userData.dynamic = true;
  bell.add(cap);
  const bellGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff7a40, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  bellGlow.scale.set(0.09, 0.09, 1);
  bellGlow.position.set(BELL.x + 0.04, BELL.y, BELL.z);
  g.add(bellGlow);
  let bellState = 'idle', bellPulse = 0, bellPress = 0;

  /* ======================================================================
     INTERIOR PORTAL — frosted shell, speaker, screen, keypad
     ====================================================================== */
  const portal = new THREE.Group();
  portal.position.set(PORTAL.x, PORTAL.y, DOOR.zIn);
  portal.rotation.y = Math.PI;                       // faces into the room
  g.add(portal);
  const inPortal = (x, y, z) => [PORTAL.x - x, PORTAL.y + y, DOOR.zIn - z];   // local → world

  kit.roundBox(0.128, 0.305, 0.022, 0.011, M.plaWhite, 0, 0, 0.011, portal);
  for (const y of [0.0345, -0.0365]) kit.box(0.112, 0.0014, 0.001, M.black, 0, y, 0.0221, portal);   // seams between modules

  // speaker: bezel, grooved cone, dust cap — the cone pulses on a chime
  const SPK_Y = 0.088;
  kit.cyl(0.0425, 0.0425, 0.0012, M.black, 36, 0, SPK_Y, 0.0222, portal).rotation.x = Math.PI / 2;
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.0398, 0.0032, 8, kit.seg(40)), M.blackGloss);
  bezel.position.set(0, SPK_Y, 0.0232);
  portal.add(bezel);
  const speaker = new THREE.Group();
  speaker.position.set(0, SPK_Y, 0.0225);
  const coneProfile = [[0.0372, 0.0004], [0.034, -0.0006], [0.024, -0.0022], [0.014, -0.0036], [0.0112, -0.0038], [0.0112, -0.0024]]
    .map(([r, z]) => new THREE.Vector2(r, z));
  // dark grey rather than black, so the cone's shape catches the light like the photo's
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.4, metalness: 0.5, name: 'speakerCone' });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.28, metalness: 0.75, name: 'speakerCap' });
  const cone = new THREE.Mesh(new THREE.LatheGeometry(coneProfile, kit.seg(40)), coneMat);
  cone.rotation.x = Math.PI / 2;
  speaker.add(cone);
  for (const r of [0.031, 0.0235, 0.0175]) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0007, 4, kit.seg(40)), M.black);
    groove.position.z = 0.0003 - (0.0372 - r) * 0.12;
    speaker.add(groove);
  }
  const cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.0112, kit.seg(20), kit.seg(10), 0, TAU, 0, Math.PI / 2), capMat);
  cap2.rotation.x = Math.PI / 2;
  cap2.scale.set(1, 0.55, 1);
  cap2.position.z = -0.0022;
  speaker.add(cap2);
  kit.bake(speaker);
  portal.add(speaker);

  // screen module: four screws, a black bezel and a 1.9″-style display
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const s = kit.cyl(0.0034, 0.0034, 0.0022, M.steelLight, 10, sx * 0.0415, -0.001 + sy * 0.0215, 0.0229, portal);
    s.rotation.x = Math.PI / 2;
    kit.box(0.005, 0.0007, 0.0004, M.steelDark, sx * 0.0415, -0.001 + sy * 0.0215, 0.0241, portal);
  }
  kit.box(0.052, 0.035, 0.0035, M.blackGloss, 0, -0.001, 0.0235, portal);
  const tftCanvas = kit.canvas(320, 208);
  const tftTex = kit.canvasTexture(tftCanvas);
  const tft = new THREE.Mesh(new THREE.PlaneGeometry(0.0455, 0.0296), new THREE.MeshBasicMaterial({ map: tftTex, toneMapped: false, name: 'portalTft' }));
  tft.position.set(0, -0.001, 0.0254);
  tft.userData.keep = true;
  portal.add(tft);

  // keypad: black plate, four screws, twelve raised keycaps (one instanced mesh), printed legends
  const KP = { y: -0.094, colX: [-0.0255, 0, 0.0255], rowY: [0.03525, 0.01175, -0.01175, -0.03525] };
  kit.roundBox(0.096, 0.112, 0.007, 0.006, M.black, 0, KP.y, 0.0235, portal);
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const s = kit.cyl(0.0032, 0.0032, 0.0018, M.steelLight, 10, sx * 0.0415, KP.y + sy * 0.0495, 0.0272, portal);
    s.rotation.x = Math.PI / 2;
  }
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const LEGEND = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PRS', 8: 'TUV', 9: 'WXY', 0: 'OPER' };
  const keyGeo = kit.roundBox(0.02, 0.018, 0.006, 0.003, M.black).geometry;
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0, name: 'keycaps' });
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, 12);
  keys.userData.keep = true;
  keys.userData.dynamic = true;
  keys.frustumCulled = false;
  const keyLocal = KEYS.map((_, i) => [KP.colX[i % 3], KP.y + KP.rowY[Math.floor(i / 3)]]);
  const keyDepth = new Float32Array(12);
  const keyTint = KEYS.map(() => new THREE.Color(0x18181a));
  const m4 = new THREE.Matrix4();
  const keyBase = new THREE.Color(0x18181a), keyHot = new THREE.Color(0x707478);
  function placeKeys() {
    keyLocal.forEach(([x, y], i) => {
      m4.makeTranslation(x, y, 0.0292 - keyDepth[i] * 0.0022);
      keys.setMatrixAt(i, m4);
      keys.setColorAt(i, keyTint[i].copy(keyBase).lerp(keyHot, keyDepth[i]));
    });
    keys.instanceMatrix.needsUpdate = true;
    keys.instanceColor.needsUpdate = true;
  }
  placeKeys();
  portal.add(keys);
  const legend = kit.decal(0.078, 0.1, 468, 600, (c) => {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#f2f2f2';
    KEYS.forEach((k, i) => {
      const cx = 234 + KP.colX[i % 3] * 6000, cy = 300 - KP.rowY[Math.floor(i / 3)] * 6000;
      const sub = LEGEND[k];
      c.font = 'bold 27px Arial, Helvetica, sans-serif';
      c.fillText(k === '*' ? '✱' : k, cx, cy + (sub ? 9 : 2));
      if (sub) { c.font = 'bold 14px Arial, Helvetica, sans-serif'; c.fillText(sub, cx, cy - 15); }
    });
  });
  legend.position.set(0, KP.y, 0.0326);
  portal.add(legend);

  // light pipes in the frosted frame
  const pipePos = [];
  for (const sx of [-1, 1]) for (const y of [0.1455, 0.088, 0.0, -0.088, -0.1455]) pipePos.push([sx * 0.0585, y]);
  const pipeMat = new THREE.MeshBasicMaterial({ color: 0x9fc8ff, name: 'portalPipes' });
  const pipes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0026, 8, 6), pipeMat, pipePos.length);
  pipes.userData.keep = true;
  pipes.userData.dynamic = true;
  pipes.frustumCulled = false;
  pipePos.forEach(([x, y], i) => { m4.compose(new THREE.Vector3(x, y, 0.0222), new THREE.Quaternion(), new THREE.Vector3(1, 1, 0.45)); pipes.setMatrixAt(i, m4); });
  portal.add(pipes);

  /* ======================================================================
     CONTROL PANEL — a wall tablet: camera feed, lamp, mode, presence, events
     ====================================================================== */
  const pad = new THREE.Group();
  pad.position.set(TABLET.x, TABLET.y, DOOR.zIn);
  pad.rotation.y = Math.PI;
  g.add(pad);
  const inPad = (px, py, z = 0.012) => [TABLET.x - (px - TAB.w / 2) * TAB.k, TABLET.y + (TAB.h / 2 - py) * TAB.k, DOOR.zIn - z];
  kit.roundBox(0.262, 0.172, 0.012, 0.009, M.blackGloss, 0, 0, 0.006, pad);
  kit.box(0.05, 0.03, 0.012, M.steelDark, 0, 0, -0.004, pad);                         // wall plate behind
  const tabCanvas = kit.canvas(TAB.w, TAB.h);
  const tabTex = kit.canvasTexture(tabCanvas);
  const tabScreen = new THREE.Mesh(new THREE.PlaneGeometry(TAB.w * TAB.k, TAB.h * TAB.k), new THREE.MeshBasicMaterial({ map: tabTex, toneMapped: false, name: 'panelScreen' }));
  tabScreen.position.set(0, 0, 0.0123);
  tabScreen.userData.keep = true;
  pad.add(tabScreen);
  kit.sphere(0.0016, M.steelDark, 8, 0, 0.0795, 0.0123, pad);                          // front camera dot

  /* ── The camera feeds ── */
  const FEED = { x: 12, y: 44, w: 380, h: 214 };
  const detail = kit.q.detail;
  const rt = new THREE.WebGLRenderTarget(detail === 0 ? 256 : 320, detail === 0 ? 144 : 180, { depthBuffer: true });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const feedMat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: rt.texture }, uTime: { value: 0 }, uNight: { value: 0 }, uGain: { value: 1.9 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tMap; uniform float uTime; uniform float uNight; uniform float uGain;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 c = texture2D(tMap, vUv).rgb * uGain;        // linear
        c = c / (1.0 + c * 0.55);
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        vec3 cctv = mix(vec3(l), c, 0.5) * vec3(0.96, 1.0, 1.04);
        vec3 nv = vec3(0.22, 1.0, 0.42) * l * 1.4;
        c = mix(cctv, nv, uNight);
        vec3 s = pow(max(c, 0.0), vec3(1.0 / 2.2));       // to display space, then the CCTV effects
        float scan = 0.94 + 0.06 * sin(vUv.y * 340.0 + uTime * 5.0);
        float grain = (hash(vUv * 420.0 + fract(uTime)) - 0.5) * 0.045;
        vec2 d = vUv - 0.5;
        s = (s * scan + grain) * (1.0 - dot(d, d) * 1.15);
        gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
      }`,
    toneMapped: false,
  });
  const feedPlane = new THREE.Mesh(new THREE.PlaneGeometry(FEED.w * TAB.k, FEED.h * TAB.k), feedMat);
  const fcx = FEED.x + FEED.w / 2, fcy = FEED.y + FEED.h / 2;
  feedPlane.position.set((fcx - TAB.w / 2) * TAB.k, (TAB.h / 2 - fcy) * TAB.k, 0.0127);
  feedPlane.userData.keep = true;
  pad.add(feedPlane);
  const osdCanvas = kit.canvas(320, 180);
  const osdTex = kit.canvasTexture(osdCanvas);
  const osdPlane = new THREE.Mesh(new THREE.PlaneGeometry(FEED.w * TAB.k, FEED.h * TAB.k), new THREE.MeshBasicMaterial({ map: osdTex, transparent: true, depthWrite: false, toneMapped: false, name: 'feedOsd' }));
  osdPlane.position.copy(feedPlane.position);
  osdPlane.position.z = 0.0129;
  osdPlane.userData.keep = true;
  pad.add(osdPlane);

  const CAMS = {
    door: { label: 'DOOR CAM', demo: false, cam: new THREE.PerspectiveCamera(98, 16 / 9, 0.05, 30), pos: lensWorld.toArray(), look: lensWorld.clone().addScaledVector(lensDir, 3).toArray() },
    room: { label: 'ROOM CAM', demo: true, cam: new THREE.PerspectiveCamera(84, 16 / 9, 0.05, 30), pos: [3.2, 2.98, 4.2], look: [-0.4, 0.95, -0.4] },
  };
  for (const c of Object.values(CAMS)) {
    c.cam.position.set(...c.pos);
    c.cam.lookAt(...c.look);
    c.cam.layers.enable(FEED_LAYER);
    c.cam.updateMatrixWorld(true);
  }
  // the visitor, as seen by the cameras: a dark silhouette on a layer only they render
  const visitor = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.35, 4, 12), new THREE.MeshBasicMaterial({ color: 0x23262b, name: 'visitorSilhouette' }));
  visitor.layers.set(FEED_LAYER);
  visitor.userData.keep = true;
  visitor.frustumCulled = false;
  g.add(visitor);

  /* ======================================================================
     Screens
     ====================================================================== */
  function tftState() {
    if (G.alarm > 0) return { text: 'ALARM · DEMO', color: Math.floor(G.alarm * 3) % 2 ? '#d03a2f' : '#7d1f1a', line: 'Silent demo alarm' };
    if (G.challenge > 0) return { text: 'CHALLENGE', color: '#d98a1f', line: `Card + PIN  ${Math.ceil(G.challenge)}s` };
    if (!G.armed) return { text: 'DISARMED', color: '#2d9b57', line: G.note || 'Ready for input' };
    return { text: 'SYSTEM ARMED', color: '#1f6fc2', line: G.note || 'Ready for input' };
  }

  function drawTft() {
    const c = tftCanvas.getContext('2d');
    const W = 320, H = 208;
    const s = tftState();
    c.fillStyle = '#eef3f8';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#16365e';
    c.fillRect(0, 0, W, 31);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffffff';
    c.font = 'bold 17px Arial, Helvetica, sans-serif';
    c.fillText('SECONDARY PORTAL', W / 2, 17);
    c.fillStyle = s.color;
    c.fillRect(8, 44, W - 16, 64);
    c.fillStyle = '#ffffff';
    c.font = 'bold 31px Arial, Helvetica, sans-serif';
    c.fillText(s.text, W / 2, 77);
    c.fillStyle = '#1c2530';
    c.font = '21px Arial, Helvetica, sans-serif';
    c.fillText(G.code ? '•'.repeat(G.code.length).split('').join(' ') : s.line, W / 2, 138);
    c.fillStyle = '#16365e';
    c.font = 'bold 21px Arial, Helvetica, sans-serif';
    c.fillText(`Mode: ${G.mode === 'elevated' ? 'Elevated' : 'Normal'}`, W / 2, 178);
    tftTex.needsUpdate = true;
  }

  const BTN = {
    cam_door:  { x: 12,  y: 264, w: 62,  h: 28, label: 'DOOR' },
    cam_room:  { x: 80,  y: 264, w: 108, h: 28, label: 'ROOM · DEMO' },
    night:     { x: 194, y: 264, w: 62,  h: 28, label: 'NIGHT' },
    sim:       { x: 262, y: 264, w: 130, h: 28, label: 'SIM VISITOR' },
    lamp:      { x: 404, y: 44,  w: 224, h: 58, label: 'DOOR LAMP' },
    mode:      { x: 404, y: 108, w: 224, h: 58, label: 'MODE' },
    arm:       { x: 404, y: 172, w: 224, h: 58, label: 'SYSTEM' },
  };

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawTablet() {
    const c = tabCanvas.getContext('2d');
    c.fillStyle = '#080a0d';
    c.fillRect(0, 0, TAB.w, TAB.h);
    c.textBaseline = 'middle';
    // header
    c.fillStyle = '#0f1318';
    c.fillRect(0, 0, TAB.w, 34);
    c.textAlign = 'left';
    c.fillStyle = '#e9ecf0';
    c.font = '500 15px "JetBrains Mono", ui-monospace, monospace';
    c.fillText('GUARDIAN  //  CONTROL PANEL', 14, 18);
    c.textAlign = 'right';
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.font = '400 12px "JetBrains Mono", ui-monospace, monospace';
    c.fillText(`DEMO DATA   ${stamp()}`, TAB.w - 14, 18);
    // feed frame (the live feed plane sits over this)
    c.fillStyle = '#000';
    c.fillRect(FEED.x - 1, FEED.y - 1, FEED.w + 2, FEED.h + 2);
    const chip = (b, on, text, sub) => {
      roundRect(c, b.x, b.y, b.w, b.h, 4);
      c.fillStyle = on ? '#e9ecf0' : 'rgba(255,255,255,0.05)';
      c.fill();
      c.strokeStyle = on ? '#e9ecf0' : 'rgba(255,255,255,0.18)';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = on ? '#0a0c0f' : 'rgba(255,255,255,0.72)';
      c.textAlign = 'center';
      c.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      c.fillText(text, b.x + b.w / 2, b.y + b.h / 2 + 1);
    };
    chip(BTN.cam_door, G.cam === 'door', 'DOOR');
    chip(BTN.cam_room, G.cam === 'room', 'ROOM · DEMO');
    chip(BTN.night, G.night, 'NIGHT');
    chip(BTN.sim, simT >= 0, simT >= 0 ? 'SIMULATING…' : 'SIM VISITOR');
    // right column cards
    const card = (b, title, value, sub, hot) => {
      roundRect(c, b.x, b.y, b.w, b.h, 5);
      c.fillStyle = 'rgba(255,255,255,0.045)';
      c.fill();
      c.strokeStyle = hot ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)';
      c.stroke();
      c.textAlign = 'left';
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.font = '400 11px "JetBrains Mono", ui-monospace, monospace';
      c.fillText(title, b.x + 12, b.y + 15);
      c.fillStyle = hot ? '#ffe2b4' : '#e9ecf0';
      c.font = '500 19px "JetBrains Mono", ui-monospace, monospace';
      c.fillText(value, b.x + 12, b.y + 37);
      if (sub) {
        c.textAlign = 'right';
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.font = '400 11px "JetBrains Mono", ui-monospace, monospace';
        c.fillText(sub, b.x + b.w - 12, b.y + 37);
      }
    };
    card(BTN.lamp, 'DOOR LAMP', G.lamp.toUpperCase(), lampLevel > 0.5 ? 'LIT' : 'OFF', lampLevel > 0.5);
    card(BTN.mode, 'MODE', G.mode.toUpperCase(), G.challenge > 0 ? 'CHALLENGE' : '', G.mode === 'elevated');
    card(BTN.arm, 'SYSTEM', G.alarm > 0 ? 'ALARM · DEMO' : G.armed ? 'ARMED' : 'DISARMED', '', G.alarm > 0);
    // presence
    c.textAlign = 'left';
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.font = '400 11px "JetBrains Mono", ui-monospace, monospace';
    c.fillText('PRESENCE', 404, 246);
    const dot = (x, y, on) => { c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fillStyle = on ? '#7ee2a0' : 'rgba(255,255,255,0.25)'; c.fill(); };
    c.fillStyle = '#e9ecf0';
    c.font = '400 13px "JetBrains Mono", ui-monospace, monospace';
    dot(410, 264, true); c.fillText('Antonis      HOME', 420, 265);
    dot(410, 282, G.guestHome); c.fillText(`Guest (you)  ${G.guestHome ? 'HOME' : 'AWAY'}`, 420, 283);
    // events
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.font = '400 11px "JetBrains Mono", ui-monospace, monospace';
    c.fillText('EVENTS', 14, 308);
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(14, 316, TAB.w - 28, 1);
    c.font = '400 13px "JetBrains Mono", ui-monospace, monospace';
    for (let i = 0; i < 4; i++) {
      const ev = G.events[i];
      if (!ev) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillText(i === 0 ? 'no events yet' : '', 14, 334 + i * 20); continue; }
      c.fillStyle = i === 0 ? '#e9ecf0' : 'rgba(255,255,255,0.55)';
      c.textAlign = 'left';
      c.fillText(`${ev.at}   ${ev.text}`, 14, 334 + i * 20);
    }
    tabTex.needsUpdate = true;
  }

  /* On-screen display over the feed: camera name, REC, clock, and the person box. */
  let feedHasFrame = false;
  const corner = new THREE.Vector3();
  function drawOsd(cam, people) {
    const c = osdCanvas.getContext('2d');
    const W = 320, H = 180;
    c.clearRect(0, 0, W, H);
    c.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
    c.textBaseline = 'top';
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.textAlign = 'left';
    c.fillText(CAMS[cam].label + (CAMS[cam].demo ? ' · DEMO' : ''), 8, 7);
    c.textAlign = 'right';
    c.fillText(stamp(), W - 8, 7);
    if (Math.floor(clock * 1.2) % 2 === 0) { c.fillStyle = '#ff4a3a'; c.beginPath(); c.arc(14, H - 12, 3.4, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.textAlign = 'left';
    c.fillText('REC', 22, H - 18);
    for (const person of people || []) {
      c.strokeStyle = '#52f08a';
      c.lineWidth = 1.6;
      c.strokeRect(person.x0, person.y0, person.x1 - person.x0, person.y1 - person.y0);
      c.fillStyle = '#52f08a';
      const label = `person ${Math.round(person.conf * 100)}%`;
      const lw = c.measureText(label).width + 8;
      const lx = Math.min(W - lw, Math.max(0, person.x0));
      const ly = Math.max(0, person.y0 - 14);
      c.fillRect(lx, ly, lw, 13);
      c.fillStyle = '#05140a';
      c.textAlign = 'left';
      c.fillText(label, lx + 4, ly + 1);
    }
    osdTex.needsUpdate = true;
  }

  function personBox(cam, v, seed = 0) {
    const half = [0.3, 0.875, 0.22];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ahead = 0;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      corner.set(v.x + sx * half[0], 0.875 + sy * half[1], v.z + sz * half[2]).project(cam);
      if (corner.z > 1 || corner.z < -1) continue;
      ahead++;
      x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x);
      y0 = Math.min(y0, corner.y); y1 = Math.max(y1, corner.y);
    }
    if (ahead < 8 || x1 < -1 || x0 > 1 || y1 < -1 || y0 > 1) return null;
    const toPx = (nx, ny) => [(nx * 0.5 + 0.5) * 320, (-ny * 0.5 + 0.5) * 180];
    const [ax, ay] = toPx(Math.max(-1, x0), Math.min(1, y1));
    const [bx, by] = toPx(Math.min(1, x1), Math.max(-1, y0));
    if (bx - ax < 5 || by - ay < 8) return null;
    return { x0: ax, y0: ay, x1: bx, y1: by, conf: 0.9 + 0.06 * Math.sin(clock * 2.7 + seed) };
  }

  let feedClock = 0;
  function renderFeed(f, dt) {
    const r = f.renderer;
    if (!r) return;
    const hz = detail === 0 || f.reduced ? 5 : 10;
    feedClock -= dt;
    if (feedClock > 0) return;
    feedClock = 1 / hz;
    const cam = CAMS[G.cam].cam;
    const v = f.camera.position;
    visitor.position.set(v.x, 0.875, v.z);
    visitor.visible = true;
    simFigure.visible = simT >= 0;
    feedPlane.visible = false;
    osdPlane.visible = false;
    const prev = r.getRenderTarget();
    r.setRenderTarget(rt);
    r.render(f.scene, cam);
    r.setRenderTarget(prev);
    feedPlane.visible = true;
    osdPlane.visible = true;
    visitor.visible = false;                         // the feed pass is the only place they are drawn
    simFigure.visible = false;
    feedMat.uniforms.uTime.value = clock;
    feedMat.uniforms.uNight.value = G.night ? 1 : 0;
    feedHasFrame = true;
    const boxes = [];
    const mine = personBox(cam, v, 0);
    if (mine) boxes.push(mine);
    if (simT >= 0) { const sb = personBox(cam, simFigure.position, 2.1); if (sb) boxes.push(sb); }
    drawOsd(G.cam, boxes);
  }
  visitor.visible = false;
  // a second silhouette for the "simulate a visitor" demo, walking the corridor on its own
  const simFigure = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.35, 4, 12), new THREE.MeshBasicMaterial({ color: 0x2b2e33, name: 'simSilhouette' }));
  simFigure.layers.set(FEED_LAYER);
  simFigure.userData.keep = true;
  simFigure.frustumCulled = false;
  simFigure.visible = false;
  g.add(simFigure);
  let simT = -1, simBell = false;
  function simStep(dt) {
    simT += dt;
    const t = simT;
    let x, z;
    if (t < 6) { const k = t / 6; const e = k * k * (3 - 2 * k); x = 0.35 + (-0.55 - 0.35) * e; z = 9.0 + (5.45 - 9.0) * e; }
    else if (t < 7.8) { x = -0.55; z = 5.45; if (t > 7 && !simBell) { simBell = true; G.ring(); } }
    else if (t < 11.5) { const k = (t - 7.8) / 3.7; const e = k * k * (3 - 2 * k); x = -0.55 + 0.9 * e; z = 5.45 + 3.55 * e; }
    else { simT = -1; simBell = false; simFigure.visible = false; touch(); return false; }
    simFigure.position.set(x, 0.875, z);
    return true;
  }
  G.simulate = () => { if (simT >= 0) return; simT = 0; simBell = false; G.log('SIMULATION · visitor on the way'); G.sound('tick'); touch(); };
  // layers decide who draws it; visibility only has to be true during the feed pass

  /* ======================================================================
     Actions (shared by the 3D devices, the tablet buttons and the cards)
     ====================================================================== */
  G.ring = () => {
    bellPress = 1;
    bellPulse = 0;
    spkPulse = 1;
    G.sound('chime');
    G.log('DOORBELL pressed');
  };
  G.pressKey = (k) => {
    const i = KEYS.indexOf(k);
    if (i >= 0) keyDepth[i] = 1;
    G.sound('beep');
    if (G.alarm > 0) return;
    if (k === '*') { G.code = ''; G.note = ''; touch(); return; }
    if (k === '#') {
      const had = G.code.length > 0;
      G.code = '';
      if (!had) { G.note = 'Enter a code, then #'; G.noteT = 2.5; G.sound('deny'); touch(); return; }
      if (G.challenge > 0) { G.challenge = 0; G.note = 'Challenge cleared'; G.noteT = 3; G.log('CHALLENGE cleared (demo)'); G.sound('ok'); touch(); return; }
      G.armed = !G.armed;
      G.note = 'Demo: no code needed';
      G.noteT = 3;
      G.log(G.armed ? 'SYSTEM armed (keypad, demo)' : 'SYSTEM disarmed (keypad, demo)');
      G.sound('ok');
      touch();
      return;
    }
    if (G.code.length < 6) G.code += k;
    touch();
  };
  G.setLamp = (m) => { G.lamp = m; G.log(`LAMP set to ${m.toUpperCase()}`); };
  G.cycleLamp = () => G.setLamp(G.lamp === 'auto' ? 'on' : G.lamp === 'on' ? 'off' : 'auto');
  G.setMode = (m) => { G.mode = m; G.challenge = 0; G.log(`MODE ${m.toUpperCase()}`); G.sound('tick'); };
  G.toggleMode = () => G.setMode(G.mode === 'normal' ? 'elevated' : 'normal');
  G.toggleArmed = () => { G.armed = !G.armed; G.alarm = 0; G.challenge = 0; G.note = ''; G.log(G.armed ? 'SYSTEM armed' : 'SYSTEM disarmed'); G.sound('ok'); };
  G.selectCam = (id) => { if (!CAMS[id]) return; G.cam = id; feedClock = 0; G.log(`${CAMS[id].label} selected`); G.sound('tick'); };
  G.toggleNight = () => { G.night = !G.night; feedClock = 0; touch(); G.sound('tick'); };
  G.clearEvents = () => { G.events.length = 0; touch(); };
  G.readout = () => {
    const rows = [
      `STATE   ${G.alarm > 0 ? 'ALARM (DEMO)' : G.armed ? 'ARMED' : 'DISARMED'} · ${G.mode.toUpperCase()}`,
      `LAMP    ${G.lamp.toUpperCase()}${lampLevel > 0.5 ? ' · LIT' : ''}`,
      `CAMERA  ${CAMS[G.cam].label}${CAMS[G.cam].demo ? ' (demo)' : ''}${G.night ? ' · NIGHT' : ''}`,
      `PERSON  ${G.personDoor ? 'at the door' : '—'}`,
      '',
      ...(G.events.length ? G.events.slice(0, 5).map((e) => `${e.at}  ${e.text}`) : ['no events yet']),
    ];
    return rows.join('\n');
  };
  G.cams = CAMS;

  let spkPulse = 0;

  /* ======================================================================
     Hotspots
     ====================================================================== */
  world.addHotspot({
    id: 'guardian-lamp', zone: 'guardian', fit: 0.38,
    anchor: [0, LAMP.y + 0.13, DOOR.zOut + 0.1],
    hit: [[0.34, 0.22, 0.16], [0, LAMP.y + 0.07, DOOR.zOut + 0.07]],
    view: [[0.12, 1.85, 6.2], [0, LAMP.y + 0.05, DOOR.zOut + 0.05]],
  });
  world.addHotspot({
    id: 'doorbell', zone: 'guardian', kind: 'action', fit: 0.14,
    anchor: [BELL.x + 0.05, BELL.y + 0.07, BELL.z],
    hit: [[0.07, 0.11, 0.1], [BELL.x + 0.035, BELL.y, BELL.z]],
    view: [[-0.66, 1.38, 5.55], [BELL.x, BELL.y, BELL.z]],
  });
  world.addHotspot({
    id: 'guardian-panel', zone: 'guardian', fit: 0.2,
    anchor: [...inPortal(0, 0.17, 0.03)],
    hit: [[0.14, 0.32, 0.025], [PORTAL.x, PORTAL.y, DOOR.zIn - 0.0215]],   // front face at 4.466: just proud of the 6 cm wall occluder (4.47), behind the keys' proxies (4.4625)
    view: [[PORTAL.x - 0.08, PORTAL.y + 0.02, 3.9], [PORTAL.x, PORTAL.y - 0.02, DOOR.zIn]],
  });
  world.addHotspot({
    id: 'guardian-tablet', zone: 'guardian', fit: 0.3,
    anchor: [...inPad(TAB.w / 2, 0, 0.03)],
    hit: [[0.27, 0.18, 0.025], [TABLET.x, TABLET.y, DOOR.zIn - 0.0215]],
    view: [[TABLET.x - 0.02, TABLET.y + 0.01, 4.17], [TABLET.x, TABLET.y, DOOR.zIn]],
  });

  // keypad keys and tablet buttons act in place; they never open a card
  KEYS.forEach((k, i) => {
    const [x, y] = keyLocal[i];
    const [wx, wy, wz] = inPortal(x, y, 0.029);
    world.addHotspot({
      id: `guardian-key-${i}`, zone: 'guardian', kind: 'action', quiet: true, label: k === '*' ? 'Key ✱' : `Key ${k}`,
      anchor: [wx, wy, wz],
      hit: [[0.021, 0.019, 0.012], [wx, wy, DOOR.zIn - 0.0315]],
      view: [[PORTAL.x - 0.08, PORTAL.y, 3.9], [PORTAL.x, PORTAL.y - 0.02, DOOR.zIn]],
      press: () => G.pressKey(k),
    });
  });
  const press = (id, label, b, fn) => {
    const [wx, wy, wz] = inPad(b.x + b.w / 2, b.y + b.h / 2, 0.013);
    world.addHotspot({
      id, zone: 'guardian', kind: 'action', quiet: true, label,
      anchor: [wx, wy, wz],
      hit: [[Math.max(0.03, b.w * TAB.k), Math.max(0.018, b.h * TAB.k), 0.012], [wx, wy, DOOR.zIn - 0.0315]],
      view: [[TABLET.x - 0.02, TABLET.y + 0.01, 4.17], [TABLET.x, TABLET.y, DOOR.zIn]],
      press: fn,
    });
  };
  press('guardian-pad-cam-door', 'Door camera', BTN.cam_door, () => G.selectCam('door'));
  press('guardian-pad-cam-room', 'Room camera (demo)', BTN.cam_room, () => G.selectCam('room'));
  press('guardian-pad-night', 'Night vision', BTN.night, () => G.toggleNight());
  press('guardian-pad-sim', 'Simulate a visitor', BTN.sim, () => G.simulate());
  press('guardian-pad-lamp', 'Door lamp mode', BTN.lamp, () => { G.cycleLamp(); G.sound('switch'); });
  press('guardian-pad-mode', 'Alarm mode', BTN.mode, () => G.toggleMode());
  press('guardian-pad-arm', 'Arm / disarm', BTN.arm, () => G.toggleArmed());

  world.addLocation('guardian', [-0.35, 1.7, 6.7], [-0.35, 1.95, 4.8],
    ['guardian-lamp', 'doorbell', 'guardian-panel', 'guardian-tablet']);

  /* The intro uses these: the bell's glow state and the physical press. */
  world.shared.doorbell = {
    set(state) { bellState = state; bellPulse = 0; },
    press() { bellPress = 1; },
  };
  world.shared.guardian = G;

  /* ======================================================================
     Per-frame
     ====================================================================== */
  let lastDoorOpen = null, lastSide = null, lastWant = null, personGone = 0;
  const bellColors = { idle: 0xff8a4a, ring: 0xff7a40, open: 0xfff0e0 };

  world.onUpdate((dt, t, f) => {
    clock = t;
    const v = f.camera.position;
    const night = world.night || 0;

    // door and doorway events
    const open = door.t > 0.5;
    if (lastDoorOpen !== null && open !== lastDoorOpen) G.log(open ? 'DOOR opened' : 'DOOR closed');
    lastDoorOpen = open;
    const side = v.z > DOOR.z ? 1 : -1;
    if (lastSide !== null && side !== lastSide && f.stateName !== 'intro') {
      G.log(`DOORWAY · passage ${side < 0 ? 'in' : 'out'}`);
      if (side < 0 && G.armed && G.mode === 'elevated' && G.alarm <= 0) {
        G.challenge = 12;
        G.note = '';
        G.sound('beep');
        G.log('ELEVATED · present card + PIN');
      }
    }
    lastSide = side;
    const inGuest = side < 0;
    if (inGuest !== G.guestHome) { G.guestHome = inGuest; touch(); }

    // person in the door camera's view (the corridor): you, or the simulated visitor
    let simInCorridor = false;
    if (simT >= 0) simInCorridor = simStep(dt) && simFigure.position.z > 5.0;
    const inCorridor = (v.z > 5.0 && v.z < 9.05 && Math.abs(v.x) < 1.05) || simInCorridor;
    if (inCorridor) {
      personGone = 0;
      if (!G.personDoor) { G.personDoor = true; G.log(simInCorridor && !(v.z > 5.0) ? 'PERSON detected · door camera (sim)' : 'PERSON detected · door camera'); }
    } else if (G.personDoor) {
      personGone += dt;
      if (personGone > 8) { G.personDoor = false; G.log('PERSON gone · door camera'); }
    }

    // elevated-mode challenge and the demo alarm
    if (G.challenge > 0) {
      G.challenge -= dt;
      dirtyTft = true;
      if (G.challenge <= 0) { G.challenge = 0; G.alarm = 4; G.log('ALARM · silent demo (not cleared)'); G.sound('deny'); touch(); }
    }
    if (G.alarm > 0) {
      const before = Math.floor(G.alarm * 1.6);
      G.alarm -= dt;
      dirtyTft = dirtyTab = true;
      if (Math.floor(G.alarm * 1.6) !== before && G.alarm > 0) G.sound('deny');
      if (G.alarm <= 0) { G.alarm = 0; G.armed = true; G.log('ALARM reset'); touch(); }
    }
    if (G.noteT > 0) { G.noteT -= dt; if (G.noteT <= 0) { G.note = ''; dirtyTft = true; } }

    // lamp
    lampWant = G.lamp === 'on' ? 1 : G.lamp === 'off' ? 0 : G.personDoor ? 1 : 0;
    if (lastWant !== null && lampWant !== lastWant && G.lamp === 'auto') G.log(lampWant ? 'LAMP on (auto · person detected)' : 'LAMP off (auto)');
    lastWant = lampWant;
    const was = lampLevel;
    lampLevel = f.reduced ? lampWant : damp(lampLevel, lampWant, 5, dt);
    if (Math.abs(lampLevel - was) > 0.001) {
      lampPanelMat.emissiveIntensity = 0.05 + 1.15 * lampLevel;
      lampSpot.intensity = 4.2 * lampLevel * (1 + 0.4 * night);
      lampGlow.material.opacity = 0.5 * lampLevel;
      if ((was > 0.5) !== (lampLevel > 0.5)) dirtyTab = true;
    }
    redDotMat.color.setHex(0xff3b2a).multiplyScalar(0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 3.2)) * (G.personDoor ? 1 : 0.6));
    amberDotMat.color.setHex(0xffa040).multiplyScalar(0.25 + 0.75 * lampLevel);

    // doorbell: glow state, press travel, icon pulse
    bellPress = Math.max(0, bellPress - dt * 5);
    cap.position.z = 0.0275 - 0.0035 * Math.sin(Math.min(1, bellPress * 1.2) * Math.PI * 0.5) * (bellPress > 0 ? 1 : 0);
    bellPulse += dt;
    let glow = 0;
    if (bellState === 'ring') glow = f.reduced ? 0.7 : 0.45 + 0.4 * Math.sin(bellPulse * 7);
    else if (bellState === 'idle') glow = f.reduced ? 0.06 : 0.07 + 0.05 * Math.sin(t * 1.3);
    else glow = 0.2;
    glow += bellPress * 0.6;
    bellGlow.material.color.setHex(bellColors[bellState]);
    bellGlow.material.opacity = Math.max(0, glow);

    // speaker pulse
    if (spkPulse > 0) {
      spkPulse = Math.max(0, spkPulse - dt * 1.1);
      speaker.scale.z = 1 + 1.6 * Math.abs(Math.sin(spkPulse * 22)) * spkPulse;
    } else if (speaker.scale.z !== 1) speaker.scale.z = 1;

    // keypad keys spring back
    let moving = false;
    for (let i = 0; i < 12; i++) if (keyDepth[i] > 0) { keyDepth[i] = Math.max(0, keyDepth[i] - dt * 6); moving = true; }
    if (moving) placeKeys();

    // portal light pipes follow the state
    const pipeC = G.alarm > 0 ? 0xff5a4a : G.challenge > 0 ? 0xffb050 : G.armed ? 0x9fc8ff : 0x8cf0b0;
    if (pipeMat.userData.c !== pipeC) { pipeMat.userData.c = pipeC; pipeMat.color.setHex(pipeC); }

    // screens
    if (dirtyTft) { dirtyTft = false; drawTft(); }
    const near = Math.hypot(v.x - TABLET.x, v.z - DOOR.zIn) < 7.5;
    clockTab -= dt;
    if (near && (dirtyTab || clockTab <= 0)) { dirtyTab = false; clockTab = 1; drawTablet(); }

    // the camera feed: only while the panel is in view and close, or being inspected
    const inspecting = f.inspecting === 'guardian-tablet' || f.inspecting === 'guardian-panel';
    let watching = inspecting;
    if (!watching && near) {
      f.camera.getWorldDirection(fwd);
      tmpV.set(TABLET.x - v.x, TABLET.y - v.y, DOOR.zIn - v.z);
      const d = tmpV.length();
      watching = d < 5.5 && tmpV.divideScalar(d).dot(fwd) > 0.3;
    }
    if (watching) renderFeed(f, dt);
    if (inspecting && f.setReadout) f.setReadout(G.readout());
  });
  let clockTab = 0;
  const fwd = new THREE.Vector3(), tmpV = new THREE.Vector3();

  drawTft();
  drawTablet();
  drawOsd('door', []);

  return g;
}

/* ── geometry helpers ─────────────────────────────────────────────────── */

/* A box-to-box loft (like a hip roof). Corners are [x, z]: back-left, back-right,
   front-right, front-left. Flat-shaded, no bottom face. */
function loft(bottom, top, h, mat) {
  const B = bottom.map(([x, z]) => [x, 0, z]);
  const T = top.map(([x, z]) => [x, h, z]);
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  quad(B[1], B[0], T[0], T[1]);
  quad(B[2], B[1], T[1], T[2]);
  quad(B[3], B[2], T[2], T[3]);
  quad(B[0], B[3], T[3], T[0]);
  quad(T[3], T[2], T[1], T[0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/* A horizontal plate with the given [x, z] outline, `t` thick, sitting at height y0. */
function plate(points, y0, t, mat) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y0;
  return m;
}

/* The doorbell's red-orange bell icon. */
function drawBellIcon(kit) {
  const c = kit.canvas(128, 150);
  const g = c.getContext('2d');
  g.strokeStyle = '#d9532c';
  g.fillStyle = '#d9532c';
  g.lineWidth = 6;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(64, 30);
  g.bezierCurveTo(42, 30, 40, 58, 38, 82);
  g.lineTo(26, 100);
  g.lineTo(102, 100);
  g.lineTo(90, 82);
  g.bezierCurveTo(88, 58, 86, 30, 64, 30);
  g.stroke();
  g.beginPath(); g.arc(64, 21, 5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(64, 113, 8, 0, Math.PI * 2); g.fill();
  return c;
}
