// Profil 2D potongan sagital (setengah kepala). x = ke depan (bibir), y = ke atas, z = ke samping kiri (negatif).
// Bentuk sengaja disederhanakan (PRD: bukan simulasi medis), cukup untuk menunjukkan posisi relatif organ.

export type V2 = [number, number]
export type V3 = [number, number, number]

export type OrganId =
  | 'skin'
  | 'lips'
  | 'incisors'
  | 'molars'
  | 'palate'
  | 'velum'
  | 'tongue'
  | 'throat'
  | 'vocalFolds'
  | 'nasal'
  | 'jaw'

export interface OrganInfo {
  id: OrganId
  label: string
  arabic?: string
  description: string
}

export const ORGANS: OrganInfo[] = [
  { id: 'skin', label: 'Kulit & pipi', description: 'Lapisan luar kepala. Atur transparansinya agar bagian dalam terlihat.' },
  { id: 'lips', label: 'Bibir', arabic: 'الشَّفَتَان', description: 'Bibir atas dan bawah — makhraj ب م و ف.' },
  { id: 'incisors', label: 'Gigi seri', arabic: 'الثَّنَايَا', description: 'Gigi seri atas dan bawah — patokan makhraj ت د ط, ص س ز, ث ذ ظ, ف.' },
  { id: 'molars', label: 'Gigi geraham', arabic: 'الأَضْرَاس', description: 'Gigi geraham (sisi kiri). Tepi lidah menempel ke geraham atas saat mengucap ض.' },
  { id: 'palate', label: 'Gusi & langit-langit keras', arabic: 'اللِّثَة وَالحَنَك', description: 'Gusi atas (depan) dan langit-langit keras.' },
  { id: 'velum', label: 'Langit-langit lunak & anak lidah', arabic: 'الحَنَكُ اللَّيِّن وَاللَّهَاة', description: 'Naik menutup rongga hidung, turun saat ghunnah.' },
  { id: 'tongue', label: 'Lidah', arabic: 'اللِّسَان', description: 'Ujung, tepi, tengah, dan pangkal lidah.' },
  { id: 'throat', label: 'Tenggorokan', arabic: 'الحَلْق', description: 'Dinding faring dan laring: pangkal, tengah, dan ujung tenggorokan.' },
  { id: 'vocalFolds', label: 'Pita suara', description: 'Bergetar pada huruf jahr; menutup rapat pada hamzah.' },
  { id: 'nasal', label: 'Rongga hidung', arabic: 'الخَيْشُوم', description: 'Tempat keluarnya ghunnah (dengung) nun dan mim.' },
  { id: 'jaw', label: 'Rahang bawah', description: 'Membuka sedikit sesuai huruf.' },
]

export const TONGUE_REGION_LABELS: { from: number; to: number; label: string }[] = [
  { from: -9, to: 0.0, label: 'Pangkal lidah' },
  { from: 0.0, to: 1.9, label: 'Tengah lidah' },
  { from: 1.9, to: 2.9, label: 'Tepi & depan lidah' },
  { from: 2.9, to: 9, label: 'Ujung lidah' },
]

export const organLabel = (id: OrganId) => ORGANS.find((o) => o.id === id)!.label

/** Label bagian lidah dari titik (ruang model) yang disentuh/di-hover. */
export const tongueLabel = (pt: { x: number; z: number }) => {
  if (pt.z < -0.6) return 'Tepi lidah'
  return TONGUE_REGION_LABELS.find((r) => pt.x >= r.from && pt.x < r.to)?.label ?? 'Lidah'
}

