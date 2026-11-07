import { describe, expect, it } from 'vitest'
import { METERS } from './meters'
import {
  SIDEWALK_CENTRE,
  depthScale,
  fadeAt,
  nearFadeAt,
  offsetX,
  pxAt,
  pxPerM,
  pxPerMAt,
  yAt,
} from './projection'
import { LEG_SECONDS, SCROLL_PER_SEC } from './world'
import {
  HERO_DEPTH,
  LAYOUT,
  PROP_ART,
  SIGN_STOP_D,
  SIGN_X,
  beltOpacity,
  heroBox,
  propBox,
  propDepth,
  propZ,
  signPlatePx,
  signPolePx,
  visibleFraction,
} from '../WalkScene'

/**
 * Cross-viewport scale audit for the Task 11 framing.
 *
 * The three viewports are the ones the plan names. The nine scroll phases are
 * evenly spaced across **one full leg** — `SCROLL_PER_SEC × LEG_SECONDS` of
 * world travel — because a leg is exactly the range the child sees before the
 * world stops at a sign. Nine phases of a 6 s leg are ~0,75 s apart.
 *
 * Everything is measured through the same functions `WalkScene` renders with
 * (`propDepth`, `propBox`, `offsetX`, `beltOpacity`, `signPlatePx`), so the
 * test cannot drift from the scene. The child's visibility is sampled on a
 * coarse humanoid ink mask, not with bounding-box arithmetic: the hero's
 * 140 × 260 art box has transparent corners, so a bbox overlap would lie.
 */

const VIEWPORTS = [
  { label: '360×800', w: 360, h: 800 },
  { label: '390×844', w: 390, h: 844 },
  { label: '1280×800', w: 1280, h: 800 },
] as const

/** World travel of one leg, in depth units. */
const LEG_SCROLL = SCROLL_PER_SEC * LEG_SECONDS

/** Nine evenly spaced scroll phases across one leg. */
const PHASES = Array.from({ length: 9 }, (_, i) => (i / 8) * LEG_SCROLL)

/** z-index of the sign and the hero, from walk.css. */
const SIGN_Z = 160
const HERO_Z = 200
const HUD_Z = 400

/**
 * Coarse ink mask of `HeroWalk`'s 140 × 260 viewBox: head, arms/torso, skirt
 * and legs. Deliberately humanoid, not the rectangle around it.
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

type Rect = { x0: number; x1: number; y0: number; y1: number; z: number; opacity: number }

function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1
}

/** Occluders in front of the hero at one phase (props, sign, HUD). */
function occluders(w: number, h: number, scroll: number): Rect[] {
  const list: Rect[] = []

  for (const spec of LAYOUT) {
    const depth = propDepth(spec.base, scroll)
    const box = propBox(spec.art, h)
    const scale = Math.round(depthScale(depth) * 1000) / 1000
    const width = box.w * scale
    const height = box.h * scale
    const cx = offsetX(spec.x, depth, w, h)
    const ground = yAt(depth) * h
    list.push({
      x0: cx - width / 2,
      x1: cx + width / 2,
      y0: ground - height,
      y1: ground,
      z: propZ(depth),
      opacity: beltOpacity(depth, visibleFraction(cx, width, w)),
    })
  }

  // The sign button's plate is above its pole; its bottom edge is the plate's
  // bottom, not the ground.
  const plate = signPlatePx(h)
  const pole = signPolePx(h)
  const signX = offsetX(SIGN_X, SIGN_STOP_D, w, h)
  const signGround = yAt(SIGN_STOP_D) * h
  list.push({
    x0: signX - plate / 2,
    x1: signX + plate / 2,
    y0: signGround - pole.h - plate,
    y1: signGround - pole.h,
    z: SIGN_Z,
    opacity: 1,
  })

  // HUD pill at the top centre (walk.css: top 12–24 px, z 400).
  list.push({
    x0: w / 2 - 150,
    x1: w / 2 + 150,
    y0: 12,
    y1: 64,
    z: HUD_Z,
    opacity: 1,
  })

  return list
}

type Measurements = {
  houseToChild: number
  carToLane: number
  maxPropCoverage: number
  maxRawVisiblePropCoverage: number
  worstProp: string
  childVisible: number
  plateMetres: number
  plateVsChildGap: number
}

