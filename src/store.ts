import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ORGANS, type OrganId } from './anatomy/shapes'

export type RenderMode = 'auto' | '3d' | '2d'

interface QuizResult {
  date: string
  score: number
  total: number
}

interface AppState {
  skinOpacity: number
  organs: Record<OrganId, boolean>
  renderMode: RenderMode
  allowTts: boolean
  showTranslit: boolean
  defaultSpeed: number
  presentation: boolean
  calibrate: boolean
  /** potongan sagital (setengah kiri) vs kepala utuh */
  cut: boolean
  learned: string[]
  quizHistory: QuizResult[]
  setSkinOpacity: (v: number) => void
  toggleOrgan: (id: OrganId) => void
  setRenderMode: (m: RenderMode) => void
  setAllowTts: (v: boolean) => void
  setShowTranslit: (v: boolean) => void
  setDefaultSpeed: (v: number) => void
  setPresentation: (v: boolean) => void
  setCalibrate: (v: boolean) => void
  setCut: (v: boolean) => void
  toggleLearned: (id: string) => void
  markLearned: (id: string) => void
  addQuizResult: (r: QuizResult) => void
}

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__t3d_probe'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      skinOpacity: 0.18,
      organs: Object.fromEntries(ORGANS.map((o) => [o.id, true])) as Record<OrganId, boolean>,
      renderMode: 'auto',
      allowTts: true,
      showTranslit: true,
      defaultSpeed: 1,
      presentation: false,
      calibrate: false,
      cut: true,
      learned: [],
      quizHistory: [],
      setSkinOpacity: (skinOpacity) => set({ skinOpacity }),
      toggleOrgan: (id) => set((s) => ({ organs: { ...s.organs, [id]: !s.organs[id] } })),
      setRenderMode: (renderMode) => set({ renderMode }),
      setAllowTts: (allowTts) => set({ allowTts }),
      setShowTranslit: (showTranslit) => set({ showTranslit }),
      setDefaultSpeed: (defaultSpeed) => set({ defaultSpeed }),
      setPresentation: (presentation) => set({ presentation }),
      setCalibrate: (calibrate) => set({ calibrate }),
      setCut: (cut) => set({ cut }),
      toggleLearned: (id) => set((s) => ({ learned: s.learned.includes(id) ? s.learned.filter((x) => x !== id) : [...s.learned, id] })),
      markLearned: (id) => set((s) => (s.learned.includes(id) ? s : { learned: [...s.learned, id] })),
      addQuizResult: (r) => set((s) => ({ quizHistory: [...s.quizHistory, r].slice(-50) })),
    }),
    {
      name: 'tajwid3d',
      storage: safeStorage,
      partialize: ({ presentation: _p, calibrate: _c, ...rest }) => rest,
    },
  ),
)
