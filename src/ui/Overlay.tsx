import { useState, type ReactNode } from 'react'
import { tituloModelo, useEstado } from '../estado'
import { elegirModelo } from './SubirModelo'
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
  const modelo = useEstado((s) => s.modelo)
  const propio = modelo.tipo === 'propio'
  const actual = puntos.find((p) => p.id === activo)
  const par = PARES.find((p) => p.punto === activo)
  const [vista, setVista] = useState<Vista>(null)

  return (
    <>
      <div className="overlay">
        <div className="barra">
          <header className="marca">
            <span className="marca__eyebrow">{propio ? 'Tu modelo' : 'Proyecto de paisajismo'}</span>
            <h1 className="marca__titulo">{tituloModelo(modelo)}</h1>
          </header>
          {modos}
          <nav className={'acciones' + (modo !== 'vista' ? ' acciones--ocultas' : '')} aria-label="Imágenes del proyecto">
            {!propio && (
              <>
                <button className="accion" onClick={() => setVista({ tipo: 'comparador' })}>
                  Antes / Después
                </button>
                <button className="accion" onClick={() => setVista({ tipo: 'galeria' })}>
                  Renders
                </button>
              </>
            )}
            <button className="accion accion--fuerte" onClick={elegirModelo}>
              Subí tu modelo
            </button>
          </nav>
        </div>

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
