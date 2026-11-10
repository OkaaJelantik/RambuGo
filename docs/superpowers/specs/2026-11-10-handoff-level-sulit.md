# Handoff — Level Sulit ("Studi Kasus 3 Tahap")

Status: **siap dieksekusi**, belum ada kode level Sulit yang ditulis. Dokumen ini
menggantikan §5 `2026-11-10-jalur-tiga-level.md` untuk level Sulit saja; P0 (taksonomi)
dan P1 (simpang tiga level) **tidak** dikerjakan di sini.

Ditulis 2026-11-10 di `064702e` · `pnpm test` 258/258 (12 berkas) · `tsc -b` bersih · `vite build` hijau.

---

## 1. Hasil akhir yang diminta

Layar "kuis" berubah dari **5 soal satu tahap** menjadi **5 kasus × 3 tahap = 15 keputusan**.
Tiap kasus satu cerita pendek, tiap tahap satu pilihan ganda 3 opsi:

| tahap | `ask` | pertanyaan |
|---|---|---|
| 1 | `makna` | apa informasi yang disampaikan rambu |
| 2 | `alasan` | mengapa itu penting / mengapa tidak boleh |
| 3 | `tindakan` | apa yang sebaiknya dilakukan tokoh |

Setiap tahap langsung dinilai: umpan balik + `why` muncul seketika, lalu tombol lanjut.
Skor = 15 keputusan. Selesai → rumah seperti sekarang ("Benar n/15", bintang dari `starsFor`).

**Bukan** bagian paket ini: taksonomi 3 jenis, 9 rambu, papan simpang Mudah/Sedang/Sulit,
drag-drop, timer, penyimpanan progres, scene berjalan.

## 2. Kondisi kode yang akan disentuh (terukur)

| hal | sekarang |
|---|---|
| stage | `'intro' \| 'walk' \| 'crossroad' \| 'materi' \| 'sortir' \| 'kuis' \| 'home'` (`App.tsx:15`, `:153`) |
| komponen kuis | fungsi `Quiz` **di dalam** `App.tsx:563-695` (bukan berkas sendiri) |
| data soal | `Question` + `QUESTIONS` (5) di `data.ts:205-255`; kunci = indeks `answer`, opsi = `string[]` |
| skor | `scoreMax` dari `QUESTIONS.length` (`App.tsx:229`, `:254`, `:492`) |
| fokus | `quizCardRef` → `cardRef` (`App.tsx:487-495`); prompt `tabIndex -1` |
| simpang | tiga papan: "Ke materi", "Ke kelompokkan", "Ke kuis" (`Junction.tsx`) — **tidak diubah** |
| dev URL | `?s=kuis` membuka stage kuis langsung (`App.tsx:156-160`) |
| tes kuis | `flow.test.tsx:263-283` (`answerQuiz`), `:285` (`finishQuizPanel`), `:431-484` (fokus + `describeSign`), `:555-565` (jalur materi→kuis), `:638-645` (3/5 benar) |

Konsekuensi: **stage tetap bernama `kuis`**. Tidak ada stage baru, tidak ada alias, tidak ada
perubahan `Junction`, `story.ts`, atau `run.ts`. `?s=kuis` tetap bekerja.

## 3. Kontrak data — berkas baru `src/sulit.ts`

```ts
import { type Art } from './data'

export type CaseAsk = 'makna' | 'alasan' | 'tindakan'

export type CaseOption = { text: string; correct: boolean }

export type CaseStep = {
  ask: CaseAsk
  prompt: string        // ≤ 90 karakter, satu kalimat tanya
  options: CaseOption[] // tepat 3, tepat satu `correct: true`
  why: string           // ≤ 2 kalimat, tampil setelah menjawab
}

export type Case = {
  id: string
  title: string         // "Rambu Dilarang Masuk"
  story: string         // ≤ 2 kalimat, register kelas IV
  sign: { art: Art; name: string; visual: string } // `visual` untuk pembaca layar
  steps: [CaseStep, CaseStep, CaseStep]
}

export const CASES: Case[]           // 5 kasus, urutan 1→5 tetap
export const TOTAL_DECISIONS = 15    // CASES.length * 3
```

`why` **wajib** ada di setiap tahap (sumber `STUDI_KASUS.md` tidak punya `why`; isi baru).
Kunci menempel pada `correct`, **bukan** posisi huruf — ini yang memperbaiki cacat A–A–A.

### 3.1 Isi 15 tahap (sudah ditranskrip — jangan diubah tanpa alasan)

