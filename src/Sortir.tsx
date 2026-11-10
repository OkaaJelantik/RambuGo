import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { KINDS, type Kind, type Sign } from './data'
import { SignArt } from './SignArt'
import { KIND_ORDER, KIND_ROLE, binAt, sortirCards, type Box } from './sortir'
import { KafeScene } from './art/kafe'
import './sortir.css'

/**
 * Tiga bidang tempat dua belas rambu dipajang. Indeks global slot dipecah per
 * bidang: rak dinding `cards[0..4]` (48 px), atas counter `cards[5..8]`
 * (64 px), lantai dekat pintu `cards[9..11]` (56 px). Ukuran mengecil makin
 * jauh dari mata tanpa satu pun hitungan proyeksi.
 */
const SHELVES = [
  { key: 'rak', label: 'Rak dinding', size: 48, from: 0, to: 5 },
  { key: 'counter', label: 'Atas counter', size: 64, from: 5, to: 9 },
  { key: 'lantai', label: 'Dekat pintu', size: 56, from: 9, to: 12 },
] as const

/**
 * Kemiringan deterministik dari indeks slot global: −6…+6 derajat, berpola
 * lima nilai supaya dua belas hiasan tidak tampak seperti barisan cetakan.
 */
function tiltFor(index: number): number {
  return ((index % 5) - 2) * 3
}

type Props = {
  seed: number
  onDone: (correct: number) => void
  /** Judul; App memfokuskannya saat layar sortir menjadi tujuan fokus. */
  headingRef?: RefObject<HTMLHeadingElement | null>
}

/** Sasaran fokus setelah sebuah penempatan; dipakai sebelum DOM berubah. */
type PendingFocus = { type: 'card'; id: string } | { type: 'summary' } | null

/** Jarak (px) yang membuat sebuah tekan berubah menjadi seret, bukan ketuk. */
const DRAG_SLOP = 6

