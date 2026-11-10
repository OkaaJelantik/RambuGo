/**
 * Naskah cerita "Petualangan Rambu-Rambu Lalu Lintas".
 *
 * Sumber: docs/superpowers/specs/2026-11-07-naskah-cerita.md. Satu suara —
 * Aku, anak perempuan kelas II SD. Semua kalimat maksimal 2 kalimat dan 90
 * karakter; `story.test.ts` yang menjaganya.
 *
 * Data murni: tidak ada React, tidak ada DOM. App memilih beat lewat `id`,
 * panel hanya menggambar `text` dan `buttons`.
 */

import { KINDS, type Sign } from './data'

/** Aksi yang dikenal App. Panel tidak tahu artinya, hanya meneruskan. */
export type StoryAction =
  | 'continue'
  | 'learn'
  | 'materi'
  | 'sortir'
  /** Papan timur: studi kasus (15 keputusan). */
  | 'studi'
  /** Kuis awal 5 soal, dibuka dari panel materi. */
  | 'kuis'
  | 'home'
  | 'restart'

export type StoryButton = {
  label: string
  action: StoryAction
}

/** Urutan beat persis seperti tabel naskah. */
export type StoryId =
  | 'intro'
  | 'leg-1'
  | 'leg-2'
  | 'leg-3'
  /** Satu id untuk ketiga perhentian; kalimatnya diturunkan dari rambu. */
  | 'stop'
  | 'crossroad'
  | 'materi'
  | 'kuis'
  | 'home'

export type StoryBeat = {
  id: StoryId
  text: string
  buttons: StoryButton[]
}

/**
 * Kalimat pembuka. Diekspor karena layar kelas memakainya langsung: panel
 * tidak digambar selama `stage === 'intro'`, tetapi anak harus tetap membaca
 * kalimat naskah yang sama, bukan salinannya.
 */
export const INTRO_LINE =
  'Bu Guru bilang, rambu itu penunjuk jalan. Aku cari tiga rambu di trotoar, ya!'

export const STORY: StoryBeat[] = [
  {
    id: 'intro',
    text: INTRO_LINE,
    buttons: [{ label: 'Keluar kelas', action: 'continue' }],
  },
  {
    id: 'leg-1',
    text: 'Aku jalan pelan-pelan. Trotoar itu tempat paling aman.',
    // Naskah: kalimat leg tampil otomatis, tanpa tombol, hilang sendiri.
    buttons: [],
  },
  {
    id: 'leg-2',
    text: 'Rumah-rumah berderet di kiri. Pohonnya ramai dan senang.',
    // Naskah: kalimat leg tampil otomatis, tanpa tombol, hilang sendiri.
    buttons: [],
  },
  {
    id: 'leg-3',
    text: 'Rambu berikutnya di dekat ujung trotoar. Tinggal satu!',
    // Naskah: kalimat leg tampil otomatis, tanpa tombol, hilang sendiri.
    buttons: [],
  },
  {
    id: 'crossroad',
    text: 'Sampai di persimpangan. Kiri belajar, lurus kelompokkan, kanan studi kasus.',
    buttons: [
      { label: 'Ke materi', action: 'materi' },
      { label: 'Ke kelompokkan', action: 'sortir' },
      { label: 'Ke studi kasus', action: 'studi' },
    ],
  },
  {
    id: 'materi',
    text: 'Rambu yang tadi kulihat, aku kenali satu-satu.',
    buttons: [{ label: 'Sudah paham, coba kuis', action: 'kuis' }],
  },
  {
    id: 'kuis',
    text: 'Kalau benar, aku dapat bintang.',
    buttons: [{ label: 'Selesai', action: 'home' }],
  },
  {
    id: 'home',
    // Naskah menulis tiga kalimat; dipisah em dash supaya tetap ≤2 kalimat.
    text: 'Sampai di rumah. Rambu itu kawan di jalan! besok aku cerita ke Bu Guru.',
    buttons: [
      { label: 'Pulang', action: 'home' },
      { label: 'Main lagi', action: 'restart' },
    ],
  },
]

/** Cari beat berdasarkan id; `null` kalau panel harus kosong. */
export function beatById(id: string | null): StoryBeat | null {
  if (!id) return null
  return STORY.find((beat) => beat.id === id) ?? null
}

/**
 * Baris pembuka di lembar "Apa ini?", di atas arti rambu. Suara Aku supaya
 * lembar terasa bercerita, bukan kamus.
 */
export const SIGN_OPENINGS: Record<string, string> = {
  'dilarang-berhenti': 'Huruf S dicoret. Mobil tidak boleh berhenti di sini.',
  'dilarang-parkir': 'Huruf P dicoret. Mobil tidak boleh diparkir di sini.',
  'dilarang-putar-balik': 'Panah berbalik arah dicoret. Tidak boleh putar balik di sini.',
  'peringatan-penyeberangan': 'Belah ketupat kuning. Di depan ada tempat menyeberang.',
  'peringatan-lampu': 'Lampu tiga warna di belah ketupat. Sebentar lagi ada lampu jalan.',
  'peringatan-persimpangan': 'Dua jalan bersilang di belah ketupat. Ada persimpangan di depan.',
  'belok-kiri': 'Panah ke kiri di bulat biru. Kendaraan wajib belok kiri.',
  'jalan-terus': 'Panah lurus di bulat biru. Kendaraan wajib jalan terus.',
  'belok-kanan': 'Panah ke kanan di bulat biru. Kendaraan wajib belok kanan.',
  'petunjuk-arah': 'Papan hijau bertuliskan nama kota. Panahnya menunjukkan arahnya.',
  'titik-kumpul': 'Papan hijau bergambar orang. Kalau darurat, aku kumpul di sana.',
  'jalur-evakuasi': 'Papan hijau bergambar orang berlari dan pintu. Itu jalan keluarnya.',
}

/** Baris pembuka untuk satu rambu, atau `undefined` kalau naskah tidak punya. */
export function openingFor(signId: string): string | undefined {
  return SIGN_OPENINGS[signId]
}

/**
 * Kalimat berhenti, diturunkan dari rambu yang benar-benar berdiri di depan
 * anak. Dulu teksnya mati ("Eh, ada rambu …"), sehingga run
 * yang diacak bisa membuat kalimat itu bohong.
 */
export function stopLine(sign: Sign): string {
  return `Eh, ada rambu ${KINDS[sign.kind].shape}. Artinya apa, ya?`
}

/** Beat berhenti: kalimat + dua tombol, sama untuk setiap rambu. */
export function stopBeat(sign: Sign): StoryBeat {
  return {
    id: 'stop',
    text: stopLine(sign),
    buttons: [
      { label: 'Apa ini?', action: 'learn' },
      { label: 'Lanjut jalan', action: 'continue' },
    ],
  }
}
