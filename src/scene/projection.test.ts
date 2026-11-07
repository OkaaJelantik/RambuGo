import { describe, expect, it } from 'vitest'
import {
  DEPTH_K,
  HORIZON,
  ROAD_HALF,
  WALK_W,
  fadeAt,
  nearFadeAt,
  roadHalfAt,
  scaleAt,
  walkHalfAt,
  xAt,
  yAt,
} from './projection'

/** Depth samples across the full 0..1 range, in 0.01 steps. */
const DEPTHS = Array.from({ length: 101 }, (_, i) => i / 100)

describe('scaleAt', () => {
  it('is 1 at the camera foot', () => {
    expect(scaleAt(0)).toBe(1)
  })

  it('matches 1 / (1 + DEPTH_K) at the horizon', () => {
    expect(Math.abs(scaleAt(1) - 1 / (1 + DEPTH_K))).toBeLessThan(1e-9)
  })

  it('decreases monotonically as depth grows', () => {
    for (let i = 1; i < DEPTHS.length; i += 1) {
      expect(scaleAt(DEPTHS[i])).toBeLessThan(scaleAt(DEPTHS[i - 1]))
    }
  })
})

describe('yAt', () => {
  it('puts the camera foot at the bottom edge', () => {
    expect(yAt(0)).toBe(1)
  })

  it('stays above the horizon and below 0.46 at full depth', () => {
    expect(yAt(1)).toBeLessThan(0.46)
    for (const depth of DEPTHS) {
      expect(yAt(depth)).toBeGreaterThan(HORIZON)
    }
  })

  it('decreases monotonically as depth grows', () => {
    for (let i = 1; i < DEPTHS.length; i += 1) {
      expect(yAt(DEPTHS[i])).toBeLessThan(yAt(DEPTHS[i - 1]))
    }
  })
})

describe('xAt', () => {
  it('maps the outer sidewalk lanes to 0.1 and 0.9 at the camera foot', () => {
    // 0.5 + (-0.4) is 0.09999999999999998 in binary floating point, so compare
    // with a tolerance rather than strict equality.
    expect(xAt(-0.4, 0)).toBeCloseTo(0.1, 12)
    expect(xAt(0.4, 0)).toBeCloseTo(0.9, 12)
  })

  it('keeps the centre line at 0.5 at every depth', () => {
    for (const depth of DEPTHS) {
      expect(xAt(0, depth)).toBe(0.5)
    }
  })
})

describe('fadeAt', () => {
  it('is fully visible at the camera foot and gone at the horizon', () => {
    expect(fadeAt(0)).toBe(1)
    expect(fadeAt(1)).toBe(0)
  })

  it('holds 1 up to 0.62 and 0 from 0.92 on', () => {
    expect(fadeAt(0.62)).toBe(1)
    expect(fadeAt(0.92)).toBe(0)
  })

  it('fades linearly halfway between 0.62 and 0.92', () => {
    expect(fadeAt(0.77)).toBeCloseTo(0.5, 12)
  })

  it('never increases as depth grows through the fade band', () => {
    const band = Array.from({ length: 31 }, (_, i) => 0.62 + i * 0.01)
    for (let i = 1; i < band.length; i += 1) {
      expect(fadeAt(band[i])).toBeLessThanOrEqual(fadeAt(band[i - 1]))
    }
  })
})

describe('nearFadeAt', () => {
  it('is hidden up to 0.06 and fully visible from 0.16 on', () => {
    expect(nearFadeAt(0)).toBe(0)
    expect(nearFadeAt(0.06)).toBe(0)
    expect(nearFadeAt(0.16)).toBe(1)
  })

  it('fades in linearly halfway between 0.06 and 0.16', () => {
    expect(nearFadeAt(0.11)).toBeCloseTo(0.5, 12)
  })

  it('never decreases as depth grows through the near band', () => {
    const band = Array.from({ length: 11 }, (_, i) => 0.06 + i * 0.01)
    for (let i = 1; i < band.length; i += 1) {
      expect(nearFadeAt(band[i])).toBeGreaterThanOrEqual(nearFadeAt(band[i - 1]))
    }
  })

  it('does not affect depth 0.16 or beyond', () => {
    for (const depth of DEPTHS) {
      if (depth < 0.16) continue
      expect(nearFadeAt(depth)).toBe(1)
    }
  })

  it('clamps depth like the other projection helpers', () => {
    expect(nearFadeAt(-1)).toBe(0)
    expect(nearFadeAt(2)).toBe(1)
  })
})

describe('road and walk half-widths', () => {
  it('equal their constants at the camera foot', () => {
    expect(roadHalfAt(0)).toBe(ROAD_HALF)
    expect(walkHalfAt(0)).toBe(ROAD_HALF + WALK_W)
  })

  it('shrink with the same perspective scale as the rest of the scene', () => {
    for (const depth of DEPTHS) {
      expect(roadHalfAt(depth)).toBe(ROAD_HALF * scaleAt(depth))
      expect(walkHalfAt(depth)).toBe((ROAD_HALF + WALK_W) * scaleAt(depth))
    }
  })
})

describe('depth clamping', () => {
  it('treats negative depth as the camera foot', () => {
    expect(scaleAt(-1)).toBe(1)
    expect(yAt(-1)).toBe(1)
    expect(fadeAt(-1)).toBe(1)
    expect(xAt(-0.4, -1)).toBeCloseTo(0.1, 12)
  })

  it('treats depth beyond 1 as the horizon', () => {
    expect(scaleAt(2)).toBe(scaleAt(1))
    expect(yAt(2)).toBe(yAt(1))
    expect(fadeAt(2)).toBe(0)
    expect(xAt(-0.4, 2)).toBe(xAt(-0.4, 1))
  })
})
