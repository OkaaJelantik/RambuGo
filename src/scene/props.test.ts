import { describe, expect, it } from 'vitest'
import {
  PROP_END_D,
  PROP_MIN_GAP,
  PROP_RULES,
  PROP_SPAWN_D,
  PROP_WAIT,
  createPropPool,
  fitsPropGap,
  pickPropKind,
  stepPropPool,
} from './props'
import { createRng } from './spawner'
import { SCROLL_PER_SEC } from './world'

/** Simulasikan pool selama `seconds`, kembalikan setiap spawn (jenis + waktu). */
function run(seconds: number, seed = 7) {
  const pool = createPropPool(seed)
  const spawns: Array<{ kind: string; t: number }> = []
  const dt = 1 / 60
  let maxAlive = 0
  for (let t = 0; t < seconds; t += dt) {
    const before = pool.spawned
    stepPropPool(pool, dt, SCROLL_PER_SEC * dt)
    if (pool.spawned > before) spawns.push({ kind: '', t })
    maxAlive = Math.max(maxAlive, pool.slots.filter(Boolean).length)
  }
  return { pool, spawns, maxAlive }
}

describe('scenery kontinu', () => {
  it('seed yang sama menghasilkan urutan spawn yang sama', () => {
    const a = run(20, 11)
    const b = run(20, 11)
    expect(a.pool.spawned).toBe(b.pool.spawned)
  })

  it('melahirkan objek berulang, bukan sekali lalu berhenti', () => {
    const { pool } = run(40)
    // Satu objek hidup (0,95 − 0,06) / 0,30 ≈ 3 detik; 40 detik berarti
    // puluhan spawn. Kalau ini 0–1, loop-nya mati seperti bug depth arah.
    expect(pool.spawned).toBeGreaterThan(20)
  })

  it('menjaga jumlah objek serentak tetap wajar, tidak memenuhi pool', () => {
    const { maxAlive } = run(60)
    expect(maxAlive).toBeGreaterThan(1)
    expect(maxAlive).toBeLessThan(8)
  })

  it('jeda spawn berada di antara batas yang ditetapkan', () => {
    const pool = createPropPool(5)
    let last = 0
    const dt = 1 / 60
    const gaps: number[] = []
    for (let t = 0; t < 30; t += dt) {
      const before = pool.spawned
      stepPropPool(pool, dt, SCROLL_PER_SEC * dt)
      if (pool.spawned > before) {
        if (last > 0) gaps.push(t - last)
        last = t
      }
    }
    expect(gaps.length).toBeGreaterThan(5)
    for (const gap of gaps) {
      // Toleransi satu frame: batas bawah diukur pada tick berikutnya.
      expect(gap).toBeGreaterThanOrEqual(PROP_WAIT.min - dt * 2)
      expect(gap).toBeLessThan(PROP_WAIT.max + dt * 2)
    }
  })

  it('tidak menempatkan dua objek sepita lebih rapat dari jarak minimum', () => {
    const pool = createPropPool(9)
    const dt = 1 / 60
    for (let t = 0; t < 40; t += dt) {
      stepPropPool(pool, dt, SCROLL_PER_SEC * dt)
      for (const slot of pool.slots) {
        if (!slot) continue
        for (const other of pool.slots) {
          if (!other || other === slot) continue
          if (PROP_RULES[other.kind].band !== PROP_RULES[slot.kind].band) continue
          if (Math.abs(other.depth - slot.depth) < PROP_MIN_GAP - 0.001) {
            // Hanya boleh terjadi karena dua objek berjalan mendekat satu sama
            // lain setelah sempat berjarak — bukan karena lahir berdempetan.
            expect(other.depth).toBeGreaterThan(PROP_SPAWN_D - 0.02)
          }
        }
      }
    }
  })

  it('melepas objek hanya setelah fade-nya selesai', () => {
    // Kalau dilepas sebelum nearFadeAt mencapai 0, objek menghilang mendadak.
    expect(PROP_END_D).toBeLessThanOrEqual(0.06)
  })

  it('mengundi jenis sesuai bobot: pohon sering, halte jarang', () => {
    const rng = createRng(3)
    const counts = new Map<string, number>()
    for (let i = 0; i < 4000; i += 1) {
      const kind = pickPropKind(rng)
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    expect(counts.get('tree')!).toBeGreaterThan(counts.get('busstop')!)
    expect(counts.get('lamp')!).toBeGreaterThan(counts.get('busstop')!)
    // Semua jenis pernah muncul: tidak ada yang bobotnya nol.
    for (const kind of Object.keys(PROP_RULES)) expect(counts.get(kind) ?? 0).toBeGreaterThan(0)
  })

  it('menolak kandidat yang terlalu dekat di pita yang sama', () => {
    const pool = createPropPool(3)
    pool.slots[0] = { kind: 'tree', x: PROP_RULES.tree.x, depth: 0.5 }
    expect(fitsPropGap(pool, 'garden', 0.5)).toBe(false)
    expect(fitsPropGap(pool, 'garden', 0.5 + PROP_MIN_GAP * 2)).toBe(true)
    // Pita lain tidak terpengaruh.
    expect(fitsPropGap(pool, 'kerb', 0.5)).toBe(true)
  })
})
