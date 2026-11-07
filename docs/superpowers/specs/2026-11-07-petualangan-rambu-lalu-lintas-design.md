# Petualangan Rambu Lalu Lintas — Design Spec

Status: **draf; keputusan produk sudah diambil (§16)**
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
- **Konteks pakai:** perangkat utama adalah **ponsel yang dipegang satu anak**
  (1 anak : 1 ponsel, potret 360×640, sesi 10–15 menit). Konteks sekunder adalah
  kelas dengan guru mendampingi dan mengawasi; lab komputer/Chromebook masih
  didukung, tetapi proyektor bukan target desain — keputusannya ada di §16.3.
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
4. **Target perangkat (mobile-first):** 1 anak 1 ponsel, baseline potret 360×640.
   Lanskap 1024×600 s.d. 1366×768 (lab/proyektor) tetap harus jalan. Sentuh dan
   tetikus dua-duanya harus jalan. Alasan keputusan ada di §16.
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
| `walk` | `WalkScene` | Jalan 2.5D dari sudut pandang anak; marka & objek bergerak ke arah kamera; hero terlihat dari belakang; 3 rambu berhenti di zona stop; tiap rambu ditekan → lembar arti | setelah rambu ke-3 |
| `crossroad` | `Crossroad` | Dua cabang jalan; *Jalur Materi* (6 rambu) / *Jalur Kuis* (5 soal) | klik cabang |
| `materi` | grid di `App.tsx` | 6 kartu rambu, tiap kartu buka lembar arti | tombol "Sudah paham, coba kuis" |
| `kuis` | `Quiz` di `App.tsx` | 5 soal, feedback benar/salah + alasan | soal terakhir |
| `home` | `App.tsx` | Rumah, lencana, skor, bintang, tombol main lagi | tombol |

**Catatan penting:** jalur materi **wajib** berujung ke kuis (jalan satu arah menuju
rumah), sedangkan jalur kuis menyelesaikan perjalanan langsung. Perbedaan ini
sudah tercermin di layar rumah (lihat §11, T1).

### 7.1 Scene berjalan 2.5D (`WalkScene`)

Kamera tidak pernah berpindah dan hero tidak berjalan di layar. Yang bergerak adalah
dunianya: `scroll` bertambah `SCROLL_PER_SEC = 0.55` satuan kedalaman per detik
(`src/scene/world.ts:11`), lalu marka, pohon, rumah, dan rambu dihitung ulang dari
`src/scene/projection.ts` setiap frame. Ini gerak *treadmill*: anak merasa berjalan
karena jalan datang ke arahnya, bukan karena ada tiga potongan adegan yang di-crossfade
seperti versi prototipe dulu.

- **Dua mode, satu reducer.** `walking` dan `stopped` (`src/scene/world.ts:19`).
  Satu leg berjalan `LEG_SECONDS = 3.6` detik, lalu reducer murni `stepWorld`
  membekukan `scroll` dan mengubah mode menjadi `stopped`. Menutup lembar rambu
  memajukan `step`, yang memulai leg berikutnya dari `createWorld` baru.
- **Zona stop tetap.** Rambu aktif selalu berhenti di kedalaman
  `SIGN_STOP_D = 0.18` dan lajur `SIGN_LANE = -0.35` (`src/WalkScene.tsx:42-45`),
  jadi tidak ada kamera yang mengejar rambu. Selama `walking`, tombol rambu
  `disabled` dan `aria-hidden`; saat `stopped` ia muncul di zona itu dan bisa ditekan
  (`src/WalkScene.tsx:628-641`). Target sentuhnya ≥ 56 px
  (`.wk-sign` `width: clamp(72px, 19vw, 96px)` + tiang).
- **Hero dari belakang.** `HeroWalk` menggambar punggung seragam, rok, tas, dan
  kuncir, bukan wajah (`src/art/HeroWalk.tsx:1-11`). Pose `walk`/`idle` mengikuti
  mode; langkahnya dua fase (`hw-step-a`/`hw-step-b`) dengan `--cycle` 1,1 detik.