> **Catatan 2026-11-10:** `docs/STUDI_KASUS.md` direvisi — kelima kasus kini
> memakai rambu kurikulum 12 (`Dilarang Berhenti`, `Dilarang Parkir`,
> `Peringatan Lampu`, `Perintah Belok Kiri`, `Jalur Evakuasi`). Tabel di bawah
> adalah riwayat; sumber kebenaran sekarang `STUDI_KASUS.md` dan `src/sulit.ts`.

**Kasus 1 — `dilarang-masuk` · "Rambu Dilarang Masuk"**
story: "Budi bersepeda bersama ayahnya. Di depan ada rambu bulat merah dengan garis putih, dan Budi ingin lewat karena jalannya lebih dekat."

| tahap | prompt | opsi (✓ = benar) | why |
|---|---|---|---|
| makna | Apa arti rambu itu? | ✓ Dilarang masuk · Wajib berhenti · Tempat parkir | Bulat bertepi merah berarti larangan. Garis putih mendatar berarti jalan itu tidak boleh dimasuki. |
| alasan | Mengapa Budi tidak boleh lewat jalan itu? | ✓ Karena rambu menunjukkan kendaraan tidak boleh masuk · Karena jalan khusus pejalan kaki · Karena jalan itu tempat parkir | Larangan berlaku untuk semua kendaraan, termasuk sepeda. Kalau dilanggar, Budi bisa bertabrakan dengan kendaraan dari depan. |
| tindakan | Apa yang sebaiknya Budi lakukan? | ✓ Mencari jalan lain yang diperbolehkan · Tetap melewati jalan itu · Mengabaikan rambu | Jalan yang dilarang bukan jalan pintas. Mencari jalan lain membuat Budi tetap aman. |

**Kasus 2 — `peringatan-tikungan` · "Rambu Peringatan Tikungan"**
story: "Siti bersepeda menuju sekolah. Jalan di depan berbelok ke kanan, dan ada rambu kuning berbentuk belah ketupat."

| tahap | prompt | opsi (✓ = benar) | why |
|---|---|---|---|
| makna | Apa arti rambu itu? | ✓ Jalan berbelok ke kanan · Dilarang bersepeda · Tempat parkir sepeda | Belah ketupat kuning adalah peringatan. Gambar tikungan berarti jalan di depan memang berbelok. |
| alasan | Mengapa Siti harus memperhatikan rambu itu? | ✓ Karena rambu memberi peringatan ada tikungan di depan · Karena jalan sudah berakhir · Karena itu tempat bermain | Peringatan dipasang sebelum tikungan supaya pengendara bersiap. Siti jadi tahu harus mengurangi kecepatan. |
| tindakan | Apa yang sebaiknya Siti lakukan? | ✓ Mengurangi kecepatan dan berhati-hati · Mempercepat sepeda · Mengabaikan rambu | Saat berbelok, sepeda bisa tergelincir kalau terlalu cepat. Pelan dan hati-hati membuat Siti selamat. |

**Kasus 3 — `berhenti-stop` · "Rambu Wajib Berhenti"**
story: "Andi di dalam mobil bersama keluarganya. Saat mendekati persimpangan, ada rambu segi delapan merah bertuliskan STOP."

| tahap | prompt | opsi (✓ = benar) | why |
|---|---|---|---|
| makna | Apa arti rambu itu? | ✓ Wajib berhenti · Dilarang parkir · Jalan khusus sepeda | Segi delapan merah selalu berarti berhenti. Rambu ini dipasang di persimpangan yang ramai. |
| alasan | Mengapa kendaraan harus berhenti dulu? | ✓ Karena pengendara harus memastikan persimpangan aman · Karena itu tempat beristirahat · Karena semua jalan harus diakhiri | Berhenti sebentar memberi waktu melihat kendaraan dari arah lain. Setelah aman, perjalanan boleh dilanjutkan. |
| tindakan | Apa yang sebaiknya ayah Andi lakukan? | ✓ Berhenti, memastikan aman, lalu jalan · Langsung melaju · Membunyikan klakson dan terus jalan | STOP bukan berarti pelan-pelan saja. Berhenti penuh lalu memeriksa keadaan adalah cara paling aman. |

**Kasus 4 — `dilarang-parkir` · "Rambu Dilarang Parkir"**
story: "Rina ikut ibunya berbelanja. Ibu ingin memarkir mobil tepat di depan toko, tetapi ada rambu huruf P yang dicoret garis merah."

