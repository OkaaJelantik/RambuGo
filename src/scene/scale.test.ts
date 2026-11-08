import { render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SIGNS } from '../data'
import { METERS } from './meters'
import {
  CAMERA_DEPTH,
  KERB_X,
  LANES,
  LANE_SPLIT_X,
  SIDEWALK_CENTRE,
  SIDEWALK_LEFT,
  fadeAt,
  nearFadeAt,
  offsetX,
  pxAt,
  pxPerM,
  pxPerMAt,
  spriteShare,
  yAt,
} from './projection'
import { LEG_SECONDS, SCROLL_PER_SEC } from './world'
import WalkScene, {
  SIGN_PLATE_GROW,
  DASH_COUNT,
  FAR_EDGE,
  HERO_DEPTH,
  LAYOUT,
  NEAR_EDGE,
  PROP_ART,
  SIGN_EMPHASIS,
  SIGN_STOP_D,
  SIGN_X,
  TRAFFIC_WAIT,
  beltOpacity,
  dashBox,
  heroBox,
  pedBox,
  placeDash,
  placeProp,
  placeVehicle,
  propBox,
  propDepth,
  propZ,
  signPlatePx,
  signPolePx,
  vehicleBox,
  type PropKind,
} from '../WalkScene'
import { SPAWN_SEED, createRng, shouldSpawn, spawnTraffic } from './spawner'

/**
 * Task 14 framing guard.
 *
 * The old version of this file compared `pxAt(METERS.x, d, h)` with another
 * `pxAt(METERS.x, d, h)`: `depthScale` cancelled, everything was an identity,
 * and the reviewer could revert the whole metre pipeline without a red test.
 * Every number below therefore comes out of a production function that the
 * draw loop calls (`heroBox`, `propBox`, `vehicleBox`, `pedBox`, `placeProp`,
 * `placeDash`, `placeVehicle`, `beltOpacity`, `signPlatePx`), or out of the
 * inline `style.width/height` the component writes after `measure()` — and
 * the expected values are concrete pixels, so deleting the metre pipeline
 * cannot keep them green.
 *
 * A leg is `SCROLL_PER_SEC × LEG_SECONDS` = 1,8 depth units of world travel.
 * Nine phases across it are 0,225 units apart: enough samples to see every
 * belt piece through its near, mid and far thirds, and every marking through
 * most of its pass.
 */

const VIEWPORTS = [
  { label: '360×640', w: 360, h: 640 },
  { label: '360×800', w: 360, h: 800 },
  { label: '390×844', w: 390, h: 844 },
  { label: '1024×600', w: 1024, h: 600 },
  { label: '1280×800', w: 1280, h: 800 },
] as const

const H = 800
const PPM = pxPerM(H)

/** World travel of one leg, in depth units. */
const LEG_SCROLL = SCROLL_PER_SEC * LEG_SECONDS

/** Nine evenly spaced scroll phases across one leg. */
const PHASES = Array.from({ length: 9 }, (_, i) => (i / 8) * LEG_SCROLL)

/** z-index of the sign, the hero and the HUD, from walk.css. */
const SIGN_Z = 160
const HERO_Z = 200
const HUD_Z = 400

/** HUD pill box from walk.css: top 12–24 px, ~52 px tall, 300 px wide. */
const HUD = { top: 12, bottom: 64, halfWidth: 150 }

/**
 * Coarse ink mask of `HeroWalk`'s 140 × 260 viewBox: head, arms/torso, skirt
 * and legs. Deliberately humanoid, not the rectangle around it, and it starts
 * at y = 24 because the top 24 units of the art are empty.
 */
function heroBodyPoints(): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = []
  for (let x = 24; x <= 116; x += 4) {
    for (let y = 24; y <= 240; y += 4) {
      const head = ((x - 70) / 31) ** 2 + ((y - 56) / 32) ** 2 <= 1
      const torso = x >= 44 && x <= 96 && y >= 82 && y <= 144
      const arms = x >= 30 && x <= 110 && y >= 106 && y <= 174
      const skirt = x >= 40 && x <= 100 && y >= 144 && y <= 190
      const legs = x >= 44 && x <= 96 && y >= 144 && y <= 236
      if (head || torso || arms || skirt || legs) out.push([x, y])
    }
  }
  return out
}

const BODY = heroBodyPoints()

type Rect = { x0: number; x1: number; y0: number; y1: number; z: number; opacity: number }

/** A painted rectangle without its stacking data, for the overlap guards. */
type PaintedRect = { x0: number; x1: number; y0: number; y1: number }

function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1
}

/** Axes-aligned overlap. Touching edges do not count: a prop may stand at the
 *  sign's column and still be *beside* the plate, not over it. */
