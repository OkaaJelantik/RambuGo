# Spec — Persimpangan Tiga Jalur & Pendekatan Modul

Status: **spec, belum dieksekusi.** Tidak ada kode yang diubah. Dokumen ini menutup dua celah yang
ditemukan saat membandingkan aplikasi dengan `MODUL_AJAR.md` dan `GUIDELINE.md`.

- Acuan kelas: **Kelas IV SD (9–10 tahun)** — diputuskan 2026-11-10; `MODUL_AJAR.md` dan
  `Ref/BAHAN AJAR_Yuk, Kenali Rambu Lalu Lintas.md` menang atas `PRODUCT.md` §2 dan `story.ts` §1,
  yang masih menulis kelas II.
- Acuan taksonomi: **empat jenis** — Larangan, Peringatan, Perintah, Petunjuk. (Revisi 2026-11-10:
  matriks `MODUL_AJAR.md` melewatkan Petunjuk; síntesis modul menetapkannya sebagai jenis sah —
  persegi/persegi panjang hijau, tulisan putih. Awalnya spec ini menulis tiga jenis.)
- Acuan visual: Peringatan = **belah ketupat** kuning, bukan segitiga.

---

## 1. Masalah yang diselesaikan

| # | sekarang | seharusnya | akibat sekarang |
|---|---|---|---|
| G1 | simpang = materi / jalan lagi / kuis (`Junction.tsx:279`) | simpang = Mudah / Sedang / Sulit (`GUIDELINE.md:9`) | 1 dari 3 slot bukan uji; anak tak pernah memilih kompleksitas |
| G2 | 4 jenis termasuk `petunjuk`; 6 rambu (`data.ts:1`, `data.ts:34`) | 3 jenis; 9 rambu (3×3), `MODUL_AJAR.md:65` | level Sedang tidak punya bin yang sah; 3 rambu modul hilang per jenis |
| G3 | peringatan = segitiga (`SignArt.tsx:10`) | belah ketupat, `MODUL_AJAR.md:34` | pedagogi "bentuk sebelum kata" mengajari cue yang salah, bocor ke 17 tempat |
| G4 | tidak ada sortir | Sedang = drag-drop sortir jenis (`GUIDELINE.md:17`) | level Sedang tidak ada |
| G5 | kuis 5 soal 1 tahap | Sulit = kasus × 3 tahap (makna→alasan→tindakan), `STUDI_KASUS.md` | "menganalisis dan menjelaskan" tak terjadi; kunci semua A → anak belajar "pilih A" |
| G6 | tidak ada "ciri jenis" di data | unit ajar modul = ciri per jenis, `MODUL_AJAR.md:19,34` | tidak ada yang bisa disortir maupun dijelaskan |

## 2. Model konten (dasar ketiga level)

`Kind` menjadi tiga nilai. Setiap jenis membawa satu kalimat `ciri` — inilah yang disortir Sedang dan
dikutip saat menjelaskan di Sulit.

| jenis | bentuk + warna | ciri (kalimat untuk anak) | aturan bagi pengguna jalan |
|---|---|---|---|
| `larangan` | bulat putih, lambang hitam, tepi/coretan merah | "Bulat dengan tepi merah: ada yang tidak boleh dilakukan." | tidak boleh berhenti / parkir / putar balik |
| `peringatan` | belah ketupat kuning, lambang hitam | "Belah ketupat kuning: ada yang perlu diwaspadai di depan." | kurangi kecepatan, lihat sekeliling |
| `perintah` | bulat biru, lambang putih | "Bulat biru: kita wajib mengikuti arah panahnya." | ikuti arah panah, jangan belok lain |

`Sign` tetap membawa `art`, `name`, `meaning`, `tip`, `visual` (kontrak a11y: `visual` tidak memuat
`name`/`meaning`, dikunci tes). `kind` wajib salah satu dari tiga.

### 2.1 Inventaris 9 rambu (menggantikan 6 sekarang)

