import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import GroundScene from './scene/GroundScene'
import HeroWalk from './art/HeroWalk'
import { House, StreetLamp, Tree } from './art/scenery'
import { SignArt } from './SignArt'
import { WALK_SIGNS, type Sign } from './data'
import { fadeAt, nearFadeAt, scaleAt, xAt, yAt } from './scene/projection'
import { createWorld, stepWorld, type Mode, type WorldState } from './scene/world'
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
  }, [])

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

  // The one animation loop. It only runs while walking and visible.
  useEffect(() => {
    if (reduced || mode !== 'walking') return

    let raf = 0
    let active = false
    let last = 0

    const frame = (now: number) => {
      if (!active) return
      const dt = last === 0 ? 0 : Math.min(MAX_FRAME_SECONDS, (now - last) / 1000)
      last = now

      const next = stepWorld(worldRef.current, dt)
      worldRef.current = next
      draw(next)

      if (next.mode !== 'walking') {
        active = false
        setSignStep(next.step)
        setMode('stopped')
        return
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
  }, [mode, reduced, draw])

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
