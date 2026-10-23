// Menghitung keadaan animasi pada waktu t secara deterministik (bisa digeser maju/mundur dan diperlambat).
// Hasilnya dipakai oleh renderer 3D maupun 2D.
import { blendPose, NEUTRAL, type Pose } from '../anatomy/pose'
import { AIR_PATH_NASAL, AIR_PATH_ORAL, type V2 } from '../anatomy/shapes'
import type { AnimSpec } from './spec'
import { DURATION, PHASES, phaseAt, type PhaseId } from './timeline'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const ease = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

export interface Particle { x: number; y: number; z: number; a: number }
export interface Wave { x: number; y: number; angle: number; a: number; scale: number }

export interface Layers {
  breath: boolean
  sound: boolean
  folds: boolean
  contact: boolean
  extras: boolean
}

export interface Frame {
  t: number
  phase: PhaseId
  pose: Pose
  /** bobot neutral → target (termasuk pantulan qalqalah); dipakai untuk morph target model artist */
  w: number
  /** 0..1 intensitas cahaya titik makhraj */
  glow: number
  breath: Particle[]
  nasalBreath: boolean
  waves: Wave[]
  jet: Particle[]
  foldClosure: number
  vibrating: boolean
  ripple: number
  istithalahX: number | null
  airActive: boolean
  layers: Layers
}

// ---------- jalur ----------
class Path {
  pts: V2[]
  cum: number[]
  length: number
  constructor(pts: V2[]) {
    this.pts = pts
    this.cum = [0]
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    this.length = this.cum[this.cum.length - 1]
  }
  at(s: number): { p: V2; angle: number } {
    const d = clamp01(s) * this.length
    let i = 1
    while (i < this.cum.length - 1 && this.cum[i] < d) i++
    const seg = this.cum[i] - this.cum[i - 1] || 1
    const u = (d - this.cum[i - 1]) / seg
    const a = this.pts[i - 1]
    const b = this.pts[i]
    return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) }
  }
  nearest(q: V2): number {
    let best = 0
    let bestD = Infinity
    for (let k = 0; k <= 200; k++) {
      const s = k / 200
      const { p } = this.at(s)
      const d = Math.hypot(p[0] - q[0], p[1] - q[1])
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    return best
  }
}

export const ORAL = new Path(AIR_PATH_ORAL)
export const NASAL = new Path(AIR_PATH_NASAL)

/** Udara mulai mengalir saat vokal hamzah pembuka (أَ) diucapkan. */
const AIR_START = 0.4
const N_BREATH = 90
const N_WAVES = 7
const N_JET = 24
// pseudo-acak deterministik
const rand = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function layersFor(spec: AnimSpec): Layers {
  const all = { breath: true, sound: true, folds: true, contact: true, extras: true }
  switch (spec.focus) {
    case 'breath':
      return { ...all, sound: false, extras: false }
    case 'sound':
      return { ...all, breath: false, folds: false, extras: false }
    case 'tongue':
    case 'tip':
      return { ...all, breath: false, sound: false, folds: false }
    case undefined:
      return all
    default:
      return { ...all, sound: false }
  }
}

const contactCache = new Map<string, { sOral: number; sNasal: number }>()
function contactS(spec: AnimSpec) {
  let c = contactCache.get(spec.key)
  if (!c) {
    const p: V2 = [spec.contactPoint[0], spec.contactPoint[1]]
    c = { sOral: ORAL.nearest(p), sNasal: NASAL.nearest(p) }
    contactCache.set(spec.key, c)
  }
  return c
}

