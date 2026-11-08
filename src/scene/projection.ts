/**
 * Projection helpers for the 2.5D walk scene.
 *
 * `depth` is 0 at the camera's feet and 1 at the horizon. The camera walks on
 * the **left sidewalk**, so lateral positions are metres measured from the
 * camera's own line: negative is further left (the verge, houses), positive is
 * towards the road, and the kerb sits at `KERB_X`.
 *
 * One projector for every object: a metre at depth `d` is `pxPerM(vh) *
 * depthScale(d)` pixels on screen, both horizontally and vertically. That is a
 * plain pinhole camera whose focal plane is the hero's depth (`CAMERA_DEPTH`),
 * which is why `pxAt(METERS.child, CAMERA_DEPTH)` is exactly the hero's
 * on-screen height at every viewport.
 */

import { METERS } from './meters'

/** Viewport height fraction where the horizon sits. */
export const HORIZON = 0.38

/** Perspective strength: larger values shrink distant objects faster. */
export const DEPTH_K = 9

/**
 * Depth the camera focuses on: the hero walks here. `pxPerM` is defined at
 * this plane, so a metre at `CAMERA_DEPTH` is `pxPerM(vh)` pixels.
 */
export const CAMERA_DEPTH = 0.12

/**
 * The one sidewalk in frame, in metres from the camera's own line.
 *
 * The camera hovers just behind the kerb (0,3 m), not over the sidewalk's
 * centre, so the road — the thing the scene is about — starts near the frame's
 * centre instead of at its right edge. The child walks 0,80 m in from the
 * garden edge, 1,20 m from the kerb; see `SIDEWALK_CENTRE`.
 */
export const SIDEWALK_LEFT = -1.7
export const SIDEWALK_M = METERS.sidewalk
export const KERB_X = SIDEWALK_LEFT + SIDEWALK_M
/**
 * Lateral line the hero walks, in metres from the camera's own line.
 *
 * 0,80 m in from the garden edge, not the pavement's geometric centre (−0,7):
 * the kerb-side band (−0,50 … +0,30) belongs to the bus stop, the lamp and the
 * sign, and the pavement is only 2,0 m wide. Her 140-wide art box is 0,727 m
 * wide, so her ink spans **−1,263 … −0,537 m** — 3,6 cm clear of the bus
 * stop's left edge and 31 cm clear of the garden bins'.
 *
 * 0,80 rather than 0,60 is a framing limit, not a taste: `pxPerM` comes from
 * the viewport's *height*, so on a tall phone one metre is huge across the
 * frame (148 px at 360×800 against 118 px at 360×640) and the visible
 * half-width at the camera plane is only ~1,2 m. At 0,60 (−1,10 m) her ink
 * started 18 px outside the left edge at 360×800 and 14 px at 390×844; at
 * 0,80 it starts 11 px and 17 px *inside*, at every phone. `scale.test.ts`
 * pins that.
 */
export const SIDEWALK_CENTRE = SIDEWALK_LEFT + 0.8

/** Road geometry, all in metres. The far side is never drawn. */
export const LANE_M = METERS.lane
export const ROAD_M = LANE_M * 2
export const LANE_SPLIT_X = KERB_X + LANE_M
/** The road is painted well past the frame edge so the opposite side never shows. */
export const ROAD_FAR_X = 200

/** Width of the painted kerb line, in metres. */
export const KERB_LINE_M = 0.12

/**
 * Lateral metres for each lane name the spawner uses. Sidewalks keep people
 * walking both ways on the one sidewalk in frame; the road's near lane carries
 * same-direction traffic (away) and the far lane oncoming traffic.
 *
 * `sidewalkL` and `sidewalkR` are deliberately *not* `SIDEWALK_CENTRE`: a
 * passer-by walking the child's own line would be drawn on top of her, and the
 * one thing the framing must never do is hide the hero behind a pedestrian.
 * They stand 0,2 m and 1,05 m to either side of her line instead, and are
 * painted at `propZ` ≤ 100, i.e. always behind her (z 200).
 */
export const LANES = {
  sidewalkL: SIDEWALK_LEFT + 0.4,
  sidewalkR: KERB_X - 0.35,
  laneL: KERB_X + LANE_M / 2,
  laneR: KERB_X + LANE_M * 1.5,
} as const

/**
 * Depth where objects start to disappear, and the last depth they are fully
 * visible at. Exported so the spawner's guard can assert that a new object is
 * born *invisible* (`PROP_SPAWN_D >= FADE_FAR`) instead of comparing a
 * constant with itself.
 */
export const FADE_FAR = 0.92
export const FADE_NEAR = 0.62

/** Depth where objects enter the near fade on their way past the camera. */
const FADE_NEAR_START = 0.06

/** Depth where the near fade ends and the object is fully visible. */
const FADE_NEAR_END = 0.16

/**
 * Depth the active sign waits at once the world stops. 0,22 puts the plate
 * clearly ahead of the child (who walks at 0,12) without ever covering her.
 *
 * It lives here, not in `WalkScene`, because `world.ts` needs it to compute
 * the sign's depth as it walks in from the horizon.
 */
export const SIGN_STOP_D = 0.22

function clampDepth(depth: number): number {
  return Math.min(1, Math.max(0, depth))
}

/** Perspective scale at `depth`: 1 at the camera's feet, shrinking towards the horizon. */
export function scaleAt(depth: number): number {
  return 1 / (1 + DEPTH_K * clampDepth(depth))
}

/** Screen scale of a metre at `depth`, relative to the camera's focal plane. */
export function depthScale(depth: number): number {
  return scaleAt(depth) / scaleAt(CAMERA_DEPTH)
}

/**
 * Pixels per metre at the camera's focal plane, for a viewport height.
 * `clamp(vh, 640, 1000) * 0.185` → 148 px/m at 800 px, so the 1,35 m child is
 * 200 px tall (a quarter of a phone screen).
 */
export function pxPerM(viewportH: number): number {
  return Math.min(1000, Math.max(640, viewportH)) * 0.185
}

/** Pixels per metre at an arbitrary depth. */
export function pxPerMAt(depth: number, viewportH: number): number {
  return pxPerM(viewportH) * depthScale(depth)
}

/** On-screen size in px of `m` metres at `depth`. */
export function pxAt(m: number, depth: number, viewportH: number): number {
  return m * pxPerMAt(depth, viewportH)
}

/** Screen x in px of lateral metre `m` at `depth`. */
export function offsetX(m: number, depth: number, viewportW: number, viewportH: number): number {
  return viewportW / 2 + m * pxPerMAt(depth, viewportH)
}

/**
 * Share of a projected box that is inside the frame, 0..1. `visibleFraction`
 * answers "how much of the frame does this cover"; this answers "how much of
 * the object can I see", which is what the framing tests mean by a visible
 * building, marking or vehicle.
 */
export function spriteShare(cx: number, width: number, viewportW: number): number {
  if (width <= 0) return 0
  const left = Math.max(0, cx - width / 2)
  const right = Math.min(viewportW, cx + width / 2)
  return Math.max(0, right - left) / width
}

/** Viewport height fraction of the ground at `depth`. */
export function yAt(depth: number): number {
  return HORIZON + (1 - HORIZON) * scaleAt(depth)
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
