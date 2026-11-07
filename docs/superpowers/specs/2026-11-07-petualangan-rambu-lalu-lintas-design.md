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

Enam stage linear dengan satu percabangan. Sumber kebenaran: `src/App.tsx:12`.

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
| `walk` | `WalkScene` | Trotoar kiri 2.5D dari sudut pandang anak; jalan dipotong di tepi kanan; marka & objek bergerak ke arah kamera; hero terlihat dari belakang; 3 rambu berhenti di kerb; tiap rambu ditekan → lembar arti; panel cerita di bawah | setelah rambu ke-3 |
| `crossroad` | `Crossroad` | Dua cabang jalan; *Jalur Materi* (6 rambu) / *Jalur Kuis* (5 soal) | klik cabang |
| `materi` | grid di `App.tsx` | 6 kartu rambu, tiap kartu buka lembar arti | tombol "Sudah paham, coba kuis" |
| `kuis` | `Quiz` di `App.tsx` | 5 soal, feedback benar/salah + alasan | soal terakhir |
| `home` | `App.tsx` | Rumah, lencana, skor, bintang, tombol main lagi | tombol |

**Catatan penting:** jalur materi **wajib** berujung ke kuis (jalan satu arah menuju
rumah), sedangkan jalur kuis menyelesaikan perjalanan langsung. Perbedaan ini
sudah tercermin di layar rumah (lihat §11, T1).

### 7.1 Scene berjalan 2.5D (`WalkScene`)

Kamera tidak pernah berpindah dan hero tidak berjalan di layar. Yang bergerak adalah
dunianya: `scroll` bertambah `SCROLL_PER_SEC = 0.30` satuan kedalaman per detik
(`src/scene/world.ts:14`), lalu marka, pohon, rumah, dan rambu dihitung ulang dari
`src/scene/projection.ts` setiap frame. Ini gerak *treadmill*: anak merasa berjalan
karena jalan datang ke arahnya, bukan karena ada tiga potongan adegan yang di-crossfade
seperti versi prototipe dulu.

**Framing: trotoar kiri, jalan dipotong** (`fef4209`, `d6a1dc1`).

- Kamera berjalan di **trotoar kiri**. Satu-satunya trotoar yang digambar membentang
  dari `SIDEWALK_LEFT = -1,7 m` sampai `KERB_X = +0,3 m`; semua angka lateral diukur
  dalam meter dari garis kamera — negatif = sisi taman/rumah, positif = ke arah jalan
  (`src/scene/projection.ts:31-47`). Lebar trotoar `METERS.sidewalk = 2,0 m`
  (`src/scene/meters.ts:35`).
- Anak berjalan di `SIDEWALK_CENTRE = -0,7 m` (`src/scene/projection.ts:47`), yaitu
  **1,0 m dari kerb**, pada kedalaman `CAMERA_DEPTH = 0,12`
  (`src/scene/projection.ts:28`; `src/WalkScene.tsx:60`). Kamera sengaja duduk 0,7 m
  lebih dekat kerb daripada anak supaya jalan — hal yang diceritakan scene — mulai
  dekat tengah frame, bukan di tepi kanan.
- Rambu berdiri di **kerb yang sama**, `SIGN_X = KERB_X = +0,3 m`
  (`src/WalkScene.tsx:71`), dan berhenti di kedalaman `SIGN_STOP_D = 0,26`
  (`src/WalkScene.tsx:65`). Jadi plat berada 1,0 m di kanan anak dan sedikit di
  depannya: keduanya berbagi trotoar, tidak ada jalan yang harus diseberangi untuk
  melihat rambu. Pelat 0,60 m di atas tiang 2,0 m (`src/scene/meters.ts:45`); pada
  360×800 plat ±55 px, dan tombolnya dijaga ≥ 56 px (`src/walk.css:305-308`).
- **Sisi seberang tidak pernah digambar.** Jalan dicat dari `KERB_X` sampai
  `ROAD_FAR_X = 200 m` (`src/scene/projection.ts:54`) lalu dipotong tepi kanan frame;
  `GroundScene` hanya menggambar trotoar kiri, kerb, dan jalan itu
  (`src/scene/GroundScene.tsx:88-107`). Tidak ada poligon simetris dan tidak ada
  trotoar kanan.
- Jalan tetap jalan kampung: `LANE_M = METERS.lane = 2,4 m`, `ROAD_M = 4,8 m`, garis
  bagi `LANE_SPLIT_X = 2,7 m` (`src/scene/projection.ts:50-52`). Marka masuk frame
  mulai kedalaman ±0,41 dan lajur berlawanan (`LANES.laneR = 3,9 m`) mulai ±0,53;
  dengan lajur 3,5 m keduanya baru terlihat di kedalaman ≥ 0,70 dan tidak terbaca di
  ponsel 360 px (`src/scene/meters.ts:14-19`).

**Satu tabel meter** (`fef4209`, `0f7b454`).

Semua ukuran berasal dari `src/scene/meters.ts`. Tidak ada tinggi objek sebagai fraksi
tinggi viewport dan tidak ada lebar sebagai fraksi lebar viewport.
`pxPerM(vh) = clamp(vh, 640, 1000) × 0,185` — 148 px/m pada viewport 800 px
(`src/scene/projection.ts:107-109`); `pxAt(m, depth, vh)` mengubah meter ke piksel pada
sebuah kedalaman (`:117`), dan `offsetX` menaruh meter lateral ke layar (`:122`).
Tabelnya: anak 1,35; lajur 2,4; mobil lebar 1,8 (tinggi tergambar 1,01 dari
aspek art 90/160); motor lebar 0,7 (tinggi tergambar 0,62 dari aspek art 80/90);
pelat rambu 0,60 / tiang 2,0; rumah 6,5; ruko 4,0; pohon 3,5; tiang listrik 9,0;
halte 1,8; lampu 4,5; tong 0,9; bangku 0,85; pagar 1,2; orang dewasa 1,7; anak
pejalan 1,2 (`src/scene/meters.ts:22-69`). Tinggi mobil/motor sengaja **tidak**
menjadi kolom tabel: yang diukur adalah lebarnya, tingginya mengikuti aspek art
supaya roda tidak terpipihkan.

Satu catatan yang harus ikut terbaca: `METERS.child = 1,35` adalah **kotak seni** hero
(viewBox 140×260). Sosok yang tergambar mengisi y 24–235, jadi tinggi yang terlihat
±1,10 m. Ini didokumentasikan, bukan dinormalisasi: menumbuhkan hero agar tintanya
1,35 m akan mengubah seluruh framing yang sudah ditinjau tanpa mengubah satu objek
lain, dan menjadikan hero satu-satunya seni yang diukur dari tinta
(`src/scene/meters.ts:23-31`).

