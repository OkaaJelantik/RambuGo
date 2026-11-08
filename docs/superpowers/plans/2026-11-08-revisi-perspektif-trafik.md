# Rencana: revisi perspektif samping, penempatan trotoar, rambu menonjol, lalu lintas padat

Sumber: anotasi `Revised1.png` dan `Revised2.png` (7 Nov 2026) + permintaan penambahan
(bangku taman ikut digambar samping; lalu lintas lebih padat).

## Diagnosis

Empat anotasi + satu tambahan itu satu penyakit: art kit digambar **elevasi depan ortografis**
sementara jalan menyusut ke titik hilang, dan furnitur trotoar tidak punya pita lajur. Trotoar
2 m dipakai bersama anak 0,73 m + halte 1,92 m + tong 0,6 m + bangku 1,46 m = 4,7 m, jadi tidak ada
penempatan yang bisa benar selama art-nya ortografis.

| temuan | bukti di kode |
|---|---|
| Halte & tong pandangan depan, bukan samping | `src/art/scenery.tsx` `BusStop` simetris 160×150; `Bin` elips tutup simetris 60×90; `Bench` dua kaki sama 120×70 |
| Tong menabrak jalur anak | `LAYOUT` bin `x = −0,9`; tinta anak −1,063 … −0,337 m → tumpang 0,26 m |
| Halte menutup 96 % trotoar | `x = −0,7`, lebar 1,92 m → −1,66 … +0,26 m |
| Rambu terlalu kecil | pelat 44,2 px @360×640, 55,3 px @360×800; `min-width: 56px` > pelat |
| Oklusi tong × tiang rambu | tong `x = 0,0` lebar 0,6 → −0,3 … +0,3; kolom rambu 0,0 … 0,6; dunia membeku saat berhenti |

## Global Constraints

- Mobile-first 360×640 s.d. 360×800; dukung 1024×600 dan 640×360.
- Satu loop rAF + reducer murni; tidak ada `setState` per frame.
- ≤ 30 node beranimasi (saat ini 25; target 28).
- Tidak ada `filter`/`backdrop-filter` di dalam scene.
- `prefers-reduced-motion` mematikan semua animasi tak terbatas.
- Semua ukuran dari `src/scene/meters.ts` lewat `pxAt`/`pxPerM`; tidak ada `clamp`/`vh`/`vw` untuk ukuran objek.
- `pnpm test`, `tsc -b`, `vite build` hijau di tiap commit.
- Commit wajib pakai pathspec (`git commit -m "…" -- <paths>`), tanpa `git add -A`.

---

## Task 19 — Pita lajur, rasio art, rambu menonjol

**Files:** `src/scene/projection.ts`, `src/WalkScene.tsx`, `src/walk.css`, `src/scene/scale.test.ts`,
`docs/superpowers/specs/2026-11-07-petualangan-rambu-lalu-lintas-design.md` (§7.1, §11).

**Requirements**

1. `SIDEWALK_CENTRE = SIDEWALK_LEFT + 0,80` → **−0,90 m** (tinta anak −1,263 … −0,537).
   Catatan revisi: 0,60 → 0,80 karena tinta anak keluar tepi kiri frame pada 360×800/390×844
   (`pxPerM` dari tinggi layar). Guard `inkLeft > 0` TIDAK dilonggarkan.
2. Pita lajur lateral:

   | pita | x (m) | isi |
   |---|---|---|
   | jalur anak | −0,90 | hero |
   | tepi taman | −1,85 | 2× tong (lebar 0,55 → −2,125 … −1,575) |
   | taman | ≤ −2,3 | bangku −2,60, pohon −2,8, tiang listrik −2,9, pagar −3,5, ruko −3,8, rumah −4,0 |
   | kerb | −0,50 … +0,30 | halte −0,10 (lebar 0,80 → −0,50 … +0,30), lampu 0,25, rambu 0,30 |

