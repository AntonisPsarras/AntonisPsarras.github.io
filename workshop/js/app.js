/* ==========================================================================
   app.js — the workshop's orchestrator.

   States:  loading → entry → intro → (guided ⇄ explore) ⇄ inspect
            Overlays (dossier, certificate, help) sit on top of any state:
            while one is open the 3D view is inert, pointer lock is released,
            movement stops and the keyboard belongs to the dialog.
   ========================================================================== */
import * as THREE from '../../vendor/three/three.module.js';
import { detectQuality, refineWithRenderer, TIERS, FrameMonitor } from './quality.js';
import { buildWorkshop } from './workshop-scene.js';
import { UI } from './ui.js';
import { Overlays } from './overlays.js';
import { preloadDossiers } from './dossiers.js';
import { Interaction, project } from './interact.js';
import { CameraRig, Walker } from './controls.js';
import { Dialogue, PRIORITY } from './dialogue.js';
import { Sound } from './audio.js';
import { disposeTree } from './world/kit.js';
import { BOUNDS } from './world/architecture.js';
import { HOTSPOTS, AWARDS, LOCATIONS, DIALOGUE, PROJECTS, SOURCE_URL, MOONCAMP_MODULES } from './content.js';
import { showTextView } from './fallback.js';

const ABORT = Symbol('abort');
const ENTRY_POSE = [new THREE.Vector3(0, 1.6, 8.1), new THREE.Vector3(0, 1.42, 4.7)];
const ARRIVAL = [new THREE.Vector3(0.3, 1.74, 3.95), new THREE.Vector3(-0.9, 1.0, -1.2)];
const HOME = { x: 1.35, z: 0.95 };

export async function start() {
  const app = new App();
  try {
    await app.init();
  } catch (err) {
    app.fail(err);
  }
}

class App {
  constructor() {
    this.html = document.documentElement;
    this.params = new URLSearchParams(location.search);
    this.debug = this.params.get('debug') === '1';
    this.ac = new AbortController();
    this.mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = this.html.classList.contains('ws-reduced');
    this.state = 'loading';
    this.mode = 'guided';
    this.location = 'overview';
    this.inspectId = null;
    this.returnPose = null;
    this.night = { on: false, t: 0 };
    this.time = 0;
    this.last = performance.now();
    this.ringCount = 0;
    this.diag = this.debug;
    this.qualityChoice = 'auto';
    this.pointer = { down: null, x: 0, y: 0, hoverPending: false, hover: null, inside: false };
    this.locked = false;
    this.touch = window.matchMedia('(pointer: coarse)').matches;
    this.lastStats = { calls: 0, triangles: 0, tier: 'high' };
  }

