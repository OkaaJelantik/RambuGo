import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { QUESTIONS, SIGNS, type Question } from './data'
import { SignArt, describeSign } from './SignArt'
import { createRng } from './scene/spawner'
import { initialSeed } from './run'

/**
 * Kuis awal jalur Belajar: lima soal, satu soal per layar.
 *
 * Sama seperti kuis lama, dengan satu perbaikan: dulu kunci jawaban 4 dari 5
 * soal adalah huruf A, jadi anak bisa menang dengan menghafal posisi. Sekarang
 * urutan **tampil** opsi diacak per seed, sedangkan kunci tetap `q.answer`
 * (indeks asli di `QUESTIONS`). Posisi jawaban benar juga digilir 0 → 1 → 2
 * antar-soal, jadi tidak ada huruf yang selalu benar.
 *
 * Pola a11y: wilayah live sudah terpasang sebelum teks pertama (bukan lahir
 * bersama umpan balik), fokus tidak pernah jatuh ke `<body>`, dan prompt
 * membawa deskripsi gambar rambu karena gambarnya `aria-hidden`.
 */

/**
 * Rencana posisi **tampil** jawaban benar, satu per soal.
 *
 * Setiap blok tiga soal memuat posisi 0, 1, dan 2 tepat sekali, urutannya
 * diacak dari seed. Lima soal karena itu selalu mengunjungi ketiga posisi —
 * "pilih A terus" tidak pernah cukup — dan posisinya tidak dihafal antar-run
 * karena bloknya diacak. Kunci jawaban tetap `q.answer`.
 */
function rightPositions(seed: number, count: number): number[] {
  const rng = createRng(seed + 104729)
  const out: number[] = []
  while (out.length < count) {
    const block = [0, 1, 2]
    for (let i = block.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      ;[block[i], block[j]] = [block[j], block[i]]
    }
    out.push(...block)
  }
  return out.slice(0, count)
}

/**
 * Urutan tampil opsi untuk satu soal.
 *
 * Murni dan deterministik: seed yang sama menghasilkan urutan yang sama.
 * `question.answer` tetap indeks asli — array ini hanya memetakan indeks
 * tampil ke indeks asli, tidak pernah menggantikan kuncinya.
 */
export function optionOrder(question: Question, seed: number, questionIndex: number): number[] {
  const order = question.options.map((_, i) => i)
  const rng = createRng(seed + questionIndex * 7919)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const target = rightPositions(seed, QUESTIONS.length)[questionIndex] % order.length
  const at = order.indexOf(question.answer)
  ;[order[at], order[target]] = [order[target], order[at]]
  return order
}

type Props = {
  onDone: (score: number) => void
  /** Kartu soal; App memfokuskannya saat layar kuis menjadi tujuan fokus. */
  cardRef?: RefObject<HTMLDivElement | null>
}

export default function Kuis({ onDone, cardRef }: Props) {
  // Seed dibekukan sekali: urutan opsi tidak boleh berubah di tengah kuis.
  const [seed] = useState(initialSeed)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)

  const q = QUESTIONS[idx]
  const sign = q.signId ? SIGNS.find((s) => s.id === q.signId) : undefined
  const order = optionOrder(q, seed, idx)
  /** Posisi tampil jawaban benar (bukan `q.answer`: itu indeks asli). */
  const right = order.indexOf(q.answer)

  const nextRef = useRef<HTMLButtonElement>(null)
  const promptRef = useRef<HTMLParagraphElement>(null)
  const prevIdxRef = useRef(idx)

  const feedbackText =
    picked === null
      ? ''
      : `${picked === right ? 'Tepat sekali! ' : 'Belum tepat. '}${q.why}`

  // Wilayah live yang sama membawa umpan balik dan, saat jawaban menambah
  // skor, skor baru. `score` sudah diperbarui di render ini, jadi yang
  // diumumkan adalah angka yang terlihat anak.
  const liveText =
    picked === null
      ? ''
      : `${feedbackText}${picked === right ? ` Skor ${score} dari ${QUESTIONS.length}.` : ''}`

  // Memilih opsi menonaktifkan tombol yang sedang fokus, jadi fokus jatuh ke
  // <body>. Pindahkan ke "Soal berikutnya" yang tetap ada, dan gulirkan ke
  // dalam layar: pada 360×640 tombol ini lahir di bawah lipatan.
  useEffect(() => {
    if (picked === null) return
    nextRef.current?.scrollIntoView?.({ block: 'center' })
    nextRef.current?.focus({ preventScroll: true })
  }, [picked, idx])

  // Soal berganti dan tombol "Soal berikutnya" lepas dari DOM. Fokuskan
  // pertanyaan baru (tabIndex -1), bukan membiarkan fokus ke <body>.
  useEffect(() => {
    if (prevIdxRef.current === idx) return
    prevIdxRef.current = idx
    promptRef.current?.focus()
  }, [idx])

  // Jalur dev `?s=kuis` membuka layar tanpa aksi panel, jadi App tidak punya
  // sasaran fokus. Jangan biarkan fokus tetap di <body>.
  useEffect(() => {
    if (document.activeElement === document.body) promptRef.current?.focus()
  }, [])

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === right) setScore((s) => s + 1)
  }

  const next = () => {
    if (idx + 1 >= QUESTIONS.length) return onDone(score)
    setIdx(idx + 1)
    setPicked(null)
  }

  return (
    <div className="quiz-wrap">
      <h2 className="quiz-title">Kuis Rambu Lalu Lintas</h2>

      {/* Wilayah live tetap terpasang; teksnya yang berganti saat menjawab. */}
      <p className="quiz-live sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveText}
      </p>

      <div className="quiz-progress">
        <span>
          Soal {idx + 1}/{QUESTIONS.length}
        </span>
        <span className="bar">
          <span
            style={{ width: `${((idx + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
          />
        </span>
      </div>

      <div className="question-card" ref={cardRef} tabIndex={-1}>
        {sign && (
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: '0.8rem' }}>
            <SignArt art={sign.art} size={116} />
          </div>
        )}
        <p className="prompt" ref={promptRef} tabIndex={-1}>
          {q.prompt}
          {/* Gambar aria-hidden; deskripsi visual ikut pertanyaan supaya
              terbaca saat fokus mendarat di sini (termasuk tanpa melihat). */}
          {sign && <span className="sr-only"> {describeSign(sign)}.</span>}
        </p>

        <div className="options">
          {order.map((original, i) => {
            let cls = 'option'
            if (picked !== null) {
              if (original === q.answer) cls += ' correct'
              else if (i === picked) cls += ' wrong'
            }
            return (
              <button
                key={q.options[original]}
                className={cls}
                onClick={() => pick(i)}
                disabled={picked !== null}
              >
                {q.options[original]}
              </button>
            )
          })}
        </div>

        {picked !== null && (
          <>
            <p className={`feedback ${picked === right ? 'ok' : 'no'}`}>{feedbackText}</p>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={next} ref={nextRef}>
                {idx + 1 >= QUESTIONS.length ? 'Sampai di rumah →' : 'Soal berikutnya →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
