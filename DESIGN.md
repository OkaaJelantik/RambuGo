# DESIGN.md — sistem visual scene 2.5D

Aturan visual, warna, dan proyeksi. Kerjakan bersama `AGENTS.md` (cara kerja) dan `PRODUCT.md` (apa
dan untuk siapa).

Satu prinsip menurunkan hampir semua aturan di bawah: **satu meter adalah satu meter untuk setiap
objek pada kedalaman yang sama.** Semua yang terlihat "kegedean", "gepeng", atau "melayang" di scene
ini pernah berasal dari pelanggaran prinsip itu.

---

## 1. Prinsip

1. **Satu meter untuk semua.** Ukuran = `meter × pxPerM(vh) × depthScale(depth)`. Tidak ada
   `clamp()`, `vh`, `vw`, atau px literal untuk ukuran objek. `vw` hanya dipakai untuk dekorasi yang
   memang di luar dunia (burung, lebar balon narasi).
2. **Kamera di trotoar kiri.** Hanya satu trotoar dalam frame; jalan dipotong di kanan dan sisi seberang
   tidak pernah digambar.
3. **Garis tebal, isian rata.** Gaya "kids comic": tinta `--ink`, garis 4 unit di viewBox art, tanpa
   gradien 3D, tanpa `filter`. Bayangan = elips tinta 14–16 % di dalam art, bukan efek.
4. **Bentuk sebelum kata.** Rambu harus terbaca dari siluetnya (segitiga/bulat/persegi) di 74 px.
5. **Hidup, bukan realistis.** Objek berdenyut, tumbuh, dan lewat; tidak ada fisika.

---

## 2. Token warna (`src/index.css`)

| token | nilai | dipakai untuk |
|---|---|---|
| `--ink` | `#2a2320` | garis, teks, bayangan |
| `--paper` | `#fff9ee` | kartu, balon narasi, panel |
| `--paper-line` | `#f0e3cc` | garis kartu |
| `--sky-1` | `#8fd8ff` | langit atas |
| `--sky-2` | `#d6f1ff` | langit bawah |
| `--fog` | `#e9f7ff` | kabut cakrawala (diturunkan dari `--sky-2`) |
| `--grass` | `#69c64a` | taman |
| `--grass-dark` | `#4fa936` | bukit, gradasi bawah taman |
| `--road` | `#5b606b` | aspal, logam tiang |
| `--road-line` | `#f7f3e8` | marka |
| `--red` / `--red-dark` | `#e0453f` / `#b8342f` | larangan |
| `--yellow` / `--yellow-dark` | `#ffc93c` / `#dfa413` | peringatan |
| `--blue` / `--blue-dark` | `#2e7be0` / `#1f5cb3` | perintah, petunjuk |
| `--orange` / `--orange-dark` | `#ff8a3d` / `#d9691f` | kayu, aksen |
| `--green` | `#1c9b6b` | dedaunan, tempat sampah |
| `--shadow`, `--radius` | `0 10px 0 … , 0 20px 44px …` / `28px` | kartu dan panel |

Turunan warna selalu lewat `color-mix(in srgb, var(--x) n%, var(--y))` di CSS **atau di SVG** —
`stop-color` dan `fill` menerima `color-mix`, jadi tidak ada palet kedua di JS.

**Kontras:** teks `--ink` di atas tint 25 % warna jenis ≥ 11:1. Satu aturan untuk keempat jenis
(`.kind-chip`), bukan aturan per jenis. Kontras tidak dikunci tes — periksa manual saat mengubah warna.

---

## 3. Tipografi

| peran | font | catatan |
|---|---|---|
| judul, judul kartu, skor | `Fredoka` → `Nunito` → system | membulat, tebal |
| isi, panel, tombol | `Nunito` → system | x-height besar, ramah anak |
| label jenis rambu | inherit | `text-transform: uppercase`, `letter-spacing: 0.06em` |

