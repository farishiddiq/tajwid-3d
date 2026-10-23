import { CornersOut, List, Presentation, Question } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { config } from '../content'
import { useApp } from '../store'

const NAV = [
  { to: '/huruf', label: 'Huruf' },
  { to: '/makhraj', label: 'Makhraj' },
  { to: '/sifat', label: 'Sifat' },
  { to: '/bandingkan', label: 'Bandingkan' },
  { to: '/tafkhim', label: 'Tebal & tipis' },
  { to: '/kuis', label: 'Kuis' },
  { to: '/tentang', label: 'Tentang' },
]

export const SHORTCUTS: [string, string][] = [
  ['Spasi', 'Putar / jeda'],
  ['Enter', 'Ulang dari awal'],
  ['1 / 2 / 3', 'Kecepatan 0.25x / 0.5x / 1x'],
  [', / .', 'Fase sebelumnya / berikutnya'],
  ['L', 'Loop'],
  ['← / →', 'Huruf sebelumnya / berikutnya'],
  ['V', 'Ganti sudut kamera'],
  ['C', 'Reset kamera'],
  ['T', 'Kulit transparan / tampil'],
  ['P', 'Mode guru (presentasi)'],
  ['F', 'Layar penuh'],
  ['?', 'Daftar pintasan'],
]

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen?.().catch(() => undefined)
}

export default function Layout() {
  const presentation = useApp((s) => s.presentation)
  const setPresentation = useApp((s) => s.setPresentation)
  const [help, setHelp] = useState(false)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    setMenu(false)
  }, [loc.pathname])
  useEffect(() => {
    document.body.classList.toggle('presentation', presentation)
  }, [presentation])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'p' || e.key === 'P') setPresentation(!useApp.getState().presentation)
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else if (e.key === '?') setHelp((h) => !h)
      else if (e.key === 'Escape') {
        setHelp(false)
        if (useApp.getState().presentation && !document.fullscreenElement) setPresentation(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPresentation])

  return (
    <div className="app">
      <a className="skip" href="#main">
        Lompat ke konten
      </a>
      <header className="header">
        <Link to="/" className="brand" aria-label="Tajwid 3D — beranda">
          <span className="brand__mark" lang="ar">
            ت
          </span>
          <span>
            Tajwid <b>3D</b>
          </span>
        </Link>
        <button className="header__menu btn btn--ghost" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="nav">
          <List /> Menu
        </button>
        <nav id="nav" className={`nav${menu ? ' nav--open' : ''}`} aria-label="Navigasi utama">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav__link${isActive ? ' nav__link--on' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="header__tools">
          {config.contentStatus === 'draft' && (
            <Link to="/tentang" className="draft draft--header" title={`${config.contentStatusNote} Riwayat Hafs 'an 'Ashim · 17 makhraj menurut Imam Ibnul Jazari.`}>
              Draf · belum divalidasi
            </Link>
          )}
          <button className={`btn btn--ghost${presentation ? ' btn--on' : ''}`} onClick={() => setPresentation(!presentation)} aria-pressed={presentation} title="Mode guru / presentasi (P)">
            <Presentation /> {presentation ? 'Keluar mode guru' : 'Mode guru'}
          </button>
          <button className="btn btn--ghost btn--icon" onClick={toggleFullscreen} title="Layar penuh (F)" aria-label="Layar penuh">
            <CornersOut />
          </button>
          <button className="btn btn--ghost btn--icon" onClick={() => setHelp(true)} title="Pintasan keyboard (?)" aria-label="Pintasan keyboard">
            <Question />
          </button>
        </div>
      </header>
      {presentation && (
        <div className="presbar">
          Mode guru aktif · <kbd>Spasi</kbd> putar · <kbd>←</kbd>
          <kbd>→</kbd> huruf · <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd> kecepatan · <kbd>V</kbd> kamera · <kbd>Esc</kbd> keluar
        </div>
      )}
      <main id="main" className="main">
        <Outlet />
      </main>
      {help && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Pintasan keyboard" onClick={() => setHelp(false)}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <h3>Pintasan keyboard</h3>
            <table className="keys">
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
            <div className="modal__actions">
              <button className="btn" onClick={() => setHelp(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
