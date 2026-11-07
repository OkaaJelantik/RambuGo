import { useEffect, useRef, useState } from 'react'
import type { StoryBeat, StoryButton } from './story'
import Kid from './Kid'
import './dialog.css'

type Props = {
  /** Beat yang harus tampil; `null` memulai animasi keluar. */
  beat: StoryBeat | null
  /** Panel meneruskan tombol apa adanya; App yang tahu arti aksinya. */
  onAction: (button: StoryButton) => void
}

/** Lama animasi keluar, sama dengan durasi di dialog.css. */
const EXIT_MS = 160

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Panel dialog bawah: wajah Aku 56 px, kalimatnya, lalu tombol-tombol beat.
 *
 * Panel hidup di atas scene (fixed), jadi muncul/hilangnya tidak menggeser
 * tata letak apa pun. Saat beat hilang, panel masih digambar satu animasi
 * pendek supaya tidak "pop"; pada `prefers-reduced-motion` animasi itu
 * dimatikan dan panel langsung hilang.
 */
export default function DialoguePanel({ beat, onAction }: Props) {
  const [view, setView] = useState<StoryBeat | null>(beat)
  const [leaving, setLeaving] = useState(false)
  const reduced = useRef(prefersReducedMotion())
  const hasView = view !== null

  useEffect(() => {
    if (beat) {
      setView(beat)
      setLeaving(false)
      return
    }
    if (!hasView) return

    setLeaving(true)
    const timer = window.setTimeout(
      () => {
        setView(null)
        setLeaving(false)
      },
      reduced.current ? 0 : EXIT_MS,
    )
    return () => window.clearTimeout(timer)
  }, [beat, hasView])

  if (!view) return null

  const lastIndex = view.buttons.length - 1

  return (
    <div
      className={leaving ? 'dlg dlg--out' : 'dlg'}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={leaving || undefined}
    >
      <div className="dlg-row">
        <div className="dlg-avatar" aria-hidden="true">
          <Kid />
        </div>
        <p className="dlg-text">{view.text}</p>
      </div>

      <div className="dlg-actions">
        {view.buttons.map((button, index) => (
          <button
            key={`${button.action}-${button.label}`}
            type="button"
            className={`dlg-btn${index === lastIndex ? ' dlg-btn--primary' : ''}`}
            onClick={() => onAction(button)}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  )
}
