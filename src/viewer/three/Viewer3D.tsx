import { Html, OrbitControls, QuadraticBezierLine, RoundedBox } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { loadModelConfig, type ModelConfig } from '../../anatomy/modelSpec'
import { FX, ORGAN_COLORS } from '../../anatomy/palette'
import { tongueOutline } from '../../anatomy/pose'
import { DEPTH, organLabel, palateYAt, PROFILE, tongueLabel, type OrganId, type V3 } from '../../anatomy/shapes'
import type { AnimSpec } from '../../engine/spec'
import { useApp } from '../../store'
import { CAMERA_PRESETS, DEFAULT_PRESET, type CameraSync, type ViewerController } from '../controller'
import ArtistAnatomy from './ArtistAnatomy'
import Calibration from './Calibration'
import { FrameProvider, useFrameCtx, type HoverFn } from './frameCtx'
import { extrudeHalf, getDotTexture, HalfPillow } from './geom'

export interface Marker {
  id: number
  point: V3
  label: string
  active: boolean
}

export interface Viewer3DProps {
  spec: AnimSpec
  controller: ViewerController
  sync?: CameraSync
  hideLabels?: boolean
  markers?: Marker[]
  onMarker?: (id: number) => void
}

// ---------- material ----------
function lighten(hex: string, amt: number) {
  return new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), amt)
}

function useOrganMaterials(color: string) {
  return useMemo(() => {
    const cap = new THREE.MeshStandardMaterial({ color: lighten(color, 0.28), roughness: 0.75 })
    const side = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.02 })
    return [cap, side]
  }, [color])
}

// ---------- label hover ----------

function hoverHandlers(id: OrganId, onHover: HoverFn, labelFor?: (p: THREE.Vector3) => string) {
  const show = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    e.stopPropagation()
    onHover({ text: labelFor ? labelFor(e.point) : organLabel(id), point: [e.point.x, e.point.y, e.point.z] })
  }
  return {
    onPointerMove: show,
    onClick: show,
    onPointerOut: () => onHover(null),
  }
}

// ---------- organ statis ----------
function Organ({ id, points, depth, color, onHover, bevel }: { id: OrganId; points: [number, number][]; depth: number; color: string; onHover: HoverFn; bevel?: number }) {
  const geo = useMemo(() => extrudeHalf(points, depth, bevel), [points, depth, bevel])
  const mats = useOrganMaterials(color)
  return <mesh geometry={geo} material={mats} {...hoverHandlers(id, onHover)} />
}

