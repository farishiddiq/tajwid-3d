import { Timeline } from '../engine/timeline'

export type CameraPreset = 'oblique' | 'side' | 'front' | 'top' | 'inside'

export const CAMERA_PRESETS: Record<CameraPreset, { label: string; position: [number, number, number]; target: [number, number, number] }> = {
  // sudut 3/4: penampang sagital + volume organ di sisi kiri sama-sama terlihat
  oblique: { label: '3/4', position: [11.2, 4.6, 16.7], target: [1.1, 0.1, -0.7] },
  side: { label: 'Samping', position: [1.1, 0.0, 21.1], target: [1.1, 0.0, -0.5] },
  front: { label: 'Depan', position: [19.9, 0.7, 3.6], target: [1.0, 0.2, -0.6] },
  top: { label: 'Atas', position: [1.0, 18.8, 2.2], target: [1.0, 0.4, -0.6] },
  inside: { label: 'Dalam mulut', position: [3.25, 0.45, 0.45], target: [0.2, 0.9, -0.35] },
}

export const DEFAULT_PRESET: CameraPreset = 'oblique'

/** Kamera bersama untuk mode bandingkan (dua viewer tersinkron). */
export class CameraSync {
  position: [number, number, number] = [...CAMERA_PRESETS[DEFAULT_PRESET].position]
  target: [number, number, number] = [...CAMERA_PRESETS[DEFAULT_PRESET].target]
  version = 0
  source = ''
  write(source: string, p: { x: number; y: number; z: number }, t: { x: number; y: number; z: number }) {
    this.position = [p.x, p.y, p.z]
    this.target = [t.x, t.y, t.z]
    this.source = source
    this.version++
  }
}

let idCounter = 0

/** Pengendali satu viewer: timeline + permintaan kamera. */
export class ViewerController {
  id = `v${++idCounter}`
  timeline = new Timeline()
  cameraRequest: { preset: CameraPreset; nonce: number } = { preset: DEFAULT_PRESET, nonce: 0 }
  private camListeners = new Set<() => void>()

  setPreset(preset: CameraPreset) {
    this.cameraRequest = { preset, nonce: this.cameraRequest.nonce + 1 }
    for (const l of this.camListeners) l()
  }

  onCamera(fn: () => void) {
    this.camListeners.add(fn)
    return () => {
      this.camListeners.delete(fn)
    }
  }
}
