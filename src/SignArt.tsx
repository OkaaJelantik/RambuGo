import type { ReactNode } from 'react'
import { type Art, type Sign } from './data'

/**
 * Geometri rambu diambil dari `Assets/rambu_lalu_lintas.html` (ekstraksi modul),
 * apa adanya: viewBox aslinya 100 × 100, dan semua koordinat di bawah memakai
 * sistem itu.
 *
 * `ART_SCALE` memetakan 100 unit → 120 unit, kotak yang sudah dipakai lembar,
 * kartu, kuis, dan pelat rambu di `WalkScene` (`SIGN_BOX.w = 120`). Dengan satu
 * faktor di satu tempat, art boleh tetap setia pada sumber dan tidak ada gambar
 * yang harus digambar ulang per konsumen.
 */
export const ART_UNITS = 100
export const ART_SCALE = 1.2

/**
 * Kotak gambar tiap rambu, di sistem 100 unit. Sembilan rambu jalan persegi
 * 100 × 100 (pelat yang berdiri di trotoar); tiga papan petunjuk lebih lebar
 * dari tingginya — itulah bentuk aslinya, dan memaksanya jadi persegi akan
 * mengubah ciri yang justru diajarkan. `ART` untuk papan sudah dinormalkan ke
 * tinggi 100, jadi satu unit = satu unit untuk semua gambar.
 */
/**
 * Batas bawah tinta tiap gambar di kotaknya sendiri (satuan art, **termasuk
 * tebal garis**). Dipakai tiang rambu: tiang harus mulai tepat di batas ini,
 * bukan di dasar kotak 120 unit. Tanpa angka ini tiang mulai 6 unit di bawah
 * titik terbawah belah ketupat, dan pelatnya tampak melayang di atas tiang.
 *
 * Nilai diambil dari geometri di bawah: lingkaran larangan r45 + garis 10 →
 * 0..100; belah ketupat 50±45 + garis 2 → 4..96; cincin perintah r48 + garis 1
 * → 1,5..98,5.
 */
export const ART_INK_BOTTOM: Record<Art, number> = {
  'dilarang-berhenti': 100,
  'dilarang-parkir': 100,
  'dilarang-putar-balik': 100,
  'peringatan-penyeberangan': 96,
  'peringatan-lampu': 96,
  'peringatan-persimpangan': 96,
  'belok-kiri': 98.5,
  'jalan-terus': 98.5,
  'belok-kanan': 98.5,
  'petunjuk-arah': 100,
  'titik-kumpul': 98,
  'jalur-evakuasi': 100,
  /* Studi kasus: tinta keempat rambu mencapai tepi bawah kotaknya sendiri. */
  'dilarang-masuk': 100,
  'peringatan-tikungan': 96,
  'berhenti-stop': 100,
  'penyeberangan-biru': 100,
}

export const ART_BOX: Record<Art, { w: number; h: number }> = {
  'dilarang-berhenti': { w: 100, h: 100 },
  'dilarang-parkir': { w: 100, h: 100 },
  'dilarang-putar-balik': { w: 100, h: 100 },
  'peringatan-penyeberangan': { w: 100, h: 100 },
  'peringatan-lampu': { w: 100, h: 100 },
  'peringatan-persimpangan': { w: 100, h: 100 },
  'belok-kiri': { w: 100, h: 100 },
  'jalan-terus': { w: 100, h: 100 },
  'belok-kanan': { w: 100, h: 100 },
  /* 195 × 70 unit papan, dinormalkan ke tinggi 100 → 278,6 lebar. */
  'petunjuk-arah': { w: 278.6, h: 100 },
  'titik-kumpul': { w: 100, h: 100 },
  /* 192 × 92 unit papan, dinormalkan ke tinggi 100 → 208,7 lebar. */
  'jalur-evakuasi': { w: 208.7, h: 100 },
  /* Empat rambu studi kasus menggambar seluruh kotak 100 × 100. */
  'dilarang-masuk': { w: 100, h: 100 },
  'peringatan-tikungan': { w: 100, h: 100 },
  'berhenti-stop': { w: 100, h: 100 },
  'penyeberangan-biru': { w: 100, h: 100 },
}

/*
 * Warna: nilai token DESIGN (`--red`, `--yellow`, `--blue`) — bukan hex baru
 * dari berkas ekstraksi — supaya palet tetap satu. Bentuk, ketebalan, dan
 * susunan garis tidak diubah.
 */
