// Membangun model kepala 3D volumetrik bawaan → public/models/head-3d.glb (Draco).
// Jalankan: npm run model:build
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exportGLB } from '../src/dev/gltfNode'
import { buildHeadModel } from '../src/dev/headModel'

const t0 = performance.now()
const step = Number(process.env.STEP ?? 0.065)
const root = buildHeadModel({ step })
let tris = 0
const perPart: string[] = []
for (const part of root.children) {
  let n = 0
  part.traverse((o) => {
    const m = o as { isMesh?: boolean; geometry?: { index: { count: number } | null; getAttribute: (n: string) => { count: number } } }
    if (m.isMesh && m.geometry) n += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3
  })
  tris += n
  perPart.push(`${part.name} ${Math.round(n / 1000)}k`)
}
console.log(`model dibangun dalam ${((performance.now() - t0) / 1000).toFixed(1)} s · ${Math.round(tris).toLocaleString()} segitiga`)
console.log(`  ${perPart.join(' · ')}`)

const glb = await exportGLB(root)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.encoder': await draco3d.createEncoderModule() })
const doc = await io.readBinary(new Uint8Array(glb))
doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({ quantizationBits: { POSITION: 14, NORMAL: 10 } } as never)
const bin = await io.writeBinary(doc)
const out = join(dirname(fileURLToPath(import.meta.url)), '../public/models/head-3d.glb')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, bin)
console.log(`✓ ${out} (${(bin.byteLength / 1024 / 1024).toFixed(2)} MB, Draco; mentah ${(glb.byteLength / 1024 / 1024).toFixed(2)} MB)`)
