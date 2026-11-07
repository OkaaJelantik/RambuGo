import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import GroundScene from './scene/GroundScene'
import HeroWalk from './art/HeroWalk'
import { House, StreetLamp, Tree } from './art/scenery'
import { Car, Motorcycle } from './art/vehicles'
import { Pedestrian } from './art/people'
import { SignArt } from './SignArt'
import { WALK_SIGNS, type Sign } from './data'
import { LANES, fadeAt, nearFadeAt, scaleAt, xAt, yAt } from './scene/projection'
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
}

/** Depth of the hero. Fixed: the camera follows her. */
const HERO_DEPTH = 0.12
/** Depth where the active sign waits once the world stops. */
const SIGN_STOP_D = 0.18
/** Screen-width offsets (at depth 0) of the hero and the sign. */
const HERO_LANE = 0.35
const SIGN_LANE = -0.35

/** Number of dashed centre-line marks in the belt. */
const DASH_COUNT = 8

/** Depth span of one loop of the background-object belt. */
const PROP_CYCLE = 1

/** Longest jump the loop will advance the world by, so a stalled frame cannot skip a leg. */
const MAX_FRAME_SECONDS = 0.1

/** Hard caps for ambience: three vehicles and two pedestrians on screen. */
const VEHICLE_SLOTS = 3
const PED_SLOTS = 2

/** Random spawn waits in seconds, `[min, max]`. */
const TRAFFIC_WAIT = { min: 1, max: 2.5 } as const
const PED_WAIT = { min: 2, max: 4 } as const

/**
 * Depth range objects live in. Oncoming traffic (and the left sidewalk)
 * enters at `SPAWN_DEPTH` = 1 and leaves past the camera; away-bound objects
 * enter just behind the camera and leave at the horizon, so both bounds of
 * the range are used and nothing pops in mid-screen.
 */
const NEAR_EDGE = -0.05
const FAR_EDGE = 1.05

/** The three prompts the hero says on the way to the signs. */
const LINES = [
  'Ayo jalan! Rambu pertama ada di depan. Tekan platnya, ya 👆',
  'Rambu berikutnya dekat. Tekan lagi 👆',
  'Satu rambu lagi sebelum sampai jalan raya 👆',
]

type PropKind = 'house' | 'tree' | 'lamp'

/**
 * One kind of background object. Heights are fractions of the viewport
 * height at depth 0; `ratio` is the art's width / height.
 */
const PROP_ART = {
  house: { Art: House, height: 0.85, ratio: 200 / 180 },
  tree: { Art: Tree, height: 0.55, ratio: 120 / 160 },
  lamp: { Art: StreetLamp, height: 0.62, ratio: 60 / 200 },
} as const

/**
 * The belt's six objects, each reused from the Task 3 art kit. `base` is the
 * depth the object sits at when `scroll` is 0. Objects fade out before they
 * reach the camera (`nearFadeAt`) and reappear at the horizon under the haze
 * (`fadeAt`), so they never pop in mid-screen.
 */
const PROPS: ReadonlyArray<{ kind: PropKind; lane: number; base: number }> = [
  { kind: 'house', lane: -0.62, base: 0.18 },
  { kind: 'tree', lane: 0.55, base: 0.33 },
  { kind: 'lamp', lane: -0.46, base: 0.48 },
  { kind: 'house', lane: 0.62, base: 0.63 },
  { kind: 'tree', lane: -0.55, base: 0.78 },
  { kind: 'lamp', lane: 0.46, base: 0.93 },
]

type Box = { w: number; h: number }

/** Displayed size of the hero, in px, for a given viewport height. */
function heroBox(viewportH: number): Box {
  const h = Math.min(190, Math.max(140, viewportH * 0.25))
  return { w: h * (140 / 260), h }
}

/** Nominal (depth 0) size of a background object at a given viewport height. */
function propBox(kind: PropKind, viewportH: number): Box {
  const { height, ratio } = PROP_ART[kind]
  const h = height * viewportH
  return { w: h * ratio, h }
}

