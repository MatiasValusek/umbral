import { useEffect, useState } from 'react'
import Modal from './Modal'
import { RENDERS } from '../data/galeria'

export default function Galeria({ onClose }: { onClose: () => void }) {
  const [abierto, setAbierto] = useState<number | null>(null)
  const n = RENDERS.length

  useEffect(() => {
    if (abierto === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setAbierto((i) => (i! + 1) % n)
      if (e.key === 'ArrowLeft') setAbierto((i) => (i! - 1 + n) % n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto, n])

  if (abierto !== null) {
    const r = RENDERS[abierto]
    return (
      <Modal titulo={r.titulo} onClose={() => setAbierto(null)} className="modal__caja--ancha">
        <div className="visor">
          <img key={r.id} src={r.src} alt={r.titulo} />
          <button className="visor__flecha visor__flecha--izq" aria-label="Anterior" onClick={() => setAbierto((abierto - 1 + n) % n)}>
            ‹
          </button>
          <button className="visor__flecha visor__flecha--der" aria-label="Siguiente" onClick={() => setAbierto((abierto + 1) % n)}>
            ›
          </button>
        </div>
        <p className="modal__nota">
          {abierto + 1} / {n} · Flechas para navegar · Esc para volver a la grilla
        </p>
      </Modal>
    )
  }

  return (
    <Modal titulo="Renders del proyecto" onClose={onClose} className="modal__caja--ancha">
      <div className="grilla">
        {RENDERS.map((r, i) => (
          <button key={r.id} className="grilla__item" onClick={() => setAbierto(i)}>
            <img src={r.mini} alt={r.titulo} loading="lazy" />
            <span>{r.titulo}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
