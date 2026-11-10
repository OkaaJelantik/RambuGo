/**
 * Persimpangan: kamera drone-tilt, tata letak dalam meter, sebaran deterministik,
 * dan reducer ambience.
 *
 * **Kenapa modul ini ada.** `projection.ts` adalah kamera scene berjalan: kamera
 * di trotoar, cakrawala di 38 % tinggi layar, satu meter 148 px pada 360×800.
 * Persimpangan di prototipe `Ref/crossroad-draft-a-v2.png` adalah kamera lain —
 * drone yang menunduk, cakrawala **di atas frame** (tanpa langit), dan satu meter
 * hanya ~28 px pada 390 lebar. Model `yAt`/`pxAt` tidak bisa menyatakan tanah
 * yang mengisi seluruh layar: `yAt(1) = 44,2 %` selalu menyisakan langit di atas.
 * Jadi modul ini memakai **model proyeksi sendiri**, tetapi tetap satu sistem
 * meter dengan sisa scene:
 *
 * - `ROAD_M` (4.8 m), `LANE_M` (2.4 m) dan `KERB_LINE_M` (0.12 m) diimpor dari
 *   `projection.ts`; jalur utara–selatan di sini **adalah** jalan yang barusan
 *   dijalani anak, bukan jalan lain.
 * - `METERS` tetap satu-satunya tabel tinggi objek. Ukuran layar =
 *   `meter × s(z) × HEIGHT_K`, dengan `s(z)` = px per meter pada kedalaman itu.
 * - `SIGN_STOP_D` tidak dipakai: ia kedalaman berhenti rambu di kamera berjalan,
 *   tidak punya padanan di kamera drone. (Lihat laporan tugas.)
 *
 * **Model kamera.** Satu meter ke timur dan satu meter ke utara sama panjang di
 * layar pada titik yang sama (`DEPTH_K = 1`): tidak ada faktor kompresi terpisah
 * untuk jalur melintang — bug lama yang membuat jalur horizontal terlihat 2,5×
 * lebih sempit. Konsekuensinya `s` linear terhadap y layar (seperti
 * `yAt` linear terhadap `scaleAt` di kamera berjalan):
 *
 *     s(y)  = s_c + k·(y − y_c)        s_c = px/m di tengah simpang
 *     s(z)  = s_c · e^(−k·z)           z = meter ke utara dari tengah simpang
 *     y(z)  = y_c + (s_c/k)·(e^(−k·z) − 1)
 *
 * Angka kalibrasinya dari prototipe (kanvas 390×844): simpang 134.5 px lebar =
 * 4.8 m, pusatnya di y = 354, dan px/m di tepi bawah : tepi atas = 43.75 : 16.67
 * = 2.625. Karena lebar jalur dan tinggi pita melintang sama-sama 4.8 m, simpang
 * selalu bujur sangkar di dunia — dan `crossing.test.ts` mengunci keduanya.
 *
 * **Tinggi objek** diproyeksikan `HEIGHT_K = 0.55`: 1 m tegak = 0.55 m di layar.
 * Itu dipakai untuk geometri yang dibangun dari meter (dinding rumah, tinggi
 * papan melayang, tinggi badan pejalan). Kendaraan dianjurkan lebar (1.8 m) —
 * seperti `METERS.car` — karena seninya sudah menggambar atap dari sedikit atas,
 * jadi tingginya mengikuti aspek art, bukan `HEIGHT_K`.
 *
 * Semua acak lewat `mulberry32` ber-seed (`createRng` di `spawner.ts`), tidak ada
 * `Math.random()`: seed yang sama menghasilkan simpang yang sama.
 */

import { METERS } from './meters'
import { KERB_LINE_M, LANE_M, ROAD_M } from './projection'
import {
  LANE_DIR,
  createRng,
  fitsLaneGap,
  shouldSpawn,
  spawnPed,
  spawnTraffic,
  type Ped,
  type Traffic,
} from './spawner'

/* ============================================================
   Kamera
   ============================================================ */

/**
 * Parameter kamera drone-tilt. Angkanya dari prototipe; jangan diubah
 * sendiri-sendiri karena tiga hal ini yang menjaga simpang tetap bujur sangkar
 * dan proporsinya sama di semua viewport.
 */
export const CROSS = {
  /**
   * Sisi simpang (4,8 m) sebagai bagian **tinggi** viewport: 134,5 / 844 =
   * 0,1595. Dikalibrasi dari tinggi, bukan lebar, karena seluruh tata letak
   * (rumah di 5 m, zebra di 4,3 m, papan di 5 m) hidup di kedalaman yang sama:
   * dengan `s_c ∝ tinggi`, frame selalu memperlihatkan ±30 m kedalaman di semua
   * viewport — ponsel 360×640 dan jendela 1280×800 memperlihatkan dunia yang
   * sama, hanya bidang lateralnya yang lebih lebar di layar lebar.
   */
  bandShareH: 0.1595,
  /** Batas: simpang tidak boleh lebih dari 62 % lebar frame (ponsel sempit). */
  maxBandShareW: 0.62,
  /** Pusat simpang sebagai bagian tinggi viewport: 354 / 844. */
  centreShare: 0.419,
  /** px per meter di tepi bawah dibagi di tepi atas: 43,75 / 16,67. */
  nearFarRatio: 2.625,
  /** Kedalaman tidak dikompresi: 1 m ke utara = 1 m ke timur pada titik sama. */
  depthK: 1,
  /** Tinggi objek 1 m tegak tampil 0,55 m di layar (kamera menunduk). */
  heightK: 0.55,
  /** Tinggi objek 1 m tampil 0,55 m (alias eksplisit untuk dibaca di kode). */
} as const

export type CrossView = {
  /** Lebar/tinggi frame dalam px. */
  w: number
  h: number
  /** px per meter di tengah simpang. */
  scale: number
  /** Laju perubahan skala per meter ke utara; 1/m. */
  k: number
  /** y layar pusat simpang. */
  centreY: number
  /** px per meter pada y layar. */
  sAtY: (y: number) => number
  /** px per meter pada kedalaman z (meter ke utara dari pusat simpang). */
  sAtZ: (z: number) => number
  /** y layar untuk kedalaman z. */
  yOfZ: (z: number) => number
  /** Kedalaman z untuk y layar (kebalikan `yOfZ`). */
  zOfY: (y: number) => number
  /** x layar untuk meter lateral `xm` pada kedalaman z. */
  xOf: (xm: number, z: number) => number
  /** px untuk `m` meter melintang pada kedalaman z (tanpa kompresi). */
  wOf: (m: number, z: number) => number
  /** px untuk `m` meter tegak pada kedalaman z (dikali `HEIGHT_K`). */
  hOf: (m: number, z: number) => number
  /** Kedalaman tepi atas dan tepi bawah frame, dalam meter. */
  zTop: number
  zBottom: number
}