/** Nominal (depth 0) size of one road dash. */
function dashBox(viewportW: number): Box {
  const w = viewportW * 0.16
  return { w, h: w * 0.32 }
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

/** Show or hide a traffic slot. `display` is never owned by React's style prop. */
function setDisplay(el: HTMLElement, visible: boolean): void {
  const value = visible ? 'block' : 'none'
  if (el.style.display !== value) el.style.display = value
}

/** Perspective scale rounded to three decimals, to cut redundant style writes. */
function roundScale(depth: number): number {
  return Math.round(scaleAt(depth) * 1000) / 1000
}

/**
 * Stacking index for an NPC: the same depth formula as the scenery belt, so
 * near vehicles overlap far ones. The sign sits at 160 and always wins.
 */
function npcZ(depth: number): number {
  const d = Math.min(1, Math.max(0, depth))
  return 20 + Math.round((1 - d) * 80)
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
export default function WalkScene({ step, onOpen }: Props) {
  const [reduced] = useState(prefersReducedMotion)
  const [mode, setMode] = useState<Mode>(() => (reduced ? 'stopped' : 'walking'))
  const [signStep, setSignStep] = useState(step)

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
    const heroScale = scaleAt(HERO_DEPTH)

    sizeRef.current = {
      w,
      h,
      heroW: hero.w,
      heroH: hero.h,
      heroNomW: hero.w / heroScale,
      heroNomH: hero.h / heroScale,
    }

    const heroEl = heroRef.current
    if (heroEl) {
      heroEl.style.width = `${sizeRef.current.heroNomW}px`
      heroEl.style.height = `${sizeRef.current.heroNomH}px`
    }

    heroZoneRef.current?.style.setProperty('--wk-hero-h', `${hero.h}px`)
    trafficLayerRef.current?.style.setProperty('--wk-vh', `${h}px`)

    const dash = dashBox(w)
    for (const el of dashRefs.current) {
      if (!el) continue
      el.style.width = `${dash.w}px`
      el.style.height = `${dash.h}px`
    }

    propRefs.current.forEach((el, i) => {
      if (!el) return
      const box = propBox(PROPS[i].kind, h)
      el.style.width = `${box.w}px`
      el.style.height = `${box.h}px`
    })
  }, [])

  const draw = useCallback((world: WorldState) => {
    const { w, h, heroW, heroH } = sizeRef.current
    if (!w || !h) return

    // Road dashes: a flat marking centred on its point on the road.
    const dash = dashBox(w)
    for (let i = 0; i < DASH_COUNT; i += 1) {
      const el = dashRefs.current[i]
      if (!el) continue
      const depth = wrap((i + 0.5) / DASH_COUNT - world.scroll, PROP_CYCLE)
      const scale = Math.round(scaleAt(depth) * 1000) / 1000
      const x = xAt(0, depth) * w
      const y = yAt(depth) * h
      setTransform(el, roundHalf(x - (dash.w * scale) / 2), roundHalf(y - (dash.h * scale) / 2), scale)
      setOpacity(el, fadeAt(depth) * 0.9)
      setZ(el, 1)
    }

    // Scenery: bottom-centred on its point on the verge/sidewalk.
    propRefs.current.forEach((el, i) => {
      if (!el) return
      const spec = PROPS[i]
      const depth = wrap(spec.base - world.scroll, PROP_CYCLE)
      const box = propBox(spec.kind, h)
      const scale = Math.round(scaleAt(depth) * 1000) / 1000
      const x = xAt(spec.lane, depth) * w
      const y = yAt(depth) * h
      setTransform(el, roundHalf(x - (box.w * scale) / 2), roundHalf(y - box.h * scale), scale)
      setOpacity(el, fadeAt(depth) * nearFadeAt(depth))
      setZ(el, 20 + Math.round((1 - Math.min(depth, 1)) * 80))
    })

    // The hero never moves; only the world does. Anchored by her feet.
    const heroScale = Math.round(scaleAt(HERO_DEPTH) * 1000) / 1000
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
      const x = xAt(LANES[vehicle.lane], vehicle.depth) * w
      const y = yAt(vehicle.depth) * h
      setTransform(el, roundHalf(x), roundHalf(y), roundScale(vehicle.depth))
      setOpacity(el, fadeAt(vehicle.depth) * nearFadeAt(vehicle.depth))
      setZ(el, npcZ(vehicle.depth))
    })

    pedsRef.current.forEach((ped, i) => {
      const el = pedRefs.current[i]
      if (!el) return
      if (!ped) {
        setDisplay(el, false)
        return
      }
      const x = xAt(LANES[ped.lane], ped.depth) * w
      const y = yAt(ped.depth) * h
      setTransform(el, roundHalf(x), roundHalf(y), roundScale(ped.depth))
      setOpacity(el, fadeAt(ped.depth) * nearFadeAt(ped.depth))
      setZ(el, npcZ(ped.depth))
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
  const line = LINES[Math.min(step, LINES.length - 1)]
  const signStyle = {
    left: `${xAt(SIGN_LANE, SIGN_STOP_D) * 100}%`,
    top: `${yAt(SIGN_STOP_D) * 100}%`,
  } as CSSProperties
  const heroStyle = {
    left: `${xAt(HERO_LANE, HERO_DEPTH) * 100}%`,
    top: `${yAt(HERO_DEPTH) * 100}%`,
  } as CSSProperties

  return (
    <div className="wk-scene">
      <GroundScene />

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
        {PROPS.map((spec, i) => {
          const Art = PROP_ART[spec.kind].Art
          return (
            <div
              key={i}
              className={`wk-prop wk-prop--${spec.kind}`}
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
        style={signStyle}
        onClick={() => onOpen(sign)}
        disabled={mode !== 'stopped'}
        aria-hidden={mode !== 'stopped'}
        aria-label={`Rambu ${sign.name}, tekan untuk melihat artinya`}
      >
        <span className="wk-sign-plate">
          <SignArt art={sign.art} size={96} />
        </span>
        <span className="wk-sign-pole" />
      </button>

      <div className="wk-hero-zone" style={heroStyle} ref={heroZoneRef}>
        <div className="wk-hero" ref={heroRef}>
          <HeroWalk pose={mode === 'walking' ? 'walk' : 'idle'} />
        </div>
        <div className="wk-bubble" key={step}>
          {line}
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
