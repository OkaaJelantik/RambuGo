# Sortir "Kafe" — layar jadi tempat, rambu jadi hiasan

Tanggal: 2026-11-10 · Status: disetujui ("jalankan aja") · Lane: art + stage

## Masalah

`.sortir-screen` berlatar putih dan dua belas rambu dijejer sebagai grid kartu. Layar
terbaca sebagai formulir, bukan sebagai tempat. Akibatnya tidak ada cerita "kamu belok
ke mana sampai di sini", dan tidak ada alasan visual kenapa dua belas rambu itu ada di
depan anak.

## Yang dibangun

Seluruh layar menjadi satu tempat: **interior kafe**, dilihat dari pintu masuk.
Dua belas rambu adalah **hiasan kafe** yang tersebar di tiga bidang — rak dinding,
atas counter, lantai dekat pintu — dan anak memindahkannya ke empat **kotak kayu**
di bawah counter.

Cerita dipegang satu baris narasi di bawah judul: "Kamu belok kiri. Di ujung jalan ada
kafe — dan hiasan rambunya berantakan."

## Non-goal

- Tidak ada koordinat bebas per rambu (lihat "Keputusan").
- Tidak ada animasi transisi masuk dari jalan ke interior. Ditunda sampai gambar
  latarnya terlihat.
- Semantik klasifikasi tidak berubah: jenis rambu tetap `KINDS`, `KIND_ORDER` tetap.
- Tidak menyentuh `binAt`, pengumpulan `getBoundingClientRect`, jalur seret/ketuk/papan
  tombol, fokus, dan wilayah live.

## Keputusan

| # | Keputusan | Alasan |
|---|---|---|
| 1 | Tema kafe | Aturan repo: tema dipilih sebelum subagent; kafe memberi tiga bidang nyata untuk "menggantung, menegakkan, menyandarkan". |
| 2 | Kotak 2×2 (164 px) | Satu baris 4 kotak hanya 79 px; label dan isi jadi sempit. |
| 3 | Tiga bidang, bukan sebar bebas | Tiga `flex` row tidak mungkin tumpang tindih, urutan Tab tetap masuk akal, dan tidak perlu tabel koordinat per breakpoint. |
| 4 | Slot tetap 12 posisi | Rambu yang sudah dipindah meninggalkan **paku** di slotnya, bukan menghapus slot. Panggung tidak pernah reflow. |
| 5 | Ukuran per bidang: rak 48 · counter 64 · lantai 56 px | Kedalaman terbaca tanpa satu pun hitungan proyeksi. |
| 6 | Kalimat peran pindah ke label kotak | Tempat di kafe tidak mengajari jenis rambu, jadi kategori tetap dipegang label: "Aku jaga pintu.", "Aku di depan tikungan.", "Aku atur jalannya.", "Bisa bantu kita nemuin sesuatu." |
| 7 | `sr-bin__shape` dihapus dari kotak | Ia mencetak jawaban ("bulat putih bertepi merah"). Deskripsi bentuk tetap diajarkan lewat umpan balik salah-taruh dan ringkasan. |

## Anggaran 360×640

| lapis | tinggi | catatan |
|---|---|---|
| judul + narasi + progres | ~92 px | narasi maksimal dua baris |
| panggung (`flex: 1 1 auto`, min 240) | ~300 px | latar SVG + 3 bidang absolut |
| empat kotak 2×2 | ~186 px | 164×88 masing-masing, isi 26 px |
| jarak + padding | ~30 px | |

Target: `.sr` tidak scroll di 360×640.

## Kontrak berkas

| berkas | pemilik | isi |
|---|---|---|
| `src/art/kafe.tsx` | lane art | `export function KafeScene({ className }: { className?: string })` — satu `<svg aria-hidden viewBox="0 0 340 300">`, hanya atmosfer (dinding, jendela, lantai, lampu, tanaman). **Tidak** menggambar rak/counter; papan bidang digambar `::before` di CSS supaya tidak lepas dari posisi rambu. |
| `src/Sortir.tsx`, `src/sortir.css` | lane stage | panggung, tiga bidang, slot + paku, kotak kayu, affordance saat menyeret |
| `src/sortir.ts` | lane stage | `export const KIND_ROLE: Record<Kind, string>` |
| `src/sortir.test.tsx`, `src/flow.test.tsx` | Lead | `Keranjang X` → `Kotak X` |
| spec ini, gate, commit | Lead | `pnpm test && pnpm exec tsc -b && pnpm exec vite build` |