function overlaps(a: PaintedRect, b: PaintedRect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

/** The box a prop paints on screen at one phase, from the loop's own placement. */
function propRect(p: { x: number; y: number; width: number; height: number }): PaintedRect {
  return { x0: p.x - p.width / 2, x1: p.x + p.width / 2, y0: p.y - p.height, y1: p.y }
}

/**
 * Plate and pole boxes exactly as the DOM paints them at the stop depth: the
 * button is bottom-anchored on the ground, the pole rises from it, and the
 * plate sits on the pole's top (`.wk-sign` is a bottom-anchored flex column).
 */
function signPaintedBoxes(w: number, h: number): { plate: PaintedRect; pole: PaintedRect } {
  const plate = signPlatePx(h)
  const pole = signPolePx(h)
  const cx = offsetX(SIGN_X, SIGN_STOP_D, w, h)
  const ground = yAt(SIGN_STOP_D) * h
  return {
    plate: {
      x0: cx - plate / 2,
      x1: cx + plate / 2,
      y0: ground - pole.h - plate,
      y1: ground - pole.h,
    },
    pole: {
      x0: cx - pole.w / 2,
      x1: cx + pole.w / 2,
      y0: ground - pole.h,
      y1: ground,
    },
  }
}

/**
 * Everything painted over the scene at one phase, with the z-index the draw
 * loop gives it. Props and ambience are placed by the same functions the loop
 * calls, so their z-order here is the z-order on screen.
 */
function paintRects(w: number, h: number, scroll: number): Rect[] {
  const list: Rect[] = []

  for (const spec of LAYOUT) {
    const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
    list.push({
      x0: p.x - p.width / 2,
      x1: p.x + p.width / 2,
      y0: p.y - p.height,
      y1: p.y,
      z: p.z,
      opacity: p.opacity,
    })
  }

  // Both lanes of traffic, at every depth a vehicle can be at: the hero must
  // stay clear of the road anyway, and this keeps that honest.
  for (const lane of ['laneL', 'laneR'] as const) {
    for (const depth of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const v = placeVehicle(lane, 'car', depth, w, h)
      list.push({
        x0: v.x - v.width / 2,
        x1: v.x + v.width / 2,
        y0: v.y - v.height,
        y1: v.y,
        z: v.z,
        opacity: v.opacity,
      })
    }
  }

  // The sign button's plate is above its pole; its bottom edge is the plate's
  // bottom, not the ground.
  const { plate } = signPaintedBoxes(w, h)
  list.push({ ...plate, z: SIGN_Z, opacity: 1 })

  // HUD pill at the top centre (walk.css: top 12–24 px, z 400).
  list.push({
    x0: w / 2 - HUD.halfWidth,
    x1: w / 2 + HUD.halfWidth,
    y0: HUD.top,
    y1: HUD.bottom,
    z: HUD_Z,
    opacity: 1,
  })

  return list
}

type BuildingPhase = {
  depth: number
  /** Share of the sprite inside the frame, 0..1. */
  share: number
  /** Share of the frame the visible sprite covers, 0..1. */
  frame: number
  /** Painted opacity, after the belt's width guard. */
  opacity: number
  /** Opacity of the depth fades alone: what the width guard took away. */
  depthOpacity: number
}

type BuildingPhases = {
  /** Phases where enough of the sprite shows at a readable opacity. */
  shown: number
  best: number
  minShare: number
  phases: BuildingPhase[]
}

type Measurements = {
  heroW: number
  heroH: number
  heroCx: number
  inkLeft: number
  inkRight: number
  childVisible: number
  maxRawDepthCoverage: number
  maxPaintedCoverage: number
  guardFades: number
  building: Record<'house' | 'shop', BuildingPhases>
  marksMinPerPhase: number
  marksNearestDepth: number
  opposingNearest: number
  opposingBest: number
  signGap: number
}

function measureViewport(w: number, h: number): Measurements {
  const hero = heroBox(h)
  const heroCx = offsetX(SIDEWALK_CENTRE, HERO_DEPTH, w, h)
  const inkLeft = heroCx - hero.w / 2 + (24 / 140) * hero.w
  const inkRight = heroCx - hero.w / 2 + (116 / 140) * hero.w
  const footY = yAt(HERO_DEPTH) * h

  let childVisible = 1
  let maxRawDepthCoverage = 0
  let maxPaintedCoverage = 0
  let guardFades = 0
  let marksMinPerPhase = Number.POSITIVE_INFINITY
  let marksNearestDepth = Number.POSITIVE_INFINITY
  const building: Record<'house' | 'shop', BuildingPhases> = {
    house: { shown: 0, best: 0, minShare: 1, phases: [] },
    shop: { shown: 0, best: 0, minShare: 1, phases: [] },
  }

  for (const scroll of PHASES) {
    for (const spec of LAYOUT) {
      const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
      // Raw geometry: the box × depthScale, before any guard. A piece can be
      // this wide on screen and still be invisible; the point is that a 3×
      // oversized sprite cannot hide behind the guard.
      if (fadeAt(p.depth) * nearFadeAt(p.depth) >= 0.5) {
        maxRawDepthCoverage = Math.max(maxRawDepthCoverage, p.coverage)
      }
      // Painted: only what the guard actually shows counts against the
      // half-frame rule.
      if (p.opacity >= 0.1) maxPaintedCoverage = Math.max(maxPaintedCoverage, p.coverage)
      if (p.coverage >= 0.5 && p.opacity === 0) guardFades += 1
    }

    for (const art of ['house', 'shop'] as const) {
      const spec = LAYOUT.find((s) => s.art === art)!
      const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
      const share = spriteShare(p.x, p.width, w)
      building[art].best = Math.max(building[art].best, p.opacity)
      building[art].phases.push({
        depth: p.depth,
        share,
        frame: p.coverage,
        opacity: p.opacity,
        depthOpacity: fadeAt(p.depth) * nearFadeAt(p.depth),
      })
      if (share >= 0.08 && p.opacity >= 0.5) {
        building[art].shown += 1
        building[art].minShare = Math.min(building[art].minShare, share)
      }
    }

    const marks = Array.from({ length: DASH_COUNT }, (_, i) => placeDash(i, scroll, w, h)).filter(
      (dash) =>
        dash.width >= 12 && spriteShare(dash.x, dash.width, w) >= 0.6 && dash.opacity >= 0.4,
    )
    marksMinPerPhase = Math.min(marksMinPerPhase, marks.length)
    for (const dash of marks) marksNearestDepth = Math.min(marksNearestDepth, dash.depth)

    // Silhouette: sample the ink and count only points that are inside the
    // frame and not behind something painted above the hero.
    const above = paintRects(w, h, scroll).filter((r) => r.z > HERO_Z && r.opacity >= 0.1)
    let seen = 0
    for (const [vx, vy] of BODY) {
      const x = heroCx - hero.w / 2 + (vx / 140) * hero.w
      const y = footY - hero.h + (vy / 260) * hero.h
      if (x < 0 || x > w || y < 0 || y > h) continue
      if (above.some((r) => contains(r, x, y))) continue
      seen += 1
    }
    childVisible = Math.min(childVisible, seen / BODY.length)
  }

  // Oncoming traffic: a laneR car is "seen" when at least a fifth of the
  // sprite is inside the frame at half opacity or better.
  let opposingNearest = Number.POSITIVE_INFINITY
  let opposingBest = 0
  for (let depth = 0.16; depth <= 0.92; depth += 0.002) {
    const car = placeVehicle('laneR', 'car', depth, w, h)
    const share = spriteShare(car.x, car.width, w)
    if (share >= 0.2 && car.opacity >= 0.5) {
      opposingNearest = Math.min(opposingNearest, depth)
      opposingBest = Math.max(opposingBest, share)
    }
  }

  return {
    heroW: hero.w,
    heroH: hero.h,
    heroCx,
    inkLeft,
    inkRight,
    childVisible,
    maxRawDepthCoverage,
    maxPaintedCoverage,
    guardFades,
    building,
    marksMinPerPhase,
    marksNearestDepth,
    opposingNearest,
    opposingBest,
    signGap: offsetX(SIGN_X, SIGN_STOP_D, w, h) - signPlatePx(h) / 2 - inkRight,
  }
}

describe('one metre, every object class', () => {
  it('draws the hero at METERS.child, not as a share of the viewport', () => {
    const hero = heroBox(H)
    expect(hero.h).toBeCloseTo(199.8, 6)
    expect(hero.w).toBeCloseTo(107.5846153, 6)
    // A quarter-screen hero would be `0.25 * vh`; the metre pipeline clamps
    // pxPerM at 640..1000, so the two diverge outside a 800 px viewport.
    expect(heroBox(600).h).toBeCloseTo(159.84, 6)
    expect(Math.abs(heroBox(600).h - 0.25 * 600)).toBeGreaterThan(5)
    expect(heroBox(1100).h).toBeCloseTo(249.75, 6)
    expect(Math.abs(heroBox(1100).h - 0.25 * 1100)).toBeGreaterThan(10)
  })

  it('draws every prop at its METERS height, with the art ratio, at the focal plane', () => {
    const field: Record<PropKind, number> = {
      house: METERS.house,
      shop: METERS.shop,
      tree: METERS.tree,
      lamp: METERS.lamp,
      fence: METERS.fence,
      bin: METERS.bin,
      bench: METERS.bench,
      busstop: METERS.busStop,
      powerpole: METERS.powerPole,
    }
    for (const kind of Object.keys(PROP_ART) as PropKind[]) {
      const box = propBox(kind, H)
      // Concrete pixels: a viewport-height fraction would be ~0,28 × 800.
      expect(box.h).toBeCloseTo(field[kind] * PPM, 6)
      expect(box.h / PPM).toBeCloseTo(field[kind], 6)
      expect(box.w / box.h).toBeCloseTo(PROP_ART[kind].ratio, 6)
    }
    // The house-to-child ratio only holds if both come through the same
    // metre table; the old fraction pipeline gave ~1,1.
    expect(propBox('house', H).h / heroBox(H).h).toBeCloseTo(4.8148, 3)
  })

  it('anchors the car at 1,8 m and keeps it inside the 2,4 m lane', () => {
    const car = vehicleBox('car', H)
    expect(car.w).toBeCloseTo(266.4, 6)
    expect(car.h).toBeCloseTo(149.85, 6)
    expect(car.w / pxAt(METERS.lane, CAMERA_DEPTH, H)).toBeCloseTo(0.75, 6)
    // A three-times-wider car would be 2,25 lanes wide.
    expect(car.w / pxAt(METERS.lane, CAMERA_DEPTH, H)).toBeLessThanOrEqual(0.8)
    expect(vehicleBox('bike', H).w).toBeCloseTo(103.6, 6)
  })

  it('draws the adult and the child pedestrian at their METERS heights', () => {
    expect(pedBox('adult', H).h).toBeCloseTo(251.6, 6)
    expect(pedBox('child', H).h).toBeCloseTo(177.6, 6)
    expect(pedBox('adult', H).w).toBeCloseTo(113.22, 6)
    expect(pedBox('adult', H).h / pedBox('child', H).h).toBeCloseTo(1.7 / 1.2, 6)
  })

  it('draws the sign plate and a 1,8 m pole at the stop depth, 1,5× rendered', () => {
    // SIGN_EMPHASIS = 1,5 is a game affordance: the world plate is still
    // 0,60 m, but the rendered one is 0,90 m (see SIGN_EMPHASIS).
    expect(signPlatePx(H)).toBeCloseTo(97.6204, 3)
    expect(signPolePx(H).h).toBeCloseTo(278.915, 3)
    expect(signPolePx(H).w).toBeCloseTo(13.9458, 3)
    // In metres at the stop depth, after dividing the emphasis back out, so
    // the CSS fallback and the JS cannot drift from the metre table.
    expect(
      signPlatePx(H) / pxPerMAt(SIGN_STOP_D, H) / SIGN_EMPHASIS / SIGN_PLATE_GROW,
    ).toBeCloseTo(METERS.sign.plate, 6)
    expect(signPolePx(H).h / pxPerMAt(SIGN_STOP_D, H) / SIGN_EMPHASIS).toBeCloseTo(
      METERS.sign.pole,
      6,
    )
  })
})

describe('the rendered scene writes those boxes into the DOM', () => {
  const original = { w: window.innerWidth, h: window.innerHeight }

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: original.w })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: original.h })
    vi.unstubAllGlobals()
  })

  it('sizes the hero, props, dashes, sign and traffic from the metres table at 360×800', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    // jsdom has no frame clock; the loop may start, but no frame has to run —
    // `measure()` and the first `draw()` happen in the layout effect.
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const { container } = render(
      createElement(WalkScene, { signs: SIGNS.slice(0, 3), step: 0, onOpen: () => {} }),
    )

    const px = (selector: string) => {
      const el = container.querySelector<HTMLElement>(selector)
      if (!el) throw new Error(`missing ${selector}`)
      return { el, w: parseFloat(el.style.width), h: parseFloat(el.style.height) }
    }
    const scaleOf = (transform: string) => {
      const match = /scale\(([-\d.]+)\)/.exec(transform)
      if (!match) throw new Error(`no scale in "${transform}"`)
      return Number(match[1])
    }

    // The hero: 1,35 m at the focal plane, 140 × 260 art box.
    // jsdom normalises inline style numbers to six significant digits, so the
    // literals below are exact to 3 decimals and the ratio checks keep the
    // precision honest (a fraction pipeline cannot satisfy both).
    const hero = px('.wk-hero')
    expect(hero.h).toBeCloseTo(199.8, 3)
    expect(hero.w).toBeCloseTo(107.585, 3)
    expect(hero.w / hero.h).toBeCloseTo(140 / 260, 4)
    expect(scaleOf(hero.el.style.transform)).toBe(1)

    // The 6,5 m house: nominal box in `style`, depth scale in the transform.
    const house = px('.wk-prop--house')
    expect(house.h).toBeCloseTo(962, 3)
    expect(house.w).toBeCloseTo(1068.89, 3)
    expect(house.w / house.h).toBeCloseTo(200 / 180, 4)
    const houseScale = scaleOf(house.el.style.transform)
    expect(houseScale).toBeCloseTo(0.285, 6) // roundScale(propDepth(0.7, 0))
    // The pixels the phone actually paints for the house at scroll 0.
    expect(house.w * houseScale).toBeCloseTo(304.63, 2)

    // The bus stop is on the pavement and 1,8 m tall, drawn 80×180 (Task 20):
    // in profile its visible width is the shelter's depth into the pavement,
    // 0,80 m, which is also what lets it stand inside the kerb band.
    const bus = px('.wk-prop--busstop')
    expect(bus.h).toBeCloseTo(266.4, 3)
    expect(bus.w).toBeCloseTo(118.4, 3)
    expect(bus.w / bus.h).toBeCloseTo(80 / 180, 4)

    // The loop's painted opacity and z-index, not just the nominal box: at
    // scroll 0 the house sits at depth 0,7, where the width guard is already
    // fading it, so a guard that stopped running would show up here too.
    const houseSpec = LAYOUT.find((s) => s.art === 'house')!
    const housePaint = placeProp(houseSpec, propDepth(houseSpec.base, 0), 360, 800)
    expect(parseFloat(house.el.style.opacity)).toBeCloseTo(housePaint.opacity, 3)
    expect(house.el.style.zIndex).toBe(String(housePaint.z))
    expect(housePaint.opacity).toBeLessThan(1)

    const dash = px('.wk-dash')
    expect(dash.w).toBeCloseTo(66.6, 3)
    expect(dash.h).toBeCloseTo(20.72, 3)

    const plate = px('.wk-sign-plate')
    expect(plate.w).toBeCloseTo(97.6204, 3)
    expect(plate.h).toBeCloseTo(97.6204, 3)
    expect(plate.w).toBeCloseTo(plate.h, 3)

    const pole = px('.wk-sign-pole')
    expect(pole.h).toBeCloseTo(278.915, 3)
    expect(pole.w).toBeCloseTo(13.946, 3)
    // The pole and the plate share one projector and one emphasis, so the
    // ratio is the metre ratio 1,8 m / 0,6 m over the plate's 5 % growth.
    expect(pole.h / plate.w).toBeCloseTo(
      METERS.sign.pole / (METERS.sign.plate * SIGN_PLATE_GROW),
      3,
    )

    const car = px('.wk-veh--car')
    expect(car.w).toBeCloseTo(266.4, 3)
    expect(car.h).toBeCloseTo(149.85, 3)
    expect(car.w / car.h).toBeCloseTo(160 / 90, 4)

    const adult = px('.wk-ped--adult')
    expect(adult.h).toBeCloseTo(251.6, 3)
    expect(adult.w).toBeCloseTo(113.22, 3)
    expect(adult.w / adult.h).toBeCloseTo(90 / 200, 4)
  })
})