function Anatomy({ onHover }: { onHover: HoverFn }) {
  const organs = useApp((s) => s.organs)
  const skinOpacity = useApp((s) => s.skinOpacity)
  const { get, spec } = useFrameCtx()
  const jaw = useRef<THREE.Group>(null)
  const upperLip = useRef<THREE.Group>(null)
  const lowerLip = useRef<THREE.Group>(null)
  const velum = useRef<THREE.Group>(null)
  const folds = useRef<THREE.Mesh>(null)
  const nasalMat = useRef<THREE.MeshStandardMaterial>(null)
  const foldMat = useMemo(() => new THREE.MeshStandardMaterial({ color: ORGAN_COLORS.folds, roughness: 0.4, emissive: FX.vibrate, emissiveIntensity: 0 }), [])

  const skin = useMemo(() => {
    const geo = extrudeHalf(PROFILE.skin, DEPTH.skin, 0.25)
    const hidden = new THREE.MeshBasicMaterial({ visible: false })
    const mat = new THREE.MeshStandardMaterial({ color: ORGAN_COLORS.skin, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, roughness: 0.8 })
    return { geo, mats: [hidden, mat], mat }
  }, [])
  skin.mat.opacity = skinOpacity
  skin.mat.visible = skinOpacity > 0.01

  const nasalGeo = useMemo(() => extrudeHalf(PROFILE.nasal, DEPTH.nasal, 0.1), [])
  const molars = PROFILE.molarsX.map(([a, b]) => ({ x: (a + b) / 2, w: b - a - 0.04 }))
  const mz = (PROFILE.molarZ[0] + PROFILE.molarZ[1]) / 2
  const md = PROFILE.molarZ[1] - PROFILE.molarZ[0]

  useFrame(() => {
    const f = get()
    const p = f.pose
    if (jaw.current) jaw.current.position.y = -p.jaw
    if (upperLip.current) {
      upperLip.current.position.set(p.lips.upper[0], p.lips.upper[1], 0)
      upperLip.current.scale.set(1 + p.lips.round * 0.05, 1 - p.lips.round * 0.08, 1 - p.lips.round * 0.25)
    }
    if (lowerLip.current) {
      lowerLip.current.position.set(p.lips.lower[0], p.lips.lower[1], 0)
      lowerLip.current.scale.set(1 + p.lips.round * 0.05, 1 - p.lips.round * 0.08, 1 - p.lips.round * 0.25)
    }
    if (velum.current) velum.current.rotation.z = p.velum * PROFILE.velumLowered
    if (folds.current) {
      const depth = Math.max(0.04, 0.45 * f.foldClosure)
      folds.current.scale.z = depth
      folds.current.position.z = -0.45 + depth / 2
      foldMat.emissiveIntensity = f.vibrating ? 0.6 + 0.4 * Math.sin(f.t * 60) : 0
    }
    if (nasalMat.current) nasalMat.current.opacity = spec.nasal && f.phase !== 'release' ? 0.2 + 0.25 * f.glow : 0.16
  })

  const [vx, vy] = PROFILE.velumPivot
  return (
    <group>
      {organs.skin && <mesh geometry={skin.geo} material={skin.mats} raycast={() => null} renderOrder={10} />}
      {organs.nasal && (
        <mesh geometry={nasalGeo} {...hoverHandlers('nasal', onHover)}>
          <meshStandardMaterial ref={nasalMat} color={ORGAN_COLORS.nasal} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      {organs.palate && <Organ id="palate" points={PROFILE.maxilla} depth={DEPTH.maxilla} color={ORGAN_COLORS.palate} onHover={onHover} />}
      {organs.velum && (
        <group ref={velum} position={[vx, vy, 0]}>
          <group position={[-vx, -vy, 0]}>
            <Organ id="velum" points={PROFILE.velum} depth={DEPTH.velum} color={ORGAN_COLORS.velum} onHover={onHover} />
          </group>
        </group>
      )}
      {organs.throat && (
        <>
          <Organ id="throat" points={PROFILE.pharynx} depth={DEPTH.pharynx} color={ORGAN_COLORS.throat} onHover={onHover} />
          <Organ id="throat" points={PROFILE.larynx} depth={DEPTH.larynx} color={ORGAN_COLORS.throat} onHover={onHover} />
          <Organ id="throat" points={PROFILE.epiglottis} depth={DEPTH.epiglottis} color={ORGAN_COLORS.velum} onHover={onHover} bevel={0.03} />
        </>
      )}
      {organs.vocalFolds && (
        <mesh ref={folds} position={[(PROFILE.vocalFolds.x[0] + PROFILE.vocalFolds.x[1]) / 2, PROFILE.vocalFolds.y, -0.2]} material={foldMat} {...hoverHandlers('vocalFolds', onHover)}>
          <boxGeometry args={[PROFILE.vocalFolds.x[1] - PROFILE.vocalFolds.x[0], 0.11, 1]} />
        </mesh>
      )}
      {organs.incisors && <Organ id="incisors" points={PROFILE.upperIncisor} depth={DEPTH.incisor} color={ORGAN_COLORS.teeth} onHover={onHover} bevel={0.03} />}
      {organs.molars &&
        molars.map((m, i) => (
          <RoundedBox key={`u${i}`} args={[m.w, PROFILE.upperMolarY[1] - PROFILE.upperMolarY[0], md]} radius={0.06} position={[m.x, (PROFILE.upperMolarY[0] + PROFILE.upperMolarY[1]) / 2, mz]} {...hoverHandlers('molars', onHover)}>
            <meshStandardMaterial color={ORGAN_COLORS.teeth} roughness={0.35} />
          </RoundedBox>
        ))}
      {organs.lips && (
        <group ref={upperLip}>
          <Organ id="lips" points={PROFILE.upperLip} depth={DEPTH.lip} color={ORGAN_COLORS.lips} onHover={onHover} bevel={0.08} />
        </group>
      )}
      <group ref={jaw}>
        {organs.jaw && <Organ id="jaw" points={PROFILE.mandible} depth={DEPTH.mandible} color={ORGAN_COLORS.jaw} onHover={onHover} />}
        {organs.incisors && <Organ id="incisors" points={PROFILE.lowerIncisor} depth={DEPTH.incisor} color={ORGAN_COLORS.teeth} onHover={onHover} bevel={0.03} />}
        {organs.molars &&
          molars.map((m, i) => (
            <RoundedBox key={`l${i}`} args={[m.w, PROFILE.lowerMolarY[1] - PROFILE.lowerMolarY[0], md]} radius={0.06} position={[m.x, (PROFILE.lowerMolarY[0] + PROFILE.lowerMolarY[1]) / 2, mz]} {...hoverHandlers('molars', onHover)}>
              <meshStandardMaterial color={ORGAN_COLORS.teeth} roughness={0.35} />
            </RoundedBox>
          ))}
      </group>
      {organs.lips && (
        <group ref={lowerLip}>
          <Organ id="lips" points={PROFILE.lowerLip} depth={DEPTH.lip} color={ORGAN_COLORS.lips} onHover={onHover} bevel={0.08} />
        </group>
      )}
      {organs.tongue && <Tongue onHover={onHover} labelFor={tongueLabel} />}
    </group>
  )
}

function Tongue({ onHover, labelFor }: { onHover: HoverFn; labelFor: (p: THREE.Vector3) => string }) {
  const { get } = useFrameCtx()
  const pillow = useMemo(() => new HalfPillow(13 * 6, 9), [])
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: ORGAN_COLORS.tongue, roughness: 0.45, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: lighten(ORGAN_COLORS.tongue, 0.25), roughness: 0.8, side: THREE.DoubleSide }),
    ],
    [],
  )
  const lastKey = useRef('')
  useFrame(() => {
    const f = get()
    const outline = tongueOutline(f.pose)
    const key = outline.map((p) => p[0].toFixed(3) + p[1].toFixed(3)).join()
    if (key === lastKey.current) return
    lastKey.current = key
    const tipX = f.pose.tongue.tip[0]
    pillow.update(outline, DEPTH.tongue, (x) => {
      const k = Math.max(0, Math.min(1, (tipX - x) / 1.5))
      return 0.35 + 0.65 * k * k * (3 - 2 * k)
    })
  })
  return <mesh geometry={pillow.geometry} material={mats} {...hoverHandlers('tongue', onHover, labelFor)} />
}

