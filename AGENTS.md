# AGENTS.md

Panduan kerja untuk agen/kontributor di repo ini. Baca **`PRODUCT.md`** (apa yang dibangun dan untuk
siapa) dan **`DESIGN.md`** (aturan visual, proyeksi, dan warna) sebelum mengubah apa pun.

Ringkas: aplikasi web interaktif untuk anak kelas II SD, mengenali rambu lalu lintas lewat **bentuk +
warna**. React 19 + Vite 8 + TypeScript 7, tanpa backend, tanpa aset eksternal — semua gambar adalah
SVG inline dan semua ukuran berasal dari satu tabel meter.

---

## 1. Perintah

```bash
pnpm install
pnpm dev                       # http://127.0.0.1:5173 (host 0.0.0.0)
pnpm test                      # vitest run — 200 tes, 10 berkas
pnpm exec tsc -b               # typecheck (strict)
pnpm exec vite build           # build produksi
pnpm preview                   # http://127.0.0.1:4173
```

**Gerbang sebelum commit — ketiganya, bukan sebagian:**

```bash
pnpm test && pnpm exec tsc -b && pnpm exec vite build
```

`vitest` **tidak** memproses CSS produksi. Pernah ada commit yang lolos 180 tes tetapi `vite build`
gagal karena `@keyframes` yatim. Jangan percaya tes saja untuk perubahan CSS.

Commit wajib **pathspec**, bukan `git add -A`, supaya tidak menyapu berkas yang tidak dimaksud:

```bash
git commit -m "…" -- src/a.tsx src/walk.css
```

---

## 2. Peta berkas

| berkas | tanggung jawab |
|---|---|
| `src/main.tsx` | mount React |
| `src/App.tsx` | mesin stage (`intro → walk → crossroad → materi/kuis → home`), state run, lembar rambu, fokus |
| `src/Classroom.tsx` | layar kelas |
| `src/Junction.tsx` | persimpangan 2.5D, tiga tombol papan |
| `src/DialoguePanel.tsx` | panel bawah: live region + teks + tombol beat |
| `src/WalkScene.tsx` | **inti scene**: satu loop rAF, pool scenery, ambience, rambu, HUD |
| `src/Kid.tsx` | anak menghadap kamera (kelas, persimpangan, pose bicara) |
| `src/SignArt.tsx` | `ART` (bentuk rambu, viewBox 120×120) + `describeSign` |
| `src/data.ts` | `KINDS`, `SIGNS` (6), `QUESTIONS` (5) |
| `src/story.ts` | beat naskah, `stopLine`, pembuka per rambu |
| `src/run.ts` | antrean rambu diacak per seed, batch 3, `initialSeed()` |
| `src/scene/meters.ts` | **satu tabel meter** untuk seluruh scene |
| `src/scene/projection.ts` | `pxPerM`, `pxAt`, `offsetX`, `scaleAt`, `depthScale`, `yAt`, `fadeAt`, `nearFadeAt`, `SIGN_STOP_D` |
| `src/scene/world.ts` | reducer murni: `scroll`, `travel`, `mode`, `signDepth()` |
| `src/scene/props.ts` | spawner scenery: bobot, jarak, `nearest`, prewarm, pool |
| `src/scene/spawner.ts` | spawner trafik & pejalan (deterministik) |
| `src/scene/GroundScene.tsx` | jalan, trotoar, kerb, bukit dari proyeksi yang sama |
| `src/art/*` | `scenery` (rumah, pohon, tiang, halte, burung, …), `vehicles`, `people`, `HeroWalk` |
| `src/*.css` | `index.css` (token + shell), `walk.css` (scene), `dialog.css`, `classroom.css`, `junction.css` |

---

## 3. Aturan yang tidak boleh dilanggar

Alasan lengkap tiap aturan ada di `DESIGN.md`; daftar ini yang paling sering dilanggar.

1. **Satu meter untuk semua.** Ukuran objek = `meter × pxPerM(vh) × depthScale(depth)`. Tidak boleh
   ada `clamp()`, `vh`, `vw`, atau px literal untuk ukuran objek. Ini pernah jadi bug "anak raksasa,
   mobil mainan".
2. **Satu loop rAF + reducer murni.** Tidak ada `setState` per frame. `setState` hanya untuk
   perubahan struktural (spawn, ganti stage, ganti beat). Gaya ditulis langsung ke `ref`.
3. **≤ 30 node beranimasi.** Sekarang 30 dari plafon 30: 10 prop + 8 marka + hero + rambu + ghost
   rambu + 5 kendaraan + 3 pejalan + 1 burung. Menambah node berarti memangkas node lain.
