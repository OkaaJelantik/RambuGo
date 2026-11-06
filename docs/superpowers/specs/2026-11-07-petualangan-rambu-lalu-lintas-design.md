# Petualangan Rambu Lalu Lintas — Design Spec

Status: **draf, menunggu persetujuan pemilik produk**
Tanggal: 2026-11-07
Repo: `/home/lann/Projects/Ina` (`petualangan-rambu`, Vite + React 19 + TypeScript)

---

## 1. Ringkasan

Media pembelajaran berbasis web untuk siswa kelas II SD, dibungkus sebagai **satu
perjalanan interaktif**, bukan halaman materi + halaman soal. Siswa mulai di dalam
kelas, keluar, berjalan menyusuri jalan sambil menemukan rambu, tiba di persimpangan
yang bercabang dua (jalur materi di kiri, jalur kuis di kanan), lalu melanjutkan
perjalanan pulang ke rumah dengan membawa lencana.

Yang membuatnya "petualangan" dan bukan "slide": **ruang yang bergerak** (perspektif
jalan dengan titik hilang), **objek yang bisa disentuh** (plat rambu yang harus
ditekan satu per satu), **titik keputusan** (memilih jalur di persimpangan), dan
**hadiah di ujung** (lencana + skor).

---

## 2. Untuk siapa, dan kenapa

- **Pengguna utama:** siswa kelas II SD (7–8 tahun), kemampuan membaca masih awal —
  teks harus pendek, kalimat sederhana, satu ide per kalimat.
- **Konteks pakai:** lab komputer sekolah / Chromebook / laptop dengan proyektor,
  guru mendampingi; kadang dibuka di ponsel guru sebagai contoh. Sesi 10–15 menit.
- **Masalah yang diserang:** rambu lalu lintas biasanya diajarkan sebagai daftar
  hafalan (gambar + nama). Anak mengingat labelnya tapi tidak tahu *kenapa* rambu
  itu ada dan *apa yang harus dia lakukan* saat melihatnya.
- **Kenapa sekarang:** materi ini ada di kurikulum (pendidikan lalu lintas /
  keselamatan diri) dan guru butuh media yang bisa langsung dipakai tanpa instalasi.

---

## 3. Goals

| # | Goal | Cara mengukur |
|---|------|---------------|
| G1 | Anak menyelesaikan seluruh perjalanan tanpa diarahkan guru | ≥ 90% sesi uji coba sampai layar rumah tanpa intervensi |
| G2 | Anak bisa menyebut **jenis** rambu (peringatan/larangan/perintah/petunjuk) dari bentuk & warnanya, bukan cuma namanya | jawaban benar pada soal kategori (q5) |
| G3 | Anak tahu **tindakan** yang harus dilakukan saat melihat rambu | kuis ≥ 3/5 benar pada percobaan pertama |
| G4 | Layar terasa seperti tempat, bukan halaman dokumen | tiap adegan punya langit/latar sendiri, tanpa navigasi teks "halaman 1/6" |
| G5 | Jalan di perangkat sekolah apa pun, termasuk yang lemah | first paint < 2 s di laptop 5 tahun; bundle JS gzip < 120 kB |

## 4. Non-goals

- Bukan LMS: tidak ada akun, login, nilai yang disimpan ke server, atau rekap guru.
- Bukan aplikasi mobile native; tetap web, satu halaman, tanpa backend.
- Tidak mengajarkan aturan lalu lintas formal untuk pengendara (SIM, prioritas
  persimpangan, marka jalan untuk mobil) — fokus pejalan kaki anak.

## 5. Anti-goals (gagal walau teknisnya jalan)

- **A1** Rasa "slide presentasi" — layar yang isinya cuma judul + daftar poin.
- **A2** Anak tertahan karena harus banyak membaca. Kalau satu layar butuh lebih dari
  ~25 kata untuk dimengerti, itu kegagalan desain.
- **A3** Rasa "kuis online" (progress bar generik, skor merah besar, "SALAH").
  Kesalahan harus diperlakukan sebagai informasi, bukan hukuman.
- **A4** Animasi yang membuat mabuk atau lambat di perangkat sekolah.

## 6. Constraints

1. **Tanpa backend, tanpa akun.** Semua state hidup di memori browser; muat ulang =
   mulai dari kelas. (Boleh ditambah `localStorage` untuk lencana, selama opsional.)
