import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { Bench, Bin, StreetLamp, Tree } from './art/scenery'
import { Car, Motorcycle } from './art/vehicles'
import { Pedestrian } from './art/people'
import { GableHouse, HOUSE_BOX } from './art/junctionArt'
import { PROP_ART } from './WalkScene'
import {
  BOARDS,
  BOARD,
  CROSS,
  JUNCTION_SEED,
  LIGHT_Z,
  PED_SLOTS,
  TRAFFIC_LIGHTS,
  VEHICLE_SLOTS,
  createCrossState,
  createCrossView,
  dashRects,
  groundPoints,
  junctionZ,
  kerbRects,
  lateralEdge,
  pedX,
  roadRects,
  scatterProps,
  screenPoints,
  sidewalkRects,
  stepCross,
  trafficLightShapes,
  vehicleX,
  walkPaths,
  zebraRects,
  type BoardRoad,
  type CrossState,
  type CrossView,
  type JunctionProp,
} from './scene/crossing'
import './junction.css'

type Props = {
  onSortir: () => void
  onMateri: () => void
  onStudi: () => void
  /** Judul; App memfokuskannya saat persimpangan menjadi tujuan fokus. */
  headingRef?: RefObject<HTMLHeadingElement | null>
}

/** Satu tujuan: papan melayang di atas salah satu jalan. */
type Route = {
  id: 'materi' | 'sortir' | 'studi'
  label: string
  road: BoardRoad
  hint: string
  action: () => void
}

/** Variasi ukuran pohon, dari `variant` sebaran. */
const TREE_VARIANT = [0.86, 1, 1.16] as const

/** Batas gulir per frame, sama dengan scene berjalan: tab yang lama tidak melompat. */
const MAX_FRAME_SECONDS = 0.1

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function setTransform(el: HTMLElement, tx: number, ty: number, scale: number): void {
  const transform = `translate3d(${roundHalf(tx)}px, ${roundHalf(ty)}px, 0) scale(${scale})`
  if (el.style.transform !== transform) el.style.transform = transform
}

function setDisplay(el: HTMLElement, visible: boolean): void {
  const value = visible ? 'block' : 'none'
  if (el.style.display !== value) el.style.display = value
}

function setOpacity(el: HTMLElement, opacity: number): void {
  const value = opacity.toFixed(3)
  if (el.style.opacity !== value) el.style.opacity = value
}

function setZ(el: HTMLElement, z: number): void {
  const value = String(z)
  if (el.style.zIndex !== value) el.style.zIndex = value
}

/**
 * Persimpangan 2.5D, kamera drone menunduk.
 *
 * Tata letak, proyeksi, dan sebaran ada di `scene/crossing.ts` (murni, bisa
 * dites tanpa DOM); berkas ini hanya menggambar hasilnya dan menjalankan satu
 * loop rAF.
 *
 * Yang berubah dari versi sebelumnya: jalur melintang bukan lagi poligon kasar
 * dengan faktor kompresi sendiri — ia memakai proyeksi yang sama dengan jalur
 * vertikal, jadi simpangnya bujur sangkar. Jalur melintang punya zebra di kedua
 * mulutnya (dirotasi 90°), kerbnya dipotong di mulut simpang, dan marka tengah
 * berhenti di luar kanal zebra. Elemen tepi jalan tersebar deterministik, rumah
 * menghadap jalan, dan tiga papan tujuan melayang di atas tiga jalan (utara,
 * timur, barat) — tidak ada papan di selatan, arah kedatangan anak.
 */