**Kecepatan.** Satu leg berjalan `LEG_SECONDS = 6,0` detik dengan
`SCROLL_PER_SEC = 0,30`, jadi satu leg menempuh 1,8 satuan kedalaman
(`src/scene/world.ts:14-17`). Angka lama 0,55 / 3,6 terlalu cepat untuk kelas II:
anak harus sempat melihat rambu sebelum dunia berhenti.

- **Dua mode, satu reducer.** `walking` dan `stopped` (`src/scene/world.ts:22`).
  Satu leg berjalan, lalu reducer murni `stepWorld` membekukan `scroll` dan mengubah
  mode menjadi `stopped`. Menutup lembar rambu memajukan `step`, yang memulai leg
  berikutnya dari `createWorld` baru.
- **Zona stop tetap.** Rambu aktif selalu berhenti di kerb pada kedalaman
  `SIGN_STOP_D = 0,26`, tidak ada kamera yang mengejar rambu. Selama `walking`, tombol
  rambu `disabled` dan `aria-hidden`; saat `stopped` ia muncul di zona itu dan bisa
  ditekan (`src/WalkScene.tsx:911-929`).
- **Hero dari belakang.** `HeroWalk` menggambar punggung seragam, rok, tas, dan
  kuncir, bukan wajah (`src/art/HeroWalk.tsx:1-11`). Pose `walk`/`idle` mengikuti
  mode; langkahnya dua fase (`hw-step-a`/`hw-step-b`) dengan `--cycle` 1,1 detik.
- **Trafik dan pejalan tetap hidup saat berhenti.** Maksimal 3 kendaraan dan 2
  pejalan bersamaan, dijadwalkan spawner ber-seed (`SPAWN_SEED`). Loop yang sama
  memanggil `stepAmbience(dt)` **di luar** `stepWorld`, jadi kendaraan dan pejalan
  terus lewat walaupun dunia sedang `stopped` di rambu
  (`src/WalkScene.tsx:768-800`). Lalu lintas mengikuti lajur kiri Indonesia:
  `laneL` menjauh (searah hero), `laneR` mendatangi kamera
  (`src/scene/spawner.ts:19-32`).
- **Reduced motion tidak menghapus rambu dan tidak memakan narasi.** Dengan
  `prefers-reduced-motion: reduce`, dunia langsung `stopped` untuk tiap `step`,
  tanpa loop dan tanpa kendaraan/pejalan; rambu tetap bisa ditekan. Karena dunia
  memang sudah berhenti sejak mount, kondisi itu **bukan** kejadian "berhenti" bagi
  App: `wasStoppedRef` mulai `true` (`src/WalkScene.tsx:453-455`), sehingga
  `onStop` tidak menimpa kalimat `leg-*` dengan beat `stop-*`
  (`src/WalkScene.tsx:759-766`).

### 7.2 Lembar arti rambu (overlay)

Dipakai dua tempat (saat berjalan dan saat materi) — `SignSheet` di `src/App.tsx:34`:

```
[ gambar rambu ]
[ chip jenis: Rambu Peringatan · segitiga ]
( avatar anak ) ( h4: nama rambu
                  p : pembuka Aku (kalau ada)
                  p : arti )
[ tip singkat ]
[ tombol CTA ]
```

Alasan memakai baris obrolan dengan avatar anak: rambu dijelaskan **oleh tokoh yang
sama** yang ditemui anak di tiap adegan, sehingga terasa seperti teman yang berbicara,
bukan kotak info teknis. Balon percakapan **di dalam scene** sudah dihapus (`0634832`);
suara Aku di jalan sekarang disampaikan panel bawah (§7.3), sedangkan lembar
"Apa ini?" tetap memakai avatar + pembuka naskah lewat `openingFor`
(`src/story.ts:137-146`; `src/App.tsx:129-137`).

Lembar hanya ditutup lewat CTA atau `Escape`; ketukan di latar tidak menutup. Di
jalur walk, menutup berarti maju ke rambu berikutnya dan rambu itu tidak bisa
dikunjungi lagi, jadi ketukan jempol di area latar tidak boleh menjadi keputusan.

### 7.3 Panel dialog bawah dan naskah

Balon percakapan di dalam scene sudah dihapus (`0634832`, `76ed157`); suara Aku
sekarang tinggal di panel tetap bawah layar (`src/DialoguePanel.tsx`). Sumber
ceritanya adalah `docs/superpowers/specs/2026-11-07-naskah-cerita.md`, dan
`src/story.ts` menerjemahkannya menjadi **11 beat** bertipe: `intro`, `leg-1`,
`stop-1`, `leg-2`, `stop-2`, `leg-3`, `stop-3`, `crossroad`, `materi`, `kuis`,
`home`. Naskah adalah otoritas kata; kode tidak boleh mengarang kalimat baru di JSX.
Satu catatan kecil: tabel peta adegan di naskah masih menulis tombol "Lanjut jalan"
pada baris `leg-*`, padahal "Catatan desain" di dokumen yang sama dan `story.ts`
menetapkan `leg-*` tanpa tombol; yang berlaku adalah catatan desain + kode.

- `leg-*` tampil otomatis dan hilang setelah `LEG_BEAT_MS = 3000` ms
  (`src/App.tsx:163,224-231`). Timer memakai updater fungsional supaya tidak
  menghapus beat stop yang sudah tampil.
- `stop-*` menunggu tombol: "Apa ini?" (`learn` → lembar) dan "Lanjut jalan"
  (`continue` → leg berikutnya). Tidak ada timer yang menghapusnya.
- `WalkScene` hanya melapor lewat prop: `onStop` saat mode berubah menjadi
  `stopped`, `onSignTap` saat plat ditekan; App yang memilih beat `stop-*`
  (`src/WalkScene.tsx:48-57,759-766,915-920`; `src/App.tsx:329-335`). Tidak ada
  `MutationObserver`, `querySelector` terhadap rambu, atau pembacaan atribut DOM
  untuk menebak state. `onSignTap` adalah jalur cadangan untuk reduced motion, saat
  dunia sudah `stopped` sejak mount.
- **Kontrak panel.** Wajah Aku 56 px; satu wilayah `role="status"`
  `aria-live="polite"` `aria-atomic="true"` yang **selalu terpasang** (hanya teksnya
  berganti); salinan visual `aria-hidden` supaya tidak dibaca dua kali; tombol
  `min-height: 48px`; panel `position: fixed` dengan `max-height: 34vh` dan
  `box-sizing: border-box`, padding bawah `env(safe-area-inset-bottom)` di dalam
  batas itu (`src/DialoguePanel.tsx:62-92`; `src/dialog.css:8-32,43-46,78-80`).
  Animasi masuk/keluar 180/160 ms dimatikan pada `prefers-reduced-motion`, dan pada
  mode itu panel langsung hilang (`src/DialoguePanel.tsx:50-56`;
  `src/dialog.css:152-159`).
