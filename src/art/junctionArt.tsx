/**
 * Art khusus persimpangan: rumah gable-end yang menghadap JALAN.
 *
 * **Kenapa bukan `House` dari `scenery.tsx`.** `House` di sana adalah elevasi
 * depan: pintu di tengah, dua jendela kanan-kiri, atap pelana pendek. Itu benar
 * untuk kamera yang berjalan menyusuri jalan, tetapi di persimpangan rumah
 * berdiri di sisi jalur; dinding fasad yang menghadap jalan di sana dilihat
 * hampir sejajar bidangnya, jadi di kamera drone ia hanya muncul sebagai pita
 * 4–12 px yang miring — terbaca sebagai glitch, bukan sebagai rumah.
 *
 * Bentuk yang dipakai di sini, sesuai prototipe `Ref/crossroad-draft-a-v2.png`
 * dan permintaan tugas:
 *
 * 1. **Dinding ujung (gable end) menghadap kamera** — persegi, polos, tanpa
 *    pintu/jendela. Ini satu-satunya dinding yang digambar.
 * 2. **Segitiga gable** tepat di atasnya, puncaknya di tengah.
 * 3. **Dua bidang atap** yang memanjang ke belakang (ke utara layar), dari garis
 *    atap gable ke ujung jauhnya. Kamera berada di atas bubungan, jadi kedua
 *    bidang terlihat.
 * 4. **Skirt beton** 0,12 m di kaki dinding, supaya rumah berdiri di tanah,
 *    bukan melayang.
 *
 * **Fasad dihilangkan sepenuhnya.** Versi sebelumnya menggambar dinding panjang
 * di sisi jalan sebagai pita `HOUSE_ART.facade` (1,1 m) berisi pintu dan dua
 * jendela. Di kamera ini pita itu cuma 4–12 px dan terbaca sebagai garis
 * kotor, jadi seluruh geometri fasad (dinding pita, pintu, jendela) dibuang.
 * Kesan "rumah punya pintu ke jalan" sekarang dibawa oleh **jalan setapak** di
 * tanah (`walkPaths` di `scene/crossing.ts`), bukan oleh dinding.
 *
 * Seni ini digambar dalam satuan yang **sama** dengan meter: 1 satuan = 1/50 m
 * mendatar, sedangkan tinggi (yang tegak) sudah dikali `CROSS.heightK = 0,55`
 * sebelum digambar — persis seperti proyeksi kamera yang menunduk. Jadi seluruh
 * gambar cukup diskalakan seragam dengan `px per meter` pada kedalaman kakinya;
 * tidak ada peregangan sumbu y yang membuat rumah gepeng.
 *
 * Semua dekoratif (`aria-hidden`), garis tinta tebal, isian dari token
 * `index.css`, tanpa filter/gradien.
 */

import { CROSS, HOUSE_FOOT_M } from '../scene/crossing'

const INK = 'var(--ink)'
const WALL = 'color-mix(in srgb, var(--paper) 82%, var(--orange))'
const WALL_BASE = 'color-mix(in srgb, var(--road-line) 78%, var(--road))'
const ROOF_DARK = 'var(--red-dark)'
const ROOF_WARM = 'var(--orange-dark)'

/** Sisi rumah yang menghadap jalan. */
export type HouseFacing = 'east' | 'west'

/**
 * Kotak rumah dalam meter. 4,4 m adalah lebar dinding ujung (sisi pendek);
 * 4,6 m adalah panjang atap — arah memanjang rumah, sejajar jalur utara-selatan
 * dan sejajar arah pandang kamera. Lebarnya satu sumber dengan `HOUSE_FOOT_M`
 * di `scene/crossing.ts`, supaya jalan setapak bisa dihitung dari kaki rumah
 * tanpa impor melingkar.
 */
export const HOUSE_ART = {
  /** Lebar dinding ujung (meter). */
  width: HOUSE_FOOT_M,
  /** Tinggi dinding (meter, sebelum HEIGHT_K). */
  wall: 2.6,
  /** Tinggi segitiga gable (meter, sebelum HEIGHT_K). */
  gable: 1.3,
  /** Panjang atap ke belakang (meter, di tanah — tanpa HEIGHT_K). */
  roof: 4.6,
  /** Satuan art per meter; satu sumber untuk viewBox dan tabel meter. */
  unitsPerM: 50,
} as const

/** Satu titik dalam satuan art. */
export type Pt = readonly [number, number]
export type Poly = ReadonlyArray<Pt>

export type HouseParts = {
  viewW: number
  viewH: number
  /** Sisi rumah yang menghadap jalan; hanya menentukan sisi gelap atap. */
  facing: HouseFacing
  /** Dinding ujung yang menghadap kamera (polos). */
  wall: { x: number; y: number; w: number; h: number }
  /** Garis dinding bawah (skirt), bukan fasad. */
  base: { x: number; y: number; w: number; h: number }
  gable: Poly
  /** Bidang atap kiri layar (lebih gelap) dan kanan layar. */
  roofLeft: Poly
  roofRight: Poly
  shadow: { cx: number; cy: number; rx: number; ry: number }
}