/** Nama rambu jadi awal kalimat: "Dilarang parkir", bukan "Dilarang Parkir". */
function sentenceCase(name: string): string {
  const lower = name.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * Permainan "Kelompokkan rambu": dua belas rambu dipajang sebagai hiasan kafe
 * di tiga bidang, lalu dipindahkan ke empat kotak kayu jenis. Tiga jalur
 * interaksi yang setara:
 *
 * 1. ketuk rambu (memilih), ketuk kotak (menaruh);
 * 2. seret dengan pointer: `pointerdown` memilih, `pointermove` menggeser
 *    hantu lewat `ref.style.transform` (tanpa `setState` per frame), dan
 *    `pointerup` menilai titik lepas dengan `binAt`;
 * 3. papan tombol: Tab ke kartu, Enter/Space memilih (perilaku asli
 *    `<button>`), Tab ke kotak, Enter menaruh, Escape membatalkan pilihan.
 *
 * Tidak ada hukuman: salah menaruh hanya mengembalikan kartu dan mengatakan
 * jenis yang benar. `correct` menghitung rambu yang tepat pada percobaan
 * pertama, jadi anak yang mencoba dua kali tetap bisa menyelesaikan permainan.
 */
export default function Sortir({ seed, onDone, headingRef }: Props) {
  const cards = useMemo(() => sortirCards(seed), [seed])

  const [placed, setPlaced] = useState<Sign[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [live, setLive] = useState('')
  /** Kartu yang sedang diseret; satu-satunya `setState` sepanjang gestur. */
  const [dragCard, setDragCard] = useState<Sign | null>(null)

  const summaryRef = useRef<HTMLHeadingElement | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const binRefs = useRef<Map<Kind, HTMLButtonElement>>(new Map())
  const pendingFocusRef = useRef<PendingFocus>(null)
  const missedRef = useRef<Set<string>>(new Set())

  // Gestur seret: semuanya di ref supaya pointermove tidak memicu render.
  const rectsRef = useRef<Array<{ kind: Kind; box: Box }>>([])
  const pointRef = useRef({ x: 0, y: 0 })
  const originRef = useRef({ x: 0, y: 0 })
  const movedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const clickResetRef = useRef(0)

  const placedIds = new Set(placed.map((sign) => sign.id))
  const remaining = cards.filter((sign) => !placedIds.has(sign.id))
  const done = remaining.length === 0
  const bins = KIND_ORDER.map((kind) => ({
    kind,
    signs: placed.filter((sign) => sign.kind === kind),
  }))

  // Seed baru = permainan baru. App memasang ulang layar per masuk, tetapi
  // reset ini menjaga kontrak komponen tetap benar kalau seed berganti.
  const seedRef = useRef(seed)
  useEffect(() => {
    if (seedRef.current === seed) return
    seedRef.current = seed
    setPlaced([])
    setSelected(null)
    setCorrect(0)
    setLive('')
    setDragCard(null)
    missedRef.current = new Set()
  }, [seed])

  // Jalur dev `?s=sortir` membuka layar tanpa aksi panel, jadi App tidak punya
  // sasaran fokus. Jangan biarkan fokus tetap di <body>.
  useEffect(() => {
    if (document.activeElement === document.body) {
      headingRef?.current?.focus({ preventScroll: true })
    }
  }, [headingRef])

  // Fokus dipindah setelah DOM memperlihatkan hasil penempatan: ke kartu
  // berikutnya, atau ke judul ringkasan saat semua kartu habis.
  useLayoutEffect(() => {
    const target = pendingFocusRef.current
    if (!target) return
    if (target.type === 'card') {
      const el = cardRefs.current.get(target.id)
      if (!el) return
      pendingFocusRef.current = null
      el.focus({ preventScroll: true })
      return
    }
    pendingFocusRef.current = null
    summaryRef.current?.focus({ preventScroll: true })
  }, [placed, live])

  // Hantu dipasang di titik tekan pertama tanpa memicu render tambahan.
  useLayoutEffect(() => {
    const el = ghostRef.current
    if (!el) return
    el.style.transform = `translate3d(${pointRef.current.x}px, ${pointRef.current.y}px, 0)`
    el.style.visibility = 'hidden'
  }, [dragCard])

  const place = (cardId: string, kind: Kind) => {
    const card = cards.find((sign) => sign.id === cardId)
    if (!card || placedIds.has(cardId)) return
    const firstTry = !missedRef.current.has(cardId)
    const next = remaining.find((sign) => sign.id !== cardId) ?? null
    const finalCorrect = correct + (firstTry ? 1 : 0)

    if (card.kind === kind) {
      setPlaced((current) => [...current, card])
      setSelected(null)
      if (firstTry) setCorrect(finalCorrect)
      setLive(
        next === null
          ? `Semua hiasan sudah masuk kotaknya. Benar ${finalCorrect} dari ${cards.length} pada percobaan pertama.`
          : `Tepat! ${sentenceCase(card.name)} termasuk ${KINDS[kind].label.toLowerCase()}. ${placed.length + 1} dari ${cards.length}.`,
      )
      pendingFocusRef.current = next ? { type: 'card', id: next.id } : { type: 'summary' }
      return
    }

    missedRef.current.add(cardId)
    setSelected(null)
    setLive(
      `Belum tepat. ${sentenceCase(card.name)} termasuk ${KINDS[card.kind].label.toLowerCase()}, bukan ${KINDS[kind].label.toLowerCase()}.`,
    )
    pendingFocusRef.current = { type: 'card', id: card.id }
  }

  const selectCard = (id: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setSelected(id)
  }

  const placeSelected = (kind: Kind) => {
    if (!selected) {
      setLive('Pilih rambu dulu, ya. Ketuk rambu, lalu ketuk kotaknya.')
      return
    }
    place(selected, kind)
  }

  const cancelSelection = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !selected) return
    event.stopPropagation()
    setSelected(null)
    setLive('')
  }

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, card: Sign) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Safari tidak memfokuskan tombol saat diketuk; fokuskan sendiri supaya
    // fokus tidak pernah tertinggal di <body> sesudah gestur.
    event.currentTarget.focus({ preventScroll: true })
    pointRef.current = { x: event.clientX, y: event.clientY }
    originRef.current = { x: event.clientX, y: event.clientY }
    movedRef.current = false
    suppressClickRef.current = false
    // Kotak wadah dikumpulkan SEKALI di sini; pointermove cukup menulis
    // transform, jadi tidak ada pembacaan layout per frame.
    rectsRef.current = KIND_ORDER.flatMap((kind) => {
      const el = binRefs.current.get(kind)
      if (!el) return []
      const rect = el.getBoundingClientRect()
      return [
        {
          kind,
          box: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
          },
        },
      ]
    })
    setSelected(card.id)
    setDragCard(card)
  }

  // Pendengar gestur di `window`: pointer bisa lepas di luar kartu. Layout
  // effect (bukan effect biasa) memasangnya sebelum event pointer berikutnya.
  useLayoutEffect(() => {
    if (!dragCard) return

    const move = (event: PointerEvent) => {
      pointRef.current = { x: event.clientX, y: event.clientY }
      if (!movedRef.current) {
        const dx = event.clientX - originRef.current.x
        const dy = event.clientY - originRef.current.y
        if (Math.hypot(dx, dy) < DRAG_SLOP) return
        movedRef.current = true
        if (ghostRef.current) ghostRef.current.style.visibility = 'visible'
      }
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
      }
      if (event.cancelable) event.preventDefault()
    }

    const finish = (event: PointerEvent, dropped: boolean) => {
      pointRef.current = { x: event.clientX, y: event.clientY }
      const moved = movedRef.current
      const kind = dropped && moved ? binAt(event.clientX, event.clientY, rectsRef.current) : null
      movedRef.current = false
      setDragCard(null)

      if (kind) {
        place(dragCard.id, kind)
        return
      }
      if (!moved) return // ketuk: klik berikutnya yang memilih kartu
      // Lepas di luar kotak = batal. Klik susulan (kalau ada) diabaikan.
      suppressClickRef.current = true
      window.clearTimeout(clickResetRef.current)
      clickResetRef.current = window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      setSelected(null)
      setLive('')
      cardRefs.current.get(dragCard.id)?.focus({ preventScroll: true })
    }

    const onUp = (event: PointerEvent) => finish(event, true)
    const onCancel = (event: PointerEvent) => finish(event, false)

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [dragCard])

  // Timer penanda klik susulan dibersihkan saat komponen lepas.
  useEffect(() => () => window.clearTimeout(clickResetRef.current), [])

  return (
    <div className="sr" data-done={done || undefined} onKeyDown={cancelSelection}>
      <header className="sr-head">
        <h2 className="sr-title" ref={headingRef} tabIndex={-1}>
          Kelompokkan rambu
        </h2>
        <p className="sr-hint">
          Kamu belok kiri. Di ujung jalan ada kafe — dan hiasan rambunya berantakan.
        </p>
      </header>

      {/* Wilayah live tetap terpasang: pembaca layar harus mendengar hasil
          setiap penempatan, termasuk saat rambu salah kotak. */}
      <p className="sr-live sr-only" role="status" aria-live="polite" aria-atomic="true">
        {live}
      </p>

      <div className="sr-progress">
        <span className="sr-progress__text">
          {placed.length} dari {cards.length}
        </span>
        <span className="sr-progress__bar" aria-hidden="true">
          <span style={{ width: `${(placed.length / cards.length) * 100}%` }} />
        </span>
      </div>

      {/* Panggung: latar interior kafe + tiga bidang. Dua belas slot selalu
          dipetakan dari `cards` (bukan `remaining`), jadi rambu yang pindah
          meninggalkan paku di posisinya dan panggung tidak pernah reflow. */}
      <div className="sr-stage">
        <KafeScene className="sr-stage__art" />
        {SHELVES.map((shelf) => (
          <div
            key={shelf.key}
            className={`sr-shelf sr-shelf--${shelf.key}`}
            role="group"
            aria-label={shelf.label}
          >
            {cards.slice(shelf.from, shelf.to).map((card, offset) => {
              const slot = shelf.from + offset
              if (placedIds.has(card.id)) {
                return <span key={card.id} className="sr-paku" aria-hidden="true" />
              }
              return (
                <button
                  key={card.id}
                  type="button"
                  className="sr-pajang"
                  data-sign={card.id}
                  aria-pressed={selected === card.id}
                  data-dragging={dragCard?.id === card.id || undefined}
                  style={{ '--tilt': `${tiltFor(slot)}deg` } as CSSProperties}
                  ref={(el) => {
                    if (el) cardRefs.current.set(card.id, el)
                    else cardRefs.current.delete(card.id)
                  }}
                  onDragStart={(event) => event.preventDefault()}
                  onPointerDown={(event) => beginDrag(event, card)}
                  onClick={() => selectCard(card.id)}
                >
                  <SignArt art={card.art} size={shelf.size} />
                  <span className="sr-only">{card.name}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="sr-bins">
        {bins.map(({ kind, signs }) => (
          <button
            key={kind}
            type="button"
            className="sr-bin"
            data-kind={kind}
            aria-label={`Kotak ${KINDS[kind].label}`}
            style={{ '--kind-color': KINDS[kind].color } as CSSProperties}
            ref={(el) => {
              if (el) binRefs.current.set(kind, el)
              else binRefs.current.delete(kind)
            }}
            onClick={() => placeSelected(kind)}
          >
            <span className="sr-bin__head">
              <span className="sr-bin__label">{KINDS[kind].label}</span>
              <span className="sr-bin__role">{KIND_ROLE[kind]}</span>
            </span>
            <span className="sr-bin__slots">
              {signs.map((sign) => (
                <span className="sr-placed" key={sign.id}>
                  <SignArt art={sign.art} size={22} />
                  <span className="sr-only">{sign.name}</span>
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>

      {done && (
        <div className="sr-done" role="group" aria-labelledby="sr-done-title">
          <h3 id="sr-done-title" ref={summaryRef} tabIndex={-1}>
            Semua hiasan sudah masuk kotaknya!
          </h3>
          <p className="sr-done__text">
            Aku menaruh {cards.length} rambu. Tepat pada percobaan pertama: {correct} dari{' '}
            {cards.length}.
          </p>
          <button type="button" className="btn" onClick={() => onDone(correct)}>
            Selesai
          </button>
        </div>
      )}

      {dragCard && (
        <div className="sr-ghost" ref={ghostRef} aria-hidden="true">
          <SignArt art={dragCard.art} size={64} />
        </div>
      )}
    </div>
  )
}