- Di kelas panel **tidak digambar** (`src/App.tsx:463-466`) karena kartu kelas sudah
  memuat kalimat yang sama. `Classroom` mengimpor `INTRO_LINE` dari `story.ts`,
  bukan menyalinnya (`src/Classroom.tsx:3,610`; `src/story.ts:45-52`).
- Fokus tidak pernah jatuh ke `<body>`: sebelum tombol beat lepas, App memindahkan
  fokus ke target yang tetap terpasang (`.wk-scene`, judul rumah, judul materi, kartu
  kuis, judul kelas) lewat `useLayoutEffect` (`src/App.tsx:233-246`), dan "Lanjut
  jalan" memindahkannya sinkron ke `.wk-scene` sebelum state berubah
  (`src/App.tsx:262-267`).

---

## 8. Baseline: apa yang sudah ada

Prototipe berjalan dan mencakup keenam stage. Scene berjalan sudah memakai framing
trotoar kiri + satu tabel meter (Task 11), panel dialog + naskah (Task 12–13), dan
guard skala yang menggigit (Task 14). Teks Task 5 plan
(`2026-11-07-walk-scene-2.5d.md:275-276`) menyebut arah lajur yang **berlawanan**
dengan kode terkirim: `src/scene/spawner.ts:27-32` adalah otoritasnya (`laneL`
menjauh, `laneR` mendatangi kamera), dan plan sudah tersuperseded di titik itu.

Verifikasi ulang 2026-11-07 di `feat/walk-scene` (Task 15): `pnpm test`
**8 file / 134 test hijau**, `tsc -b` exit 0, dan `vite build` sukses — **37 modul**,
JS 296,72 kB / **gzip 87,10 kB**, CSS 32,76 kB / gzip 8,21 kB, HTML 0,79 kB /
gzip 0,42 kB. Gzip JS masih di bawah batas G5 (< 120 kB).

| File | Peran | Catatan |
|------|-------|---------|
| `src/main.tsx` | bootstrap React 19 + StrictMode | 10 baris |
| `src/App.tsx` | state machine 6 stage + `Quiz` + layar `materi`/`home` + `SignSheet` + `handleAction` | 547 baris |
| `src/story.ts` | data naskah: `INTRO_LINE`, 11 `STORY` beat, `SIGN_OPENINGS`, `beatById`/`openingFor` | 146 baris |
| `src/DialoguePanel.tsx` + `dialog.css` | panel bawah: wajah 56 px, live region, tombol beat | 95 / 200 baris |
| `src/data.ts` | sumber data tunggal: `KINDS`, 6 `SIGNS`, 5 `QUESTIONS`, `WALK_SIGNS` | 131 baris |
| `src/Classroom.tsx` + `classroom.css` | adegan kelas (SVG meja, papan, jendela, rak, jam, peta); lede memakai `INTRO_LINE` | 621 / 473 baris |
| `src/Crossroad.tsx` + `crossroad.css` | adegan persimpangan 2 cabang | 66 / 308 baris |
| `src/WalkScene.tsx` | adegan berjalan 2.5D: satu loop rAF, `LAYOUT`, rambu, HUD | 947 baris |
| `src/walk.css` | CSS scene berjalan (`wk-`), hero (`hw-`), pejalan (`wk-ped-`) | 607 baris |
| `src/scene/meters.ts` | satu tabel ukuran nyata semua objek, dalam meter | 70 baris |
| `src/scene/projection.ts` | geometri murni: `HORIZON`, `DEPTH_K`, `CAMERA_DEPTH`, `SIDEWALK_LEFT`, `SIDEWALK_CENTRE`, `KERB_X`, `LANE_M`, `LANE_SPLIT_X`, `ROAD_FAR_X`, `LANES`, `scaleAt`, `depthScale`, `pxPerM`, `pxPerMAt`, `pxAt`, `offsetX`, `spriteShare`, `yAt`, `fadeAt`, `nearFadeAt` | 158 baris |
| `src/scene/world.ts` | reducer murni `stepWorld` untuk mode `walking`/`stopped` | 68 baris |
| `src/scene/GroundScene.tsx` | lapisan tanah statis (langit, bukit, verge, trotoar kiri, jalan terpotong, garis kerb) dari proyeksi | 110 baris |
| `src/scene/spawner.ts` | RNG mulberry32 + penjadwal trafik/pejalan | 110 baris |
| `src/art/HeroWalk.tsx` | hero dari belakang, dua pose (`walk`/`idle`) | 175 baris |
| `src/art/scenery.tsx` | 9 objek jalan: rumah, ruko, pohon, lampu, pagar, tong, bangku, halte, tiang listrik | 326 baris |
| `src/art/vehicles.tsx` | `Car` + `Motorcycle`, masing-masing menghadap depan/belakang | 277 baris |
| `src/art/people.tsx` | `Pedestrian` dewasa/anak, depan/belakang | 292 baris |
| `src/Kid.tsx` | tokoh utama (SVG) untuk kelas, persimpangan, dan avatar lembar/panel | 80 baris |
| `src/SignArt.tsx` | 6 gambar rambu sebagai SVG, satu `Record<Art, ReactNode>` | 115 baris |
| `src/index.css` | token warna + tombol + shell + materi + kuis + home + overlay | 951 baris |

Test (vitest + jsdom, **8 file / 134 test**): `src/scene/scale.test.ts` (770 baris,
43 test — guard geometri), `src/flow.test.tsx` (425, 9), `src/scene/projection.test.ts`
(288, 40), `src/scene/spawner.test.ts` (140, 12), `src/story.test.ts` (119, 10),
`src/scene/GroundScene.test.tsx` (125, 7), `src/scene/world.test.ts` (74, 7),
`src/art/HeroWalk.test.tsx` (79, 6), plus `src/test/setup.ts` (7).

Yang sudah terbukti enak di prototipe ini dan layak dipertahankan:

- **Satu file data.** Menambah *soal* = mengedit `data.ts` saja. Menambah *rambu*
  dengan gambar baru butuh dua file: `data.ts` (entri) dan `SignArt.tsx` (`Art`
  adalah union tertutup, `ART` di `SignArt.tsx:30`). `WALK_SIGNS` juga posisional
  (`SIGNS.slice(0, 3)`), jadi menyisipkan rambu ikut mengubah tiga rambu yang
  dilewati saat berjalan — hal yang perlu disadari sebelum fase B.
