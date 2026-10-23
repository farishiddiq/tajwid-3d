import { useState } from 'react'
import { Tabs } from '../components/common'
import { SHORTCUTS } from '../components/Layout'
import { config, makhrajNote } from '../content'
import { useApp } from '../store'
import { LegendPanel } from '../viewer/Viewer'

type Tab = 'status' | 'setelan' | 'kode' | 'pintasan'

export default function AboutPage() {
  const { allowTts, setAllowTts, showTranslit, setShowTranslit, defaultSpeed, setDefaultSpeed, renderMode, setRenderMode } = useApp()
  const [tab, setTab] = useState<Tab>('status')
  return (
    <div className="page">
      <div className="page__head page__head--row">
        <h1>Tentang Tajwid 3D</h1>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'status', label: 'Status & rujukan' },
            { id: 'setelan', label: 'Pengaturan' },
            { id: 'kode', label: 'Kode visual' },
            { id: 'pintasan', label: 'Mode guru & pintasan' },
          ]}
        />
      </div>
      <div className="about card">
        {tab === 'status' && (
          <>
            <h2>Status & validasi konten</h2>
            <p>
              <strong>{config.contentStatus === 'draft' ? 'Draf' : 'Tervalidasi'}.</strong> {config.contentStatusNote}
            </p>
            <ul className="list">
              <li>Riwayat Hafs 'an 'Ashim; pembagian 17 makhraj menurut Imam Ibnul Jazari (Matan Al-Jazariyah).</li>
              <li>Setiap animasi, teks, contoh ayat, dan audio wajib di-review ustadz bersanad sebelum dirilis.</li>
              <li>Model anatomi sengaja disederhanakan agar mudah dipahami — bukan simulasi medis.</li>
              <li>Audio: rekaman qari bersanad belum tersedia. Sementara, jika perangkat punya suara Arab, dipakai suara sintetis yang ditandai jelas.</li>
              <li>Rujukan: Matan Al-Jazariyah dan syarahnya; buku tajwid standar yang dipakai di Indonesia.</li>
            </ul>
            <p className="note">{makhrajNote}</p>
          </>
        )}
        {tab === 'setelan' && (
          <div className="settings">
            <label className="check">
              <input type="checkbox" checked={allowTts} onChange={(e) => setAllowTts(e.target.checked)} /> Pakai suara sintetis saat rekaman qari belum ada
            </label>
            <label className="check">
              <input type="checkbox" checked={showTranslit} onChange={(e) => setShowTranslit(e.target.checked)} /> Tampilkan transliterasi Latin
            </label>
            <label>
              Kecepatan awal{' '}
              <select value={defaultSpeed} onChange={(e) => setDefaultSpeed(parseFloat(e.target.value))}>
                <option value={1}>1x</option>
                <option value={0.5}>0.5x</option>
                <option value={0.25}>0.25x</option>
              </select>
            </label>
            <label>
              Tampilan model{' '}
              <select value={renderMode} onChange={(e) => setRenderMode(e.target.value as typeof renderMode)}>
                <option value="auto">Otomatis</option>
                <option value="3d">3D</option>
                <option value="2d">2D ringan</option>
              </select>
            </label>
            <button
              className="btn btn--ghost"
              onClick={() => {
                if (confirm('Hapus progres belajar dan riwayat kuis di perangkat ini?')) useApp.setState({ learned: [], quizHistory: [] })
              }}
            >
              Hapus progres di perangkat ini
            </button>
          </div>
        )}
        {tab === 'kode' && (
          <>
            <p>Setiap fenomena punya satu warna dan satu bentuk yang sama di seluruh website.</p>
            <LegendPanel inline />
          </>
        )}
        {tab === 'pintasan' && (
          <>
            <p>
              Tekan <kbd>P</kbd> untuk mode guru (teks besar, UI ringkas) dan <kbd>F</kbd> untuk layar penuh — cocok untuk proyektor/TV.
            </p>
            <table className="keys keys--cols">
              <tbody>
                {SHORTCUTS.map(([k, d]) => (
                  <tr key={k}>
                    <td>
                      <kbd>{k}</kbd>
                    </td>
                    <td>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
