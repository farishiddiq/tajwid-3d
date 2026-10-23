import posesData from '../content/poses.json'
import type { V2 } from './shapes'

export const TONGUE_POINTS = [
  'root', 'backLow', 'backMid', 'backTop', 'dorsumBack', 'dorsumMid', 'dorsumFront', 'blade', 'tip', 'underTip', 'under', 'floorFront', 'floor',
] as const
export type TonguePoint = (typeof TONGUE_POINTS)[number]

export type ContactType = 'closure' | 'narrow' | 'lateral' | 'none'

export interface Pose {
  tongue: Record<TonguePoint, V2>
  lips: { upper: V2; lower: V2; round: number }
  jaw: number
  velum: number
  /** 0 = terbuka, 0.6 = menyempit, 1 = tertutup rapat */
  glottis: number
}

interface RawPose {
  tongue?: Partial<Record<TonguePoint, V2>>
  lips?: { upper: V2; lower: V2; round: number }
  jaw?: number
  velum?: number
  glottis?: 'open' | 'narrow' | 'closed'
  contact?: ContactType
  ithbaq?: V2
  lateralFlow?: boolean
}

const GLOTTIS = { open: 0, narrow: 0.6, closed: 1 }
const raw = posesData as unknown as {
  neutral: RawPose & { tongue: Record<TonguePoint, V2> }
  raised: Partial<Record<TonguePoint, V2>>
  poses: Record<string, RawPose>
}

function clonePose(p: Pose): Pose {
  return {
    tongue: Object.fromEntries(TONGUE_POINTS.map((k) => [k, [...p.tongue[k]] as V2])) as Pose['tongue'],
    lips: { upper: [...p.lips.upper] as V2, lower: [...p.lips.lower] as V2, round: p.lips.round },
    jaw: p.jaw,
    velum: p.velum,
    glottis: p.glottis,
  }
}

export const NEUTRAL: Pose = {
  tongue: raw.neutral.tongue,
  lips: raw.neutral.lips!,
  jaw: raw.neutral.jaw ?? 0,
  velum: raw.neutral.velum ?? 0,
  glottis: GLOTTIS[raw.neutral.glottis ?? 'open'],
}

export interface PoseDef {
  pose: Pose
  contact: ContactType
  ithbaq: V2 | null
  lateralFlow: boolean
}

export function poseIds(): string[] {
  return Object.keys(raw.poses)
}

export function getPoseDef(id: string): PoseDef {
  const r = raw.poses[id]
  if (!r) throw new Error(`Pose tidak dikenal: ${id}`)
  const pose = clonePose(NEUTRAL)
  if (r.tongue) for (const [k, v] of Object.entries(r.tongue)) pose.tongue[k as TonguePoint] = [...(v as V2)] as V2
  if (r.lips) pose.lips = { upper: [...r.lips.upper] as V2, lower: [...r.lips.lower] as V2, round: r.lips.round }
  if (r.jaw !== undefined) pose.jaw = r.jaw
  if (r.velum !== undefined) pose.velum = r.velum
  if (r.glottis) pose.glottis = GLOTTIS[r.glottis]
  return { pose, contact: r.contact ?? 'none', ithbaq: r.ithbaq ?? null, lateralFlow: !!r.lateralFlow }
}

/** Mengangkat pangkal lidah (tafkhim 'aridh) sebesar amount (0..1). */
export function applyRaise(p: Pose, amount: number): Pose {
  if (amount <= 0) return p
  const out = clonePose(p)
  for (const [k, target] of Object.entries(raw.raised)) {
    if (k.startsWith('_')) continue
    const cur = out.tongue[k as TonguePoint]
    const t = target as V2
    // hanya menaikkan, tidak pernah menurunkan titik yang sudah lebih tinggi
    if (t[1] > cur[1]) out.tongue[k as TonguePoint] = [cur[0] + (t[0] - cur[0]) * amount, cur[1] + (t[1] - cur[1]) * amount]
  }
  return out
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp2 = (a: V2, b: V2, t: number): V2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  return {
    tongue: Object.fromEntries(TONGUE_POINTS.map((k) => [k, lerp2(a.tongue[k], b.tongue[k], t)])) as Pose['tongue'],
    lips: { upper: lerp2(a.lips.upper, b.lips.upper, t), lower: lerp2(a.lips.lower, b.lips.lower, t), round: lerp(a.lips.round, b.lips.round, t) },
    jaw: lerp(a.jaw, b.jaw, t),
    velum: lerp(a.velum, b.velum, t),
    glottis: lerp(a.glottis, b.glottis, t),
  }
}

const JAW_AFFECTED: Partial<Record<TonguePoint, number>> = { floor: 1, floorFront: 1, under: 0.9, underTip: 0.6 }

/** 13 titik kontrol lidah (urutan TONGUE_POINTS), sudah memperhitungkan rahang. Dipakai juga untuk tulang lidah model artist. */
export function tonguePoints(p: Pose): V2[] {
  return TONGUE_POINTS.map((k) => {
    const [x, y] = p.tongue[k]
    return [x, y - (JAW_AFFECTED[k] ?? 0) * p.jaw] as V2
  })
}

/** Kontur tertutup lidah (bidang tengah), sudah memperhitungkan rahang. */
export function tongueOutline(p: Pose, samplesPerSegment = 6): V2[] {
  return catmullRomClosed(tonguePoints(p), samplesPerSegment)
}

/** Catmull-Rom sentripetal tertutup. */
export function catmullRomClosed(pts: V2[], samples: number): V2[] {
  const n = pts.length
  const out: V2[] = []
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const t01 = Math.pow(dist(p0, p1), 0.5) || 1e-4
    const t12 = Math.pow(dist(p1, p2), 0.5) || 1e-4
    const t23 = Math.pow(dist(p2, p3), 0.5) || 1e-4
    for (let s = 0; s < samples; s++) {
      const t = s / samples
      out.push(centripetal(p0, p1, p2, p3, t01, t12, t23, t))
    }
  }
  return out
}

function dist(a: V2, b: V2) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function centripetal(p0: V2, p1: V2, p2: V2, p3: V2, t01: number, t12: number, t23: number, t: number): V2 {
  const res: V2 = [0, 0]
  for (let d = 0; d < 2; d++) {
    const m1 = p2[d] - p1[d] + t12 * ((p1[d] - p0[d]) / t01 - (p2[d] - p0[d]) / (t01 + t12))
    const m2 = p2[d] - p1[d] + t12 * ((p3[d] - p2[d]) / t23 - (p3[d] - p1[d]) / (t12 + t23))
    const a = 2 * p1[d] - 2 * p2[d] + m1 + m2
    const b = -3 * p1[d] + 3 * p2[d] - 2 * m1 - m2
    res[d] = a * t * t * t + b * t * t + m1 * t + p1[d]
  }
  return res
}
