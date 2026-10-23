import { ArrowRight, Check, SpeakerHigh, X } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ar } from '../components/common'
import { getLetter, getMakhraj, getSifat, harakatText, letterHasSifat, letters, makhrajPoints, sifatOfLetter, type Letter } from '../content'
import { audioSource, loadManifest, playSyllable } from '../engine/audio'
import { buildSpec } from '../engine/spec'
import { useApp } from '../store'
import { ViewerController } from '../viewer/controller'
import Viewer from '../viewer/Viewer'

type Kind = 'makhraj' | 'audio' | 'sifat' | 'pair'
interface Option {
  id: string
  label: string
  ar?: string
}
interface Question {
  kind: Kind
  prompt: string
  letterId?: string
  options: Option[]
  answer: string
  explanation: string
}

const KIND_LABEL: Record<Kind, string> = {
  makhraj: 'Tebak makhraj dari animasi',
  audio: 'Tebak huruf dari audio',
  sifat: 'Pilih huruf dengan sifat tertentu',
  pair: 'Cocokkan pasangan sifat',
}

const shuffle = <T,>(a: T[]) => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const pickOne = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

const PAIRS = [['hams', 'jahr'], ['syiddah', 'tawassuth', 'rakhawah'], ['istila', 'istifal'], ['ithbaq', 'infitah'], ['idzlaq', 'ishmat']]
const PICKABLE_SIFAT = ['hams', 'syiddah', 'tawassuth', 'istila', 'ithbaq', 'idzlaq', 'shafir', 'qalqalah', 'inhiraf']

function makhrajQ(l: Letter): Question {
  const correct = getMakhraj(l.makhraj)!
  const others = shuffle(makhrajPoints.filter((m) => m.id !== correct.id && m.id !== 17)).slice(0, 3)
  return {
    kind: 'makhraj',
    prompt: 'Perhatikan animasinya. Dari makhraj mana huruf ini keluar?',
    letterId: l.id,
    options: shuffle([correct, ...others]).map((m) => ({ id: String(m.id), label: `${m.id}. ${m.name}` })),
    answer: String(correct.id),
    explanation: `Huruf ${l.name} (${l.char}) keluar dari makhraj ${correct.id}: ${correct.name}.`,
  }
}

function audioQ(l: Letter): Question {
  const pool = shuffle(letters.filter((x) => x.id !== l.id && !x.mad))
  const confused = l.confusedWith.map((c) => getLetter(c)!).filter((x) => !x.mad)
  const distractors = [...new Map([...confused, ...pool].map((x) => [x.id, x])).values()].slice(0, 3)
  return {
    kind: 'audio',
    prompt: 'Dengarkan bacaannya. Huruf apakah ini?',
    letterId: l.id,
    options: shuffle([l, ...distractors]).map((x) => ({ id: x.id, label: x.name, ar: x.char })),
    answer: l.id,
    explanation: `Itu huruf ${l.name} (${l.char}), dibaca ${l.test}.`,
  }
}

function sifatQ(sid?: string): Question {
  const s = getSifat(sid ?? pickOne(PICKABLE_SIFAT))!
  const withS = letters.filter((l) => !l.mad && letterHasSifat(l.id, s.id))
  const without = letters.filter((l) => !l.mad && !letterHasSifat(l.id, s.id))
  const correct = pickOne(withS)
  return {
    kind: 'sifat',
    prompt: `Manakah huruf yang memiliki sifat ${s.name} (${s.meaning.toLowerCase()})?`,
    options: shuffle([correct, ...shuffle(without).slice(0, 3)]).map((x) => ({ id: x.id, label: x.name, ar: x.char })),
    answer: correct.id,
    explanation: `${correct.name} (${correct.char}) memiliki sifat ${s.name}. Huruf ${s.name}: ${withS.map((x) => x.char).join(' ')}.`,
  }
}

function pairQ(l: Letter): Question {
  const set = pickOne(PAIRS)
  const ans = set.find((s) => letterHasSifat(l.id, s))!
  return {
    kind: 'pair',
    prompt: `Huruf ${l.char} (${l.name}) memiliki sifat yang mana?`,
    letterId: l.id,
    options: set.map((sid) => {
      const s = getSifat(sid)!
      return { id: sid, label: `${s.name} — ${s.meaning.toLowerCase()}` }
    }),
    answer: ans,
    explanation: `${l.name} termasuk ${getSifat(ans)!.name}. Sifat lengkapnya: ${sifatOfLetter(l.id).map((s) => s.name).join(', ')}.`,
  }
}

function buildQuiz(focusLetter: Letter | undefined, audioOk: (l: Letter) => boolean, n = 5): Question[] {
  const qs: Question[] = []
  const consonantPool = letters.filter((l) => !l.mad)
  if (focusLetter) {
    qs.push(makhrajQ(focusLetter))
    if (!focusLetter.mad) qs.push(pairQ(focusLetter), pairQ(focusLetter))
    if (audioOk(focusLetter) && !focusLetter.mad) qs.push(audioQ(focusLetter))
  }
  const kinds: Kind[] = ['makhraj', 'sifat', 'pair', 'makhraj', 'audio', 'sifat', 'pair']
  let i = 0
  while (qs.length < n && i < 40) {
    const kind = kinds[i % kinds.length]
    i++
    const l = pickOne(consonantPool)
    if (kind === 'makhraj') qs.push(makhrajQ(l))
    else if (kind === 'audio') {
      if (audioOk(l)) qs.push(audioQ(l))
    } else if (kind === 'sifat') qs.push(sifatQ())
    else qs.push(pairQ(l))
  }
  return shuffle(qs.slice(0, n))
}