3. `PROP_ART` rasio: `bin 55/90`, `busstop 80/180`, `bench 55/70`. Task 20 menggambar ke viewBox ini.
4. `SIGN_STOP_D` **0,26 → 0,22**; konstanta `SIGN_EMPHASIS = 1,5` dikalikan ke pelat dan tiang saja,
   didokumentasikan sebagai afordans game (bukan ukuran dunia) → pelat 74,4 px @360×640, 93,0 px @360×800.
5. `walk.css`: hapus `min-width: 56px` pada `.wk-sign`; rim tinta 3 px + bayangan tegas pada
   `.wk-sign-plate`; cincin putus-putus selalu terlihat saat `--in` (≈0,9) + denyut 1,8 s, mati pada
   `prefers-reduced-motion`; `pointer-events: none` pada cincin.
6. `scale.test.ts` — guard baru:
   - pada ketiga fase berhenti, kotak tong tidak bersinggungan dengan pelat maupun tiang rambu;
   - tinta anak ≥ 0,03 m dari setiap furnitur trotoar (tong ×2, halte, bangku, lampu), 9 fase × 3 viewport;
   - pelat dicat di atas semua prop;
   - pelat ≥ 70 px @360×640 dan ≥ 88 px @360×800.
7. Spec §7.1 memuat pita lajur, `SIDEWALK_CENTRE`, `SIGN_EMPHASIS` + alasannya, dan alasan halte boleh
   menyapu di belakang rambu (z pelat 160 > `propZ` ≤ 100). §11 dapat T20–T24 dengan bukti di atas.

**Acceptance:** semua assertion lama tetap hijau; empat guard baru hijau; angka dilaporkan.

---

## Task 20 — Art 2.5D dari samping

**Files:** `src/art/scenery.tsx`, `src/walk.css` (hanya bila bayangan kontak perlu kelas baru).

**Requirements**

1. `BusStop` viewBox `0 0 80 180`: pandangan 3-4 menyusuri jalan — atap jajar genjang menyusut ke
   atas-kanan (objek di kiri titik hilang), tiang dekat tebal + tiang jauh tipis, panel belakang
   jajar genjang, bangku menyamping sebagai bidang tipis, papan ikon bus di panel, alas menyentuh garis
   tanah, bayangan kontak elips.
2. `Bin` viewBox `0 0 55 90`: tutup elips miring ~20°, satu sisi badan terlihat, rusuk depan terpendek,
   bayangan kontak.
3. `Bench` viewBox `0 0 55 70`: profil — dudukan memanjang ke belakang, sandaran bidang tipis, satu kaki
   dekat + satu jauh lebih kecil, bayangan kontak.
4. Bayangan kontak ditambahkan ke `Fence`, `StreetLamp`, `PowerPole`, `Tree`.
5. `House`/`Shop` tetap elevasi depan, alasan ditulis di header file.
6. Rasio art tidak boleh berubah dari Task 19.

**Acceptance:** `pnpm test`, `tsc -b`, `vite build` hijau; guard Task 19 tetap hijau; tangkapan 360×640 +
360×800 untuk halte, tong, bangku.

---

## Task 21 — Lalu lintas lebih padat

**Files:** `src/scene/spawner.ts`, `src/WalkScene.tsx` (ambience saja), `src/scene/spawner.test.ts`,
`src/scene/scale.test.ts` (hanya assertion baru).

| | sekarang | target |
|---|---|---|
| slot kendaraan | 3 | **5** |
| slot pejalan | 2 | **3** |
| jeda spawn | 1–2,5 s | **0,5–1,2 s** |
| bias lajur | 50/50 | **65/35 ke `laneL`** |
| jarak minim kedalaman | tidak ada | **0,08** per lajur |
| motor | di tengah lajur | **offset lateral ±0,5 m** |

**Acceptance:** tetap deterministik; total node ≤ 30; pada 360×640 ≥ 3 kendaraan tergambar di ≥ 60 %
fase leg; assertion "satu kendaraan berlawanan ≥ 0,5 s per leg" tetap hijau; tes spawner untuk bias,
jarak, dan offset motor.
