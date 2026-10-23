// Membuat file contoh untuk 3D artist: public/models/sample-bones.glb dan sample-morphs.glb.
// Jalankan: npm run model:sample
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exportGLB } from '../src/dev/gltfNode'
import { buildSampleModel } from '../src/dev/sampleModel'

const out = join(dirname(fileURLToPath(import.meta.url)), '../public/models')
mkdirSync(out, { recursive: true })
for (const mode of ['bones', 'morphs'] as const) {
  const glb = await exportGLB(buildSampleModel(mode))
  const file = join(out, `sample-${mode}.glb`)
  writeFileSync(file, Buffer.from(glb))
  console.log(`✓ ${file} (${(glb.byteLength / 1024).toFixed(0)} KB)`)
  if (mode === 'bones') {
    // varian terkompresi Draco, untuk menguji dekompresi di aplikasi & validator
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.encoder': await draco3d.createEncoderModule() })
    const doc = await io.readBinary(new Uint8Array(glb))
    doc.createExtension(KHRDracoMeshCompression).setRequired(true)
    const bin = await io.writeBinary(doc)
    const dfile = join(out, 'sample-bones-draco.glb')
    writeFileSync(dfile, bin)
    console.log(`✓ ${dfile} (${(bin.byteLength / 1024).toFixed(0)} KB, Draco)`)
  }
}
