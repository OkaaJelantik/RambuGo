/**
 * Jawaban per jalur yang tahan refresh.
 *
 * Disimpan di `sessionStorage` — bukan `localStorage` — supaya tab baru mulai
 * bersih (anak tidak mewarisi skor sesi lain), sementara refresh dan tombol
 * back tetap melanjutkan di tempat yang sama. Setiap panggilan dibaca ulang
 * dari storage, jadi tidak ada state global yang bisa basi.
 *
 * Tiap jalur selalu berupa array berpanjang tetap; `null` berarti belum
 * dijawab. Jawaban sesudah titik yang dijawab ulang dibuang supaya langkah
 * yang sama tidak dihitung dua kali saat anak menekan back.
 *
 * Murni: tanpa React dan tanpa DOM selain `sessionStorage`. Semua akses
 * storage dibungkus guard supaya lingkungan tanpa storage (atau storage
 * rusak/diblokir) tidak melempar.
 */

export type Jalur = 'kuis' | 'studi' | 'sortir'

/** Satu jawaban; `null` = belum dijawab. */
type Answer = boolean | null

/** Panjang tetap array per jalur: kuis 5 soal, studi 15 keputusan, sortir 12 kartu. */
const SIZES: Record<Jalur, number> = {
  kuis: 5,
  studi: 15,
  sortir: 12,
}

const PREFIX = 'ina:progress:'

function keyOf(jalur: Jalur): string {
  return `${PREFIX}${jalur}`
}

/**
 * `sessionStorage` kalau ada dan bisa diakses, `null` kalau tidak. Getter
 * `sessionStorage` sendiri bisa melempar (cookie/storage diblokir), jadi
 * pemeriksaannya ada di dalam `try`.
 */
function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/** Jawaban kosong berpanjang benar untuk sebuah jalur. */
function empty(size: number): Answer[] {
  return Array.from({ length: size }, () => null)
}

/**
 * Baca satu jalur dari storage. Data yang bukan array JSON, panjangnya salah,
 * atau berisi selain boolean/null dianggap kosong — lebih baik anak mulai
 * bersih daripada melihat skor karangan.
 */
function read(jalur: Jalur): Answer[] {
  const size = SIZES[jalur]
  const store = storage()
  if (!store) return empty(size)

  let raw: string | null
  try {
    raw = store.getItem(keyOf(jalur))
  } catch {
    return empty(size)
  }
  if (raw === null) return empty(size)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return empty(size)
  }

  if (!Array.isArray(parsed) || parsed.length !== size) return empty(size)

  const entries: unknown[] = parsed
  const out: Answer[] = []
  for (const entry of entries) {
    if (entry !== null && typeof entry !== 'boolean') return empty(size)
    out.push(entry)
  }
  return out
}

/** Tulis satu jalur; gagal menyimpan (penuh/diblokir) bukan alasan melempar. */
function write(jalur: Jalur, answers: Answer[]): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(keyOf(jalur), JSON.stringify(answers))
  } catch {
    // Storage penuh atau ditolak browser: skor hilang, layar tetap jalan.
  }
}

/** Jawaban satu jalur; array baru berpanjang 5/15/12 dengan `null` = belum dijawab. */
export function loadAnswers(jalur: Jalur): Answer[] {
  return read(jalur)
}

/**
 * Simpan jawaban `index` lalu buang semua jawaban sesudahnya. `index` di luar
 * batas tidak menyimpan apa pun dan mengembalikan keadaan sekarang.
 */
export function saveAnswer(jalur: Jalur, index: number, correct: boolean): Answer[] {
  const answers = read(jalur)
  if (!Number.isInteger(index) || index < 0 || index >= SIZES[jalur]) return answers

  answers[index] = correct
  // Anak menekan back lalu menjawab ulang: ekor lama tidak boleh ikut terhitung.
  for (let i = index + 1; i < answers.length; i += 1) answers[i] = null

  write(jalur, answers)
  return answers
}

/** Jumlah jawaban benar di satu jalur (termasuk sortir). */
export function scoreOf(jalur: Jalur): number {
  return read(jalur).filter((answer) => answer === true).length
}

/** Kosongkan satu jalur; jalur lain tidak tersentuh. */
export function clearJalur(jalur: Jalur): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(keyOf(jalur))
  } catch {
    // Tidak ada yang bisa dilakukan; pemanggilan berikutnya membaca kosong.
  }
}