| id | jenis | nama | arti | aturan |
|---|---|---|---|---|
| `dilarang-berhenti` | larangan | Dilarang Berhenti | Kendaraan tidak boleh berhenti di sini | berhenti hanya di tempat lain yang boleh |
| `dilarang-parkir` | larangan | Dilarang Parkir | Kendaraan tidak boleh diparkir di sini | cari tempat parkir yang diperbolehkan |
| `dilarang-putar-balik` | larangan | Dilarang Putar Balik | Tidak boleh memutar balik kendaraan | lanjutkan arah, putar di tempat yang boleh |
| `peringatan-penyeberangan` | peringatan | Akan Ada Penyeberangan | Di depan ada tempat penyeberangan | pelan, dahulukan pejalan kaki |
| `peringatan-lampu` | peringatan | Akan Ada Lampu Lalu Lintas | Di depan ada lampu lalu lintas | bersiap berhenti, patuhi isyarat lampu |
| `peringatan-persimpangan` | peringatan | Akan Ada Persimpangan | Di depan ada persimpangan | waspada kendaraan dari arah lain |
| `belok-kiri` | perintah | Wajib Belok Kiri | Kendaraan wajib belok kiri | ikuti panah, jangan lurus |
| `jalan-terus` | perintah | Wajib Jalan Terus | Kendaraan wajib jalan lurus | tidak boleh belok kiri maupun kanan |
| `belok-kanan` | perintah | Wajib Belok Kanan | Kendaraan wajib belok kanan | ikuti panah, jangan lurus |

Keputusan turunan:

- `anak` (banyak anak menyeberang) dan `hati-hati` **keluar** dari inventaris inti: keduanya tidak ada
  di modul dan tidak dipakai ketiga level. Boleh kembali sebagai pengaya level Mudah di iterasi lain,
  bukan sekarang.
- Ramu biru "tempat menyeberang" (`zebra` sekarang, `petunjuk`) **tidak** masuk tiga jenis. Ia hanya
  muncul di level Sulit sebagai bahan cerita (STUDI_KASUS Soal 5) dan diberi label eksplisit
  "rambu petunjuk — di luar tiga jenis yang kita pelajari". Lihat §7 butir 1.
- Bentuk di `SignArt.tsx`: `warningFrame` diganti poligon belah ketupat (`60,4 116,60 60,116 4,60`),
  viewBox tetap 120×120. Lambang peringatan digambar ulang dengan margin dalam karena sudut ketupat
  memakan ruang lebih banyak daripada segitiga.
- Narasi pembuka rambu diturunkan dari `KINDS[kind].shape` (`story.ts:140`), jadi teks "Eh, ada rambu…"
  ikut benar tanpa disentuh manual. `SIGN_OPENINGS` perlu entri untuk 9 id baru.

## 3. Level Mudah — "Kenali bentuk dan arti"

| aspek | ketetapan |
|---|---|
| tujuan | anak tahu **bentuk+warna → jenis** dan tahu arti tiap rambu |
| isi | 9 kartu rambu, dikelompokkan per jenis, header berisi `ciri` |
| interaksi | ketuk kartu → lembar rambu (pola `SignSheet` yang sudah ada, tidak diubah) |
| cek pemahaman | 6 soal, 2 per jenis: **hanya** siluet → pilih jenis, lalu pilih arti. Tidak ada soal "jenis ini jenis apa" yang membocorkan dirinya sendiri |
| skor | 6 soal; ≥5 ★★★, 3–4 ★★, 0–2 ★ |
| keluar | "Kembali ke persimpangan" dan "Coba yang lebih sulit →" |
| a11y | tombol asli, fokus tidak jatuh ke `<body>`, `aria-live` untuk umpan balik; siluet tetap `aria-hidden` + `describeSign` |

Yang dihapus dari layar materi sekarang: chip jenis yang memakai `petunjuk`, dan label "Jalur Materi".

## 4. Level Sedang — "Kelompokkan rambu"

| aspek | ketetapan |
|---|---|
| tujuan | anak mengelompokkan rambu menurut jenisnya dari bentuk+warna |
| papan | 9 kartu di baki, acak per seed; 3 bin tetap berurut Larangan · Peringatan · Perintah, tiap bin menampilkan ikon bentuknya |
| interaksi **kanonik** | ketuk/pilih kartu → bin yang sah menyala → ketuk bin. Keyboard: Tab ke kartu, Enter memilih, Tab melewati bin, Enter menaruh, Esc membatalkan |
| drag | **bukan** jalur utama. Pointer-drag boleh ditambahkan belakangan sebagai enhancement; tanpa itu level tetap selesai |
| salah | kartu pulang ke baki, bin bergaris merah, satu kalimat `tip` di `aria-live`. Tidak ada pengurangan skor, tidak ada hukuman |
| skor | 9 kartu; 9 ★★★, 7–8 ★★, ≤6 ★. Selesai kapan pun semua kartu masuk bin (yang salah diulang) |
| determinisme | urutan kartu dari `mulberry32(seed × 31)`; tidak ada timer, tidak ada skor berbasis waktu |
| gerak | animasi kartu→bin hanya `transform`/opacity CSS; `prefers-reduced-motion` memindahkan seketika |
| keluar | "Kembali ke persimpangan" dan "Coba yang paling sulit →" |

