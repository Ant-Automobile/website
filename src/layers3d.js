// Çalışma alanları: aynı CAD modeli dört katmana ayrılır (patlatılmış görünüş).
// Her katman kendi rengindeki tel çizgilerle çizilir; seçilen katman yükselir ve parlar.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshBasicMaterial, LineSegments, LineBasicMaterial,
  EdgesGeometry, Color, Box3, PlaneGeometry, AdditiveBlending, NormalBlending, DoubleSide,
} from 'three';
import { loadModel } from './model.js';

// Alttan üste: mekanik taban, güç, kontrol (kokpit), en üstte gövde kabuğu
const LAYERS = [
  { id: 0, nodes: ['govde', 'cam', 'derz', 'ayna', 'aynacam', 'karbon', 'far', 'stop', 'kirmizi', 'kafes'], lift: 1.55, edge: 20, dark: '#b9d3c9', light: '#24342e' },
  { id: 1, nodes: ['sasi', 'metal', 'suspansiyon', 'fren', 'lastik', 'jant'], lift: 0, edge: 32, dark: '#8fb0e0', light: '#2d4c7a' },
  { id: 2, nodes: ['batarya', 'motor', 'elektrik'], lift: 0.55, edge: 28, dark: '#ff7a4d', light: '#d2401a' },
  { id: 3, nodes: ['koltuk', 'manken', 'kask', 'siyah', 'pedal'], lift: 1.0, edge: 34, dark: '#7fe0cf', light: '#1d7a6e' },
];
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const ease = (t) => 1 - Math.pow(1 - t, 3);

export function createLayers(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(24, 1, 0.1, 60);
  const rig = new Group();
  scene.add(rig);
  const car = new Group();
  car.position.set(-1.75, -0.9, 0);
  rig.add(car);

  const layers = LAYERS.map((l) => ({
    ...l, group: new Group(), lines: [], fills: [], plate: null, plateLine: null, em: l.id === 0 ? 1 : 0, target: l.id === 0 ? 1 : 0, minY: 0,
  }));
  layers.forEach((l) => car.add(l.group));

  let dark = true;
  let explode = 0;
  let loaded = false;
  let running = false;
  let raf = 0;
  let yawOffset = 0, pitchOffset = 0, yaw = 0, pitch = 0;
  const t0 = performance.now();

  function readTheme() {
    const bg = new Color(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b0e0d');
    dark = bg.getHSL({}).l < 0.3;
    layers.forEach((l) => {
      const c = new Color(dark ? l.dark : l.light);
      l.lines.forEach((m) => { m.material.color.copy(c); m.material.blending = dark ? AdditiveBlending : NormalBlending; m.material.needsUpdate = true; });
      l.fills.forEach((m) => { m.material.color.copy(c); });
      if (l.plate) {
        l.plate.material.color.copy(c);
        l.plateLine.material.color.copy(c);
        l.plateLine.material.blending = dark ? AdditiveBlending : NormalBlending;
        l.plateLine.material.needsUpdate = true;
      }
    });
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = Math.max(10.7, 10.7 * (1.2 / camera.aspect));
    camera.position.set(0, dist * 0.337, dist);
    camera.lookAt(0, 0.05, 0);
    camera.updateProjectionMatrix();
  }

  const ready = loadModel().then((gltf) => {
    const byName = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      byName[o.name] = o;
      if (o.parent) byName[o.parent.name] ??= o;
    });
    layers.forEach((l) => {
      const box = new Box3();
      l.nodes.forEach((name) => {
        const src = byName[name];
        if (!src) return;
        src.updateWorldMatrix(true, false);
        const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);
        geo.computeBoundingBox();
        box.union(geo.boundingBox);
        const fill = new Mesh(geo, new MeshBasicMaterial({ transparent: true, opacity: 0.05, depthWrite: false, side: DoubleSide }));
        const lines = new LineSegments(new EdgesGeometry(geo, l.edge), new LineBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }));
        l.group.add(fill, lines);
        l.fills.push(fill);
        l.lines.push(lines);
      });
      l.minY = box.isEmpty() ? 0 : box.min.y;
      // Katmanın altındaki cam plaka
      const plate = new Mesh(new PlaneGeometry(4.1, 2.05), new MeshBasicMaterial({ transparent: true, opacity: 0.04, depthWrite: false, side: DoubleSide }));
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(1.75, l.minY - 0.02, 0);
      const plateLine = new LineSegments(new EdgesGeometry(plate.geometry), new LineBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }));
      plateLine.rotation.copy(plate.rotation);
      plateLine.position.copy(plate.position);
      l.group.add(plate, plateLine);
      l.plate = plate;
      l.plateLine = plateLine;
    });
    loaded = true;
    readTheme();
  });

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!loaded) return;
    const t = (now - t0) / 1000;
    const e = ease(clamp01(explode));
    layers.forEach((l) => {
      l.em += (l.target - l.em) * 0.09;
      l.group.position.y = l.lift * e + l.em * 0.16 * e;
      const lineOp = (dark ? 0.16 : 0.22) + (dark ? 0.84 : 0.7) * l.em;
      l.lines.forEach((m) => { m.material.opacity = lineOp; });
      l.fills.forEach((m) => { m.material.opacity = dark ? 0.02 + 0.12 * l.em : 0.01 + 0.06 * l.em; });
      l.plate.material.opacity = (0.015 + 0.06 * l.em) * e;
      l.plateLine.material.opacity = (0.12 + 0.6 * l.em) * e;
    });
    // Sahne yavaşça nefes alır gibi döner; imleç küçük bir paralaks ekler
    const ty = -0.62 + Math.sin(t * 0.25) * 0.16 + yawOffset;
    const tp = 0.0 + pitchOffset;
    yaw += (ty - yaw) * 0.05;
    pitch += (tp - pitch) * 0.05;
    rig.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
  }

  canvas.addEventListener('pointermove', (ev) => {
    const r = canvas.getBoundingClientRect();
    yawOffset = ((ev.clientX - r.left) / r.width - 0.5) * 0.3;
    pitchOffset = ((ev.clientY - r.top) / r.height - 0.5) * 0.08;
  });
  canvas.addEventListener('pointerleave', () => { yawOffset = 0; pitchOffset = 0; });

  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    ready,
    start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    setExplode(v) { explode = v; },
    setActive(i) { layers.forEach((l) => { l.target = l.id === i ? 1 : 0; }); },
    refreshTheme: readTheme,
  };
}
