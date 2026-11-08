# PRODUCT.md — Petualangan Rambu Lalu Lintas

PRD hidup. Perbarui berkas ini ketika keputusan produk berubah; `AGENTS.md` memuat cara kerjanya,
`DESIGN.md` memuat aturan visualnya.

**Repo:** `/home/lann/Projects/Ina` · React 19 + Vite 8 + TypeScript 7 · tanpa backend
**Status verifikasi terakhir:** `pnpm test` 200/200 (10 berkas) · `tsc -b` bersih · `vite build` hijau

---

## 1. Masalah dan tujuan

Rambu lalu lintas diajarkan sebagai daftar hafalan: nama, gambar, arti. Anak kelas II SD (7–8 tahun)
lupa daftarnya karena tidak ada yang menghubungkan bentuk dengan makna.

**Tujuan belajar:** anak mengenali rambu dari **bentuk + warna** lebih dulu, nama dan artinya kemudian.

| bentuk + warna | jenis | contoh |
|---|---|---|
| segitiga kuning | peringatan | banyak anak menyeberang |
| bulat merah | larangan | dilarang masuk, dilarang parkir |
| bulat biru | perintah | belok kiri |
| persegi biru | petunjuk | tempat menyeberang |

Kalau anak bisa berkata "segitiga kuning berarti ada yang harus kuhindari", ia sudah mencapai tujuan —
tanpa menghafal keenam nama.

---

## 2. Audiens dan konteks pakai

- **Siapa:** anak kelas II SD, memegang **HP sendiri**, dipandu orang tua atau guru di dekatnya.
- **Bahasa:** Indonesia, register anak — "aku", bukan "anda". Kalimat per beat ≤ 90 karakter, ≤ 2
  kalimat (dikunci `story.test.ts`).
- **Perangkat:** HP 360 px lebih dulu; desktop boleh, tetapi bukan target utama.
- **Sendiri atau berkelompok:** satu anak per layar. Tidak ada akun, tidak ada penyimpanan server.

---

## 3. Alur

```
kelas ──"Keluar kelas"──> jalan (3 rambu, berhenti di tiap rambu)
                              │
                              └─> persimpangan
                                     ├── lurus  → jalan lagi (3 rambu berikutnya)
                                     ├── kiri   → materi (3 rambu + papan)
                                     └── kanan  → kuis (5 soal) ─> rumah
```

| stage | isi | keluar lewat |
|---|---|---|
| `intro` | layar kelas, satu kalimat Bu Guru | tombol "Keluar kelas" |
| `walk` | scene 2.5D berjalan; anak berhenti di rambu ke-1..3 | "Apa ini?" / "Lanjut jalan" |
| `crossroad` | tiga papan: lurus, materi, kuis | pilih papan |
| `materi` | tiga rambu + papan penjelas | "Ke kuis" / "Ke jalan" |
| `kuis` | 5 soal pilihan ganda | jawab semua → "Selesai" |
| `home` | rumah + bintang + ringkasan | "Pulang" / "Mulai lagi" |

Setiap kali anak berhenti di rambu, dunia **berhenti** (mode `stopped`), rambu menjadi tombol yang
bisa difokus dan diketuk, panel bawah menampilkan kalimat perhentian + dua tombol.

---

## 4. Isi konten

| konten | jumlah | berkas |
|---|---|---|
| rambu | 6 (`anak`, `zebra`, `dilarang-masuk`, `belok-kiri`, `hati-hati`, `dilarang-parkir`) | `src/data.ts` `SIGNS` |
| rambu per perjalanan | 3, diacak per seed | `src/run.ts` `BATCH_SIZE` |
| beat naskah | 8 statis + kalimat perhentian dinamis | `src/story.ts` |
| soal kuis | 5 | `src/data.ts` `QUESTIONS` |

Tiap rambu membawa empat bidang teks: `name`, `meaning`, `tip`, dan `visual` (deskripsi gambar untuk
pembaca layar yang **tidak** memuat nama/arti, karena itu jawaban kuis).

Urutan rambu **tidak boleh dihafal**: `run.ts` mengacak urutan dari seed, dan setiap perjalanan baru
mengacak ulang dengan menghindari rambu terakhir yang barusan dilihat.

---

## 5. Skor dan umpan balik

| benar dari 5 | bintang |
|---|---|
| ≥ 4 | Bintang 3 |
| 2–3 | Bintang 2 |
| 0–1 | Bintang 1 |

Anak **tidak pernah gagal**: skor 0 tetap pulang dengan Bintang 1 dan kalimat yang menyemangati. Tiap
soal punya `why` yang tampil setelah dijawab — penjelasan, bukan hukuman.

---

## 6. Non-goal (disengaja, jangan dikerjakan tanpa permintaan)

- **Audio/suara.** Dibatalkan.
- **Deploy, akun, progres server, leaderboard.** Aplikasi jalan di localhost; tidak ada backend.
- **Animasi realistis / 3D.** Yang dicari "kids interactive web" yang hidup, bukan simulasi.
- **Perspektif untuk langit.** Burung bergerak linear; ia di atas dunia, bukan di dalamnya.
- **Aset raster.** Semua gambar SVG inline; tidak ada file gambar yang dimuat.

---

## 7. Kondisi sekarang — jujur

### 7.1 Yang berjalan

