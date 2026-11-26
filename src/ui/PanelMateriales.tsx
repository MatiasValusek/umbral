import { useMemo } from 'react'
import { useEstado } from '../estado'
import { miniatura, TEXTURAS, type TexturaId } from '../materiales/texturas'

export const nombreLindo = (n: string) =>
  n
    .replace(/^_+|_+$/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || n

/** Lista de materiales del modelo (izquierda) */
export function ListaMateriales() {
  const lista = useEstado((s) => s.listaMateriales)
  const sel = useEstado((s) => s.materialSel)
  const ajustes = useEstado((s) => s.materiales)
  const set = useEstado((s) => s.set)
  return (
    <>
      <p className="render__nota">
        Hacé click en una superficie de la escena (pasto, piso, muro…) o elegila de la lista.
      </p>
      <ul className="materiales" aria-label="Materiales del modelo">
        {lista.map((m) => {
          const a = ajustes[m.nombre]
          const tex = a?.textura as TexturaId | undefined
          return (
            <li key={m.nombre}>
              <button
                className={'material' + (sel === m.nombre ? ' material--activo' : '')}
                onClick={() => set({ materialSel: sel === m.nombre ? null : m.nombre })}
              >
                <span
                  className="material__muestra"
                  style={
                    tex
                      ? { backgroundImage: `url(${miniatura(tex)})`, backgroundSize: 'cover' }
                      : { background: a?.color ?? m.color }
                  }
                />
                <span className="material__nombre">{nombreLindo(m.nombre)}</span>
                {a && <span className="material__marca" title="Modificado" />}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** Editor del material elegido (derecha) */
export function EditorMaterial() {
  const nombre = useEstado((s) => s.materialSel)!
  const a = useEstado((s) => s.materiales[nombre]) ?? {}
  const base = useEstado((s) => s.listaMateriales.find((m) => m.nombre === nombre))
  const { ajustarMaterial, restaurarMaterial, set } = useEstado()
  const tex = (a.textura ?? undefined) as TexturaId | undefined
  const ids = useMemo(() => Object.keys(TEXTURAS) as TexturaId[], [])
  const escala = a.escala ?? (tex ? TEXTURAS[tex].metros : 1)
  const rug = a.rugosidad ?? (tex ? TEXTURAS[tex].rugosidad : 0.9)
  const colorActual = a.color ?? (tex ? '#ffffff' : base?.color ?? '#ffffff')

  return (
    <aside className="propiedades propiedades--material" aria-label="Material seleccionado">
      <div className="propiedades__cabeza">
        <h2 className="render__titulo">{nombreLindo(nombre)}</h2>
        <button className="cerrar" aria-label="Cerrar" onClick={() => set({ materialSel: null })}>
          ×
        </button>
      </div>

      <section className="render__grupo">
        <h3>Textura</h3>
        <div className="texturas">
          <button
            className={'textura' + (!tex ? ' textura--activa' : '')}
            onClick={() => ajustarMaterial(nombre, { textura: undefined, escala: undefined, rugosidad: undefined, color: undefined })}
          >
            <span className="textura__muestra textura__muestra--original" style={{ background: base?.color }} />
            <span>Original</span>
          </button>
          {ids.map((id) => (
            <button
              key={id}
              className={'textura' + (tex === id ? ' textura--activa' : '')}
              onClick={() =>
                ajustarMaterial(nombre, { textura: id, escala: undefined, rugosidad: undefined, color: undefined })
              }
            >
              <img className="textura__muestra" src={miniatura(id)} alt="" />
              <span>{TEXTURAS[id].nombre}</span>
            </button>
          ))}
        </div>
      </section>

      <label className="color">
        <h3>{tex ? 'Tinte' : 'Color'}</h3>
        <input type="color" value={colorActual} onChange={(ev) => ajustarMaterial(nombre, { color: ev.target.value })} />
      </label>

      {tex && (
        <>
          <label className="deslizador">
            <span className="deslizador__fila">
              <h3>Tamaño de la textura</h3>
              <output>{escala.toFixed(2)} m</output>
            </span>
            <input
              type="range"
              min={0.2}
              max={6}
              step={0.05}
              value={escala}
              onChange={(ev) => ajustarMaterial(nombre, { escala: +ev.target.value })}
            />
          </label>
          <label className="deslizador">
            <span className="deslizador__fila">
              <h3>Rotación</h3>
              <output>{a.rotacion ?? 0}°</output>
            </span>
            <input
              type="range"
              min={0}
              max={180}
              step={5}
              value={a.rotacion ?? 0}
              onChange={(ev) => ajustarMaterial(nombre, { rotacion: +ev.target.value })}
            />
          </label>
        </>
      )}

      <label className="deslizador">
        <span className="deslizador__fila">
          <h3>Rugosidad</h3>
          <output>{rug.toFixed(2)}</output>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={rug}
          onChange={(ev) => ajustarMaterial(nombre, { rugosidad: +ev.target.value })}
        />
      </label>
      <label className="deslizador">
        <span className="deslizador__fila">
          <h3>Metalicidad</h3>
          <output>{(a.metalicidad ?? 0).toFixed(2)}</output>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={a.metalicidad ?? 0}
          onChange={(ev) => ajustarMaterial(nombre, { metalicidad: +ev.target.value })}
        />
      </label>

      <button className="chip" disabled={Object.keys(a).length === 0} onClick={() => restaurarMaterial(nombre)}>
        Restaurar original
      </button>
    </aside>
  )
}
