import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import GroundScene from './scene/GroundScene'
import HeroWalk from './art/HeroWalk'
import {
  Bench,
  Bin,
  BusStop,
  Fence,
  House,
  PowerPole,
  Shop,
  StreetLamp,
  Tree,
} from './art/scenery'
import { Car, Motorcycle } from './art/vehicles'
import { Pedestrian } from './art/people'
import { SignArt } from './SignArt'
import { WALK_SIGNS, type Sign } from './data'
import { METERS } from './scene/meters'
import {
  CAMERA_DEPTH,
  KERB_X,
  LANES,
  LANE_SPLIT_X,
  SIDEWALK_CENTRE,
  depthScale,
  fadeAt,
  nearFadeAt,
  offsetX,
  pxAt,
  pxPerM,
  yAt,
} from './scene/projection'
import { createWorld, stepWorld, type Mode, type WorldState } from './scene/world'
import {
  LANE_DIR,
  SPAWN_SEED,
  createRng,
  spawnPed,
  spawnTraffic,
  shouldSpawn,
  type Ped,
  type Traffic,
} from './scene/spawner'
import './walk.css'

type Props = {
  step: number
  onOpen: (sign: Sign) => void
  /** Dunia berhenti di rambu; App memakainya untuk memunculkan beat stop. */
  onStop?: () => void
  /** Ketukan plat rambu — cadangan saat dunia sudah berhenti sejak awal. */
  onSignTap?: () => void
  /** Wadah scene, dipakai App sebagai fokus cadangan setelah lembar ditutup. */
  sceneRef?: RefObject<HTMLDivElement | null>
}

/** Depth of the hero. Fixed: the camera follows her, on her own lateral line. */
export const HERO_DEPTH = CAMERA_DEPTH
/**
 * Depth where the active sign waits once the world stops. 0.26 puts the plate
 * clearly ahead of the child (who walks at 0.12) without ever covering her.
 */
export const SIGN_STOP_D = 0.26
/**
 * Lateral position of the sign, in metres from the camera line: the kerb. The
 * ruling in the plan is "rambu di kerb" so the plate never overlaps the child
 * standing on the sidewalk centre 1,0 m to its left at that depth.
 */
export const SIGN_X = KERB_X

/** Number of dashed centre-line marks in the belt. */
export const DASH_COUNT = 8

/** Depth span of one loop of the background-object belt. */
export const PROP_CYCLE = 1

/** Longest jump the loop will advance the world by, so a stalled frame cannot skip a leg. */
const MAX_FRAME_SECONDS = 0.1

/** Hard caps for ambience: three vehicles and two pedestrians on screen. */
const VEHICLE_SLOTS = 3
const PED_SLOTS = 2

/** Random spawn waits in seconds, `[min, max]`. */
export const TRAFFIC_WAIT = { min: 1, max: 2.5 } as const
const PED_WAIT = { min: 2, max: 4 } as const

/**
 * Depth range objects live in. Oncoming traffic (and the left sidewalk)
 * enters at `SPAWN_DEPTH` = 1 and leaves past the camera; away-bound objects
 * enter just behind the camera and leave at the horizon, so both bounds of
 * the range are used and nothing pops in mid-screen.
 */
export const NEAR_EDGE = -0.05
export const FAR_EDGE = 1.05

/**
 * One kind of background art. `height` is in metres, from `scene/meters.ts`;
 * `ratio` is the art's own width / height, so a metre stays a metre and the
 * art keeps its drawn proportions. All nine kinds share this one table.
 */
export const PROP_ART = {
  house: { Art: House, height: METERS.house, ratio: 200 / 180 },
  shop: { Art: Shop, height: METERS.shop, ratio: 220 / 190 },
  tree: { Art: Tree, height: METERS.tree, ratio: 120 / 160 },
  lamp: { Art: StreetLamp, height: METERS.lamp, ratio: 60 / 200 },
  fence: { Art: Fence, height: METERS.fence, ratio: 180 / 70 },
  bin: { Art: Bin, height: METERS.bin, ratio: 60 / 90 },
  bench: { Art: Bench, height: METERS.bench, ratio: 120 / 70 },
  busstop: { Art: BusStop, height: METERS.busStop, ratio: 160 / 150 },
  powerpole: { Art: PowerPole, height: METERS.powerPole, ratio: 50 / 230 },
} as const

export type PropKind = keyof typeof PROP_ART

