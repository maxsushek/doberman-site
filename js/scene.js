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
scene.fog = new THREE.Fog(0x0b0b0c, 44, 92);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 170);
camera.position.set(0, 0, 50);      // pulled back — the mark sits in air
camera.lookAt(2.2, 0, 0);           // bias right so the left column is free

/* ── lights — bright + a rim for crisp edges ─ */
scene.add(new THREE.AmbientLight(0xece8e1, 0.7));
const key = new THREE.DirectionalLight(0xfdfbf6, 1.75);
key.position.set(-7, 11, 18);
scene.add(key);
const fill = new THREE.DirectionalLight(0xbfd0e0, 0.45);
fill.position.set(12, -5, 10);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 0.7);
rim.position.set(4, 3, -12);        // back light — defines the silhouette
scene.add(rim);
const copper = new THREE.PointLight(0xb4885e, 80, 70, 1.7);
copper.position.set(10, 3, 14);
scene.add(copper);

/* ── paw group (offset to the right) ───────── */
const paw = new THREE.Group();
paw.position.x = 7;
scene.add(paw);

const boneMat = new THREE.MeshStandardMaterial({ color: 0xf0ece5, roughness: 0.5, metalness: 0.14 });
const copperMat = new THREE.MeshStandardMaterial({ color: 0xc79769, roughness: 0.38, metalness: 0.4, emissive: 0x2a1c10, emissiveIntensity: 0.55 });

/* state, filled once the point cloud is ready */
let COUNT = 0;
let targets = [], scattered = [], delays = [], seeds = [];
let mesh = null, copperMesh = null, copperSet = null;
let ready = false;

/* ── build particles from world-space target points ─ */
function buildParticles(pts, cubeSize) {
  COUNT = pts.length;
  const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

  copperSet = new Set();
  // ~5% copper, scattered (hashed) so it reads as warmth, not rows of specks
  for (let i = 0; i < COUNT; i++) {
    const h = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    if ((h < 0 ? h + 1 : h) < 0.05) copperSet.add(i);
  }

  mesh = new THREE.InstancedMesh(geo, boneMat, COUNT - copperSet.size);
  copperMesh = new THREE.InstancedMesh(geo, copperMat, copperSet.size);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  copperMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  paw.add(mesh, copperMesh);

  targets = pts.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  for (let i = 0; i < COUNT; i++) {
    const t = targets[i];
    // start scattered behind the plane, converge forward into the mark
    const a = (i * 2.399963) % (Math.PI * 2);
    const r = 12 + (i % 23) * 0.75;
    scattered.push(new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a) * r * 0.72,
      -20 - ((i * 7) % 22)
    ));
    // assemble bottom-up with a gentle per-particle offset
    const yn = THREE.MathUtils.clamp((7 - t.y) / 14, 0, 1);
    delays.push(yn * 0.5 + ((i * 13) % 100) / 100 * 0.22);
    seeds.push(((i * 31) % 100) / 100);
  }
  ready = true;
}

/* ── sample the real logo → dense even grid ── */
function sampleLogo() {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      const W = 250;
      const cv = document.createElement("canvas");
      const pawH = Math.round(im.height * 0.80); // top part only — skip the wordmark
      cv.width = W; cv.height = Math.round(W * pawH / im.width);
      const cx = cv.getContext("2d");
      cx.drawImage(im, 0, 0, im.width, pawH, 0, 0, cv.width, cv.height);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;
      // stricter alpha → cleaner, sharper silhouette edge
      const opaque = (x, y) => d[(y * cv.width + x) * 4 + 3] > 135;

      let oc = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (opaque(x, y)) oc++;

      // fine even grid → ~10000 small cubes → smooth, crisp edges
      const k = Math.max(1, Math.round(Math.sqrt(oc / 10000)));
      const scale = 11 / cv.height;            // smaller mark = more air around it
      const cxp = cv.width / 2, cyp = cv.height / 2, maxR = cv.height * 0.55;
      const pts = [];
      for (let y = 0; y < cv.height; y += k)
        for (let x = 0; x < cv.width; x += k)
          if (opaque(x, y)) {
            const dx = x - cxp, dy = y - cyp;
            const dist = Math.hypot(dx, dy) / maxR;
            pts.push({
              x: dx * scale,
              y: -dy * scale,
              z: 0.5 * Math.max(0, 1 - dist * dist) + (((x * 7 + y * 13) % 10) / 10 - 0.5) * 0.08
            });
          }
      resolve({ pts, cube: k * scale * 0.9 }); // cubes nearly fill the grid → solid, crisp
    };
    im.onerror = () => resolve(null);
    im.src = "assets/logo_h230.webp";
  });
}

