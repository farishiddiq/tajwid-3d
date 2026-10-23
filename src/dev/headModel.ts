// Model kepala 3D volumetrik penuh (bukan profil 2D yang diekstrusi), dibangun dari SDF.
// Mengikuti kontrak modelSpec.ts sehingga digerakkan oleh poses.json lewat rig yang sama dengan model artist.
// Bentuk kiri–kanan simetris (z = 0 bidang tengah); aplikasi bisa memotongnya secara sagital.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { TONGUE_BONES } from '../anatomy/modelSpec'
import { NEUTRAL, tongueOutline, tonguePoints, TONGUE_POINTS, type Pose } from '../anatomy/pose'
import { AIR_PATH_NASAL, palateYAt, PROFILE, type V2 } from '../anatomy/shapes'
import { capsule, distPolyline2D, ellipsoid, polygonize, smax, smin, union, type SDF, type Vec3 } from './sdf'

export interface HeadOptions {
  /** ukuran sel grid SDF (lebih kecil = lebih halus, lebih berat) */
  step?: number
}

// ---------- warna & material ----------
const COLORS = {
  skin: '#e7bfa0',
  gum: '#e0939b',
  palate: '#df8f98',
  velum: '#d97f8c',
  tongue: '#c95468',
  lips: '#c4636f',
  teeth: '#f4efe3',
  throat: '#d4848e',
  folds: '#efd08a',
  nasal: '#8ecae6',
  jaw: '#de9d97',
}

function mat(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...extra })
}

function mesh(name: string, geo: THREE.BufferGeometry, material: THREE.Material) {
  const m = new THREE.Mesh(geo, material)
  m.name = name
  return m
}

function group(name: string, ...children: THREE.Object3D[]) {
  const g = new THREE.Group()
  g.name = name
  if (children.length) g.add(...children)
  return g
}

/** Memindahkan origin geometri ke titik c (agar skala/rotasi node terjadi di sekitar organ itu sendiri). */
function centered(name: string, geo: THREE.BufferGeometry, material: THREE.Material, c: Vec3) {
  geo.translate(-c[0], -c[1], -c[2])
  const m = mesh(name, geo, material)
  m.position.set(...c)
  return m
}

// ---------- lengkung gigi (U) ----------
/** Setengah lebar lengkung gigi atas pada posisi x (pusat mahkota gigi). */
export const archUpper = (x: number) => Math.sqrt(0.64 * Math.max(0, 3.62 - x))
const archLower = (x: number) => Math.sqrt(0.6 * Math.max(0, 3.5 - x))

function archPoints(arch: (x: number) => number, xFront: number, xBack: number): V2[] {
  // titik (x, z) sepanjang lengkung dari kiri-belakang → depan → kanan-belakang
  const side: V2[] = []
  for (let i = 0; i <= 40; i++) {
    const x = xBack + (xFront - xBack) * (1 - (1 - i / 40) ** 2)
    side.push([x, arch(x)])
  }
  return [...side.map(([x, z]) => [x, -z] as V2), ...side.reverse()]
}
const ARCH_U = archPoints(archUpper, 3.62, 0.85)
const ARCH_L = archPoints(archLower, 3.5, 0.75)

const insideArch = (arch: (x: number) => number, xFront: number) => (x: number, z: number) => x < xFront && Math.abs(z) < arch(x)

// ---------- organ dari SDF ----------
/** SDF yang dicerminkan kiri–kanan (struktur berpasangan: pipi, mata, telinga). */
const mirrored = (f: SDF): SDF => (x, y, z) => f(x, y, Math.abs(z))

