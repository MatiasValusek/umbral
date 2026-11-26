import { useState, type ReactNode } from 'react'
import { useEstado } from '../estado'
import type { Punto } from '../data/puntos'
import { PARES } from '../data/galeria'
import Comparador from './Comparador'
import Galeria from './Galeria'

type Props = {
  puntos: Punto[]
  activo: string
  onSelect: (p: Punto) => void
  modos?: ReactNode
}

type Vista = { tipo: 'comparador'; par?: string } | { tipo: 'galeria' } | null

export default function Overlay({ puntos, activo, onSelect, modos }: Props) {
  const modo = useEstado((s) => s.modo)
  const actual = puntos.find((p) => p.id === activo)
  const par = PARES.find((p) => p.punto === activo)
  const [vista, setVista] = useState<Vista>(null)

  return (
    <>
      <div className="overlay">
        <div className="barra">
          <header className="marca">
            <span className="marca__eyebrow">Proyecto de paisajismo</span>
            <h1 className="marca__titulo">Casa Jardín</h1>
          </header>
          {modos}
          <nav className={'acciones' + (modo === 'render' ? ' acciones--ocultas' : '')} aria-label="Imágenes del proyecto">
            <button className="accion" onClick={() => setVista({ tipo: 'comparador' })}>
              Antes / Después
            </button>
            <button className="accion" onClick={() => setVista({ tipo: 'galeria' })}>
              Renders
            </button>
          </nav>
        </div>

        {modo === 'edicion' && (
          <section className="panel panel--aviso">
            <h2>Modo Edición</h2>
            <p>
              Próximamente: agregar árboles, personas y mobiliario, y cambiar materiales con un click. Mientras tanto
              podés preparar la imagen en <strong>Render</strong>.
            </p>
          </section>
        )}

        {modo === 'vista' && (
        <section className="panel">
          {actual && (
            <div className="ficha" key={actual.id}>
              <h2>{actual.titulo}</h2>
              <p>{actual.descripcion}</p>
              {par && (
                <button className="ficha__enlace" onClick={() => setVista({ tipo: 'comparador', par: par.id })}>
                  Ver antes / después →
                </button>
              )}
            </div>
          )}
          <nav className="puntos" aria-label="Puntos de interés">
            {puntos.map((p, i) => (
              <button
                key={p.id}
                className={'punto' + (p.id === activo ? ' punto--activo' : '')}
                onClick={() => onSelect(p)}
              >
                <span className="punto__num">{String(i).padStart(2, '0')}</span>
                {p.titulo}
              </button>
            ))}
          </nav>
        </section>
        )}

        <p className="ayuda">Arrastrá para girar · Rueda o pellizco para acercar</p>
      </div>

      {vista?.tipo === 'comparador' && <Comparador inicial={vista.par} onClose={() => setVista(null)} />}
      {vista?.tipo === 'galeria' && <Galeria onClose={() => setVista(null)} />}
    </>
  )
}
