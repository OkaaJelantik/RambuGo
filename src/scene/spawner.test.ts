import { describe, expect, it } from 'vitest'
import {
  BIKE_LANE_OFFSET_M,
  createRng,
  fitsLaneGap,
  LANE_DIR,
  MIN_LANE_GAP,
  PED_SPEED,
  shouldSpawn,
  SPAWN_DEPTH,
  SPAWN_SEED,
  spawnPed,
  spawnTraffic,
  TRAFFIC_SPEED,
} from './spawner'

/** Number of RNG samples used when checking the output range. */
const SAMPLES = 2000

describe('createRng', () => {
  it('menghasilkan urutan yang sama pada dua instans dengan seed yang sama', () => {
    const first = createRng(42)
    const second = createRng(42)

    const a = Array.from({ length: 32 }, () => first())
    const b = Array.from({ length: 32 }, () => second())

    expect(a).toEqual(b)
  })

  it('memakai mulberry32: nilai pertama seed 42 tetap', () => {
    // Angka acuan mulberry32; mengunci algoritma, bukan cuma sifat "sama".
    expect(createRng(42)()).toBeCloseTo(0.6011037519201636, 12)
  })

  it('selalu memberi nilai di [0, 1)', () => {
    const rng = createRng(SPAWN_SEED)

    for (let i = 0; i < SAMPLES; i += 1) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('memberi urutan berbeda untuk seed berbeda', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })
})

describe('spawnTraffic', () => {
  it('mulai di cakrawala dengan kecepatan 0.18–0.30 depth/detik', () => {
    const rng = createRng(SPAWN_SEED)
    const lanes = new Set<string>()
    const kinds = new Set<string>()

    for (let id = 1; id <= 200; id += 1) {
      const traffic = spawnTraffic(rng, id)

      expect(traffic.id).toBe(id)
      expect(traffic.depth).toBe(SPAWN_DEPTH)
      expect(traffic.depth).toBe(1)
      // Batas literal, bukan konstanta modul: kalau pita kecepatan bergeser,
      // test ini harus gagal.
      expect(traffic.speed).toBeGreaterThanOrEqual(0.18)
      expect(traffic.speed).toBeLessThanOrEqual(0.3)

      lanes.add(traffic.lane)
      kinds.add(traffic.kind)
    }

    // Kedua lajur dan kedua jenis benar-benar muncul, bukan konstanta.
    expect(lanes).toEqual(new Set(['laneL', 'laneR']))
    expect(kinds).toEqual(new Set(['car', 'bike']))
  })

  it('laneL searah hero (+1) dan laneR mendekat (-1), lajur kiri Indonesia', () => {
    const rng = createRng(SPAWN_SEED)

    expect(LANE_DIR).toMatchObject({ laneL: 1, laneR: -1 })

    for (let id = 1; id <= 200; id += 1) {
      const traffic = spawnTraffic(rng, id)
      expect(traffic.dir).toBe(LANE_DIR[traffic.lane])
      expect(traffic.dir).toBe(traffic.lane === 'laneL' ? 1 : -1)
    }
  })
})

describe('spawnPed', () => {
  it('mulai di cakrawala dengan kecepatan jalan yang tenang', () => {
    const rng = createRng(SPAWN_SEED + 1)
    const lanes = new Set<string>()
    const kinds = new Set<string>()

    for (let id = 1; id <= 200; id += 1) {
      const ped = spawnPed(rng, id)

      expect(ped.id).toBe(id)
      expect(ped.depth).toBe(SPAWN_DEPTH)
      expect(ped.speed).toBeGreaterThanOrEqual(PED_SPEED.min)
      expect(ped.speed).toBeLessThanOrEqual(PED_SPEED.max)

      lanes.add(ped.lane)
      kinds.add(ped.kind)
    }

    expect(lanes).toEqual(new Set(['sidewalkL', 'sidewalkR']))
    expect(kinds).toEqual(new Set(['adult', 'child']))
  })

  it('menyebar lajur dan usia sejak dua spawn pertama', () => {
    const rng = createRng(SPAWN_SEED + 1)
    const first = spawnPed(rng, 1)
    const second = spawnPed(rng, 2)

    expect(first.lane).not.toBe(second.lane)
    expect(first.kind).not.toBe(second.kind)
  })
})

describe('shouldSpawn', () => {
  it('benar begitu waktu tunggu melewati batas atas', () => {
    expect(shouldSpawn(0.016, 3, 1, 2)).toBe(true)
    expect(shouldSpawn(0.016, 2.5, 1, 2)).toBe(true)
    expect(shouldSpawn(0, 2.01, 1, 2)).toBe(true)
  })

  it('salah sebelum batas bawah, sekalipun dt besar', () => {
    expect(shouldSpawn(0.016, 0.2, 1, 2.5)).toBe(false)
    expect(shouldSpawn(5, 0.9, 1, 2.5)).toBe(false)
  })

  it('benar pada frame yang melewati batas atas dari dalam rentang', () => {
    expect(shouldSpawn(0.2, 1.9, 1, 2)).toBe(true)
    expect(shouldSpawn(0.01, 1.5, 1, 2.5)).toBe(false)
  })

  it('mengabaikan dt negatif dan nol', () => {
    expect(shouldSpawn(-1, 0.5, 1, 2)).toBe(false)
    expect(shouldSpawn(-1, 3, 1, 2)).toBe(true)
    expect(shouldSpawn(0, 1.5, 1, 2)).toBe(false)
  })
})

describe('denser traffic', () => {
  it('sends ~65 % of spawns down the visible receding lane', () => {
    const rng = createRng(SPAWN_SEED)
    let nearLane = 0
    for (let i = 0; i < 400; i += 1) {
      if (spawnTraffic(rng, i).lane === 'laneL') nearLane += 1
    }
    const share = nearLane / 400
    expect(share).toBeGreaterThan(0.55)
    expect(share).toBeLessThan(0.75)
  })

  it('never lets two vehicles in one lane sit closer than MIN_LANE_GAP', () => {
    const rng = createRng(SPAWN_SEED)
    const a = { ...spawnTraffic(rng, 1), lane: 'laneL' as const, depth: 0.4 }
    expect(fitsLaneGap(0.4 + MIN_LANE_GAP / 2, [a], 'laneL')).toBe(false)
    expect(fitsLaneGap(0.4 + MIN_LANE_GAP * 2, [a], 'laneL')).toBe(true)
    // Another lane is unaffected.
    expect(fitsLaneGap(0.4, [a], 'laneR')).toBe(true)
    expect(fitsLaneGap(0.4, [null, a], 'laneL')).toBe(false)
  })

  it('offsets motorcycles inside the lane and leaves cars centred', () => {
    const rng = createRng(SPAWN_SEED)
    let bikes = 0
    for (let i = 0; i < 200; i += 1) {
      const t = spawnTraffic(rng, i)
      if (t.kind === 'bike') {
        bikes += 1
        expect(Math.abs(t.offsetM)).toBeLessThanOrEqual(BIKE_LANE_OFFSET_M)
      } else {
        expect(t.offsetM).toBe(0)
      }
    }
    expect(bikes).toBeGreaterThan(0)
  })
})