4. **Tidak ada `filter`/`backdrop-filter` di dalam scene.** Bayangan = art, bukan efek.
5. **`prefers-reduced-motion`** mematikan semua animasi tak terbatas; narasi tetap jalan.
6. **Jangan mount/unmount SVG per objek.** Slot tetap; yang berganti hanya jenis art.
7. **Determinisme.** Semua acak dari `mulberry32` ber-seed. `?seed=` mengulang run yang sama.
8. **Fokus tidak pernah jatuh ke `<body>`** setelah aksi (lembar tutup, jawab kuis, ganti stage).
9. **Kotak `.wk-prop` dimiliki `draw()`, bukan `measure()`.** Pool menukar jenis di dalam satu slot;
   ukuran yang diukur sekali akan tertinggal satu jenis dari `placeProp` → objek bergeser dan gepeng.
   Ditulis ulang hanya saat `el.dataset.kind` berubah.
10. **`propKinds` harus di-seed dari pool** (`propKindsOf(pool)`). Kalau dimulai `null`, slot prewarm
    tampil sebagai `<div>` kosong ±1 detik: "jalan kosong di detik pertama".
11. **Rambu adalah satu gambar** (`SignFigure`: satu `<svg>`, pelat + tiang). Jangan pecah jadi dua
    elemen yang bisa lepas satu sama lain.
12. **Ujung jauh diukur, bukan dikira-kira.** Lihat §6.

---

## 4. Angka acuan

| konstanta | nilai | di mana |
|---|---|---|
| kecepatan jalan | `0,30` kedalaman/detik | `scene/world.ts` `SCROLL_PER_SEC` |
| panjang leg | `6,0` detik (1,8 satuan kedalaman) | `scene/world.ts` `LEG_SECONDS` |
| rambu per leg | 3 (`BATCH_SIZE`) | `run.ts` |
| kedalaman berhenti rambu | `0,22` | `scene/projection.ts` `SIGN_STOP_D` |
| kedalaman rambu | `min(1, 0,22 + 0,30 × sisa leg)` | `scene/world.ts` `signDepth` |
| pelat rambu (dunia) | `0,60` m | `meters.ts` |
| pelat rambu (render) | `0,60 × 1,5 × 1,05` → 97,6 px @360×800 | `SIGN_EMPHASIS`, `SIGN_PLATE_GROW` |
| viewBox rambu | `120 × 462,9` unit (1 unit = 0,945 m / 120) | `WalkScene.tsx` `SIGN_BOX` |
| scenery: pool | 10 slot | `scene/props.ts` |
| scenery: lahir | kedalaman `1,0` (= `fadeAt` 0) | `PROP_SPAWN_D` |
| scenery: jeda spawn | `0,30–0,55` s | `PROP_WAIT` |
| scenery: jarak minimum | `0,07` kedalaman per pita | `PROP_MIN_GAP` |
| scenery: paling dekat | taman `0,10` · tepi taman `0,12` · kerb `0,26–0,34` | `PROP_RULES[].nearest` |
| scenery: fade dekat | `0,05` kedalaman | `PROP_NEAR_FADE` |
| scenery: prewarm | 6 slot @ `0,98/0,86/0,74/0,62/0,50/0,38`, pita dirotasi | `props.ts` `PREWARM` |
| trafik | 5 kendaraan, 3 pejalan, jeda 0,5–1,2 s / 1,5–3 s | `WalkScene.tsx` |
| marka | 8 buah | `DASH_COUNT` |
| plafon node | 30 | `DESIGN.md` §8 |

---

## 5. Lapisan dan z-index

| lapisan | z | catatan |
|---|---|---|
| `.wk-ground` (langit, bukit, haze, verge, jalan) | 0 | statis, digambar dari proyeksi |
| `.wk-dash` (marka) | 1 | |
| `.wk-birds` (burung) | 2 | tanpa skala kedalaman |
| `.wk-fog` (kabut cakrawala) | 3 | di atas marka, **di bawah** scenery |
| `.wk-prop`, `.wk-traffic-item`, `.wk-sign` | `propZ(depth)` = `20 + round((1−d)×80)` (`WalkScene.tsx`) | semuanya depth-sorted, termasuk rambu |
| `.wk-hero-zone` | 200 | anak tidak pernah tertutup |
| `.wk-hud` | 400 | |
| `.wk-bubble` (balon narasi) | 500 | |
| overlay lembar (`.sheet` di `index.css`) | 40 | `.wk-scene` punya `isolation: isolate`, jadi seluruh isi scene tetap di bawahnya |

