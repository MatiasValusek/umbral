import { useEffect, useState } from 'react'
import type { Punto } from '../data/puntos'
import {
  CALIDADES_FOTO,
  CIELOS,
  FORMATOS,
  formatoHora,
  posicionSol,
  slugModelo,
  useEstado,
  type Archivo,
  type CalidadFoto,
  type CieloId,
  type FormatoId,
} from '../estado'

type Props = { puntos: Punto[]; activo: string; onSelect: (p: Punto) => void }

const fechaArchivo = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// Marco del formato elegido sobre el visor: lo que queda adentro es lo que sale en la imagen
function Marco({ aspecto }: { aspecto: number }) {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const r = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])
  const h = Math.min(vp.h, vp.w / aspecto)
  const w = h * aspecto
  return <div className="marco" style={{ width: w, height: h }} aria-hidden />
}

export default function PanelRender({ puntos, activo, onSelect }: Props) {
  const e = useEstado()
  const [ultimo, setUltimo] = useState<{ url: string; nombre: string } | null>(null)
  const [error, setError] = useState('')
  const f = FORMATOS[e.formato]
  const { elevacion } = posicionSol(e.hora, e.orientacion)

  const renderizar = async () => {
    if (!e.capturar || e.renderizando) return
    setError('')
    e.set({ renderizando: true })
    // dejar que se pinte el aviso antes de bloquear la GPU
    await new Promise((r) => setTimeout(r, 60))
    try {
      const blob = await e.capturar(f.ancho, f.alto, e.archivo)
      if (!blob) throw new Error('vacío')
      const nombre = `umbral-${slugModelo(e.modelo)}-${e.formato}-${fechaArchivo()}.${e.archivo}`
      descargar(blob, nombre)
      if (ultimo) URL.revokeObjectURL(ultimo.url)
      setUltimo({ url: URL.createObjectURL(blob), nombre })
    } catch {
      setError('No se pudo generar la imagen. Probá con un formato más chico.')
    } finally {
      e.set({ renderizando: false })
    }
  }

  return (
    <>
      <Marco aspecto={f.ancho / f.alto} />

      <aside className="render" aria-label="Opciones de render">
        <h2 className="render__titulo">Render</h2>

        <section className="render__grupo">
          <h3>Motor</h3>
          <div className="pestanas" role="tablist" aria-label="Motor de render">
            <button
              role="tab"
              aria-selected={e.motor === 'tiempoReal'}
              className={'pestana' + (e.motor === 'tiempoReal' ? ' pestana--activa' : '')}
              onClick={() => e.set({ motor: 'tiempoReal' })}
            >
              Tiempo real
            </button>
            <button
              role="tab"
              aria-selected={e.motor === 'foto'}
              className={'pestana' + (e.motor === 'foto' ? ' pestana--activa' : '')}
              onClick={() => e.set({ motor: 'foto' })}
            >
              Foto
            </button>
          </div>
          {e.motor === 'foto' && (
            <p className="render__nota render__estado">
              {e.foto.fase === 'preparando'
                ? `Preparando la escena… ${Math.round(e.foto.progreso * 100)}%`
                : e.foto.fase === 'listo'
                  ? `Path tracing: ${e.foto.muestras} muestras. La imagen se afina sola mientras no muevas la cámara.`
                  : 'Cargando el motor…'}
            </p>
          )}
        </section>

        <section className="render__grupo">
          <h3>Cámara</h3>
          <div className="chips">
            {puntos.map((p) => (
              <button
                key={p.id}
                className={'chip' + (p.id === activo ? ' chip--activo' : '')}
                onClick={() => onSelect(p)}
              >
                {p.titulo}
              </button>
            ))}
          </div>
          <p className="render__nota">O mové la cámara libremente en el visor.</p>
        </section>

        <section className="render__grupo">
          <h3>Cielo</h3>
          <div className="chips">
            {(Object.keys(CIELOS) as CieloId[]).map((id) => (
              <button
                key={id}
                className={'chip' + (e.cielo === id ? ' chip--activo' : '')}
                onClick={() => e.elegirCielo(id)}
              >
                {CIELOS[id].nombre}
              </button>
            ))}
          </div>
        </section>

        <section className="render__grupo">
          <label className="deslizador">
            <span className="deslizador__fila">
              <h3>Hora del día</h3>
              <output>
                {formatoHora(e.hora)}
                {elevacion < 4 ? ' · sol bajo' : ''}
              </output>
            </span>
            <input
              type="range"
              min={6}
              max={20.5}
              step={0.25}
              value={e.hora}
              onChange={(ev) => e.set({ hora: +ev.target.value })}
            />
          </label>
          <label className="deslizador">
            <span className="deslizador__fila">
              <h3>Orientación del norte</h3>
              <output>{e.orientacion}°</output>
            </span>
            <input
              type="range"
              min={0}
              max={355}
              step={5}
              value={e.orientacion}
              onChange={(ev) => e.set({ orientacion: +ev.target.value })}
            />
          </label>
          <label className="deslizador">
            <span className="deslizador__fila">
              <h3>Exposición</h3>
              <output>{e.exposicion.toFixed(2)}</output>
            </span>
            <input
              type="range"
              min={0.4}
              max={1.8}
              step={0.05}
              value={e.exposicion}
              onChange={(ev) => e.set({ exposicion: +ev.target.value })}
            />
          </label>
        </section>

        {e.motor === 'tiempoReal' ? (
        <section className="render__grupo">
          <h3>Calidad</h3>
          <div className="interruptores">
            {(
              [
                ['sombrasSuaves', 'Sombras suaves'],
                ['oclusion', 'Oclusión ambiental'],
                ['brillo', 'Brillo suave'],
                ['vineta', 'Viñeta'],
              ] as const
            ).map(([clave, nombre]) => (
              <label key={clave} className="interruptor">
                <input type="checkbox" checked={e[clave]} onChange={(ev) => e.set({ [clave]: ev.target.checked })} />
                <span>{nombre}</span>
              </label>
            ))}
          </div>
        </section>
        ) : (
          <section className="render__grupo">
            <h3>Calidad de la foto</h3>
            <div className="chips">
              {(Object.keys(CALIDADES_FOTO) as CalidadFoto[]).map((q) => (
                <button
                  key={q}
                  className={'chip' + (e.calidadFoto === q ? ' chip--activo' : '')}
                  onClick={() => e.set({ calidadFoto: q })}
                >
                  {CALIDADES_FOTO[q].nombre} · {CALIDADES_FOTO[q].muestras}
                </button>
              ))}
            </div>
            <p className="render__nota">
              Más muestras = menos granulado, pero tarda más (sobre todo en 4K). Podés cortar antes y guardar lo que haya.
            </p>
          </section>
        )}

        <section className="render__grupo">
          <h3>Formato</h3>
          <div className="formatos">
            {(Object.keys(FORMATOS) as FormatoId[]).map((id) => (
              <button
                key={id}
                className={'formato' + (e.formato === id ? ' formato--activo' : '')}
                onClick={() => e.set({ formato: id })}
              >
                <strong>{FORMATOS[id].nombre}</strong>
                <span>{FORMATOS[id].detalle}</span>
              </button>
            ))}
          </div>
          <div className="chips chips--archivo">
            {(['png', 'jpg'] as Archivo[]).map((a) => (
              <button
                key={a}
                className={'chip' + (e.archivo === a ? ' chip--activo' : '')}
                onClick={() => e.set({ archivo: a })}
              >
                {a.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        <button
          className="renderizar"
          onClick={renderizar}
          disabled={!e.capturar || e.renderizando || (e.motor === 'foto' && e.foto.fase !== 'listo')}
        >
          {e.renderizando ? 'Renderizando…' : `Renderizar ${f.nombre}`}
        </button>
        {error && <p className="render__error">{error}</p>}
        {ultimo && (
          <a className="render__ultimo" href={ultimo.url} download={ultimo.nombre}>
            <img src={ultimo.url} alt="Último render" />
            <span>Último render · descargar de nuevo</span>
          </a>
        )}
      </aside>

      {e.renderizando && (
        <div className="renderizando" role="status">
          <div className="renderizando__caja">
            <span className="renderizando__titulo">
              Renderizando {f.nombre} · {f.ancho} × {f.alto}
            </span>
            {e.motor === 'foto' && (
              <>
                <div className="renderizando__barra" aria-hidden>
                  <div style={{ width: `${Math.min(100, (e.muestrasRender / CALIDADES_FOTO[e.calidadFoto].muestras) * 100)}%` }} />
                </div>
                <span className="renderizando__detalle">
                  {e.muestrasRender} de {CALIDADES_FOTO[e.calidadFoto].muestras} muestras
                </span>
                <button className="chip" onClick={() => e.set({ terminarYa: true })}>
                  Terminar ahora y guardar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
