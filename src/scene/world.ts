/**
 * Pure state for the 2.5D walk scene: how far the world has scrolled, how
 * long the current leg has been walking, and which sign is active.
 *
 * No DOM, no React, no clock — `WalkScene` owns the single animation frame
 * loop and feeds this reducer the elapsed seconds. Keeping the rules here
 * makes the motion unit-testable without a browser.
 */

/**
 * World depth scrolled per second while walking. Halved for Task 11: 0,30 is
 * a seven-year-old's amble, not the old 0,55 rush.
 */
export const SCROLL_PER_SEC = 0.3

/** Seconds spent walking between two signs. One leg is six calm seconds. */
export const LEG_SECONDS = 6.0

/** Tolerance used to treat a frame that lands just short of the leg's end as the end. */
const EPSILON = 1e-9

export type Mode = 'walking' | 'stopped'

export type WorldState = {
  mode: Mode
  /** Seconds since this leg started. */
  travel: number
  /** World offset in depth units; only grows while walking. */
  scroll: number
  /** Index of the sign this leg walks towards (0..2). */
  step: number
}

/** A fresh world for one leg, walking towards `step`. */
export function createWorld(step: number): WorldState {
  return { mode: 'walking', travel: 0, scroll: 0, step }
}

/**
 * Advance the world by `dt` seconds. Pure: the input is never mutated, and
 * the same object is returned when nothing changes (stopped, or `dt <= 0`).
 *
 * Walking adds `SCROLL_PER_SEC` depth units per second. Once the leg reaches
 * `LEG_SECONDS` the world stops and scroll freezes; `travel` is clamped to
 * the leg length so a huge `dt` cannot overshoot.
 */
export function stepWorld(s: WorldState, dt: number): WorldState {
  if (s.mode === 'stopped' || !(dt > 0)) return s

  const remaining = Math.max(0, LEG_SECONDS - s.travel)
  const advanced = Math.min(dt, remaining)

  if (s.travel + advanced >= LEG_SECONDS - EPSILON) {
    return {
      mode: 'stopped',
      travel: LEG_SECONDS,
      scroll: s.scroll + SCROLL_PER_SEC * remaining,
      step: s.step,
    }
  }

  return {
    mode: 'walking',
    travel: s.travel + advanced,
    scroll: s.scroll + SCROLL_PER_SEC * advanced,
    step: s.step,
  }
}