Rambu **tidak** punya z tetap: ia diurutkan menurut kedalaman seperti objek lain, jadi pejalan atau
tiang yang lebih dekat menutupinya dengan benar.

---

## 6. Cara memverifikasi secara visual

Model tidak bisa "melihat" tanpa bukti terukur. Tiga teknik yang sudah dipakai di repo ini:

**a. Dump DOM per frame.** Bandingkan kotak inline tiap slot dengan `viewBox` art-nya; rasio yang
tidak cocok = objek gepeng. Playwright tersedia di mesin ini:

```js
import { chromium } from '/home/lann/node_modules/playwright/index.mjs'
const page = await browser.newPage({ viewport: { width: 360, height: 800 } })
await page.goto('http://127.0.0.1:5173/?s=walk', { waitUntil: 'load' })
```

**b. Ukur tepi keras.** Screenshot → `ffmpeg -i x.png -f rawvideo -pix_fmt rgb24 x.raw` → hitung
**median** selisih warna antar-baris pada area cakrawala. Garis selebar layar memberi median 40–61;
gradien halus ≤ 15. Median lebih jujur daripada maksimum (maksimum selalu tinggi karena objek).

**c. Empat viewport, tiga waktu.** `360×640`, `360×800`, `390×844`, `1280×800`; potret pada ~1 s,
~3 s, ~5,5 s, plus keadaan berhenti di rambu. Yang diperiksa: tidak ada slot tampil tanpa art, tidak
ada `pageerror`, dan satu anak rambu saja yang interaktif.

---

## 7. Parameter URL (hanya build dev)

| param | arti |
|---|---|
| `?s=walk` | langsung ke scene berjalan (`intro`, `walk`, `crossroad`, `materi`, `kuis`, `home`) |
| `?step=N` | mulai dari langkah ke-N (0–2) |
| `?seed=123` | paksa seed run; mengulang urutan rambu yang sama |
| `?still` | matikan semua animasi & transisi (untuk screenshot) |

`?still` menulis `.app.still * { animation: none !important }` — animasi CSS ikut mati, jadi jangan
memakai `?still` kalau yang diuji justru animasinya.

---

## 8. Jebakan yang sudah pernah menggigit

1. **Jangan paralel pada berkas yang sama.** Dua agen di `WalkScene.tsx` meninggalkan tree gagal
   compile.
2. **`vite build` sebelum commit** (vitest tidak memproses CSS).
3. **Tes yang menyentuh tabelnya sendiri itu tautologi.** Assertion harus menyentuh kotak produksi
   (`propBox`/`placeProp`/`heroBox`) atau DOM hasil render. Pernah ada `scale.test.ts` 295 baris yang
   tidak bisa gagal — sekarang tiap guard diuji dengan mutasi.
4. **Jangan melepas objek sebelum fade-nya selesai.**
5. **Arah kedalaman**: objek mendekat = `depth − scroll`. Salah tanda = pool penuh lalu berhenti.
6. **Guard yang menentukan sebuah angka harus menyebut angkanya**, bukan membandingkan konstanta
   dengan dirinya sendiri.
7. **`display` bukan `block` untuk elemen yang CSS-nya `flex`.** `setDisplay()` menulis `block`; ghost
   rambu adalah `<span>` dengan `display:flex`, dan `block` membuat anak-anaknya jadi inline (tinggi
   diabaikan) — pelatnya "jatuh ke tanah".
8. **Kotak wrapper prop ditulis `draw()`** (§3.9) dan **`propKinds` di-seed** (§3.10).
9. **Kabut di atas prop akan memotong badan rumah** 6,5 m. Kabut ditaruh di bawah scenery; yang
   memudarkan jalan adalah poligon `band()` yang diperpanjang ke titik hilang, bukan mask.
10. **`scroll` menyambung antar-leg.** Me-reset `scroll` tiap leg membuat marka melompat fase dan
    rambu yang dilewati lenyap alih-alih menjauh.

---

## 9. Dokumen

| berkas | isi |
|---|---|
| `PRODUCT.md` | PRD: audiens, tujuan belajar, alur, status, skor, non-goal, rencana |
| `DESIGN.md` | sistem desain: token, tipografi, model proyeksi, pita lateral, gerak, aksesibilitas |
| `docs/superpowers/specs/2026-11-08-prd-handoff.md` | serah-terima historis + riwayat keputusan + utang verifikasi |
| `docs/superpowers/plans/` | rencana kerja yang sudah dieksekusi |
| `docs/superpowers/specs/2026-11-07-*` | naskah cerita + desain awal |

`Bug/` (screenshot bug), `Ref/` (materi acuan), `.dsh-*` (artefak tool) bukan bagian dari build.
