import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import Junction from './Junction'
import { KINDS, QUESTIONS, SIGNS, type Question } from './data'
import { CASES, TOTAL_DECISIONS } from './sulit'
import { METERS } from './scene/meters'
import { LEG_SECONDS } from './scene/world'
import { INTRO_LINE } from './story'
import { heroTop } from './WalkScene'
// @ts-expect-error -- vitest runs in Node; app tsconfig has no Node types.
import { readFileSync } from 'node:fs'

/**
 * The walk scene scrolls on `requestAnimationFrame`; jsdom has no clock behind
 * it. A deterministic frame queue replaces the browser's, so every leg takes
 * exactly its real `LEG_SECONDS` and can be driven without timers or sleeps.
 *
 * `WalkScene` caps one frame at 100 ms of world time, so frames are advanced
 * in 100 ms steps: one step for the zero-`dt` first frame, `LEG_SECONDS` worth
 * to finish the leg, plus a little slack. The extra `await` inside `act` lets
 * the mode change that stops the world reach React's effects and the
 * dialogue panel before `advance` resolves.
 */
const FRAMES_PER_LEG = Math.ceil(LEG_SECONDS / 0.1) + 2

/** Install a fake `requestAnimationFrame` and return its driver. */
function installFrames() {
  let now = 0
  let nextId = 1
  const pending = new Map<number, FrameRequestCallback>()

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextId
    nextId += 1
    pending.set(id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending.delete(id)
  })

  return {
    /** Run `frames` frames of `ms` each inside one `act`, flushing React. */
    async advance(frames: number, ms = 100) {
      await act(async () => {
        for (let i = 0; i < frames; i += 1) {
          now += ms
          const due = [...pending.values()]
          pending.clear()
          for (const cb of due) cb(now)
        }
        // Biarkan MutationObserver + pembaruan React mendarat di dalam act.
        await Promise.resolve()
      })
    },
  }
}

type Frames = ReturnType<typeof installFrames>

let frames: Frames

beforeEach(() => {
  // App reads `?s=` / `?step=` / `?still` at module load (DEV only); a clean
  // URL keeps every test on the real `intro` entry point.
  window.history.replaceState({}, '', '/')
  frames = installFrames()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** jsdom has no `matchMedia`; answer it with a fixed preference. */
function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  )
}

/**
 * Bentuk yang harus dibaca anak untuk tiap rambu walk. Sengaja literal, bukan
 * turunan `KINDS`: assertion yang membaca `KINDS` akan ikut salah saat data
 * salah (dulu "persegi biru", padahal rambu petunjuk hijau, dan "segitiga
 * kuning", padahal rambu peringatan Indonesia belah ketupat).
 */
const WALK_SHAPES: Record<string, string> = {
  'dilarang-berhenti': 'bulat putih bertepi merah',
  'dilarang-parkir': 'bulat putih bertepi merah',
  'dilarang-putar-balik': 'bulat putih bertepi merah',
  'peringatan-penyeberangan': 'belah ketupat kuning',
  'peringatan-lampu': 'belah ketupat kuning',
  'peringatan-persimpangan': 'belah ketupat kuning',
  'belok-kiri': 'bulat biru',
  'jalan-terus': 'bulat biru',
  'belok-kanan': 'bulat biru',
}

/**
 * Naskah yang dipin apa adanya. Literal (bukan impor `STORY`) supaya
 * perubahan kata di data tidak lolos hanya karena sumbernya sama.
 */
const LEG_LINES = [
  'Aku jalan pelan-pelan. Trotoar itu tempat paling aman.',
  'Rumah-rumah berderet di kiri. Pohonnya ramai dan senang.',
  'Rambu berikutnya di dekat ujung trotoar. Tinggal satu!',
]

/** Kalimat berhenti, literal per rambu: urutannya kini diacak, jadi kunci = id. */
const STOP_LINES: Record<string, string> = {
  'dilarang-berhenti': 'Eh, ada rambu bulat putih bertepi merah. Artinya apa, ya?',
  'dilarang-parkir': 'Eh, ada rambu bulat putih bertepi merah. Artinya apa, ya?',
  'dilarang-putar-balik': 'Eh, ada rambu bulat putih bertepi merah. Artinya apa, ya?',
  'peringatan-penyeberangan': 'Eh, ada rambu belah ketupat kuning. Artinya apa, ya?',
  'peringatan-lampu': 'Eh, ada rambu belah ketupat kuning. Artinya apa, ya?',
  'peringatan-persimpangan': 'Eh, ada rambu belah ketupat kuning. Artinya apa, ya?',
  'belok-kiri': 'Eh, ada rambu bulat biru. Artinya apa, ya?',
  'jalan-terus': 'Eh, ada rambu bulat biru. Artinya apa, ya?',
  'belok-kanan': 'Eh, ada rambu bulat biru. Artinya apa, ya?',
}