function skinSDF(): SDF {
  // bentuk dasar kepala
  const cranium = ellipsoid([-0.3, 2.55, 0], [3.4, 3.35, 2.75])
  const forehead = ellipsoid([1.7, 3.65, 0], [2.45, 1.85, 2.25])
  const face = ellipsoid([2.35, 1.1, 0], [2.1, 2.4, 1.85])
  const jaw = ellipsoid([1.7, -0.75, 0], [1.9, 1.15, 1.7])
  const chin = ellipsoid([3.3, -1.5, 0], [0.95, 0.72, 1.0])
  const neck = capsule([-0.55, -1.3, 0], [-0.75, -4.4, 0], 1.5)
  // struktur wajah berpasangan
  const cheekbone = mirrored(ellipsoid([2.85, 2.05, 1.55], [0.85, 0.5, 0.55]))
  const cheek = mirrored(ellipsoid([2.95, 0.55, 1.35], [1.05, 0.95, 0.6]))
  const jawAngle = mirrored(ellipsoid([0.55, -1.0, 1.45], [0.75, 0.85, 0.42]))
  const ear = mirrored(union(0.1, ellipsoid([-0.45, 2.2, 2.62], [0.5, 0.92, 0.22]), ellipsoid([-0.25, 1.75, 2.45], [0.28, 0.3, 0.25])))
  const brow = ellipsoid([3.75, 3.5, 0], [0.55, 0.28, 1.55])
  const eyeSocket = mirrored(ellipsoid([3.95, 3.02, 1.02], [0.5, 0.3, 0.46]))
  const eyeball = mirrored(ellipsoid([3.62, 3.0, 1.02], [0.38, 0.32, 0.38]))
  const nose = union(
    0.12,
    capsule([4.05, 3.35, 0], [4.7, 2.25, 0], 0.24),
    ellipsoid([4.66, 2.18, 0], [0.3, 0.26, 0.28]),
    mirrored(ellipsoid([4.35, 2.06, 0.26], [0.28, 0.22, 0.2])),
  )
  const nostril = mirrored(ellipsoid([4.5, 1.94, 0.2], [0.13, 0.06, 0.08]))
  const philtrum = ellipsoid([4.38, 1.3, 0], [0.22, 0.55, 0.35])
  const mouthSlit = ellipsoid([4.55, 0.0, 0], [0.35, 0.035, 0.95])
  const head = union(0.45, cranium, forehead, face, jaw, chin, neck)
  return (x, y, z) => {
    let d = smin(head(x, y, z), cheek(x, y, z), 0.45)
    d = smin(d, cheekbone(x, y, z), 0.35)
    d = smin(d, jawAngle(x, y, z), 0.4)
    d = smin(d, brow(x, y, z), 0.3)
    d = smin(d, philtrum(x, y, z), 0.25)
    d = smin(d, ear(x, y, z), 0.12)
    d = smax(d, -eyeSocket(x, y, z), 0.18) // rongga mata
    d = smin(d, eyeball(x, y, z), 0.06) // kelopak tertutup
    d = smin(d, nose(x, y, z), 0.22)
    d = smax(d, -nostril(x, y, z), 0.04)
    d = smax(d, -mouthSlit(x, y, z), 0.05) // celah mulut
    return smax(d, -4.4 - y, 0.1)
  }
}

/** Punggung gusi: tabung berpenampang elips yang menyapu sepanjang lengkung gigi. */
function gumRidge(arch: V2[], yCenter: number, rx: number, ry: number): SDF {
  return (x, y, z) => {
    const d = distPolyline2D(x, z, arch).d
    return (Math.hypot(d / rx, (y - yCenter) / ry) - 1) * Math.min(rx, ry)
  }
}

function palateSDF(): SDF {
  const inside = insideArch(archUpper, 3.62)
  const ridge = gumRidge(ARCH_U, 1.07, 0.3, 0.3)
  return (x, y, z) => {
    // kubah langit-langit keras: cangkang dengan tebal tetap yang turun ke punggung gusi di sisi
    const aw = archUpper(x)
    const mid = palateYAt(Math.min(x, 3.28))
    const t = Math.min(1, Math.abs(z) / Math.max(0.2, aw - 0.05))
    const yl = mid + (1.02 - mid) * (1 - Math.cos((t * Math.PI) / 2)) ** 1.4
    const thick = 0.28 + 0.05 * (1 - t)
    let dome = smax(yl - y, y - (yl + thick), 0.06)
    const inArch = inside(x, z) ? Math.abs(z) - aw : distPolyline2D(x, z, ARCH_U).d
    dome = smax(dome, inArch - 0.05, 0.1)
    dome = smax(dome, 0.55 - x, 0.08) // tepi belakang (lanjut ke langit-langit lunak)
    return smin(dome, ridge(x, y, z), 0.14)
  }
}

function velumSDF(): SDF {
  const center: [number, number][] = [[0.55, 1.72], [0.1, 1.72], [-0.35, 1.74], [-0.75, 1.71], [-1.0, 1.64]]
  const uvula = capsule([-0.94, 1.56, 0], [-0.96, 1.32, 0], 0.075)
  return (x, y, z) => {
    const { d, t } = distPolyline2D(x, y, center)
    const plate = smax(d - (0.17 - 0.06 * t), Math.abs(z) - (0.95 - 0.35 * t), 0.1)
    return smin(plate, uvula(x, y, z), 0.08)
  }
}

