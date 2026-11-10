/**
 * Tes murni jawaban per jalur: panjang tetap, pemotongan ekor, skor, data
 * rusak, dan lingkungan tanpa `sessionStorage`. Tanpa render React.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearJalur,
  clearLastJalur,
  clearLastScore,
  loadAnswers,
  loadLastJalur,
  loadLastScore,
  saveAnswer,
  saveLastJalur,
  saveLastScore,
  scoreOf,
  type Jalur,
} from './progress'

/** Panjang tetap tiap jalur, ditulis sebagai angka harfiah (bukan salinan tabel). */
const JALURS: Jalur[] = ['kuis', 'studi', 'sortir']

const EMPTY: Record<Jalur, Array<boolean | null>> = {
  kuis: [null, null, null, null, null],
  studi: Array<boolean | null>(15).fill(null),
  sortir: Array<boolean | null>(12).fill(null),
}

/**
 * Kunci storage yang dipakai modul untuk sebuah jalur. Modul tidak
 * mengekspor kuncinya, jadi kunci ditemukan lewat jalur produksi: kosongkan
 * storage, simpan satu jawaban, lalu ambil satu-satunya kunci yang ada.
 */
function storedKey(jalur: Jalur): string {
  sessionStorage.clear()
  saveAnswer(jalur, 0, true)
  const key = sessionStorage.key(0)
  if (key === null) throw new Error(`tidak ada kunci storage untuk ${jalur}`)
  return key
}

/** Ganti isi storage jalur dengan teks mentah, mensimulasikan data rusak. */
function corrupt(jalur: Jalur, raw: string): void {
  sessionStorage.setItem(storedKey(jalur), raw)
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
})

describe('loadAnswers', () => {
  it('default kosong dengan panjang tetap: kuis 5, studi 15, sortir 12', () => {
    for (const jalur of JALURS) {
      expect(loadAnswers(jalur)).toEqual(EMPTY[jalur])
    }
  })

  it('array baru setiap panggilan, bukan referensi bersama', () => {
    const first = loadAnswers('kuis')
    const second = loadAnswers('kuis')
    expect(second).not.toBe(first)
    expect(second).toEqual(first)
  })

  it('jawaban yang tersimpan terbaca ulang apa adanya (refresh)', () => {
    saveAnswer('studi', 0, true)
    saveAnswer('studi', 1, false)
    saveAnswer('studi', 2, true)
    expect(loadAnswers('studi').slice(0, 3)).toEqual([true, false, true])
  })
})

describe('saveAnswer', () => {
  it('mengisi index dan membuang seluruh jawaban sesudahnya', () => {
    saveAnswer('kuis', 0, true)
    saveAnswer('kuis', 1, false)
    saveAnswer('kuis', 2, true)
    expect(loadAnswers('kuis')).toEqual([true, false, true, null, null])

    // Anak menekan back ke soal ke-2 lalu menjawab ulang: soal ke-3 dibuang.
    const afterBack = saveAnswer('kuis', 1, true)
    expect(afterBack).toEqual([true, true, null, null, null])
    expect(loadAnswers('kuis')).toEqual([true, true, null, null, null])
  })

  it('mengisi index tanpa menghapus jawaban sebelumnya', () => {
    saveAnswer('studi', 0, true)
    saveAnswer('studi', 1, true)
    saveAnswer('studi', 2, false)
    expect(loadAnswers('studi').slice(0, 4)).toEqual([true, true, false, null])
  })

  it('index di luar batas tidak menyimpan dan mengembalikan keadaan sekarang', () => {
    saveAnswer('kuis', 0, true)
    for (const index of [-1, 5, 99, 1.5, Number.NaN]) {
      expect(saveAnswer('kuis', index, false)).toEqual([true, null, null, null, null])
    }
    expect(loadAnswers('kuis')).toEqual([true, null, null, null, null])
    expect(scoreOf('kuis')).toBe(1)
  })

  it('mengembalikan array baru dan tidak mengubah array hasil baca sebelumnya', () => {
    const before = loadAnswers('sortir')
    const saved = saveAnswer('sortir', 0, true)
    expect(saved).not.toBe(before)
    expect(before).toEqual(EMPTY.sortir)
    expect(saved[0]).toBe(true)
  })
})