- **Trafik dan pejalan tetap hidup saat berhenti.** Maksimal 3 kendaraan dan 2
  pejalan bersamaan, dijadwalkan spawner ber-seed (`SPAWN_SEED`). Loop yang sama
  memanggil `stepAmbience(dt)` **di luar** `stepWorld`, jadi kendaraan dan pejalan
  terus lewat walaupun dunia sedang `stopped` di rambu
  (`src/WalkScene.tsx:485-515`). Lalu lintas mengikuti lajur kiri Indonesia:
  `laneL` menjauh (searah hero), `laneR` mendatangi kamera
  (`src/scene/spawner.ts:19-32`).
- **Reduced motion tidak menghapus rambu.** Dengan
  `prefers-reduced-motion: reduce`, dunia langsung `stopped` untuk tiap `step`,
  tanpa loop dan tanpa kendaraan/pejalan; rambu tetap bisa ditekan.

### 7.2 Lembar arti rambu (overlay)

Dipakai dua tempat (saat berjalan dan saat materi) — `SignSheet` di `src/App.tsx:34`:

```
[ gambar rambu ]
[ chip jenis: Rambu Peringatan · segitiga ]
( avatar anak ) ( h4: nama rambu
                  p : arti )
[ tip singkat ]
[ tombol CTA ]
```

Alasan memakai balon percakapan dengan avatar anak: rambu dijelaskan **oleh tokoh
yang sama** yang ditemui anak di tiap adegan, sehingga terasa seperti teman yang
berbicara, bukan kotak info teknis.

Lembar hanya ditutup lewat CTA atau `Escape`; ketukan di latar tidak menutup. Di
jalur walk, menutup berarti maju ke rambu berikutnya dan rambu itu tidak bisa
dikunjungi lagi, jadi ketukan jempol di area latar tidak boleh menjadi keputusan.

---

## 8. Baseline: apa yang sudah ada

Prototipe berjalan dan mencakup keenam stage. Scene berjalan sudah diganti versi 2.5D
lewat Task 1–10 plan `2026-11-07-walk-scene-2.5d.md`. Teks Task 5 plan
(`2026-11-07-walk-scene-2.5d.md:275-276`) menyebut arah lajur yang **berlawanan**
dengan kode terkirim: `src/scene/spawner.ts:27-32` adalah otoritasnya (`laneL`
menjauh, `laneR` mendatangi kamera), dan plan sudah tersuperseded di titik itu.
Verifikasi setelah fix wave `3e71e9c`:
`pnpm test` **6 file / 55 test hijau**, `tsc -b` exit 0, dan `vite build` sukses —
**33 modul**, JS 290,57 kB / **gzip 85,00 kB**, CSS 30,95 kB / gzip 7,84 kB,
HTML 0,79 kB / gzip 0,43 kB. Gzip JS masih di bawah batas G5 (< 120 kB).