export default function Junction({ onSortir, onMateri, onStudi, headingRef }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  // Ukuran awal dari jendela: jsdom (dan paint pertama) belum punya clientWidth,
  // dan papan yang belum terukur tidak boleh invisible — papan yang tak terlihat
  // juga tak ada di accessibility tree.
  const [size, setSize] = useState(() => ({
    w: typeof window === 'undefined' ? 0 : window.innerWidth,
    h: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))

  const view = useMemo<CrossView>(() => createCrossView(size.w, size.h), [size.w, size.h])
  const viewRef = useRef(view)
  viewRef.current = view

  // Sebaran elemen dan dunia ambience: dibuat sekali, deterministik dari seed.
  const [props] = useState<JunctionProp[]>(() => scatterProps(JUNCTION_SEED))
  const [world] = useState<CrossState>(() => createCrossState(JUNCTION_SEED))
  const stateRef = useRef<CrossState>(world)
  const [reduced] = useState(prefersReducedMotion)

  const vehicleRefs = useRef<Array<HTMLDivElement | null>>([])
  const pedRefs = useRef<Array<HTMLDivElement | null>>([])

  /**
   * Satu penulis gaya untuk semua aktor. Dipanggil loop (dan sekali setelah
   * ukur), tidak pernah dari render.
   */
  const draw = useCallback(() => {
    const v = viewRef.current
    const state = stateRef.current
    if (!v.w || !v.h) return

    // Pejalan di tepi atas layar memudar masuk; di bawah mereka lewat di balik
    // panel dialog. Tidak ada pop: mereka lahir di luar frame.
    const fade = (y: number) => Math.min(1, Math.max(0, y / (v.h * 0.06)))

    state.vehicles.forEach((vehicle, i) => {
      const el = vehicleRefs.current[i]
      if (!el) return
      if (!vehicle) {
        setDisplay(el, false)
        return
      }
      const face = vehicle.dir === -1 ? 'front' : 'rear'
      if (el.dataset.kind !== vehicle.kind || el.dataset.face !== face) {
        el.dataset.kind = vehicle.kind
        el.dataset.face = face
        el.dataset.lane = vehicle.lane
      }
      setDisplay(el, true)
      const x = v.xOf(vehicleX(vehicle), vehicle.depth)
      const y = v.yOfZ(vehicle.depth)
      // Seni dipasang pada skala pusat simpang; transform mengecil/membesarkan
      // sesuai kedalaman. Satu meter tetap satu meter di kedalaman itu.
      setTransform(el, x, y, round3(v.sAtZ(vehicle.depth) / v.scale))
      setOpacity(el, fade(y))
      setZ(el, junctionZ(vehicle.depth))
    })

    state.peds.forEach((ped, i) => {
      const el = pedRefs.current[i]
      if (!el) return
      if (!ped) {
        setDisplay(el, false)
        return
      }
      const face = ped.dir === -1 ? 'front' : 'rear'
      if (el.dataset.kind !== ped.kind || el.dataset.face !== face) {
        el.dataset.kind = ped.kind
        el.dataset.face = face
        el.dataset.lane = ped.lane
      }
      setDisplay(el, true)
      const x = v.xOf(pedX(ped), ped.depth)
      const y = v.yOfZ(ped.depth)
      setTransform(el, x, y, round3(v.sAtZ(ped.depth) / v.scale))
      setOpacity(el, fade(y))
      setZ(el, junctionZ(ped.depth))
    })
  }, [])

  // Ukur sekali sebelum paint pertama, lalu tiap resize. Tidak pernah di loop.
  useLayoutEffect(() => {
    const measure = () => {
      const el = hostRef.current
      const w = el?.clientWidth || window.innerWidth
      const h = el?.clientHeight || window.innerHeight
      if (!w || !h) return
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
      draw()
    }

    measure()
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [draw])

  // Gambar ulang setelah ukuran baru masuk (viewBox, papan, prop, aktor).
  useLayoutEffect(() => {
    draw()
  }, [view, draw])

  // Persimpangan adalah layar baru: fokus pindah ke judulnya sendiri, bukan
  // jatuh ke <body> ketika tombol "Lanjut jalan" terlepas bersama layar lama.
  // Layar lain diserahkan App lewat `pendingFocusRef`; layar ini memegang
  // miliknya sendiri karena App tidak punya target untuk persimpangan.
  useLayoutEffect(() => {
    headingRef?.current?.focus({ preventScroll: true })
  }, [headingRef])

  /**
   * Satu-satunya loop animasi. `stepCross` murni dan mengembalikan keadaan baru;
   * loop menulis gaya ke ref, jadi tidak ada `setState` per frame. Reduced motion
   * tidak menjalankan loop: ambience tetap tampil dalam pose diam, narasi tetap
   * jalan (itu di App).
   */
  useEffect(() => {
    if (reduced) return

    let raf = 0
    let active = false
    let last = 0

    const frame = (now: number) => {
      if (!active) return
      const dt = last === 0 ? 0 : Math.min(MAX_FRAME_SECONDS, (now - last) / 1000)
      last = now
      const v = viewRef.current
      stateRef.current = stepCross(stateRef.current, dt, { top: v.zTop, bottom: v.zBottom })
      draw()
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (active) return
      active = true
      last = 0
      raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      active = false
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = 0
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, draw])

  const routes: Route[] = [
    {
      id: 'materi',
      label: 'Belajar',
      road: 'west',
      hint: 'baca arti semua rambu',
      action: onMateri,
    },
    {
      id: 'sortir',
      label: 'Pilah',
      road: 'north',
      hint: 'pisahkan rambu menurut jenisnya',
      action: onSortir,
    },
    {
      id: 'studi',
      label: 'Studi Kasus',
      road: 'east',
      hint: 'selesaikan lima kisah rambu',
      action: onStudi,
    },
  ]

  const xEdge = lateralEdge(view)
  const roads = roadRects(xEdge, view.zTop, view.zBottom)
  const sidewalks = sidewalkRects(xEdge, view.zTop, view.zBottom)
  const walks = walkPaths(props)
  const lights = TRAFFIC_LIGHTS.map((unit) => trafficLightShapes(view, unit))
  const kerbs = kerbRects(xEdge, view.zTop, view.zBottom)
  const dashes = dashRects(xEdge, view.zTop, view.zBottom)
  const zebras = zebraRects()

  /**
   * Kotak layar satu papan: papan melayang `BOARD.hover` meter di atas aspal.
   *
   * Ukuran papan diambil dari skala **pusat** simpang, bukan skala jalannya
   * masing-masing: papan adalah afordansi UI (tombol), dan papan utara berdiri
   * 5 m lebih jauh sehingga dengan skala jalannya sendiri tingginya jatuh di
   * bawah target ketuk 44 px pada 360×640. Posisi dan tinggi apungnya tetap
   * memakai kedalaman jalannya, jadi papan tetap terikat pada jalurnya.
   */
  const boardBox = (road: BoardRoad) => {
    const spot = BOARDS.find((b) => b.road === road) ?? BOARDS[0]
    const width = BOARD.w * view.scale * BOARD.emphasis
    const height = BOARD.h * view.scale * BOARD.emphasis
    return {
      spot,
      left: view.xOf(spot.x, spot.z),
      top: view.yOfZ(spot.z) - view.hOf(BOARD.hover, spot.z),
      width,
      height,
      ground: { x: view.xOf(spot.x, spot.z), y: view.yOfZ(spot.z) },
    }
  }

  const boardStyle = (road: BoardRoad): CSSProperties => {
    const box = boardBox(road)
    return {
      left: `${roundHalf(box.left)}px`,
      top: `${roundHalf(box.top)}px`,
      width: `${roundHalf(box.width)}px`,
      height: `${roundHalf(box.height)}px`,
      // Teks ikut ukuran papan: 0,34 × tinggi papan, ukuran objek dari meter.
      fontSize: `${roundHalf(box.height * 0.34)}px`,
      zIndex: 300,
    }
  }

  /** Kotak prop dalam px: lebar & tinggi = meter × px per meter di kakinya. */
  const propBox = (prop: JunctionProp) => {
    const s = view.sAtZ(prop.z)
    if (prop.kind === 'house') {
      const w = HOUSE_BOX.width * s
      return { w, h: w * HOUSE_BOX.ratio }
    }
    const spec = PROP_ART[prop.kind]
    const scale = prop.kind === 'tree' ? TREE_VARIANT[prop.variant] : 1
    // Tinggi objek tegak diproyeksikan HEIGHT_K: 1 m tegak = 0,55 m di layar.
    const h = spec.height * s * CROSS.heightK * scale
    return { w: h * spec.ratio, h }
  }

  return (
    <div
      className="jn"
      ref={hostRef}
      style={
        {
          // Satu meter di kamera persimpangan, untuk fallback CSS dan untuk
          // seni ambience yang memang berukuran meter.
          '--wk-px-per-m': `${view.scale}px`,
        } as CSSProperties
      }
    >
      <svg
        className="jn-ground"
        viewBox={`0 0 ${view.w} ${view.h}`}
        aria-hidden="true"
        focusable="false"
      >
        {/* Trotoar 2,0 m di keempat sisi, dipotong di mulut simpang. */}
        {sidewalks.map((rect, i) => (
          <polygon key={`w-${i}`} className="jn-walk" points={groundPoints(view, rect)} />
        ))}

        {/* Jalur melintang: pita penuh selebar layar, 4,8 m dari utara ke selatan. */}
        <polygon className="jn-road" points={groundPoints(view, roads.lateral)} />
        {/* Jalur vertikal: jalur yang barusan dijalani anak, lebar 4,8 m. */}
        <polygon className="jn-road" points={groundPoints(view, roads.vertical)} />

        {kerbs.map((rect, i) => (
          <polygon key={`k-${i}`} className="jn-kerb" points={groundPoints(view, rect)} />
        ))}

        {dashes.map((rect, i) => (
          <polygon key={`d-${i}`} className="jn-mark" points={groundPoints(view, rect)} />
        ))}

        {zebras.map((rect, i) => (
          <polygon key={`z-${i}`} className="jn-zebra" points={groundPoints(view, rect)} />
        ))}

        {/* Jalan setapak rumah → jalan. Digambar setelah trotoar karena ia
            melintasi trotoar dan berhenti di kerb. */}
        {walks.map((path) => (
          <g key={`p-${path.id}`} className="jn-walk-path-group" data-walk={path.id}>
            <polygon className="jn-walk-path" points={groundPoints(view, path.rect)} />
            {path.edges.map((edge, i) => (
              <polygon
                key={`pe-${i}`}
                className="jn-walk-path-edge"
                points={groundPoints(view, edge)}
              />
            ))}
          </g>
        ))}

        {/* Bayangan papan: art (elips tinta), bukan filter. */}
        {routes.map((route) => {
          const box = boardBox(route.road)
          return (
            <ellipse
              key={`s-${route.id}`}
              className="jn-board-shadow"
              cx={box.ground.x}
              cy={box.ground.y}
              rx={box.width * 0.34}
              ry={box.width * 0.08}
            />
          )
        })}

        {/* Bayangan kaki tiang lampu. Digambar di lapisan tanah — bukan di
            lapisan lampu — supaya bayangan di tanah tetap di bawah pohon dan
            prop yang lebih dekat, bukan menimpa kanopi. */}
        {lights.map((tl) => (
          <ellipse
            key={`ts-${tl.id}`}
            className="jn-tl__shadow"
            cx={tl.shadow.cx}
            cy={tl.shadow.cy}
            rx={tl.shadow.rx}
            ry={tl.shadow.ry}
          />
        ))}
      </svg>

      <div className="jn-props" aria-hidden="true">
        {props.map((prop) => {
          const box = propBox(prop)
          return (
            <div
              key={prop.id}
              className={`jn-prop jn-prop--${prop.kind}`}
              style={{
                left: `${roundHalf(view.xOf(prop.x, prop.z))}px`,
                top: `${roundHalf(view.yOfZ(prop.z))}px`,
                width: `${box.w.toFixed(2)}px`,
                height: `${box.h.toFixed(2)}px`,
                // `translate` menaruh kotak di atas titik tanahnya, ditengahkan.
                translate: '-50% -100%',
                zIndex: junctionZ(prop.z),
              }}
            >
              {prop.kind === 'house' ? (
                <GableHouse facing={prop.facing ?? 'east'} />
              ) : prop.kind === 'tree' ? (
                <Tree />
              ) : prop.kind === 'lamp' ? (
                <StreetLamp />
              ) : prop.kind === 'bench' ? (
                <Bench facing={prop.facing ?? 'east'} />
              ) : (
                <Bin />
              )}
            </div>
          )
        })}
      </div>

      {/*
        Ambience memakai slot yang sama dengan scene berjalan: kelas
        `.wk-veh-slot`/`.wk-ped-slot` memilih varian seni lewat `data-kind` dan
        `data-face`, sehingga tidak ada SVG yang dipasang/dilepas per objek.
        Layer ini tidak pernah menangkap pointer.
      */}
      <div className="jn-ambience" aria-hidden="true">
        {Array.from({ length: VEHICLE_SLOTS }, (_, i) => (
          <div
            key={`veh-${i}`}
            className="wk-traffic-item wk-veh-slot"
            ref={(el) => {
              vehicleRefs.current[i] = el
            }}
          >
            <Car face="rear" />
            <Car face="front" />
            <Motorcycle face="rear" />
            <Motorcycle face="front" />
          </div>
        ))}
        {Array.from({ length: PED_SLOTS }, (_, i) => (
          <div
            key={`ped-${i}`}
            className="wk-traffic-item wk-ped-slot"
            ref={(el) => {
              pedRefs.current[i] = el
            }}
          >
            <Pedestrian kind="adult" face="rear" />
            <Pedestrian kind="adult" face="front" />
            <Pedestrian kind="child" face="rear" />
            <Pedestrian kind="child" face="front" />
          </div>
        ))}
      </div>

      {/*
        Lampu lalu lintas: statis. Satu `<g>` per unit dengan `data-tl-corner`
        dan `data-tl-axis`, jadi fase per aksis nanti bisa disambungkan tanpa
        membongkar render ini. Layer sengaja ber-z `LIGHT_Z` (140): di atas
        seluruh scenery (prop 20…100, termasuk kanopi pohon dekat) dan di bawah
        papan tujuan (300). Bayangan di tanah adalah elips art, bukan filter.
      */}
      <svg
        className="jn-lights"
        viewBox={`0 0 ${view.w} ${view.h}`}
        aria-hidden="true"
        focusable="false"
        style={{ zIndex: LIGHT_Z }}
      >
        {lights.map((tl) => (
          <g
            key={tl.id}
            className="jn-tl"
            data-tl-corner={tl.corner}
            data-tl-axis={tl.axis}
            data-tl-arm={tl.arm}
            data-tl-id={tl.id}
            data-tl-lane={tl.lane}
            data-tl-side={tl.side}
          >
            <polygon className="jn-tl__pole" points={screenPoints(tl.pole)} />
            {tl.armPoly.length > 0 && (
              <polygon className="jn-tl__arm" points={screenPoints(tl.armPoly)} />
            )}
            {tl.boxes.map((b, bi) => (
              <g key={bi} data-tl-mount={b.mount} data-tl-facing={b.facing}>
                <rect
                  className="jn-tl__box"
                  x={b.box.x}
                  y={b.box.y}
                  width={b.box.w}
                  height={b.box.h}
                  rx={b.box.rx}
                />
                {b.lamps.map((lamp) => (
                  <ellipse
                    key={lamp.lamp}
                    className={`jn-tl__lamp jn-tl__lamp--${lamp.lamp}`}
                    cx={lamp.cx}
                    cy={lamp.cy}
                    rx={lamp.rx}
                    ry={lamp.ry}
                  />
                ))}
              </g>
            ))}
          </g>
        ))}
      </svg>

      <h2 className="jn-title" ref={headingRef} tabIndex={-1}>
        Kamu sampai di persimpangan
      </h2>

      <div className="jn-boards">
        {routes.map((route) => (
          <button
            key={route.id}
            type="button"
            className={`jn-board jn-board--${route.id}`}
            data-road={route.road}
            style={boardStyle(route.road)}
            onClick={route.action}
            aria-label={`${route.label} — ${route.hint}`}
          >
            <span className="jn-board__plate">
              <span className="jn-board__label">{route.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
