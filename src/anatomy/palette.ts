// Warna organ & "kode visual" fenomena. Warna efek memakai palet Okabe–Ito (aman untuk buta warna),
// dan setiap fenomena juga punya bentuk berbeda (titik, busur, bintang, panah) agar tidak bergantung pada warna saja.
export const ORGAN_COLORS = {
  skin: '#f1c7a9',
  lips: '#cf5866',
  teeth: '#f6f1e4',
  palate: '#e48d96',
  velum: '#dd7482',
  tongue: '#d94e64',
  throat: '#d88791',
  folds: '#f0cf72',
  nasal: '#8ecae6',
  jaw: '#ebbfa9',
}

export const FX = {
  breath: '#56B4E9',
  nasal: '#009E73',
  wave: '#E69F00',
  contact: '#D55E00',
  raise: '#CC79A7',
  vibrate: '#F0E442',
  jet: '#0072B2',
}

export const LEGEND: { key: keyof typeof FX; shape: 'dot' | 'arc' | 'star' | 'arrow' | 'zigzag'; label: string; desc: string }[] = [
  { key: 'contact', shape: 'star', label: 'Titik makhraj', desc: 'Titik bercahaya + label di tempat keluarnya huruf' },
  { key: 'breath', shape: 'dot', label: 'Aliran napas', desc: 'Titik mengalir; berhenti & menumpuk bila napas tertahan (jahr)' },
  { key: 'wave', shape: 'arc', label: 'Gelombang suara', desc: 'Busur mengalir penuh, sebagian, atau terpotong' },
  { key: 'vibrate', shape: 'zigzag', label: 'Getaran pita suara', desc: 'Pita suara bergetar + ikon getar (jahr)' },
  { key: 'nasal', shape: 'dot', label: 'Aliran ke hidung', desc: 'Titik berbelok ke rongga hidung (ghunnah)' },
  { key: 'raise', shape: 'arrow', label: 'Pangkal lidah naik', desc: "Panah ke atas di pangkal lidah (isti'la / tafkhim)" },
]