export function createCrossView(w: number, h: number): CrossView {
  const safeW = Math.max(1, w)
  const safeH = Math.max(1, h)

  // Sisi simpang 16 % tinggi frame, dengan pagar lebar untuk ponsel sempit.
  // Pagar ini hanya soal framing — rasio sisi simpang terhadap lebar jalurnya
  // tetap 1:1, karena keduanya diukur dari `s_c` yang sama.
  const band = Math.min(CROSS.bandShareH * safeH, CROSS.maxBandShareW * safeW)
  const scale = band / ROAD_M
  const centreY = CROSS.centreShare * safeH
  const growth = CROSS.nearFarRatio - 1
  // Dari s(h)/s(0) = nearFarRatio: k = (R−1)·s_c / (h + (R−1)·y_c).
  const k = (growth * scale) / (safeH + growth * centreY)

  const sAtZ = (z: number) => scale * Math.exp(-k * z)
  const yOfZ = (z: number) => centreY + (scale / k) * (Math.exp(-k * z) - 1)
  const zOfY = (y: number) => -Math.log(1 + (k * (y - centreY)) / scale) / k
  const sAtY = (y: number) => scale + k * (y - centreY)

  return {
    w: safeW,
    h: safeH,
    scale,
    k,
    centreY,
    sAtY,
    sAtZ,
    yOfZ,
    zOfY,
    xOf: (xm: number, z: number) => safeW / 2 + xm * sAtZ(z),
    wOf: (m: number, z: number) => m * sAtZ(z),
    hOf: (m: number, z: number) => m * sAtZ(z) * CROSS.heightK,
    zTop: zOfY(0),
    zBottom: zOfY(safeH),
  }
}

/* ============================================================
   Tata letak dalam meter
   ============================================================ */

/** Setengah lebar jalur (utara–selatan dan barat–timur). */
export const ROAD_HALF = ROAD_M / 2

/** Lebar garis kerb, dari `projection.ts` — angka yang sama dengan scene berjalan. */
export const KERB_W = KERB_LINE_M

/**
 * Zebra di empat sisi simpang. Strip 0,45 m (spesifikasi tugas), celah 0,35 m,
 * enam strip, dan kanal selebar 1,6 m di sepanjang arah kendaraan. Zebra duduk
 * 0,3 m di luar bujur sangkar simpang supaya mulut simpang tetap bersih.
 */
export const ZEBRA = {
  strip: 0.45,
  gap: 0.35,
  count: 6,
  depth: 1.6,
  setback: 0.3,
} as const

/** Marka putus-putus tengah jalan: panjang, celah, dan tebal dari `METERS.mark`. */
export const MARK = {
  length: 0.8,
  gap: 0.8,
  half: METERS.mark.thickness / 2,
} as const

/** Satu bidang tanah: rentang lateral dan kedalaman, dalam meter. */
export type GroundRect = { x0: number; x1: number; z0: number; z1: number }

/** Lebar total zebra (paint + celah) dan sisa margin di tepi jalur. */
const ZEBRA_SPAN = ZEBRA.count * ZEBRA.strip + (ZEBRA.count - 1) * ZEBRA.gap
const ZEBRA_MARGIN = (ROAD_M - ZEBRA_SPAN) / 2

/**
 * Dua belas strip zebra: enam di utara, enam di selatan, enam di barat, enam di
 * timur — total 24 bidang. Zebra jalur vertikal adalah strip yang **sempit di x
 * dan panjang di z** (searah kendaraan); zebra jalur melintang dirotasi 90°:
 * sempit di z, panjang di x. Satu fungsi, jadi kedua arah tidak bisa memakai
 * lebar strip yang berbeda.
 */
export function zebraRects(): GroundRect[] {
  const near = ROAD_HALF + ZEBRA.setback
  const far = near + ZEBRA.depth
  const start = -ROAD_HALF + ZEBRA_MARGIN
  const out: GroundRect[] = []

  for (let i = 0; i < ZEBRA.count; i += 1) {
    const a = start + i * (ZEBRA.strip + ZEBRA.gap)
    const b = a + ZEBRA.strip
    // Utara & selatan: strip memanjang searah sumbu z, ditumpuk searah x.
    out.push({ x0: a, x1: b, z0: near, z1: far })
    out.push({ x0: a, x1: b, z0: -far, z1: -near })
    // Barat & timur: dirotasi 90° — memanjang searah x, ditumpuk searah z.
    out.push({ x0: -far, x1: -near, z0: a, z1: b })
    out.push({ x0: near, x1: far, z0: a, z1: b })
  }

  return out
}

/** Lebar trotoar, dari tabel meter: 2,0 m — angka yang sama dengan scene berjalan. */
export const SIDEWALK_W = METERS.sidewalk

/**
 * Trotoar di keempat sisi simpang: 2,0 m dari tepi jalur, **dipotong di mulut
 * simpang** — persis seperti kerb. Sepanjang jalur utara–selatan trotoar
 * berhenti di |z| = ROAD_HALF (mulut jalur melintang); sepanjang jalur
 * timur–barat trotoar berhenti di |x| = ROAD_HALF. Jadi tidak ada trotoar yang
 * melintasi area zebra/persimpangan, dan keempat sudutnya bertemu di petak
 * 2,0 × 2,0 m yang memang trotoar (diisi dua poligon, isian sama).
 *
 * Ini bidang tanah, bukan kotak 3D: cukup poligon + garis kerb yang sudah ada
 * (`kerbRects`) supaya terbaca sebagai trotoar yang sedikit lebih tinggi.
 */
export function sidewalkRects(xEdge: number, zTop: number, zBottom: number): GroundRect[] {
  const r = ROAD_HALF
  const o = r + SIDEWALK_W
  return [
    // Sepanjang jalur utara–selatan: barat & timur jalur, utara simpang.
    { x0: -o, x1: -r, z0: r, z1: zTop },
    { x0: r, x1: o, z0: r, z1: zTop },
    // Sisi yang sama, selatan simpang.
    { x0: -o, x1: -r, z0: zBottom, z1: -r },
    { x0: r, x1: o, z0: zBottom, z1: -r },
    // Sepanjang jalur timur–barat: dipotong di |x| = ROAD_HALF (mulut simpang).
    { x0: r, x1: xEdge, z0: r, z1: o },
    { x0: -xEdge, x1: -r, z0: r, z1: o },
    { x0: r, x1: xEdge, z0: -o, z1: -r },
    { x0: -xEdge, x1: -r, z0: -o, z1: -r },
  ]
}

