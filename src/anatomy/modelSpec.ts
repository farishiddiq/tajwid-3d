// Kontrak antara model glTF dari 3D artist dan engine animasi.
// Engine tetap digerakkan oleh poses.json + frame.ts; model artist hanya "kulit" yang dipasang pada data itu.
// Brief lengkap untuk artist: docs/model-3d-artist.md
import { poseIds, TONGUE_POINTS, type TonguePoint } from './pose'
import type { OrganId } from './shapes'

export type PartRole = 'static' | 'upperLip' | 'lowerLip' | 'jaw' | 'velum' | 'tongue' | 'vocalFolds' | 'skin'

/** Awalan nama node di file glTF → organ & perannya. Akhiran ala Blender (".001", "_L") diabaikan. */
export const NODE_PREFIXES: { prefix: string; organ: OrganId; role: PartRole; required: boolean; desc: string }[] = [
  { prefix: 'incisors_upper', organ: 'incisors', role: 'static', required: true, desc: 'Gigi seri atas' },
  { prefix: 'incisors_lower', organ: 'incisors', role: 'jaw', required: true, desc: 'Gigi seri bawah (ikut rahang)' },
  { prefix: 'molars_upper', organ: 'molars', role: 'static', required: true, desc: 'Gigi geraham atas (sisi kiri)' },
  { prefix: 'molars_lower', organ: 'molars', role: 'jaw', required: false, desc: 'Gigi geraham bawah (ikut rahang)' },
  { prefix: 'lips_upper', organ: 'lips', role: 'upperLip', required: true, desc: 'Bibir atas' },
  { prefix: 'lips_lower', organ: 'lips', role: 'lowerLip', required: true, desc: 'Bibir bawah' },
  { prefix: 'vocal_folds', organ: 'vocalFolds', role: 'vocalFolds', required: true, desc: 'Pita suara (skala z = membuka/menutup)' },
  { prefix: 'palate', organ: 'palate', role: 'static', required: true, desc: 'Gusi + langit-langit keras' },
  { prefix: 'velum', organ: 'velum', role: 'velum', required: true, desc: 'Langit-langit lunak + anak lidah (berputar di titik engsel)' },
  { prefix: 'tongue', organ: 'tongue', role: 'tongue', required: true, desc: 'Lidah (tulang tongue_* atau morph target)' },
  { prefix: 'throat', organ: 'throat', role: 'static', required: true, desc: 'Faring, laring, epiglotis' },
  { prefix: 'nasal', organ: 'nasal', role: 'static', required: true, desc: 'Rongga hidung (sebaiknya transparan)' },
  { prefix: 'jaw', organ: 'jaw', role: 'jaw', required: false, desc: 'Rahang bawah / dasar mulut' },
  { prefix: 'skin', organ: 'skin', role: 'skin', required: true, desc: 'Kulit kepala (opasitas diatur slider)' },
]

/** Nama tulang lidah: tongue_<titik>, satu per titik kontrol di poses.json. */
export const TONGUE_BONES: Record<TonguePoint, string> = Object.fromEntries(TONGUE_POINTS.map((p) => [p, `tongue_${p}`])) as Record<TonguePoint, string>

/** Nama morph target lidah (alternatif tulang): id pose + "raised" untuk tafkhim 'aridh. */
export function morphTargetNames(): string[] {
  return [...poseIds(), 'raised']
}

const sorted = [...NODE_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length)

export function matchNode(name: string) {
  const n = name.toLowerCase()
  return sorted.find((p) => n === p.prefix || n.startsWith(p.prefix + '.') || n.startsWith(p.prefix + '_') || n.startsWith(p.prefix + '-'))
}

export function matchBone(name: string): TonguePoint | undefined {
  const n = name.toLowerCase().replace(/\.\d+$/, '')
  return TONGUE_POINTS.find((p) => TONGUE_BONES[p].toLowerCase() === n)
}

export interface ModelConfig {
  /** path relatif ke situs (mis. "models/head.glb"); null = model prosedural bawaan */
  url: string | null
  /** penyelarasan model artist ke sistem koordinat data (x depan, y atas, bidang potong z = 0) */
  transform: { position: [number, number, number]; rotation: [number, number, number]; scale: number }
  /** cara menggerakkan lidah */
  tongue: 'auto' | 'bones' | 'morphs'
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  url: null,
  transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
  tongue: 'auto',
}

let configPromise: Promise<ModelConfig> | null = null

/** Membaca public/models/model.json. Parameter ?model=<url> (atau ?model=prosedural) menimpanya untuk uji coba. */
export function loadModelConfig(): Promise<ModelConfig> {
  if (!configPromise) {
    configPromise = fetch(`${import.meta.env.BASE_URL}models/model.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((raw: Partial<ModelConfig>) => {
        const cfg: ModelConfig = {
          ...DEFAULT_MODEL_CONFIG,
          ...raw,
          transform: { ...DEFAULT_MODEL_CONFIG.transform, ...(raw.transform ?? {}) },
        }
        const override = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('model') : null
        if (override) cfg.url = override === 'prosedural' ? null : override
        return cfg
      })
  }
  return configPromise
}
