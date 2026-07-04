/* ══════════════════════════════════════════════
   DOBERMAN — voxel tower (Three.js)
   Chaos → assembly: метафора відбудови.
   Scroll drives the build; mouse tilts the eye.
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
scene.fog = new THREE.Fog(0x121214, 26, 60);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
camera.position.set(14, 9, 24);
camera.lookAt(0, 5, 0);

/* ── lights ────────────────────────────────── */
scene.add(new THREE.AmbientLight(0xecE8e1, 0.14));
const key = new THREE.DirectionalLight(0xece8e1, 1.1);
key.position.set(12, 18, 8);
scene.add(key);
const copper = new THREE.PointLight(0xb4885e, 60, 40, 1.8);
copper.position.set(-8, 4, 10);
scene.add(copper);

/* ── voxel tower layout ────────────────────── */
// stepped tower silhouette: columns of varying height on a 7×7 grid
const GRID = 7;
const CELL = 1.05;
const targets = [];
const heights = [
  [2, 3, 4, 4, 3, 2, 1],
  [3, 5, 7, 7, 5, 3, 2],
  [4, 7, 11, 12, 8, 4, 3],
  [4, 8, 12, 14, 10, 5, 3],
  [3, 6, 9, 11, 8, 4, 2],
  [2, 4, 6, 7, 5, 3, 2],
  [1, 2, 3, 3, 2, 2, 1]
];
for (let x = 0; x < GRID; x++) {
  for (let z = 0; z < GRID; z++) {
    const h = heights[x][z];
    for (let y = 0; y < h; y++) {
      targets.push(new THREE.Vector3(
        (x - (GRID - 1) / 2) * CELL,
        y * CELL + CELL / 2,
        (z - (GRID - 1) / 2) * CELL
      ));
    }
  }
}
const COUNT = targets.length;

/* scattered "ruin" start positions + per-voxel stagger */
const scattered = [];
const delays = [];
const seeds = [];
for (let i = 0; i < COUNT; i++) {
  const t = targets[i];
  const r = 10 + (i % 17) * 0.9;
  const a = (i * 2.399963) % (Math.PI * 2); // golden angle — deterministic spread
  scattered.push(new THREE.Vector3(
    Math.cos(a) * r,
    -3 + ((i * 7) % 23) * 0.35,
    Math.sin(a) * r * 0.6
  ));
  delays.push((t.y / 16) * 0.55 + ((i * 13) % 100) / 100 * 0.25);
  seeds.push(((i * 31) % 100) / 100);
}

const geo = new THREE.BoxGeometry(CELL * 0.92, CELL * 0.92, CELL * 0.92);
const mat = new THREE.MeshLambertMaterial({ color: 0x1c1c1f });
const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);

/* copper "core" voxels — a warm seam inside the tower */
const copperMat = new THREE.MeshLambertMaterial({ color: 0xb4885e, emissive: 0x3d2a18 });
const copperIdx = [];
for (let i = 0; i < COUNT; i += 23) copperIdx.push(i);
const copperMesh = new THREE.InstancedMesh(geo, copperMat, copperIdx.length);
copperMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(copperMesh);

/* ground grid — architectural drawing feel */
const gridHelper = new THREE.GridHelper(44, 44, 0x2a2a2e, 0x1a1a1d);
gridHelper.position.y = 0;
scene.add(gridHelper);

/* ── scroll progress via ScrollTrigger ─────── */
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
  camera.updateProjectionMatrix();
  // reduced-motion has no render loop — repaint the static frame
  if (prefersReduced) renderer.render(scene, camera);
};
resize();
window.addEventListener("resize", resize);

/* ── render loop (paused off-screen) ───────── */
const dummy = new THREE.Object3D();
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
let visible = false;
let rafId = null;

if (!prefersReduced) {
  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && rafId === null) rafId = requestAnimationFrame(loop);
  }, { rootMargin: "10%" });
  io.observe(section);
}

let smoothTilt = { x: 0, y: 0 };
// scroll drives the TARGET; the scene eases toward it — the camera and
// the assembly never move sharply no matter how violent the scroll is
let smoothBuild = prefersReduced ? 1 : 0;
const clock = new THREE.Clock();

function loop() {
  rafId = null;
  if (!visible) return;
  const t = clock.getElapsedTime();

  smoothTilt.x += (mouse.x - smoothTilt.x) * 0.04;
  smoothTilt.y += (mouse.y - smoothTilt.y) * 0.04;
  smoothBuild += (buildProgress - smoothBuild) * 0.06;

  // slow cinematic orbit + mouse tilt
  const orbit = t * 0.045 + smoothTilt.x * 0.22;
  const radius = 25 - smoothBuild * 4;
  camera.position.x = Math.sin(orbit) * radius;
  camera.position.z = Math.cos(orbit) * radius;
  camera.position.y = 9 - smoothTilt.y * 2 + smoothBuild * 1.5;
  camera.lookAt(0, 4.5 + smoothBuild * 1.5, 0);

  let ci = 0;
  for (let i = 0; i < COUNT; i++) {
    const p = Math.max(0, Math.min(1, (smoothBuild * 1.55 - delays[i]) / 0.6));
    const e = easeOutCubic(p);
    const from = scattered[i];
    const to = targets[i];

    // idle float for unassembled voxels
    const drift = (1 - e) * Math.sin(t * 0.8 + seeds[i] * 12) * 0.4;

    dummy.position.set(
      from.x + (to.x - from.x) * e,
      from.y + (to.y - from.y) * e + drift,
      from.z + (to.z - from.z) * e
    );
    const rot = (1 - e) * seeds[i] * Math.PI * 2;
    dummy.rotation.set(rot, rot * 0.7, rot * 0.3);
    const s = 0.4 + e * 0.6;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    if (ci < copperIdx.length && copperIdx[ci] === i) {
      // clearly larger than the base voxel so the shells never z-fight
      dummy.scale.multiplyScalar(1.06);
      dummy.updateMatrix();
      copperMesh.setMatrixAt(ci, dummy.matrix);
      ci++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  copperMesh.instanceMatrix.needsUpdate = true;

  // copper light breathes — softly, no glow spikes
  copper.intensity = 40 + Math.sin(t * 1.1) * 8 + smoothBuild * 26;

  renderer.render(scene, camera);
  rafId = requestAnimationFrame(loop);
}

if (prefersReduced) {
  // static assembled render
  buildProgress = 1;
  smoothBuild = 1;
  visible = true;
  loop();
  visible = false;
}
