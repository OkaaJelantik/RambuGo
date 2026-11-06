import Kid from './Kid'
import './crossroad.css'

type Props = { onMateri: () => void; onKuis: () => void }

export default function Crossroad({ onMateri, onKuis }: Props) {
  return (
    <div className="fx-scene">
      <div className="fx-grass" />
      <div className="fx-tree fx-tree-a" />
      <div className="fx-tree fx-tree-b" />
      <div className="fx-tree fx-tree-c" />
      <div className="fx-tree fx-tree-d" />

      <h2 className="fx-title">Kamu sampai di persimpangan</h2>

      {/* jalan lurus tempat anak berdiri */}
      <div className="fx-trunk">
        <span className="fx-dash" />
      </div>

      {/* dua cabang jalan, masing-masing bisa diklik */}
      <button className="fx-branch left" onClick={onMateri} aria-label="Jalur materi: belajar rambu lalu lintas">
        <span className="fx-road">
          <span className="fx-dash" />
        </span>
        <span className="fx-sign">
          <span className="fx-sign-icon">🚸</span>
          <span className="fx-sign-text">
            <strong>Jalur Materi</strong>
            <em>Belajar 6 rambu</em>
          </span>
        </span>
      </button>

      <button className="fx-branch right" onClick={onKuis} aria-label="Jalur kuis: uji pemahaman rambu">
        <span className="fx-road">
          <span className="fx-dash" />
        </span>
        <span className="fx-sign">
          <span className="fx-sign-icon">🎯</span>
          <span className="fx-sign-text">
            <strong>Jalur Kuis</strong>
            <em>5 soal</em>
          </span>
        </span>
      </button>

      <div className="fx-kid">
        <Kid />
        <span className="fx-here">kamu di sini</span>
      </div>
    </div>
  )
}
