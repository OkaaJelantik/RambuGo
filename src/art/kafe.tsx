/**
 * Art layar "Kelompokkan rambu": interior kafe, dilihat dari pintu masuk.
 *
 * Yang digambar: plafon + dua lampu gantung (0–10%), dinding krem POLOS
 * (10–78%) dengan satu jendela kiri berisi potongan jalan — langit, trotoar,
 * aspal, marka putus-putus, pohon, tiang lampu — plus ambang jendela kayu,
 * lalu lantai papan kayu (78–100%).
 *
 * Dinding sengaja hanya satu <rect> warna rata (#f3e7d5): tanpa gradien,
 * pintu, cangkir, tanaman, plint, atau garis dekorasi. Dua belas rambu
 * ditempel di dinding dan rak, jadi bentuk/garis tambahan membuat posisinya
 * terbaca acak. Dinding bersih = rambu terbaca sebagai hiasan yang dipajang.
 *
 * Yang sengaja TIDAK digambar: rak dinding, papan counter, dan papan tempat
 * rambu berdiri — papan itu `::before` di `sortir.css` supaya selalu menempel
 * pada baris rambu. Dekoratif (`aria-hidden`), tanpa teks, tanpa filter;
 * gradien hanya untuk lantai.
 */

const SKY = 'var(--sky-2)'
const WOOD = '#c9a06a'
const WOOD_DARK = '#b98d55'
const WOOD_DEEP = '#9c6b3f'
const WALL = '#f3e7d5'
const FLOOR = '#cba875'
const FLOOR_DARK = '#bf9660'

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
        <linearGradient id="kafe-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={FLOOR} />
          <stop offset="1" stopColor={FLOOR_DARK} />
        </linearGradient>
        <clipPath id="kafe-window">
          <rect x="25" y="63" width="106" height="78" rx="4" />
        </clipPath>
      </defs>

      {/* dinding krem polos (10–78%): satu rect warna rata, hanya jendela di atasnya */}
      <rect x="0" y="30" width="340" height="204" fill={WALL} />

      {/* plafon (0–10%) */}
      <rect x="0" y="0" width="340" height="30" fill="#efe2cc" />
      <line x1="0" y1="30" x2="340" y2="30" stroke="#d8c4a3" strokeWidth="3" />

      {/* dua lampu gantung */}
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
        </g>
      ))}

      {/* jendela kiri: langit + potongan jalan (10–46%) */}
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

      {/* ambang jendela kayu */}
      <rect x="16" y="140" width="124" height="8" rx="3" fill={WOOD} stroke={WOOD_DEEP} strokeWidth="2.5" />

      {/* lantai papan kayu (78–100%) */}
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
    </svg>
  )
}