- **Satu file naskah.** Semua kalimat cerita ada di `story.ts`; `story.test.ts:44-108`
  mengunci 11 beat, urutan, tombol baku, batas 2 kalimat / 90 karakter, dan ragam
  anak. Mengubah kata berarti mengubah data, bukan JSX.
- **Satu proyektor meter** (`src/scene/projection.ts`): skala objek dan tepi jalan
  dihitung dari kedalaman yang sama lewat `pxAt`/`offsetX`, jadi marka, pohon, rambu,
  dan trotoar konsisten menyusut ke titik hilang dan satu meter selalu sepanjang itu
  juga untuk semua objek. Ini yang membuat scene bisa diperiksa dengan angka.
- **Dunia deterministik.** `LAYOUT` berisi 10 penempatan tetap (bukan acak) dan
  spawner memakai `SPAWN_SEED`, jadi dua kali main di leg yang sama menunjukkan
  jalan dan pemeran yang sama — enak untuk review dan untuk test.
- **Semua CSS per-adegan berprefix** (`cr-`, `fx-`, `wk-`, `hw-`, `wk-ped-`, `dlg-`),
  jadi tidak bentrok.

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
   satu loop (`src/WalkScene.tsx:772-827`). Tiap frame ia memanggil
   `stepWorld(state, dt)` yang murni (`src/scene/world.ts:47`), lalu menulis
   `style.transform`/`opacity` lewat ref; tidak ada `setState` per frame dan tidak
   ada pembacaan layout (`getBoundingClientRect`, `offsetTop`) di dalam loop.
   Satu frame dibatasi `MAX_FRAME_SECONDS = 0.1` (`src/WalkScene.tsx:80`) supaya
   frame yang tersendat tidak melompati satu leg; loop berhenti saat
   `document.hidden` (`:815-818`).
2. **Art kit di `src/art/`, bukan aset biner.** `HeroWalk` (hero), `scenery.tsx`
   (objek jalan), `vehicles.tsx`, dan `people.tsx` adalah komponen SVG murni.
   Prefix kelas: `wk-` untuk scene, `hw-` untuk hero, `wk-ped-` untuk pejalan,
   `dlg-` untuk panel; scenery/kendaraan diwarnai pembungkus `.wk-prop`/`.wk-veh`.
   Palet hanya token `index.css` (atau `color-mix` turunannya).
3. **Geometri selalu dari `src/scene/projection.ts`.** `GroundScene` dan `WalkScene`
   memakai `offsetX`/`yAt`/`depthScale`; `GroundScene` menambah `HORIZON`,
   `SIDEWALK_LEFT`, `KERB_X`, `ROAD_FAR_X`, sedangkan `WalkScene` menambah
   `pxPerM`/`pxAt`/`fadeAt`/`nearFadeAt`/`LANES`. Tidak ada angka perspektif yang
   ditulis ulang di komponen atau CSS. Karena `yAt` linear terhadap `scaleAt`, tepi
   jalan cukup satu poligon lurus antara kedalaman 0 dan 1.
4. **Tanpa `filter`/`blur` di scene.** Tidak ada `filter`, `backdrop-filter`, atau
   `blur()` di `walk.css` maupun art kit; bayangan digambar sebagai `<ellipse>`
   SVG atau `box-shadow`. Jumlah objek beranimasi dijaga: 8 marka + 10 penempatan
   prop (7–9 jenis per frame) + 3 kendaraan + 2 pejalan (≤ 30).
5. **Mobile-first.** Baseline layout adalah potret 360×640; `walk.css` dan
   `dialog.css` tidak memakai media query lebar sama sekali (hanya
   `prefers-reduced-motion`, plus satu `max-height: 700px` untuk kartu rumah di
   panel), dan `index.css` menyesuaikan ukuran lewat `clamp()`. `classroom.css` dan
   `crossroad.css` masih membawa media query lebar warisan lama dan tidak diubah di
   fase ini.
6. **Dunia deterministik.** `LAYOUT` di `WalkScene` adalah tabel tetap 10
   penempatan, dan spawner memakai `SPAWN_SEED`; jangan mengganti salah satunya
   dengan `Math.random()` tanpa memperbarui test dan catatan review.
7. **Satu tabel meter, satu proyektor.** Semua ukuran objek berasal dari `METERS`
   dan semua konversi meter→piksel lewat `pxAt`/`pxPerMAt`/`offsetX`
   (`src/scene/projection.ts:97-124`). Dilarang menulis tinggi/lebar sebagai fraksi
   `vh`/`vw`, atau angka piksel yang mengklaim ukuran dunia. Satu-satunya
   pengecualian yang didokumentasikan adalah kotak seni hero (1,35 m vs tinta
   ±1,10 m, `src/scene/meters.ts:23-31`).
8. **Cakupan mentah dan cakupan terlihat dipisah.** Dua angka yang berbeda:
   cakupan kotak **mentah** (sebelum fade) ≤ 80 % dan cakupan **terlihat** setelah
   `beltOpacity` ≤ 50 % (`src/WalkScene.tsx:261,386-433`;
   `src/scene/scale.test.ts:210-250,552-566`). `spriteShare` mengukur bagian sprite
   yang masuk frame, bukan bagian frame yang tertutup (`src/scene/projection.ts:126-137`).
   Assertion guard harus menembus fungsi produksi (`heroBox`, `propBox`, `placeProp`,
   …) atau inline style DOM — dilarang membandingkan `pxAt(METERS.x)` dengan
   dirinya sendiri.
9. **Cerita dipisah tiga lapis.** Data di `src/story.ts` (`STORY`, `StoryId`,
   `StoryAction`; 11 beat), presentasi di `DialoguePanel.tsx` (hanya menggambar
   `text` + `buttons`), aksi di `App.tsx` (`handleAction`). Panel tidak tahu arti
   aksi; ia meneruskan `StoryButton` apa adanya. Mengubah kalimat = `story.ts`,
   bukan JSX.
10. **Berhenti dan ketuk eksplisit.** `WalkScene` melapor lewat prop `onStop` /
    `onSignTap` (`src/WalkScene.tsx:48-57`); App yang memilih beat. Tidak ada
    `MutationObserver`, `querySelector` terhadap rambu, atau pembacaan atribut DOM
    untuk menebak state. `onSignTap` adalah cadangan untuk reduced motion, saat
    dunia sudah `stopped` sejak mount.
11. **Kontrak aksesibilitas panel.** Wajah 56 px; live region `role="status"`
    `aria-live="polite"` `aria-atomic="true"` selalu terpasang dan hanya teksnya
    berganti; salinan visual `aria-hidden`; tombol `min-height: 48px` (di atas
    ambang 44 px); panel fixed `max-height: 34vh` dengan `safe-area-inset-bottom`;
    animasi panel dimatikan pada `prefers-reduced-motion`; fokus dipindah ke target
    yang sudah terpasang sebelum tombol yang diklik lepas, tidak pernah ke
    `<body>`. Rinciannya di §7.3.

