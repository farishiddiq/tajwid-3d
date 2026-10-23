import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'
import { computeFrame, type Frame } from '../../engine/frame'
import type { AnimSpec } from '../../engine/spec'
import type { ViewerController } from '../controller'

export interface FrameCtx {
  get: () => Frame
  spec: AnimSpec
  hideLabels: boolean
}

const Ctx = createContext<FrameCtx | null>(null)
export const useFrameCtx = () => useContext(Ctx)!

export type HoverFn = (h: { text: string; point: [number, number, number] } | null) => void

/** Menghitung frame sekali per nilai t dan membagikannya ke semua komponen scene. */
export function FrameProvider({ spec, controller, hideLabels, children }: { spec: AnimSpec; controller: ViewerController; hideLabels: boolean; children: ReactNode }) {
  const cache = useRef<{ t: number; key: string; frame: Frame } | null>(null)
  const value = useMemo<FrameCtx>(
    () => ({
      spec,
      hideLabels,
      get: () => {
        const t = controller.timeline.state.t
        const c = cache.current
        if (c && c.t === t && c.key === spec.key) return c.frame
        const frame = computeFrame(spec, t)
        cache.current = { t, key: spec.key, frame }
        return frame
      },
    }),
    [spec, controller, hideLabels],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