Font **tidak diunduh**; kalau tidak tersedia di perangkat, sistem yang dipakai. Jangan menambah
`@font-face` tanpa membundel berkasnya.

---

## 4. Tabel meter (`src/scene/meters.ts`)

Satu-satunya sumber ukuran dunia. Angka mengikuti ukuran nyata yang child-friendly.

| objek | meter | keterangan |
|---|---|---|
| anak (hero) | kotak art `1,35` | tinta di dalamnya ≈ 1,10 m; tidak dinormalisasi |
| lajur jalan | `2,4` | jalan kampung, bukan arteri |
| trotoar | `2,0` | |
| mobil | lebar `1,8` | tinggi mengikuti aspek art (1,01 m), bukan tinggi nyata |
| motor | lebar `0,7` | |
| pelat rambu | `0,60` | Ø pelat |
| tiang rambu | `1,8` | tebal `0,09` |
| rumah | `6,5` | |
| ruko | `4,0` | |
| pohon | `3,5` | |
| tiang listrik | `9,0` | |
| halte | `1,8` | 1,07× lebih tinggi dari itu di art |
| lampu jalan | `4,5` | |
| tong sampah | `0,9` | |
| bangku | `0,85` | |
| pagar | `1,2` | |
| orang dewasa / anak | `1,7` / `1,2` | pejalan ambience |
| marka | `0,45 × 0,14` | digambar sebagai bidang datar |

Menambah jenis objek = menambah baris di sini **dan** `PROP_ART` di `WalkScene.tsx` (pasangan
`height` + `ratio` dari art-nya). Jangan menulis tinggi atau lebar di CSS.

---

## 5. Model proyeksi (`src/scene/projection.ts`)

`depth` 0 di kaki kamera, 1 di horizon. Kamera memfokus pada kedalaman anak, jadi `depthScale` = 1 di
sana dan semua objek diskalakan relatif terhadapnya.

```
CAMERA_DEPTH = 0.12      HORIZON = 0.38      DEPTH_K = 9
scaleAt(d)      = 1 / (1 + 9·d)
depthScale(d)   = scaleAt(d) / scaleAt(0.12)          // = 1 pada kedalaman anak
pxPerM(vh)      = clamp(vh, 640, 1000) × 0.185        // 148 px/m pada 800
pxAt(m, d, vh)  = m × pxPerM(vh) × depthScale(d)
offsetX(m, d, w, h) = w/2 + m × pxPerM(h) × depthScale(d)
yAt(d)          = 0.38 + 0.62 × scaleAt(d)            // fraksi tinggi viewport
```

Akibat yang perlu diingat:

- `pxPerM` dari **tinggi** viewport, bukan lebar. HP tinggi = satu meter lebih besar di layar.
- Tanah berakhir di `yAt(1) = 44,2 %`, **bukan** di horizon 38 %. Selisih 6,2 % itu adalah ruang
  langit+kabut; mengisinya dengan rumput membuat jalan "terputus".
- `band()` di `GroundScene.tsx` meneruskan poligon sampai **titik hilang** `(w/2, 0.38·h)`; kedua
  sisinya segaris dengan titik yang sudah ada, jadi bentuknya tidak berubah, hanya ujungnya.

### 5.1 Fade

| fungsi | perilaku | dipakai |
|---|---|---|
| `fadeAt(d)` | 1 sampai `0.62`, 0 di `0.92` | objek masuk dari kabut |
| `nearFadeAt(d)` | 0 di `≤0.06`, 1 di `≥0.16` | objek lewat kamera |
| `propNearFade(kind, d)` | 1 → 0 antara `nearest+0.05` dan `nearest` | batas umur per jenis |
| guard lebar (`beltOpacity`) | 0 saat cakupan ≥ 50 % frame | jaring pengaman terakhir |

Objek **lahir di `depth 1,0`** karena di sana `fadeAt = 0`: mustahil muncul di tengah layar.

