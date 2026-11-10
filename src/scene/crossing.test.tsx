import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Junction from '../Junction'
import { METERS } from './meters'
import { ROAD_M } from './projection'
import { HOUSE_ART, HOUSE_BOX, houseParts } from '../art/junctionArt'
import {
  BOARDS,
  CROSS,
  HOUSE_FOOT_M,
  JUNCTION_SEED,
  KERB_W,
  LANE_GAP_M,
  LIGHT_Z,
  MARK,
  ROAD_HALF,
  SIDEWALK_W,
  SPAWN_MARGIN,
  TRAFFIC_LIGHTS,
  TRAFFIC_LIGHT,
  VEHICLE_SLOTS,
  WALK_PATH,
  ZEBRA,
  createCrossState,
  createCrossView,
  dashRects,
  groundPoints,
  junctionZ,
  kerbRects,
  pedX,
  roadRects,
  scatterProps,
  sidewalkRects,
  stepCross,
  trafficLightShapes,
  vehicleX,
  walkPaths,
  zebraRects,
  type GroundRect,
} from './crossing'

/** Empat viewport yang dipakai verifikasi scene (AGENTS §6c). */
const VIEWPORTS: ReadonlyArray<readonly [number, number]> = [
  [360, 640],
  [360, 800],
  [390, 844],
  [1280, 800],
]

const overlaps = (a: GroundRect, b: GroundRect): boolean =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0

const insideJunction = (r: GroundRect): boolean =>
  r.x0 < ROAD_HALF && r.x1 > -ROAD_HALF && r.z0 < ROAD_HALF && r.z1 > -ROAD_HALF

describe('geometri persimpangan', () => {
  it('tinggi pita melintang = lebar jalur vertikal di titik potong (simpang bujur sangkar)', () => {
    // Inti tugas: dua arah memakai satu skala. Bug lama (DEPTH_K 0,72 hanya
    // untuk jalur melintang) memberi rasio 0,72 dan langsung tertangkap di sini.
    for (const [w, h] of VIEWPORTS) {
      const view = createCrossView(w, h)
      const bandPx = view.yOfZ(-ROAD_HALF) - view.yOfZ(ROAD_HALF)
      const roadPx = view.wOf(ROAD_M, 0)
      expect(bandPx / roadPx, `${w}×${h}`).toBeGreaterThan(0.99)
      expect(bandPx / roadPx, `${w}×${h}`).toBeLessThan(1.01)
    }
  })

  it('satu meter ke utara sepanjang satu meter ke timur — kedalaman tidak dikompresi', () => {
    const view = createCrossView(390, 844)
    const lateral = view.wOf(1, 0)
    const depth = view.yOfZ(0) - view.yOfZ(1)
    expect(Math.abs(depth / lateral - 1)).toBeLessThan(0.04)
    // Skala sepanjang x memang sama dengan skala kedalaman: objek di (x, z)
    // memakai satu `s(z)`, bukan dua faktor berbeda.
    expect(view.xOf(1, 0) - view.xOf(0, 0)).toBeCloseTo(view.wOf(1, 0), 6)
  })

  it('tinggi objek 1 m tegak = 0,55 tampilannya (HEIGHT_K), lebar tidak dikompresi', () => {
    const view = createCrossView(390, 844)
    const s = view.sAtZ(3)
    expect(view.hOf(1, 3) / s).toBeCloseTo(0.55, 6)
    expect(view.wOf(1, 3) / s).toBeCloseTo(1, 6)
    // Setiap viewport memperlihatkan rentang kedalaman yang sama (±30 m), jadi
    // rumah di 5 m dan papan di 5 m tidak pernah keluar frame.
    for (const [w, h] of VIEWPORTS) {
      const v = createCrossView(w, h)
      expect(v.zTop).toBeGreaterThan(12)
      expect(v.zBottom).toBeLessThan(-10)
    }
  })

  it('proyeksi bidang tanah membalik tepi dengan benar', () => {
    const view = createCrossView(390, 844)
    const points = groundPoints(view, { x0: -1, x1: 1, z0: -2, z1: 2 })
    const pixels = points.split(' ').map((pair) => pair.split(',').map(Number))
    // Sudut selatan (z = -2, titik pertama) harus di bawah sudut utara (z = +2).
    expect(pixels[0][1]).toBeGreaterThan(pixels[3][1])
    // Tepi barat (x = -1) di kiri tepi timur.
    expect(pixels[0][0]).toBeLessThan(pixels[1][0])
  })

  it('z-index turun menjauh, jadi kendaraan di depan menimpa pohon di belakang', () => {
    expect(junctionZ(-10)).toBeGreaterThan(junctionZ(0))
    expect(junctionZ(0)).toBeGreaterThan(junctionZ(10))
  })
})

