/**
 * Art kit untuk scene berjalan.
 *
 * Semua dekoratif (`aria-hidden`), digambar dengan garis tinta tebal dan isian
 * rata dari token palet di `index.css`. Tidak ada filter atau gradien yang
 * berpura-pura jadi 3D — hanya bentuk gemuk yang mudah dibaca di layar HP
 * 360 px.
 *
 * Sudut pandang: kamera berjalan MENYUSURI jalan, jadi benda tepi jalan
 * digambar 3-4 dari samping (halte, tong sampah, bangku) dengan perspektif
 * dipanggang ke dalam gambar — atap/bidang atas menyusut ke atas-kanan karena
 * benda berdiri di kiri titik hilang, sisi yang menjauh lebih kecil. `House`
 * dan `Shop` sengaja tetap elevasi depan: fasadnya memang menghadap jalan,
 * dan itu stilasi yang sah untuk bangunan. Jangan "memperbaiki" keduanya jadi
 * 3-4 tanpa mengganti seluruh latar jadi satu titik hilang.
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
const YELLOW_DARK = 'var(--yellow-dark)'
const PAPER_LINE = 'var(--paper-line)'
const BLUE_DARK = 'var(--blue-dark)'
const BLUE_LIGHT = 'color-mix(in srgb, var(--blue) 62%, var(--paper))'
const GREEN_DARK = 'color-mix(in srgb, var(--green) 62%, var(--ink))'
const WOOD = 'color-mix(in srgb, var(--orange) 45%, var(--ink))'
const WOOD_DARK = 'color-mix(in srgb, var(--orange) 30%, var(--ink))'
const WOOD_LIGHT = 'color-mix(in srgb, var(--orange) 62%, var(--paper))'
const METAL = 'color-mix(in srgb, var(--road) 75%, var(--ink))'
const SIDEWALK = 'color-mix(in srgb, var(--road-line) 82%, var(--ink))'
const CONCRETE = 'color-mix(in srgb, var(--road-line) 78%, var(--ink))'

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
      <ellipse cx="60" cy="156" rx="30" ry="5" fill={INK} opacity="0.14" />
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
      <ellipse cx="30" cy="196" rx="19" ry="4" fill={INK} opacity="0.14" />
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

/* ============================================================
   Art kit v2 — keenam objek pendamping jalan.
   Aturan gambar sama: garis tinta 4–5, isian token palet (atau
   color-mix turunannya), tanpa filter/gradien, dan bidang atas
   (atap, dudukan, tutup) ikut terlihat karena kamera menunduk.
   ============================================================ */

/** Ruko dua lantai: atap datar, papan nama, jendela atas, rolling door + pintu. */
export function Shop() {
  return (
    <svg className="wk-shop" viewBox="0 0 220 190" aria-hidden="true">
      {/* atap datar: bidang atas terlihat tipis di balik lis depan */}
      <polygon
        points="8,42 26,16 198,16 214,42"
        fill={RED_LIGHT}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="20" y="42" width="184" height="144" rx="4" fill={PAPER} stroke={INK} strokeWidth="5" />

      {/* papan nama toko, tiap balok mewakili satu kata */}
      <rect x="32" y="56" width="160" height="32" rx="4" fill={YELLOW} stroke={INK} strokeWidth="4" />
      <rect x="44" y="66" width="42" height="12" rx="4" fill={RED} stroke={INK} strokeWidth="4" />
      <rect x="96" y="66" width="30" height="12" rx="4" fill={RED} stroke={INK} strokeWidth="4" />
      <rect x="136" y="66" width="44" height="12" rx="4" fill={RED} stroke={INK} strokeWidth="4" />

      {/* dua jendela lantai atas */}
      <rect x="38" y="102" width="44" height="34" rx="3" fill={SKY} stroke={INK} strokeWidth="4" />
      <path d="M60 102v34M38 119h44" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="140" y="102" width="44" height="34" rx="3" fill={SKY} stroke={INK} strokeWidth="4" />
      <path d="M162 102v34M140 119h44" stroke={INK} strokeWidth="4" strokeLinecap="round" />

      {/* rolling door, pintu samping, dan tangga bawah */}
      <rect x="32" y="146" width="96" height="36" rx="3" fill={SIDEWALK} stroke={INK} strokeWidth="4" />
      <path d="M32 154h96M32 162h96M32 170h96" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="142" y="140" width="46" height="42" rx="4" fill={ORANGE} stroke={INK} strokeWidth="4" />
      <circle cx="178" cy="162" r="2.8" fill={INK} />
      <rect x="20" y="182" width="184" height="8" rx="4" fill={SIDEWALK} stroke={INK} strokeWidth="4" />
    </svg>
  )
}

