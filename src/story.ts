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
  | 'explore'
  | 'learn'
  | 'materi'
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
    text: 'Sampai di persimpangan. Lurus jalan lagi, kiri belajar, kanan kuis.',
    buttons: [
      { label: 'Jalan lagi', action: 'explore' },
      { label: 'Ke materi', action: 'materi' },
      { label: 'Ke kuis', action: 'kuis' },
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
    text: 'Sampai di rumah. Rambu itu kawan di jalan — besok aku cerita ke Bu Guru.',
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
  anak: 'Aku kecil, jadi aku paling suka rambu ini.',
  zebra: 'Kalau mau ke seberang, lewat garis putih itu.',
  'dilarang-masuk': 'Tapi aku jalan kaki. Sepeda dan mobil yang tidak boleh.',
  'belok-kiri': 'Bulat biru dengan panah. Kendaraan harus ikut arah panah.',
  'hati-hati': 'Tanda seru di segitiga kuning. Ada yang harus kuhindari di depan.',
  'dilarang-parkir': 'Huruf P dicoret. Mobil tidak boleh berhenti di sini.',
}

/** Baris pembuka untuk satu rambu, atau `undefined` kalau naskah tidak punya. */
export function openingFor(signId: string): string | undefined {
  return SIGN_OPENINGS[signId]
}

/**
 * Kalimat berhenti, diturunkan dari rambu yang benar-benar berdiri di depan
 * anak. Dulu teksnya mati ("Eh, ada rambu segitiga kuning…"), sehingga run
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
