/**
 * Projection helpers for the 2.5D walk scene.
 *
 * `depth` is 0 at the camera's feet and 1 at the horizon. Position and size
 * functions return a fraction of the viewport, so callers multiply by 100 for
 * `%`. Depths outside 0..1 are clamped.
 */

/** Viewport height fraction where the horizon sits. */
export const HORIZON = 0.38

/** Perspective strength: larger values shrink distant objects faster. */
export const DEPTH_K = 9

/** Half-width of the road at the camera's feet. */
export const ROAD_HALF = 0.3

/** Width of the sidewalk on each side of the road at the camera's feet. */
export const WALK_W = 0.1

/** Horizontal offsets, in screen widths at depth 0, for the scene lanes. */
export const LANES = { sidewalkL: -0.4, laneL: -0.2, laneR: 0.2, sidewalkR: 0.4 }

/** Depth where objects start to disappear. */
const FADE_FAR = 0.92

/** Depth where objects are still fully visible. */
const FADE_NEAR = 0.62

/** Depth where objects enter the near fade on their way past the camera. */
const FADE_NEAR_START = 0.06

/** Depth where the near fade ends and the object is fully visible. */
const FADE_NEAR_END = 0.16

function clampDepth(depth: number): number {
  return Math.min(1, Math.max(0, depth))
}

/** Perspective scale at `depth`: 1 at the camera's feet, shrinking towards the horizon. */
export function scaleAt(depth: number): number {
  return 1 / (1 + DEPTH_K * clampDepth(depth))
}

/** Viewport height fraction of the ground at `depth`. */
export function yAt(depth: number): number {
  return HORIZON + (1 - HORIZON) * scaleAt(depth)
}

/** Viewport width fraction of a point `offset` screen-widths left/right of centre, at `depth`. */
export function xAt(offset: number, depth: number): number {
  return 0.5 + offset * scaleAt(depth)
}

/** Opacity at `depth`: 1 near the camera, 0 past 0.92, linear in between. */
export function fadeAt(depth: number): number {
  const d = clampDepth(depth)
  if (d <= FADE_NEAR) return 1
  if (d >= FADE_FAR) return 0
  return (FADE_FAR - d) / (FADE_FAR - FADE_NEAR)
}

/** Opacity at `depth` for objects about to pass the camera: 0 up to 0.06, 1 from 0.16 on. */
export function nearFadeAt(depth: number): number {
  const d = clampDepth(depth)
  if (d <= FADE_NEAR_START) return 0
  if (d >= FADE_NEAR_END) return 1
  return (d - FADE_NEAR_START) / (FADE_NEAR_END - FADE_NEAR_START)
}

/** Half-width of the road at `depth`. */
export function roadHalfAt(depth: number): number {
  return ROAD_HALF * scaleAt(depth)
}

/** Half-width of road plus sidewalk at `depth`. */
export function walkHalfAt(depth: number): number {
  return (ROAD_HALF + WALK_W) * scaleAt(depth)
}
