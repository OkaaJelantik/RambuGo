import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { KINDS, QUESTIONS, SIGNS, type Kind, type Sign } from './data'
import { batchOf, createRun, initialSeed, type Run } from './run'
import { ART_BOX, SignArt } from './SignArt'
import Classroom from './Classroom'
import WalkScene from './WalkScene'
import Junction from './Junction'
import Sortir from './Sortir'
import Kuis from './Kuis'
import Sulit from './Sulit'
import { TOTAL_DECISIONS } from './sulit'
import Kid from './Kid'
import DialoguePanel from './DialoguePanel'
import { beatById, openingFor, stopBeat, type StoryButton, type StoryId } from './story'
import { KIND_ORDER, starsFor } from './sortir'
import { formatHash, parseHash, stageLimit, type Route, type Stage } from './route'
import {
  clearJalur,
  clearLastJalur,
  clearLastScore,
  loadLastJalur,
  loadLastScore,
  saveLastJalur,
  saveLastScore,
  scoreOf,
  type Jalur,
} from './progress'

/**
 * Delapan adegan. `kuis` adalah kuis awal jalur Belajar (5 soal), `studi` adalah
 * studi kasus papan timur (5 kasus × 3 tahap). Keduanya tidak memakai panel.
 * Himpunan stage dimiliki `route.ts`; App hanya memegang rutenya.
 */

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

/**
 * Katalog materi dikelompokkan per jenis, urutannya milik `KIND_ORDER`
 * (`sortir.ts`) supaya katalog dan permainan mengelompokkan dengan urutan yang
 * sama — satu daftar, bukan dua yang bisa lepas. Kelompok kosong dibuang.
 */
const MATERI_GROUPS = KIND_ORDER.map((kind) => ({
  kind,
  signs: SIGNS.filter((sign) => sign.kind === kind),
})).filter((group) => group.signs.length > 0)

