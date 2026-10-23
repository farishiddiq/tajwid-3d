// Membuat "model artist" contoh dari profil prosedural, mengikuti kontrak di modelSpec.ts.
// Dipakai untuk: (1) file contoh public/models/sample-*.glb bagi 3D artist, (2) tes otomatis rig.
// Tidak diimpor oleh aplikasi.
import * as THREE from 'three'
import { TONGUE_BONES } from '../anatomy/modelSpec'
import { ORGAN_COLORS } from '../anatomy/palette'
import { applyRaise, getPoseDef, NEUTRAL, poseIds, tongueOutline, tonguePoints, TONGUE_POINTS, type Pose } from '../anatomy/pose'
import { DEPTH, PROFILE, type V2 } from '../anatomy/shapes'
import { extrudeHalf, HalfPillow } from '../viewer/three/geom'

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra })

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

const SEGMENTS = 6
const SLICES = 9

function tongueGeometry(p: Pose): THREE.BufferGeometry {
  const outline = tongueOutline(p, SEGMENTS)
  const pillow = new HalfPillow(outline.length, SLICES)
  const tipX = p.tongue.tip[0]
  pillow.update(outline, DEPTH.tongue, (x) => {
    const k = Math.max(0, Math.min(1, (tipX - x) / 1.5))
    return 0.35 + 0.65 * k * k * (3 - 2 * k)
  })
  const g = pillow.geometry.toNonIndexed()
  g.clearGroups()
  g.computeVertexNormals()
  return g
}

/** Lidah dengan 13 tulang di titik kontrol (bobot kulit dari 2 titik terdekat). */
function skinnedTongue(): THREE.Object3D {
  const geo = tongueGeometry(NEUTRAL)
  const pts = tonguePoints(NEUTRAL)
  const pos = geo.getAttribute('position')
  const idx = new Uint16Array(pos.count * 4)
  const wts = new Float32Array(pos.count * 4)
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v)
    const y = pos.getY(v)
    const d = pts.map(([px, py], i) => ({ i, d: Math.hypot(px - x, py - y) + 1e-4 })).sort((a, b) => a.d - b.d)
    const [a, b] = d
    const wa = 1 / a.d ** 2
    const wb = 1 / b.d ** 2
    idx.set([a.i, b.i, 0, 0], v * 4)
    wts.set([wa / (wa + wb), wb / (wa + wb), 0, 0], v * 4)
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4))
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4))

  const rig = group('tongue_rig')
  const bones = TONGUE_POINTS.map((p, i) => {
    const b = new THREE.Bone()
    b.name = TONGUE_BONES[p]
    b.position.set(pts[i][0], pts[i][1], 0)
    rig.add(b)
    return b
  })
  const skinned = new THREE.SkinnedMesh(geo, mat(ORGAN_COLORS.tongue, { side: THREE.DoubleSide }))
  skinned.name = 'tongue'
  rig.add(skinned)
  rig.updateMatrixWorld(true)
  skinned.bind(new THREE.Skeleton(bones))
  return rig
}

/** Lidah dengan morph target per id pose + "raised". */
function morphTongue(): THREE.Object3D {
  const base = tongueGeometry(NEUTRAL)
  const basePos = base.getAttribute('position')
  const targets: THREE.BufferAttribute[] = []
  const names: string[] = []
  const add = (name: string, p: Pose) => {
    const g = tongueGeometry(p)
    const tp = g.getAttribute('position')
    const delta = new Float32Array(tp.count * 3)
    for (let i = 0; i < tp.count * 3; i++) delta[i] = (tp.array as Float32Array)[i] - (basePos.array as Float32Array)[i]
    const attr = new THREE.Float32BufferAttribute(delta, 3)
    attr.name = name
    targets.push(attr)
    names.push(name)
  }
  for (const id of poseIds()) add(id, getPoseDef(id).pose)
  add('raised', applyRaise(NEUTRAL, 1))
  base.morphAttributes.position = targets
  base.morphTargetsRelative = true
  const m = mesh('tongue', base, mat(ORGAN_COLORS.tongue, { side: THREE.DoubleSide }))
  m.updateMorphTargets()
  m.morphTargetDictionary = Object.fromEntries(names.map((n, i) => [n, i]))
  return m
}

