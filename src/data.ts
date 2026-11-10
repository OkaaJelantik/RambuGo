/**
 * Sumber konten: `MODUL_AJAR.md` §2–4 (larangan, peringatan, perintah) + sintesis
 * "Rambu Petunjuk" (persegi/persegi panjang hijau, tulisan putih) dan grafis
 * ekstraksi `Assets/rambu_lalu_lintas.html` — keempat baris, dua belas rambu.
 *
 * `MODUL_AJAR.md` melewatkan jenis Petunjuk; itu kelalaian ekstraksi, bukan
 * keputusan kurikulum. Keempat jenis kini diajarkan.
 */

/** Empat jenis rambu. `petunjuk` berasal dari sintesis modul, bukan dari matriks lamanya. */
export type Kind = 'peringatan' | 'larangan' | 'perintah' | 'petunjuk'

/** Satu art per rambu; id art = id rambu, jadi tidak ada dua tabel yang bisa lepas. */
export type Art =
  | 'dilarang-berhenti'
  | 'dilarang-parkir'
  | 'dilarang-putar-balik'
  | 'peringatan-penyeberangan'
  | 'peringatan-lampu'
  | 'peringatan-persimpangan'
  | 'belok-kiri'
  | 'jalan-terus'
  | 'belok-kanan'
  | 'petunjuk-arah'
  | 'titik-kumpul'
  | 'jalur-evakuasi'

export type Sign = {
  id: string
  art: Art
  kind: Kind
  /**
   * Di mana rambu ini hidup. `jalan` = pelat persegi yang berdiri di trotoar
   * (satu kotak 100 × 100 unit, tiang di bawahnya). `papan` = papan petunjuk
   * hijau yang lebih lebar dari tingginya, jadi ia tampil di lembar, kartu, dan
   * kuis — bukan sebagai objek jalan, karena `SIGN_BOX` jalan satu lebar.
   */
  place: 'jalan' | 'papan'
  name: string
  meaning: string
  tip: string
  /**
   * Deskripsi **gambar** untuk pembaca layar: bentuk, warna, dan apa yang
   * digambar. Tidak boleh memuat `name`/`meaning` — di kuis, keduanya adalah
   * jawabannya.
   */
  visual: string
}

/**
 * Bentuk & warna tiap jenis — dipakai untuk kartu, lembar, dan kalimat
 * perhentian. `shape` adalah satu-satunya sumber kalimat "Eh, ada rambu …",
 * jadi mengganti bentuk cukup di sini.
 */
export const KINDS: Record<Kind, { label: string; color: string; shape: string; rule: string }> = {
  larangan: {
    label: 'Larangan',
    color: '#E0453F',
    shape: 'bulat putih bertepi merah',
    rule: 'Bulat putih dengan tepi merah: ada yang tidak boleh dilakukan.',
  },
  peringatan: {
    label: 'Peringatan',
    color: '#FFC93C',
    shape: 'belah ketupat kuning',
    rule: 'Belah ketupat kuning: ada yang perlu diwaspadai di depan.',
  },
  perintah: {
    label: 'Perintah',
    color: '#2E7BE0',
    shape: 'bulat biru',
    rule: 'Bulat biru dengan panah: kita wajib mengikuti arahnya.',
  },
  petunjuk: {
    label: 'Petunjuk',
    color: '#007A33',
    shape: 'persegi hijau',
    rule: 'Persegi hijau dengan tulisan putih: memberi petunjuk arah atau tempat.',
  },
}

