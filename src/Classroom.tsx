import type { RefObject } from 'react'
import Kid from './Kid'
import { INTRO_LINE } from './story'
import './classroom.css'

const CLOCK_TICKS = Array.from({ length: 12 }, (_, i) => i * 30)

function Desk({ variant = 0 }: { variant?: number }) {
  return (
    <svg viewBox="0 0 260 200" focusable="false">
      <ellipse cx="126" cy="188" rx="104" ry="9" fill="#2a2320" opacity="0.14" />

      {/* kursi di belakang meja */}
      <rect
        x="168"
        y="14"
        width="58"
        height="54"
        rx="10"
        fill="#c98750"
        stroke="#2a2320"
        strokeWidth="5"
      />
      <rect x="178" y="24" width="38" height="7" rx="3" fill="#a96934" />
      <rect x="178" y="38" width="38" height="7" rx="3" fill="#a96934" />
      <rect x="186" y="66" width="9" height="20" fill="#9a5c2e" stroke="#2a2320" strokeWidth="4" />

      {/* meja */}
      <path
        d="M18 78 44 52h172l26 26z"
        fill="#d09157"
        stroke="#2a2320"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M26 78h204l-6 18H32z"
        fill="#b06f38"
        stroke="#2a2320"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <rect x="54" y="96" width="152" height="26" rx="4" fill="#6b3d20" stroke="#2a2320" strokeWidth="4" />
      <path d="M36 96h14l2 74H38z" fill="#9a5c2e" stroke="#2a2320" strokeWidth="4" />
      <path d="M210 96h14l-2 74h-14z" fill="#9a5c2e" stroke="#2a2320" strokeWidth="4" />
      <rect x="46" y="158" width="168" height="9" rx="4" fill="#9a5c2e" stroke="#2a2320" strokeWidth="3.5" />

      {/* isi meja */}
      {variant === 0 && (
        <g stroke="#2a2320" strokeWidth="2.5">
          <rect x="76" y="40" width="52" height="10" rx="3" fill="#2e7be0" />
          <rect x="80" y="32" width="44" height="9" rx="3" fill="#fff6e4" />
          <rect
            x="150"
            y="36"
            width="40"
            height="8"
            rx="4"
            fill="#ffc93c"
            transform="rotate(-8 170 40)"
          />
        </g>
      )}
      {variant === 1 && (
        <g stroke="#2a2320" strokeWidth="2.5">
          <rect x="88" y="38" width="46" height="11" rx="3" fill="#e0453f" />
          <rect
            x="142"
            y="34"
            width="34"
            height="10"
            rx="4"
            fill="#69c64a"
            transform="rotate(7 159 39)"
          />
        </g>
      )}
      {variant === 2 && (
        <g stroke="#2a2320" strokeWidth="2.5">
          <rect
            x="72"
            y="42"
            width="18"
            height="24"
            rx="3"
            fill="#ff8a3d"
            transform="rotate(-10 81 54)"
          />
          <rect x="96" y="36" width="14" height="30" rx="3" fill="#2e7be0" />
        </g>
      )}
    </svg>
  )
}