2. **Satu halaman, tanpa router.** Perpindahan adegan = state, bukan URL. Ini
   mempertahankan transisi antar adegan tanpa *flash* dan tanpa history entry.
3. **Aset wajib inline SVG / CSS.** Tidak ada file gambar biner: lebih kecil, tajam
   di semua DPI, dan bisa diwarnai lewat CSS.
4. **Target perangkat kelas:** layar lanskap 1024×600 s.d. 1366×768, plus potret
   ponsel 360×640 untuk guru. Sentuh dan tetikus dua-duanya harus jalan.
5. **Tanpa instalasi global** untuk pengembangan; dependensi lewat `pnpm` di repo.
6. **Bahasa:** seluruh teks antarmuka Bahasa Indonesia, ragam anak (bukan "silakan",
   bukan "peserta didik").

---

## 7. Alur (state machine)

Enam stage linear dengan satu percabangan. Sumber kebenaran: `src/App.tsx:9`.

```
intro ──"Keluar kelas"──▶ walk ──rambu ke-3──▶ crossroad ─┬─ Jalur Materi ─▶ materi ─┐
                                                          └─ Jalur Kuis ──▶ kuis ────┤
                                                                                    ▼
                                                                home ◀───────────────┘
                                                                  │ "Main lagi dari kelas"
                                                                  └──▶ intro (reset total)
```

| Stage | Komponen | Isi | Keluar lewat |
|-------|----------|-----|--------------|
| `intro` | `Classroom` | Ruang kelas; papan tulis "RAMBU LALU LINTAS"; tombol *Keluar kelas* | tombol |
| `walk` | `Journey` | Perspektif jalan; 3 rambu muncul berurutan; tiap rambu ditekan → lembar arti | setelah rambu ke-3 |
| `crossroad` | `Crossroad` | Dua cabang jalan; *Jalur Materi* (6 rambu) / *Jalur Kuis* (5 soal) | klik cabang |
| `materi` | grid di `App.tsx` | 6 kartu rambu, tiap kartu buka lembar arti | tombol "Sudah paham, coba kuis" |
| `kuis` | `Quiz` di `App.tsx` | 5 soal, feedback benar/salah + alasan | soal terakhir |
| `home` | `App.tsx` | Rumah, lencana, skor, bintang, tombol main lagi | tombol |

**Catatan penting:** jalur materi **wajib** berujung ke kuis (jalan satu arah menuju
rumah), sedangkan jalur kuis menyelesaikan perjalanan langsung. Perbedaan ini
seharusnya tercermin di layar rumah (lihat §11, T1).

### 7.1 Lembar arti rambu (overlay)

Dipakai dua tempat (saat berjalan dan saat materi) — `SignSheet` di `src/App.tsx:28`:

```
[ gambar rambu ]
[ chip jenis: Rambu Peringatan ]
( avatar anak ) ( h4: nama rambu
                  p : arti )
[ tip singkat ]
[ tombol CTA ]
```

Alasan memakai balon percakapan dengan avatar anak: rambu dijelaskan **oleh tokoh
yang sama** yang ditemui anak di tiap adegan, sehingga terasa seperti teman yang
berbicara, bukan kotak info teknis.

---

## 8. Baseline: apa yang sudah ada

Prototipe berjalan dan sudah mencakup keenam stage. Verifikasi 2026-11-07:
`tsc -b` bersih (exit 0), `vite build` sukses — 25 modul, JS 253 kB / gzip 77 kB,
CSS 29 kB / gzip 7,7 kB.

| File | Peran | Catatan |
|------|-------|---------|
| `src/main.tsx` | bootstrap React 19 + StrictMode | 10 baris |
| `src/App.tsx` | state machine 6 stage + `Quiz` + layar `materi` + `home` + `SignSheet` | 273 baris |
| `src/data.ts` | sumber data tunggal: `KINDS`, 6 `SIGNS`, 5 `QUESTIONS`, `WALK_SIGNS` | 131 baris |
| `src/Classroom.tsx` + `classroom.css` | adegan kelas (SVG meja, papan, jendela, rak, jam, peta) | 614 / 473 baris |
| `src/Journey.tsx` + `journey.css` | adegan berjalan; proyeksi 1D `proj(t)` untuk menskala objek | 163 / 398 baris |
| `src/Crossroad.tsx` + `crossroad.css` | adegan persimpangan 2 cabang | 55 / 290 baris |
| `src/Kid.tsx` | tokoh utama (SVG) dipakai di semua adegan | 80 baris |
| `src/SignArt.tsx` | 6 gambar rambu sebagai SVG, satu `Record<Art, ReactNode>` | 115 baris |
| `src/index.css` | token warna + tombol + grid materi + kuis + home + overlay | 974 baris |
| `src/StreetScenery.tsx` + `street.css` | latar jalan raya yang bisa dipakai ulang | **tidak dipakai** (lihat T2) |

