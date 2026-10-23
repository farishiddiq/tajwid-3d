import { applyRaise, getPoseDef, type ContactType, type Pose } from '../anatomy/pose'
import type { V2, V3 } from '../anatomy/shapes'
import { getLetter, getMakhraj, isTafkhim, letterHasSifat, type Focus, type Variant } from '../content'

/** Semua yang perlu diketahui renderer (3D maupun 2D) untuk menganimasikan satu huruf. */
export interface AnimSpec {
  key: string
  letterId: string
  variant?: Variant
  makhrajId: number
  /** id pose di poses.json (dipakai sebagai nama morph target model artist) */
  poseId: string
  /** 0..1 — tafkhim 'aridh (morph target "raised") */
  raise: number
  target: Pose
  contact: ContactType
  contactPoint: V3
  contactLabel: string
  ithbaq: V2 | null
  nasal: boolean
  lateral: boolean
  hams: boolean
  sound: 'syiddah' | 'tawassuth' | 'rakhawah'
  istila: boolean
  tafkhim: boolean
  qalqalah: boolean
  shafir: boolean
  tafasysyi: boolean
  istithalah: boolean
  takrir: boolean
  inhiraf: boolean
  lin: boolean
  idzlaq: boolean
  glottalStop: boolean
  focus?: Focus
}

export function buildSpec(letterId: string, opts: { variant?: Variant; focus?: Focus } = {}): AnimSpec {
  const letter = getLetter(letterId)
  if (!letter) throw new Error(`Huruf tidak dikenal: ${letterId}`)
  const def = getPoseDef(letter.pose)
  const has = (s: string) => letterHasSifat(letterId, s)
  const istila = has('istila')
  const tafkhim = isTafkhim(letterId, opts.variant)
  // Tafkhim 'aridh (ra, lam jalalah, alif): angkat pangkal lidah. Huruf isti'la sudah punya pose sendiri.
  const raise = !istila && tafkhim ? 1 : 0
  const target = raise ? applyRaise(def.pose, raise) : def.pose
  const makhraj = getMakhraj(letter.makhraj)!
  return {
    key: `${letterId}:${opts.variant ?? ''}:${opts.focus ?? ''}`,
    letterId,
    variant: opts.variant,
    makhrajId: letter.makhraj,
    poseId: letter.pose,
    raise,
    target,
    contact: def.contact,
    contactPoint: makhraj.point,
    contactLabel: makhraj.name,
    ithbaq: def.ithbaq,
    nasal: target.velum > 0.5,
    lateral: def.lateralFlow || def.contact === 'lateral',
    hams: has('hams'),
    sound: has('syiddah') ? 'syiddah' : has('tawassuth') ? 'tawassuth' : 'rakhawah',
    istila,
    tafkhim,
    qalqalah: has('qalqalah'),
    shafir: has('shafir'),
    tafasysyi: has('tafasysyi'),
    istithalah: has('istithalah'),
    takrir: has('takrir'),
    inhiraf: has('inhiraf'),
    lin: has('lin'),
    idzlaq: has('idzlaq'),
    glottalStop: letterId === 'hamzah',
    focus: opts.focus,
  }
}

/** Deskripsi teks animasi (aksesibilitas: teks alternatif). */
export function describeSpec(spec: AnimSpec): string {
  const parts: string[] = []
  const contactText: Record<ContactType, string> = {
    closure: 'titik sentuh menutup rapat',
    narrow: 'terbentuk celah sempit',
    lateral: 'tepi lidah menempel ke gigi geraham atas',
    none: 'tidak ada titik sentuh; udara mengalir bebas',
  }
  parts.push(`Makhraj: ${spec.contactLabel}; ${contactText[spec.contact]}.`)
  parts.push(spec.hams ? 'Napas terus mengalir keluar (hams).' : 'Napas tertahan dan pita suara bergetar (jahr).')
  parts.push(
    spec.sound === 'syiddah'
      ? 'Gelombang suara terhenti di titik sentuh (syiddah).'
      : spec.sound === 'tawassuth'
        ? 'Gelombang suara mengalir sebagian (tawassuth).'
        : 'Gelombang suara mengalir penuh (rakhawah).',
  )
  if (spec.tafkhim) parts.push('Pangkal lidah terangkat sehingga suara tebal.')
  if (spec.ithbaq) parts.push('Permukaan lidah melekat luas ke langit-langit (ithbaq).')
  if (spec.nasal) parts.push('Langit-langit lunak turun; suara berbelok ke rongga hidung (ghunnah).')
  if (spec.qalqalah) parts.push('Saat dilepas, titik sentuh memantul (qalqalah).')
  if (spec.shafir) parts.push('Udara keluar sempit dan cepat di gigi depan (desis).')
  if (spec.tafasysyi) parts.push('Udara menyebar di rongga mulut.')
  if (spec.istithalah) parts.push('Suara memanjang sepanjang tepi lidah.')
  if (spec.inhiraf) parts.push('Aliran udara berbelok di sisi lidah.')
  if (spec.takrir) parts.push('Ujung lidah bergetar sangat ringan.')
  return parts.join(' ')
}
