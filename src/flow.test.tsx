import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import Crossroad from './Crossroad'
import { QUESTIONS, SIGNS, type Question } from './data'
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
 * salah (dulu "persegi hijau", padahal rambu petunjuk biru).
 */
const WALK_SHAPES: Record<string, string> = {
  anak: 'segitiga kuning',
  zebra: 'persegi biru',
  'dilarang-masuk': 'bulat merah',
  'belok-kiri': 'bulat biru',
  'hati-hati': 'segitiga kuning',
  'dilarang-parkir': 'bulat merah',
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
  anak: 'Eh, ada rambu segitiga kuning. Artinya apa, ya?',
  zebra: 'Eh, ada rambu persegi biru. Artinya apa, ya?',
  'dilarang-masuk': 'Eh, ada rambu bulat merah. Artinya apa, ya?',
  'belok-kiri': 'Eh, ada rambu bulat biru. Artinya apa, ya?',
  'hati-hati': 'Eh, ada rambu segitiga kuning. Artinya apa, ya?',
  'dilarang-parkir': 'Eh, ada rambu bulat merah. Artinya apa, ya?',
}

/** Baris mana pun yang sah untuk berhenti; urutannya tidak dipin. */
function expectAnyStopLine() {
  const text = panel().textContent ?? ''
  expect(Object.values(STOP_LINES).some((line) => text.includes(line))).toBe(true)
}

const OPENINGS: Record<string, string> = {
  anak: 'Aku kecil, jadi aku paling suka rambu ini.',
  zebra: 'Kalau mau ke seberang, lewat garis putih itu.',
  'dilarang-masuk': 'Tapi aku jalan kaki. Sepeda dan mobil yang tidak boleh.',
  'belok-kiri': 'Bulat biru dengan panah. Kendaraan harus ikut arah panah.',
  'hati-hati': 'Tanda seru di segitiga kuning. Ada yang harus kuhindari di depan.',
  'dilarang-parkir': 'Huruf P dicoret. Mobil tidak boleh berhenti di sini.',
}

const CROSSROAD_LINE =
  'Sampai di persimpangan. Lurus jalan lagi, kiri belajar, kanan kuis.'
const MATERI_LINE = 'Rambu yang tadi kulihat, aku kenali satu-satu.'
const KUIS_LINE = 'Kalau benar, aku dapat bintang.'
const HOME_LINE = 'Sampai di rumah. Rambu itu kawan di jalan — besok aku cerita ke Bu Guru.'

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
  // Baris pembuka Aku ada di atas arti, bukan menggantikannya.
  expect(screen.getByText(OPENINGS[sign.id])).toBeTruthy()
  expect(screen.getByText(sign.meaning)).toBeTruthy()
  expect(screen.getByText(`Bentuk: ${WALK_SHAPES[sign.id]}`)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
  expect(screen.queryByRole('dialog')).toBeNull()
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

describe('persimpangan', () => {
  it('papan nama tiap jalur adalah bagian dari tombol jalurnya', () => {
    const onMateri = vi.fn()
    const onKuis = vi.fn()
    render(<Crossroad onMateri={onMateri} onKuis={onKuis} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      const sign = button.querySelector<HTMLElement>('.fx-sign')
      expect(sign).not.toBeNull()
      // Papan digeser keluar kotak tombol; ia hanya bisa diklik kalau tetap
      // menjadi keturunan tombol dan tidak mematikan pointer-events.
      expect(sign!.closest('button')).toBe(button)
    }

    // Aturan `.fx-sign` (bukan `.fx-sign-text`) tidak boleh mematikan hit-test.
    const css = readFileSync('src/crossroad.css', 'utf8')
    const rule = /\.fx-sign\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(rule).not.toBe('')
    expect(rule).not.toMatch(/pointer-events\s*:\s*none/)

    fireEvent.click(buttons[0])
    fireEvent.click(buttons[1])
    expect(onMateri).toHaveBeenCalledTimes(1)
    expect(onKuis).toHaveBeenCalledTimes(1)
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

  it('kuis: fokus tidak jatuh ke <body>, feedback diumumkan, rambu terbaca', async () => {
    await reachCrossroad()
    fireEvent.click(screen.getByRole('button', { name: 'Ke kuis' }))
    expect(screen.getByText('Soal 1/5')).toBeTruthy()

    // Deskripsi visual (bentuk + gambar) ikut pertanyaan, bukan per soal.
    const prompt = document.querySelector('.question-card .prompt') as HTMLElement
    const q0Sign = SIGNS.find((s) => s.id === QUESTIONS[0].signId)
    expect(q0Sign).toBeTruthy()
    if (q0Sign) expect(prompt.textContent).toContain(`Rambu ${q0Sign.visual}`)

    fireEvent.click(screen.getByRole('button', { name: 'Banyak anak menyeberang' }))
    const next = screen.getByRole('button', { name: 'Soal berikutnya →' })
    expect(document.activeElement).toBe(next)

    const live = document.querySelector<HTMLElement>('.quiz-live') as HTMLElement
    expect(live.getAttribute('role')).toBe('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toContain('Tepat sekali!')

    // Soal baru memfokuskan pertanyaannya, bukan membiarkan fokus ke <body>.
    fireEvent.click(next)
    expect(screen.getByText('Soal 2/5')).toBeTruthy()
    expect(document.activeElement).toBe(document.querySelector('.question-card .prompt'))
  })

  it('kuis: deskripsi gambarnya tidak memuat teks jawaban', async () => {
    await reachCrossroad()
    fireEvent.click(screen.getByRole('button', { name: 'Ke kuis' }))

    QUESTIONS.forEach((q, i) => {
      expect(screen.getByText(`Soal ${i + 1}/${QUESTIONS.length}`)).toBeTruthy()
      const prompt = document.querySelector('.question-card .prompt') as HTMLElement
      const text = prompt.textContent ?? ''

      if (q.signId) {
        const sign = SIGNS.find((s) => s.id === q.signId)
        expect(sign).toBeTruthy()
        // Rute kuis harus memakai `visual`, bukan `name`/`meaning`. Assertion
        // ini yang gagal kalau seseorang mengembalikan describeSign ke `name`,
        // termasuk pada soal yang teks jawabannya kebetulan tidak persis
        // terkandung di nama rambu (q2/q3).
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

    // Kartu membuka lembar yang sama, lengkap dengan pembuka naskah.
    const card = screen.getByRole('button', { name: /Banyak Anak Menyeberang/ })
    // jsdom tidak memindahkan fokus saat klik; browser sungguhan melakukannya.
    card.focus()
    fireEvent.click(card)
    expect(screen.getByText(OPENINGS.anak)).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(card)

    await passSheetGuard()
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
