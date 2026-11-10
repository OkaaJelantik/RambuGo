import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Sortir from './Sortir'
import { KINDS, SIGNS, type Kind } from './data'
import { KIND_ORDER, binAt, sortirCards, starsFor, type Box } from './sortir'

/** Hiasan pertama yang masih di panggung (urutan layar). */
function firstCard(): HTMLButtonElement {
  const card = document.querySelector<HTMLButtonElement>('.sr-pajang')
  if (!card) throw new Error('tidak ada hiasan tersisa')
  return card
}

/** Rambu di balik sebuah tombol: dibaca dari `data-sign`, bukan dari urutan. */
function signOf(card: HTMLButtonElement) {
  const sign = SIGNS.find((candidate) => candidate.id === card.dataset.sign)
  if (!sign) throw new Error(`tombol tanpa rambu: ${card.dataset.sign}`)
  return sign
}

/** Kepala kotak: tombol "taruh di sini" yang membawa nama jenis. */
function bin(kind: Kind): HTMLButtonElement {
  return screen.getByRole('button', {
    name: `Kotak ${KINDS[kind].label}`,
  }) as HTMLButtonElement
}

/** Wadah kotak: pembawa `data-kind` dan bidang yang dipakai hit-test seret. */
function binBox(kind: Kind): HTMLDivElement {
  const el = document.querySelector<HTMLDivElement>(`.sr-bin[data-kind="${kind}"]`)
  if (!el) throw new Error(`kotak tidak ada: ${kind}`)
  return el
}

/** Tombol penilaian; satu-satunya tombol yang memulai percobaan baru. */
function finishButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Sudah Selesai' }) as HTMLButtonElement
}

/** Menaruh semua hiasan yang tersisa ke kotak jenis yang benar. */
function placeAllCorrect(): void {
  for (let i = 0; i < SIGNS.length; i += 1) {
    const card = document.querySelector<HTMLButtonElement>('.sr-pajang')
    if (!card) return
    const sign = signOf(card)
    fireEvent.click(card)
    fireEvent.click(bin(sign.kind))
  }
}

/** Jenis lain yang pasti salah untuk rambu ini. */
function wrongKind(kind: Kind): Kind {
  const other = KIND_ORDER.find((candidate) => candidate !== kind)
  if (!other) throw new Error('tidak ada jenis lain')
  return other
}

function liveText(): string {
  return document.querySelector('.sr-live')?.textContent ?? ''
}

function renderSortir(seed = 7) {
  const onDone = vi.fn()
  render(<Sortir seed={seed} onDone={onDone} />)
  return { onDone }
}

describe('sortirCards', () => {
  it('deterministik: seed yang sama memberi urutan yang sama', () => {
    const first = sortirCards(7).map((sign) => sign.id)
    const second = sortirCards(7).map((sign) => sign.id)
    expect(second).toEqual(first)
  })

  it('memuat seluruh 12 rambu tanpa duplikat', () => {
    const ids = sortirCards(7).map((sign) => sign.id)
    expect(ids).toHaveLength(SIGNS.length)
    expect(new Set(ids).size).toBe(SIGNS.length)
    expect([...ids].sort()).toEqual(SIGNS.map((sign) => sign.id).sort())
    // Tiga rambu per jenis, sama seperti `SIGNS`.
    for (const kind of KIND_ORDER) {
      expect(sortirCards(3).filter((sign) => sign.kind === kind)).toHaveLength(3)
    }
  })

  it('urutan berubah saat seed berubah, dan tidak sama dengan urutan data', () => {
    const one = sortirCards(1).map((sign) => sign.id)
    const two = sortirCards(2).map((sign) => sign.id)
    expect(two).not.toEqual(one)
    expect(one).not.toEqual(SIGNS.map((sign) => sign.id))
  })
})

describe('binAt', () => {
  const box = (left: number, top: number, right: number, bottom: number): Box => ({
    left,
    top,
    right,
    bottom,
  })
  const rects = [
    { kind: 'larangan' as const, box: box(0, 0, 100, 50) },
    { kind: 'peringatan' as const, box: box(110, 0, 200, 50) },
  ]

  it('mengembalikan jenis kotak yang memuat titik', () => {
    expect(binAt(50, 25, rects)).toBe('larangan')
    expect(binAt(150, 25, rects)).toBe('peringatan')
  })

  it('titik di batas tetap dihitung masuk, karena jari mendarat di garis', () => {
    expect(binAt(0, 0, rects)).toBe('larangan')
    expect(binAt(100, 50, rects)).toBe('larangan')
    expect(binAt(110, 0, rects)).toBe('peringatan')
    expect(binAt(200, 50, rects)).toBe('peringatan')
  })

  it('titik di luar semua kotak mengembalikan null', () => {
    expect(binAt(-1, 25, rects)).toBeNull()
    expect(binAt(105, 25, rects)).toBeNull()
    expect(binAt(50, 51, rects)).toBeNull()
    expect(binAt(50, -1, rects)).toBeNull()
    expect(binAt(50, 25, [])).toBeNull()
  })
})

