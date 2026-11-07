import { describe, expect, it } from 'vitest'
import {
  LANE_DIR,
  PED_SPEED,
  SPAWN_DEPTH,
  SPAWN_SEED,
  TRAFFIC_SPEED,
  createRng,
  spawnPed,
  spawnTraffic,
  shouldSpawn,
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
      expect(traffic.speed).toBeGreaterThanOrEqual(TRAFFIC_SPEED.min)
      expect(traffic.speed).toBeLessThanOrEqual(TRAFFIC_SPEED.max)

      lanes.add(traffic.lane)
      kinds.add(traffic.kind)
    }

    // Kedua lajur dan kedua jenis benar-benar muncul, bukan konstanta.
    expect(lanes).toEqual(new Set(['laneL', 'laneR']))
    expect(kinds).toEqual(new Set(['car', 'bike']))
  })

  it('laneL selalu menuju kamera dan laneR selalu menjauh', () => {
    const rng = createRng(SPAWN_SEED)

    for (let id = 1; id <= 200; id += 1) {
      const traffic = spawnTraffic(rng, id)
      expect(traffic.dir).toBe(LANE_DIR[traffic.lane])
      expect(traffic.dir).toBe(traffic.lane === 'laneL' ? -1 : 1)
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