/** Baris mana pun yang sah untuk berhenti; urutannya tidak dipin. */
function expectAnyStopLine() {
  const text = panel().textContent ?? ''
  expect(Object.values(STOP_LINES).some((line) => text.includes(line))).toBe(true)
}

const OPENINGS: Record<string, string> = {
  'dilarang-berhenti': 'Huruf S dicoret. Mobil tidak boleh berhenti di sini.',
  'dilarang-parkir': 'Huruf P dicoret. Mobil tidak boleh diparkir di sini.',
  'dilarang-putar-balik': 'Panah berbalik arah dicoret. Tidak boleh putar balik di sini.',
  'peringatan-penyeberangan': 'Belah ketupat kuning. Di depan ada tempat menyeberang.',
  'peringatan-lampu': 'Lampu tiga warna di belah ketupat. Sebentar lagi ada lampu jalan.',
  'peringatan-persimpangan': 'Dua jalan bersilang di belah ketupat. Ada persimpangan di depan.',
  'belok-kiri': 'Panah ke kiri di bulat biru. Kendaraan wajib belok kiri.',
  'jalan-terus': 'Panah lurus di bulat biru. Kendaraan wajib jalan terus.',
  'belok-kanan': 'Panah ke kanan di bulat biru. Kendaraan wajib belok kanan.',
}

const CROSSROAD_LINE =
  'Sampai di persimpangan. Kiri belajar, lurus kelompokkan, kanan studi kasus.'
const MATERI_LINE = 'Rambu yang tadi kulihat, aku kenali satu-satu.'
const KUIS_LINE = 'Kalau benar, aku dapat bintang.'
const HOME_LINE = 'Sampai di rumah. Rambu itu kawan di jalan! besok aku cerita ke Bu Guru.'

/**
 * Wilayah live panel yang selalu terpasang; teksnya mengikuti beat yang
 * tampil. Dipilih lewat kelasnya karena kuis kini punya wilayah `status`
 * sendiri untuk feedback.
 */
function panel(): HTMLElement {
  return document.querySelector<HTMLElement>('.dlg-live') as HTMLElement
}

/** Panel dialog yang benar-benar digambar di layar, atau `null` saat kosong. */
function panelEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.dlg')
}

/** Panel harus benar-benar lepas dari DOM, bukan sekadar `aria-hidden`. */
function expectNoPanel() {
  expect(panelEl()).toBeNull()
}

function expectPanelLine(line: string) {
  expect(panel().textContent).toContain(line)
  expect(panel().getAttribute('aria-live')).toBe('polite')
}

/**
 * Tunggu satu leg selesai, lalu pastikan panel sudah memuat kalimat rambu
 * yang ditemui. Dunia berhenti tepat di rambu; panel menyusul.
 */
async function arriveAtSign() {
  await frames.advance(FRAMES_PER_LEG)
  expectAnyStopLine()
  expect(screen.getByRole('button', { name: 'Apa ini?' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Lanjut jalan' })).toBeTruthy()
}

/** Jeda nyata 320 ms: melewati guard 300 ms setelah lembar ditutup. */
async function passSheetGuard() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 320))
  })
}

/**
 * Buka lembar lewat tombol panel, baca bentuk + arti + pembuka naskah, lalu
 * "Tutup". Beat stop yang sama harus masih menunggu setelah lembar ditutup.
 */
async function readSign() {
  fireEvent.click(screen.getByRole('button', { name: 'Apa ini?' }))
  const dialog = screen.getByRole('dialog')
  const label = dialog.getAttribute('aria-label') ?? ''
  // Siapa pun yang berdiri di depan anak minggu ini: urutannya diacak, jadi
  // rambunya dibaca dari lembarnya, bukan dari indeks.
  const sign = SIGNS.find((s) => label.includes(s.name))
  expect(sign, label).toBeTruthy()
  if (!sign) throw new Error('lembar tanpa rambu')
  // Lembar berisi keterangan resmi saja: arti, bentuk, tip. Narasi Aku
  // sengaja TIDAK di sini — ia keluar sebagai balon ucapan setelah ditutup.
  expect(screen.getByText(sign.meaning)).toBeTruthy()
  expect(screen.getByText(`Bentuk: ${WALK_SHAPES[sign.id]}`)).toBeTruthy()
  expect(screen.queryByText(OPENINGS[sign.id])).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
  expect(screen.queryByRole('dialog')).toBeNull()

  // Anak berbalik, mengangkat tangan, dan mengucapkan narasinya.
  expect(screen.getByText(OPENINGS[sign.id])).toBeTruthy()
  // Kembali ke beat yang sama: kalimat dan kedua tombolnya masih ada.
  expectPanelLine(STOP_LINES[sign.id])
  expect(screen.getByRole('button', { name: 'Lanjut jalan' })).toBeTruthy()

  // Guard menahan aksi panel 300 ms setelah lembar tutup; tes melewatinya.
  await passSheetGuard()
}