describe('marka: zebra empat sisi, kerb dipotong, marka berhenti di luar zebra', () => {
  const zebra = zebraRects()

  it('enam strip per sisi, di luar bujur sangkar simpang', () => {
    expect(zebra).toHaveLength(ZEBRA.count * 4)
    for (const rect of zebra) {
      expect(insideJunction(rect)).toBe(false)
      // Strip menempel di tepi simpang: 0,3 m dari sisi simpang, di sumbu
      // yang memang di luar bujur sangkar.
      const dx = Math.min(Math.abs(rect.x0), Math.abs(rect.x1))
      const dz = Math.min(Math.abs(rect.z0), Math.abs(rect.z1))
      expect(dx >= ROAD_HALF || dz >= ROAD_HALF).toBe(true)
      expect(Math.max(dx, dz)).toBeGreaterThanOrEqual(ROAD_HALF + ZEBRA.setback - 1e-9)
    }
    // Strip jalur melintang: sempit di z, panjang di x — dirotasi 90° dari
    // zebra jalur vertikal. Lebar strip tetap 0,45 m di kedua arah.
    const lateralStrips = zebra.filter((r) => r.x1 - r.x0 > r.z1 - r.z0)
    const east = lateralStrips.filter((r) => r.x0 > 0)
    const north = zebra.filter((r) => r.x1 - r.x0 < r.z1 - r.z0 && r.z0 > 0)
    expect(east).toHaveLength(ZEBRA.count)
    expect(north).toHaveLength(ZEBRA.count)
    for (const r of east) {
      expect(r.z1 - r.z0).toBeCloseTo(ZEBRA.strip, 9)
      expect(r.x1 - r.x0).toBeCloseTo(ZEBRA.depth, 9)
    }
    for (const r of north) {
      expect(r.x1 - r.x0).toBeCloseTo(ZEBRA.strip, 9)
      expect(r.z1 - r.z0).toBeCloseTo(ZEBRA.depth, 9)
    }
    // Lebar strip 0,45 m itu yang diminta; jangan sampai berubah karena satuan.
    expect(ZEBRA.strip).toBeCloseTo(0.45, 9)
  })

  it('seluruh zebra muat di lebar jalur, dengan margin di kedua tepi', () => {
    // Arah strip dibedakan dari bentuknya: strip melintang (jalur melintang)
    // lebih panjang di x daripada di z, zebra jalur vertikal sebaliknya.
    const vertical = zebra.filter((r) => r.x1 - r.x0 < r.z1 - r.z0)
    const lateral = zebra.filter((r) => r.x1 - r.x0 > r.z1 - r.z0)
    expect(vertical).toHaveLength(ZEBRA.count * 2)
    expect(lateral).toHaveLength(ZEBRA.count * 2)
    for (const rect of vertical) {
      expect(Math.max(Math.abs(rect.x0), Math.abs(rect.x1))).toBeLessThanOrEqual(ROAD_HALF)
    }
    for (const rect of lateral) {
      expect(Math.max(Math.abs(rect.z0), Math.abs(rect.z1))).toBeLessThanOrEqual(ROAD_HALF)
    }
    const northEdge = Math.max(...zebra.filter((r) => r.z0 > 0 && r.x1 - r.x0 < r.z1 - r.z0).map((r) => r.x1))
    expect(northEdge).toBeCloseTo(ROAD_HALF - 0.175, 6)
  })

  it('kerb jalur melintang dipotong di mulut simpang, tidak melintasi persimpangan', () => {
    const kerbs = kerbRects(12, 16, -14)
    expect(kerbs).toHaveLength(8)
    for (const rect of kerbs) expect(insideJunction(rect)).toBe(false)

    // Empat kerb melintang: mulai tepat di tepi jalur vertikal (|x| = 2,4).
    const lateral = kerbs.filter((r) => r.x1 - r.x0 > 1)
    expect(lateral).toHaveLength(4)
    for (const rect of lateral) {
      expect(Math.min(Math.abs(rect.x0), Math.abs(rect.x1))).toBeCloseTo(ROAD_HALF, 9)
      expect(rect.z1 - rect.z0).toBeCloseTo(KERB_W, 9)
    }

    // Empat kerb memanjang: berhenti di tepi jalur melintang.
    const longitudinal = kerbs.filter((r) => r.z1 - r.z0 > 1)
    expect(longitudinal).toHaveLength(4)
    for (const rect of longitudinal) {
      expect(rect.z0 >= ROAD_HALF || rect.z1 <= -ROAD_HALF).toBe(true)
      expect(rect.x1 - rect.x0).toBeCloseTo(KERB_W, 9)
    }
  })

  it('marka putus-putus berhenti di luar kanal zebra dan di luar simpang', () => {
    const dashes = dashRects(12, 16, -14)
    expect(dashes.length).toBeGreaterThan(10)
    expect(dashes.length).toBeLessThan(80)
    for (const dash of dashes) {
      expect(insideJunction(dash)).toBe(false)
      for (const strip of zebra) expect(overlaps(dash, strip)).toBe(false)
    }

    // Marka tengah jalur melintang paling dekat 0,8 m di luar zebra.
    const start = ROAD_HALF + ZEBRA.setback + ZEBRA.depth + MARK.gap
    const lateralDashes = dashes.filter((d) => Math.abs(d.z1 - d.z0) < 0.2)
    expect(lateralDashes.length).toBeGreaterThan(4)
    for (const dash of lateralDashes) {
      expect(Math.min(Math.abs(dash.x0), Math.abs(dash.x1))).toBeGreaterThanOrEqual(start - 1e-9)
    }
  })
})

