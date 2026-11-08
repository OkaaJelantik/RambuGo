import { describe, expect, it } from 'vitest'
import { SIGN_STOP_D, fadeAt } from './projection'
import { createWorld, LEG_SECONDS, SCROLL_PER_SEC, signDepth, stepWorld } from './world'

/** The scroll a full leg should accumulate: 0,30 depth units per second. */
const LEG_SCROLL = SCROLL_PER_SEC * LEG_SECONDS

describe('createWorld', () => {
  it('starts walking at scroll 0, travel 0, on the requested sign', () => {
    const world = createWorld(0)

    expect(world.mode).toBe('walking')
    expect(world.scroll).toBe(0)
    expect(world.travel).toBe(0)
    expect(world.step).toBe(0)
  })

  it('keeps the step it was created with', () => {
    expect(createWorld(2).step).toBe(2)
  })

  it('carries the scroll of the previous leg over instead of resetting it', () => {
    // Reset tiap leg membuat marka melompat fase dan rambu yang baru dilewati
    // lenyap alih-alih menjauh.
    expect(createWorld(1, 1.8).scroll).toBe(1.8)
    expect(createWorld(1).scroll).toBe(0)
  })
})

describe('signDepth', () => {
  it('starts at the horizon and arrives at the stop depth when the leg ends', () => {
    expect(signDepth(createWorld(0))).toBe(1)
    const arrived = stepWorld(createWorld(0), LEG_SECONDS)
    expect(signDepth(arrived)).toBeCloseTo(SIGN_STOP_D, 9)
  })

  it('walks towards the camera monotonically and stays invisible until it is close', () => {
    let world = createWorld(0)
    let previous = signDepth(world)
    const dt = 1 / 60
    while (world.mode === 'walking') {
      world = stepWorld(world, dt)
      const depth = signDepth(world)
      expect(depth).toBeLessThanOrEqual(previous + 1e-12)
      previous = depth
      // Selama kedalaman masih di luar `FADE_FAR` rambu tidak terlihat: ia
      // datang lewat kabut, bukan muncul tiba-tiba.
      if (world.travel <= 2.6) expect(fadeAt(depth)).toBe(0)
    }
  })
})

describe('stepWorld', () => {
  it('adds SCROLL_PER_SEC * dt to scroll while walking', () => {
    const world = createWorld(0)
    const next = stepWorld(world, 0.5)

    expect(next.mode).toBe('walking')
    expect(Math.abs(next.scroll - SCROLL_PER_SEC * 0.5)).toBeLessThanOrEqual(1e-9)
    expect(next.travel).toBe(0.5)
  })

  it('stops once the accumulated travel reaches LEG_SECONDS, then freezes scroll', () => {
    let world = createWorld(0)
    for (let i = 0; i < 36; i += 1) {
      world = stepWorld(world, LEG_SECONDS / 36)
    }

    expect(world.mode).toBe('stopped')
    expect(world.travel).toBe(LEG_SECONDS)
    expect(Math.abs(world.scroll - LEG_SCROLL)).toBeLessThanOrEqual(1e-9)

    const after = stepWorld(world, 1)

    expect(after.mode).toBe('stopped')
    expect(after.scroll).toBe(world.scroll)
    // Nothing changed, so the reducer hands back the very same object.
    expect(after).toBe(world)
  })

  it('does not mutate its input', () => {
    const world = createWorld(1)
    const before = { ...world }

    stepWorld(world, 0.25)

    expect(world).toEqual(before)
  })

  it('stops without overshooting when dt is much larger than the leg', () => {
    const world = stepWorld(createWorld(0), LEG_SECONDS * 2)

    expect(world.mode).toBe('stopped')
    expect(world.travel).toBe(LEG_SECONDS)
    expect(Math.abs(world.scroll - LEG_SCROLL)).toBeLessThanOrEqual(1e-9)
    expect(world.scroll).toBeLessThanOrEqual(LEG_SCROLL + 1e-9)
  })

  it('ignores non-positive dt', () => {
    const world = createWorld(0)

    expect(stepWorld(world, 0)).toBe(world)
    expect(stepWorld(world, -1)).toBe(world)
  })
})