const U = HOUSE_ART.unitsPerM
const W = HOUSE_ART.width * U
const WALL_H = HOUSE_ART.wall * CROSS.heightK * U
const GABLE_H = HOUSE_ART.gable * CROSS.heightK * U
const ROOF_D = HOUSE_ART.roof * U

/**
 * Kotak render art rumah: lebar dalam meter (dinding ujung) dan rasio
 * tinggi/lebar viewBox-nya. Scene mengalikan lebar itu dengan px per meter pada
 * kedalaman kaki rumah; tingginya mengikuti rasio, jadi rumah tidak pernah
 * gepeng karena dipaksa masuk kotak persegi. Tanpa fasad, lebar viewBox =
 * lebar dinding, jadi 1 m art = 1 m dunia di layar.
 */
export const HOUSE_BOX = {
  width: HOUSE_ART.width,
  ratio: (WALL_H + GABLE_H + ROOF_D) / W,
} as const

/**
 * Bagian-bagian rumah dalam satuan art, sudah menghadap `facing`.
 *
 * Diekspor (bukan hanya digambar) supaya tes bisa membuktikan bentuknya:
 * dinding ujung polos, gable di atasnya, dan kedua bidang atap memanjang ke
 * utara (titik jauhnya punya y lebih kecil). Tanpa ini "rumah dari ujung"
 * hanya klaim.
 */
export function houseParts(facing: HouseFacing): HouseParts {
  const mirror = facing === 'west'
  const viewW = W
  const ground = WALL_H + GABLE_H + ROOF_D
  const wallTop = ROOF_D + GABLE_H

  const mx = (x: number) => (mirror ? viewW - x : x)
  const poly = (points: ReadonlyArray<Pt>): Poly => points.map(([x, y]) => [mx(x), y] as Pt)

  /** Dinding ujung: persegi polos. Satu-satunya dinding yang digambar. */
  const wall = { x: 0, y: wallTop, w: W, h: WALL_H }
  /** Skirt beton setinggi 0,12 m di kaki dinding. */
  const baseH = 0.12 * CROSS.heightK * U
  const base = { x: wall.x, y: ground - baseH, w: W, h: baseH }

  const gable = poly([
    [0, wallTop],
    [W / 2, wallTop - GABLE_H],
    [W, wallTop],
  ])

  const roofLeftNear: Pt[] = [
    [0, wallTop],
    [W / 2, wallTop - GABLE_H],
    [W / 2, wallTop - GABLE_H - ROOF_D],
    [0, wallTop - ROOF_D],
  ]
  const roofRightNear: Pt[] = [
    [W / 2, wallTop - GABLE_H],
    [W, wallTop],
    [W, wallTop - ROOF_D],
    [W / 2, wallTop - GABLE_H - ROOF_D],
  ]

  const parts: HouseParts = {
    viewW,
    viewH: ground,
    facing,
    wall,
    base,
    gable,
    roofLeft: poly(roofLeftNear),
    roofRight: poly(roofRightNear),
    shadow: { cx: W / 2, cy: ground - 6, rx: W * 0.56, ry: 17 },
  }

  // Cermin menukar kiri/kanan; fill mengikuti sisi layar supaya arah cahaya
  // tidak berubah saat rumah pindah ke sisi jalan yang lain.
  if (mirror) {
    const left = parts.roofLeft
    parts.roofLeft = parts.roofRight
    parts.roofRight = left
  }

  return parts
}

const points = (poly: Poly): string => poly.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

/**
 * Rumah dari ujung: dinding polos + segitiga gable + dua bidang atap
 * memanjang ke belakang + skirt beton. Tidak ada fasad, pintu, atau jendela:
 * fasad yang menghadap jalan sudah dihapus seluruhnya (lihat header berkas).
 */
export function GableHouse({ facing = 'east' }: { facing?: HouseFacing }) {
  const p = houseParts(facing)
  return (
    <svg
      className="jn-house"
      viewBox={`0 0 ${p.viewW} ${p.viewH}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      <ellipse
        cx={p.shadow.cx}
        cy={p.shadow.cy}
        rx={p.shadow.rx}
        ry={p.shadow.ry}
        fill={INK}
        opacity="0.13"
      />

      {/* Atap dulu: kedua bidang berada di belakang ujung gable. */}
      <polygon
        points={points(p.roofLeft)}
        fill={ROOF_DARK}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <polygon
        points={points(p.roofRight)}
        fill={ROOF_WARM}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* Dinding ujung yang dilihat kamera: polos, tanpa bukaan. */}
      <rect
        x={p.wall.x}
        y={p.wall.y}
        width={p.wall.w}
        height={p.wall.h}
        fill={WALL}
        stroke={INK}
        strokeWidth="5"
      />
      <polygon
        points={points(p.gable)}
        fill={WALL}
        stroke={INK}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect
        x={p.base.x}
        y={p.base.y}
        width={p.base.w}
        height={p.base.h}
        fill={WALL_BASE}
        stroke={INK}
        strokeWidth="4"
      />
    </svg>
  )
}