  /* ── Boot ─────────────────────────────────────────────────────────── */
  async init() {
    const ui = (this.ui = new UI(this.#handlers()));
    ui.setTouch(this.touch);
    ui.setMotion(this.reduced, this.mq.matches);

    const s1 = ui.loaderStep(1, 'INITIALIZING RENDERER');
    this.choice = detectQuality(this.params);
    this.tier = TIERS[this.choice.tier];
    const canvas = document.getElementById('ws-canvas');
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.tier.antialias, powerPreference: 'high-performance', stencil: false });
    } catch (err) {
      s1.fail();
      throw err;
    }
    this.choice = refineWithRenderer(this.choice, this.renderer);
    this.tier = TIERS[this.choice.tier];
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier.dpr));
    r.setSize(window.innerWidth, window.innerHeight, false);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.2;
    r.localClippingEnabled = true;
    r.shadowMap.enabled = this.tier.shadows;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.fail(new Error('WebGL context lost')); }, { signal: this.ac.signal });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050506);
    this.scene.fog = new THREE.Fog(0x050506, 9, 24);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 40);
    this.rig = new CameraRig(this.camera);
    this.rig.setPose(...ENTRY_POSE);
    s1.done(this.tier.label.toUpperCase());

    const s2 = ui.loaderStep(2, 'BUILDING ENVIRONMENT');
    await fontsReady(1500);
    this.world = await buildWorkshop({
      renderer: r, scene: this.scene, quality: this.tier,
      onZone: async (name) => { s2.progress(name.toUpperCase()); await nextFrame(); },
    });
    if (this.tier.env) {
      this.envTex = buildEnvironment(r);
      this.scene.environment = this.envTex;
      this.scene.environmentIntensity = 0.55;
    }
    this.world.addLocation('overview', ARRIVAL[0].toArray(), ARRIVAL[1].toArray(), ['antonis', 'printer-enclosed', 'aether', 'soldering', 'mooncamp', 'monitor-main']);
    s2.done('OK');

    const s3 = ui.loaderStep(3, 'LOADING PROJECT OBJECTS');
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => s3.progress(`${loaded}/${total}`);
    const certs = await Promise.race([this.world.shared.loadCertificates(manager), sleep(9000).then(() => [])]);
    preloadDossiers();
    const ok = certs.filter(Boolean).length;
    if (ok < AWARDS.length) s3.done(`${ok}/${AWARDS.length}`); else s3.done('OK');

    const s4 = ui.loaderStep(4, 'COMPILING SHADERS');
    try { await r.compileAsync(this.scene, this.camera); } catch { r.compile(this.scene, this.camera); }
    r.shadowMap.needsUpdate = true;
    s4.done('OK');
    ui.loaderStep(5, 'READY').done('');

    this.#wire();
    this.renderer.setAnimationLoop(this.loop);
    await nextFrame();
    await nextFrame();
    ui.loaderDone();
    this.enterEntry();
    if (this.debug) window.__workshop = this;
  }

  #wire() {
    const ui = this.ui;
    const sig = { signal: this.ac.signal };
    this.sound = new Sound();
    this.overlays = new Overlays({
      sound: this.sound,
      onOpen: () => this.onOverlay(true),
      onClose: () => this.onOverlay(false),
      onCertChange: (i) => this.followCert(i),
    });
    this.interaction = new Interaction({
      camera: this.camera, world: this.world, markersEl: document.getElementById('ws-markers'),
      labelFor: (id) => this.labelFor(id),
    });
    this.walker = new Walker(this.rig, this.world.colliders, BOUNDS);
    this.dialogue = new Dialogue({
      bubble: ui.bubble,
      announce: (t) => ui.announce(t),
      isReduced: () => this.reduced,
      onPose: (pose) => this.world.avatar.gesture(pose, pose === 'wave' ? 2.2 : 2),
    });
    this.monitor = new FrameMonitor({ onStep: (i) => this.autoDowngrade(i) });

    ui.buildLocations(LOCATIONS);
    ui.buildAsk(DIALOGUE.ask);
    ui.setQuality('auto', this.tier.label);
    const av = this.world.avatar;
    av.teleport(HOME.x, HOME.z, Math.atan2(0 - HOME.x, 3.3 - HOME.z));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e), sig);
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e), sig);
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e), sig);
    canvas.addEventListener('pointercancel', () => { this.pointer.down = null; ui.setCursor(''); }, sig);
    canvas.addEventListener('pointerleave', () => { this.pointer.inside = false; this.setHover(null); }, sig);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), sig);
    document.addEventListener('mousemove', (e) => this.onLockedMove(e), sig);
    document.addEventListener('mousedown', (e) => this.onLockedClick(e), sig);
    document.addEventListener('pointerlockchange', () => this.onLockChange(), sig);
    document.addEventListener('pointerlockerror', () => ui.toast('Mouse lock unavailable — drag to look instead'), sig);
    document.addEventListener('keydown', (e) => this.onKeyDown(e), sig);
    document.addEventListener('keyup', (e) => this.walker.key(e.code, false), sig);
    window.addEventListener('blur', () => this.walker.keys.clear(), sig);
    window.addEventListener('resize', () => this.onResize(), sig);
    document.addEventListener('visibilitychange', () => this.onVisibility(), sig);
    window.addEventListener('pagehide', () => this.renderer.setAnimationLoop(null), sig);
    window.addEventListener('pageshow', (e) => { if (e.persisted) { this.last = performance.now(); this.renderer.setAnimationLoop(this.loop); ui.fade(false); } }, sig);
    this.mq.addEventListener?.('change', () => { if (!this.motionOverride) this.setReduced(this.mq.matches); }, sig);
    this.onResize();
  }

  #handlers() {
    return {
      onMode: (m) => this.chooseMode(m),
      onLights: () => this.toggleNight(),
      onSound: () => this.toggleSound(),
      onHelp: () => this.overlays.openHelp(),
      onRing: () => this.ring(),
      onDirect: () => this.finishIntro({ direct: true }),
      onSkipIntro: () => this.introAbort?.abort(),
      onChoose: (m) => this.chooseMode(m),
      onCardBack: () => this.back(),
      onCardStep: (d) => this.stepObject(d),
      onLocation: (id) => this.goLocation(id),
      onLocationStep: (d) => this.stepLocation(d),
      onObject: (id) => (id.startsWith('loc:') ? this.goLocation(id.slice(4)) : this.inspect(id)),
      onObjectHover: (id, on) => { if (!id.startsWith('loc:')) this.interaction?.setHot(on ? id : null); },
      onLock: () => this.requestLock(),
      onBubbleNext: () => this.dialogue.next(),
      onAsk: () => this.ui.setAskOpen(!this.ui.askOpen),
      onAskQuestion: (id) => this.ask(id),
      onExit: () => this.exit(),
      onQuality: (q) => this.setQuality(q),
      onMotion: () => { this.motionOverride = true; this.setReduced(!this.reduced); },
    };
  }

  /* ── Entry & intro ────────────────────────────────────────────────── */
  enterEntry() {
    this.state = 'entry';
    this.ui.setInside(false);
    this.ui.showEntry(true);
    this.interaction.setMarkers(['doorbell'], (id) => this.inspect(id));
    this.ui.announce('You are outside a fictional workshop door. Ring the doorbell, or enter directly.');
  }

  ring() {
    const bell = this.world.shared.doorbell;
    bell.press();
    this.sound.play('chime');
    if (this.state === 'entry') { this.runIntro(); return; }
    this.ringCount++;
    const line = DIALOGUE.doorbell[Math.min(this.ringCount - 1, DIALOGUE.doorbell.length - 1)];
    if (this.ringCount <= DIALOGUE.doorbell.length) this.dialogue.say([line], { priority: PRIORITY.REACTION });
    else this.world.avatar.gesture('shrug', 1.2);
  }

  async runIntro() {
    if (this.state !== 'entry') return;
    this.state = 'intro';
    this.ui.showEntry(false);
    this.ui.showSkip(true);
    this.interaction.clearMarkers();
    this.introAbort = new AbortController();
    const signal = this.introAbort.signal;
    const wait = (ms) => abortable(sleep(ms), signal);
    const guard = (p) => abortable(p, signal);
    const av = this.world.avatar;
    const door = this.world.shared.door;
    const bell = this.world.shared.doorbell;
    const R = this.reduced;
    try {
      bell.set('ring');
      this.ui.announce('The doorbell rings. Someone is coming to the door.');
      av.teleport(0.95, 2.4, Math.PI);
      av.lookAt(null);
      await wait(R ? 200 : 600);
      if (R) av.teleport(0.38, 3.85, 0);
      else await guard(av.walkTo([[0.6, 3.3], [0.38, 3.85]], 1.2));
      av.face(new THREE.Vector3(0.2, 0, 4.6));
      av.gesture('reach', 1.1);
      await wait(R ? 150 : 650);
      this.sound.play('lock');
      bell.set('open');
      if (R) door.setInstant(true); else door.open(1.1);
      this.sound.play('door');
      const approach = [new THREE.Vector3(0.1, 1.6, 6.55), new THREE.Vector3(0.2, 1.55, 4.2)];
      if (R) this.rig.setPose(...approach); else this.rig.flyTo(...approach, { duration: 2.6, lift: 0 });
      await wait(R ? 250 : 1100);
      if (R) av.teleport(0.18, 4.15, 0);
      else await guard(av.walkTo([[0.18, 4.15]], 0.9));
      av.face(this.camera.position);
      av.lookAt(this.camera.position);
      await wait(R ? 100 : 350);
      await guard(this.dialogue.say([DIALOGUE.intro[0]], { priority: PRIORITY.SCRIPT }));
      await guard(this.dialogue.say([DIALOGUE.intro[1]], { priority: PRIORITY.SCRIPT }));
      if (R) av.teleport(0.8, 3.75, 0);
      else av.walkTo([[0.82, 3.75]], 0.9);
      const last = this.dialogue.say([DIALOGUE.intro[2]], { priority: PRIORITY.SCRIPT });
      await wait(R ? 200 : 1300);
      av.face(new THREE.Vector3(0, 0, 3));
      await guard(this.flyOrCut(ARRIVAL[0], ARRIVAL[1], { via: [new THREE.Vector3(0.05, 1.62, 5.3), new THREE.Vector3(0, 1.64, 4.45)], duration: 3.2, lift: 0 }));
      av.walkTo([[1.4, 2.4], [HOME.x, HOME.z]], 1.0).then(() => av.face(this.camera.position));
      av.lookAt(null);
      await guard(last);
      this.finishIntro();
    } catch (err) {
      if (err !== ABORT) console.error('[workshop] intro:', err);
      this.finishIntro({ skipped: true });
    }
  }

  finishIntro({ direct = false, skipped = false } = {}) {
    if (this.state !== 'intro' && this.state !== 'entry') return;
    this.introAbort?.abort();
    const av = this.world.avatar;
    const door = this.world.shared.door;
    this.world.shared.doorbell.set('open');
    if (direct || skipped) {
      this.dialogue.cancel();
      door.setInstant(true);
      av.teleport(HOME.x, HOME.z, Math.atan2(ARRIVAL[0].x - HOME.x, ARRIVAL[0].z - HOME.z));
      av.lookAt(null);
      this.rig.setPose(...ARRIVAL);
    } else if (!door.isOpen) door.setInstant(true);
    this.state = 'chooser';
    this.ui.showEntry(false);
    this.ui.showSkip(false);
    this.ui.setAskVisible(true);
    this.ui.showChooser(true, this.touch ? 'guided' : 'guided');
    if (direct) this.dialogue.say(DIALOGUE.direct, { priority: PRIORITY.SCRIPT });
  }

  chooseMode(mode) {
    if (this.state === 'loading' || this.state === 'entry' || this.state === 'intro') return;
    this.ui.showChooser(false);
    this.ui.setInside(true);
    if (mode === 'explore') this.enterExplore();
    else this.enterGuided();
  }

  /* ── Modes ────────────────────────────────────────────────────────── */
  enterGuided(locationId = null) {
    this.releaseLock();
    this.walker.setEnabled(false);
    this.closeCard(false);
    this.mode = 'guided';
    this.ui.setMode('guided');
    this.goLocation(locationId || (this.state === 'explore' ? this.nearestLocation() : this.location || 'overview'));
  }

  enterExplore() {
    this.closeCard(false);
    this.mode = 'explore';
    this.state = 'explore';
    this.rig.bake();
    this.walker.setEnabled(true);
    this.ui.setMode('explore');
    this.ui.setLocation(null, []);
    this.interaction.setMarkers([], () => {});
    this.exploreMarkerClock = 0;
    this.ui.announce('Explore mode. Use W A S D or the arrow keys to move, drag to look, click the floor to walk, and E to inspect what is in the centre of the view.');
  }

  goLocation(id) {
    const loc = this.world.locations.get(id);
    if (!loc) return;
    if (this.mode !== 'guided') {
      this.mode = 'guided';
      this.walker.setEnabled(false);
      this.releaseLock();
      this.ui.setMode('guided');
    }
    this.closeCard(false);
    this.state = 'guided';
    this.location = id;
    const objects = loc.hotspots.map((h) => ({ id: h, label: this.labelFor(h) }));
    if (id === 'overview') objects.unshift({ id: 'loc:achievements', label: 'Achievements wall' });
    this.ui.setLocation(id, objects);
    this.interaction.setMarkers(loc.hotspots, (hid) => this.inspect(hid));
    this.flyOrCut(loc.position, loc.target);
    const meta = LOCATIONS.find((l) => l.id === id);
    if (meta) this.ui.announce(`${meta.label}. ${meta.summary}`);
  }

  stepLocation(dir) {
    const i = LOCATIONS.findIndex((l) => l.id === this.location);
    const next = LOCATIONS[(i + dir + LOCATIONS.length) % LOCATIONS.length];
    this.goLocation(next.id);
    this.ui.focusLocation(next.id);
  }

  nearestLocation() {
    let best = 'overview', bd = Infinity;
    for (const [id, loc] of this.world.locations) {
      const d = loc.position.distanceTo(this.camera.position);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  /* ── Inspect ──────────────────────────────────────────────────────── */
  inspect(id) {
    const hs = this.world.hotspots.get(id);
    if (!hs || this.overlays.isOpen()) return;
    if (this.state === 'entry') { if (id === 'doorbell') this.ring(); return; }
    if (this.state === 'intro' || this.state === 'chooser' && id !== 'antonis') {
      if (this.state === 'chooser') this.chooseMode('guided');
      else return;
    }
    if (hs.kind === 'host') { this.ui.setAskOpen(true); return; }
    if (id === 'doorbell') { this.ring(); return; }
    if (id === 'exit-door') { this.showCard(hs); this.state = 'inspect'; this.inspectId = id; return; }
    if (id === 'light-switch' && this.mode === 'explore') { this.toggleNight(); return; }

    if (this.state !== 'inspect') {
      this.returnPose = { position: this.camera.position.clone(), yaw: this.rig.yaw, pitch: this.rig.pitch, mode: this.mode, location: this.location };
    }
    const prev = this.inspectId ? this.world.hotspots.get(this.inspectId) : null;
    if (prev && prev !== hs) this.leaveHotspot(prev);
    this.walker.setEnabled(false);
    this.releaseLock();
    this.state = 'inspect';
    this.inspectId = id;
    const zoneLoc = this.world.locations.get(hs.zone);
    this.interaction.setMarkers(zoneLoc ? zoneLoc.hotspots : [id], (hid) => this.inspect(hid));
    this.interaction.setHot(id);
    this.ui.setHotObject(id);

    const arrived = this.flyOrCut(hs.view.position, hs.view.target);
    this.enterHotspot(hs);
    this.showCard(hs);
    this.react(hs);
    if (hs.kind === 'award') {
      const index = AWARDS.findIndex((a) => a.id === hs.awardId);
      arrived.then((ok) => { if (ok && this.inspectId === id && !this.overlays.isOpen()) this.overlays.openCert(index); });
    }
  }

  enterHotspot(hs) {
    const S = this.world.shared;
    if (hs.id === 'failed') { S.drawer.set(true, this.reduced); this.sound.play('slide'); }
  }

  leaveHotspot(hs) {
    const S = this.world.shared;
    if (hs.id === 'failed') S.drawer.set(false, this.reduced);
    if (hs.id === 'turbine') S.turbine.setExploded(false, this.reduced);
    if (hs.id === 'mooncamp') S.mooncamp.lowerAll(this.reduced);
    if (hs.id === 'monitor-main' && !this.debug) { /* keep diagnostics as the visitor left them */ }
  }

  react(hs) {
    const av = this.world.avatar;
    av.lookAt(hs.anchor);
    const d = Math.hypot(hs.anchor.x - av.position.x, hs.anchor.z - av.position.z);
    if (d < 3.6 && hs.kind !== 'award') av.point(hs.anchor, 2.0);
    const key = hs.kind === 'award' ? 'award' : hs.id;
    this.dialogue.comment(key, DIALOGUE.comments[key]);
    clearTimeout(this.lookTimer);
    this.lookTimer = setTimeout(() => av.lookAt(null), 4000);
  }

  back() {
    if (this.state !== 'inspect') return;
    const hs = this.world.hotspots.get(this.inspectId);
    if (hs) this.leaveHotspot(hs);
    const id = this.inspectId;
    this.closeCard(false);
    const rp = this.returnPose;
    this.returnPose = null;
    if (!rp || rp.mode === 'guided') {
      this.goLocation(rp?.location || this.location);
      requestAnimationFrame(() => document.querySelector(`#ws-objects [data-hotspot="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }));
    } else {
      this.state = 'explore';
      this.mode = 'explore';
      this.ui.setMode('explore');
      this.interaction.setMarkers([], () => {});
      const target = rp.position.clone().add(new THREE.Vector3(-Math.sin(rp.yaw) * Math.cos(rp.pitch), Math.sin(rp.pitch), -Math.cos(rp.yaw) * Math.cos(rp.pitch)));
      this.flyOrCut(rp.position, target).then(() => { if (this.state === 'explore') this.walker.setEnabled(true); });
    }
  }

  closeCard(restoreState = true) {
    if (this.inspectId) {
      const hs = this.world.hotspots.get(this.inspectId);
      if (hs && restoreState) this.leaveHotspot(hs);
    }
    this.inspectId = null;
    this.ui.hideCard();
    this.ui.setHotObject(null);
    this.interaction?.setHot(null);
  }

  stepObject(dir) {
    const hs = this.world.hotspots.get(this.inspectId);
    const loc = hs && this.world.locations.get(hs.zone);
    if (!loc || loc.hotspots.length < 2) return;
    const i = loc.hotspots.indexOf(hs.id);
    this.inspect(loc.hotspots[(i + dir + loc.hotspots.length) % loc.hotspots.length]);
  }

  followCert(index) {
    const id = `award:${AWARDS[index].id}`;
    const hs = this.world.hotspots.get(id);
    if (!hs) return;
    this.inspectId = id;
    this.rig.setPose(hs.view.position, hs.view.target);
    this.showCard(hs, false);
    this.interaction.setHot(id);
  }

  showCard(hs, focus = true) {
    const S = this.world.shared;
    const spec = { focus, controls: [], actions: [], step: false };
    const loc = this.world.locations.get(hs.zone);
    spec.step = !!loc && loc.hotspots.length > 1;
    if (hs.kind === 'award') {
      const a = AWARDS.find((x) => x.id === hs.awardId);
      const i = AWARDS.indexOf(a);
      spec.sys = `${a.code} // ${a.group === 'physics' ? 'PHYSICS' : 'MATHEMATICS'}`;
      spec.title = a.title;
      spec.body = [`${a.issuer} · ${a.issuerOriginal}`, a.original, 'Personal details on this certificate have been redacted.'];
      spec.actions.push({ label: a.unavailable ? 'Image unavailable' : 'View certificate', primary: true, onClick: () => this.overlays.openCert(i) });
      this.ui.showCard(spec);
      return;
    }
    const copy = HOTSPOTS[hs.id] || { sys: '', title: this.labelFor(hs.id), body: [] };
    spec.sys = copy.sys;
    spec.title = copy.title;
    spec.body = copy.body;
    spec.list = hs.id === 'chalkboard';
    const R = () => this.reduced;
    const ctl = (id, label, onClick, pressed) => spec.controls.push({ id, label, onClick, pressed });
    switch (hs.id) {
      case 'bloch':
        for (const g of ['H', 'X', 'Z', 'S']) ctl(`gate-${g}`, g, () => { S.bloch.apply(g, R()); this.sound.play('gate'); });
        ctl('gate-reset', 'Reset |0⟩', () => { S.bloch.apply('reset'); this.sound.play('tick'); });
        spec.readout = S.bloch.readout();
        break;
      case 'pendulum':
        ctl('release', 'Release again', () => { S.pendulum.release(); this.sound.play('tick'); });
        if (this.reduced) spec.body = [...spec.body, 'Animation is paused because reduced motion is on. Use “Play animations” in Help to run it.'];
        else if (this.tier.detail === 0) spec.body = [...spec.body, 'Paused on the Low quality setting to keep things smooth. Choose Medium or High in Help to run it.'];
        break;
      case 'aether':
        ctl('hill', 'Hill spheres', (b) => { S.orrery.setHill(!S.orrery.hill); this.ui.updateControl('hill', { pressed: S.orrery.hill }); }, S.orrery.hill);
        ctl('pause', 'Pause orbits', () => { S.orrery.setPaused(!S.orrery.paused); this.ui.updateControl('pause', { pressed: S.orrery.paused }); }, S.orrery.paused);
        break;
      case 'turbine':
        ctl('explode', 'Exploded view', () => { S.turbine.setExploded(!S.turbine.exploded, R()); this.ui.updateControl('explode', { pressed: S.turbine.exploded }); this.sound.play('slide'); }, S.turbine.exploded);
        ctl('fan', 'Fan', () => { S.turbine.setFan(!S.turbine.fan); this.ui.updateControl('fan', { pressed: S.turbine.fan }); this.sound.play('switch'); }, S.turbine.fan);
        break;
      case 'mooncamp':
        MOONCAMP_MODULES.forEach((name, i) => ctl(`mod-${i}`, name, () => {
          const up = S.mooncamp.toggle(i, R());
          this.ui.updateControl(`mod-${i}`, { pressed: up });
          this.sound.play('magnet');
        }, S.mooncamp.isLifted(i)));
        ctl('mod-lower', 'Lower all', () => { S.mooncamp.lowerAll(R()); MOONCAMP_MODULES.forEach((_, i) => this.ui.updateControl(`mod-${i}`, { pressed: false })); this.sound.play('magnet'); });
        break;
      case 'brickcast':
        ctl('run', 'Run conversion', () => { S.brickcast.run(R()); this.sound.play('tick'); });
        break;
      case 'lenstile-case':
        ctl('swap', 'Swap tile', () => { if (S.lenstile.swap(R())) setTimeout(() => this.sound.play('magnet'), this.reduced ? 0 : 520); });
        break;
      case 'failed':
        ctl('drawer', 'Drawer open', () => { S.drawer.set(!S.drawer.open, R()); this.ui.updateControl('drawer', { pressed: S.drawer.open }); this.sound.play('slide'); }, true);
        break;
      case 'monitor-main':
        ctl('diag', 'Diagnostics', () => { this.toggleDiag(); this.ui.updateControl('diag', { pressed: this.diag }); }, this.diag);
        spec.actions.push({ label: 'View source on GitHub ↗', href: SOURCE_URL });
        break;
      case 'light-switch':
        ctl('night', 'Night mode', () => { this.toggleNight(); this.ui.updateControl('night', { pressed: this.night.on }); }, this.night.on);
        break;
      case 'exit-door':
        spec.actions.push({ label: 'Return to portfolio', primary: true, onClick: () => this.exit() });
        break;
      default: break;
    }
    const pid = hs.projectId || copy.project;
    if (pid) spec.actions.unshift({ label: `Inspect ${PROJECTS[pid].title}`, primary: true, onClick: () => this.overlays.openProject(pid) });
    for (const rid of copy.related || []) spec.actions.push({ label: `Open ${PROJECTS[rid].title}`, onClick: () => this.overlays.openProject(rid) });
    this.ui.showCard(spec);
  }

  labelFor(id) {
    if (id.startsWith('award:')) {
      const a = AWARDS.find((x) => `award:${x.id}` === id);
      return a ? `${a.code} · ${a.plaque.charAt(0)}${a.plaque.slice(1).toLowerCase()}` : id;
    }
    if (id === 'antonis') return 'Antonis';
    return HOTSPOTS[id]?.title || id;
  }

  /* ── Ask / overlays / toggles ─────────────────────────────────────── */
  ask(id) {
    const q = DIALOGUE.ask.find((x) => x.id === id);
    if (!q) return;
    this.ui.setAskOpen(false);
    this.ui.markAsked(id);
    const av = this.world.avatar;
    av.lookAt(this.camera.position);
    if (!av.walking) av.face(this.camera.position);
    this.dialogue.say(q.lines.map((text, i) => ({ text, pose: i === 0 ? q.pose || 'nod' : undefined })), { priority: PRIORITY.SCRIPT });
    requestAnimationFrame(() => this.ui.focusAsk());
  }

  onOverlay(open) {
    if (open) {
      this.releaseLock();
      this.walker.keys.clear();
      this.ui.setAskOpen(false);
      this.pointer.down = null;
    }
  }

  toggleNight() {
    this.night.on = !this.night.on;
    this.world.shared.lightSwitch.set(this.night.on);
    this.sound.play('switch');
    this.ui.setLights(this.night.on);
    this.ui.toast(this.night.on ? 'Night mode' : 'Working light');
    if (this.night.on) this.dialogue.comment('night', DIALOGUE.comments.night);
  }

  async toggleSound() {
    const on = await this.sound.setEnabled(!this.sound.enabled);
    this.ui.setSound(on, this.sound.failed);
    if (on) this.sound.play('tick');
  }

  setReduced(on) {
    this.reduced = on;
    this.html.classList.toggle('ws-reduced', on);
    this.html.classList.toggle('ws-motion-ok', !on);
    this.ui.setMotion(on, this.mq.matches);
  }

  toggleDiag() {
    this.diag = !this.diag;
    if (!this.diag) this.ui.setDiag(null);
  }

  setQuality(choice) {
    this.qualityChoice = choice;
    const name = choice === 'auto' ? detectQuality(new URLSearchParams()).tier : choice;
    this.applyTier(name);
    this.monitor.enabled = choice === 'auto';
    this.ui.setQuality(choice, TIERS[name].label);
  }

  applyTier(name) {
    const t = TIERS[name];
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, t.dpr));
    r.setSize(window.innerWidth, window.innerHeight, false);
    this.setShadows(t.shadows && this.tier.shadows);
    this.activeTier = name;
  }

  setShadows(on) {
    const r = this.renderer;
    if (r.shadowMap.enabled === on) return;
    r.shadowMap.enabled = on;
    this.world.shared.keyLight.castShadow = on;
    this.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
    r.shadowMap.needsUpdate = true;
  }

  autoDowngrade(step) {
    const r = this.renderer;
    const dpr = r.getPixelRatio();
    if (step === 0 && dpr > 1.01) { r.setPixelRatio(Math.max(1, dpr - 0.25)); r.setSize(window.innerWidth, window.innerHeight, false); }
    else if (step <= 1 && dpr > 1.01) { r.setPixelRatio(1); r.setSize(window.innerWidth, window.innerHeight, false); }
    else if (r.shadowMap.enabled) this.setShadows(false);
    else return false;
    this.ui.toast('Quality lowered for smoother motion');
    return true;
  }

  /* ── Camera helpers ───────────────────────────────────────────────── */
  flyOrCut(position, target, opts = {}) {
    if (this.reduced) {
      return this.rig.flyTo(position, target, { cut: true, onCut: (on) => this.ui.fade(on) });
    }
    return this.rig.flyTo(position, target, opts);
  }

  requestLock() {
    if (this.mode !== 'explore') this.chooseMode('explore');
    const canvas = this.renderer.domElement;
    try {
      const p = canvas.requestPointerLock?.({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { canvas.requestPointerLock(); } catch { this.ui.toast('Mouse lock unavailable — drag to look instead'); } });
    } catch {
      this.ui.toast('Mouse lock unavailable — drag to look instead');
    }
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  onLockChange() {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    this.ui.setLocked(this.locked);
    if (this.locked) this.ui.toast('Mouse locked — press Esc to release', 2200);
  }

  /* ── Input ────────────────────────────────────────────────────────── */
  onPointerDown(e) {
    if (this.locked || this.overlays.isOpen()) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.pointer.down = { x: e.clientX, y: e.clientY, t: performance.now(), dragging: false, lx: e.clientX, ly: e.clientY };
    this.renderer.domElement.setPointerCapture?.(e.pointerId);
    if (this.ui.askOpen) this.ui.setAskOpen(false);
  }

  onPointerMove(e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.inside = true;
    const d = this.pointer.down;
    if (this.state === 'entry' && !this.reduced) {
      const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      this.parallax = [nx, ny];
    }
    if (d) {
      const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
      if (!d.dragging && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.dragging = true;
      if (d.dragging) {
        const k = 0.0042;
        if (this.state === 'explore') this.rig.look(dx * k, dy * k);
        else if (this.state === 'guided' || this.state === 'inspect') this.rig.nudge(dx * k, dy * k, this.state === 'inspect' ? 0.3 : 0.55, 0.22);
        this.ui.setCursor('grabbing');
      }
      d.lx = e.clientX;
      d.ly = e.clientY;
      return;
    }
    if (e.pointerType === 'mouse') this.pointer.hoverPending = true;
  }

  onPointerUp(e) {
    const d = this.pointer.down;
    this.pointer.down = null;
    this.renderer.domElement.releasePointerCapture?.(e.pointerId);
    if (!d) return;
    this.ui.setCursor('');
    if (d.dragging || performance.now() - d.t > 600) return;
    const hit = this.interaction.pickClient(e.clientX, e.clientY, this.renderer.domElement.getBoundingClientRect());
    if (hit?.hotspot) this.inspect(hit.hotspot.id);
    else if (hit?.floor && this.state === 'explore') this.walker.walkTo(hit.point);
    else if (hit?.floor && this.state === 'inspect' && this.returnPose?.mode === 'explore') { this.back(); }
  }

  onLockedMove(e) {
    if (!this.locked) return;
    this.rig.look(-e.movementX * 0.0022, -e.movementY * 0.0022);
  }

  onLockedClick(e) {
    if (!this.locked || e.button !== 0) return;
    const hit = this.interaction.pick(0, 0, { maxDistance: 6 });
    if (hit?.hotspot) this.inspect(hit.hotspot.id);
  }

  setHover(hs) {
    const id = hs?.id || null;
    if (this.pointer.hover === id) return;
    this.pointer.hover = id;
    this.interaction.setHot(id || this.inspectId);
    this.ui.setHotObject(id || this.inspectId);
    if (!this.pointer.down) this.ui.setCursor(id ? 'pointer' : this.state === 'explore' ? 'walk' : this.state === 'guided' || this.state === 'inspect' ? 'grab' : '');
  }

  onKeyDown(e) {
    if (this.overlays.handleKey(e)) return;
    const t = e.target;
    const onControl = t instanceof HTMLElement && (t.tagName === 'BUTTON' || t.tagName === 'A');
    if (e.key === 'Escape') {
      if (this.ui.askOpen) { this.ui.setAskOpen(false); this.ui.focusAsk(); return; }
      if (this.state === 'intro') { this.introAbort?.abort(); return; }
      if (this.state === 'chooser') { this.chooseMode('guided'); return; }
      if (this.state === 'inspect') { this.back(); return; }
      if (this.dialogue.active) { this.dialogue.cancel(); return; }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const inside = !['loading', 'entry', 'intro'].includes(this.state);
    if (this.state === 'explore' && this.walker.key(e.code, true)) {
      if (e.code.startsWith('Arrow')) e.preventDefault();
      return;
    }
    if (!inside) return;
    if ((e.key === 'e' || e.key === 'E' || (e.key === 'Enter' && !onControl)) && this.state === 'explore') {
      const hit = this.interaction.pick(0, 0, { maxDistance: 6 });
      if (hit?.hotspot) { e.preventDefault(); this.inspect(hit.hotspot.id); }
      return;
    }
    if (e.key === ' ' && !onControl && this.dialogue.active) { e.preventDefault(); this.dialogue.next(); return; }
    switch (e.key) {
      case 'g': case 'G': this.chooseMode('guided'); break;
      case 'x': case 'X': this.chooseMode('explore'); break;
      case 'l': case 'L': this.toggleNight(); break;
      case 'm': case 'M': this.toggleSound(); break;
      case '?': this.overlays.openHelp(); break;
      case '`': this.toggleDiag(); break;
      default: break;
    }
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.8 ? 72 : aspect < 1.3 ? 64 : 58;
    this.baseFov = this.camera.fov;
    this.camera.updateProjectionMatrix();
    this.guideWidth = document.getElementById('ws-guide')?.offsetWidth || 0;
    this.viewShiftApplied = null;
  }

  /* Compose the 3D view in the space the UI leaves free: when the location
     list (left) or an inspect card (right) is open on a wide screen, shift
     the projection centre instead of letting panels cover the subject. */
  applyViewShift(dt, w, h) {
    let tx = 0, ty = 0;
    if (this.state === 'guided' || this.state === 'inspect') {
      if (w > 760) {
        const left = this.mode === 'guided' ? (this.guideWidth || 0) + 16 : 0;
        const right = this.ui.cardOpen ? (this.ui.card.offsetWidth || 0) + 16 : 0;
        tx = (left - right) * 0.42;
      } else if (this.ui.cardOpen) {
        ty = Math.min(h * 0.28, (this.ui.card.offsetHeight || 0) * 0.5);   // lift the subject above the sheet
      }
    }
    const k = this.reduced ? 1 : Math.min(1, dt * 5);
    this.viewShift = (this.viewShift ?? 0) + (tx - (this.viewShift ?? 0)) * k;
    this.viewShiftY = (this.viewShiftY ?? 0) + (ty - (this.viewShiftY ?? 0)) * k;
    const sx = Math.round(this.viewShift), sy = Math.round(this.viewShiftY);
    const key = `${sx}|${sy}`;
    if (key === this.viewShiftApplied) return;
    this.viewShiftApplied = key;
    const cam = this.camera;
    const base = this.baseFov || cam.fov;
    if (sx === 0 && sy === 0) {
      cam.clearViewOffset();
      cam.aspect = w / h;
      cam.fov = base;
    } else {
      // A larger virtual frame with the same pixel scale, viewed through a window
      const fw = w + 2 * Math.abs(sx), fh = h + 2 * Math.abs(sy);
      cam.aspect = fw / fh;
      cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base) / 2) * (fh / h)));
      cam.setViewOffset(fw, fh, sx < 0 ? 2 * Math.abs(sx) : 0, sy > 0 ? 2 * sy : 0, w, h);
    }
    cam.updateProjectionMatrix();
  }

  onVisibility() {
    if (document.hidden) {
      this.renderer.setAnimationLoop(null);
      this.walker.keys.clear();
    } else {
      this.last = performance.now();
      this.renderer.setAnimationLoop(this.loop);
    }
  }

  /* ── Frame ────────────────────────────────────────────────────────── */
  loop = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const overlay = this.overlays?.isOpen();
    if (overlay) {
      this.overlayAcc = (this.overlayAcc || 0) + dt;
      if (this.overlayAcc < 0.1) return;   // the scene is behind a blurred backdrop: ~10 fps is plenty
      this.overlayAcc = 0;
    }
    this.time += dt;
    const t = this.time;
    const world = this.world;
    const w = window.innerWidth, h = window.innerHeight;

    // entry parallax
    if (this.state === 'entry' && this.parallax && !this.rig.busy) {
      const [nx, ny] = this.parallax;
      this.rig.offYaw += (-nx * 0.06 - this.rig.offYaw) * Math.min(1, dt * 3);
      this.rig.offPitch += (-ny * 0.035 - this.rig.offPitch) * Math.min(1, dt * 3);
    }
    this.rig.update(dt);
    if (!overlay) this.walker.update(dt);
    this.applyViewShift(dt, w, h);

    const frame = {
      reduced: this.reduced, stats: { ...this.lastStats, tier: this.activeTier || this.tier.name },
      inspecting: this.inspectId, setReadout: (s) => this.ui.setReadout(s), camera: this.camera,
    };
    world.update(dt, t, frame);
    world.avatar.update(dt, t, this.reduced);
    world.hotspots.get('antonis')?.follow?.();

    // night fade
    const nt = this.night.on ? 1 : 0;
    if (this.night.t !== nt) {
      this.night.t = this.reduced ? nt : THREE.MathUtils.clamp(this.night.t + Math.sign(nt - this.night.t) * dt / 0.6, 0, 1);
      world.setNight(this.night.t);
      this.renderer.toneMappingExposure = 1.2 + 0.15 * this.night.t;
    }

    // the host glances at the visitor when idle and close
    const av = world.avatar;
    if (!this.inspectId && !av.walking && this.state !== 'intro') {
      const d = av.position.distanceTo(this.camera.position);
      this.idleLook = (this.idleLook || 0) - dt;
      if (this.idleLook <= 0) {
        this.idleLook = 0.5;
        av.lookAt(d < 6 ? this.camera.position : null);
      }
    }

    // explore: nearby markers + printer remark
    if (this.state === 'explore') {
      this.exploreMarkerClock = (this.exploreMarkerClock || 0) - dt;
      if (this.exploreMarkerClock <= 0) {
        this.exploreMarkerClock = 0.3;
        const near = [];
        for (const hs of world.hotspots.values()) {
          if (hs.kind === 'host') continue;
          if (hs.anchor.distanceTo(this.camera.position) < 2.6) near.push(hs.id);
        }
        const key = near.join('|');
        if (key !== this.nearKey) { this.nearKey = key; this.interaction.setMarkers(near, (id) => this.inspect(id)); }
        const pn = world.shared.printerNear;
        if (pn && Math.hypot(pn.x - this.camera.position.x, pn.z - this.camera.position.z) < 0.95) this.dialogue.comment('printerNear', DIALOGUE.comments.printerNear, { force: true });
      }
      const target = this.interaction.pick(0, 0, { maxDistance: 6 });
      const hs = target?.hotspot;
      if (this.locked || this.touch || !this.pointer.inside) this.ui.setTarget(hs ? this.labelFor(hs.id) : null, w / 2, h / 2);
    } else {
      this.nearKey = null;
    }

    // hover (mouse only), once per frame at most
    if (this.pointer.hoverPending && !this.pointer.down && !this.locked && !overlay) {
      this.pointer.hoverPending = false;
      if (['guided', 'inspect', 'explore', 'entry', 'chooser'].includes(this.state)) {
        const hit = this.interaction.pickClient(this.pointer.x, this.pointer.y, this.renderer.domElement.getBoundingClientRect());
        this.setHover(hit?.hotspot || null);
        if (this.state === 'explore') this.ui.setTarget(hit?.hotspot ? this.labelFor(hit.hotspot.id) : null, this.pointer.x, this.pointer.y);
      }
    }

    this.dialogue.update(dt);
    this.interaction.updateMarkers(dt, w, h, overlay || this.state === 'intro' || this.rig.busy && this.state !== 'entry');

    // speech bubble anchored to the host's head
    const head = av.headWorld(new THREE.Vector3());
    head.y += 0.2;
    const sp = project(head, this.camera, w, h);
    const onScreen = sp && sp.x > 40 && sp.x < w - 40 && sp.y > 90 && sp.y < h - 60 && av.position.distanceTo(this.camera.position) < 9;
    this.ui.placeBubble(sp?.x || 0, sp?.y || 0, !onScreen || w < 560);

    // world-anchored labels (exploded turbine, lifted domes)
    const labels = world.shared.labels3d?.() || [];
    this.ui.setLabels(labels.map((l) => {
      const p = l.pos && project(l.pos, this.camera, w, h);
      return { id: l.id, text: l.text, x: p?.x || 0, y: p?.y || 0, visible: !!(p && l.visible) };
    }));

    if (world.shared.shadowsDirty && this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.needsUpdate = true;
      world.shared.shadowsDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
    const info = this.renderer.info.render;
    this.lastStats = { calls: info.calls, triangles: info.triangles };
    if (!overlay && this.state !== 'loading' && this.state !== 'entry' && this.qualityChoice === 'auto') this.monitor.sample(dt);

    if (this.diag) {
      this.diagClock = (this.diagClock || 0) - dt;
      this.fps = (this.fps || 60) * 0.92 + (dt > 0 ? 1 / dt : 60) * 0.08;
      if (this.diagClock <= 0) {
        this.diagClock = 0.5;
        const mem = this.renderer.info.memory;
        this.ui.setDiag([
          'SYS // DIAGNOSTICS',
          `FPS    ${this.fps.toFixed(0)}   (${(1000 / this.fps).toFixed(1)} ms)`,
          `CALLS  ${info.calls}`,
          `TRIS   ${(info.triangles / 1000).toFixed(1)}k`,
          `GEOM   ${mem.geometries}   TEX ${mem.textures}`,
          `TIER   ${(this.activeTier || this.tier.name).toUpperCase()}   DPR ${this.renderer.getPixelRatio().toFixed(2)}`,
          `STATE  ${this.state}${this.inspectId ? ' · ' + this.inspectId : ''}`,
          `POS    ${this.camera.position.x.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`,
        ].join('\n'));
      }
    }
  };

  /* ── Exit & failure ───────────────────────────────────────────────── */
  exit() {
    if (this.exiting) return;
    this.exiting = true;
    this.overlays.close();
    this.ui.fade(true, 'LOG_ENTRY // 00');
    setTimeout(() => {
      this.dispose();
      window.location.href = '../';
    }, this.reduced ? 60 : 520);
  }

  dispose() {
    try {
      this.renderer?.setAnimationLoop(null);
      this.ac.abort();
      this.releaseLock();
      if (this.scene) disposeTree(this.scene);
      this.world?.kit.textures.forEach((t) => t.dispose());
      this.envTex?.dispose();
      this.renderer?.dispose();
      this.sound?.dispose();
    } catch { /* leaving anyway */ }
  }

  fail(err) {
    console.error('[workshop] falling back to the text version:', err?.message || err);
    this.dispose();
    showTextView('error');
  }
}

