// Tes rig model artist: data pose yang sama harus menggerakkan node, tulang, dan morph target dengan benar.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { morphTargetNames } from '../../anatomy/modelSpec'
import { ORGANS, PROFILE, type OrganId } from '../../anatomy/shapes'
import { NEUTRAL, tonguePoints, TONGUE_POINTS } from '../../anatomy/pose'
import { buildHeadModel } from '../../dev/headModel'
import { buildSampleModel } from '../../dev/sampleModel'
import { exportGLB, parseGLB } from '../../dev/gltfNode'
import { computeFrame } from '../../engine/frame'
import { buildSpec } from '../../engine/spec'
import { buildRig, driveRig, type Rig } from './rig'

const organs = Object.fromEntries(ORGANS.map((o) => [o.id, true])) as Record<OrganId, boolean>
const T_CONTACT = 1.8

function drive(rig: Rig, letter: string, t = T_CONTACT, variant?: 'tafkhim' | 'tarqiq') {
  const spec = buildSpec(letter, { variant })
  const frame = computeFrame(spec, t)
  driveRig(rig, frame, spec, { organs, skinOpacity: 0.2 })
  rig.root.updateMatrixWorld(true)
  return { spec, frame }
}

const byName = (rig: Rig, name: string) => rig.root.getObjectByName(name)!
const worldPos = (o: THREE.Object3D) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)

describe('rig — tulang lidah', () => {
  const rig = buildRig(buildSampleModel('bones'))

  it('laporan kontrak lengkap', () => {
    expect(rig.report.missing).toEqual([])
    expect(rig.report.tongueMode).toBe('bones')
    expect(rig.report.bones).toBe(13)
  })

  it('tulang mengikuti titik kontrol pose (ق saat kontak)', () => {
    const { frame } = drive(rig, 'qof')
    const pts = tonguePoints(frame.pose)
    TONGUE_POINTS.forEach((p, i) => {
      const b = worldPos(byName(rig, `tongue_${p}`))
      expect(b.x).toBeCloseTo(pts[i][0], 5)
      expect(b.y).toBeCloseTo(pts[i][1], 5)
    })
  })

  it('bibir tertutup pada ب (offset dari pose)', () => {
    const { frame } = drive(rig, 'ba')
    const lip = byName(rig, 'lips_lower')
    expect(lip.position.y).toBeCloseTo(frame.pose.lips.lower[1], 5)
  })

  it('rahang membuka sekali saja (gigi bawah anak node jaw tidak digeser dua kali)', () => {
    const before = worldPos(byName(rig, 'incisors_lower')).y
    drive(rig, 'tsa', 0)
    const rest = worldPos(byName(rig, 'incisors_lower')).y
    const { frame } = drive(rig, 'tsa')
    expect(worldPos(byName(rig, 'incisors_lower')).y).toBeCloseTo(rest - frame.pose.jaw, 5)
    expect(before).toBeDefined()
  })

  it('velum berputar di engsel walau origin node bukan di engsel', () => {
    const velum = byName(rig, 'velum')
    drive(rig, 'nun', 0)
    const restMatrix = velum.matrixWorld.clone()
    const { frame } = drive(rig, 'nun')
    const angle = frame.pose.velum * PROFILE.velumLowered
    const probe = new THREE.Vector3(-0.95, 1.36, 0) // ujung anak lidah (ruang model)
    const local = probe.clone().applyMatrix4(restMatrix.clone().invert())
    const moved = local.applyMatrix4(velum.matrixWorld)
    const [px, py] = PROFILE.velumPivot
    const expected = new THREE.Vector3(probe.x - px, probe.y - py, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), angle).add(new THREE.Vector3(px, py, 0))
    expect(moved.distanceTo(expected)).toBeLessThan(1e-5)
  })

  it('pita suara: skala z = penutupan', () => {
    const { frame } = drive(rig, 'hamzah')
    expect(byName(rig, 'vocal_folds').scale.z).toBeCloseTo(Math.max(0.08, frame.foldClosure), 5)
  })

  it('organ bisa disembunyikan', () => {
    const spec = buildSpec('ba')
    driveRig(rig, computeFrame(spec, 1), spec, { organs: { ...organs, tongue: false }, skinOpacity: 0 })
    let o: THREE.Object3D | null = byName(rig, 'tongue')
    let visible = true
    for (; o; o = o.parent) visible &&= o.visible
    expect(visible).toBe(false)
    expect(rig.skinMaterials.every((m) => !m.visible)).toBe(true)
  })
})