export default function QuizPage() {
  const [params] = useSearchParams()
  const focus = getLetter(params.get('huruf') ?? '')
  const allowTts = useApp((s) => s.allowTts)
  const history = useApp((s) => s.quizHistory)
  const addQuizResult = useApp((s) => s.addQuizResult)
  const [seed, setSeed] = useState(0)
  const [ready, setReady] = useState(false)
  const questions = useMemo(
    () => (ready ? buildQuiz(focus, (l) => audioSource(l.id, 'sukun', allowTts) !== 'none') : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, ready, focus?.id],
  )
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const controller = useMemo(() => new ViewerController(), [])

  const start = () => {
    void loadManifest().then(() => {
      setReady(true)
      setSeed((s) => s + 1)
      setIdx(0)
      setScore(0)
      setPicked(null)
      setDone(false)
    })
  }

  if (!ready) {
    const first = history[0]
    const last = history[history.length - 1]
    return (
      <div className="page page--center">
      <div className="quiz card">
        <div className="page__head">
          <h1>Kuis singkat</h1>
          <p className="lead">5 soal campuran: {Object.values(KIND_LABEL).join(', ').toLowerCase()}.</p>
          {focus && (
            <p>
              Fokus pada huruf <Ar className="ar--inline">{focus.char}</Ar> {focus.name}.
            </p>
          )}
        </div>
        {first && last && (
          <p className="note">
            Skor pertama: <strong>{Math.round((first.score / first.total) * 100)}%</strong> · skor terakhir: <strong>{Math.round((last.score / last.total) * 100)}%</strong> ({history.length} kali kuis)
          </p>
        )}
        <button className="btn btn--lg" onClick={start}>
          Mulai kuis
        </button>
      </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="page page--center">
      <div className="quiz card">
        <h1>Hasil</h1>
        <p className="quiz__score">
          {score} / {questions.length}
        </p>
        <p>{score === questions.length ? 'MasyaAllah, semua benar!' : score >= 3 ? 'Bagus! Ulangi huruf yang masih keliru.' : 'Coba putar ulang animasinya pelan-pelan (0.25x), lalu ulangi kuis.'}</p>
        <div className="row-wrap">
          <button className="btn" onClick={start}>
            Kuis lagi
          </button>
          <Link className="btn btn--ghost" to="/huruf">
            Kembali belajar
          </Link>
        </div>
      </div>
      </div>
    )
  }

  const q = questions[idx]
  if (!q) return null
  const ql = q.letterId ? getLetter(q.letterId) : undefined
  const correct = picked === q.answer

  const choose = (id: string) => {
    if (picked) return
    setPicked(id)
    if (id === q.answer) setScore((s) => s + 1)
  }
  const next = () => {
    if (idx + 1 >= questions.length) {
      addQuizResult({ date: new Date().toISOString(), score, total: questions.length })
      setDone(true)
    } else {
      setIdx(idx + 1)
      setPicked(null)
    }
  }

  const withViewer = q.kind === 'makhraj' && ql
  return (
    <div className="page">
      <div className="page__head page__head--row">
        <span className="quiz__progress" aria-label={`Soal ${idx + 1} dari ${questions.length}`}>
          {questions.map((_, i) => (
            <span key={i} className={`quiz__dot${i < idx ? ' quiz__dot--done' : i === idx ? ' quiz__dot--on' : ''}`} />
          ))}
        </span>
        <span className="muted small">
          Soal {idx + 1}/{questions.length} · {KIND_LABEL[q.kind]} · skor {score}
        </span>
      </div>
      <div className={`ws ${withViewer ? 'ws--quiz' : 'ws--quiz-solo'}`}>
      {withViewer && (
        <section className="ws__main">
          <Viewer spec={buildSpec(ql.id)} controller={controller} autoPlay hideLabels={!picked} compact />
        </section>
      )}
      <section className="quiz__panel">
      <h2>{q.prompt}</h2>
      {q.kind === 'audio' && ql && (
        <button className="btn btn--lg" onClick={() => playSyllable({ letterId: ql.id, harakat: 'sukun', text: harakatText(ql, 'sukun'), rate: 1, allowTts })}>
          <SpeakerHigh /> Putar audio
        </button>
      )}
      <div className="quiz__options" role="radiogroup" aria-label="Pilihan jawaban">
        {q.options.map((o) => {
          const state = picked ? (o.id === q.answer ? ' opt--right' : o.id === picked ? ' opt--wrong' : '') : ''
          return (
            <button key={o.id} role="radio" aria-checked={picked === o.id} className={`opt${state}`} onClick={() => choose(o.id)} disabled={!!picked}>
              {o.ar && <Ar className="opt__ar">{o.ar}</Ar>}
              <span>{o.label}</span>
              {picked && o.id === q.answer && (
                <span className="opt__mark" aria-label="benar">
                  <Check weight="bold" />
                </span>
              )}
              {picked && o.id === picked && o.id !== q.answer && (
                <span className="opt__mark" aria-label="salah">
                  <X weight="bold" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      {picked && (
        <div className={`feedback${correct ? ' feedback--ok' : ' feedback--no'}`} aria-live="polite">
          <strong>{correct ? 'Benar.' : 'Belum tepat.'}</strong> {q.explanation}
          <div>
            <button className="btn" onClick={next} autoFocus>
              {idx + 1 >= questions.length ? 'Lihat hasil' : 'Soal berikutnya'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
      </section>
      </div>
    </div>
  )
}