### 9.2 Guard skala: kenapa angka geometri bisa dipercaya

`src/scene/scale.test.ts` (67 test) bukan test yang membandingkan tabel dengan
dirinya sendiri. Setiap harapan berupa piksel konkret atau bacaan DOM, dan setiap
jalur lewat fungsi produksi yang dipakai loop gambar: `heroBox`, `propBox`,
`vehicleBox`, `pedBox`, `signPlatePx`, `placeDash`, `placeProp`, `placeVehicle`,
`beltOpacity`, `propZ`. Guard-nya: anak tetap di trotoar dan tidak tertutup rambu,
siluet anak ≥ 60 % terlihat termasuk pemotongan frame, tidak ada prop yang menutupi
> 50 % frame setelah fade (kotak mentahnya ≤ 80 %), dua bangunan sisi taman tetap
terbaca di sebagian besar leg, ≥ 2 marka terbaca tiap fase, lajur berlawanan masuk
frame, pelat 0,60 m / tiang 2,0 m, dan halte utuh di trotoar
(`src/scene/scale.test.ts:325-669`).

Yang membuat angka ini bisa dipercaya: **lima mutasi sengaja** — hero dikembalikan
ke clamp viewport, `PROP_ART` kembali ke fraksi viewport, lebar mobil 3×, tiang
0,5 m, dan `SIDEWALK_CENTRE` digeser ke jalan — masing-masing menggagalkan minimal
satu assertion bernama. Tabel mutasinya ada di laporan Task 14 (`d6a1dc1`); tanpa
guard ini, mutasi yang sama lolos dan §7.1 kembali menjadi klaim tanpa bukti.

Batas yang harus disebut terang-terangan: kelima mutasi itu membuktikan **jalur
sizing produksi** (`heroBox`/`propBox`/`placeProp`/`placeVehicle`/`signPlatePx`),
bukan seluruh scene. Guard **tidak** membaca penempatan hero/rambu di JSX
(`WalkScene.tsx` menulis `left`/`top` dari `offsetX`/`yAt`) dan **tidak** membaca
z-index stacking di CSS: `scale.test.ts` memakai konstanta `SIGN_Z`/`HERO_Z`/`HUD_Z`
dari `walk.css`, jadi menukar urutan lapisan di CSS tidak otomatis menggagalkan test.
Perubahan yang hanya menggeser `left`/`top` di JSX atau menukar z-index belum
tertangkap guard dan harus diperiksa dengan tangkapan/rect di peramban.

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

Modul data kedua adalah `src/story.ts`:

```ts
type StoryAction = 'continue' | 'learn' | 'materi' | 'kuis' | 'home' | 'restart'
type StoryButton = { label: string; action: StoryAction }
type StoryId =
  | 'intro' | 'leg-1' | 'stop-1' | 'leg-2' | 'stop-2' | 'leg-3' | 'stop-3'
  | 'crossroad' | 'materi' | 'kuis' | 'home'   // 11 beat
type StoryBeat = { id: StoryId; text: string; buttons: StoryButton[] }
```

`STORY` adalah larik 11 `StoryBeat`; `beatById` mengembalikan `null` untuk id kosong
atau asing; `SIGN_OPENINGS`/`openingFor` menyimpan baris pembuka lembar "Apa ini?".
Teksnya berasal dari `docs/superpowers/specs/2026-11-07-naskah-cerita.md` — naskah
adalah otoritas kata; `story.ts` adalah bentuk yang dieksekusi kode.

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

Status per 2026-11-07 setelah Task 1–14 dan fix wave `0634832`. ✅ = tertutup,
⚠️ = sebagian, tanpa tanda = masih terbuka. Nomor T dipertahankan supaya rujukan
lama tetap sah; T3 sudah dicabut dan keputusannya ada di §16. T14–T19 adalah cacat
yang baru ketahuan setelah framing/panel ditulis ulang.

**✅ T1 — Teks layar rumah selalu salah satu versi.** Dulu `App.tsx` menyetel
`via = 'materi'`, lalu menimpanya jadi `'kuis'` sebelum pindah ke `home`, sehingga
cabang `via === 'materi'` tidak pernah tampil. Selesai di `4a873ad`: `via` sekarang
hanya ditulis saat meninggalkan `crossroad` (`src/App.tsx:279-292,351-360`) dan dibaca
apa adanya di layar rumah (`src/App.tsx:434-438`). `src/flow.test.tsx:358` mengunci
teks jalur materi.

**✅ T2 — ±433 baris kode mati.** Dulu `StreetScenery.tsx` + `street.css` tidak
diimpor siapa pun, dan `index.css` menyimpan blok `.fork*` tanpa JSX pemakai. Selesai
di `4a873ad`: semuanya dihapus bersama `WALK_X`. Verifikasi:
`grep -rn "StreetScenery\|street.css\|WALK_X\|\.fork" src/` kosong.

**✅ T4 — Kendali aksesibilitas overlay belum ada.** Dulu `SignSheet` hanya menutup
lewat klik latar, tanpa `Escape`, tanpa fokus masuk, dan tanpa menahan Tab. Selesai di
`4a873ad` (dialog + fokus + Tab) dan `e6d7241` (Escape/Tab lewat listener `document`,
fokus kembali ke pemicu): `role="dialog"`, `aria-modal="true"`, `Escape`, fokus ke CTA,
restore `document.activeElement`, dan Tab dikurung (`src/App.tsx:34-149`). Fix wave
`3e71e9c` menambahkan dua hal: latar tidak lagi menutup lembar, dan di jalur walk fokus
tidak dipulihkan ke rambu yang sedang dinonaktifkan — lihat T13.

**✅ T5 — `prefers-reduced-motion` baru separuh.** Dulu hanya `classroom.css` dan
`street.css` yang punya guard, sementara `journey.css`, `index.css`, dan
`crossroad.css` belum. Selesai di `b80c1d0`: guard `@media (prefers-reduced-motion:
reduce)` di `index.css:880` mematikan animasi tanpa henti `drift`, `bob`, dan
`pulse`, dan guard di `crossroad.css:300` mematikan `fx-bob`; semua animasi berulang
scene baru dijaga di `walk.css` — hero `:205` (`ac5c4ae`), rambu `:431` (`c30af0a`),
pejalan `:601` (`9d0a9e4`) — dan panel di `dialog.css:154` (`0634832`).
`journey.css`/`street.css` sudah tidak ada. Diverifikasi ulang pada Task 13
(`0634832`) dan Task 15; DoD §14.5 terpenuhi.