/**
 * Kerb: garis 0,12 m **di luar** tepi jalur. Kerb jalur melintang dipotong di
 * mulut simpang (mulai di |x| = ROAD_HALF), dan kerb jalur vertikal berhenti di
 * tepi jalur melintang — jadi tidak ada kerb yang melintasi persimpangan.
 */
export function kerbRects(xEdge: number, zTop: number, zBottom: number): GroundRect[] {
  const r = ROAD_HALF
  const o = r + KERB_W
  return [
    // Kerb barat & timur jalur vertikal, di utara simpang.
    { x0: -o, x1: -r, z0: r, z1: zTop },
    { x0: r, x1: o, z0: r, z1: zTop },
    // Kerb barat & timur jalur vertikal, di selatan simpang.
    { x0: -o, x1: -r, z0: zBottom, z1: -r },
    { x0: r, x1: o, z0: zBottom, z1: -r },
    // Kerb jalur melintang: dipotong di |x| = r, tidak menyeberang simpang.
    { x0: r, x1: xEdge, z0: r, z1: o },
    { x0: -xEdge, x1: -r, z0: r, z1: o },
    { x0: r, x1: xEdge, z0: -o, z1: -r },
    { x0: -xEdge, x1: -r, z0: -o, z1: -r },
  ]
}

/**
 * Marka putus-putus tengah: di jalur vertikal berhenti di luar kanal zebra
 * (z = ±(setback + depth + gap)), di jalur melintang juga berhenti di luar kanal
 * zebra — jadi tidak ada garis tengah yang menerobos zebra.
 */
export function dashRects(xEdge: number, zTop: number, zBottom: number): GroundRect[] {
  const out: GroundRect[] = []
  const step = MARK.length + MARK.gap
  const start = ROAD_HALF + ZEBRA.setback + ZEBRA.depth + MARK.gap
  const half = MARK.half

  for (let z = start; z < zTop; z += step) {
    out.push({ x0: -half, x1: half, z0: z, z1: Math.min(z + MARK.length, zTop) })
  }
  for (let z = -start; z > zBottom; z -= step) {
    out.push({ x0: -half, x1: half, z0: Math.max(z - MARK.length, zBottom), z1: z })
  }
  for (let x = start; x < xEdge; x += step) {
    out.push({ x0: x, x1: Math.min(x + MARK.length, xEdge), z0: -half, z1: half })
  }
  for (let x = -start; x > -xEdge; x -= step) {
    out.push({ x0: Math.max(x - MARK.length, -xEdge), x1: x, z0: -half, z1: half })
  }

  return out
}

/** Badan jalan: satu bidang vertikal selebar 4,8 m dan satu pita melintang. */
export function roadRects(
  xEdge: number,
  zTop: number,
  zBottom: number,
): { vertical: GroundRect; lateral: GroundRect } {
  return {
    vertical: { x0: -ROAD_HALF, x1: ROAD_HALF, z0: zBottom, z1: zTop },
    lateral: { x0: -xEdge, x1: xEdge, z0: -ROAD_HALF, z1: ROAD_HALF },
  }
}

/** Empat titik proyeksi sebuah bidang tanah, untuk atribut `points` SVG. */
export function groundPoints(view: CrossView, rect: GroundRect): string {
  const p = (x: number, z: number) => `${view.xOf(x, z).toFixed(2)},${view.yOfZ(z).toFixed(2)}`
  return [p(rect.x0, rect.z0), p(rect.x1, rect.z0), p(rect.x1, rect.z1), p(rect.x0, rect.z1)].join(' ')
}

/** Tepi lateral yang cukup lebar untuk menutup frame di semua viewport. */
export function lateralEdge(view: CrossView): number {
  return view.w / 2 / view.scale + 2
}

/**
 * Indeks tumpuk objek dunia (bukan papan pilihan): makin dekat kamera, makin
 * besar. Rumus yang sama dipakai prop dan kendaraan, jadi kendaraan di depan
 * pohon menimpa pohon, bukan sebaliknya.
 */
const Z_FAR = 17
const Z_NEAR = -14

export function junctionZ(z: number): number {
  const t = Math.min(1, Math.max(0, (Z_FAR - z) / (Z_FAR - Z_NEAR)))
  return 20 + Math.round(t * 80)
}

/* ============================================================
   Sebaran elemen acak (deterministik)
   ============================================================ */

export type JunctionPropKind = 'house' | 'tree' | 'lamp' | 'bench' | 'bin'

/** Sisi rumah yang menghadap jalan. */
export type Facing = 'east' | 'west'

export type JunctionProp = {
  id: string
  kind: JunctionPropKind
  /** Meter lateral dari pusat simpang; positif = timur. */
  x: number
  /** Meter ke utara dari pusat simpang. */
  z: number
  /** Sisi fasad; hanya rumah. Selalu sisi yang menghadap jalur. */
  facing: Facing | null
  /** 0..2, dipakai untuk variasi ukuran pohon. */
  variant: number
}

/** Seed sebaran. Tetap: simpang yang sama di setiap run, seperti scene berjalan. */
export const JUNCTION_SEED = 20261109

type Zone = {
  kind: JunctionPropKind
  x0: number
  x1: number
  z0: number
  z1: number
}

/**
 * Zona sebaran, dalam meter. Semua zona berada **di luar** jalur + kerb
 * (|x| > 2,52 dan |z| > 2,52), jadi tidak ada prop yang berdiri di aspal.
 *
 * Rumah sengaja hanya di sisi jalur utara–selatan — di situlah dindingnya bisa
 * menghadap jalan. Rumah di sisi jalur melintang akan menghadap kamera (fasad
 * selatan), kesalahan versi sebelumnya, dan itu tidak dilakukan di sini.
 *
 * **Kenapa rumah digeser ke luar (|x| ≥ 6,7).** Trotoar baru selebar 2,0 m
 * menempati |x| 2,4 … 4,4, dan dinding ujung rumah (4,4 m) berpusat di
 * `prop.x`, jadi tepi dinding yang menghadap jalan ada di |x| − 2,2. Dengan
 * |x| 5,0–6,6 (versi sebelum trotoar) rumah berdiri **di atas** trotoar.
 * |x| 6,7–7,1 menaruh tepi dinding di 4,5–4,9 m: di luar trotoar, dengan sisa
 * pekarangan 0,1–0,5 m yang dilewati jalan setapak. Rumah jadi lebih dekat
 * tepi frame — itu konsekuensi yang diterima dari trotoar 2,0 m.
 */
