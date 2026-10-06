/* ==========================================================================
   interact.js — one interaction system for every hotspot.

   Hit-testing never touches render geometry: each hotspot owns an invisible
   proxy on LAYER.PROXY, walls and big furniture are coarse boxes on
   LAYER.OCCLUDER, and the floor is a single plane. A ray returns the nearest
   of those, so you can't click through a wall and merged meshes stay merged.

   The DOM markers are a pointer affordance only (aria-hidden, untabbable);
   keyboard and screen-reader users use the guided list, which drives the
   exact same activate() path.
   ========================================================================== */
import { THREE, LAYER } from './world/kit.js';

const _v = new THREE.Vector3();
const _ndc = new THREE.Vector2();

export class Interaction {
  constructor({ camera, world, markersEl, labelFor }) {
    this.camera = camera;
    this.world = world;
    this.markersEl = markersEl;
    this.labelFor = labelFor;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.set(LAYER.PROXY);
    this.raycaster.layers.enable(LAYER.OCCLUDER);
    this.raycaster.far = 30;
    this.targets = [...world.proxies, ...world.occluders, world.floor].filter(Boolean);
    this.markers = new Map();
    this.markerIds = [];
    this.occlusionClock = 0;
    this.hot = null;
  }

  /* Ray from normalized device coords. Returns { hotspot } | { floor, point } | null. */
  pick(ndcX, ndcY, { maxDistance = 30 } = {}) {
    _ndc.set(ndcX, ndcY);
    this.raycaster.setFromCamera(_ndc, this.camera);
    this.raycaster.far = maxDistance;
    const hits = this.raycaster.intersectObjects(this.targets, false);
    for (const hit of hits) {
      const o = hit.object;
      if (o.userData.hotspotId) {
        const hs = this.world.hotspots.get(o.userData.hotspotId);
        if (hs && hs.enabled !== false) return { hotspot: hs, distance: hit.distance, point: hit.point };
        continue;
      }
      if (o.userData.floor) return { floor: true, point: hit.point, distance: hit.distance };
      return null; // an occluder came first
    }
    return null;
  }

  pickClient(x, y, rect, opts) {
    return this.pick(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1, opts);
  }

  /* ── Markers ─────────────────────────────────────────────────────── */
  setMarkers(ids, onActivate) {
    this.markerIds = ids.filter((id) => this.world.hotspots.has(id));
    const keep = new Set(this.markerIds);
    for (const [id, el] of this.markers) {
      if (!keep.has(id)) { el.remove(); this.markers.delete(id); }
    }
    for (const id of this.markerIds) {
      if (this.markers.has(id)) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'ws-marker';
      el.tabIndex = -1;
      el.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'ws-marker-label';
      label.textContent = this.labelFor(id);
      el.appendChild(label);
      el.addEventListener('click', (e) => { e.stopPropagation(); onActivate(id); });
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      this.markersEl.appendChild(el);
      this.markers.set(id, el);
      el._visible = false;
      el._occluded = false;
    }
    this.occlusionClock = 0;
  }

  setHot(id) {
    if (this.hot === id) return;
    if (this.hot) this.markers.get(this.hot)?.classList.remove('is-hot');
    this.hot = id;
    if (id) this.markers.get(id)?.classList.add('is-hot');
  }

  /* Project markers every frame; re-test occlusion a few times a second. */
  updateMarkers(dt, width, height, hidden) {
    this.occlusionClock -= dt;
    const checkOcclusion = this.occlusionClock <= 0;
    if (checkOcclusion) this.occlusionClock = 0.25;
    const camPos = this.camera.position;
    for (const id of this.markerIds) {
      const el = this.markers.get(id);
      const hs = this.world.hotspots.get(id);
      if (!el || !hs) continue;
      if (hidden || hs.enabled === false) { setVis(el, false); continue; }
      _v.copy(hs.anchor).project(this.camera);
      const inFront = _v.z < 1 && _v.z > -1;
      const x = (_v.x * 0.5 + 0.5) * width;
      const y = (-_v.y * 0.5 + 0.5) * height;
      const onScreen = inFront && x > 8 && x < width - 8 && y > 56 && y < height - 8;
      if (checkOcclusion && onScreen) el._occluded = this.#occluded(hs, camPos);
      const vis = onScreen && !el._occluded;
      setVis(el, vis);
      if (vis) el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  #occluded(hs, camPos) {
    const dir = _v.copy(hs.anchor).sub(camPos);
    const dist = dir.length();
    dir.divideScalar(dist);
    this.raycaster.set(camPos, dir);
    this.raycaster.far = dist;
    const hits = this.raycaster.intersectObjects(this.targets, false);
    for (const h of hits) {
      if (h.object.userData.hotspotId === hs.id) return false;
      if (h.object.userData.occluder && h.distance < dist - 0.25) return true;
    }
    return false;
  }

  clearMarkers() { this.setMarkers([], () => {}); }
}

function setVis(el, on) {
  if (el._visible === on) return;
  el._visible = on;
  el.classList.toggle('is-visible', on);
  el.style.visibility = on ? 'visible' : 'hidden';
}

/* Screen position of a world point; null when behind the camera. */
export function project(point, camera, width, height) {
  _v.copy(point).project(camera);
  if (_v.z > 1 || _v.z < -1) return null;
  return { x: (_v.x * 0.5 + 0.5) * width, y: (-_v.y * 0.5 + 0.5) * height };
}