describe('sebaran elemen acak', () => {
  const props = scatterProps(JUNCTION_SEED)

  it('deterministik: seed yang sama = jalan yang sama, bukan Math.random', () => {
    expect(scatterProps(JUNCTION_SEED)).toEqual(props)
    expect(scatterProps(JUNCTION_SEED)).toEqual(scatterProps(JUNCTION_SEED))
    expect(scatterProps(JUNCTION_SEED + 1)).not.toEqual(props)
  })

  it('kelima jenis hadir dan setiap prop berdiri di tanah, bukan di aspal', () => {
    const kinds = new Set(props.map((p) => p.kind))
    expect([...kinds].sort()).toEqual(['bench', 'bin', 'house', 'lamp', 'tree'])
    for (const prop of props) {
      // Jalur + kerb: |x| atau |z| ≤ 2,52 berarti di aspal. Dua-duanya harus
      // di luar, karena prop di (x = −5, z = 1) tetap berdiri di jalur melintang.
      expect(Math.abs(prop.x)).toBeGreaterThan(ROAD_HALF + KERB_W)
      expect(Math.abs(prop.z)).toBeGreaterThan(ROAD_HALF + KERB_W)
    }
    // Urutan gambar dari jauh ke dekat, seperti urutan kedalaman scene.
    const depths = props.map((p) => p.z)
    expect([...depths].sort((a, b) => b - a)).toEqual(depths)
  })

  it('setiap rumah menghadap JALAN: sisi fasad menunjuk jalur vertikal', () => {
    const houses = props.filter((p) => p.kind === 'house')
    expect(houses).toHaveLength(2)
    for (const house of houses) {
      expect(house.facing).not.toBeNull()
      // Rumah di barat jalur menghadap timur; di timur menghadap barat.
      expect(house.facing).toBe(house.x < 0 ? 'east' : 'west')
      if (house.facing === 'east') expect(house.x).toBeLessThan(-ROAD_HALF)
      if (house.facing === 'west') expect(house.x).toBeGreaterThan(ROAD_HALF)
    }
  })
})

