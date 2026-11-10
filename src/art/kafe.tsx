/**
 * Art layar "Kelompokkan rambu": interior kafe, dilihat dari pintu masuk.
 *
 * Yang digambar: plafon + dua lampu gantung (0–10%), dinding krem (10–46%),
 * jendela kiri dengan potongan jalan — trotoar, aspal, marka putus-putus, pohon
 * dan tiang kecil — pintu kaca di kanan, lantai papan kayu (78–100%), tanaman
 * pot di pojok kiri bawah, dua cangkir di ambang jendela.
 *
 * Yang sengaja TIDAK digambar: rak dinding, papan counter, dan papan tempat
 * rambu berdiri. Papan itu `::before` di `sortir.css` supaya selalu menempel
 * pada baris rambu. Tiga pita yang akan tertutup rambu — rak (y≈8–34%),
 * atas counter (y≈40–54%), lantai dekat pintu (y≈86–97%) — dijaga tenang:
 * warna rendah kontras, tanpa bentuk tajam.
 *
 * Dekoratif (`aria-hidden`), tanpa teks, tanpa filter, tanpa gradien ilusi 3D —
 * gradien linear hanya untuk dinding dan lantai.
 */

const SKY = 'var(--sky-2)'
const PAPER = 'var(--paper)'
const WOOD = '#c9a06a'
const WOOD_DARK = '#b98d55'
const WOOD_DEEP = '#9c6b3f'
const MUTED = '#b9a586'
const WALL = '#f3e7d5'
const WALL_SHADE = '#ecdbc0'
const FLOOR = '#cba875'
const FLOOR_DARK = '#bf9660'
const LEAF = '#5d9670'
const LEAF_LIGHT = '#69a37d'