/**
 * The visible frame coverage of a building through the phases it is really
 * painted in (the near and horizon fades excluded), as "min–max %".
 */
function frameRange(b: BuildingPhases): string {
  const painted = b.phases.filter((p) => p.depthOpacity >= 0.5).map((p) => p.frame)
  if (painted.length === 0) return '-'
  return `${(Math.min(...painted) * 100).toFixed(0)}–${(Math.max(...painted) * 100).toFixed(0)}%`
}

describe('framing across viewports', () => {
  for (const { label, w, h } of VIEWPORTS) {
    describe(label, () => {
      const m = measureViewport(w, h)

      it('reports the measured framing', () => {
        console.log(
          `[framing] ${label} hero=${m.heroW.toFixed(1)}×${m.heroH.toFixed(1)}px@${m.heroCx.toFixed(1)} ` +
            `ink=${m.inkLeft.toFixed(0)}..${m.inkRight.toFixed(0)} ` +
            `childVis=${(m.childVisible * 100).toFixed(0)}% ` +
            `marks≥${m.marksMinPerPhase}/phase nearest@${m.marksNearestDepth.toFixed(2)} ` +
            `raw=${(m.maxRawDepthCoverage * 100).toFixed(0)}% painted=${(m.maxPaintedCoverage * 100).toFixed(0)}% ` +
            `guardFades=${m.guardFades} ` +
            `house=${m.building.house.shown}/9@${(m.building.house.minShare * 100).toFixed(0)}% ` +
            `frame=${frameRange(m.building.house)} ` +
            `shop=${m.building.shop.shown}/9@${(m.building.shop.minShare * 100).toFixed(0)}% ` +
            `frame=${frameRange(m.building.shop)} ` +
            `oncoming=${m.opposingNearest === Infinity ? '-' : m.opposingNearest.toFixed(2)}@${(
              m.opposingBest * 100
            ).toFixed(0)}% ` +
            `signGap=${m.signGap.toFixed(0)}px`,
        )
        expect(Number.isFinite(m.maxRawDepthCoverage)).toBe(true)
      })

      it('keeps the child on the pavement, inside the frame and clear of the sign', () => {
        // Her line is 0,80 m in from the garden edge and 1,20 m from the kerb.
        expect(SIDEWALK_CENTRE).toBeGreaterThan(SIDEWALK_LEFT)
        expect(SIDEWALK_CENTRE).toBeLessThan(KERB_X)
        expect(KERB_X - SIDEWALK_CENTRE).toBeCloseTo(1.2, 6)
        // Her drawn body, not just the box: the ink stays on screen.
        expect(m.inkLeft).toBeGreaterThan(0)
        expect(m.inkRight).toBeLessThan(w)
        // The plate never sits over her silhouette, on any z-order.
        expect(m.signGap).toBeGreaterThan(0)
      })

      it('paints every prop behind the hero and above the road', () => {
        for (const scroll of PHASES) {
          for (const spec of LAYOUT) {
            const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
            expect(p.z).toBeGreaterThan(0)
            expect(p.z).toBeLessThan(SIGN_Z)
          }
        }
        // Near pieces stack above far ones, and the hero stays on top of all
        // of them; that is why only the sign and the HUD can ever occlude her.
        expect(propZ(0.02)).toBeGreaterThan(propZ(0.9))
        expect(propZ(0.02)).toBeLessThan(HERO_Z)
        expect(SIGN_Z).toBeLessThan(HERO_Z)
        expect(HERO_Z).toBeLessThan(HUD_Z)
        // The HUD pill is above her head, not over it.
        expect(HUD.bottom).toBeLessThan(yAt(HERO_DEPTH) * h - m.heroH)
      })

      it('keeps at least 60 % of the child’s silhouette visible, frame clipping included', () => {
        expect(m.childVisible).toBeGreaterThanOrEqual(0.6)
        // Sanity: the sample is humanoid, not a rectangle.
        expect(BODY.length).toBeGreaterThan(200)
      })

      it('lets no painted prop cover more than half the frame', () => {
        expect(m.maxPaintedCoverage).toBeLessThanOrEqual(0.5)
        if (w <= 390) {
          // On a phone the guard is load-bearing, not decorative: the bus stop
          // passes the camera and would otherwise wipe the screen.
          expect(m.guardFades).toBeGreaterThan(0)
        }
      })

      it('keeps every prop’s raw geometry under 80 % of the frame while the depth fades paint it', () => {
        // The guard cannot hide a sprite that is three times too wide: with
        // the house ×3 this number goes past 1.0 on the phone.
        expect(m.maxRawDepthCoverage).toBeLessThanOrEqual(0.8)
      })

      it('shows both garden-side buildings through most of a leg', () => {
        for (const art of ['house', 'shop'] as const) {
          const spec = LAYOUT.find((s) => s.art === art)!
          // The anchor stands behind the pavement, and the sprite never
          // crosses the kerb into the road.
          expect(spec.x).toBeLessThan(SIDEWALK_LEFT)
          expect(spec.x + propBox(art, h).w / 2 / pxPerM(h)).toBeLessThan(KERB_X)

          // A sliver of a sprite at 10 % opacity is not "in view": an eighth
          // of the sprite at a readable opacity, at most phases of the loop.
          const readable = m.building[art].phases.filter(
            (p) => p.share >= 0.08 && p.opacity >= 0.25,
          )
          expect(readable.length).toBeGreaterThanOrEqual(5)

          // At least once they are fully opaque, not just a ghost. On the
          // 640 px-tall phone the house's visible box peaks at 46 % of the
          // frame, so the 40–50 % width guard legitimately dims it to 0,82:
          // the guard is doing its job, not hiding the building.
          expect(m.building[art].best).toBeGreaterThanOrEqual(h <= 640 ? 0.8 : 0.9)

          // The depth fades alone leave them at full strength on four phases
          // (the hero's near fade still dims the closest pass). Any extra
          // dimming comes from the width guard; the painted assertions below
          // account for that separately.
          const full = m.building[art].phases.filter((p) => p.depthOpacity >= 0.9)
          expect(full.length).toBeGreaterThanOrEqual(4)
        }

        if (w <= 390) {
          // The plan's phone rule, in pixels of sprite: both buildings still
          // show a readable piece at half opacity or better, on five phases.
          // On a 640 px-tall frame the house peaks at 46 % coverage, so the
          // width guard takes it just under 0,5 for one of those phases; four
          // phases still means it reads through nearly half the leg.
          const phonePhases = h <= 640 ? 4 : 5
          for (const art of ['house', 'shop'] as const) {
            const shown = m.building[art].phases.filter(
              (p) => p.share >= 0.08 && p.opacity >= 0.5,
            )
            expect(shown.length).toBeGreaterThanOrEqual(phonePhases)
          }

          // The garden side has to read as a building, not a 3 px edge. The
          // house fills a third of the frame through six phases (34–45 % in
          // the seven it is painted); the shop a sixth through five.
          const house = m.building.house.phases.filter(
            (p) => p.frame >= 0.3 && p.opacity >= 0.25,
          )
          expect(house.length).toBeGreaterThanOrEqual(6)
          const shop = m.building.shop.phases.filter(
            (p) => p.frame >= 0.15 && p.opacity >= 0.25,
          )
          expect(shop.length).toBeGreaterThanOrEqual(5)
        }
      })

      it('keeps both buildings’ raw boxes under half the phone frame', () => {
        // The width guard may fade a building, never hide one that is simply
        // too wide. On a phone the safe band ends at −4,0 m: one more metre
        // right turns the house box into 65 % of the frame.
        if (w > 390) return
        for (const art of ['house', 'shop'] as const) {
          const painted = m.building[art].phases
            .filter((p) => p.depthOpacity >= 0.5)
            .map((p) => p.frame)
          expect(Math.max(...painted)).toBeLessThanOrEqual(0.5)
        }
      })

      it('paints at least two legible centre-line marks on every phase, well inside the leg', () => {
        expect(m.marksMinPerPhase).toBeGreaterThanOrEqual(2)
        // The nearest legible dash is in the middle of the leg, not a 17 px
        // smudge at the horizon: the old split (4,3 m) never came below 0,72.
        expect(m.marksNearestDepth).toBeLessThanOrEqual(0.55)
        // The marking belongs to the road side of the kerb.
        expect(LANE_SPLIT_X).toBeGreaterThan(KERB_X)
      })

      it('puts oncoming traffic inside the frame, on the road, during the leg', () => {
        expect(m.opposingNearest).toBeLessThanOrEqual(0.6)
        expect(m.opposingBest).toBeGreaterThanOrEqual(0.2)
        // The oncoming lane is beyond the kerb, never over the pavement.
        expect(LANES.laneR - METERS.car.width / 2).toBeGreaterThan(KERB_X)
      })

      it('keeps the whole bus-stop sprite on the pavement, kerb-flush', () => {
        const spec = LAYOUT.find((s) => s.art === 'busstop')!
        const metres = propBox('busstop', h).w / pxPerM(h)
        expect(spec.x - metres / 2).toBeGreaterThanOrEqual(SIDEWALK_LEFT)
        expect(spec.x + metres / 2).toBeCloseTo(KERB_X, 9)
        // Same invariant in the pixels the scene paints, at every phase. The
        // drawn box is kerb-flush, and the loop's depth scale is rounded to
        // three decimals, so allow a twentieth of a pixel of rounding — the
        // point is that the sprite never walks out onto the road.
        for (const scroll of PHASES) {
          const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
          expect(p.x - p.width / 2).toBeGreaterThanOrEqual(offsetX(SIDEWALK_LEFT, p.depth, w, h))
          expect(p.x + p.width / 2).toBeLessThanOrEqual(offsetX(KERB_X, p.depth, w, h) + 0.05)
        }
      })

      it('paints at least one opposing vehicle for half a second during a leg', () => {
        const spawns = trafficDuringLeg()
        expect(spawns.length).toBeGreaterThan(0)
        const opposing = spawns.filter((s) => s.lane === 'laneR')
        expect(opposing.length).toBeGreaterThan(0)
        const visible = opposing.map((spawn) => opposingVisibleSeconds(spawn, w, h))
        expect(Math.max(...visible)).toBeGreaterThanOrEqual(0.5)
      })
    })
  }

  it('does not change the hero’s size between a phone and a desktop of equal height', () => {
    // Framing changes with width; a metre does not. 360×800 and 1280×800 are
    // the two review viewports and share a height. Concrete pixels, not the
    // production function compared with itself.
    expect(heroBox(800).h).toBeCloseTo(199.8, 6)
    expect(heroBox(800).w).toBeCloseTo(107.585, 3)
    expect(pxPerM(800)).toBeCloseTo(148, 12)
    // The width is framing, the height is a metre: compare the two viewports.
    // The hero's line is 0,90 m left of the camera, so on a 360 px phone she
    // sits left of centre but fully inside the frame; the point here is that
    // the *difference* between the two viewports is exactly the frame's own
    // width difference.
    const phone = offsetX(SIDEWALK_CENTRE, HERO_DEPTH, 360, 800)
    const desktop = offsetX(SIDEWALK_CENTRE, HERO_DEPTH, 1280, 800)
    expect(phone).toBeCloseTo(46.8, 3)
    expect(desktop).toBeCloseTo(506.8, 3)
    expect(desktop - phone).toBeCloseTo((1280 - 360) / 2, 6)
    // 844 px is above 800, inside the 640..1000 clamp band.
    expect(heroBox(844).h).toBeCloseTo(210.789, 6)
    expect(heroBox(844).h / heroBox(800).h).toBeCloseTo(844 / 800, 6)
  })
})

