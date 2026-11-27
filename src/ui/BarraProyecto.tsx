import { useCallback, useEffect, useRef, useState } from 'react'
import {
  aJSON,
  deJSON,
  deshacer,
  DOCUMENTO_VACIO,
  reemplazar,
  rehacer,
  useHistorial,
} from '../proyecto/documento'
import { slugModelo, useEstado } from '../estado'
import { elegirModelo, volverAlEjemplo } from './SubirModelo'
import { nubeDisponible, salir, useSesion } from '../nube/cliente'
import { guardarEnNube } from '../nube/proyectos'
import Nube, { abrirVentanaNube } from './Nube'


const escribiendo = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  ((t.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'color'].includes((t as HTMLInputElement).type)) ||
    t.tagName === 'TEXTAREA' ||
    t.isContentEditable)

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

/** Deshacer / rehacer y menú Proyecto (guardar, abrir, empezar de cero) */
export default function BarraProyecto() {
  const propio = useEstado((s) => s.modelo.tipo === 'propio')
  const puedeDeshacer = useHistorial((h) => h.pasado.length > 0)
  const puedeRehacer = useHistorial((h) => h.futuro.length > 0)
  const usuario = useSesion((s) => s.usuario)
  const actual = useSesion((s) => s.actual)
  const [guardandoNube, setGuardandoNube] = useState(false)
  const [menu, setMenu] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: boolean } | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const caja = useRef<HTMLDivElement>(null)

  const avisar = (texto: string, conDeshacer = false) => setAviso({ texto, deshacer: conDeshacer })
  const avisarNube = useCallback((texto: string) => setAviso({ texto }), [])
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 8000)
    return () => clearTimeout(t)
  }, [aviso])

  // Atajos globales
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (escribiendo(ev.target) || !(ev.ctrlKey || ev.metaKey)) return
      const k = ev.key.toLowerCase()
      if (k === 'z' && !ev.shiftKey) {
        ev.preventDefault()
        deshacer()
      } else if (k === 'y' || (k === 'z' && ev.shiftKey)) {
        ev.preventDefault()
        rehacer()
      } else if (k === 's') {
        ev.preventDefault()
        if (useSesion.getState().usuario) guardarNube()
        else guardar()
      } else if (k === 'o') {
        ev.preventDefault()
        archivo.current?.click()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  // Cerrar el menú al hacer click afuera
  useEffect(() => {
    if (!menu) return
    const fuera = (ev: PointerEvent) => {
      if (!caja.current?.contains(ev.target as Node)) setMenu(false)
    }
    window.addEventListener('pointerdown', fuera)
    return () => window.removeEventListener('pointerdown', fuera)
  }, [menu])

  function guardar() {
    const modelo = slugModelo(useEstado.getState().modelo)
    const { texto, omitidos } = aJSON(modelo)
    const blob = new Blob([texto], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `escena-${modelo}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setMenu(false)
    avisar(
      omitidos
        ? `Escena guardada. ${omitidos} objeto${omitidos > 1 ? 's' : ''} .glb propio${omitidos > 1 ? 's' : ''} no se guarda${omitidos > 1 ? 'n' : ''} en el archivo.`
        : 'Escena guardada.',
    )
  }

  /** Guarda en el proyecto de la nube abierto; si no hay ninguno, pregunta el nombre */
  async function guardarNube() {
    setMenu(false)
    if (!useSesion.getState().actual) return abrirVentanaNube('guardarComo')
    setGuardandoNube(true)
    try {
      const r = await guardarEnNube(undefined, (t) => avisar(t))
      avisar(`Guardado en la nube: “${r.nombre}”.`)
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'No se pudo guardar en la nube.')
    } finally {
      setGuardandoNube(false)
    }
  }

  async function abrir(f: File | undefined) {
    if (!f) return
    setMenu(false)
    try {
      const texto = await f.text()
      const doc = deJSON(texto)
      reemplazar(doc)
      const deOtro = JSON.parse(texto).modelo !== slugModelo(useEstado.getState().modelo)
      avisar(
        deOtro
          ? `Escena “${f.name}” abierta, pero era de otro modelo: los materiales pueden no coincidir.`
          : `Escena “${f.name}” abierta.`,
        true,
      )
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'No se pudo abrir el archivo.')
    }
  }

  function deCero() {
    reemplazar(DOCUMENTO_VACIO)
    setMenu(false)
    avisar('Escena vacía: sin objetos ni cambios de materiales.', true)
  }

  return (
    <>
      <div className="proyecto" ref={caja}>
        <button className="proyecto__boton" onClick={deshacer} disabled={!puedeDeshacer} aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
          <Icono d="M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </button>
        <button className="proyecto__boton" onClick={rehacer} disabled={!puedeRehacer} aria-label="Rehacer" title="Rehacer (Ctrl+Y)">
          <Icono d="M15 14l5-5-5-5 M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </button>
        <button className="proyecto__boton proyecto__boton--texto" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)}>
          Proyecto
        </button>
        {menu && (
          <div className="proyecto__menu" role="menu">
            {nubeDisponible && (
              <>
                {usuario ? (
                  <>
                    <button role="menuitem" onClick={guardarNube} disabled={guardandoNube}>
                      <span className="proyecto__item">
                        {guardandoNube ? 'Guardando…' : 'Guardar en la nube'}
                        {actual && <small>{actual.nombre}</small>}
                      </span>
                      <kbd>Ctrl S</kbd>
                    </button>
                    {actual && (
                      <button role="menuitem" onClick={() => { setMenu(false); abrirVentanaNube('guardarComo') }}>
                        Guardar como proyecto nuevo…
                      </button>
                    )}
                    <button role="menuitem" onClick={() => { setMenu(false); abrirVentanaNube('proyectos') }}>
                      Mis proyectos…
                    </button>
                  </>
                ) : (
                  <button role="menuitem" onClick={() => { setMenu(false); abrirVentanaNube('entrar') }}>
                    <span className="proyecto__item">
                      Entrar para guardar en la nube…
                      <small>Tus proyectos en cualquier compu</small>
                    </span>
                  </button>
                )}
                <hr />
              </>
            )}
            <button role="menuitem" onClick={guardar}>
              {nubeDisponible ? 'Descargar escena.json' : 'Guardar escena'} {!usuario && <kbd>Ctrl S</kbd>}
            </button>
            <button role="menuitem" onClick={() => archivo.current?.click()}>
              Abrir escena.json… <kbd>Ctrl O</kbd>
            </button>
            <button role="menuitem" onClick={deCero}>
              Empezar de cero
            </button>
            {nubeDisponible && (
              <button role="menuitem" onClick={() => { setMenu(false); abrirVentanaNube('ejemplos') }}>
                Ejemplos para probar…
              </button>
            )}
            <hr />
            <button
              role="menuitem"
              onClick={() => {
                setMenu(false)
                elegirModelo()
              }}
            >
              Cargar mi modelo 3D…
            </button>
            {propio && (
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(false)
                  volverAlEjemplo()
                  avisar('Volviste al modelo de ejemplo (Casa Jardín).')
                }}
              >
                Volver al modelo de ejemplo
              </button>
            )}
            {usuario && (
              <>
                <hr />
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(false)
                    salir().then(() => avisar('Saliste de tu cuenta. Lo que está en pantalla sigue acá.'))
                  }}
                >
                  <span className="proyecto__item">
                    Salir
                    <small>{usuario.email}</small>
                  </span>
                </button>
              </>
            )}
            <p>La escena (escena.json) guarda objetos, materiales, luz y render; el modelo 3D va aparte. También podés soltar un .glb, .fbx, .obj o .dae sobre la ventana.</p>
          </div>
        )}
        <input
          ref={archivo}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(ev) => {
            abrir(ev.target.files?.[0])
            ev.target.value = ''
          }}
        />
      </div>

      <Nube onAviso={avisarNube} />

      {aviso && (
        <div className="aviso" role="status">
          <span>{aviso.texto}</span>
          {aviso.deshacer && (
            <button
              onClick={() => {
                deshacer()
                setAviso(null)
              }}
            >
              Deshacer
            </button>
          )}
        </div>
      )}
    </>
  )
}