---

## 6. Pita lateral (meter dari garis kamera)

| pita | x | isi |
|---|---|---|
| jalur anak | `−0,90` | hero; tinta −1,263 … −0,537 |
| tepi taman | `−1,85` | tong sampah |
| taman | `≤ −2,30` | bangku −2,60 · pohon −2,80 · tiang listrik −2,90 · pagar −3,50 · ruko −4,20 · rumah −5,00 |
| kerb | `−0,50 … +0,30` | halte −0,10 · lampu +0,25 · rambu +0,30 |
| jalan | `+0,30 … 2,70` | lajur dekat |
| seberang | `> 2,70` | lajur jauh, tidak pernah terlihat utuh |

Aturan: **tidak ada objek yang boleh menutupi jalur anak.** Jarak bebas minimum 3 cm dikunci
`scale.test.ts` untuk setiap prop di pita trotoar.

---

## 7. Lapisan, urutan cat, dan z-index

| lapisan | z | catatan |
|---|---|---|
| langit → bukit → haze → verge → trotoar → jalan → kerb | 0 | urutan DOM di `GroundScene`; jalan dicat **sebelum** garis kerb, kalau tidak garisnya tertimbun |
| marka | 1 | |
| burung | 2 | tanpa skala kedalaman |
| kabut | 3 | di atas marka, **di bawah** scenery |
| prop, kendaraan, pejalan, **rambu** | `propZ(d) = 20 + round((1−d)·80)` (`WalkScene.tsx`) | near menimpa far |
| hero | 200 | tidak pernah tertutup |
| HUD | 400 | pil atas, di atas kepala hero |
| balon narasi | 500 | |

`.wk-scene` memakai `isolation: isolate`, jadi seluruh isi scene (termasuk HUD 400) tetap di bawah
overlay lembar rambu (`z-index: 40` di `index.css`).

Rambu **ikut depth-sorted**. Kalau ia diberi z tetap di atas segalanya, pejalan yang melintas di
depannya digambar di belakangnya dan rambu terbaca sebagai tempelan di kaca.

---

## 8. Gerak

| besaran | nilai |
|---|---|
| kecepatan jalan | `0.30` kedalaman/detik (jalan santai anak) |
| panjang leg | `6,0` detik = 1,8 satuan kedalaman |
| kedalaman berhenti rambu | `0.22` |
| node beranimasi | **≤ 30** (sekarang 30: 10 prop + 8 marka + hero + rambu + ghost + 5 kendaraan + 3 pejalan + 1 burung) |

Aturan:

1. **Satu loop rAF**, satu penulis gaya per elemen. `setState` hanya untuk perubahan struktural.
2. **Tidak ada transisi CSS pada transform/opasitas yang ditulis loop.** Transisi akan melawan nilai
   per frame. `opacity: 0` di CSS hanya cadangan sebelum JS jalan.
3. **`prefers-reduced-motion`** mematikan denyut, langkah kaki, gelombang tangan, dan burung; narasi
   tetap tampil.
4. **Jangan mount/unmount SVG per objek.** Slot tetap; yang berganti hanya jenis art.
5. **Animasi CSS boleh** untuk dekorasi yang tidak punya kedalaman dan tidak disentuh loop — burung
   (`wk-birds-fly`, 34 s linear) adalah satu-satunya contoh.

---

## 9. Geometri rambu

```
pelat dunia      0,60 m            → 0,60 × 1,5 (SIGN_EMPHASIS) × 1,05 (SIGN_PLATE_GROW) = 0,945 m
tiang dunia      1,8 m × 0,09 m    → 2,7 m × 0,135 m setelah emphasis
kedalaman berhenti                 → 0,22
render @360×800   pelat 97,6 px, tiang 279 px, seluruh gambar 377 px
```