/**
 * Task 19: lateral bands, the rendered sign and its stacking.
 *
 * A leg freezes at `LEG_SCROLL` = 1,8; reduced motion freezes at scroll 0; and
 * because one belt loop is 1 depth unit, a second leg's freeze would sample
 * 3,6. Those three stop phases cover every wrapped position the belt can be
 * frozen in, which is when the bins are most visible (the world is not moving).
 */
const STOP_SCROLLS = [0, LEG_SCROLL, LEG_SCROLL * 2] as const

/** The three phone viewports these bands are reviewed on. */
const PHONES = VIEWPORTS.filter((v) => v.w <= 390)

/** The five placements that stand on the pavement (or its garden edge). */
const PAVEMENT = LAYOUT.filter(
  (s) => s.art === 'bin' || s.art === 'busstop' || s.art === 'bench' || s.art === 'lamp',
)

/** The two bins; the guard names them separately from the rest of `PAVEMENT`. */
const BINS = LAYOUT.filter((s) => s.art === 'bin')

describe('lateral bands and the rendered sign', () => {
  it('keeps both bins clear of the sign plate and pole at every stop phase', () => {
    for (const { label, w, h } of PHONES) {
      const { plate, pole } = signPaintedBoxes(w, h)
      for (const scroll of STOP_SCROLLS) {
        for (const spec of BINS) {
          const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
          const box = propRect(p)
          expect(overlaps(box, plate), `${label} bin @${scroll}`).toBe(false)
          expect(overlaps(box, pole), `${label} bin @${scroll}`).toBe(false)
        }
      }
    }
  })

  it('keeps the child’s band ≥ 0,03 m clear of every pavement prop, 9 phases × 3 phones', () => {
    for (const { label, w, h } of PHONES) {
      // The art box (140 wide), the conservative band the brief calls her ink:
      // 1,35 × 140/260 = 0,7269 m wide, −1,263 … −0,537 m.
      const bandW = heroBox(h).w / pxPerM(h)
      const bandLeft = SIDEWALK_CENTRE - bandW / 2
      const bandRight = SIDEWALK_CENTRE + bandW / 2
      expect(bandLeft).toBeCloseTo(-1.263, 3)
      expect(bandRight).toBeCloseTo(-0.537, 3)

      for (const scroll of PHASES) {
        for (const spec of PAVEMENT) {
          const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
          // The metre width at *this* depth, so the check rides the same
          // projection the loop paints with rather than a second table.
          const widthM = p.width / pxPerMAt(p.depth, h)
          const left = spec.x - widthM / 2
          const right = spec.x + widthM / 2
          const gap = Math.max(0, left - bandRight, bandLeft - right)
          expect(gap, `${label} ${spec.art} @${p.depth.toFixed(2)}`).toBeGreaterThanOrEqual(0.03)
        }
      }
    }
  })

  it('paints the sign plate above every prop, including the lamp that crosses it', () => {
    const w = 360
    const h = 800
    const { plate } = signPaintedBoxes(w, h)
    let crossings = 0
    for (const scroll of PHASES) {
      for (const spec of LAYOUT) {
        const p = placeProp(spec, propDepth(spec.base, scroll), w, h)
        // Every prop sits at propZ ≤ 100; the plate is 160.
        expect(p.z).toBeLessThan(SIGN_Z)
        if (spec.art === 'lamp' && p.opacity >= 0.1 && overlaps(propRect(p), plate)) {
          crossings += 1
        }
      }
    }
    expect(propZ(0)).toBeLessThanOrEqual(100)
    // The rule is exercised, not vacuous: the lamp's 4,5 m box really does
    // cross the plate's column during the leg.
    expect(crossings).toBeGreaterThan(0)
  })

  it('renders the sign plate at least 70 px at 360×640 and 88 px at 360×800', () => {
    expect(signPlatePx(640)).toBeGreaterThanOrEqual(70)
    expect(signPlatePx(800)).toBeGreaterThanOrEqual(88)
    // Concrete pixels, so removing SIGN_EMPHASIS cannot keep this green.
    expect(signPlatePx(640)).toBeCloseTo(78.0963, 2)
    expect(signPlatePx(800)).toBeCloseTo(97.6204, 2)
    // The rendered plate is the world plate × 1,5, and the pole follows the
    // same factor: one emphasis, applied to sign geometry only.
    expect(
      signPlatePx(800) / pxPerMAt(SIGN_STOP_D, 800) / SIGN_EMPHASIS / SIGN_PLATE_GROW,
    ).toBeCloseTo(METERS.sign.plate, 6)
    // Rasio tiang:pelat = 1,8 m / (0,6 m × 1,05) — pelat tumbuh 5 %, tiang tidak.
    expect(signPolePx(800).h / signPlatePx(800)).toBeCloseTo(
      METERS.sign.pole / (METERS.sign.plate * SIGN_PLATE_GROW),
      6,
    )
  })
})

