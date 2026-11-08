import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { KINDS, QUESTIONS, SIGNS, type Kind, type Sign } from './data'
import { advanceRun, batchOf, createRun, initialSeed, type Run } from './run'
import { SignArt, describeSign } from './SignArt'
import Classroom from './Classroom'
import WalkScene from './WalkScene'
import Crossroad from './Crossroad'
import Kid from './Kid'
import DialoguePanel from './DialoguePanel'
import { beatById, openingFor, stopBeat, type StoryButton, type StoryId } from './story'

type Stage = 'intro' | 'walk' | 'crossroad' | 'materi' | 'kuis' | 'home'

function HomeHouse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden="true">
      <rect x="22" y="62" width="116" height="72" rx="8" fill="#FFF3DA" />
      <polygon points="80,6 154,64 6,64" fill="var(--red)" />
      <polygon points="80,6 154,64 80,64" fill="#C93A35" />
      <rect x="66" y="88" width="28" height="46" rx="5" fill="#B4653A" />
      <circle cx="88" cy="112" r="2.6" fill="#FFD76A" />
      <rect x="32" y="78" width="24" height="22" rx="4" fill="var(--sky-1)" stroke="#FFF3DA" strokeWidth="3" />
      <rect x="104" y="78" width="24" height="22" rx="4" fill="var(--sky-1)" stroke="#FFF3DA" strokeWidth="3" />
      <rect x="124" y="26" width="14" height="30" rx="4" fill="#B4653A" />
    </svg>
  )
}

/** Teks chip: jenis + bentuknya. Petunjuk & perintah sama-sama biru, jadi
 *  bentuknya yang harus terbaca dari chip. */
function kindChipText(kind: Kind) {
  const { label, shape } = KINDS[kind]
  return `${label} · ${shape.split(' ')[0]}`
}

function SignSheet({
  sign,
  opening,
  onClose,
  cta,
  fallbackFocus,
}: {
  sign: Sign
  /** Baris pembuka Aku di atas arti; hanya rambu yang ada di naskah. */
  opening?: string
  onClose: () => void
  cta: string
  /** Fokus cadangan bila pemicu asli tidak bisa difokuskan lagi. */
  fallbackFocus?: RefObject<HTMLElement | null>
}) {
  const ctaRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Pindahkan fokus ke dalam lembar saat dibuka, kembalikan saat ditutup.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ctaRef.current?.focus()
    return () => {
      // Pemicu bisa saja sudah lepas dari DOM, dinonaktifkan oleh langkah
      // berikutnya (rambu walk), atau memang <body> saat lembar dibuka tanpa
      // fokus. Jangan pernah memulihkan fokus ke <body>.
      const canRestore =
        previous !== null &&
        previous !== document.body &&
        previous.isConnected &&
        !previous.matches(':disabled, [aria-disabled="true"]')
      // Di jalur walk, pemicu masih terlihat aktif saat cleanup tetapi langkah
      // berikutnya langsung menonaktifkannya; fokus yang dipulihkan ke sana
      // akan jatuh ke <body>. Karena itu target eksplisit selalu menang.
      const target = fallbackFocus?.current ?? (canRestore ? previous : null)
      target?.focus()
    }
  }, [fallbackFocus])

  // Escape dan Tab ditangani di document agar tetap berlaku walau fokus
  // sudah lepas ke <body> (mis. setelah klik teks di dalam lembar).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const items = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      // Fokus di luar lembar: tarik kembali ke ujung sesuai arah Tab.
      if (!items.includes(active as HTMLElement)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
        return
      }
      if (e.shiftKey ? active === first : active === last) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="overlay">
      <div
        className="sheet chat"
        role="dialog"
        aria-modal="true"
        aria-label={`Rambu ${sign.name}`}
        ref={sheetRef}
      >
        <div className="art">
          <SignArt art={sign.art} size={124} />
        </div>
        <span
          className="kind-chip"
          style={{ '--kind-color': KINDS[sign.kind].color } as CSSProperties}
        >
          Rambu {kindChipText(sign.kind)}
        </span>
        <p className="kind-shape">Bentuk: {KINDS[sign.kind].shape}</p>

        <div className="chat-row">
          <div className="chat-avatar" aria-hidden="true">
            <Kid />
          </div>
          <div className="chat-bubble">
            <h3>{sign.name}</h3>
            {opening && <p className="sheet-opening">{opening}</p>}
            <p>{sign.meaning}</p>
          </div>
        </div>

        <p className="tip">{sign.tip}</p>
        <div className="actions">
          <button className="btn" onClick={onClose} ref={ctaRef}>
            {cta}
          </button>
        </div>
      </div>
    </div>
  )
}