/* ── procedural paw fallback (5 pads, dense) ─ */
function proceduralPaw() {
  const pads = [
    { cx: 0, cy: -2.7, rx: 3.0, ry: 2.7 },   // main pad
    { cx: -3.0, cy: 1.4, rx: 1.25, ry: 1.7 },
    { cx: -1.05, cy: 3.0, rx: 1.25, ry: 1.75 },
    { cx: 1.05, cy: 3.0, rx: 1.25, ry: 1.75 },
    { cx: 3.0, cy: 1.4, rx: 1.25, ry: 1.7 }
  ];
  const pts = [];
  const g = 0.24; // grid spacing
  pads.forEach((p) => {
    for (let y = -p.ry; y <= p.ry; y += g)
      for (let x = -p.rx; x <= p.rx; x += g) {
        if ((x / p.rx) ** 2 + (y / p.ry) ** 2 <= 1) {
          const wx = p.cx + x, wy = p.cy + y;
          const dist = Math.hypot(wx, wy) / 5.5;
          pts.push({ x: wx, y: wy, z: 0.6 * Math.max(0, 1 - dist * dist) });
        }
      }
  });
  return { pts, cube: 0.2 };
}

sampleLogo().then((r) => {
  const src = r && r.pts.length > 400 ? r : proceduralPaw();
  buildParticles(src.pts, src.cube);
});

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
  paw.position.x = w < 900 ? 0 : 7;
  // narrow viewports frame a tall slice — shrink the mark so it keeps its air
  paw.scale.setScalar(w < 700 ? 0.66 : w < 900 ? 0.8 : 1);
  camera.lookAt(w < 900 ? 0 : 2.2, 0, 0);
  camera.updateProjectionMatrix();
  if (prefersReduced && ready) renderer.render(scene, camera);
};
resize();
window.addEventListener("resize", resize);

/* ── render loop (paused off-screen) ───────── */
const dummy = new THREE.Object3D();
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
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

  smoothTiltX += (mouse.x - smoothTiltX) * 0.025;
  smoothTiltY += (mouse.y - smoothTiltY) * 0.025;
  smoothBuild += (buildProgress - smoothBuild) * 0.03; // slow, buttery assembly

  // very gentle sway — the mark stays crisp and readable, never tilts far
  paw.rotation.y = Math.sin(t * 0.22) * 0.06 + smoothTiltX * 0.16;
  paw.rotation.x = Math.cos(t * 0.18) * 0.03 - smoothTiltY * 0.08;

  if (ready) {
    let bi = 0, ci = 0;
    for (let i = 0; i < COUNT; i++) {
      const p = Math.max(0, Math.min(1, (smoothBuild * 1.45 - delays[i]) / 0.6));
      const e = easeOutQuart(p);
      const from = scattered[i], to = targets[i];
      const drift = (1 - e) * Math.sin(t * 0.7 + seeds[i] * 12) * 0.28;

      dummy.position.set(
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e + drift,
        from.z + (to.z - from.z) * e
      );
      const rot = (1 - e) * seeds[i] * Math.PI * 1.6;
      dummy.rotation.set(rot, rot * 0.6, 0);
      const s = 0.3 + e * 0.7;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      if (copperSet.has(i)) copperMesh.setMatrixAt(ci++, dummy.matrix);
      else mesh.setMatrixAt(bi++, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    copperMesh.instanceMatrix.needsUpdate = true;
    copper.intensity = 60 + Math.sin(t * 1.0) * 8 + smoothBuild * 26;
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