/** Piket putih: enam piket, dua rel kayu; bidang atas rel dan piket ikut terlihat. */
export function Fence() {
  return (
    <svg className="wk-fence" viewBox="0 0 180 70" aria-hidden="true">
      <ellipse cx="90" cy="66" rx="86" ry="4" fill={INK} opacity="0.12" />
      {/* rel belakang: piket menutupi sebagian, jadi rel mengintip di sela */}
      <rect x="6" y="30" width="168" height="10" rx="3" fill={WOOD} stroke={INK} strokeWidth="4" />
      <rect x="6" y="54" width="168" height="10" rx="3" fill={WOOD} stroke={INK} strokeWidth="4" />

      {[16, 42, 68, 94, 120, 146].map((x) => (
        <g key={x}>
          <rect x={x} y="8" width="18" height="60" rx="3" fill={PAPER} stroke={INK} strokeWidth="4" />
          {/* tutup atas piket: bidang atas yang lebih terang */}
          <rect x={x} y="8" width="18" height="7" rx="3" fill={PAPER_LINE} stroke={INK} strokeWidth="4" />
        </g>
      ))}
    </svg>
  )
}

/**
 * Tong sampah, 0,55 × 0,90 m (viewBox 55×90), dilihat 3-4: tutupnya elips
 * miring ~20° (kamera menunduk, jadi bidang atasnya terlihat), satu sisi badan
 * terlihat, dan rusuk depan terpendek karena menjauh.
 */
export function Bin() {
  return (
    <svg className="wk-bin" viewBox="0 0 55 90" aria-hidden="true">
      <ellipse cx="28" cy="86" rx="21" ry="3.5" fill={INK} opacity="0.16" />

      {/* tutup: elips miring, bukan simetris */}
      <ellipse cx="28" cy="14" rx="20" ry="6.5" fill={GREEN_DARK} stroke={INK} strokeWidth="4" />
      <polygon
        points="8,14 14,22 46,20 48,14"
        fill={GREEN}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="24" y="4" width="10" height="6" rx="2" fill={METAL} stroke={INK} strokeWidth="3" />

      {/* badan: sisi jauh lebih tinggi di layar, sisi dekat memendek */}
      <polygon
        points="12,22 45,20 41,82 16,84"
        fill={BLUE}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* rusuk: makin ke kanan makin pendek (menjauh) */}
      <path d="M20 28v52M28 27v53M36 26v52" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <polygon
        points="14,84 43,82 43,87 14,89"
        fill={METAL}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Bangku taman, 0,67 × 0,85 m (viewBox 55×70), tergambar PROFIL: dudukan
 * memanjang ke belakang sebagai jajaran genjang, sandaran bidang tipis yang
 * naik, dan dua kaki dengan ukuran berbeda (dekat besar, jauh kecil) — bukan
 * dua kaki kembar seperti elevasi depan.
 *
 * Di jalan kiri (`facing: 'east'`), bangku menghadap kanan ke arah jalan.
 * Di jalan kanan (`facing: 'west'`), bangku dibalik menghadap kiri ke jalan.
 */
export function Bench({ facing = 'east' }: { facing?: 'east' | 'west' } = {}) {
  const flip = facing === 'west'
  return (
    <svg className="wk-bench" viewBox="0 0 55 70" aria-hidden="true">
      <g transform={flip ? 'scale(-1, 1) translate(-55, 0)' : undefined}>
        <ellipse cx="27" cy="66" rx="22" ry="3.5" fill={INK} opacity="0.16" />

        {/* sandaran: bidang tipis naik ke belakang-kanan */}
        <polygon
          points="10,8 20,6 22,30 12,32"
          fill={WOOD}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* dudukan: jajaran genjang memanjang ke belakang */}
        <polygon
          points="10,32 42,28 46,38 12,42"
          fill={WOOD_LIGHT}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <polygon
          points="12,42 46,38 46,44 12,48"
          fill={WOOD_DARK}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* kaki dekat (besar) dan kaki jauh (kecil) */}
        <rect x="14" y="48" width="7" height="17" fill={METAL} stroke={INK} strokeWidth="4" />
        <rect x="38" y="44" width="5" height="16" fill={METAL} stroke={INK} strokeWidth="3" />
      </g>
    </svg>
  )
}

/**
 * Halte bus, 0,80 × 1,80 m (viewBox 80×180), dilihat 3-4 saat kita berjalan
 * melewatinya: atapnya jajaran genjang yang menyusut ke atas-kanan karena halte
 * berdiri di KIRI titik hilang, tiang dekat tebal dan tiang jauh lebih kecil,
 * panel belakang miring, dan bangku di dalamnya tergambar menyamping sebagai
 * bidang tipis. Garis tanah + bayangan kontak supaya tidak "ditempel".
 */