**✅ T6 — Tidak ada test sama sekali.** Dulu tidak ada runner maupun smoke test.
Selesai: vitest + jsdom (`aac63b4`), sekarang **8 suite / 164 test** — flow
(`21b78a1`, 9 test), projection (`aac63b4`, 40), GroundScene (`2397d0c`, 7),
HeroWalk (`ac5c4ae`, 6), world (`c30af0a`, 7), spawner (`9d0a9e4`, 12), story
(`76ed157`/`0634832`, 10), dan scale (`d6a1dc1`, 67). `pnpm test` hijau.

**✅ T7 — Parameter dev ikut ke produksi.** `?s=`, `?step=`, `?still` dulu selalu
dibaca. Selesai di `4a873ad`: ketiganya hanya aktif bila `import.meta.env.DEV`
(`src/App.tsx:151-156`), sehingga build produksi selalu mulai dari `intro`.

**T8 — Font dari CDN.** `Fredoka` + `Nunito` masih diambil dari Google Fonts
(`index.html:8-14`). Kalau jaringan sekolah memblokir atau lambat, seluruh tampilan
berubah bentuk karena dua font ini yang membentuk karakter visualnya. Opsi: self-host
(2 file woff2) atau sediakan fallback yang sudah diuji. **Belum dikerjakan**; masih
relevan sebelum dipakai di kelas offline.

**✅ T9 — Skor bintang tidak teruji.** Ambang `score >= 4` / `>= 2` dipertahankan
(keputusan pedagogis, §13/§16) dan sekarang dikunci test: 5/5 → Bintang 3, 4/5 →
Bintang 3 (tepat di ambang), 3/5 → Bintang 2, 0/5 → Bintang 1
(`src/flow.test.tsx:340-406`, commit `21b78a1`; test batas 4/5 menyusul).

**✅ T10 — `WALK_X` tidak terpakai.** Konstanta sisa tata letak lama dihapus di
`4a873ad`; tidak ada lagi referensi di `src/`.

**✅ T11 — Aturan "bentuk & warna → jenis" tidak pernah diajarkan, dan satu `why`
menyalahinya.** Dulu `KINDS[].shape` ada di `data.ts:22-25` tetapi tidak dirender,
dan `why` q5 (`data.ts:126`) menulis "petunjuk berwarna biru atau hijau" sementara
`KINDS` memetakan biru → `perintah` dan hijau → `petunjuk`. Selesai di `b80c1d0`
(baris `Bentuk: …` dirender dari `KINDS`) dan dikoreksi di `3e71e9c`: controller
memutuskan rambu petunjuk adalah **persegi biru** (bukan hijau), jadi
`KINDS.petunjuk` sekarang `#2E7BE0` / `persegi biru`, `why` q5 berbunyi "perintah
bulat biru, dan petunjuk persegi biru", dan `src/flow.test.tsx:93-97` memakai peta
literal (`zebra: 'persegi biru'`) untuk rambu yang dilewati (bukan turunan `KINDS`
yang bisa ikut salah). Ini menyentuh G2 langsung: aturan bentuk-warna adalah inti
materi.

**✅ T12 — `journey.css` tidak punya media query sama sekali.** Dulu adegan berjalan
memakai koordinat desktop-first (`50 + 31·s`%, `50 ± 46·s`%) tanpa media query.
`journey.css` sudah tidak ada (dihapus di `c30af0a`); penggantinya `walk.css`
mobile-first dengan baseline 360×640 dan tanpa media query lebar. Posisi rambu/hero
kini dihitung `offsetX`/`yAt` dari proyeksi dan ukurannya `pxAt` dari meter — bukan
`clamp` maupun persentase layar. Verifikasi visual 360×640 tetap bagian dari DoD
§14.1.

**✅ T13 — Fokus hilang ke `<body>` setiap lembar walk ditutup.** Dulu `SignSheet`
memulihkan `document.activeElement` di cleanup, tetapi langkah walk berikutnya sudah
menonaktifkan rambu pemicu, sehingga `.focus()` gagal dan fokus jatuh ke `<body>`
(tiga kali per run). Selesai di `3e71e9c`: jalur walk memakai wadah `.wk-scene`
(`tabIndex={-1}`) sebagai fokus cadangan, lalu memindahkannya ke rambu berikutnya
begitu rambu itu aktif (`src/WalkScene.tsx:750-757`); lembar ketiga memfokuskan
judul persimpangan (`src/Crossroad.tsx:12-17`). Materi tetap kembali ke kartu
pemicu. Diverifikasi dengan `Escape` sungguhan di Chromium 360×640.

**✅ T14 — Guard skala adalah tautologi.** `scale.test.ts` versi pertama (`fef4209`)
membandingkan `pxAt(METERS.x, d, h)` dengan `pxAt(METERS.x, d, h)`: `depthScale`
saling menghapus sehingga semua assertion identitas, dan guard cakupan memakai
`beltOpacity` yang sama yang menolkan nilainya — tidak ada mutasi yang bisa
menggagalkannya. Test hijau, guard framing tidak ada. Selesai di `d6a1dc1`
(Task 14): setiap harapan berupa piksel konkret atau bacaan inline style DOM, lewat
`heroBox`/`propBox`/`vehicleBox`/`pedBox`/`signPlatePx`/`placeDash`/`placeProp`/
`placeVehicle`/`beltOpacity`/`propZ`; cakupan mentah (≤ 80 %) dan terlihat (≤ 50 %)
dipisah; lima mutasi wajib masing-masing menggagalkan assertion bernama. Rincian di
§9.2.

**✅ T15 — Dua bangunan sisi taman hilang di luar frame.** Rumah dulu di `x = -7,8 m`
dan ruko `-6,0 m`; pada ponsel 360 px hanya 1–13 % sprite (3–40 px) yang terlihat
menembus haze, jadi sisi taman jalan praktis tidak ada. Selesai di `d6a1dc1`: rumah
`-4,0 m`, ruko `-3,8 m`; 5 dari 9 fase menampilkan ≥ 8 % sprite pada opacity ≥ 0,5,
kotak terlihat 34–45 % frame untuk rumah dan 0–32 % untuk ruko
(`src/WalkScene.tsx:144-162,170`). Dikunci `shows both garden-side buildings…` dan
`keeps both buildings' raw boxes under half the phone frame`
(`src/scene/scale.test.ts:567-629`).