export function KafeScene({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 340 300"
      preserveAspectRatio="xMidYMax slice"
      className={className}
    >
      <defs>
        <linearGradient id="kafe-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WALL} />
          <stop offset="1" stopColor={WALL_SHADE} />
        </linearGradient>
        <linearGradient id="kafe-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={FLOOR} />
          <stop offset="1" stopColor={FLOOR_DARK} />
        </linearGradient>
        <clipPath id="kafe-window">
          <rect x="25" y="63" width="106" height="78" rx="4" />
        </clipPath>
      </defs>

      {/* dinding krem (10–46%) */}
      <rect x="0" y="30" width="340" height="204" fill="url(#kafe-wall)" />

      {/* plafon + lampu gantung (0–10%) */}
      <rect x="0" y="0" width="340" height="30" fill="#efe2cc" />
      <line x1="0" y1="30" x2="340" y2="30" stroke="#d8c4a3" strokeWidth="3" />
      {[106, 236].map((x) => (
        <g key={x}>
          <line x1={x} y1="4" x2={x} y2="16" stroke={WOOD_DARK} strokeWidth="2.5" />
          <path
            d={`M${x - 12} 28 L${x + 12} 28 L${x + 5} 16 L${x - 5} 16 Z`}
            fill="#f4e6c9"
            stroke={WOOD_DARK}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx={x} cy="30" r="3.5" fill="#ffe6a6" stroke={WOOD_DARK} strokeWidth="2" />
          <ellipse cx={x} cy="40" rx="18" ry="12" fill="#ffe9b8" opacity="0.26" />
        </g>
      ))}

      {/* jendela kiri + potongan jalan di luar (10–46%) */}
      <g clipPath="url(#kafe-window)">
        <rect x="25" y="63" width="106" height="78" fill={SKY} />
        <rect x="25" y="100" width="106" height="12" fill="#d9d4c6" />
        <rect x="25" y="112" width="106" height="29" fill="#b2b5ac" />
        <line x1="26" y1="126" x2="130" y2="126" stroke="#eee7d6" strokeWidth="2" strokeDasharray="8 9" />
        <rect x="84" y="94" width="16" height="10" fill="#cdd7ce" />
        <line x1="46" y1="112" x2="46" y2="96" stroke="#8c8375" strokeWidth="2" />
        <circle cx="46" cy="93" r="2.5" fill="#f0daa0" />
        <line x1="112" y1="112" x2="112" y2="103" stroke="#7d6b4f" strokeWidth="2" />
        <circle cx="112" cy="98" r="7" fill="#7fa886" />
      </g>
      <rect x="25" y="63" width="106" height="78" rx="4" fill="none" stroke={WOOD_DARK} strokeWidth="3" />
      <line x1="78" y1="63" x2="78" y2="141" stroke={WOOD_DARK} strokeWidth="3" />
      <line x1="25" y1="104" x2="131" y2="104" stroke={WOOD_DARK} strokeWidth="2.5" />
      <rect x="16" y="140" width="124" height="8" rx="3" fill={WOOD} stroke={WOOD_DEEP} strokeWidth="2.5" />
      {/* dua cangkir di ambang jendela */}
      <rect x="42" y="130" width="11" height="10" rx="2" fill={PAPER} stroke={MUTED} strokeWidth="2" />
      <path d="M53 133 q5 0 5 4 q0 4 -5 4" fill="none" stroke={MUTED} strokeWidth="2" />
      <rect x="63" y="131" width="10" height="9" rx="2" fill={PAPER} stroke={MUTED} strokeWidth="2" />
      <path d="M73 134 q5 0 5 3.5 q0 3.5 -5 3.5" fill="none" stroke={MUTED} strokeWidth="2" />

      {/* pintu kaca kanan (10–78%) */}
      <rect x="212" y="56" width="104" height="178" rx="5" fill="#e4f2f6" stroke={WOOD_DARK} strokeWidth="3" />
      <line x1="264" y1="58" x2="264" y2="232" stroke={WOOD_DARK} strokeWidth="2.5" />
      <rect x="214" y="196" width="100" height="6" fill={WOOD} opacity="0.85" />
      <path d="M222 66 L244 66 L216 116 L216 92 Z" fill="#ffffff" opacity="0.34" />
      <path d="M272 70 L290 70 L266 110 L266 90 Z" fill="#ffffff" opacity="0.26" />
      <rect x="250" y="148" width="4" height="18" rx="2" fill={WOOD_DEEP} />

      {/* lantai papan kayu (78–100%) */}
      <rect x="0" y="226" width="340" height="8" fill="#dfc9a6" stroke="#c9b18c" strokeWidth="2" />
      <rect x="0" y="234" width="340" height="66" fill="url(#kafe-floor)" />
      <line x1="0" y1="246" x2="340" y2="246" stroke="#b28b5c" strokeWidth="2" opacity="0.6" />
      <line x1="0" y1="258" x2="340" y2="258" stroke="#b28b5c" strokeWidth="2" opacity="0.6" />
      <line x1="0" y1="270" x2="340" y2="270" stroke="#b28b5c" strokeWidth="2" opacity="0.6" />
      <line x1="0" y1="282" x2="340" y2="282" stroke="#b28b5c" strokeWidth="2" opacity="0.6" />
      <line x1="0" y1="294" x2="340" y2="294" stroke="#b28b5c" strokeWidth="2" opacity="0.6" />
      <line x1="96" y1="246" x2="96" y2="258" stroke="#b28b5c" strokeWidth="2" opacity="0.45" />
      <line x1="198" y1="258" x2="198" y2="270" stroke="#b28b5c" strokeWidth="2" opacity="0.45" />
      <line x1="58" y1="270" x2="58" y2="282" stroke="#b28b5c" strokeWidth="2" opacity="0.45" />
      <line x1="252" y1="282" x2="252" y2="294" stroke="#b28b5c" strokeWidth="2" opacity="0.45" />
      <ellipse cx="74" cy="250" rx="56" ry="12" fill="#fbeed3" opacity="0.22" />
      <rect x="206" y="229" width="116" height="7" rx="2" fill={WOOD} stroke={WOOD_DEEP} strokeWidth="2" />

      {/* tanaman pot di pojok kiri bawah */}
      <path d="M34 246 q-7 -12 -12 -17" fill="none" stroke="#4f7d5c" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 246 q6 -14 12 -20" fill="none" stroke="#4f7d5c" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="20" cy="228" rx="10" ry="6" fill={LEAF} transform="rotate(-24 20 228)" />
      <ellipse cx="47" cy="224" rx="10" ry="6" fill={LEAF} transform="rotate(22 47 224)" />
      <ellipse cx="34" cy="218" rx="8" ry="5" fill={LEAF_LIGHT} />
      <rect x="10" y="244" width="52" height="8" rx="3" fill="#cba07a" stroke="#9a7048" strokeWidth="2.5" />
      <path d="M14 252 L58 252 L52 282 L20 282 Z" fill="#c1936a" stroke="#9a7048" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}