| tahap | prompt | opsi (✓ = benar) | why |
|---|---|---|---|
| makna | Apa arti rambu itu? | ✓ Dilarang parkir · Tempat parkir kendaraan · Dilarang masuk | Huruf P berarti parkir, dan garis merah mencoretnya. Artinya kendaraan tidak boleh berhenti di situ. |
| alasan | Mengapa ibu Rina tidak boleh memarkir mobil di sana? | ✓ Karena kendaraan tidak diperbolehkan parkir di sana · Karena tempat itu untuk bermain · Karena semua kendaraan harus berhenti | Tempat di depan toko dipakai orang lewat. Kalau diparkir, jalan jadi sempit dan orang lain terganggu. |
| tindakan | Apa yang sebaiknya ibu Rina lakukan? | ✓ Mencari tempat parkir yang diperbolehkan · Tetap memarkir di depan toko · Mengabaikan karena hanya sebentar | Sebentar pun tetap melanggar. Mencari tempat parkir yang benar membuat semua orang aman. |

**Kasus 5 — `penyeberangan-biru` · "Rambu Tempat Menyeberang"**
story: "Doni dan teman-temannya berjalan ke taman. Di tepi jalan ada rambu biru bergambar orang menyeberang di atas garis zebra."

| tahap | prompt | opsi (✓ = benar) | why |
|---|---|---|---|
| makna | Apa arti rambu itu? | ✓ Tempat penyeberangan pejalan kaki · Dilarang berjalan · Tempat parkir kendaraan | Rambu ini memberi petunjuk tempat, bukan larangan. Gambar pejalan kaki di garis zebra menunjukkan tempat menyeberang. |
| alasan | Mengapa Doni sebaiknya menyeberang di tempat itu? | ✓ Karena tempat itu disediakan agar pejalan kaki aman · Karena semua kendaraan harus berhenti selamanya · Karena itu jalur khusus sepeda | Di tempat penyeberangan, pengendara sudah diberi tanda untuk pelan. Doni lebih aman menyeberang di sana. |
| tindakan | Apa yang sebaiknya Doni lakukan? | ✓ Menyeberang di tempat itu setelah memastikan aman · Berlari menyeberang di sembarang tempat · Menyeberang sambil bermain | Tempat yang benar belum cukup kalau tidak melihat kanan-kiri. Pastikan jalan aman dulu. |

## 4. Pengacakan opsi (kunci tidak lagi A)

```ts
import { createRng } from './scene/spawner'   // mulberry32 ber-seed

/** Urutan opsi yang tampil; deterministik per (kasus, tahap, seed). */
export function orderedOptions(caseIndex: number, stepIndex: number, seed: number): CaseOption[]
```

- Seed turunan: `seed * 31 + caseIndex * 7 + stepIndex` (pola yang sama dengan `spec §5`).
- Fisher–Yates dari `createRng(...)`, sama seperti `sortirCards`.
- **Jangan** menyimpan posisi benar di data; `correct` adalah satu-satunya kunci.
- React `key` opsi = `opt.text` (teks unik di dalam satu tahap).
- Tes mengunci: untuk 20 seed, posisi `correct` mengunjungi 0, 1, **dan** 2.

## 5. Kontrak layar — `src/Sulit.tsx`

```tsx
export default function Sulit({
  onDone,
  cardRef,
}: {
  onDone: (score: number) => void
  cardRef?: RefObject<HTMLDivElement | null>
})
```

State: `caseIndex` (0–4), `stepIndex` (0–2), `picked` (`number | null`), `score`.

Alur satu tahap (meniru `Quiz` sekarang, jangan bikin pola baru):

1. Tahap tampil: judul kasus, `story` **hanya saat `stepIndex === 0`**, gambar rambu
   (`<SignArt art={case.sign.art} size={116} />`), prompt, 3 tombol opsi.
2. Pilih → opsi `disabled`, kelas `.correct` / `.wrong`, `why` muncul, tombol
   **"Tahap berikutnya →"** (atau **"Sampai di rumah →"** pada tahap 15).
3. Benar → `score + 1`.
4. Lanjut → tahap berikutnya; habis 3 tahap → kasus berikutnya, `stepIndex = 0`;
   habis 5 kasus → `onDone(score)`.

Teks yang dipatok tes:

| elemen | teks |
|---|---|
| judul layar | `Studi Kasus Rambu` (kelas CSS `quiz-title`) |
| progres | `Tahap {n}/15` (bukan `Soal`/`Kasus`) |
| tombol lanjut | `Tahap berikutnya →` / `Sampai di rumah →` |
| live (benar) | `{why} Skor {score} dari 15.` |
| live (salah) | `{why}` |

A11y (semua sudah jadi pola di `Quiz`, jangan dilanggar):

