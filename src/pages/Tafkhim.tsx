import { Info } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Ar, ReportButton, Tabs } from '../components/common'
import { tafkhim, type Rule, type Variant } from '../content'
import { buildSpec } from '../engine/spec'
import { ViewerController } from '../viewer/controller'
import Viewer from '../viewer/Viewer'

type Tab = 'ra' | 'lam' | 'alif' | 'levels'
type Group = 'tebal' | 'tipis' | 'boleh'
const TABS: { id: Tab; label: string; letter: string }[] = [
  { id: 'ra', label: 'Ra', letter: 'ra' },
  { id: 'lam', label: 'Lam jalalah', letter: 'lam' },
  { id: 'alif', label: 'Alif mad', letter: 'alif_mad' },
  { id: 'levels', label: "Tingkatan isti'la", letter: 'qof' },
]

function RuleList({ rules, tone }: { rules: Rule[]; tone: 'tebal' | 'tipis' | 'boleh' }) {
  return (
    <section className={`rules rules--${tone}`}>
      <ol>
        {rules.map((r) => (
          <li key={r.rule}>
            <p>{r.rule}</p>
            <ul className="examples">
              {r.examples.map((e) => (
                <li key={e.arabic}>
                  <Ar className="ar--md">{e.arabic}</Ar>
                  <span className="muted small">{e.ref}</span>
                </li>
              ))}
            </ul>
            {r.note && <p className="note">{r.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function TafkhimPage() {
  const [tab, setTab] = useState<Tab>('ra')
  const [variant, setVariant] = useState<Variant>('tafkhim')
  const [group, setGroup] = useState<Group>('tebal')
  const controller = useMemo(() => new ViewerController(), [])
  const t = TABS.find((x) => x.id === tab)!
  const spec = useMemo(() => buildSpec(t.letter, { variant: tab === 'levels' ? undefined : variant, focus: 'tongue' }), [t, variant, tab])

  const choose = (v: Variant) => {
    setVariant(v)
    setTimeout(() => controller.timeline.restart(), 0)
  }

  const groups: Record<Exclude<Tab, 'levels'>, { title: string; desc?: string; note?: string; sets: { id: Group; label: string; rules: Rule[]; tone: 'tebal' | 'tipis' | 'boleh' }[] }> = {
    ra: {
      title: tafkhim.ra.title,
      sets: [
        { id: 'tebal', label: `Tebal (${tafkhim.ra.tafkhim.length})`, rules: tafkhim.ra.tafkhim, tone: 'tebal' },
        { id: 'tipis', label: `Tipis (${tafkhim.ra.tarqiq.length})`, rules: tafkhim.ra.tarqiq, tone: 'tipis' },
        { id: 'boleh', label: `Boleh keduanya (${tafkhim.ra.jawaz.length})`, rules: tafkhim.ra.jawaz, tone: 'boleh' },
      ],
    },
    lam: {
      title: tafkhim.lam.title,
      note: 'Lam selain lafzhul jalalah selalu dibaca tipis.',
      sets: [
        { id: 'tebal', label: 'Tebal', rules: tafkhim.lam.tafkhim, tone: 'tebal' },
        { id: 'tipis', label: 'Tipis', rules: tafkhim.lam.tarqiq, tone: 'tipis' },
      ],
    },
    alif: {
      title: tafkhim.alif.title,
      desc: tafkhim.alif.description,
      sets: [
        { id: 'tebal', label: 'Tebal', rules: tafkhim.alif.tafkhim, tone: 'tebal' },
        { id: 'tipis', label: 'Tipis', rules: tafkhim.alif.tarqiq, tone: 'tipis' },
      ],
    },
  }
  const cur = tab === 'levels' ? null : groups[tab]
  const set = cur?.sets.find((s) => s.id === group) ?? cur?.sets[0]

  // memilih kelompok kaidah sekaligus mengganti animasi (tebal ↔ tipis)
  const chooseGroup = (g: Group) => {
    setGroup(g)
    if (g === 'tebal') choose('tafkhim')
    if (g === 'tipis') choose('tarqiq')
  }

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <h1 title={tafkhim.intro}>Tebal & tipis</h1>
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v)
            chooseGroup('tebal')
          }}
          tabs={TABS.map((x) => ({ id: x.id, label: x.label }))}
        />
        <span className="info" title={tafkhim.intro} aria-label={tafkhim.intro} tabIndex={0}>
          <Info size={13} />
        </span>
      </div>
      <div className="ws ws--tafkhim">
        <section className="ws__main">
          <Viewer spec={spec} controller={controller} autoPlay keyboard title={tab === 'levels' ? 'ق — huruf isti\'la' : `${t.label}: ${variant === 'tafkhim' ? 'tebal' : 'tipis'}`} />
          {tab !== 'levels' && (
            <div className="harakat" role="group" aria-label="Animasi tebal atau tipis">
              <button className={`harakat__btn harakat__btn--wide${variant === 'tafkhim' ? ' harakat__btn--on' : ''}`} onClick={() => chooseGroup('tebal')}>
                <strong>Tebal</strong>
                <span>pangkal lidah naik</span>
              </button>
              <button className={`harakat__btn harakat__btn--wide${variant === 'tarqiq' ? ' harakat__btn--on' : ''}`} onClick={() => chooseGroup('tipis')}>
                <strong>Tipis</strong>
                <span>pangkal lidah turun</span>
              </button>
            </div>
          )}
        </section>
        <aside className="side card">
          {cur && set && (
            <>
              <h2>{cur.title}</h2>
              {cur.desc && <p className="small">{cur.desc}</p>}
              <Tabs small value={set.id} onChange={chooseGroup} tabs={cur.sets.map((s) => ({ id: s.id, label: s.label }))} />
              <div className="side__body">
                <RuleList rules={set.rules} tone={set.tone} />
                {cur.note && <p className="muted small">{cur.note}</p>}
              </div>
            </>
          )}
          {tab === 'levels' && (
            <>
              <h2>{tafkhim.levels.title}</h2>
              <p className="note">{tafkhim.levels.note}</p>
              <ol className="levels side__body">
                {tafkhim.levels.items.map((l) => (
                  <li key={l.level}>
                    <Ar className="ar--md">{l.example}</Ar>
                    <span>{l.label}</span>
                    <span className="bar" aria-label={`kekuatan ${Math.round(l.strength * 100)}%`}>
                      <span style={{ width: `${l.strength * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="side__foot">
            <ReportButton context={`Tafkhim/tarqiq: ${t.label}`} />
          </div>
        </aside>
      </div>
    </div>
  )
}
