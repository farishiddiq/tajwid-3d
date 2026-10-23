// Uji konsistensi konten terhadap tabel PRD. Gagal di sini = ada data yang tidak sinkron sebelum review ustadz.
import { describe, expect, it } from 'vitest'
import { getPoseDef, poseIds } from '../anatomy/pose'
import { buildSpec } from '../engine/spec'
import { computeFrame } from '../engine/frame'
import { DURATION } from '../engine/timeline'
import { comparePairs, consonants, getLetter, letters, lettersWithSifat, madLetters, makhrajPoints, sifatList, sifatOfLetter } from '.'

const chars = (sid: string) => [...lettersWithSifat(sid)].map((id) => getLetter(id)!.char).sort().join('')
const sorted = (s: string) => [...s.replace(/\s/g, '')].sort().join('')

describe('huruf', () => {
  it('28 huruf hijaiyah + 3 huruf mad', () => {
    expect(consonants).toHaveLength(28)
    expect(madLetters).toHaveLength(3)
    expect(new Set(letters.map((l) => l.id)).size).toBe(letters.length)
  })
  it('setiap huruf punya pose valid dan referensi tertukar yang ada', () => {
    const ids = new Set(poseIds())
    for (const l of letters) {
      expect(ids.has(l.pose), l.id).toBe(true)
      for (const c of l.confusedWith) expect(getLetter(c), `${l.id} → ${c}`).toBeDefined()
      expect(l.mistakes.length).toBeGreaterThan(0)
    }
  })
})

describe('makhraj', () => {
  it('17 makhraj dalam 5 area', () => {
    expect(makhrajPoints).toHaveLength(17)
    expect(new Set(makhrajPoints.map((m) => m.area)).size).toBe(5)
  })
  it('makhraj setiap huruf sama dengan daftar huruf di makhraj', () => {
    for (const m of makhrajPoints.filter((m) => !m.ghunnah)) for (const id of m.letters) expect(getLetter(id)!.makhraj, id).toBe(m.id)
    for (const l of letters) expect(makhrajPoints.find((m) => m.id === l.makhraj)!.letters).toContain(l.id)
  })
  it('sesuai tabel PRD', () => {
    const table: Record<number, string> = { 2: 'ءه', 3: 'عح', 4: 'غخ', 5: 'ق', 6: 'ك', 7: 'جشي', 8: 'ض', 9: 'ل', 10: 'ن', 11: 'ر', 12: 'تدط', 13: 'صسز', 14: 'ثذظ', 15: 'ف', 16: 'بمو' }
    for (const [id, expected] of Object.entries(table)) {
      const got = makhrajPoints.find((m) => m.id === Number(id))!.letters.map((l) => getLetter(l)!.char).join('')
      expect(sorted(got), `makhraj ${id}`).toBe(sorted(expected))
    }
  })
})

describe('sifat', () => {
  it('kelompok huruf sesuai tabel PRD', () => {
    expect(chars('hams')).toBe(sorted('فحثهشخصسكت'))
    expect(chars('syiddah')).toBe(sorted('ءجدقطبكت'))
    expect(chars('tawassuth')).toBe(sorted('لنعمر'))
    expect(chars('istila')).toBe(sorted('خصضغطقظ'))
    expect(chars('ithbaq')).toBe(sorted('صضطظ'))
    expect(chars('idzlaq')).toBe(sorted('فرمنلب'))
    expect(chars('shafir')).toBe(sorted('صسز'))
    expect(chars('qalqalah')).toBe(sorted('قطبجد'))
    expect(chars('inhiraf')).toBe(sorted('لر'))
    expect(chars('takrir')).toBe('ر')
    expect(chars('tafasysyi')).toBe('ش')
    expect(chars('istithalah')).toBe('ض')
  })
  it('setiap huruf punya tepat satu sifat dari tiap kelompok berpasangan', () => {
    const sets = new Map<string, string[]>()
    for (const s of sifatList.filter((s) => s.group === 'paired')) sets.set(s.pairSet!, [...(sets.get(s.pairSet!) ?? []), s.id])
    expect(sets.size).toBe(5)
    for (const l of letters)
      for (const [set, ids] of sets) {
        const n = ids.filter((id) => lettersWithSifat(id).has(l.id)).length
        expect(n, `${l.id} / ${set}`).toBe(1)
      }
  })
  it('huruf qalqalah = syiddah ∩ jahr (kecuali kaf/ta yang hams, hamzah)', () => {
    const q = lettersWithSifat('qalqalah')
    for (const id of q) {
      expect(lettersWithSifat('syiddah').has(id)).toBe(true)
      expect(lettersWithSifat('jahr').has(id)).toBe(true)
    }
  })
  it('sifat ra mencakup takrir & inhiraf', () => {
    expect(sifatOfLetter('ra').map((s) => s.id)).toEqual(expect.arrayContaining(['jahr', 'tawassuth', 'istifal', 'infitah', 'idzlaq', 'inhiraf', 'takrir']))
  })
})

describe('animasi', () => {
  it('setiap huruf dapat dianimasikan di seluruh timeline', () => {
    for (const l of letters) {
      const spec = buildSpec(l.id)
      for (let t = 0; t <= DURATION; t += 0.2) {
        const f = computeFrame(spec, t)
        for (const p of Object.values(f.pose.tongue)) expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true)
      }
    }
  })
  it('huruf jahr: pita suara bergetar saat kontak; hams tidak', () => {
    expect(computeFrame(buildSpec('zai'), 1.6).vibrating).toBe(true)
    expect(computeFrame(buildSpec('sin'), 1.6).vibrating).toBe(false)
  })
  it('syiddah memotong gelombang suara di titik sentuh, rakhawah tidak', () => {
    const maxX = (id: string) => Math.max(...computeFrame(buildSpec(id), 2.3).waves.map((w) => w.x), -9)
    expect(maxX('dal')).toBeLessThan(maxX('zai'))
  })
  it('ra tebal mengangkat pangkal lidah, ra tipis tidak', () => {
    const tebal = buildSpec('ra', { variant: 'tafkhim' }).target.tongue.dorsumBack[1]
    const tipis = buildSpec('ra', { variant: 'tarqiq' }).target.tongue.dorsumBack[1]
    expect(tebal).toBeGreaterThan(tipis)
  })
  it('nun & mim menurunkan langit-langit lunak (ghunnah)', () => {
    expect(buildSpec('nun').nasal).toBe(true)
    expect(buildSpec('mim').nasal).toBe(true)
    expect(buildSpec('ba').nasal).toBe(false)
    expect(getPoseDef('bilabial').contact).toBe('closure')
  })
  it('pasangan bandingkan merujuk huruf yang ada', () => {
    for (const p of comparePairs) {
      expect(getLetter(p.a.letter)).toBeDefined()
      expect(getLetter(p.b.letter)).toBeDefined()
    }
  })
})