- `cardRef` di `.question-card` (`tabIndex -1`) supaya App bisa memfokuskannya.
- Prompt `tabIndex -1`; saat tahap berganti, fokuskan prompt baru — fokus **tidak pernah** `<body>`.
- Saat opsi dinonaktifkan, fokus pindah ke tombol lanjut + `scrollIntoView({ block: 'center' })`
  (di 360×640 tombol ini lahir di bawah lipatan).
- Wilayah live `role="status" aria-live="polite" aria-atomic="true"` tetap terpasang.
- Gambar `aria-hidden`; deskripsi `case.sign.visual` dimasukkan sebagai `sr-only` di dalam prompt,
  **bukan** `name` (itu jawaban tahap 1).

## 6. Integrasi `App.tsx`

| baris | perubahan |
|---|---|
| `:3` | `QUESTIONS`/`Question` keluar dari import; tambah `TOTAL_DECISIONS` dari `./sulit` |
| `:563-695` | seluruh fungsi `Quiz` **dihapus**; pindah ke `src/Sulit.tsx` |
| `:487` | `<Quiz ...>` → `<Sulit ...>` (nama prop sama: `cardRef`, `onDone`) |
| `:229`, `:254`, `:492` | `QUESTIONS.length` → `TOTAL_DECISIONS` (15) |
| `:520` | teks jalur: `'Kamu berani mencoba kuis lebih dulu.'` → `'Kamu berani mencoba studi kasus lebih dulu.'` |
| `:15`, `:153`, `:485` | **tidak berubah** — stage tetap `kuis`, `key`, dan `?s=kuis` |

`data.ts`: hapus `Question` + `QUESTIONS` (tidak ada konsumen lain setelah `App` dan `flow.test`
diperbarui). `describeSign` tetap dipakai kuis lama → tidak lagi dipakai layar ini; **jangan**
hapus fungsinya selama `SignSheet`/kuis lama masih memakainya.

## 7. Art baru (4 rambu di luar `SIGNS`)

`Art` union di `data.ts` bertambah **empat** nilai; `ART`, `ART_BOX`, dan `ART_INK_BOTTOM` di
`SignArt.tsx` adalah `Record<Art, …>`, jadi typecheck **memaksa** keempatnya diisi. Geometri 100 unit,
`ART_SCALE = 1.2` dipakai otomatis oleh `SignArt`.

| art | gambar | `ART_BOX` | `ART_INK_BOTTOM` |
|---|---|---|---|
| `dilarang-masuk` | `banBase` + palang putih mendatar (`rect` 22,44 56×12) | 100×100 | 100 |
| `peringatan-tikungan` | belah ketupat `60,4 116,60 60,116 4,60` kuning + panah tikungan hitam | 100×100 | 96 |
| `berhenti-stop` | segi delapan merah (poligon 8 titik) + tulisan STOP putih | 100×100 | 100 |
| `penyeberangan-biru` | persegi biru 100×100 + garis zebra putih + siluet pejalan kaki | 100×100 | 100 |

`STOP` ditulis sebagai `<text>` di dalam SVG (boleh: SVG-nya `aria-hidden`, teks tidak pernah
dibacakan) atau sebagai `<path>` bila ingin bebas font.

## 8. Berkas, lane, dan urutan

| lane | berkas | isi |
|---|---|---|
| A (art) | `src/data.ts` (union `Art`, hapus `Question`/`QUESTIONS`), `src/SignArt.tsx` (3 tabel + 4 art) | 4 gambar + daftar |
| B (data murni) | `src/sulit.ts` **baru**, `src/sulit.test.ts` **baru** | `CASES`, `orderedOptions`, `TOTAL_DECISIONS` |
| C (layar + wiring) | `src/Sulit.tsx` **baru**, `src/sulit.css` **baru**, `src/App.tsx`, `src/flow.test.tsx` | komponen, wiring, tes alur |

Urutan **A → B → C**. A dan B boleh paralel hanya jika id art sudah disepakati lebih dulu
(keempat nama di §7). C terakhir: ia membaca `CASES` dan `Art` sekaligus.
Satu agen per berkas; tidak ada dua agen di `App.tsx`.

## 9. Tes

**Baru — `src/sulit.test.ts`**

1. `CASES` berisi 5 kasus; tiap kasus tepat 3 tahap; `ask` berurutan `makna, alasan, tindakan`.
2. Tiap tahap: tepat 3 opsi, tepat satu `correct: true`, `prompt` dan `why` tidak kosong,
   `story` ≤ 2 kalimat, `why` ≤ 2 kalimat.