const ZONES: ReadonlyArray<Zone> = [
  // Rumah: barat & timur jalur vertikal, di utara simpang. Yang dilihat kamera
  // adalah dinding ujung (gable end) yang polos; fasadnya tidak digambar lagi.
  { kind: 'house', x0: -7.1, x1: -6.7, z0: 4.6, z1: 5.6 },
  { kind: 'house', x0: 6.7, x1: 7.1, z0: 5.8, z1: 6.8 },
  // Pohon jauh: di belakang atap rumah, jadi tajuknya terlihat di atas
  // bubungan — bukan tertutup kotak rumah.
  { kind: 'tree', x0: -7.4, x1: -5.0, z0: 11.0, z1: 13.5 },
  { kind: 'tree', x0: 5.0, x1: 7.4, z0: 11.0, z1: 13.5 },
  // Pohon dekat: sudut barat-daya dan tenggara, di luar kerb.
  { kind: 'tree', x0: -4.4, x1: -3.4, z0: -9.0, z1: -6.2 },
  { kind: 'tree', x0: 3.4, x1: 4.4, z0: -9.2, z1: -6.4 },
  // Lampu jalan: di trotoar, **jauh dari tiang lampu lalu lintas** di sudut.
  // Tiang jalan versi lama berdiri 0,5 m dari tiang simpang; di layar dua tiang
  // sejajar 2,7 px terlihat seperti satu tiang ganda, dan kepala lampunya
  // tertembus tiang simpang. Karena itu dua lampu utara digeser 5 m ke utara
  // dan lampu tenggara ke sisi timur jalur melintang.
  { kind: 'lamp', x0: -3.36, x1: -3.02, z0: 8.4, z1: 9.2 },
  { kind: 'lamp', x0: 3.02, x1: 3.36, z0: 8.4, z1: 9.2 },
  { kind: 'lamp', x0: 5.2, x1: 5.6, z0: -3.36, z1: -3.0 },
  { kind: 'lamp', x0: -6.6, x1: -4.4, z0: 3.02, z1: 3.36 },
  // Bangku: di taman, jauh dari jalur anak.
  { kind: 'bench', x0: -4.8, x1: -3.4, z0: -6.6, z1: -4.6 },
  { kind: 'bench', x0: 3.4, x1: 4.8, z0: 4.8, z1: 6.2 },
  { kind: 'bench', x0: 3.6, x1: 4.6, z0: -7.5, z1: -5.5 },
  // Tong sampah: di tepi taman, dekat kerb.
  { kind: 'bin', x0: -3.4, x1: -3.0, z0: -4.8, z1: -3.6 },
  { kind: 'bin', x0: 3.2, x1: 4.4, z0: -8.6, z1: -7.0 },
]

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Sebaran properti: posisi diundi di dalam zona dengan `mulberry32`, lalu
 * diurutkan dari jauh ke dekat supaya urutan cat DOM sama dengan urutan
 * kedalaman. Seed yang sama = jalan yang sama.
 */
export function scatterProps(seed: number = JUNCTION_SEED): JunctionProp[] {
  const rng = createRng(seed)
  const props = ZONES.map((zone, index) => {
    const x = round2(zone.x0 + rng() * (zone.x1 - zone.x0))
    const z = round2(zone.z0 + rng() * (zone.z1 - zone.z0))
    // Rumah menghadap jalur vertikal di x = 0: yang di barat menghadap timur,
    // yang di timur menghadap barat. Diturunkan dari posisi, bukan diundi, jadi
    // tidak mungkin ada rumah yang membelakangi jalan.
    const facing: Facing | null =
      zone.kind === 'house' ? (x < 0 ? 'east' : 'west') : null
    return {
      id: `${zone.kind}-${index}`,
      kind: zone.kind,
      x,
      z,
      facing,
      variant: Math.floor(rng() * 3),
    }
  })

  return props.sort((a, b) => b.z - a.z)
}

/* ============================================================
   Jalan setapak: pengganti fasad yang dihapus
   ============================================================ */

/**
 * Lebar dinding ujung rumah, meter. Satu sumber dengan `HOUSE_ART.width` di
 * `art/junctionArt.tsx` (yang mengimpor angka ini). Di sini angkanya dibutuhkan
 * untuk menghitung kaki rumah tanpa impor melingkar — `junctionArt` sudah
 * mengimpor `CROSS` dari modul ini.
 */
export const HOUSE_FOOT_M = 4.4

/**
 * Jalan setapak dari rumah ke tepi jalan. **Kenapa ada.** Fasad (pintu dan
 * jendela) dihapus karena di kamera ini ia hanya pita 4–12 px; kesan "rumah ini
 * punya pintu ke jalan" lalu dibawa oleh bidang tanah ini, bukan oleh dinding.
 *
 * `width` selebar 0,8 m; panjangnya mengikuti jarak dinding rumah ke tepi aspal
 * (rumah di |x| 6,7–7,1 → panjang 2,1–2,5 m). Ia melintasi trotoar dan berhenti
 * di kerb, jadi terbaca sebagai jalan masuk dari rumah ke jalan — persis fungsi
 * yang dulu dibawa pintu.
 */
export const WALK_PATH = {
  width: 0.8,
  /** Tebal garis tepi yang lebih gelap, meter. */
  edge: 0.06,
  /** Jarak sumbu jalan setapak dari ujung selatan dinding rumah, meter. */
  fromSouth: 1.0,
} as const

export type WalkPath = {
  /** Id rumah pemiliknya. */
  id: string
  /** Sisi rumah yang menghadap jalan. */
  facing: Facing
  /** Badan jalan setapak (bidang tanah). */
  rect: GroundRect
  /** Dua garis tepi memanjang, lebih gelap. */
  edges: [GroundRect, GroundRect]
}

/**
 * Satu jalan setapak per rumah, di sisi yang menghadap jalan. Berhenti tepat di
 * tepi aspal (|x| = ROAD_HALF), jadi tidak pernah menabrak badan jalan, dan
 * dimulai di dinding rumah — bukan di tengah pekarangan.
 */
