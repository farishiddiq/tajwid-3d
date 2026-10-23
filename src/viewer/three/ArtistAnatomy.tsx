import { useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { ModelConfig } from '../../anatomy/modelSpec'
import { organLabel, tongueLabel } from '../../anatomy/shapes'
import { useApp } from '../../store'
import { useFrameCtx, type HoverFn } from './frameCtx'
import { buildRig, driveRig } from './rig'
import { SectionCaps } from './sectionCaps'

const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`
/** menyisakan z ≤ 0 (setengah kiri), bidang potong menghadap kamera samping */
const CUT_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)

/** Sisi dalam organ (terlihat lewat bidang potong) digambar lebih gelap agar terbaca sebagai "dalam". */
function tintBackfaces(material: THREE.Material) {
  if (material.userData.tinted) return
  material.userData.tinted = true
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      '#include <dithering_fragment>\n if (!gl_FrontFacing) gl_FragColor.rgb *= 0.62;',
    )
  }
}

/** Model glTF dari 3D artist, digerakkan oleh data pose & frame yang sama dengan model prosedural. */
export default function ArtistAnatomy({ url, config, onHover }: { url: string; config: ModelConfig; onHover: HoverFn }) {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}${url.replace(/^\.?\//, '')}`, DRACO_PATH, true)
  const { get, spec } = useFrameCtx()
  const group = useRef<THREE.Group>(null)
  // satu klon per viewer (mode bandingkan memakai dua viewer)
  const rig = useMemo(() => buildRig(cloneSkinned(gltf.scene), config.tongue), [gltf, config.tongue])

  useEffect(() => {
    const r = rig.report
    console.info(`[Tajwid 3D] Model artist dimuat: ${url} · lidah: ${r.tongueMode} · tulang: ${r.bones} · morph: ${r.morphs.length}`)
    for (const w of r.warnings) console.warn(`[Tajwid 3D] ${w}`)
  }, [rig, url])

  // potongan sagital: buang separuh kanan (z > 0) dengan clipping plane; permukaan dalam diberi warna lebih gelap
  const cut = useApp((s) => s.cut)
  useEffect(() => {
    const planes = cut ? [CUT_PLANE] : []
    rig.root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || o.userData.capHelper) return
      for (const material of Array.isArray(m.material) ? m.material : [m.material]) {
        material.clippingPlanes = planes
        material.side = cut || material.transparent ? THREE.DoubleSide : THREE.FrontSide
        tintBackfaces(material)
        material.needsUpdate = true
      }
    })
  }, [rig, cut])

  const caps = useMemo(() => new SectionCaps(rig.root, CUT_PLANE), [rig])

  useFrame(() => {
    const s = useApp.getState()
    driveRig(rig, get(), spec, { organs: s.organs, skinOpacity: s.skinOpacity })
    caps.update(s.cut)
  })

  const show = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    let o: THREE.Object3D | null = e.object
    while (o && !rig.organOf.has(o)) o = o.parent
    if (!o) return
    e.stopPropagation()
    const organ = rig.organOf.get(o)!
    let text = organLabel(organ)
    if (organ === 'tongue' && group.current) text = tongueLabel(group.current.worldToLocal(e.point.clone()))
    onHover({ text, point: [e.point.x, e.point.y, e.point.z] })
  }

  const t = config.transform
  return (
    <group ref={group} position={t.position} rotation={t.rotation} scale={t.scale} onPointerMove={show} onClick={show} onPointerOut={() => onHover(null)}>
      <primitive object={rig.root} />
    </group>
  )
}