3. `orderedOptions` deterministik: seed sama → urutan sama; 20 seed berbeda → posisi `correct`
   mengunjungi 0, 1, dan 2 (mengunci perbaikan kunci A–A–A).
4. `TOTAL_DECISIONS === 15`.
5. Bintang: `starsFor(15,15) === 3`, `starsFor(12,15) === 3`, `starsFor(11,15) === 2`,
   `starsFor(6,15) === 2`, `starsFor(5,15) === 1` (memakai rumus tunggal `starsFor`).

**Wajib diubah — `src/flow.test.tsx`**

| baris | sekarang | menjadi |
|---|---|---|
| `:5` | import `QUESTIONS`, `Question` | import `CASES`, `TOTAL_DECISIONS` |
| `:263-283` | `answerQuiz` menelusuri 5 soal | menelusuri 15 tahap; helper menerima `(kasus, tahap) => boolean` |
| `:285` | `finishQuizPanel` menekan "Selesai" | tetap, tetapi tombol akhir = "Sampai di rumah →" |
| `:431-456` | fokus & live kuis | sama, dengan teks `Tahap 1/15` |
| `:457-484` | `describeSign` di rute kuis | ganti ke `case.sign.visual`; assertion "tidak memuat teks jawaban" dipertahankan |
| `:555-565` | jalur materi → kuis 5/5 | jalur materi → 15/15 |
| `:638-645` | 3/5 → Bintang 2 | 9/15 → Bintang 2 (9/15 = 0,6) |

## 10. Definition of Done

```bash
pnpm test && pnpm exec tsc -b && pnpm exec vite build
```

- 258 tes lama tetap lulus kecuali yang sengaja diubah di §9; total tes naik, tidak turun.
- `tsc -b` 0: empat `Art` baru wajib muncul di ketiga tabel `SignArt`.
- `vite build` 0 — jangan menambah `@keyframes` yatim (vitest tidak memproses CSS produksi).
- 360×640: tahap dengan `story` **dan** umpan balik tidak boleh menggulir layar. Perlakukan
  `story` sebagai elemen yang hanya ada di tahap pertama tiap kasus; kalau masih >640, pendekkan
  `story`, jangan kecilkan target ketuk (≥44 px).
- Fokus tidak pernah `<body>` pada: pilih opsi, ganti tahap, ganti kasus, masuk lewat `?s=kuis`.
- Angka yang wajib dilaporkan: `pnpm test` (berkas/tes), `tsc`, `build`, dan `scrollHeight` vs
  `clientHeight` pada 360×640 di tahap 1 kasus 1 dan tahap 3 kasus 5 (kedua kondisi ekstrem).

## 11. Jebakan yang sudah pernah menggigit

1. **Jangan pakai `answer: number`.** Itu akar kunci A–A–A; posisi harus lahir dari seed.
2. **Fokus setelah opsi dinonaktifkan** jatuh ke `<body>` kalau tidak dipindah ke tombol lanjut.
3. **`?s=kuis`**: App memfokuskan `quizCardRef`; kalau `Sulit` tidak memasang `cardRef` di kartu,
   jalur dev membuka layar tanpa fokus sasaran.
4. **Live region harus sudah terpasang sebelum teks pertama** (`aria-live` yang lahir bersama
   teksnya tidak diumumkan).
5. **`QUESTIONS` dihapus** artinya `flow.test.tsx` harus berhenti mengimpornya pada commit yang
   sama — jangan tinggalkan import mati (tsc akan menolak).
6. `flow.test.tsx` di working tree **belum di-commit** (membawa perubahan sesi sebelumnya). Commit
   paket ini dengan pathspec; jangan `git add -A`.

## 12. Satu hal yang perlu keputusan manusia

**Rambu kasus 5 berwarna biru, sedangkan `petunjuk` yang diajarkan berwarna hijau.** Tiga pilihan:

1. **Biarkan biru** (rekomendasi) — sesuai kenyataan lapangan dan `STUDI_KASUS.md`; `why` tahap 1
   menyebut "rambu ini memberi petunjuk tempat" tanpa mengklaim golongan warnanya.
2. Ganti art jadi `petunjuk-arah` hijau yang sudah ada — konsisten dengan taksonomi, tetapi cerita
   penyeberangan jadi aneh.
3. Keluarkan kasus 5, sisakan 4 kasus (12 keputusan) — paling aman secara taksonomi, tetapi
   kehilangan satu kasus pejalan kaki.

Kalau tidak ada jawaban lain, kerjakan pilihan **1** dan tulis di `why` persis seperti §3.1.