Yang sudah terbukti enak di prototipe ini dan layak dipertahankan:

- **Satu file data.** Menambah *soal* = mengedit `data.ts` saja. Menambah *rambu*
  dengan gambar baru butuh dua file: `data.ts` (entri) dan `SignArt.tsx` (`Art`
  adalah union tertutup, `ART` di `SignArt.tsx:30`). `WALK_SIGNS` juga posisional
  (`SIGNS.slice(0, 3)`), jadi menyisipkan rambu ikut mengubah tiga rambu yang
  dilewati saat berjalan — hal yang perlu disadari sebelum fase B.
- **Proyeksi jalan** (`journey.css` + `proj()` di `Journey.tsx:19`): skala objek
  dihitung dari kedalaman, jadi marka, pohon, dan rambu konsisten menyusut ke
  titik hilang. Ini efek "berjalan" paling murah yang bisa dibuat tanpa gambar.
- **Semua CSS per-adegan berprefix** (`cr-`, `pv-`, `fx-`, `st-`), jadi tidak bentrok.

---

## 9. Arsitektur & konvensi (dipertahankan)

1. **State machine di satu tempat.** `App.tsx` memegang `stage`, `walked`, `open`,
   `materiOpen`, `via`, `score`. Adegan menerima callback (`onStart`, `onOpen`,
   `onMateri`, `onKuis`, `onDone`) dan tidak menyimpan state navigasi sendiri.
2. **Data-driven.** Tidak ada teks rambu yang ditulis langsung di JSX; semua lewat
   `SIGNS` / `QUESTIONS`. Kuis merujuk rambu lewat `signId`, bukan objek.
3. **Adegan = komponen + file CSS sendiri.** Tidak ada CSS-in-JS, tidak ada
   Tailwind. Token warna global (`--ink`, `--red`, `--yellow`, `--blue`, ...) ada di
   `index.css:1`, dan adegan boleh mendefinisikan variabel lokal berprefix.
4. **Gambar = komponen SVG**, bukan aset. `SignArt` memetakan `Art` → node React,
   jadi satu gambar rambu bisa dipakai di tiga ukuran berbeda tanpa file tambahan.
5. **Transisi antar adegan lewat React state.** Tiap adegan *masuk* dengan animasi
   pendek (`.screen`, `animation: screenIn 0.5s`, `index.css:74`); tidak ada animasi
   *keluar* — adegan lama langsung hilang. Di perangkat lambat ini lebih baik
   daripada crossfade panjang, tetapi animasi masuk itu tetap harus tunduk pada
   `prefers-reduced-motion` (lihat T5).

---

## 10. Model data

```ts
type Kind = 'peringatan' | 'larangan' | 'perintah' | 'petunjuk'
type Art  = 'anak' | 'zebra' | 'dilarang-masuk' | 'belok-kiri' | 'hati-hati' | 'dilarang-parkir'

type Sign = { id: string; art: Art; kind: Kind; name: string; meaning: string; tip: string }

type Question = {
  id: string
  prompt: string
  signId?: string   // kalau ada, gambar rambu ditampilkan di atas pertanyaan
  options: string[]
  answer: number
  why: string       // penjelasan setelah menjawab, benar maupun salah
}
```

Aturan konten yang sudah dipakai dan sebaiknya dipertahankan:

