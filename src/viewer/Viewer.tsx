import { ArrowCounterClockwise, CameraRotate, Cube, Info, Pause, Play, Repeat, Scissors, SpeakerSlash } from '@phosphor-icons/react'
import { Component, lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { LEGEND, FX } from '../anatomy/palette'
import { ORGANS } from '../anatomy/shapes'
import { config, type Harakat } from '../content'
import { audioSource, loadManifest, playSyllable, stopAudio } from '../engine/audio'
import { describeSpec, type AnimSpec } from '../engine/spec'
import { DURATION, PHASES, SPEEDS, phaseAt, type Timeline } from '../engine/timeline'
import { useApp } from '../store'
import { CAMERA_PRESETS, DEFAULT_PRESET, type CameraPreset, type CameraSync, type ViewerController } from './controller'
import Viewer2D from './Viewer2D'
import type { Marker } from './three/Viewer3D'

const Viewer3D = lazy(() => import('./three/Viewer3D'))

let webglOk: boolean | null = null
export function hasWebGL(): boolean {
  if (webglOk !== null) return webglOk
  try {
    const c = document.createElement('canvas')
    webglOk = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webglOk = false
  }
  return webglOk
}

export function useTimelineState(tl: Timeline) {
  return useSyncExternalStore(
    (cb) => tl.subscribe(cb),
    () => tl.state,
  )
}

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export interface ViewerProps {
  spec: AnimSpec
  controller: ViewerController
  audio?: { letterId: string; harakat: Harakat; text: string } | null
  autoPlay?: boolean
  hideLabels?: boolean
  markers?: Marker[]
  onMarker?: (id: number) => void
  sync?: CameraSync
  compact?: boolean
  keyboard?: boolean
  title?: string
  controls?: boolean
}

export default function Viewer({ spec, controller, audio, autoPlay, hideLabels, markers, onMarker, sync, compact, keyboard, title, controls = true }: ViewerProps) {
  const renderMode = useApp((s) => s.renderMode)
  const allowTts = useApp((s) => s.allowTts)
  const defaultSpeed = useApp((s) => s.defaultSpeed)
  const cut = useApp((s) => s.cut)
  const setCut = useApp((s) => s.setCut)
  const use3D = renderMode === '3d' || (renderMode === 'auto' && hasWebGL())
  const [panel, setPanel] = useState<'none' | 'layers' | 'legend' | 'alt'>('none')
  const [audioNote, setAudioNote] = useState<string | null>(null)

  useEffect(() => {
    controller.timeline.setSpeed(defaultSpeed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller])

  // putar otomatis sekali saat huruf berganti
  useEffect(() => {
    if (autoPlay) {
      const id = setTimeout(() => controller.timeline.restart(), 250)
      return () => clearTimeout(id)
    }
    controller.timeline.seek(0)
  }, [spec.key, autoPlay, controller])

  // sinkron audio: mulai saat timeline melewati offset, ikut kecepatan
  useEffect(() => {
    if (!audio) return
    void loadManifest()
    const offset = config.audioOffsetSeconds
    const unsub = controller.timeline.subscribe((s, prevT) => {
      if (s.playing && prevT <= offset && s.t > offset) {
        const src = playSyllable({ ...audio, rate: s.speed, allowTts })
        setAudioNote(src === 'tts' ? 'Suara sintetis sementara — rekaman qari belum tersedia.' : src === 'none' ? 'Audio qari belum tersedia untuk huruf ini.' : null)
      }
      if (!s.playing && s.t < DURATION) stopAudio()
    })
    return () => {
      unsub()
      stopAudio()
    }
  }, [audio, controller, allowTts])

  useEffect(() => {
    if (!audio) return
    void loadManifest().then(() => {
      const src = audioSource(audio.letterId, audio.harakat, allowTts)
      setAudioNote(src === 'tts' ? 'Suara sintetis sementara — rekaman qari belum tersedia.' : src === 'none' ? 'Audio qari belum tersedia untuk huruf ini.' : null)
    })
  }, [audio, allowTts])

  // pintasan keyboard (mode guru)
  useEffect(() => {
    if (!keyboard) return
    const presets = Object.keys(CAMERA_PRESETS) as CameraPreset[]
    let presetIdx = 0
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      const tl = controller.timeline
      switch (e.key) {
        case ' ':
          e.preventDefault()
          tl.toggle()
          break
        case 'Enter':
          if (el.tagName === 'BUTTON' || el.tagName === 'A') return
          tl.restart()
          break
        case '1':
          tl.setSpeed(0.25)
          break
        case '2':
          tl.setSpeed(0.5)
          break
        case '3':
          tl.setSpeed(1)
          break
        case 'l':
        case 'L':
          tl.setLoop(!tl.state.loop)
          break
        case ',':
          tl.jumpPhase(-1)
          break
        case '.':
          tl.jumpPhase(1)
          break
        case 'c':
        case 'C':
          presetIdx = 0
          controller.setPreset(DEFAULT_PRESET)
          break
        case 'v':
        case 'V':
          presetIdx = (presetIdx + 1) % presets.length
          controller.setPreset(presets[presetIdx])
          break
        case 't':
        case 'T': {
          const s = useApp.getState()
          s.setSkinOpacity(s.skinOpacity > 0.05 ? 0 : 0.5)
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, controller])

  const description = useMemo(() => describeSpec(spec), [spec])
  const fallback = <Viewer2D spec={spec} controller={controller} hideLabels={hideLabels} markers={markers} onMarker={onMarker} />

  return (
    <div className={`viewer${compact ? ' viewer--compact' : ''}`}>
      <div className="viewer__stage" role="img" aria-label={hideLabels ? 'Animasi makhraj (label disembunyikan untuk kuis)' : description}>
        {use3D ? (
          <GLBoundary fallback={fallback}>
            <Suspense fallback={<div className="viewer__loading">Memuat model 3D…</div>}>
              <Viewer3D spec={spec} controller={controller} hideLabels={hideLabels} markers={markers} onMarker={onMarker} sync={sync} />
            </Suspense>
          </GLBoundary>
        ) : (
          fallback
        )}
        <div className="viewer__topleft">
          {title && <div className="viewer__title">{title}</div>}
          <PhaseBadge timeline={controller.timeline} />
          {audioNote && audio && (
            <div className="viewer__note" title={audioNote}>
              <SpeakerSlash size={13} /> {audioNote.startsWith('Suara sintetis') ? 'Suara sintetis' : 'Audio qari belum ada'}
            </div>
          )}
        </div>
        {use3D && (
          <div className="viewer__cams" role="group" aria-label="Sudut kamera">
            {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((k) => (
              <button key={k} className="chip" onClick={() => controller.setPreset(k)}>
                {CAMERA_PRESETS[k].label}
              </button>
            ))}
            <button className="chip" onClick={() => controller.setPreset(DEFAULT_PRESET)} title="Reset kamera (C)">
              <CameraRotate size={14} /> Reset
            </button>
            <span className="viewer__cams-sep" />
            <button className={`chip${cut ? ' chip--on' : ''}`} onClick={() => setCut(!cut)} aria-pressed={cut} title="Potongan sagital (setengah kepala) atau kepala utuh">
              {cut ? <Scissors size={14} /> : <Cube size={14} />} {cut ? 'Potongan' : 'Utuh'}
            </button>
          </div>
        )}
        <div className="viewer__panelbtns">
          <button className={`chip${panel === 'layers' ? ' chip--on' : ''}`} onClick={() => setPanel(panel === 'layers' ? 'none' : 'layers')} aria-expanded={panel === 'layers'}>
            Lapisan
          </button>
          <button className={`chip${panel === 'legend' ? ' chip--on' : ''}`} onClick={() => setPanel(panel === 'legend' ? 'none' : 'legend')} aria-expanded={panel === 'legend'}>
            Kode
          </button>
          <button className={`chip${panel === 'alt' ? ' chip--on' : ''}`} onClick={() => setPanel(panel === 'alt' ? 'none' : 'alt')} aria-expanded={panel === 'alt'} title="Deskripsi animasi (teks)">
            <Info size={14} />
          </button>
        </div>
        {panel === 'layers' && <LayersPanel use3D={use3D} />}
        {panel === 'legend' && <LegendPanel />}
        {panel === 'alt' && (
          <div className="panel" role="dialog" aria-label="Deskripsi animasi">
            <strong>Deskripsi animasi</strong>
            <p className="small">{hideLabels ? 'Disembunyikan selama kuis.' : description}</p>
            {audioNote && <p className="small muted">{audioNote}</p>}
          </div>
        )}
      </div>
      {controls && <PlaybackControls timeline={controller.timeline} compact={compact} />}
    </div>
  )
}

function PhaseBadge({ timeline }: { timeline: Timeline }) {
  const s = useTimelineState(timeline)
  const ph = phaseAt(s.t)
  return (
    <div className="viewer__phase" aria-live="polite">
      <span className={`dot dot--${ph.id}`} /> {ph.label}
      {s.speed !== 1 && <span className="viewer__speed"> · {s.speed}x</span>}
    </div>
  )
}

export function PlaybackControls({ timeline, compact }: { timeline: Timeline; compact?: boolean }) {
  const s = useTimelineState(timeline)
  return (
    <div className={`playback${compact ? ' playback--compact' : ''}`}>
      <button className="btn btn--icon" onClick={() => timeline.toggle()} aria-label={s.playing ? 'Jeda (spasi)' : 'Putar (spasi)'} title="Putar/jeda (Spasi)">
        {s.playing ? <Pause weight="fill" /> : <Play weight="fill" />}
      </button>
      <button className="btn btn--icon btn--ghost" onClick={() => timeline.restart()} aria-label="Ulang dari awal" title="Ulang (Enter)">
        <ArrowCounterClockwise />
      </button>
      <div className="seg" role="group" aria-label="Kecepatan">
        {SPEEDS.map((sp) => (
          <button key={sp} className={`seg__btn${s.speed === sp ? ' seg__btn--on' : ''}`} onClick={() => timeline.setSpeed(sp)} aria-pressed={s.speed === sp}>
            {sp}x
          </button>
        ))}
      </div>
      <button className={`chip${s.loop ? ' chip--on' : ''}`} onClick={() => timeline.setLoop(!s.loop)} aria-pressed={s.loop} title="Ulang terus (L)">
        <Repeat size={14} />
        <span className="hide-sm">Loop</span>
      </button>
      <div className="timeline">
        <input
          type="range"
          min={0}
          max={DURATION}
          step={0.01}
          value={s.t}
          onChange={(e) => timeline.seek(parseFloat(e.target.value))}
          aria-label="Geser waktu animasi"
          aria-valuetext={`${phaseAt(s.t).label}, ${s.t.toFixed(1)} detik`}
        />
        <div className="timeline__phases">
          {PHASES.map((p) => (
            <button
              key={p.id}
              className={`timeline__phase${phaseAt(s.t).id === p.id ? ' timeline__phase--on' : ''}`}
              style={{ flex: p.end - p.start }}
              onClick={() => timeline.seek(p.id === 'contact' ? p.start + 0.4 : p.start + 0.01)}
            >
              {p.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LayersPanel({ use3D }: { use3D: boolean }) {
  const { organs, toggleOrgan, skinOpacity, setSkinOpacity, renderMode, setRenderMode, calibrate, setCalibrate } = useApp()
  return (
    <div className="panel" role="dialog" aria-label="Lapisan organ">
      <label className="panel__slider">
        Transparansi kulit & pipi
        <input type="range" min={0} max={0.9} step={0.01} value={skinOpacity} onChange={(e) => setSkinOpacity(parseFloat(e.target.value))} />
      </label>
      <div className="panel__grid">
        {ORGANS.map((o) => (
          <label key={o.id} className="check">
            <input type="checkbox" checked={organs[o.id]} onChange={() => toggleOrgan(o.id)} /> {o.label}
          </label>
        ))}
      </div>
      <label className="panel__select">
        Tampilan
        <select value={renderMode} onChange={(e) => setRenderMode(e.target.value as typeof renderMode)}>
          <option value="auto">Otomatis</option>
          <option value="3d">3D</option>
          <option value="2d">2D ringan (untuk HP lambat)</option>
        </select>
      </label>
      {!use3D && renderMode !== '2d' && <p className="muted">WebGL tidak tersedia; memakai ilustrasi 2D.</p>}
      {use3D && (
        <label className="check" title="Untuk memeriksa keselarasan model 3D artist dengan data pose">
          <input type="checkbox" checked={calibrate} onChange={(e) => setCalibrate(e.target.checked)} /> Titik referensi (kalibrasi model)
        </label>
      )}
    </div>
  )
}

export function LegendPanel({ inline }: { inline?: boolean }) {
  return (
    <div className={inline ? 'legend-inline' : 'panel'} role={inline ? undefined : 'dialog'} aria-label="Kode visual">
      <ul className="legend">
        {LEGEND.map((l) => (
          <li key={l.key}>
            <LegendIcon shape={l.shape} color={FX[l.key]} />
            <div>
              <strong>{l.label}</strong>
              <span>{l.desc}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LegendIcon({ shape, color }: { shape: string; color: string }) {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden>
      {shape === 'dot' && (
        <>
          <circle cx="5" cy="10" r="3" fill={color} />
          <circle cx="14" cy="10" r="3" fill={color} />
          <circle cx="23" cy="10" r="3" fill={color} />
        </>
      )}
      {shape === 'arc' && (
        <>
          <path d="M8,3 A8,8 0 0 1 8,17" stroke={color} strokeWidth="2.5" fill="none" />
          <path d="M16,3 A8,8 0 0 1 16,17" stroke={color} strokeWidth="2.5" fill="none" />
        </>
      )}
      {shape === 'star' && <path d="M14,1 L16.5,7.5 L23,8 L18,12.5 L19.5,19 L14,15.5 L8.5,19 L10,12.5 L5,8 L11.5,7.5 Z" fill={color} />}
      {shape === 'arrow' && <path d="M14,2 L20,9 L16,9 L16,18 L12,18 L12,9 L8,9 Z" fill={color} />}
      {shape === 'zigzag' && <polyline points="2,10 6,3 10,17 14,3 18,17 22,3 26,10" stroke="#a08800" strokeWidth="2.5" fill="none" />}
    </svg>
  )
}
