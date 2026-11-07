import { describe, expect, it } from 'vitest'
import { INTRO_LINE, SIGN_OPENINGS, STORY, beatById, openingFor, type StoryAction } from './story'
import { WALK_SIGNS } from './data'

/** Hitung kalimat dari tanda akhir yang diikuti spasi atau akhir teks. */
function countSentences(text: string): number {
  return (text.match(/[.!?]+(?=\s|$)/g) ?? []).length
}

const ACTIONS: StoryAction[] = ['continue', 'learn', 'materi', 'kuis', 'home', 'restart']

const EXPECTED_IDS = [
  'intro',
  'leg-1',
  'stop-1',
  'leg-2',
  'stop-2',
  'leg-3',
  'stop-3',
  'crossroad',
  'materi',
  'kuis',
  'home',
]

describe('naskah cerita', () => {
  it('memuat 11 beat dengan urutan naskah', () => {
    expect(STORY).toHaveLength(11)
    expect(STORY.map((beat) => beat.id)).toEqual(EXPECTED_IDS)
  })

  it('kalimat intro diekspor dan dipakai beat intro', () => {
    // Layar kelas membaca kalimat ini langsung; jangan sampai ada salinan.
    expect(beatById('intro')?.text).toBe(INTRO_LINE)
    expect(INTRO_LINE).toContain('Bu Guru')
  })

  it('setiap balon maksimal 2 kalimat dan 90 karakter', () => {
    for (const beat of STORY) {
      expect(beat.text.length, `${beat.id}: "${beat.text}"`).toBeLessThanOrEqual(90)
      expect(countSentences(beat.text), `${beat.id}: "${beat.text}"`).toBeLessThanOrEqual(2)
      expect(beat.text.trim().length).toBeGreaterThan(0)
    }
  })

  it('setiap beat punya tombol dengan aksi yang dikenal, kecuali leg', () => {
    for (const beat of STORY) {
      if (beat.id.startsWith('leg-')) {
        // Naskah: kalimat leg tampil otomatis dan hilang sendiri, tanpa tombol.
        expect(beat.buttons, `${beat.id} tidak boleh punya tombol`).toEqual([])
        continue
      }
      expect(beat.buttons.length, `${beat.id} tidak punya tombol`).toBeGreaterThan(0)
      for (const button of beat.buttons) {
        expect(button.label.trim().length, `${beat.id} label kosong`).toBeGreaterThan(0)
        expect(ACTIONS, `${beat.id}: aksi ${button.action}`).toContain(button.action)
      }
    }
  })

  it('tombol baku sesuai tempatnya', () => {
    const labels = (id: string) => beatById(id)?.buttons.map((button) => button.label)

    expect(labels('intro')).toEqual(['Keluar kelas'])
    expect(labels('leg-1')).toEqual([])
    expect(labels('leg-2')).toEqual([])
    expect(labels('leg-3')).toEqual([])

    for (const id of ['stop-1', 'stop-2', 'stop-3']) {
      expect(labels(id)).toEqual(['Apa ini?', 'Lanjut jalan'])
    }

    expect(labels('crossroad')).toEqual(['Ke materi', 'Ke kuis'])
    expect(labels('materi')).toEqual(['Sudah paham, coba kuis'])
    expect(labels('kuis')).toEqual(['Selesai'])
    expect(labels('home')).toEqual(['Pulang', 'Main lagi'])
  })

  it('tombol stop menawarkan belajar dan lanjut; leg tidak punya tombol', () => {
    for (const id of ['stop-1', 'stop-2', 'stop-3']) {
      const buttons = beatById(id)?.buttons ?? []
      expect(buttons.map((button) => button.action)).toEqual(['learn', 'continue'])
    }
    for (const id of ['leg-1', 'leg-2', 'leg-3']) {
      expect(beatById(id)?.buttons).toEqual([])
    }
  })

  it('memakai ragam anak, bukan "anda" atau "kalian"', () => {
    for (const beat of STORY) {
      expect(beat.text.toLowerCase()).not.toMatch(/\b(anda|kalian)\b/)
    }
  })

  it('punya baris pembuka untuk tiga rambu walk, dan hanya itu', () => {
    for (const sign of WALK_SIGNS) {
      const opening = openingFor(sign.id)
      expect(opening, `pembuka ${sign.id} hilang`).toBeTruthy()
      expect(opening!.length).toBeLessThanOrEqual(90)
      expect(countSentences(opening!)).toBeLessThanOrEqual(2)
    }

    expect(Object.keys(SIGN_OPENINGS).sort()).toEqual(WALK_SIGNS.map((sign) => sign.id).sort())
    expect(openingFor('belok-kiri')).toBeUndefined()
  })
})

describe('beatById', () => {
  it('mengembalikan beat untuk setiap id', () => {
    for (const id of EXPECTED_IDS) {
      expect(beatById(id)?.id).toBe(id)
    }
  })

  it('mengembalikan null untuk id kosong atau asing', () => {
    expect(beatById(null)).toBeNull()
    expect(beatById('tidak-ada')).toBeNull()
  })
})
