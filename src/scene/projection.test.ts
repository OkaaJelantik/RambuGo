import { describe, expect, it } from 'vitest'
import { METERS } from './meters'
import {
  CAMERA_DEPTH,
  DEPTH_K,
  HORIZON,
  KERB_X,
  LANES,
  LANE_M,
  LANE_SPLIT_X,
  ROAD_FAR_X,
  ROAD_M,
  SIDEWALK_CENTRE,
  SIDEWALK_LEFT,
  SIDEWALK_M,
  depthScale,
  fadeAt,
  nearFadeAt,
  offsetX,
  pxAt,
  pxPerM,
  pxPerMAt,
  scaleAt,
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

describe('depthScale', () => {
  it('is exactly 1 on the camera plane (the hero depth)', () => {
    expect(depthScale(CAMERA_DEPTH)).toBe(1)
  })

  it('matches scaleAt(depth) / scaleAt(CAMERA_DEPTH) everywhere', () => {
    for (const depth of DEPTHS) {
      expect(depthScale(depth)).toBeCloseTo(scaleAt(depth) / scaleAt(CAMERA_DEPTH), 12)
    }
  })

  it('shrinks monotonically as depth grows', () => {
    for (let i = 1; i < DEPTHS.length; i += 1) {
      expect(depthScale(DEPTHS[i])).toBeLessThan(depthScale(DEPTHS[i - 1]))
    }
  })
})

describe('pxPerM', () => {
  it('is 148 px/m at a 800 px viewport', () => {
    expect(pxPerM(800)).toBeCloseTo(148, 12)
  })

  it('clamps the viewport height to 640..1000', () => {
    expect(pxPerM(320)).toBeCloseTo(640 * 0.185, 12)
    expect(pxPerM(640)).toBeCloseTo(640 * 0.185, 12)
    expect(pxPerM(1000)).toBeCloseTo(1000 * 0.185, 12)
    expect(pxPerM(1400)).toBeCloseTo(1000 * 0.185, 12)
  })

  it('grows with the viewport height inside the clamp band', () => {
    expect(pxPerM(844)).toBeGreaterThan(pxPerM(800))
    expect(pxPerM(700)).toBeLessThan(pxPerM(800))
  })
})

describe('pxAt', () => {
  it('draws the 1,35 m child as 200 px on the camera plane at 800 px', () => {
    expect(pxAt(METERS.child, CAMERA_DEPTH, 800)).toBeCloseTo(1.35 * 148, 6)
    // 199,8 px: a quarter of a 800 px phone screen.
    expect(Math.abs(pxAt(METERS.child, CAMERA_DEPTH, 800) - 200)).toBeLessThan(0.5)
  })

  it('is linear in metres and in pxPerM', () => {
    for (const depth of [0, 0.12, 0.5, 1]) {
      expect(pxAt(2, depth, 800)).toBeCloseTo(2 * pxPerMAt(depth, 800), 12)
      expect(pxAt(2, depth, 844)).toBeCloseTo((844 / 800) * pxAt(2, depth, 800), 6)
    }
  })

  it('shrinks with depth but never reaches zero', () => {
    expect(pxAt(1, 0.5, 800)).toBeLessThan(pxAt(1, 0.12, 800))
    expect(pxAt(1, 1, 800)).toBeGreaterThan(0)
  })

  it('is zero for a zero-metre object', () => {
    expect(pxAt(0, 0.3, 800)).toBe(0)
  })
})

describe('offsetX', () => {
  it('puts the camera line at the centre of the viewport', () => {
    for (const depth of DEPTHS) {
      expect(offsetX(0, depth, 360, 800)).toBe(180)
      expect(offsetX(0, depth, 1280, 800)).toBe(640)
    }
  })

  it('puts positive metres to the right and negative metres to the left', () => {
    expect(offsetX(1, CAMERA_DEPTH, 360, 800)).toBeGreaterThan(180)
    expect(offsetX(-1, CAMERA_DEPTH, 360, 800)).toBeLessThan(180)
  })

  it('uses the same pixels per metre as pxAt', () => {
    for (const depth of [0, 0.26, 0.5, 1]) {
      const step = offsetX(1, depth, 360, 800) - offsetX(0, depth, 360, 800)
      expect(step).toBeCloseTo(pxAt(1, depth, 800), 12)
    }
  })

  it('keeps the kerb inside the frame at the halfway depth on a 360 phone', () => {
    // The road is cropped; the kerb itself must still be readable.
    expect(offsetX(KERB_X, 0.5, 360, 800)).toBeGreaterThan(180)
    expect(offsetX(KERB_X, 0.5, 360, 800)).toBeLessThan(360)
  })
})

describe('street geometry in metres', () => {
  it('is one lane width per lane, so the road is 7 m wide', () => {
    expect(LANE_M).toBe(3.5)
    expect(ROAD_M).toBe(7)
  })

  it('has a 2 m sidewalk whose road edge is the kerb', () => {
    expect(SIDEWALK_M).toBe(2)
    expect(KERB_X).toBeCloseTo(0.8, 12)
    expect(LANE_SPLIT_X).toBeCloseTo(KERB_X + 3.5, 12)
  })

  it('puts the sidewalk centre 0,2 m left of the camera line', () => {
    expect(SIDEWALK_CENTRE).toBeCloseTo(SIDEWALK_LEFT + SIDEWALK_M / 2, 12)
    expect(SIDEWALK_CENTRE).toBeCloseTo(-0.2, 12)
  })

  it('centres each lane name in metres', () => {
    expect(LANES.laneL).toBeCloseTo(KERB_X + LANE_M / 2, 12)
    expect(LANES.laneR).toBeCloseTo(KERB_X + (LANE_M * 3) / 2, 12)
    expect(LANES.sidewalkL).toBeLessThan(0)
    expect(LANES.sidewalkR).toBeGreaterThan(LANES.sidewalkL)
    // Both pedestrian lanes stay on the one sidewalk in frame.
    expect(LANES.sidewalkR).toBeLessThan(KERB_X)
  })

  it('paints the road past the right edge even at the horizon on a desktop', () => {
    expect(offsetX(ROAD_FAR_X, 1, 1280, 800)).toBeGreaterThan(1280)
  })
})

describe('depth clamping', () => {
  it('treats negative depth as the camera foot', () => {
    expect(scaleAt(-1)).toBe(1)
    expect(yAt(-1)).toBe(1)
    expect(fadeAt(-1)).toBe(1)
    expect(offsetX(1, -1, 360, 800)).toBe(offsetX(1, 0, 360, 800))
  })

  it('treats depth beyond 1 as the horizon', () => {
    expect(scaleAt(2)).toBe(scaleAt(1))
    expect(yAt(2)).toBe(yAt(1))
    expect(fadeAt(2)).toBe(0)
    expect(offsetX(1, 2, 360, 800)).toBe(offsetX(1, 1, 360, 800))
  })
})