// ---------- efek ----------
function Breath() {
  const { get } = useFrameCtx()
  const max = 120
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.24, map: getDotTexture(), transparent: true, depthTest: false, depthWrite: false, color: FX.breath, sizeAttenuation: true }), [])
  const jetGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3))
    return g
  }, [])
  const jetMat = useMemo(() => new THREE.PointsMaterial({ size: 0.14, map: getDotTexture(), transparent: true, depthTest: false, depthWrite: false, color: FX.jet }), [])
  useFrame(() => {
    const f = get()
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const n = Math.min(max, f.breath.length)
    for (let i = 0; i < n; i++) pos.setXYZ(i, f.breath[i].x, f.breath[i].y, f.breath[i].z)
    pos.needsUpdate = true
    geo.setDrawRange(0, n)
    geo.computeBoundingSphere()
    mat.color.set(f.nasalBreath ? FX.nasal : FX.breath)
    const jp = jetGeo.getAttribute('position') as THREE.BufferAttribute
    const m = Math.min(40, f.jet.length)
    for (let i = 0; i < m; i++) jp.setXYZ(i, f.jet[i].x, f.jet[i].y, f.jet[i].z)
    jp.needsUpdate = true
    jetGeo.setDrawRange(0, m)
    jetGeo.computeBoundingSphere()
  })
  return (
    <>
      <points geometry={geo} material={mat} renderOrder={20} frustumCulled={false} />
      <points geometry={jetGeo} material={jetMat} renderOrder={21} frustumCulled={false} />
    </>
  )
}