| File | Peran | Catatan |
|------|-------|---------|
| `src/main.tsx` | bootstrap React 19 + StrictMode | 10 baris |
| `src/App.tsx` | state machine 6 stage + `Quiz` + layar `materi` + `home` + `SignSheet` | 367 baris |
| `src/data.ts` | sumber data tunggal: `KINDS`, 6 `SIGNS`, 5 `QUESTIONS`, `WALK_SIGNS` | 131 baris |
| `src/Classroom.tsx` + `classroom.css` | adegan kelas (SVG meja, papan, jendela, rak, jam, peta) | 614 / 473 baris |
| `src/Crossroad.tsx` + `crossroad.css` | adegan persimpangan 2 cabang | 66 / 308 baris |
| `src/WalkScene.tsx` | adegan berjalan 2.5D: satu loop rAF, `LAYOUT`, rambu, HUD | 677 baris |
| `src/walk.css` | CSS scene berjalan (`wk-`), hero (`hw-`), pejalan (`wk-ped-`) | 646 baris |
| `src/scene/projection.ts` | geometri murni: `HORIZON`, `DEPTH_K`, `ROAD_HALF`, `WALK_W`, `LANES`, `scaleAt`, `yAt`, `xAt`, `fadeAt`, `nearFadeAt`, `roadHalfAt`, `walkHalfAt` | 79 baris |
| `src/scene/world.ts` | reducer murni `stepWorld` untuk mode `walking`/`stopped` | 65 baris |
| `src/scene/GroundScene.tsx` | lapisan tanah statis (langit, bukit, verge, trotoar, jalan, garis tepi) dari proyeksi | 113 baris |
| `src/scene/spawner.ts` | RNG mulberry32 + penjadwal trafik/pejalan | 110 baris |
| `src/art/HeroWalk.tsx` | hero dari belakang, dua pose (`walk`/`idle`) | 175 baris |
| `src/art/scenery.tsx` | 9 objek jalan: rumah, ruko, pohon, lampu, pagar, tong, bangku, halte, tiang listrik | 326 baris |
| `src/art/vehicles.tsx` | `Car` + `Motorcycle`, masing-masing menghadap depan/belakang | 277 baris |
| `src/art/people.tsx` | `Pedestrian` dewasa/anak, depan/belakang | 292 baris |
| `src/Kid.tsx` | tokoh utama (SVG) untuk kelas, persimpangan, dan avatar lembar | 80 baris |
| `src/SignArt.tsx` | 6 gambar rambu sebagai SVG, satu `Record<Art, ReactNode>` | 115 baris |
| `src/index.css` | token warna + tombol + shell + materi + kuis + home + overlay | 951 baris |

Test (vitest + jsdom, 6 file / 55 test): `src/flow.test.tsx` (236 baris),
`src/scene/projection.test.ts` (151), `src/scene/spawner.test.ts` (140),
`src/scene/GroundScene.test.tsx` (86), `src/art/HeroWalk.test.tsx` (79),
`src/scene/world.test.ts` (74), plus `src/test/setup.ts` (7).

Yang sudah terbukti enak di prototipe ini dan layak dipertahankan:

- **Satu file data.** Menambah *soal* = mengedit `data.ts` saja. Menambah *rambu*
  dengan gambar baru butuh dua file: `data.ts` (entri) dan `SignArt.tsx` (`Art`
  adalah union tertutup, `ART` di `SignArt.tsx:30`). `WALK_SIGNS` juga posisional
  (`SIGNS.slice(0, 3)`), jadi menyisipkan rambu ikut mengubah tiga rambu yang
  dilewati saat berjalan — hal yang perlu disadari sebelum fase B.
- **Proyeksi jalan** (`src/scene/projection.ts`): skala objek dan tepi jalan
  dihitung dari kedalaman yang sama, jadi marka, pohon, rambu, dan trotoar
  konsisten menyusut ke titik hilang. Ini efek "berjalan" paling murah yang bisa
  dibuat tanpa gambar.
- **Dunia deterministik.** `LAYOUT` berisi 10 penempatan tetap (bukan acak) dan
  spawner memakai `SPAWN_SEED`, jadi dua kali main di leg yang sama menunjukkan
  jalan dan pemeran yang sama — enak untuk review dan untuk test.
- **Semua CSS per-adegan berprefix** (`cr-`, `fx-`, `wk-`, `hw-`, `wk-ped-`), jadi
  tidak bentrok.

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
   pendek (`.screen`, `animation: screenIn 0.5s`, `index.css:77`); tidak ada animasi
   *keluar* — adegan lama langsung hilang. Di perangkat lambat ini lebih baik
   daripada crossfade panjang, tetapi animasi masuk itu tetap harus tunduk pada
   `prefers-reduced-motion` (lihat T5).

### 9.1 Konvensi scene berjalan (mengikat perubahan berikutnya)

