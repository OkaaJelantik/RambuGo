import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Sortir from './Sortir'
import { KINDS, SIGNS, type Kind } from './data'
import { KIND_ORDER, binAt, sortirCards, starsFor, type Box } from './sortir'

/** Kartu pertama yang masih di area kartu (urutan layar). */
function firstCard(): HTMLButtonElement {
  const card = document.querySelector<HTMLButtonElement>('.sr-pajang')
  if (!card) throw new Error('tidak ada kartu tersisa')
  return card
}

/** Rambu di balik sebuah kartu: dibaca dari `data-sign`, bukan dari urutan. */
function signOf(card: HTMLButtonElement) {
  const sign = SIGNS.find((candidate) => candidate.id === card.dataset.sign)
  if (!sign) throw new Error(`kartu tanpa rambu: ${card.dataset.sign}`)
  return sign
}

function bin(kind: Kind): HTMLButtonElement {
  return screen.getByRole('button', {
    name: `Kotak ${KINDS[kind].label}`,
  }) as HTMLButtonElement
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

  it('mengembalikan jenis keranjang yang memuat titik', () => {
    expect(binAt(50, 25, rects)).toBe('larangan')
    expect(binAt(150, 25, rects)).toBe('peringatan')
  })

  it('titik di batas tetap dihitung masuk, karena jari mendarat di garis', () => {
    expect(binAt(0, 0, rects)).toBe('larangan')
    expect(binAt(100, 50, rects)).toBe('larangan')
    expect(binAt(110, 0, rects)).toBe('peringatan')
    expect(binAt(200, 50, rects)).toBe('peringatan')
  })

  it('titik di luar semua keranjang mengembalikan null', () => {
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

  it('memberi ambang yang sama untuk 12 kartu: 10/12 → 3, 5–9/12 → 2, 0–4/12 → 1', () => {
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
  it('memasang dua belas kartu, empat keranjang, dan satu wilayah live tetap', () => {
    renderSortir()

    expect(document.querySelectorAll('.sr-pajang')).toHaveLength(SIGNS.length)
    for (const kind of KIND_ORDER) {
      const el = bin(kind)
      expect(el.tagName).toBe('BUTTON')
      expect(el.getAttribute('data-kind')).toBe(kind)
    }

    const live = document.querySelector<HTMLElement>('.sr-live')
    expect(live).not.toBeNull()
    expect(live?.getAttribute('role')).toBe('status')
    expect(live?.getAttribute('aria-live')).toBe('polite')

    // Wilayah live tidak lahir-mati bersama umpan balik.
    expect(live?.textContent).toBe('')
  })

  it('ketuk kartu → ketuk keranjang yang benar: kartu masuk dan live memuji', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)

    fireEvent.click(card)
    expect(card.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(bin(sign.kind))

    // Kartu tidak lagi di area kartu, tetapi tercatat di keranjang yang benar.
    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBeNull()
    const placed = document.querySelector<HTMLElement>(
      `[data-kind="${sign.kind}"] .sr-placed`,
    )
    expect(placed).not.toBeNull()
    expect(placed?.textContent).toContain(sign.name)

    expect(liveText()).toContain('Tepat!')
    expect(liveText()).toContain(`termasuk ${KINDS[sign.kind].label.toLowerCase()}`)
    // Progres ikut diumumkan: pembaca layar tidak melihat bilah kemajuan.
    expect(liveText()).toContain(`1 dari ${SIGNS.length}`)
    expect(document.activeElement).not.toBe(document.body)
  })

  it('salah keranjang: kartu tetap di area kartu, live menyebut jenis yang benar', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)
    const wrong = wrongKind(sign.kind)

    fireEvent.click(card)
    fireEvent.click(bin(wrong))

    // Kartu kembali ke area kartu — bukan hilang, bukan hukuman.
    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBe(card)
    expect(card.getAttribute('aria-pressed')).toBe('false')
    expect(document.querySelector(`[data-kind="${wrong}"] .sr-placed`)).toBeNull()

    expect(liveText()).toContain('Belum tepat')
    expect(liveText()).toContain(`termasuk ${KINDS[sign.kind].label.toLowerCase()}`)
    expect(liveText()).toContain(`bukan ${KINDS[wrong].label.toLowerCase()}`)
    // Fokus kembali ke kartu yang salah, tidak jatuh ke <body>.
    expect(document.activeElement).toBe(card)
  })

  it('papan tombol: Enter memilih, Enter menaruh, Escape membatalkan pilihan', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)

    // Tombol asli: Tab mencapainya dan Enter/Space mengaktifkannya. jsdom
    // tidak mensintesis klik dari keydown, jadi aktivasi Enter diwakili
    // `click` — perilaku yang sama dengan `<button>` di peramban.
    expect(card.tagName).toBe('BUTTON')
    expect(card.type).toBe('button')
    card.focus()
    expect(document.activeElement).toBe(card)
    fireEvent.click(card)
    expect(card.getAttribute('aria-pressed')).toBe('true')

    const target = bin(sign.kind)
    expect(target.tagName).toBe('BUTTON')
    expect(target.type).toBe('button')
    target.focus()
    fireEvent.click(target)

    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBeNull()
    expect(document.activeElement).not.toBe(document.body)

    // Escape membatalkan pilihan, fokus tetap di kartu.
    const next = firstCard()
    next.focus()
    fireEvent.click(next)
    expect(next.getAttribute('aria-pressed')).toBe('true')
    fireEvent.keyDown(next, { key: 'Escape' })
    expect(next.getAttribute('aria-pressed')).toBe('false')
    expect(document.activeElement).toBe(next)
  })

  it('semua kartu habis: ringkasan difokuskan, Selesai mengirim skor percobaan pertama', () => {
    const { onDone } = renderSortir()
    const seedCard = firstCard()
    const seedSign = signOf(seedCard)

    // Satu percobaan salah sengaja: kartu itu tidak dihitung benar.
    fireEvent.click(seedCard)
    fireEvent.click(bin(wrongKind(seedSign.kind)))

    for (let i = 0; i < SIGNS.length; i += 1) {
      const card = firstCard()
      fireEvent.click(card)
      fireEvent.click(bin(signOf(card).kind))
    }

    expect(document.querySelectorAll('.sr-pajang')).toHaveLength(0)
    const summary = screen.getByRole('heading', {
      name: /Semua hiasan sudah masuk kotaknya/,
    })
    expect(document.activeElement).toBe(summary)

    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(SIGNS.length - 1)
  })

  it('seret pointer: hantu mengikuti jari tanpa render ulang, lepas di keranjang menaruh', () => {
    renderSortir()
    const card = firstCard()
    const sign = signOf(card)

    // Kotak keranjang dijsdom selalu nol; beri kotak sungguhan supaya
    // `binAt` punya bidang untuk dinilai — hit-test tetap fungsi murni.
    const boxes: Record<Kind, Box> = {
      larangan: { left: 0, top: 100, right: 100, bottom: 200 },
      peringatan: { left: 110, top: 100, right: 200, bottom: 200 },
      perintah: { left: 0, top: 210, right: 100, bottom: 310 },
      petunjuk: { left: 110, top: 210, right: 200, bottom: 310 },
    }
    for (const kind of KIND_ORDER) {
      const el = bin(kind)
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

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, button: 0, pointerType: 'touch' })
    const ghost = document.querySelector<HTMLElement>('.sr-ghost')
    expect(ghost).not.toBeNull()

    fireEvent.pointerMove(window, { clientX: 60, clientY: 60, pointerType: 'touch' })
    // Satu penulisan transform, bukan setState per frame.
    expect(ghost?.style.transform).toContain('translate3d(60px, 60px, 0')

    const drop = boxes[sign.kind]
    fireEvent.pointerUp(window, {
      clientX: (drop.left + drop.right) / 2,
      clientY: (drop.top + drop.bottom) / 2,
      pointerType: 'touch',
    })

    expect(document.querySelector(`.sr-pajang[data-sign="${sign.id}"]`)).toBeNull()
    expect(document.querySelector('.sr-ghost')).toBeNull()
    expect(liveText()).toContain('Tepat!')
  })

  it('seret lalu lepas di luar keranjang: batal, kartu tetap di area kartu', () => {
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