function Waves() {
  const { get } = useFrameCtx()
  const count = 8
  const geo = useMemo(() => new THREE.RingGeometry(0.17, 0.23, 20, 1, -0.85, 1.7), [])
  const items = useMemo(
    () => Array.from({ length: count }, () => new THREE.MeshBasicMaterial({ color: FX.wave, transparent: true, depthTest: false, side: THREE.DoubleSide })),
    [],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const f = get()
    for (let i = 0; i < count; i++) {
      const m = refs.current[i]
      if (!m) continue
      const w = f.waves[i]
      m.visible = !!w
      if (!w) continue
      m.position.set(w.x, w.y, 0.14)
      m.rotation.z = w.angle
      m.scale.setScalar(w.scale * (f.nasalBreath ? 0.8 : 1))
      items[i].opacity = w.a
    }
  })
  return (
    <>
      {items.map((mat, i) => (
        <mesh key={i} ref={(el) => void (refs.current[i] = el)} geometry={geo} material={mat} renderOrder={22} />
      ))}
    </>
  )
}

function starShape(r1: number, r2: number, n = 5) {
  const s = new THREE.Shape()
  for (let i = 0; i <= n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  return s
}

function ContactGlow() {
  const { get, spec, hideLabels } = useFrameCtx()
  const group = useRef<THREE.Group>(null)
  const star = useRef<THREE.Mesh>(null)
  const ripple = useRef<THREE.Mesh>(null)
  const zone = useRef<THREE.Mesh>(null)
  const [labelVisible, setLabelVisible] = useState(false)
  const starGeo = useMemo(() => new THREE.ShapeGeometry(starShape(0.16, 0.07)), [])
  const starMat = useMemo(() => new THREE.MeshBasicMaterial({ color: FX.contact, transparent: true, depthTest: false }), [])
  const rippleMat = useMemo(() => new THREE.MeshBasicMaterial({ color: FX.contact, transparent: true, depthTest: false, side: THREE.DoubleSide }), [])
  const zoneMat = useMemo(() => new THREE.MeshBasicMaterial({ color: FX.contact, transparent: true, opacity: 0.15, depthWrite: false }), [])
  const [x, y, z] = spec.contactPoint
  const zz = z < -0.1 ? z : 0.1
  const none = spec.contact === 'none'
  useFrame(({ clock }) => {
    const f = get()
    const g = f.layers.contact ? f.glow : 0
    if (group.current) group.current.visible = g > 0.03
    if (star.current) {
      star.current.scale.setScalar((0.55 + 0.45 * g) * (1 + 0.08 * Math.sin(clock.elapsedTime * 6)))
      star.current.rotation.z = clock.elapsedTime * 0.8
      starMat.opacity = Math.min(1, g * 1.2)
    }
    if (zone.current) {
      zone.current.visible = none
      zoneMat.opacity = 0.18 * g
    }
    if (ripple.current) {
      ripple.current.visible = f.ripple > 0 && f.ripple < 1
      ripple.current.scale.setScalar(0.2 + f.ripple * 2.2)
      rippleMat.opacity = 1 - f.ripple
    }
    const lv = g > 0.5
    if (lv !== labelVisible) setLabelVisible(lv)
  })
  return (
    <group ref={group} position={[x, y, zz]}>
      <mesh ref={star} geometry={starGeo} material={starMat} renderOrder={30} />
      <mesh ref={zone} material={zoneMat}>
        <sphereGeometry args={[0.7, 24, 16]} />
      </mesh>
      <mesh ref={ripple} material={rippleMat} renderOrder={29}>
        <ringGeometry args={[0.1, 0.13, 32]} />
      </mesh>
      {!hideLabels && labelVisible && (
        <Html center position={[0, 0.42, 0]} zIndexRange={[20, 0]} pointerEvents="none">
          <div className="label3d label3d--contact">{spec.contactLabel}</div>
        </Html>
      )}
    </group>
  )
}

function Ithbaq() {
  const { get, spec } = useFrameCtx()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: FX.contact, transparent: true, depthTest: false, opacity: 0 }), [])
  const geo = useMemo(() => {
    if (!spec.ithbaq) return null
    const [a, b] = spec.ithbaq
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const x = a + ((b - a) * i) / 20
      pts.push(new THREE.Vector3(x, palateYAt(x) - 0.07, 0.09))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 8)
  }, [spec.ithbaq])
  useFrame(() => {
    const f = get()
    mat.opacity = f.layers.contact && f.phase === 'contact' ? 0.85 * f.glow : 0
  })
  if (!geo) return null
  return <mesh geometry={geo} material={mat} renderOrder={25} />
}

