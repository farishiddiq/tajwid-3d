import { SpeakerHigh } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ar, Bidi } from '../components/common'
import { comparePairs, getLetter, getMakhraj, harakatText, letters, sifatList, letterHasSifat, type Variant } from '../content'
import { playSyllable } from '../engine/audio'
import { buildSpec } from '../engine/spec'
import { useApp } from '../store'
import { CameraSync, ViewerController } from '../viewer/controller'
import Viewer, { PlaybackControls } from '../viewer/Viewer'

export default function ComparePage() {
  const [params, setParams] = useSearchParams()
  const a = params.get('a') ?? 'sin'
  const b = params.get('b') ?? 'shad'
  const va = (params.get('va') as Variant | null) ?? undefined
  const vb = (params.get('vb') as Variant | null) ?? undefined
  const allowTts = useApp((s) => s.allowTts)

  // dua viewer berbagi satu timeline dan satu kamera
  const { ca, cb, sync } = useMemo(() => {
    const ca = new ViewerController()
    const cb = new ViewerController()
    cb.timeline = ca.timeline
    return { ca, cb, sync: new CameraSync() }
  }, [])
  const sa = useMemo(() => buildSpec(a, { variant: va }), [a, va])
  const sb = useMemo(() => buildSpec(b, { variant: vb }), [b, vb])
  const la = getLetter(a)!
  const lb = getLetter(b)!
  const preset = comparePairs.find((p) => p.a.letter === a && p.b.letter === b && p.a.variant === va && p.b.variant === vb)

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next)
    setTimeout(() => ca.timeline.restart(), 50)
  }

  const label = (l: typeof la, v?: Variant) => `${l.name}${v === 'tafkhim' ? ' (tebal)' : v === 'tarqiq' ? ' (tipis)' : ''}`
  const diff = sifatList.filter((s) => letterHasSifat(a, s.id) !== letterHasSifat(b, s.id))
  const tafkhimDiff = sa.tafkhim !== sb.tafkhim

  const listen = (id: string) => {
    const l = getLetter(id)!
    playSyllable({ letterId: id, harakat: 'sukun', text: harakatText(l, 'sukun'), rate: ca.timeline.state.speed, allowTts })
  }

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <h1 title="Dua model berdampingan; kamera dan animasi tersinkron.">Bandingkan</h1>
      <div className="row-wrap presets" role="group" aria-label="Pasangan siap pakai">
        {comparePairs.map((p) => (
          <button
            key={p.id}
            className={`chip${preset?.id === p.id ? ' chip--on' : ''}`}
            onClick={() => set({ a: p.a.letter, b: p.b.letter, va: p.a.variant, vb: p.b.variant })}
          >
            <Bidi text={p.title} />
          </button>
        ))}
      </div>
      </div>
      <div className="ws ws--compare">
      <div className="compare">
        {[
          { key: 'a', l: la, v: va, spec: sa, c: ca },
          { key: 'b', l: lb, v: vb, spec: sb, c: cb },
        ].map((side) => (
          <div key={side.key} className="compare__col">
            <div className="compare__head">
              <Ar className="compare__char">{side.l.char}</Ar>
              <select
                value={side.l.id}
                onChange={(e) => set({ [side.key]: e.target.value, [`v${side.key}`]: undefined })}
                aria-label={`Huruf ${side.key.toUpperCase()}`}
              >
                {letters.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.char} — {l.name}
                  </option>
                ))}
              </select>
              {(side.l.id === 'ra' || side.l.id === 'lam' || side.l.id === 'alif_mad') && (
                <select value={side.v ?? ''} onChange={(e) => set({ [`v${side.key}`]: e.target.value || undefined })} aria-label="Tebal/tipis">
                  <option value="">default</option>
                  <option value="tafkhim">tebal</option>
                  <option value="tarqiq">tipis</option>
                </select>
              )}
              <button className="chip" onClick={() => listen(side.l.id)}>
                <SpeakerHigh size={14} /> Dengar
              </button>
            </div>
            <Viewer spec={side.spec} controller={side.c} sync={sync} compact controls={false} title={`${label(side.l, side.v)} · M${side.l.makhraj}`} />
          </div>
        ))}
        <div className="compare__controls">
          <PlaybackControls timeline={ca.timeline} />
        </div>
      </div>
      <div className="side card">
        <h2>Bedanya</h2>
        {preset && <p>{preset.explanation}</p>}
        <ul className="list side__body">
          <li>
            Makhraj: {la.makhraj === lb.makhraj ? `sama (makhraj ${la.makhraj})` : `berbeda — ${getMakhraj(la.makhraj)!.name} vs ${getMakhraj(lb.makhraj)!.name}`}
          </li>
          {tafkhimDiff && (
            <li>
              Tebal/tipis: {label(la, va)} {sa.tafkhim ? 'tebal' : 'tipis'}, {label(lb, vb)} {sb.tafkhim ? 'tebal' : 'tipis'}.
            </li>
          )}
          {diff.length === 0 && !tafkhimDiff && <li>Sifat lazimah keduanya sama.</li>}
          {diff.map((s) => (
            <li key={s.id}>
              <Link to={`/sifat/${s.id}`}>{s.name}</Link> ({s.meaning.toLowerCase()}): hanya dimiliki {letterHasSifat(a, s.id) ? label(la, va) : label(lb, vb)}.
            </li>
          ))}
        </ul>
      </div>
      </div>
    </div>
  )
}
