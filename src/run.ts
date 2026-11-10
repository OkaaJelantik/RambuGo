/**
 * Satu "perjalanan" (run): antrean rambu yang diacak dari seed.
 *
 * Dulu urutan rambu mati (tiga rambu pertama), jadi setiap anak melihat
 * kuning → putih → biru, dan menghafal urutan alih-alih rambunya. Modul
 * ini menjadikan urutan itu teracak tapi **dapat diulang**: seed yang sama
 * menghasilkan antrean yang sama, sehingga demo dan tes tetap deterministik.
 *
 * Murni: tidak ada React, tidak ada DOM, tidak ada jam.
 */

import { STREET_SIGNS, type Sign } from './data'
import { createRng } from './scene/spawner'

/** Berapa rambu per perjalanan kaki sebelum sampai persimpangan. */
export const BATCH_SIZE = 3

export type Run = {
  seed: number
  /** Seluruh rambu, sudah diacak; di-reshuffle saat habis. */
  order: Sign[]
  /** Posisi batch sekarang di dalam `order`. */
  cursor: number
}

/** Fisher–Yates dengan RNG mulberry32 milik scene, supaya satu PRNG saja. */
function shuffle(rng: () => number, signs: Sign[]): Sign[] {
  const out = signs.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Antrean baru. `avoidId` dikeluarkan dari posisi pertama supaya rambu terakhir
 * perjalanan sebelumnya tidak muncul lagi dua kali beruntun — anak menyadari
 * pengulangan langsung seperti itu.
 */
export function shuffleSigns(seed: number, avoidId?: string): Sign[] {
  const rng = createRng(seed)
  const order = shuffle(rng, STREET_SIGNS)
  if (avoidId && order[0]?.id === avoidId && order.length > 1) {
    const swap = 1 + Math.floor(rng() * (order.length - 1))
    ;[order[0], order[swap]] = [order[swap], order[0]]
  }
  return order
}

/** Perjalanan baru dari sebuah seed. */
export function createRun(seed: number): Run {
  return { seed, order: shuffleSigns(seed), cursor: 0 }
}

/** Rambu untuk perjalanan kaki sekarang. */
export function batchOf(run: Run): Sign[] {
  return run.order.slice(run.cursor, run.cursor + BATCH_SIZE)
}

/** Rambu terakhir yang sudah dilihat di perjalanan ini (untuk `avoidId`). */
function lastSeen(run: Run): string | undefined {
  return run.order[run.cursor + BATCH_SIZE - 1]?.id
}

/**
 * Perjalanan berikutnya setelah "lurus": maju satu batch, dan kalau sisa
 * antrean tidak cukup untuk satu batch penuh, acak ulang dengan seed baru
 * sambil menghindari rambu yang barusan dilihat.
 */
export function advanceRun(run: Run): Run {
  const nextCursor = run.cursor + BATCH_SIZE
  if (nextCursor + BATCH_SIZE <= run.order.length) {
    return { ...run, cursor: nextCursor }
  }
  const seed = run.seed + 1
  return { seed, order: shuffleSigns(seed, lastSeen(run)), cursor: 0 }
}

/**
 * Seed awal. DEV: `?seed=` (atau `window.__WALK_SEED__`, dipakai tes) supaya
 * run aneh bisa diulang; produksi: jam, jadi setiap anak dapat urutan baru.
 */
export function initialSeed(): number {
  if (typeof window !== 'undefined') {
    const forced = Number((window as unknown as { __WALK_SEED__?: number }).__WALK_SEED__)
    if (Number.isFinite(forced) && forced > 0) return forced
    const param = Number(new URLSearchParams(window.location.search).get('seed'))
    if (Number.isFinite(param) && param > 0) return param
  }
  return Date.now()
}
