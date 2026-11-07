import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { QUESTIONS, WALK_SIGNS, type Question } from './data'
import { LEG_SECONDS } from './scene/world'

/**
 * The walk scene scrolls on `requestAnimationFrame`; jsdom has no clock behind
 * it. A deterministic frame queue replaces the browser's, so every leg takes
 * exactly its real `LEG_SECONDS` and can be driven without timers or sleeps.
 *
 * `WalkScene` caps one frame at 100 ms of world time, so frames are advanced
 * in 100 ms steps: one step for the zero-`dt` first frame, `LEG_SECONDS` worth
 * to finish the leg, plus a little slack.
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
    advance(frames: number, ms = 100) {
      act(() => {
        for (let i = 0; i < frames; i += 1) {
          now += ms
          const due = [...pending.values()]
          pending.clear()
          for (const cb of due) cb(now)
        }
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
  vi.unstubAllGlobals()
})

/** The plate of the sign this leg walks towards, once the world has stopped. */
function signPlate(signName: string) {
  return screen.getByRole('button', {
    name: `Rambu ${signName}, tekan untuk melihat artinya`,
  })
}

/**
 * Walk all three legs of the real scene: wait out the leg, open the sheet,
 * read the real copy, close it. Leaves the app at the crossroad.
 */
function clearWalk() {
  for (const sign of WALK_SIGNS) {
    // While the world is walking the plate is hidden from assistive tech.
    expect(
      screen.queryByRole('button', {
        name: `Rambu ${sign.name}, tekan untuk melihat artinya`,
      }),
    ).toBeNull()

    frames.advance(FRAMES_PER_LEG)

    fireEvent.click(signPlate(sign.name))
    expect(screen.getByRole('dialog', { name: `Rambu ${sign.name}` })).toBeTruthy()
    expect(screen.getByText(sign.meaning)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mengerti, lanjut jalan' }))
    // Closing advances the leg (or ends the walk): the sheet is gone again.
    expect(screen.queryByRole('dialog')).toBeNull()
  }
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

/** Enter the classroom, walk to the crossroad, and assert we arrived. */
function reachCrossroad() {
  render(<App />)

  expect(screen.getByRole('heading', { name: /Petualangan Rambu Lalu Lintas/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Keluar kelas/ }))

  // WalkScene is on screen and its HUD names the road ahead.
  expect(screen.getByText('Jalan ke jalan raya')).toBeTruthy()

  clearWalk()

  expect(screen.getByRole('heading', { name: 'Kamu sampai di persimpangan' })).toBeTruthy()
}

describe('alur aplikasi', () => {
  it('jalur materi: 3 rambu, layar materi, lalu 5/5 dengan teks jalur materi', () => {
    reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Jalur materi: belajar rambu lalu lintas' }))
    expect(screen.getByRole('heading', { name: 'Jalur Materi' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Sudah paham, coba kuis/ }))
    answerQuiz(() => true)

    expect(screen.getByText('Benar 5/5')).toBeTruthy()
    expect(screen.getByText('Bintang 3 ⭐')).toBeTruthy()
    // `via` still says the materi path, even though the quiz came after it.
    expect(screen.getByText('Kamu belajar dulu, lalu mengerjakan kuis.')).toBeTruthy()
    expect(screen.queryByText('Kamu berani mencoba kuis lebih dulu.')).toBeNull()
  })

  it('jalur kuis: 3 dari 5 benar, Bintang 2, dan teks jalur kuis', () => {
    reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Jalur kuis: uji pemahaman rambu' }))
    expect(screen.getByText('Soal 1/5')).toBeTruthy()

    answerQuiz((_, index) => index < 3)

    expect(screen.getByText('Benar 3/5')).toBeTruthy()
    expect(screen.getByText('Bintang 2 ⭐')).toBeTruthy()
    expect(screen.getByText('Kamu berani mencoba kuis lebih dulu.')).toBeTruthy()
    expect(screen.queryByText('Kamu belajar dulu, lalu mengerjakan kuis.')).toBeNull()
  })

  it('jalur kuis: tepat 4 dari 5 benar dapat Bintang 3', () => {
    reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Jalur kuis: uji pemahaman rambu' }))
    answerQuiz((_, index) => index < 4)

    // The 4/2 rule lives exactly on this boundary: 4 is three stars, 3 is not.
    expect(screen.getByText('Benar 4/5')).toBeTruthy()
    expect(screen.getByText('Bintang 3 ⭐')).toBeTruthy()
  })

  it('skor 0 tetap pulang dengan Bintang 1', () => {
    reachCrossroad()

    fireEvent.click(screen.getByRole('button', { name: 'Jalur kuis: uji pemahaman rambu' }))
    answerQuiz(() => false)

    expect(screen.getByText('Benar 0/5')).toBeTruthy()
    expect(screen.getByText('Bintang 1 ⭐')).toBeTruthy()
  })
})
