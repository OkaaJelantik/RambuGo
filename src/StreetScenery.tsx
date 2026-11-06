import { useId, type ReactNode } from 'react'
import './street.css'

/** Pohon pinggir jalan — dipakai beberapa kali dengan ukuran berbeda. */
function Tree({ className }: { className: string }) {
  return (
    <svg className={`st-tree ${className}`} viewBox="0 0 90 150" aria-hidden="true">
      <rect x="40" y="88" width="10" height="62" rx="5" fill="#8a5a3b" />
      <circle cx="45" cy="66" r="30" fill="#58b83f" />
      <circle cx="27" cy="78" r="18" fill="#6ac94f" />
      <circle cx="63" cy="75" r="16" fill="#4ea936" />
      <circle cx="45" cy="44" r="17" fill="#74d25c" />
    </svg>
  )
}

/** Semak rendah di tepi trotoar. */
function Bush({ className }: { className: string }) {
  return (
    <svg className={`st-bush ${className}`} viewBox="0 0 120 54" aria-hidden="true">
      <ellipse cx="30" cy="40" rx="26" ry="14" fill="#4fa936" />
      <ellipse cx="62" cy="36" rx="30" ry="18" fill="#69c64a" />
      <ellipse cx="92" cy="41" rx="23" ry="13" fill="#58b83f" />
      <circle className="st-bush-flower" cx="52" cy="30" r="2.4" />
      <circle className="st-bush-flower" cx="72" cy="34" r="2" />
      <circle className="st-bush-flower" cx="38" cy="36" r="1.8" />
    </svg>
  )
}

/**
 * Latar "jalan raya" yang bisa dipakai ulang.
 *
 * Hanya menggambar latar; `children` dirender paling atas dan bisa
 * diposisikan bebas (rambu, karakter, tombol) terhadap kotak ini.
 *
 * Proporsi dari bawah: jalan 0–24%, trotoar 24–30%, hijau & langit di atasnya.
 */
export default function StreetScenery({ children }: { children?: ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const farPattern = `st-far-${uid}`

  return (
    <div className="st-scene">
      <div className="st-bg" aria-hidden="true">
        <div className="st-sky" />
        <div className="st-sun" />
        <div className="st-cloud st-cloud-a" />
        <div className="st-cloud st-cloud-b" />

        <svg
          className="st-far"
          viewBox="0 0 1440 140"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id={farPattern} width="240" height="140" patternUnits="userSpaceOnUse">
              {/* pohon jauh */}
              <g fill="#adc6b8">
                <rect x="200" y="116" width="4" height="24" rx="2" />
                <circle cx="202" cy="104" r="12" />
                <circle cx="194" cy="112" r="8" />
                <circle cx="210" cy="111" r="8" />
              </g>
              {/* rumah kecil kiri */}
              <g>
                <rect x="18" y="106" width="50" height="34" rx="3" fill="#c6d4cd" />
                <polygon points="12,106 43,84 74,106" fill="#a9beb5" />
                <rect x="38" y="120" width="12" height="20" rx="2" fill="#b4c6bd" />
                <rect x="22" y="112" width="9" height="8" rx="1.5" fill="#e6eee8" />
              </g>
              {/* rumah sedang */}
              <g>
                <rect x="96" y="112" width="58" height="28" rx="3" fill="#cfdcd5" />
                <polygon points="90,112 125,88 160,112" fill="#9db3a9" />
                <rect x="116" y="124" width="14" height="16" rx="2" fill="#b3c5bc" />
                <rect x="147" y="118" width="3" height="12" fill="#b9ccc3" />
              </g>
              {/* pohon kanan */}
              <g fill="#a9c4b6">
                <rect x="176" y="120" width="4" height="20" rx="2" />
                <circle cx="178" cy="110" r="10" />
              </g>
            </pattern>
          </defs>
          <rect width="1440" height="140" fill={`url(#${farPattern})`} />
        </svg>

        <div className="st-hill" />
        <div className="st-walk" />
        <div className="st-road" />

        <Tree className="st-tree-a" />
        <Tree className="st-tree-b" />
        <Tree className="st-tree-c" />
        <Bush className="st-bush-a" />
        <Bush className="st-bush-b" />
      </div>

      <div className="st-content">{children}</div>
    </div>
  )
}
