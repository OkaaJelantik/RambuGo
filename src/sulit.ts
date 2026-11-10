/**
 * Isi level Sulit: lima kasus, tiap kasus tiga tahap (makna → alasan → tindakan).
 *
 * Sumber teks: `docs/STUDI_KASUS.md` (revisi 2026-11-10) — pertanyaan dan opsi
 * disalin apa adanya, hanya ejaan dan tanda baca yang dirapikan. Kelima kasus
 * kini memakai rambu yang diajarkan di jalur lain (12 rambu `SIGNS`). `why`
 * tidak ada di sumber; ditulis di sini, maksimal dua kalimat.
 *
 * Kunci jawaban **menempel pada `correct`**, bukan pada posisi huruf. Urutan
 * tampil lahir dari seed di `orderedOptions`, jadi kasus lama yang selalu
 * menjawab A–A–A tidak bisa terjadi lagi. Tidak ada `answer: number` di sini.
 */

import { type Art } from './data'
import { createRng } from './scene/spawner'

/** Pertanyaan tiap tahap: apa artinya, mengapa penting, lalu apa yang dilakukan. */
export type CaseAsk = 'makna' | 'alasan' | 'tindakan'

/** Satu pilihan. `correct` satu-satunya kunci jawaban; tidak ada indeks posisi. */
export type CaseOption = { text: string; correct: boolean }

export type CaseStep = {
  ask: CaseAsk
  /** ≤ 90 karakter, satu kalimat tanya. */
  prompt: string
  /** Tepat 3 opsi, tepat satu `correct: true`. */
  options: CaseOption[]
  /** ≤ 2 kalimat; tampil setelah anak menjawab. */
  why: string
}

export type Case = {
  id: string
  /** "Rambu Dilarang Berhenti" */
  title: string
  /** ≤ 2 kalimat, register kelas IV. */
  story: string
  /**
   * Deskripsi **gambar** untuk pembaca layar: bentuk, warna, dan apa yang
   * digambar. Tidak boleh memuat `name` maupun teks jawaban tahap `makna` —
   * keduanya jawaban yang justru harus ditebak anak.
   */
  sign: { art: Art; name: string; visual: string }
  steps: [CaseStep, CaseStep, CaseStep]
}

/**
 * Lima kasus, urutan 1→5 tetap mengikuti naskah: dua larangan, satu peringatan,
 * satu perintah, lalu satu petunjuk. Salinan teks dari `STUDI_KASUS.md`.
 */
