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

/** Aksi yang dikenal App. Panel tidak tahu artinya, hanya meneruskan. */
export type StoryAction = 'continue' | 'learn' | 'materi' | 'kuis' | 'home' | 'restart'

export type StoryButton = {
  label: string
  action: StoryAction
}

/** Urutan beat persis seperti tabel naskah. */
export type StoryId =
  | 'intro'
  | 'leg-1'
  | 'stop-1'
  | 'leg-2'
  | 'stop-2'
  | 'leg-3'
  | 'stop-3'
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
    id: 'stop-1',
    // Naskah menulis tiga kalimat; dipisah em dash supaya tetap ≤2 kalimat.
    text: 'Eh, ada rambu segitiga kuning. Gambarnya anak-anak — artinya apa, ya?',
    buttons: [
      { label: 'Apa ini?', action: 'learn' },
      { label: 'Lanjut jalan', action: 'continue' },
    ],
  },
  {
    id: 'leg-2',
    text: 'Rumah-rumah berderet di kiri. Pohonnya ramai dan senang.',
    // Naskah: kalimat leg tampil otomatis, tanpa tombol, hilang sendiri.
    buttons: [],
  },
  {
    id: 'stop-2',
    text: 'Persegi biru, ada garis-garis putih. Ini tempat menyeberang!',
    buttons: [
      { label: 'Apa ini?', action: 'learn' },
      { label: 'Lanjut jalan', action: 'continue' },
    ],
  },
  {
    id: 'leg-3',
    text: 'Rambu berikutnya di dekat ujung trotoar. Tinggal satu!',
    // Naskah: kalimat leg tampil otomatis, tanpa tombol, hilang sendiri.
    buttons: [],
  },
  {
    id: 'stop-3',
    // Naskah menulis tiga kalimat; dipisah em dash supaya tetap ≤2 kalimat.
    text: 'Bulat merah, ada garis putih. Berarti tidak boleh masuk — aku jalan kaki, jadi boleh, ya?',
    buttons: [
      { label: 'Apa ini?', action: 'learn' },
      { label: 'Lanjut jalan', action: 'continue' },
    ],
  },
  {
    id: 'crossroad',
    text: 'Sampai di persimpangan. Aku mau baca rambu lagi, atau langsung kuis?',
    buttons: [
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
}

/** Baris pembuka untuk satu rambu, atau `undefined` kalau naskah tidak punya. */
export function openingFor(signId: string): string | undefined {
  return SIGN_OPENINGS[signId]
}