1. **Satu loop `requestAnimationFrame` + reducer murni.** `WalkScene` memiliki
   satu loop (`src/WalkScene.tsx:489-544`). Tiap frame ia memanggil
   `stepWorld(state, dt)` yang murni (`src/scene/world.ts:44`), lalu menulis
   `style.transform`/`opacity` lewat ref; tidak ada `setState` per frame dan tidak
   ada pembacaan layout (`getBoundingClientRect`, `offsetTop`) di dalam loop.
   Satu frame dibatasi `MAX_FRAME_SECONDS = 0.1` supaya frame yang tersendat tidak
   melompati satu leg; loop berhenti saat `document.hidden`.
2. **Art kit di `src/art/`, bukan aset biner.** `HeroWalk` (hero), `scenery.tsx`
   (objek jalan), `vehicles.tsx`, dan `people.tsx` adalah komponen SVG murni.
   Prefix kelas: `wk-` untuk scene, `hw-` untuk hero, `wk-ped-` untuk pejalan;
   scenery/kendaraan diwarnai pembungkus `.wk-prop`/`.wk-veh`. Palet hanya token
   `index.css` (atau `color-mix` turunannya).
3. **Geometri selalu dari `src/scene/projection.ts`.** Keduanya memakai
   `scaleAt`/`xAt`/`yAt`; `GroundScene` menambah `HORIZON`/`roadHalfAt`/
   `walkHalfAt`, `WalkScene` menambah `fadeAt`/`nearFadeAt`/`LANES`. Tidak ada angka
   perspektif yang ditulis ulang di komponen atau CSS. Karena `yAt` linear terhadap
   `scaleAt`, tepi jalan cukup satu poligon lurus antara kedalaman 0 dan 1.
4. **Tanpa `filter`/`blur` di scene.** Tidak ada `filter`, `backdrop-filter`, atau
   `blur()` di `walk.css` maupun art kit; bayangan digambar sebagai `<ellipse>`
   SVG atau `box-shadow`. Jumlah objek beranimasi dijaga: 8 marka + 10 prop +
   3 kendaraan + 2 pejalan (≤ 30).
5. **Mobile-first.** Baseline layout adalah potret 360×640; `walk.css` tidak
   memakai media query lebar sama sekali (hanya `prefers-reduced-motion`), dan
   `index.css` menyesuaikan ukuran lewat `clamp()`. `classroom.css` dan
   `crossroad.css` masih membawa media query `max-width` warisan lama dan tidak
   diubah di fase ini.
6. **Dunia deterministik.** `LAYOUT` di `WalkScene` adalah tabel tetap 10
   penempatan, dan spawner memakai `SPAWN_SEED`; jangan mengganti salah satunya
   dengan `Math.random()` tanpa memperbarui test dan catatan review.

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
- Aturan bentuk-warna yang berlaku: peringatan **segitiga kuning**, larangan
  **bulat merah**, perintah **bulat biru**, petunjuk **persegi biru**. Perintah
  dan petunjuk sama-sama biru; bentuknya yang membedakan, sesuai keputusan
  controller pada fix wave `3e71e9c`. Rambu petunjuk di jalan memang biru, bukan hijau.

---

## 11. Celah & cacat yang ditemukan (dengan bukti)

Status per 2026-11-07 setelah Task 1–10 dan fix wave `3e71e9c`. ✅ = tertutup,
⚠️ = sebagian, tanpa tanda = masih terbuka. Nomor T dipertahankan supaya rujukan
lama tetap sah; T3 sudah dicabut dan keputusannya ada di §16.

**✅ T1 — Teks layar rumah selalu salah satu versi.** Dulu `App.tsx` menyetel
`via = 'materi'`, lalu menimpanya jadi `'kuis'` sebelum pindah ke `home`, sehingga
cabang `via === 'materi'` tidak pernah tampil. Selesai di `4a873ad`: `via` sekarang
hanya ditulis sekali saat meninggalkan `crossroad` (`src/App.tsx:206-213`) dan dibaca
apa adanya di layar rumah (`src/App.tsx:271-275`). `src/flow.test.tsx:198` mengunci
teks jalur materi.

