import { useCallback, useRef, useState } from 'react'
import Modal from './Modal'
import { PARES } from '../data/galeria'

type Props = { inicial?: string; onClose: () => void }

export default function Comparador({ inicial, onClose }: Props) {
  const [id, setId] = useState(inicial ?? PARES[0].id)
  const [pos, setPos] = useState(50)
  const marco = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)
  const par = PARES.find((p) => p.id === id) ?? PARES[0]

  const mover = useCallback((clientX: number) => {
    const r = marco.current?.getBoundingClientRect()
    if (!r) return
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }, [])

  return (
    <Modal titulo="Antes / Después" onClose={onClose} className="modal__caja--ancha">
      <nav className="pestanas" aria-label="Vistas">
        {PARES.map((p) => (
          <button
            key={p.id}
            className={'pestana' + (p.id === id ? ' pestana--activa' : '')}
            onClick={() => {
              setId(p.id)
              setPos(50)
            }}
          >
            {p.titulo}
          </button>
        ))}
      </nav>

      <div
        ref={marco}
        className="comparador"
        onPointerDown={(e) => {
          arrastrando.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          mover(e.clientX)
        }}
        onPointerMove={(e) => arrastrando.current && mover(e.clientX)}
        onPointerUp={() => (arrastrando.current = false)}
        onPointerCancel={() => (arrastrando.current = false)}
      >
        <img src={par.despues} alt={`${par.titulo}: proyecto`} draggable={false} />
        <img
          src={par.antes}
          alt={`${par.titulo}: estado actual`}
          draggable={false}
          className="comparador__antes"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <span className="comparador__etiqueta comparador__etiqueta--izq">Antes</span>
        <span className="comparador__etiqueta comparador__etiqueta--der">Proyecto</span>
        <div
          className="comparador__linea"
          style={{ left: `${pos}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Deslizar para comparar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPos((v) => Math.max(0, v - 5))
            if (e.key === 'ArrowRight') setPos((v) => Math.min(100, v + 5))
          }}
        >
          <span className="comparador__tirador">‹ ›</span>
        </div>
      </div>
      <p className="modal__nota">Arrastrá la línea para comparar el patio actual con el proyecto.</p>
    </Modal>
  )
}
