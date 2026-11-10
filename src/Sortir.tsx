import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { KINDS, type Kind, type Sign } from './data'
import { SignArt } from './SignArt'
import { KIND_ORDER, KIND_ROLE, binAt, sortirCards, type Box } from './sortir'
import { KafeScene } from './art/kafe'
import './sortir.css'

/**
 * Satu ukuran untuk dua belas hiasan. Dinding hanya diisi satu barisan rapi
 * (4 kolom × 3 baris di `.sr-board`), jadi tidak ada ukuran per bidang dan
 * tidak ada kemiringan: yang dipajang harus terbaca sebagai satu koleksi,
 * bukan barang yang tersebar acak.
 */
const SIGN_SIZE = 58

type Props = {
  seed: number
  onDone: (correct: number) => void
  /** Judul; App memfokuskannya saat layar sortir menjadi tujuan fokus. */
  headingRef?: RefObject<HTMLHeadingElement | null>
}

/** Sasaran fokus setelah DOM berubah; diputuskan sebelum render berikutnya. */
type PendingFocus = { type: 'bin'; kind: Kind } | { type: 'summary' } | { type: 'finish' } | null

/** Jarak (px) yang membuat sebuah tekan berubah menjadi seret, bukan ketuk. */
const DRAG_SLOP = 6