**✅ T2 — ±433 baris kode mati.** Dulu `StreetScenery.tsx` + `street.css` tidak
diimpor siapa pun, dan `index.css` menyimpan blok `.fork*` tanpa JSX pemakai. Selesai
di `4a873ad`: semuanya dihapus bersama `WALK_X`. Verifikasi:
`grep -rn "StreetScenery\|street.css\|WALK_X\|\.fork" src/` kosong.

**✅ T4 — Kendali aksesibilitas overlay belum ada.** Dulu `SignSheet` hanya menutup
lewat klik latar, tanpa `Escape`, tanpa fokus masuk, dan tanpa menahan Tab. Selesai di
`4a873ad` (dialog + fokus + Tab) dan `e6d7241` (Escape/Tab lewat listener `document`,
fokus kembali ke pemicu): `role="dialog"`, `aria-modal="true"`, `Escape`, fokus ke CTA,
restore `document.activeElement`, dan Tab dikurung (`src/App.tsx:34-102`). Fix wave
`3e71e9c` menambahkan dua hal: latar tidak lagi menutup lembar, dan di jalur walk fokus
tidak dipulihkan ke rambu yang sedang dinonaktifkan — lihat T13.

**✅ T5 — `prefers-reduced-motion` baru separuh.** Dulu hanya `classroom.css` dan
`street.css` yang punya guard, sementara `journey.css`, `index.css`, dan
`crossroad.css` belum. Selesai di `b80c1d0`: guard `@media (prefers-reduced-motion:
reduce)` di `index.css` mematikan animasi tanpa henti `drift`, `bob`, dan `pulse`,
dan guard di `crossroad.css` mematikan `fx-bob`; semua animasi berulang scene baru
sudah dijaga di `walk.css` — hero `:205` (`ac5c4ae`), rambu `:466` (`c30af0a`),
pejalan `:634` (`9d0a9e4`). `journey.css`/`street.css` sudah tidak ada. Diverifikasi
ulang pada fix wave `3e71e9c`; DoD §14.5 terpenuhi.

**✅ T6 — Tidak ada test sama sekali.** Dulu tidak ada runner maupun smoke test.
Selesai: vitest + jsdom (`aac63b4`), lalu 6 suite / 55 test (termasuk test batas
4/5 dan test fokus/backdrop pada fix wave ini) — flow (`21b78a1`), projection
(`aac63b4`), GroundScene (`2397d0c`), HeroWalk (`ac5c4ae`), world (`c30af0a`),
spawner (`9d0a9e4`). `pnpm test` hijau.

**✅ T7 — Parameter dev ikut ke produksi.** `?s=`, `?step=`, `?still` dulu selalu
dibaca. Selesai di `4a873ad`: ketiganya hanya aktif bila `import.meta.env.DEV`
(`src/App.tsx:112-124`), sehingga build produksi selalu mulai dari `intro`.

**T8 — Font dari CDN.** `Fredoka` + `Nunito` masih diambil dari Google Fonts
(`index.html:8-14`). Kalau jaringan sekolah memblokir atau lambat, seluruh tampilan
berubah bentuk karena dua font ini yang membentuk karakter visualnya. Opsi: self-host
(2 file woff2) atau sediakan fallback yang sudah diuji. **Belum dikerjakan**; masih
relevan sebelum dipakai di kelas offline.

**✅ T9 — Skor bintang tidak teruji.** Ambang `score >= 4` / `>= 2` dipertahankan
(keputusan pedagogis, §13/§16) dan sekarang dikunci test: 5/5 → Bintang 3, 4/5 →
Bintang 3 (tepat di ambang), 3/5 → Bintang 2, 0/5 → Bintang 1
(`src/flow.test.tsx:134-183`, commit `21b78a1`; test batas 4/5 menyusul).

**✅ T10 — `WALK_X` tidak terpakai.** Konstanta sisa tata letak lama dihapus di
`4a873ad`; tidak ada lagi referensi di `src/`.

