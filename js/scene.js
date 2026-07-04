/* ══════════════════════════════════════════════
   DOBERMAN — particles assemble the paw mark
   Chaos → the brand itself: метафора відбудови,
   що збирає знак Doberman. Scroll drives the build.
   ══════════════════════════════════════════════ */
import * as THREE from "three";

const canvas = document.getElementById("voxelCanvas");
const section = document.getElementById("digital");
if (!canvas || !section) throw new Error("digital section missing");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── renderer / scene / camera ─────────────── */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0b0c, 34, 68);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
camera.position.set(0, 0, 32);
camera.lookAt(2, 0, 0); // bias right so the left half is free for text

/* ── lights — bright enough that the mark reads clearly ─ */
scene.add(new THREE.AmbientLight(0xece8e1, 0.6));
const key = new THREE.DirectionalLight(0xfdfbf6, 1.5);
key.position.set(-6, 10, 16);
scene.add(key);
const fill = new THREE.DirectionalLight(0xbfd0e0, 0.5);
fill.position.set(10, -4, 8);
scene.add(fill);
const copper = new THREE.PointLight(0xb4885e, 90, 60, 1.7);
copper.position.set(9, 2, 12);
scene.add(copper);

/* ── paw group (offset to the right) ───────── */
const paw = new THREE.Group();
paw.position.x = 6;
scene.add(paw);

/* materials */
const boneMat = new THREE.MeshStandardMaterial({ color: 0xece8e1, roughness: 0.55, metalness: 0.12 });
const copperMat = new THREE.MeshStandardMaterial({ color: 0xc79769, roughness: 0.4, metalness: 0.35, emissive: 0x2a1c10, emissiveIntensity: 0.6 });

/* state filled once the target point cloud is ready */
let COUNT = 0;
let targets = [], scattered = [], delays = [], seeds = [], mesh = null, copperMesh = null, copperIdx = [];
let copperSet = null;
let ready = false;

/* ── build particles from a list of world-space target points ─ */
function buildParticles(pts) {
  COUNT = pts.length;
  const cube = 0.19;
  const geo = new THREE.BoxGeometry(cube, cube, cube);

  copperIdx = [];
  for (let i = 0; i < COUNT; i++) if ((i * 37) % 100 < 11) copperIdx.push(i); // ~11% copper accents
  copperSet = new Set(copperIdx);

  mesh = new THREE.InstancedMesh(geo, boneMat, COUNT - copperIdx.length);
  copperMesh = new THREE.InstancedMesh(geo, copperMat, copperIdx.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  copperMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  paw.add(mesh, copperMesh);

  // remap so bone/copper instances index cleanly
  targets = pts.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  for (let i = 0; i < COUNT; i++) {
    const t = targets[i];
    const a = (i * 2.399963) % (Math.PI * 2); // golden angle spread
    const r = 16 + (i % 19) * 0.8;
    scattered.push(new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a) * r * 0.8,
      -14 - ((i * 7) % 20)
    ));
    // assemble bottom-up-ish with a little per-particle jitter
    delays.push(gsapNorm(t.y) * 0.4 + ((i * 13) % 100) / 100 * 0.3);
    seeds.push(((i * 31) % 100) / 100);
  }
  ready = true;
}

function gsapNorm(y) { return THREE.MathUtils.clamp((8 - y) / 16, 0, 1); }

/* ── sample the real logo → point cloud ────── */
function sampleLogo() {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      const W = 150;
      const cv = document.createElement("canvas");
      const pawH = Math.round(im.height * 0.80); // top part only — skip the wordmark
      cv.width = W; cv.height = Math.round(W * pawH / im.width);
      const cx = cv.getContext("2d");
      cx.drawImage(im, 0, 0, im.width, pawH, 0, 0, cv.width, cv.height);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;

      const raw = [];
      for (let y = 0; y < cv.height; y++)
        for (let x = 0; x < cv.width; x++)
          if (d[(y * cv.width + x) * 4 + 3] > 110) raw.push([x, y]);

      // downsample to a clean particle count
      const CAP = 2400;
      const step = Math.max(1, Math.floor(raw.length / CAP));
      const scale = 16 / cv.height;
      const cxp = cv.width / 2, cyp = cv.height / 2, maxR = cv.height * 0.55;
      const pts = [];
      for (let i = 0; i < raw.length; i += step) {
        const [x, y] = raw[i];
        const dx = x - cxp, dy = y - cyp;
        const dist = Math.hypot(dx, dy) / maxR;
        const dome = 1.6 * Math.max(0, 1 - dist * dist); // bulge toward camera
        pts.push({
          x: dx * scale,
          y: -dy * scale,
          z: dome + (((i * 17) % 10) / 10 - 0.5) * 0.5
        });
      }
      resolve(pts);
    };
    im.onerror = () => resolve(null);
    im.src = "assets/logo_h230.webp";
  });
}

