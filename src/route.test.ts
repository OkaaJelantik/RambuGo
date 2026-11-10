/**
 * Tes murni peta hash ↔ posisi. Tanpa DOM: hanya fungsi produksi yang diuji,
 * jadi tes ini tidak perlu merender apa pun.
 */

import { describe, expect, it } from 'vitest'
import { formatHash, parseHash, stageLimit, type Route, type Stage } from './route'

/** Semua stage, urut seperti peta hash. */
const STAGES: Stage[] = [
  'intro',
  'walk',
  'crossroad',
  'materi',
  'kuis',
  'sortir',
  'studi',
  'home',
]

describe('stageLimit', () => {
  it('walk 2 (tiga leg), kuis 4 (lima soal), studi 14 (lima belas keputusan)', () => {
    expect(stageLimit('walk')).toBe(2)
    expect(stageLimit('kuis')).toBe(4)
    expect(stageLimit('studi')).toBe(14)
  })

  it('stage tanpa langkah berbatas 0', () => {
    const noSteps: Stage[] = ['intro', 'crossroad', 'materi', 'sortir', 'home']
    for (const stage of noSteps) expect(stageLimit(stage)).toBe(0)
  })
})

describe('parseHash', () => {
  it('menerima bentuk ber-hash, bergaris miring, dan tanpa keduanya', () => {
    for (const hash of ['#/kuis/3', '/kuis/3', 'kuis/3', '#kuis/3']) {
      expect(parseHash(hash)).toEqual({ stage: 'kuis', pos: 3 })
    }
  })

  it('posisi hilang berarti 0', () => {
    expect(parseHash('#/kuis')).toEqual({ stage: 'kuis', pos: 0 })
    expect(parseHash('#/kuis/')).toEqual({ stage: 'kuis', pos: 0 })
    expect(parseHash('walk')).toEqual({ stage: 'walk', pos: 0 })
    expect(parseHash('#/studi')).toEqual({ stage: 'studi', pos: 0 })
  })

  it('pos di-clamp ke 0..stageLimit(stage)', () => {
    // Tabel batas: angka di atas limit jatuh ke langkah terakhir.
    expect(parseHash('#/studi/99')).toEqual({ stage: 'studi', pos: 14 })
    expect(parseHash('#/kuis/99')).toEqual({ stage: 'kuis', pos: 4 })
    expect(parseHash('#/walk/3')).toEqual({ stage: 'walk', pos: 2 })

    // Batasnya sendiri tidak ikut terpotong.
    expect(parseHash('#/studi/14')).toEqual({ stage: 'studi', pos: 14 })
    expect(parseHash('#/kuis/4')).toEqual({ stage: 'kuis', pos: 4 })
    expect(parseHash('#/walk/2')).toEqual({ stage: 'walk', pos: 2 })

    // Negatif dan bukan angka berarti 0, bukan -3/NaN.
    expect(parseHash('#/kuis/-3')).toEqual({ stage: 'kuis', pos: 0 })
    expect(parseHash('#/walk/abc')).toEqual({ stage: 'walk', pos: 0 })
    expect(parseHash('#/studi/2.5')).toEqual({ stage: 'studi', pos: 0 })
  })

  it('stage tanpa langkah selalu berposisi 0 walau hash membawa angka', () => {
    expect(parseHash('#/materi/7')).toEqual({ stage: 'materi', pos: 0 })
    expect(parseHash('#/sortir/2')).toEqual({ stage: 'sortir', pos: 0 })
    expect(parseHash('#/home/1')).toEqual({ stage: 'home', pos: 0 })
    expect(parseHash('#/intro/4')).toEqual({ stage: 'intro', pos: 0 })
    expect(parseHash('#/crossroad/9')).toEqual({ stage: 'crossroad', pos: 0 })
  })

  it('hash kosong atau asing jatuh ke intro/0', () => {
    for (const hash of ['', '#', '/', '#/', '   ', '#/asing', '#/kuis-3', '#/walkonline/2']) {
      expect(parseHash(hash)).toEqual({ stage: 'intro', pos: 0 })
    }
  })
})

describe('formatHash', () => {
  it('kanonik: stage tanpa langkah tidak menulis /0', () => {
    expect(formatHash({ stage: 'intro', pos: 0 })).toBe('#/intro')
    expect(formatHash({ stage: 'crossroad', pos: 0 })).toBe('#/crossroad')
    expect(formatHash({ stage: 'materi', pos: 0 })).toBe('#/materi')
    expect(formatHash({ stage: 'sortir', pos: 0 })).toBe('#/sortir')
    expect(formatHash({ stage: 'home', pos: 0 })).toBe('#/home')
  })

  it('stage berlangkah selalu menulis posisi, termasuk pos 0', () => {
    expect(formatHash({ stage: 'walk', pos: 0 })).toBe('#/walk/0')
    expect(formatHash({ stage: 'walk', pos: 2 })).toBe('#/walk/2')
    expect(formatHash({ stage: 'kuis', pos: 3 })).toBe('#/kuis/3')
    expect(formatHash({ stage: 'studi', pos: 14 })).toBe('#/studi/14')
  })

  it('pos di luar batas ditulis sebagai batasnya, jadi hasilnya tetap sah', () => {
    expect(formatHash({ stage: 'studi', pos: 99 })).toBe('#/studi/14')
    expect(formatHash({ stage: 'kuis', pos: -3 })).toBe('#/kuis/0')
    expect(formatHash({ stage: 'walk', pos: Number.NaN })).toBe('#/walk/0')
  })

  it('roundtrip: parseHash(formatHash(r)) mengembalikan r untuk semua rute sah', () => {
    for (const stage of STAGES) {
      for (let pos = 0; pos <= stageLimit(stage); pos += 1) {
        const route: Route = { stage, pos }
        expect(parseHash(formatHash(route))).toEqual(route)
      }
    }
  })

  it('input toleran dinormalkan ke bentuk kanonik', () => {
    expect(formatHash(parseHash('/kuis/3'))).toBe('#/kuis/3')
    expect(formatHash(parseHash('#/studi/99'))).toBe('#/studi/14')
    expect(formatHash(parseHash(''))).toBe('#/intro')
  })
})
