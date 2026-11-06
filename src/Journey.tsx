import { useEffect, useState } from 'react'
import Kid from './Kid'
import { SignArt } from './SignArt'
import { WALK_SIGNS, type Sign } from './data'
import './journey.css'

type Props = {
  step: number
  onOpen: (sign: Sign) => void
}

/** Garis cakrawala: di atas ini langit, di bawah ini tanah. */
const HORIZON = 38

/**
 * Proyeksi satu dimensi sederhana: t = jauhnya (0 di kaki, 1 di cakrawala).
 * x, y (dalam %) dan skala mengecil makin jauh.
 */
function proj(t: number) {
  const s = 1 / (1 + 2.6 * t)
  return {
    y: HORIZON + (100 - HORIZON) * s,
    x: 50 + 36 * s,
    s,
  }
}

const LINES = [
  'Ayo jalan! Rambu pertama ada di depan. Tekan platnya, ya 👆',
  'Rambu berikutnya dekat. Tekan lagi 👆',
  'Satu rambu lagi sebelum sampai jalan raya 👆',
]

const DASHES = [0, 1, 2, 3, 4, 5, 6, 7]
const TREES_L = [0, 1, 2, 3, 4]
const TREES_R = [0, 1, 2, 3]

export default function Journey({ step, onOpen }: Props) {
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    if (step === 0) return
    setMoving(true)
    const id = setTimeout(() => setMoving(false), 1200)
    return () => clearTimeout(id)
  }, [step])

  return (
    <div className="pv-scene">
      <div className="pv-sky" />
      <div className="pv-sun" />
      <div className="pv-cloud c1" />
      <div className="pv-cloud c2" />

      <div className="pv-town">
        {[
          [6, 40, 74, '#a8bdb4'],
          [18, 54, 92, '#9db3aa'],
          [32, 32, 62, '#b0c4bb'],
          [62, 42, 80, '#a5bab1'],
          [74, 52, 96, '#9aafa6'],
          [88, 36, 68, '#aec2b9'],
        ].map(([l, w, h, c], i) => (
          <span
            key={i}
            style={{ left: `${l}%`, width: `${w}px`, height: `${h}px`, background: `${c}` }}
          />
        ))}
      </div>

      <div className="pv-hills" />
      <div className="pv-ground" />
      <div className="pv-walk left" />
      <div className="pv-walk right" />
      <div className="pv-road" />

      {/* marka jalan: bergerak ke arah kita tiap langkah */}
      <div className="pv-dashes">
        {DASHES.map((k) => {
          const t = ((k / DASHES.length + step * 0.2) % 1) * 0.95 + 0.04
          const p = proj(t)
          return (
            <i
              key={k}
              style={{ left: '50%', top: `${p.y}%`, scale: p.s, opacity: 0.35 + p.s * 0.65 }}
            />
          )
        })}
      </div>

      {/* pohon di kedua sisi, ikut menjauh */}
      <div className="pv-trees">
        {TREES_L.map((k) => {
          const t = ((k / TREES_L.length + step * 0.2) % 1) * 0.9 + 0.08
          const p = proj(t)
          return (
            <i
              key={`l${k}`}
              className="tree"
              style={{ left: `${50 - 46 * p.s}%`, top: `${p.y}%`, scale: p.s, opacity: 0.4 + p.s * 0.6 }}
            />
          )
        })}
        {TREES_R.map((k) => {
          const t = ((k / TREES_R.length + step * 0.2) % 1) * 0.9 + 0.08
          const p = proj(t)
          return (
            <i
              key={`r${k}`}
              className="tree"
              style={{ left: `${50 + 46 * p.s}%`, top: `${p.y}%`, scale: p.s, opacity: 0.4 + p.s * 0.6 }}
            />
          )
        })}
      </div>

      {/* rambu di sisi kanan jalan */}
      {WALK_SIGNS.map((sg, i) => {
        const t = 0.16 + (i - step) * 0.27
        if (t < 0.02) return null
        const p = proj(t)
        const state = i === step ? 'active' : i < step ? 'done' : 'next'
        return (
          <button
            key={sg.id}
            className={`pv-sign ${state}`}
            style={{
              left: `${50 + 31 * p.s}%`,
              top: `${p.y}%`,
              transform: `translate(-50%, -100%) scale(${p.s})`,
            }}
            onClick={() => i === step && !moving && onOpen(sg)}
            disabled={i !== step}
            aria-label={`Rambu ${sg.name}, tekan untuk melihat artinya`}
          >
            <span className="pv-plate">
              <SignArt art={sg.art} size={84} />
            </span>
            <span className="pv-pole" />
          </button>
        )
      })}

      <div className="pv-girl" style={{ left: `${proj(0).x}%` }}>
        <Kid />
        {!moving && (
          <div className="pv-bubble" key={step}>
            {LINES[Math.min(step, LINES.length - 1)]}
          </div>
        )}
      </div>

      <div className="pv-hud">
        <span>Jalan ke jalan raya</span>
        <span className="pv-pips">
          {WALK_SIGNS.map((s, i) => (
            <i key={s.id} className={i <= step ? 'on' : ''} />
          ))}
        </span>
      </div>
    </div>
  )
}