export function computeFrame(spec: AnimSpec, t: number): Frame {
  const phase = phaseAt(t).id
  const [prep, contact, release] = PHASES
  const layers = layersFor(spec)

  // ---- bobot pose: persiapan → sentuh → lepas ----
  let w: number
  if (t < prep.end) w = ease(t / prep.end) * 0.86
  else if (t < contact.end) w = 0.86 + 0.14 * ease((t - contact.start) / 0.18)
  else {
    const u = (t - release.start) / (release.end - release.start)
    w = 1 - ease(u * 1.15)
    if (spec.qalqalah) w += 0.32 * Math.sin(clamp01(u) * Math.PI * 2.2) * Math.exp(-3 * u)
  }
  const pose = blendPose(NEUTRAL, spec.target, w)

  // takrir: getaran ujung lidah sangat ringan di awal kontak
  if (spec.takrir && phase === 'contact') {
    const u = (t - contact.start) / 0.45
    if (u < 1) pose.tongue.tip = [pose.tongue.tip[0], pose.tongue.tip[1] - 0.06 * Math.abs(Math.sin(u * Math.PI * 3))]
  }

  // ---- pita suara ----
  const inSound = t >= contact.start && t < release.start + 0.35
  let foldClosure = 0.25
  let vibrating = false
  if (spec.glottalStop) {
    foldClosure = phase === 'contact' ? 1 : phase === 'release' ? 1 - ease((t - release.start) / 0.2) : 0.25 + 0.75 * ease((t - 0.6) / 0.4)
  } else if (!spec.hams && inSound) {
    vibrating = true
    foldClosure = 0.7 + 0.3 * Math.sin(t * 2 * Math.PI * 9) // 9 Hz visual (ikut melambat)
  } else if (spec.hams && inSound) {
    foldClosure = spec.letterId === 'ha' ? 0.45 : 0.15
  }

  const glow = phase === 'prep' ? ease((t - 0.65) / 0.35) * 0.6 : phase === 'contact' ? 1 : 1 - ease((t - release.start) / 0.6)
  const airActive = t >= AIR_START
  const { sOral, sNasal } = contactS(spec)
  const nasalNow = spec.nasal && phase !== 'release'
  const path = nasalNow ? NASAL : ORAL
  const sContact = sOral
  // pada huruf jahr napas berhenti & menumpuk di titik sentuh; hams terus keluar
  const blockedBreath = !spec.hams && !nasalNow && phase === 'contact' && spec.contact !== 'none'

  // ---- partikel napas ----
  const breath: Particle[] = []
  if (airActive && layers.breath) {
    const adv = (t - AIR_START) * (spec.lin || spec.contact === 'none' ? 0.55 : 0.8)
    for (let i = 0; i < N_BREATH; i++) {
      const o = rand(i)
      if (adv < o) continue
      let s = (adv - o) % 1
      let jy = (rand(i, 1) - 0.5) * 0.18
      let jz = 0.08 + rand(i, 2) * 0.05
      if (blockedBreath && s > sContact - 0.01) s = sContact - 0.012 - rand(i, 4) * 0.05 // menumpuk
      const { p } = path.at(s)
      if (spec.tafasysyi && !nasalNow && s > 0.55 && s < 0.85) {
        const spread = Math.sin(((s - 0.55) / 0.3) * Math.PI)
        jy += (rand(i, 5) - 0.5) * 0.9 * spread
        jz -= rand(i, 6) * 0.9 * spread
      }
      if (spec.lateral && !nasalNow && Math.abs(s - sOral) < 0.08) jz -= 0.8 * (1 - Math.abs(s - sOral) / 0.08)
      const fade = s > 0.93 ? (1 - s) / 0.07 : 1
      breath.push({ x: p[0], y: p[1] + jy, z: jz, a: 0.9 * fade })
    }
  }

  // ---- gelombang suara ----
  const waves: Wave[] = []
  if (airActive && layers.sound && t < DURATION - 0.1) {
    const nasal = spec.nasal && phase !== 'release'
    const wpath = nasal ? NASAL : ORAL
    const sC = nasal ? sNasal : sOral
    const adv = (t - AIR_START) * 0.5
    for (let k = 0; k < N_WAVES; k++) {
      const o = k / N_WAVES
      if (adv < o) continue
      const s = (adv - o) % 1
      const { p, angle } = wpath.at(s)
      let a = 0.95
      let scale = 1
      if (!nasal && phase === 'contact' && s > sC) {
        if (spec.sound === 'syiddah') continue
        if (spec.sound === 'tawassuth') {
          a = 0.4
          scale = 0.6
        }
      }
      if (s > 0.94) a *= (1 - s) / 0.06
      waves.push({ x: p[0], y: p[1], angle, a, scale })
    }
  }

  // ---- desis (shafir) ----
  const jet: Particle[] = []
  if (spec.shafir && layers.extras !== false && (phase === 'contact' || (phase === 'release' && t < release.start + 0.3))) {
    const e = t - contact.start
    for (let i = 0; i < N_JET; i++) {
      const u = (rand(i, 7) + e * 2.2) % 1
      jet.push({ x: spec.contactPoint[0] + 0.05 + u * 1.5, y: spec.contactPoint[1] + (rand(i, 8) - 0.5) * 0.05 * (1 + u), z: 0.12, a: 1 - u })
    }
  }

  const ripple = spec.qalqalah && phase === 'release' ? clamp01((t - release.start) / 0.5) : 0
  const istithalahX = spec.istithalah && phase === 'contact' ? 0.8 + 2.0 * ((t - contact.start) / (contact.end - contact.start)) : null

  return {
    t, phase, pose, w, glow, breath, nasalBreath: nasalNow, waves, jet, foldClosure, vibrating, ripple, istithalahX, airActive, layers,
  }
}