describe('art rumah dari ujung: fasad dihapus seluruhnya', () => {
  it('tidak ada geometri fasad: dinding pita, pintu, dan jendela hilang dari parts', () => {
    for (const facing of ['east', 'west'] as const) {
      const parts = houseParts(facing)
      // Perilaku BARU: fasad yang menghadap jalan (pita 1,1 m + pintu + dua
      // jendela) dihapus total — di kamera ini ia hanya pita 4–12 px dan
      // terbaca sebagai glitch. Kunci dengan `in`, bukan dengan kelas CSS yang
      // tidak ada, supaya data model-nya benar-benar dikunci.
      expect('facade' in parts).toBe(false)
      expect('door' in parts).toBe(false)
      expect('windows' in parts).toBe(false)
      // viewBox sekarang selebar dinding ujung saja: tidak ada sisa pita.
      expect(parts.viewW).toBe(HOUSE_FOOT_M * HOUSE_ART.unitsPerM)
      expect(parts.wall.w).toBe(HOUSE_FOOT_M * HOUSE_ART.unitsPerM)
      // Dan lebar art = lebar dunia: 1 m art = 1 m di layar, tanpa penyusutan
      // 4,4/5,5 yang dulu datang dari lebar fasad.
      expect(HOUSE_BOX.width).toBe(HOUSE_FOOT_M)
      expect(HOUSE_BOX.ratio).toBeCloseTo(
        (HOUSE_ART.wall * CROSS.heightK +
          HOUSE_ART.gable * CROSS.heightK +
          HOUSE_ART.roof) /
          HOUSE_ART.width,
        9,
      )
    }
  })

  it('dinding ujung polos: tidak ada bukaan di dalam persegi dinding', () => {
    const parts = houseParts('east')
    expect([...parts.gable]).toHaveLength(3)
    expect(parts.gable[1][1]).toBeLessThan(parts.gable[0][1])
    // Skirt beton 0,12 m duduk di kaki dinding, selebar dinding.
    expect(parts.base.w).toBe(parts.wall.w)
    expect(parts.base.y + parts.base.h).toBeCloseTo(parts.wall.y + parts.wall.h, 9)
    expect(parts.base.h).toBeCloseTo(0.12 * CROSS.heightK * HOUSE_ART.unitsPerM, 9)
  })

  it('atap pelana memanjang ke belakang, dan tingginya diproyeksikan HEIGHT_K', () => {
    const parts = houseParts('east')
    // Titik jauh bidang atap punya y lebih kecil (lebih ke utara layar) —
    // inilah "atap yang memanjang ke belakang".
    const ys = parts.roofLeft.map(([, y]) => y)
    expect(Math.min(...ys)).toBeLessThan(Math.min(...parts.gable.map(([, y]) => y)))
    // Sisi bubungan bergerak tepat sepanjang atap (dari gable dekat ke ujung jauh).
    expect(Math.abs(parts.roofLeft[1][1] - parts.roofLeft[2][1])).toBeCloseTo(
      HOUSE_ART.roof * HOUSE_ART.unitsPerM,
      6,
    )
    // Dinding ujung tingginya HEIGHT_K × tinggi dunia, bukan tinggi penuh.
    expect(parts.wall.h).toBeCloseTo(
      HOUSE_ART.wall * CROSS.heightK * HOUSE_ART.unitsPerM,
      6,
    )
  })

  it('DOM: rumah hanya dinding + gable + dua atap + skirt + bayangan', () => {
    const { container } = render(<Junction onSortir={() => {}} onMateri={() => {}} onKuis={() => {}} />)
    const houses = [...container.querySelectorAll('.jn-house')]
    expect(houses).toHaveLength(2)
    for (const svg of houses) {
      // Menambah fasad kembali (poligon atau rect) akan menggagalkan hitungan
      // ini — itulah yang dikunci: fasad tidak boleh balik.
      expect(svg.querySelectorAll('polygon')).toHaveLength(3)
      expect(svg.querySelectorAll('rect')).toHaveLength(2)
      expect(svg.querySelectorAll('ellipse')).toHaveLength(1)
      expect(svg.querySelectorAll('[class*="facade"], [class*="door"], [class*="window"]')).toHaveLength(0)
    }
  })
})

