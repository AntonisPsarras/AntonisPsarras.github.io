/* ==========================================================================
   gallery.js — the achievements wall.

   The formal side of the room: seven framed certificates in one disciplined
   row, grouped by subject, each under its own picture light. The textures
   are the sanitized certificate photographs themselves — never redrawn.
   ========================================================================== */
import { THREE } from './kit.js';
import { GALLERY_WALL } from './architecture.js';
import { AWARDS } from '../content.js';

const FRAME_Y = 1.52;
const IMG_W = 0.5;

export function buildGallery(kit, world) {
  const g = new THREE.Group();
  const M = kit.mat;
  const [ax, az] = GALLERY_WALL.a, [bx, bz] = GALLERY_WALL.b;
  const len = Math.hypot(bx - ax, bz - az);
  const u = new THREE.Vector2((bx - ax) / len, (bz - az) / len);
  const n = new THREE.Vector2(u.y, -u.x);           // inward (+x)
  const rotY = Math.atan2(n.x, n.y);
  const at = (s, off = 0) => new THREE.Vector3(ax + u.x * s + n.x * off, 0, az + u.y * s + n.y * off);

  /* Row layout along the wall: physics first (nearest the door), a gap, maths. */
  const physics = AWARDS.filter((a) => a.group === 'physics');
  const maths = AWARDS.filter((a) => a.group === 'mathematics');
  const step = 0.74, gap = 0.36;
  const total = (physics.length + maths.length - 2) * step + step + gap;
  const sCenter = (0.7 - az) / u.y;
  const start = sCenter + total / 2;
  const slots = [
    ...physics.map((a, i) => ({ a, s: start - i * step })),
    ...maths.map((a, j) => ({ a, s: start - (physics.length - 1) * step - step - gap - j * step })),
  ];

  const certMats = new Map();
  world.shared.certMaterials = certMats;
  const glassMat = M.glass;

  for (const { a, s: sp } of slots) {
    const p = at(sp, 0);
    const frame = new THREE.Group();
    frame.position.set(p.x, FRAME_Y, p.z);
    frame.rotation.y = rotY;

    const aspect = 1.42;
    const iw = IMG_W, ih = IMG_W / aspect;
    const mat = 0.05, fw = 0.014, depth = 0.028;
    const ow = iw + mat * 2 + fw * 2, oh = ih + mat * 2 + fw * 2;
    // back board + mat
    kit.box(ow - fw, oh - fw, 0.012, M.mat, 0, 0, 0.012, frame);
    // steel frame bars
    kit.box(ow, fw, depth, M.blackGloss, 0, oh / 2 - fw / 2, depth / 2, frame);
    kit.box(ow, fw, depth, M.blackGloss, 0, -oh / 2 + fw / 2, depth / 2, frame);
    kit.box(fw, oh, depth, M.blackGloss, -ow / 2 + fw / 2, 0, depth / 2, frame);
    kit.box(fw, oh, depth, M.blackGloss, ow / 2 - fw / 2, 0, depth / 2, frame);
    // the certificate itself
    const certMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.88, emissive: 0x000000, name: `cert:${a.id}` });
    const cert = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), certMat);
    cert.position.z = 0.0185;
    cert.userData.keep = true;
    frame.add(cert);
    certMats.set(a.id, certMat);
    // glass
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ow - fw * 2, oh - fw * 2), glassMat);
    glass.position.z = depth - 0.004;
    glass.renderOrder = 2;
    frame.add(glass);
    // picture light: slim bar on a short arm, plus its wash on the wall
    kit.box(0.01, 0.01, 0.1, M.steelDark, 0, oh / 2 + 0.09, 0.05, frame);
    const bar = kit.cyl(0.011, 0.011, 0.26, M.steelDark, 10, 0, oh / 2 + 0.09, 0.1, frame);
    bar.rotation.z = Math.PI / 2;
    kit.box(0.24, 0.003, 0.008, M.ledWarm, 0, oh / 2 + 0.078, 0.1, frame);
    const wash = kit.wash(0.95, 1.0, 0xfff0d8, 0.22);
    wash.position.set(0, 0.06, 0.003);
    frame.add(wash);
    // mono plaque
    const plaque = kit.labelPlane(`${a.code} // ${a.plaque}`, 0.3, { size: 30, color: '#cfcac0', spacing: 4, opacity: 0.85 });
    plaque.position.set(0, -oh / 2 - 0.07, 0.003);
    frame.add(plaque);

    g.add(frame);

    const anchor = at(sp, 0.08);
    const view = at(sp, 1.15);
    const hitC = at(sp, 0.03);
    world.addHotspot({
      id: `award:${a.id}`, zone: 'achievements', kind: 'award', awardId: a.id,
      anchor: [anchor.x, FRAME_Y + oh / 2 + 0.02, anchor.z],
      hit: [[ow + 0.04, oh + 0.06, 0.08], [hitC.x, FRAME_Y, hitC.z], rotY],
      view: [[view.x, 1.55, view.z], [p.x, FRAME_Y, p.z]],
    });
  }

  // subject headings painted on the wall
  const label = (text, sp) => {
    const p = at(sp, 0.004);
    const l = kit.labelPlane(text, 0.9, { size: 30, color: '#bdb8ae', spacing: 6, opacity: 0.8 });
    l.position.set(p.x, 2.12, p.z);
    l.rotation.y = rotY;
    g.add(l);
  };
  const physMid = (slots[0].s + slots[physics.length - 1].s) / 2;
  const mathMid = (slots[physics.length].s + slots[slots.length - 1].s) / 2;
  label('SYS_PHY // PHYSICS', physMid);
  label('SYS_MTH // MATHEMATICS', mathMid);

  // a narrow ledge under the row: a gallery detail, and something to stop at
  const ledgeLen = total + 0.9;
  const lc = at(sCenter, 0.05);
  const ledge = kit.box(ledgeLen, 0.022, 0.1, M.steelDark, lc.x, 0.98, lc.z, g);
  ledge.rotation.y = rotY;

  /* Guided viewpoint: far enough back to see the whole row. */
  const v = at(sCenter, 3.0);
  const t = at(sCenter, 0);
  world.addLocation('achievements', [v.x, 1.6, v.z], [t.x, 1.45, t.z], slots.map(({ a }) => `award:${a.id}`));

  /* Certificate textures are loaded after the room is built (loader step 3). */
  world.shared.loadCertificates = (manager) => {
    const loader = new THREE.TextureLoader(manager);
    const key = kit.q.awardTex;
    return Promise.all(AWARDS.map((a) => new Promise((resolve) => {
      loader.load(a[key], (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = kit.maxAniso;
        kit.track(tex);
        const m = certMats.get(a.id);
        m.map = tex;
        m.emissiveMap = tex;
        m.emissive.set(0xffffff);
        m.emissiveIntensity = 0.16;
        m.color.set(0xffffff);
        m.needsUpdate = true;
        resolve(true);
      }, undefined, () => {
        console.warn(`[workshop] certificate texture missing: ${a.id}`);
        a.unavailable = true;
        resolve(false);
      });
    })));
  };
  world.onNight((tt) => {
    for (const m of certMats.values()) if (m.map) m.emissiveIntensity = 0.16 + 0.08 * tt;
  });

  return g;
}
