// Memasang data animasi (pose + frame) ke model glTF dari 3D artist.
// Tidak ada data pose/efek yang berubah: rig hanya menerjemahkan Frame → transform node, posisi tulang, atau bobot morph.
import * as THREE from 'three'
import { matchBone, matchNode, NODE_PREFIXES, TONGUE_BONES, type ModelConfig, type PartRole } from '../../anatomy/modelSpec'
import { tonguePoints, TONGUE_POINTS, type TonguePoint } from '../../anatomy/pose'
import { PROFILE, type OrganId } from '../../anatomy/shapes'
import type { Frame } from '../../engine/frame'
import type { AnimSpec } from '../../engine/spec'

interface Part {
  obj: THREE.Object3D
  organ: OrganId
  role: PartRole
  base: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3; matrix: THREE.Matrix4 }
  /** ruang model (akar rig) → ruang lokal induk */
  toLocal: THREE.Matrix4
  toLocalDir: THREE.Matrix3
  /** apakah node ini sudah ikut bergerak karena induknya juga bagian yang digerakkan */
  inheritsMotion: boolean
}

interface BoneRef {
  bone: THREE.Bone
  point: TonguePoint
  /** posisi z tulang (ruang model) saat istirahat; x/y diambil dari pose */
  z: number
}

export interface RigReport {
  found: string[]
  missing: string[]
  tongueMode: 'bones' | 'morphs' | 'static'
  bones: number
  morphs: string[]
  warnings: string[]
}

export interface Rig {
  root: THREE.Object3D
  parts: Part[]
  organOf: Map<THREE.Object3D, OrganId>
  bones: BoneRef[]
  morphMeshes: THREE.Mesh[]
  tongueMode: RigReport['tongueMode']
  skinMaterials: THREE.Material[]
  foldMaterials: THREE.MeshStandardMaterial[]
  report: RigReport
}

const MOVING: PartRole[] = ['upperLip', 'lowerLip', 'jaw', 'velum', 'vocalFolds']

/** Membangun rig dari scene glTF (sebaiknya sudah di-clone per viewer). */
export function buildRig(root: THREE.Object3D, tongue: ModelConfig['tongue'] = 'auto'): Rig {
  root.position.set(0, 0, 0)
  root.rotation.set(0, 0, 0)
  root.scale.set(1, 1, 1)
  root.updateMatrixWorld(true)

  const parts: Part[] = []
  const organOf = new Map<THREE.Object3D, OrganId>()
  const bones: BoneRef[] = []
  const morphMeshes: THREE.Mesh[] = []
  const skinMaterials: THREE.Material[] = []
  const foldMaterials: THREE.MeshStandardMaterial[] = []
  const warnings: string[] = []
  const found = new Set<string>()

  const visit = (obj: THREE.Object3D, inherited: { organ: OrganId; role: PartRole } | null, moving: boolean) => {
    const bone = obj instanceof THREE.Bone ? matchBone(obj.name) : undefined
    if (bone) {
      const wp = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld)
      bones.push({ bone: obj as THREE.Bone, point: bone, z: wp.z })
    }
    const m = obj instanceof THREE.Bone ? undefined : matchNode(obj.name)
    let ctx = inherited
    let isMoving = moving
    if (m && (!inherited || inherited.organ !== m.organ || inherited.role !== m.role)) {
      found.add(m.prefix)
      const toLocal = new THREE.Matrix4().copy(obj.parent ? obj.parent.matrixWorld : new THREE.Matrix4()).invert()
      parts.push({
        obj,
        organ: m.organ,
        role: m.role,
        base: { position: obj.position.clone(), quaternion: obj.quaternion.clone(), scale: obj.scale.clone(), matrix: obj.matrix.clone() },
        toLocal,
        toLocalDir: new THREE.Matrix3().setFromMatrix4(toLocal),
        inheritsMotion: moving,
      })
      ctx = { organ: m.organ, role: m.role }
      if (MOVING.includes(m.role)) isMoving = true
    }
    if (ctx) organOf.set(obj, ctx.organ)
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh
      if (ctx?.role === 'skin' || ctx?.role === 'vocalFolds') {
        // material diklon agar opasitas/emisi per viewer tidak saling memengaruhi
        const clone = (mat: THREE.Material) => {
          const c = mat.clone()
          if (ctx!.role === 'skin') {
            c.transparent = true
            c.depthWrite = false
            c.side = THREE.DoubleSide
            skinMaterials.push(c)
          } else if (c instanceof THREE.MeshStandardMaterial) {
            c.emissive = new THREE.Color('#F0E442')
            c.emissiveIntensity = 0
            foldMaterials.push(c)
          }
          return c
        }
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material)
        if (ctx.role === 'skin') mesh.raycast = () => undefined
      }
      if (ctx?.role === 'tongue' && mesh.morphTargetDictionary) morphMeshes.push(mesh)
    }
    for (const c of obj.children) visit(c, ctx, isMoving)
  }
  visit(root, null, false)

  const hasAllBones = TONGUE_POINTS.every((p) => bones.some((b) => b.point === p))
  const morphNames = [...new Set(morphMeshes.flatMap((m) => Object.keys(m.morphTargetDictionary ?? {})))]
  let tongueMode: RigReport['tongueMode'] = 'static'
  if ((tongue === 'auto' || tongue === 'bones') && hasAllBones) tongueMode = 'bones'
  else if ((tongue === 'auto' || tongue === 'morphs') && morphNames.length) tongueMode = 'morphs'
  if (tongueMode === 'static') warnings.push('Lidah tidak punya 13 tulang tongue_* maupun morph target — lidah tidak akan bergerak.')
  if (bones.length && !hasAllBones) {
    const missingBones = TONGUE_POINTS.filter((p) => !bones.some((b) => b.point === p)).map((p) => TONGUE_BONES[p])
    warnings.push(`Tulang lidah kurang: ${missingBones.join(', ')}`)
  }

  const missing = NODE_PREFIXES.filter((n) => n.required && !found.has(n.prefix)).map((n) => n.prefix)
  if (missing.length) warnings.push(`Node wajib tidak ditemukan: ${missing.join(', ')}`)
  const report: RigReport = {
    found: [...found],
    missing,
    tongueMode,
    bones: bones.length,
    morphs: morphNames,
    warnings,
  }
  return { root, parts, organOf, bones, morphMeshes, tongueMode, skinMaterials, foldMaterials, report }
}

