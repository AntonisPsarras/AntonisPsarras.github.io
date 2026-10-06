/* ==========================================================================
   workshop-scene.js — assembles the room you are standing in.

   If you are reading this on the monitor inside the workshop: hello.
   This module is fetched from the site and drawn onto that screen.

   The room is fictional. Each zone is a function that receives the kit and
   the world registry, builds its objects procedurally, and registers what
   it owns: hotspots, colliders, guided-tour viewpoints and animations.
   ========================================================================== */
import { THREE, Kit, LAYER } from './world/kit.js';
import { buildArchitecture } from './world/architecture.js';
import { buildGuardian } from './world/guardian.js';
import { buildGallery } from './world/gallery.js';
import { buildFabrication } from './world/fabrication.js';
import { buildElectronics } from './world/electronics.js';
import { buildProgramming } from './world/programming.js';
import { buildStudy } from './world/study.js';
import { buildExhibits } from './world/exhibits.js';
import { buildAvatar } from './avatar.js';

/* Order matters only for the loader log; zones never reach into each other
   except through world.shared. */
const ZONES = [
  ['architecture', buildArchitecture],
  ['guardian', buildGuardian],
  ['achievements', buildGallery],
  ['fabrication', buildFabrication],
  ['electronics', buildElectronics],
  ['programming', buildProgramming],
  ['physics', buildStudy],
  ['exhibits', buildExhibits],
];

export class World {
  constructor(kit) {
    this.kit = kit;
    this.root = new THREE.Group();
    this.root.name = 'Workshop';
    this.hotspots = new Map();
    this.locations = new Map();
    this.proxies = [];
    this.occluders = [];
    this.floor = null;
    this.colliders = { boxes: [], segments: [], circles: [] };
    this.updaters = [];
    this.lights = [];
    this.nightTargets = [];
    this.shared = {};
    this.night = 0;
  }

  /* A hotspot is anything the visitor can inspect, in 3D or from the list. */
  addHotspot({ hit, anchor, view, ...def }) {
    const hs = {
      kind: 'object',
      enabled: true,
      ...def,
      anchor: new THREE.Vector3(...anchor),
      // optional third entry: waypoints the camera should fly through on the way
      view: { position: new THREE.Vector3(...view[0]), target: new THREE.Vector3(...view[1]), via: (view[2] || []).map((p) => new THREE.Vector3(...p)) },
    };
    const [size, center, rotY = 0] = hit;
    hs.proxy = this.kit.proxy(size, center, hs.id, this.root, rotY);
    this.proxies.push(hs.proxy);
    this.hotspots.set(hs.id, hs);
    return hs;
  }

  addLocation(id, position, target, hotspots) {
    this.locations.set(id, { id, position: new THREE.Vector3(...position), target: new THREE.Vector3(...target), hotspots });
  }

  addBox(minX, maxX, minZ, maxZ) {
    const b = { minX, maxX, minZ, maxZ };
    this.colliders.boxes.push(b);
    return b;
  }

  addWall(ax, az, bx, bz, occluderHeight = 0) {
    const s = { ax, az, bx, bz };
    this.colliders.segments.push(s);
    if (occluderHeight > 0) {
      const len = Math.hypot(bx - ax, bz - az);
      // 6 cm thick: thin enough that small wall-mounted things (keys, buttons) can sit just in front of it
      this.addOccluder([len, occluderHeight, 0.06], [(ax + bx) / 2, occluderHeight / 2, (az + bz) / 2], -Math.atan2(bz - az, bx - ax));
    }
    return s;
  }

  addOccluder(size, center, rotY = 0) {
    const o = this.kit.occluder(size, center, this.root, rotY);
    this.occluders.push(o);
    return o;
  }

  /* Lights fade between working light and night presentation mode. */
  addLight(light, nightFactor = 0.25) {
    light.userData.dayIntensity = light.intensity;
    light.userData.nightFactor = nightFactor;
    this.lights.push(light);
    return light;
  }

  onNight(fn) { this.nightTargets.push(fn); }
  onUpdate(fn) { this.updaters.push(fn); }

  setNight(t) {
    this.night = t;
    for (const l of this.lights) l.intensity = l.userData.dayIntensity * (1 + (l.userData.nightFactor - 1) * t);
    for (const fn of this.nightTargets) fn(t);
  }

  update(dt, time, frame) {
    for (const fn of this.updaters) fn(dt, time, frame);
  }
}

export async function buildWorkshop({ renderer, scene, quality, onZone }) {
  const kit = new Kit(quality, renderer);
  const world = new World(kit);
  scene.add(world.root);

  for (const [name, build] of ZONES) {
    const group = build(kit, world);
    group.name = name;
    world.root.add(group);
    await onZone?.(name);          // yields a frame so the loader can breathe
  }

  world.avatar = buildAvatar(kit, world);
  world.root.add(world.avatar.root);

  /* Collapse static geometry: roughly one draw call per material. */
  world.stats = kit.mergeStatic(world.root);

  /* A single floor plane for "click to walk here". */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), new THREE.MeshBasicMaterial({ visible: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1.5);
  floor.layers.set(LAYER.OCCLUDER);
  floor.userData.floor = true;
  floor.userData.proxy = true;
  world.root.add(floor);
  world.floor = floor;

  world.root.updateMatrixWorld(true);
  return world;
}
