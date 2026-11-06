import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GroundScene from './GroundScene'
import { HORIZON, roadHalfAt, walkHalfAt, yAt } from './projection'

type Point = { x: number; y: number }

/** Read a polygon's `points` attribute as parsed percent coordinates. */
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

describe('GroundScene', () => {
  it('draws the road as a projection polygon instead of a hand-written clip path', () => {
    const { container } = render(<GroundScene />)
    const polygon = container.querySelector('.wk-road polygon')

    expect(polygon).not.toBeNull()
    expect(polygon?.getAttribute('points')).toContain(String(yAt(1) * 100))
  })

  it('narrows the road towards the horizon', () => {
    const { container } = render(<GroundScene />)
    const road = pointsOf(container, '.wk-road polygon')
    const near = widthAt(road, 100)
    const far = widthAt(road, yAt(1) * 100)

    expect(Math.abs(near - roadHalfAt(0) * 200)).toBeLessThan(0.01)
    expect(Math.abs(far - roadHalfAt(1) * 200)).toBeLessThan(0.01)
    expect(far).toBeLessThan(near)
    expect(roadHalfAt(1)).toBeLessThan(roadHalfAt(0))
  })

  it('places both sidewalks outside the road from walkHalfAt', () => {
    const { container } = render(<GroundScene />)
    const left = pointsOf(container, '.wk-walk-left polygon')
    const right = pointsOf(container, '.wk-walk-right polygon')
    const bottomX = left.filter((point) => point.y === 100).map((point) => point.x)
    const topX = left.filter((point) => point.y === yAt(1) * 100).map((point) => point.x)

    expect(Math.abs(Math.min(...bottomX) - (50 - walkHalfAt(0) * 100))).toBeLessThan(0.01)
    expect(Math.abs(Math.max(...bottomX) - (50 - roadHalfAt(0) * 100))).toBeLessThan(0.01)
    expect(Math.abs(Math.min(...topX) - (50 - walkHalfAt(1) * 100))).toBeLessThan(0.01)
    expect(Math.abs(Math.max(...topX) - (50 - roadHalfAt(1) * 100))).toBeLessThan(0.01)

    // The right sidewalk is the mirror image of the left one.
    expect(widthAt(right, 100)).toBeCloseTo(widthAt(left, 100), 6)
    expect(widthAt(right, yAt(1) * 100)).toBeCloseTo(widthAt(left, yAt(1) * 100), 6)
  })

  it('is an aria-hidden canvas whose horizon comes from the projection module', () => {
    const { container } = render(<GroundScene />)
    const root = container.querySelector('.wk-ground')

    expect(root?.getAttribute('aria-hidden')).toBe('true')
    for (const layer of [
      'wk-sky',
      'wk-hills',
      'wk-haze',
      'wk-verge',
      'wk-walk-left',
      'wk-walk-right',
      'wk-road',
      'wk-edge-l',
      'wk-edge-r',
    ]) {
      expect(container.querySelector(`.${layer}`)).not.toBeNull()
    }
    expect(root?.getAttribute('style')).toContain(`--wk-horizon: ${HORIZON * 100}%`)
  })
})
