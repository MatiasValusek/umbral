import { useEffect, useState } from 'react'
import type { Punto } from '../data/puntos'
import { DURACION_VIDEO, FORMATOS, slugModelo, useEstado, type AjustesVideo, type Fps, type Pausa, type Toma } from '../estado'
import { crearRecorrido, orbitaDesde, tomasDelRecorrido } from '../video/recorrido'
import { descargar, fechaArchivo } from './descargar'

const GIROS: { valor: AjustesVideo['giro']; nombre: string }[] = [
  { valor: 90, nombre: '¼ de vuelta' },
  { valor: 180, nombre: 'Media vuelta' },
  { valor: 360, nombre: 'Vuelta completa' },
]

const PAUSAS: { valor: Pausa; nombre: string }[] = [
  { valor: 0, nombre: 'Sin pausa' },
  { valor: 1, nombre: '1 s' },
  { valor: 2, nombre: '2 s' },
  { valor: 3, nombre: '3 s' },
]

/** Nombre de una toma: click para verla, lápiz para cambiarle el nombre */
function NombreToma({ toma, onIr, onRenombrar }: { toma: Toma; onIr: () => void; onRenombrar: (n: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(toma.nombre)
  const terminar = (guardar: boolean) => {
    const limpio = texto.trim().slice(0, 60)
    if (guardar && limpio && limpio !== toma.nombre) onRenombrar(limpio)
    setEditando(false)
  }
  if (editando)
    return (
      <input
        className="toma__editar"
        value={texto}
        maxLength={60}
        autoFocus
        aria-label="Nombre de la toma"
        onFocus={(ev) => ev.target.select()}
        onChange={(ev) => setTexto(ev.target.value)}
        onBlur={() => terminar(true)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') terminar(true)
          if (ev.key === 'Escape') terminar(false)
          ev.stopPropagation() // que las teclas no muevan la cámara ni disparen atajos
        }}
      />
    )
  return (
    <>
      <button className="toma__nombre" onClick={onIr} onDoubleClick={() => { setTexto(toma.nombre); setEditando(true) }} title="Ver esta toma (doble click para cambiarle el nombre)">
        {toma.nombre}
      </button>
      <button className="toma__accion" onClick={() => { setTexto(toma.nombre); setEditando(true) }} aria-label={`Cambiar el nombre de ${toma.nombre}`} title="Cambiar el nombre">
        ✎
      </button>
    </>
  )
}

const segundos = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`)

function useVideo() {
  const video = useEstado((s) => s.video)
  const cambiar = (parcial: Partial<AjustesVideo>) =>
    useEstado.getState().set({ video: { ...useEstado.getState().video, ...parcial } })
  return [video, cambiar] as const
}

/** Sección "Recorrido": tomas u órbita, duración y vista previa */
export function Recorrido({ onSelect }: { onSelect: (p: Punto) => void }) {
  const [video, cambiar] = useVideo()
  const modelo = useEstado((s) => s.modelo)
  const previa = useEstado((s) => s.previa)
  const vistaActual = useEstado((s) => s.vistaActual)
  const tomas = tomasDelRecorrido(video, modelo)
  const sugerido = video.tomas.length === 0 && tomas.length > 0
  const problema = (() => {
    const r = crearRecorrido(video, tomas)
    return typeof r === 'string' ? r : ''
  })()

  const fijarTomas = (lista: Toma[]) => cambiar({ tomas: lista })
  const agregar = () => {
    if (!vistaActual) return
    const n = tomas.length + 1
    fijarTomas([...tomas, { ...vistaActual(), nombre: `Toma ${n}` }])
  }
  const renombrar = (i: number, nombre: string) => fijarTomas(tomas.map((t, k) => (k === i ? { ...t, nombre } : t)))
  const quitar = (i: number) => fijarTomas(tomas.filter((_, k) => k !== i))
  const subir = (i: number) => {
    if (i === 0) return
    const l = [...tomas]
    ;[l[i - 1], l[i]] = [l[i], l[i - 1]]
    fijarTomas(l)
  }
  const ir = (t: Toma) =>
    onSelect({ id: `toma-${t.nombre}`, titulo: t.nombre, descripcion: '', position: t.position, target: t.target })
  const elegirTipo = (tipo: AjustesVideo['tipo']) => {
    if (tipo === 'orbita' && !video.orbita && vistaActual) cambiar({ tipo, orbita: orbitaDesde(vistaActual()) })
    else cambiar({ tipo })
  }

  return (
    <section className="render__grupo">
      <h3>Recorrido</h3>
      <div className="chips">
        <button className={'chip' + (video.tipo === 'tomas' ? ' chip--activo' : '')} onClick={() => elegirTipo('tomas')}>
          Por tomas
        </button>
        <button className={'chip' + (video.tipo === 'orbita' ? ' chip--activo' : '')} onClick={() => elegirTipo('orbita')}>
          Órbita
        </button>
      </div>

      {video.tipo === 'tomas' ? (
        <>
          {tomas.length > 0 && (
            <ol className="tomas">
              {tomas.map((t, i) => (
                <li key={`${i}-${t.nombre}`} className="toma">
                  <span className="toma__n">{i + 1}</span>
                  <NombreToma toma={t} onIr={() => ir(t)} onRenombrar={(n) => renombrar(i, n)} />
                  <button className="toma__accion" onClick={() => subir(i)} disabled={i === 0} aria-label={`Subir ${t.nombre}`}>
                    ↑
                  </button>
                  <button className="toma__accion" onClick={() => quitar(i)} aria-label={`Quitar ${t.nombre}`}>
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="chips">
            <button className="chip" onClick={agregar} disabled={!vistaActual}>
              + Agregar vista actual
            </button>
            {video.tomas.length > 0 && modelo.tipo === 'ejemplo' && (
              <button className="chip" onClick={() => fijarTomas([])}>
                Volver al sugerido
              </button>
            )}
          </div>
          <div className="deslizador">
            <span className="deslizador__fila">
              <h3>Pausa en cada toma</h3>
            </span>
            <div className="chips">
              {PAUSAS.map((p) => (
                <button
                  key={p.valor}
                  className={'chip' + ((video.pausa ?? 0) === p.valor ? ' chip--activo' : '')}
                  onClick={() => cambiar({ pausa: p.valor })}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
          <p className="render__nota">
            {sugerido
              ? 'Recorrido sugerido por los puntos de interés. Mové la cámara y agregá tomas para armar el tuyo.'
              : 'La cámara pasa por las tomas en orden, con un movimiento suave. Click en una toma para verla, ✎ para cambiarle el nombre.'}
            {(video.pausa ?? 0) > 0 &&
              tomas.length > 1 &&
              ` Con la pausa quedan ${Math.max(0, video.duracion - (video.pausa ?? 0) * tomas.length)} s de movimiento.`}
          </p>
        </>
      ) : (
        <>
          <div className="chips">
            {GIROS.map((g) => (
              <button
                key={g.valor}
                className={'chip' + (video.giro === g.valor ? ' chip--activo' : '')}
                onClick={() => cambiar({ giro: g.valor })}
              >
                {g.nombre}
              </button>
            ))}
          </div>
          <div className="chips">
            <button
              className="chip"
              onClick={() => vistaActual && cambiar({ orbita: orbitaDesde(vistaActual()) })}
              disabled={!vistaActual}
            >
              Empezar desde la vista actual
            </button>
          </div>
          <p className="render__nota">La cámara gira alrededor del punto que mira, a la misma altura y distancia.</p>
        </>
      )}

      <label className="deslizador">
        <span className="deslizador__fila">
          <h3>Duración</h3>
          <output>{video.duracion} s</output>
        </span>
        <input
          type="range"
          min={DURACION_VIDEO.min}
          max={DURACION_VIDEO.max}
          step={1}
          value={video.duracion}
          onChange={(ev) => cambiar({ duracion: +ev.target.value })}
        />
      </label>

      {problema ? (
        <p className="render__error">{problema}</p>
      ) : (
        <button className="chip chip--previa" onClick={() => useEstado.getState().set({ previa: !previa })}>
          {previa ? '■ Detener vista previa' : '▶ Vista previa'}
        </button>
      )}
    </section>
  )
}

/** Cuadros por segundo (reemplaza a PNG / JPG cuando la salida es video) */
export function CuadrosPorSegundo() {
  const [video, cambiar] = useVideo()
  return (
    <div className="chips chips--archivo">
      {([24, 30, 60] as Fps[]).map((f) => (
        <button key={f} className={'chip' + (video.fps === f ? ' chip--activo' : '')} onClick={() => cambiar({ fps: f })}>
          {f} cps
        </button>
      ))}
    </div>
  )
}

/** Botón Grabar, último video y pantalla de progreso */
export function GrabarVideo() {
  const e = useEstado()
  const f = FORMATOS[e.formato]
  const [ultimo, setUltimo] = useState<{ url: string; nombre: string } | null>(null)
  const [error, setError] = useState('')
  const listo = typeof crearRecorrido(e.video, tomasDelRecorrido(e.video, e.modelo)) !== 'string'
  const soportado = typeof window !== 'undefined' && 'VideoEncoder' in window

  useEffect(() => () => { if (ultimo) URL.revokeObjectURL(ultimo.url) }, [ultimo])

  const grabar = async () => {
    if (!e.grabar || e.grabando) return
    setError('')
    e.set({ previa: false })
    await new Promise((r) => setTimeout(r, 60))
    try {
      const blob = await e.grabar(f.ancho, f.alto)
      if (!blob) return // cancelado
      const nombre = `umbral-${slugModelo(e.modelo)}-${e.formato}-${e.video.duracion}s-${fechaArchivo()}.mp4`
      descargar(blob, nombre)
      setUltimo({ url: URL.createObjectURL(blob), nombre })
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo grabar el video. Probá con un formato más chico.')
    }
  }

  const g = e.grabando
  const transcurrido = g ? (performance.now() - g.inicio) / 1000 : 0
  const faltan = g && g.cuadro > 5 ? (transcurrido / g.cuadro) * (g.total - g.cuadro) : null

  return (
    <>
      <button className="renderizar" onClick={grabar} disabled={!e.grabar || !!g || !listo || !soportado}>
        {g ? 'Grabando…' : `Grabar video ${f.nombre} · ${e.video.duracion} s`}
      </button>
      <p className="render__nota">
        {soportado
          ? `${Math.round(e.video.duracion * e.video.fps)} cuadros en MP4. Se graba cuadro por cuadro con el motor de tiempo real: dejá esta pestaña abierta y a la vista mientras tanto.`
          : 'Este navegador no puede grabar video. Usá Chrome, Edge o Safari actualizados.'}
      </p>
      {error && <p className="render__error">{error}</p>}
      {ultimo && (
        <div className="render__ultimo">
          <video src={ultimo.url} controls muted loop playsInline />
          <a href={ultimo.url} download={ultimo.nombre}>
            Último video · descargar de nuevo
          </a>
        </div>
      )}

      {g && (
        <div className="renderizando" role="status">
          <div className="renderizando__caja">
            <span className="renderizando__titulo">
              Grabando video {f.nombre} · {f.ancho} × {f.alto} · {e.video.fps} cps
            </span>
            <div className="renderizando__barra" aria-hidden>
              <div style={{ width: `${(g.cuadro / g.total) * 100}%` }} />
            </div>
            <span className="renderizando__detalle">
              Cuadro {g.cuadro} de {g.total}
              {faltan !== null && ` · faltan unos ${segundos(faltan)}`}
            </span>
            <button className="chip" onClick={() => e.set({ cancelarVideo: true })}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
