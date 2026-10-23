// Menyalin decoder Draco dari paket three ke public/draco/ agar model terkompresi Draco
// bisa dibuka tanpa CDN pihak ketiga (dijalankan otomatis sebelum dev/build).
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/three/examples/jsm/libs/draco/gltf')
const dest = join(root, 'public/draco')
if (!existsSync(src)) {
  console.warn('[copy-draco] decoder tidak ditemukan di', src)
  process.exit(0)
}
mkdirSync(dest, { recursive: true })
for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) cpSync(join(src, f), join(dest, f))
console.log('[copy-draco] decoder disalin ke public/draco/')
