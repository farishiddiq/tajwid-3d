import * as THREE from 'three'
import type { V2 } from '../../anatomy/shapes'

/** Ekstrusi profil 2D ke arah -z (sisi kiri kepala); permukaan potong berada di z = 0. */
export function extrudeHalf(points: V2[], depth: number, bevel = 0.05): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 8,
  })
  geo.translate(0, 0, -depth)
  geo.computeVertexNormals()
  return geo
}

/**
 * Geometri "bantal setengah" untuk organ yang berubah bentuk (lidah).
 * Irisan kontur mengecil ke arah sentroid saat menjauh dari bidang tengah sehingga sisi lidah membulat.
 * Posisi verteks diperbarui setiap frame tanpa membuat geometri baru (setara morph target).
 */
export class HalfPillow {
  geometry = new THREE.BufferGeometry()
  private n: number
  private slices: number
  private positions: Float32Array

  constructor(n: number, slices = 8) {
    this.n = n
    this.slices = slices
    // irisan 0..slices (n verteks per irisan) + tutup datar (n + 1 verteks)
    const vCount = (slices + 1) * n + n + 1
    this.positions = new Float32Array(vCount * 3)
    const idx: number[] = []
    for (let j = 0; j < slices; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * n + i
        const b = j * n + ((i + 1) % n)
        const c = (j + 1) * n + i
        const d = (j + 1) * n + ((i + 1) % n)
        idx.push(a, c, b, b, c, d)
      }
    }
    const capStart = (slices + 1) * n
    const center = capStart + n
    for (let i = 0; i < n; i++) idx.push(center, capStart + i, capStart + ((i + 1) % n))
    this.geometry.setIndex(idx)
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    // kelompok material: 0 = permukaan, 1 = bidang potong
    this.geometry.addGroup(0, slices * n * 6, 0)
    this.geometry.addGroup(slices * n * 6, n * 3, 1)
  }

  update(outline: V2[], halfWidth: number, taper: (x: number) => number) {
    const { n, slices, positions } = this
    let cx = 0
    let cy = 0
    for (const [x, y] of outline) {
      cx += x
      cy += y
    }
    cx /= n
    cy /= n
    // sentroid sedikit diturunkan agar punggung lidah lebih membulat
    cy -= 0.15
    for (let j = 0; j <= slices; j++) {
      const th = (j / slices) * (Math.PI / 2)
      const s = Math.cos(th)
      const zf = Math.sin(th)
      for (let i = 0; i < n; i++) {
        const [x, y] = outline[i]
        const k = (j * n + i) * 3
        positions[k] = cx + (x - cx) * s
        positions[k + 1] = cy + (y - cy) * s
        positions[k + 2] = -zf * halfWidth * taper(x)
      }
    }
    const capStart = (slices + 1) * n
    for (let i = 0; i < n; i++) {
      const [x, y] = outline[i]
      const k = (capStart + i) * 3
      positions[k] = x
      positions[k + 1] = y
      positions[k + 2] = 0.001
    }
    const c = (capStart + n) * 3
    positions[c] = cx
    positions[c + 1] = cy + 0.15
    positions[c + 2] = 0.001
    const attr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    attr.needsUpdate = true
    this.geometry.computeVertexNormals()
    this.geometry.computeBoundingSphere()
  }
}

let dotTexture: THREE.Texture | null = null
/** Tekstur titik bulat lembut untuk partikel. */
export function getDotTexture(): THREE.Texture {
  if (dotTexture) return dotTexture
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  dotTexture = new THREE.CanvasTexture(canvas)
  return dotTexture
}