**✅ T16 — Marka dan lajur berlawanan di luar frame.** Dengan lajur 3,5 m, garis bagi
jalan berdiri 4,3 m dari garis kamera dan lajur berlawanan ±6,05 m; pada ponsel
360 px marka baru masuk frame di kedalaman ≥ 0,70 dan kendaraan lawan cuma ≈ 1 %
sprite-nya yang terlihat selama satu leg. Selesai di `d6a1dc1`: lajur 2,4 m menaruh
garis bagi di 2,7 m dan lajur berlawanan di 3,9 m (`src/scene/meters.ts:14-19`;
`src/scene/projection.ts:50-54,69-74`); ≥ 2–3 marka terbaca tiap fase (terdekat
0,41), mobil lawan 90 % di dalam frame pada kedalaman 0,53, dan 1,9 detik trafik
`laneR` terlihat per leg 6 detik. Dikunci `paints at least two legible centre-line
marks…`, `puts oncoming traffic inside the frame…`, dan `paints at least one opposing
vehicle…` (`src/scene/scale.test.ts:630-669`).

**✅ T17 — Halte menjorok ke aspal.** `METERS.busStop = 3,0 m` berarti sprite 3,2 m;
pada `x = +0,7 m` sekitar 47 % badannya menutupi aspal dan tidak ada tempat di
trotoar 2,0 m yang bisa memuatnya. Selesai di `d6a1dc1`: tinggi 1,8 m (sprite
1,92 m) dan `LAYOUT` menaruh halte di `x = -0,7 m` (`src/WalkScene.tsx:168`); kotak
`[-1,66, +0,26]` seluruhnya di dalam trotoar `[-1,7, +0,3]`
(`src/scene/meters.ts:51-56`). Dikunci `keeps the whole bus-stop sprite on the
pavement` (`src/scene/scale.test.ts:646-658`).

**✅ T18 — Panel dialog: live region tidak terbaca dan fokus jatuh ke `<body>`.**
Setelah panel menggantikan balon (`76ed157`), wilayah `aria-live` lahir bersama
kalimatnya sehingga pembaca layar sering tidak mengumumkan beat berikutnya —
terutama kalimat rambu yang datang setelah kalimat leg sempat hilang. `aria-hidden`
pada root panel saat animasi keluar juga ditolak Chrome karena tombol yang baru
diklik masih fokus, lalu unmount menjatuhkan fokus ke `<body>`. Selesai di
`0634832`: region status selalu terpasang (`src/DialoguePanel.tsx:64-66`), salinan
visual `aria-hidden` (`:74`), `aria-hidden` root keluar dihapus, App memindahkan
fokus ke target yang terpasang lewat `useLayoutEffect` (`src/App.tsx:233-246`) dan
sinkron ke `.wk-scene` sebelum "Lanjut jalan" (`:262-267`). Dikunci
`src/flow.test.tsx:270-284` (fokus `.wk-scene`, bukan `<body>`) dan `:409-424`
("Pulang" → fokus judul rumah).

**✅ T19 — Reduced motion memakan beat `leg-*`.** Dengan reduced motion, dunia memang
`stopped` sejak mount, tetapi effect lama di App menganggapnya "dunia berhenti" dan
langsung memunculkan `stop-1`, menimpa `leg-1`; urutan naskah jadi loncat. Selesai
di `0634832`: `wasStoppedRef` mulai `true` bila mode awal `stopped`
(`src/WalkScene.tsx:453-455`), `onStop` hanya dipanggil pada transisi mode nyata
(`:759-766`), dan ketukan plat tetap memberi `onSignTap` (`:915-920`). Dikunci
`beat leg tetap tampil saat prefers-reduced-motion` (`src/flow.test.tsx:287-297`)
dan `ketuk plat rambu memunculkan beat stop tanpa MutationObserver` (`:298-313`).

---

## 12. Pendekatan untuk fase berikutnya

Prototipe sudah menutup seluruh alur, dan arah A sudah dijalankan lewat plan 2.5D:
scene berjalan memakai framing trotoar kiri + satu tabel meter, cerita pindah ke
panel bawah, dan guard skala ditulis ulang. T1, T2, T4–T7, T9–T19 tertutup. Yang
tersisa bukan "bangun dari nol", tapi memilih ke mana tenaga diarahkan. Tiga arah
yang realistis:

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
  daripada menyatukan ±2.500 baris CSS.
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
- **Framing: kamera berjalan di trotoar kiri saja.** Rambu berdiri di kerb yang sama,
  1,0 m di kanan anak; sisi seberang tidak digambar dan jalan dipotong tepi kanan
  frame. Alasannya: naskah bilang trotoar tempat paling aman, jadi anak harus terlihat
  di trotoar, bukan di jalan; menggambar dua sisi jalan di ponsel 360 px membagi
  piksel per meter sehingga plat rambu dan marka tidak terbaca (`fef4209`, `d6a1dc1`).
- **Semua ukuran lewat satu tabel meter.** Tidak ada tinggi/lebar sebagai fraksi
  viewport; `pxAt` dipakai untuk setiap ukuran. Alasannya: satu meter harus berarti
  sama untuk anak, mobil, dan rambu; tanpa itu "rumah 6,5 m" cuma klaim
  (`fef4209`, `0f7b454`).
- **Panel bawah, bukan balon di dalam scene.** Balon menutupi jalan/rambu dan tidak
  punya tempat untuk dua tombol; panel fixed 34vh memberi ruang tombol tanpa
  menggeser scene atau plat rambu (`76ed157`, `0634832`).
- **Kecepatan diturunkan ke 0,30 / 6,0 detik.** 0,55 / 3,6 terlalu cepat untuk
  kelas II; satu leg 6 detik memberi waktu melihat rambu sebelum dunia berhenti
  (`fef4209`).
- **Teks cerita ditulis sebagai naskah terpisah, bukan di JSX.** Naskah
  `2026-11-07-naskah-cerita.md` adalah otoritas kata; `story.ts` adalah bentuk yang
  dieksekusi, dan panel tidak tahu arti aksi (`76ed157`, `0634832`).
- **Batas layar: potret 360×640 sebagai baseline, lanskap 1024×600 tetap didukung.**
  360 dipilih karena itu lebar ponsel paling sempit yang realistis untuk target
  utama 1 anak 1 ponsel (§16); 390×844 tidak perlu diuji terpisah.
- **Ambang bintang (T9) tetap 4/2 di fase ini.** Ini keputusan pedagogis, bukan
  teknis; test hanya mengunci perilaku yang ada sekarang supaya perubahan nanti
  terlihat jelas di diff.

---

## 14. Definition of done (untuk arah A)

1. Alur intro → walk(3 rambu) → crossroad → materi/kuis → home berjalan tanpa error
   dan **tata letaknya utuh** (tidak ada elemen penting terpotong atau keluar frame —
   jalan memang sengaja dipotong di tepi kanan, §7.1) di Chromium dan Firefox,
   lanskap 1024×600 dan potret 360×640; plat rambu tidak tertutup panel.
2. Teks layar rumah menyebut jalur yang benar-benar ditempuh (T1 tertutup).
3. Tidak ada modul, file CSS, maupun blok CSS yang tidak dirujuk JSX; `tsc -b` dan
   `vite build` bersih (T2, T10).
