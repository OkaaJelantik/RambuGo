/**
 * Peta hash ↔ posisi: satu-satunya tempat yang tahu berapa langkah sah tiap
 * stage dan bagaimana posisi itu ditulis ke URL.
 *
 * Murni — tanpa React, tanpa DOM, tanpa sumber acak — supaya tombol back
 * browser dan refresh bisa diuji tanpa merender apa pun. Fase wiring di
 * `App.tsx` nanti cukup memanggil `parseHash`/`formatHash`.
 *
 * Bentuk kanonik (tanpa query):
 * `#/<stage>` untuk stage tanpa langkah, `#/<stage>/<pos>` untuk
 * `walk` (0..2), `kuis` (0..4), dan `studi` (0..14).
 */

export type Stage =
  | 'intro'
  | 'walk'
  | 'crossroad'
  | 'materi'
  | 'kuis'
  | 'sortir'
  | 'studi'
  | 'home'

export type Route = { stage: Stage; pos: number }

/**
 * Batas atas `pos` tiap stage. Stage yang nilainya 0 tidak punya langkah,
 * jadi posisinya tidak pernah ditulis ke hash.
 */
const LIMITS: Record<Stage, number> = {
  intro: 0,
  walk: 2,
  crossroad: 0,
  materi: 0,
  kuis: 4,
  sortir: 0,
  studi: 14,
  home: 0,
}

/** Jumlah langkah sah untuk sebuah stage (pos 0..limit). */
export function stageLimit(stage: Stage): number {
  return LIMITS[stage]
}

/** Nama segmen pertama yang dikenal sebagai stage. */
function isStage(value: string): value is Stage {
  return Object.hasOwn(LIMITS, value)
}

/**
 * Posisi dinormalkan ke integer di dalam `0..stageLimit(stage)`. Angka yang
 * tidak masuk akal (negatif, pecahan, terlalu besar) tidak pernah bocor ke
 * state: anak yang mengubah URL sendiri tetap mendarat di langkah yang ada.
 */
function clampPos(pos: number, stage: Stage): number {
  if (!Number.isFinite(pos) || pos <= 0) return 0
  return Math.min(Math.trunc(pos), stageLimit(stage))
}

/**
 * Baca hash apa pun menjadi rute yang sah. Toleran terhadap bentuk yang
 * ditulis manusia maupun `location.hash`:
 *
 * - `'#/kuis/3'`, `'/kuis/3'`, `'kuis/3'` → `{ stage: 'kuis', pos: 3 }`
 * - `''`, `'#'`, `'#/'`, atau stage asing → `{ stage: 'intro', pos: 0 }`
 * - `pos` hilang / bukan angka / negatif → 0
 * - `pos` melewati batas → di-clamp ke batas stage itu
 *
 * Segmen sesudah `pos` diabaikan; format kanonik tidak pernah menulisnya.
 */
export function parseHash(hash: string): Route {
  // Buang '#' pembuka (kalau ada) dan garis miring pembuka, lalu pecah.
  const path = hash.trim().replace(/^#/, '').replace(/^\/+/, '')
  const [rawStage = '', rawPos = ''] = path.split('/')

  // Stage asing berarti hash tidak dikenal: kembali ke awal, bukan menebak.
  if (!isStage(rawStage)) return { stage: 'intro', pos: 0 }

  // Hanya digit yang diterima; '2.5', '-3', 'abc' semuanya berarti 0.
  const pos = /^\d+$/.test(rawPos) ? clampPos(Number(rawPos), rawStage) : 0
  return { stage: rawStage, pos }
}

/**
 * Tulis rute sebagai hash kanonik. Stage tanpa langkah tidak menulis `/0`.
 * `pos` di luar batas ditulis sebagai batasnya, jadi hasilnya selalu bisa
 * dibaca balik oleh `parseHash` dan selalu sama dengan rute sah terdekat.
 */
export function formatHash(route: Route): string {
  if (stageLimit(route.stage) === 0) return `#/${route.stage}`
  return `#/${route.stage}/${clampPos(route.pos, route.stage)}`
}
