import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import GroundScene from './scene/GroundScene'
import { KERB_X, SIDEWALK_CENTRE, offsetX, pxAt, yAt } from './scene/projection'
import './junction.css'

type Props = {
  onExplore: () => void
  onMateri: () => void
  onKuis: () => void
  /** Judul; App memfokuskannya saat persimpangan menjadi tujuan fokus. */
  headingRef?: RefObject<HTMLHeadingElement | null>
}

/** Papan tujuan diletakkan di ruang meter yang sama dengan jalan. */
type Board = {
  id: 'materi' | 'kuis' | 'lurus'
  label: string
  /** Sisi jalan tempat papan berdiri, dalam meter dari garis kamera. */
  x: number
  /** Kedalaman papan: makin jauh makin kecil, seperti prop scene. */
  depth: number
  action: () => void
}

/**
 * Persimpangan 2.5D.
 *
 * Dulu layar ini (`Crossroad`) adalah ilustrasi datar sendiri — keluar dari
 * dunia yang barusan dijalani anak. Sekarang jalan samping melintang di depan
 * memakai proyeksi yang sama dengan scene berjalan (`offsetX`, `yAt`, `pxAt`),
 * trotoar kita menerus menyeberanginya, dan tiga papan tujuan berdiri di ruang
 * meter itu: kiri belajar, lurus jalan lagi, kanan kuis.
 */
export default function Junction({ onExplore, onMateri, onKuis, headingRef }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  // Ukuran awal dari jendela: jsdom (dan paint pertama) belum punya
  // clientWidth, dan papan yang belum terukur tidak boleh invisible — papan
  // yang tak terlihat juga tak ada di accessibility tree.
  const [size, setSize] = useState(() => ({
    w: typeof window === 'undefined' ? 0 : window.innerWidth,
    h: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))

  useLayoutEffect(() => {
    const measure = () => {
      const el = hostRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      if (w && h) setSize({ w, h })
    }
    measure()
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [])

  const { w, h } = size

  /** Busur jalan samping: pita melintang pada kedalaman 0,34–0,50. */
  const crossing = (() => {
    if (!w || !h) return null
    const near = 0.34
    const far = 0.5
    const left = -2.4
    const right = 3.2
    const pt = (x: number, d: number) => `${offsetX(x, d, w, h)},${yAt(d) * h}`
    return {
      near: [pt(left, near), pt(right, near)].join(' '),
      far: [pt(left, far), pt(right, far)].join(' '),
      edgeNear: [pt(left, near), pt(right, near)].join(' '),
    }
  })()

  const boards: Board[] = [
    { id: 'materi', label: 'Belajar rambu', x: -2.05, depth: 0.42, action: onMateri },
    { id: 'lurus', label: 'Jalan lagi', x: SIDEWALK_CENTRE, depth: 0.62, action: onExplore },
    { id: 'kuis', label: 'Main kuis', x: KERB_X + 0.85, depth: 0.42, action: onKuis },
  ]

  const place = (board: Board): CSSProperties => {
    if (!w || !h) return {}
    const plate = pxAt(0.78, board.depth, h)
    return {
      left: `${Math.round(offsetX(board.x, board.depth, w, h))}px`,
      top: `${Math.round(yAt(board.depth) * h)}px`,
      width: `${Math.round(plate)}px`,
      padding: `${Math.round(plate * 0.12)}px ${Math.round(plate * 0.16)}px`,
      fontSize: `${Math.max(12, Math.round(plate * 0.19))}px`,
    }
  }

  return (
    <div className="jn" ref={hostRef}>
      {w > 0 && h > 0 && <GroundScene width={w} height={h} />}

      {crossing && (
        <svg className="jn-road" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {/* jalan samping: satu bidang melintang, warnanya sama dengan jalan */}
          <polygon
            points={`${crossing.near} ${crossing.far
              .split(' ')
              .reverse()
              .join(' ')}`}
            fill="var(--road)"
          />
          {/* marka putus-putus jalan samping, mengikuti garis melintang */}
          <polyline
            points={`${offsetX(-2.4, 0.42, w, h)},${yAt(0.42) * h} ${offsetX(3.2, 0.42, w, h)},${
              yAt(0.42) * h
            }`}
            stroke="var(--road-line)"
            strokeWidth={Math.max(3, pxAt(0.14, 0.42, h))}
            strokeDasharray={`${pxAt(0.45, 0.42, h)} ${pxAt(0.35, 0.42, h)}`}
          />
        </svg>
      )}

      <h2 className="jn-title" ref={headingRef} tabIndex={-1}>
        Kamu sampai di persimpangan
      </h2>

      <div className="jn-boards">
        {boards.map((board) => (
          <button
            key={board.id}
            type="button"
            className={`jn-board jn-board--${board.id}`}
            style={place(board)}
            onClick={board.action}
            aria-label={`${board.label}: ${
              board.id === 'materi'
                ? 'baca arti semua rambu'
                : board.id === 'kuis'
                  ? 'uji pemahaman rambu'
                  : 'lanjut berjalan mencari rambu lain'
            }`}
          >
            <span className="jn-board__post" aria-hidden="true" />
            <span className="jn-board__plate">{board.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