**✅ T11 — Aturan "bentuk & warna → jenis" tidak pernah diajarkan, dan satu `why`
menyalahinya.** Dulu `KINDS[].shape` ada di `data.ts:22-25` tetapi tidak dirender,
dan `why` q5 (`data.ts:126`) menulis "petunjuk berwarna biru atau hijau" sementara
`KINDS` memetakan biru → `perintah` dan hijau → `petunjuk`. Selesai di `b80c1d0`
(baris `Bentuk: …` dirender dari `KINDS`) dan dikoreksi di `3e71e9c`: controller
memutuskan rambu petunjuk adalah **persegi biru** (bukan hijau), jadi
`KINDS.petunjuk` sekarang `#2E7BE0` / `persegi biru`, `why` q5 berbunyi "perintah
bulat biru, dan petunjuk persegi biru", dan `src/flow.test.tsx:101` memakai literal
`'Bentuk: persegi biru'` untuk rambu zebra (bukan turunan `KINDS` yang bisa ikut
salah). Ini menyentuh G2 langsung: aturan bentuk-warna adalah inti materi.

**✅ T12 — `journey.css` tidak punya media query sama sekali.** Dulu adegan berjalan
memakai koordinat desktop-first (`50 + 31·s`%, `50 ± 46·s`%) tanpa media query.
`journey.css` sudah tidak ada (dihapus di `c30af0a`); penggantinya `walk.css`
mobile-first dengan baseline 360×640 dan tanpa media query lebar. Posisi rambu/hero dihitung `xAt`/`yAt` dari
proyeksi dan lebarnya `clamp`, jadi tidak ada lagi elemen yang dipatok ke persentase
layar lebar. Verifikasi visual 360×640 tetap bagian dari DoD §14.1.

**✅ T13 — Fokus hilang ke `<body>` setiap lembar walk ditutup.** Dulu `SignSheet`
memulihkan `document.activeElement` di cleanup, tetapi langkah walk berikutnya sudah
menonaktifkan rambu pemicu, sehingga `.focus()` gagal dan fokus jatuh ke `<body>`
(tiga kali per run). Selesai di `3e71e9c`: jalur walk memakai wadah `.wk-scene`
(`tabIndex={-1}`) sebagai fokus cadangan, lalu memindahkannya ke rambu berikutnya
begitu rambu itu aktif (`src/WalkScene.tsx:490-497`); lembar ketiga memfokuskan judul
persimpangan (`src/Crossroad.tsx:12-17`). Materi tetap kembali ke kartu pemicu.
Diverifikasi dengan `Escape` sungguhan di Chromium 360×640.

---

## 12. Pendekatan untuk fase berikutnya

Prototipe sudah menutup seluruh alur, dan arah A sudah dijalankan lewat plan 2.5D:
scene berjalan diganti dan T1, T2, T4, T5, T6, T7, T9, T10, T11, T12, T13 tertutup.
Yang tersisa bukan "bangun dari nol", tapi memilih ke mana tenaga diarahkan. Tiga
arah yang realistis:

**A. Rampungkan & verifikasi (hampir selesai).**
Sisa arah A: T8 (font CDN), lalu uji ke beberapa anak/guru. Cakupan:
sedikit kode baru, banyak penguatan. Hasilnya versi yang **layak dipakai di kelas**
dan bisa dinilai apa adanya.
*Trade-off:* tidak menambah materi baru; jumlah rambu tetap 6.

**B. Perluas konten (rambu & soal).**
Tambah rambu (petunjuk arah, dilarang berhenti, lampu lalu lintas, marka), tambah
soal, mungkin bank soal acak agar bisa diulang tanpa hafal urutan.
*Trade-off:* menambah beban baca dan durasi sesi; tanpa sisa A, cacat T8 ikut
terbawa ke lebih banyak layar. Bank soal acak juga menuntut penulisan `why` yang
tetap masuk akal untuk kombinasi mana pun.

