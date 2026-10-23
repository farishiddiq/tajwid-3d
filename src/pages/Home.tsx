import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Ar, LetterGrid } from '../components/common'
import { letters } from '../content'
import { buildSpec } from '../engine/spec'
import { useApp } from '../store'
import { ViewerController } from '../viewer/controller'
import Viewer2D from '../viewer/Viewer2D'

const ENTRIES = [
  { to: '/makhraj', num: '17', title: 'Makharijul huruf', desc: '5 area, 17 titik keluarnya huruf' },
  { to: '/sifat', num: '18', title: 'Sifat huruf', desc: "Hams, jahr, isti'la, qalqalah… lewat visual" },
  { to: '/bandingkan', num: '2×', title: 'Bandingkan', desc: 'س vs ص, ح vs ه, ra tebal vs tipis' },
  { to: '/tafkhim', num: 'ر', title: 'Tebal & tipis', desc: 'Ra, lam jalalah, alif mad' },
  { to: '/kuis', num: '?', title: 'Kuis singkat', desc: '5 soal: makhraj, audio, sifat' },
]

export default function Home() {
  const learned = useApp((s) => s.learned.length)
  // ilustrasi ringan (2D) agar halaman pertama cepat interaktif; model 3D dimuat saat membuka huruf
  const preview = useMemo(() => {
    const c = new ViewerController()
    c.timeline.seek(1.7)
    return { c, spec: buildSpec('qof') }
  }, [])
  return (
    <div className="page ws ws--home">
      <section className="home__intro">
        <h1>Lihat apa yang terjadi di dalam mulut saat membaca huruf hijaiyah</h1>
        <p className="muted">
          Model 3D mulut, tenggorokan, dan hidung — bisa diputar, diperbesar, dan diperlambat. {learned > 0 ? `${learned}/${letters.length} huruf sudah dipelajari.` : 'Progres tersimpan di perangkat ini.'}
        </p>
        <nav className="entries" aria-label="Mulai belajar">
          {ENTRIES.map((e) => (
            <Link key={e.to} to={e.to} className="entry">
              <span className="entry__num">{e.num}</span>
              <span>
                <strong>{e.title}</strong>
                <span className="entry__desc">{e.desc}</span>
              </span>
            </Link>
          ))}
        </nav>
        <Link to="/huruf/qof" className="home__art" aria-label="Buka kartu huruf Qof">
          <Viewer2D spec={preview.spec} controller={preview.c} hideLabels />
          <span className="home__caption">
            <Ar className="ar--inline">أَقْ</Ar> pangkal lidah menyentuh langit-langit lunak
          </span>
        </Link>
      </section>
      <section className="home__grid" aria-label="Pilih huruf">
        <div className="rail__h">Pilih huruf untuk membuka kartunya</div>
        <LetterGrid cols={7} />
      </section>
    </div>
  )
}
