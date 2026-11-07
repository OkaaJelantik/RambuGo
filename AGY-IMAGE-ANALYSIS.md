# Analisa gambar: `Mobile.jpeg`

Baca gambar `Mobile.jpeg` di workspace ini (screenshot aplikasi web mobile, **717 × 1600 px**,
asetnya 356 × 799 CSS px @2×). Jawab **dengan angka**, bukan opini umum. Semua kolom tabel wajib
berisi hasil pengukuran/perkiraan piksel dari gambar, bukan dari kode.

## 1. Teks

Transkrip semua teks yang terlihat, urut dari atas ke bawah. Sebutkan teks mana yang bagian dari
antarmuka dan mana yang balon ucapan.

## 2. Tata letak

Urutan objek dari kiri ke kanan dan dari atas ke bawah, plus di mana horizon/garis cakrawala berada
(y dalam piksel) dan di mana jalan mulai memenuhi layar.

## 3. Ukur tiap objek

Isi tabel ini. `bbox` = `x0,y0,x1,y1` dalam piksel gambar. `tinggi relatif` = tinggi objek dibagi
tinggi anak perempuan (1,00 = setinggi anak).

| objek | bbox | tinggi px | tinggi relatif | catatan |
|---|---|---|---|---|
| anak perempuan (dengan ansler) | | | 1,00 | sebut apakah menghadap menjauh |
| plat rambu (lingkaran putih + segitiga kuning) | | | | diameter plat saja, tanpa tiang |
| tiang rambu | | | | lebar dan tinggi tiang |
| rumah di kiri (fasad + atap) | | | | |
| tong sampah | | | | |
| permukaan jalan (lebar) | | | | lebar pada y = 700, 1000, 1400 |
| marka jalan (bila ada) | | | | |
| kendaraan (bila ada) | | | | |

Lalu ukur tambahan: jarak dari **bawah tiang rambu** ke **jalan di bawahnya** (px), dan
**lebar satu lajur** pada y yang sama dengan roda kendaraan (bila ada kendaraan).

## 4. Nilai acuan (untuk membandingkan hasil ukur)

Fakta yang dipakai aplikasi pada layar 360 × 800 CSS px (semuanya CSS px, kalikan 2 untuk px gambar):

- tinggi anak yang digambar: **190 px** (≈ 25% tinggi layar)
- plat rambu: `clamp(72px, 19vw, 96px)` → **72 px** persegi, jadi diameter plat 72 px
- tiang rambu: lebar **11 px**, tinggi **58 px**, tepat di bawah plat
- lebar jalan = **0,6 × lebar layar** pada kedalaman objek terdekat, menyempit ke titik hilang
- satu lajur = **0,2 × lebar layar** × skala kedalaman
- mobil: **0,213 × tinggi layar** lebar, **0,12 × tinggi layar** tinggi

## 5. Putuskan: mana yang skalanya tidak wajar

Untuk **setiap** pertanyaan di bawah: jawab **ya/tidak**, sebut angka pembandingnya (mis.
"plat 72 px vs anak 190 px → 0,38; rambu sungguhan 0,60 m vs anak 1,30 m → 0,46, jadi plat
seharusnya 0,46 × 0,79 = 0,37 dari tinggi anak"), lalu beri tingkat: **fatal / mengganggu / wajar**.

1. Apakah plat rambu tampak sebesar atau lebih besar dari anak?
2. Apakah rambu menggantung terlalu rendah — berapa meter di atas jalan bila tinggi anak 1,30 m?
3. Apakah tiang rambu terlalu gemuk/terlalu pendek dibanding platnya?
4. Apakah rumah dua lantai tampak lebih pendek dari pohon, atau setara?
5. Apakah ada kendaraan yang lebih lebar dari satu lajur, atau dua kendaraan berlawanan arah
   hampir bersentuhan?
6. Apakah jalan tampak terlalu sempit untuk objek yang berdiri/melintas di atasnya?
7. Objek mana yang ukurannya paling mencolok salah, diurutkan dari paling parah?

## 6. Format jawaban

Ringkas, maksimal 60 baris: bagian 1–2 paragraf pendek, bagian 3 sebagai tabel, bagian 4 tabel
verdict satu baris per item, bagian 5 satu paragraf berisi urutan objek paling salah. Jangan
menyarankan perbaikan kode — hanya pengukuran dan verdict.