export function walkPaths(houses: ReadonlyArray<JunctionProp>): WalkPath[] {
  const out: WalkPath[] = []
  const roadEdge = ROAD_HALF
  for (const house of houses) {
    if (house.kind !== 'house' || house.facing === null) continue
    // Tepi dinding yang menghadap jalan, meter absolut dari pusat simpang.
    const wall = Math.abs(house.x) - HOUSE_FOOT_M / 2
    // Tidak ada pekarangan untuk dilewati: lewati rumah ini ketimbang menggambar
    // jalan setapak selebar nol yang menyatu dengan trotoar.
    if (wall <= roadEdge + SIDEWALK_W) continue
    const z0 = house.z + WALK_PATH.fromSouth - WALK_PATH.width / 2
    const z1 = z0 + WALK_PATH.width
    const rect: GroundRect =
      house.facing === 'east'
        ? { x0: -wall, x1: -roadEdge, z0, z1 }
        : { x0: roadEdge, x1: wall, z0, z1 }
    out.push({
      id: house.id,
      facing: house.facing,
      rect,
      edges: [
        { ...rect, z1: rect.z0 + WALK_PATH.edge },
        { ...rect, z0: rect.z1 - WALK_PATH.edge },
      ],
    })
  }
  return out
}

/* ============================================================
   Ambience: kendaraan & pejalan (spawner yang sudah ada)
   ============================================================ */

export const VEHICLE_SLOTS = 4
export const PED_SLOTS = 3

/** Jeda spawn, detik. Pemandangan lebih luas dari scene berjalan, jadi lebih jarang. */
export const CROSS_SPAWN = {
  traffic: { min: 1.6, max: 3.4 },
  ped: { min: 2.2, max: 4.6 },
} as const

/**
 * `spawner.ts` menyimpan kecepatan sebagai satuan kedalaman per detik
 * (0,18–0,30 kendaraan, 0,08–0,14 pejalan) untuk kamera berjalan. Di sini
 * kedalaman adalah meter, jadi band itu dipetakan ke m/s: 0,18–0,30 × 30 =
 * 5,4–9 m/s (jalan kampung), 0,08–0,14 × 12 = 1,0–1,7 m/s (langkah anak).
 */
export const TRAFFIC_MPS = 30
export const PED_MPS = 12

/** Jarak minimum dua kendaraan di lajur yang sama, meter. */
export const LANE_GAP_M = 5

/** Margin di luar frame tempat aktor lahir dan mati, meter. */
export const SPAWN_MARGIN = 1.4

/** x kendaraan: lajur kiri (menjauh) dan kanan (mendekat), dari `LANE_M`. */
export function vehicleX(v: Pick<Traffic, 'lane' | 'offsetM'>): number {
  return (v.lane === 'laneL' ? -LANE_M / 2 : LANE_M / 2) + v.offsetM
}

/**
 * x pejalan. Bukan di tengah zebra: 0,7 m di luar kerb menaruh mereka tepat di
 * kanal zebra (zebra 2,7–4,3 m), jadi pejalan yang berjalan menyusuri jalan
 * menyeberang jalur melintang **di zebra**, bukan di sembarang tempat.
 */
export function pedX(p: Pick<Ped, 'lane'>): number {
  return p.lane === 'sidewalkL' ? -(ROAD_HALF + 0.7) : ROAD_HALF + 0.7
}

export type CrossPed = Ped & { dir: 1 | -1 }

export type CrossBounds = { top: number; bottom: number }

export type CrossState = {
  vehicles: Array<Traffic | null>
  peds: Array<CrossPed | null>
  /** Id berikutnya untuk spawner. */
  nextId: number
  trafficSince: number
  trafficWait: number
  pedSince: number
  pedWait: number
  /** RNG ber-seed; satu-satunya sumber acak. */
  rng: () => number
  /** Berapa aktor sudah lahir — untuk tes dan debug. */
  spawned: number
}

function randomWait(rng: () => number, band: { min: number; max: number }): number {
  return band.min + rng() * (band.max - band.min)
}

/**
 * Dunia ambience untuk satu simpang. Dua kendaraan dan satu pejalan sudah
 * berada di jalan pada frame pertama: layar kosong di detik pertama adalah
 * keluhan yang sama dengan "jalan kosong" di scene berjalan.
 */
export function createCrossState(seed: number = JUNCTION_SEED): CrossState {
  const rng = createRng(seed)
  const state: CrossState = {
    vehicles: Array.from({ length: VEHICLE_SLOTS }, () => null),
    peds: Array.from({ length: PED_SLOTS }, () => null),
    nextId: 1,
    trafficSince: 0,
    trafficWait: CROSS_SPAWN.traffic.min,
    pedSince: 0,
    pedWait: CROSS_SPAWN.ped.min,
    rng,
    spawned: 0,
  }

  for (let i = 0; i < 2; i += 1) {
    const v = spawnTraffic(rng, state.nextId)
    state.nextId += 1
    state.vehicles[i] = { ...v, depth: i === 0 ? 3.4 : -3.2 }
    state.spawned += 1
  }

  const p = spawnPed(rng, state.nextId)
  state.nextId += 1
  state.peds[0] = { ...p, dir: 1, depth: 1.2 }
  state.spawned += 1

  return state
}

/** Arah pejalan bergantian supaya kedua arah selalu terlihat; sisanya dari spawner. */
function pedDirection(nextId: number): 1 | -1 {
  return nextId % 2 === 0 ? 1 : -1
}

/**
 * Majukan ambience `dt` detik. Murni terhadap `state` (tidak memutasi): yang
 * berubah hanya objek baru yang dikembalikan. Satu-satunya efek samping adalah
 * menarik angka dari `state.rng`, yang memang deterministik per seed.
 */