function RaiseArrow() {
  const { get, spec, hideLabels } = useFrameCtx()
  const group = useRef<THREE.Group>(null)
  const [show, setShow] = useState(false)
  useFrame(() => {
    const f = get()
    const on = spec.tafkhim && f.layers.extras !== false && f.t > 0.6 && f.phase !== 'release'
    if (group.current) {
      group.current.visible = on
      const [bx, by] = f.pose.tongue.dorsumBack
      group.current.position.set(bx - 0.2, by - 0.75, 0.12)
    }
    if (on !== show) setShow(on)
  })
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0.25, 0]} renderOrder={26}>
        <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} />
        <meshBasicMaterial color={FX.raise} depthTest={false} transparent />
      </mesh>
      <mesh position={[0, 0.6, 0]} renderOrder={26}>
        <coneGeometry args={[0.1, 0.22, 12]} />
        <meshBasicMaterial color={FX.raise} depthTest={false} transparent />
      </mesh>
      {show && !hideLabels && spec.focus === 'tongue' && (
        <Html center position={[0, -0.18, 0]} pointerEvents="none">
          <div className="label3d label3d--raise">pangkal lidah naik</div>
        </Html>
      )}
    </group>
  )
}

function GapMarker() {
  const { get, spec, hideLabels } = useFrameCtx()
  const [on, setOn] = useState(false)
  const x = spec.target.tongue.dorsumMid[0]
  const y0 = spec.target.tongue.dorsumMid[1]
  const y1 = palateYAt(x)
  useFrame(() => {
    const v = get().phase === 'contact'
    if (v !== on) setOn(v)
  })
  if (!on || spec.focus !== 'tongue' || spec.ithbaq || y1 - y0 < 0.12) return null
  return (
    <group>
      <mesh position={[x, (y0 + y1) / 2, 0.1]} renderOrder={26}>
        <boxGeometry args={[0.03, y1 - y0 - 0.04, 0.01]} />
        <meshBasicMaterial color={FX.breath} depthTest={false} transparent />
      </mesh>
      {!hideLabels && (
        <Html center position={[x + 0.35, (y0 + y1) / 2, 0.1]} pointerEvents="none">
          <div className="label3d">celah</div>
        </Html>
      )}
    </group>
  )
}

function InhirafArrow() {
  const { get, spec, hideLabels } = useFrameCtx()
  const [on, setOn] = useState(false)
  const [x, y] = spec.contactPoint
  useFrame(() => {
    const f = get()
    const v = f.phase === 'contact' && f.layers.extras !== false
    if (v !== on) setOn(v)
  })
  if (!spec.inhiraf || !on) return null
  return (
    <group>
      <QuadraticBezierLine start={[x - 0.9, y + 0.1, 0.1]} mid={[x - 0.2, y - 0.1, -1.4]} end={[x + 0.9, y - 0.75, 0.1]} color={FX.jet} lineWidth={3} dashed dashSize={0.12} gapSize={0.06} depthTest={false} renderOrder={27} />
      <mesh position={[x + 0.9, y - 0.75, 0.1]} rotation={[0, 0, -Math.PI / 1.6]} renderOrder={27}>
        <coneGeometry args={[0.07, 0.18, 10]} />
        <meshBasicMaterial color={FX.jet} depthTest={false} transparent />
      </mesh>
      {!hideLabels && (
        <Html center position={[x + 0.2, y - 0.75, 0.1]} pointerEvents="none">
          <div className="label3d">udara berbelok</div>
        </Html>
      )}
    </group>
  )
}

