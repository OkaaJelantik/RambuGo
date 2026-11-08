import { describe, expect, it } from 'vitest'
import {
  PROP_KINDS,
  PROP_MIN_GAP,
  PROP_POOL_SIZE,
  PROP_RULES,
  PROP_SPAWN_D,
  PROP_WAIT,
  createPropPool,
  fitsPropGap,
  pickPropKind,
  propKindsOf,
  propNearest,
  stepPropPool,
} from './props'
import { createRng } from './spawner'
import { SCROLL_PER_SEC } from './world'
import { FADE_FAR, fadeAt } from './projection'

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
  it('mewarmi jalan sejak frame pertama: ≥5 slot terlihat dan ketiga pita terisi', () => {
    const pool = createPropPool(11)
    const kinds = propKindsOf(pool)
    const filled = pool.slots.filter((slot) => slot !== null)
    const visible = filled.filter((slot) => slot && fadeAt(slot.depth) > 0)
    expect(visible.length).toBeGreaterThanOrEqual(5)
    // `propKindsOf` adalah satu-satunya sumber untuk React: slot yang terisi
    // harus persis sama dengan yang dilaporkan, kalau tidak ada <div> kosong.
    expect(kinds.filter(Boolean).length).toBe(filled.length)
    // Keragaman dijamin: prewarm merotasi pita, bukan mengundi bebas.
    const bands = new Set(pool.slots.flatMap((slot) => (slot ? [PROP_RULES[slot.kind].band] : [])))
    expect(bands.size).toBe(3)
  })

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

  it('menjaga jalan tetap ramai: 4–9 objek hidup serentak, tidak memenuhi pool', () => {
    // Jalan yang hanya menyisakan 2–3 objek adalah keluhan "scene cukup sepi".
    // Batas atas menjaga pool tidak penuh (spawn gagal terus → jalan macet).
    const dt = 1 / 60
    const pool = createPropPool(7)
    let minAlive = PROP_POOL_SIZE
    for (let t = 0; t < 45; t += dt) {
      stepPropPool(pool, dt, SCROLL_PER_SEC * dt)
      minAlive = Math.min(minAlive, pool.slots.filter(Boolean).length)
    }
    expect(minAlive).toBeGreaterThanOrEqual(4)
    expect(pool.slots.filter(Boolean).length).toBeLessThanOrEqual(9)
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

  it('melahirkan objek dalam keadaan tak terlihat di garis cakrawala', () => {
    // Objek yang lahir saat fadeAt > 0 muncul di tengah layar. 1,0 adalah
    // kedalaman spawn; FADE_FAR (0,92) adalah tempat fade habis, jadi spawn
    // harus di titik itu atau lebih jauh.
    expect(PROP_SPAWN_D).toBe(1)
    expect(PROP_SPAWN_D).toBeGreaterThanOrEqual(FADE_FAR)
    expect(fadeAt(PROP_SPAWN_D)).toBe(0)
  })

  it('memberi setiap jenis umur yang cukup panjang sebelum dilepas', () => {
    // Dilepas pada `nearest`; umur = (spawn − nearest) / SCROLL_PER_SEC.
    // Furniture 0,85 m yang hidup 2 detik adalah "despawn terlalu cepat".
    // Pita taman/tepi taman lepas lewat tepi frame kiri, jadi harus hidup
    // paling lama; objek kerb tidak pernah keluar frame dan memudar di tempat,
    // jadi batasnya lebih pendek tetapi tetap > 2 detik.
    const life = (kind: (typeof PROP_KINDS)[number]) =>
      (PROP_SPAWN_D - propNearest(kind)) / SCROLL_PER_SEC
    for (const kind of PROP_KINDS) {
      const floor = PROP_RULES[kind].band === 'kerb' ? 2.0 : 2.8
      expect(life(kind)).toBeGreaterThanOrEqual(floor)
    }
    // Yang paling penting: furniture taman keluar frame, bukan lenyap di
    // tengah layar. nearest-nya harus ≤ kedalaman tempat kotaknya masih di
    // dalam frame; 0,14 menjaga itu dengan margin.
    expect(PROP_RULES.bench.nearest).toBeLessThanOrEqual(0.16)
    expect(PROP_RULES.tree.nearest).toBeLessThanOrEqual(0.16)
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
    // Pool lahir sudah terisi (prewarm); uji aturan jarak pada pool bersih.
    pool.slots = pool.slots.map(() => null)
    pool.slots[0] = { kind: 'tree', x: PROP_RULES.tree.x, depth: 0.5 }
    expect(fitsPropGap(pool, 'garden', 0.5)).toBe(false)
    expect(fitsPropGap(pool, 'garden', 0.5 + PROP_MIN_GAP * 2)).toBe(true)
    // Pita lain tidak terpengaruh.
    expect(fitsPropGap(pool, 'kerb', 0.5)).toBe(true)
  })
})
