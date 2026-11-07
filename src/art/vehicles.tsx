/**
 * Kendaraan untuk scene berjalan: mobil dan motor, digambar dari belakang
 * seperti hero — lebar dan pendek, dengan atap serta alas yang terlihat
 * karena kamera sedikit menunduk.
 *
 * Semua dekoratif (`aria-hidden`), digambar dengan garis tinta tebal dan
 * isian rata dari token palet. Tidak ada filter atau gradien.
 */

const INK = 'var(--ink)'
const PAPER = 'var(--paper)'
const SKY = 'var(--sky-2)'
const RED = 'var(--red)'
const RED_LIGHT = 'color-mix(in srgb, var(--red) 62%, var(--paper))'
const RED_DARK = 'color-mix(in srgb, var(--red) 62%, var(--ink))'
const YELLOW = 'var(--yellow)'
const BLUE = 'var(--blue)'
const BLUE_DARK = 'color-mix(in srgb, var(--blue) 60%, var(--ink))'
const ORANGE = 'var(--orange)'
const METAL = 'color-mix(in srgb, var(--road) 70%, var(--ink))'
const HUB = 'color-mix(in srgb, var(--paper) 72%, var(--road-line))'

/**
 * Mobil dari belakang: atap sebagai bidang atas, kaca belakang, lampu
 * belakang kuning, dan dua roda berink. Lebar 160×90 supaya pas di lajur
 * (±0.2 lebar layar) tanpa menyentuh trotoar.
 */
export function Car() {
  return (
    <svg className="wk-veh wk-veh--car" viewBox="0 0 160 90" aria-hidden="true">
      {/* alas: bayangan di dalam SVG, bukan filter */}
      <ellipse cx="80" cy="84" rx="64" ry="5" fill={INK} opacity="0.14" />

      {/* atap: bidang atas yang lebih terang */}
      <polygon
        points="42,6 118,6 126,16 34,16"
        fill={RED_LIGHT}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* kaca belakang, lalu badan mobil menutup sisi bawahnya */}
      <polygon
        points="36,16 46,44 114,44 124,16"
        fill={SKY}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* badan dan spatbor */}
      <path
        d="M18 40h124c6 0 10 4 10 10v20c0 5-4 9-9 9H17c-5 0-9-4-9-9V50c0-6 4-10 10-10Z"
        fill={RED}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* lampu belakang */}
      <rect x="20" y="48" width="24" height="13" rx="5" fill={YELLOW} stroke={INK} strokeWidth="4" />
      <rect x="116" y="48" width="24" height="13" rx="5" fill={YELLOW} stroke={INK} strokeWidth="4" />

      {/* bemper dan plat nomor */}
      <rect x="12" y="67" width="136" height="11" rx="5.5" fill={RED_DARK} stroke={INK} strokeWidth="4" />
      <rect x="67" y="52" width="26" height="15" rx="3" fill={PAPER} stroke={INK} strokeWidth="3" />
      <path d="M73 60h14" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />

      {/* spion kecil di kedua sisi */}
      <rect x="18" y="35" width="10" height="7" rx="3" fill={RED_DARK} stroke={INK} strokeWidth="3" />
      <rect x="132" y="35" width="10" height="7" rx="3" fill={RED_DARK} stroke={INK} strokeWidth="3" />

      {/* roda gemuk di atas badan, supaya tetap terbaca sebagai mainan */}
      <rect x="10" y="60" width="30" height="26" rx="12" fill={INK} stroke={INK} strokeWidth="4" />
      <rect x="120" y="60" width="30" height="26" rx="12" fill={INK} stroke={INK} strokeWidth="4" />
      <rect x="20" y="69" width="10" height="9" rx="4.5" fill={HUB} stroke={INK} strokeWidth="2.5" />
      <rect x="130" y="69" width="10" height="9" rx="4.5" fill={HUB} stroke={INK} strokeWidth="2.5" />
    </svg>
  )
}

/**
 * Motor dari belakang: roda belakang besar berink, sepatbor biru, lampu
 * belakang, dan pengendara berhelm. Ramping supaya tidak menabrak marka
 * tengah meski berada di lajur yang sama dengan mobil.
 */
export function Motorcycle() {
  return (
    <svg className="wk-veh wk-veh--bike" viewBox="0 0 90 80" aria-hidden="true">
      <ellipse cx="45" cy="76" rx="34" ry="4.5" fill={INK} opacity="0.14" />

      {/* stang dan spion, di belakang pengendara */}
      <path d="M8 34h74" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="6" y="30" width="12" height="8" rx="4" fill={METAL} stroke={INK} strokeWidth="3" />
      <rect x="72" y="30" width="12" height="8" rx="4" fill={METAL} stroke={INK} strokeWidth="3" />

      {/* roda belakang */}
      <rect x="32" y="50" width="26" height="26" rx="12" fill={INK} stroke={INK} strokeWidth="4" />
      <circle cx="45" cy="63" r="7" fill={HUB} stroke={INK} strokeWidth="3" />

      {/* sepatbor dan lampu belakang */}
      <path
        d="M29 54c0-8 7-12 16-12s16 4 16 12Z"
        fill={BLUE}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="36" y="45" width="18" height="7" rx="3" fill={YELLOW} stroke={INK} strokeWidth="3" />

      {/* knalpot kecil di kanan */}
      <rect x="60" y="58" width="20" height="8" rx="4" fill={METAL} stroke={INK} strokeWidth="3" />

      {/* badan dan lengan pengendara */}
      <rect x="34" y="22" width="22" height="28" rx="9" fill={ORANGE} stroke={INK} strokeWidth="4" />
      <path d="M38 28 14 34M52 28l24 6" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="14" cy="34" r="5" fill={PAPER} stroke={INK} strokeWidth="3" />
      <circle cx="76" cy="34" r="5" fill={PAPER} stroke={INK} strokeWidth="3" />

      {/* helm bulat, dilihat dari belakang */}
      <circle cx="45" cy="14" r="11" fill={BLUE_DARK} stroke={INK} strokeWidth="4" />
      <path d="M36 14h18" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