export function BusStop() {
  return (
    <svg className="wk-busstop" viewBox="0 0 80 180" aria-hidden="true">
      {/* bayangan kontak */}
      <ellipse cx="42" cy="174" rx="34" ry="5" fill={INK} opacity="0.14" />

      {/* atap: sisi depan pendek, sisi belakang menyusut ke atas-kanan */}
      <polygon
        points="6,40 20,20 62,20 74,40"
        fill={BLUE_LIGHT}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <polygon
        points="6,40 74,40 68,50 12,50"
        fill={BLUE_DARK}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* tiang dekat (kiri) tebal, tiang jauh (kanan) lebih kecil */}
      <rect x="12" y="50" width="9" height="120" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="60" y="48" width="6" height="112" fill={METAL} stroke={INK} strokeWidth="3" />

      {/* panel belakang: jajaran genjang miring mengikuti garis jalan */}
      <polygon
        points="20,56 58,54 56,120 22,122"
        fill={PAPER_LINE}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* papan ikon bus menempel di panel, ikut miring sedikit */}
      <polygon
        points="26,64 52,63 51,84 27,85"
        fill={YELLOW}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <polygon points="30,69 48,68 48,80 30,81" fill={BLUE} stroke={INK} strokeWidth="3" />

      {/* bangku: bidang dudukan menyamping (tipis), kaki dekat + kaki jauh */}
      <polygon
        points="22,128 56,126 60,132 24,135"
        fill={WOOD}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="26" y="134" width="6" height="38" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="52" y="131" width="5" height="40" fill={METAL} stroke={INK} strokeWidth="3" />
    </svg>
  )
}

/** Tiang listrik: tiang beton, dua palang kayu, isolator kuning, kabel, dan trafo. */
export function PowerPole() {
  return (
    <svg className="wk-powerpole" viewBox="0 0 50 230" aria-hidden="true">
      <ellipse cx="26" cy="226" rx="16" ry="4" fill={INK} opacity="0.14" />
      {/* kabel: dua lengkung tipis di belakang palang */}
      <path d="M0 38q12 8 25 0t25 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M0 66q12 8 25 0t25 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />

      {/* tiang beton yang menyempit ke atas, plus topi dan alas */}
      <path d="M20 20h10l-1 202h-8Z" fill={CONCRETE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="18" y="15" width="14" height="7" rx="3" fill={SIDEWALK} stroke={INK} strokeWidth="4" />
      <rect x="14" y="220" width="22" height="8" rx="3" fill={CONCRETE} stroke={INK} strokeWidth="4" />

      {/* palang atas dan bawah: bidang atas terlihat sebagai poligon terang */}
      <rect x="4" y="44" width="42" height="9" rx="3" fill={WOOD} stroke={INK} strokeWidth="4" />
      <polygon
        points="4,44 46,44 43,38 7,38"
        fill={WOOD_LIGHT}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="7" y="68" width="36" height="8" rx="3" fill={WOOD} stroke={INK} strokeWidth="4" />
      <polygon
        points="7,68 43,68 41,63 9,63"
        fill={WOOD_LIGHT}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* isolator kuning di puncak palang */}
      <circle cx="10" cy="41" r="4" fill={YELLOW} stroke={INK} strokeWidth="4" />
      <circle cx="25" cy="41" r="4" fill={YELLOW} stroke={INK} strokeWidth="4" />
      <circle cx="40" cy="41" r="4" fill={YELLOW} stroke={INK} strokeWidth="4" />
      <circle cx="13" cy="66" r="3.5" fill={YELLOW_DARK} stroke={INK} strokeWidth="4" />
      <circle cx="37" cy="66" r="3.5" fill={YELLOW_DARK} stroke={INK} strokeWidth="4" />

      {/* trafo menempel di sisi kanan tiang */}
      <rect x="30" y="92" width="16" height="30" rx="6" fill={METAL} stroke={INK} strokeWidth="4" />
      <path d="M31 102h14M31 112h14" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Sekawan burung di langit: tiga siluet "v" dengan ukuran berbeda.
 *
 * Digambar tanpa perspektif dengan sengaja — burung terbang jauh di atas
 * kedalaman dunia, jadi memperkecilnya menurut kedalaman hanya akan membuat
 * gerak linearnya salah. Satu SVG berisi ketiganya supaya seluruh kawanan
 * hanya satu node yang dianimasikan CSS (`wk-birds-fly`).
 */
export function Birds() {
  return (
    <svg className="wk-birds-art" viewBox="0 0 160 60" aria-hidden="true">
      <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.72">
        <path d="M8 20 q7-8 14 0 q7-8 14 0" />
        <path d="M52 42 q5-6 10 0 q5-6 10 0" opacity="0.8" />
        <path d="M104 14 q6-7 12 0 q6-7 12 0" opacity="0.6" />
      </g>
    </svg>
  )
}