const INK = '#231F20'
const YELLOW = '#FFC93C'
const RED = '#E0453F'
const BLUE = '#2E7BE0'
const GREEN = '#007A33'
const WHITE = '#FFFFFF'

/** Cincin luar semua rambu larangan: putih, tepi merah, coretan merah. */
const banBase = <circle cx="50" cy="50" r="45" fill={WHITE} stroke={RED} strokeWidth="10" />

const banSlash = <line x1="20" y1="20" x2="80" y2="80" stroke={RED} strokeWidth="10" />

/** Huruf di tengah rambu larangan; Arial jatuh ke font sistem, tidak diunduh. */
const banLetter = (letter: string) => (
  <text
    x="50"
    y="70"
    fontFamily="Nunito, Arial, sans-serif"
    fontWeight="900"
    fontSize="54"
    textAnchor="middle"
    fill={INK}
  >
    {letter}
  </text>
)

/** Belah ketupat peringatan: kuning, tepi hitam, garis dalam hitam. */
const ketupat = (
  <>
    <polygon points="50,5 95,50 50,95 5,50" fill={YELLOW} stroke={INK} strokeWidth="2" />
    <polygon
      points="50,9 91,50 50,91 9,50"
      fill="none"
      stroke={INK}
      strokeWidth="1.5"
    />
  </>
)

/** Bulat perintah: biru, cincin putih, cincin biru tipis di luar. */
const perintahBase = (
  <>
    <circle cx="50" cy="50" r="45" fill={BLUE} stroke={WHITE} strokeWidth="2" />
    <circle cx="50" cy="50" r="48" fill="none" stroke={BLUE} strokeWidth="1" />
  </>
)

/** Anak berjalan di atas zebra — dipakai rambu peringatan penyeberangan. */
const walker = (
  <>
    {/* Zebra, diproyeksikan miring ke arah jalan. */}
    <path
      d="M 23 80 L 36 80 L 40 72 L 29 72 Z M 42 80 L 58 80 L 60 72 L 46 72 Z M 64 80 L 77 80 L 75 72 L 64 72 Z"
      fill={INK}
    />
    <circle cx="50" cy="24" r="7.5" fill={INK} />
    <g fill="none" stroke={INK} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 50 34 C 52 44, 49 52, 47 58" />
      <path d="M 47 58 L 38 74 L 44 84 M 47 58 L 60 68 L 71 68" />
      <path d="M 50 38 L 40 45 L 34 35 M 50 38 L 62 48 L 56 60" />
    </g>
  </>
)

/** Lampu lalu lintas tiga warna di dalam belah ketupat. */
const trafficLight = (
  <>
    <rect x="36" y="18" width="28" height="64" fill={INK} rx="3" />
    <circle cx="50" cy="30" r="7.5" fill={RED} />
    <circle cx="50" cy="50" r="7.5" fill="#FFEB3B" />
    <circle cx="50" cy="70" r="7.5" fill="#4CAF50" />
  </>
)

/** Dua jalan bersilang. */
const crossroad = (
  <path d="M 28 50 L 72 50 M 50 28 L 50 72" stroke={INK} strokeWidth="16" strokeLinecap="square" />
)

