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
 * 1,35 m, lajur 3,5 m, mobil 1,8 m lebar, tiang listrik 9 m. Rambu memakai
 * pelat Ø 0,60 m di atas tiang 2,0 m.
 */

export const METERS = {
  /** Tinggi hero (anak kelas 2 SD). */
  child: 1.35,
  /** Lebar satu lajur jalan. */
  lane: 3.5,
  /** Lebar trotoar tempat anak berjalan. */
  sidewalk: 2.0,
  /** Mobil: lebar × tinggi (dilihat dari belakang). */
  car: { width: 1.8, height: 1.45 },
  /** Motor: lebar × tinggi. */
  motorcycle: { width: 0.7, height: 1.05 },
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
  busStop: 3.0,
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
