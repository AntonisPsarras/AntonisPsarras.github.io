# The Workshop

An optional, fictional 3D room at `/workshop/`, built from the projects on the
portfolio. Plain HTML, CSS and ES modules on top of a vendored, unmodified
Three.js build (`../vendor/three`, r186.1, MIT). No build step, no
dependencies, no analytics, no cookies, no storage.

The homepage never loads any of this. It only links here — through a portal at
the centre of the hero (Canvas 2D, no Three.js), which is still a plain link.

## Rules for future edits

- **The room is fictional; some of its objects are not.** The Guardian devices
  (door lamp with its camera, doorbell, interior portal) are modelled from the
  photos of the real hardware, and the two printers from the real Bambu Lab P2S
  and A1. The room around them is invented: never model a real home, floor
  plan, window, wiring run, camera position or anything else about the real
  installation. Where the devices sit in the room is a design choice, not a
  record of where they are mounted.
- **No real codes or secrets.** The Guardian keypad is a demo: it has no code,
  unlocks nothing and stores nothing, and its screen says so. The control
  panel, presence list and event log are demo data; the second ("room") camera
  is labelled a demo extra — the project has one camera, in the door lamp.
- **No logos or lettering from real products.** The printers carry no brand
  marks. Colours come from public specs: the A1's light grey (≈ `#C4C3C5`) with
  dark-grey end pieces, the P2S's industrial grey with tinted glass and silver.
- **The host is a stand-in.** The avatar (`js/avatar.js`) is a low-poly figure
  with black medium-length hair; skin, hair and clothes are the constants in
  `C`. Copy calls it a stand-in, not a portrait.
- **No invented biography.** Copy in `js/content.js` must be supported by the
  public portfolio. Dialogue is a fixed script; there is no chatbot.
- **Certificates.** Only the sanitized derivatives in `assets/awards/` belong
  here. Originals stay in the git-ignored `/Awards/` folder. Derivatives are
  re-encoded from pixels: no EXIF, XMP or ICC. Metadata shown is only text that
  is printed on the certificate.
- **No HTML strings.** UI text uses `textContent` and `createElement`. Project
  dossiers are fetched from `../index.html` and rebuilt through an allowlist
  sanitizer (`js/dossiers.js`). The Guardian dossier still shows an abstract
  plate, not installation photos.
- **CSP.** `index.html` carries a strict policy: same-origin scripts, no inline
  scripts or style attributes, and only the two Google Fonts origins. JS may set
  styles through CSSOM (`el.style.x = …`), but never through `style=""`.

## Map

| File | Role |
|---|---|
| `index.html` | CSP, UI shells, project modal shell, and the complete **text version** (also the no-JS / no-WebGL2 fallback) |
| `js/boot.js` | Synchronous mode switch before first paint: 3D, or text version; flags `?via=portal` |
| `js/main.js` | Module entry. Imports the 3D app only if WebGL2 is available |
| `js/app.js` | Orchestrator: renderer, loader, state machine, input (mouse-look, keys, touch), intro, loop, disposal |
| `js/workshop-scene.js` | Assembles the zones (this file is shown on the in-room monitor) |
| `js/world/kit.js` | Materials, families, atlases, procedural textures, static merging |
| `js/world/*.js` | One builder per zone: architecture, **guardian**, gallery, fabrication (+ **printers**), electronics, programming, study, exhibits |
| `js/avatar.js` | The host: lofted body, sculpted head, hair; procedural pose blending |
| `js/interact.js` | Hotspot ray-picking on proxy layers; DOM markers |
| `js/controls.js` | Camera rig (eased flights / cuts) and the Explore walker (keys + analog pad, collisions, gait) |
| `js/touchpad.js` | The on-screen walking pad and Interact button |
| `js/dialogue.js` · `js/content.js` | Deterministic dialogue engine and all copy |
| `js/overlays.js` · `js/dossiers.js` | Project dossiers, certificate viewer, help; homepage-dossier sanitizer |
| `js/quality.js` · `js/audio.js` · `js/ui.js` · `js/fallback.js` | Tiers, synthesized sound, HUD, text version |

### Controls

- **Explore, mouse.** Moving the mouse looks around (pointer lock, taken on
  entering Explore; `Esc` frees the cursor and a "Click to look around" prompt
  offers it back). `W A S D` / arrows walk, `Shift` runs, and `E`, `F`, `Enter`
  or a click interact with whatever is under the dot. One ray (`aimPick()`)
  drives the label, the highlight and the action, so they cannot disagree.
  Letter shortcuts use `e.code`, so they work on any keyboard layout.
- **Explore, touch.** Auto-enabled on coarse-pointer devices; the **Pad** chip
  toggles it anywhere. A joystick (left), an Interact button (right) and
  drag-anywhere-to-look. Pointer lock and drag-look are mutually exclusive: with
  the pad on, the cursor stays free.
- **`press` hotspots.** Keypad keys and the control-panel buttons carry a
  `press()` handler and `quiet: true`: they act in place, never open a card,
  and don't get markers or list entries.

### The Guardian system

`js/world/guardian.js` builds the four devices and one state machine,
`world.shared.guardian`, that the 3D devices, the screens and the inspect-card
chips all read, so they cannot disagree. The door camera's feed is a second
camera rendered into a small render target (about 10 Hz, only while the panel is
in view and close, or inspected) and shown through a CCTV shader. The visitor
appears in it as a silhouette on a layer only the feed cameras draw, and "Simulate
a visitor" walks a second one up the corridor.

### States

`loading → entry → intro → chooser → guided ⇄ explore ⇄ inspect`. Overlays sit
on top of any state. While one is open, the app is `inert`, pointer lock is
released, movement stops and the dialog owns the keyboard.

## Budgets (measured at 1280×720, see `?debug=1`)

| Tier | DPR cap | Shadows | Calls per station | Calls, wide overview | Triangles |
|---|---|---|---|---|---|
| HIGH | 1.5 | 1 frozen spot map | ~25–70 | ~100 | ≤ ~90k at the busiest view |
| LOW | 1.0 | none | fewer; segments scale to 0.6× | fewer | roughly half |

Looking out through the open door from the corridor sees the whole room at once
(~130 calls on HIGH). The call count comes from three techniques:

- Static geometry merges into one mesh per material **family**, with colours
  baked into vertex colours.
- Labels and paper props share two **canvas atlases**.
- On LOW, decorative motion freezes and merges.

The Guardian's camera feed is a second scene render, so it only runs while the
control panel is on screen and within about 5.5 m (or being inspected), at 10 Hz
(5 Hz on LOW or under reduced motion).

At runtime, slow median frames lower the pixel ratio and then switch off
shadows. This happens in Auto quality only, and never raises quality again.

Payload is about 3 MB in total: Three.js ~2.1 MB uncompressed (served gzipped),
the workshop's own code and styles, and ~1 MB of certificate images across
three sizes.

## Debug / test switches (allowlisted URL parameters)

- `?view=text`: the text version.
- `?webgl=0`: force the no-WebGL path.
- `?quality=low|medium|high`: pick a tier.
- `?motion=reduce|full`: override the motion preference.
- `?controls=touch|off`: force the on-screen pad on or off (the default follows
  the device).
- `?debug=1`: diagnostics panel, plus `window.__workshop` and in-memory CSP
  reports, for local inspection only.
- `?via=portal`: set by the homepage portal; plays a short arrival flourish
  (warm bloom, wide-to-normal field of view). Cosmetic only.
