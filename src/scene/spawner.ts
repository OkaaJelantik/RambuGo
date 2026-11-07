/**
 * Deterministic spawner for the walk scene's traffic and pedestrians.
 *
 * Pure and DOM-free: `WalkScene` owns the clock and the single rAF loop,
 * this module only decides *what* appears and *when*. Seeding the RNG from
 * one exported constant makes a demo reproducible from run to run.
 */

/** Seed used by the scene's traffic and pedestrian RNGs. */
export const SPAWN_SEED = 20261107

/** Depth an object starts at: the horizon, where the haze hides the pop-in. */
export const SPAWN_DEPTH = 1

/** Speed bands in depth units per second. Vehicles are brisk, walkers calm. */
export const TRAFFIC_SPEED = { min: 0.18, max: 0.3 } as const
export const PED_SPEED = { min: 0.08, max: 0.14 } as const

/**
 * Depth direction of each lane: `-1` comes towards the camera, `1` heads
 * away. Indonesia drives on the left, so the lane next to the left sidewalk
 * carries traffic towards the camera.
 */
export const LANE_DIR = {
  laneL: -1,
  laneR: 1,
  sidewalkL: -1,
  sidewalkR: 1,
} as const

export type Traffic = {
  id: number
  lane: 'laneL' | 'laneR'
  kind: 'car' | 'bike'
  depth: number
  speed: number
  dir: 1 | -1
}

export type Ped = {
  id: number
  lane: 'sidewalkL' | 'sidewalkR'
  kind: 'adult' | 'child'
  depth: number
  speed: number
}

/**
 * mulberry32: a tiny, fast, deterministic PRNG. Returns floats in `[0, 1)`;
 * the same seed always produces the same sequence.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A random number in `[min, max)`. */
function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

/**
 * A fresh vehicle at the horizon. Direction follows the lane, never the art:
 * keep it here so a lane swap cannot silently reverse the traffic.
 */
export function spawnTraffic(rng: () => number, nextId: number): Traffic {
  const lane: Traffic['lane'] = rng() < 0.5 ? 'laneL' : 'laneR'
  const kind: Traffic['kind'] = rng() < 0.5 ? 'car' : 'bike'
  const speed = between(rng, TRAFFIC_SPEED.min, TRAFFIC_SPEED.max)

  return { id: nextId, lane, kind, depth: SPAWN_DEPTH, speed, dir: LANE_DIR[lane] }
}

/**
 * A fresh pedestrian at the horizon. The brief does not put a direction on
 * `Ped`, so the scene reads it from `LANE_DIR` alongside the traffic.
 *
 * Only two slots exist and a walker lives for many seconds, so lane and age
 * alternate with the spawn sequence instead of being random: that way a
 * short demo always shows both sidewalks and both silhouettes. Only the calm
 * walking speed is drawn from the RNG.
 */
export function spawnPed(rng: () => number, nextId: number): Ped {
  const lane: Ped['lane'] = Math.floor(nextId / 2) % 2 === 0 ? 'sidewalkL' : 'sidewalkR'
  const kind: Ped['kind'] = nextId % 2 === 0 ? 'child' : 'adult'
  const speed = between(rng, PED_SPEED.min, PED_SPEED.max)

  return { id: nextId, lane, kind, depth: SPAWN_DEPTH, speed }
}

/**
 * Whether this frame should spawn, given how long it has been since the last
 * spawn and the random wait this cycle drew (`min`..`max` seconds).
 *
 * `min` is a hard floor: a spawn can never happen before it. `max` is the
 * deadline this cycle is waiting for, so a jittery frame cannot starve the
 * road. Negative `dt` is ignored.
 */
export function shouldSpawn(dt: number, sinceLast: number, min: number, max: number): boolean {
  if (sinceLast < min) return false
  return sinceLast + Math.max(0, dt) >= max
}
