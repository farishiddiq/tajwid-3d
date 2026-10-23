// Fallback 2D (potongan samping) untuk perangkat tanpa WebGL atau mode ringan.
// Memakai data anatomi, pose, dan efek yang sama dengan viewer 3D.
import { useEffect, useMemo, useState } from 'react'
import { FX, ORGAN_COLORS } from '../anatomy/palette'
import { tongueOutline } from '../anatomy/pose'
import { palateYAt, PROFILE, type V2 } from '../anatomy/shapes'
import { computeFrame } from '../engine/frame'
import type { AnimSpec } from '../engine/spec'
import { useApp } from '../store'
import type { ViewerController } from './controller'
import type { Marker } from './three/Viewer3D'

const pathOf = (pts: V2[], close = true) => 'M' + pts.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('L') + (close ? 'Z' : '')

function star(cx: number, cy: number, r1: number, r2: number) {
  const pts: V2[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? r1 : r2
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return pathOf(pts)
}

export default function Viewer2D({ spec, controller, hideLabels, markers, onMarker }: { spec: AnimSpec; controller: ViewerController; hideLabels?: boolean; markers?: Marker[]; onMarker?: (id: number) => void }) {
  const [t, setT] = useState(controller.timeline.state.t)
  useEffect(() => controller.timeline.subscribe((s) => setT(s.t)), [controller])
  const organs = useApp((s) => s.organs)
  const skinOpacity = useApp((s) => s.skinOpacity)
  const f = useMemo(() => computeFrame(spec, t), [spec, t])
  const p = f.pose
  const tongue = pathOf(tongueOutline(p, 5))
  const velumDeg = (p.velum * PROFILE.velumLowered * 180) / Math.PI
  const [vx, vy] = PROFILE.velumPivot
  const [cx, cy] = spec.contactPoint
  const g = f.layers.contact ? f.glow : 0
  const fold = PROFILE.vocalFolds

  const ithbaqPath = spec.ithbaq
    ? pathOf(
        Array.from({ length: 16 }, (_, i) => {
          const x = spec.ithbaq![0] + ((spec.ithbaq![1] - spec.ithbaq![0]) * i) / 15
          return [x, palateYAt(x) - 0.07] as V2
        }),
        false,
      )
    : ''

  return (
    <svg className="viewer2d" viewBox="-2.1 -3.5 7.8 7.4" role="img" aria-label={`Ilustrasi 2D potongan samping: ${spec.contactLabel}`}>
      <g transform="scale(1,-1)">
        {organs.skin && skinOpacity > 0.01 && <path d={pathOf(PROFILE.skin)} fill={ORGAN_COLORS.skin} opacity={Math.max(0.25, skinOpacity)} />}
        {organs.nasal && <path d={pathOf(PROFILE.nasal)} fill={ORGAN_COLORS.nasal} opacity={spec.nasal && f.phase !== 'release' ? 0.35 + 0.3 * g : 0.25} />}
        {organs.throat && (
          <>
            <path d={pathOf(PROFILE.pharynx)} fill={ORGAN_COLORS.throat} />
            <path d={pathOf(PROFILE.larynx)} fill={ORGAN_COLORS.throat} />
            <path d={pathOf(PROFILE.epiglottis)} fill={ORGAN_COLORS.velum} />
          </>
        )}
        {organs.vocalFolds && (
          <g>
            <rect x={fold.x[0]} y={fold.y - 0.06} width={fold.x[1] - fold.x[0]} height={0.12} fill={ORGAN_COLORS.folds} opacity={0.4 + 0.6 * f.foldClosure} />
            {f.vibrating && f.layers.folds && (
              <polyline points={Array.from({ length: 9 }, (_, i) => `${fold.x[0] + (i * (fold.x[1] - fold.x[0])) / 8},${fold.y + (i % 2 ? 0.1 : -0.1)}`).join(' ')} fill="none" stroke={FX.vibrate} strokeWidth={0.04} />
            )}
          </g>
        )}
        {organs.palate && <path d={pathOf(PROFILE.maxilla)} fill={ORGAN_COLORS.palate} />}
        {organs.velum && <path d={pathOf(PROFILE.velum)} fill={ORGAN_COLORS.velum} transform={`rotate(${velumDeg} ${vx} ${vy})`} />}
        {organs.incisors && <path d={pathOf(PROFILE.upperIncisor)} fill={ORGAN_COLORS.teeth} stroke="#d8d0c0" strokeWidth={0.015} />}
        {organs.lips && <path d={pathOf(PROFILE.upperLip)} fill={ORGAN_COLORS.lips} transform={`translate(${p.lips.upper[0]} ${p.lips.upper[1]})`} />}
        <g transform={`translate(0 ${-p.jaw})`}>
          {organs.jaw && <path d={pathOf(PROFILE.mandible)} fill={ORGAN_COLORS.jaw} />}
          {organs.incisors && <path d={pathOf(PROFILE.lowerIncisor)} fill={ORGAN_COLORS.teeth} stroke="#d8d0c0" strokeWidth={0.015} />}
        </g>
        {organs.lips && <path d={pathOf(PROFILE.lowerLip)} fill={ORGAN_COLORS.lips} transform={`translate(${p.lips.lower[0]} ${p.lips.lower[1]})`} />}
        {organs.tongue && <path d={tongue} fill={ORGAN_COLORS.tongue} stroke="#a83347" strokeWidth={0.02} />}

        {ithbaqPath && f.phase === 'contact' && f.layers.contact && <path d={ithbaqPath} stroke={FX.contact} strokeWidth={0.09} fill="none" strokeLinecap="round" opacity={0.85 * g} />}
        {spec.tafkhim && f.t > 0.6 && f.phase !== 'release' && f.layers.extras && (
          <g transform={`translate(${p.tongue.dorsumBack[0] - 0.2} ${p.tongue.dorsumBack[1] - 0.75})`} fill={FX.raise}>
            <rect x={-0.035} y={0} width={0.07} height={0.5} />
            <path d="M-0.1,0.5 L0.1,0.5 L0,0.72 Z" />
          </g>
        )}
        {f.breath.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={0.05} fill={f.nasalBreath ? FX.nasal : FX.breath} opacity={b.a} />
        ))}
        {f.jet.map((b, i) => (
          <circle key={`j${i}`} cx={b.x} cy={b.y} r={0.025} fill={FX.jet} opacity={b.a} />
        ))}
        {f.waves.map((w, i) => (
          <path
            key={`w${i}`}
            d="M0.12,-0.16 A0.2,0.2 0 0 1 0.12,0.16"
            transform={`translate(${w.x} ${w.y}) rotate(${(w.angle * 180) / Math.PI}) scale(${w.scale})`}
            stroke={FX.wave}
            strokeWidth={0.05}
            fill="none"
            opacity={w.a}
          />
        ))}
        {g > 0.03 && (
          <>
            {spec.contact === 'none' && <circle cx={cx} cy={cy} r={0.7} fill={FX.contact} opacity={0.15 * g} />}
            <path d={star(cx, cy, 0.16 * (0.6 + 0.4 * g), 0.07)} fill={FX.contact} opacity={Math.min(1, g * 1.2)} />
          </>
        )}
        {f.ripple > 0 && f.ripple < 1 && <circle cx={cx} cy={cy} r={0.1 + f.ripple * 0.35} fill="none" stroke={FX.contact} strokeWidth={0.03} opacity={1 - f.ripple} />}
        {f.istithalahX !== null && <circle cx={f.istithalahX} cy={palateYAt(f.istithalahX) - 0.35} r={0.09} fill={FX.contact} />}
        {markers?.map((m) => (
          <circle key={m.id} cx={m.point[0]} cy={m.point[1]} r={m.active ? 0.14 : 0.1} fill={m.active ? FX.contact : '#334155'} style={{ cursor: 'pointer' }} onClick={() => onMarker?.(m.id)} />
        ))}
      </g>
      {markers?.map((m) => (
        <text key={`t${m.id}`} x={m.point[0]} y={-m.point[1] - 0.18} className="svg-marker-label" textAnchor="middle" onClick={() => onMarker?.(m.id)}>
          {m.id}
        </text>
      ))}
      {!hideLabels && g > 0.5 && (
        <text x={cx} y={-cy - 0.32} className="svg-label" textAnchor="middle">
          {spec.contactLabel}
        </text>
      )}
    </svg>
  )
}
