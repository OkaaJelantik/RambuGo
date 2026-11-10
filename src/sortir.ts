/**
 * Logika murni untuk permainan "Kelompokkan rambu": urutan kartu, hit-test
 * kotak, dan aturan bintang. Tidak ada React, tidak ada DOM — semua
 * perilaku di sini bisa diuji tanpa merender apa pun.
 *
 * Determinisme dipegang `mulberry32` milik scene (`createRng`), jadi seed yang
 * sama selalu memberi urutan kartu yang sama; tidak ada `Math.random`.
 */

import { SIGNS, type Kind, type Sign } from './data'
import { createRng } from './scene/spawner'

/**
 * Urutan kotak di layar, dari kiri ke kanan. Larangan dulu karena ia jenis
 * yang paling sering ditemui anak saat berjalan; petunjuk terakhir karena
 * bentuknya (papan hijau) paling berbeda.
 */
export const KIND_ORDER: readonly Kind[] = ['larangan', 'peringatan', 'perintah', 'petunjuk']

/**
 * Kalimat peran tiap jenis, dicetak di kotak kayu sebagai ganti deskripsi
 * bentuk. Tempat di kafe tidak mengajari jenis rambu, jadi kategori tetap
 * dipegang label kotak; bentuk aslinya tetap diajarkan lewat umpan balik
 * salah-taruh dan ringkasan, bukan dicetak di tempat menjawab.
 */
export const KIND_ROLE: Record<Kind, string> = {
  larangan: 'Aku jaga pintu.',
  peringatan: 'Aku di depan tikungan.',
  perintah: 'Aku atur jalannya.',
  petunjuk: 'Bisa bantu kita nemuin sesuatu.',
}

/**
 * Dua belas kartu diacak Fisher–Yates dari seed. `SIGNS` tidak diubah: salinan
 * baru keluar setiap panggilan, jadi tidak ada urutan global yang bisa bocor
 * antar-permainan.
 */
export function sortirCards(seed: number): Sign[] {
  const rng = createRng(seed)
  const cards = SIGNS.slice()
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

/** Kotak layar (px, viewport) satu keranjang. */
export type Box = { left: number; top: number; right: number; bottom: number }

/**
 * Jenis keranjang di bawah satu titik, atau `null` kalau titik itu di luar
 * semua keranjang.
 *
 * Murni dan tanpa DOM supaya hit-test bisa diuji langsung, dan supaya
 * `pointerup` cukup meneruskan `clientX/clientY` + kotak yang dikumpulkan saat
 * `pointerdown`. Batas termasuk di dalam: titik tepat di tepi keranjang tetap
 * dihitung masuk — jari anak sering mendarat persis di garis.
 */
export function binAt(
  x: number,
  y: number,
  rects: ReadonlyArray<{ kind: Kind; box: Box }>,
): Kind | null {
  for (const rect of rects) {
    const { box } = rect
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return rect.kind
  }
  return null
}

/**
 * Bintang dari rasio benar. Ambang yang sama dipakai kuis 5 soal dan sortir
 * 12 kartu: 0,8 ke atas = 3 bintang (4/5 dan 10/12), 0,4 ke atas = 2 bintang
 * (2–3/5 dan 5–9/12), sisanya 1 bintang. Anak tidak pernah gagal.
 */
export function starsFor(correct: number, total: number): 1 | 2 | 3 {
  const ratio = total > 0 ? correct / total : 0
  if (ratio >= 0.8) return 3
  if (ratio >= 0.4) return 2
  return 1
}