const STAGES: Stage[] = ['intro', 'walk', 'crossroad', 'materi', 'kuis', 'home']
// ?s=walk untuk lompat langsung ke satu adegan (buat cek tampilan).
// Parameter ini alat bantu developer, jadi hanya dibaca di build dev.
const devParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
const start = devParams?.get('s') as Stage | null
const initial: Stage = start && STAGES.includes(start) ? start : 'intro'

/** Beat untuk tiap leg dan tiap rambu; urutannya mengikat (naskah). */
const LEG_BEATS: StoryId[] = ['leg-1', 'leg-2', 'leg-3']
/** Satu id perhentian; kalimatnya diturunkan dari rambu yang berdiri di depan. */
const STOP_BEAT: StoryId = 'stop'

/** Kalimat leg tampil otomatis lalu hilang sendiri; ±3 detik. */
const LEG_BEAT_MS = 3000

/**
 * Lapis kedua setelah celah CSS: sheet kini berhenti ±35 px di atas baris
 * tombol panel (360×640), tetapi ketukan jempol bisa melebar. Abaikan aksi
 * panel selama 300 ms sesudah lembar tutup supaya ketuk ganda tidak
 * mendarat di "Lanjut jalan" dan melewati rambu.
 */
const SHEET_GUARD_MS = 300

/**
 * Sasaran fokus setelah sebuah aksi. Tombol yang diklik (tombol panel atau
 * tombol layar) hampir selalu ikut lepas dari DOM, jadi fokus harus pindah
 * ke sesuatu yang tetap ada — tidak pernah dibiarkan jatuh ke `<body>`.
 */
type FocusTarget = 'walk' | 'home' | 'intro' | 'materi' | 'quiz'

function beatAt(beats: StoryId[], step: number): StoryId {
  return beats[Math.min(Math.max(step, 0), beats.length - 1)]
}

/** Beat awal mengikuti adegan yang dibuka lewat URL. */
function startBeat(stage: Stage, walked: number): StoryId | null {
  if (stage === 'intro') return 'intro'
  if (stage === 'walk') return beatAt(LEG_BEATS, walked)
  if (stage === 'crossroad') return 'crossroad'
  if (stage === 'materi') return 'materi'
  if (stage === 'home') return 'home'
  // Kuis: panel tidak tampil selama soal; beat kuis menyusul di layar rumah.
  return null
}

