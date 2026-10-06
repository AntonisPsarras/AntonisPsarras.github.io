/* ==========================================================================
   content.js — everything the workshop *says*, kept apart from where things *are*.

   Rules for editing this file (see workshop/README.md):
     - Every statement about Antonis must be supported by the public portfolio.
     - The room is fictional; never describe a real home, door, wiring or layout.
     - Strings are rendered with textContent only. No HTML here, ever.
   ========================================================================== */

/* Project identities mirror index.html / script.js on the homepage.
   Titles, taglines and galleries are duplicated here on purpose: the full
   dossiers are read from ../index.html at runtime (dossiers.js), and this is
   the fallback plus the data the 3D room needs before that fetch completes. */
export const PROJECTS = {
  ag: {
    sys: 'SYS_01 // SOFTWARE', title: 'Aether Gravity', tagline: 'A Minimalist Cosmic Space Simulator',
    images: ['aether-gravity1.png', 'aether-gravity5.png', 'aether-gravity2.png', 'aether-gravity3.png', 'aether-gravity4.png', 'aether-gravity6.png', 'aether-gravity7.png', 'aether-gravity8.png'],
    imageAlt: 'Aether Gravity — N-body orbital sandbox screenshot', layout: 'stack',
    links: [['GitHub', 'https://github.com/AntonisPsarras/Aether-Gravity'], ['Live Demo', 'https://aether-gravity.netlify.app/']],
  },
  sl: {
    sys: 'SYS_02 // SOFTWARE', title: 'ScholiLink', tagline: 'Production-Grade Student Platform',
    images: ['scholilink1.png', 'scholilink2.png', 'scholilink3.png'],
    imageAlt: 'ScholiLink — student platform screenshot', layout: 'side', side: 'left',
    links: [['GitHub', 'https://github.com/AntonisPsarras/Scholilink']],
  },
  wt: {
    sys: 'SYS_03 // HARDWARE', title: 'Wind Turbine System', tagline: 'Functional Balcony Power Generator',
    images: ['turbine-animation.gif', 'turbine1.png', 'turbine2.jpg', 'turbine3.jpg'],
    imageAlt: 'Functional Wind Turbine System — hardware assembly', layout: 'side', side: 'right',
    links: [['MakerWorld', 'https://makerworld.com/en/models/2967248-wind-turbine-project-functional-simple-turbine#profileId-3327133']],
  },
  mc: {
    sys: 'SYS_04 // HARDWARE', title: 'MoonCamp', tagline: 'Modular Magnetic Lunar Habitat',
    images: ['MoonCamp1.webp', 'MoonCamp2.webp', 'MoonCamp3.webp', 'MoonCamp4.webp', 'MoonCamp5.webp'],
    imageAlt: 'MoonCamp — modular magnetic lunar habitat scale model', layout: 'side', side: 'right',
    links: [['MakerWorld', 'https://makerworld.com/en/models/2492018-modular-moon-base-magnetic-lunar-habitat#profileId-2738460']],
  },
  gs: {
    sys: 'SYS_05 // INTEGRATED', title: 'Guardian System', tagline: 'RFID Entry & Home Security',
    /* No installation photographs inside the workshop: this door is fictional and
       must never be visually paired with the real hardware. */
    images: [], imageAlt: '', layout: 'side', side: 'right', abstractGallery: true,
    links: [['GitHub', 'https://github.com/AntonisPsarras/guardian-system']],
  },
  lt: {
    sys: 'SYS_06 // INTEGRATED', title: 'LensTile', tagline: 'Magnetic Image Tiles for Modular Glasses Cases',
    images: ['LensTiles3.png', 'LensTiles2.png', 'LensTiles1.png', 'LensTiles4.png'],
    imageAlt: 'LensTile — modular glasses case and local-first tile app', layout: 'stack',
    links: [['GitHub', 'https://github.com/AntonisPsarras/lenstile'], ['Live App', 'https://antonispsarras.github.io/lenstile/']],
  },
  bc: {
    sys: 'SYS_07 // INTEGRATED', title: 'BrickCast', tagline: 'STL to Interlocking Brick Builds with Full Guidance',
    images: ['BrickCast4.png', 'BrickCast5.png', 'BrickCast2.png', 'BrickCast3.png', 'BrickCast1.png'],
    imageAlt: 'BrickCast — STL to interlocking brick converter', layout: 'stack',
    links: [['GitHub', 'https://github.com/AntonisPsarras/BrickCast']],
  },
};
export const PROJECT_IDS = Object.freeze(Object.keys(PROJECTS));