export function stepCross(state: CrossState, dt: number, bounds: CrossBounds): CrossState {
  if (!(dt > 0)) return state

  const lowEdge = bounds.bottom - SPAWN_MARGIN
  const highEdge = bounds.top + SPAWN_MARGIN

  const vehicles = state.vehicles.map((v) => {
    if (!v) return null
    const depth = v.depth + v.dir * v.speed * TRAFFIC_MPS * dt
    return depth < lowEdge || depth > highEdge ? null : { ...v, depth }
  })

  const peds = state.peds.map((p) => {
    if (!p) return null
    const depth = p.depth + p.dir * p.speed * PED_MPS * dt
    return depth < lowEdge || depth > highEdge ? null : { ...p, depth }
  })

  let nextId = state.nextId
  let spawned = state.spawned

  let trafficWait = state.trafficWait
  let trafficSince = state.trafficSince
  if (trafficWait <= 0) trafficWait = randomWait(state.rng, CROSS_SPAWN.traffic)
  if (
    vehicles.includes(null) &&
    shouldSpawn(dt, trafficSince, CROSS_SPAWN.traffic.min, trafficWait)
  ) {
    const v = spawnTraffic(state.rng, nextId)
    nextId += 1
    // Menjauh (dir 1) masuk dari tepi dekat; mendekat masuk dari tepi jauh —
    // arah yang sama dengan scene berjalan, jadi tidak ada kendaraan yang
    // muncul di tengah layar.
    const depth = LANE_DIR[v.lane] === 1 ? lowEdge : highEdge
    if (fitsLaneGap(depth, vehicles, v.lane, LANE_GAP_M)) {
      const slot = vehicles.indexOf(null)
      vehicles[slot] = { ...v, depth }
      spawned += 1
    }
    trafficSince = 0
    trafficWait = randomWait(state.rng, CROSS_SPAWN.traffic)
  } else {
    trafficSince += dt
  }

  let pedWait = state.pedWait
  let pedSince = state.pedSince
  if (pedWait <= 0) pedWait = randomWait(state.rng, CROSS_SPAWN.ped)
  if (peds.includes(null) && shouldSpawn(dt, pedSince, CROSS_SPAWN.ped.min, pedWait)) {
    const p = spawnPed(state.rng, nextId)
    const dir = pedDirection(nextId)
    nextId += 1
    const depth = dir === 1 ? lowEdge : highEdge
    const slot = peds.indexOf(null)
    peds[slot] = { ...p, dir, depth }
    spawned += 1
    pedSince = 0
    pedWait = randomWait(state.rng, CROSS_SPAWN.ped)
  } else {
    pedSince += dt
  }

  return {
    vehicles,
    peds,
    nextId,
    trafficSince,
    trafficWait,
    pedSince,
    pedWait,
    rng: state.rng,
    spawned,
  }
}

/* ============================================================
   Papan pilihan rute
   ============================================================ */

/**
 * Papan melayang: papan di atas jalan, bukan rambu bertiang. Ukurannya
 * "afordansi permainan" seperti `SIGN_EMPHASIS` di scene berjalan — 3,3 m di
 * kamera drone hanya 92 px, terlalu kecil untuk dibaca anak dan diketuk — jadi
 * digambar `emphasis` lebih besar. `METERS` tidak pernah diskalakan.
 */
export const BOARD = {
  w: 3.3,
  h: 1.8,
  hover: 1.9,
  emphasis: 1.2,
} as const

export type BoardRoad = 'north' | 'west' | 'east'

/**
 * Tiga papan, tiga jalan: utara = lurus (jalan lagi), timur = kuis, barat =
 * materi. **Tidak ada papan di selatan** — itu arah kedatangan pemain, dan
 * papan di sana akan terbaca sebagai jalan kembali.
 *
 * Posisi dalam meter: papan timur/barat duduk di jalur melintang 4,6 m dari
 * pusat, tepat di luar kanal zebra; papan utara di jalur vertikal 6,4 m ke utara,
 * juga di luar zebra. Ketiganya melayang `BOARD.hover` meter di atas aspal.
 */
export const BOARDS: ReadonlyArray<{ road: BoardRoad; x: number; z: number }> = [
  // Papan utara di 6,4 m, bukan 5 m: papan selebar 3,3 m × `BOARD.emphasis`
  // (3,96 m di bidang pusat) yang melayang 1,9 m menutupi **kotak lampu** dua
  // unit utara (kotak di 4,2 … 2,95 m, |x| 1,5 m) kalau ia di 5 m — dua dari
  // delapan lampu jadi tak terlihat di belakang tombol. Di 6,4 m papan naik
  // 14 px dan lampunya bebas. Tetap di jalur vertikal, tetap di luar zebra.
  { road: 'north', x: 0, z: 6.4 },
  { road: 'west', x: -4.6, z: 0 },
  { road: 'east', x: 4.6, z: 0 },
]

/* ============================================================
   Lampu lalu lintas
   ============================================================ */

/** Arah yang dilayani satu unit; fase lampu nanti ditentukan per aksis. */
export type TrafficAxis = 'ns' | 'ew'

/** Sudut simpang. */
export type TrafficCorner = 'nw' | 'ne' | 'sw' | 'se'

/** Arah lengan: selalu menjulur ke jalan yang dilayani unitnya. */
export type TrafficArm = 'north' | 'south' | 'east' | 'west'

/**
 * Fase lampu. **Belum dipakai render ini** — kedelapan unit bersifat statis
 * (ketiga lampu digambar, tidak ada yang menyala). Tipe ini diekspor supaya
 * pekerjaan berikutnya (fase per aksis, kendaraan berhenti bergantian) tinggal
 * menambahkan state tanpa membongkar `TRAFFIC_LIGHTS` atau render.
 */
export type TrafficPhase = 'red' | 'yellow' | 'green'

/**
 * Ukuran satu unit lampu lalu lintas, meter. Tidak masuk `METERS`: `METERS`
 * adalah tabel objek scenery scene berjalan (`house`, `tree`, `lamp`), dan lampu
 * simpang tidak punya padanan di sana. Semua angka di sini **meter**, dan tetap
 * diproyeksikan kamera yang sama: tegak lewat `HEIGHT_K` (`view.hOf`), mendatar
 * lewat `view.wOf`.
 *
 * `boxHeight` 1,25 m = tiga lampu Ø 0,30 m + empat celah 0,0875 m. `boxWidth`
 * 0,52 m menghasilkan kotak 13 × 17 px pada 390×844 — kecil, tetapi itu ukuran
 * dunia yang diminta; afordansi besar seperti `SIGN_EMPHASIS` tidak dipakai di
 * sini supaya lampu tidak lebih besar dari mobil.
 */
export const TRAFFIC_LIGHT = {
  /** Tinggi tiang, meter (diproyeksikan HEIGHT_K). */
  pole: 4.2,
  /** Panjang lengan dari puncak tiang ke ujungnya, meter. */
  arm: 1.9,
  /** Tinggi kotak lampu, meter (diproyeksikan HEIGHT_K). */
  boxHeight: 1.25,
  /** Lebar kotak lampu, meter. */
  boxWidth: 0.52,
  /** Diameter satu lampu, meter. */
  lamp: 0.3,
  /** Tebal tiang, meter. */
  poleWidth: 0.12,
  /** Tebal lengan, meter. */
  armWidth: 0.1,
  /** Lebar bayangan kontak di tanah, meter. */
  shadow: 1.25,
  /** Rasio tinggi/lebar bayangan di layar (elips tanah, art bukan efek). */
  shadowSquash: 0.34,
  /** Sudut membulat kotak lampu, meter. */
  boxRadius: 0.06,
} as const

