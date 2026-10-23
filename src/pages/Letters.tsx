import { ArrowLeft, ArrowRight, ArrowsLeftRight, Check } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ar, LetterGrid, ReportButton, Tabs } from '../components/common'
import {
  getArea, getLetter, getMakhraj, HARAKAT, harakatText, lettersOfMakhraj, neighbours, sifatOfLetter, letters, type Harakat, type Variant,
} from '../content'
import { buildSpec } from '../engine/spec'
import { useApp } from '../store'
import { ViewerController } from '../viewer/controller'
import Viewer from '../viewer/Viewer'

export function LettersIndex() {
  const learned = useApp((s) => s.learned.length)
  return (
    <div className="page">
      <div className="page__head page__head--row">
        <h1>Huruf hijaiyah</h1>
        <p className="muted">
          28 huruf + 3 huruf mad · klik untuk membuka kartu · M1–M17 = nomor makhraj · dipelajari {learned}/{letters.length}
        </p>
      </div>
      <div className="page__fill">
        <LetterGrid />
      </div>
    </div>
  )
}

type InfoTab = 'makhraj' | 'sifat' | 'salah' | 'mirip'

export function LetterPage() {
  const { id = 'ba' } = useParams()
  const letter = getLetter(id)
  const navigate = useNavigate()
  const [harakat, setHarakat] = useState<Harakat>('sukun')
  const [variant, setVariant] = useState<Variant | undefined>(undefined)
  const [tab, setTab] = useState<InfoTab>('makhraj')
  const controller = useMemo(() => new ViewerController(), [])
  const learned = useApp((s) => s.learned.includes(id))
  const toggleLearned = useApp((s) => s.toggleLearned)
  const markLearned = useApp((s) => s.markLearned)
  const showTranslit = useApp((s) => s.showTranslit)

  useEffect(() => {
    setHarakat('sukun')
    setVariant(undefined)
  }, [id])

  // tandai otomatis setelah animasi ditonton sampai selesai
  useEffect(() => controller.timeline.onEnd(() => markLearned(id)), [controller, id, markLearned])

  const { prev, next } = neighbours(id)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return
      if (e.key === 'ArrowRight' && next) navigate(`/huruf/${next.id}`)
      if (e.key === 'ArrowLeft' && prev) navigate(`/huruf/${prev.id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, navigate])

  const spec = useMemo(() => (letter ? buildSpec(letter.id, { variant }) : null), [letter, variant])
  const audio = useMemo(() => (letter ? { letterId: letter.id, harakat, text: harakatText(letter, harakat) } : null), [letter, harakat])

  if (!letter || !spec) return <p>Huruf tidak ditemukan. <Link to="/huruf">Kembali</Link></p>

  const mk = getMakhraj(letter.makhraj)!
  const area = getArea(mk.area)!
  const sifat = sifatOfLetter(letter.id)
  const sameMakhraj = lettersOfMakhraj(letter.makhraj).filter((l) => l.id !== letter.id)
  const ghunnah = letter.id === 'nun' || letter.id === 'mim'
  const harakatList = letter.mad ? HARAKAT.slice(0, 1) : HARAKAT
  const hasVariant = letter.id === 'ra' || letter.id === 'lam' || letter.id === 'alif_mad'

  return (
    <div className="page ws ws--letter">
      <aside className="rail" aria-label="Pilih huruf">
        <div className="rail__h">Pilih huruf</div>
        <LetterGrid size="mini" cols={4} activeId={letter.id} />
      </aside>

      <section className="ws__main">
        <Viewer spec={spec} controller={controller} audio={audio} autoPlay keyboard />
        <div className="harakat" role="group" aria-label="Pilih bacaan">
          {harakatList.map((h) => (
            <button
              key={h.id}
              className={`harakat__btn${harakat === h.id ? ' harakat__btn--on' : ''}`}
              onClick={() => {
                setHarakat(h.id)
                setTimeout(() => controller.timeline.restart(), 0)
              }}
              aria-pressed={harakat === h.id}
              title={letter.mad ? 'Bacaan mad' : h.label}
            >
              <Ar>{harakatText(letter, h.id)}</Ar>
              <span>{letter.mad ? 'Mad' : h.label.split(' ')[0]}</span>
            </button>
          ))}
          {hasVariant && (
            <div className="variant" role="group" aria-label="Tebal atau tipis">
              <span className="muted small">{letter.id === 'lam' ? 'Lam jalalah' : letter.id === 'alif_mad' ? 'Alif' : 'Ra'}</span>
              {(
                [
                  [undefined, letter.id === 'ra' ? 'Tes' : 'Default'],
                  ['tafkhim', 'Tebal'],
                  ['tarqiq', 'Tipis'],
                ] as [Variant | undefined, string][]
              ).map(([v, label]) => (
                <button key={label} className={`chip${variant === v ? ' chip--on' : ''}`} onClick={() => setVariant(v)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <article className="side card" aria-labelledby="letter-title">
        <select className="show-sm" value={letter.id} onChange={(e) => navigate(`/huruf/${e.target.value}`)} aria-label="Pilih huruf">
          {letters.map((l) => (
            <option key={l.id} value={l.id}>
              {l.char} — {l.name}
            </option>
          ))}
        </select>
        <div className="letter__top">
          <Ar className="letter__char">{letter.char}</Ar>
          <div className="letter__meta">
            <h1 id="letter-title">
              {letter.name} {showTranslit && <span className="muted">({letter.translit})</span>}
            </h1>
            <p className="muted small">
              Tes makhraj: <Ar className="ar--inline">{letter.test}</Ar>
            </p>
            <button className={`btn btn--sm${learned ? ' btn--on' : ' btn--ghost'}`} onClick={() => toggleLearned(letter.id)} aria-pressed={learned}>
              {learned ? (
                <>
                  <Check size={14} weight="bold" /> Dipelajari
                </>
              ) : (
                'Tandai dipelajari'
              )}
            </button>
          </div>
        </div>

        <Tabs
          small
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'makhraj', label: 'Makhraj' },
            { id: 'sifat', label: `Sifat (${sifat.length})` },
            { id: 'salah', label: 'Kesalahan' },
            { id: 'mirip', label: 'Mirip' },
          ]}
        />

        <div className="side__body">
          {tab === 'makhraj' && (
            <>
              <Link to={`/makhraj/${mk.id}`} className="pill">
                {mk.id}. {mk.name}
              </Link>
              <p className="muted small">
                {area.name} (<Ar className="ar--inline">{area.arabic}</Ar>) · <Ar className="ar--inline">{mk.arabic}</Ar>
              </p>
              <p>{mk.animation}</p>
              {ghunnah && (
                <p className="small">
                  Ghunnah keluar dari <Link to="/makhraj/17">Al-Khaisyum (rongga hidung)</Link>.
                </p>
              )}
              {sameMakhraj.length > 0 && (
                <div className="row-wrap">
                  <span className="muted small">Satu makhraj:</span>
                  {sameMakhraj.map((l) => (
                    <Link key={l.id} to={`/huruf/${l.id}`} className="pill">
                      <Ar className="ar--inline">{l.char}</Ar> {l.name}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === 'sifat' && (
            <ul className="sifat-chips">
              {sifat.map((s) => (
                <li key={s.id}>
                  <Link to={`/sifat/${s.id}`} className={`pill${s.group === 'single' ? ' pill--single' : ''}`} title={s.meaning}>
                    {s.name} <Ar className="ar--inline">{s.arabic}</Ar>
                  </Link>
                  <span className="muted small">
                    {s.meaning}
                    {s.condition ? ` — ${s.condition}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {tab === 'salah' && (
            <ul className="list">
              {letter.mistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {tab === 'mirip' && (
            <div className="confuse-list">
              {letter.confusedWith.map((cid) => {
                const c = getLetter(cid)!
                return (
                  <div key={cid} className="confuse">
                    <Link to={`/huruf/${cid}`} className="pill">
                      <Ar className="ar--inline">{c.char}</Ar> {c.name}
                    </Link>
                    <Link to={`/bandingkan?a=${letter.id}&b=${cid}`} className="btn btn--ghost btn--sm">
                      <ArrowsLeftRight size={14} /> Bandingkan
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="side__foot">
          <Link className="btn btn--ghost btn--sm" to={`/kuis?huruf=${letter.id}`}>
            Kuis
          </Link>
          <ReportButton context={`Huruf ${letter.name} (${letter.char})`} />
          <span className="spacer" />
          {prev && (
            <Link className="btn btn--ghost btn--sm" to={`/huruf/${prev.id}`} title={`Sebelumnya: ${prev.name} (←)`}>
              <ArrowLeft size={14} /> <Ar className="ar--inline">{prev.char}</Ar>
            </Link>
          )}
          {next && (
            <Link className="btn btn--ghost btn--sm" to={`/huruf/${next.id}`} title={`Berikutnya: ${next.name} (→)`}>
              <Ar className="ar--inline">{next.char}</Ar> <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </article>
    </div>
  )
}
