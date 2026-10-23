// Overlay kalibrasi: menampilkan titik data (kontrol lidah, makhraj, jalur udara, engsel velum) di atas model,
// untuk memeriksa apakah model artist sudah sejajar dengan data pose & efek.
import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { tonguePoints, TONGUE_POINTS } from '../../anatomy/pose'
import { AIR_PATH_NASAL, AIR_PATH_ORAL, PROFILE } from '../../anatomy/shapes'
import { makhrajPoints } from '../../content'
import { useFrameCtx } from './frameCtx'

const Z = 0.2
const mat = (color: string) => <meshBasicMaterial color={color} depthTest={false} transparent />

export default function Calibration() {
  const { get } = useFrameCtx()
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const pts = tonguePoints(get().pose)
    pts.forEach(([x, y], i) => refs.current[i]?.position.set(x, y, Z))
  })
  return (
    <group renderOrder={50}>
      <Line points={AIR_PATH_ORAL.map(([x, y]) => [x, y, Z] as [number, number, number])} color="#0072B2" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.08} depthTest={false} />
      <Line points={AIR_PATH_NASAL.map(([x, y]) => [x, y, Z] as [number, number, number])} color="#009E73" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.08} depthTest={false} />
      {TONGUE_POINTS.map((name, i) => (
        <mesh key={name} ref={(el) => void (refs.current[i] = el)} renderOrder={51}>
          <sphereGeometry args={[0.055, 10, 8]} />
          {mat('#00e5ff')}
        </mesh>
      ))}
      {makhrajPoints.map((m) => (
        <mesh key={m.id} position={[m.point[0], m.point[1], m.point[2] < -0.1 ? m.point[2] : Z]} renderOrder={51}>
          <octahedronGeometry args={[0.07]} />
          {mat('#D55E00')}
        </mesh>
      ))}
      <mesh position={[PROFILE.velumPivot[0], PROFILE.velumPivot[1], Z]} renderOrder={51}>
        <torusGeometry args={[0.09, 0.02, 6, 20]} />
        {mat('#CC79A7')}
      </mesh>
      <Html position={[-2, 3.2, Z]} pointerEvents="none">
        <div className="label3d" style={{ whiteSpace: 'normal', width: 220 }}>
          Kalibrasi: ● titik lidah · ◆ makhraj · ○ engsel velum · garis jalur udara
        </div>
      </Html>
    </group>
  )
}