function measureViewport(w: number, h: number): Measurements {
  const body = heroBodyPoints()
  const hero = heroBox(h)
  // Same projector and same lateral metre as WalkScene's heroStyle.
  const heroCx = offsetX(SIDEWALK_CENTRE, HERO_DEPTH, w, h)

  let houseToChild = 0
  let carToLane = 0
  let maxPropCoverage = 0
  let maxRawVisiblePropCoverage = 0
  let worstProp = ''
  let childVisible = 1
  let plateVsChildGap = Number.POSITIVE_INFINITY

  for (const scroll of PHASES) {
    // house : child, at equal depth (the acceptance wording).
    const houseDepth = propDepth(LAYOUT.find((p) => p.art === 'house')!.base, scroll)
    houseToChild = Math.max(
      houseToChild,
      pxAt(METERS.house, houseDepth, h) / pxAt(METERS.child, houseDepth, h),
    )

    // car : lane, at equal depth.
    const carDepth = Math.min(1, Math.max(0, scroll / LEG_SCROLL))
    carToLane = Math.max(
      carToLane,
      pxAt(METERS.car.width, carDepth, h) / pxAt(METERS.lane, carDepth, h),
    )

    // Prop coverage: the visible clipped width, counted only while the scene
    // actually paints the piece (opacity ≥ 0,10 — the Task 6 threshold).
    for (const spec of LAYOUT) {
      const depth = propDepth(spec.base, scroll)
      const box = propBox(spec.art, h)
      const scale = depthScale(depth)
      const width = box.w * scale
      const cx = offsetX(spec.x, depth, w, h)
      const coverage = visibleFraction(cx, width, w)
      const opacity = beltOpacity(depth, coverage)
      if (opacity >= 0.1 && coverage > maxPropCoverage) {
        maxPropCoverage = coverage
        worstProp = `${spec.art}@${depth.toFixed(2)}`
      }
      // What this piece would cover with only the depth fades: the report
      // uses this to show why the width guard exists.
      if (fadeAt(depth) * nearFadeAt(depth) >= 0.1) {
        maxRawVisiblePropCoverage = Math.max(maxRawVisiblePropCoverage, coverage)
      }
    }

    // Child silhouette visibility: sample the ink mask and test it against
    // every occluder that is both opaque enough and painted above the hero.
    const footY = yAt(HERO_DEPTH) * h
    const list = occluders(w, h, scroll)
    const above = list.filter((r) => r.z > HERO_Z && r.opacity >= 0.1)
    let seen = 0
    for (const [vx, vy] of body) {
      const x = heroCx - hero.w / 2 + (vx / 140) * hero.w
      const y = footY - hero.h + (vy / 260) * hero.h
      if (!above.some((r) => contains(r, x, y))) seen += 1
    }
    childVisible = Math.min(childVisible, seen / body.length)

    // The sign plate must never sit over her silhouette, z-order or not.
    const plateRect = list.find((r) => r.z === SIGN_Z)!
    for (const [vx, vy] of body) {
      const x = heroCx - hero.w / 2 + (vx / 140) * hero.w
      const y = footY - hero.h + (vy / 260) * hero.h
      if (contains(plateRect, x, y)) plateVsChildGap = 0
    }
    if (plateVsChildGap !== 0) {
      const heroRight = heroCx + hero.w / 2
      plateVsChildGap = Math.min(plateVsChildGap, plateRect.x0 - heroRight)
    }
  }

  const plateMetres = signPlatePx(h) / pxPerMAt(SIGN_STOP_D, h)

  return {
    houseToChild,
    carToLane,
    maxPropCoverage,
    maxRawVisiblePropCoverage,
    worstProp,
    childVisible,
    plateMetres,
    plateVsChildGap,
  }
}

describe('metre scale across viewports', () => {
  for (const { label, w, h } of VIEWPORTS) {
    describe(label, () => {
      const m = measureViewport(w, h)

      it('reports the measured numbers', () => {
        // Printed on purpose: the Task 11 report quotes this line.
        console.log(
          `[scale] ${label} pxPerM=${pxPerM(h).toFixed(2)} ` +
            `house:child=${m.houseToChild.toFixed(2)} ` +
            `car:lane=${m.carToLane.toFixed(3)} ` +
            `maxPropCover=${(m.maxPropCoverage * 100).toFixed(1)}% (${m.worstProp}) ` +
            `maxRawCover=${(m.maxRawVisiblePropCoverage * 100).toFixed(1)}% ` +
            `childVisible=${(m.childVisible * 100).toFixed(1)}% ` +
            `plate=${m.plateMetres.toFixed(3)}m ` +
            `plateClearance=${m.plateVsChildGap.toFixed(1)}px`,
        )
        expect(m).toBeDefined()
      })

      it('keeps the 6,5 m house at least 4× the 1,35 m child at equal depth', () => {
        expect(m.houseToChild).toBeGreaterThanOrEqual(4.0)
      })

      it('keeps the 1,8 m car under 0,8 of the 3,5 m lane', () => {
        expect(m.carToLane).toBeLessThanOrEqual(0.8)
      })

      it('lets no painted prop cover more than half the viewport width', () => {
        expect(m.maxPropCoverage).toBeLessThanOrEqual(0.5)
      })

      it('keeps at least 60 % of the child’s silhouette visible', () => {
        expect(m.childVisible).toBeGreaterThanOrEqual(0.6)
      })

      it('draws the sign plate at 0,60 m ± 10 %', () => {
        expect(Math.abs(m.plateMetres - METERS.sign.plate)).toBeLessThanOrEqual(
          METERS.sign.plate * 0.1,
        )
      })

      it('never lets the sign plate sit on the child’s silhouette', () => {
        expect(m.plateVsChildGap).toBeGreaterThan(0)
      })
    })
  }

  it('uses the same metres for every viewport (pxPerM only depends on height)', () => {
    // 360×800 and 1280×800 share a height, so a metre is the same size; the
    // framing differs only through the viewport width.
    expect(pxPerM(800)).toBeCloseTo(pxPerM(800), 12)
    expect(pxPerM(844)).toBeGreaterThan(pxPerM(800))
    expect(pxAt(METERS.child, HERO_DEPTH, 800)).toBeCloseTo(199.8, 6)
    expect(pxAt(METERS.child, HERO_DEPTH, 844)).toBeCloseTo(210.789, 6)
  })
})
