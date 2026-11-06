import type { CSSProperties } from 'react'
import { HORIZON, roadHalfAt, scaleAt, walkHalfAt, yAt } from './projection'
import '../walk.css'

/** Thickness of a white road edge line at the camera's feet, in viewBox percent. */
const EDGE_W = 0.9

/** Build a `points` attribute from [x, y] pairs in viewBox percent. */
function points(pairs: ReadonlyArray<readonly [number, number]>): string {
  return pairs.map(([x, y]) => `${x},${y}`).join(' ')
}

/**
 * One side of a band that follows the projection between `innerAt` and
 * `outerAt`: full width at the camera's feet, pinched at depth 1.
 */
function band(
  innerAt: (depth: number) => number,
  outerAt: (depth: number) => number,
  side: 1 | -1,
): string {
  return points([
    [50 + side * outerAt(0) * 100, 100],
    [50 + side * innerAt(0) * 100, 100],
    [50 + side * innerAt(1) * 100, yAt(1) * 100],
    [50 + side * outerAt(1) * 100, yAt(1) * 100],
  ])
}

/**
 * The static world layer: sky, far hills, horizon haze, verge, sidewalks,
 * road and its edge lines. Decorative only — no interaction, no animation.
 *
 * Every ground edge is derived from `./projection`, the same module later
 * tasks use to place objects, so an object at any depth lands exactly on
 * the road or sidewalk it stands on. Because `yAt` is linear in
 * `scaleAt`, a road edge is a straight line in this view, so a polygon
 * through the depth-0 and depth-1 points is exactly the projection.
 */
export default function GroundScene() {
  const horizon = HORIZON * 100
  const farY = yAt(1) * 100
  const road0 = roadHalfAt(0) * 100
  const road1 = roadHalfAt(1) * 100
  // The painted line thins with distance for the same reason the road does.
  const edgeNear = EDGE_W * scaleAt(0)
  const edgeFar = EDGE_W * scaleAt(1)

  const roadPoints = points([
    [50 - road0, 100],
    [50 + road0, 100],
    [50 + road1, farY],
    [50 - road1, farY],
  ])

  const edgeLeft = points([
    [50 - road0, 100],
    [50 - road0 + edgeNear, 100],
    [50 - road1 + edgeFar, farY],
    [50 - road1, farY],
  ])

  const edgeRight = points([
    [50 + road0 - edgeNear, 100],
    [50 + road0, 100],
    [50 + road1, farY],
    [50 + road1 - edgeFar, farY],
  ])

  // Hills are silhouettes whose feet hide under the verge; only the part
  // above the horizon shows.
  const hillFoot = horizon + 12
  const hillA = `M 0 ${hillFoot} L 0 ${horizon - 1} Q 12 ${horizon - 11} 26 ${horizon - 2} Q 35 ${horizon + 3} 44 ${hillFoot} Z`
  const hillB = `M 22 ${hillFoot} L 22 ${horizon - 0.5} Q 38 ${horizon - 16} 54 ${horizon - 3} Q 64 ${horizon + 4} 74 ${hillFoot} Z`
  const hillC = `M 60 ${hillFoot} L 60 ${horizon - 1} Q 74 ${horizon - 10} 88 ${horizon - 5} Q 96 ${horizon + 2} 100 ${hillFoot} Z`

  const style = { '--wk-horizon': `${horizon}%` } as CSSProperties

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

      <svg className="wk-walk-left" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={band(roadHalfAt, walkHalfAt, -1)} />
      </svg>

      <svg className="wk-walk-right" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={band(roadHalfAt, walkHalfAt, 1)} />
      </svg>

      <svg className="wk-road" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={roadPoints} />
      </svg>

      <svg className="wk-edge-l" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={edgeLeft} />
      </svg>

      <svg className="wk-edge-r" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={edgeRight} />
      </svg>
    </div>
  )
}
