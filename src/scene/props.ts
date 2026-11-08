/**
 * Spawner scenery: jalan yang terus berjalan, bukan sabuk yang berulang.
 *
 * Dulu scenery adalah `LAYOUT` statis 10 penempatan yang di-`wrap` pada satu
 * siklus kedalaman, jadi tiap objek kembali dari horizon tiap 3,3 detik dan
 * satu leg 6 detik memperlihatkan pohon yang sama dua kali. Modul ini memakai
 * pola yang sudah terbukti di modul trafik: objek **lahir di horizon, mati di
 * tepi kamera**, dan hanya jenis + waktunya yang diundi.
 *
 * Murni dan deterministik: satu seed menghasilkan urutan yang sama, sehingga
 * tes bisa mensimulasikan 30 detik dan mengunci invariannya.
 *
 * Kenapa kedalaman spawn tetap (1,0) dan bukan diundi: objek harus selalu
 * masuk dari titik hilang. Kalau kedalaman spawn diundi, sebagian objek akan
 * muncul di tengah jalan — pop yang jauh lebih mengganggu daripada pengulangan.
 * Kerapatan visual yang menumpuk di dekat horizon itu memang perspektif, bukan
 * bug distribusi.
 */

import { METERS } from './meters'
import { createRng } from './spawner'

export type PropKind =
  | 'house'
  | 'shop'
  | 'tree'
  | 'lamp'
  | 'fence'
  | 'bin'
  | 'bench'
  | 'busstop'
  | 'powerpole'

/** Pita lateral tempat sebuah objek boleh berdiri. */
export type Band = 'garden' | 'gardenEdge' | 'kerb'

/**
 * Aturan per jenis: posisi lateral (meter dari garis kamera), pita, dan bobot
 * kemunculan. Bobot meniru ritme jalan sungguhan — pohon dan lampu sering,
 * halte dan ruko jarang — supaya hasilnya tidak terasa acak-acakan.
 */
export const PROP_RULES: Record<
  PropKind,
  {
    x: number
    band: Band
    weight: number
    /**
     * Kedalaman terdekat yang masih digambar. Dipakai sebagai batas umur:
     * objek dilepas di sini.
     *
     * Pita taman (0,14) jauh lebih dekat dari pita kerb, dan itu disengaja.
     * Objek taman berdiri di x −2,6 … −5,0, jadi pada kedalaman 0,14 seluruh
     * kotaknya sudah keluar frame kiri: ia **lepas lewat tepi**, bukan lenyap
     * di tengah layar. Sebelumnya batas 0,28–0,42 membunuh mereka saat masih
     * 30–60 px di dalam frame — itulah "despawn terlalu cepat".
     *
     * Objek kerb (x −0,1 … +0,25) tidak pernah keluar frame: makin dekat,
     * makin besar, tetap di layar. Mereka tetap butuh fade dekat, dan batas
     * lamanya menjaga furniture tidak membesar sampai menutupi trotoar.
     */
    nearest: number
  }
> = {
  tree: { x: -2.8, band: 'garden', weight: 24, nearest: 0.14 },
  lamp: { x: 0.25, band: 'kerb', weight: 16, nearest: 0.3 },
  fence: { x: -3.5, band: 'garden', weight: 12, nearest: 0.14 },
  bin: { x: -1.85, band: 'gardenEdge', weight: 12, nearest: 0.16 },
  bench: { x: -2.6, band: 'garden', weight: 10, nearest: 0.14 },
  shop: { x: -4.2, band: 'garden', weight: 9, nearest: 0.14 },
  house: { x: -5.0, band: 'garden', weight: 10, nearest: 0.14 },
  powerpole: { x: -2.9, band: 'garden', weight: 6, nearest: 0.14 },
  busstop: { x: -0.1, band: 'kerb', weight: 7, nearest: 0.38 },
}

/**
 * Panjang fade keluar di ujung dekat, dalam satuan kedalaman. Objek memudar
 * dari `nearest + PROP_NEAR_FADE` ke `nearest`, jadi tidak ada yang hilang
 * mendadak di depan kamera. 0,06 ≈ 0,2 detik berjalan pada kecepatan 0,30.
 */
export const PROP_NEAR_FADE = 0.06

/** Kedalaman terdekat sebuah jenis. */
export function propNearest(kind: PropKind): number {
  return PROP_RULES[kind].nearest
}