const ARCH_M = archPoints((x) => archLower(x) + 0.06, 3.52, 0.6)

function jawSDF(): SDF {
  const inside = insideArch(archLower, 3.5)
  const gum = gumRidge(ARCH_L, -1.0, 0.27, 0.3)
  // badan tulang rahang: penampang elips tinggi yang menyapu lengkung U
  const body = (x: number, y: number, z: number) => {
    const d = distPolyline2D(x, z, ARCH_M).d
    return (Math.hypot(d / 0.3, (y + 1.55) / 0.55) - 1) * 0.3
  }
  const chin = ellipsoid([3.35, -1.62, 0], [0.4, 0.5, 0.72])
  const ramus = mirrored(capsule([0.75, -1.55, 1.4], [0.2, 0.75, 1.58], 0.22))
  const angle = mirrored(ellipsoid([0.75, -1.65, 1.38], [0.38, 0.32, 0.22]))
  return (x, y, z) => {
    // dasar mulut: selaput yang sedikit melengkung ke bawah di antara kedua sisi rahang
    const zl = Math.max(0.15, archLower(x))
    const u = Math.min(1, Math.abs(z) / zl)
    const yf = -1.42 - 0.14 * (1 - u * u)
    let floor = smax(yf - 0.1 - y, y - (yf + 0.1), 0.05)
    floor = smax(floor, inside(x, z) ? Math.abs(z) - zl : distPolyline2D(x, z, ARCH_L).d, 0.1)
    let d = smin(gum(x, y, z), body(x, y, z), 0.18)
    d = smin(d, floor, 0.15)
    d = smin(d, chin(x, y, z), 0.25)
    d = smin(d, Math.min(ramus(x, y, z), angle(x, y, z)), 0.22)
    return d
  }
}

function lipSDF(upper: boolean): SDF {
  const N = 41
  const pts: Vec3[] = []
  for (let i = 0; i < N; i++) {
    const s = (i / (N - 1)) * 2 - 1
    pts.push(upper ? [4.18 - 0.42 * s * s, 0.48 - 0.08 * s * s, 1.05 * s] : [4.12 - 0.42 * s * s, -0.48 + 0.08 * s * s, 1.0 * s])
  }
  return (x, y, z) => {
    let best = Infinity
    let bi = 0
    for (let i = 0; i < N; i++) {
      const d = (x - pts[i][0]) ** 2 + (y - pts[i][1]) ** 2 + (z - pts[i][2]) ** 2
      if (d < best) {
        best = d
        bi = i
      }
    }
    const s = (bi / (N - 1)) * 2 - 1
    const taper = 1 - 0.45 * s * s
    const rx = 0.27 * taper
    const ry = (upper ? 0.44 : 0.4) * taper
    const [cx, cy, cz] = pts[bi]
    const qx = (x - cx) / rx, qy = (y - cy) / ry, qz = (z - cz) / 0.25
    return (Math.hypot(qx, qy, qz * 0.35) - 1) * Math.min(rx, ry)
  }
}

function throatSDF(): SDF {
  const wall: [number, number][] = [[-1.0, 2.4], [-1.15, 1.8], [-1.18, 1.0], [-1.2, 0.0], [-1.2, -1.2], [-1.15, -1.95]]
  const roof = capsule([-1.05, 2.35, 0], [-0.35, 2.8, 0], 0.12)
  const epi = (x: number, y: number, z: number) => {
    const { d, t } = distPolyline2D(x, y, [[-0.48, -2.0], [-0.62, -1.6], [-0.8, -1.15]])
    return smax(d - 0.045, Math.abs(z) - (0.18 + 0.2 * t), 0.04)
  }
  return (x, y, z) => {
    // faring: dinding belakang + samping berbentuk U, terbuka ke depan (tempat lidah & velum)
    const wy = Math.max(-1.95, Math.min(2.4, y))
    let wx = -1.2
    for (let i = 0; i < wall.length - 1; i++) {
      const [x0, y0] = wall[i]
      const [x1, y1] = wall[i + 1]
      if (wy <= y0 && wy >= y1) wx = x0 + ((wy - y0) / (y1 - y0)) * (x1 - x0)
    }
    const cx = wx + 0.36
    const e = Math.hypot((x - cx) / 0.36, z / 0.62) - 1
    let pharynx = smax(Math.abs(e * 0.4) - 0.07, x - (cx + 0.12), 0.06)
    pharynx = smax(pharynx, smax(-1.95 - y, y - 2.4, 0.05), 0.05)
    // laring & trakea: tabung tertutup
    const el = Math.hypot((x + 0.77) / 0.38, z / 0.44) - 1
    const larynx = smax(Math.abs(el * 0.38) - 0.06, smax(-4.4 - y, y - -1.9, 0.05), 0.05)
    return Math.min(smin(pharynx, roof(x, y, z), 0.15), larynx, epi(x, y, z))
  }
}

