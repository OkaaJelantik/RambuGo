import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { QUESTIONS, WALK_SIGNS, type Question } from './data'
import { LEG_SECONDS } from './scene/world'
import { INTRO_LINE } from './story'

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
 * salah (dulu "persegi hijau", padahal rambu petunjuk biru).
 */
const WALK_SHAPES: Record<string, string> = {
  anak: 'segitiga kuning',
  zebra: 'persegi biru',
  'dilarang-masuk': 'bulat merah',
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

const STOP_LINES = [
  'Eh, ada rambu segitiga kuning. Gambarnya anak-anak — artinya apa, ya?',
  'Persegi biru, ada garis-garis putih. Ini tempat menyeberang!',
  'Bulat merah, ada garis putih. Berarti tidak boleh masuk — aku jalan kaki, jadi boleh, ya?',
]

const OPENINGS: Record<string, string> = {
  anak: 'Aku kecil, jadi aku paling suka rambu ini.',
  zebra: 'Kalau mau ke seberang, lewat garis putih itu.',
  'dilarang-masuk': 'Tapi aku jalan kaki. Sepeda dan mobil yang tidak boleh.',
}

const CROSSROAD_LINE = 'Sampai di persimpangan. Aku mau baca rambu lagi, atau langsung kuis?'
const MATERI_LINE = 'Rambu yang tadi kulihat, aku kenali satu-satu.'
const KUIS_LINE = 'Kalau benar, aku dapat bintang.'
const HOME_LINE = 'Sampai di rumah. Rambu itu kawan di jalan — besok aku cerita ke Bu Guru.'

/** Wilayah live yang selalu terpasang; teksnya mengikuti beat yang tampil. */
function panel(): HTMLElement {
  return screen.getByRole('status')
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
async function arriveAtSign(index: number) {
  await frames.advance(FRAMES_PER_LEG)
  expectPanelLine(STOP_LINES[index])
  expect(screen.getByRole('button', { name: 'Apa ini?' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Lanjut jalan' })).toBeTruthy()
}

/**
 * Buka lembar lewat tombol panel, baca bentuk + arti + pembuka naskah, lalu
 * "Tutup". Beat stop yang sama harus masih menunggu setelah lembar ditutup.
 */
function readSign(index: number) {
  const sign = WALK_SIGNS[index]

  fireEvent.click(screen.getByRole('button', { name: 'Apa ini?' }))
  expect(screen.getByRole('dialog', { name: `Rambu ${sign.name}` })).toBeTruthy()
  // Baris pembuka Aku ada di atas arti, bukan menggantikannya.
  expect(screen.getByText(OPENINGS[sign.id])).toBeTruthy()
  expect(screen.getByText(sign.meaning)).toBeTruthy()
  expect(screen.getByText(`Bentuk: ${WALK_SHAPES[sign.id]}`)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  // Kembali ke beat yang sama: kalimat dan kedua tombolnya masih ada.
  expectPanelLine(STOP_LINES[index])
  expect(screen.getByRole('button', { name: 'Lanjut jalan' })).toBeTruthy()
}

/**
 * Jalankan seluruh perjalanan kaki: tiga leg, tiga rambu (dibaca lewat
 * panel), lalu "Lanjut jalan" sampai persimpangan. Panel persimpangan
 * menawarkan kedua rute.
 */
async function clearWalk() {
  for (let i = 0; i < WALK_SIGNS.length; i += 1) {
    await arriveAtSign(i)
    readSign(i)

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut jalan' }))

    if (i < WALK_SIGNS.length - 1) {
      // Leg berikutnya hanya bercerita: tidak ada tombol di panel.
      expectPanelLine(LEG_LINES[i + 1])
      expect(screen.queryByRole('button', { name: 'Lanjut jalan' })).toBeNull()
    }
  }

  expectPanelLine(CROSSROAD_LINE)
  expect(screen.getByRole('button', { name: 'Ke materi' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ke kuis' })).toBeTruthy()
}

/**
 * Answer the five real questions, choosing the right option when `correct`
 * says so and a wrong one otherwise. Advances through the quiz to the home
 * screen.
 */
function answerQuiz(correct: (question: Question, index: number) => boolean) {
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

describe('alur aplikasi', () => {
  it('rambu berhenti memunculkan panel; Apa ini? → lembar → Tutup kembali ke beat yang sama', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))

    await arriveAtSign(0)
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

    // "Lanjut jalan" melepas tombolnya; fokus harus pindah ke wadah scene.
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut jalan' }))
    const afterContinue = document.activeElement as HTMLElement
    expect(afterContinue).not.toBe(document.body)
    expect(afterContinue.closest('.wk-scene')).toBeTruthy()
    expectPanelLine(LEG_LINES[1])
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
    fireEvent.click(screen.getByRole('button', { name: /Rambu Banyak Anak Menyeberang/ }))
    expect(screen.getByRole('dialog', { name: 'Rambu Banyak Anak Menyeberang' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expectPanelLine(STOP_LINES[0])
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

    // Kartu membuka lembar yang sama, lengkap dengan pembuka naskah.
    const card = screen.getByRole('button', { name: /Banyak Anak Menyeberang/ })
    // jsdom tidak memindahkan fokus saat klik; browser sungguhan melakukannya.
    card.focus()
    fireEvent.click(card)
    expect(screen.getByText(OPENINGS.anak)).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(card)

    // Tombol lanjut ke kuis hanya ada di panel (dock lama sudah dibuang).
    fireEvent.click(screen.getByRole('button', { name: 'Sudah paham, coba kuis' }))
    await waitFor(() => expectNoPanel())
    answerQuiz(() => true)
    finishQuizPanel()

    expect(screen.getByText('Benar 5/5')).toBeTruthy()
    expect(screen.getByText('Bintang 3 ⭐')).toBeTruthy()
    // `via` still says the materi path, even though the quiz came after it.
    expect(screen.getByText('Kamu belajar dulu, lalu mengerjakan kuis.')).toBeTruthy()
    expect(screen.queryByText('Kamu berani mencoba kuis lebih dulu.')).toBeNull()

    // "Pulang" menutup panel di rumah; kartu rumah tetap punya tombol main lagi.
    fireEvent.click(screen.getByRole('button', { name: 'Pulang' }))
    await waitFor(() => expectNoPanel())
    fireEvent.click(screen.getByRole('button', { name: 'Main lagi dari kelas' }))
    expect(screen.getByRole('heading', { name: /Petualangan Rambu Lalu Lintas/ })).toBeTruthy()
  })

  it('jalur kuis: 3 dari 5 benar, Bintang 2, dan teks jalur kuis', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke kuis' }))
    expect(screen.getByText('Soal 1/5')).toBeTruthy()
    // Selama soal, panel tidak menemani (tidak ada tombol yang bisa dipakai
    // melewati kuis).
    await waitFor(() => expectNoPanel())

    answerQuiz((_, index) => index < 3)
    finishQuizPanel()

    expect(screen.getByText('Benar 3/5')).toBeTruthy()
    expect(screen.getByText('Bintang 2 ⭐')).toBeTruthy()
    expect(screen.getByText('Kamu berani mencoba kuis lebih dulu.')).toBeTruthy()
    expect(screen.queryByText('Kamu belajar dulu, lalu mengerjakan kuis.')).toBeNull()
  })

  it('jalur kuis: tepat 4 dari 5 benar dapat Bintang 3', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke kuis' }))
    answerQuiz((_, index) => index < 4)
    finishQuizPanel()

    // The 4/2 rule lives exactly on this boundary: 4 is three stars, 3 is not.
    expect(screen.getByText('Benar 4/5')).toBeTruthy()
    expect(screen.getByText('Bintang 3 ⭐')).toBeTruthy()
  })

  it('skor 0 tetap pulang dengan Bintang 1', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke kuis' }))
    answerQuiz(() => false)
    finishQuizPanel()

    expect(screen.getByText('Benar 0/5')).toBeTruthy()
    expect(screen.getByText('Bintang 1 ⭐')).toBeTruthy()
  })

  it('Pulang melepas panel dari DOM dan fokus mendarat di judul rumah', async () => {
    await reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Ke kuis' }))
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