describe('trotoar 2,0 m di keempat sisi, dipotong di mulut simpang', () => {
  const xEdge = 12
  const zTop = 16
  const zBottom = -14
  const walks = sidewalkRects(xEdge, zTop, zBottom)
  const roads = roadRects(xEdge, zTop, zBottom)

  it('delapan bidang, lebarnya 2,0 m dari METERS, mulai di tepi jalur', () => {
    expect(SIDEWALK_W).toBe(2)
    expect(SIDEWALK_W).toBe(METERS.sidewalk)
    expect(walks).toHaveLength(8)
    for (const rect of walks) {
      expect(insideJunction(rect)).toBe(false)
      const w = rect.x1 - rect.x0
      const d = rect.z1 - rect.z0
      // Kedua sisi dalam selalu di tepi jalur: trotoar mulai dari kerb.
      expect(Math.min(Math.abs(rect.x0), Math.abs(rect.x1))).toBeCloseTo(ROAD_HALF, 9)
      expect(Math.min(Math.abs(rect.z0), Math.abs(rect.z1))).toBeCloseTo(ROAD_HALF, 9)
      if (w > d) {
        // Memanjang sepanjang jalur timur–barat: tebal 2,0 m di sumbu z.
        expect(d).toBeCloseTo(SIDEWALK_W, 9)
      } else {
        // Memanjang sepanjang jalur utara–selatan: tebal 2,0 m di sumbu x.
        expect(w).toBeCloseTo(SIDEWALK_W, 9)
      }
    }
  })

  it('tidak menabrak badan jalan: keempat mulut simpang tetap aspal', () => {
    for (const rect of walks) {
      expect(overlaps(rect, roads.vertical)).toBe(false)
      expect(overlaps(rect, roads.lateral)).toBe(false)
    }
    // Mulut simpang (di luar bujur sangkar, segaris jalur vertikal) bukan trotoar.
    const mouth: GroundRect = { x0: -1, x1: 1, z0: ROAD_HALF, z1: ROAD_HALF + 1 }
    for (const rect of walks) expect(overlaps(rect, mouth)).toBe(false)
  })

  it('DOM: delapan bidang trotoar tergambar', () => {
    const { container } = render(
      <Junction onSortir={() => {}} onMateri={() => {}} onKuis={() => {}} />,
    )
    expect(container.querySelectorAll('.jn-walk')).toHaveLength(8)
  })
})

