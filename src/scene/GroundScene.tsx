import type { CSSProperties } from 'react'
import {
  HORIZON,
  KERB_LINE_M,
  KERB_X,
  ROAD_FAR_X,
  SIDEWALK_LEFT,
  offsetX,
  yAt,
} from './projection'
import '../walk.css'

/** Build a `points` attribute from [x, y] pairs, in viewport pixels. */
function points(pairs: ReadonlyArray<readonly [number, number]>): string {
  return pairs.map(([x, y]) => `${x},${y}`).join(' ')
}

/**
 * One longitudinal band of the street: `leftM` and `rightM` are lateral metres
 * (negative is the verge, +0.8 m is the kerb). Both edges are straight lines
 * on screen because `offsetX` is linear in `scaleAt` and `yAt` is too, so the
 * four depth-0 / depth-1 corners are the exact projection of the whole band.
 */
function band(
  leftM: number,
  rightM: number,
  width: number,
  height: number,
): string {
  const nearY = height
  const farY = yAt(1) * height

  return points([
    [offsetX(leftM, 0, width, height), nearY],
    [offsetX(rightM, 0, width, height), nearY],
    [offsetX(rightM, 1, width, height), farY],
    [offsetX(leftM, 1, width, height), farY],
  ])
}

type Props = {
  /** Viewport width in px, from the scene's single measure() call. */
  width: number
  /** Viewport height in px. */
  height: number
}

/**
 * The static world layer: sky, far hills, horizon haze, verge, the left
 * sidewalk, the kerb line and the road.
 *
 * Framing (Task 11): the camera walks the **left sidewalk**, so only that
 * sidewalk, the kerb and the road to its right are drawn. The road is painted
 * all the way to `ROAD_FAR_X` — far past the right edge — and is cropped by
 * the frame; the opposite side of the street is never shown. Every edge comes
 * from `./projection`, the same metre projector the objects use, so an object
 * at any depth lands exactly on the surface it stands on.
 *
 * Decorative only — no interaction, no animation. `width`/`height` come from
 * `WalkScene`, which measures the viewport once per resize.
 */
export default function GroundScene({ width, height }: Props) {
  const horizon = HORIZON * 100

  const style = { '--wk-horizon': `${horizon}%` } as CSSProperties

  // Hills are silhouettes whose feet hide under the verge; only the part
  // above the horizon shows. Their 0..100 viewBox is independent of the px
  // bands below.
  const hillFoot = horizon + 12
  const hillA = `M 0 ${hillFoot} L 0 ${horizon - 1} Q 12 ${horizon - 11} 26 ${horizon - 2} Q 35 ${horizon + 3} 44 ${hillFoot} Z`
  const hillB = `M 22 ${hillFoot} L 22 ${horizon - 0.5} Q 38 ${horizon - 16} 54 ${horizon - 3} Q 64 ${horizon + 4} 74 ${hillFoot} Z`
  const hillC = `M 60 ${hillFoot} L 60 ${horizon - 1} Q 74 ${horizon - 10} 88 ${horizon - 5} Q 96 ${horizon + 2} 100 ${hillFoot} Z`

  return (
    <div className="wk-ground" aria-hidden="true" style={style}>
      <div className="wk-sky" />

      <svg className="wk-hills" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="wk-hill wk-hill--a" d={hillA} />
        <path className="wk-hill wk-hill--b" d={hillB} />
        <path className="wk-hill wk-hill--c" d={hillC} />
      </svg>

      <div className="wk-haze" />
      <div className="wk-verge" />

      {/* The one sidewalk in frame, from the verge to the kerb. */}
      <svg
        className="wk-walk-left"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <polygon points={band(SIDEWALK_LEFT, KERB_X, width, height)} />
      </svg>

      {/* Road: from the kerb, past the right frame edge, never symmetric. */}
      <svg className="wk-road" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polygon points={band(KERB_X, ROAD_FAR_X, width, height)} />
      </svg>

      {/* Painted kerb line, on the road side of the kerb. Painted *after* the
          road: both bands share the KERB_X edge, so the line would otherwise
          be hidden under the road fill. */}
      <svg className="wk-kerb" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polygon points={band(KERB_X, KERB_X + KERB_LINE_M, width, height)} />
      </svg>
    </div>
  )
}