/**
 * Opasitas tambahan karena objek mendekati kamera: 1 jauh, 0 di `nearest`.
 * Dipakai bersama `fadeAt`/`nearFadeAt` supaya objek tidak pernah tampil
 * sebesar rumah lalu lenyap.
 */
export function propNearFade(kind: PropKind, depth: number): number {
  const nearest = PROP_RULES[kind].nearest
  if (depth >= nearest + PROP_NEAR_FADE) return 1
  if (depth <= nearest) return 0
  return (depth - nearest) / PROP_NEAR_FADE
}

export const PROP_KINDS = Object.keys(PROP_RULES) as PropKind[]

/**
 * Kedalaman tempat objek lahir: tepat di garis horizon. `fadeAt` baru mencapai
 * 0 di 0,92, jadi objek lahir dalam keadaan tak terlihat dan masuk lewat
 * kabut — tidak mungkin muncul di tengah layar.
 */
export const PROP_SPAWN_D = 1

/**
 * Jeda antar spawn, dalam detik berjalan. 0,30–0,55 dengan umur objek ~2,9 s
 * berarti sekitar 7 objek hidup serentak; jeda lama (0,55–1,1) hanya
 * menyisakan 2–3 dan jalan terasa kosong.
 */
export const PROP_WAIT = { min: 0.3, max: 0.55 } as const

/**
 * Jarak kedalaman minimum antara dua objek di pita yang sama, 0,07 ≈ 0,23 s.
 * Pita taman menampung 67 % undian, jadi jarak lama 0,12 (0,4 s) menolak
 * separuh spawn dan itulah sebab lain jalan terasa sepi.
 */
export const PROP_MIN_GAP = 0.07

/** Slot pool. `null` = tidak ada objek di slot itu. */
export type PropSlot = { kind: PropKind; x: number; depth: number } | null

export type PropPool = {
  slots: PropSlot[]
  rng: () => number
  /** Detik sejak spawn terakhir. */
  since: number
  /** Jeda yang sedang ditunggu untuk spawn berikutnya. */
  wait: number
  /** Berapa objek sudah lahir (untuk debugging dan tes). */
  spawned: number
}

/**
 * Pool dibatasi karena tiap slot adalah satu node SVG yang sudah terpasang.
 * 10 slot menampung ~7 objek hidup; anggaran node scene jadi 28 dari plafon 30
 * (10 prop + 8 marka + hero + rambu + ghost rambu + 5 kendaraan + 3 pejalan).
 */
export const PROP_POOL_SIZE = 10

/** Total bobot, dihitung sekali. */
const TOTAL_WEIGHT = PROP_KINDS.reduce((sum, kind) => sum + PROP_RULES[kind].weight, 0)

/** Satu jenis, diundi menurut bobotnya. */
export function pickPropKind(rng: () => number): PropKind {
  let roll = rng() * TOTAL_WEIGHT
  for (const kind of PROP_KINDS) {
    roll -= PROP_RULES[kind].weight
    if (roll < 0) return kind
  }
  return PROP_KINDS[PROP_KINDS.length - 1]
}

/** Satu jenis dari pita tertentu, diundi menurut bobot di dalam pita itu. */
export function pickPropKindOfBand(rng: () => number, band: Band): PropKind {
  const kinds = PROP_KINDS.filter((kind) => PROP_RULES[kind].band === band)
  const total = kinds.reduce((sum, kind) => sum + PROP_RULES[kind].weight, 0)
  let roll = rng() * total
  for (const kind of kinds) {
    roll -= PROP_RULES[kind].weight
    if (roll < 0) return kind
  }
  return kinds[kinds.length - 1]
}

/**
 * Kedalaman yang sudah terisi saat adegan pertama tampil, plus pitanya.
 *
 * Pita dirotasi, bukan diundi: frame pertama harus memperlihatkan ketiga pita
 * sekaligus, dan undian bebas akan sering memberi tiga pohon berturut-turut
 * (keluhan "scene awal terasa kurang", PRD B5).
 */
const PREWARM: ReadonlyArray<{ depth: number; band: Band }> = [
  { depth: 0.98, band: 'kerb' },
  { depth: 0.86, band: 'garden' },
  { depth: 0.74, band: 'gardenEdge' },
  { depth: 0.62, band: 'kerb' },
  { depth: 0.5, band: 'garden' },
  { depth: 0.38, band: 'garden' },
]