**C. Generalisasi jadi "engine adegan".**
Ubah `stage` jadi larik adegan berdata (`{ type: 'walk', signs: [...] }`) supaya
perjalanan bisa disusun ulang tanpa mengedit `App.tsx`.
*Trade-off:* paling mahal, dan keenam adegan saat ini sudah beda secara visual —
abstraksi sekarang kemungkinan besar cuma memindahkan kompleksitas. Baru masuk akal
kalau ada rencana beberapa tema/jalur berbeda.

**Rekomendasi: sisa A, lalu B.** Alasannya: alur dan scene yang sudah ada adalah
asetnya; cacat tersisa (font CDN) lebih murah ditutup sekarang daripada setelah
konten bertambah. Menambah 6 rambu lagi sebelum itu hanya memperbanyak permukaan yang harus
diperbaiki nanti.

---

## 13. Keputusan yang saya ambil sebagai builder (silakan dikoreksi)

- **Tetap Vite + React 19 tanpa router.** Adegan adalah state, bukan rute; ini yang
  membuat transisi terasa mulus dan sederhana.
- **Tetap inline SVG, tanpa pustaka animasi.** Proyeksi jalan dihitung sendiri;
  menambah `framer-motion` (~50 kB) tidak sepadan untuk enam adegan.
- **Tidak memakai satu latar jalan raya bersama untuk semua adegan.** Tiap adegan
  punya sudut pandang berbeda (dalam kelas, dari mata anak di trotoar, dari atas
  persimpangan); satu latar bersama akan memaksa kompromi. Latar jalan akhirnya
  hanya hidup di scene berjalan, dan konvensi paletnya tetap dipakai lintas CSS.
- **CSS per adegan, bukan satu file global.** Isolasi lewat prefix lebih murah
  daripada menyatukan 2.400 baris CSS.
- **Tidak ada penyimpanan progres di versi ini.** Perjalanan selesai dalam 10–15
  menit; menyimpan setengah jalan justru membingungkan saat dipakai bergantian.
  Lencana boleh disimpan nanti kalau guru memintanya.
- **T2 dibaca sebagai "hapus", bukan "selamatkan".** Tidak ada satu pun adegan yang
  sekarang memakai latar jalan raya bersama, dan memaksakannya ke `crossroad`/`home`
  berarti menata ulang dua adegan yang sudah jadi. Yang dipertahankan hanyalah
  konvensi palet yang sudah dipakai di semua CSS.
- **Teks yang dilihat anak boleh saya perbaiki, tanpa ronde persetujuan terpisah.**
  Setiap perubahan copy saya daftar di ringkasan perubahan supaya bisa dicek sekilas.
  Yang tidak saya ubah sendiri: nama resmi rambu, dan aturan bintang.
- **Batas layar: potret 360×640 sebagai baseline, lanskap 1024×600 tetap didukung.**
  360 dipilih karena itu lebar ponsel paling sempit yang realistis untuk target
  utama 1 anak 1 ponsel (§16); 390×844 tidak perlu diuji terpisah.
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
4. Overlay ditutup dengan CTA atau `Escape` (bukan ketukan latar), fokus masuk saat
   dibuka, lalu kembali ke pemicu (materi), ke rambu berikutnya/scene (walk), atau ke
   judul persimpangan saat walk selesai — tidak pernah ke `<body>` (T4, T13).
5. Seluruh animasi berulang berhenti di `prefers-reduced-motion` (T5).
6. Satu test otomatis untuk urutan stage + perhitungan skor; `pnpm test` hijau (T6).
7. Parameter `?s=/?step=/?still` hanya aktif di mode dev (T7).
8. Audio tidak dikerjakan dan teks janji suara sudah dihapus (keputusan §16).
9. Bundle JS gzip tetap < 120 kB. (Build 2026-11-07: 84,79 kB.)
10. **Siap diuji**, bukan sudah diuji: protokol uji anak, izin orang tua, dan
    pelaksanaannya di luar cakupan fase ini (§16). Kriteria lulusnya tetap: 3 anak
    kelas II SD bisa melewati tiap adegan tanpa dibantu guru, dinilai per anak dan
    per adegan.

