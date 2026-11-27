import { slugModelo, useEstado, VIDEO_INICIAL, type ModeloInfo } from '../estado'
import { guardarModelo, leerModelo } from '../modelo/almacen'
import { aJSON, deJSON, limpiarHistorial, reemplazar } from '../proyecto/documento'
import { BUCKET, LIMITE_ARCHIVO, supabase, traducir, useSesion } from './cliente'

export type ProyectoNube = {
  id: string
  nombre: string
  modelo: ModeloInfo
  tiene_modelo: boolean
  tiene_miniatura: boolean
  actualizado: string
  miniatura?: string // URL firmada (se completa al listar)
}

const mb = (b: number) => (b / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' MB'

function cliente() {
  const u = useSesion.getState().usuario
  if (!supabase || !u) throw new Error('Entrá con tu mail para usar la nube.')
  return { sb: supabase, uid: u.id }
}

const ruta = (uid: string, id: string, archivo: string) => `${uid}/${id}/${archivo}`

async function subir(path: string, cuerpo: Blob, tipo: string) {
  const { sb } = cliente()
  const { error } = await sb.storage.from(BUCKET).upload(path, cuerpo, { upsert: true, contentType: tipo, cacheControl: '60' })
  if (error) throw new Error(traducir(error.message))
}

/** Miniatura de la vista actual (solo con el motor de tiempo real: el de Foto tardaría demasiado) */
async function miniatura(): Promise<Blob | null> {
  const s = useEstado.getState()
  if (!s.capturar || s.motor !== 'tiempoReal' || s.renderizando || s.grabando) return null
  try {
    return await s.capturar(480, 270, 'jpg')
  } catch {
    return null
  }
}

/**
 * Guarda la escena actual en la nube. Sin `nombre` pisa el proyecto abierto; con `nombre` crea uno nuevo.
 * El modelo propio (si hay) se sube solo la primera vez o cuando cambió.
 */
export async function guardarEnNube(nombre?: string, progreso?: (texto: string) => void) {
  const { sb, uid } = cliente()
  const s = useEstado.getState()
  const sesion = useSesion.getState()
  const nuevo = !!nombre || !sesion.actual
  const titulo = (nombre ?? sesion.actual?.nombre ?? '').trim().slice(0, 120)
  if (!titulo) throw new Error('Poné un nombre para el proyecto.')

  const { texto } = aJSON(slugModelo(s.modelo))
  const escena = JSON.parse(texto)
  const propio = s.modelo.tipo === 'propio'

  // 1. La fila (así tenemos el id para las carpetas del almacenamiento)
  let id = nuevo ? '' : sesion.actual!.id
  progreso?.('Guardando la escena…')
  if (nuevo) {
    const { data, error } = await sb
      .from('proyectos')
      .insert({ nombre: titulo, modelo: s.modelo, escena })
      .select('id')
      .single()
    if (error) throw new Error(traducir(error.message))
    id = data.id
  } else {
    const { error } = await sb.from('proyectos').update({ nombre: titulo, modelo: s.modelo, escena }).eq('id', id)
    if (error) throw new Error(traducir(error.message))
  }

  // 2. El modelo propio
  let tieneModelo: boolean | undefined
  if (!propio) tieneModelo = false
  else if (nuevo || sesion.modeloSubido !== s.modeloUrl) {
    const glb = await leerModelo().catch(() => undefined)
    if (!glb) throw new Error('No se encontró el modelo en este navegador: volvé a subirlo y guardá de nuevo.')
    if (glb.size > LIMITE_ARCHIVO)
      throw new Error(`El modelo pesa ${mb(glb.size)} y la nube guarda hasta ${mb(LIMITE_ARCHIVO)} por modelo. La escena quedó guardada sin el modelo.`)
    progreso?.(`Subiendo el modelo (${mb(glb.size)})…`)
    await subir(ruta(uid, id, 'modelo.glb'), glb, 'model/gltf-binary')
    tieneModelo = true
  }

  // 3. La miniatura
  progreso?.('Guardando la miniatura…')
  const mini = await miniatura()
  if (mini) await subir(ruta(uid, id, 'miniatura.jpg'), mini, 'image/jpeg').catch(() => {})

  const cambios: Record<string, boolean> = {}
  if (tieneModelo !== undefined) cambios.tiene_modelo = tieneModelo
  if (mini) cambios.tiene_miniatura = true
  if (Object.keys(cambios).length) await sb.from('proyectos').update(cambios).eq('id', id)

  useSesion.setState({ actual: { id, nombre: titulo }, modeloSubido: propio ? s.modeloUrl : null })
  return { id, nombre: titulo }
}

export async function listarProyectos(): Promise<ProyectoNube[]> {
  const { sb, uid } = cliente()
  const { data, error } = await sb
    .from('proyectos')
    .select('id, nombre, modelo, tiene_modelo, tiene_miniatura, actualizado')
    .order('actualizado', { ascending: false })
    .limit(200)
  if (error) throw new Error(traducir(error.message))
  const lista = (data ?? []) as ProyectoNube[]
  const conMini = lista.filter((p) => p.tiene_miniatura)
  if (conMini.length) {
    const { data: firmadas } = await sb.storage
      .from(BUCKET)
      .createSignedUrls(conMini.map((p) => ruta(uid, p.id, 'miniatura.jpg')), 3600)
    firmadas?.forEach((f, i) => {
      if (f.signedUrl) conMini[i].miniatura = f.signedUrl
    })
  }
  return lista
}

/** Abre un proyecto de la nube: baja el modelo (si es propio) y aplica la escena */
export async function abrirDeNube(id: string, progreso?: (texto: string) => void) {
  const { sb, uid } = cliente()
  progreso?.('Abriendo el proyecto…')
  const { data, error } = await sb.from('proyectos').select('id, nombre, modelo, escena, tiene_modelo').eq('id', id).single()
  if (error) throw new Error(traducir(error.message))
  const doc = deJSON(JSON.stringify(data.escena))
  const modelo = data.modelo as ModeloInfo
  const s = useEstado.getState()
  const limpio = { objetos: [], materiales: {}, video: VIDEO_INICIAL, seleccionado: null, materialSel: null, colocando: null }

  let modeloUrl: string | null = null
  if (modelo.tipo === 'propio') {
    if (!data.tiene_modelo) throw new Error('Este proyecto no tiene el modelo 3D guardado en la nube.')
    progreso?.('Bajando el modelo…')
    const { data: blob, error: e2 } = await sb.storage.from(BUCKET).download(ruta(uid, id, 'modelo.glb'))
    if (e2 || !blob) throw new Error('No se pudo bajar el modelo del proyecto.')
    const glb = new Uint8Array(await blob.arrayBuffer())
    await guardarModelo(glb).catch(() => {}) // para que sobreviva a recargar la página
    modeloUrl = URL.createObjectURL(new Blob([glb as BlobPart], { type: 'model/gltf-binary' }))
  }

  const mismoModelo =
    modelo.tipo === s.modelo.tipo && (modelo.tipo === 'ejemplo' || slugModelo(modelo) === slugModelo(s.modelo))
  if (modelo.tipo === 'propio' || !mismoModelo) {
    if (s.modeloUrl) URL.revokeObjectURL(s.modeloUrl)
    s.set({ modelo, modeloUrl, ...limpio })
    limpiarHistorial()
  }
  reemplazar(doc)
  useSesion.setState({ actual: { id, nombre: data.nombre }, modeloSubido: modeloUrl })
  return data.nombre as string
}

export async function renombrarProyecto(id: string, nombre: string) {
  const { sb } = cliente()
  const limpio = nombre.trim().slice(0, 120)
  if (!limpio) return
  const { error } = await sb.from('proyectos').update({ nombre: limpio }).eq('id', id)
  if (error) throw new Error(traducir(error.message))
  const a = useSesion.getState().actual
  if (a?.id === id) useSesion.setState({ actual: { id, nombre: limpio } })
}

export async function borrarProyecto(id: string) {
  const { sb, uid } = cliente()
  await sb.storage.from(BUCKET).remove([ruta(uid, id, 'modelo.glb'), ruta(uid, id, 'miniatura.jpg')])
  const { error } = await sb.from('proyectos').delete().eq('id', id)
  if (error) throw new Error(traducir(error.message))
  if (useSesion.getState().actual?.id === id) useSesion.setState({ actual: null, modeloSubido: null })
}
