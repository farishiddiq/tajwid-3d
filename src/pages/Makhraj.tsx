import { ArrowRight, Info, Play } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ar, ReportButton } from '../components/common'
import { areas, getLetter, getMakhraj, harakatText, lettersOfMakhraj, makhrajNote, makhrajOfArea, makhrajPoints } from '../content'
import { buildSpec } from '../engine/spec'
import { ViewerController } from '../viewer/controller'
import Viewer from '../viewer/Viewer'

export default function MakhrajPage() {
  const params = useParams()
  const navigate = useNavigate()
  const selectedId = params.id ? Number(params.id) : 1
  const mk = getMakhraj(selectedId) ?? makhrajPoints[0]
  const [letterId, setLetterId] = useState(mk.letters[0])
  const [queue, setQueue] = useState<string[] | null>(null)
  const controller = useMemo(() => new ViewerController(), [])
  const queueRef = useRef<string[] | null>(null)
  queueRef.current = queue

  const pending = useRef<string[] | null>(null)
  const startQueue = (ids: string[]) => {
    const [first, ...rest] = ids
    setLetterId(first)
    setQueue(rest)
    setTimeout(() => controller.timeline.restart(), 300)
  }

  useEffect(() => {
    if (pending.current) {
      startQueue(pending.current)
      pending.current = null
      return
    }
    setLetterId(mk.letters[0])
    setQueue(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mk])

  // "Putar semua huruf di area ini": huruf berikutnya diputar saat animasi selesai
  useEffect(
    () =>
      controller.timeline.onEnd(() => {
        const q = queueRef.current
        if (!q || q.length === 0) {
          setQueue(null)
          return
        }
        const [nextId, ...rest] = q
        setQueue(rest.length ? rest : [])
        setLetterId(nextId)
        setTimeout(() => controller.timeline.restart(), 450)
      }),
    [controller],
  )

  const letter = getLetter(letterId)!
  const spec = useMemo(() => buildSpec(letterId), [letterId])
  const audio = useMemo(() => ({ letterId, harakat: 'sukun' as const, text: harakatText(letter, 'sukun') }), [letterId, letter])
  const markers = makhrajPoints.map((m) => ({ id: m.id, point: m.point, label: m.name, active: m.id === mk.id }))

  const playArea = (areaId: string) => {
    const ids = [...new Set(makhrajOfArea(areaId).flatMap((m) => m.letters))]
    const firstMk = makhrajOfArea(areaId)[0]
    if (firstMk.id !== mk.id) {
      pending.current = ids
      navigate(`/makhraj/${firstMk.id}`)
    } else startQueue(ids)
  }

  return (
    <div className="page ws ws--makhraj">
      <aside className="rail rail--list" aria-label="Daftar 17 makhraj">
        <div className="rail__h">
          5 area · 17 makhraj{' '}
          <span className="info" title={makhrajNote} aria-label={makhrajNote} tabIndex={0}>
            <Info size={13} />
          </span>
        </div>
        {areas.map((a) => (
          <section key={a.id} className={`area${a.id === mk.area ? ' area--on' : ''}`}>
            <div className="area__head" title={`${a.meaning} — ${a.description}`}>
              <h3>
                {a.name} <Ar className="ar--inline">{a.arabic}</Ar>
              </h3>
              <button className="chip chip--xs" onClick={() => playArea(a.id)} title="Putar semua huruf di area ini" aria-label={`Putar semua huruf area ${a.name}`}>
                <Play size={11} weight="fill" /> semua
              </button>
            </div>
            <ol className="points">
              {makhrajOfArea(a.id).map((m) => (
                <li key={m.id}>
                  <Link to={`/makhraj/${m.id}`} className={`point${m.id === mk.id ? ' point--on' : ''}`} aria-current={m.id === mk.id} title={m.name}>
                    <span className="point__n">{m.id}</span>
                    <span className="point__name">{m.name}</span>
                    <Ar className="point__letters">{m.letters.map((l) => getLetter(l)!.char).join(' ')}</Ar>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </aside>

      <section className="ws__main">
        <Viewer spec={spec} controller={controller} audio={audio} autoPlay keyboard markers={markers} onMarker={(id) => navigate(`/makhraj/${id}`)} title={queue ? `Memutar semua… (${queue.length} lagi)` : undefined} />
      </section>

      <aside className="side card">
        <select className="show-sm" value={mk.id} onChange={(e) => navigate(`/makhraj/${e.target.value}`)} aria-label="Pilih makhraj">
          {makhrajPoints.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}. {m.name}
            </option>
          ))}
        </select>
        <p className="muted small">
          Makhraj {mk.id} · {areas.find((a) => a.id === mk.area)?.name}
        </p>
        <h2>{mk.name}</h2>
        <p>
          <Ar className="ar--md">{mk.arabic}</Ar>
        </p>
        <p>{mk.animation}</p>
        <div className="row-wrap">
          {lettersOfMakhraj(mk.id).map((l) => (
            <button
              key={l.id}
              className={`letterbtn${l.id === letterId ? ' letterbtn--on' : ''}`}
              onClick={() => {
                setQueue(null)
                setLetterId(l.id)
                setTimeout(() => controller.timeline.restart(), 0)
              }}
            >
              <Ar>{l.char}</Ar>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
        <div className="side__foot">
          <Link className="btn btn--ghost btn--sm" to={`/huruf/${letterId}`}>
            Kartu {letter.name} <ArrowRight size={14} />
          </Link>
          <ReportButton context={`Makhraj ${mk.id}: ${mk.name}`} />
        </div>
      </aside>
    </div>
  )
}
