import { useEffect, useRef, useState } from 'react'
import { useEstado, type Herramienta } from '../estado'
import { CATALOGO, PROPIO, porId, type Categoria } from '../objetos/catalogo'
import { alturaEn } from '../objetos/Superficie'
import { EditorMaterial, ListaMateriales } from './PanelMateriales'

const CATEGORIAS: Categoria[] = ['Vegetación', 'Personas', 'Mobiliario']
const MAX_MB = 50

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

const HERRAMIENTAS: { id: Herramienta; nombre: string; tecla: string }[] = [
  { id: 'mover', nombre: 'Mover', tecla: 'G' },
  { id: 'rotar', nombre: 'Rotar', tecla: 'R' },
  { id: 'escalar', nombre: 'Escalar', tecla: 'S' },
]

// Duplica al lado y lo apoya sobre lo que haya debajo
function duplicarApoyado(id: string) {
  const s = useEstado.getState()
  s.duplicar(id)
  const nuevo = useEstado.getState().objetos.find((o) => o.id === useEstado.getState().seleccionado)
  if (nuevo) s.actualizar(nuevo.id, { pos: [nuevo.pos[0], alturaEn(nuevo.pos[0], nuevo.pos[2]), nuevo.pos[2]] })
}

const escribiendo = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

export default function PanelEdicion() {
  const e = useEstado()
  const [aviso, setAviso] = useState('')
  const archivo = useRef<HTMLInputElement>(null)
  const sel = e.objetos.find((o) => o.id === e.seleccionado)

  // Atajos de teclado del modo Edición
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (escribiendo(ev.target)) return
      const s = useEstado.getState()
      const k = ev.key.toLowerCase()
      if (k === 'escape') return s.set({ colocando: null, seleccionado: null, materialSel: null })
      if (!s.seleccionado) return
      if (k === 'g') s.set({ herramienta: 'mover' })
      else if (k === 'r') s.set({ herramienta: 'rotar' })
      else if (k === 's' && !ev.ctrlKey && !ev.metaKey) s.set({ herramienta: 'escalar' })
      else if (k === 'delete' || k === 'backspace') s.borrar(s.seleccionado)
      else if (k === 'd' && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault()
        duplicarApoyado(s.seleccionado)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const subir = (f: File | undefined) => {
    if (!f) return
    if (!/\.(glb|gltf)$/i.test(f.name)) return setAviso('Por ahora solo archivos .glb.')
    if (f.size > MAX_MB * 1024 * 1024) return setAviso(`El archivo pesa más de ${MAX_MB} MB.`)
    setAviso('')
    e.set({
      colocando: { tipo: PROPIO, nombre: f.name.replace(/\.(glb|gltf)$/i, ''), url: URL.createObjectURL(f) },
      seleccionado: null,
    })
  }

  return (
    <>
      <aside className="biblioteca" aria-label="Biblioteca">
        <div className="pestanas" role="tablist" aria-label="Qué editar">
          {(['objetos', 'materiales'] as const).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={e.pestana === p}
              className={'pestana' + (e.pestana === p ? ' pestana--activa' : '')}
              onClick={() => e.set({ pestana: p, colocando: null, seleccionado: null })}
            >
              {p === 'objetos' ? 'Objetos' : 'Materiales'}
            </button>
          ))}
        </div>
        {e.pestana === 'materiales' ? (
          <ListaMateriales />
        ) : (
        <>
        <p className="render__nota">
          {e.colocando
            ? `Hacé click en la escena para colocar “${e.colocando.nombre}”. Shift + click coloca varios. Esc cancela.`
            : 'Elegí un objeto y hacé click en la escena para colocarlo.'}
        </p>
        {CATEGORIAS.map((cat) => (
          <section key={cat} className="render__grupo">
            <h3>{cat}</h3>
            <div className="items">
              {CATALOGO.filter((c) => c.categoria === cat).map((c) => (
                <button
                  key={c.id}
                  className={'item' + (e.colocando?.tipo === c.id ? ' item--activo' : '')}
                  onClick={() =>
                    e.set({
                      colocando: e.colocando?.tipo === c.id ? null : { tipo: c.id, nombre: c.nombre },
                      seleccionado: null,
                    })
                  }
                >
                  <Icono d={c.icono} />
                  <span>{c.nombre}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <section className="render__grupo">
          <h3>Mis objetos</h3>
          <button className="subir" onClick={() => archivo.current?.click()}>
            Subir un .glb propio
          </button>
          <input
            ref={archivo}
            type="file"
            accept=".glb,model/gltf-binary"
            hidden
            onChange={(ev) => {
              subir(ev.target.files?.[0])
              ev.target.value = ''
            }}
          />
          <p className="render__nota">
            Hasta {MAX_MB} MB. Queda en la escena hasta que recargues la página.
            {aviso && <strong className="render__error"> {aviso}</strong>}
          </p>
        </section>
        </>
        )}
      </aside>

      {e.pestana === 'materiales' && e.materialSel && <EditorMaterial />}

      {sel && (
        <aside className="propiedades" aria-label="Objeto seleccionado">
          <div className="propiedades__cabeza">
            <h2 className="render__titulo">{sel.nombre}</h2>
            <button className="cerrar" aria-label="Deseleccionar" onClick={() => e.set({ seleccionado: null })}>
              ×
            </button>
          </div>
          <div className="herramientas" role="group" aria-label="Herramienta">
            {HERRAMIENTAS.map((h) => (
              <button
                key={h.id}
                className={'chip' + (e.herramienta === h.id ? ' chip--activo' : '')}
                onClick={() => e.set({ herramienta: h.id })}
              >
                {h.nombre} <kbd>{h.tecla}</kbd>
              </button>
            ))}
          </div>
          <label className="deslizador">
            <span className="deslizador__fila">
              <h3>Rotación</h3>
              <output>{Math.round((((sel.rotY * 180) / Math.PI) % 360 + 360) % 360)}°</output>
            </span>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={Math.round((((sel.rotY * 180) / Math.PI) % 360 + 360) % 360)}
              onChange={(ev) => e.actualizar(sel.id, { rotY: (+ev.target.value * Math.PI) / 180 })}
            />
          </label>
          <label className="deslizador">
            <span className="deslizador__fila">
              <h3>Escala</h3>
              <output>{sel.escala.toFixed(2)}×</output>
            </span>
            <input
              type="range"
              min={0.2}
              max={4}
              step={0.05}
              value={sel.escala}
              onChange={(ev) => e.actualizar(sel.id, { escala: +ev.target.value })}
            />
          </label>
          <div className="propiedades__acciones">
            <button className="chip" onClick={() => duplicarApoyado(sel.id)}>
              Duplicar <kbd>Ctrl D</kbd>
            </button>
            <button className="chip chip--peligro" onClick={() => e.borrar(sel.id)}>
              Borrar <kbd>Supr</kbd>
            </button>
          </div>
          <p className="render__nota">
            {porId(sel.tipo)?.categoria ?? 'Objeto propio'} · {e.objetos.length} objeto{e.objetos.length === 1 ? '' : 's'} en la escena
          </p>
        </aside>
      )}
    </>
  )
}
