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
 * Kenapa kedalaman spawn tetap (0,95) dan bukan diundi: objek harus selalu
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
     * Kedalaman terdekat yang masih digambar. Objek yang lebih dekat dari ini
     * sudah memudar habis dan dilepas: kursi 0,85 m pada kedalaman 0,10
     * delapan kali lebih besar daripada saat ia berdiri di trotoar, dan itulah
     * yang membuat furniture terasa "kegedean" lalu menutupi trotoar.
     */
    nearest: number
  }
> = {
  tree: { x: -2.8, band: 'garden', weight: 24, nearest: 0.34 },
  lamp: { x: 0.25, band: 'kerb', weight: 16, nearest: 0.3 },
  fence: { x: -3.5, band: 'garden', weight: 12, nearest: 0.32 },
  bin: { x: -1.85, band: 'gardenEdge', weight: 12, nearest: 0.26 },
  bench: { x: -2.6, band: 'garden', weight: 10, nearest: 0.28 },
  shop: { x: -4.2, band: 'garden', weight: 9, nearest: 0.4 },
  house: { x: -5.0, band: 'garden', weight: 10, nearest: 0.42 },
  powerpole: { x: -2.9, band: 'garden', weight: 6, nearest: 0.36 },
  busstop: { x: -0.1, band: 'kerb', weight: 7, nearest: 0.38 },
}

/**
 * Panjang fade keluar di ujung dekat, dalam satuan kedalaman. Objek memudar
 * dari `nearest + PROP_NEAR_FADE` ke `nearest`, jadi tidak ada yang hilang
 * mendadak di depan kamera.
 */
export const PROP_NEAR_FADE = 0.08

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

/** Kedalaman tempat objek lahir: di luar fadeAt, jadi opasitasnya 0. */
export const PROP_SPAWN_D = 0.95
/**
 * Kedalaman tempat objek dilepas. `nearFadeAt` baru mencapai 0 di 0,06, jadi
 * objek harus hidup sampai sana — melepasnya di 0,10 (opasitas 0,4) akan
 * membuatnya hilang mendadak di depan kamera.
 */
export const PROP_END_D = 0.06

/** Jeda antar spawn, dalam detik berjalan. */
export const PROP_WAIT = { min: 0.55, max: 1.1 } as const

/**
 * Jarak kedalaman minimum antara dua objek di pita yang sama. 0,12 kedalaman
 * ≈ 0,4 detik berjalan: cukup supaya dua sprite tidak saling menempel, tanpa
 * membuat jalan terasa kosong.
 */
export const PROP_MIN_GAP = 0.12

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

/** Pool dibatasi karena tiap slot adalah satu node SVG yang sudah terpasang. */
export const PROP_POOL_SIZE = 8

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

/** Kedalaman awal yang sudah terisi saat adegan pertama tampil. */
const PREWARM_DEPTHS = [0.86, 0.72, 0.58, 0.44] as const

export function createPropPool(seed: number): PropPool {
  const rng = createRng(seed)
  const pool: PropPool = {
    slots: Array.from({ length: PROP_POOL_SIZE }, () => null),
    rng,
    since: 0,
    wait: PROP_WAIT.min,
    spawned: 0,
  }

  // Jalan tidak boleh kosong pada detik pertama. Empat potong scenery
  // ditanam di kedalaman yang tersebar, dengan aturan jarak yang sama seperti
  // spawn biasa, jadi adegan pembuka langsung terasa seperti jalan.
  PREWARM_DEPTHS.forEach((depth, index) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const kind = pickPropKind(rng)
      const rule = PROP_RULES[kind]
      if (!fitsPropGap(pool, rule.band, depth)) continue
      pool.slots[index] = { kind, x: rule.x, depth }
      pool.spawned += 1
      break
    }
  })

  return pool
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
  // objek sepitanya, dan itu bukan alasan menunda seluruh jalan.
  for (let attempt = 0; attempt < 4; attempt += 1) {
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