---

## 15. Urutan kerja yang diusulkan (bahan untuk plan)

Status: butir 1, 2, 3, dan 5 sudah dieksekusi lewat plan 2.5D + fix wave `3e71e9c`;
butir 4 dibatalkan (§16). Butir 6 dan 7 masih relevan.

1. Perbaikan murah & aman: T1, T2, T7, T10. ✅
2. Aksesibilitas, gerak, dan layar sempit: T4, T5, T12. ✅ T4/T5/T12.
3. Koherensi materi bentuk-warna: T11 (render `KINDS[].shape`, samakan aturan warna
   di `why` q5). ✅ Selesai `b80c1d0` + `3e71e9c`.
4. ~~Konten suara~~ **dibatalkan**: tidak ada implementasi audio di fase ini (§16).
5. Test alur + skor (T6) — ditaruh setelah perilaku stabil supaya test tidak
   mengunci bug. ✅
6. Font & performa (T8) — **wajib** kalau kelas offline, opsional kalau online.
7. Uji pengguna (di luar cakupan fase ini), lalu putuskan B.

---

## 16. Keputusan yang sudah diambil (menggantikan pertanyaan terbuka)

Pemilik produk sudah menjawab empat pertanyaan lama; ditambah satu keputusan builder
soal ambang bintang. Keputusan berikut mengikat fase ini dan tidak perlu ditanyakan
ulang.

1. **Audio: dicabut, bukan ditunda.** Tidak ada tombol putar, narasi,
   `SpeechSynthesis`, atau file audio. Kalimat "Ada suara juga." sudah dihapus dari
   layar materi (`4a873ad`). Kalau nanti audio diminta, itu keputusan produk baru
   dengan cakupan baru.
2. **Distribusi: lokal saja (tanpa tunnel/deploy).** Target pakai adalah `pnpm dev`
   (Vite `--host 0.0.0.0 --port 5173`) di laptop; HP di LAN yang sama boleh membuka
   `http://<IP-laptop>:5173` untuk review. Tidak ada tunnel, deploy, URL produksi,
   atau backend di repo ini. `pnpm build` + `pnpm preview` hanya untuk memeriksa
   hasil build.
3. **Mobile-first, 1 anak : 1 ponsel.** Baseline potret 360×640, target sentuh
   ≥ 56 px; lanskap 1024×600–1366×768 tetap harus jalan tetapi bukan target desain
   utama. Tidak ada penyesuaian khusus proyektor.
4. **Uji anak di luar cakupan fase ini.** DoD §14.10 dibaca "siap diuji": tidak ada
   protokol uji, izin orang tua, atau putaran perbaikan setelah uji dalam tugas ini.
   Verifikasi yang sudah dikerjakan adalah test otomatis, `tsc -b`, `vite build`,
   dan pengecekan geometri headless. Review visual di ponsel sungguhan **belum**
   dikerjakan; itu tetap bagian dari DoD §14.1 dan tercatat sebagai utang di T12.
5. **Ambang bintang 4/2 dipertahankan.** Bintang 3 untuk 4–5 benar, Bintang 2 untuk
   2–3, Bintang 1 untuk 0–1. Batasnya dikunci `src/flow.test.tsx`: 5/5 → 3 bintang,
   4/5 → 3 bintang (tepat di ambang), 3/5 → 2 bintang, dan 0/5 → 1 bintang.
   Menaikkan ambang Bintang 3 menjadi `>= 5` sekarang menggagalkan test 4/5.

**Masih terbuka (pekerjaan, bukan pertanyaan produk):** T8 (font CDN — wajib kalau
kelas offline). T5, T11, dan T13 sudah tertutup di `b80c1d0` + fix wave `3e71e9c`; semuanya
dicatat di §11.