export const PROFILE = {
  skin: [
    [3.8, 5.2], [4.15, 4.3], [4.05, 3.7], [4.55, 2.9], [4.95, 2.25], [4.75, 1.95], [4.35, 1.88], [4.45, 1.3],
    [4.48, 0.45], [4.42, 0.05], [4.44, -0.35], [4.0, -1.1], [4.15, -1.7], [3.8, -2.3], [3.0, -2.6], [1.0, -2.9],
    [0.4, -3.3], [0.3, -4.4], [-2.6, -4.4], [-2.5, -2.5], [-3.1, -1.0], [-3.6, 1.0], [-3.5, 3.0], [-2.8, 4.6],
    [-1.4, 5.6], [0.6, 6.0], [2.4, 5.8],
  ] as V2[],
  maxilla: [
    [3.28, 0.98], [3.1, 1.05], [2.85, 1.28], [2.2, 1.56], [1.3, 1.66], [0.55, 1.58], [0.55, 1.85], [1.3, 1.95],
    [2.3, 1.98], [3.2, 1.9], [3.75, 1.7], [3.7, 1.25], [3.55, 1.0],
  ] as V2[],
  velum: [
    [0.55, 1.86], [0.0, 1.9], [-0.55, 1.98], [-0.95, 1.95], [-1.08, 1.78], [-1.02, 1.55], [-0.95, 1.36],
    [-0.84, 1.44], [-0.5, 1.5], [0.0, 1.5], [0.55, 1.58],
  ] as V2[],
  velumPivot: [0.55, 1.7] as V2,
  /** Sudut (radian) langit-langit lunak saat turun penuh (ghunnah). */
  velumLowered: 0.38,
  pharynx: [
    [-0.6, 2.75], [-1.0, 2.4], [-1.15, 1.8], [-1.18, 1.0], [-1.2, 0.0], [-1.2, -1.2], [-1.15, -2.2], [-1.12, -3.6],
    [-1.7, -3.6], [-1.75, 0.0], [-1.6, 2.6], [-1.0, 3.1],
  ] as V2[],
  larynx: [[-0.42, -2.0], [-0.38, -3.6], [0.0, -3.6], [0.05, -2.0], [-0.1, -1.9]] as V2[],
  epiglottis: [[-0.45, -2.0], [-0.6, -1.6], [-0.78, -1.15], [-0.86, -1.18], [-0.7, -1.6], [-0.53, -2.05]] as V2[],
  upperIncisor: [[3.3, 1.0], [3.52, 1.0], [3.63, 0.5], [3.62, 0.05], [3.55, -0.07], [3.45, 0.0], [3.32, 0.45]] as V2[],
  lowerIncisor: [[3.28, -1.05], [3.48, -1.05], [3.53, -0.55], [3.5, -0.18], [3.43, -0.1], [3.32, -0.16], [3.26, -0.55]] as V2[],
  upperLip: [[3.62, 1.0], [3.95, 1.02], [4.2, 0.8], [4.38, 0.4], [4.34, 0.1], [4.12, 0.04], [3.9, 0.04], [3.66, 0.12], [3.62, 0.5]] as V2[],
  lowerLip: [[3.56, -0.12], [3.8, -0.08], [4.05, -0.07], [4.28, -0.14], [4.34, -0.45], [4.1, -0.85], [3.58, -1.05], [3.52, -0.6]] as V2[],
  mandible: [
    [3.28, -1.05], [3.55, -1.08], [3.7, -1.5], [3.5, -2.0], [2.6, -2.2], [1.2, -2.1], [0.1, -2.0], [0.2, -1.8],
    [1.2, -1.75], [2.4, -1.4], [3.0, -1.1],
  ] as V2[],
  nasal: [
    [-0.95, 2.0], [-0.6, 2.65], [0.5, 3.0], [2.0, 3.15], [3.3, 2.95], [4.05, 2.35], [4.25, 1.98], [3.75, 1.75],
    [3.2, 1.95], [2.3, 2.02], [1.3, 1.99], [0.55, 1.9], [0.0, 1.95], [-0.55, 2.02],
  ] as V2[],
  /** Gigi geraham kiri: [xMin, xMax] tiap gigi. */
  molarsX: [[1.0, 1.55], [1.6, 2.15], [2.2, 2.75]] as V2[],
  upperMolarY: [0.32, 0.85] as V2,
  lowerMolarY: [-0.35, 0.2] as V2,
  molarZ: [-1.25, -0.85] as V2,
  vocalFolds: { x: [-1.1, -0.44] as V2, y: -2.65 },
}

/** Lebar setengah (arah z) tiap organ untuk ekstrusi 3D. */
export const DEPTH: Record<string, number> = {
  skin: 3.2,
  maxilla: 1.5,
  velum: 0.9,
  pharynx: 1.4,
  larynx: 0.7,
  epiglottis: 0.5,
  incisor: 0.32,
  lip: 1.1,
  mandible: 1.6,
  nasal: 0.7,
  tongue: 1.05,
}

/** Jalur aliran udara (lewat mulut / lewat hidung) pada bidang tengah. */
export const AIR_PATH_ORAL: V2[] = [
  [-0.78, -3.6], [-0.78, -2.65], [-0.85, -1.6], [-0.92, -0.6], [-0.9, 0.4], [-0.75, 1.15], [-0.2, 1.3], [0.7, 1.35],
  [1.6, 1.38], [2.4, 1.18], [2.95, 0.8], [3.25, 0.35], [3.5, 0.0], [3.95, -0.02], [4.4, 0.0], [5.4, 0.0],
]

export const AIR_PATH_NASAL: V2[] = [
  [-0.78, -3.6], [-0.78, -2.65], [-0.85, -1.6], [-0.92, -0.6], [-0.95, 0.5], [-1.0, 1.3], [-0.95, 2.1], [-0.5, 2.5],
  [0.5, 2.65], [1.8, 2.65], [3.0, 2.5], [3.8, 2.15], [4.3, 1.95], [5.1, 1.85],
]

/** Tinggi permukaan bawah langit-langit (mulut) pada posisi x, untuk sorotan ithbaq. */
export function palateYAt(x: number): number {
  const pts: V2[] = [[3.28, 0.98], [3.1, 1.05], [2.85, 1.28], [2.2, 1.56], [1.3, 1.66], [0.55, 1.58], [0.0, 1.5], [-0.5, 1.5]]
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    if (x <= x0 && x >= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
  }
  return x > pts[0][0] ? pts[0][1] : pts[pts.length - 1][1]
}