export const ART: Record<Art, ReactNode> = {
  'dilarang-berhenti': (
    <>
      {banBase}
      {banLetter('S')}
      {banSlash}
    </>
  ),

  'dilarang-parkir': (
    <>
      {banBase}
      {banLetter('P')}
      {banSlash}
    </>
  ),

  'dilarang-putar-balik': (
    <>
      {banBase}
      <path
        d="M 65 70 L 65 40 C 65 25, 35 25, 35 45 L 35 60"
        fill="none"
        stroke={INK}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <polygon points="22,55 35,78 48,55" fill={INK} />
      {banSlash}
    </>
  ),

  'peringatan-penyeberangan': (
    <>
      {ketupat}
      {walker}
    </>
  ),

  'peringatan-lampu': (
    <>
      {ketupat}
      {trafficLight}
    </>
  ),

  'peringatan-persimpangan': (
    <>
      {ketupat}
      {crossroad}
    </>
  ),

  'belok-kiri': (
    <>
      {perintahBase}
      <path
        d="M 65 75 L 65 50 C 65 35, 50 35, 38 35"
        fill="none"
        stroke={WHITE}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <polygon points="20,35 44,18 44,52" fill={WHITE} />
    </>
  ),

  'jalan-terus': (
    <>
      {perintahBase}
      <path d="M 50 85 L 50 35" fill="none" stroke={WHITE} strokeWidth="14" strokeLinecap="round" />
      <polygon points="50,15 30,38 70,38" fill={WHITE} />
    </>
  ),

  'belok-kanan': (
    <>
      {perintahBase}
      <path
        d="M 35 75 L 35 50 C 35 35, 50 35, 62 35"
        fill="none"
        stroke={WHITE}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <polygon points="80,35 56,18 56,52" fill={WHITE} />
    </>
  ),

  /*
   * Papan petunjuk. Ketiganya digambar dari ekstraksi dengan transform yang
   * memotong ruang kosong dan menormalkan tinggi ke 100, jadi koordinat di
   * dalamnya tetap koordinat sumber — tidak ada angka yang digambar ulang.
   * Tiang papan (ada di sumber "Petunjuk Arah") tidak digambar: papan petunjuk
   * digantung/dipasang, bukan berdiri di atas tiang pelat seperti rambu jalan.
   */
  'petunjuk-arah': (
    <g transform="translate(-50 -21.43) scale(1.4286)">
      <rect x="35" y="15" width="195" height="70" rx="6" fill={GREEN} stroke={WHITE} strokeWidth="3" />
      <text
        x="45"
        y="38"
        fontFamily="Nunito, Arial, sans-serif"
        fontWeight="bold"
        fontSize="14"
        fill={WHITE}
      >
        KOTA DENPASAR
      </text>
      <path
        d="M 205 45 L 205 25 M 197 33 L 205 25 L 213 33"
        fill="none"
        stroke={WHITE}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="45"
        y="68"
        fontFamily="Nunito, Arial, sans-serif"
        fontWeight="bold"
        fontSize="14"
        fill={WHITE}
      >
        KOTA GIANYAR
      </text>
      <path
        d="M 190 63 L 215 63 M 207 55 L 215 63 L 207 71"
        fill="none"
        stroke={WHITE}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  ),

  'titik-kumpul': (
    <g transform="translate(0 0)">
      <rect x="4" y="4" width="92" height="92" rx="6" fill={GREEN} stroke={WHITE} strokeWidth="4" />
      <path d="M 16 16 L 30 30 M 20 30 L 30 30 L 30 20" fill="none" stroke={WHITE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 84 16 L 70 30 M 80 30 L 70 30 L 70 20" fill="none" stroke={WHITE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 16 70 L 30 56 M 20 56 L 30 56 L 30 66" fill="none" stroke={WHITE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 84 70 L 70 56 M 80 56 L 70 56 L 70 66" fill="none" stroke={WHITE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <g fill={WHITE}>
        <circle cx="37" cy="40" r="4.5" />
        <path d="M 31 56 L 31 46 C 31 43 43 43 43 46 L 43 56 Z" />
        <circle cx="63" cy="40" r="4.5" />
        <path d="M 57 56 L 57 46 C 57 43 69 43 69 46 L 69 56 Z" />
        <circle cx="50" cy="42" r="5.5" />
        <path d="M 42 62 L 42 50 C 42 45 58 45 58 50 L 58 62 Z" />
      </g>
      <line x1="12" y1="78" x2="88" y2="78" stroke={WHITE} strokeWidth="1.5" />
      <text x="50" y="89" fontFamily="Nunito, Arial, sans-serif" fontWeight="bold" fontSize="9.5" textAnchor="middle" fill={WHITE}>
        Titik Kumpul
      </text>
    </g>
  ),

  'jalur-evakuasi': (
    <g transform="translate(-4.35 -4.35) scale(1.087)">
      <rect x="4" y="4" width="192" height="92" rx="4" fill={GREEN} stroke={WHITE} strokeWidth="4" />
      <rect x="10" y="10" width="180" height="80" fill="none" stroke={WHITE} strokeWidth="1" />
      <g stroke={WHITE} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="48" cy="28" r="6.5" fill={WHITE} stroke="none" />
        <path d="M 46 38 L 52 56 M 52 56 L 62 56 L 62 72 M 52 56 L 40 70 L 26 70" />
        <path d="M 48 42 L 35 42 L 30 32 M 48 42 L 62 42 L 68 50" />
      </g>
      <path d="M 80 82 L 80 18 L 115 18 L 115 82 Z" fill="none" stroke={WHITE} strokeWidth="5" />
      <polygon points="115,18 132,26 132,90 115,82" fill={WHITE} />
      <polygon points="150,38 175,38 175,22 195,50 175,78 175,62 150,62" fill={WHITE} />
    </g>
  ),

  /*
   * Empat rambu studi kasus (`src/sulit.ts`). Ketiganya rambu jalan yang
   * bentuknya mudah dikenali dari kejauhan, jadi bentuk aslinya yang dipakai —
   * bukan `banBase` putih bertepi merah: "dilarang masuk" di lapangan adalah
   * cakram merah penuh dengan palang putih, dan itulah yang harus dikenali anak.
   */
  'dilarang-masuk': (
    <>
      <circle cx="50" cy="50" r="48" fill={RED} stroke={WHITE} strokeWidth="4" />
      <rect x="22" y="44" width="56" height="12" rx="2" fill={WHITE} />
    </>
  ),

  'peringatan-tikungan': (
    <>
      {ketupat}
      {/* Jalan menikung ke kanan: batang tegak, belokan, lalu mata panah. */}
      <path
        d="M 42 86 L 42 58 C 42 46, 50 44, 60 44"
        fill="none"
        stroke={INK}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <polygon points="80,44 58,29 58,59" fill={INK} />
    </>
  ),

  'berhenti-stop': (
    <>
      {/* Segi delapan memenuhi kotak: 29,3 = 100 / (1 + √2). */}
      <polygon
        points="29.3,0 70.7,0 100,29.3 100,70.7 70.7,100 29.3,100 0,70.7 0,29.3"
        fill={RED}
      />
      <polygon
        points="29.3,0 70.7,0 100,29.3 100,70.7 70.7,100 29.3,100 0,70.7 0,29.3"
        fill="none"
        stroke={WHITE}
        strokeWidth="3.5"
        transform="translate(5.55 5.55) scale(0.889)"
      />
      <text
        x="50"
        y="61"
        fontFamily="Nunito, Arial, sans-serif"
        fontWeight="900"
        fontSize="26"
        letterSpacing="0.5"
        textAnchor="middle"
        fill={WHITE}
      >
        STOP
      </text>
    </>
  ),

  'penyeberangan-biru': (
    <>
      <rect x="2" y="2" width="96" height="96" rx="6" fill={BLUE} stroke={WHITE} strokeWidth="4" />
      {/* Zebra di kaki gambar, lalu siluet pejalan kaki di atasnya. */}
      <g fill={WHITE}>
        <path d="M 14 88 L 29 88 L 33 78 L 20 78 Z" />
        <path d="M 35 88 L 51 88 L 53 78 L 41 78 Z" />
        <path d="M 57 88 L 73 88 L 73 78 L 61 78 Z" />
        <path d="M 79 88 L 87 88 L 85 78 L 79 78 Z" />
      </g>
      <circle cx="51" cy="24" r="8" fill={WHITE} />
      <g fill="none" stroke={WHITE} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 51 34 C 53 44, 50 52, 47 58" />
        <path d="M 47 58 L 39 74 M 47 58 L 60 68" />
        <path d="M 51 38 L 40 45 L 34 36 M 51 38 L 64 48 L 58 60" />
      </g>
    </>
  ),
}

/**
 * Satu rambu sebagai `<g>` di sistem 120 unit, dipakai lembar, kartu, kuis,
 * dan pelat rambu di jalan. Semua konsumen memakai komponen ini supaya skala
 * art tidak pernah ditulis ulang.
 */
export function ArtInk({ art }: { art: Art }) {
  return <g transform={`scale(${ART_SCALE})`}>{ART[art]}</g>
}

/**
 * Deskripsi visual untuk pembaca layar, diambil dari `Sign.visual`: bentuk,
 * warna, dan apa yang digambar. Dipakai di prompt kuis karena gambarnya
 * sendiri tetap `aria-hidden`; tanpa ini pertanyaan "Rambu ini" tidak punya
 * petunjuk apa pun. `name`/`meaning` sengaja tidak pernah dipakai — keduanya
 * membocorkan jawaban kuis.
 */
export function describeSign(sign: Sign): string {
  return `Rambu ${sign.visual}`
}

/**
 * Rambu untuk lembar, kartu, dan kuis. `size` adalah sisi kotak yang harus
 * dimuati: papan lebar mengecil tingginya sendiri dan tidak pernah gepeng,
 * karena lebar & tinggi diturunkan dari `ART_BOX` yang sama dengan gambarnya.
 */
export function SignArt({ art, size = 96 }: { art: Art; size?: number }) {
  const box = ART_BOX[art]
  const aspect = box.w / box.h
  const w = size * Math.min(1, aspect)
  return (
    <svg
      viewBox={`0 0 ${box.w * ART_SCALE} ${box.h * ART_SCALE}`}
      width={w}
      height={w / aspect}
      role="img"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <ArtInk art={art} />
    </svg>
  )
}