function Istithalah() {
  const { get, spec } = useFrameCtx()
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const f = get()
    if (!ref.current) return
    ref.current.visible = f.istithalahX !== null
    if (f.istithalahX !== null) ref.current.position.set(f.istithalahX, palateYAt(f.istithalahX) - 0.35, -0.95)
  })
  if (!spec.istithalah) return null
  return (
    <mesh ref={ref} renderOrder={28}>
      <sphereGeometry args={[0.1, 16, 12]} />
      <meshBasicMaterial color={FX.contact} depthTest={false} transparent opacity={0.9} />
    </mesh>
  )
}

function Vibration() {
  const { get, hideLabels } = useFrameCtx()
  const [on, setOn] = useState(false)
  useFrame(() => {
    const f = get()
    const v = f.vibrating && f.layers.folds
    if (v !== on) setOn(v)
  })
  if (!on || hideLabels) return null
  return (
    <Html center position={[-0.2, -2.65, 0.1]} pointerEvents="none">
      <div className="label3d label3d--vibrate" aria-hidden>
        <svg width="22" height="10" viewBox="0 0 22 10">
          <polyline points="0,5 3,1 6,9 9,1 12,9 15,1 18,9 22,5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>{' '}
        pita suara bergetar
      </div>
    </Html>
  )
}

function TipFocus() {
  const { spec, get } = useFrameCtx()
  const tip = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const f = get()
    if (tip.current) {
      const [tx, ty] = f.pose.tongue.tip
      tip.current.position.set(tx, ty, 0.1)
    }
  })
  if (spec.focus !== 'tip') return null
  const mat = <meshBasicMaterial color={FX.raise} transparent opacity={0.35} depthTest={false} />
  return (
    <>
      <mesh ref={tip} renderOrder={24}>
        <sphereGeometry args={[0.3, 20, 14]} />
        {mat}
      </mesh>
      <mesh position={[4.25, 0, 0.1]} renderOrder={24}>
        <sphereGeometry args={[0.35, 20, 14]} />
        {mat}
      </mesh>
    </>
  )
}

function Markers({ markers, onMarker }: { markers: Marker[]; onMarker?: (id: number) => void }) {
  return (
    <>
      {markers.map((m) => (
        <group key={m.id} position={[m.point[0], m.point[1], m.point[2] < -0.1 ? m.point[2] : 0.12]}>
          <mesh
            renderOrder={40}
            onClick={(e) => {
              e.stopPropagation()
              onMarker?.(m.id)
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <sphereGeometry args={[m.active ? 0.14 : 0.1, 16, 12]} />
            <meshBasicMaterial color={m.active ? FX.contact : '#334155'} depthTest={false} transparent />
          </mesh>
          <Html center position={[0, 0.24, 0]} zIndexRange={[30, 0]}>
            <button className={`marker3d${m.active ? ' marker3d--active' : ''}`} onClick={() => onMarker?.(m.id)} aria-label={`Makhraj ${m.id}: ${m.label}`}>
              {m.id}
            </button>
          </Html>
        </group>
      ))}
    </>
  )
}

// ---------- kamera ----------
function CameraRig({ controller, sync }: { controller: ViewerController; sync?: CameraSync }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; k: number } | null>(null)
  const interacting = useRef(false)
  const seen = useRef(-1)

  useEffect(() => {
    return controller.onCamera(() => {
      const p = CAMERA_PRESETS[controller.cameraRequest.preset]
      const c = controls.current
      if (!c) return
      anim.current = {
        from: camera.position.clone(),
        to: new THREE.Vector3(...p.position),
        tFrom: c.target.clone(),
        tTo: new THREE.Vector3(...p.target),
        k: 0,
      }
    })
  }, [controller, camera])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    if (anim.current) {
      const a = anim.current
      a.k = Math.min(1, a.k + dt / 0.6)
      const e = a.k * a.k * (3 - 2 * a.k)
      camera.position.lerpVectors(a.from, a.to, e)
      c.target.lerpVectors(a.tFrom, a.tTo, e)
      c.update()
      if (a.k >= 1) anim.current = null
    }
    if (!sync) return
    if (interacting.current || anim.current) {
      sync.write(controller.id, camera.position, c.target)
      seen.current = sync.version
    } else if (sync.version !== seen.current) {
      seen.current = sync.version
      if (sync.source !== controller.id) {
        camera.position.set(...sync.position)
        c.target.set(...sync.target)
        c.update()
      }
    }
  })

  const p = CAMERA_PRESETS[DEFAULT_PRESET]
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={p.target}
      enableDamping
      dampingFactor={0.12}
      minDistance={0.3}
      maxDistance={30}
      onStart={() => (interacting.current = true)}
      onEnd={() => {
        // biarkan damping selesai lalu berhenti menulis
        setTimeout(() => (interacting.current = false), 400)
      }}
    />
  )
}