export default function App() {
  const still = devParams?.has('still') ?? false
  const [stage, setStage] = useState<Stage>(initial)
  const [walked, setWalked] = useState(() => {
    const v = Number(devParams?.get('step'))
    return Number.isFinite(v) && v > 0 ? Math.min(v, 2) : 0
  })
  const [beatId, setBeatId] = useState<StoryId | null>(() => {
    const v = Number(devParams?.get('step'))
    const step = Number.isFinite(v) && v > 0 ? Math.min(v, 2) : 0
    return startBeat(initial, step)
  })
  const [run, setRun] = useState<Run>(() => createRun(initialSeed()))
  const batch = batchOf(run)
  const [open, setOpen] = useState<Sign | null>(null)
  const [materiOpen, setMateriOpen] = useState<Sign | null>(null)
  const walkSceneRef = useRef<HTMLDivElement | null>(null)
  const classroomHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const materiHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const homeHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const quizCardRef = useRef<HTMLDivElement | null>(null)
  const pendingFocusRef = useRef<FocusTarget | null>(null)
  // -Infinity: aksi panel sebelum lembar pertama pernah ditutup tidak ditahan.
  const sheetClosedAtRef = useRef(-Infinity)
  const [via, setVia] = useState<'materi' | 'kuis' | null>(null)
  const [score, setScore] = useState(0)

  /** Catat waktu tutup lembar; aksi panel sesudahnya ditahan sebentar. */
  const closeWalkSheet = () => {
    sheetClosedAtRef.current = performance.now()
    setOpen(null)
  }

  const closeMateriSheet = () => {
    sheetClosedAtRef.current = performance.now()
    setMateriOpen(null)
  }

  const restart = () => {
    pendingFocusRef.current = 'intro'
    setStage('intro')
    setWalked(0)
    setBeatId('intro')
    setOpen(null)
    setMateriOpen(null)
    setVia(null)
    setScore(0)
  }

  // Kalimat leg hanya singgah: hilang sendiri setelah ±3 detik. Kalau dunia
  // sudah berhenti lebih dulu dan beat stop sudah tampil, timer ini tidak
  // boleh menghapusnya (karena itu updater fungsional).
  useEffect(() => {
    if (!beatId || !beatId.startsWith('leg-')) return
    const id = beatId
    const timer = window.setTimeout(() => {
      setBeatId((current) => (current === id ? null : current))
    }, LEG_BEAT_MS)
    return () => window.clearTimeout(timer)
  }, [beatId])

  // Tombol yang diklik hampir selalu ikut terlepas bersama beat. Pindahkan
  // fokus sesudah adegan baru terpasang dan sebelum animasi keluar panel
  // sempat menyembunyikannya — jangan biarkan fokus jatuh ke <body>.
  useLayoutEffect(() => {
    const target = pendingFocusRef.current
    if (!target) return
    pendingFocusRef.current = null

    if (target === 'walk') walkSceneRef.current?.focus()
    else if (target === 'home') homeHeadingRef.current?.focus()
    else if (target === 'intro') classroomHeadingRef.current?.focus()
    else if (target === 'materi') materiHeadingRef.current?.focus()
    else quizCardRef.current?.focus()
  }, [stage, beatId])

  const continueWalk = () => {
    if (stage === 'intro') {
      pendingFocusRef.current = 'walk'
      setStage('walk')
      setWalked(0)
      setBeatId(beatAt(LEG_BEATS, 0))
      return
    }
    if (stage !== 'walk') return

    if (walked + 1 >= batch.length) {
      // Persimpangan memfokuskan judulnya sendiri saat terpasang.
      setStage('crossroad')
      setBeatId('crossroad')
    } else {
      // Tombol "Lanjut jalan" ikut terlepas; wadah scene tetap ada, jadi
      // fokus ditahan di sana sebelum tombolnya hilang.
      walkSceneRef.current?.focus()
      setWalked(walked + 1)
      setBeatId(beatAt(LEG_BEATS, walked + 1))
    }
  }

  const handleAction = (button: StoryButton) => {
    // Ketukan yang menghapus lembar langsung menembus ke tombol panel di
    // bawahnya. Tahan aksi panel sebentar supaya ketuk ganda tidak melewati
    // rambu; setelah 300 ms tombol yang sama berfungsi normal lagi.
    if (performance.now() - sheetClosedAtRef.current < SHEET_GUARD_MS) return

    switch (button.action) {
      case 'continue':
        continueWalk()
        return
      case 'learn':
        if (stage === 'walk') setOpen(batch[walked])
        return
      case 'explore':
        // Lurus: perjalanan kaki berikutnya dengan antrean yang diacak ulang.
        pendingFocusRef.current = 'walk'
        setRun((current) => advanceRun(current))
        setWalked(0)
        setStage('walk')
        setBeatId(beatAt(LEG_BEATS, 0))
        return
      case 'materi':
        pendingFocusRef.current = 'materi'
        setVia('materi')
        setStage('materi')
        setBeatId('materi')
        return
      case 'kuis':
        // Panel tidak menemani soal; beat kuis muncul sebagai pembuka hasil.
        // Lewat persimpangan berarti jalur kuis; lewat papan materi tetap
        // dihitung jalur materi.
        if (beatId === 'crossroad') setVia('kuis')
        pendingFocusRef.current = 'quiz'
        setStage('kuis')
        setBeatId(null)
        return
      case 'home':
        // "Selesai" menutup kuis, "Pulang" menutup panel di rumah. Keduanya
        // mendarat di judul rumah yang tetap terpasang.
        pendingFocusRef.current = 'home'
        if (beatId === 'kuis') setBeatId('home')
        else if (beatId === 'home') setBeatId(null)
        else {
          setStage('home')
          setBeatId('home')
        }
        return
      case 'restart':
        restart()
        return
    }
  }

  return (
    <div className={still ? 'app still' : 'app'}>
      {stage === 'intro' && (
        <section className="screen" key="intro">
          <Classroom
            headingRef={classroomHeadingRef}
            onStart={() => {
              pendingFocusRef.current = 'walk'
              setWalked(0)
              setStage('walk')
              setBeatId(beatAt(LEG_BEATS, 0))
            }}
          />
        </section>
      )}

      {stage === 'walk' && (
        <section className="screen" key="walk">
          <WalkScene
            step={walked}
            onOpen={(sign) => setOpen(sign)}
            onStop={() => setBeatId(STOP_BEAT)}
            onSignTap={() => setBeatId(STOP_BEAT)}
            sceneRef={walkSceneRef}
          />
          {open && (
            <SignSheet
              sign={open}
              opening={openingFor(open.id)}
              onClose={closeWalkSheet}
              cta="Tutup"
              fallbackFocus={walkSceneRef}
            />
          )}
        </section>
      )}

      {stage === 'crossroad' && (
        <section className="screen dlg-space" key="crossroad">
          <Crossroad
            onMateri={() => {
              pendingFocusRef.current = 'materi'
              setVia('materi')
              setStage('materi')
              setBeatId('materi')
            }}
            onKuis={() => {
              pendingFocusRef.current = 'quiz'
              setVia('kuis')
              setStage('kuis')
              setBeatId(null)
            }}
          />
        </section>
      )}

      {stage === 'materi' && (
        <section className="screen materi-screen dlg-space" key="materi">
          <div className="screen-head">
            <h2 ref={materiHeadingRef} tabIndex={-1}>
              Jalur Materi
            </h2>
            <p>Klik rambu untuk tahu artinya.</p>
          </div>
          <div className="grid">
            {SIGNS.map((s) => (
              <button key={s.id} className="sign-card" onClick={() => setMateriOpen(s)}>
                <div className="art">
                  <SignArt art={s.art} size={80} />
                </div>
                <h4>{s.name}</h4>
                <span
                  className="kind-chip"
                  style={{ '--kind-color': KINDS[s.kind].color } as CSSProperties}
                >
                  {kindChipText(s.kind)}
                </span>
              </button>
            ))}
          </div>
          {materiOpen && (
            <SignSheet
              sign={materiOpen}
              opening={openingFor(materiOpen.id)}
              onClose={closeMateriSheet}
              cta="Tutup"
            />
          )}
        </section>
      )}

      {stage === 'kuis' && (
        <section className="screen quiz-screen" key="kuis">
          <Quiz
            cardRef={quizCardRef}
            onDone={(s) => {
              pendingFocusRef.current = 'home'
              setScore(s)
              setStage('home')
              // Beat kuis ("Kalau benar, aku dapat bintang.") membuka layar hasil.
              setBeatId('kuis')
            }}
          />
        </section>
      )}

      {stage === 'home' && (
        <section
          className={`screen home-screen${beatId ? ' dlg-space' : ''}`}
          key="home"
        >
          <div className="home-card">
            <div className="house">
              <HomeHouse />
            </div>
            <h2
              ref={homeHeadingRef}
              tabIndex={-1}
              style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)' }}
            >
              Kamu sampai di rumah!
            </h2>
            <p className="muted" style={{ marginTop: '0.4rem' }}>
              {via === 'materi'
                ? 'Kamu belajar dulu, lalu mengerjakan kuis.'
                : via === 'kuis'
                  ? 'Kamu berani mencoba kuis lebih dulu.'
                  : 'Petualangan selesai.'}
            </p>

            <div className="badge-card">
              <div className="label">Lencana kamu</div>
              <div className="title">🚸 Sahabat Rambu Lalu Lintas</div>
            </div>

            <div className="score-line">
              <span className="score-pill">Benar {score}/{QUESTIONS.length}</span>
              <span className="score-pill">{score >= 4 ? 'Bintang 3 ⭐' : score >= 2 ? 'Bintang 2 ⭐' : 'Bintang 1 ⭐'}</span>
            </div>

            <button className="btn" onClick={restart}>
              Main lagi dari kelas
            </button>
          </div>
        </section>
      )}

      {/*
        Panel hidup di luar section adegan supaya selalu di bawah layar dan
        tidak ikut animasi masuk layar. Di kelas panel tidak digambar: kartu
        kelas sudah memuat kalimat intro dan tombol "Keluar kelas"-nya sendiri.
      */}
      <DialoguePanel
        beat={
          stage === 'intro'
            ? null
            : beatId === STOP_BEAT
              ? stopBeat(batch[walked])
              : beatById(beatId)
        }
        onAction={handleAction}
      />
    </div>
  )
}