/** Tiang di tengah trotoar (1,0 m dari tepi jalur). */
const TL_INSET = SIDEWALK_W / 2
/** Sisi tegak lurus: 0,2 m di luar tepi trotoar, jadi tiang berdiri di rumput. */
const TL_OUT = SIDEWALK_W + 0.2
/**
 * Unit `ew` berdiri di sudut trotoar, 1,5 m dari tepi jalur di kedua arah
 * (|x| = |z| = 3,9 m). Dua angka itu bukan hiasan:
 *
 * - x 3,9 m masih di atas trotoar (2,4 … 4,4 m) dan **di luar** kaki rumah:
 *   dinding rumah berdiri di |x| 4,5–4,9 m. Di 4,6 m tiang berdiri di dalam
 *   denah rumah dan menimpa dindingnya (diukur: 453 px² tumpang tindih).
 * - z 3,9 m cukup jauh untuk tidak berdiri di zebra, cukup dekat supaya ujung
 *   lengan (1,9 m) masih di atas jalur melintang. Di 3,4 m kotak lampunya
 *   jatuh tepat di belakang tepi atas papan timur/barat (papan melayang 1,9 m,
 *   kotak di 2,95–4,2 m); 3,9 m menaikkan kotak 11 px sehingga bebas tombol.
 */
const TL_EW_X = SIDEWALK_W * 0.75
const TL_EW_Z = SIDEWALK_W * 0.75

/**
 * Tabel delapan unit, dua per sudut: satu untuk aksis utara–selatan dan satu
 * untuk aksis timur–barat. Sudut diturunkan dari tanda `sx`/`sz`, jadi tidak
 * mungkin ada unit yang lupa aksisnya atau dua unit yang menempati kutub yang
 * sama.
 *
 * Unit `ns` berdiri di tengah trotoar jalur vertikal dan lengannya menjulur ke
 * jalur itu (ujungnya di |x| 1,5 m — di atas lajur). Unit `ew` berdiri di sudut
 * trotoar dan lengannya menjulur ke jalur melintang (ujungnya di |z| 2,0 m).
 */
const CORNERS: ReadonlyArray<{ corner: TrafficCorner; sx: 1 | -1; sz: 1 | -1 }> = [
  { corner: 'nw', sx: -1, sz: 1 },
  { corner: 'ne', sx: 1, sz: 1 },
  { corner: 'sw', sx: -1, sz: -1 },
  { corner: 'se', sx: 1, sz: -1 },
]

/** Jalan masuk yang dilayani unit ini, dari sudut pandang pengemudi. */
export type TrafficLane = 'south' | 'east' | 'north' | 'west'
export type TrafficSide = 'left' | 'right'
/**
 * Cara pemasangan kotak lampu.
 *
 * `upright` — tiang tegak, kotak berdiri, tiga lampu bertumpuk (isyarat belok).
 * `cross` — tiangnya sendiri melintang di atas jalan dan kotaknya ditelentangkan
 * (diputar 90°), jadi tiga lampunya berjajar mendatar (isyarat lurus). Ini
 * "struktur bertingkat" yang dimaksud prototipe: satu unit menandai belok kiri,
 * satu lagi — yang telentang — menandai lurus.
 */
export type TrafficMount = 'upright' | 'cross'

/** Jenis pemasangan satu kotak pada rangka: berdiri, atau ditelentangkan. */
export type TrafficBoxMount = 'upright' | 'cross'

/**
 * Satu kotak lampu yang digantung pada lengan rangka L. Ukurannya selalu sama
 * (`TRAFFIC_LIGHT.boxWidth` × `boxHeight`); yang berbeda hanya rotasinya.
 */
export type TrafficLightBox = {
  mount: TrafficBoxMount
  /** Muka kotak menghadap kamera? */
  facing: 'view' | 'side'
  /** Posisi sepanjang lengan: 0 = pangkal di tiang, 1 = ujung lengan. */
  along: number
}

/**
 * Satu rangka lampu: **tiang tegak + satu lengan mendatar** (bentuk L terbalik),
 * bukan dua tiang terpisah. Kotak lampunya digantung di sambungan itu.
 */
export type TrafficLightUnit = {
  id: string
  corner: TrafficCorner
  lane: TrafficLane
  side: TrafficSide
  axis: TrafficAxis
  x: number
  z: number
  arm: TrafficArm
  boxes: ReadonlyArray<TrafficLightBox>
}

const L_PAIR: ReadonlyArray<TrafficLightBox> = [
  { mount: 'upright', facing: 'side', along: 0.3 },
  { mount: 'cross', facing: 'side', along: 0.78 },
]

/**
 * Delapan rangka: satu di sisi kiri dan satu di sisi kanan tiap jalan.
 *
 * Rangka kiri menggantung **dua** kotak seukuran sama — satu berdiri (isyarat
 * belok kiri) dan satu ditelentangkan (isyarat lurus). Rangka kanan hanya satu.
 * Tiga kotak di jalan selatan menghadap kamera; sisanya menghadap seberang
 * jalur sehingga lampunya tak terlihat, seperti prototipe.
 */
export const TRAFFIC_LIGHTS: ReadonlyArray<TrafficLightUnit> = [
  // ── jalan selatan (kendaraan menuju utara): kiri = barat ──────────────────
  { id: 'south-left', lane: 'south', side: 'left', corner: 'sw', axis: 'ns', x: -(ROAD_HALF + TL_INSET),
    z: -(ROAD_HALF + TL_OUT), arm: 'east', boxes: [
      { mount: 'upright', facing: 'view', along: 0.3 },
      { mount: 'cross', facing: 'view', along: 0.78 },
    ] },
  { id: 'south-right', lane: 'south', side: 'right', corner: 'se', axis: 'ns', x: ROAD_HALF + TL_INSET,
    z: -(ROAD_HALF + TL_OUT), arm: 'west', boxes: [
      { mount: 'upright', facing: 'view', along: 0.5 },
    ] },

  // ── jalan timur (kendaraan menuju barat): kiri = selatan ──────────────────
  { id: 'east-left', lane: 'east', side: 'left', corner: 'se', axis: 'ew', x: ROAD_HALF + TL_OUT,
    z: -(ROAD_HALF + TL_INSET), arm: 'north', boxes: L_PAIR },
  { id: 'east-right', lane: 'east', side: 'right', corner: 'ne', axis: 'ew', x: ROAD_HALF + TL_OUT,
    z: ROAD_HALF + TL_INSET, arm: 'south', boxes: [{ mount: 'upright', facing: 'side', along: 0.5 }] },

  // ── jalan utara (kendaraan menuju selatan): kiri = timur ──────────────────
  { id: 'north-left', lane: 'north', side: 'left', corner: 'ne', axis: 'ns', x: ROAD_HALF + TL_INSET,
    z: ROAD_HALF + TL_OUT, arm: 'west', boxes: L_PAIR },
  { id: 'north-right', lane: 'north', side: 'right', corner: 'nw', axis: 'ns', x: -(ROAD_HALF + TL_INSET),
    z: ROAD_HALF + TL_OUT, arm: 'east', boxes: [{ mount: 'upright', facing: 'side', along: 0.5 }] },

  // ── jalan barat (kendaraan menuju timur): kiri = utara ────────────────────
  { id: 'west-left', lane: 'west', side: 'left', corner: 'nw', axis: 'ew', x: -(ROAD_HALF + TL_OUT),
    z: ROAD_HALF + TL_INSET, arm: 'south', boxes: L_PAIR },
  { id: 'west-right', lane: 'west', side: 'right', corner: 'sw', axis: 'ew', x: -(ROAD_HALF + TL_OUT),
    z: -(ROAD_HALF + TL_INSET), arm: 'north', boxes: [{ mount: 'upright', facing: 'side', along: 0.5 }] },
]