/* ── procedural paw fallback (5 pads) ──────── */
function proceduralPaw() {
  const pads = [
    { cx: 0, cy: -3.2, rx: 3.4, ry: 3.1, n: 900 },   // main pad
    { cx: -3.4, cy: 1.6, rx: 1.4, ry: 1.9, n: 300 }, // toes
    { cx: -1.2, cy: 3.4, rx: 1.4, ry: 2.0, n: 300 },
    { cx: 1.2, cy: 3.4, rx: 1.4, ry: 2.0, n: 300 },
    { cx: 3.4, cy: 1.6, rx: 1.4, ry: 1.9, n: 300 }
  ];
  const pts = [];
  pads.forEach((p) => {
    let placed = 0, guard = 0;
    while (placed < p.n && guard < p.n * 40) {
      guard++;
      const u = ((guard * 0.618) % 1) * 2 - 1;
      const v = ((guard * 0.379) % 1) * 2 - 1;
      if (u * u + v * v <= 1) {
        const x = p.cx + u * p.rx, y = p.cy + v * p.ry;
        const dist = Math.hypot(x, y) / 6;
        pts.push({ x, y, z: 1.4 * Math.max(0, 1 - dist * dist) + (((placed * 7) % 10) / 10 - 0.5) * 0.5 });
        placed++;
      }
    }
  });
  return pts;
}

sampleLogo().then((pts) => buildParticles(pts && pts.length > 400 ? pts : proceduralPaw()));

/* ── scroll progress ───────────────────────── */
let buildProgress = prefersReduced ? 1 : 0;
if (!prefersReduced && window.ScrollTrigger) {
  window.ScrollTrigger.create({
    trigger: section,
    start: "top 80%",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => { buildProgress = self.progress; }
  });
}

/* ── mouse tilt ────────────────────────────── */
const mouse = { x: 0, y: 0 };
if (!prefersReduced) {
  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

/* ── resize ────────────────────────────────── */
const resize = () => {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // pull the paw a bit toward centre on narrow screens
  paw.position.x = w < 900 ? 0 : 6;
  camera.lookAt(w < 900 ? 0 : 2, 0, 0);
  camera.updateProjectionMatrix();
  if (prefersReduced && ready) renderer.render(scene, camera);
};
resize();
window.addEventListener("resize", resize);

/* ── render loop (paused off-screen) ───────── */
const dummy = new THREE.Object3D();
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
let visible = false;
let rafId = null;
let smoothBuild = prefersReduced ? 1 : 0;
let smoothTiltX = 0, smoothTiltY = 0;
const clock = new THREE.Clock();

if (!prefersReduced) {
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && rafId === null) rafId = requestAnimationFrame(loop);
  }, { rootMargin: "10%" });
  io.observe(section);
}

function loop() {
  rafId = null;
  if (!visible) return;
  const t = clock.getElapsedTime();

  smoothTiltX += (mouse.x - smoothTiltX) * 0.03;
  smoothTiltY += (mouse.y - smoothTiltY) * 0.03;
  smoothBuild += (buildProgress - smoothBuild) * 0.045;

  // gentle front-facing sway — the mark stays readable, never spins away
  paw.rotation.y = Math.sin(t * 0.25) * 0.14 + smoothTiltX * 0.28;
  paw.rotation.x = Math.cos(t * 0.2) * 0.05 - smoothTiltY * 0.14;

  if (ready) {
    let bi = 0, ci = 0;
    for (let i = 0; i < COUNT; i++) {
      const p = Math.max(0, Math.min(1, (smoothBuild * 1.5 - delays[i]) / 0.55));
      const e = easeOutCubic(p);
      const from = scattered[i], to = targets[i];
      const drift = (1 - e) * Math.sin(t * 0.8 + seeds[i] * 12) * 0.35;

      dummy.position.set(
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e + drift,
        from.z + (to.z - from.z) * e
      );
      const rot = (1 - e) * seeds[i] * Math.PI * 2;
      dummy.rotation.set(rot, rot * 0.7, rot * 0.3);
      const s = 0.35 + e * 0.65;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      if (copperSet.has(i)) { copperMesh.setMatrixAt(ci++, dummy.matrix); }
      else { mesh.setMatrixAt(bi++, dummy.matrix); }
    }
    mesh.instanceMatrix.needsUpdate = true;
    copperMesh.instanceMatrix.needsUpdate = true;
    copper.intensity = 70 + Math.sin(t * 1.1) * 10 + smoothBuild * 30;
  }

  renderer.render(scene, camera);
  rafId = requestAnimationFrame(loop);
}

if (prefersReduced) {
  // static assembled render once the cloud is ready
  buildProgress = 1; smoothBuild = 1; visible = true;
  const waitReady = () => { if (ready) { loop(); visible = false; } else setTimeout(waitReady, 60); };
  waitReady();
}
