import lettersData from './letters.json'
import makhrajData from './makhraj.json'
import sifatData from './sifat.json'
import tafkhimData from './tafkhim.json'
import compareData from './compare.json'
import configData from './config.json'

export type Harakat = 'sukun' | 'fathah' | 'kasrah' | 'dhammah'
export const HARAKAT: { id: Harakat; label: string; mark: string }[] = [
  { id: 'sukun', label: 'Sukun (tes makhraj)', mark: 'ْ' },
  { id: 'fathah', label: 'Fathah', mark: 'َ' },
  { id: 'kasrah', label: 'Kasrah', mark: 'ِ' },
  { id: 'dhammah', label: 'Dhammah', mark: 'ُ' },
]

export type Variant = 'tafkhim' | 'tarqiq'

export interface Letter {
  id: string
  char: string
  name: string
  translit: string
  test: string
  forms?: Partial<Record<Exclude<Harakat, 'sukun'>, string>>
  makhraj: number
  pose: string
  mistakes: string[]
  confusedWith: string[]
  mad?: boolean
}

export interface Area {
  id: string
  name: string
  arabic: string
  meaning: string
  description: string
}

export interface MakhrajPoint {
  id: number
  area: string
  name: string
  arabic: string
  letters: string[]
  point: [number, number, number]
  animation: string
  ghunnah?: boolean
}

export interface Sifat {
  id: string
  name: string
  arabic: string
  group: 'paired' | 'single'
  pair?: string
  pairSet?: string
  meaning: string
  letters?: string[]
  complementOf?: string | string[]
  mnemonic?: string
  visual: string
  focus: Focus
  demo: string[]
  explanation: string
  condition?: string
}

export type Focus = 'breath' | 'sound' | 'tongue' | 'tip' | 'shafir' | 'qalqalah' | 'lin' | 'inhiraf' | 'takrir' | 'tafasysyi' | 'istithalah'

export interface Example { arabic: string; ref: string }
export interface Rule { rule: string; examples: Example[]; note?: string }

export interface ComparePair {
  id: string
  title: string
  a: { letter: string; variant?: Variant; label?: string }
  b: { letter: string; variant?: Variant; label?: string }
  explanation: string
}

export const letters = lettersData as Letter[]
export const consonants = letters.filter((l) => !l.mad)
export const madLetters = letters.filter((l) => l.mad)
export const areas = makhrajData.areas as Area[]
export const makhrajPoints = makhrajData.points as MakhrajPoint[]
export const makhrajNote = makhrajData.note
export const sifatList = sifatData as Sifat[]
export const tafkhim = tafkhimData
export const comparePairs = compareData as ComparePair[]
export const config = configData

const letterMap = new Map(letters.map((l) => [l.id, l]))
const sifatMap = new Map(sifatList.map((s) => [s.id, s]))

export function getLetter(id: string): Letter | undefined {
  return letterMap.get(id)
}

export function getSifat(id: string): Sifat | undefined {
  return sifatMap.get(id)
}

export function getMakhraj(id: number): MakhrajPoint | undefined {
  return makhrajPoints.find((m) => m.id === id)
}

export function getArea(id: string): Area | undefined {
  return areas.find((a) => a.id === id)
}

export function lettersOfMakhraj(id: number): Letter[] {
  return (getMakhraj(id)?.letters ?? []).map((l) => letterMap.get(l)!).filter(Boolean)
}

export function makhrajOfArea(areaId: string): MakhrajPoint[] {
  return makhrajPoints.filter((m) => m.area === areaId)
}

const sifatLetterCache = new Map<string, Set<string>>()

/** Huruf yang memiliki sifat ini. Sifat "selain ..." dihitung sebagai komplemen. */
export function lettersWithSifat(sifatId: string): Set<string> {
  const cached = sifatLetterCache.get(sifatId)
  if (cached) return cached
  const s = sifatMap.get(sifatId)
  let result = new Set<string>()
  if (s?.letters) result = new Set(s.letters)
  else if (s?.complementOf) {
    const excluded = new Set<string>()
    for (const c of ([] as string[]).concat(s.complementOf)) lettersWithSifat(c).forEach((l) => excluded.add(l))
    result = new Set(letters.map((l) => l.id).filter((id) => !excluded.has(id)))
  }
  sifatLetterCache.set(sifatId, result)
  return result
}

export function letterHasSifat(letterId: string, sifatId: string): boolean {
  return lettersWithSifat(sifatId).has(letterId)
}

/** Semua sifat lazimah huruf: lima sifat berpasangan dulu, lalu sifat tunggal. */
export function sifatOfLetter(letterId: string): Sifat[] {
  const paired = sifatList.filter((s) => s.group === 'paired' && letterHasSifat(letterId, s.id))
  const single = sifatList.filter((s) => s.group === 'single' && letterHasSifat(letterId, s.id))
  return [...paired, ...single]
}

export function harakatText(letter: Letter, h: Harakat): string {
  if (h === 'sukun' || letter.mad) return letter.test
  const form = letter.forms?.[h]
  if (form) return form
  return letter.char + HARAKAT.find((x) => x.id === h)!.mark
}

/** Apakah huruf diucapkan tebal pada animasi default (bentuk tes sukun). */
export function isTafkhim(letterId: string, variant?: Variant): boolean {
  if (variant) return variant === 'tafkhim'
  if (letterHasSifat(letterId, 'istila')) return true
  // أَرْ: ra sukun didahului fathah → tebal
  return letterId === 'ra'
}

export function neighbours(letterId: string): { prev?: Letter; next?: Letter } {
  const i = letters.findIndex((l) => l.id === letterId)
  return { prev: letters[i - 1], next: letters[i + 1] }
}
