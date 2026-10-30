// Yeni CAD GLB -> site GLB: malzeme başına tek düğüm (ad = malzeme), normaller yok, meshopt q16.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { join, weld, dedup, prune, flatten, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const [,, src, dst] = process.argv;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
const root = doc.getRoot();
for (const m of root.listMeshes()) for (const p of m.listPrimitives())
  for (const s of p.listSemantics()) if (s !== 'POSITION') p.setAttribute(s, null);
await doc.transform(flatten(), join({ keepNamed: false, keepMeshes: false }), weld(), dedup(), prune());
for (const n of root.listNodes()) {
  const mesh = n.getMesh();
  if (!mesh) continue;
  const prims = mesh.listPrimitives();
  if (prims.length !== 1) throw new Error('beklenmedik: ' + n.getName() + ' ' + prims.length);
  const name = prims[0].getMaterial().getName();
  n.setName(name); mesh.setName(name);
}
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 16 }));
root.getAsset().generator = 'ANT Automobile';
delete root.getAsset().copyright;
root.setExtras({});
for (const p of [...root.listNodes(), ...root.listMeshes(), ...root.listMaterials(), ...root.listScenes(), ...root.listAccessors(), ...root.listBuffers()]) p.setExtras({});
await io.write(dst, doc);