/* Certificates. Only text that is printed on the (redacted) certificate itself.
   No years, no school, no inferred placements. The image is the artifact. */
const AW = 'assets/awards/';
export const AWARDS = [
  {
    id: 'phy-aristarchos-13-phase-c-1st', group: 'physics', code: 'PHY_01', plaque: '1ST PRIZE',
    title: '1st Prize — 13th Panhellenic Physics Competition “Aristarchos”, third phase',
    original: '13ος Πανελλήνιος Διαγωνισμός Φυσικής «Αρίσταρχος» · Γ΄ Φάση · 1ο Βραβείο',
    issuer: 'Union of Greek Physicists', issuerOriginal: 'Ένωση Ελλήνων Φυσικών',
  },
  {
    id: 'phy-aristarchos-13-1st', group: 'physics', code: 'PHY_02', plaque: '1ST PRIZE',
    title: '1st Prize — 13th Panhellenic Physics Competition “Aristarchos”',
    original: '13ος Πανελλήνιος Διαγωνισμός Φυσικής «Αρίσταρχος» · 1ο Βραβείο',
    issuer: 'Union of Greek Physicists', issuerOriginal: 'Ένωση Ελλήνων Φυσικών',
  },
  {
    id: 'phy-panhellenic-12-2nd', group: 'physics', code: 'PHY_03', plaque: '2ND PRIZE',
    title: '2nd Prize — 12th Panhellenic Physics Competition',
    original: '12ος Πανελλήνιος Διαγωνισμός Φυσικής · 2ο Βραβείο',
    issuer: 'Union of Greek Physicists', issuerOriginal: 'Ένωση Ελλήνων Φυσικών',
  },
  {
    id: 'math-hms-2nd', group: 'mathematics', code: 'MTH_01', plaque: '2ND PRIZE',
    title: '2nd Prize — “Thales” & “Euclid” Panhellenic Mathematics Competitions',
    original: '2ο Βραβείο · Πανελλήνιοι Διαγωνισμοί «Ο Θαλής και ο Ευκλείδης»',
    issuer: 'Hellenic Mathematical Society — Central Macedonia Branch', issuerOriginal: 'Ελληνική Μαθηματική Εταιρεία · Παράρτημα Κεντρικής Μακεδονίας',
  },
  {
    id: 'math-hms-commendation', group: 'mathematics', code: 'MTH_02', plaque: 'COMMENDATION',
    title: 'Commendation — “Thales” & “Euclid” Panhellenic Mathematics Competitions',
    original: 'Έπαινος · Πανελλήνιοι Διαγωνισμοί «Ο Θαλής και ο Ευκλείδης»',
    issuer: 'Hellenic Mathematical Society — Central Macedonia Branch', issuerOriginal: 'Ελληνική Μαθηματική Εταιρεία · Παράρτημα Κεντρικής Μακεδονίας',
  },
  {
    id: 'math-municipal-thales-euclid', group: 'mathematics', code: 'MTH_03', plaque: 'HONORARY AWARD',
    title: 'Honorary Award — distinction in the “Thales” & “Euclid” mathematics competitions',
    original: 'Τιμητικό Βραβείο · Μαθηματικών «Θαλής» και «Ευκλείδης»',
    issuer: 'Municipal honorary award', issuerOriginal: 'Αντιδημαρχία Παιδείας',
  },
  {
    id: 'math-municipal-thales', group: 'mathematics', code: 'MTH_04', plaque: 'HONORARY AWARD',
    title: 'Honorary Award — distinction in the “Thales” mathematics competition',
    original: 'Τιμητικό Βραβείο · Μαθηματικών «Θαλής»',
    issuer: 'Municipal honorary award', issuerOriginal: 'Αντιδημαρχία Παιδείας',
  },
].map((a, i) => ({
  ...a,
  index: i,
  full: `${AW}${a.id}.1600.webp`,
  tex: `${AW}${a.id}.1024.webp`,
  texLow: `${AW}${a.id}.512.webp`,
  alt: `Certificate: ${a.title}. Issued by ${a.issuer}. Personal details redacted.`,
}));
export const AWARD_IDS = Object.freeze(AWARDS.map((a) => a.id));