/** Nama rambu jadi awal kalimat: "Dilarang parkir", bukan "Dilarang Parkir". */
function sentenceCase(name: string): string {
  const lower = name.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * Permainan "Kelompokkan rambu": dua belas rambu dipajang sebagai hiasan kafe
 * di tiga bidang, lalu dipindahkan ke empat kotak kayu.
 *
 * Aturan mainnya sengaja longgar — **tidak ada penolakan**. Rambu boleh masuk
 * kotak mana pun; sistem baru menilai saat anak menekan "Sudah Selesai".
 * Penilaian yang gagal menandai rambu yang belum pas (tanda merah) dan anak
 * boleh memindahkannya dari kotak yang salah ke kotak lain, lalu menekan
 * tombol itu lagi. Layar selesai menyebut percobaan ke berapa yang berhasil.
 *
 * Tiga jalur interaksi tetap setara:
 *
 * 1. ketuk rambu (memilih), ketuk kepala kotak (menaruh);
 * 2. seret dengan pointer: `pointerdown` memilih, `pointermove` menggeser
 *    hantu lewat `ref.style.transform` (tanpa `setState` per frame), dan
 *    `pointerup` menilai titik lepas dengan `binAt`;
 * 3. papan tombol: Tab ke rambu, Enter/Space memilih, Tab ke kotak, Enter
 *    menaruh, Escape membatalkan pilihan. Rambu yang sudah di kotak juga
 *    tombol, jadi bisa dipilih lalu dipindah dengan papan tombol.
 */
export default function Sortir({ seed, onDone, headingRef }: Props) {
  const cards = useMemo(() => sortirCards(seed), [seed])

  /** rambuId → jenis kotak tempat hiasan itu sekarang. Satu-satunya sumber benar. */
  const [placedBy, setPlacedBy] = useState<Record<string, Kind>>({})
  const [selected, setSelected] = useState<string | null>(null)
  /** Rambu yang ditandai belum pas sesudah tombol "Sudah Selesai" ditekan. */
  const [wrong, setWrong] = useState<ReadonlySet<string>>(() => new Set<string>())
  const [attempts, setAttempts] = useState(0)
  /** Benar saat tombol ditekan pertama kali; App memakainya untuk bintang. */
  const [firstCorrect, setFirstCorrect] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [live, setLive] = useState('')
  /** Hiasan yang sedang diseret; satu-satunya `setState` sepanjang gestur. */
  const [dragCard, setDragCard] = useState<Sign | null>(null)

  const summaryRef = useRef<HTMLHeadingElement | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const finishRef = useRef<HTMLButtonElement | null>(null)
  const signRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const binHeadRefs = useRef<Map<Kind, HTMLButtonElement>>(new Map())
  const binRefs = useRef<Map<Kind, HTMLDivElement>>(new Map())
  const pendingFocusRef = useRef<PendingFocus>(null)
  /** Kotak asal saat menyeret dari dalam kotak; `null` = dari panggung. */
  const fromKindRef = useRef<Kind | null>(null)

  // Gestur seret: semuanya di ref supaya pointermove tidak memicu render.
  const rectsRef = useRef<Array<{ kind: Kind; box: Box }>>([])
  const pointRef = useRef({ x: 0, y: 0 })
  const originRef = useRef({ x: 0, y: 0 })
  const movedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const clickResetRef = useRef(0)

  const bins = KIND_ORDER.map((kind) => ({
    kind,
    signs: cards.filter((sign) => placedBy[sign.id] === kind),
  }))

  // Seed baru = permainan baru. App memasang ulang layar per masuk, tetapi
  // reset ini menjaga kontrak komponen tetap benar kalau seed berganti.
  const seedRef = useRef(seed)
  useEffect(() => {
    if (seedRef.current === seed) return
    seedRef.current = seed
    setPlacedBy({})
    setSelected(null)
    setWrong(new Set<string>())
    setAttempts(0)
    setFirstCorrect(null)
    setDone(false)
    setLive('')
    setDragCard(null)
  }, [seed])

  // Jalur dev `?s=sortir` membuka layar tanpa aksi panel, jadi App tidak punya
  // sasaran fokus. Jangan biarkan fokus tetap di <body>.
  useEffect(() => {
    if (document.activeElement === document.body) {
      headingRef?.current?.focus({ preventScroll: true })
    }
  }, [headingRef])

  // Fokus dipindah setelah DOM memperlihatkan hasilnya.
  useLayoutEffect(() => {
    const target = pendingFocusRef.current
    if (!target) return
    pendingFocusRef.current = null
    if (target.type === 'summary') {
      summaryRef.current?.focus({ preventScroll: true })
      return
    }
    if (target.type === 'finish') {
      finishRef.current?.focus({ preventScroll: true })
      return
    }
    binHeadRefs.current.get(target.kind)?.focus({ preventScroll: true })
  }, [placedBy, wrong, done, live])

  // Hantu dipasang di titik tekan pertama tanpa memicu render tambahan.
  useLayoutEffect(() => {
    const el = ghostRef.current
    if (!el) return
    el.style.transform = `translate3d(${pointRef.current.x}px, ${pointRef.current.y}px, 0)`
    el.style.visibility = 'hidden'
  }, [dragCard])

  /**
   * Menaruh (atau memindah) satu rambu ke satu kotak. Tidak menilai benar atau
   * salah: penilaian hanya terjadi di `finish()`. Tanda merah pada rambu ini
   * ikut hilang begitu ia dipindah, karena tanda itu milik penilaian sebelumnya.
   */
  const assign = (signId: string, kind: Kind, from: Kind | null) => {
    const sign = cards.find((candidate) => candidate.id === signId)
    if (!sign) return
    if (from === kind) {
      setSelected(null)
      return
    }
    setPlacedBy((current) => ({ ...current, [signId]: kind }))
    setSelected(null)
    setWrong((current) => {
      if (!current.has(signId)) return current
      const next = new Set(current)
      next.delete(signId)
      return next
    })
    setLive(
      from === null
        ? `${sentenceCase(sign.name)} masuk kotak ${KINDS[kind].label}.`
        : `${sentenceCase(sign.name)} dipindah ke kotak ${KINDS[kind].label}.`,
    )
    pendingFocusRef.current = { type: 'bin', kind }
  }

  const selectSign = (id: string) => {
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
    assign(selected, kind, placedBy[selected] ?? null)
  }

  const cancelSelection = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !selected) return
    event.stopPropagation()
    setSelected(null)
    setLive('')
  }

  /**
   * Satu-satunya tempat yang menilai. Setiap tekanan menghitung satu
   * percobaan, termasuk tekanan pertama yang masih salah; keberhasilan
   * dilaporkan bersama nomor percobaannya.
   */
  const finish = () => {
    const attemptNumber = attempts + 1
    const wrongIds = cards.filter((sign) => placedBy[sign.id] !== sign.kind).map((sign) => sign.id)
    const correctNow = cards.length - wrongIds.length
    setAttempts(attemptNumber)
    setFirstCorrect((current) => (current === null ? correctNow : current))

    if (wrongIds.length === 0) {
      setWrong(new Set<string>())
      setDone(true)
      setLive(
        `Berhasil dalam percobaan ke-${attemptNumber}. Semua ${cards.length} rambu ada di kotak yang tepat.`,
      )
      pendingFocusRef.current = { type: 'summary' }
      return
    }

    setWrong(new Set(wrongIds))
    setLive(
      `${wrongIds.length} rambu belum pas. Pindahkan rambu bertanda merah ke kotak lain, lalu tekan Sudah Selesai lagi.`,
    )
    pendingFocusRef.current = { type: 'finish' }
  }

  const beginDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    sign: Sign,
    fromKind: Kind | null,
  ) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Safari tidak memfokuskan tombol saat diketuk; fokuskan sendiri supaya
    // fokus tidak pernah tertinggal di <body> sesudah gestur.
    event.currentTarget.focus({ preventScroll: true })
    pointRef.current = { x: event.clientX, y: event.clientY }
    originRef.current = { x: event.clientX, y: event.clientY }
    movedRef.current = false
    suppressClickRef.current = false
    fromKindRef.current = fromKind
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
    setSelected(sign.id)
    setDragCard(sign)
  }

  // Pendengar gestur di `window`: pointer bisa lepas di luar kotak. Layout
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

    const finishDrag = (event: PointerEvent, dropped: boolean) => {
      pointRef.current = { x: event.clientX, y: event.clientY }
      const moved = movedRef.current
      const kind = dropped && moved ? binAt(event.clientX, event.clientY, rectsRef.current) : null
      const from = fromKindRef.current
      movedRef.current = false
      fromKindRef.current = null
      setDragCard(null)

      if (kind) {
        assign(dragCard.id, kind, from)
        return
      }
      if (!moved) return // ketuk: klik berikutnya yang memilih rambu
      // Lepas di luar kotak = batal. Klik susulan (kalau ada) diabaikan.
      suppressClickRef.current = true
      window.clearTimeout(clickResetRef.current)
      clickResetRef.current = window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      setSelected(null)
      setLive('')
      signRefs.current.get(dragCard.id)?.focus({ preventScroll: true })
    }

    const onUp = (event: PointerEvent) => finishDrag(event, true)
    const onCancel = (event: PointerEvent) => finishDrag(event, false)

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
          Kelompokkan Rambu
        </h2>
        <p className="sr-hint">
          Kamu menyebrang lurus. Di ujung jalan ada sebuah kafe!. Dekorasinya terlihat berantakan.
        </p>
      </header>

      {/* Wilayah live tetap terpasang: pembaca layar harus mendengar hasil
          penilaian, bukan hanya perubahan visual. */}
      <p className="sr-live sr-only" role="status" aria-live="polite" aria-atomic="true">
        {live}
      </p>

      {/* Panggung: dinding kafe polos + satu papan 4 × 3. Dua belas slot selalu
          dipetakan dari `cards` (bukan dari sisa), jadi hiasan yang pindah
          meninggalkan paku di posisinya dan panggung tidak pernah reflow. */}
      <div className="sr-stage">
        <KafeScene className="sr-stage__art" />
        <div className="sr-board" role="group" aria-label="Dinding pajangan">
          {cards.map((card) => {
            if (placedBy[card.id] !== undefined) {
              return <span key={card.id} className="sr-paku" aria-hidden="true" />
            }
            return (
              <button
                key={card.id}
                type="button"
                className="sr-pajang"
                data-sign={card.id}
                data-wrong={wrong.has(card.id) || undefined}
                data-dragging={dragCard?.id === card.id || undefined}
                aria-pressed={selected === card.id}
                ref={(el) => {
                  if (el) signRefs.current.set(card.id, el)
                  else signRefs.current.delete(card.id)
                }}
                onDragStart={(event) => event.preventDefault()}
                onPointerDown={(event) => beginDrag(event, card, null)}
                onClick={() => selectSign(card.id)}
              >
                <SignArt art={card.art} size={SIGN_SIZE} />
                <span className="sr-only">{card.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sr-bins">
        {bins.map(({ kind, signs }) => {
          const headLabel = `Kotak ${KINDS[kind].label}`
          const hasWrong = signs.some((sign) => wrong.has(sign.id))
          return (
            <div
              key={kind}
              className="sr-bin"
              data-kind={kind}
              data-wrong={hasWrong || undefined}
              role="group"
              aria-label={headLabel}
              ref={(el) => {
                if (el) binRefs.current.set(kind, el)
                else binRefs.current.delete(kind)
              }}
            >
              {/* Kepala kotak = tombol "taruh di sini". Kotak sendiri bukan
                  tombol supaya hiasan di dalamnya bisa jadi tombol sendiri
                  (HTML tidak boleh menyarangkan tombol di dalam tombol). */}
              <button
                type="button"
                className="sr-bin__head"
                aria-label={headLabel}
                ref={(el) => {
                  if (el) binHeadRefs.current.set(kind, el)
                  else binHeadRefs.current.delete(kind)
                }}
                onClick={() => placeSelected(kind)}
              >
                <span className="sr-bin__label">{KINDS[kind].label}</span>
                <span className="sr-bin__role">{KIND_ROLE[kind]}</span>
              </button>
              {/* Lebih dari empat hiasan di satu kotak ditumpuk, bukan
                  dibungkus ke baris baru: tinggi kotak jadi tetap, jadi
                  panggung tidak pernah tergelincir dan layar tidak bergulir
                  walau anak menumpuk semua hiasan di satu kotak. */}
              <div
                className={`sr-bin__slots${signs.length > 4 ? ' sr-bin__slots--stack' : ''}`}
              >
                {signs.map((sign) => (
                  <button
                    key={sign.id}
                    type="button"
                    className="sr-placed"
                    data-sign={sign.id}
                    data-wrong={wrong.has(sign.id) || undefined}
                    aria-pressed={selected === sign.id}
                    aria-label={`${sign.name}, di kotak ${KINDS[kind].label}`}
                    ref={(el) => {
                      if (el) signRefs.current.set(sign.id, el)
                      else signRefs.current.delete(sign.id)
                    }}
                    onDragStart={(event) => event.preventDefault()}
                    onPointerDown={(event) => beginDrag(event, sign, kind)}
                    onClick={() => selectSign(sign.id)}
                  >
                    <SignArt art={sign.art} size={22} />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!done && (
        <div className="sr-finish">
          <button type="button" className="btn" ref={finishRef} onClick={finish}>
            Sudah Selesai
          </button>
        </div>
      )}

      {done && (
        <div className="sr-done" role="group" aria-labelledby="sr-done-title">
          <h3 id="sr-done-title" ref={summaryRef} tabIndex={-1}>
            Berhasil dalam percobaan ke-{attempts}.
          </h3>
          <p className="sr-done__text">
            Semua {cards.length} rambu ada di kotak yang tepat.
          </p>
          <button type="button" className="btn" onClick={() => onDone(firstCorrect ?? cards.length)}>
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