describe('jalan setapak: pengganti fasad yang dihapus', () => {
  const props = scatterProps(JUNCTION_SEED)
  const houses = props.filter((p) => p.kind === 'house')
  const paths = walkPaths(props)
  const roads = roadRects(12, 16, -14)

  it('satu jalan setapak per rumah, dari dinding rumah ke tepi aspal', () => {
    expect(houses).toHaveLength(2)
    expect(paths).toHaveLength(2)
    for (const path of paths) {
      const house = houses.find((h) => h.id === path.id)
      expect(house).toBeDefined()
      const wall = Math.abs(house!.x) - HOUSE_FOOT_M / 2
      // Ujung luar menyentuh dinding rumah, ujung dalam menyentuh tepi aspal.
      expect(Math.max(Math.abs(path.rect.x0), Math.abs(path.rect.x1))).toBeCloseTo(wall, 6)
      expect(Math.min(Math.abs(path.rect.x0), Math.abs(path.rect.x1))).toBeCloseTo(ROAD_HALF, 9)
      // Berada di sisi rumah yang menghadap jalan.
      expect(path.facing).toBe(house!.facing)
      // Lebar 0,8 m; memanjang ke arah jalan.
      expect(path.rect.z1 - path.rect.z0).toBeCloseTo(WALK_PATH.width, 9)
      expect(WALK_PATH.width).toBeCloseTo(0.8, 9)
      // Panjangnya nyata (jarak rumah ke tepi jalan > 1,8 m), bukan garis nol.
      expect(Math.abs(path.rect.x1 - path.rect.x0)).toBeGreaterThan(1.8)
    }
  })

  it('berada di antara rumah dan jalan, tidak menabrak badan jalan', () => {
    for (const path of paths) {
      expect(overlaps(path.rect, roads.vertical)).toBe(false)
      expect(overlaps(path.rect, roads.lateral)).toBe(false)
      // Seluruh bidang di luar aspal, di sisi rumahnya sendiri.
      expect(Math.min(Math.abs(path.rect.x0), Math.abs(path.rect.x1))).toBeGreaterThanOrEqual(
        ROAD_HALF,
      )
      const house = houses.find((h) => h.id === path.id)!
      const sameSide = house.x < 0 ? path.rect.x1 <= 0 : path.rect.x0 >= 0
      expect(sameSide).toBe(true)
      // Sum bu z duduk di dalam dinding rumah (0,8 m lebar, 4,6 m dinding).
      expect(path.rect.z0).toBeGreaterThanOrEqual(house.z)
      expect(path.rect.z1).toBeLessThanOrEqual(house.z + 4.6)
      // Dua garis tepi lebih gelap di sisi panjangnya.
      expect(path.edges).toHaveLength(2)
      for (const edge of path.edges) {
        expect(edge.z1 - edge.z0).toBeCloseTo(WALK_PATH.edge, 9)
        expect(edge.x0).toBeCloseTo(path.rect.x0, 9)
        expect(edge.x1).toBeCloseTo(path.rect.x1, 9)
      }
    }
  })

  it('DOM: dua bidang jalan setapak + empat garis tepi', () => {
    const { container } = render(
      <Junction onSortir={() => {}} onMateri={() => {}} onKuis={() => {}} />,
    )
    expect(container.querySelectorAll('.jn-walk-path-group')).toHaveLength(2)
    expect(container.querySelectorAll('.jn-walk-path')).toHaveLength(2)
    expect(container.querySelectorAll('.jn-walk-path-edge')).toHaveLength(4)
  })
})

describe('lampu lalu lintas: delapan rangka L, dua belas kotak statis', () => {
  it('rangka kiri menggantung dua kotak seukuran sama, kanan satu', () => {
    expect(TRAFFIC_LIGHTS).toHaveLength(8)
    const lanes = [...new Set(TRAFFIC_LIGHTS.map((u) => u.lane))].sort()
    expect(lanes).toEqual(['east', 'north', 'south', 'west'])
    for (const lane of lanes) {
      const units = TRAFFIC_LIGHTS.filter((u) => u.lane === lane)
      expect(units, lane).toHaveLength(2)
      const left = units.find((u) => u.side === 'left')
      const right = units.find((u) => u.side === 'right')
      expect(left?.boxes, lane).toHaveLength(2)
      expect(right?.boxes, lane).toHaveLength(1)
      // Selalu sepasang: satu tegak (belok kiri), satu telentang (lurus).
      expect(left?.boxes.map((b) => b.mount).sort(), lane).toEqual(['cross', 'upright'])
    }
    expect(new Set(TRAFFIC_LIGHTS.map((u) => u.id)).size).toBe(8)
    // Tepat tiga kotak menghadap kamera.
    const views = TRAFFIC_LIGHTS.flatMap((u) => u.boxes.filter((b) => b.facing === 'view'))
    expect(views).toHaveLength(3)
  })

  it('kotak telentang hanya menukar sumbu, ukurannya sama', () => {
    const v = createCrossView(390, 844)
    for (const unit of TRAFFIC_LIGHTS) {
      const shapes = trafficLightShapes(v, unit)
      expect(shapes.boxes, unit.id).toHaveLength(unit.boxes.length)
      const upright = shapes.boxes.find((b) => b.mount === 'upright')
      const cross = shapes.boxes.find((b) => b.mount === 'cross')
      if (!upright || !cross) continue
      // Telentang: sisi panjang pindah ke mendatar. Tegak: sebaliknya.
      expect(cross.box.w, unit.id).toBeGreaterThan(cross.box.h)
      expect(upright.box.h, unit.id).toBeGreaterThan(upright.box.w)
    }
  })

  it('z-index: di atas seluruh scenery termasuk kanopi, di bawah papan', () => {
    expect(junctionZ(-14)).toBe(100)
    expect(LIGHT_Z).toBeGreaterThan(100)
    expect(LIGHT_Z).toBeLessThan(300)
    for (const prop of scatterProps(JUNCTION_SEED)) {
      expect(LIGHT_Z, prop.id).toBeGreaterThan(junctionZ(prop.z))
    }
    for (const unit of TRAFFIC_LIGHTS) {
      expect(trafficLightShapes(createCrossView(390, 844), unit).z).toBe(LIGHT_Z)
    }
  })

  it('DOM: delapan rangka, dua belas kotak, tiga kotak berlampu', () => {
    const { container } = render(
      <Junction onSortir={() => {}} onMateri={() => {}} onKuis={() => {}} />,
    )
    expect(container.querySelectorAll('[data-tl-corner]')).toHaveLength(8)
    expect(container.querySelectorAll('.jn-tl__pole')).toHaveLength(8)
    expect(container.querySelectorAll('.jn-tl__box')).toHaveLength(12)
    const faces = [...container.querySelectorAll('[data-tl-facing]')]
    expect(faces.filter((f) => f.getAttribute('data-tl-facing') === 'view')).toHaveLength(3)
    // Tiga kotak menghadap kamera, masing-masing tiga lampu.
    expect(container.querySelectorAll('.jn-tl__lamp')).toHaveLength(9)
    expect(container.querySelectorAll('.jn-tl__lamp--red')).toHaveLength(3)
    expect(container.querySelectorAll('.jn-tl__lamp--green')).toHaveLength(3)
    expect(container.querySelectorAll('.jn-tl__shadow')).toHaveLength(8)
    const layer = container.querySelector<SVGElement>('.jn-lights')
    expect(layer?.style.zIndex).toBe(String(LIGHT_Z))
  })
})