describe('rig — morph target', () => {
  const rig = buildRig(buildSampleModel('morphs'))
  it('bobot morph = bobot pose; "raised" untuk ra tebal', () => {
    expect(rig.report.tongueMode).toBe('morphs')
    const { spec, frame } = drive(rig, 'ra', T_CONTACT, 'tafkhim')
    const mesh = rig.morphMeshes[0]
    const dict = mesh.morphTargetDictionary!
    expect(mesh.morphTargetInfluences![dict[spec.poseId]]).toBeCloseTo(frame.w, 5)
    expect(mesh.morphTargetInfluences![dict.raised]).toBeCloseTo(frame.w, 5)
    drive(rig, 'ra', T_CONTACT, 'tarqiq')
    expect(mesh.morphTargetInfluences![dict.raised]).toBe(0)
  })
})

describe('model kepala 3D bawaan (head-3d.glb)', () => {
  const rig = buildRig(buildHeadModel({ step: 0.16 }))
  it('memenuhi kontrak model artist', () => {
    expect(rig.report.missing).toEqual([])
    expect(rig.report.tongueMode).toBe('bones')
  })
  it('kepala utuh simetris (bisa dipotong sagital)', () => {
    const box = new THREE.Box3().setFromObject(rig.root)
    expect(box.max.z).toBeGreaterThan(2)
    expect(Math.abs(box.max.z + box.min.z)).toBeLessThan(0.3)
  })
  it('pita suara kiri & kanan menutup bersama pada hamzah', () => {
    const { frame } = drive(rig, 'hamzah')
    for (const n of ['vocal_folds_l', 'vocal_folds_r']) expect(byName(rig, n).scale.z).toBeCloseTo(frame.foldClosure, 5)
  })
  it('lidah mengikuti pose ق', () => {
    const { frame } = drive(rig, 'qof')
    const b = worldPos(byName(rig, 'tongue_dorsumBack'))
    const target = tonguePoints(frame.pose)[TONGUE_POINTS.indexOf('dorsumBack')]
    expect(b.x).toBeCloseTo(target[0], 4)
    expect(b.y).toBeCloseTo(target[1], 4)
  })
})

describe('brief 3D artist sinkron dengan data', () => {
  const doc = readFileSync(join(process.cwd(), 'docs/model-3d-artist.md'), 'utf8')
  it('tabel posisi tulang = titik netral poses.json', () => {
    const rest = tonguePoints(NEUTRAL)
    TONGUE_POINTS.forEach((p, i) => {
      const m = doc.match(new RegExp('\\| `tongue_' + p + '` \\| (−?[\\d,]+) \\| (−?[\\d,]+) \\|'))
      expect(m, p).not.toBeNull()
      const num = (s: string) => parseFloat(s.replace('−', '-').replace(',', '.'))
      expect(num(m![1])).toBeCloseTo(rest[i][0], 5)
      expect(num(m![2])).toBeCloseTo(rest[i][1], 5)
    })
  })
  it('daftar morph target memuat semua id pose', () => {
    for (const id of morphTargetNames()) expect(doc, id).toContain('`' + id + '`')
  })
})

describe('glTF bolak-balik (ekspor → muat → rig)', () => {
  it('nama node, tulang, dan skin bertahan setelah ekspor GLB', async () => {
    const glb = await exportGLB(buildSampleModel('bones'))
    const gltf = await parseGLB(glb)
    const rig = buildRig(gltf.scene)
    expect(rig.report.missing).toEqual([])
    expect(rig.report.tongueMode).toBe('bones')
    const { frame } = drive(rig, 'kaf')
    const b = worldPos(rig.root.getObjectByName('tongue_dorsumBack')!)
    const target = tonguePoints(frame.pose)[TONGUE_POINTS.indexOf('dorsumBack')]
    expect(b.x).toBeCloseTo(target[0], 4)
    expect(b.y).toBeCloseTo(target[1], 4)
  })
})
