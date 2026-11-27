import { useEffect, useRef, useState } from 'react'
import { UNIDADES, useEstado, VIDEO_INICIAL, type Unidad } from '../estado'
import { borrarModelo, guardarModelo } from '../modelo/almacen'
import type { Informe, Paso } from '../modelo/optimizar'
import { limpiarHistorial } from '../proyecto/documento'
import { useSesion } from '../nube/cliente'

const FORMATOS = '.glb,.fbx,.obj,.dae'
const mb = (b: number) =>
  b < 1024 * 1024
    ? Math.max(1, Math.round(b / 1024)).toLocaleString('es-AR') + ' KB'
    : (b / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' MB'
const miles = (n: number) => n.toLocaleString('es-AR')

// Abre el selector de archivos desde otros componentes (menú Proyecto)
let abrirSelector = () => {}
export const elegirModelo = () => abrirSelector()

/** Vuelve a la Casa Jardín: borra el modelo propio guardado */
export async function volverAlEjemplo() {
  const s = useEstado.getState()
  if (s.modeloUrl) URL.revokeObjectURL(s.modeloUrl)
  s.set({ modelo: { tipo: 'ejemplo' }, modeloUrl: null, objetos: [], materiales: {}, video: VIDEO_INICIAL, seleccionado: null, materialSel: null })
  limpiarHistorial()
  useSesion.setState({ actual: null, modeloSubido: null })
  await borrarModelo().catch(() => {})
}

/** Adivina la unidad del archivo por el tamaño: un edificio de 3000 "metros" seguramente está en milímetros */
function adivinarUnidad(maxLado: number): Unidad {
  if (maxLado > 3000) return 'mm'
  if (maxLado > 300) return 'cm'
  return 'm'
}

type Fase =
  | { tipo: 'cerrado' }
  | { tipo: 'trabajando'; archivo: string; pasos: Paso[] }
  | { tipo: 'error'; texto: string }
  | { tipo: 'listo'; informe: Informe; unidad: Unidad; maxLado: number }

export default function SubirModelo() {
  const [fase, setFase] = useState<Fase>({ tipo: 'cerrado' })
  const [arrastrando, setArrastrando] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const modelo = useEstado((s) => s.modelo)

  useEffect(() => {
    abrirSelector = () => input.current?.click()
    // ?debug: permite procesar un File desde la consola (__procesarModelo(file))
    if (window.location.search.includes('debug'))
      (window as unknown as { __procesarModelo: unknown }).__procesarModelo = (f: File) => procesar(f)
  }, [])

  // Soltar un archivo en cualquier parte de la ventana
  useEffect(() => {
    let profundidad = 0
    const tieneArchivo = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
    const entra = (e: DragEvent) => {
      if (!tieneArchivo(e)) return
      e.preventDefault()
      profundidad++
      setArrastrando(true)
    }
    const sobre = (e: DragEvent) => tieneArchivo(e) && e.preventDefault()
    const sale = () => {
      profundidad = Math.max(0, profundidad - 1)
      if (!profundidad) setArrastrando(false)
    }
    const suelta = (e: DragEvent) => {
      if (!tieneArchivo(e)) return
      e.preventDefault()
      profundidad = 0
      setArrastrando(false)
      const f = e.dataTransfer?.files[0]
      if (f && !/\.json$/i.test(f.name)) procesar(f)
    }
    window.addEventListener('dragenter', entra)
    window.addEventListener('dragover', sobre)
    window.addEventListener('dragleave', sale)
    window.addEventListener('drop', suelta)
    return () => {
      window.removeEventListener('dragenter', entra)
      window.removeEventListener('dragover', sobre)
      window.removeEventListener('dragleave', sale)
      window.removeEventListener('drop', suelta)
    }
  }, [])

  async function procesar(f: File) {
    const { optimizar, pasosIniciales } = await import('../modelo/optimizar')
    let pasos = pasosIniciales()
    setFase({ tipo: 'trabajando', archivo: f.name, pasos })
    try {
      const { glb, informe } = await optimizar(f, (id, detalle) => {
        const i = id === 'fin' ? pasos.length : pasos.findIndex((p) => p.id === id)
        pasos = pasos.map((p, j) =>
          j < i ? { ...p, estado: 'listo' } : j === i ? { ...p, estado: 'activo', detalle: detalle ?? p.detalle } : p,
        )
        setFase({ tipo: 'trabajando', archivo: f.name, pasos })
      })
      // Tamaño en las unidades del archivo, para adivinar si está en m, cm o mm
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js')
      const { Box3, Vector3 } = await import('three')
      const gltf = await new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer, '')
      const t = new Box3().setFromObject(gltf.scene).getSize(new Vector3())
      const maxLado = Math.max(t.x, t.y, t.z)
      await guardarModelo(glb).catch(() => {
        informe.avisos.push('No se pudo guardar en el navegador: si recargás la página habrá que subirlo de nuevo.')
      })
      const unidad = adivinarUnidad(maxLado)
      usar(glb, informe, unidad)
      setFase({ tipo: 'listo', informe, unidad, maxLado })
    } catch (e) {
      setFase({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo procesar el modelo.' })
    }
  }

  function usar(glb: Uint8Array, informe: Informe, unidad: Unidad) {
    const s = useEstado.getState()
    if (s.modeloUrl) URL.revokeObjectURL(s.modeloUrl)
    const url = URL.createObjectURL(new Blob([glb as BlobPart], { type: 'model/gltf-binary' }))
    s.set({
      modelo: { tipo: 'propio', nombre: informe.nombre, unidad, bytes: informe.bytesFinal, triangulos: informe.triangulos },
      modeloUrl: url,
      objetos: [],
      materiales: {},
      video: VIDEO_INICIAL,
      seleccionado: null,
      materialSel: null,
      colocando: null,
    })
    limpiarHistorial()
    useSesion.setState({ actual: null, modeloSubido: null }) // es otro modelo: se guarda como proyecto nuevo
  }

  const cambiarUnidad = (u: Unidad) => {
    if (fase.tipo !== 'listo' || modelo.tipo !== 'propio') return
    useEstado.getState().set({ modelo: { ...modelo, unidad: u } })
    setFase({ ...fase, unidad: u })
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={FORMATOS}
        hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0]
          ev.target.value = ''
          if (f) procesar(f)
        }}
      />

      {arrastrando && (
        <div className="soltar" aria-hidden>
          <div>
            <strong>Soltá tu modelo acá</strong>
            <span>.glb, .fbx, .obj o .dae · hasta 150 MB</span>
          </div>
        </div>
      )}

      {fase.tipo !== 'cerrado' && (
        <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby="dialogo-titulo">
          <div className="dialogo__caja">
            {fase.tipo === 'trabajando' && (
              <>
                <h2 id="dialogo-titulo">Preparando tu modelo</h2>
                <p className="dialogo__sub">{fase.archivo}</p>
                <ol className="pasos">
                  {fase.pasos.map((p) => (
                    <li key={p.id} className={'paso paso--' + p.estado}>
                      <span className="paso__marca" aria-hidden />
                      <span>
                        {p.nombre}
                        {p.detalle && <small> · {p.detalle}</small>}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="dialogo__nota">Todo pasa en tu compu: el archivo no se sube a ningún servidor.</p>
              </>
            )}

            {fase.tipo === 'error' && (
              <>
                <h2 id="dialogo-titulo">No se pudo abrir el modelo</h2>
                <p className="dialogo__error">{fase.texto}</p>
                <div className="dialogo__acciones">
                  <button className="chip" onClick={() => setFase({ tipo: 'cerrado' })}>
                    Cerrar
                  </button>
                  <button className="renderizar" onClick={() => input.current?.click()}>
                    Elegir otro archivo
                  </button>
                </div>
              </>
            )}

            {fase.tipo === 'listo' && (
              <>
                <h2 id="dialogo-titulo">{fase.informe.nombre}</h2>
                <dl className="informe">
                  <div>
                    <dt>Peso</dt>
                    <dd>
                      {mb(fase.informe.bytesOriginal)} → <strong>{mb(fase.informe.bytesFinal)}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Triángulos</dt>
                    <dd>{miles(fase.informe.triangulos)}</dd>
                  </div>
                  <div>
                    <dt>Materiales</dt>
                    <dd>{fase.informe.materiales}</dd>
                  </div>
                  <div>
                    <dt>Texturas</dt>
                    <dd>{fase.informe.texturas}</dd>
                  </div>
                </dl>
                {fase.informe.bytesFinal > 20 * 1024 * 1024 && (
                  <p className="dialogo__error">
                    Quedó pesado (más de 20 MB): puede andar lento en compus modestas o en el celular.
                  </p>
                )}
                {fase.informe.avisos.map((a) => (
                  <p key={a} className="dialogo__nota">
                    {a}
                  </p>
                ))}
                <label className="unidad">
                  <span>
                    <strong>Unidades del archivo</strong>
                    <small>
                      Con esta unidad mide{' '}
                      {(fase.maxLado * UNIDADES[fase.unidad].factor).toLocaleString('es-AR', {
                        maximumFractionDigits: 1,
                      })}{' '}
                      m en su lado más largo.
                    </small>
                  </span>
                  <select value={fase.unidad} onChange={(e) => cambiarUnidad(e.target.value as Unidad)}>
                    {(Object.keys(UNIDADES) as Unidad[]).map((u) => (
                      <option key={u} value={u}>
                        {UNIDADES[u].nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="dialogo__acciones">
                  <button className="renderizar" onClick={() => setFase({ tipo: 'cerrado' })}>
                    Listo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
