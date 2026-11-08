# PRD & Spec Teknis — "Petualangan Rambu-Rambu Lalu Lintas"

> **Dokumen ini sekarang historis.** Sumber kebenaran yang hidup ada di akar repo:
> [`AGENTS.md`](../../../AGENTS.md) (cara kerja + aturan), [`PRODUCT.md`](../../../PRODUCT.md) (PRD),
> dan [`DESIGN.md`](../../../DESIGN.md) (sistem visual + proyeksi). Yang tersisa berguna di sini:
> riwayat keputusan, utang verifikasi, dan catatan proses di §7.

Dokumen serah-terima. Ditulis 8 November 2026 untuk melanjutkan pekerjaan di sesi lain.

**Branch:** `main` · **commit terakhir:** `bcce7c7` · **repo:** `/home/lann/Projects/Ina`
**Status verifikasi saat dokumen ini ditulis:** `pnpm test` 200/200 (10 file) · `tsc -b` bersih · `vite build` hijau.
**Riwayat:** `cf17bf6` mengganti sabuk scenery dengan spawner kontinu, tetapi kotak wrapper prop hanya
diukur sekali sehingga objek mulai bergeser dan gepeng. Perbaikan setelah dokumen ini: kepemilikan
kotak pindah ke loop, jalan diwarmi sejak frame pertama, kerapatan naik 3×, rambu jadi objek dunia,
dan ujung jauh jalan dimemudarkan sampai titik hilang.

---

## 1. Produk

**Audiens:** anak kelas II SD (7–8 tahun), memegang HP sendiri. Bahasa Indonesia, register anak
("aku", bukan "anda").

**Tujuan belajar:** anak mengenali rambu dari **bentuk + warna** (segitiga kuning = peringatan,
bulat merah = larangan, bulat biru = perintah, persegi biru = petunjuk), bukan menghafal urutan.

**Alur yang diinginkan:**

```
kelas → jalan (3 rambu, berhenti di tiap rambu)
      → persimpangan: lurus = jalan lagi (3 rambu berikutnya) · kiri = materi · kanan = kuis
      → rumah (setelah kuis selesai)
```

**Bukan tujuan:** audio/suara (dibatalkan), deploy/proyektor (localhost/lokal saja), animasi
realistis (yang dicari "kids interactive web" yang hidup, bukan simulasi).

---

## 2. Kondisi sekarang — jujur

### 2.1 Yang berjalan

| Bagian | Status |
|---|---|
| Scene 2.5D trotoar kiri, jalan terpotong di kanan | jalan, sudah stabil |
| Satu tabel meter untuk semua objek | jalan; `scene/meters.ts` + `pxAt`/`offsetX` |
| Scenery kontinu, 5–7 objek serentak, frame pertama terisi | jalan; kotak wrapper ditulis ulang per jenis di `draw()` |
| Ujung jauh jalan menyatu ke titik hilang + kabut | jalan; poligon `band()` diperpanjang ke VP |
| Trafik + pejalan, lalu lintas kiri Indonesia | jalan; 5 kendaraan, 3 pejalan |
| Rambu diacak per seed, perjalanan bisa dilanjutkan | jalan sejak `a51298a` |
| Persimpangan 2.5D tiga jalur | jalan, **rupa belum diverifikasi mata manusia** |
| Lembar rambu (keterangan resmi) + balon narasi | jalan sejak `b96b3b4`, `147324d` |
| Rambu sebagai objek dunia: datang dari horizon, berhenti 0,22, lalu dilewati | jalan; `signDepth()` di `scene/world.ts` |
| Rambu diurutkan menurut kedalaman (`propZ`), bukan z tetap 160 | jalan; `SIGN_Z` di `WalkScene.tsx` |
| Rambu = satu gambar (pelat + tiang satu `<svg>`, tanpa denyut) | jalan; `SignFigure` di `WalkScene.tsx` |
| Burung di langit (1 node, animasi CSS linear) | jalan; `art/scenery.tsx` `Birds` + `walk.css` |
| Kuis 5 soal + bintang 4/2 | jalan, terkunci tes |
| Reduced motion, fokus tidak jatuh ke `<body>`, kontras AA | jalan untuk alur utama |

### 2.2 Bug terbuka yang dilaporkan manusia (prioritas)

