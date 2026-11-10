/**
 * Isi level Sulit: lima kasus, tiap kasus tiga tahap (makna → alasan → tindakan).
 *
 * Sumber teks: `docs/STUDI_KASUS.md` (transkrip apa adanya, hanya ejaan nama
 * dan tanda baca yang dirapikan) + `why` baru yang ditulis di
 * `docs/superpowers/specs/2026-11-10-handoff-level-sulit.md` §3.1. Jangan
 * parafrase tanpa memperbarui spec: lane layar memasang teks ini apa adanya.
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
  /** "Rambu Dilarang Masuk" */
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
 * Lima kasus, urutan 1→5 tetap (makin sulit: larangan, peringatan, perintah,
 * larangan lagi yang mirip, lalu petunjuk biru). Salinan teks dari spec §3.1.
 */
export const CASES: Case[] = [
  {
    id: 'dilarang-masuk',
    title: 'Rambu Dilarang Masuk',
    story:
      'Budi bersepeda bersama ayahnya. Di depan ada rambu bulat merah dengan garis putih, dan Budi ingin lewat karena jalannya lebih dekat.',
    sign: {
      art: 'dilarang-masuk',
      name: 'Rambu Dilarang Masuk',
      visual: 'bulat merah penuh dengan garis putih mendatar di tengah',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa arti rambu itu?',
        options: [
          { text: 'Dilarang masuk', correct: true },
          { text: 'Wajib berhenti', correct: false },
          { text: 'Tempat parkir', correct: false },
        ],
        why: 'Bulat bertepi merah berarti larangan. Garis putih mendatar berarti jalan itu tidak boleh dimasuki.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa Budi tidak boleh lewat jalan itu?',
        options: [
          { text: 'Karena rambu menunjukkan kendaraan tidak boleh masuk', correct: true },
          { text: 'Karena jalan khusus pejalan kaki', correct: false },
          { text: 'Karena jalan itu tempat parkir', correct: false },
        ],
        why: 'Larangan berlaku untuk semua kendaraan, termasuk sepeda. Kalau dilanggar, Budi bisa bertabrakan dengan kendaraan dari depan.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya Budi lakukan?',
        options: [
          { text: 'Mencari jalan lain yang diperbolehkan', correct: true },
          { text: 'Tetap melewati jalan itu', correct: false },
          { text: 'Mengabaikan rambu', correct: false },
        ],
        why: 'Jalan yang dilarang bukan jalan pintas. Mencari jalan lain membuat Budi tetap aman.',
      },
    ],
  },
  {
    id: 'peringatan-tikungan',
    title: 'Rambu Peringatan Tikungan',
    story:
      'Siti bersepeda menuju sekolah. Jalan di depan berbelok ke kanan, dan ada rambu kuning berbentuk belah ketupat.',
    sign: {
      art: 'peringatan-tikungan',
      name: 'Rambu Peringatan Tikungan',
      visual: 'belah ketupat kuning bergambar panah hitam yang membelok ke kanan',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa arti rambu itu?',
        options: [
          { text: 'Jalan berbelok ke kanan', correct: true },
          { text: 'Dilarang bersepeda', correct: false },
          { text: 'Tempat parkir sepeda', correct: false },
        ],
        why: 'Belah ketupat kuning adalah peringatan. Gambar tikungan berarti jalan di depan memang berbelok.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa Siti harus memperhatikan rambu itu?',
        options: [
          { text: 'Karena rambu memberi peringatan ada tikungan di depan', correct: true },
          { text: 'Karena jalan sudah berakhir', correct: false },
          { text: 'Karena itu tempat bermain', correct: false },
        ],
        why: 'Peringatan dipasang sebelum tikungan supaya pengendara bersiap. Siti jadi tahu harus mengurangi kecepatan.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya Siti lakukan?',
        options: [
          { text: 'Mengurangi kecepatan dan berhati-hati', correct: true },
          { text: 'Mempercepat sepeda', correct: false },
          { text: 'Mengabaikan rambu', correct: false },
        ],
        why: 'Saat berbelok, sepeda bisa tergelincir kalau terlalu cepat. Pelan dan hati-hati membuat Siti selamat.',
      },
    ],
  },
  {
    id: 'berhenti-stop',
    title: 'Rambu Wajib Berhenti',
    story:
      'Andi di dalam mobil bersama keluarganya. Saat mendekati persimpangan, ada rambu segi delapan merah bertuliskan STOP.',
    sign: {
      art: 'berhenti-stop',
      name: 'Rambu Wajib Berhenti',
      visual: 'segi delapan merah bertuliskan STOP putih',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa arti rambu itu?',
        options: [
          { text: 'Wajib berhenti', correct: true },
          { text: 'Dilarang parkir', correct: false },
          { text: 'Jalan khusus sepeda', correct: false },
        ],
        why: 'Segi delapan merah selalu berarti berhenti. Rambu ini dipasang di persimpangan yang ramai.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa kendaraan harus berhenti dulu?',
        options: [
          { text: 'Karena pengendara harus memastikan persimpangan aman', correct: true },
          { text: 'Karena itu tempat beristirahat', correct: false },
          { text: 'Karena semua jalan harus diakhiri', correct: false },
        ],
        why: 'Berhenti sebentar memberi waktu melihat kendaraan dari arah lain. Setelah aman, perjalanan boleh dilanjutkan.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya ayah Andi lakukan?',
        options: [
          { text: 'Berhenti, memastikan aman, lalu jalan', correct: true },
          { text: 'Langsung melaju', correct: false },
          { text: 'Membunyikan klakson dan terus jalan', correct: false },
        ],
        why: 'STOP bukan berarti pelan-pelan saja. Berhenti penuh lalu memeriksa keadaan adalah cara paling aman.',
      },
    ],
  },
  {
    id: 'dilarang-parkir',
    title: 'Rambu Dilarang Parkir',
    story:
      'Rina ikut ibunya berbelanja. Ibu ingin memarkir mobil tepat di depan toko, tetapi ada rambu huruf P yang dicoret garis merah.',
    sign: {
      art: 'dilarang-parkir',
      name: 'Rambu Dilarang Parkir',
      visual: 'bulat putih dengan huruf P hitam dan garis merah mencoretnya',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa arti rambu itu?',
        options: [
          { text: 'Dilarang parkir', correct: true },
          { text: 'Tempat parkir kendaraan', correct: false },
          { text: 'Dilarang masuk', correct: false },
        ],
        why: 'Huruf P berarti parkir, dan garis merah mencoretnya. Artinya kendaraan tidak boleh berhenti di situ.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa ibu Rina tidak boleh memarkir mobil di sana?',
        options: [
          { text: 'Karena kendaraan tidak diperbolehkan parkir di sana', correct: true },
          { text: 'Karena tempat itu untuk bermain', correct: false },
          { text: 'Karena semua kendaraan harus berhenti', correct: false },
        ],
        why: 'Tempat di depan toko dipakai orang lewat. Kalau diparkir, jalan jadi sempit dan orang lain terganggu.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya ibu Rina lakukan?',
        options: [
          { text: 'Mencari tempat parkir yang diperbolehkan', correct: true },
          { text: 'Tetap memarkir di depan toko', correct: false },
          { text: 'Mengabaikan karena hanya sebentar', correct: false },
        ],
        why: 'Sebentar pun tetap melanggar. Mencari tempat parkir yang benar membuat semua orang aman.',
      },
    ],
  },
  {
    id: 'penyeberangan-biru',
    title: 'Rambu Tempat Menyeberang',
    story:
      'Doni dan teman-temannya berjalan ke taman. Di tepi jalan ada rambu biru bergambar orang menyeberang di atas garis zebra.',
    sign: {
      art: 'penyeberangan-biru',
      name: 'Rambu Tempat Menyeberang',
      visual: 'persegi biru bergambar orang berjalan di atas garis zebra putih',
    },
    steps: [
      {
        ask: 'makna',
        prompt: 'Apa arti rambu itu?',
        options: [
          { text: 'Tempat penyeberangan pejalan kaki', correct: true },
          { text: 'Dilarang berjalan', correct: false },
          { text: 'Tempat parkir kendaraan', correct: false },
        ],
        why: 'Rambu ini memberi petunjuk tempat, bukan larangan. Gambar pejalan kaki di garis zebra menunjukkan tempat menyeberang.',
      },
      {
        ask: 'alasan',
        prompt: 'Mengapa Doni sebaiknya menyeberang di tempat itu?',
        options: [
          { text: 'Karena tempat itu disediakan agar pejalan kaki aman', correct: true },
          { text: 'Karena semua kendaraan harus berhenti selamanya', correct: false },
          { text: 'Karena itu jalur khusus sepeda', correct: false },
        ],
        why: 'Di tempat penyeberangan, pengendara sudah diberi tanda untuk pelan. Doni lebih aman menyeberang di sana.',
      },
      {
        ask: 'tindakan',
        prompt: 'Apa yang sebaiknya Doni lakukan?',
        options: [
          { text: 'Menyeberang di tempat itu setelah memastikan aman', correct: true },
          { text: 'Berlari menyeberang di sembarang tempat', correct: false },
          { text: 'Menyeberang sambil bermain', correct: false },
        ],
        why: 'Tempat yang benar belum cukup kalau tidak melihat kanan-kiri. Pastikan jalan aman dulu.',
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
