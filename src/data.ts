export type Kind = 'peringatan' | 'larangan' | 'perintah' | 'petunjuk'

export type Art =
  | 'anak'
  | 'zebra'
  | 'dilarang-masuk'
  | 'belok-kiri'
  | 'hati-hati'
  | 'dilarang-parkir'

export type Sign = {
  id: string
  art: Art
  kind: Kind
  name: string
  meaning: string
  tip: string
}

/** Bentuk & warna tiap jenis rambu — dipakai untuk kartu dan label. */
export const KINDS: Record<Kind, { label: string; color: string; shape: string }> = {
  peringatan: { label: 'Peringatan', color: '#F2B01E', shape: 'segitiga kuning' },
  larangan: { label: 'Larangan', color: '#E0453F', shape: 'bulat merah' },
  perintah: { label: 'Perintah', color: '#2E7BE0', shape: 'bulat biru' },
  petunjuk: { label: 'Petunjuk', color: '#1C9B6B', shape: 'persegi hijau' },
}

export const SIGNS: Sign[] = [
  {
    id: 'anak',
    art: 'anak',
    kind: 'peringatan',
    name: 'Banyak Anak Menyeberang',
    meaning: 'Di jalan ini banyak anak yang menyeberang.',
    tip: 'Kendaraan harus pelan-pelan dan hati-hati.',
  },
  {
    id: 'zebra',
    art: 'zebra',
    kind: 'petunjuk',
    name: 'Tempat Menyeberang',
    meaning: 'Di sini tempat yang aman untuk menyeberang.',
    tip: 'Menyeberang di sini, jangan di sembarang tempat.',
  },
  {
    id: 'dilarang-masuk',
    art: 'dilarang-masuk',
    kind: 'larangan',
    name: 'Dilarang Masuk',
    meaning: 'Kendaraan tidak boleh lewat jalan ini.',
    tip: 'Jalan itu dipakai kendaraan dari arah sebaliknya.',
  },
  {
    id: 'belok-kiri',
    art: 'belok-kiri',
    kind: 'perintah',
    name: 'Wajib Belok Kiri',
    meaning: 'Kendaraan harus belok ke kiri.',
    tip: 'Ikuti arah yang diperintahkan rambu.',
  },
  {
    id: 'hati-hati',
    art: 'hati-hati',
    kind: 'peringatan',
    name: 'Hati-hati',
    meaning: 'Ada bahaya di depan.',
    tip: 'Kurangi kecepatan dan lihat sekeliling.',
  },
  {
    id: 'dilarang-parkir',
    art: 'dilarang-parkir',
    kind: 'larangan',
    name: 'Dilarang Parkir',
    meaning: 'Kendaraan tidak boleh parkir di sini.',
    tip: 'Jalan harus tetap lapang, tidak dipakai parkir.',
  },
]

export type Question = {
  id: string
  prompt: string
  signId?: string
  options: string[]
  answer: number
  why: string
}

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: 'Rambu ini artinya apa?',
    signId: 'anak',
    options: ['Banyak anak menyeberang', 'Dilarang masuk', 'Tempat parkir'],
    answer: 0,
    why: 'Rambu kuning bersegitiga artinya peringatan. Di sini banyak anak menyeberang, jadi kendaraan harus pelan.',
  },
  {
    id: 'q2',
    prompt: 'Rambu ini menunjukkan tempat untuk apa?',
    signId: 'zebra',
    options: ['Berhenti sebentar', 'Menyeberang jalan', 'Memarkir mobil'],
    answer: 1,
    why: 'Garis-garis putih itu disebut zebra cross. Itu tempat paling aman untuk menyeberang.',
  },
  {
    id: 'q3',
    prompt: 'Rambu bulat merah bergaris putih ini artinya?',
    signId: 'dilarang-masuk',
    options: ['Boleh lewat pelan-pelan', 'Kendaraan tidak boleh masuk', 'Jalan rusak'],
    answer: 1,
    why: 'Bulat merah artinya larangan. Jalan itu tidak boleh dimasuki kendaraan dari arah ini.',
  },
  {
    id: 'q4',
    prompt: 'Rambu bulat biru dengan panah ke kiri artinya?',
    signId: 'belok-kiri',
    options: ['Wajib belok kiri', 'Dilarang belok', 'Jalan buntu'],
    answer: 0,
    why: 'Bulat biru artinya perintah. Kendaraan harus mengikuti arah panah, yaitu belok kiri.',
  },
  {
    id: 'q5',
    prompt: 'Rambu dengan bentuk bulat dan warna dasar merah termasuk jenis?',
    options: ['Rambu petunjuk', 'Rambu larangan', 'Rambu peringatan'],
    answer: 1,
    why: 'Bulat merah dipakai untuk larangan. Peringatan berwarna kuning bersegitiga, petunjuk berwarna biru atau hijau.',
  },
]

/** Tiga rambu yang ditemui sambil berjalan kaki ke jalan raya. */
export const WALK_SIGNS = SIGNS.slice(0, 3)