export const CASES: Case[] = [
  {
    id: 'dilarang-berhenti',
    title: 'Rambu Dilarang Berhenti',
    story:
      'Budi dan ayahnya naik mobil. Di pinggir jalan ada rambu bulat bertepi merah dengan huruf S dicoret, padahal ayah ingin berhenti membeli makanan.',
    sign: {
      art: 'dilarang-berhenti',
      name: 'Rambu Dilarang Berhenti',
      visual: 'bulat putih dengan huruf S hitam dan garis merah mencoretnya',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa informasi yang disampaikan rambu tersebut?',
        options: [
          { text: 'Dilarang berhenti', correct: true },
          { text: 'Dilarang parkir', correct: false },
          { text: 'Dilarang putar balik', correct: false },
        ],
        why: 'Bulat bertepi merah berarti larangan. Huruf S yang dicoret berarti kendaraan tidak boleh berhenti di situ.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa ayah Budi tidak boleh berhenti di tempat tersebut?',
        options: [
          {
            text: 'Karena rambu menunjukkan kendaraan tidak boleh berhenti di tempat tersebut',
            correct: true,
          },
          { text: 'Karena tempat tersebut khusus untuk pejalan kaki', correct: false },
          { text: 'Karena tempat tersebut merupakan tempat parkir', correct: false },
        ],
        why: 'Kalau berhenti di situ, kendaraan lain bisa terhalang. Larangan ini menjaga jalan tetap lancar.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya dilakukan ayah Budi?',
        options: [
          { text: 'Mencari tempat lain yang diperbolehkan untuk berhenti', correct: true },
          { text: 'Tetap berhenti di tempat tersebut', correct: false },
          { text: 'Mengabaikan rambu lalu lintas', correct: false },
        ],
        why: 'Mencari tempat lain yang boleh berhenti membuat ayah tetap patuh pada rambu.',
      },
    ],
  },
  {
    id: 'dilarang-parkir',
    title: 'Rambu Dilarang Parkir',
    story:
      'Siti dan ibunya pergi ke pasar. Di pinggir jalan ada rambu bulat berhuruf P dicoret, padahal ibu ingin memarkir mobil.',
    sign: {
      art: 'dilarang-parkir',
      name: 'Rambu Dilarang Parkir',
      visual: 'bulat putih dengan huruf P hitam dan garis merah mencoretnya',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa informasi yang disampaikan rambu tersebut?',
        options: [
          { text: 'Dilarang parkir', correct: true },
          { text: 'Dilarang berhenti', correct: false },
          { text: 'Dilarang putar balik', correct: false },
        ],
        why: 'Huruf P berarti parkir, dan garis merah mencoretnya. Artinya kendaraan tidak boleh diparkir di situ.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa ibu Siti tidak boleh memarkir mobil di tempat tersebut?',
        options: [
          {
            text: 'Karena rambu menunjukkan kendaraan tidak boleh diparkir di tempat tersebut',
            correct: true,
          },
          { text: 'Karena tempat tersebut khusus untuk bermain', correct: false },
          { text: 'Karena semua kendaraan harus berhenti di sana', correct: false },
        ],
        why: 'Tempat di pinggir jalan dipakai orang lewat. Kalau diparkir, jalan jadi sempit dan orang lain terganggu.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya dilakukan ibu Siti?',
        options: [
          { text: 'Mencari tempat parkir yang diperbolehkan', correct: true },
          { text: 'Tetap memarkir mobil di tempat tersebut', correct: false },
          { text: 'Mengabaikan rambu karena hanya sebentar', correct: false },
        ],
        why: 'Sebentar pun tetap melanggar. Mencari tempat parkir yang benar membuat semua orang aman.',
      },
    ],
  },
  {
    id: 'peringatan-lampu',
    title: 'Rambu Peringatan Lampu Lalu Lintas',
    story:
      'Andi bersepeda ke sekolah. Di depan ada rambu belah ketupat kuning bergambar lampu lalu lintas.',
    sign: {
      art: 'peringatan-lampu',
      name: 'Rambu Peringatan Lampu Lalu Lintas',
      visual: 'belah ketupat kuning bergambar lampu tiga warna: merah, kuning, hijau',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa informasi yang disampaikan rambu tersebut?',
        options: [
          {
            text: 'Peringatan adanya lampu lalu lintas di depan',
            correct: true,
          },
          { text: 'Perintah untuk berjalan lurus', correct: false },
          { text: 'Petunjuk arah menuju sekolah', correct: false },
        ],
        why: 'Belah ketupat kuning adalah peringatan. Gambar lampu berarti di depan ada lampu lalu lintas.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa Andi perlu memperhatikan rambu tersebut?',
        options: [
          {
            text: 'Karena rambu mengingatkan adanya lampu lalu lintas di depan',
            correct: true,
          },
          { text: 'Karena rambu menunjukkan tempat parkir', correct: false },
          {
            text: 'Karena rambu melarang semua kendaraan melewati jalan',
            correct: false,
          },
        ],
        why: 'Peringatan dipasang sebelum lampu. Andi jadi tahu harus bersiap berhenti atau pelan.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya dilakukan Andi?',
        options: [
          {
            text: 'Memperhatikan isyarat lampu lalu lintas dan berhati-hati',
            correct: true,
          },
          {
            text: 'Mempercepat sepeda tanpa memperhatikan lampu',
            correct: false,
          },
          { text: 'Mengabaikan rambu tersebut', correct: false },
        ],
        why: 'Lampu mengatur kapan boleh jalan. Andi harus melihat nyala lampunya sebelum melintas.',
      },
    ],
  },
  {
    id: 'belok-kiri',
    title: 'Rambu Perintah Belok ke Kiri',
    story:
      'Doni dan ayahnya naik mobil ke rumah nenek. Di dekat persimpangan ada rambu bulat biru berpanah kiri, padahal ayah ingin lurus.',
    sign: {
      art: 'belok-kiri',
      name: 'Rambu Perintah Belok ke Kiri',
      visual: 'bulat biru dengan panah putih menunjuk ke kiri',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa informasi yang disampaikan rambu tersebut?',
        options: [
          { text: 'Perintah belok ke arah kiri', correct: true },
          { text: 'Perintah berjalan lurus', correct: false },
          { text: 'Perintah belok ke arah kanan', correct: false },
        ],
        why: 'Bulat biru adalah perintah. Panah ke kiri berarti kendaraan wajib melewati jalur sebelah kiri.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa ayah Doni harus mengikuti arah panah pada rambu tersebut?',
        options: [
          {
            text: 'Karena rambu memberikan perintah untuk melewati jalur sebelah kiri',
            correct: true,
          },
          { text: 'Karena rambu menunjukkan tempat parkir', correct: false },
          {
            text: 'Karena rambu memperingatkan adanya lampu lalu lintas',
            correct: false,
          },
        ],
        why: 'Perintah mengatur arus jalan. Kalau ayah tetap lurus, mobil bisa bertabrakan dengan kendaraan lain.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya dilakukan ayah Doni?',
        options: [
          {
            text: 'Mengikuti arah panah dan melewati jalur sebelah kiri',
            correct: true,
          },
          { text: 'Tetap berjalan lurus', correct: false },
          { text: 'Belok ke arah kanan', correct: false },
        ],
        why: 'Mengikuti panah membuat arus jalan teratur. Ayah belok kiri, bukan lurus atau ke kanan.',
      },
    ],
  },
  {
    id: 'jalur-evakuasi',
    title: 'Rambu Jalur Evakuasi',
    story:
      'Rina sedang di sekolah saat gempa. Guru mengajak semua siswa ke tempat aman, dan Rina melihat rambu hijau berpanah putih.',
    sign: {
      art: 'jalur-evakuasi',
      name: 'Rambu Jalur Evakuasi',
      visual: 'persegi panjang hijau bergambar orang berlari ke pintu dan panah besar',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa informasi yang disampaikan rambu tersebut?',
        options: [
          { text: 'Jalur evakuasi', correct: true },
          { text: 'Dilarang masuk', correct: false },
          { text: 'Tempat parkir kendaraan', correct: false },
        ],
        why: 'Persegi hijau adalah petunjuk. Gambar orang dan panah menunjukkan jalan keluar saat darurat.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa Rina perlu mengikuti petunjuk pada rambu tersebut?',
        options: [
          {
            text: 'Karena rambu menunjukkan arah menuju tempat yang aman saat keadaan darurat',
            correct: true,
          },
          { text: 'Karena rambu menunjukkan arah menuju pasar', correct: false },
          {
            text: 'Karena rambu menunjukkan tempat kendaraan berhenti',
            correct: false,
          },
        ],
        why: 'Saat gempa, semua orang harus keluar dengan tenang. Rambu ini menunjukkan arah yang aman.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya dilakukan Rina?',
        options: [
          {
            text: 'Mengikuti arah jalur evakuasi menuju tempat aman',
            correct: true,
          },
          { text: 'Berlari ke arah yang tidak diketahui', correct: false },
          { text: 'Mengabaikan petunjuk rambu', correct: false },
        ],
        why: 'Mengikuti panah jalur evakuasi membawa Rina ke tempat aman.',
      },
    ],
  },
]

/** 5 kasus × 3 tahap. App memakai angka ini untuk skor dan teks "dari 15". */
export const TOTAL_DECISIONS = 15

/**
 * Urutan opsi yang tampil, deterministik per (kasus, tahap, seed).
 *
 * Fisher–Yates dari `mulberry32` seperti `sortirCards`: seed yang sama selalu
 * memberi urutan yang sama, seed turunannya `seed * 31 + caseIndex * 7 +
 * stepIndex`. Opsi disalin dulu supaya `CASES` tidak pernah ikut teracak.
 */
export function orderedOptions(caseIndex: number, stepIndex: number, seed: number): CaseOption[] {
  const options = CASES[caseIndex].steps[stepIndex].options.slice()
  const rng = createRng(seed * 31 + caseIndex * 7 + stepIndex)
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return options
}
