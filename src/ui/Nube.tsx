import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { tituloModelo, useEstado } from '../estado'
import { entrarConCodigo, mandarLink, useSesion } from '../nube/cliente'
import { abrirDeNube, borrarProyecto, guardarEnNube, listarProyectos, renombrarProyecto, type ProyectoNube } from '../nube/proyectos'
import Modal from './Modal'
import { abrirEjemplo, EJEMPLOS, miniaturaEjemplo } from '../nube/ejemplos'

type Ventana = null | 'entrar' | 'proyectos' | 'guardarComo' | 'ejemplos'
export const useVentanaNube = create<{ ventana: Ventana; despues: Ventana }>(() => ({ ventana: null, despues: null }))
/** Abre una ventana de la nube; si hace falta entrar primero, después de entrar sigue con la pedida */
export function abrirVentanaNube(v: Exclude<Ventana, null>) {
  if (v !== 'entrar' && v !== 'ejemplos' && !useSesion.getState().usuario) useVentanaNube.setState({ ventana: 'entrar', despues: v })
  else useVentanaNube.setState({ ventana: v, despues: null })
}
const cerrar = () => useVentanaNube.setState({ ventana: null, despues: null })

const fecha = (iso: string) => {
  const d = new Date(iso)
  const hoy = new Date()
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoy.toDateString()) return `Hoy ${hora}`
  const ayer = new Date(hoy.getTime() - 864e5)
  if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora}`
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: d.getFullYear() === hoy.getFullYear() ? undefined : 'numeric' })
}

function Entrar({ onAviso }: { onAviso: (t: string) => void }) {
  const usuario = useSesion((s) => s.usuario)
  const despues = useVentanaNube((s) => s.despues)
  const [email, setEmail] = useState(() => localStorage.getItem('umbral-email') ?? '')
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  // Si entró (por el código, o con el link en otra pestaña), seguir con lo que había pedido
  useEffect(() => {
    if (!usuario) return
    onAviso(`Entraste como ${usuario.email}.`)
    if (despues) useVentanaNube.setState({ ventana: despues, despues: null })
    else cerrar()
  }, [usuario, despues, onAviso])

  const mandar = async (ev?: React.FormEvent) => {
    ev?.preventDefault()
    const limpio = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(limpio)) return setError('Escribí un mail válido.')
    setOcupado(true)
    setError('')
    try {
      await mandarLink(limpio)
      localStorage.setItem('umbral-email', limpio)
      setEnviado(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mandar el mail.')
    } finally {
      setOcupado(false)
    }
  }

  const verificar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setOcupado(true)
    setError('')
    try {
      await entrarConCodigo(email.trim(), codigo.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entrar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal titulo="Entrar a Umbral" onClose={cerrar} className="modal__caja--angosta">
      {!enviado ? (
        <form className="nube__form" onSubmit={mandar}>
          <p className="nube__texto">
            Con una cuenta guardás tus proyectos en la nube (escena y modelo 3D) y los abrís desde cualquier compu. No hace falta contraseña: te mandamos un link al mail.
          </p>
          <label className="nube__campo">
            <span>Tu mail</span>
            <input type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@estudio.com" />
          </label>
          {error && <p className="render__error">{error}</p>}
          <button className="renderizar" disabled={ocupado}>
            {ocupado ? 'Mandando…' : 'Mandarme el link'}
          </button>
        </form>
      ) : (
        <form className="nube__form" onSubmit={verificar}>
          <p className="nube__texto">
            Te mandamos un mail a <strong>{email.trim()}</strong>. Abrí el link y vas a entrar solo. Si no lo ves, fijate en spam.
          </p>
          <label className="nube__campo">
            <span>¿El mail trae un código? Escribilo acá</span>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          </label>
          {error && <p className="render__error">{error}</p>}
          <button className="renderizar" disabled={ocupado || codigo.length < 6}>
            {ocupado ? 'Entrando…' : 'Entrar con el código'}
          </button>
          <div className="chips">
            <button type="button" className="chip" onClick={() => mandar()} disabled={ocupado}>
              Mandar de nuevo
            </button>
            <button type="button" className="chip" onClick={() => { setEnviado(false); setCodigo('') }}>
              Cambiar el mail
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function GuardarComo({ onAviso }: { onAviso: (t: string) => void }) {
  const modelo = useEstado((s) => s.modelo)
  const actual = useSesion((s) => s.actual)
  const [nombre, setNombre] = useState(() => (actual ? `${actual.nombre} (copia)` : tituloModelo(modelo)))
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError('')
    try {
      const r = await guardarEnNube(nombre, setEstado)
      onAviso(`Proyecto “${r.nombre}” guardado en la nube.`)
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
      setEstado('')
    }
  }

  return (
    <Modal titulo="Guardar en la nube" onClose={() => !estado && cerrar()} className="modal__caja--angosta">
      <form className="nube__form" onSubmit={guardar}>
        <label className="nube__campo">
          <span>Nombre del proyecto</span>
          <input autoFocus maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <p className="nube__texto">
          Se guarda la escena (objetos, materiales, luz, render y video){modelo.tipo === 'propio' ? ' y tu modelo 3D' : ''}, con una miniatura de la vista actual.
        </p>
        {error && <p className="render__error">{error}</p>}
        <button className="renderizar" disabled={!!estado || !nombre.trim()}>
          {estado || 'Guardar'}
        </button>
      </form>
    </Modal>
  )
}

function Tarjeta({ p, actual, onAbrir, onCambio }: { p: ProyectoNube; actual: boolean; onAbrir: () => void; onCambio: () => void }) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(p.nombre)
  const [confirmar, setConfirmar] = useState(false)
  const [error, setError] = useState('')

  const renombrar = async () => {
    setEditando(false)
    if (nombre.trim() === p.nombre || !nombre.trim()) return setNombre(p.nombre)
    try {
      await renombrarProyecto(p.id, nombre)
      onCambio()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el nombre.')
    }
  }
  const borrar = async () => {
    try {
      await borrarProyecto(p.id)
      onCambio()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar.')
    }
  }

  return (
    <li className={'tarjeta' + (actual ? ' tarjeta--actual' : '')}>
      <button className="tarjeta__imagen" onClick={onAbrir} aria-label={`Abrir ${p.nombre}`}>
        {p.miniatura ? <img src={p.miniatura} alt="" loading="lazy" /> : <span>Sin miniatura</span>}
      </button>
      <div className="tarjeta__info">
        {editando ? (
          <input
            className="toma__editar"
            autoFocus
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={renombrar}
            onKeyDown={(e) => {
              if (e.key === 'Enter') renombrar()
              if (e.key === 'Escape') { setNombre(p.nombre); setEditando(false) }
              e.stopPropagation()
            }}
          />
        ) : (
          <strong title={p.nombre}>{p.nombre}</strong>
        )}
        <span>
          {p.modelo.tipo === 'propio' ? tituloModelo(p.modelo) : 'Casa Jardín (ejemplo)'} · {fecha(p.actualizado)}
          {actual && ' · abierto'}
        </span>
        {error && <span className="render__error">{error}</span>}
        <div className="tarjeta__acciones">
          {confirmar ? (
            <>
              <span>¿Borrar para siempre?</span>
              <button className="chip chip--chico chip--peligro" onClick={borrar}>Borrar</button>
              <button className="chip chip--chico" onClick={() => setConfirmar(false)}>No</button>
            </>
          ) : (
            <>
              <button className="chip chip--chico chip--activo" onClick={onAbrir}>Abrir</button>
              <button className="chip chip--chico" onClick={() => setEditando(true)}>Renombrar</button>
              <button className="chip chip--chico" onClick={() => setConfirmar(true)}>Borrar</button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

/** Tarjetas de los proyectos de ejemplo (para cualquiera, con o sin cuenta) */
function Ejemplos({ onAviso, ocupado, setOcupado }: { onAviso: (t: string) => void; ocupado: string; setOcupado: (t: string) => void }) {
  const [error, setError] = useState('')
  const abrir = async (i: number) => {
    if (ocupado) return
    setError('')
    try {
      await abrirEjemplo(EJEMPLOS[i], setOcupado)
      const conCuenta = !!useSesion.getState().usuario
      onAviso(
        `Ejemplo “${EJEMPLOS[i].nombre}” abierto. ` +
          (conCuenta ? 'Si lo cambiás, guardalo con Ctrl S y queda en tus proyectos.' : 'Entrá con tu mail para guardar tus cambios en la nube.'),
      )
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el ejemplo.')
    } finally {
      setOcupado('')
    }
  }
  return (
    <>
      {error && <p className="render__error">{error}</p>}
      <ul className="tarjetas tarjetas--ejemplos">
        {EJEMPLOS.map((e, i) => (
          <li key={e.id} className="tarjeta">
            <button className="tarjeta__imagen" onClick={() => abrir(i)} aria-label={`Abrir el ejemplo ${e.nombre}`}>
              <img src={miniaturaEjemplo(e)} alt="" loading="lazy" />
              <span className="tarjeta__sello">Ejemplo</span>
            </button>
            <div className="tarjeta__info">
              <strong>{e.nombre}</strong>
              <span>{e.descripcion}</span>
              <div className="tarjeta__acciones">
                <button className="chip chip--chico chip--activo" onClick={() => abrir(i)}>
                  Abrir ejemplo
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function VentanaEjemplos({ onAviso }: { onAviso: (t: string) => void }) {
  const [ocupado, setOcupado] = useState('')
  return (
    <Modal titulo="Ejemplos para probar" onClose={() => !ocupado && cerrar()} className="modal__caja--media">
      <p className="nube__texto">Dos proyectos simples, livianos y listos para probar objetos, materiales, luz, render y video. Al abrir uno se reemplaza lo que tenés en pantalla.</p>
      {ocupado && <p className="nube__texto nube__estado">{ocupado}</p>}
      <Ejemplos onAviso={onAviso} ocupado={ocupado} setOcupado={setOcupado} />
    </Modal>
  )
}

function MisProyectos({ onAviso }: { onAviso: (t: string) => void }) {
  const usuario = useSesion((s) => s.usuario)
  const actual = useSesion((s) => s.actual)
  const [lista, setLista] = useState<ProyectoNube[] | null>(null)
  const [error, setError] = useState('')
  const [abriendo, setAbriendo] = useState('')

  const cargar = () =>
    listarProyectos()
      .then(setLista)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo leer la lista.'))
  useEffect(() => {
    cargar()
  }, [])

  const abrir = async (p: ProyectoNube) => {
    setError('')
    try {
      const nombre = await abrirDeNube(p.id, setAbriendo)
      onAviso(`Proyecto “${nombre}” abierto.`)
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir.')
    } finally {
      setAbriendo('')
    }
  }

  return (
    <Modal titulo="Mis proyectos" onClose={() => !abriendo && cerrar()} className="modal__caja--media">
      <p className="nube__texto">
        {usuario?.email} · {lista ? `${lista.length} proyecto${lista.length === 1 ? '' : 's'}` : 'cargando…'}
      </p>
      {error && <p className="render__error">{error}</p>}
      {abriendo && <p className="nube__texto nube__estado">{abriendo}</p>}
      {lista && lista.length === 0 && (
        <p className="nube__vacio">Todavía no guardaste proyectos. Abrí un ejemplo de abajo para probar, o armá tu escena y tocá “Guardar en la nube”.</p>
      )}
      {lista && lista.length > 0 && (
        <ul className="tarjetas">
          {lista.map((p) => (
            <Tarjeta key={p.id} p={p} actual={actual?.id === p.id} onAbrir={() => !abriendo && abrir(p)} onCambio={cargar} />
          ))}
        </ul>
      )}
      <div className="chips nube__pie">
        <button className="chip" onClick={() => abrirVentanaNube('guardarComo')}>
          + Guardar la escena actual como proyecto nuevo
        </button>
      </div>
      <h3 className="nube__subtitulo">Ejemplos para probar</h3>
      <Ejemplos onAviso={onAviso} ocupado={abriendo} setOcupado={setAbriendo} />
    </Modal>
  )
}

/** Ventanas de la nube (se montan una sola vez, en la barra de proyecto) */
export default function Nube({ onAviso }: { onAviso: (t: string) => void }) {
  const ventana = useVentanaNube((s) => s.ventana)
  // Van directo al body: la barra de proyecto tiene su propio apilado (desenfoque) y los paneles quedarían encima
  const contenido =
    ventana === 'entrar' ? <Entrar onAviso={onAviso} />
    : ventana === 'guardarComo' ? <GuardarComo onAviso={onAviso} />
    : ventana === 'proyectos' ? <MisProyectos onAviso={onAviso} />
    : ventana === 'ejemplos' ? <VentanaEjemplos onAviso={onAviso} />
    : null
  return contenido && createPortal(contenido, document.body)
}