function Quiz({
  onDone,
  cardRef,
}: {
  onDone: (score: number) => void
  /** Kartu soal; App memfokuskannya saat layar kuis menjadi tujuan fokus. */
  cardRef?: RefObject<HTMLDivElement | null>
}) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const q = QUESTIONS[idx]
  const sign = q.signId ? SIGNS.find((s) => s.id === q.signId) : undefined
  const nextRef = useRef<HTMLButtonElement>(null)
  const promptRef = useRef<HTMLParagraphElement>(null)
  const prevIdxRef = useRef(idx)

  const feedbackText =
    picked === null
      ? ''
      : `${picked === q.answer ? 'Tepat sekali! ' : 'Belum tepat. '}${q.why}`

  // The same polite region carries the feedback and, when an answer adds a
  // point, the new score. `score` is already updated in this render, so the
  // announcement names the score the child can see.
  const liveText =
    picked === null
      ? ''
      : `${feedbackText}${picked === q.answer ? ` Skor ${score} dari ${QUESTIONS.length}.` : ''}`

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
  // sasaran fokus. Jangan biarkan fokus tetap di <body> (DoD §14.4); saat
  // masuk lewat "Ke kuis", App sudah memfokuskan kartu, jadi ini no-op.
  useEffect(() => {
    if (document.activeElement === document.body) promptRef.current?.focus()
  }, [])

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === q.answer) setScore((s) => s + 1)
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
      <p
        className="quiz-live sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveText}
      </p>

      <div className="quiz-progress">
        <span>
          Soal {idx + 1}/{QUESTIONS.length}
        </span>
        <span className="bar">
          <span style={{ width: `${((idx + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100}%` }} />
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
          {q.options.map((opt, i) => {
            let cls = 'option'
            if (picked !== null) {
              if (i === q.answer) cls += ' correct'
              else if (i === picked) cls += ' wrong'
            }
            return (
              <button key={opt} className={cls} onClick={() => pick(i)} disabled={picked !== null}>
                {opt}
              </button>
            )
          })}
        </div>

        {picked !== null && (
          <>
            <p className={`feedback ${picked === q.answer ? 'ok' : 'no'}`}>
              {feedbackText}
            </p>
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