const tmpV = new THREE.Vector3()
const tmpM = new THREE.Matrix4()
const tmpM2 = new THREE.Matrix4()
const velumT = new THREE.Matrix4()

function offset(part: Part, dx: number, dy: number) {
  tmpV.set(dx, dy, 0).applyMatrix3(part.toLocalDir)
  part.obj.position.copy(part.base.position).add(tmpV)
}

/** Menerapkan satu frame animasi ke rig. */
export function driveRig(rig: Rig, frame: Frame, spec: AnimSpec, opts: { organs: Record<OrganId, boolean>; skinOpacity: number }) {
  const p = frame.pose
  for (const part of rig.parts) {
    part.obj.visible = opts.organs[part.organ] !== false
    // gigi bawah yang sudah menjadi anak node "jaw" tidak boleh digeser dua kali
    if (part.inheritsMotion && part.role === 'jaw') continue
    switch (part.role) {
      case 'upperLip':
      case 'lowerLip': {
        const [dx, dy] = part.role === 'upperLip' ? p.lips.upper : p.lips.lower
        offset(part, dx, dy)
        const r = p.lips.round
        part.obj.scale.set(part.base.scale.x * (1 + r * 0.05), part.base.scale.y * (1 - r * 0.08), part.base.scale.z * (1 - r * 0.25))
        break
      }
      case 'jaw':
        offset(part, 0, -p.jaw)
        break
      case 'velum': {
        // rotasi di sekitar engsel (PROFILE.velumPivot, ruang model), apa pun origin node-nya
        const [px, py] = PROFILE.velumPivot
        velumT.makeTranslation(px, py, 0)
          .multiply(tmpM.makeRotationZ(p.velum * PROFILE.velumLowered))
          .multiply(tmpM2.makeTranslation(-px, -py, 0))
        // lokal_baru = toLocal · T · toLocal⁻¹ · lokal_dasar
        tmpM.copy(part.toLocal).multiply(velumT).multiply(tmpM2.copy(part.toLocal).invert()).multiply(part.base.matrix)
        tmpM.decompose(part.obj.position, part.obj.quaternion, part.obj.scale)
        break
      }
      case 'vocalFolds':
        part.obj.scale.set(part.base.scale.x, part.base.scale.y, part.base.scale.z * Math.max(0.08, frame.foldClosure))
        break
    }
  }

  for (const m of rig.foldMaterials) m.emissiveIntensity = frame.vibrating ? 0.6 + 0.4 * Math.sin(frame.t * 60) : 0
  for (const m of rig.skinMaterials) {
    m.opacity = opts.skinOpacity
    m.visible = opts.skinOpacity > 0.01
  }

  if (rig.tongueMode === 'bones') {
    // tulang diproses berurutan induk → anak, jadi rantai tulang (bukan hanya tulang sejajar) tetap benar
    const pts = tonguePoints(p)
    rig.root.updateWorldMatrix(true, false)
    for (const b of rig.bones) {
      const [x, y] = pts[TONGUE_POINTS.indexOf(b.point)]
      const parent = b.bone.parent!
      parent.updateWorldMatrix(true, false)
      parent.worldToLocal(rig.root.localToWorld(tmpV.set(x, y, b.z)))
      b.bone.position.copy(tmpV)
      b.bone.updateMatrixWorld(true)
    }
  } else if (rig.tongueMode === 'morphs') {
    for (const mesh of rig.morphMeshes) {
      const dict = mesh.morphTargetDictionary!
      const inf = mesh.morphTargetInfluences!
      inf.fill(0)
      const i = dict[spec.poseId]
      if (i !== undefined) inf[i] = Math.max(0, frame.w)
      const r = dict.raised
      if (r !== undefined) inf[r] = spec.raise * Math.max(0, Math.min(1, frame.w))
    }
  }
}
