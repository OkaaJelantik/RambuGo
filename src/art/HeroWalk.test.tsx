import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HeroWalk from './HeroWalk'

/** Render the hero and return the root SVG. */
function renderHero(pose: 'walk' | 'idle') {
  const { container } = render(<HeroWalk pose={pose} />)
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('HeroWalk tidak merender <svg>')
  return svg
}

/** The two binding leg groups, in document order. */
function legGroups(svg: SVGElement): Element[] {
  return [svg.querySelector('.hw-leg--a'), svg.querySelector('.hw-leg--b')].filter(
    (leg): leg is Element => leg !== null,
  )
}

describe('HeroWalk pose="walk"', () => {
  it('memakai kelas root hw-walk dan punya dua grup kaki', () => {
    const svg = renderHero('walk')

    expect(svg.classList.contains('hw')).toBe(true)
    expect(svg.classList.contains('hw-walk')).toBe(true)
    expect(svg.classList.contains('hw-idle')).toBe(false)
    expect(svg.querySelector('.hw-leg--a')).not.toBeNull()
    expect(svg.querySelector('.hw-leg--b')).not.toBeNull()
  })

  it('setiap grup kaki berisi paha, betis, dan sepatu', () => {
    const legs = legGroups(renderHero('walk'))

    expect(legs).toHaveLength(2)
    for (const leg of legs) {
      expect(leg.tagName.toLowerCase()).toBe('g')
      expect(leg.querySelector('.hw-thigh')).not.toBeNull()
      expect(leg.querySelector('.hw-calf')).not.toBeNull()
      expect(leg.querySelector('.hw-shoe')).not.toBeNull()
    }
  })

  it('punya grup torso yang bisa dipantulkan CSS', () => {
    const svg = renderHero('walk')
    const torso = svg.querySelector('.hw-torso')

    expect(torso).not.toBeNull()
    expect(torso?.tagName.toLowerCase()).toBe('g')
  })
})

describe('HeroWalk pose="idle"', () => {
  it('memakai kelas root hw-idle dan tetap mempertahankan dua grup kaki', () => {
    const svg = renderHero('idle')

    expect(svg.classList.contains('hw')).toBe(true)
    expect(svg.classList.contains('hw-idle')).toBe(true)
    expect(svg.classList.contains('hw-walk')).toBe(false)
    expect(svg.querySelector('.hw-leg--a')).not.toBeNull()
    expect(svg.querySelector('.hw-leg--b')).not.toBeNull()
  })
})

describe('HeroWalk struktur dan aksesibilitas', () => {
  it('memakai viewBox yang disepakati dan disembunyikan dari pembaca layar', () => {
    const svg = renderHero('walk')

    expect(svg.getAttribute('viewBox')).toBe('0 0 140 260')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('role')).toBeNull()
  })

  it('menggambar bayangan sebagai <ellipse> di dalam SVG, tanpa filter', () => {
    const svg = renderHero('walk')

    expect(svg.querySelector('ellipse.hw-shadow')).not.toBeNull()
    expect(svg.innerHTML).not.toMatch(/filter|drop-shadow|backdrop/i)
  })
})