describe('tiga papan rute', () => {
  it('dipasang di utara, timur, dan barat — tidak ada di selatan', () => {
    expect(BOARDS.map((b) => b.road).sort()).toEqual(['east', 'north', 'west'])
    // Tidak satu pun di selatan simpang: tidak ada yang z-nya di bawah simpang.
    for (const board of BOARDS) expect(board.z).toBeGreaterThan(-ROAD_HALF)
  })

  it('setiap papan melayang di atas jalan, di luar simpang dan luar zebra', () => {
    const zebra = zebraRects()
    for (const board of BOARDS) {
      const rect: GroundRect = { x0: board.x - 0.01, x1: board.x + 0.01, z0: board.z - 0.01, z1: board.z + 0.01 }
      // Di atas badan jalan: jalur vertikal (|x| ≤ 2,4) atau jalur melintang (|z| ≤ 2,4).
      expect(Math.abs(board.x) <= ROAD_HALF || Math.abs(board.z) <= ROAD_HALF).toBe(true)
      // Bukan di tengah simpang, dan bukan di atas zebra.
      expect(insideJunction(rect)).toBe(false)
      for (const strip of zebra) expect(overlaps(rect, strip)).toBe(false)
    }
  })

  it('DOM: tiga tombol papan, label satu kata, 24 strip zebra tergambar', () => {
    const { container } = render(<Junction onSortir={() => {}} onMateri={() => {}} onKuis={() => {}} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons.map((b) => b.dataset.road).sort()).toEqual(['east', 'north', 'west'])
    // Papan ada di dalam tombolnya. Labelnya satu kata dan tanpa panah: pelat
    // 84–111 px tidak muat untuk frasa, dan panah 0,82em membuatnya menyempit.
    for (const button of buttons) {
      expect(button.querySelector('.jn-board__plate')).not.toBeNull()
      expect(button.querySelector('.jn-board__arrow')).toBeNull()
      expect(button.querySelector('.jn-board__label')?.textContent).toMatch(
        /^(Belajar|Pilah|Kuis)$/,
      )
    }

    // Zebra empat sisi benar-benar digambar sebagai strip, bukan satu blok.
    expect(container.querySelectorAll('.jn-zebra')).toHaveLength(ZEBRA.count * 4)
    // Jalur vertikal & melintang digambar dari proyeksi yang sama.
    expect(container.querySelectorAll('polygon.jn-road')).toHaveLength(2)
    expect(container.querySelectorAll('.jn-kerb')).toHaveLength(8)
    // Trotoar & jalan setapak ikut tergambar dari proyeksi yang sama.
    expect(container.querySelectorAll('.jn-walk')).toHaveLength(8)
    expect(container.querySelectorAll('.jn-walk-path')).toHaveLength(2)
    expect(container.querySelectorAll('.jn-prop')).toHaveLength(scatterProps(JUNCTION_SEED).length)
  })
})