describe('scoreOf', () => {
  it('menghitung jumlah true, termasuk jalur sortir', () => {
    saveAnswer('sortir', 0, true)
    saveAnswer('sortir', 1, false)
    saveAnswer('sortir', 2, true)
    saveAnswer('sortir', 3, true)
    expect(scoreOf('sortir')).toBe(3)

    saveAnswer('kuis', 0, true)
    saveAnswer('kuis', 1, true)
    expect(scoreOf('kuis')).toBe(2)
    expect(scoreOf('studi')).toBe(0)
  })

  it('tidak menghitung dua kali setelah kembali dan menjawab ulang', () => {
    saveAnswer('kuis', 0, true)
    saveAnswer('kuis', 1, true)
    expect(scoreOf('kuis')).toBe(2)

    // Jawaban lama soal ke-2 diganti salah; skor ikut turun satu.
    saveAnswer('kuis', 1, false)
    expect(scoreOf('kuis')).toBe(1)
    expect(loadAnswers('kuis')).toEqual([true, false, null, null, null])
  })
})

describe('data rusak di storage', () => {
  it('bukan JSON, bukan array, panjang salah, atau nilai asing dianggap kosong', () => {
    const rusak = [
      'bukan json',
      '{}',
      '"hai"',
      'null',
      '[]',
      '[true, false, true, false]', // terlalu pendek
      '[true, null, null, null, null, null]', // terlalu panjang
      '[1, 0, 0, 0, 0]', // angka, bukan boolean
      '[true, "ya", null, null, null]',
      '[true, {}, null, null, null]',
    ]

    for (const raw of rusak) {
      corrupt('kuis', raw)
      expect(loadAnswers('kuis')).toEqual(EMPTY.kuis)
      expect(scoreOf('kuis')).toBe(0)
    }
  })
})

describe('clearJalur', () => {
  it('mengosongkan jalur itu saja', () => {
    saveAnswer('kuis', 0, true)
    saveAnswer('kuis', 1, true)
    saveAnswer('sortir', 0, true)

    clearJalur('kuis')

    expect(loadAnswers('kuis')).toEqual(EMPTY.kuis)
    expect(scoreOf('kuis')).toBe(0)
    expect(loadAnswers('sortir')[0]).toBe(true)
    expect(scoreOf('sortir')).toBe(1)
  })

  it('aman dipanggil pada jalur yang belum pernah diisi', () => {
    expect(() => clearJalur('studi')).not.toThrow()
    expect(loadAnswers('studi')).toEqual(EMPTY.studi)
  })
})

describe('pilihan storage', () => {
  it('memakai sessionStorage, bukan localStorage (tab baru mulai bersih)', () => {
    saveAnswer('kuis', 0, true)
    expect(sessionStorage.length).toBe(1)
    expect(localStorage.length).toBe(0)
  })

  it('tanpa sessionStorage tidak melempar dan tetap berpanjang benar', () => {
    vi.stubGlobal('sessionStorage', undefined)

    expect(() => loadAnswers('kuis')).not.toThrow()
    expect(loadAnswers('kuis')).toEqual(EMPTY.kuis)
    expect(saveAnswer('kuis', 0, true)).toEqual([true, null, null, null, null])
    expect(scoreOf('kuis')).toBe(0)
    expect(() => clearJalur('kuis')).not.toThrow()
  })
})