export default function Classroom({
  onStart,
  headingRef,
}: {
  onStart: () => void
  /** Judul kelas; App memfokuskannya saat layar ini menjadi tujuan fokus. */
  headingRef?: RefObject<HTMLHeadingElement | null>
}) {
  return (
    <section className="cr-screen" aria-labelledby="cr-title">
      <div className="cr-room" aria-hidden="true">
        <div className="cr-floor" />
        <div className="cr-baseboard" />
        <div className="cr-sunbeam" />

        {/* ---------- jendela + halaman sekolah ---------- */}
        <div className="cr-window">
          <svg viewBox="0 0 300 352" focusable="false">
            <defs>
              <linearGradient id="crSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#79cdf7" />
                <stop offset="1" stopColor="#dcf4ff" />
              </linearGradient>
              <clipPath id="crPane">
                <rect x="26" y="26" width="248" height="284" rx="3" />
              </clipPath>
            </defs>

            <rect
              x="12"
              y="12"
              width="276"
              height="312"
              rx="10"
              fill="#fdf4e3"
              stroke="#2a2320"
              strokeWidth="6"
            />
            <rect x="22" y="22" width="256" height="292" rx="6" fill="#efe0c6" />

            <g clipPath="url(#crPane)">
              <rect x="26" y="26" width="248" height="284" fill="url(#crSky)" />
              <circle cx="232" cy="64" r="23" fill="#ffe08a" />
              <g fill="#ffffff" opacity="0.96">
                <ellipse cx="94" cy="74" rx="31" ry="15" />
                <ellipse cx="120" cy="70" rx="23" ry="12" />
                <ellipse cx="71" cy="79" rx="19" ry="10" />
                <ellipse cx="205" cy="121" rx="23" ry="11" />
                <ellipse cx="222" cy="117" rx="15" ry="8" />
              </g>
              <path
                d="M26 248c34-28 64-26 94-6s58 26 92 6 45-12 62-2v64H26z"
                fill="#8ed57f"
              />
              <path
                d="M26 274c40-18 68-6 104 4s56 8 88-2 42-8 56-2v36H26z"
                fill="#69c64a"
              />
              <g>
                <rect x="58" y="236" width="7" height="36" fill="#8a5a34" />
                <circle cx="61" cy="231" r="19" fill="#4fa936" />
                <circle cx="50" cy="239" r="12" fill="#69c64a" />
                <circle cx="72" cy="240" r="11" fill="#69c64a" />
              </g>
              <path d="M26 312 152 26h38L62 312z" fill="#ffffff" opacity="0.15" />
            </g>

            <rect
              x="144"
              y="26"
              width="12"
              height="284"
              fill="#fdf4e3"
              stroke="#2a2320"
              strokeWidth="3"
            />
            <rect
              x="26"
              y="172"
              width="248"
              height="10"
              fill="#fdf4e3"
              stroke="#2a2320"
              strokeWidth="3"
            />

            <rect
              x="0"
              y="314"
              width="300"
              height="22"
              rx="7"
              fill="#cf9159"
              stroke="#2a2320"
              strokeWidth="5"
            />
            <rect x="9" y="315" width="282" height="6" rx="3" fill="#e6b07a" />

            <g>
              <path
                d="M242 296h38l-5 18h-28z"
                fill="#e0784e"
                stroke="#2a2320"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M260 296c-1-12-9-17-19-22 10-6 19-1 22 8 3-9 10-13 18-11-1 10-8 18-17 21z"
                fill="#69c64a"
                stroke="#2a2320"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>

        {/* ---------- papan tulis ---------- */}
        <div className="cr-board">
          <svg viewBox="0 0 640 356" focusable="false">
            <defs>
              <linearGradient id="crBoardGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#39714f" />
                <stop offset="1" stopColor="#2c5f44" />
              </linearGradient>
              <filter id="crChalk" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.9"
                  numOctaves="2"
                  seed="9"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="2"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>

            <rect
              x="6"
              y="6"
              width="628"
              height="312"
              rx="16"
              fill="#b97c46"
              stroke="#2a2320"
              strokeWidth="6"
            />
            <rect
              x="20"
              y="20"
              width="600"
              height="284"
              rx="9"
              fill="#9a6136"
              stroke="#2a2320"
              strokeWidth="3"
            />
            <rect x="32" y="32" width="576" height="260" rx="6" fill="url(#crBoardGreen)" />
            <rect
              x="32"
              y="32"
              width="576"
              height="260"
              rx="6"
              fill="none"
              stroke="#24503a"
              strokeWidth="3"
            />
            <ellipse cx="430" cy="272" rx="86" ry="12" fill="#f4efdc" opacity="0.05" />

            <g filter="url(#crChalk)">
              <g
                fill="#f6f1de"
                opacity="0.94"
                textAnchor="middle"
                fontFamily="'Fredoka', 'Nunito', sans-serif"
                fontWeight="600"
                letterSpacing="2"
              >
                <text x="320" y="132" fontSize="62">
                  RAMBU LALU
                </text>
                <text x="320" y="208" fontSize="62">
                  LINTAS
                </text>
              </g>
              <path
                d="M230 224c36 7 78-5 116 1 14 2 27 0 39-3"
                fill="none"
                stroke="#f6f1de"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.55"
              />

              {/* lampu lalu lintas kecil, digambar kapur */}
              <g opacity="0.85">
                <rect
                  x="66"
                  y="232"
                  width="30"
                  height="54"
                  rx="9"
                  fill="none"
                  stroke="#f6f1de"
                  strokeWidth="4"
                />
                <circle cx="81" cy="244" r="4.5" fill="#f2a89b" />
                <circle cx="81" cy="259" r="4.5" fill="#ffe08a" />
                <circle cx="81" cy="274" r="4.5" fill="#a8dfa0" />
              </g>
              <path
                d="M112 255h40M138 245l10 10-10 10"
                fill="none"
                stroke="#f6f1de"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
              <g opacity="0.55" fill="#f6f1de">
                <circle cx="330" cy="238" r="2" />
                <circle cx="338" cy="245" r="1.6" />
                <circle cx="324" cy="248" r="1.4" />
                <circle cx="470" cy="250" r="1.8" />
              </g>
            </g>

            <rect
              x="46"
              y="318"
              width="548"
              height="22"
              rx="11"
              fill="#8a5b33"
              stroke="#2a2320"
              strokeWidth="5"
            />
            <rect x="62" y="322" width="516" height="6" rx="3" fill="#a9713f" />

            <g stroke="#2a2320" strokeWidth="2.5">
              <rect x="118" y="306" width="58" height="12" rx="6" fill="#f7f1e0" />
              <rect x="188" y="309" width="44" height="10" rx="5" fill="#ffd76a" />
              <rect x="246" y="311" width="30" height="8" rx="4" fill="#e9e1cc" />
            </g>
            <g>
              <rect
                x="432"
                y="300"
                width="68"
                height="18"
                rx="5"
                fill="#e2683f"
                stroke="#2a2320"
                strokeWidth="3"
              />
              <rect
                x="432"
                y="300"
                width="30"
                height="18"
                rx="5"
                fill="#f1e6cf"
                stroke="#2a2320"
                strokeWidth="3"
              />
            </g>
          </svg>
        </div>

        {/* ---------- jam dinding ---------- */}
        <div className="cr-clock">
          <svg viewBox="0 0 120 120" focusable="false">
            <circle cx="60" cy="60" r="53" fill="#ffc93c" stroke="#2a2320" strokeWidth="5" />
            <circle cx="60" cy="60" r="42" fill="#fffaf0" stroke="#2a2320" strokeWidth="3.5" />
            {CLOCK_TICKS.map((deg) => (
              <line
                key={deg}
                x1="60"
                y1="24"
                x2="60"
                y2={deg % 90 === 0 ? 30 : 28}
                stroke="#2a2320"
                strokeWidth={deg % 90 === 0 ? 3.4 : 2}
                strokeLinecap="round"
                transform={`rotate(${deg} 60 60)`}
              />
            ))}
            <path d="M60 60V31" stroke="#2a2320" strokeWidth="6" strokeLinecap="round" />
            <path d="M60 60 45 80" stroke="#2a2320" strokeWidth="6.5" strokeLinecap="round" />
            <circle cx="60" cy="60" r="5" fill="#e0453f" />
          </svg>
        </div>

        {/* ---------- peta jalan (tampil di layar tegak) ---------- */}
        <div className="cr-map">
          <svg viewBox="0 0 120 156" focusable="false">
            <rect
              x="2"
              y="2"
              width="116"
              height="152"
              rx="7"
              fill="#c98b56"
              stroke="#2a2320"
              strokeWidth="5"
            />
            <rect x="11" y="11" width="98" height="134" rx="3" fill="#f6e6c6" />
            <g stroke="#e0c79c" strokeWidth="12" strokeLinecap="round">
              <path d="M16 46h88M16 112h88M40 16v124M86 16v124" />
            </g>
            <g stroke="#fffaf0" strokeWidth="2.4" strokeDasharray="6 6">
              <path d="M40 16v124M86 16v124M16 46h88M16 112h88" />
            </g>
            <path d="M18 58c14-7 18 5 30 3v22c-12 4-24 1-30-2z" fill="#9ad77f" />
            <path d="M60 122c10 8 22 4 30 10v13H60z" fill="#9ad77f" />
            <path
              d="M12 92c14-10 22 2 34-2s14-10 26-6"
              stroke="#7fc8f0"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M24 128c14-12 4-30 18-38s24 8 34-6 0-22 12-30"
              stroke="#e0453f"
              strokeWidth="3.4"
              strokeDasharray="7 5"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="24" cy="128" r="5" fill="#ffc93c" stroke="#2a2320" strokeWidth="2" />
            <circle cx="100" cy="54" r="5" fill="#e0453f" stroke="#2a2320" strokeWidth="2" />
            <rect x="70" y="132" width="30" height="8" rx="2" fill="#2a2320" opacity="0.18" />
          </svg>
        </div>

        {/* ---------- rak buku + globe ---------- */}
        <div className="cr-shelf">
          <svg viewBox="0 0 220 300" focusable="false">
            <ellipse cx="110" cy="290" rx="92" ry="8" fill="#2a2320" opacity="0.16" />

            <rect
              x="12"
              y="64"
              width="196"
              height="224"
              rx="8"
              fill="#bd8149"
              stroke="#2a2320"
              strokeWidth="6"
            />
            <rect x="26" y="78" width="168" height="196" rx="4" fill="#9c6336" />
            <rect
              x="20"
              y="132"
              width="180"
              height="10"
              rx="4"
              fill="#d29a62"
              stroke="#2a2320"
              strokeWidth="3.5"
            />
            <rect
              x="20"
              y="204"
              width="180"
              height="10"
              rx="4"
              fill="#d29a62"
              stroke="#2a2320"
              strokeWidth="3.5"
            />

            <g stroke="#2a2320" strokeWidth="2.5">
              <rect x="34" y="86" width="18" height="46" rx="3" fill="#e0453f" />
              <rect x="55" y="80" width="15" height="52" rx="3" fill="#ffc93c" />
              <rect x="73" y="90" width="20" height="42" rx="3" fill="#2e7be0" />
              <rect x="96" y="84" width="14" height="48" rx="3" fill="#fff2dc" />
              <rect x="113" y="92" width="22" height="40" rx="3" fill="#69c64a" />
              <rect x="138" y="86" width="16" height="46" rx="3" fill="#ff8a3d" />
              <g transform="rotate(12 172 132)">
                <rect x="160" y="92" width="16" height="40" rx="3" fill="#2e7be0" />
              </g>
            </g>

            <g stroke="#2a2320" strokeWidth="2.5">
              <rect x="34" y="160" width="16" height="44" rx="3" fill="#ff8a3d" />
              <rect x="53" y="150" width="14" height="54" rx="3" fill="#e0453f" />
              <rect x="70" y="164" width="20" height="40" rx="3" fill="#ffc93c" />
              <rect x="93" y="154" width="16" height="50" rx="3" fill="#69c64a" />
              <rect x="112" y="168" width="22" height="36" rx="3" fill="#fff2dc" />
              <rect x="137" y="158" width="15" height="46" rx="3" fill="#2e7be0" />
            </g>
            <g stroke="#2a2320" strokeWidth="2.5">
              <rect x="160" y="176" width="32" height="9" rx="3" fill="#ffc93c" />
              <rect x="164" y="167" width="26" height="9" rx="3" fill="#e0453f" />
            </g>

            <g stroke="#2a2320" strokeWidth="3">
              <rect x="36" y="226" width="62" height="42" rx="6" fill="#e07a4a" />
              <path d="M36 240h62" stroke="#2a2320" strokeWidth="3" opacity="0.35" />
              <rect x="112" y="230" width="58" height="38" rx="6" fill="#4f97e8" />
              <path d="M112 243h58" stroke="#2a2320" strokeWidth="3" opacity="0.35" />
            </g>

            <g>
              <path d="M132 64c0-11 20-18 24 0" fill="none" stroke="#2a2320" strokeWidth="4" />
              <circle cx="156" cy="34" r="24" fill="#7fd0f7" stroke="#2a2320" strokeWidth="4" />
              <path
                d="M140 24c6 5 11 3 15 8s2 9 8 11"
                fill="none"
                stroke="#69c64a"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <ellipse
                cx="156"
                cy="34"
                rx="8"
                ry="24"
                fill="none"
                stroke="#2a2320"
                strokeWidth="2"
                opacity="0.3"
              />
            </g>
            <g stroke="#2a2320" strokeWidth="2.5">
              <rect x="28" y="56" width="52" height="9" rx="3" fill="#fff2dc" />
              <rect x="34" y="47" width="42" height="9" rx="3" fill="#2e7be0" />
            </g>
          </svg>
        </div>

        {/* ---------- murid kelas 2, siap berangkat ---------- */}
        <div className="cr-kid">
          <Kid />
        </div>

        {/* ---------- meja-kursi ---------- */}
        <div className="cr-desk cr-desk--a">
          <Desk variant={0} />
        </div>
        <div className="cr-desk cr-desk--b">
          <Desk variant={1} />
        </div>
        <div className="cr-desk cr-desk--c">
          <Desk variant={2} />
        </div>
      </div>

      <div className="cr-foreground">
        <div className="cr-prop cr-prop--books" aria-hidden="true">
          <svg viewBox="0 0 164 108" focusable="false">
            <ellipse cx="76" cy="94" rx="62" ry="7" fill="#2a2320" opacity="0.18" />
            <g stroke="#2a2320" strokeWidth="4" strokeLinejoin="round">
              <rect x="20" y="70" width="110" height="18" rx="4" fill="#2e7be0" />
              <rect x="30" y="54" width="92" height="16" rx="4" fill="#e0453f" />
              <rect x="24" y="38" width="100" height="16" rx="4" fill="#ffc93c" />
            </g>
            <g fill="#fff6e4" opacity="0.9">
              <rect x="26" y="73" width="98" height="6" rx="2" />
              <rect x="36" y="57" width="80" height="5" rx="2" />
              <rect x="30" y="41" width="88" height="5" rx="2" />
            </g>
            <g transform="rotate(-14 116 30)">
              <rect x="86" y="22" width="56" height="9" rx="3" fill="#ffc93c" stroke="#2a2320" strokeWidth="3" />
              <path d="M142 22l12 4.5-12 4.5z" fill="#f7cba8" stroke="#2a2320" strokeWidth="3" strokeLinejoin="round" />
              <path d="M86 22v9" stroke="#2a2320" strokeWidth="6" />
            </g>
          </svg>
        </div>
        <div className="cr-prop cr-prop--apple" aria-hidden="true">
          <svg viewBox="0 0 100 100" focusable="false">
            <ellipse cx="50" cy="92" rx="30" ry="5" fill="#2a2320" opacity="0.18" />
            <path
              d="M50 26c10-10 30-8 34 8 5 20-10 44-22 50-5 3-8 2-12 2s-7 1-12-2C26 78 11 54 16 34c4-16 24-18 34-8z"
              fill="#e0453f"
              stroke="#2a2320"
              strokeWidth="4.5"
            />
            <path
              d="M38 38c-4 6-5 13-4 20"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path d="M50 30c0-8 1-12 4-14" fill="none" stroke="#6b4a2a" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M55 20c6-9 16-9 20-4-5 8-14 11-20 4z"
              fill="#69c64a"
              stroke="#2a2320"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="cr-card">
          <p className="cr-eyebrow">
            <span className="cr-dot" aria-hidden="true" />
            Kelas 2 SD
          </p>
          <h1 className="cr-title" id="cr-title" ref={headingRef} tabIndex={-1}>
            Petualangan <span className="cr-mark">Rambu Lalu Lintas</span>
          </h1>
          <p className="cr-lead">{INTRO_LINE}</p>
          <button className="cr-cta" type="button" onClick={onStart}>
            Keluar kelas
            <span className="cr-cta-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