function nasalSDF(): SDF {
  const chain = AIR_PATH_NASAL.slice(5, 13)
  const caps: SDF[] = []
  for (let i = 0; i < chain.length - 1; i++) caps.push(capsule([chain[i][0], chain[i][1], 0], [chain[i + 1][0], chain[i + 1][1], 0], 0.26))
  const main = ellipsoid([1.9, 2.5, 0], [1.95, 0.5, 0.5])
  const passage = union(0.2, ...caps)
  return (x, y, z) => smin(main(x, y, z), passage(x, y, z * 0.8), 0.25)
}

// ---------- gigi ----------
interface ToothDef { x: number; w: number; d: number; top: number; bottom: number }
const UPPER_TEETH: ToothDef[] = [
  { x: 3.56, w: 0.3, d: 0.16, top: 0.95, bottom: -0.07 }, // seri tengah
  { x: 3.42, w: 0.24, d: 0.15, top: 0.92, bottom: -0.02 }, // seri samping
  { x: 3.2, w: 0.26, d: 0.24, top: 0.95, bottom: -0.04 }, // taring
  { x: 2.9, w: 0.26, d: 0.34, top: 0.85, bottom: 0.12 }, // geraham kecil 1
  { x: 2.62, w: 0.26, d: 0.34, top: 0.85, bottom: 0.18 }, // geraham kecil 2
  { x: 2.22, w: 0.42, d: 0.42, top: 0.85, bottom: 0.28 }, // geraham besar 1
  { x: 1.72, w: 0.4, d: 0.4, top: 0.85, bottom: 0.32 },
  { x: 1.25, w: 0.36, d: 0.38, top: 0.85, bottom: 0.35 },
]
const LOWER_TEETH: ToothDef[] = [
  { x: 3.44, w: 0.22, d: 0.14, top: -0.12, bottom: -0.9 },
  { x: 3.32, w: 0.22, d: 0.14, top: -0.1, bottom: -0.9 },
  { x: 3.12, w: 0.24, d: 0.22, top: -0.05, bottom: -0.9 },
  { x: 2.84, w: 0.25, d: 0.32, top: 0.1, bottom: -0.85 },
  { x: 2.56, w: 0.25, d: 0.32, top: 0.14, bottom: -0.85 },
  { x: 2.16, w: 0.44, d: 0.4, top: 0.2, bottom: -0.85 },
  { x: 1.66, w: 0.42, d: 0.4, top: 0.22, bottom: -0.85 },
  { x: 1.2, w: 0.38, d: 0.38, top: 0.24, bottom: -0.85 },
]

type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'
const KIND_BY_INDEX: ToothKind[] = ['incisor', 'incisor', 'canine', 'premolar', 'premolar', 'molar', 'molar', 'molar']
const smooth01 = (v: number) => {
  const t = Math.max(0, Math.min(1, v))
  return t * t * (3 - 2 * t)
}

/**
 * SDF satu gigi di ruang lokal: x = lebar (searah lengkung), z = tebal (bibir–lidah),
 * y = 0 di tepi gigitan, naik ke arah gusi (y = h). Penampang superelips yang berubah sepanjang tinggi:
 * seri berbentuk sekop (tipis di tepi), taring runcing, geraham kecil 2 tonjol, geraham besar 4 tonjol.
 */
