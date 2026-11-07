# Naskah cerita — "Petualangan Rambu-Rambu Lalu Lintas"

Anak kelas II SD. Satu suara: **Aku** (anak perempuan beransel). Tidak ada audio — semua teks.

Aturan dialog:
- Maksimal **2 kalimat** per balon, maksimal ~90 karakter.
- Bahasa lisan anak: "aku", "eh", "ya?", bukan "anda"/"kalian".
- Panel bawah: avatar wajah **Aku** + teks + tombol. Tombol baku: **Lanjut jalan**, **Apa ini?**, **Tutup**.
- Di layar persimpangan dan rumah, tombol "Lanjut jalan" menjadi **Ke materi** / **Ke kuis** / **Pulang**.

## Peta adegan

| # | beat | tempat | dialog | tombol |
|---|---|---|---|---|
| 0 | `intro` | kelas | "Bu Guru bilang, rambu itu penunjuk jalan. Aku cari tiga rambu di trotoar, ya!" | **Keluar kelas** |
| 1 | `leg-1` | trotoar | "Aku jalan pelan-pelan. Trotoar itu tempat paling aman." | **Lanjut jalan** |
| 2 | `stop-1` | rambu *Banyak Anak Menyeberang* | "Eh, ada rambu segitiga kuning. Gambarnya anak-anak. Artinya apa, ya?" | **Apa ini?** · **Lanjut jalan** |
| 3 | `leg-2` | trotoar | "Rumah-rumah berderet di kiri. Pohonnya ramai dan senang." | **Lanjut jalan** |
| 4 | `stop-2` | rambu *Tempat Menyeberang* | "Persegi biru, ada garis-garis putih. Ini tempat menyeberang!" | **Apa ini?** · **Lanjut jalan** |
| 5 | `leg-3` | trotoar | "Rambu berikutnya di dekat ujung trotoar. Tinggal satu!" | **Lanjut jalan** |
| 6 | `stop-3` | rambu *Dilarang Masuk* | "Bulat merah, ada garis putih. Berarti tidak boleh masuk. Aku jalan kaki, jadi boleh, ya?" | **Apa ini?** · **Lanjut jalan** |
| 7 | `crossroad` | persimpangan | "Sampai di persimpangan. Aku mau baca rambu lagi, atau langsung kuis?" | **Ke materi** · **Ke kuis** |
| 8 | `materi` | papan rambu | "Rambu yang tadi kulihat, aku kenali satu-satu." | **Sudah paham, coba kuis** |
| 9 | `kuis` | kuis | "Kalau benar, aku dapat bintang." | **Selesai** |
| 10 | `home` | rumah | "Sampai di rumah. Rambu itu kawan di jalan. Besok aku cerita ke Bu Guru." | **Main lagi** |

## Teks di dalam **Apa ini?**

Isi lembar rambu sudah ada di `data.ts` (`name`, `meaning`, `tip`), dan baris bentuk
("Bentuk: segitiga kuning") sudah ada. Naskah menambah satu baris pembuka berupa suara **Aku**
sebelum arti, supaya lembar terasa bercerita, bukan kamus:

| rambu | pembuka |
|---|---|
| Banyak Anak Menyeberang | "Aku kecil, jadi aku paling suka rambu ini." |
| Tempat Menyeberang | "Kalau mau ke seberang, lewat garis putih itu." |
| Dilarang Masuk | "Tapi aku jalan kaki. Sepeda dan mobil yang tidak boleh." |

## Catatan desain

- Urutan 3 rambu di trotoar tidak boleh ditukar. Anak mengenali **bentuk**: segitiga → persegi →
  bulat, dan itu yang ditanya di kuis.
- Tidak ada dialog yang menagih jawaban ("Apa jawabanmu?"). Kuis tetap jadi tempat bertanya.
- Kalimat `leg-*` tampil otomatis saat berjalan, tanpa tombol, hilang sendiri setelah ~3 detik.
- Kalimat `stop-*` menunggu tombol. Ini satu-satunya titik permainan boleh berhenti.
