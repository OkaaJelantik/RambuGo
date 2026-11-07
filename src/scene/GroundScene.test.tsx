import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GroundScene from './GroundScene'
import {
  HORIZON,
  KERB_LINE_M,
  KERB_X,
  ROAD_FAR_X,
  SIDEWALK_LEFT,
  offsetX,
  pxAt,
  yAt,
} from './projection'

type Point = { x: number; y: number }

const W = 360
const H = 800

/** Read a polygon's `points` attribute as parsed px coordinates. */
function pointsOf(container: HTMLElement, selector: string): Point[] {
  const polygon = container.querySelector(selector)
  if (!polygon) throw new Error(`missing ${selector}`)

  return (polygon.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x, y }
    })
}

/** Width of a polygon between its two points at `y`. */
function widthAt(points: Point[], y: number): number {
  const xs = points.filter((point) => point.y === y).map((point) => point.x)
  return Math.max(...xs) - Math.min(...xs)
}

function renderGround() {
  return render(<GroundScene width={W} height={H} />)
}

describe('GroundScene', () => {
  it('draws the road from the kerb and crops it past the right frame edge', () => {
    const { container } = renderGround()
    const road = pointsOf(container, '.wk-road polygon')

    const near = road.filter((point) => point.y === H).map((point) => point.x)
    const far = road.filter((point) => point.y === yAt(1) * H).map((point) => point.x)

    // Left edge of the road is the kerb, at both depths.
    expect(Math.min(...near)).toBeCloseTo(offsetX(KERB_X, 0, W, H), 6)
    expect(Math.min(...far)).toBeCloseTo(offsetX(KERB_X, 1, W, H), 6)
    // Right edge is ROAD_FAR_X — well outside a 360 px frame.
    expect(Math.max(...near)).toBeCloseTo(offsetX(ROAD_FAR_X, 0, W, H), 6)
    expect(Math.max(...far)).toBeCloseTo(offsetX(ROAD_FAR_X, 1, W, H), 6)
    expect(Math.min(...near)).toBeGreaterThan(0)
    expect(Math.max(...near)).toBeGreaterThan(W)
    expect(Math.max(...far)).toBeGreaterThan(W)
  })

  it('narrows towards the horizon like every other projected edge', () => {
    const { container } = renderGround()
    const road = pointsOf(container, '.wk-road polygon')
    const near = widthAt(road, H)

    expect(near).toBeGreaterThan(widthAt(road, yAt(1) * H))
    expect(offsetX(ROAD_FAR_X, 1, W, H)).toBeLessThan(offsetX(ROAD_FAR_X, 0, W, H))
  })

  it('draws the one left sidewalk between the verge and the kerb', () => {
    const { container } = renderGround()
    const walk = pointsOf(container, '.wk-walk-left polygon')
    const near = walk.filter((point) => point.y === H).map((point) => point.x)
    const far = walk.filter((point) => point.y === yAt(1) * H).map((point) => point.x)

    expect(Math.min(...near)).toBeCloseTo(offsetX(SIDEWALK_LEFT, 0, W, H), 6)
    expect(Math.max(...near)).toBeCloseTo(offsetX(KERB_X, 0, W, H), 6)
    expect(Math.min(...far)).toBeCloseTo(offsetX(SIDEWALK_LEFT, 1, W, H), 6)
    expect(Math.max(...far)).toBeCloseTo(offsetX(KERB_X, 1, W, H), 6)
  })

  it('never draws the opposite side of the street', () => {
    const { container } = renderGround()

    // The framing crops the road before the far side: no right sidewalk, no
    // right edge line.
    expect(container.querySelector('.wk-walk-right')).toBeNull()
    expect(container.querySelector('.wk-edge-r')).toBeNull()
    expect(container.querySelector('.wk-edge-l')).toBeNull()
  })

  it('paints a kerb line exactly KERB_LINE_M metres wide', () => {
    const { container } = renderGround()
    const kerb = pointsOf(container, '.wk-kerb polygon')
    const near = kerb.filter((point) => point.y === H).map((point) => point.x)
    const far = kerb.filter((point) => point.y === yAt(1) * H).map((point) => point.x)

    expect(Math.min(...near)).toBeCloseTo(offsetX(KERB_X, 0, W, H), 6)
    expect(widthAt(kerb, H)).toBeCloseTo(pxAt(KERB_LINE_M, 0, H), 6)
    expect(widthAt(kerb, yAt(1) * H)).toBeCloseTo(pxAt(KERB_LINE_M, 1, H), 6)
    expect(Math.min(...far)).toBeCloseTo(offsetX(KERB_X, 1, W, H), 6)
  })

  it('paints the kerb line after the road, so the road fill cannot hide it', () => {
    const { container } = renderGround()
    const layers = Array.from(
      container.querySelectorAll('.wk-walk-left, .wk-road, .wk-kerb'),
    ).map((el) => el.getAttribute('class'))

    expect(layers).toEqual(['wk-walk-left', 'wk-road', 'wk-kerb'])
  })

  it('is an aria-hidden canvas whose horizon comes from the projection module', () => {
    const { container } = renderGround()
    const root = container.querySelector('.wk-ground')

    expect(root?.getAttribute('aria-hidden')).toBe('true')
    for (const layer of ['wk-sky', 'wk-hills', 'wk-haze', 'wk-verge', 'wk-walk-left', 'wk-kerb', 'wk-road']) {
      expect(container.querySelector(`.${layer}`)).not.toBeNull()
    }
    expect(root?.getAttribute('style')).toContain(`--wk-horizon: ${HORIZON * 100}%`)
  })
})