## Struktur JSX (kontrak untuk lane stage)

```tsx
<div className="sr" onKeyDown={cancelSelection}>
  <header className="sr-head">
    <h2 className="sr-title" ref={headingRef} tabIndex={-1}>Kelompokkan rambu</h2>
    <p className="sr-hint">Kamu belok kiri. Di ujung jalan ada kafe — dan hiasan rambunya berantakan.</p>
  </header>
  <p className="sr-live sr-only" role="status" aria-live="polite" aria-atomic="true">{live}</p>
  <div className="sr-progress">…</div>
  <div className="sr-stage">
    <KafeScene className="sr-stage__art" />
    {/* tiga shelf: role="group" aria-label="Rak dinding" / "Atas counter" / "Dekat pintu" */}
  </div>
  <div className="sr-bins">…4 kotak, aria-label={`Kotak ${KINDS[kind].label}`}…</div>
  {done && …}
  {dragCard && …ghost…}
</div>
```

Slot: `<button className="sr-pajang" data-sign={id}>` untuk rambu yang belum dipindah,
`<span className="sr-paku" aria-hidden="true">` untuk slot yang kosong. `data-sign` dan
`data-kind` dipertahankan — tes dan hit-test bergantung padanya.

## Risiko

1. **Kontras narasi di atas latar kafe** — teks tetap di atas panel kertas, bukan
   langsung di atas SVG.
2. **Latar menutupi rambu** — urutan z: latar → papan bidang → rambu.
3. **Slot yang rambunya sudah dipindah** harus tetap terlihat sebagai paku, bukan
   hilang, supaya tidak ada reflow dan panggung tetap "berisi".
4. **Gate dijalankan Lead setelah kedua lane selesai**, karena `tsc -b` menulis
   `tsconfig.tsbuildinfo` dan tidak boleh dua proses.

## Revisi 2 (2026-11-10, sesudah tinjauan pertama)

Empat perubahan, semuanya menggeser penilaian dari "setiap perpindahan" ke
"satu tombol di akhir".

| # | Keputusan | Alasan |
|---|---|---|
| 8 | Dinding kafe polos: satu warna rata, tanpa pintu kaca, cangkir, tanaman, plint, atau glow di dinding. Jendela (langit + potongan jalan), plafon/lampu, dan lantai papan tetap. | Bentuk di dinding membuat hiasan terbaca mengambang di tempat acak. |
| 9 | Kotak kayu **tanpa warna jenis** (`--kind-color` dicabut dari kotak dan isi kotak). | Merah/kuning/biru/hijau di kotak membocorkan jawaban sebelum rambu dibaca. |
| 10 | `KIND_ROLE` menjadi kalimat perintah-akibat: "Berhenti — jangan lakukan.", "Hati-hati, ada bahaya di depan.", "Ikuti agar selamat.", "Bisa bantu kita nemuin sesuatu." | Kalimat peran sebelumnya ("Aku atur jalannya.") terlalu abstrak untuk memilih. |
| 11 | **Tidak ada penolakan.** Rambu boleh masuk kotak mana pun. Penilaian hanya saat tombol **"Aku selesai"** ditekan. Gagal = rambu yang belum pas ditandai merah (rambu + kotaknya), lalu anak memindahkannya (ketuk, seret, atau papan tombol) dan menekan tombol lagi. Berhasil = layar menyebut "Berhasil dalam percobaan ke-N." | Anak belajar dari kesalahannya sendiri, bukan dari koreksi sistem. `firstCorrect` (benar saat tekanan pertama) tetap menjadi skor untuk bintang di layar rumah. |
| 12 | Bilah kemajuan dihapus. | Ia memberi hitungan sisa langkah yang tidak lagi bermakna tanpa penolakan. |

Konsekuensi teknis: `placedBy` menjadi peta `rambuId → Kind` (bukan daftar
rambu yang sudah benar), kotak berisi tombol-tombol rambu (kepala kotak tetap
satu tombol "taruh di sini"), dan slot isi memakai satu baris dengan tumpukan
negatif di atas empat hiasan supaya tinggi kotak konstan — kalau tidak, 12
hiasan di satu kotak membuat layar 360×640 bergulir.