/**
 * Jalankan seluruh perjalanan kaki: tiga leg, tiga rambu (dibaca lewat
 * panel), lalu "Lanjut jalan" sampai persimpangan. Panel persimpangan
 * menawarkan kedua rute.
 */
async function clearWalk() {
  const BATCH = 3
  for (let i = 0; i < BATCH; i += 1) {
    await arriveAtSign()
    await readSign()

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut jalan' }))

    if (i < BATCH - 1) {
      // Leg berikutnya hanya bercerita: tidak ada tombol di panel.
      expectPanelLine(LEG_LINES[i + 1])
      expect(screen.queryByRole('button', { name: 'Lanjut jalan' })).toBeNull()
    }
  }

  expectPanelLine(CROSSROAD_LINE)
  expect(screen.getByRole('button', { name: 'Ke materi' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ke kelompokkan' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ke studi kasus' })).toBeTruthy()
}

/**
 * Answer all fifteen case-study decisions (five cases × three stages), choosing
 * the right option when `correct` says so and a wrong one otherwise. Advances
 * through the case study to the home screen. The right option is found by its
 * `correct` flag, never by position: the display order comes from the seed.
 */
function answerQuiz(correct: (caseIndex: number, stepIndex: number) => boolean) {
  CASES.forEach((oneCase, caseIndex) => {
    oneCase.steps.forEach((step, stepIndex) => {
      const decision = caseIndex * 3 + stepIndex
      expect(screen.getByText(`Tahap ${decision + 1}/${TOTAL_DECISIONS}`)).toBeTruthy()

      const option = step.options.find((candidate) =>
        correct(caseIndex, stepIndex) ? candidate.correct : !candidate.correct,
      )
      if (!option) {
        throw new Error(`Tahap ${decision + 1} tidak punya jawaban ${correct(caseIndex, stepIndex) ? 'benar' : 'salah'}`)
      }

      fireEvent.click(screen.getByRole('button', { name: option.text }))
      fireEvent.click(
        screen.getByRole('button', {
          name:
            decision + 1 === TOTAL_DECISIONS
              ? 'Sampai di rumah →'
              : 'Tahap berikutnya →',
        }),
      )
    })
  })
}

/**
 * Jawab lima soal kuis awal jalur materi. Kunci diambil dari `q.answer`
 * (indeks asli) — urutan tampil diacak per seed, jadi tes tidak boleh memakai
 * posisi huruf. Mendarat di layar rumah.
 */
function answerKuisAwal(correct: (question: Question, index: number) => boolean) {
  QUESTIONS.forEach((question, index) => {
    expect(screen.getByText(`Soal ${index + 1}/${QUESTIONS.length}`)).toBeTruthy()

    const option = correct(question, index)
      ? question.options[question.answer]
      : question.options.find((_, i) => i !== question.answer)
    if (!option) throw new Error(`Soal ${index + 1} tidak punya jawaban salah`)

    fireEvent.click(screen.getByRole('button', { name: option }))
    fireEvent.click(
      screen.getByRole('button', {
        name: index + 1 === QUESTIONS.length ? 'Sampai di rumah →' : 'Soal berikutnya →',
      }),
    )
  })
}

/**
 * Setelah soal terakhir: layar rumah tampil, tetapi panel masih memutar beat
 * kuis ("Kalau benar, aku dapat bintang.") dengan tombol "Selesai".
 */
function finishQuizPanel() {
  expectPanelLine(KUIS_LINE)
  fireEvent.click(screen.getByRole('button', { name: 'Selesai' }))
  expectPanelLine(HOME_LINE)
}