function molars(name: string, y: V2) {
  const g = group(name)
  PROFILE.molarsX.forEach(([a, b], i) => {
    const m = mesh(`${name}_${i + 1}`, new THREE.BoxGeometry(b - a - 0.04, y[1] - y[0], PROFILE.molarZ[1] - PROFILE.molarZ[0]), mat(ORGAN_COLORS.teeth, { roughness: 0.35 }))
    m.position.set((a + b) / 2, (y[0] + y[1]) / 2, (PROFILE.molarZ[0] + PROFILE.molarZ[1]) / 2)
    g.add(m)
  })
  return g
}

export function buildSampleModel(tongue: 'bones' | 'morphs' = 'bones'): THREE.Group {
  const skin = mesh('skin', extrudeHalf(PROFILE.skin, DEPTH.skin, 0.25), mat(ORGAN_COLORS.skin, { transparent: true, opacity: 0.2 }))
  const nasal = mesh('nasal', extrudeHalf(PROFILE.nasal, DEPTH.nasal, 0.1), mat(ORGAN_COLORS.nasal, { transparent: true, opacity: 0.2 }))
  const palate = mesh('palate', extrudeHalf(PROFILE.maxilla, DEPTH.maxilla), mat(ORGAN_COLORS.palate))
  // origin velum sengaja TIDAK di engsel: rig harus tetap memutarnya di PROFILE.velumPivot
  const velum = mesh('velum', extrudeHalf(PROFILE.velum, DEPTH.velum), mat(ORGAN_COLORS.velum))
  const throat = group(
    'throat',
    mesh('throat_pharynx', extrudeHalf(PROFILE.pharynx, DEPTH.pharynx), mat(ORGAN_COLORS.throat)),
    mesh('throat_larynx', extrudeHalf(PROFILE.larynx, DEPTH.larynx), mat(ORGAN_COLORS.throat)),
    mesh('throat_epiglottis', extrudeHalf(PROFILE.epiglottis, DEPTH.epiglottis, 0.03), mat(ORGAN_COLORS.velum)),
  )
  // pita suara: origin di dinding samping (z = -0.45), mesh memanjang +z ke garis tengah saat tertutup penuh
  const [fx0, fx1] = PROFILE.vocalFolds.x
  const foldGeo = new THREE.BoxGeometry(fx1 - fx0, 0.11, 0.45).translate(0, 0, 0.225)
  const folds = mesh('vocal_folds', foldGeo, mat(ORGAN_COLORS.folds, { roughness: 0.4 }))
  folds.position.set((fx0 + fx1) / 2, PROFILE.vocalFolds.y, -0.45)
  const upperIncisor = mesh('incisors_upper', extrudeHalf(PROFILE.upperIncisor, DEPTH.incisor, 0.03), mat(ORGAN_COLORS.teeth, { roughness: 0.35 }))
  const lipsUpper = mesh('lips_upper', extrudeHalf(PROFILE.upperLip, DEPTH.lip, 0.08), mat(ORGAN_COLORS.lips))
  const lipsLower = mesh('lips_lower', extrudeHalf(PROFILE.lowerLip, DEPTH.lip, 0.08), mat(ORGAN_COLORS.lips))
  const jaw = group(
    'jaw',
    mesh('jaw_mandible', extrudeHalf(PROFILE.mandible, DEPTH.mandible), mat(ORGAN_COLORS.jaw)),
    mesh('incisors_lower', extrudeHalf(PROFILE.lowerIncisor, DEPTH.incisor, 0.03), mat(ORGAN_COLORS.teeth, { roughness: 0.35 })),
    molars('molars_lower', PROFILE.lowerMolarY),
  )
  const root = group(
    'TajwidHead',
    skin, nasal, palate, velum, throat, folds, upperIncisor, molars('molars_upper', PROFILE.upperMolarY), lipsUpper, lipsLower, jaw,
    tongue === 'bones' ? skinnedTongue() : morphTongue(),
  )
  root.updateMatrixWorld(true)
  return root
}
