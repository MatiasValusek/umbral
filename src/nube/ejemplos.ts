import { useEstado, type ModeloInfo, type Vec3 } from '../estado'
import { guardarModelo } from '../modelo/almacen'
import { deJSON, limpiarHistorial, reemplazar } from '../proyecto/documento'
import { useSesion } from './cliente'

/**
 * Proyectos de ejemplo low poly, para que cualquiera pruebe la app (con o sin cuenta).
 * Los archivos están en public/ejemplos/ (los .glb se regeneran con herramientas/generar-ejemplos.mjs).
 * Abrir un ejemplo no lo copia a la cuenta: si el usuario guarda, queda como proyecto nuevo suyo.
 */
export type Ejemplo = {
  id: string
  nombre: string
  descripcion: string
  modelo: Extract<ModeloInfo, { tipo: 'propio' }>
  vista: { position: Vec3; target: Vec3 }
}

export const EJEMPLOS: Ejemplo[] = [
  {
    id: 'maqueta-low-poly',
    nombre: 'Casa con pileta',
    descripcion: 'Maqueta low poly: casa de ladrillo, galería de madera, pileta y cantero. Video: vuelta completa.',
    modelo: { tipo: 'propio', nombre: 'Maqueta low poly', unidad: 'm', bytes: 90732, triangulos: 764 },
    vista: { position: [15, 11, 17], target: [-1, 0, -2] },
  },
  {
    id: 'edificio-las-lomas',
    nombre: 'Edificio Las Lomas',
    descripcion: 'Departamentos low poly: 3 pisos con balcón, terraza con pérgola y vereda. Video: 4 tomas.',
    modelo: { tipo: 'propio', nombre: 'Edificio Las Lomas', unidad: 'm', bytes: 103960, triangulos: 526 },
    vista: { position: [25, 8, 31], target: [0, 6, 0] },
  },
]

export const miniaturaEjemplo = (e: Ejemplo) => `${import.meta.env.BASE_URL}ejemplos/${e.id}.jpg`

/** Carga un ejemplo en pantalla (modelo + escena). Queda sin proyecto de la nube asociado. */
export async function abrirEjemplo(e: Ejemplo, progreso?: (t: string) => void) {
  progreso?.('Bajando el ejemplo…')
  const base = `${import.meta.env.BASE_URL}ejemplos/${e.id}`
  const [glb, texto] = await Promise.all([
    fetch(`${base}.glb`).then((r) => {
      if (!r.ok) throw new Error('No se pudo bajar el modelo del ejemplo.')
      return r.arrayBuffer()
    }),
    fetch(`${base}.escena.json`).then((r) => {
      if (!r.ok) throw new Error('No se pudo bajar la escena del ejemplo.')
      return r.text()
    }),
  ])
  const doc = deJSON(texto)
  const bytes = new Uint8Array(glb)
  await guardarModelo(bytes).catch(() => {}) // para que sobreviva a recargar la página
  const s = useEstado.getState()
  const nAntes = s.encuadre?.n ?? 0
  if (s.modeloUrl) URL.revokeObjectURL(s.modeloUrl)
  s.set({
    modelo: e.modelo,
    modeloUrl: URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'model/gltf-binary' })),
    objetos: [],
    materiales: {},
    seleccionado: null,
    materialSel: null,
    colocando: null,
  })
  limpiarHistorial()
  reemplazar(doc)
  useSesion.setState({ actual: null, modeloSubido: null })
  // Al cargar el modelo la app lo encuadra sola; apenas pasa, se cambia por la vista del ejemplo
  const fin = setTimeout(() => dejar(), 15000)
  const dejar = useEstado.subscribe((st) => {
    if (!st.encuadre || st.encuadre.n === nAntes) return
    dejar()
    clearTimeout(fin)
    st.set({ encuadre: { ...e.vista, n: Date.now() } })
  })
}