function toothSDF(kind: ToothKind, w: number, d: number, h: number): SDF {
  const p = kind === 'molar' ? 3.2 : kind === 'premolar' ? 2.5 : 2.2
  const groove = kind === 'molar' || kind === 'premolar' ? 0.045 : 0
  return (x, y, z) => {
    const v = Math.max(0, Math.min(1, y / h))
    let a = (w / 2) * (1 - 0.3 * v * v) // menyempit ke leher gigi
    let b = (d / 2) * (1 - 0.15 * v * v)
    if (kind === 'incisor') b *= 0.32 + 0.68 * smooth01(v * 1.8)
    if (kind === 'canine') {
      a *= 0.4 + 0.6 * smooth01(v * 2.6)
      b *= 0.5 + 0.5 * smooth01(v * 2.2)
    }
    a = Math.max(a, 0.012)
    b = Math.max(b, 0.012)
    const e = (Math.pow(Math.abs(x / a) ** p + Math.abs(z / b) ** p, 1 / p) - 1) * Math.min(a, b)
    let dd = smax(e, -y, 0.03)
    dd = smax(dd, y - h, 0.03)
    if (groove) {
      // alur oklusal: satu alur (geraham kecil) atau dua alur bersilang (geraham besar)
      const g1 = Math.hypot(z, y) - groove
      dd = smax(dd, -g1, 0.03)
      if (kind === 'molar') dd = smax(dd, -(Math.hypot(x, y) - groove), 0.03)
    }
    return dd
  }
}

const toothGeoCache = new Map<string, THREE.BufferGeometry>()
function toothGeometry(kind: ToothKind, w: number, d: number, h: number, lower: boolean, step: number) {
  const key = [kind, w, d, h, lower, step].join(':')
  let geo = toothGeoCache.get(key)
  if (!geo) {
    const f = toothSDF(kind, w, d, h)
    const m = 0.05
    // gigi bawah: tepi gigitan di atas (y = 0), akar ke bawah
    geo = lower
      ? polygonize((x, y, z) => f(x, -y, z), [-w / 2 - m, -h - m, -d / 2 - m], [w / 2 + m, m, d / 2 + m], step, 1)
      : polygonize(f, [-w / 2 - m, -m, -d / 2 - m], [w / 2 + m, h + m, d / 2 + m], step, 1)
    toothGeoCache.set(key, geo)
  }
  return geo
}

function teeth(name: string, defs: ToothDef[], arch: (x: number) => number, from: number, to: number, material: THREE.Material, step: number) {
  const g = group(name)
  const lower = defs === LOWER_TEETH
  for (const side of [-1, 1])
    defs.slice(from, to).forEach((t, i) => {
      const h = t.top - t.bottom
      const geo = toothGeometry(KIND_BY_INDEX[from + i], t.w, t.d, h, lower, step)
      const z = arch(t.x) * side
      // arah lengkung: lebar gigi searah garis singgung lengkung
      const dzdx = (-0.32 / Math.max(0.05, arch(t.x))) * side
      const m = mesh(`${name}_${side < 0 ? 'l' : 'r'}${from + i + 1}`, geo, material)
      m.position.set(t.x, lower ? t.top : t.bottom, z)
      m.rotation.y = Math.atan2(1, dzdx) - Math.PI / 2
      g.add(m)
    })
  return g
}

