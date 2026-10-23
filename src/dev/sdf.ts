// Signed distance field + "surface nets" untuk membentuk organ 3D organik secara prosedural.
// Dipakai saat membangun model GLB (skrip), bukan di aplikasi.
import * as THREE from 'three'

export type Vec3 = [number, number, number]
export type SDF = (x: number, y: number, z: number) => number

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// ---------- primitif ----------
export function ellipsoid(c: Vec3, r: Vec3): SDF {
  return (x, y, z) => {
    const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2]
    const k0 = Math.hypot(px, py, pz)
    const k1 = Math.hypot(px / r[0], py / r[1], pz / r[2])
    return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1
  }
}

export function capsule(a: Vec3, b: Vec3, r: number): SDF {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2]
  const bb = bax * bax + bay * bay + baz * baz
  return (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2]
    const h = clamp((pax * bax + pay * bay + paz * baz) / bb, 0, 1)
    return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r
  }
}

/** Kotak bulat (setengah ukuran h, jari-jari sudut r). */
export function roundBox(c: Vec3, h: Vec3, r: number): SDF {
  return (x, y, z) => {
    const qx = Math.abs(x - c[0]) - h[0] + r, qy = Math.abs(y - c[1]) - h[1] + r, qz = Math.abs(z - c[2]) - h[2] + r
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r
  }
}

// ---------- operasi ----------
export function smin(a: number, b: number, k: number) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1)
  return b + (a - b) * h - k * h * (1 - h)
}
export function smax(a: number, b: number, k: number) {
  return -smin(-a, -b, k)
}
export function union(k: number, ...fs: SDF[]): SDF {
  return (x, y, z) => fs.reduce((d, f, i) => (i === 0 ? f(x, y, z) : smin(d, f(x, y, z), k)), 0)
}

/** Jarak 2D titik ke polyline. */
export function distPolyline2D(px: number, py: number, pts: [number, number][]): { d: number; t: number } {
  let best = Infinity
  let bestT = 0
  let acc = 0
  const lens: number[] = []
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
    lens.push(l)
    total += l
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const dx = bx - ax, dy = by - ay
    const h = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1)
    const d = Math.hypot(px - ax - dx * h, py - ay - dy * h)
    if (d < best) {
      best = d
      bestT = (acc + lens[i] * h) / total
    }
    acc += lens[i]
  }
  return { d: best, t: bestT }
}

// ---------- surface nets ----------
/**
 * Mengubah SDF menjadi mesh segitiga halus (Naive Surface Nets + penghalusan Laplacian).
 * Permukaan = f(x,y,z) = 0, bagian dalam f < 0.
 */
export function polygonize(f: SDF, min: Vec3, max: Vec3, step: number, smoothPasses = 2): THREE.BufferGeometry {
  const nx = Math.ceil((max[0] - min[0]) / step) + 1
  const ny = Math.ceil((max[1] - min[1]) / step) + 1
  const nz = Math.ceil((max[2] - min[2]) / step) + 1
  const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k)
  const field = new Float32Array(nx * ny * nz)
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) field[idx(i, j, k)] = f(min[0] + i * step, min[1] + j * step, min[2] + k * step)

  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1)
  const cidx = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k)
  const positions: number[] = []
  const corners = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ]
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  const v = new Float32Array(8)
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0
        for (let c = 0; c < 8; c++) {
          v[c] = field[idx(i + corners[c][0], j + corners[c][1], k + corners[c][2])]
          if (v[c] < 0) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue
        let sx = 0, sy = 0, sz = 0, n = 0
        for (const [a, b] of edges) {
          if (v[a] < 0 === v[b] < 0) continue
          const t = v[a] / (v[a] - v[b])
          sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t
          sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t
          sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t
          n++
        }
        cellVert[cidx(i, j, k)] = positions.length / 3
        positions.push(min[0] + (i + sx / n) * step, min[1] + (j + sy / n) * step, min[2] + (k + sz / n) * step)
      }

  const indices: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return
    if (flip) indices.push(a, c, b, a, d, c)
    else indices.push(a, b, c, a, c, d)
  }
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const inside = field[idx(i, j, k)] < 0
        // sel tetangga harus ada di dalam grid (indeks sel 0..n-2)
        const okI = i > 0 && i < nx - 1, okJ = j > 0 && j < ny - 1, okK = k > 0 && k < nz - 1
        if (i < nx - 1 && okJ && okK && inside !== field[idx(i + 1, j, k)] < 0)
          quad(cellVert[cidx(i, j - 1, k - 1)], cellVert[cidx(i, j, k - 1)], cellVert[cidx(i, j, k)], cellVert[cidx(i, j - 1, k)], !inside)
        if (j < ny - 1 && okI && okK && inside !== field[idx(i, j + 1, k)] < 0)
          quad(cellVert[cidx(i - 1, j, k - 1)], cellVert[cidx(i - 1, j, k)], cellVert[cidx(i, j, k)], cellVert[cidx(i, j, k - 1)], !inside)
        if (k < nz - 1 && okI && okJ && inside !== field[idx(i, j, k + 1)] < 0)
          quad(cellVert[cidx(i - 1, j - 1, k)], cellVert[cidx(i, j - 1, k)], cellVert[cidx(i, j, k)], cellVert[cidx(i - 1, j, k)], !inside)
      }

  // penghalusan Laplacian ringan (menghilangkan kesan "kotak-kotak" grid)
  const pos = new Float32Array(positions)
  if (smoothPasses > 0) {
    const nbr: Set<number>[] = Array.from({ length: pos.length / 3 }, () => new Set())
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]]
      nbr[a].add(b).add(c)
      nbr[b].add(a).add(c)
      nbr[c].add(a).add(b)
    }
    const tmp = new Float32Array(pos.length)
    for (let p = 0; p < smoothPasses; p++) {
      for (let vi = 0; vi < nbr.length; vi++) {
        let x = 0, y = 0, z = 0
        for (const o of nbr[vi]) {
          x += pos[o * 3]
          y += pos[o * 3 + 1]
          z += pos[o * 3 + 2]
        }
        const m = nbr[vi].size || 1
        tmp[vi * 3] = pos[vi * 3] * 0.5 + (x / m) * 0.5
        tmp[vi * 3 + 1] = pos[vi * 3 + 1] * 0.5 + (y / m) * 0.5
        tmp[vi * 3 + 2] = pos[vi * 3 + 2] * 0.5 + (z / m) * 0.5
      }
      pos.set(tmp)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
