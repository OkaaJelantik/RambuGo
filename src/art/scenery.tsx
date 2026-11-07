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

/** Tong sampah: tutup dengan bidang atas elips, badan biru menyempit ke alas. */
export function Bin() {
  return (
    <svg className="wk-bin" viewBox="0 0 60 90" aria-hidden="true">
      {/* tutup: bidang atas terlihat karena kamera menunduk */}
      <ellipse cx="30" cy="16" rx="24" ry="7" fill={GREEN_DARK} stroke={INK} strokeWidth="4" />
      <rect x="7" y="16" width="46" height="12" rx="5" fill={GREEN} stroke={INK} strokeWidth="4" />
      <rect x="22" y="5" width="16" height="8" rx="3" fill={METAL} stroke={INK} strokeWidth="4" />

      {/* badan dan rusuk */}
      <path d="M12 28h36l-4 54H16Z" fill={BLUE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 36v38M36 36v38" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="14" y="82" width="32" height="6" rx="3" fill={METAL} stroke={INK} strokeWidth="4" />
    </svg>
  )
}

/** Bangku taman: sandaran dua bilah, dudukan dengan bidang atas, kaki besi. */
export function Bench() {
  return (
    <svg className="wk-bench" viewBox="0 0 120 70" aria-hidden="true">
      {/* penopang sandaran, menyambung bilah ke dudukan */}
      <rect x="14" y="8" width="8" height="38" fill={WOOD_DARK} stroke={INK} strokeWidth="4" />
      <rect x="98" y="8" width="8" height="38" fill={WOOD_DARK} stroke={INK} strokeWidth="4" />

      {/* sandaran */}
      <rect x="10" y="8" width="100" height="9" rx="4" fill={WOOD} stroke={INK} strokeWidth="4" />
      <rect x="10" y="22" width="100" height="9" rx="4" fill={WOOD} stroke={INK} strokeWidth="4" />

      {/* kaki besi */}
      <rect x="18" y="46" width="9" height="22" rx="3" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="93" y="46" width="9" height="22" rx="3" fill={METAL} stroke={INK} strokeWidth="4" />

      {/* dudukan: bidang atas lalu bibir depan */}
      <polygon
        points="4,38 116,38 120,46 0,46"
        fill={WOOD_LIGHT}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="0" y="46" width="120" height="8" rx="3" fill={WOOD} stroke={INK} strokeWidth="4" />
    </svg>
  )
}

/** Halte bus: atap dengan bidang atas, dua tiang, papan ikon bus, bangku pendek. */
export function BusStop() {
  return (
    <svg className="wk-busstop" viewBox="0 0 160 150" aria-hidden="true">
      {/* atap: bidang atas lalu lis depan */}
      <polygon
        points="8,30 30,12 130,12 152,30"
        fill={BLUE_LIGHT}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="8" y="30" width="144" height="10" rx="4" fill={BLUE_DARK} stroke={INK} strokeWidth="4" />

      {/* tiang dan alas */}
      <rect x="18" y="40" width="10" height="104" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="132" y="40" width="10" height="104" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="12" y="142" width="22" height="8" rx="3" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="126" y="142" width="22" height="8" rx="3" fill={METAL} stroke={INK} strokeWidth="4" />

      {/* papan halte dengan ikon bus kecil, menggantung di lis atap */}
      <rect x="42" y="40" width="76" height="42" rx="5" fill={YELLOW} stroke={INK} strokeWidth="4" />
      <rect x="54" y="53" width="52" height="20" rx="5" fill={BLUE} stroke={INK} strokeWidth="4" />
      <rect x="61" y="58" width="13" height="9" rx="2" fill={SKY} stroke={INK} strokeWidth="4" />
      <rect x="80" y="58" width="13" height="9" rx="2" fill={SKY} stroke={INK} strokeWidth="4" />
      <circle cx="66" cy="76" r="4" fill={INK} />
      <circle cx="94" cy="76" r="4" fill={INK} />

      {/* bangku di bawah papan */}
      <rect x="46" y="112" width="68" height="8" rx="3" fill={WOOD} stroke={INK} strokeWidth="4" />
      <rect x="52" y="120" width="7" height="20" fill={METAL} stroke={INK} strokeWidth="4" />
      <rect x="101" y="120" width="7" height="20" fill={METAL} stroke={INK} strokeWidth="4" />
    </svg>
  )
}

/** Tiang listrik: tiang beton, dua palang kayu, isolator kuning, kabel, dan trafo. */
export function PowerPole() {
  return (
    <svg className="wk-powerpole" viewBox="0 0 50 230" aria-hidden="true">
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