/** Enter the classroom, walk to the crossroad, and assert we arrived. */
async function reachCrossroad() {
  render(<App />)

  // Di kelas panel belum tampil: kartu kelas yang memegang kalimat intro.
  expectNoPanel()
  expect(screen.getByText(INTRO_LINE)).toBeTruthy()
  expect(screen.getByRole('heading', { name: /Petualangan Rambu Lalu Lintas/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))

  // WalkScene is on screen and its HUD names the road ahead.
  expect(screen.getByText('Jalan ke jalan raya')).toBeTruthy()
  expectPanelLine(LEG_LINES[0])

  await clearWalk()
  expect(screen.getByRole('heading', { name: 'Kamu sampai di persimpangan' })).toBeTruthy()
}

/**
 * Sampai di kuis awal 5 soal. Satu-satunya pintunya jalur materi: papan timur
 * sekarang studi kasus, jadi kuis awal dibuka dari panel materi.
 */
async function reachKuisAwal() {
  await reachCrossroad()
  fireEvent.click(screen.getByRole('button', { name: 'Ke materi' }))
  expect(screen.getByRole('heading', { name: 'Jalur Materi' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Sudah paham, coba kuis' }))
  await waitFor(() => expectNoPanel())
  expect(screen.getByText(`Soal 1/${QUESTIONS.length}`)).toBeTruthy()
}

describe('persimpangan', () => {
  it('tiga papan tujuan adalah tombol sungguhan, dan tiap papan memanggil aksinya', () => {
    const onSortir = vi.fn()
    const onMateri = vi.fn()
    const onStudi = vi.fn()
    render(<Junction onSortir={onSortir} onMateri={onMateri} onStudi={onStudi} />)

    // Tiga jalur: utara (kelompokkan), barat (belajar), timur (studi kasus).
    const sortir = screen.getByRole('button', { name: /^Pilah —/ })
    const materi = screen.getByRole('button', { name: /^Belajar —/ })
    const studi = screen.getByRole('button', { name: /^Studi Kasus —/ })

    // Papan ada DI DALAM tombolnya: papan yang digeser keluar kotak tetap
    // harus bisa diketuk (bug `.fx-sign` di layar lama).
    for (const button of [sortir, materi, studi]) {
      expect(button.querySelector('.jn-board__plate')).not.toBeNull()
    }
    // Papan utara tidak lagi bertuliskan rute berjalan.
    expect(screen.queryByRole('button', { name: /Jalan lagi/ })).toBeNull()

    fireEvent.click(sortir)
    fireEvent.click(materi)
    fireEvent.click(studi)
    expect(onSortir).toHaveBeenCalledTimes(1)
    expect(onMateri).toHaveBeenCalledTimes(1)
    expect(onStudi).toHaveBeenCalledTimes(1)
  })
})

describe('geometri hero', () => {
  it('sol hero (y=235) duduk tepat di garis tanah', () => {
    // Kotak art 260; sol berakhir di 235. Menggambar dengan -heroH membuat
    // sol melayang 25/260 tinggi kotak. heroTop menggeser tepat sebesar itu.
    expect(heroTop(260)).toBeCloseTo(-235, 6)
    expect(heroTop(160)).toBeCloseTo(-(160 * 235) / 260, 6)
    expect(heroTop(160) + 235 * (160 / 260)).toBeCloseTo(0, 6)
  })

  it('tabel meter hanya menyimpan lebar kendaraan; tinggi mengikuti aspek art', () => {
    // Kolom tinggi 1,45 / 1,05 tidak pernah dibaca `vehicleBox`. Lebar adalah
    // jangkar; tinggi tergambar 1,01 m (mobil) dan 0,62 m (motor).
    expect(Object.keys(METERS.car)).toEqual(['width'])
    expect(Object.keys(METERS.motorcycle)).toEqual(['width'])
  })
})

describe('alur aplikasi', () => {
  it('rambu berhenti memunculkan panel; Apa ini? → lembar → Tutup kembali ke beat yang sama', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))

    await arriveAtSign()
    const stopLine = panel().textContent

    fireEvent.click(screen.getByRole('button', { name: 'Apa ini?' }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    // Ketukan di latar tidak menutup lembar; Escape yang menutup.
    fireEvent.click(document.querySelector('.overlay') as HTMLElement)
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    // Fokus tidak jatuh ke <body>; ia kembali ke wadah scene.
    const active = document.activeElement as HTMLElement
    expect(active).not.toBe(document.body)
    expect(active.closest('.wk-scene')).toBeTruthy()

    // Beat yang sama, bukan leg berikutnya.
    expect(panel().textContent).toBe(stopLine)
    expect(screen.getByRole('button', { name: 'Lanjut jalan' })).toBeTruthy()

    await passSheetGuard()
    // "Lanjut jalan" melepas tombolnya; fokus harus pindah ke wadah scene.
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut jalan' }))
    const afterContinue = document.activeElement as HTMLElement
    expect(afterContinue).not.toBe(document.body)
    expect(afterContinue.closest('.wk-scene')).toBeTruthy()
    expectPanelLine(LEG_LINES[1])
  })

  it('ketukan kedua setelah lembar ditutup tidak melewati rambu', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))
    await arriveAtSign()

    fireEvent.click(screen.getByRole('button', { name: 'Apa ini?' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    // Ketuk ganda: tap kedua mendarat di "Lanjut jalan" <300 ms kemudian.
    // Tanpa jeda, dunia maju ke leg-2 dan rambu pertama terlewat.
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut jalan' }))
    expectAnyStopLine()
    expect(screen.getByRole('button', { name: 'Lanjut jalan' })).toBeTruthy()

    // Setelah jeda, tombol yang sama berfungsi normal.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut jalan' }))
    expectPanelLine(LEG_LINES[1])
  })

  it('mengetuk teks panel tidak melepas fokus ke <body>', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))
    await arriveAtSign()

    const text = document.querySelector<HTMLElement>('.dlg-text') as HTMLElement
    const scene = document.querySelector<HTMLElement>('.wk-scene') as HTMLElement
    scene.focus()
    expect(document.activeElement).toBe(scene)

    // Default mousedown (yang memindahkan fokus ke <body>) ditahan.
    expect(fireEvent.mouseDown(text)).toBe(false)
    expect(document.activeElement).toBe(scene)
    fireEvent.click(text)
    expect(document.activeElement).toBe(scene)
  })

  it('studi kasus: fokus tidak jatuh ke <body>, umpan balik diumumkan, rambu terbaca', async () => {
    await reachCrossroad()
    fireEvent.click(screen.getByRole('button', { name: 'Ke studi kasus' }))
    expect(screen.getByText('Tahap 1/15')).toBeTruthy()

    // Deskripsi visual (bentuk + gambar) ikut pertanyaan, bukan nama rambu:
    // nama adalah jawaban tahap pertama.
    const prompt = document.querySelector('.question-card .prompt') as HTMLElement
    expect(prompt.textContent).toContain(`Rambu ${CASES[0].sign.visual}`)
    expect(prompt.textContent).not.toContain(CASES[0].sign.name)

    const first = CASES[0].steps[0]
    const right = first.options.find((option) => option.correct)
    expect(right).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: right!.text }))
    const next = screen.getByRole('button', { name: 'Tahap berikutnya →' })
    expect(document.activeElement).toBe(next)

    const live = document.querySelector<HTMLElement>('.quiz-live') as HTMLElement
    expect(live.getAttribute('role')).toBe('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toBe(`${first.why} Skor 1 dari 15.`)

    // Tahap baru memfokuskan pertanyaannya, bukan membiarkan fokus ke <body>.
    fireEvent.click(next)
    expect(screen.getByText('Tahap 2/15')).toBeTruthy()
    expect(document.activeElement).toBe(document.querySelector('.question-card .prompt'))
  })

  it('studi kasus: deskripsi gambarnya tidak memuat teks jawaban', async () => {
    await reachCrossroad()
    fireEvent.click(screen.getByRole('button', { name: 'Ke studi kasus' }))

    CASES.forEach((oneCase, caseIndex) => {
      oneCase.steps.forEach((step, stepIndex) => {
        const decision = caseIndex * 3 + stepIndex
        expect(screen.getByText(`Tahap ${decision + 1}/${TOTAL_DECISIONS}`)).toBeTruthy()
        const prompt = document.querySelector('.question-card .prompt') as HTMLElement
        const text = prompt.textContent ?? ''

        // Prompt memakai `sign.visual`, bukan `name`/`meaning`; assertion ini
        // gagal kalau seseorang mengganti deskripsi jadi nama rambu, yang
        // sekaligus membocorkan jawaban tahap makna.
        expect(text).toContain(oneCase.sign.visual)

        const right = step.options.find((option) => option.correct)
        expect(right).toBeTruthy()
        expect(text.toLowerCase()).not.toContain(right!.text.toLowerCase())

        fireEvent.click(screen.getByRole('button', { name: right!.text }))
        if (decision + 1 < TOTAL_DECISIONS) {
          fireEvent.click(screen.getByRole('button', { name: 'Tahap berikutnya →' }))
        }
      })
    })
  })

  it('beat leg tetap tampil saat prefers-reduced-motion', () => {
    mockReducedMotion(true)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))

    // Gerak dikurangi mematikan animasi, bukan narasi: kalimat leg pertama
    // tidak boleh langsung ditimpa beat stop.
    expectPanelLine(LEG_LINES[0])
    expect(screen.queryByRole('button', { name: 'Lanjut jalan' })).toBeNull()
  })

  it('ketuk plat rambu memunculkan beat stop tanpa MutationObserver', () => {
    mockReducedMotion(true)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))
    expectPanelLine(LEG_LINES[0])

    // Dunia sudah berhenti sejak awal di mode ini; ketukan plat adalah
    // sinyal cadangan yang eksplisit (onSignTap), bukan pantauan DOM.
    // Rambu yang berdiri ditentukan seed; baca namanya dari platnya sendiri.
    const plate = screen.getByRole('button', { name: /^Rambu / })
    const plateLabel = plate.getAttribute('aria-label') ?? ''
    const signName = plateLabel.replace(/^Rambu /, '').replace(/, tekan untuk melihat artinya$/, '')
    fireEvent.click(plate)
    expect(screen.getByRole('dialog', { name: `Rambu ${signName}` })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expectAnyStopLine()
    expect(screen.getByRole('button', { name: 'Lanjut jalan' })).toBeTruthy()
  })

  it('beat leg hilang sendiri setelah 3 detik', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))
    expectPanelLine(LEG_LINES[0])

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    // Panel masih memutar animasi keluar; setelah EXIT_MS ia benar-benar lepas.
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(panel().textContent).toBe('')
    expectNoPanel()
  })

  it('jalur materi: 3 rambu, papan rambu, lalu 5/5 dengan teks jalur materi', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke materi' }))
    expect(screen.getByRole('heading', { name: 'Jalur Materi' })).toBeTruthy()
    expectPanelLine(MATERI_LINE)

    // Kartu membuka lembar keterangan resmi yang sama — tanpa narasi Aku,
    // karena di jalur materi anak memang sedang membaca, bukan bercerita.
    const card = screen.getByRole('button', { name: /Akan Ada Penyeberangan/ })
    // jsdom tidak memindahkan fokus saat klik; browser sungguhan melakukannya.
    card.focus()
    fireEvent.click(card)
    expect(screen.getByRole('dialog', { name: 'Rambu Akan Ada Penyeberangan' })).toBeTruthy()
    expect(screen.queryByText(OPENINGS['peringatan-penyeberangan'])).toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(card)

    await passSheetGuard()
    // Tombol lanjut ke kuis hanya ada di panel (dock lama sudah dibuang).
    fireEvent.click(screen.getByRole('button', { name: 'Sudah paham, coba kuis' }))
    await waitFor(() => expectNoPanel())
    answerKuisAwal(() => true)
    finishQuizPanel()

    expect(screen.getByText('Benar 5/5')).toBeTruthy()
    expect(screen.getByText('Bintang 3 ⭐')).toBeTruthy()
    // `via` still says the materi path, even though the quiz came after it.
    expect(screen.getByText('Kamu belajar dulu, lalu mengerjakan kuis.')).toBeTruthy()
    expect(screen.queryByText('Kamu berani mencoba studi kasus lebih dulu.')).toBeNull()

    // "Pulang" menutup panel di rumah; kartu rumah tetap punya tombol main lagi.
    fireEvent.click(screen.getByRole('button', { name: 'Pulang' }))
    await waitFor(() => expectNoPanel())
    fireEvent.click(screen.getByRole('button', { name: 'Main lagi dari kelas' }))
    expect(screen.getByRole('heading', { name: /Petualangan Rambu Lalu Lintas/ })).toBeTruthy()
  })

  it('kuis awal: fokus tidak jatuh ke <body>, umpan balik diumumkan, rambu terbaca', async () => {
    await reachKuisAwal()

    // Deskripsi visual (bentuk + gambar) ikut pertanyaan; nama rambu tidak,
    // karena nama adalah jawaban soal.
    const q0Sign = SIGNS.find((s) => s.id === QUESTIONS[0].signId)
    expect(q0Sign).toBeTruthy()
    const prompt = document.querySelector('.question-card .prompt') as HTMLElement
    if (q0Sign) expect(prompt.textContent).toContain(`Rambu ${q0Sign.visual}`)

    fireEvent.click(
      screen.getByRole('button', { name: QUESTIONS[0].options[QUESTIONS[0].answer] }),
    )
    const next = screen.getByRole('button', { name: 'Soal berikutnya →' })
    expect(document.activeElement).toBe(next)

    const live = document.querySelector<HTMLElement>('.quiz-live') as HTMLElement
    expect(live.getAttribute('role')).toBe('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toContain('Tepat sekali!')
    expect(live.textContent).toContain(`Skor 1 dari ${QUESTIONS.length}.`)

    // Soal baru memfokuskan pertanyaannya, bukan membiarkan fokus ke <body>.
    fireEvent.click(next)
    expect(screen.getByText(`Soal 2/${QUESTIONS.length}`)).toBeTruthy()
    expect(document.activeElement).toBe(document.querySelector('.question-card .prompt'))
  })

  it('kuis awal: deskripsi gambarnya tidak memuat teks jawaban', async () => {
    await reachKuisAwal()

    QUESTIONS.forEach((q, i) => {
      expect(screen.getByText(`Soal ${i + 1}/${QUESTIONS.length}`)).toBeTruthy()
      const prompt = document.querySelector('.question-card .prompt') as HTMLElement
      const text = prompt.textContent ?? ''

      if (q.signId) {
        const sign = SIGNS.find((candidate) => candidate.id === q.signId)
        expect(sign).toBeTruthy()
        // Prompt memakai `visual`, bukan `name`/`meaning`; assertion ini gagal
        // kalau deskripsi rambu diganti jadi nama rambu (yang membocorkan
        // jawaban).
        expect(text).toContain(sign!.visual)

        const answer = q.options[q.answer].toLowerCase()
        expect(text.toLowerCase()).not.toContain(answer)
      }

      fireEvent.click(screen.getByRole('button', { name: q.options[q.answer] }))
      if (i + 1 < QUESTIONS.length) {
        fireEvent.click(screen.getByRole('button', { name: 'Soal berikutnya →' }))
      }
    })
  })

  it('kuis awal: kunci dari q.answer, posisi benar bergilir 0/1/2 antar-soal', async () => {
    await reachKuisAwal()

    const positions: number[] = []
    QUESTIONS.forEach((q, i) => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.options .option'),
      )
      expect(buttons).toHaveLength(q.options.length)
      // Posisi jawaban benar = tempat teks `q.options[q.answer]` berdiri.
      // Kuncinya tetap `q.answer`; display order-nya yang diacak.
      positions.push(buttons.findIndex((button) => button.textContent === q.options[q.answer]))

      fireEvent.click(screen.getByRole('button', { name: q.options[q.answer] }))
      fireEvent.click(
        screen.getByRole('button', {
          name: i + 1 === QUESTIONS.length ? 'Sampai di rumah →' : 'Soal berikutnya →',
        }),
      )
    })

    // Kuis lama selalu menjawab A. Sekarang lima soal harus mengunjungi ketiga
    // posisi, sehingga "pilih A terus" tidak pernah cukup.
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(new Set(positions)).toEqual(new Set([0, 1, 2]))
  })

  it('jalur materi berakhir di kuis awal lima soal, bukan studi kasus', async () => {
    await reachKuisAwal()

    // Kuis awal: 5 soal. Studi kasus tidak boleh ikut terbuka di jalur ini.
    expect(screen.getByText('Soal 1/5')).toBeTruthy()
    expect(screen.queryByText('Tahap 1/15')).toBeNull()
    expect(screen.queryByText('Studi Kasus Rambu')).toBeNull()

    answerKuisAwal((_, index) => index < 2)
    finishQuizPanel()

    expect(screen.getByText('Benar 2/5')).toBeTruthy()
    expect(screen.getByText('Bintang 2 ⭐')).toBeTruthy()
    expect(screen.getByText('Kamu belajar dulu, lalu mengerjakan kuis.')).toBeTruthy()
  })

  it('rumah: "Kembali ke persimpangan" kembali ke persimpangan tanpa mengulang kelas atau jalan', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke studi kasus' }))
    answerQuiz(() => true)
    finishQuizPanel()
    expect(screen.getByText('Benar 15/15')).toBeTruthy()

    // Dua tombol di kartu rumah, urutannya: kembali dulu, lalu main lagi.
    const homeButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.home-card .btn'),
    ).map((button) => button.textContent?.trim())
    expect(homeButtons).toEqual(['Kembali ke persimpangan', 'Main lagi dari kelas'])

    // "Pulang" menutup panel rumah; tombol kembali tetap ada di kartu rumah.
    fireEvent.click(screen.getByRole('button', { name: 'Pulang' }))
    await waitFor(() => expectNoPanel())
    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke persimpangan' }))

    // Kembali ke layar persimpangan yang sama: judulnya difokuskan dan panel
    // menawarkan tiga jalur lagi.
    const heading = screen.getByRole('heading', { name: 'Kamu sampai di persimpangan' })
    expect(document.activeElement).toBe(heading)
    expectPanelLine(CROSSROAD_LINE)
    expect(screen.getByRole('button', { name: 'Ke materi' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ke kelompokkan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ke studi kasus' })).toBeTruthy()

    // Tidak mengulang kelas maupun perjalanan kaki.
    expect(screen.queryByText(INTRO_LINE)).toBeNull()
    expect(screen.queryByText('Jalan ke jalan raya')).toBeNull()
    expect(screen.queryByRole('button', { name: /Keluar kelas/ })).toBeNull()
  })

  it('panel persimpangan: tombol "Ke kelompokkan" membuka layar sortir tanpa panel', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke kelompokkan' }))
    const heading = screen.getByRole('heading', { name: 'Kelompokkan Rambu' })
    expect(heading).toBeTruthy()
    expect(document.activeElement).toBe(heading)
    // Progres disembunyikan: yang tampak hanya tombol penilaian.
    expect(document.querySelector('.sr-progress')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sudah Selesai' })).toBeTruthy()
    await waitFor(() => expectNoPanel())
  })

  it('jalur sortir: dua belas kartu dikelompokkan, Selesai, rumah menampilkan Benar 12/12', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke kelompokkan' }))
    const sortirHeading = screen.getByRole('heading', { name: 'Kelompokkan Rambu' })
    expect(sortirHeading).toBeTruthy()
    // Fokus pindah ke judul layar baru, bukan jatuh ke <body>.
    expect(document.activeElement).toBe(sortirHeading)
    // Panel persimpangan tidak menemani permainan.
    await waitFor(() => expectNoPanel())

    expect(document.querySelectorAll('.sr-pajang')).toHaveLength(SIGNS.length)

    // Urutan hiasan diacak per seed; jenisnya dibaca dari rambu itu sendiri,
    // jadi tes tidak bergantung pada urutan tertentu.
    for (let i = 0; i < SIGNS.length; i += 1) {
      const card = document.querySelector<HTMLButtonElement>('.sr-pajang')
      expect(card, `hiasan ke-${i + 1} habis lebih awal`).not.toBeNull()
      const sign = SIGNS.find((candidate) => candidate.id === card?.dataset.sign)
      expect(sign, `hiasan tanpa data-sign`).toBeTruthy()
      if (!sign || !card) throw new Error('hiasan sortir tidak lengkap')

      fireEvent.click(card)
      expect(card.getAttribute('aria-pressed')).toBe('true')
      fireEvent.click(screen.getByRole('button', { name: `Kotak ${KINDS[sign.kind].label}` }))
    }

    // Menaruh semua hiasan tidak menilai apa pun: nilai hanya lahir dari
    // tombol "Sudah Selesai".
    expect(document.querySelectorAll('.sr-pajang')).toHaveLength(0)
    expect(document.querySelector('.sr-done')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Sudah Selesai' }))

    const summary = screen.getByRole('heading', { name: 'Berhasil dalam percobaan ke-1.' })
    expect(document.activeElement).toBe(summary)

    fireEvent.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(screen.getByText('Benar 12/12')).toBeTruthy()
    expect(screen.getByText('Bintang 3 ⭐')).toBeTruthy()
    expect(screen.getByText('Kamu mengelompokkan rambu dulu, lalu pulang.')).toBeTruthy()
  })

  it('jalur studi kasus: 9 dari 15 benar, Bintang 2, dan teks jalur studi kasus', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke studi kasus' }))
    expect(screen.getByText('Tahap 1/15')).toBeTruthy()
    // Selama menjawab, panel tidak menemani (tidak ada tombol yang bisa
    // dipakai melewati studi kasus).
    await waitFor(() => expectNoPanel())

    answerQuiz((caseIndex, stepIndex) => caseIndex * 3 + stepIndex < 9)
    finishQuizPanel()

    expect(screen.getByText('Benar 9/15')).toBeTruthy()
    expect(screen.getByText('Bintang 2 ⭐')).toBeTruthy()
    expect(screen.getByText('Kamu berani mencoba studi kasus lebih dulu.')).toBeTruthy()
    expect(screen.queryByText('Kamu belajar dulu, lalu mengerjakan kuis.')).toBeNull()
  })

  it('jalur studi kasus: tepat 12 dari 15 benar dapat Bintang 3', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke studi kasus' }))
    answerQuiz((caseIndex, stepIndex) => caseIndex * 3 + stepIndex < 12)
    finishQuizPanel()

    // The 0,8 rule lives exactly on this boundary: 12/15 (0,8) is three stars,
    // 11/15 (0,73) is not.
    expect(screen.getByText('Benar 12/15')).toBeTruthy()
    expect(screen.getByText('Bintang 3 ⭐')).toBeTruthy()
  })

  it('skor 0 tetap pulang dengan Bintang 1', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke studi kasus' }))
    answerQuiz(() => false)
    finishQuizPanel()

    expect(screen.getByText('Benar 0/15')).toBeTruthy()
    expect(screen.getByText('Bintang 1 ⭐')).toBeTruthy()
  })

  it('Pulang melepas panel dari DOM dan fokus mendarat di judul rumah', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke studi kasus' }))
    answerQuiz(() => true)
    finishQuizPanel()

    // Beat home tampil dengan tombol "Pulang"; klik itu harus melepas panel
    // (bukan cuma menyembunyikannya dengan aria-hidden).
    fireEvent.click(screen.getByRole('button', { name: 'Pulang' }))
    await waitFor(() => expectNoPanel())
    expect(panel().textContent).toBe('')

    const heading = screen.getByRole('heading', { name: 'Kamu sampai di rumah!' })
    expect(document.activeElement).toBe(heading)
  })
})

