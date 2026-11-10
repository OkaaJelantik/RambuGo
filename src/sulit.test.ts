/**
 * Tes data murni level Sulit. Tanpa DOM: yang diuji hanya `CASES`,
 * `orderedOptions`, dan angka yang dipakai layar — bukan komponennya.
 *
 * Assertion sengaja menyentuh fungsi produksi (`orderedOptions`, `starsFor`),
 * bukan salinan tabel milik tes, supaya tes ini bisa gagal kalau data atau
 * pengacakan berubah (lihat AGENTS.md §8.2).
 */

import { describe, expect, it } from 'vitest'
import { starsFor } from './sortir'
import { CASES, TOTAL_DECISIONS, orderedOptions, type CaseAsk, type CaseOption } from './sulit'

const ASKS: CaseAsk[] = ['makna', 'alasan', 'tindakan']

/** Posisi opsi benar di daftar yang akan dirender; `-1` = data rusak. */
function correctIndex(options: CaseOption[]): number {
  return options.findIndex((option) => option.correct)
}

/** Jumlah kalimat kasar: potong pada `.`, `!`, `?`, buang sisa kosong. */
function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((part) => part.trim() !== '').length
}

describe('CASES', () => {
  it('berisi 5 kasus, tiap kasus tepat 3 tahap berurutan makna → alasan → tindakan', () => {
    expect(CASES).toHaveLength(5)

    for (const kasus of CASES) {
      expect(kasus.id.trim()).not.toBe('')
      expect(kasus.title.trim()).not.toBe('')
      expect(kasus.steps).toHaveLength(3)
      expect(kasus.steps.map((step) => step.ask)).toEqual(ASKS)
    }
  })

  it('tiap tahap: 3 opsi, tepat satu benar, teks tidak kosong, ≤ 2 kalimat', () => {
    for (const kasus of CASES) {
      expect(kasus.story.trim()).not.toBe('')
      expect(sentenceCount(kasus.story)).toBeLessThanOrEqual(2)

      for (const step of kasus.steps) {
        expect(step.prompt.trim()).not.toBe('')
        expect(step.prompt.length).toBeLessThanOrEqual(90)
        expect(step.prompt.endsWith('?')).toBe(true)
        expect(step.why.trim()).not.toBe('')
        expect(sentenceCount(step.why)).toBeLessThanOrEqual(2)

        expect(step.options).toHaveLength(3)
        expect(step.options.filter((option) => option.correct)).toHaveLength(1)
        expect(step.options.every((option) => option.text.trim() !== '')).toBe(true)
        // Teks unik: React memakai `opt.text` sebagai key di layar.
        expect(new Set(step.options.map((option) => option.text)).size).toBe(3)
      }
    }
  })

  it('sign.visual mendeskripsikan gambar, bukan membocorkan name atau jawaban tahap makna', () => {
    for (const kasus of CASES) {
      const visual = kasus.sign.visual.toLowerCase()

      expect(visual.trim()).not.toBe('')
      expect(visual).not.toContain(kasus.sign.name.toLowerCase())

      const makna = kasus.steps[0]
      expect(makna.ask).toBe('makna')
      const answer = makna.options[correctIndex(makna.options)].text.toLowerCase()
      expect(visual).not.toContain(answer)
    }
  })
})

describe('orderedOptions', () => {
  it('deterministik: (kasus, tahap, seed) sama selalu memberi urutan yang sama', () => {
    for (let caseIndex = 0; caseIndex < CASES.length; caseIndex += 1) {
      for (let stepIndex = 0; stepIndex < 3; stepIndex += 1) {
        const first = orderedOptions(caseIndex, stepIndex, 20261110)
        const second = orderedOptions(caseIndex, stepIndex, 20261110)

        expect(second.map((option) => option.text)).toEqual(first.map((option) => option.text))
        // Hanya mengacak: tidak ada opsi yang hilang atau berubah kunci.
        expect(first.map((option) => option.text).sort()).toEqual(
          CASES[caseIndex].steps[stepIndex].options.map((option) => option.text).sort(),
        )
        expect(first.filter((option) => option.correct)).toHaveLength(1)
      }
    }
  })

  it('20 seed menyebar posisi benar ke 0, 1, dan 2 (bukan kunci A–A–A)', () => {
    const visited = new Set<number>()

    for (let caseIndex = 0; caseIndex < CASES.length; caseIndex += 1) {
      for (let stepIndex = 0; stepIndex < 3; stepIndex += 1) {
        const perStep = new Set<number>()

        for (let seed = 0; seed < 20; seed += 1) {
          const position = correctIndex(orderedOptions(caseIndex, stepIndex, seed))
          expect(position).toBeGreaterThanOrEqual(0)
          perStep.add(position)
          visited.add(position)
        }

        // Setiap tahap sendiri sudah tidak boleh selalu menjawab posisi yang sama.
        expect([...perStep].length, `${CASES[caseIndex].id} tahap ${stepIndex}`).toBe(3)
      }
    }

    expect([...visited].sort()).toEqual([0, 1, 2])
  })
})

describe('TOTAL_DECISIONS', () => {
  it('15 keputusan = 5 kasus × 3 tahap', () => {
    expect(TOTAL_DECISIONS).toBe(15)
    expect(TOTAL_DECISIONS).toBe(CASES.length * 3)
  })
})

describe('starsFor pada 15 keputusan', () => {
  it('memakai rumus tunggal yang sama dengan sortir dan kuis lama', () => {
    expect(starsFor(15, 15)).toBe(3)
    expect(starsFor(12, 15)).toBe(3)
    expect(starsFor(11, 15)).toBe(2)
    expect(starsFor(6, 15)).toBe(2)
    expect(starsFor(5, 15)).toBe(1)
  })
})
