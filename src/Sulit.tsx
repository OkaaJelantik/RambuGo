import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { CASES, TOTAL_DECISIONS, orderedOptions, type CaseAsk } from './sulit'
import { SulitScene } from './art/sulitScene'
import { initialSeed } from './run'
import './sulit.css'

/**
 * Layar "Studi Kasus Rambu": lima kasus, tiap kasus tiga tahap
 * (makna → alasan → tindakan), jadi 15 keputusan.
 *
 * Bentuknya mengikuti contoh `Assets/ExampleLevelHard.jpeg`: satu gambar situasi
 * di atas (jalan + rambu kasus itu), lalu blok "Cerita" yang hanya muncul di
 * tahap pertama kasus, lalu blok "Tantangan N" untuk tahap yang sedang dijawab.
 * Susunannya **satu tahap per layar** — bukan tiga blok bertumpuk seperti di
 * contoh — karena di 360×640 tiga blok sekaligus membuat layar menggulir, dan
 * umpan balik harus terbaca tanpa menggulir (handoff §10).
 *
 * Pola interaksi dan a11y-nya sama dengan kuis lama, bukan pola baru: wilayah
 * live sudah terpasang sebelum teks pertama, kunci jawaban menempel pada
 * `correct` (bukan posisi huruf), dan fokus tidak pernah jatuh ke `<body>`.
 */

/** Judul tahap, dari contoh: "Analisis Makna Rambu", "Berikan Alasan", "Tentukan Tindakan". */
const STAGE_TITLE: Record<CaseAsk, string> = {
  makna: 'Analisis Makna Rambu',
  alasan: 'Berikan Alasan',
  tindakan: 'Tentukan Tindakan',
}

type Props = {
  onDone: (score: number) => void
  /** Kartu soal; App memfokuskannya saat layar kuis menjadi tujuan fokus. */
  cardRef?: RefObject<HTMLDivElement | null>
}

export default function Sulit({ onDone, cardRef }: Props) {
  // Seed dibekukan sekali: urutan opsi tidak boleh berubah di tengah kasus.
  const [seed] = useState(initialSeed)
  const [caseIndex, setCaseIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)

  const kase = CASES[caseIndex]
  const step = kase.steps[stepIndex]
  const options = useMemo(
    () => orderedOptions(caseIndex, stepIndex, seed),
    [caseIndex, stepIndex, seed],
  )
  /** Nomor keputusan 1–15; satu-satunya angka yang dilihat anak. */
  const decision = caseIndex * 3 + stepIndex
  const isLast = decision + 1 >= TOTAL_DECISIONS
  const right = options.findIndex((option) => option.correct)

  const nextRef = useRef<HTMLButtonElement>(null)
  const promptRef = useRef<HTMLParagraphElement>(null)
  const shownRef = useRef(`${caseIndex}:${stepIndex}`)

  // Wilayah live sudah terpasang sejak render pertama; teksnya yang berganti.
  // Anak yang menjawab benar mendengar skornya sekalian, yang salah hanya
  // alasannya — skor tidak berubah, jadi tidak perlu dibacakan.
  const liveText =
    picked === null
      ? ''
      : picked === right
        ? `${step.why} Skor ${score} dari ${TOTAL_DECISIONS}.`
        : step.why

  // Memilih opsi menonaktifkan tombol yang sedang fokus, jadi fokus jatuh ke
  // <body>. Pindahkan ke tombol lanjut yang tetap ada, dan gulirkan ke dalam
  // layar: di 360×640 tombol ini lahir di bawah lipatan.
  useEffect(() => {
    if (picked === null) return
    nextRef.current?.scrollIntoView?.({ block: 'center' })
    nextRef.current?.focus({ preventScroll: true })
  }, [picked, decision])

  // Tahap atau kasus berganti dan tombol lanjut lepas dari DOM. Fokuskan
  // pertanyaan baru (tabIndex -1), bukan membiarkan fokus ke <body>.
  useEffect(() => {
    const key = `${caseIndex}:${stepIndex}`
    if (shownRef.current === key) return
    shownRef.current = key
    promptRef.current?.focus()
  }, [caseIndex, stepIndex])

  // Jalur dev `?s=kuis` membuka layar tanpa aksi panel, jadi App tidak punya
  // sasaran fokus. Jangan biarkan fokus tetap di <body>.
  useEffect(() => {
    if (document.activeElement === document.body) promptRef.current?.focus()
  }, [])

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (options[i].correct) setScore((s) => s + 1)
  }

  const next = () => {
    if (stepIndex < kase.steps.length - 1) {
      setStepIndex(stepIndex + 1)
      setPicked(null)
      return
    }
    if (caseIndex + 1 < CASES.length) {
      setCaseIndex(caseIndex + 1)
      setStepIndex(0)
      setPicked(null)
      return
    }
    onDone(score)
  }

  return (
    <div className="quiz-wrap sulit-wrap">
      <h2 className="quiz-title">Studi Kasus Rambu</h2>

      <p className="quiz-live sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveText}
      </p>

      <div className="quiz-progress">
        <span>
          Tahap {decision + 1}/{TOTAL_DECISIONS}
        </span>
        <span className="bar">
          <span
            style={{
              width: `${((decision + (picked !== null ? 1 : 0)) / TOTAL_DECISIONS) * 100}%`,
            }}
          />
        </span>
      </div>

      <div className="question-card sulit-card" ref={cardRef} tabIndex={-1}>
        {/* Gambar situasi: langit, bukit, rumput, jalan, dan rambu kasus ini
            berdiri di tepinya. `key` per keputusan membuat kilau perhatian di
            rambu diputar ulang tiap tahap, bukan hanya saat kasus berganti. */}
        <SulitScene
          key={decision}
          art={kase.sign.art}
          caseId={kase.id}
          caseIndex={caseIndex}
        />

        {stepIndex === 0 && (
          <p className="sulit-story">
            <span className="sulit-story-label">Cerita.</span> {kase.story}
          </p>
        )}

        <h3 className="sulit-stage">
          Tantangan {stepIndex + 1}: {STAGE_TITLE[step.ask]}
        </h3>

        <p className="prompt" ref={promptRef} tabIndex={-1}>
          {step.prompt}
          {/* Gambar aria-hidden; deskripsi visual ikut pertanyaan supaya terbaca
              saat fokus mendarat di sini. `visual` tidak memuat `name` maupun
              teks jawaban tahap makna. */}
          <span className="sr-only"> Rambu {kase.sign.visual}.</span>
        </p>

        <div className="options">
          {options.map((option, i) => {
            let cls = 'option'
            if (picked !== null) {
              if (option.correct) cls += ' correct'
              else if (i === picked) cls += ' wrong'
            }
            return (
              <button
                key={option.text}
                className={cls}
                onClick={() => pick(i)}
                disabled={picked !== null}
              >
                {option.text}
              </button>
            )
          })}
        </div>

        {picked !== null && (
          <>
            <p className={`feedback ${picked === right ? 'ok' : 'no'}`}>{step.why}</p>
            <div className="sulit-next">
              <button className="btn" onClick={next} ref={nextRef}>
                {isLast ? 'Sampai di rumah →' : 'Tahap berikutnya →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
