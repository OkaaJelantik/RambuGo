import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { KINDS, QUESTIONS, SIGNS, WALK_SIGNS, type Kind, type Sign } from './data'
import { SignArt } from './SignArt'
import Classroom from './Classroom'
import WalkScene from './WalkScene'
import Crossroad from './Crossroad'
import Kid from './Kid'

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
  onClose,
  cta,
  fallbackFocus,
}: {
  sign: Sign
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

export default function App() {
  const still = devParams?.has('still') ?? false
  const [stage, setStage] = useState<Stage>(initial)
  const [walked, setWalked] = useState(() => {
    const v = Number(devParams?.get('step'))
    return Number.isFinite(v) && v > 0 ? Math.min(v, 2) : 0
  })
  const [open, setOpen] = useState<Sign | null>(null)
  const [materiOpen, setMateriOpen] = useState<Sign | null>(null)
  const walkSceneRef = useRef<HTMLDivElement | null>(null)
  const [via, setVia] = useState<'materi' | 'kuis' | null>(null)
  const [score, setScore] = useState(0)

  const restart = () => {
    setStage('intro')
    setWalked(0)
    setOpen(null)
    setMateriOpen(null)
    setVia(null)
    setScore(0)
  }

  const finishWalk = useCallback(() => {
    setOpen(null)
    if (walked + 1 >= WALK_SIGNS.length) setStage('crossroad')
    else setWalked(walked + 1)
  }, [walked])

  return (
    <div className={still ? 'app still' : 'app'}>
      {stage === 'intro' && (
        <section className="screen" key="intro">
          <Classroom
            onStart={() => setStage('walk')}
          />
        </section>
      )}

      {stage === 'walk' && (
        <section className="screen" key="walk">
          <WalkScene step={walked} onOpen={setOpen} sceneRef={walkSceneRef} />
          {open && (
            <SignSheet
              sign={open}
              onClose={finishWalk}
              cta="Mengerti, lanjut jalan"
              fallbackFocus={walkSceneRef}
            />
          )}
        </section>
      )}

      {stage === 'crossroad' && (
        <section className="screen" key="crossroad">
          <Crossroad
            onMateri={() => {
              setVia('materi')
              setStage('materi')
            }}
            onKuis={() => {
              setVia('kuis')
              setStage('kuis')
            }}
          />
        </section>
      )}

      {stage === 'materi' && (
        <section className="screen materi-screen" key="materi">
          <div className="screen-head">
            <h2>Jalur Materi</h2>
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
          <div className="dock">
            <button className="btn orange" onClick={() => setStage('kuis')}>
              Sudah paham, coba kuis →
            </button>
          </div>
          {materiOpen && (
            <SignSheet sign={materiOpen} onClose={() => setMateriOpen(null)} cta="Tutup" />
          )}
        </section>
      )}

      {stage === 'kuis' && (
        <section className="screen quiz-screen" key="kuis">
          <Quiz
            onDone={(s) => {
              setScore(s)
              setStage('home')
            }}
          />
        </section>
      )}

      {stage === 'home' && (
        <section className="screen home-screen" key="home">
          <div className="home-card">
            <div className="house">
              <HomeHouse />
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)' }}>Kamu sampai di rumah!</h2>
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
    </div>
  )
}

function Quiz({ onDone }: { onDone: (score: number) => void }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const q = QUESTIONS[idx]
  const sign = q.signId ? SIGNS.find((s) => s.id === q.signId) : undefined

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
      <div className="quiz-progress">
        <span>
          Soal {idx + 1}/{QUESTIONS.length}
        </span>
        <span className="bar">
          <span style={{ width: `${((idx + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100}%` }} />
        </span>
      </div>

      <div className="question-card">
        {sign && (
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: '0.8rem' }}>
            <SignArt art={sign.art} size={116} />
          </div>
        )}
        <p className="prompt">{q.prompt}</p>

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
              {picked === q.answer ? 'Tepat sekali! ' : 'Belum tepat. '}
              {q.why}
            </p>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={next}>
                {idx + 1 >= QUESTIONS.length ? 'Sampai di rumah →' : 'Soal berikutnya →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
