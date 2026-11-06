import type { CSSProperties } from 'react'

type Props = { className?: string; style?: CSSProperties }

/**
 * Tokoh utama: murid kelas 2 SD (perempuan), seragam putih-merah,
 * tas punggung biru, rambut kuncir. Dipakai di semua scene.
 */
export default function Kid({ className, style }: Props) {
  return (
    <svg
      viewBox="0 0 140 260"
      className={className}
      style={style}
      role="img"
      aria-label="Seorang murid SD perempuan berseragam putih-merah"
    >
      <ellipse cx="70" cy="250" rx="38" ry="6" fill="#2a2320" opacity="0.15" />

      {/* leher — nyambungin kepala ke seragam */}
      <rect x="62" y="82" width="16" height="28" fill="#f7cba8" />

      {/* tas punggung */}
      <rect x="22" y="108" width="24" height="50" rx="11" fill="#2e7be0" stroke="#2a2320" strokeWidth="5" />
      <rect x="27" y="124" width="14" height="9" rx="4" fill="#6ea8ff" stroke="#2a2320" strokeWidth="3" />

      {/* kaki + kaos kaki + sepatu */}
      <rect x="52" y="176" width="15" height="40" rx="7" fill="#f7cba8" stroke="#2a2320" strokeWidth="5" />
      <rect x="73" y="176" width="15" height="40" rx="7" fill="#f7cba8" stroke="#2a2320" strokeWidth="5" />
      <rect x="52" y="212" width="15" height="15" rx="5" fill="#fffaf0" stroke="#2a2320" strokeWidth="4" />
      <rect x="73" y="212" width="15" height="15" rx="5" fill="#fffaf0" stroke="#2a2320" strokeWidth="4" />
      <rect x="49" y="231" width="21" height="15" rx="7" fill="#36323d" stroke="#2a2320" strokeWidth="4" />
      <rect x="70" y="231" width="21" height="15" rx="7" fill="#36323d" stroke="#2a2320" strokeWidth="4" />

      {/* rok merah */}
      <path
        d="M50 148h40l6 44H44z"
        fill="#e0453f"
        stroke="#2a2320"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M59 154 56 190M81 154 84 190" stroke="#b8342f" strokeWidth="3" strokeLinecap="round" />

      {/* seragam putih */}
      <path
        d="M50 116c0-9 8-14 20-14s20 5 20 14v36H50z"
        fill="#fff9ee"
        stroke="#2a2320"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M63 104l7 8 7-8" fill="none" stroke="#2a2320" strokeWidth="3" strokeLinejoin="round" />

      {/* lengan + tangan */}
      <rect x="40" y="108" width="15" height="22" rx="7" fill="#fff9ee" stroke="#2a2320" strokeWidth="4" />
      <rect x="85" y="108" width="15" height="22" rx="7" fill="#fff9ee" stroke="#2a2320" strokeWidth="4" />
      <rect x="41" y="126" width="13" height="32" rx="6" fill="#f7cba8" stroke="#2a2320" strokeWidth="4" />
      <rect x="86" y="126" width="13" height="32" rx="6" fill="#f7cba8" stroke="#2a2320" strokeWidth="4" />

      {/* rambut belakang + kuncir */}
      <circle cx="70" cy="62" r="30" fill="#2b2320" />
      <ellipse cx="100" cy="76" rx="11" ry="18" fill="#2b2320" transform="rotate(18 100 76)" />
      <path d="M93 54l-9-4 4 9z" fill="#e0453f" />
      <path d="M93 54l9-4-2 9z" fill="#e0453f" />

      {/* wajah */}
      <circle cx="70" cy="66" r="25" fill="#f7cba8" stroke="#2a2320" strokeWidth="4" />
      <path
        d="M45 62c0-17 11-27 25-27s25 10 25 27c-6-11-14-14-25-14s-19 3-25 14z"
        fill="#2b2320"
      />
      <circle cx="61" cy="68" r="2.6" fill="#2b2320" />
      <circle cx="79" cy="68" r="2.6" fill="#2b2320" />
      <ellipse cx="55" cy="75" rx="5" ry="3" fill="#ff9d8a" opacity="0.5" />
      <ellipse cx="85" cy="75" rx="5" ry="3" fill="#ff9d8a" opacity="0.5" />
      <path d="M65 77q5 5 10 0" fill="none" stroke="#2a2320" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