Alasan menolak drag sebagai jalur utama: target ketuk 44 px, anak Kelas IV di HP, dan pembaca layar.
Drag murni menutup alur untuk keyboard dan menyulitkan motorik halus — melanggar DoD "selesai tanpa
mouse".

## 5. Level Sulit — "Baca cerita, tentukan tindakan"

Isi langsung dari `STUDI_KASUS.md`: 5 kasus, tiap kasus 3 tahap.

```ts
type CaseStep = {
  ask: 'makna' | 'alasan' | 'tindakan'
  prompt: string
  options: { text: string; correct: boolean }[]   // 3 opsi
  why: string                                     // tampil setelah menjawab
}
type Case = {
  id: string
  title: string
  story: string
  signId: string          // rambu yang dibicarakan, digambar dengan SignArt
  steps: [CaseStep, CaseStep, CaseStep]
}
```

| aspek | ketetapan |
|---|---|
| urutan | kasus 1→5 tetap (cerita berurutan); **opsi diacak per seed di dalam tiap tahap** |
| kunci | `correct` menempel pada teks, bukan pada huruf. Urutan tampil dihitung dari seed, jadi "A" tidak lagi selalu benar — ini memperbaiki cacat kunci A–A–A di `STUDI_KASUS.md` |
| cek | setiap tahap dinilai; umpan balik + `why` muncul seketika, bukan di akhir |
| skor | 15 keputusan; ≥13 ★★★, 9–12 ★★, ≤8 ★ |
| nada | tidak pernah gagal: salah → `why` menjelaskan, anak lanjut |
| keluar | "Kembali ke persimpangan" dan "Ulangi dari kasus pertama" |
| batas teks | kalimat cerita ≤ 2 kalimat; `why` ≤ 2 kalimat (register Kelas IV, bukan kelas II) |

Rambu yang dibutuhkan level ini tapi di luar 9: `dilarang-masuk` (Soal 1), tikungan (Soal 2), STOP
segi delapan (Soal 3), biru penyeberangan (Soal 5). Empat art baru + satu `kind` tambahan **hanya untuk
level ini** — tidak masuk bin Sedang maupun hitungan jenis di Mudah.

## 6. Persimpangan — tiga jalur, terbaca sebelum dibaca

| jalan | level | papan |
|---|---|---|
| barat | Mudah | "Mudah · Kenali rambu" |
| utara | Sedang | "Sedang · Kelompokkan" |
| timur | Sulit | "Sulit · Baca cerita" |

- Urutan kiri→lurus→kanan mengikuti urutan kemampuan di `GUIDELINE.md:11-13`. Pemetaan jalan
  **tetap** seperti sekarang (materi=barat, kuis=timur), jadi diff-nya kecil.
- "Jalan lagi" **keluar** dari simpang. Perjalanan kaki tetap ada sebagai affordance di dalam level
  ("lihat rambu lain di jalan" → kembali ke `walk` dengan batch berikutnya), bukan sebagai jalur uji.
- Isyarat tingkat harus terbaca dari bentuk, bukan warna fungsi: tiga titik/bintang di papan (1, 2, 3),
  plus ikon tugas (siluet rambu / tiga baki / tanda tanya). Warna papan mengikuti jenis tugas, bukan
  tingkat, supaya anak tidak menyimpulkan "kuning = sulit".
- Tidak ada penguncian: ketiga jalur selalu terbuka. Diferensiasi untuk guru, bukan gerbang wajib.
- Kontrak a11y yang dipertahankan: `<h2 tabIndex={-1}>` difokus saat stage masuk, tiga `<button>`
  sungguhan, `aria-label` memuat level + tugasnya.

