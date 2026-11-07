/**
 * Pejalan kaki untuk scene berjalan: orang dewasa dan anak. `face` memilih
 * sisi yang menghadap kamera — pejalan yang mendekat menampilkan wajah,
 * yang menjauh menampilkan belakang kepala. Keduanya memakai pola langkah
 * yang sama dengan `HeroWalk` (dua grup kaki yang diayun bergantian oleh
 * CSS) tetapi kelasnya sendiri (`wk-ped-*`) supaya scene tidak bergantung
 * pada internal hero.
 *
 * Semua dekoratif (`aria-hidden`), garis tinta tebal, palet token.
 */

const INK = 'var(--ink)'
const PAPER = 'var(--paper)'
const SKIN = 'color-mix(in srgb, var(--paper) 68%, var(--orange))'
const HAIR = 'var(--ink)'
const HAIR_LIGHT = 'color-mix(in srgb, var(--ink) 80%, var(--paper))'
const ADULT_SHIRT = 'var(--blue)'
const ADULT_TROUSERS = 'color-mix(in srgb, var(--blue) 45%, var(--ink))'
const CHILD_SHIRT = 'var(--yellow)'
const CHILD_SHORTS = 'var(--blue)'
const CHILD_BAG = 'var(--green)'
const BAG_DARK = 'color-mix(in srgb, var(--green) 55%, var(--ink))'
const TIE = 'var(--red)'

export type PedKind = 'adult' | 'child'
export type PedFace = 'front' | 'rear'

type LegProps = {
  x: number
  variant: 'a' | 'b'
  hip: number
  knee: number
  ankle: number
  fill: string
}

/** Satu kaki: paha, betis, dan sepatu. CSS memutar grup ini dari pangkal paha. */
function Leg({ x, variant, hip, knee, ankle, fill }: LegProps) {
  return (
    <g className={`wk-ped-leg wk-ped-leg--${variant}`}>
      <rect
        className="wk-ped-thigh"
        x={x - 7}
        y={hip}
        width="14"
        height={knee - hip + 4}
        rx="7"
        fill={fill}
        stroke={INK}
        strokeWidth="4"
      />
      <rect
        className="wk-ped-calf"
        x={x - 6}
        y={knee}
        width="12"
        height={ankle - knee + 4}
        rx="6"
        fill={fill}
        stroke={INK}
        strokeWidth="4"
      />
      <rect
        className="wk-ped-shoe"
        x={x - 9}
        y={ankle - 4}
        width="18"
        height="11"
        rx="5.5"
        fill={INK}
        stroke={INK}
        strokeWidth="4"
      />
    </g>
  )
}

/**
 * Kepala. Dari belakang: seluruhnya rambut dengan kilau. Dari depan: wajah
 * dengan mata dan senyum, rambut sebagai topi dengan poni.
 */
function Head({ child, face }: { child: boolean; face: PedFace }) {
  const cy = child ? 34 : 42
  const r = child ? 20 : 19

  if (face === 'rear') {
    return (
      <g className="wk-ped-head">
        {/* telinga di kedua sisi */}
        <circle cx={45 - r - 2} cy={cy + 4} r="5" fill={SKIN} stroke={INK} strokeWidth="3.5" />
        <circle cx={45 + r + 2} cy={cy + 4} r="5" fill={SKIN} stroke={INK} strokeWidth="3.5" />

        {/* anak: dua kuncir; dewasa: sanggul kecil */}
        {child ? (
          <>
            <circle cx="22" cy={cy + 14} r="7" fill={HAIR} stroke={INK} strokeWidth="4" />
            <circle cx="68" cy={cy + 14} r="7" fill={HAIR} stroke={INK} strokeWidth="4" />
            <circle cx="22" cy={cy + 8} r="4" fill={TIE} stroke={INK} strokeWidth="3" />
            <circle cx="68" cy={cy + 8} r="4" fill={TIE} stroke={INK} strokeWidth="3" />
          </>
        ) : (
          <>
            <circle cx="45" cy={cy - r + 4} r="8" fill={HAIR} stroke={INK} strokeWidth="4" />
            <circle cx="45" cy={cy - r + 4} r="3.5" fill={TIE} stroke={INK} strokeWidth="3" />
          </>
        )}

        {/* belakang kepala: seluruhnya rambut, dengan kilau */}
        <ellipse cx="45" cy={cy} rx={r} ry={r + 1} fill={HAIR} stroke={INK} strokeWidth="5" />
        <path
          d={`M${45 - r + 5} ${cy - 6}q8-7 18-3`}
          fill="none"
          stroke={HAIR_LIGHT}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    )
  }

  return (
    <g className="wk-ped-head">
      {/* kuncir anak / sanggul dewasa tetap terlihat dari depan */}
      {child ? (
        <>
          <circle cx="22" cy={cy + 14} r="7" fill={HAIR} stroke={INK} strokeWidth="4" />
          <circle cx="68" cy={cy + 14} r="7" fill={HAIR} stroke={INK} strokeWidth="4" />
          <circle cx="22" cy={cy + 8} r="4" fill={TIE} stroke={INK} strokeWidth="3" />
          <circle cx="68" cy={cy + 8} r="4" fill={TIE} stroke={INK} strokeWidth="3" />
        </>
      ) : (
        <circle cx="45" cy={cy - r + 2} r="8" fill={HAIR} stroke={INK} strokeWidth="4" />
      )}

      {/* telinga di kedua sisi */}
      <circle cx={45 - r - 2} cy={cy + 4} r="5" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <circle cx={45 + r + 2} cy={cy + 4} r="5" fill={SKIN} stroke={INK} strokeWidth="3.5" />

      {/* wajah */}
      <ellipse cx="45" cy={cy + 2} rx={r - 2} ry={r + 1} fill={SKIN} stroke={INK} strokeWidth="5" />

      {/* rambut atas dengan poni */}
      <path
        d={`M${45 - r + 2} ${cy - 2} A ${r - 2} ${r + 1} 0 0 1 ${45 + r - 2} ${cy - 2} Q 45 ${cy + 4} ${45 - r + 2} ${cy - 2} Z`}
        fill={HAIR}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* mata, pipi, dan senyum */}
      <circle cx="39" cy={cy + 4} r="2.6" fill={INK} />
      <circle cx="51" cy={cy + 4} r="2.6" fill={INK} />
      <circle cx="36" cy={cy + 11} r="3" fill={TIE} opacity="0.3" />
      <circle cx="54" cy={cy + 11} r="3" fill={TIE} opacity="0.3" />
      <path
        d={`M40 ${cy + 13}q5 4 10 0`}
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  )
}

