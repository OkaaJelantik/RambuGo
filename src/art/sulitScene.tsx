/**
 * Scene ilustrasi untuk kartu soal "Studi Kasus Rambu" (level Sulit).
 *
 * Satu gambar situasi yang lebih tinggi dan hidup: langit bergradasi, matahari
 * dan dua awan yang bergerak pelan, bukit di cakrawala, rumput, jalan aspal
 * dengan marka yang menyiratkan arah, dan **rambu kasus itu berdiri di tepi
 * jalan** — rambu tetap satu gambar dari `SignArt`, scene hanya menaruhnya.
 *
 * Aturan yang dipegang di sini:
 * - Tidak ada `filter`/`backdrop-filter`; bayangan/kilau = bidang warna.
 * - Tidak ada `Math.random()`. Satu-satunya variasi per kasus diturunkan dari
 *   `caseIndex`/`caseId`: mobil hanya muncul di kasus 2 dan 4 (1-based), warna
 *   latar rambu dari kelas `sulit-hero--<caseId>`.
 * - Scene tidak menggambarkan jawaban kasus; yang tampak hanya jalan yang wajar
 *   untuk rambu itu.
 * - Animasi CSS (bukan rAF): scene ini statis, tidak punya kedalaman, dan tidak
 *   disentuh loop mana pun. Yang beranimasi maksimal 6 node (matahari, dua
 *   awan, jalan, mobil, satu kilau sekali di rambu) — di bawah plafon 10.
 *
 * Semua anak dekoratif; teks untuk pembaca layar datang dari pertanyaan
 * (`sign.visual`), bukan dari gambar ini.
 */

import type { Art } from '../data'
import { SignArt } from '../SignArt'

type Props = {
  /** Rambu kasus ini — satu gambar utuh dari `SignArt`, bukan digambar ulang. */
  art: Art
  /** id kasus (`dilarang-berhenti`, `peringatan-lampu`, …) → warna latar rambu. */
  caseId: string
  /** Urutan kasus 0–4; sumber variasi deterministik (mobil, bukan acak). */
  caseIndex: number
}

/** Rumpun rumput: tiga helai per rumpun, koordinat tetap (bukan acak). */
const TUFTS: { x: number; h: number }[] = [
  { x: 14, h: 13 },
  { x: 62, h: 16 },
  { x: 122, h: 11 },
  { x: 188, h: 15 },
  { x: 238, h: 11 },
  { x: 292, h: 16 },
  { x: 338, h: 12 },
]

export function SulitScene({ art, caseId, caseIndex }: Props) {
  // Mobil hanya di kasus 2 dan 4 (1-based): contoh variasi per kasus yang
  // deterministik, bukan acak. Kasus lain "sepi" — tetap jalan yang wajar.
  const hasCar = caseIndex % 2 === 1

  return (
    <div className={`sulit-hero sulit-hero--${caseId}`} aria-hidden="true">
      {/* Warna jenis rambu sebagai latar tipis di belakang pelat: isyarat jenis
          (larangan merah, peringatan kuning, petunjuk biru), bukan jawaban. */}
      <span className="sulit-halo" />

      {/* Langit: matahari berdenah pelan dan dua awan melayang bergantian. */}
      <span className="sulit-sun" />
      <span className="sulit-cloud sulit-cloud--a" />
      <span className="sulit-cloud sulit-cloud--b" />

      {/* Bukit tipis di cakrawala; diregangkan horizontal, jadi bentuknya
          bidang lebar dan tidak perlu dijaga rasionya. */}
      <svg
        className="sulit-hills"
        viewBox="0 0 360 54"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          d="M0 44 C 38 30, 74 26, 108 34 C 142 42, 168 22, 204 24 C 240 26, 268 40, 302 36 C 330 33, 348 40, 360 44 L360 54 L0 54 Z"
          fill="color-mix(in srgb, var(--grass-dark) 45%, var(--sky-2))"
        />
        <path
          d="M0 50 C 48 40, 92 38, 130 44 C 170 50, 206 34, 248 38 C 286 42, 320 50, 360 50 L360 54 L0 54 Z"
          fill="color-mix(in srgb, var(--grass-dark) 78%, var(--sky-2))"
        />
      </svg>

      {/* Rumput: pita hijau dengan beberapa rumpun. */}
      <div className="sulit-grass">
        <svg
          className="sulit-tufts"
          viewBox="0 0 360 30"
          preserveAspectRatio="none"
          focusable="false"
          aria-hidden="true"
        >
          {TUFTS.map(({ x, h }) => (
            <path
              key={x}
              d={`M${x - 7} 30 L${x - 10} ${30 - h - 2} L${x - 2} 30 Z
                  M${x - 2} 30 L${x + 1} ${30 - h} L${x + 5} 30 Z
                  M${x + 4} 30 L${x + 10} ${30 - h - 3} L${x + 8} 30 Z`}
              fill="color-mix(in srgb, var(--grass-dark) 72%, var(--ink))"
            />
          ))}
        </svg>
      </div>

      {/* Jalan aspal di kaki gambar: marka putus-putus bergerak lambat ke
          kanan, searah mobil yang sesekali melintas. */}
      <div className="sulit-road">
        {hasCar && (
          <svg className="sulit-car" viewBox="0 0 68 30" focusable="false" aria-hidden="true">
            {/* Kontak bayangan = bidang tinta 14%, bukan filter. */}
            <ellipse cx="34" cy="28" rx="27" ry="2.4" fill="var(--ink)" opacity="0.14" />
            <path
              d="M8 25 L8 17 C8 15 9 14 11 14 L15 14 L21 7 C22 5.6 23 5 24.6 5 L44 5 C45.6 5 46.6 5.6 47.6 7 L53 14 L59 15 C62 15 63 16.6 63 19 L63 25 Z"
              fill="var(--red)"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M24 13 L27 8 L35 8 L35 13 Z" fill="var(--sky-2)" />
            <path d="M38 8 L43 8 L47 13 L38 13 Z" fill="var(--sky-2)" />
            <circle cx="21" cy="25" r="5" fill="var(--ink)" />
            <circle cx="21" cy="25" r="2" fill="var(--paper)" />
            <circle cx="50" cy="25" r="5" fill="var(--ink)" />
            <circle cx="50" cy="25" r="2" fill="var(--paper)" />
            <circle cx="62" cy="19" r="1.8" fill="var(--yellow)" />
          </svg>
        )}
      </div>

      {/* Rambu kasus itu berdiri di tepi jalan: pelatnya satu gambar `SignArt`,
          tiangnya pseudo-elemen, dan satu cincin perhatian memudar sekali
          (±140 ms sesudah tahap tampil) supaya mata anak tertuju ke sana. */}
      <span className="sulit-sign">
        <span className="sulit-ping" />
        <SignArt art={art} size={60} />
      </span>
    </div>
  )
}