- `name` = nama rambu apa adanya ("Banyak Anak Menyeberang"); `meaning` = satu
  kalimat untuk anak; `tip` = satu kalimat *tindakan* ("Kendaraan harus pelan-pelan
  dan hati-hati.").
- Tiap soal punya `why`, dan `why` menjelaskan **jenis** rambu, bukan cuma
  mengulang jawaban benar. Aturan ini belum konsisten: 4 dari 5 soal memenuhinya;
  `q2` (`data.ts:103`) hanya menjelaskan zebra cross tanpa menyebut jenisnya.
- `WALK_SIGNS` = `SIGNS.slice(0, 3)` — tiga rambu pertama yang dilewati saat
  berjalan; sisanya baru muncul di jalur materi. Ini disengaja: anak sudah kenal
  tiga rambu sebelum masuk materi, jadi layar materi tidak terasa asing.

---

## 11. Celah & cacat yang ditemukan (dengan bukti)

Diurutkan dari yang paling mengganggu pengalaman anak.

**T1 — Teks layar rumah selalu salah satu versi.** `App.tsx:144` menyetel
`via = 'materi'`, lalu `App.tsx:162` menimpanya jadi `'kuis'` sebelum pindah ke
`home`. Akibatnya cabang `via === 'materi'` di `App.tsx:177` **tidak pernah** tampil;
anak yang belajar dulu tetap diberi tahu "Kamu berani mencoba kuis lebih dulu".
Perbaikan: `via` ditetapkan sekali saat meninggalkan `crossroad`, jangan ditimpa.

**T2 — ±433 baris kode mati.** `StreetScenery.tsx` (104) + `street.css` (269) tidak
diimpor siapa pun; hanya `StreetScenery.tsx:2` yang mengimpor `street.css`. Tambahan:
`index.css:488-537` berisi blok `.fork*` (~50 baris) sisa desain persimpangan versi
kartu, dan tidak ada JSX yang memakainya. Keputusan ada di §13: semuanya dihapus.

**T3 — Janji "ada suara" tidak ditepati.** `App.tsx:125` menulis "Klik rambu untuk
tahu artinya. Ada suara juga." Tidak ada audio sama sekali di repo. Untuk kelas II SD,
suara (nama + arti rambu dibacakan) adalah nilai tambah besar sekaligus jalan untuk
anak yang membaca masih lambat — tapi harus diputuskan: dikerjakan, atau teksnya
dihapus.

**T4 — Kendali aksesibilitas overlay belum ada.** `SignSheet` (`App.tsx:28`)
menutup lewat klik latar, tanpa `Escape`, tanpa fokus pindah ke dalam lembar, dan
tanpa menahan Tab. Untuk pemakaian di lab dengan keyboard, ini bikin anak "nyangkut"
di balik overlay.

**T5 — `prefers-reduced-motion` baru separuh.** Hanya `classroom.css:468` dan
`street.css:265`. `journey.css` punya animasi berulang (`pv-pulse`, `pv-spin`) tanpa
guard; `index.css` dan `crossroad.css` juga belum.

**T6 — Tidak ada test sama sekali.** Tidak ada runner, tidak ada smoke test. Untuk
proyek sekecil ini cukup satu jenis test: alur stage (intro → … → home) sebagai unit
test state, bukan E2E browser.

**T7 — Parameter dev ikut ke produksi.** `?s=`, `?step=`, `?still` (`App.tsx:61-71`)
memungkinkan lompat adegan. Berguna sekali untuk mengecek tampilan, tapi jangan
sampai anak menemukannya. Cukup dijaga di balik `import.meta.env.DEV`.

**T8 — Font dari CDN.** `Fredoka` + `Nunito` diambil dari Google Fonts
(`index.html`). Kalau jaringan sekolah memblokir atau lambat, seluruh tampilan
berubah bentuk karena dua font ini yang membentuk karakter visualnya. Opsi:
self-host (2 file woff2) atau sediakan fallback yang sudah diuji.

**T9 — Skor bintang tidak teruji.** Ambang `score >= 4` / `>= 2` di `App.tsx:191`
dipilih tanpa dasar; dengan 5 soal, 3 bintang hanya untuk 4–5 benar. Perlu keputusan
pedagogis, bukan teknis.

**T10 — `WALK_X` tidak terpakai** (`App.tsx:11`) — sisa pendekatan tata letak lama.

**T11 — Aturan "bentuk & warna → jenis" tidak pernah diajarkan, dan satu `why`
menyalahinya.** `KINDS[].shape` ("segitiga kuning", "bulat biru", "persegi hijau")
ada di `data.ts:22-25` tapi tidak pernah dirender di layar mana pun. Lebih jauh,
`why` q5 (`data.ts:126`) menulis "petunjuk berwarna biru atau hijau", sementara
`KINDS` memetakan biru → `perintah` dan hijau → `petunjuk`. Anak yang membaca
keduanya mendapat dua aturan berbeda untuk warna yang sama. Ini menyentuh G2
langsung: aturan bentuk-warna adalah inti materi, bukan hiasan.

**T12 — `journey.css` tidak punya media query sama sekali.** Empat adegan lain punya
(`classroom.css:357`, `crossroad.css:24`, `index.css:494`, `street.css:265`).
Adegan berjalan justru yang paling banyak menempatkan elemen di tepi layar (rambu di
`50 + 31·s`%, pohon di `50 ± 46·s`%), jadi di layar sempit atau potret rambu paling
kanan berisiko keluar frame.

---

## 12. Pendekatan untuk fase berikutnya

Prototipe sudah menutup seluruh alur. Yang tersisa bukan "bangun dari nol", tapi
memilih ke mana tenaga diarahkan. Tiga arah yang realistis:

**A. Rampungkan & verifikasi (rekomendasi).**
Tutup T1–T8, tambah smoke test alur, lalu uji ke beberapa anak/guru. Cakupan: sedikit
kode baru, banyak penghapusan dan penguatan. Hasilnya versi yang **layak dipakai di
kelas** dan bisa dinilai apa adanya.
*Trade-off:* tidak menambah materi baru; jumlah rambu tetap 6.

**B. Perluas konten (rambu & soal).**
Tambah rambu (petunjuk arah, dilarang berhenti, lampu lalu lintas, marka), tambah
soal, mungkin bank soal acak agar bisa diulang tanpa hafal urutan.
*Trade-off:* menambah beban baca dan durasi sesi; tanpa A dulu, cacat T1/T3 ikut
terbawa ke lebih banyak layar. Bank soal acak juga menuntut penulisan `why` yang
tetap masuk akal untuk kombinasi mana pun.

**C. Generalisasi jadi "engine adegan".**
Ubah `stage` jadi larik adegan berdata (`{ type: 'walk', signs: [...] }`) supaya
perjalanan bisa disusun ulang tanpa mengedit `App.tsx`.
*Trade-off:* paling mahal, dan keenam adegan saat ini sudah beda secara visual —
abstraksi sekarang kemungkinan besar cuma memindahkan kompleksitas. Baru masuk akal
kalau ada rencana beberapa tema/jalur berbeda.

**Rekomendasi: A, lalu B.** Alasannya: alur yang sudah ada adalah asetnya; cacat
yang tersisa semuanya murah diperbaiki dan langsung terasa oleh anak (teks rumah
yang salah, janji suara, overlay yang bikin nyangkut). Menambah 6 rambu lagi sebelum
itu hanya memperbanyak permukaan yang harus diperbaiki nanti.

---

## 13. Keputusan yang saya ambil sebagai builder (silakan dikoreksi)

- **Tetap Vite + React 19 tanpa router.** Adegan adalah state, bukan rute; ini yang
  membuat transisi terasa mulus dan sederhana.
- **Tetap inline SVG, tanpa pustaka animasi.** Proyeksi jalan dihitung sendiri;
  menambah `framer-motion` (~50 kB) tidak sepadan untuk enam adegan.
- **Tidak memakai `StreetScenery` sebagai latar semua adegan.** Tiap adegan punya
  sudut pandang berbeda (dalam kelas, dari mata anak di trotoar, dari atas
  persimpangan); satu latar bersama akan memaksa kompromi. Komponen itu dihapus,
  gayanya dipindahkan ke tempat yang benar-benar memakainya.
- **CSS per adegan, bukan satu file global.** Isolasi lewat prefix lebih murah
  daripada menyatukan 2.400 baris CSS.
- **Tidak ada penyimpanan progres di versi ini.** Perjalanan selesai dalam 10–15
  menit; menyimpan setengah jalan justru membingungkan saat dipakai bergantian.
  Lencana boleh disimpan nanti kalau guru memintanya.
- **T2 dibaca sebagai "hapus", bukan "selamatkan".** Tidak ada satu pun adegan yang
  sekarang memakai latar `StreetScenery`, dan memaksakannya ke `crossroad`/`home`
  berarti menata ulang dua adegan yang sudah jadi. Yang dipertahankan dari file itu
  hanyalah konvensi palet yang sudah dipakai di semua CSS.
- **Teks yang dilihat anak boleh saya perbaiki, tanpa ronde persetujuan terpisah.**
  Setiap perubahan copy saya daftar di ringkasan perubahan supaya bisa dicek sekilas.
  Yang tidak saya ubah sendiri: nama resmi rambu, dan aturan bintang.
- **Batas layar: lanskap 1024×600 dan potret 360×640.** 360 dipilih karena itu lebar
  ponsel paling sempit yang realistis dipakai guru; 390×844 tidak perlu diuji
  terpisah.
- **Ambang bintang (T9) tetap 4/2 di fase ini.** Ini keputusan pedagogis, bukan
  teknis; test hanya mengunci perilaku yang ada sekarang supaya perubahan nanti
  terlihat jelas di diff.

---

## 14. Definition of done (untuk arah A)

1. Alur intro → walk(3 rambu) → crossroad → materi/kuis → home berjalan tanpa error
   dan **tata letaknya utuh** (tidak ada elemen terpotong atau keluar frame) di
   Chromium dan Firefox, lanskap 1024×600 dan potret 360×640.
2. Teks layar rumah menyebut jalur yang benar-benar ditempuh (T1 tertutup).
3. Tidak ada modul, file CSS, maupun blok CSS yang tidak dirujuk JSX; `tsc -b` dan
   `vite build` bersih (T2, T10).
4. Overlay bisa ditutup dengan `Escape`, fokus masuk saat dibuka dan kembali ke
   pemicunya saat ditutup (T4).
5. Seluruh animasi berulang berhenti di `prefers-reduced-motion` (T5).
6. Satu test otomatis untuk urutan stage + perhitungan skor; `pnpm test` hijau (T6).
7. Parameter `?s=/?step=/?still` hanya aktif di mode dev (T7).
8. Keputusan eksplisit soal audio (T3): dikerjakan, atau teksnya dihapus.
9. Bundle JS gzip tetap < 120 kB.
10. Diuji pada 3 anak kelas II SD, dinilai **per anak dan per adegan** (lulus/tidak),
    bukan sebagai persentase: ketiganya bisa melewati tiap adegan tanpa dibantu guru.
    (Kalau uji ini bukan bagian dari pekerjaan yang diminta, butir ini keluar dari DoD
    dan diganti "siap diuji" — lihat §16.)

---

## 15. Urutan kerja yang diusulkan (bahan untuk plan)

1. Perbaikan murah & aman: T1, T2, T7, T10.
2. Aksesibilitas, gerak, dan layar sempit: T4, T5, T12.
3. Koherensi materi bentuk-warna: T11 (render `KINDS[].shape`, samakan aturan warna
   di `why` q5).
4. Konten suara: keputusan T3, lalu implementasi (`SpeechSynthesis` lebih dulu,
   file audio hanya kalau kualitasnya kurang).
5. Test alur + skor (T6) — ditaruh setelah perilaku stabil supaya test tidak
   mengunci bug.
6. Font & performa (T8) — **wajib** kalau kelas offline, opsional kalau online.
7. Uji pengguna, lalu putuskan B.

---

## 16. Pertanyaan terbuka untuk pemilik produk

Hanya empat ini yang benar-benar mengubah rencana; sisanya sudah saya putuskan di §13.

1. **Suara: dikerjakan atau teksnya dihapus?** Fork terbesar — audio menambah tombol
   putar di tiap lembar rambu, narasi nama/arti/tip, dan copy baru. Kalau dikerjakan:
   apakah **diam** dapat diterima di perangkat yang tidak punya suara Bahasa
   Indonesia (Chromebook sekolah sering begitu)? Dan cakupannya hanya lembar rambu,
   atau termasuk `why` di kuis — bagian yang justru mengajarkan G2/G3? (T3)
2. **Kelas saat dipakai online atau offline, dan disajikan sebagai apa?** Offline
   (atau jaringan yang memblokir `fonts.googleapis.com`) membuat T8 wajib: self-host
   dua `.woff2`, uji ulang tampilan di lima adegan, dan hasilnya harus bisa dibuka
   sebagai folder lokal, bukan URL. Online membuat T8 boleh ditunda dan rencana
   berhenti di langkah deploy — yang sekarang belum ada di repo. (T8)
3. **Satu anak satu perangkat, atau satu proyektor untuk kelas?** Proyektor berarti
   menaikkan ukuran teks dan tombol di seluruh adegan (satu lintasan di `index.css`
   plus empat CSS adegan) dan mengetatkan DoD #1 pada jarak pandang, bukan sekadar
   "tidak error". 1:1 berarti tidak ada pekerjaan desain tambahan. (§6.4)
4. **Uji ke anak: bagian dari pekerjaan ini atau milikmu?** Kalau milikmu, DoD #10
   berubah jadi "siap diuji" dan rencana berhenti di paket bukti (build + catatan
   pengujian). Kalau bagian pekerjaan ini, rencana perlu protokol uji, jalur izin
   orang tua, dan satu putaran perbaikan setelahnya.