type Spawn = {
  t: number
  lane: 'laneL' | 'laneR'
  kind: 'car' | 'bike'
  speed: number
  dir: 1 | -1
  depth: number
}

/**
 * The first leg's traffic, as the scene's loop spawns it: same seed, same
 * `spawnTraffic`/`shouldSpawn`, same wait band, same three slots. Only the
 * transform writes are left out — this test needs the cast, not the pixels.
 */
function trafficDuringLeg(): Spawn[] {
  const rng = createRng(SPAWN_SEED)
  const slots: Array<Spawn | null> = [null, null, null]
  const spawns: Spawn[] = []
  let id = 1
  let since = 0
  let wait = 0
  let t = 0
  const dt = 1 / 60

  while (t < LEG_SECONDS) {
    for (let i = 0; i < slots.length; i += 1) {
      const vehicle = slots[i]
      if (!vehicle) continue
      vehicle.depth += vehicle.dir * vehicle.speed * dt
      if (vehicle.depth < NEAR_EDGE || vehicle.depth > FAR_EDGE) slots[i] = null
    }

    if (wait <= 0) wait = TRAFFIC_WAIT.min + rng() * (TRAFFIC_WAIT.max - TRAFFIC_WAIT.min)
    if (shouldSpawn(dt, since, TRAFFIC_WAIT.min, wait)) {
      const slot = slots.indexOf(null)
      if (slot >= 0) {
        const traffic = spawnTraffic(rng, id)
        id += 1
        const spawn: Spawn = {
          t,
          lane: traffic.lane,
          kind: traffic.kind,
          speed: traffic.speed,
          dir: traffic.dir,
          depth: traffic.dir === 1 ? NEAR_EDGE : traffic.depth,
        }
        slots[slot] = spawn
        spawns.push(spawn)
      }
      since = 0
      wait = TRAFFIC_WAIT.min + rng() * (TRAFFIC_WAIT.max - TRAFFIC_WAIT.min)
    } else {
      since += dt
    }
    t += dt
  }

  return spawns
}

/**
 * Seconds of the leg during which this laneR vehicle is painted on screen:
 * at least a fifth of a 1,8 m car sprite inside the frame, half opacity or
 * better. Uses the car box even for a bike (a bike is narrower, so this is the
 * conservative reading).
 */
function opposingVisibleSeconds(spawn: Spawn, w: number, h: number): number {
  let near = 1
  let far = 0
  for (let depth = 0.16; depth <= 0.92; depth += 0.002) {
    const car = placeVehicle('laneR', 'car', depth, w, h)
    if (spriteShare(car.x, car.width, w) >= 0.2 && car.opacity >= 0.5) {
      near = Math.min(near, depth)
      far = Math.max(far, depth)
    }
  }
  if (near > far) return 0
  // laneR traffic enters at depth 1 and comes towards the camera.
  const enter = spawn.t + (1 - far) / spawn.speed
  const leave = spawn.t + (1 - near) / spawn.speed
  return Math.max(0, Math.min(leave, LEG_SECONDS) - Math.max(enter, 0))
}