### 6.1 State machine

```
intro → walk → crossroad → { mudah | sedang | sulit } → home
```

- Nama stage baru: `mudah`, `sedang`, `sulit`. `?s=materi` dan `?s=kuis` diterima sebagai alias
  (masing-masing → `mudah`, `sulit`) supaya tautan dev lama tidak mati.
- `run` menyimpan `level: 'mudah' | 'sedang' | 'sulit'`.
- Rumah menampilkan level yang dimainkan dan bintang level itu (bukan `benar/5`), plus ajakan ke level
  berikutnya. Bintang tidak digabung lintas level.
- Beat narasi baru: `mudah`, `sedang`, `sulit` (pembuka) dan `hasil` (satu, dipakai tiga level).
  Semua tetap tunduk pada kunci `story.test.ts`: ≤ 90 karakter, ≤ 2 kalimat.

## 7. Pertanyaan terbuka (butuh keputusan manusia)

1. ~~**Rambu petunjuk.**~~ **Selesai 2026-11-10:** Petunjuk adalah jenis keempat yang sah. Bin level
   Sedang karena itu berjumlah **empat**, bukan tiga. `STUDI_KASUS.md` Soal 5 (rambu biru penyeberangan)
   tetap perlu diputuskan terpisah: biru bukan hijau, jadi ia bukan contoh Petunjuk yang diajarkan.
2. **Nasib "jalan lagi".** Usulan: pindahkan ke dalam level. Alternatif: pertahankan sebagai tautan
   kecil di bawah papan simpang, bukan papan keempat.
3. **Skor Mudah.** Usulan: Mudah dinilai (6 soal) agar tiga level setara. Alternatif: Mudah bebas nilai
   (eksplorasi murni) dan bintang hanya untuk Sedang/Sulit.

## 8. Paket kerja (belum dikerjakan)

| paket | isi | berkas | risiko |
|---|---|---|---|
| P0 | taksonomi 3 jenis + `ciri`; 9 rambu; art belah ketupat + 4 art Sulit; narasi | `src/data.ts`, `src/SignArt.tsx`, `src/story.ts`, `src/flow.test.tsx` | sedang; 17 sebutan "segitiga" ikut berubah |
| P1 | simpang 3 jalur, stage baru, alias `?s=`, rumah per level | `src/Junction.tsx`, `src/junction.css`, `src/App.tsx` | sedang; `flow.test.tsx:299` berubah |
| P2a | level Sedang (baki + 3 bin, tanpa drag) | layar baru + `src/sedang.css` | sedang; murni DOM, tanpa rAF |
| P2b | level Sulit (mesin 3 tahap, opsi teracak) | `src/data.ts` (kasus), layar baru | rendah; tanpa animasi |

Urutan wajib P0 → P1 → P2: bin Sedang dan jawaban "jenis" di Sulit membaca taksonomi P0.

## 9. Rencana tes

- `data.test.ts`: tepat 3 jenis; 3 rambu per jenis; tiap rambu punya `name`, `meaning`, `tip`,
  `visual`, `art`; `visual` tidak memuat `name`/`meaning`.
- `sedang.test.ts`: `binOf(sign)` benar untuk 9 rambu; urutan kartu berbeda untuk dua seed berbeda;
  kartu salah tidak mengurangi jumlah benar.
- `sulit.test.ts`: 5 kasus × 3 tahap = 15; setiap tahap punya tepat satu `correct`; untuk 20 seed,
  posisi jawaban benar **tidak** selalu 0 (mengunci perbaikan kunci A–A–A); setiap tahap punya `why`.
- `flow.test.tsx`: tiga papan bernama Mudah/Sedang/Sulit memanggil tiganya; alur keyboard penuh untuk
  Sedang (Tab/Enter) dan Sulit; fokus tidak pernah `<body>`; skor dan bintang per level.
- Guard `vite build`: layar baru tidak menambah `@keyframes` yatim.

## 10. Non-goal

- Drag-drop wajib, timer, skor berbasis waktu, leaderboard.
- Menyimpan progres lintas sesi (tetap tanpa backend).
- Menyentuh scene berjalan, pool scenery, atau plafon 30 node — ketiga level adalah layar DOM statis.
- Mengubah `SIGN_STOP_D`, `BATCH_SIZE`, atau panjang leg.