/**
 * Pejalan kaki. `kind` memilih proporsi dewasa atau anak; CSS memberi tinggi
 * layar yang berbeda, jadi anak benar-benar lebih pendek. `face` mengikuti
 * arah gerak: mendekat = depan, menjauh = belakang.
 */
export function Pedestrian({
  kind = 'adult',
  face = 'rear',
}: {
  kind?: PedKind
  face?: PedFace
}) {
  const child = kind === 'child'
  const hip = child ? 142 : 126
  const knee = child ? 170 : 160
  const ankle = child ? 190 : 188
  const legFill = child ? SKIN : ADULT_TROUSERS

  return (
    <svg
      className={`wk-ped wk-ped--${kind} wk-ped--${face} wk-ped-walk`}
      viewBox="0 0 90 200"
      aria-hidden="true"
    >
      {/* alas: bayangan di dalam SVG, bukan filter */}
      <ellipse cx="45" cy="194" rx="25" ry="5" fill={INK} opacity="0.14" />

      {/* kaki di belakang badan supaya pinggul tertutup */}
      <Leg x={38} variant="a" hip={hip} knee={knee} ankle={ankle} fill={legFill} />
      <Leg x={52} variant="b" hip={hip} knee={knee} ankle={ankle} fill={legFill} />

      <g className="wk-ped-torso">
        {/* leher di balik kerah */}
        <rect
          x="40"
          y={child ? 48 : 56}
          width="10"
          height="28"
          rx="5"
          fill={SKIN}
          stroke={INK}
          strokeWidth="4"
        />

        {/* kaus dan lengan; anak memakai kaus kuning, dewasa biru */}
        <path
          d={
            child
              ? 'M30 84c0-8 7-12 15-12s15 4 15 12v46H30Z'
              : 'M29 82c0-8 7-12 16-12s16 4 16 12v46H29Z'
          }
          fill={child ? CHILD_SHIRT : ADULT_SHIRT}
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <rect
          x="18"
          y={child ? 86 : 84}
          width="14"
          height={child ? 34 : 38}
          rx="7"
          fill={child ? CHILD_SHIRT : ADULT_SHIRT}
          stroke={INK}
          strokeWidth="4"
        />
        <rect
          x="58"
          y={child ? 86 : 84}
          width="14"
          height={child ? 34 : 38}
          rx="7"
          fill={child ? CHILD_SHIRT : ADULT_SHIRT}
          stroke={INK}
          strokeWidth="4"
        />
        <circle cx="25" cy={child ? 124 : 128} r="6" fill={SKIN} stroke={INK} strokeWidth="3.5" />
        <circle cx="65" cy={child ? 124 : 128} r="6" fill={SKIN} stroke={INK} strokeWidth="3.5" />

        {/* depan: kerah kaus terlihat */}
        {face === 'front' && (
          <path
            d={child ? 'M40 74l5 7 5-7' : 'M40 72l5 8 5-8'}
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        )}

        {/* anak: celana pendek di atas pangkal paha */}
        {child && (
          <rect
            x="30"
            y="124"
            width="30"
            height="24"
            rx="7"
            fill={CHILD_SHORTS}
            stroke={INK}
            strokeWidth="4"
          />
        )}

        {/* anak: tas punggung hanya terlihat dari belakang */}
        {child && face === 'rear' && (
          <>
            <rect x="33" y="88" width="24" height="30" rx="10" fill={CHILD_BAG} stroke={INK} strokeWidth="4" />
            <rect x="38" y="95" width="14" height="9" rx="4" fill={BAG_DARK} stroke={INK} strokeWidth="3" />
            <path d="M35 88 31 78M55 88l4-10" stroke={BAG_DARK} strokeWidth="3.5" strokeLinecap="round" />
          </>
        )}

        {/* anak dari depan: tali tas di dada */}
        {child && face === 'front' && (
          <>
            <rect x="34" y="80" width="6" height="32" rx="3" fill={CHILD_BAG} stroke={INK} strokeWidth="3" />
            <rect x="50" y="80" width="6" height="32" rx="3" fill={CHILD_BAG} stroke={INK} strokeWidth="3" />
          </>
        )}

        <Head child={child} face={face} />
      </g>
    </svg>
  )
}