/* Guided-tour stops, in the order a visitor in a hurry should see them. */
export const LOCATIONS = [
  { id: 'overview',     label: 'Overview',          sys: 'LOC_00', summary: 'The whole workshop: certificates on the left wall, printers on the central bench, desks for electronics, code and physics on the right, the Aether orrery straight ahead.' },
  { id: 'achievements', label: 'Achievements',      sys: 'LOC_01', summary: 'The achievements wall: seven framed certificates from national physics and mathematics competitions, with personal details redacted.' },
  { id: 'fabrication',  label: 'Printers',          sys: 'LOC_02', summary: 'The fabrication bench: a Bambu Lab P2S printing a LensTile and a Bambu Lab A1 printing a MoonCamp dome, with the filament, tools and parts bin around them.' },
  { id: 'electronics',  label: 'Electronics',       sys: 'LOC_03', summary: 'The electronics bench: soldering station, circuit board revisions, an oscilloscope, a multimeter and calipers.' },
  { id: 'programming',  label: 'Programming',       sys: 'LOC_04', summary: 'The programming desk: a monitor showing this room’s own source code, a second screen and the ScholiLink station.' },
  { id: 'physics',      label: 'Physics',           sys: 'LOC_05', summary: 'The physics corner: a chalkboard of orbital equations, a Bloch sphere, twin double pendulums and study notes.' },
  { id: 'aether',       label: 'Aether orrery',     sys: 'LOC_06', summary: 'The Aether Gravity orrery: a star and four bodies on Keplerian orbits.' },
  { id: 'shelf',        label: 'Project shelf',     sys: 'LOC_07', summary: 'The project shelf: MoonCamp, BrickCast, LensTile and the drawer of failed iterations.' },
  { id: 'turbine',      label: 'Turbine stand',     sys: 'LOC_08', summary: 'The wind turbine test stand: a turbine facing a fan, with its charging electronics exposed.' },
  { id: 'entrance',     label: 'Entrance',          sys: 'LOC_09', summary: 'The entrance: the Guardian interior portal and control panel, the light switch and the workshop log.' },
  { id: 'guardian',     label: 'Guardian · door',   sys: 'LOC_10', summary: 'The Guardian System at the door: the lamp with its camera above it, the doorbell on the corridor wall, then the interior portal and control panel inside.' },
];
export const LOCATION_IDS = Object.freeze(LOCATIONS.map((l) => l.id));

/* Inspect-card copy, keyed by hotspot id. `project` opens a homepage dossier.
   `related` lists project ids offered as secondary links. */