4. Overlay ditutup dengan CTA atau `Escape` (bukan ketukan latar), fokus masuk saat
   dibuka, lalu kembali ke pemicu (materi), ke rambu berikutnya/scene (walk), atau ke
   judul persimpangan saat walk selesai — tidak pernah ke `<body>` (T4, T13, T18).
   Panel dialog juga tidak boleh menjatuhkan fokus saat tombolnya lepas.
5. Seluruh animasi berulang berhenti di `prefers-reduced-motion`, termasuk panel
   (T5, T19).
6. Test otomatis untuk urutan stage + perhitungan skor + naskah/panel; `pnpm test`
   hijau, 8 file / 134 test (T6).
7. Parameter `?s=/?step=/?still` hanya aktif di mode dev (T7).
8. Audio tidak dikerjakan dan teks janji suara sudah dihapus (keputusan §16).
9. Bundle JS gzip tetap < 120 kB. (Build 2026-11-07: 87,10 kB.)
10. **Siap diuji**, bukan sudah diuji: protokol uji anak, izin orang tua, dan
    pelaksanaannya di luar cakupan fase ini (§16). Kriteria lulusnya tetap: 3 anak
    kelas II SD bisa melewati tiap adegan tanpa dibantu guru, dinilai per anak dan
    per adegan.
11. Guard geometri `src/scene/scale.test.ts` hijau: anak di trotoar dan tidak
    tertutup rambu, siluet ≥ 60 % terlihat, cakupan mentah ≤ 80 % / terlihat ≤ 50 %,
    bangunan sisi taman terbaca, marka dan lajur lawan masuk frame, pelat 0,60 m,
    tiang 2,0 m, halte utuh di trotoar (T14–T17, §9.2).
12. Panel dialog memenuhi kontrak §7.3: wajah 56 px, live region selalu terpasang,
    tombol ≥ 44 px (kode: 48 px), `max-height: 34vh` dengan padding
    `safe-area-inset-bottom` di dalam batas itu, reduced motion tidak memakan beat
    `leg-*` (T18, T19).

---

## 15. Urutan kerja yang diusulkan (bahan untuk plan)

Status: butir 1, 2, 3, 5, dan 8–10 sudah dieksekusi lewat plan 2.5D + fix wave
`0634832` + Task 14; butir 4 dibatalkan (§16). Butir 6 dan 7 masih relevan.

1. Perbaikan murah & aman: T1, T2, T7, T10. ✅
2. Aksesibilitas, gerak, dan layar sempit: T4, T5, T12. ✅ T4/T5/T12.
3. Koherensi materi bentuk-warna: T11 (render `KINDS[].shape`, samakan aturan warna
   di `why` q5). ✅ Selesai `b80c1d0` + `3e71e9c`.
4. ~~Konten suara~~ **dibatalkan**: tidak ada implementasi audio di fase ini (§16).
5. Test alur + skor (T6) — ditaruh setelah perilaku stabil supaya test tidak
   mengunci bug. ✅
6. Font & performa (T8) — **wajib** kalau kelas offline, opsional kalau online.
7. Uji pengguna (di luar cakupan fase ini), lalu putuskan B.
8. Framing trotoar kiri + satu tabel meter (T14–T17). ✅ `fef4209`, `0f7b454`,
   `d6a1dc1`.
9. Naskah + panel dialog bawah, lalu perbaikan a11y/fokus/`onStop` (T18, T19). ✅
   `76ed157`, `0634832`.
10. Guard skala yang menggigit + perbaikan frame (bangunan, marka, halte). ✅
    `d6a1dc1`; tabel mutasi di laporan Task 14.

---

## 16. Keputusan yang sudah diambil (menggantikan pertanyaan terbuka)

Pemilik produk sudah menjawab empat pertanyaan lama; builder menambahkan keputusan
scene, panel, dan ambang bintang. Keputusan berikut mengikat fase ini dan tidak perlu
ditanyakan ulang.

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
   dikerjakan; itu sisa verifikasi DoD §14.1, bukan cacat kode yang terbuka.
5. **Ambang bintang 4/2 dipertahankan.** Bintang 3 untuk 4–5 benar, Bintang 2 untuk
   2–3, Bintang 1 untuk 0–1. Batasnya dikunci `src/flow.test.tsx`: 5/5 → 3 bintang,
   4/5 → 3 bintang (tepat di ambang), 3/5 → 2 bintang, dan 0/5 → 1 bintang.
   Menaikkan ambang Bintang 3 menjadi `>= 5` sekarang menggagalkan test 4/5.
6. **Framing: trotoar kiri saja, bukan jalan simetris.** Kamera berjalan di trotoar
   kiri; anak di `SIDEWALK_CENTRE` dan rambu di kerb yang sama, 1,0 m di kanannya,
   berhenti di kedalaman 0,26. Sisi seberang tidak pernah digambar: jalan dicat
   sampai `ROAD_FAR_X = 200 m` lalu dipotong tepi kanan frame (`fef4209`, `d6a1dc1`).
   Ini menggantikan deskripsi lama "dua sisi jalan digambar".
7. **Satu tabel meter untuk semua objek.** `src/scene/meters.ts` adalah satu-satunya
   sumber ukuran; `pxPerM`/`pxAt`/`offsetX` mengubahnya ke piksel pada kedalaman
   (`fef4209`, `0f7b454`). `METERS.child = 1,35` adalah kotak seni hero, sedangkan
   tintanya ±1,10 m — didokumentasikan, tidak dinormalisasi.
8. **Panel bawah menggantikan balon di scene.** 11 beat naskah diputar lewat
   `DialoguePanel` di bawah layar; `leg-*` hilang sendiri setelah 3 detik, `stop-*`
   menunggu tombol "Apa ini?"/"Lanjut jalan". Panel tidak digambar di kelas, dan
   layar kelas mengimpor `INTRO_LINE` dari `story.ts` (`76ed157`, `0634832`).
9. **Kecepatan diturunkan ke 0,30 / 6,0 detik.** Angka lama 0,55 / 3,6 terlalu cepat
   untuk kelas II; satu leg 6 detik memberi anak waktu melihat rambu sebelum dunia
   berhenti (`fef4209`, `src/scene/world.ts:14-17`).

**Masih terbuka (pekerjaan, bukan pertanyaan produk):** T8 (font CDN — wajib kalau
kelas offline), dan review visual di ponsel sungguhan (DoD §14.1). T5, T11, T13
tertutup di `b80c1d0` + fix wave `3e71e9c`; T14–T19 tertutup di `d6a1dc1` +
`0634832`. Semuanya dicatat di §11.
