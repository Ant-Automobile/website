// Hakkımızda bölümündeki montaj sahnesi: aracın gerçek CAD modeli (GLB) teknik çizim
// diliyle çizilir; parçalar kaydırmaya bağlı olarak sırayla yerine oturur.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshBasicMaterial, LineSegments,
  LineBasicMaterial, EdgesGeometry, Color, Vector3, PlaneGeometry, CanvasTexture, SRGBColorSpace,
} from 'three';
import { loadModel } from './model.js';

// Montaj sırası: önce şasi, en son gövde kabuğu. Her grup kendi yönünden gelir.
const STAGES = [
  { nodes: ['sasi', 'metal'], from: [0, -0.35, 0], edge: 24 },
  { nodes: ['lastik', 'jant', 'fren', 'suspansiyon', 'motor'], from: [0, -0.7, 0], edge: 40 },
  { nodes: ['kafes'], from: [0, 0.9, 0], edge: 30 },
  { nodes: ['batarya', 'elektrik'], from: [0.9, 0.35, 0], edge: 30 },
  { nodes: ['koltuk', 'manken', 'kask', 'pedal', 'siyah'], from: [0, 0.8, 0], edge: 35 },
  { nodes: ['govde', 'cam', 'derz', 'ayna', 'aynacam', 'karbon', 'far', 'stop', 'kirmizi'], from: [0, 1.5, 0], edge: 18, shell: true },
];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

export function createViewer(canvas, { onProgress } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(26, 1, 0.1, 50);
  const target = new Vector3(1.75, 0.5, 0); // araç boyunun ortası (model 0…3,5 m)
  const rig = new Group(); // aracı merkez etrafında döndürmek için
  scene.add(rig);
  const car = new Group();
  car.position.set(-target.x, -target.y, -target.z);
  rig.add(car);

  const stages = STAGES.map((s) => ({ ...s, group: new Group(), lines: [], fills: [], vec: new Vector3(...s.from) }));
  stages.forEach((s) => car.add(s.group));

  // Zemin gölgesi (statik doku)
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.translate(128, 64);
    g.scale(2, 1);
    const grd = g.createRadialGradient(0, 0, 2, 0, 0, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.32)');
    grd.addColorStop(0.6, 'rgba(0,0,0,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(-64, -64, 128, 128);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  })();
  const shadow = new Mesh(new PlaneGeometry(4.9, 2.6), new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(1.75, 0.001, 0);
  car.add(shadow);

  const colors = { ink: new Color(), fill: new Color(), accent: new Color() };
  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    colors.ink.set(cs.getPropertyValue('--ink').trim() || '#111');
    colors.fill.set(cs.getPropertyValue('--surface').trim() || '#f6f7f6');
    colors.accent.set(cs.getPropertyValue('--accent').trim() || '#dc4219');
    const dark = colors.fill.getHSL({}).l < 0.3;
    stages.forEach((s) => {
      s.lines.forEach((l) => l.material.color.copy(colors.ink));
      s.fills.forEach((f) => f.material.color.copy(colors.fill));
    });
    shadow.material.opacity = dark ? 0.9 : 0.55;
    dirty = true;
  }

  let progress = 0;
  let loaded = false;
  let dirty = true;
  let yaw = 0, yawTarget = 0, pitch = 0, pitchTarget = 0;

  function applyProgress() {
    const n = stages.length;
    stages.forEach((s, i) => {
      const t = easeOut(clamp01((progress * (n + 1) - i) / 1.6));
      s.group.position.copy(s.vec).multiplyScalar(1 - t);
      const a = clamp01(t * 1.4);
      s.lines.forEach((l) => { l.material.opacity = (s.shell ? 0.55 : 0.85) * a; });
      s.fills.forEach((f) => { f.material.opacity = f.userData.base * a; });
      s.group.visible = a > 0.001;
    });
    // Son aşamada iç parçalar kabuğun arkasında hafifçe geri çekilir
    const shellT = clamp01(progress * (n + 1) - (n - 1));
    stages.slice(0, -1).forEach((s) => s.lines.forEach((l) => { l.material.opacity *= 1 - shellT * 0.55; }));
    yawTarget = -0.62 + progress * 0.5;
    dirty = true;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Kadraj: araç genişliğe sığsın (3,5 m boy + 1,6 m genişlik; bakış açısı mesafeyle sabit)
    const dist = Math.max(7.3, 7.3 * (1.3 / camera.aspect));
    camera.position.set(0, dist * 0.246, dist);
    camera.lookAt(0, -0.02, 0);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  const ready = loadModel(onProgress).then((gltf) => {
    const byName = {};
    gltf.scene.traverse((o) => { if (o.isMesh) byName[o.name] = o; });
    // GLB'de düğüm adları malzeme adlarıyla aynı; mesh adı farklıysa ebeveyni dene
    gltf.scene.traverse((o) => {
      if (o.isMesh && !STAGES.some((s) => s.nodes.includes(o.name)) && o.parent) byName[o.parent.name] = o;
    });
    stages.forEach((s) => {
      s.nodes.forEach((name) => {
        const src = byName[name];
        if (!src) return;
        src.updateWorldMatrix(true, false);
        const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);
        const isGlass = name === 'cam' || name === 'aynacam';
        const isShell = name === 'govde';
        const base = isShell ? 0.05 : isGlass ? 0.08 : 0.92;
        const fill = new Mesh(geo, new MeshBasicMaterial({
          color: colors.fill, transparent: true, opacity: base, depthWrite: !isShell && !isGlass,
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        }));
        fill.userData.base = base;
        fill.renderOrder = isShell || isGlass ? 2 : 0;
        const lines = new LineSegments(new EdgesGeometry(geo, s.edge), new LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.85 }));
        lines.renderOrder = 3;
        s.group.add(fill, lines);
        s.fills.push(fill);
        s.lines.push(lines);
      });
    });
    loaded = true;
    readTheme();
    applyProgress();
  });

  // İmleçle hafif paralaks: modeli "elinde çeviriyormuş" hissi, kaydırma ile çakışmaz
  function onPointer(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    pitchTarget = y * 0.12;
    yawOffset = x * 0.35;
  }
  let yawOffset = 0;
  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerleave', () => { yawOffset = 0; pitchTarget = 0; });

  let raf = 0, running = false;
  function frame() {
    raf = requestAnimationFrame(frame);
    const ty = yawTarget + yawOffset;
    if (Math.abs(ty - yaw) > 1e-4 || Math.abs(pitchTarget - pitch) > 1e-4) {
      yaw += (ty - yaw) * 0.08;
      pitch += (pitchTarget - pitch) * 0.08;
      dirty = true;
    }
    if (!dirty || !loaded) return;
    rig.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
    dirty = false;
  }
  const start = () => { if (!running) { running = true; frame(); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    ready,
    start,
    stop,
    setProgress(p) { progress = clamp01(p); if (loaded) applyProgress(); },
    refreshTheme: readTheme,
  };
}