export const HOTSPOTS = {
  'guardian-lamp': {
    sys: 'SYS_05 // GUARDIAN · DOOR LAMP', title: 'Door lamp',
    body: ['A printed black lamp with three frosted panels and the system’s camera behind the lens, above the door. Frigate person detection and the camera’s measured brightness drive its automatic control.', 'Here: walk into the corridor and it lights on its own, or set it by hand below.'],
    project: 'gs',
  },
  doorbell: {
    sys: 'SYS_05 // GUARDIAN · DOORBELL', title: 'Doorbell',
    body: ['The printed outdoor doorbell with its bell icon. It is also one of Guardian’s two ESP32 RFID readers: it shares one Home Assistant decision path with the interior portal.', 'Press it, then watch the portal’s speaker and the panel’s event log.'],
    project: 'gs',
  },
  'guardian-panel': {
    sys: 'SYS_05 // GUARDIAN · INTERIOR PORTAL', title: 'Interior portal',
    body: ['The interior reader: a speaker, a small status screen and a 3 × 4 keypad in a frosted printed shell, with the second ESP32 RFID reader. Guardian also has an elevated mode that challenges an unexpected opening with a card and master PIN before sounding an alarm.', 'The keypad here is a demo. It has no code, unlocks nothing and remembers nothing — press the keys, then # to arm or disarm.'],
    project: 'gs',
  },
  'guardian-tablet': {
    sys: 'SYS_05 // GUARDIAN · CONTROL PANEL', title: 'Control panel',
    body: ['A stand-in for Guardian’s custom Home Assistant panel: camera view, presence, door lamp, mode and recent events. Every figure on it is demo data.', 'The door camera is the real one in the lamp. The room camera is a demo extra; the project has a single camera.'],
    project: 'gs',
  },
  'light-switch': {
    sys: 'ENV // LIGHTING', title: 'Light switch',
    body: ['Switches between working light and a darker presentation mode, where the orbits on the ceiling come through.', 'Manual only. The room never checks the time or where you are.'],
  },
  'workshop-log': {
    sys: 'LOG_ENTRY // WORKSHOP', title: 'Workshop log',
    body: ['A fictional workshop built from the projects on this portfolio.', 'Three.js r186 and plain ES modules — no framework, no build step, no analytics, no cookies. Almost every object here is generated from code.'],
  },
  'exit-door': {
    sys: 'EXIT // PORTFOLIO', title: 'Exit',
    body: ['Back to the portfolio.'],
  },
  'printer-enclosed': {
    sys: 'FAB_01 // BAMBU LAB P2S', title: 'Bambu Lab P2S',
    body: ['The enclosed CoreXY printer. It is printing a LensTile — the 148 × 53 mm magnetic image tile — carrying the orbit art from Aether Gravity. Its spool hangs on the side holder.', '“I bought my first 3D printer a few years ago and soon fell in love with product design.”'],
    related: ['lt', 'ag'],
  },
  'printer-open': {
    sys: 'FAB_02 // BAMBU LAB A1', title: 'Bambu Lab A1',
    body: ['The open-frame bed-slinger, slowly printing a MoonCamp habitat dome. The spool turns on its arm at the top left as the filament feeds.'],
    related: ['mc'],
  },
  'bench-tiles': {
    sys: 'FAB_03 // SAMPLES', title: 'Smooth vs Relief',
    body: ['Two LensTile surface styles side by side: Smooth for one-filament prints, Relief for layered colour.', 'The card beside them is the whole philosophy: local-first, no uploads. Images never leave the device.'],
    related: ['lt'],
  },
  soldering: {
    sys: 'ELEC_01 // SOLDERING', title: 'Soldering station',
    body: ['To connect code with physical products I learned PCB design and soldering, and chose to work directly with microcontrollers and sensors instead of starting with Arduino boards.', 'On the bench: an ESP32-class module, a tray of 1N5819 / TP4056 / MT3608 parts, and calipers reading 53.00 mm — the height of a LensTile.'],
  },
  scope: {
    sys: 'ELEC_02 // SCOPE', title: 'Rectified waveform',
    body: ['A full-wave rectified sine: what the wind turbine’s 1N5819 Schottky bridge makes of the generator’s AC, before the boost converters and the TP4056 charger take over.'],
    related: ['wt'],
  },
  multimeter: {
    sys: 'ELEC_03 // MEASURE', title: '3.71 V',
    body: ['An 18650 lithium-ion cell at a typical resting voltage — the kind of cell the wind turbine charges through its TP4056 module.'],
    related: ['wt'],
  },
  'pcb-revisions': {
    sys: 'ELEC_04 // REVISIONS', title: 'REV A → REV C',
    body: ['A symbolic pair of boards: REV A with a bodge wire, REV C without one. Iteration, in copper.'],
  },
  'monitor-main': {
    sys: 'DEV_01 // workshop-scene.js', title: 'The code for this room',
    body: ['The main monitor is reading workshop-scene.js — the module that assembled the room you are standing in — straight from this site.', 'Its status bar shows live renderer numbers: draw calls, triangles and the current quality tier.'],
  },
  'monitor-side': {
    sys: 'DEV_02 // STACK', title: 'Second screen',
    body: ['Cycles through the live scene graph of this room, a LensTile CAD drawing (148 × 53 × 4 mm), the ScholiLink emulator boot log and a BrickCast layer view.'],
  },
  scholilink: {
    sys: 'SYS_02 // SOFTWARE', title: 'ScholiLink station',
    body: ['A tablet and a small emulator box, running obviously fake demo data.', 'ScholiLink is a Flutter student platform with Firebase auth and server-side Gemini; the real platform keeps student data behind uid-scoped security rules.'],
    project: 'sl',
  },
  bloch: {
    sys: 'PHY_Q // BLOCH SPHERE', title: 'Bloch sphere',
    body: ['One qubit drawn as a point on a sphere: |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}·sin(θ/2)|1⟩. The gates apply exact rotations of the state vector.', 'A drawing, not a quantum computer.'],
  },
  pendulum: {
    sys: 'PHY_C // CHAOS', title: 'Double pendulums',
    body: ['Two double pendulums released 0.001 rad apart and integrated with RK4. For a few seconds they agree. Then they don’t.'],
  },
  chalkboard: {
    sys: 'PHY_N // NOTES', title: 'Chalkboard',
    body: [
      'Kepler III — T² ∝ a³: outer orbits are slower.',
      'Newtonian gravity — F = G·m₁·m₂ / r².',
      'Hill sphere — r_H ≈ a(1 − e)·∛(m / 3M): the region where a planet’s gravity beats its star’s.',
      'Roche limit — d ≈ 2.44·R·(ρ_M / ρ_m)^⅓: closer than this, tides pull a moon apart.',
      'Qubit — |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}·sin(θ/2)|1⟩.',
      'Aether Gravity’s stability tooling visualizes Hill spheres and Roche limits.',
    ],
    related: ['ag'],
  },
  notebooks: {
    sys: 'PHY_S // STUDY', title: 'Study notes',
    body: ['Notebooks for classical mechanics, quantum mechanics, electromagnetism and orbital mechanics.', 'I study theoretical physics, especially quantum computing, which I hope to pursue at university.'],
  },
  aether: {
    sys: 'SYS_01 // SOFTWARE', title: 'Aether orrery',
    body: ['A physical orrery for Aether Gravity, the N-body space simulator. The orbit shapes match the portfolio’s hero canvas, and G = 0.8 comes from Aether’s constants.', 'Unlike the homepage dots, these bodies solve Kepler’s equation, so they speed up near the star.'],
    project: 'ag',
  },
  turbine: {
    sys: 'SYS_03 // HARDWARE', title: 'Turbine test stand',
    body: ['A workshop test rig: the turbine faces a fan instead of weather.', 'The exposed plate shows the charging chain — a Schottky bridge rectifier, two MT3608 boost converters and a TP4056 charging an 18650 cell. The twisted blade on the floor is a V1.'],
    project: 'wt',
  },
  mooncamp: {
    sys: 'SYS_04 // HARDWARE', title: 'MoonCamp',
    body: ['A miniature of the modular, magnetic lunar habitat — a conceptual educational model, not a certified habitat.', 'Choose a module to lift its dome.'],
    project: 'mc',
  },
  brickcast: {
    sys: 'SYS_07 // INTEGRATED', title: 'Mesh → Grid → Bricks',
    body: ['One small habitat module in BrickCast’s three views.', 'The voxels and bricks are computed live from the dome’s shape when the room loads — a miniature of the idea, not BrickCast itself.'],
    project: 'bc',
  },
  'lenstile-case': {
    sys: 'SYS_06 // INTEGRATED', title: 'LensTile case',
    body: ['The modular glasses case with a swappable magnetic image tile. Tiles are made in a local-first browser app and exported as STL or multicolour 3MF.'],
    project: 'lt',
  },
  failed: {
    sys: 'LOG // FAILED ITERATIONS', title: 'Failed iterations',
    body: ['A warped tile. A blade that twisted. A board that needed a bodge wire. A part that didn’t fit.', '“I approach product building as an iterative process: I work through problems, refine each version, and rebuild when it needs a better foundation.”'],
  },
  antonis: {
    sys: 'SYS_00 // HOST', title: 'Antonis',
    body: ['A low-poly stand-in for me, not a portrait. Ask a question — the answers come from a fixed script, not a chatbot.'],
  },
};