| # | Keluhan | Dugaan penyebab | File yang disentuh |
|---|---|---|---|
| B1 | Persimpangan: tiga papan terasa "ditempel", belum tentu terbaca sebagai perempatan | jalan samping digambar sebagai poligon kasar; belum ada arti kedalaman | `src/Junction.tsx`, `junction.css` |
| B2 | Balon narasi bisa melewati tepi kanan di 360 px | `max-width: min(58vw, 300px)` mulai dari 34 % lebar hero | `src/walk.css` |
| B3 | Halte terasa terlalu tipis (0,80 m) setelah digambar menyamping | lebar diturunkan agar muat pita kerb | `scene/props.ts` (`busstop.x`), `meters.ts` |
| B4 | Bangku 0,67 m terasa pendek dibanding bangku nyata | art profil 55×70 mengikuti lebar, bukan panjang | `art/scenery.tsx` `Bench` |
| B5 | Scene awal masih mungkin terasa "kurang" walau sudah prewarm 4 objek | **selesai**: prewarm 6 titik merotasi pita | `scene/props.ts` `PREWARM` |
| B6 | Kondisi **lurus berulang** belum pernah diuji manusia lebih dari sekali | `advanceRun` baru diuji unit | `run.ts`, `App.tsx` |

### 2.3 Utang verifikasi (bukan bug yang diketahui)

- **Pass visual di HP sungguhan** belum pernah dilakukan (DoD §14.1). Semua bukti visual berasal
  dari Chromium headless 360×640 / 360×800 / 390×844 / 1024×600 / 1280×800.
- **Firefox** hanya dirender sekali (bukan interaktif).
- **FPS perangkat** belum diukur; anggaran node 26 dari plafon 30.

---

## 3. Arsitektur

```
src/
  main.tsx            mount
  App.tsx             mesin stage + state run/batch + SignSheet + Quiz + fokus
  Classroom.tsx       layar kelas (memakai INTRO_LINE dari story.ts)
  Junction.tsx        persimpangan 2.5D, 3 papan tombol
  DialoguePanel.tsx   panel bawah: live region + teks + tombol beat
  WalkScene.tsx       scene berjalan: satu loop rAF, pool, ambience, rambu
  Kid.tsx             anak menghadap kamera (kelas, persimpangan, pose bicara)
  SignArt.tsx         art rambu + describeSign (deskripsi untuk pembaca layar)
  data.ts             KINDS, SIGNS (6), QUESTIONS (5), visual
  story.ts            beat naskah + stopLine/stopBeat + pembuka per rambu
  run.ts              antrean rambu diacak per seed, batch 3
  scene/
    meters.ts         SATU tabel meter (anak 1,35 · lajur 2,4 · mobil 1,8 · dst)
    projection.ts     PX_PER_M, pxAt, offsetX, scaleAt, yAt, fadeAt, nearFadeAt
    world.ts          reducer murni + SCROLL_PER_SEC 0,30 · LEG_SECONDS 6,0
    props.ts          spawner scenery: bobot, jarak, nearest, prewarm
    spawner.ts        spawner trafik/pejalan (biji sama, deterministik)
    GroundScene.tsx   jalan/trotoar/kerb dari proyeksi yang sama
  art/                HeroWalk, scenery (samping), vehicles, people
```

### 3.1 Aturan yang mengikat (jangan dilanggar tanpa alasan)

1. **Satu meter untuk semua.** Ukuran objek = `meter × pxPerM(vh) × depthScale`. Tidak boleh ada
   `clamp()`, `vh`, `vw`, atau literal px untuk ukuran objek. Ini pernah jadi bug "anak raksasa,
   mobil mainan".
2. **Satu loop rAF + reducer murni.** Tidak ada `setState` per frame; `setState` hanya untuk
   perubahan struktural (spawn, ganti stage, ganti beat).
3. **≤ 30 node beranimasi.** Sekarang 26 (8 prop + 8 marka + hero + rambu + 5 kendaraan + 3 pejalan).
4. **Tidak ada `filter`/`backdrop-filter` di dalam scene.**
5. **`prefers-reduced-motion`** mematikan semua animasi tak terbatas; narasi tetap jalan.
6. **Jangan mount/unmount SVG per objek.** Slot tetap; yang berganti hanya jenis art.
7. **Determinisme.** Semua acak dari `mulberry32` ber-seed; `?seed=` untuk mengulang run.
8. **Fokus tidak pernah `<body>`** setelah aksi (lembar tutup, jawab kuis, ganti stage).

### 3.2 Angka acuan

