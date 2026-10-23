// Validator model 3D artist. Memakai kode rig yang SAMA dengan aplikasi, jadi "lolos di sini" = "jalan di aplikasi".
// Jalankan: npm run model:check -- public/models/head.glb
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { MeshoptDecoder } from 'meshoptimizer'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { DEFAULT_MODEL_CONFIG, morphTargetNames, NODE_PREFIXES, type ModelConfig } from '../src/anatomy/modelSpec'
import { NEUTRAL, tonguePoints, TONGUE_POINTS } from '../src/anatomy/pose'
import { parseGLB } from '../src/dev/gltfNode'
import { buildRig } from '../src/viewer/three/rig'

const file = process.argv[2]
if (!file || !existsSync(file)) {
  console.error('Pemakaian: npm run model:check -- <file.glb>')
  process.exit(1)
}

const cfgPath = join(process.cwd(), 'public/models/model.json')
const cfg: ModelConfig = existsSync(cfgPath) ? { ...DEFAULT_MODEL_CONFIG, ...JSON.parse(readFileSync(cfgPath, 'utf8')) } : DEFAULT_MODEL_CONFIG
const errors: string[] = []
const warns: string[] = []
const ok = (s: string) => console.log(`  ✓ ${s}`)

// 1. baca & dekompresi (Draco / Meshopt) dengan glTF-Transform, buang tekstur (tidak perlu untuk validasi rig)
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'meshopt.decoder': MeshoptDecoder })
await MeshoptDecoder.ready
const doc = await io.read(file)
const used = doc.getRoot().listExtensionsUsed().map((e) => e.extensionName)
const compressed = used.filter((n) => n === 'KHR_draco_mesh_compression' || n === 'EXT_meshopt_compression')
for (const e of doc.getRoot().listExtensionsUsed()) if (compressed.includes(e.extensionName)) e.dispose()
for (const t of doc.getRoot().listTextures()) t.dispose()
const size = statSync(file).size
let triangles = 0
for (const mesh of doc.getRoot().listMeshes())
  for (const prim of mesh.listPrimitives()) triangles += (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION')?.getCount() ?? 0) / 3

console.log(`\nModel: ${file}`)
console.log('\n[Ukuran & performa]')
const mb = size / 1024 / 1024
if (mb > 5) errors.push(`Ukuran ${mb.toFixed(2)} MB > batas PRD 5 MB terkompresi`)
else ok(`Ukuran ${mb.toFixed(2)} MB (batas 5 MB)`)
if (!compressed.length) warns.push('Belum dikompresi Draco/Meshopt (disarankan untuk HP kelas menengah)')
else ok(`Kompresi: ${compressed.join(', ')}`)
if (triangles > 150_000) warns.push(`${Math.round(triangles).toLocaleString()} segitiga — target ≤ 150.000 untuk HP kelas menengah`)
else ok(`${Math.round(triangles).toLocaleString()} segitiga`)

// 2. muat dengan GLTFLoader three.js lalu bangun rig seperti di aplikasi
const glb = await io.writeBinary(doc)
const gltf = await parseGLB(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer)
const wrapper = new THREE.Group()
wrapper.position.fromArray(cfg.transform.position)
wrapper.rotation.fromArray(cfg.transform.rotation as [number, number, number])
wrapper.scale.setScalar(cfg.transform.scale)
const rig = buildRig(gltf.scene, cfg.tongue)
wrapper.add(rig.root)
wrapper.updateMatrixWorld(true)

console.log('\n[Node organ]')
for (const n of NODE_PREFIXES) {
  if (rig.report.found.includes(n.prefix)) ok(`${n.prefix} — ${n.desc}`)
  else (n.required ? errors : warns).push(`Node "${n.prefix}" tidak ada (${n.desc})`)
}

console.log('\n[Lidah]')
if (rig.tongueMode === 'bones') {
  ok('13 tulang tongue_* ditemukan')
  // wrapper = transform di model.json, jadi posisi dunia di sini = koordinat data
  const rest = tonguePoints(NEUTRAL)
  let worst = 0
  for (const b of rig.bones) {
    const w = new THREE.Vector3().setFromMatrixPosition(b.bone.matrixWorld)
    const [x, y] = rest[TONGUE_POINTS.indexOf(b.point)]
    worst = Math.max(worst, Math.hypot(w.x - x, w.y - y))
  }
  if (worst > 0.15) warns.push(`Posisi istirahat tulang lidah meleset hingga ${worst.toFixed(2)} unit dari titik netral poses.json — periksa skala/posisi atau "transform" di model.json`)
  else ok(`Posisi istirahat tulang sesuai titik netral (selisih maks ${worst.toFixed(3)})`)
} else if (rig.tongueMode === 'morphs') {
  const expected = morphTargetNames()
  const missing = expected.filter((n) => !rig.report.morphs.includes(n))
  ok(`${rig.report.morphs.length} morph target`)
  if (missing.length) errors.push(`Morph target kurang: ${missing.join(', ')}`)
} else errors.push('Lidah tidak bisa digerakkan: butuh 13 tulang tongue_* atau morph target bernama id pose')

console.log('\n[Keselarasan koordinat]')
const box = new THREE.Box3().setFromObject(wrapper)
const ref = new THREE.Box3(new THREE.Vector3(-3.6, -4.4, -3.4), new THREE.Vector3(5.0, 6.0, 3.4))
const fmt = (v: THREE.Vector3) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`
console.log(`  kotak model : ${fmt(box.min)} → ${fmt(box.max)}`)
console.log(`  kotak acuan : ${fmt(ref.min)} → ${fmt(ref.max)}  (x depan, y atas, bidang tengah z = 0)`)
if (box.max.z <= 0.5) ok('Setengah kepala kiri (bidang potong z = 0)')
else if (Math.abs(box.max.z + box.min.z) < 0.3) ok('Kepala utuh simetris — aplikasi bisa menampilkan utuh atau terpotong sagital')
else warns.push(`Model tidak simetris terhadap z = 0 (z ${box.min.z.toFixed(2)} … ${box.max.z.toFixed(2)}) — bidang tengah harus di z = 0`)
const size3 = box.getSize(new THREE.Vector3())
if (size3.y < 5 || size3.y > 16) warns.push(`Tinggi model ${size3.y.toFixed(2)} unit; acuan ±10 unit — kemungkinan skala salah (cm vs m?)`)
const lipsUpper = rig.root.getObjectByName('lips_upper')
if (lipsUpper) {
  const c = new THREE.Box3().setFromObject(lipsUpper).getCenter(new THREE.Vector3())
  const d = Math.hypot(c.x - 4.05, c.y - 0.5)
  if (d > 0.6) warns.push(`Bibir atas berada di ${fmt(c)}, acuan ±(4.05, 0.50) — model belum sejajar`)
  else ok('Bibir atas berada di posisi acuan')
}

for (const w of rig.report.warnings) if (!errors.some((e) => e.includes(w)) && !w.startsWith('Node wajib')) warns.push(w)
console.log('')
for (const w of warns) console.log(`  ⚠ ${w}`)
for (const e of errors) console.log(`  ✗ ${e}`)
console.log(errors.length ? `\nGAGAL: ${errors.length} masalah wajib diperbaiki.` : `\nLOLOS${warns.length ? ` dengan ${warns.length} peringatan` : ''}.`)
process.exit(errors.length ? 1 : 0)
