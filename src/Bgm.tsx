import { useEffect, useRef, useState } from 'react'
import './bgm.css'

/**
 * Musik latar: satu berkas loop (`public/bgm.mp3`, 60 dtk) plus tombol kecil di
 * pojok kanan atas.
 *
 * Dua hal yang membuat ini tidak mengganggu:
 *
 * 1. **Pilihan anak diingat.** Preferensi disimpan di `localStorage`; mematikan
 *    musik sekali berarti tetap mati saat halaman dibuka lagi.
 * 2. **Autoplay tidak dipaksa.** Browser menolak audio bersuara sebelum ada
 *    gestur, jadi percobaan pertama dibungkus dan diulang sekali pada sentuhan
 *    atau tombol pertama — bukan tiap event, dan bukan `alert` kalau ditolak.
 *
 * Volume sengaja rendah (0,35): ini latar, bukan pertunjukan.
 */

const STORAGE_KEY = 'rambu:bgm'
const VOLUME = 0.35

function readOn(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    // Mode privat/gagal storage: musik tetap boleh main, pilihan tidak diingat.
    return true
  }
}

function writeOn(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Tidak ada yang perlu dilakukan: pilihan hanya berlaku sesi ini.
  }
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {on ? (
        <>
          <path
            d="M15.2 9a4.2 4.2 0 0 1 0 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d="M15 9.5l5 5m0-5l-5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export default function Bgm() {
  const [on, setOn] = useState<boolean>(readOn)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (!on) {
      el.pause()
      return
    }

    el.volume = VOLUME
    let cancelled = false

    const attempt = () => {
      if (cancelled) return
      // jsdom tidak punya pemutaran media; `play()` bisa mengembalikan
      // `undefined` atau Promise yang ditolak karena autoplay.
      try {
        const started = el.play()
        if (started && typeof started.catch === 'function') started.catch(() => {})
      } catch {
        // Autoplay ditolak: gestur pertama di bawah yang akan mencoba lagi.
      }
    }

    attempt()

    const retryOnGesture = () => {
      if (!el.paused) return
      attempt()
    }
    window.addEventListener('pointerdown', retryOnGesture)
    window.addEventListener('keydown', retryOnGesture)
    return () => {
      cancelled = true
      window.removeEventListener('pointerdown', retryOnGesture)
      window.removeEventListener('keydown', retryOnGesture)
    }
  }, [on])

  const toggle = () => {
    setOn((current) => {
      const next = !current
      writeOn(next)
      return next
    })
  }

  return (
    <>
      <audio ref={audioRef} src="/bgm.mp3" loop preload="none" aria-hidden="true" />
      <button
        type="button"
        className="bgm-toggle"
        aria-pressed={on}
        aria-label={on ? 'Matikan musik latar' : 'Nyalakan musik latar'}
        title={on ? 'Matikan musik latar' : 'Nyalakan musik latar'}
        onClick={toggle}
      >
        <SpeakerIcon on={on} />
      </button>
    </>
  )
}
