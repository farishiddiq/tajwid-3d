import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ar, LetterGrid, ReportButton } from '../components/common'
import { getLetter, getSifat, harakatText, lettersWithSifat, sifatList, type Letter } from '../content'
import { buildSpec } from '../engine/spec'
import { ViewerController } from '../viewer/controller'
import Viewer from '../viewer/Viewer'

const PAIR_SETS: { id: string; title: string; ids: string[] }[] = [
  { id: 'napas', title: 'Napas', ids: ['hams', 'jahr'] },
  { id: 'suara', title: 'Suara', ids: ['syiddah', 'tawassuth', 'rakhawah'] },
  { id: 'lidah', title: 'Pangkal lidah', ids: ['istila', 'istifal'] },
  { id: 'lekat', title: 'Lekatan lidah', ids: ['ithbaq', 'infitah'] },
  { id: 'ringan', title: 'Ringan/berat', ids: ['idzlaq', 'ishmat'] },
]

export default function SifatPage() {
  const { id = 'hams' } = useParams()
  const navigate = useNavigate()
  const sifat = getSifat(id) ?? sifatList[0]
  const [demo, setDemo] = useState(sifat.demo[0])
  const controller = useMemo(() => new ViewerController(), [])
  useEffect(() => {
    setDemo(sifat.demo[0])
  }, [sifat])

  const letter = getLetter(demo)!
  const spec = useMemo(() => buildSpec(demo, { focus: sifat.focus }), [demo, sifat])
  const audio = useMemo(() => ({ letterId: demo, harakat: 'sukun' as const, text: harakatText(letter, 'sukun') }), [demo, letter])
  const members = lettersWithSifat(sifat.id)
  const pair = sifat.pair ? getSifat(sifat.pair) : undefined

  const pick = (l: Letter) => {
    setDemo(l.id)
    setTimeout(() => controller.timeline.restart(), 0)
  }

  return (
    <div className="page ws ws--sifat">
      <nav className="rail rail--list" aria-label="Pilih sifat">
        <div className="rail__h">Berpasangan</div>
        {PAIR_SETS.map((ps) => (
          <div key={ps.id} className="sifat-pair" role="group" aria-label={ps.title}>
            <span className="sifat-pair__t">{ps.title}</span>
            <div className="sifat-pair__items">
              {ps.ids.map((sid) => (
                <Link key={sid} to={`/sifat/${sid}`} className={`pill pill--sm${sid === sifat.id ? ' pill--on' : ''}`} aria-current={sid === sifat.id}>
                  {getSifat(sid)!.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="rail__h">Tidak berpasangan</div>
        <div className="sifat-pair__items">
          {sifatList
            .filter((s) => s.group === 'single')
            .map((s) => (
              <Link key={s.id} to={`/sifat/${s.id}`} className={`pill pill--sm pill--single${s.id === sifat.id ? ' pill--on' : ''}`} aria-current={s.id === sifat.id}>
                {s.name}
              </Link>
            ))}
        </div>
      </nav>

      <section className="ws__main">
        <Viewer spec={spec} controller={controller} audio={audio} autoPlay keyboard title={`${letter.char} ${letter.name} · fokus ${sifat.name}`} />
        {sifat.demo.length > 1 && (
          <div className="harakat demo-switch" role="group" aria-label="Huruf contoh">
            <span className="muted small">Bandingkan:</span>
            {sifat.demo.map((d) => {
              const l = getLetter(d)!
              return (
                <button key={d} className={`harakat__btn${d === demo ? ' harakat__btn--on' : ''}`} onClick={() => pick(l)}>
                  <Ar>{l.char}</Ar>
                  <span>{l.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <aside className="side card">
        <select className="show-sm" value={sifat.id} onChange={(e) => navigate(`/sifat/${e.target.value}`)} aria-label="Pilih sifat">
          {sifatList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.meaning}
            </option>
          ))}
        </select>
        <h2>
          {sifat.name} <Ar className="ar--md">{sifat.arabic}</Ar>
        </h2>
        <p className="lead small-lead">{sifat.meaning}</p>
        <div className="side__body">
          <p>{sifat.explanation}</p>
          <p className="small">
            <strong>Visual:</strong> {sifat.visual}
          </p>
          {sifat.condition && <p className="note">{sifat.condition}</p>}
          {sifat.mnemonic && (
            <p className="small">
              Penghafal: <Ar className="ar--md">{sifat.mnemonic}</Ar>
            </p>
          )}
          {pair && (
            <p className="small">
              Lawannya: <Link to={`/sifat/${pair.id}`}>{pair.name}</Link> — {pair.meaning.toLowerCase()}.
            </p>
          )}
        </div>
        <div className="side__grid">
          <div className="muted small">
            {members.size} huruf menyala{sifat.complementOf ? ' (selain kelompok lawannya)' : ''} · klik untuk animasi
          </div>
          <LetterGrid size="mini" cols={8} sifat={sifat.id} onPick={pick} activeId={demo} />
        </div>
        <div className="side__foot">
          <ReportButton context={`Sifat ${sifat.name}`} />
        </div>
      </aside>
    </div>
  )
}
