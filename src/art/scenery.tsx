/**
 * Art kit v1 untuk scene berjalan: rumah, pohon, dan lampu jalan.
 *
 * Semua dekoratif (`aria-hidden`), digambar dengan garis tinta tebal dan
 * isian rata dari token palet di `index.css`. Tidak ada filter atau gradien
 * yang berpura-pura jadi 3D — hanya bentuk gemuk yang mudah dibaca di layar
 * HP 360 px.
 */

const INK = 'var(--ink)'
const PAPER = 'var(--paper)'
const SKY = 'var(--sky-2)'
const RED = 'var(--red)'
const RED_LIGHT = 'color-mix(in srgb, var(--red) 68%, var(--paper))'
const RED_DARK = 'color-mix(in srgb, var(--red) 55%, var(--ink))'
const ORANGE = 'var(--orange)'
const YELLOW = 'var(--yellow)'
const BLUE = 'var(--blue)'
const GREEN = 'var(--green)'
const GRASS = 'var(--grass)'
const GRASS_DARK = 'var(--grass-dark)'
const WOOD = 'color-mix(in srgb, var(--orange) 45%, var(--ink))'
const METAL = 'color-mix(in srgb, var(--road) 75%, var(--ink))'
const SIDEWALK = 'color-mix(in srgb, var(--road-line) 82%, var(--ink))'

/** Rumah perangko: atap pelana terlihat dari sedikit atas, jendela, pintu, cerobong. */
export function House() {
  return (
    <svg
      className="wk-house"
      viewBox="0 0 200 180"
      aria-hidden="true"
    >
      {/* cerobong di belakang atap */}
      <rect x="130" y="8" width="20" height="38" rx="3" fill={RED_DARK} stroke={INK} strokeWidth="4" />
      <rect x="126" y="4" width="28" height="10" rx="3" fill={RED} stroke={INK} strokeWidth="4" />

      {/* dinding dan atap */}
      <rect x="30" y="76" width="140" height="96" rx="4" fill={PAPER} stroke={INK} strokeWidth="5" />
      <polygon
        points="18,80 42,44 158,44 182,80"
        fill={RED}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <polygon
        points="42,44 158,44 146,28 54,28"
        fill={RED_LIGHT}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* jendela kiri dan kanan */}
      <rect x="44" y="96" width="30" height="30" rx="3" fill={SKY} stroke={INK} strokeWidth="4" />
      <path d="M59 96v30M44 111h30" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="126" y="96" width="30" height="30" rx="3" fill={SKY} stroke={INK} strokeWidth="4" />
      <path d="M141 96v30M126 111h30" stroke={INK} strokeWidth="4" strokeLinecap="round" />

      {/* pintu dan tangga batu */}
      <rect x="86" y="116" width="28" height="56" rx="4" fill={ORANGE} stroke={INK} strokeWidth="4" />
      <circle cx="108" cy="146" r="2.8" fill={INK} />
      <rect x="80" y="171" width="40" height="7" rx="3.5" fill={SIDEWALK} stroke={INK} strokeWidth="4" />
    </svg>
  )
}

/** Pohon rindang: batang bercabang dan tiga gumpalan daun berink. */
export function Tree() {
  return (
    <svg
      className="wk-tree"
      viewBox="0 0 120 160"
      aria-hidden="true"
    >
      {/* batang + cabang */}
      <path
        d="M56 157v-61h8v61Z"
        fill={WOOD}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M60 106 46 92M60 116l12-13"
        fill="none"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* tiga gumpalan daun, yang tengah paling atas */}
      <circle cx="42" cy="78" r="24" fill={GRASS_DARK} stroke={INK} strokeWidth="5" />
      <circle cx="80" cy="78" r="22" fill={GREEN} stroke={INK} strokeWidth="5" />
      <circle cx="60" cy="48" r="30" fill={GRASS} stroke={INK} strokeWidth="5" />
    </svg>
  )
}

/** Lampu jalan menyala: tiang, kap lampu biru, bohlam kuning dengan halo. */
export function StreetLamp() {
  return (
    <svg
      className="wk-lamp"
      viewBox="0 0 60 200"
      aria-hidden="true"
    >
      {/* halo kuning berlapis, bukan filter blur */}
      <circle cx="30" cy="70" r="16" fill={YELLOW} opacity="0.14" />
      <circle cx="30" cy="70" r="10" fill={YELLOW} opacity="0.24" />

      {/* tiang dan alas */}
      <rect x="26" y="74" width="8" height="116" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="16" y="188" width="28" height="10" rx="4" fill={METAL} stroke={INK} strokeWidth="4" />

      {/* kap lampu, lalu bohlam kuning yang menyala di bawahnya */}
      <polygon
        points="14,60 46,60 36,38 24,38"
        fill={BLUE}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="70" r="9" fill={YELLOW} stroke={INK} strokeWidth="4" />
      <circle cx="30" cy="35" r="4.5" fill={YELLOW} stroke={INK} strokeWidth="3" />
    </svg>
  )
}