/* MoonCamp modules, named as in the portfolio copy. */
export const MOONCAMP_MODULES = ['Control', 'Energy', 'ISRU', 'Greenhouse', 'Laboratory', 'Living', 'Medical', 'Recreation', 'Rover'];

/* ---------------------------------------------------------------------------
   Dialogue — deterministic. No model, no network. Every answer paraphrases a
   statement the portfolio already makes.
   --------------------------------------------------------------------------- */
export const DIALOGUE = {
  intro: [
    { text: 'Hey — welcome.', pose: 'wave' },
    { text: 'This isn’t my actual room. Think of it as a workshop made from the things I build.' },
    { text: 'Look around. Most things here have a story.', pose: 'gesture' },
  ],
  direct: [
    { text: 'Hey — welcome. This isn’t my actual room; think of it as a workshop made from the things I build.', pose: 'wave' },
  ],
  ask: [
    { id: 'engineering', q: 'Why engineering?', lines: ['I like the moment an idea stops being a sketch and starts working.', 'Every skill I picked up — CAD, printing, code, electronics — let me build a bit more of the idea myself.'] },
    { id: 'physics', q: 'Why physics?', lines: ['Physics is where the “why does this work?” questions live.', 'I study theoretical physics — quantum computing especially — and I hope to pursue it at university. Aether Gravity is that curiosity with a render loop.'] },
    { id: 'build', q: 'What do you build?', lines: ['Things that cross the line between software and hardware, mostly.', 'A student platform, a gravity simulator, an RFID entry system, a wind turbine, magnetic image tiles, a lunar habitat model and a mesh-to-brick converter. Most of them are somewhere in this room.'] },
    { id: 'failed', q: 'What failed?', lines: ['Plenty. Most projects here had a version that didn’t work.', 'The drawer under the project shelf is the evidence. When something needs a better foundation, I rebuild it.'], pose: 'shrug' },
    { id: 'favorite', q: 'Favorite kind of project?', lines: ['Probably the ones with two sides — code on one, a physical object on the other.', 'LensTile is a good example: a browser app that turns a photo into a printable magnetic tile.'] },
    { id: 'next', q: 'What’s next?', lines: ['University, hopefully — physics, with quantum computing in particular.', 'AI and quantum computing are the fields I want to keep learning and contributing to.'] },
    { id: 'real', q: 'Is any of this real?', lines: ['The projects are real, and so are the certificates on that wall.', 'The room isn’t. It’s invented on purpose — no real doors, floor plans or wiring went into it.'] },
    { id: 'how', q: 'How was this built?', lines: ['Three.js and plain JavaScript modules, no build step. Nearly everything is generated from code.', 'The monitor on the programming desk is showing the file that builds this room.'] },
  ],
  comments: {
    award: { text: 'The formal wall. The benches are where the work actually happens.' },
    'printer-enclosed': { text: 'Most of the physical things in here started on one of these.' },
    'printer-open': { text: 'That dome is a MoonCamp module. It takes a while.' },
    soldering: { text: 'Microcontrollers and sensors, straight away — no starter kits. Steeper, but worth it.' },
    scope: { text: 'That waveform is the turbine’s rectifier doing its job.' },
    'monitor-main': { text: 'That’s the code for this room. Yes, it’s a little recursive.' },
    scholilink: { text: 'Demo data only. The real platform keeps student data behind server-side rules.' },
    bloch: { text: 'Not a quantum computer. Just a very good way to draw one qubit.' },
    pendulum: { text: 'Same start, a thousandth of a radian apart. Give it ten seconds.' },
    chalkboard: { text: 'Hill spheres and Roche limits — Aether’s stability tools use both.' },
    aether: { text: 'Same constants as the gravity simulator. G is 0.8 here too.' },
    turbine: { text: 'On the test stand it gets a fan instead of weather.' },
    mooncamp: { text: 'Every dome lifts off — magnets hold them. It’s a classroom model, not a real habitat.' },
    brickcast: { text: 'Mesh, grid, bricks. That’s the whole pipeline in three steps.' },
    'lenstile-case': { text: 'Everything in LensTile runs locally. Your photo never leaves the browser.' },
    failed: { text: 'The most honest shelf in the room.', pose: 'shrug' },
    'guardian-lamp': { text: 'The lamp and its camera. Frigate spots a person, and it switches on by itself.' },
    doorbell: { text: 'Printed, white, one button. It’s also an RFID reader.' },
    'guardian-panel': { text: 'The interior portal. The hardware is real; this door and this room aren’t.' },
    'guardian-tablet': { text: 'Everything on that panel is demo data. The camera in the lamp is real, though.' },
    night: { text: 'Better. Now you can see the orbits.' },
    printerNear: { text: 'Probably not the best place to stand.' },
  },
  doorbell: [
    { text: 'The door’s already open.' },
    { text: 'Guardian heard you the first time. It logs everything.', pose: 'shrug' },
    { text: 'Still logged. Still open.' },
    { text: '…' },
  ],
};

