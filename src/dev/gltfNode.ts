// Ekspor/impor glTF di Node (untuk skrip & tes). GLTFExporter butuh FileReader yang tidak ada di Node.
import type * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

const g = globalThis as unknown as { FileReader?: unknown }
if (!g.FileReader) {
  g.FileReader = class {
    result: ArrayBuffer | string | null = null
    onloadend: (() => void) | null = null
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((b) => {
        this.result = b
        this.onloadend?.()
      })
    }
    readAsDataURL(blob: Blob) {
      void blob.arrayBuffer().then((b) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`
        this.onloadend?.()
      })
    }
  }
}

export function exportGLB(root: THREE.Object3D): Promise<ArrayBuffer> {
  return new GLTFExporter().parseAsync(root, { binary: true }) as Promise<ArrayBuffer>
}

export function parseGLB(data: ArrayBuffer): Promise<GLTF> {
  return new GLTFLoader().parseAsync(data, '')
}