/* ── helpers ──────────────────────────────────────────────────────────── */
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
/* Yield to the browser between build steps. rAF is paused in background tabs,
   so a timer guarantees loading still finishes if the visitor switches away. */
function nextFrame() {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(finish);
    setTimeout(finish, 60);
  });
}

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(ABORT); return; }
    const onAbort = () => reject(ABORT);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then((v) => { signal.removeEventListener('abort', onAbort); resolve(v); }, reject);
  });
}

async function fontsReady(timeout) {
  if (!document.fonts?.load) return;
  const loads = ['500 20px "JetBrains Mono"', '400 20px "JetBrains Mono"', 'italic 400 20px "Cormorant Garamond"', 'italic 300 20px "Cormorant Garamond"', '500 20px "Geist"']
    .map((f) => document.fonts.load(f).catch(() => null));
  await Promise.race([Promise.all(loads), sleep(timeout)]);
}

/* A tiny procedural "studio" for reflections: dark box, a few soft panels. */
function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 12), new THREE.MeshBasicMaterial({ color: 0x0b0b0c, side: THREE.BackSide }));
  room.position.y = 2;
  env.add(room);
  const panel = (w, h, color, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    env.add(m);
  };
  panel(3, 3, 0x6a645c, 0, 4.4, 0, Math.PI / 2);
  panel(1.2, 3, 0x2e3440, -5.9, 2, 0, 0, Math.PI / 2);
  panel(1.2, 2, 0x3a2f24, 5.9, 1.6, 1.5, 0, -Math.PI / 2);
  panel(4, 0.3, 0x8a8a8a, 0, 3.2, -5.9);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  env.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return tex;
}