- `SIGN_EMPHASIS` = 1,5 adalah **afordansi permainan**, bukan ukuran dunia: pelat 0,6 m hanya 44 px di
  HP, terlalu kecil untuk dilihat anak 7 tahun dan terlalu kecil untuk diketuk. Yang diperbesar hanya
  render rambu; `METERS` tidak pernah diskalakan.
- Seluruh rambu adalah **satu `<svg>`** (`SignFigure`) dengan viewBox `120 × 462,9` unit; pelat
  menempati 120 unit pertama, tiang 342,9 unit di bawahnya. Satu unit = 0,945 m / 120.
- Art pelat memakai `ART` dari `SignArt.tsx` (viewBox 120×120), jadi lembar rambu, kuis, dan scene
  memakai gambar yang sama.
- Tidak ada kanvas di belakang pelat: bentuknya sudah digambar di art (`warningFrame`, `circle`,
  `rect`). Bayangan kotak di balik segitiga adalah bug yang pernah ada.
- **Tidak ada denyut "ketuk aku".** Rambu adalah objek dunia; afordansi ketuk datang dari teks panel.

---

## 10. Art

| berkas | isi | sudut pandang |
|---|---|---|
| `art/scenery.tsx` | House, Shop, Tree, StreetLamp, Fence, Bin, Bench, BusStop, PowerPole, Birds | 3-4 untuk benda tepi jalan; House/Shop fasad depan |
| `art/vehicles.tsx` | Car, Motorcycle (depan & belakang) | dilihat sedikit dari atas |
| `art/people.tsx` | Pedestrian (dewasa/anak, depan/belakang) | profil/depan |
| `art/HeroWalk.tsx` | anak berjalan dari belakang, 3 pose | belakang |
| `Kid.tsx` | anak menghadap kamera (kelas, persimpangan, bicara) | depan |

Aturan art:

- `aria-hidden="true"` untuk semua dekorasi; deskripsi untuk pembaca layar datang dari teks, bukan art.
- Bayangan kontak = `<ellipse>` tinta 14–16 % di dalam viewBox, bukan `filter: drop-shadow`.
- `strokeLinejoin="round"`, `strokeLinecap="round"`, tebal garis 3–4 unit.
- Isian dari token; jangan menulis hex di art kecuali untuk putih (`#FFFFFF`) di dalam rambu.
- Jangan memperbaiki House/Shop jadi 3-4 tanpa mengganti seluruh latar ke satu titik hilang.

---

## 11. Aksesibilitas

- Kontrol interaktif nyata: `<button>`, bukan `<div onClick>`.
- Fokus **tidak pernah** jatuh ke `<body>` setelah aksi: `App` menyimpan target fokus berikutnya dan
  memindahkannya sebelum elemen lama lepas dari DOM.
- Rambu yang tidak aktif `disabled` + `aria-hidden`; ghost rambu `aria-hidden` dan bukan tombol,
  sehingga tidak menambah titik tab.
- Panel bawah memakai live region (`role="status"`) untuk narasi dan umpan balik kuis.
- Semua gambar dekoratif `aria-hidden`; setiap tombol punya label yang menyebut aksinya.
- `prefers-reduced-motion` tidak boleh menghilangkan informasi, hanya gerak.
- Target ketuk minimum 44 px; pelat rambu 97,6 px di HP memberikan ruang lebih dari cukup.

---

## 12. Verifikasi visual

Tiga teknik yang sudah terbukti di repo ini (detail perintah di `AGENTS.md` §6):

1. **Rasio kotak vs `viewBox`** — objek gepeng selalu muncul sebagai rasio inline yang tidak sama
   dengan rasio art-nya.
2. **Median selisih warna antar-baris** pada screenshot mentah — mendeteksi garis keras selebar layar
   yang tidak terlihat dari markup. Ambang: garis keras ≥ 40, halus ≤ 15.
3. **Empat viewport × tiga waktu**, plus keadaan berhenti; periksa `pageerror` dan slot yang tampil
   tanpa art.