describe('narasi sebagai balon ucapan (Task 24)', () => {
  it('lembar berisi keterangan resmi; narasi baru muncul setelah lembar ditutup', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))
    await arriveAtSign()

    // Sebelum dibuka: tidak ada balon narasi di scene.
    expect(document.querySelector('.wk-bubble')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Apa ini?' }))
    const dialog = screen.getByRole('dialog')
    const label = dialog.getAttribute('aria-label') ?? ''
    const sign = SIGNS.find((s) => label.includes(s.name))
    expect(sign).toBeTruthy()
    if (!sign) throw new Error('lembar tanpa rambu')

    // Isi lembar: rambu + arti + bentuk + tip. Tanpa narasi Aku.
    expect(screen.getByText(sign.meaning)).toBeTruthy()
    expect(screen.getByText(sign.tip)).toBeTruthy()
    expect(screen.queryByText(OPENINGS[sign.id])).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))

    // Anak berbalik dan mengucapkan narasinya; balon bertahan.
    const bubble = document.querySelector<HTMLElement>('.wk-bubble')
    expect(bubble).not.toBeNull()
    expect(bubble!.textContent).toContain(OPENINGS[sign.id])
    // Pose bicara = menghadap kamera, bukan punggung.
    expect(document.querySelector('.wk-kid-talk')).not.toBeNull()
    expect(document.querySelector('.hw-walk, .hw-idle')).toBeNull()

    await passSheetGuard()
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut jalan' }))

    // "Lanjut jalan" menutup balon dan mengembalikan anak ke punggung.
    expect(document.querySelector('.wk-bubble')).toBeNull()
    expect(document.querySelector('.wk-kid-talk')).toBeNull()
  })
})