type PropSpec = {
  /** Art key into `PROP_ART`. */
  art: PropKind
  /** Lateral position in metres from the camera line; negative is the left verge. */
  x: number
  /** Depth at scroll 0, in [0, 1). */
  base: number
}

export type { PropSpec }

/**
 * The belt, ordered from near to far. Ten placements cover the nine art
 * kinds, with `bin` used twice.
 *
 * Placement is a static table — never random — so two playthroughs of the
 * same leg show the same street. Objects are recycled by wrapping `base`
 * around `PROP_CYCLE`; both ends of the wrap land at opacity 0 (`nearFadeAt`
 * as a piece passes the camera, `fadeAt` as it reaches the horizon), so no
 * object pops in mid-screen or out of the sky.
 *
 * The camera walks the left sidewalk, so every placement is a lateral metre
 * from that line (verge < −1,7 m; sidewalk −1,7 … +0,3 m). Houses, shop, tree,
 * fence and power pole stand back on the garden side (anchor x < −1,7 m);
 * bus stop, lamp, bench and bins stand on the sidewalk itself.
 *
 * The two big buildings used to sit at −7,8 m and −6,0 m. On a 360 px phone
 * that showed 1–13 % of their sprite (3–40 px) through the haze, i.e. the
 * garden side of the street did not exist. They now stand at −4,0 m and
 * −3,8 m: still behind the pavement (their anchors are on the verge), but
 * close enough that the house's visible box covers 34–45 % of the phone
 * frame through the seven phases the near/horizon fades paint it, and the
 * shop still shows 10–58 % of its sprite on five — instead of a 3 px sliver.
 * Moving the house any further right pushes its unguarded box past half the
 * frame, so −4,0 m is the right edge of the safe band; `scale.test.ts` pins
 * both ends.
 *
 * On a 360 px phone the 6,5 m house is wider than the frame even at the
 * horizon. It is kept far enough to the left that the frame crops it instead
 * of it wiping the screen; a placement decision, never a rescaled object.
 * `scale.test.ts` locks the result: no prop may cover more than half the
 * viewport at any scroll phase, on any of the three test viewports, and both
 * buildings must still show at least 8 % of their sprite at five of the nine
 * phases.
 */
export const LAYOUT: ReadonlyArray<PropSpec> = [
  { art: 'tree', x: -2.8, base: 0.08 },
  { art: 'bin', x: -0.9, base: 0.17 },
  { art: 'shop', x: -3.8, base: 0.26 },
  { art: 'fence', x: -3.5, base: 0.35 },
  { art: 'busstop', x: -0.7, base: 0.52 },
  { art: 'lamp', x: 0.15, base: 0.61 },
  { art: 'house', x: -4.0, base: 0.7 },
  { art: 'powerpole', x: -2.9, base: 0.79 },
  { art: 'bench', x: -0.6, base: 0.88 },
  { art: 'bin', x: 0.0, base: 0.97 },
]

export type Box = { w: number; h: number }

/**
 * Displayed size of the hero, in px. Metres from the table, never a clamp:
 * 1,35 m is exactly 200 px at a 800 px viewport (a quarter of the screen).
 */
export function heroBox(viewportH: number): Box {
  const h = pxAt(METERS.child, CAMERA_DEPTH, viewportH)
  return { w: h * (140 / 260), h }
}

/**
 * Nominal size of a background object. The art keeps its own width/height
 * ratio, so a 3,5 m tree is 3,5 m tall on every viewport.
 */
export function propBox(kind: PropKind, viewportH: number): Box {
  const { height, ratio } = PROP_ART[kind]
  const h = pxAt(height, CAMERA_DEPTH, viewportH)
  return { w: h * ratio, h }
}

/** Nominal size of one road dash, in metres. */
export function dashBox(viewportH: number): Box {
  return {
    w: pxAt(METERS.mark.width, CAMERA_DEPTH, viewportH),
    h: pxAt(METERS.mark.thickness, CAMERA_DEPTH, viewportH),
  }
}

/**
 * Size of a vehicle. The art's viewBox fixes its own drawn aspect (a car is
 * drawn 160 × 90 because the camera looks down a little), so the metre width
 * is the anchor and the height follows the art: stretching it to the real
 * 1,45 m would squash the wheels into ellipses.
 */
export function vehicleBox(kind: 'car' | 'bike', viewportH: number): Box {
  const metres = kind === 'car' ? METERS.car : METERS.motorcycle
  const w = pxAt(metres.width, CAMERA_DEPTH, viewportH)
  return { w, h: w * (kind === 'car' ? 90 / 160 : 80 / 90) }
}

