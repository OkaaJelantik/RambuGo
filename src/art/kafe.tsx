/**
 * Latar layar "Kelompokkan rambu": dinding kafe yang bersih, dilihat lurus
 * dari depan. Hanya tiga bidang rata — plafon, dinding, dan meja — plus dua
 * garis tipis sebagai batas. Semua hiasan rambu dipajang di tengah dinding.
 *
 * Yang sengaja TIDAK digambar: jendela, pintu, cangkir, tanaman, lampu, rak,
 * dan papan. Dinding kosong membuat dua belas rambu terbaca sebagai barang
 * yang dipajang rapi, bukan mengambang di antara dekorasi.
 *
 * `preserveAspectRatio="none"`: latar ini hanya bidang warna dan garis
 * horizontal, jadi peregangan tidak merusak bentuk, dan posisi pita tetap
 * sama persen dengan baris hiasan di atasnya.
 */
const WALL = '#f3e7d5'
const CEILING = '#efe2cc'
const TABLE = '#cba875'
const LINE = '#d8c4a3'
const TABLE_LINE = '#a97f4f'

export function KafeScene({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 340 300"
      preserveAspectRatio="none"
      className={className}
    >
      {/* dinding */}
      <rect width="340" height="300" fill={WALL} />

      {/* plafon: pita tenang di atas, dengan satu garis batas */}
      <rect width="340" height="26" fill={CEILING} />
      <line x1="0" y1="26" x2="340" y2="26" stroke={LINE} strokeWidth="2" />

      {/* meja: pita kayu di bawah, tempat empat kotak berdiri */}
      <rect y="254" width="340" height="46" fill={TABLE} />
      <line x1="0" y1="254" x2="340" y2="254" stroke={TABLE_LINE} strokeWidth="3" />
    </svg>
  )
}
