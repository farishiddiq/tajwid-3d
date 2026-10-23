export type PhaseId = 'prep' | 'contact' | 'release'

export const PHASES: { id: PhaseId; label: string; start: number; end: number }[] = [
  { id: 'prep', label: 'Persiapan posisi', start: 0, end: 1.0 },
  { id: 'contact', label: 'Sentuh / menyempit', start: 1.0, end: 2.4 },
  { id: 'release', label: 'Pelepasan', start: 2.4, end: 3.2 },
]
export const DURATION = 3.2
export const SPEEDS = [0.25, 0.5, 1] as const

export function phaseAt(t: number) {
  return PHASES.find((p) => t < p.end) ?? PHASES[PHASES.length - 1]
}

export interface TimelineState {
  t: number
  playing: boolean
  speed: number
  loop: boolean
}

type Listener = (s: TimelineState, prevT: number) => void

/** Jam animasi yang dapat diputar, dijeda, digeser, dan diperlambat. Dipakai bersama oleh 3D, 2D, dan audio. */
export class Timeline {
  state: TimelineState = { t: 0, playing: false, speed: 1, loop: false }
  private listeners = new Set<Listener>()
  private endListeners = new Set<() => void>()
  /** Nomor putaran — berubah setiap kali diputar dari awal (dipakai audio). */
  run = 0

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  onEnd(fn: () => void) {
    this.endListeners.add(fn)
    return () => {
      this.endListeners.delete(fn)
    }
  }

  private emit(prevT: number) {
    for (const l of this.listeners) l(this.state, prevT)
  }

  private set(patch: Partial<TimelineState>) {
    const prev = this.state.t
    this.state = { ...this.state, ...patch }
    this.emit(prev)
  }

  play() {
    if (this.state.t >= DURATION) this.restart()
    else this.set({ playing: true })
    ticker.add(this)
  }

  restart() {
    this.run++
    this.state = { ...this.state, t: 0, playing: true }
    this.emit(0)
    ticker.add(this)
  }

  pause() {
    this.set({ playing: false })
  }

  toggle() {
    if (this.state.playing) this.pause()
    else this.play()
  }

  seek(t: number) {
    this.set({ t: Math.max(0, Math.min(DURATION, t)), playing: false })
  }

  setSpeed(speed: number) {
    this.set({ speed })
  }

  setLoop(loop: boolean) {
    this.set({ loop })
  }

  jumpPhase(dir: 1 | -1) {
    const t = this.state.t
    if (dir > 0) {
      const next = PHASES.find((p) => p.start > t + 1e-3)
      this.seek(next ? next.start : DURATION)
    } else {
      const prev = [...PHASES].reverse().find((p) => p.start < t - 0.05)
      this.seek(prev ? prev.start : 0)
    }
  }

  tick(dt: number) {
    if (!this.state.playing) return false
    const prevT = this.state.t
    let t = prevT + dt * this.state.speed
    if (t >= DURATION) {
      if (this.state.loop) {
        this.run++
        t = t - DURATION
        this.state = { ...this.state, t }
        this.emit(0)
        return true
      }
      this.state = { ...this.state, t: DURATION, playing: false }
      this.emit(prevT)
      for (const l of this.endListeners) l()
      return false
    }
    this.state = { ...this.state, t }
    this.emit(prevT)
    return true
  }
}

/** Satu loop requestAnimationFrame untuk semua timeline yang sedang berjalan. */
const ticker = {
  active: new Set<Timeline>(),
  last: 0,
  raf: 0,
  add(tl: Timeline) {
    this.active.add(tl)
    if (!this.raf) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.loop)
    }
  },
  loop: (now: number) => {
    const dt = Math.min(0.1, (now - ticker.last) / 1000)
    ticker.last = now
    for (const tl of ticker.active) if (!tl.tick(dt)) ticker.active.delete(tl)
    ticker.raf = ticker.active.size ? requestAnimationFrame(ticker.loop) : 0
  },
}
