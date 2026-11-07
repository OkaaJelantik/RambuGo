/**
 * Hero dari belakang: murid kelas 2 SD berjalan menjauhi kamera.
 *
 * Sengaja bukan salinan `Kid.tsx` (versi menghadap depan untuk kelas dan
 * persimpangan). Di sini tidak ada wajah — yang terlihat punggung seragam
 * putih, rok merah, tas punggung biru, rambut dengan kuncir, dan sepatu.
 *
 * Dua grup kaki dipisah supaya CSS bisa mengayunkannya bergantian
 * (`hw-step-a` / `hw-step-b`), sementara `hw-torso` memantul dua kali per
 * siklus. Semua gerak memakai `--cycle` (default 1.1 detik).
 */

const INK = 'var(--ink)'
const PAPER = 'var(--paper)'
const SKIN = 'color-mix(in srgb, var(--paper) 70%, var(--orange))'
const HAIR = 'var(--ink)'
const HAIR_LIGHT = 'color-mix(in srgb, var(--ink) 85%, var(--paper))'
const SKIRT = 'var(--red)'
const SKIRT_SHADE = 'color-mix(in srgb, var(--red) 70%, var(--ink))'
const BAG = 'var(--blue)'
const BAG_LIGHT = 'color-mix(in srgb, var(--blue) 55%, var(--paper))'
const BAG_DARK = 'color-mix(in srgb, var(--blue) 60%, var(--ink))'
const SOLE = 'var(--paper)'

type Pose = 'walk' | 'idle'

/**
 * Paha, betis, kaus kaki, dan sepatu satu kaki, digambar dari belakang.
 * `x` adalah titik tengah kaki; tiap kelompok diputar CSS dari pangkal paha.
 */
function Leg({ x, variant }: { x: number; variant: 'a' | 'b' }) {
  return (
    <g className={`hw-leg hw-leg--${variant}`}>
      <rect
        className="hw-thigh"
        x={x - 7}
        y="148"
        width="14"
        height="30"
        rx="7"
        fill={SKIN}
        stroke={INK}
        strokeWidth="4"
      />
      <rect
        className="hw-calf"
        x={x - 6}
        y="176"
        width="12"
        height="30"
        rx="6"
        fill={SKIN}
        stroke={INK}
        strokeWidth="4"
      />
      <rect
        className="hw-sock"
        x={x - 6}
        y="202"
        width="12"
        height="14"
        rx="4"
        fill={PAPER}
        stroke={INK}
        strokeWidth="3.5"
      />
      <rect
        className="hw-shoe"
        x={x - 9}
        y="216"
        width="18"
        height="16"
        rx="8"
        fill={INK}
        stroke={INK}
        strokeWidth="4"
      />
      <rect x={x - 10} y="229" width="20" height="6" rx="3" fill={SOLE} stroke={INK} strokeWidth="3" />
    </g>
  )
}

export default function HeroWalk({ pose = 'walk' }: { pose?: Pose }) {
  return (
    <svg
      className={`hw hw-${pose}`}
      viewBox="0 0 140 260"
      aria-hidden="true"
    >
      {/* Bayangan di dalam SVG — bukan filter. */}
      <ellipse className="hw-shadow" cx="70" cy="244" rx="34" ry="7" fill={INK} opacity="0.14" />

      {/* Kaki digambar dulu supaya rok menutupi pangkal paha. */}
      <Leg variant="a" x={56} />
      <Leg variant="b" x={84} />

      <g className="hw-torso">
        {/* leher di balik kerah */}
        <rect x="64" y="82" width="12" height="24" rx="6" fill={SKIN} stroke={INK} strokeWidth="4" />

        {/* punggung seragam putih + kerah belakang */}
        <path
          d="M44 106c0-9 9-13 26-13s26 4 26 13v46H44Z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M60 96q10 9 20 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />

        {/* rok merah dengan lipatan */}
        <path
          d="M48 144h44l8 46H40Z"
          fill={SKIRT}
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M58 150l-5 34M70 150v34M82 150l5 34"
          fill="none"
          stroke={SKIRT_SHADE}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* lengan: lengan pendek putih, tangan di bawah tas */}
        <rect x="30" y="106" width="16" height="26" rx="8" fill={PAPER} stroke={INK} strokeWidth="4" />
        <rect x="31" y="128" width="13" height="36" rx="6.5" fill={SKIN} stroke={INK} strokeWidth="4" />
        <circle cx="37.5" cy="169" r="7" fill={SKIN} stroke={INK} strokeWidth="4" />
        <rect x="94" y="106" width="16" height="26" rx="8" fill={PAPER} stroke={INK} strokeWidth="4" />
        <rect x="96" y="128" width="13" height="36" rx="6.5" fill={SKIN} stroke={INK} strokeWidth="4" />
        <circle cx="102.5" cy="169" r="7" fill={SKIN} stroke={INK} strokeWidth="4" />

        {/* tali tas yang naik ke bahu */}
        <rect x="48" y="91" width="9" height="24" rx="4.5" fill={BAG_DARK} stroke={INK} strokeWidth="3.5" />
        <rect x="83" y="91" width="9" height="24" rx="4.5" fill={BAG_DARK} stroke={INK} strokeWidth="3.5" />

        {/* tas punggung biru: tutup, gesper, dan kantong kecil */}
        <rect x="42" y="110" width="56" height="50" rx="17" fill={BAG} stroke={INK} strokeWidth="5" />
        <rect x="44" y="112" width="52" height="17" rx="8.5" fill={BAG_LIGHT} stroke={INK} strokeWidth="4" />
        <rect x="65" y="123" width="10" height="8" rx="2" fill="var(--yellow)" stroke={INK} strokeWidth="3" />
        <rect x="56" y="138" width="28" height="17" rx="6" fill={BAG_LIGHT} stroke={INK} strokeWidth="4" />
        <path d="M60 144h20" stroke={BAG_DARK} strokeWidth="3" strokeLinecap="round" />

        {/* telinga kecil, lalu kepala dari belakang */}
        <circle cx="42" cy="62" r="6" fill={SKIN} stroke={INK} strokeWidth="3.5" />
        <circle cx="98" cy="62" r="6" fill={SKIN} stroke={INK} strokeWidth="3.5" />

        {/* kuncir diikat pita merah, jatuh di sisi kanan */}
        <ellipse
          cx="108"
          cy="86"
          rx="10"
          ry="26"
          transform="rotate(-12 108 86)"
          fill={HAIR_LIGHT}
          stroke={INK}
          strokeWidth="4"
        />
        <ellipse cx="70" cy="56" rx="30" ry="31" fill={HAIR} stroke={INK} strokeWidth="5" />
        <path
          d="M54 44q16-11 32-2"
          fill="none"
          stroke={HAIR_LIGHT}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M98 64l-9-6 1 12Z" fill={SKIRT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M101 64l9-6-1 12Z" fill={SKIRT} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="100" cy="65" r="3.5" fill={SKIRT} stroke={INK} strokeWidth="3" />
      </g>
    </svg>
  )
}