/** Size of a pedestrian from their metre height, through the art's 90 × 200 box. */
export function pedBox(kind: 'adult' | 'child', viewportH: number): Box {
  const h = pxAt(kind === 'adult' ? METERS.adult : METERS.pedestrianChild, CAMERA_DEPTH, viewportH)
  return { w: h * (90 / 200), h }
}

/** Diameter of the sign plate at its stop depth, in px. */
export function signPlatePx(viewportH: number): number {
  return pxAt(METERS.sign.plate, SIGN_STOP_D, viewportH)
}

/** Pole box at the sign's stop depth, in px. */
export function signPolePx(viewportH: number): Box {
  return {
    w: pxAt(METERS.sign.poleWidth, SIGN_STOP_D, viewportH),
    h: pxAt(METERS.sign.pole, SIGN_STOP_D, viewportH),
  }
}

/** Depth of a belt placement at `scroll`, wrapped into `[0, PROP_CYCLE)`. */
export function propDepth(base: number, scroll: number): number {
  return wrap(base - scroll, PROP_CYCLE)
}

/**
 * Visible fraction of a projected box inside the viewport: a piece cropped by
 * either frame edge covers only the part still on screen. This is what
 * "covers the screen" means; the box's invisible overhang does not count.
 */
export function visibleFraction(cx: number, width: number, viewportW: number): number {
  const left = Math.max(0, cx - width / 2)
  const right = Math.min(viewportW, cx + width / 2)
  return Math.max(0, right - left) / viewportW
}

/**
 * Opacity of one belt piece. On top of the depth fades, a piece is faded out
 * before its visible width reaches half the viewport: on a 360 px phone the
 * 1,9 m bus stop is 100 % of the frame at arm's length, so perspective alone
 * would wipe the screen. Cropping the *metres* is not an option, and moving
 * its depth cannot save every phase of a moving belt, so the renderer fades
 * the piece while it is wide. The rule is the acceptance rule from the plan:
 * nothing visible ever covers more than half the width.
 */
export function beltOpacity(depth: number, coverage: number): number {
  let guard = 1
  if (coverage >= 0.5) guard = 0
  else if (coverage > 0.4) guard = (0.5 - coverage) / 0.1
  return fadeAt(depth) * nearFadeAt(depth) * guard
}

/** Positive modulo, so scroll and base depths always land in `[0, span)`. */
function wrap(value: number, span: number): number {
  return ((value % span) + span) % span
}

