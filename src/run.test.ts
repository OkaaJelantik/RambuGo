import { describe, expect, it } from 'vitest'
import { SIGNS } from './data'
import { BATCH_SIZE, advanceRun, batchOf, createRun, shuffleSigns } from './run'

describe('run: antrean rambu teracak', () => {
  it('seed yang sama menghasilkan antrean yang sama', () => {
    expect(shuffleSigns(7).map((s) => s.id)).toEqual(shuffleSigns(7).map((s) => s.id))
  })

  it('seed berbeda menghasilkan urutan berbeda', () => {
    const a = shuffleSigns(7).map((s) => s.id)
    const b = shuffleSigns(99).map((s) => s.id)
    expect(a).not.toEqual(b)
  })

  it('mengacak tanpa menghilangkan atau menggandakan rambu', () => {
    const order = shuffleSigns(2026).map((s) => s.id).sort()
    expect(order).toEqual(SIGNS.map((s) => s.id).sort())
  })

  it('satu perjalanan kaki berisi 3 rambu unik', () => {
    const run = createRun(11)
    const batch = batchOf(run)
    expect(batch).toHaveLength(BATCH_SIZE)
    expect(new Set(batch.map((s) => s.id)).size).toBe(BATCH_SIZE)
  })

  it('dua perjalanan kaki tidak mengulang satu rambu pun, lalu diacak ulang', () => {
    const first = createRun(11)
    const second = advanceRun(first)
    const ids = [...batchOf(first), ...batchOf(second)].map((s) => s.id)
    // Enam rambu berbeda: cukup untuk dua perjalanan tanpa pengulangan.
    expect(new Set(ids).size).toBe(SIGNS.length)

    // Batch ketiga habis → antrean baru dengan seed baru.
    const third = advanceRun(second)
    expect(third.seed).toBe(first.seed + 1)
    expect(third.cursor).toBe(0)
  })

  it('rambu terakhir tidak muncul lagi di posisi pertama setelah diacak ulang', () => {
    const first = createRun(5)
    const second = advanceRun(first)
    const lastOfFirst = batchOf(first)[BATCH_SIZE - 1].id
    const third = advanceRun(second)
    expect(batchOf(third)[0].id).not.toBe(lastOfFirst)
  })

  it('setiap rambu yang tampil punya bentuk yang dikenal KINDS', () => {
    for (const sign of shuffleSigns(3)) {
      expect(sign.kind).toMatch(/peringatan|larangan|perintah|petunjuk/)
    }
  })
})

describe('rambu yang benar-benar berdiri di jalan', () => {
  it('scene memakai antrean run, bukan tiga rambu pertama SIGNS', () => {
    // Batch dari seed mana pun boleh berisi rambu ke-4..6; itu inti fitur ini.
    const ids = new Set<string>()
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const sign of batchOf(createRun(seed))) ids.add(sign.id)
    }
    expect(ids.size).toBe(SIGNS.length)
  })
})