function HoverLabel({ hover }: { hover: { text: string; point: [number, number, number] } | null }) {
  if (!hover) return null
  return (
    <Html position={hover.point} center pointerEvents="none" zIndexRange={[50, 0]}>
      <div className="label3d label3d--hover">{hover.text}</div>
    </Html>
  )
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode; url: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn(`[Tajwid 3D] Model ${this.props.url} gagal dimuat, memakai model prosedural.`, err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Model artist (glTF) bila diatur di public/models/model.json, selain itu model prosedural. */
function AnatomySwitch({ onHover }: { onHover: HoverFn }) {
  const [cfg, setCfg] = useState<ModelConfig | null>(null)
  useEffect(() => {
    let alive = true
    void loadModelConfig().then((c) => alive && setCfg(c))
    return () => {
      alive = false
    }
  }, [])
  const procedural = <Anatomy onHover={onHover} />
  if (!cfg?.url) return procedural
  return (
    <ModelBoundary fallback={procedural} url={cfg.url}>
      <Suspense fallback={procedural}>
        <ArtistAnatomy config={cfg} url={cfg.url} onHover={onHover} />
      </Suspense>
    </ModelBoundary>
  )
}

export default function Viewer3D({ spec, controller, sync, hideLabels = false, markers, onMarker }: Viewer3DProps) {
  const [hover, setHover] = useState<{ text: string; point: [number, number, number] } | null>(null)
  const calibrate = useApp((s) => s.calibrate)
  const p = CAMERA_PRESETS[DEFAULT_PRESET]
  return (
    <Canvas
      camera={{ position: p.position, fov: 32, near: 0.05, far: 200 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, stencil: true }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
      }}
      onPointerMissed={() => setHover(null)}
    >
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#ffffff', '#c9b8b0', 0.5]} />
      <directionalLight position={[6, 8, 10]} intensity={1.2} />
      <directionalLight position={[-6, 2, -6]} intensity={0.35} />
      <FrameProvider spec={spec} controller={controller} hideLabels={hideLabels}>
        <AnatomySwitch onHover={hideLabels ? () => undefined : setHover} />
        {calibrate && <Calibration />}
        <Breath />
        <Waves />
        <ContactGlow />
        <Ithbaq />
        <RaiseArrow />
        <GapMarker />
        <InhirafArrow />
        <Istithalah />
        <Vibration />
        <TipFocus />
        {markers && <Markers markers={markers} onMarker={onMarker} />}
      </FrameProvider>
      <HoverLabel hover={hideLabels ? null : hover} />
      <CameraRig controller={controller} sync={sync} />
    </Canvas>
  )
}