/** Round to the nearest half pixel. */
function roundHalf(value: number): number {
  return Math.round(value * 2) / 2
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A world that is already stopped, used when motion is reduced. */
function stoppedWorld(step: number): WorldState {
  return { ...createWorld(step), mode: 'stopped' }
}

function setTransform(el: HTMLElement, tx: number, ty: number, scale: number): void {
  const transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`
  if (el.style.transform !== transform) el.style.transform = transform
}

function setOpacity(el: HTMLElement, opacity: number): void {
  const value = opacity.toFixed(3)
  if (el.style.opacity !== value) el.style.opacity = value
}

function setZ(el: HTMLElement, z: number): void {
  const value = String(z)
  if (el.style.zIndex !== value) el.style.zIndex = value
}

/** Nominal box of an art piece, in px, from the metres table. */
function setBox(el: HTMLElement | SVGElement, box: Box): void {
  const w = `${box.w}px`
  const h = `${box.h}px`
  if (el.style.width !== w) el.style.width = w
  if (el.style.height !== h) el.style.height = h
}

/** Show or hide a traffic slot. `display` is never owned by React's style prop. */
function setDisplay(el: HTMLElement, visible: boolean): void {
  const value = visible ? 'block' : 'none'
  if (el.style.display !== value) el.style.display = value
}

/** Depth scale rounded to three decimals, to cut redundant style writes. */
function roundScale(depth: number): number {
  return Math.round(depthScale(depth) * 1000) / 1000
}

/**
 * Stacking index for the scenery belt and NPCs: the same depth formula for
 * both, so near pieces overlap far ones. The sign sits at 160 and the hero at
 * 200 (walk.css), above every prop and every passer-by.
 */
export function propZ(depth: number): number {
  const d = Math.min(1, Math.max(0, depth))
  return 20 + Math.round((1 - d) * 80)
}

/** One projected object, exactly as the draw loop paints it. */
export type Placement = {
  depth: number
  /** Frame scale the loop applies (three decimals, like the DOM writes). */
  scale: number
  /** On-screen box, in px, after `scale`. */
  width: number
  height: number
  /** Screen x of the anchor: the box's horizontal centre. */
  x: number
  /** Screen y of the anchor: the box's bottom edge, on the ground. */
  y: number
  /** Share of the frame the box covers, before any opacity guard. */
  coverage: number
  /** What the scene paints: depth fades × width guard (props) or depth fades only. */
  opacity: number
  z: number
}

/** Depth of dash `index` at `scroll`; the one formula the loop draws with. */
export function dashDepth(index: number, scroll: number): number {
  return wrap((index + 0.5) / DASH_COUNT - scroll, PROP_CYCLE)
}

/**
 * A road dash as drawn: flat on the lane split, faded by depth only. No belt
 * guard here — a 0,45 m marking can never wipe the frame, and giving it the
 * guard would let a badly placed split hide itself.
 */
export function placeDash(
  index: number,
  scroll: number,
  viewportW: number,
  viewportH: number,
): Placement {
  const depth = dashDepth(index, scroll)
  const box = dashBox(viewportH)
  const scale = roundScale(depth)
  const width = box.w * scale
  const x = offsetX(LANE_SPLIT_X, depth, viewportW, viewportH)
  return {
    depth,
    scale,
    width,
    height: box.h * scale,
    x,
    y: yAt(depth) * viewportH,
    coverage: visibleFraction(x, width, viewportW),
    opacity: fadeAt(depth) * 0.9,
    z: 1,
  }
}

/** One belt piece as drawn: metres, depth scale, frame crop and belt guard. */
export function placeProp(
  spec: PropSpec,
  depth: number,
  viewportW: number,
  viewportH: number,
): Placement {
  const box = propBox(spec.art, viewportH)
  const scale = roundScale(depth)
  const width = box.w * scale
  const x = offsetX(spec.x, depth, viewportW, viewportH)
  const coverage = visibleFraction(x, width, viewportW)
  return {
    depth,
    scale,
    width,
    height: box.h * scale,
    x,
    y: yAt(depth) * viewportH,
    coverage,
    opacity: beltOpacity(depth, coverage),
    z: propZ(depth),
  }
}

/** One ambience vehicle as drawn: lane metre, depth scale, depth fades. */
export function placeVehicle(
  lane: 'laneL' | 'laneR',
  kind: 'car' | 'bike',
  depth: number,
  viewportW: number,
  viewportH: number,
): Placement {
  const box = vehicleBox(kind, viewportH)
  const scale = roundScale(depth)
  const width = box.w * scale
  const x = offsetX(LANES[lane], depth, viewportW, viewportH)
  return {
    depth,
    scale,
    width,
    height: box.h * scale,
    x,
    y: yAt(depth) * viewportH,
    coverage: visibleFraction(x, width, viewportW),
    opacity: fadeAt(depth) * nearFadeAt(depth),
    z: propZ(depth),
  }
}

/** A random wait in `[min, max)`, used to schedule the next spawn. */
function randomWait(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

/**
 * The 2.5D walk: a static ground layer, a belt of road dashes and scenery
 * that scrolls towards the camera, the hero walking away from us, and one
 * sign that can be tapped when she stops.
 *
 * One `requestAnimationFrame` loop owns the motion. It feeds `stepWorld`
 * and writes the resulting transforms straight to refs, so React never
 * re-renders per frame. Viewport size is measured only on mount/resize.
 */
export default function WalkScene({ step, onOpen, onStop, onSignTap, sceneRef }: Props) {
  const [reduced] = useState(prefersReducedMotion)
  const [mode, setMode] = useState<Mode>(() => (reduced ? 'stopped' : 'walking'))
  const [signStep, setSignStep] = useState(step)
  // Mode `stopped` karena reduced motion sejak awal bukan "dunia berhenti":
  // jangan sampai ia memicu onStop dan menimpa kalimat leg pertama.
  const wasStoppedRef = useRef(mode === 'stopped')
  // Only GroundScene needs the viewport in React: its polygons are drawn in
  // px from the metres table, and it re-renders on resize, not per frame.
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })

  const sceneElRef = useRef<HTMLDivElement | null>(null)
  const sceneEl = sceneRef ?? sceneElRef
  const signButtonRef = useRef<HTMLButtonElement | null>(null)
  const signPlateRef = useRef<HTMLSpanElement | null>(null)
  const signPoleRef = useRef<HTMLSpanElement | null>(null)
  const worldRef = useRef<WorldState>(reduced ? stoppedWorld(step) : createWorld(step))
  const dashRefs = useRef<Array<HTMLDivElement | null>>([])
  const propRefs = useRef<Array<HTMLDivElement | null>>([])
  const heroRef = useRef<HTMLDivElement | null>(null)
  const heroZoneRef = useRef<HTMLDivElement | null>(null)
  const sizeRef = useRef({ w: 0, h: 0, heroW: 0, heroH: 0, heroNomW: 0, heroNomH: 0 })

  // Ambience state lives in refs: the loop mutates it and writes the DOM
  // directly, so spawning never re-renders React.
  const trafficLayerRef = useRef<HTMLDivElement | null>(null)
  const vehicleRefs = useRef<Array<HTMLDivElement | null>>([])
  const pedRefs = useRef<Array<HTMLDivElement | null>>([])
  const vehiclesRef = useRef<Array<Traffic | null>>([null, null, null])
  const pedsRef = useRef<Array<Ped | null>>([null, null])
  const trafficRngRef = useRef(createRng(SPAWN_SEED))
  const pedRngRef = useRef(createRng(SPAWN_SEED + 1))
  const nextVehicleIdRef = useRef(1)
  const nextPedIdRef = useRef(1)
  const waitsRef = useRef({ trafficSince: 0, trafficWait: 0, pedSince: 0, pedWait: 0 })

  const measure = useCallback(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    const hero = heroBox(h)
    const heroScale = depthScale(HERO_DEPTH)

    sizeRef.current = {
      w,
      h,
      heroW: hero.w,
      heroH: hero.h,
      heroNomW: hero.w / heroScale,
      heroNomH: hero.h / heroScale,
    }

    setViewport((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))

    const heroEl = heroRef.current
    if (heroEl) {
      heroEl.style.width = `${sizeRef.current.heroNomW}px`
      heroEl.style.height = `${sizeRef.current.heroNomH}px`
    }

    heroZoneRef.current?.style.setProperty('--wk-hero-h', `${hero.h}px`)

    // One CSS variable carries the whole metre scale to walk.css, where the
    // ambience and sign fallbacks live. `--wk-sign-scale` is the perspective
    // factor at the sign's stop depth, so the plate stays 0,60 m there.
    sceneEl.current?.style.setProperty('--wk-px-per-m', `${pxPerM(h)}px`)
    sceneEl.current?.style.setProperty('--wk-sign-scale', `${depthScale(SIGN_STOP_D)}`)

    // The sign stands still at its stop depth; its plate, pole and position
    // all come from the same metres as the rest of the street.
    const signEl = signButtonRef.current
    if (signEl) {
      signEl.style.left = `${roundHalf(offsetX(SIGN_X, SIGN_STOP_D, w, h))}px`
      signEl.style.top = `${roundHalf(yAt(SIGN_STOP_D) * h)}px`
    }
    const platePx = signPlatePx(h)
    const plateEl = signPlateRef.current
    if (plateEl) {
      plateEl.style.width = `${platePx}px`
      plateEl.style.height = `${platePx}px`
    }
    const pole = signPolePx(h)
    const poleEl = signPoleRef.current
    if (poleEl) {
      poleEl.style.width = `${pole.w}px`
      poleEl.style.height = `${pole.h}px`
    }

    const dash = dashBox(h)
    for (const el of dashRefs.current) {
      if (!el) continue
      el.style.width = `${dash.w}px`
      el.style.height = `${dash.h}px`
    }

    propRefs.current.forEach((el, i) => {
      if (!el) return
      const box = propBox(LAYOUT[i].art, h)
      el.style.width = `${box.w}px`
      el.style.height = `${box.h}px`
    })

    // Ambience art is sized from the same METERS table, once per measure; only
    // the slot transform changes per frame. (walk.css carries the same sizes
    // as a no-JS fallback through --wk-px-per-m.)
    const layer = trafficLayerRef.current
    if (layer) {
      const cars = vehicleBox('car', h)
      const bikes = vehicleBox('bike', h)
      const adults = pedBox('adult', h)
      const children = pedBox('child', h)
      for (const el of layer.querySelectorAll<SVGElement>('.wk-veh--car')) setBox(el, cars)
      for (const el of layer.querySelectorAll<SVGElement>('.wk-veh--bike')) setBox(el, bikes)
      for (const el of layer.querySelectorAll<SVGElement>('.wk-ped--adult')) setBox(el, adults)
      for (const el of layer.querySelectorAll<SVGElement>('.wk-ped--child')) setBox(el, children)
    }
  }, [])

  const draw = useCallback((world: WorldState) => {
    const { w, h, heroW, heroH } = sizeRef.current
    if (!w || !h) return

    // Road dashes: a flat marking on the lane split, in metres like the rest.
    for (let i = 0; i < DASH_COUNT; i += 1) {
      const el = dashRefs.current[i]
      if (!el) continue
      const dash = placeDash(i, world.scroll, w, h)
      setTransform(
        el,
        roundHalf(dash.x - dash.width / 2),
        roundHalf(dash.y - dash.height / 2),
        dash.scale,
      )
      setOpacity(el, dash.opacity)
      setZ(el, dash.z)
    }

    // Scenery: bottom-centred on its point on the verge/sidewalk.
    propRefs.current.forEach((el, i) => {
      if (!el) return
      const prop = placeProp(LAYOUT[i], propDepth(LAYOUT[i].base, world.scroll), w, h)
      setTransform(
        el,
        roundHalf(prop.x - prop.width / 2),
        roundHalf(prop.y - prop.height),
        prop.scale,
      )
      setOpacity(el, prop.opacity)
      setZ(el, prop.z)
    })

    // The hero never moves; only the world does. Anchored by her feet.
    const heroScale = roundScale(HERO_DEPTH)
    if (heroRef.current) {
      setTransform(heroRef.current, roundHalf(-heroW / 2), roundHalf(-heroH), heroScale)
    }

    // Ambience. A slot is a zero-sized anchor on its lane; the art hangs
    // above it, so the loop only needs the ground point and the scale.
    vehiclesRef.current.forEach((vehicle, i) => {
      const el = vehicleRefs.current[i]
      if (!el) return
      if (!vehicle) {
        setDisplay(el, false)
        return
      }
      const placed = placeVehicle(vehicle.lane, vehicle.kind, vehicle.depth, w, h)
      setTransform(el, roundHalf(placed.x), roundHalf(placed.y), placed.scale)
      setOpacity(el, placed.opacity)
      setZ(el, placed.z)
    })

    pedsRef.current.forEach((ped, i) => {
      const el = pedRefs.current[i]
      if (!el) return
      if (!ped) {
        setDisplay(el, false)
        return
      }
      const x = offsetX(LANES[ped.lane], ped.depth, w, h)
      const y = yAt(ped.depth) * h
      setTransform(el, roundHalf(x), roundHalf(y), roundScale(ped.depth))
      setOpacity(el, fadeAt(ped.depth) * nearFadeAt(ped.depth))
      setZ(el, propZ(ped.depth))
    })
  }, [])

  /** Birth a vehicle at the entry edge for its direction. */
  const spawnVehicle = useCallback(() => {
    const slot = vehiclesRef.current.indexOf(null)
    if (slot < 0) return

    const traffic = spawnTraffic(trafficRngRef.current, nextVehicleIdRef.current)
    nextVehicleIdRef.current += 1

    // The spawner always names the horizon. Away-bound traffic enters from
    // the near edge instead: the camera is walking, so it overtakes us.
    vehiclesRef.current[slot] =
      traffic.dir === 1 ? { ...traffic, depth: NEAR_EDGE } : traffic

    const el = vehicleRefs.current[slot]
    if (!el) return
    el.dataset.kind = traffic.kind
    el.dataset.lane = traffic.lane
    // Oncoming traffic (`dir -1`) shows its front to the camera.
    el.dataset.face = traffic.dir === -1 ? 'front' : 'rear'
    setDisplay(el, true)
  }, [])

  /** Birth a pedestrian at the entry edge for their sidewalk. */
  const spawnPedestrian = useCallback(() => {
    const slot = pedsRef.current.indexOf(null)
    if (slot < 0) return

    const ped = spawnPed(pedRngRef.current, nextPedIdRef.current)
    nextPedIdRef.current += 1

    pedsRef.current[slot] = LANE_DIR[ped.lane] === 1 ? { ...ped, depth: NEAR_EDGE } : ped

    const el = pedRefs.current[slot]
    if (!el) return
    el.dataset.kind = ped.kind
    el.dataset.lane = ped.lane
    // A walker approaching the camera (`dir -1`) faces us.
    el.dataset.face = LANE_DIR[ped.lane] === -1 ? 'front' : 'rear'
    setDisplay(el, true)
  }, [])

  /**
   * Move ambience and spawn replacements. Called once per frame by the same
   * loop that scrolls the world; mutates the slot refs and never touches
   * React state. Spawn waits are drawn from the seeded RNG, so the cast of a
   * demo is reproducible.
   */
  const stepAmbience = useCallback(
    (dt: number) => {
      const waits = waitsRef.current

      vehiclesRef.current.forEach((vehicle, i) => {
        if (!vehicle) return
        vehicle.depth += vehicle.dir * vehicle.speed * dt
        if (vehicle.depth < NEAR_EDGE || vehicle.depth > FAR_EDGE) {
          vehiclesRef.current[i] = null
        }
      })

      pedsRef.current.forEach((ped, i) => {
        if (!ped) return
        ped.depth += LANE_DIR[ped.lane] * ped.speed * dt
        if (ped.depth < NEAR_EDGE || ped.depth > FAR_EDGE) {
          pedsRef.current[i] = null
        }
      })

      if (waits.trafficWait <= 0) {
        waits.trafficWait = randomWait(trafficRngRef.current, TRAFFIC_WAIT.min, TRAFFIC_WAIT.max)
      }
      if (shouldSpawn(dt, waits.trafficSince, TRAFFIC_WAIT.min, waits.trafficWait)) {
        spawnVehicle()
        waits.trafficSince = 0
        waits.trafficWait = randomWait(trafficRngRef.current, TRAFFIC_WAIT.min, TRAFFIC_WAIT.max)
      } else {
        waits.trafficSince += dt
      }

      if (waits.pedWait <= 0) {
        waits.pedWait = randomWait(pedRngRef.current, PED_WAIT.min, PED_WAIT.max)
      }
      if (shouldSpawn(dt, waits.pedSince, PED_WAIT.min, waits.pedWait)) {
        spawnPedestrian()
        waits.pedSince = 0
        waits.pedWait = randomWait(pedRngRef.current, PED_WAIT.min, PED_WAIT.max)
      } else {
        waits.pedSince += dt
      }
    },
    [spawnVehicle, spawnPedestrian],
  )

  // Measure once before first paint, then again on resize (never in the loop).
  useLayoutEffect(() => {
    measure()
    draw(worldRef.current)

    const onResize = () => {
      measure()
      draw(worldRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure, draw])

  // Each leg starts a fresh walk; reduced motion jumps straight to "stopped".
  useLayoutEffect(() => {
    const next = reduced ? stoppedWorld(step) : createWorld(step)
    worldRef.current = next
    if (reduced) setSignStep(step)
    setMode(next.mode)
    if (sizeRef.current.w === 0) measure()
    draw(next)
  }, [step, reduced, measure, draw])

  // Setelah lembar ditutup, fokus berada di wadah scene karena rambu tujuan
  // masih berjalan dan belum bisa difokuskan. Begitu dunia berhenti, pindahkan
  // fokus ke rambu yang baru aktif — tetapi jangan rebut fokus kalau anak sudah
  // memindahkannya sendiri.
  useEffect(() => {
    if (mode !== 'stopped') return
    if (document.activeElement === sceneEl.current) signButtonRef.current?.focus()
  }, [mode, signStep, sceneEl])

  // Dunia berhenti setelah satu leg penuh. Itu satu-satunya sinyal yang
  // dibutuhkan App untuk menampilkan beat stop; mode `stopped` yang sudah ada
  // sejak mount (reduced motion) tidak dihitung sebagai transisi.
  useEffect(() => {
    const stopped = mode === 'stopped'
    if (stopped && !wasStoppedRef.current) onStop?.()
    wasStoppedRef.current = stopped
  }, [mode, onStop])

  // The one animation loop. It keeps running while the world is stopped so
  // the street stays alive at a sign; only reduced motion (no spawn at all)
  // or a hidden tab stops it. `stepWorld` freezes scroll while stopped, so
  // the belt and the hero stay put while `stepAmbience` keeps moving.
  useEffect(() => {
    if (reduced) return

    let raf = 0
    let active = false
    let last = 0

    const frame = (now: number) => {
      if (!active) return
      const dt = last === 0 ? 0 : Math.min(MAX_FRAME_SECONDS, (now - last) / 1000)
      last = now

      const prev = worldRef.current
      const next = stepWorld(prev, dt)
      worldRef.current = next

      // Ambience never pauses: vehicles and pedestrians keep passing even
      // while the hero waits at a sign.
      stepAmbience(dt)
      draw(next)

      // Report the stop once; the loop itself keeps running. No per-frame
      // setState.
      if (next.mode !== 'walking' && prev.mode === 'walking') {
        setSignStep(next.step)
        setMode('stopped')
      }
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (active) return
      active = true
      last = 0
      raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      active = false
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = 0
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduced, draw, stepAmbience])

  const sign = WALK_SIGNS[signStep]
  // The child walks the sidewalk's centre line, not the camera's line, so she
  // is a few pixels left of screen centre at every viewport. Her depth is the
  // focal plane, so `offsetX` here is also what pxAt() sizes her with. The
  // sign's own anchors are set in `measure()` because they need the same
  // viewport width and a pixel offset at its stop depth.
  const heroStyle = {
    left: `${offsetX(SIDEWALK_CENTRE, HERO_DEPTH, viewport.w, viewport.h)}px`,
    top: `${yAt(HERO_DEPTH) * 100}%`,
  } as CSSProperties

  return (
    <div className="wk-scene" ref={sceneEl} tabIndex={-1}>
      <GroundScene width={viewport.w} height={viewport.h} />

      <div className="wk-dashes" aria-hidden="true">
        {Array.from({ length: DASH_COUNT }, (_, i) => (
          <div
            key={i}
            className="wk-dash"
            ref={(el) => {
              dashRefs.current[i] = el
            }}
          />
        ))}
      </div>

      <div className="wk-props" aria-hidden="true">
        {LAYOUT.map((spec, i) => {
          const Art = PROP_ART[spec.art].Art
          return (
            <div
              key={`${spec.art}-${i}`}
              className={`wk-prop wk-prop--${spec.art}`}
              ref={(el) => {
                propRefs.current[i] = el
              }}
            >
              <Art />
            </div>
          )
        })}
      </div>

      {/*
        Ambience lives in its own layer, above the road and below the sign
        (z-index 160). Slots start hidden; the loop picks the artwork by
        setting `data-kind` and positions the anchor. Per-slot z follows the
        same depth formula as the scenery belt. The whole layer is
        pointer-events: none, so it can never eat the sign's tap.
      */}
      <div className="wk-traffic" aria-hidden="true" ref={trafficLayerRef}>
        {Array.from({ length: VEHICLE_SLOTS }, (_, i) => (
          <div
            key={`vehicle-${i}`}
            className="wk-traffic-item wk-veh-slot"
            ref={(el) => {
              vehicleRefs.current[i] = el
            }}
          >
            <Car face="rear" />
            <Car face="front" />
            <Motorcycle face="rear" />
            <Motorcycle face="front" />
          </div>
        ))}
        {Array.from({ length: PED_SLOTS }, (_, i) => (
          <div
            key={`ped-${i}`}
            className="wk-traffic-item wk-ped-slot"
            ref={(el) => {
              pedRefs.current[i] = el
            }}
          >
            <Pedestrian kind="adult" face="rear" />
            <Pedestrian kind="adult" face="front" />
            <Pedestrian kind="child" face="rear" />
            <Pedestrian kind="child" face="front" />
          </div>
        ))}
      </div>

      <button
        type="button"
        className={mode === 'stopped' ? 'wk-sign wk-sign--in' : 'wk-sign'}
        ref={signButtonRef}
        onClick={() => {
          // Cadangan untuk mode yang sudah berhenti sejak awal (reduced
          // motion): App tetap mendapat beat stop sebelum lembarnya terbuka.
          onSignTap?.()
          onOpen(sign)
        }}
        disabled={mode !== 'stopped'}
        aria-hidden={mode !== 'stopped'}
        aria-label={`Rambu ${sign.name}, tekan untuk melihat artinya`}
      >
        <span className="wk-sign-plate" ref={signPlateRef}>
          <SignArt art={sign.art} size={96} />
        </span>
        <span className="wk-sign-pole" ref={signPoleRef} />
      </button>

      <div className="wk-hero-zone" style={heroStyle} ref={heroZoneRef}>
        <div className="wk-hero" ref={heroRef}>
          <HeroWalk pose={mode === 'walking' ? 'walk' : 'idle'} />
        </div>
      </div>

      <div className="wk-hud">
        <span>Jalan ke jalan raya</span>
        <span className="wk-pips" aria-hidden="true">
          {WALK_SIGNS.map((s, i) => (
            <i key={s.id} className={i <= step ? 'on' : undefined} />
          ))}
        </span>
      </div>
    </div>
  )
}
