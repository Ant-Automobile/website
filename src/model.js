// Araç modeli bir kez indirilir; Hakkımızda ve Çalışma alanları aynı sonucu paylaşır.
// GLB meshopt ile sıkıştırılmış ve nicemlenmiş;
// sahneler geometriyi dünya koordinatına taşıdığı için konumlar float'a açılır.
import { BufferAttribute } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let pending = null;
const listeners = new Set();

function toFloat(geo) {
  const a = geo.getAttribute('position');
  if (!a || a.array instanceof Float32Array) return;
  const f = new Float32Array(a.count * 3);
  for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
  geo.setAttribute('position', new BufferAttribute(f, 3));
}

export function loadModel(onProgress) {
  if (onProgress) listeners.add(onProgress);
  pending ??= new Promise((resolve, reject) => {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loader.load('/models/arac_tam.glb', (gltf) => {
      gltf.scene.traverse((o) => { if (o.isMesh) toFloat(o.geometry); });
      resolve(gltf);
    }, (e) => { if (e.total) listeners.forEach((fn) => fn(e.loaded / e.total)); }, reject);
  });
  return pending;
}