| Konstanta | Nilai | Di mana |
|---|---|---|
| kecepatan jalan | 0,30 kedalaman/detik | `scene/world.ts` |
| panjang leg | 6,0 detik | `scene/world.ts` |
| rambu per perjalanan | 3 (`BATCH_SIZE`) | `run.ts` |
| kedalaman berhenti rambu | 0,22 | `WalkScene.tsx` |
| pelat rambu | 0,60 m × `SIGN_EMPHASIS` 1,5 × `SIGN_PLATE_GROW` 1,05 → **97,6 px** @360×800 | `WalkScene.tsx` |
| tiang rambu | 1,8 m | `scene/meters.ts` |
| scenery: pool | 10 slot | `scene/props.ts` |
| scenery: jeda spawn | 0,30–0,55 s | `scene/props.ts` |
| scenery: jarak minimum | 0,07 kedalaman per pita | `scene/props.ts` |
| scenery: fade dekat | 0,05 kedalaman | `scene/props.ts` |
| scenery: lahir / paling dekat | 1,0 / per pita (taman 0,10 · tepi 0,12 · kerb 0,26–0,34) | `scene/props.ts` |
| sign: z-index | `propZ(depth)`, 82 saat berhenti | `WalkScene.tsx` |
| kedalaman rambu per detik | `min(1, 0,22 + 0,30 × sisa leg)` | `scene/world.ts` `signDepth` |
| trafik | 5 kendaraan, 3 pejalan, jeda 0,5–1,2 s | `WalkScene.tsx` |
| lebar jalan | 4,8 m (2 lajur × 2,4 m) | `scene/meters.ts` |

### 3.3 Pita lateral (meter dari garis kamera)

| pita | x | isi |
|---|---|---|
| jalur anak | −0,90 | hero; tinta −1,263 … −0,537 |
| tepi taman | −1,85 | tong sampah |
| taman | ≤ −2,30 | bangku −2,60 · pohon −2,8 · tiang listrik −2,9 · pagar −3,5 · ruko −4,2 · rumah −5,0 |
| kerb | −0,50 … +0,30 | halte −0,10 · lampu +0,25 · rambu +0,30 |

---

## 4. Guard (tes) — apa yang dikunci dan apa batasnya

| file | tes | mengunci |
|---|---|---|
| `scene/projection.test.ts` | 21 | geometri & satuan meter |
| `scene/scale.test.ts` | 77 | framing antar viewport, lebar maksimum, siluet anak, z-order (rambu ikut depth), ukuran pelat, anggaran node, rasio kotak per jenis |
| `scene/props.test.ts` | 10 | determinisme, kontinuitas spawn, jeda, jarak minimum, bobot, kerapatan, umur |
| `scene/spawner.test.ts` | 15 | bias lajur, jarak, offset motor |
| `scene/world.test.ts` | 10 | reducer, mode, kecepatan, `signDepth`, scroll antar-leg |
| `scene/GroundScene.test.tsx` | 7 | pita jalan, urutan cat |
| `story.test.ts` | 10 | 8 beat statis, ≤90 karakter, ≤2 kalimat, tombol per tempat |
| `run.test.ts` | 8 | antrean acak, batch unik, 6 rambu, tanpa ulang langsung |
| `flow.test.tsx` | 17 | tiga jalur, batas bintang 4/2, balon narasi, fokus, ketuk ganda |
| `art/HeroWalk.test.tsx` | 6 | langkah, pose |

**Batasan yang harus diketahui penerus:**

- `scale.test.ts` memompa `requestAnimationFrame` manual untuk tes "kotak prop ditulis ulang saat
  jenis berganti". Menghapus pemeriksaan `el.dataset.kind !== slot.kind` di `draw()` **tidak** langsung
  menggagalkan tes itu (slot bisa kebetulan berganti sebelum sempat diperiksa), tetapi menulis kotak
  hanya sekali di awal (`if (false && …)`) menggagalkannya. Jaga keduanya: tesnya memang penjaga bug
  "pohon mewarisi kotak lampu".

- `scale.test.ts` **tidak** menguji penempatan hero/rambu di JSX maupun z-index CSS — hanya jalur
  perhitungan. Lima mutasi membuktikan itu, tapi penempatan komponen tidak masuk cakupan.
- Beberapa invarian lama khas sabuk (jumlah "fase") sudah dibuang saat scenery jadi kontinu. Yang
  menggantikan: simulasi 45 detik (`PROP_FRAMES`).