export function createPropPool(seed: number): PropPool {
  const rng = createRng(seed)
  const pool: PropPool = {
    slots: Array.from({ length: PROP_POOL_SIZE }, () => null),
    rng,
    since: 0,
    wait: PROP_WAIT.min,
    spawned: 0,
  }

  // Jalan tidak boleh kosong pada detik pertama. Enam potong scenery ditanam
  // di kedalaman yang tersebar — lima di antaranya sudah terlihat — dengan
  // aturan jarak yang sama seperti spawn biasa.
  PREWARM.forEach(({ depth, band }, index) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const kind = pickPropKindOfBand(rng, band)
      if (!fitsPropGap(pool, band, depth)) continue
      pool.slots[index] = { kind, x: PROP_RULES[kind].x, depth }
      pool.spawned += 1
      break
    }
  })

  return pool
}

/**
 * Jenis per slot, untuk React. Satu sumber untuk keadaan awal **dan** untuk
 * penyegaran setelah spawn: kalau keadaan awal tidak di-seed dari sini, slot
 * prewarm tampil sebagai `<div>` kosong selama ~1 detik pertama.
 */
export function propKindsOf(pool: PropPool): Array<PropKind | null> {
  return pool.slots.map((slot) => (slot ? slot.kind : null))
}

/** Apakah ada slot kosong. */
function freeSlot(pool: PropPool): number {
  return pool.slots.indexOf(null)
}

/**
 * Apakah sebuah objek baru di `depth` masih terlalu rapat dengan objek lain di
 * pitanya. Objek yang sedang di luar layar (sudah sangat jauh) tidak dihitung.
 */
export function fitsPropGap(
  pool: PropPool,
  band: Band,
  depth: number,
  minGap = PROP_MIN_GAP,
): boolean {
  for (const slot of pool.slots) {
    if (!slot) continue
    if (PROP_RULES[slot.kind].band !== band) continue
    if (Math.abs(slot.depth - depth) < minGap) return false
  }
  return true
}

/**
 * Majukan pool selama `dt` detik berjalan. `scrollDelta` adalah perubahan
 * kedalaman yang sudah dihitung reducer (`SCROLL_PER_SEC * dt`), jadi scenery
 * bergerak bersama dunia dan berhenti saat dunia berhenti.
 *
 * Mengembalikan `true` kalau ada objek baru, sehingga pemanggil tahu kapan
 * harus menyegarkan React (satu render per spawn, bukan per frame).
 */
export function stepPropPool(pool: PropPool, dt: number, scrollDelta: number): boolean {
  for (let i = 0; i < pool.slots.length; i += 1) {
    const slot = pool.slots[i]
    if (!slot) continue
    // Mendekat ke kamera: kedalaman turun, sama seperti sabuk dulu
    // (`base - scroll`), hanya saja sekarang objek lahir di ujung jauh.
    const depth = slot.depth - scrollDelta
    pool.slots[i] = depth <= propNearest(slot.kind) ? null : { ...slot, depth }
  }

  if (pool.wait <= 0) pool.wait = PROP_WAIT.min + pool.rng() * (PROP_WAIT.max - PROP_WAIT.min)
  pool.since += dt
  if (pool.since < pool.wait) return false
  if (freeSlot(pool) < 0) return false

  // Coba beberapa kali: jenis yang lahir mungkin bertabrakan jarak dengan
  // objek sepitanya, dan itu bukan alasan menunda seluruh jalan. Delapan
  // percobaan karena pita taman menampung 67 % undian; dengan empat, satu
  // pita yang penuh membuang seluruh siklus dan jalan kembali sepi.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const kind = pickPropKind(pool.rng)
    const rule = PROP_RULES[kind]
    if (!fitsPropGap(pool, rule.band, PROP_SPAWN_D)) continue
    const slot = freeSlot(pool)
    pool.slots[slot] = { kind, x: rule.x, depth: PROP_SPAWN_D }
    pool.spawned += 1
    pool.since = 0
    pool.wait = PROP_WAIT.min + pool.rng() * (PROP_WAIT.max - PROP_WAIT.min)
    return true
  }

  return false
}

/** Kebenaran cepat untuk tes: apakah dua pita lateral tidak mungkin bertabrakan. */
export function propWidthM(kind: PropKind, ratio: number): number {
  const height: Record<PropKind, number> = {
    house: METERS.house,
    shop: METERS.shop,
    tree: METERS.tree,
    lamp: METERS.lamp,
    fence: METERS.fence,
    bin: METERS.bin,
    bench: METERS.bench,
    busstop: METERS.busStop,
    powerpole: METERS.powerPole,
  }
  return height[kind] * ratio
}