describe('starsFor', () => {
  it('mempertahankan ambang kuis 5 soal: 4/5 → 3, 2–3/5 → 2, 0–1/5 → 1', () => {
    expect(starsFor(5, 5)).toBe(3)
    expect(starsFor(4, 5)).toBe(3)
    expect(starsFor(3, 5)).toBe(2)
    expect(starsFor(2, 5)).toBe(2)
    expect(starsFor(1, 5)).toBe(1)
    expect(starsFor(0, 5)).toBe(1)
  })

  it('memberi ambang yang sama untuk 12 rambu: 10/12 → 3, 5–9/12 → 2, 0–4/12 → 1', () => {
    expect(starsFor(12, 12)).toBe(3)
    expect(starsFor(10, 12)).toBe(3)
    expect(starsFor(9, 12)).toBe(2)
    expect(starsFor(5, 12)).toBe(2)
    expect(starsFor(4, 12)).toBe(1)
    expect(starsFor(0, 12)).toBe(1)
  })

  it('tepat di rasio 0,8 dan 0,4 tetap naik bintang', () => {
    expect(starsFor(8, 10)).toBe(3)
    expect(starsFor(4, 10)).toBe(2)
  })
})

describe('Sortir (DOM)', () => {
  it('memasang dua belas hiasan, empat kotak, dan wilayah live; progres disembunyikan', () => {
    renderSortir()

    expect(document.querySelectorAll('.sr-pajang')).toHaveLength(SIGNS.length)
    for (const kind of KIND_ORDER) {
      const head = bin(kind)
      expect(head.tagName).toBe('BUTTON')
      expect(binBox(kind).getAttribute('data-kind')).toBe(kind)
    }

    // Tidak ada bilah kemajuan: anak menilai sendiri lewat tombol, bukan
    // membaca "tinggal 3 lagi" yang membocorkan sisa langkah.
    expect(document.querySelector('.sr-progress')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sudah Selesai' })).toBeTruthy()

    const live = document.querySelector<HTMLElement>('.sr-live')
    expect(live).not.toBeNull()
    expect(live?.getAttribute('role')).toBe('status')
    expect(live?.getAttribute('aria-live')).toBe('polite')
    expect(live?.textContent).toBe('')
  })

  it('menaruh rambu ke kotak yang salah pun diterima — tidak ada penolakan', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)
    const wrong = wrongKind(sign.kind)

    fireEvent.click(card)
    fireEvent.click(bin(wrong))

    // Rambu benar-benar pindah ke kotak yang salah, tanpa dikembalikan.
    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBeNull()
    const placed = document.querySelector<HTMLElement>(`[data-kind="${wrong}"] .sr-placed`)
    expect(placed).not.toBeNull()
    expect(placed?.getAttribute('aria-label')).toContain(sign.name)

    // Umpan balik netral: jenis yang benar tidak disebut sebelum dinilai.
    expect(liveText()).toContain('masuk kotak')
    expect(liveText()).not.toContain('Belum tepat')
    expect(liveText()).not.toContain('termasuk')
    expect(document.activeElement).not.toBe(document.body)
  })

  it('rambu di kotak bisa dipilih lalu dipindah ke kotak lain', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)
    const wrong = wrongKind(sign.kind)

    fireEvent.click(card)
    fireEvent.click(bin(wrong))
    const placed = document.querySelector<HTMLButtonElement>(
      `[data-kind="${wrong}"] .sr-placed`,
    )
    expect(placed).not.toBeNull()

    fireEvent.click(placed as HTMLButtonElement)
    expect(placed?.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(bin(sign.kind))
    expect(document.querySelector(`[data-kind="${wrong}"] .sr-placed`)).toBeNull()
    expect(document.querySelector(`[data-kind="${sign.kind}"] .sr-placed`)).not.toBeNull()
    expect(liveText()).toContain('dipindah ke kotak')
  })

  it('Sudah Selesai saat masih ada yang belum pas: menandai, tidak menyelesaikan', () => {
    renderSortir()
    fireEvent.click(finishButton())

    expect(document.querySelector('.sr-done')).toBeNull()
    expect(document.querySelectorAll('[data-wrong]').length).toBeGreaterThan(0)
    expect(liveText()).toContain('belum pas')
    expect(screen.getByRole('button', { name: 'Sudah Selesai' })).toBeTruthy()

    // Tanda hilang begitu rambu dipindah, bukan menempel selamanya.
    const card = firstCard()
    const sign = signOf(card)
    expect(card.getAttribute('data-wrong')).toBe('true')
    fireEvent.click(card)
    fireEvent.click(bin(sign.kind))
    // Rambu yang dipindah menjadi tombol baru di kotak; tanda merah tidak
    // ikut berpindah karena tanda itu milik penilaian sebelumnya.
    const moved = document.querySelector(`[data-kind="${sign.kind}"] .sr-placed`)
    expect(moved).not.toBeNull()
    expect(moved?.getAttribute('data-wrong')).toBeNull()
  })

  it('berhasil pada percobaan pertama: ringkasan ke-1 dan skor 12/12', () => {
    const { onDone } = renderSortir()
    placeAllCorrect()

    expect(document.querySelectorAll('.sr-pajang')).toHaveLength(0)
    fireEvent.click(finishButton())

    const summary = screen.getByRole('heading', { name: 'Berhasil dalam percobaan ke-1.' })
    expect(document.activeElement).toBe(summary)

    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(SIGNS.length)
  })

  it('gagal sekali lalu benar: ringkasan ke-2, skor memakai percobaan pertama', () => {
    const { onDone } = renderSortir()
    const first = firstCard()
    const firstSign = signOf(first)
    const wrong = wrongKind(firstSign.kind)

    // Semua dua belas ditaruh; satu sengaja di kotak yang salah.
    fireEvent.click(first)
    fireEvent.click(bin(wrong))
    placeAllCorrect()

    fireEvent.click(finishButton())
    expect(document.querySelector('.sr-done')).toBeNull()
    expect(document.querySelector(`[data-kind="${wrong}"] .sr-placed[data-wrong]`)).not.toBeNull()

    // Pindahkan yang salah ke kotak yang benar, lalu nilai lagi.
    fireEvent.click(document.querySelector<HTMLButtonElement>(`[data-kind="${wrong}"] .sr-placed`)!)
    fireEvent.click(bin(firstSign.kind))

    fireEvent.click(finishButton())
    expect(screen.getByRole('heading', { name: 'Berhasil dalam percobaan ke-2.' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(onDone).toHaveBeenCalledWith(SIGNS.length - 1)
  })

  it('papan tombol: memilih, menaruh, membatalkan; fokus tidak jatuh ke body', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)

    card.focus()
    fireEvent.click(card)
    expect(card.getAttribute('aria-pressed')).toBe('true')

    const target = bin(sign.kind)
    target.focus()
    fireEvent.click(target)
    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBeNull()
    expect(document.activeElement).not.toBe(document.body)

    const next = firstCard()
    next.focus()
    fireEvent.click(next)
    expect(next.getAttribute('aria-pressed')).toBe('true')
    fireEvent.keyDown(next, { key: 'Escape' })
    expect(next.getAttribute('aria-pressed')).toBe('false')
    expect(document.activeElement).toBe(next)
  })

  it('seret pointer: hantu mengikuti jari, kotak salah pun menerima', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)

    // Kotak di jsdom selalu nol; beri bidang sungguhan supaya hit-test punya
    // yang dinilai — `binAt` tetap fungsi murni tanpa DOM.
    const boxes: Record<Kind, Box> = {
      larangan: { left: 0, top: 100, right: 100, bottom: 200 },
      peringatan: { left: 110, top: 100, right: 200, bottom: 200 },
      perintah: { left: 0, top: 210, right: 100, bottom: 310 },
      petunjuk: { left: 110, top: 210, right: 200, bottom: 310 },
    }
    for (const kind of KIND_ORDER) {
      const el = binBox(kind)
      const box = boxes[kind]
      el.getBoundingClientRect = () =>
        ({
          ...box,
          width: box.right - box.left,
          height: box.bottom - box.top,
          x: box.left,
          y: box.top,
          toJSON: () => box,
        }) as DOMRect
    }

    const wrong = wrongKind(sign.kind)
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, button: 0, pointerType: 'touch' })
    const ghost = document.querySelector<HTMLElement>('.sr-ghost')
    expect(ghost).not.toBeNull()

    fireEvent.pointerMove(window, { clientX: 60, clientY: 60, pointerType: 'touch' })
    expect(ghost?.style.transform).toContain('translate3d(60px, 60px, 0')

    const drop = boxes[wrong]
    fireEvent.pointerUp(window, {
      clientX: (drop.left + drop.right) / 2,
      clientY: (drop.top + drop.bottom) / 2,
      pointerType: 'touch',
    })

    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBeNull()
    expect(document.querySelector(`[data-kind="${wrong}"] .sr-placed`)).not.toBeNull()
    expect(document.querySelector('.sr-ghost')).toBeNull()
    expect(liveText()).not.toContain('Tepat!')
  })

  it('seret lalu lepas di luar kotak: batal, rambu tetap di panggung', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, button: 0, pointerType: 'mouse' })
    fireEvent.pointerMove(window, { clientX: 30, clientY: 50, pointerType: 'mouse' })
    fireEvent.pointerUp(window, { clientX: 30, clientY: 50, pointerType: 'mouse' })

    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBe(card)
    expect(card.getAttribute('aria-pressed')).toBe('false')
    expect(document.querySelector('.sr-ghost')).toBeNull()
    expect(document.activeElement).toBe(card)
  })
})
