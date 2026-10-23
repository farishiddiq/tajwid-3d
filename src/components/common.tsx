import { Check, Copy, Flag } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import type React from 'react'
import { Link } from 'react-router-dom'
import { config, consonants, getMakhraj, letterHasSifat, madLetters, type Letter } from '../content'
import { useApp } from '../store'

export function Ar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span lang="ar" dir="rtl" className={`ar ${className}`}>
      {children}
    </span>
  )
}

/** Mengisolasi potongan teks Arab di dalam kalimat Latin agar urutannya tidak terbalik (bidi). */
export function Bidi({ text }: { text: string }) {
  const parts = text.split(/([؀-ۿ][؀-ۿ\s]*[؀-ۿ]|[؀-ۿ])/)
  return (
    <>
      {parts.map((p, i) =>
        /[؀-ۿ]/.test(p) ? (
          <bdi key={i} lang="ar" className="ar ar--inline">
            {p}
          </bdi>
        ) : (
          p
        ),
      )}
    </>
  )
}

export function DraftBadge() {
  if (config.contentStatus !== 'draft') return null
  return (
    <span className="draft" title={config.contentStatusNote}>
      Draf · belum divalidasi ustadz
    </span>
  )
}

export function LetterTile({ letter, dim, highlight, active, to, onClick }: { letter: Letter; dim?: boolean; highlight?: boolean; active?: boolean; to?: string; onClick?: () => void }) {
  const learned = useApp((s) => s.learned.includes(letter.id))
  const showTranslit = useApp((s) => s.showTranslit)
  const cls = `tile${dim ? ' tile--dim' : ''}${highlight ? ' tile--hl' : ''}${active ? ' tile--active' : ''}${letter.mad ? ' tile--mad' : ''}`
  const body = (
    <>
      <Ar className="tile__char">{letter.char}</Ar>
      <span className="tile__name">
        {letter.name.replace('Alif / ', '')}
        {showTranslit && <em> {letter.translit}</em>}
      </span>
      <span className="tile__mk" title={getMakhraj(letter.makhraj)?.name}>
        M{letter.makhraj}
      </span>
      {learned && (
        <span className="tile__done" aria-label="sudah dipelajari">
          <Check size={11} weight="bold" />
        </span>
      )}
    </>
  )
  if (onClick)
    return (
      <button className={cls} onClick={onClick} title={letter.name} aria-label={`${letter.name}${highlight ? ' (memiliki sifat)' : ''}`}>
        {body}
      </button>
    )
  return (
    <Link className={cls} to={to ?? `/huruf/${letter.id}`} title={letter.name} aria-current={active ? 'page' : undefined} aria-label={`${letter.name}${highlight ? ' (memiliki sifat)' : ''}${learned ? ', sudah dipelajari' : ''}`}>
      {body}
    </Link>
  )
}

/**
 * Grid 28 huruf + 3 huruf mad dalam satu kotak yang mengisi ruang induknya (tanpa scroll).
 * size: "fill" = ubin besar mengisi area, "mini" = ubin kecil untuk panel samping.
 */
export function LetterGrid({ sifat, includeMad = true, onPick, size = 'fill', cols, activeId }: { sifat?: string; includeMad?: boolean; onPick?: (l: Letter) => void; size?: 'fill' | 'mini'; cols?: number; activeId?: string }) {
  const list = includeMad ? [...consonants, ...madLetters] : consonants
  const c = cols ?? (size === 'mini' ? 6 : 8)
  return (
    <div className={`grid grid--${size}`} dir="rtl" style={{ gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.ceil(list.length / c)}, minmax(0, 1fr))` }}>
      {list.map((l, i) => {
        const has = sifat ? letterHasSifat(l.id, sifat) : undefined
        return (
          <div key={l.id} className="grid__cell" style={{ '--i': i } as React.CSSProperties}>
            <LetterTile letter={l} dim={has === false} highlight={has === true} active={l.id === activeId} onClick={onPick ? () => onPick(l) : undefined} />
          </div>
        )
      })}
    </div>
  )
}

/** Tab sederhana: konten panjang dipecah per tab agar muat satu layar. */
export function Tabs<T extends string>({ tabs, value, onChange, small }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={`tabs${small ? ' tabs--small' : ''}`} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab${value === t.id ? ' tab--on' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function ReportButton({ context }: { context: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const body = `Konteks: ${context}\nHalaman: ${location.href}\n\nKesalahan yang ditemukan:\n${text}`
  return (
    <>
      <button className="btn btn--ghost btn--sm" onClick={() => setOpen(true)} title="Laporkan kesalahan konten">
        <Flag size={14} /> Laporkan
      </button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Laporkan kesalahan konten" onClick={() => setOpen(false)}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <h3>Laporkan kesalahan konten</h3>
            <p className="muted">Akurasi materi Al-Qur'an adalah prioritas. Jelaskan apa yang keliru (animasi, teks, audio, atau contoh ayat).</p>
            <p className="muted small">Konteks: {context}</p>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Mis. posisi ujung lidah pada ث seharusnya…" autoFocus />
            <div className="modal__actions">
              {config.reportEmail ? (
                <a className="btn" href={`mailto:${config.reportEmail}?subject=${encodeURIComponent('[Tajwid 3D] Laporan kesalahan: ' + context)}&body=${encodeURIComponent(body)}`}>
                  Kirim lewat email
                </a>
              ) : null}
              <button
                className="btn btn--ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(body).then(() => setCopied(true))
                }}
              >
                {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />} {copied ? 'Tersalin' : 'Salin laporan'}
              </button>
              <button className="btn btn--ghost" onClick={() => setOpen(false)}>
                Tutup
              </button>
            </div>
            {!config.reportEmail && <p className="muted small">Alamat penerima laporan belum diatur (src/content/config.json → reportEmail). Untuk sementara, salin laporan dan kirim ke tim.</p>}
          </div>
        </div>
      )}
    </>
  )
}