function simulate(seconds: number, seed = JUNCTION_SEED, bounds = { top: 16, bottom: -14 }) {
  let state = createCrossState(seed)
  const dt = 1 / 60
  const frames = Math.round(seconds / dt)
  let maxDepth = -Infinity
  let minDepth = Infinity
  for (let i = 0; i < frames; i += 1) {
    state = stepCross(state, dt, bounds)
    for (const vehicle of state.vehicles) {
      if (!vehicle) continue
      maxDepth = Math.max(maxDepth, vehicle.depth)
      minDepth = Math.min(minDepth, vehicle.depth)
    }
  }
  return { state, maxDepth, minDepth }
}

describe('ambience: spawner yang sudah ada, satu reducer murni', () => {
  it('deterministik: run yang sama menghasilkan aktor dan waktu yang sama', () => {
    const a = simulate(30)
    const b = simulate(30)
    expect(a.state.spawned).toBe(b.state.spawned)
    expect(a.state.vehicles.map((v) => v?.depth)).toEqual(b.state.vehicles.map((v) => v?.depth))
    expect(a.state.peds.map((p) => p?.depth)).toEqual(b.state.peds.map((p) => p?.depth))
  })

  it('tidak macet: kendaraan dan pejalan terus lahir dan lewat', () => {
    const { state, maxDepth, minDepth } = simulate(90)
    expect(state.spawned).toBeGreaterThan(20)
    // Semua aktor tetap di dalam rentang kedalaman (ditambah margin spawn).
    expect(maxDepth).toBeLessThanOrEqual(16 + SPAWN_MARGIN + 1e-9)
    expect(minDepth).toBeGreaterThanOrEqual(-14 - SPAWN_MARGIN - 1e-9)
    // Tidak pernah lebih dari kapasitas slot.
    expect(state.vehicles.length).toBe(VEHICLE_SLOTS)
    expect(state.vehicles.filter(Boolean).length).toBeLessThanOrEqual(VEHICLE_SLOTS)
  })

  it('reducer tidak memutasi keadaan lama (murni)', () => {
    const state = createCrossState(5)
    const snapshot = JSON.stringify(state.vehicles)
    const next = stepCross(state, 1 / 60, { top: 16, bottom: -14 })
    expect(next).not.toBe(state)
    expect(JSON.stringify(state.vehicles)).toBe(snapshot)
    expect(JSON.stringify(next.vehicles)).not.toBe(snapshot)
  })

  it('pejalan menyeberang jalur melintang tepat di kanal zebra', () => {
    const zebra = zebraRects()
    for (const lane of ['sidewalkL', 'sidewalkR'] as const) {
      const x = pedX({ lane })
      // x pejalan berada di dalam salah satu kanal zebra barat/timur.
      const onZebra = zebra.some((r) => x > r.x0 && x < r.x1 && r.z1 - r.z0 < ZEBRA.depth + 1e-9 && r.x1 - r.x0 > 1)
      expect(onZebra).toBe(true)
    }
  })

  it('kendaraan memakai lajur dan arah yang tetap, dari LANE_DIR', () => {
    const state = createCrossState(JUNCTION_SEED)
    for (const vehicle of state.vehicles) {
      if (!vehicle) continue
      // lajur kiri (x < 0) bergerak menjauh (dir +1); lajur kanan mendekat.
      if (vehicle.lane === 'laneL') {
        expect(vehicleX(vehicle)).toBeLessThan(0)
        expect(vehicle.dir).toBe(1)
      } else {
        expect(vehicleX(vehicle)).toBeGreaterThan(0)
        expect(vehicle.dir).toBe(-1)
      }
    }
    // Jarak lajur minimum yang diminta ke spawner masuk akal: satu mobil > 4 m.
    expect(LANE_GAP_M).toBeGreaterThan(3.5)
  })
})