describe('jalur terakhir (skor rumah tahan refresh)', () => {
  /**
   * Kunci storage penanda jalur terakhir. Modul tidak mengekspor kuncinya,
   * jadi ditemukan lewat jalur produksi: kosongkan storage, simpan penanda,
   * lalu ambil satu-satunya kunci yang ada.
   */
  function lastJalurKey(): string {
    sessionStorage.clear()
    saveLastJalur('kuis')
    const key = sessionStorage.key(0)
    if (key === null) throw new Error('tidak ada kunci last-jalur')
    return key
  }

  it('roundtrip: jalur apa pun yang disimpan terbaca lagi', () => {
    for (const jalur of JALURS) {
      saveLastJalur(jalur)
      expect(loadLastJalur()).toBe(jalur)
    }
  })

  it('belum pernah disimpan berarti null', () => {
    expect(loadLastJalur()).toBeNull()
  })

  it('data rusak atau asing dianggap null, tanpa melempar', () => {
    const rusak = [
      'bukan-jalur',
      'KUIS',
      'studi2',
      '',
      'null',
      '"kuis"',
      '{"jalur":"kuis"}',
    ]
    for (const raw of rusak) {
      sessionStorage.setItem(lastJalurKey(), raw)
      expect(loadLastJalur()).toBeNull()
    }
  })

  it('clearLastJalur mengosongkan penanda, dan aman saat kosong', () => {
    saveLastJalur('studi')
    clearLastJalur()
    expect(loadLastJalur()).toBeNull()
    expect(() => clearLastJalur()).not.toThrow()
  })

  it('clearJalur tidak menyentuh penanda jalur terakhir', () => {
    saveAnswer('studi', 0, true)
    saveLastJalur('studi')

    clearJalur('studi')

    expect(scoreOf('studi')).toBe(0)
    expect(loadLastJalur()).toBe('studi')
  })

  it('memakai sessionStorage, bukan localStorage', () => {
    saveLastJalur('kuis')
    expect(sessionStorage.length).toBe(1)
    expect(localStorage.length).toBe(0)
  })

  it('tanpa sessionStorage tidak melempar', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(() => saveLastJalur('kuis')).not.toThrow()
    expect(loadLastJalur()).toBeNull()
    expect(() => clearLastJalur()).not.toThrow()
  })
})

describe('skor jalur terakhir (sortir dinilai sekali, bukan per kartu)', () => {
  it('menyimpan dan membaca ulang skor bulat', () => {
    sessionStorage.clear()
    expect(loadLastScore()).toBeNull()
    saveLastScore(12)
    expect(loadLastScore()).toBe(12)
    saveLastScore(0)
    expect(loadLastScore()).toBe(0)
  })

  it('menolak angka yang bukan bilangan bulat tak negatif', () => {
    sessionStorage.clear()
    saveLastScore(12)
    for (const bad of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      saveLastScore(bad)
      expect(loadLastScore(), `nilai ${bad} tidak boleh menimpa`).toBe(12)
    }
  })

  it('data rusak di storage dibaca sebagai null, bukan angka karangan', () => {
    sessionStorage.clear()
    // Kunci ditemukan lewat jalur produksi: satu-satunya kunci sesudah simpan.
    saveLastScore(12)
    const key = sessionStorage.key(0)
    if (key === null) throw new Error('tidak ada kunci last-score')

    for (const raw of ['', 'dua belas', '-3', '2.5', 'NaN', 'null', '[12]']) {
      sessionStorage.setItem(key, raw)
      expect(loadLastScore(), `isi ${JSON.stringify(raw)}`).toBeNull()
    }
  })

  it('clearLastScore mengosongkan skor tanpa menyentuh penanda jalur', () => {
    sessionStorage.clear()
    saveLastJalur('sortir')
    saveLastScore(12)
    clearLastScore()
    expect(loadLastScore()).toBeNull()
    expect(loadLastJalur()).toBe('sortir')
    expect(() => clearLastScore()).not.toThrow()
  })

  it('tanpa sessionStorage tidak melempar', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(() => saveLastScore(3)).not.toThrow()
    expect(loadLastScore()).toBeNull()
    expect(() => clearLastScore()).not.toThrow()
    vi.unstubAllGlobals()
  })
})