function SignSheet({
  sign,
  onClose,
  cta,
  fallbackFocus,
  lean = false,
}: {
  sign: Sign
  onClose: () => void
  cta: string
  /** Fokus cadangan bila pemicu asli tidak bisa difokuskan lagi. */
  fallbackFocus?: RefObject<HTMLElement | null>
  /**
   * Lembar ramping untuk stage materi: gambar + nama + arti + tip saja. Jenis
   * sudah dipegang header kelompok, jadi chip, baris "Bentuk:", dan aturan
   * jenis tidak diulang. Default `false` = lembar lengkap (jalur walk).
   */
  lean?: boolean
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
          {/* Papan petunjuk jauh lebih lebar daripada tingginya: diberi kotak
              lebih besar supaya tulisan kecilnya (nama kota, "Titik Kumpul")
              masih terbaca. Pelat persegi tetap 124. */}
          <SignArt art={sign.art} size={ART_BOX[sign.art].w > ART_BOX[sign.art].h ? 216 : 124} />
        </div>
        {!lean && (
          <>
            <span
              className="kind-chip"
              style={{ '--kind-color': KINDS[sign.kind].color } as CSSProperties}
            >
              Rambu {kindChipText(sign.kind)}
            </span>
            <p className="kind-shape">Bentuk: {KINDS[sign.kind].shape}</p>
            {/* Ciri jenis, bukan ciri rambu: inilah yang berlaku untuk semua rambu
                sejenis, dan yang dibaca anak saat mengelompokkan nanti. */}
            <p className="kind-shape">{KINDS[sign.kind].rule}</p>
          </>
        )}

        {/* Isi lembar = keterangan resmi saja. Narasi Aku pindah ke balon
            ucapan di scene, muncul setelah lembar ditutup. */}
        <div className="sheet-wiki">
          <h3>{sign.name}</h3>
          <p>{sign.meaning}</p>
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

const STAGES: Stage[] = [
  'intro',
  'walk',
  'crossroad',
  'materi',
  'kuis',
  'sortir',
  'studi',
  'home',
]
// ?s=walk untuk lompat langsung ke satu adegan (buat cek tampilan).
// Parameter ini alat bantu developer, jadi hanya dibaca di build dev.
const devParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null

/**
 * Rute saat pertama kali dipasang. Hash adalah sumber utama, jadi refresh
 * melanjutkan di adegan yang sama. `?s=` (alat bantu dev) hanya mengisi bila
 * hash belum menunjuk adegan lain — mis. URL polos atau `#/intro`.
 *
 * Dipanggil untuk dua state awal (rute dan beat), jadi harus deterministik
 * terhadap URL saat itu dan tidak menulis apa pun.
 */
function bootRoute(): Route {
  const fromHash = parseHash(window.location.hash)
  if (fromHash.stage !== 'intro' || fromHash.pos !== 0) return fromHash

  const start = devParams?.get('s') as Stage | null
  if (!start || !STAGES.includes(start)) return fromHash

  // `?step=` tetap khusus walk (tiga leg), sama seperti dev shortcut lama;
  // stage lain selalu mulai dari posisi 0.
  const stepParam = start === 'walk' ? Number(devParams?.get('step')) : 0
  const step = Number.isFinite(stepParam) && stepParam > 0 ? stepParam : 0
  return { stage: start, pos: Math.min(step, stageLimit(start)) }
}

/** Jalur terakhir -> kalimat "bagaimana kamu sampai rumah" di kartu rumah. */
function viaFor(jalur: Jalur): 'materi' | 'sortir' | 'studi' {
  // Kuis awal selalu dibuka dari panel materi, jadi jalurnya tetap jalur materi.
  if (jalur === 'kuis') return 'materi'
  if (jalur === 'sortir') return 'sortir'
  return 'studi'
}

/** Penyebut skor tiap jalur: 5 soal, 15 keputusan, 12 kartu. */
function scoreMaxFor(jalur: Jalur): number {
  if (jalur === 'kuis') return QUESTIONS.length
  if (jalur === 'studi') return TOTAL_DECISIONS
  return SIGNS.length
}

/**
 * Skor awal untuk boot. Hash tidak membawa jalur; kalau App dibuka langsung
 * di `#/home` (refresh atau URL), angka diambil dari jalur terakhir yang
 * diselesaikan supaya rumah tidak berbohong "Benar 0/5".
 */
function bootScore(): { score: number; scoreMax: number } {
  const boot = bootRoute()
  if (boot.stage !== 'home') return { score: 0, scoreMax: QUESTIONS.length }

  const jalur = loadLastJalur()
  if (!jalur) return { score: 0, scoreMax: QUESTIONS.length }

  // Sortir menilai sekali di tombol terakhir, jadi tidak punya jawaban per
  // kartu di `saveAnswer`; angkanya datang dari skor yang ditulis `onDone`.
  const score = jalur === 'sortir' ? (loadLastScore() ?? 0) : scoreOf(jalur)
  return { score, scoreMax: scoreMaxFor(jalur) }
}

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
type FocusTarget = 'walk' | 'home' | 'intro' | 'materi' | 'sortir' | 'quiz' | 'crossroad'

/**
 * Sasaran fokus untuk sebuah stage. Dipakai saat browser back/forward
 * memindahkan adegan: tombol yang tadinya fokus ikut lepas bersama layar,
 * jadi fokus harus dipindahkan ke elemen yang pasti masih terpasang.
 */
function focusTargetFor(stage: Stage): FocusTarget {
  if (stage === 'home') return 'home'
  if (stage === 'intro') return 'intro'
  if (stage === 'materi') return 'materi'
  if (stage === 'sortir') return 'sortir'
  if (stage === 'crossroad') return 'crossroad'
  if (stage === 'walk') return 'walk'
  return 'quiz'
}

function beatAt(beats: StoryId[], step: number): StoryId {
  return beats[Math.min(Math.max(step, 0), beats.length - 1)]
}

/** Beat awal mengikuti adegan yang dibuka lewat hash/URL. */
function startBeat(stage: Stage, pos: number): StoryId | null {
  if (stage === 'intro') return 'intro'
  if (stage === 'walk') return beatAt(LEG_BEATS, pos)
  if (stage === 'crossroad') return 'crossroad'
  if (stage === 'materi') return 'materi'
  // Kuis awal, studi kasus, sortir, dan rumah: panel tidak menemani layar.
  return null
}

export default function App() {
  const still = devParams?.has('still') ?? false
  /**
   * Rute hash adalah satu-satunya sumber posisi. Tidak ada state `stage` atau
   * `walked` terpisah: keduanya dibaca dari `route`, sehingga back/refresh
   * tidak bisa membuat dua sumber kebenaran yang berbeda.
   */
  const [route, setRoute] = useState<Route>(bootRoute)
  const stage = route.stage
  const pos = route.pos
  const [beatId, setBeatId] = useState<StoryId | null>(() => {
    const boot = bootRoute()
    return startBeat(boot.stage, boot.pos)
  })
  const [run] = useState<Run>(() => createRun(initialSeed()))
  const batch = batchOf(run)
  const [open, setOpen] = useState<Sign | null>(null)
  /** Narasi Aku yang tampil sebagai balon ucapan sesudah lembar ditutup. */
  const [narration, setNarration] = useState<string | null>(null)
  const [materiOpen, setMateriOpen] = useState<Sign | null>(null)
  const walkSceneRef = useRef<HTMLDivElement | null>(null)
  const classroomHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const materiHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const sortirHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const homeHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const quizCardRef = useRef<HTMLDivElement | null>(null)
  const crossroadHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const pendingFocusRef = useRef<FocusTarget | null>(null)
  // -Infinity: aksi panel sebelum lembar pertama pernah ditutup tidak ditahan.
  const sheetClosedAtRef = useRef(-Infinity)
  const [via, setVia] = useState<'materi' | 'sortir' | 'studi' | null>(() => {
    // Hash tidak membawa jalur; kalau dibuka langsung di rumah, kalimat jalur
    // ikut dipulihkan dari jalur terakhir (bukan "Petualangan selesai.").
    const jalur = bootRoute().stage === 'home' ? loadLastJalur() : null
    return jalur ? viaFor(jalur) : null
  })
  const [score, setScore] = useState(() => bootScore().score)
  /**
   * Penyebut skor mengikuti jalur: 5 soal kuis awal, 15 keputusan studi kasus,
   * atau 12 kartu sortir.
   */
  const [scoreMax, setScoreMax] = useState(() => bootScore().scoreMax)
  /**
   * Skor sudah diisi alur normal (onDone) atau hidrasi boot. Efek rumah hanya
   * mengisi dari `loadLastJalur()` kalau angka masih default boot; kalau tidak,
   * sortir (yang skornya tidak tersimpan di `progress.ts`) bisa tertimpa 0.
   */
  const scoreKnownRef = useRef(stage === 'home')

  /** Stage yang sudah ter-commit; popstate memakainya untuk tahu adegan berganti. */
  const stageRef = useRef(stage)
  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  // `#/home` bisa dicapai lewat history tanpa melewati onDone (mis. App dibuka
  // di adegan lain lalu forward ke rumah). Hash tidak membawa jalur, jadi
  // angka diambil sekali dari jalur terakhir yang diselesaikan.
  useEffect(() => {
    if (stage !== 'home' || scoreKnownRef.current) return
    scoreKnownRef.current = true
    const jalur = loadLastJalur()
    if (!jalur) return
    setScore(jalur === 'sortir' ? (loadLastScore() ?? 0) : scoreOf(jalur))
    setScoreMax(scoreMaxFor(jalur))
    setVia((current) => current ?? viaFor(jalur))
  }, [stage])

  /**
   * Satu pintu navigasi: tulis rute ke state lalu ke URL. Semua perpindahan
   * adegan lewat sini supaya hash tidak pernah tertinggal dari layar.
   * Perubahan yang bukan navigasi (buka/tutup lembar, beat, fokus) tidak
   * memanggil ini dan tidak menambah entri history.
   */
  const navigate = (nextStage: Stage, nextPos: number) => {
    const next: Route = { stage: nextStage, pos: nextPos }
    setRoute(next)
    window.history.pushState(null, '', formatHash(next))
  }

  // Tombol back/forward browser: URL sudah berubah duluan, App hanya
  // mengikuti. Tidak ada pushState di sini — entri history itu milik browser.
  useEffect(() => {
    const onPop = () => {
      const next = parseHash(window.location.hash)
      // Kalau adegan berganti, tombol yang tadinya fokus ikut lepas bersama
      // layar; pindahkan ke elemen tetap di adegan baru. Kalau hanya pos yang
      // berubah (walk/kuis/studi), komponen tujuan memfokuskan pertanyaannya.
      if (next.stage !== stageRef.current) pendingFocusRef.current = focusTargetFor(next.stage)
      stageRef.current = next.stage
      setRoute(next)
      setBeatId(startBeat(next.stage, next.pos))
      // Lembar rambu dan balon narasi milik adegan lama, bukan adegan baru.
      setOpen(null)
      setMateriOpen(null)
      setNarration(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /** Catat waktu tutup lembar; aksi panel sesudahnya ditahan sebentar. */
  const closeWalkSheet = () => {
    sheetClosedAtRef.current = performance.now()
    // Lembar berisi keterangan resmi; setelah ditutup anak berbalik dan
    // mengucapkan narasinya dalam balon, bertahan sampai "Lanjut jalan".
    if (open) setNarration(openingFor(open.id) ?? null)
    setOpen(null)
  }

  const closeMateriSheet = () => {
    sheetClosedAtRef.current = performance.now()
    setMateriOpen(null)
  }

  const restart = () => {
    // Sesi baru: skor tiap jalur milik sesi lama, jangan dibawa ke kelas.
    clearJalur('kuis')
    clearJalur('studi')
    clearJalur('sortir')
    clearLastJalur()
    clearLastScore()
    scoreKnownRef.current = false
    pendingFocusRef.current = 'intro'
    navigate('intro', 0)
    setBeatId('intro')
    setOpen(null)
    setMateriOpen(null)
    setNarration(null)
    setVia(null)
    setScore(0)
    setScoreMax(QUESTIONS.length)
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
    else if (target === 'sortir') sortirHeadingRef.current?.focus()
    else if (target === 'crossroad') crossroadHeadingRef.current?.focus()
    else quizCardRef.current?.focus()
  }, [stage, beatId])

  const continueWalk = () => {
    // Balon narasi ditutup bersama jalan yang dimulai lagi.
    setNarration(null)
    if (stage === 'intro') {
      pendingFocusRef.current = 'walk'
      navigate('walk', 0)
      setBeatId(beatAt(LEG_BEATS, 0))
      return
    }
    if (stage !== 'walk') return

    if (pos + 1 >= batch.length) {
      // Persimpangan memfokuskan judulnya sendiri saat terpasang.
      navigate('crossroad', 0)
      setBeatId('crossroad')
    } else {
      // Tombol "Lanjut jalan" ikut terlepas; wadah scene tetap ada, jadi
      // fokus ditahan di sana sebelum tombolnya hilang.
      walkSceneRef.current?.focus()
      navigate('walk', pos + 1)
      setBeatId(beatAt(LEG_BEATS, pos + 1))
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
        if (stage === 'walk') setOpen(batch[pos])
        return
      case 'kuis':
        // Kuis awal 5 soal, dibuka dari panel materi. Jalurnya tetap jalur
        // materi (`via` tidak diubah): anak belajar dulu, lalu mengerjakan kuis.
        pendingFocusRef.current = 'quiz'
        navigate('kuis', 0)
        setBeatId(null)
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
              navigate('walk', 0)
              setBeatId(beatAt(LEG_BEATS, 0))
            }}
          />
        </section>
      )}

      {stage === 'walk' && (
        <section className="screen" key="walk">
          <WalkScene
            signs={batch}
            step={pos}
            onOpen={(sign) => setOpen(sign)}
            onStop={() => {
              setNarration(null)
              setBeatId(STOP_BEAT)
            }}
            onSignTap={() => {
              setNarration(null)
              setBeatId(STOP_BEAT)
            }}
            narration={narration}
            sceneRef={walkSceneRef}
          />
          {open && (
            <SignSheet
              sign={open}
              onClose={closeWalkSheet}
              cta="Tutup"
              fallbackFocus={walkSceneRef}
            />
          )}
        </section>
      )}

      {stage === 'crossroad' && (
        <section className="screen dlg-space" key="crossroad">
          <Junction
            headingRef={crossroadHeadingRef}
            onSortir={() => {
              pendingFocusRef.current = 'sortir'
              setVia('sortir')
              navigate('sortir', 0)
              setBeatId(null)
            }}
            onMateri={() => {
              pendingFocusRef.current = 'materi'
              setVia('materi')
              navigate('materi', 0)
              setBeatId('materi')
            }}
            onStudi={() => {
              pendingFocusRef.current = 'quiz'
              setVia('studi')
              navigate('studi', 0)
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
          {MATERI_GROUPS.map(({ kind, signs }) => {
            const meta = KINDS[kind]
            return (
              <section
                key={kind}
                className="materi-group"
                data-kind={kind}
                aria-labelledby={`materi-${kind}`}
                style={{ '--kind-color': meta.color } as CSSProperties}
              >
                <header className="materi-group__head">
                  <h3 className="materi-group__title" id={`materi-${kind}`}>
                    {meta.label}
                  </h3>
                  {/* Blok bentuk: satu jenis satu penjelasan, bukan satu per
                      kartu. Isinya `KINDS[kind]`, sumber yang sama dengan
                      lembar di jalur walk. */}
                  <h4 className="materi-group__label">Tentang Bentuk</h4>
                  <p className="materi-group__shape">{meta.shape}</p>
                  <p className="materi-group__rule">{meta.rule}</p>
                </header>
                <div className="grid">
                  {signs.map((s) => (
                    <button
                      key={s.id}
                      className="sign-card"
                      onClick={() => setMateriOpen(s)}
                    >
                      <div className="art">
                        <SignArt art={s.art} size={80} />
                      </div>
                      {/* Tanpa chip jenis: header kelompok sudah memegangnya. */}
                      <h4>{s.name}</h4>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
          {materiOpen && (
            <SignSheet sign={materiOpen} onClose={closeMateriSheet} cta="Tutup" lean />
          )}
        </section>
      )}

      {stage === 'sortir' && (
        <section className="screen sortir-screen" key="sortir">
          <Sortir
            seed={run.seed}
            headingRef={sortirHeadingRef}
            onDone={(benar) => {
              pendingFocusRef.current = 'home'
              // Sortir tidak punya posisi per kartu di hash, jadi skornya
              // datang dari layar permainan (bukan `progress.ts`).
              saveLastJalur('sortir')
              saveLastScore(benar)
              scoreKnownRef.current = true
              setScore(benar)
              setScoreMax(SIGNS.length)
              navigate('home', 0)
              // Selesai permainan: layar hasil bicara sendiri, tanpa panel.
              setBeatId(null)
            }}
          />
        </section>
      )}

      {stage === 'kuis' && (
        <section className="screen quiz-screen" key="kuis">
          <Kuis
            pos={pos}
            onPos={(next) => navigate('kuis', next)}
            cardRef={quizCardRef}
            onDone={() => {
              pendingFocusRef.current = 'home'
              // Skor final dibaca dari storage yang sama dengan tempat soal
              // menulis jawaban, jadi refresh di tengah kuis tidak menghapus
              // skor yang sudah dikumpulkan.
              saveLastJalur('kuis')
              saveLastScore(scoreOf('kuis'))
              scoreKnownRef.current = true
              setScore(scoreOf('kuis'))
              setScoreMax(QUESTIONS.length)
              navigate('home', 0)
              // Selesai kuis: layar hasil bicara sendiri, tanpa panel.
              setBeatId(null)
            }}
          />
        </section>
      )}

      {stage === 'studi' && (
        <section className="screen quiz-screen sulit-screen" key="studi">
          <Sulit
            pos={pos}
            onPos={(next) => navigate('studi', next)}
            cardRef={quizCardRef}
            onDone={() => {
              pendingFocusRef.current = 'home'
              // Sama seperti kuis: skor final adalah isi storage saat itu.
              saveLastJalur('studi')
              saveLastScore(scoreOf('studi'))
              scoreKnownRef.current = true
              setScore(scoreOf('studi'))
              setScoreMax(TOTAL_DECISIONS)
              navigate('home', 0)
              // Selesai studi kasus: layar hasil bicara sendiri, tanpa panel.
              setBeatId(null)
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
                : via === 'studi'
                  ? 'Kamu berani mencoba studi kasus lebih dulu.'
                  : via === 'sortir'
                    ? 'Kamu mengelompokkan rambu dulu, lalu pulang.'
                    : 'Petualangan selesai.'}
            </p>

            <div className="badge-card">
              <div className="label">Lencana kamu</div>
              <div className="title">🚸 Sahabat Rambu Lalu Lintas</div>
            </div>

            <div className="score-line">
              <span className="score-pill">Benar {score}/{scoreMax}</span>
              <span className="score-pill">Bintang {starsFor(score, scoreMax)} ⭐</span>
            </div>

            <div className="home-actions">
              <button
                className="btn"
                onClick={() => {
                  pendingFocusRef.current = 'crossroad'
                  navigate('crossroad', 0)
                  setBeatId('crossroad')
                }}
              >
                Kembali ke persimpangan
              </button>
              <button className="btn" onClick={restart}>
                Main lagi dari kelas
              </button>
            </div>
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
              ? stopBeat(batch[pos])
              : beatById(beatId)
        }
        onAction={handleAction}
      />
    </div>
  )
}