export const SIGNS: Sign[] = [
  {
    id: 'dilarang-berhenti',
    art: 'dilarang-berhenti',
    place: 'jalan',
    kind: 'larangan',
    name: 'Dilarang Berhenti',
    meaning: 'Kendaraan tidak boleh berhenti di tempat ini.',
    tip: 'Kalau berhenti di sini, kendaraan lain bisa terhalang.',
    visual: 'bulat putih dengan huruf S hitam dan garis merah mencoretnya',
  },
  {
    id: 'dilarang-parkir',
    art: 'dilarang-parkir',
    place: 'jalan',
    kind: 'larangan',
    name: 'Dilarang Parkir',
    meaning: 'Kendaraan tidak boleh diparkir di tempat ini.',
    tip: 'Cari tempat parkir lain yang memang boleh dipakai.',
    visual: 'bulat putih dengan huruf P hitam dan garis merah mencoretnya',
  },
  {
    id: 'dilarang-putar-balik',
    art: 'dilarang-putar-balik',
    place: 'jalan',
    kind: 'larangan',
    name: 'Dilarang Putar Balik',
    meaning: 'Kendaraan tidak boleh memutar balik arah di sini.',
    tip: 'Putar balik hanya di tempat yang memang boleh.',
    visual: 'bulat putih dengan panah hitam berbalik arah, dicoret garis merah',
  },
  {
    id: 'peringatan-penyeberangan',
    art: 'peringatan-penyeberangan',
    place: 'jalan',
    kind: 'peringatan',
    name: 'Akan Ada Penyeberangan',
    meaning: 'Di depan ada tempat penyeberangan orang.',
    tip: 'Pelan-pelan dan dahulukan orang yang menyeberang.',
    visual: 'belah ketupat kuning bergambar orang berjalan di atas garis zebra',
  },
  {
    id: 'peringatan-lampu',
    art: 'peringatan-lampu',
    place: 'jalan',
    kind: 'peringatan',
    name: 'Akan Ada Lampu Lalu Lintas',
    meaning: 'Di depan ada lampu lalu lintas.',
    tip: 'Bersiap berhenti dan ikuti nyala lampunya.',
    visual: 'belah ketupat kuning bergambar lampu tiga warna: merah, kuning, hijau',
  },
  {
    id: 'peringatan-persimpangan',
    art: 'peringatan-persimpangan',
    place: 'jalan',
    kind: 'peringatan',
    name: 'Akan Ada Persimpangan',
    meaning: 'Di depan ada persimpangan jalan.',
    tip: 'Lihat kendaraan dari arah lain sebelum lewat.',
    visual: 'belah ketupat kuning bergambar dua jalan bersilang',
  },
  {
    id: 'belok-kiri',
    art: 'belok-kiri',
    place: 'jalan',
    kind: 'perintah',
    name: 'Wajib Belok Kiri',
    meaning: 'Kendaraan wajib belok ke kiri.',
    tip: 'Ikuti arah panah, jangan lurus.',
    visual: 'bulat biru dengan panah putih menunjuk ke kiri',
  },
  {
    id: 'jalan-terus',
    art: 'jalan-terus',
    place: 'jalan',
    kind: 'perintah',
    name: 'Wajib Jalan Terus',
    meaning: 'Kendaraan wajib jalan lurus terus.',
    tip: 'Tidak boleh belok kiri maupun kanan.',
    visual: 'bulat biru dengan panah putih menunjuk ke atas',
  },
  {
    id: 'belok-kanan',
    art: 'belok-kanan',
    place: 'jalan',
    kind: 'perintah',
    name: 'Wajib Belok Kanan',
    meaning: 'Kendaraan wajib belok ke kanan.',
    tip: 'Ikuti arah panah, jangan lurus.',
    visual: 'bulat biru dengan panah putih menunjuk ke kanan',
  },
  {
    id: 'petunjuk-arah',
    art: 'petunjuk-arah',
    place: 'papan',
    kind: 'petunjuk',
    name: 'Petunjuk Arah',
    meaning: 'Papan ini menunjukkan arah menuju suatu kota atau tempat.',
    tip: 'Baca nama kotanya, lalu ikuti arah panahnya.',
    visual: 'persegi panjang hijau bertuliskan nama kota dan panah penunjuk arah',
  },
  {
    id: 'titik-kumpul',
    art: 'titik-kumpul',
    place: 'papan',
    kind: 'petunjuk',
    name: 'Titik Kumpul',
    meaning: 'Di sini tempat berkumpul saat ada keadaan darurat.',
    tip: 'Kalau ada gempa, semua orang berkumpul di tempat ini.',
    visual: 'persegi hijau bergambar tiga orang dan empat panah di sudutnya',
  },
  {
    id: 'jalur-evakuasi',
    art: 'jalur-evakuasi',
    place: 'papan',
    kind: 'petunjuk',
    name: 'Jalur Evakuasi',
    meaning: 'Papan ini menunjukkan jalan keluar ke tempat aman.',
    tip: 'Saat darurat, ikuti panahnya menuju pintu keluar.',
    visual: 'persegi panjang hijau bergambar orang berlari ke pintu dan panah besar',
  },
]

/**
 * Rambu yang berdiri di trotoar dan bisa ditemui sambil berjalan. Papan
 * petunjuk tidak ikut: bentuknya bukan pelat persegi, dan `SIGN_BOX` jalan
 * hanya punya satu lebar.
 */
export const STREET_SIGNS = SIGNS.filter((sign) => sign.place === 'jalan')

/**
 * Kuis awal jalur Belajar: lima soal pilihan ganda.
 *
 * `answer` adalah **indeks asli** opsi di array `options`. Urutan tampil di
 * layar diacak per seed oleh `Kuis.tsx`; karena itu kunci jawaban tidak pernah
 * dibaca sebagai posisi huruf (dulu 4 dari 5 soal berjawab A).
 *
 * `signId` merujuk `SIGNS` (bukan rambu studi kasus). `q5` sengaja tanpa
 * `signId`: soalnya tentang jenis rambu, jadi tidak ada satu gambar yang
 * diwakilinya.
 */
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
    prompt: 'Rambu ini memberi tahu apa?',
    signId: 'peringatan-penyeberangan',
    options: ['Di depan ada penyeberangan', 'Dilarang parkir', 'Wajib belok kiri'],
    answer: 0,
    why: 'Belah ketupat kuning artinya peringatan. Di depan ada tempat menyeberang, jadi kendaraan harus pelan.',
  },
  {
    id: 'q2',
    prompt: 'Rambu ini artinya apa?',
    signId: 'dilarang-putar-balik',
    options: ['Dilarang putar balik', 'Tempat parkir', 'Wajib jalan terus'],
    answer: 0,
    why: 'Bulat bertepi merah artinya larangan. Panah berbalik arah yang dicoret berarti tidak boleh putar balik.',
  },
  {
    id: 'q3',
    prompt: 'Rambu ini memberi tahu apa?',
    signId: 'peringatan-lampu',
    options: ['Tempat berhenti', 'Akan ada lampu lalu lintas', 'Dilarang masuk'],
    answer: 1,
    why: 'Gambar lampu tiga warna di belah ketupat kuning: sebentar lagi ada lampu lalu lintas.',
  },
  {
    id: 'q4',
    prompt: 'Rambu ini memerintahkan apa?',
    signId: 'belok-kanan',
    options: ['Wajib belok kanan', 'Wajib belok kiri', 'Dilarang belok'],
    answer: 0,
    why: 'Bulat biru artinya perintah. Panahnya menunjuk ke kanan, jadi kendaraan wajib belok kanan.',
  },
  {
    id: 'q5',
    prompt: 'Rambu berbentuk persegi panjang hijau termasuk jenis apa?',
    options: ['Petunjuk', 'Peringatan', 'Perintah'],
    answer: 0,
    why: 'Persegi hijau berarti petunjuk arah atau tempat. Peringatan belah ketupat kuning, perintah bulat biru.',
  },
]