/**
 * dan 390×844 z prop maksimum 87 dan tidak ada satu pun piksel warna lampu yang
 * hilang di dalam kotak lampunya (lihat laporan tugas).
 */
export const LIGHT_Z = 140

/** Urutan lampu dari atas ke bawah dalam satu kotak. */
export const TRAFFIC_LAMPS: ReadonlyArray<'red' | 'yellow' | 'green'> = ['red', 'yellow', 'green']

/** Posisi vertikal pusat tiap lampu sebagai bagian tinggi kotak. */
const LAMP_Y = [0.19, 0.5, 0.81] as const

/** Satu titik di layar, dalam px. */
export type ScreenPt = readonly [number, number]

/** Atribut `points` untuk poligon SVG dari titik layar. */
export function screenPoints(points: ReadonlyArray<ScreenPt>): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

export type TrafficLightShapes = {
  id: string
  corner: TrafficCorner
  lane: TrafficLane
  side: TrafficSide
  arm: TrafficArm
  axis: TrafficAxis
  z: number
  /** Tiang tegak (kaki sampai puncak). */
  pole: ReadonlyArray<ScreenPt>
  /** Lengan mendatar dari puncak tiang ke ujungnya. */
  armPoly: ReadonlyArray<ScreenPt>
  boxes: ReadonlyArray<{
    mount: TrafficBoxMount
    facing: 'view' | 'side'
    box: { x: number; y: number; w: number; h: number; rx: number }
    lamps: ReadonlyArray<{
      lamp: 'red' | 'yellow' | 'green'
      cx: number
      cy: number
      rx: number
      ry: number
    }>
  }>
  shadow: { cx: number; cy: number; rx: number; ry: number }
}

export function trafficLightShapes(view: CrossView, unit: TrafficLightUnit): TrafficLightShapes {
  const s = view.sAtZ(unit.z)
  const baseX = view.xOf(unit.x, unit.z)
  const baseY = view.yOfZ(unit.z)
  const poleH = view.hOf(TRAFFIC_LIGHT.pole, unit.z)
  const topY = baseY - poleH
  const halfPole = (TRAFFIC_LIGHT.poleWidth * s) / 2

  const pole: ScreenPt[] = [
    [baseX - halfPole, baseY],
    [baseX + halfPole, baseY],
    [baseX + halfPole, topY],
    [baseX - halfPole, topY],
  ]

  const tipXm =
    unit.x +
    (unit.arm === 'east' ? TRAFFIC_LIGHT.arm : unit.arm === 'west' ? -TRAFFIC_LIGHT.arm : 0)
  const tipZm =
    unit.z +
    (unit.arm === 'north' ? TRAFFIC_LIGHT.arm : unit.arm === 'south' ? -TRAFFIC_LIGHT.arm : 0)
  const tipX = view.xOf(tipXm, tipZm)
  const tipY = view.yOfZ(tipZm) - view.hOf(TRAFFIC_LIGHT.pole, tipZm)

  const armW = view.hOf(TRAFFIC_LIGHT.armWidth, unit.z)
  const armPoly: ScreenPt[] = [
    [baseX, topY - armW / 2],
    [tipX, tipY - armW / 2],
    [tipX, tipY + armW / 2],
    [baseX, topY + armW / 2],
  ]

  const tipS = view.sAtZ(tipZm)
  const boxes = unit.boxes.map((b) => {
    // Kotak digantung sepanjang lengan; pangkal di puncak tiang, ujung di tip.
    const px = baseX + (tipX - baseX) * b.along
    const py = topY + (tipY - topY) * b.along
    const cross = b.mount === 'cross'
    // Ukuran kotak sama; `cross` menukar sumbu panjangnya ke mendatar.
    const bw = (cross ? TRAFFIC_LIGHT.boxHeight : TRAFFIC_LIGHT.boxWidth) * tipS
    const bh = view.hOf(cross ? TRAFFIC_LIGHT.boxWidth : TRAFFIC_LIGHT.boxHeight, tipZm)
    const boxTop = py + armW / 2
    const box = {
      x: px - bw / 2,
      y: boxTop,
      w: bw,
      h: bh,
      rx: TRAFFIC_LIGHT.boxRadius * tipS,
    }
    const lamps =
      b.facing === 'view'
        ? TRAFFIC_LAMPS.map((lamp, i) =>
            cross
              ? {
                  lamp,
                  cx: px - bw / 2 + bw * LAMP_Y[i],
                  cy: boxTop + bh / 2,
                  rx: (TRAFFIC_LIGHT.lamp / 2) * tipS,
                  ry: view.hOf(TRAFFIC_LIGHT.lamp / 2, tipZm),
                }
              : {
                  lamp,
                  cx: px,
                  cy: boxTop + bh * LAMP_Y[i],
                  rx: (TRAFFIC_LIGHT.lamp / 2) * tipS,
                  ry: view.hOf(TRAFFIC_LIGHT.lamp / 2, tipZm),
                },
          )
        : []
    return { mount: b.mount, facing: b.facing, box, lamps }
  })

  const shadowRx = view.wOf(TRAFFIC_LIGHT.shadow, unit.z) / 2

  return {
    id: unit.id,
    corner: unit.corner,
    lane: unit.lane,
    side: unit.side,
    arm: unit.arm,
    axis: unit.axis,
    z: LIGHT_Z,
    pole,
    armPoly,
    boxes,
    shadow: {
      cx: baseX,
      cy: baseY,
      rx: shadowRx,
      ry: shadowRx * TRAFFIC_LIGHT.shadowSquash,
    },
  }
}

