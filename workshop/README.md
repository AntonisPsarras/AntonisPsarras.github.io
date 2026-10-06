# The Workshop

An optional, fictional 3D room at `/workshop/`, built from the projects on the
portfolio. Plain HTML, CSS and ES modules on top of a vendored, unmodified
Three.js build (`../vendor/three`, r186.1, MIT). No build step, no
dependencies, no analytics, no cookies, no storage.

The homepage never loads any of this. It only links here.

## Rules for future edits

- **The room is fictional.** Never model a real home, door, window, wiring,
  camera position or device placement. The Guardian door and panel are
  deliberately abstract, and the Guardian dossier shows no installation photos
  inside the workshop.
- **No invented biography.** Copy in `js/content.js` must be supported by the
  public portfolio. Dialogue is a fixed script; there is no chatbot.
- **Certificates.** Only the sanitized derivatives in `assets/awards/` belong
  here. Originals stay in the git-ignored `/Awards/` folder. Derivatives are
  re-encoded from pixels: no EXIF, XMP or ICC. Metadata shown is only text that
  is printed on the certificate.
- **No HTML strings.** UI text uses `textContent` and `createElement`. Project
  dossiers are fetched from `../index.html` and rebuilt through an allowlist
  sanitizer (`js/dossiers.js`).
- **CSP.** `index.html` carries a strict policy: same-origin scripts, no inline
  scripts or style attributes, and only the two Google Fonts origins. JS may set
  styles through CSSOM (`el.style.x = …`), but never through `style=""`.

## Map

| File | Role |
|---|---|
| `index.html` | CSP, UI shells, project modal shell, and the complete **text version** (also the no-JS / no-WebGL2 fallback) |
| `js/boot.js` | Synchronous mode switch before first paint: 3D, or text version |
| `js/main.js` | Module entry. Imports the 3D app only if WebGL2 is available |
| `js/app.js` | Orchestrator: renderer, loader, state machine, input, intro, loop, disposal |
| `js/workshop-scene.js` | Assembles the zones (this file is shown on the in-room monitor) |
| `js/world/kit.js` | Materials, families, atlases, procedural textures, static merging |
| `js/world/*.js` | One builder per zone: architecture, gallery, fabrication, electronics, programming, study, exhibits |
| `js/avatar.js` | Stylized host figure with procedural pose blending |
| `js/interact.js` | Hotspot ray-picking on proxy layers; DOM markers |
| `js/controls.js` | Camera rig (eased flights / cuts) and Explore walker with collisions |
| `js/dialogue.js` · `js/content.js` | Deterministic dialogue engine and all copy |
| `js/overlays.js` · `js/dossiers.js` | Project dossiers, certificate viewer, help; homepage-dossier sanitizer |
| `js/quality.js` · `js/audio.js` · `js/ui.js` · `js/fallback.js` | Tiers, synthesized sound, HUD, text version |

### States

`loading → entry → intro → chooser → guided ⇄ explore ⇄ inspect`. Overlays sit
on top of any state. While one is open, the app is `inert`, pointer lock is
released, movement stops and the dialog owns the keyboard.

## Budgets (measured at 1280×800, see `?debug=1`)

| Tier | DPR cap | Shadows | Calls per station | Calls, wide overview | Triangles |
|---|---|---|---|---|---|
| HIGH | 1.5 | 1 frozen spot map | ~21–37 | ~90 | ≤ 64k |
| LOW | 1.0 | none | ~19–30 | ~73 | ≤ 40k |

The draw-call count comes from three techniques:

- Static geometry merges into one mesh per material **family**, with colours
  baked into vertex colours.
- Labels and paper props share two **canvas atlases**.
- On LOW, decorative motion freezes and merges.

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
- `?debug=1`: diagnostics panel, plus `window.__workshop` and in-memory CSP
  reports, for local inspection only.