- **`vitest` tidak memproses CSS produksi.** Pernah ada commit yang lolos 180 tes tapi `vite build`
  gagal (sisa `@keyframes` yatim). **Selalu jalankan `vite build` sebelum commit.**

---

## 5. Cara menjalankan

```bash
pnpm install
pnpm dev            # http://127.0.0.1:5173
pnpm test           # 10 file, 194 tes
pnpm exec tsc -b    # typecheck
pnpm exec vite build
```

Helper DEV lewat URL (hanya saat `DEV`):

| param | arti |
|---|---|
| `?s=walk` | langsung ke scene berjalan |
| `?s=kuis` | langsung ke kuis |
| `?step=N` | mulai dari langkah ke-N |
| `?seed=123` | paksa seed run (mengulang urutan rambu yang sama) |
| `?still` | matikan animasi masuk untuk screenshot |

Tunnel Cloudflare bisa dibuat dengan alat yang sama seperti sebelumnya; saat dokumen ini ditulis
dev server hidup di `http://127.0.0.1:5173`.

---

## 6. Rencana kerja lanjutan (urut prioritas)

### Fase 1 — tutup bug yang dilaporkan (**kerjakan dulu, sebelum fitur baru**)

**T1 · Persimpangan terbaca sebagai perempatan** (B1)
- Ukur dulu: screenshot 360×640 dan 1280×800 di persimpangan.
- Perbaiki: jalan samping digambar **bertahap** (bukan poligon kasar): tepi jauh lebih sempit dari tepi
  dekat, marka melintang ikut menyusut, kerb berhenti di persimpangan, lalu tiga papan.
- Acceptance: pada 360×640, tiga papan terpisah minimal 12 px satu sama lain, tidak ada yang
  menutupi anak, dan jalan samping terbaca berbeda dari trotoar.

**T2 · Balon narasi tidak melewati frame** (B2)
- `max-width` dihitung dari sisa ruang ke tepi kanan: `min(58vw, calc(100vw - left - 16px))`.
- Acceptance: narasi terpanjang ("Tanda seru di segitiga kuning. Ada yang harus kuhindari di depan.")
  tetap 1–3 baris dan tidak terpotong di 360 px.

**T3 · Proporsi halte & bangku** (B3, B4)
- Halte 0,80 m → coba 1,10 m dengan pita kerb digeser ke −0,30 … +0,30; periksa siluet anak.
- Bangku: art profil dibuat lebih panjang (mis. viewBox 70×70) supaya terbaca bangku, bukan stool.
- Acceptance: guard `keeps the child's band ≥ 0,03 m clear` tetap hijau.

**T4 · Uji alur berulang** (B6)
- Manual: pilih "Jalan lagi" dua kali, pastikan 9 rambu berbeda (6 pertama unik).
- Tambah tes: `advanceRun` dua kali → total 9 slot, 6 pertama tanpa duplikat.

### Fase 2 — verifikasi yang belum pernah dilakukan

**T5 · Pass visual di HP sungguhan.** DoD §14.1. Rekam layar 30 detik berjalan; nilai: apakah
scenery berulang, apakah ritme wajar, apakah balon terbaca.

**T6 · Ukur FPS** (Chrome DevTools, CPU throttle 4×) di 360×640 saat berjalan + trafik padat.

**T7 · Firefox interaktif** sekali: jalankan penuh sampai rumah.

### Fase 3 — fitur berikutnya (belum dimulai)

- **F1 · Kuis dari rambu yang dilihat.** Soal diambil dari batch yang barusan dilihat, bukan 5 soal
  tetap. Perlu: `Quiz` menerima daftar soal, dan `QUESTIONS` jadi basis.
- **F2 · Materi dua arah.** Dari materi bisa "kembali ke jalan" tanpa lewat kuis.
- **F3 · Progres tersimpan.** localStorage: rambu mana yang sudah dilihat.

---

## 7. Jebakan proses (dari pengalaman sesi ini)

1. **Jangan paralel pada file yang sama.** Dua agen di `WalkScene.tsx` meninggalkan tree gagal
   compile dan menghabiskan satu ronde.
2. **Commit wajib pathspec** (`git commit -m "…" -- src/a.tsx src/b.ts`), bukan `git add -A`, supaya
   tidak menyapu pekerjaan agen lain.
3. **`vite build` sebelum commit.** `vitest` tidak memproses CSS.
4. **Tes yang menyentuh tabelnya sendiri itu tautologi.** Assertion harus menyentuh kotak produksi
   (`propBox`/`heroBox`/`placeProp`) atau DOM hasil render. Pernah ada `scale.test.ts` 295 baris yang
   tidak bisa gagal.