// ---------- lidah utuh ----------
function fullTongueGeometry(p: Pose): THREE.BufferGeometry {
  const outline = tongueOutline(p, 6)
  const n = outline.length
  const S = 10
  let cx = 0, cy = 0
  for (const [x, y] of outline) {
    cx += x
    cy += y
  }
  cx /= n
  cy = cy / n - 0.15
  const tipX = p.tongue.tip[0]
  const taper = (x: number) => {
    const k = Math.max(0, Math.min(1, (tipX - x) / 1.5))
    return 0.35 + 0.65 * k * k * (3 - 2 * k)
  }
  const pos: number[] = []
  for (let j = 0; j <= 2 * S; j++) {
    const th = (j / (2 * S)) * Math.PI - Math.PI / 2
    const s = Math.cos(th) ** 0.7
    for (let i = 0; i < n; i++) {
      const [x, y] = outline[i]
      pos.push(cx + (x - cx) * s, cy + (y - cy) * s, -Math.sin(th) * 1.05 * taper(x))
    }
  }
  const idx: number[] = []
  for (let j = 0; j < 2 * S; j++)
    for (let i = 0; i < n; i++) {
      const a = j * n + i, b = j * n + ((i + 1) % n), c = (j + 1) * n + i, d = (j + 1) * n + ((i + 1) % n)
      idx.push(a, c, b, b, c, d)
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

function skinnedTongue(material: THREE.Material): THREE.Object3D {
  const geo = fullTongueGeometry(NEUTRAL)
  const pts = tonguePoints(NEUTRAL)
  const pos = geo.getAttribute('position')
  const si = new Uint16Array(pos.count * 4)
  const sw = new Float32Array(pos.count * 4)
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), y = pos.getY(v)
    const d = pts.map(([px, py], i) => ({ i, d: Math.hypot(px - x, py - y) + 1e-4 })).sort((a, b) => a.d - b.d)
    const w = d.slice(0, 3).map((e) => 1 / e.d ** 2)
    const tot = w[0] + w[1] + w[2]
    si.set([d[0].i, d[1].i, d[2].i, 0], v * 4)
    sw.set([w[0] / tot, w[1] / tot, w[2] / tot, 0], v * 4)
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  const rig = group('tongue_rig')
  const bones = TONGUE_POINTS.map((p, i) => {
    const b = new THREE.Bone()
    b.name = TONGUE_BONES[p]
    b.position.set(pts[i][0], pts[i][1], 0)
    rig.add(b)
    return b
  })
  const skinned = new THREE.SkinnedMesh(geo, material)
  skinned.name = 'tongue'
  rig.add(skinned)
  rig.updateMatrixWorld(true)
  skinned.bind(new THREE.Skeleton(bones))
  return rig
}

// ---------- rakitan ----------
export function buildHeadModel(opts: HeadOptions = {}): THREE.Group {
  const s = opts.step ?? 0.05
  const tissue = (c: string) => mat(c, { roughness: 0.48 })
  const teethMat = mat(COLORS.teeth, { roughness: 0.28 })
  const toothStep = Math.max(0.03, s * 0.68)

  const skin = mesh('skin', polygonize(skinSDF(), [-4.0, -4.5, -3.1], [5.2, 6.2, 3.1], s * 2.0, 2), mat(COLORS.skin, { transparent: true, opacity: 0.2, roughness: 0.7 }))
  const nasal = mesh('nasal', polygonize(nasalSDF(), [-1.4, 1.5, -0.9], [4.6, 3.2, 0.9], s * 1.25, 2), mat(COLORS.nasal, { transparent: true, opacity: 0.25 }))
  const palate = mesh('palate', polygonize(palateSDF(), [0.4, 0.6, -1.7], [4.0, 2.1, 1.7], s, 2), tissue(COLORS.palate))
  const velum = mesh('velum', polygonize(velumSDF(), [-1.3, 1.0, -1.1], [0.75, 2.1, 1.1], s * 0.8, 2), tissue(COLORS.velum))
  const throat = mesh('throat', polygonize(throatSDF(), [-1.9, -4.45, -1.0], [0.1, 3.0, 1.0], s * 1.2, 1), tissue(COLORS.throat))
  const jaw = group(
    'jaw',
    mesh('jaw_mandible', polygonize(jawSDF(), [0.0, -2.3, -2.0], [4.0, 1.1, 2.0], s * 1.2, 2), tissue(COLORS.jaw)),
    teeth('incisors_lower', LOWER_TEETH, archLower, 0, 3, teethMat, toothStep),
    teeth('molars_lower', LOWER_TEETH, archLower, 3, 8, teethMat, toothStep),
  )
  const lipsUpper = centered('lips_upper', polygonize(lipSDF(true), [3.4, -0.1, -1.3], [4.6, 1.05, 1.3], s * 0.7, 2), tissue(COLORS.lips), [4.1, 0.45, 0])
  const lipsLower = centered('lips_lower', polygonize(lipSDF(false), [3.4, -1.05, -1.3], [4.6, 0.1, 1.3], s * 0.7, 2), tissue(COLORS.lips), [4.05, -0.45, 0])

  // pita suara kiri & kanan: origin di dinding samping, memanjang ke garis tengah saat tertutup (skala z = 1)
  const [fx0, fx1] = PROFILE.vocalFolds.x
  const foldMat = mat(COLORS.folds, { roughness: 0.4 })
  const fold = (name: string, side: number) => {
    const geo = new RoundedBoxGeometry(fx1 - fx0, 0.1, 0.42, 2, 0.04).translate(0, 0, -0.21 * side)
    const m = mesh(name, geo, foldMat)
    m.position.set((fx0 + fx1) / 2, PROFILE.vocalFolds.y, 0.42 * side)
    return m
  }

  const root = group(
    'TajwidHead3D',
    skin, nasal, palate, velum, throat, jaw, lipsUpper, lipsLower,
    teeth('incisors_upper', UPPER_TEETH, archUpper, 0, 3, teethMat, toothStep),
    teeth('molars_upper', UPPER_TEETH, archUpper, 3, 8, teethMat, toothStep),
    fold('vocal_folds_l', -1), fold('vocal_folds_r', 1),
    skinnedTongue(tissue(COLORS.tongue)),
  )
  root.updateMatrixWorld(true)
  return root
}
