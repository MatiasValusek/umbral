import { useEstado, type Modo } from '../estado'

const MODOS: { id: Modo; nombre: string }[] = [
  { id: 'vista', nombre: 'Vista' },
  { id: 'edicion', nombre: 'Edición' },
  { id: 'render', nombre: 'Render' },
]

// Selector de modo de la barra superior
export default function Modos() {
  const modo = useEstado((s) => s.modo)
  const set = useEstado((s) => s.set)
  return (
    <div className="modos" role="tablist" aria-label="Modo">
      {MODOS.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={modo === m.id}
          className={'modos__item' + (modo === m.id ? ' modos__item--activo' : '')}
          onClick={() => set({ modo: m.id })}
        >
          {m.nombre}
        </button>
      ))}
    </div>
  )
}