5. **Jangan melepas objek sebelum fade-nya selesai** (kasus `PROP_END_D` 0,10 → objek lenyap di
   depan kamera).
6. **Arah kedalaman**: objek mendekat = `depth - scroll`. Salah tanda = pool penuh lalu berhenti.
7. **Guard yang menentukan sebuah angka harus menyebut angkanya**, bukan membandingkan konstanta
   dengan dirinya sendiri.
8. **Wrapper `.wk-prop` dimiliki `draw()`, bukan `measure()`.** Pool menukar jenis di dalam satu slot;
   ukuran yang diukur sekali akan tertinggal satu jenis dari `placeProp` — objek bergeser dan gepeng.
9. **`propKinds` harus di-seed dari pool.** Kalau state awal `null`, slot prewarm tampil sebagai `<div>`
   kosong ~1 detik: itulah "jalan kosong di detik pertama".
10. **Rambu adalah SATU gambar (`SignFigure`), bukan dua elemen.** Pelat dan tiang dulu dua `<span>`
    di dalam flex column; `setDisplay()` menulis `display:block`, tiangnya jadi elemen inline, tinggi
    300 px diabaikan, dan pelat "jatuh ke tanah". Sekarang keduanya satu `<svg>` (`SIGN_BOX`
    120 × 462,9 unit, satu unit = 0,945 m / 120), jadi tidak ada keadaan di mana mereka terpisah.
    Lebar/tinggi kotaknya dari `--wk-sign-width` / `--wk-sign-height` di `measure()`.
11. **Tidak ada "ketuk aku" di rambu.** Denyut (`wk-pulse`), pop-in `scale(0.88)` dan bayangan kanvas
    per jenis sudah dibuang: rambu adalah objek dunia seperti pohon dan tiang lampu. `--in` hanya
    mengatur `pointer-events`/`cursor`; tombolnya tetap ada supaya bisa diketuk dan difokus.
12. **Geometri tiang hanya di `METERS`.** `SIGN_POLE_ART` dan `signPolePx()` sama-sama turun dari
    `METERS.sign.pole`; jangan tulis angka tiang di CSS lagi (pernah 2,0 m vs 1,8 m dan hanya ghost
    yang kelihatan salah).
13. **Ujung jauh diukur, bukan dikira-kira.** Ukur dengan median selisih warna antar-baris layar
    (ffmpeg → rawvideo): 61 satuan = garis keras; ≤15 = halus. Kabut di atas prop akan memotong badan
    rumah 6,5 m, jadi kabut ditaruh di bawah scenery dan poligon `band()` diperpanjang ke titik hilang.

---

## 8. Riwayat keputusan penting

| keputusan | alasan | biaya kalau salah |
|---|---|---|
| framing trotoar kiri, jalan dipotong | menghapus anisotropi vw/vh dan mobil:lajur | art persimpangan harus digambar |
| satu tabel meter | menghapus "anak raksasa, mobil mini" | semua ukuran harus dikonversi |
| scenery kontinu (bukan sabuk) | menghapus pengulangan 3,3 detik | guard harus jadi simulasi |
| rambu diacak per seed, batch 3 | anak tidak menghafal urutan | kalimat perhentian harus dinamis |
| lembar = keterangan resmi, narasi = balon | lembar terlalu padat | perlu pose bicara + balon |
| `SIGN_EMPHASIS` 1,5 sebagai afordansi | rambu 0,6 m terlalu kecil di HP | satu konstanta |
| halte 0,80 m (bukan 1,2–1,5) | agar muat pita kerb 2 m | lihat B3 |
| persimpangan 2.5D menggantikan layar datar | scene tidak terasa keluar dari game | lihat T1 |

---

## 9. Definition of Done (ringkas)

- [ ] `pnpm test`, `tsc -b`, `vite build` hijau
- [ ] Alur penuh bisa diselesaikan tanpa mouse (keyboard + screen reader)
- [ ] Fokus tidak pernah jatuh ke `<body>`
- [ ] `prefers-reduced-motion` tidak menghilangkan narasi
- [ ] Tidak ada prop yang menutupi > 50 % lebar layar dalam 45 detik simulasi
- [ ] Pass visual di HP sungguhan (belum)
- [ ] FPS ≥ 55 di HP mid-range (belum diukur)