| bagian | status |
|---|---|
| scene 2.5D: trotoar kiri, jalan terpotong di kanan | stabil |
| satu tabel meter untuk semua objek | stabil; `scene/meters.ts` |
| scenery kontinu: lahir di horizon, lepas di tepi frame | stabil; 5–7 objek serentak, jalan tidak pernah kosong |
| trafik + pejalan, lalu lintas kiri Indonesia | stabil; 5 kendaraan + 3 pejalan, depth-sorted |
| rambu sebagai objek dunia: datang dari horizon, berhenti, dilewati | stabil |
| ujung jauh menyatu ke titik hilang + kabut | stabil (median tepi 15, dulu 61) |
| persimpangan 2.5D tiga jalur | jalan, **rupa belum diverifikasi mata manusia** |
| lembar rambu (keterangan resmi) + balon narasi | stabil |
| kuis 5 soal + bintang 4/2 | stabil, terkunci tes |
| reduced motion, fokus tidak jatuh ke `<body>`, kontras AA | jalan untuk alur utama |

### 7.2 Bug terbuka yang dilaporkan manusia

| # | keluhan | dugaan | berkas |
|---|---|---|---|
| B1 | persimpangan: tiga papan terasa "ditempel", belum terbaca sebagai perempatan | jalan samping poligon kasar, belum ada arti kedalaman | `src/Junction.tsx`, `junction.css` |
| B2 | balon narasi bisa melewati tepi kanan di 360 px | `max-width: min(58vw, 300px)` mulai dari 34 % lebar hero | `src/walk.css` `.wk-bubble` |
| B3 | halte terasa terlalu tipis (0,80 m) | lebar diturunkan agar muat pita kerb | `scene/props.ts`, `meters.ts` |
| B4 | bangku 0,67 m terasa pendek | art profil 55×70 mengikuti lebar, bukan panjang | `art/scenery.tsx` `Bench` |

### 7.3 Utang verifikasi (bukan bug yang diketahui)

- **Pass visual di HP sungguhan belum pernah.** Semua bukti berasal dari Chromium headless
  360×640 / 360×800 / 390×844 / 1024×600 / 1280×800.
- **FPS belum diukur** di perangkat; node beranimasi sudah menyentuh plafon 30, jadi tidak ada ruang
  menambah objek tanpa memangkas node lain.
- **Firefox** baru dirender sekali, belum interaktif penuh.

---

## 8. Rencana lanjutan

### Fase 1 — tutup bug yang dilaporkan
1. **T1 · Persimpangan terbaca sebagai perempatan** (B1). Jalan samping digambar bertahap, bukan
   poligon kasar. Terima: pada 360×640 tiga papan terpisah ≥ 12 px dan tidak ada yang menutupi anak.
2. **T2 · Balon narasi tidak melewati frame** (B2). `max-width` dihitung dari sisa ruang ke tepi kanan.
3. **T3 · Proporsi halte & bangku** (B3, B4).
4. **T4 · Alur berulang.** "Jalan lagi" dua kali → 9 rambu, 6 pertama unik.

### Fase 2 — verifikasi
5. **T5** Rekam layar 30 detik di HP sungguhan.
6. **T6** Ukur FPS, CPU throttle 4×.
7. **T7** Firefox interaktif sampai rumah.

### Fase 3 — fitur
- **F1 · Kuis dari rambu yang dilihat.** Soal diambil dari batch yang barusan dilihat.
- **F2 · Materi dua arah.** Dari materi bisa kembali ke jalan tanpa lewat kuis.
- **F3 · Progres tersimpan** di localStorage (rambu mana yang sudah dilihat).

---

## 9. Definition of Done

- [ ] `pnpm test`, `tsc -b`, `vite build` hijau
- [ ] Alur penuh bisa diselesaikan **tanpa mouse** (keyboard + pembaca layar)
- [ ] Fokus tidak pernah jatuh ke `<body>`
- [ ] `prefers-reduced-motion` tidak menghilangkan narasi
- [ ] Tidak ada prop yang menutupi > 50 % lebar layar dalam 45 detik simulasi
- [ ] Anak bisa menyelesaikan alur tanpa diminta membaca teks di luar panel
- [ ] Pass visual di HP sungguhan — **belum**
- [ ] FPS ≥ 55 di HP mid-range — **belum diukur**

---

## 10. Riwayat keputusan produk

| keputusan | alasan | biaya kalau salah |
|---|---|---|
| framing trotoar kiri, jalan dipotong | menghapus anisotropi vw/vh dan mobil:lajur | art persimpangan harus digambar |
| satu tabel meter | menghapus "anak raksasa, mobil mini" | semua ukuran harus dikonversi |
| scenery kontinu, bukan sabuk berulang | menghapus pengulangan 3,3 detik | guard harus jadi simulasi |
| rambu diacak per seed, batch 3 | anak tidak menghafal urutan | kalimat perhentian harus dinamis |
| lembar = keterangan resmi, narasi = balon | lembar terlalu padat untuk dua tugas | perlu pose bicara + balon |
| `SIGN_EMPHASIS` 1,5 sebagai afordansi | rambu 0,6 m terlalu kecil di HP | satu konstanta |
| rambu jadi objek dunia (tumbuh dari horizon) | menghapus "spawn/despawn" yang tidak wajar | tombol harus tetap bisa difokus |
| denyut "ketuk aku" dihapus | panel sudah punya tombol "Apa ini?"; denyut terbaca sebagai artefak UI | afordansi ketuk harus datang dari teks panel |
