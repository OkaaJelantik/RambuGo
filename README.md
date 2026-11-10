# RambuGO!

Aplikasi web interaktif untuk anak SD: mengenali rambu lalu lintas lewat **bentuk + warna**, bukan
hafalan nama. Satu anak satu layar, tanpa akun, tanpa backend.

**Live:** https://rambugo.vercel.app

## Isi permainan

```
kelas → jalan (3 rambu) → persimpangan ─┬─ Belajar  → materi per jenis → kuis 5 soal
                                        ├─ Pilah    → kelompokkan 12 rambu
                                        └─ Kuis     → studi kasus 5 × 3 tahap
                                                          ↓
                                                        rumah (skor + bintang)
```

- **12 rambu, 4 jenis:** Larangan (bulat tepi merah), Peringatan (belah ketupat kuning),
  Perintah (bulat biru), Petunjuk (persegi hijau).
- **Materi bertingkat:** pilih jenis → katalog rambu jenis itu; deskripsi bentuk jenis tampil di atas
  katalog, tanpa label yang harus dibuka.
- **Pilah:** seret/ketuk 12 rambu ke 4 kotak; "Sudah Selesai" bisa ditekan kapan pun dan hasilnya
  berupa skor penempatan tepat (`Skor 7/12`), dengan "Coba Lagi" tanpa mengacak ulang.
- **Bintang, bukan hukuman:** skor 0 tetap pulang dengan Bintang 1.

## Tumpukan

React 19 · Vite 8 · TypeScript 7 (strict) · Vitest + Testing Library (jsdom). Tanpa backend, tanpa
akun, tanpa aset gambar — semua ilustrasi SVG inline dan semua ukuran scene dari satu tabel meter.
Satu-satunya permintaan jaringan saat runtime adalah Google Fonts di `index.html`; tanpa internet,
font jatuh ke fallback sistem.

## Perintah

```bash
pnpm install
pnpm dev       # http://127.0.0.1:5173
pnpm test      # vitest run
pnpm exec tsc -b
pnpm build     # tsc -b && vite build
pnpm preview   # http://127.0.0.1:4173
pnpm deploy    # build lalu `vercel deploy --prod`
```

Gerbang sebelum commit — ketiganya, bukan sebagian:

```bash
pnpm test && pnpm exec tsc -b && pnpm exec vite build
```

`vitest` tidak memproses CSS produksi; build tetap wajib dijalankan.

## Struktur

| path | isi |
|---|---|
| `src/App.tsx` | mesin stage (`intro → walk → crossroad → materi/sortir/kuis → home`), skor, fokus |
| `src/WalkScene.tsx` | scene 2.5D: satu loop rAF, pool scenery, trafik, HUD |
| `src/scene/` | meter, proyeksi, reducer dunia, spawner (deterministik) |
| `src/data.ts` | `KINDS` (4 jenis), `SIGNS` (12), `QUESTIONS` (5) |
| `src/SignArt.tsx` | semua bentuk rambu (SVG inline) + `describeSign` |
| `src/Sortir.tsx`, `src/sortir.ts` | permainan kelompokkan rambu + logika murninya |
| `src/route.ts`, `src/progress.ts` | posisi di hash URL dan progres jawaban |
| `src/*.css` | `index.css` (token + shell), `walk.css`, `sortir.css`, `sulit.css`, … |

Routing memakai hash (`#/materi`, `#/sortir`, …): refresh melanjutkan posisi, tombol back mundur satu
langkah. Build statis, jadi tidak perlu rewrite SPA di hosting.

## Parameter URL (build dev)

| param | arti |
|---|---|
| `?s=walk` | langsung ke stage (`intro`, `walk`, `crossroad`, `materi`, `sortir`, `kuis`, `home`) |
| `?step=N` | mulai dari langkah ke-N (0–2) |
| `?seed=123` | paksa seed run; mengulang urutan rambu yang sama |
| `?still` | matikan semua animasi & transisi (untuk screenshot) |

## Deploy

Hosting statis di Vercel, konfigurasi di `vercel.json` (framework vite, `pnpm build`, output `dist`).
Folder `.vercel/` (link project) bersifat per-mesin dan tidak di-commit.

```bash
pnpm deploy                # produksi
pnpm build && vercel deploy   # preview URL
```

## Dokumen

- [PRODUCT.md](PRODUCT.md) — audiens, tujuan belajar, alur, skor, non-goal.
- [DESIGN.md](DESIGN.md) — token, tipografi, model proyeksi, gerak, aksesibilitas.
- [AGENTS.md](AGENTS.md) — peta berkas, aturan yang tidak boleh dilanggar, jebakan.
- `docs/` — naskah cerita, rencana kerja, spesifikasi historis.

## Non-goal

Tanpa audio, tanpa akun/leaderboard/progres server, tanpa animasi realistis atau 3D, tanpa aset raster.
