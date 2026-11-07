/**
 * Satu tabel meter untuk seluruh scene berjalan.
 *
 * Semua ukuran objek di `WalkScene`, `GroundScene`, dan CSS mengambil angka
 * dari sini lewat `pxAt()` di `./projection`. Tidak ada lagi tinggi objek
 * sebagai fraksi tinggi viewport dan tidak ada lebar sebagai fraksi lebar
 * viewport: satu meter di layar selalu sepanjang yang sama untuk semua objek
 * pada kedalaman yang sama.
 *
 * Angka mengikuti ukuran dunia nyata yang child-friendly: anak kelas 2 SD
 * 1,35 m, mobil 1,8 m lebar, tiang listrik 9 m. Rambu memakai pelat Ø 0,60 m
 * di atas tiang 2,0 m.
 *
 * Jalan sengaja sempit (2 lajur × 2,4 m = 4,8 m). Ini jalan kampung, bukan
 * jalan arteri: dengan lajur 3,5 m, garis bagi jalan berdiri 4,3 m dari garis
 * kamera, dan pada frame ponsel 360 px (lebar pandang hanya ~2,4 m di bidang
 * anak) marka baru masuk frame di kedalaman ≥0,70 — terlalu jauh untuk
 * terbaca. Lajur 2,4 m menaruh garis bagi di 2,7 m sehingga marka masuk frame
 * mulai kedalaman ~0,41 dan lajur berlawanan (3,9 m) mulai ~0,53.
 */

export const METERS = {
  /**
   * Tinggi kotak seni hero (anak kelas 2 SD), 140 × 260. Seperti semua objek
   * lain, yang diukur satu meter adalah kotak seninya, bukan tintanya: sosok
   * di dalam viewBox mengisi y 24–235, jadi yang terlihat kira-kira 1,10 m.
   * Tidak dinormalisasi — menumbuhkan hero ~23 % agar tintanya 1,35 m akan
   * mengubah seluruh framing yang sudah ditinjau, tanpa mengubah satu objek
   * lain, dan membuat hero satu-satunya seni yang diukur dari tinta.
   */
  child: 1.35,
  /** Lebar satu lajur jalan kampung. */
  lane: 2.4,
  /** Lebar trotoar tempat anak berjalan. */
  sidewalk: 2.0,
  /**
   * Mobil & motor: hanya lebar yang menjadi jangkar. Tinggi mengikuti aspek
   * art-nya (mobil 1,8 × 90/160 → 1,01 m; motor 0,7 × 80/90 → 0,62 m), karena
   * memaksa tinggi nyata 1,45 / 1,05 m akan memipihkan roda menjadi elips.
   * Angka tinggi lama di tabel ini tidak pernah dibaca dan sudah dibuang;
   * spec §7.1 mencatat tinggi tergambar yang sebenarnya.
   */
  car: { width: 1.8 },
  motorcycle: { width: 0.7 },
  /**
   * Rambu: diameter pelat, tinggi tiang, dan tebal tiang. Tiang 9 cm adalah
   * tiang galvanis standar; angka ini yang membuat rambu tidak lagi memakai
   * lebar 11 px tetap di CSS.
   */
  sign: { plate: 0.6, pole: 2.0, poleWidth: 0.09 },
  /** Tinggi objek latar, semua dalam meter. */
  house: 6.5,
  shop: 4.0,
  tree: 3.5,
  powerPole: 9.0,
  /**
   * Halte. 1,8 m, bukan 3,0 m: badannya 1,07× setinggi itu, dan trotoar hanya
   * 2,0 m lebar. Halte 3,0 m berarti sprite 3,2 m — 60% badannya menjorok ke
   * aspal, dan tidak ada tempat di trotoar yang bisa memuatnya.
   */
  busStop: 1.8,
  lamp: 4.5,
  bin: 0.9,
  bench: 0.85,
  fence: 1.2,
  /** Orang dewasa dan anak yang lewat di trotoar (ambience). */
  adult: 1.7,
  pedestrianChild: 1.2,
  /**
   * Marka putus-putus: lebar dan tebal yang digambar. Panjang aslinya (2–3 m)
   * tidak dipakai karena marka digambar sebagai bidang datar, bukan perspektif
   * memanjang.
   */
  mark: { width: 0.45, thickness: 0.14 },
} as const
