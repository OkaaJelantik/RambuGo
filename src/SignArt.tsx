import type { ReactNode } from 'react'
import { type Art, type Sign } from './data'

const INK = '#231F20'
const YELLOW = '#FFC93C'
const RED = '#E0453F'
const BLUE = '#2E7BE0'
const WHITE = '#FFFFFF'

const warningFrame = (
  <polygon
    points="60,6 116,108 4,108"
    fill={YELLOW}
    stroke={INK}
    strokeWidth="9"
    strokeLinejoin="round"
  />
)

/** Siluet dua anak — dipakai di rambu peringatan "banyak anak". */
const kids = (
  <g fill={INK}>
    <circle cx="45" cy="66" r="7" />
    <path d="M38 74 h14 l3 26 h-20 z" />
    <circle cx="72" cy="60" r="7" />
    <path d="M65 68 h14 l3 32 h-20 z" />
  </g>
)

export const ART: Record<Art, ReactNode> = {
  anak: (
    <>
      {warningFrame}
      {kids}
    </>
  ),

  'hati-hati': (
    <>
      {warningFrame}
      <rect x="54" y="38" width="12" height="34" rx="6" fill={INK} />
      <circle cx="60" cy="86" r="7" fill={INK} />
    </>
  ),

  zebra: (
    <>
      <rect x="4" y="4" width="112" height="112" rx="12" fill={BLUE} />
      <g fill={WHITE}>
        <polygon points="16,104 34,104 58,68 40,68" />
        <polygon points="50,104 68,104 92,68 74,68" />
      </g>
      <g fill={WHITE} stroke={WHITE} strokeLinecap="round">
        <circle cx="80" cy="28" r="7" stroke="none" />
        <rect x="75" y="36" width="10" height="20" rx="5" stroke="none" />
        <path d="M77 54 l-7 16 M83 54 l7 16" fill="none" strokeWidth="6" />
      </g>
    </>
  ),

  'dilarang-masuk': (
    <>
      <circle cx="60" cy="60" r="56" fill={RED} />
      <rect x="22" y="50" width="76" height="20" rx="4" fill={WHITE} />
    </>
  ),

  'dilarang-parkir': (
    <>
      <circle cx="60" cy="60" r="56" fill={WHITE} />
      <circle cx="60" cy="60" r="52" fill="none" stroke={RED} strokeWidth="12" />
      <text
        x="60"
        y="84"
        textAnchor="middle"
        fontFamily="Nunito, system-ui, sans-serif"
        fontWeight="800"
        fontSize="62"
        fill={INK}
      >
        P
      </text>
      <line x1="22" y1="22" x2="98" y2="98" stroke={RED} strokeWidth="12" strokeLinecap="round" />
    </>
  ),

  'belok-kiri': (
    <>
      <circle cx="60" cy="60" r="56" fill={BLUE} />
      <path
        d="M50 96 V62 H28 M28 62 l16-15 M28 62 l16 15"
        fill="none"
        stroke={WHITE}
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
}

/**
 * Deskripsi visual untuk pembaca layar, diambil dari `Sign.visual`: bentuk,
 * warna, dan apa yang digambar. Dipakai di prompt kuis karena gambarnya
 * sendiri tetap `aria-hidden`; tanpa ini pertanyaan "Rambu ini" tidak punya
 * petunjuk apa pun. `name`/`meaning` sengaja tidak pernah dipakai — keduanya
 * membocorkan jawaban kuis.
 */
export function describeSign(sign: Sign): string {
  return `Rambu ${sign.visual}`
}

export function SignArt({ art, size = 96 }: { art: Art; size?: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {ART[art]}
    </svg>
  )
}