/* ScholiLink Firebase-emulator boot log — mirrored from script.js
   (SL_TERMINAL_LINES). Demo data only: emulator ports and example accounts. */
export const SL_TERMINAL_LINES = [
  { t: 'cmd',   s: '$ firebase emulators:start --import=./seed --project student-dashboard-greece' },
  { t: 'info',  s: '  Starting emulators...' },
  { t: 'ok',    s: '  auth            localhost:9099    online' },
  { t: 'ok',    s: '  firestore       localhost:8080    online' },
  { t: 'ok',    s: '  functions       localhost:5001    online' },
  { t: 'ok',    s: '  storage         localhost:9199    online' },
  { t: 'blank', s: '' },
  { t: 'info',  s: 'Loading Firestore security rules...' },
  { t: 'meta',  s: '  47 rule clauses parsed' },
  { t: 'meta',  s: '  uid-scoped reads: verified' },
  { t: 'meta',  s: '  server-only paths [/internal /admin]: denied' },
  { t: 'blank', s: '' },
  { t: 'info',  s: 'Deploying Cloud Functions  (Node 22, TypeScript)...' },
  { t: 'fn',    s: '  [1/4]  tutoring-ai             callable    ready' },
  { t: 'fn',    s: '  [2/4]  safety-score            callable    ready' },
  { t: 'fn',    s: '  [3/4]  social-graph-mutate     callable    ready' },
  { t: 'fn',    s: '  [4/4]  gemini-orchestrator     callable    ready' },
  { t: 'blank', s: '' },
  { t: 'info',  s: 'Seeding demo environment...' },
  { t: 'meta',  s: '  student@example.com     uid: usr_7f3a2b    ok' },
  { t: 'meta',  s: '  teammate@example.com    uid: usr_9c1d4e    ok' },
  { t: 'meta',  s: '  18 Firestore documents written' },
  { t: 'blank', s: '' },
  { t: 'ok',    s: 'ScholiLink ready on http://localhost:3000' },
  { t: 'meta',  s: 'AI: Gemini mocked (deterministic)  |  Mode: EMULATOR' },
];

/* Lucide-compatible stroke icons (same geometry as the homepage's ICONS),
   stored as path data so they can be built with createElementNS. */
export const ICON_PATHS = {
  github: ['M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5A10.3 10.3 0 0 0 12 3c-1.27 0-2.4.43-3.5 1-2-1.5-3-1.5-3-1.5-.28 1.15-.28 2.35 0 3.5A5.4 5.4 0 0 0 5 10c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S10.15 17.75 10 19v4', 'M9 18c-4.51 2-5-2-7-2'],
  'arrow-up-right': ['M7 7h10v10', 'M7 17 17 7'],
  zap: ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'],
};

export const SOURCE_URL = 'https://github.com/AntonisPsarras/AntonisPsarras.github.io/blob/main/workshop/js/workshop-scene.js';
