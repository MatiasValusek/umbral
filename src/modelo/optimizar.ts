// Convierte y optimiza un modelo 3D en el navegador. Se carga solo cuando el usuario sube un archivo.
import { WebIO, type Document, type Texture } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions'
import { dedup, flatten, instance, join, meshopt, prune, simplify, weld } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import type { Object3D } from 'three'

export const MAX_MB = 150
export const FORMATOS_ACEPTADOS = ['.glb', '.fbx', '.obj', '.dae']
const MAX_TEXTURA = 2048
const TRIANGULOS_SIMPLIFICAR = 3_000_000

export type Paso = { id: string; nombre: string; estado: 'espera' | 'activo' | 'listo' | 'omitido'; detalle?: string }
export type Informe = {
  nombre: string
  bytesOriginal: number
  bytesFinal: number
  triangulos: number
  mallas: number
  materiales: number
  texturas: number
  simplificado: boolean
  avisos: string[]
}

const PASOS: Omit<Paso, 'estado'>[] = [
  { id: 'leer', nombre: 'Leer el archivo' },
  { id: 'convertir', nombre: 'Convertir a glTF' },
  { id: 'limpiar', nombre: 'Unir y limpiar geometría' },
  { id: 'texturas', nombre: 'Achicar texturas (WebP, máx. 2048 px)' },
  { id: 'comprimir', nombre: 'Comprimir (meshopt)' },
]
export const pasosIniciales = (): Paso[] => PASOS.map((p) => ({ ...p, estado: 'espera' }))

const respirar = () => new Promise((r) => setTimeout(r, 30)) // deja repintar la interfaz entre pasos

export const extension = (nombre: string) => (nombre.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase()

/** De un objeto de three a .glb binario */
async function exportarGLB(obj: Object3D): Promise<Uint8Array> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  const r = await new GLTFExporter().parseAsync(obj, { binary: true, onlyVisible: true })
  return new Uint8Array(r as ArrayBuffer)
}

async function aGLB(archivo: File, avisos: string[]): Promise<Uint8Array> {
  const ext = extension(archivo.name)
  if (ext === '.glb') return new Uint8Array(await archivo.arrayBuffer())
  if (ext === '.fbx') {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')
    const grupo = new FBXLoader().parse(await archivo.arrayBuffer(), '')
    avisos.push('Las texturas externas del .fbx no se pueden leer: si faltan, exportá un .glb con las texturas incluidas.')
    return exportarGLB(grupo)
  }
  if (ext === '.obj') {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
    const grupo = new OBJLoader().parse(await archivo.text())
    avisos.push('El .obj llega sin materiales (el .mtl no se lee): se puede pintar en Edición → Materiales.')
    return exportarGLB(grupo)
  }
  if (ext === '.dae') {
    const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js')
    const r = new ColladaLoader().parse(await archivo.text(), '')
    if (!r?.scene) throw new Error('No se pudo leer el .dae.')
    avisos.push('Las texturas externas del .dae no se pueden leer: los materiales quedan con su color.')
    return exportarGLB(r.scene)
  }
  throw new Error(`Formato no soportado. Usá ${FORMATOS_ACEPTADOS.join(', ')}.`)
}

/** Texturas a WebP de hasta 2048 px, usando el canvas del navegador */
async function achicarTexturas(doc: Document): Promise<number> {
  const texturas = doc.getRoot().listTextures()
  let webp = 0
  for (const t of texturas) {
    const img = t.getImage()
    if (!img) continue
    try {
      const bmp = await createImageBitmap(new Blob([img as BlobPart], { type: t.getMimeType() || 'image/png' }))
      const k = Math.min(1, MAX_TEXTURA / Math.max(bmp.width, bmp.height))
      const w = Math.max(1, Math.round(bmp.width * k))
      const h = Math.max(1, Math.round(bmp.height * k))
      const cv = new OffscreenCanvas(w, h)
      cv.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
      bmp.close()
      const blob = await cv.convertToBlob({ type: 'image/webp', quality: 0.85 })
      if (blob.type !== 'image/webp') continue // el navegador no codifica WebP (Safari): se deja la original
      const nueva = new Uint8Array(await blob.arrayBuffer())
      if (nueva.byteLength < img.byteLength || k < 1) {
        setImagen(t, nueva)
        webp++
      }
    } catch {
      // imagen que el navegador no puede decodificar: se deja como está
    }
  }
  if (webp) doc.createExtension(EXTTextureWebP).setRequired(true)
  return texturas.length
}
const setImagen = (t: Texture, datos: Uint8Array) => t.setImage(datos).setMimeType('image/webp').setURI('')

function contarTriangulos(doc: Document) {
  let tris = 0
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      if (p.getMode() !== 4) continue
      const idx = p.getIndices()
      tris += (idx ? idx.getCount() : (p.getAttribute('POSITION')?.getCount() ?? 0)) / 3
    }
  return Math.round(tris)
}

/**
 * Lee un archivo del usuario y devuelve un .glb optimizado.
 * `progreso` recibe el id del paso que empieza (y 'fin').
 */
export async function optimizar(
  archivo: File,
  progreso: (paso: string, detalle?: string) => void,
): Promise<{ glb: Uint8Array; informe: Informe }> {
  if (archivo.size > MAX_MB * 1024 * 1024) throw new Error(`El archivo pesa más de ${MAX_MB} MB.`)
  const ext = extension(archivo.name)
  if (!FORMATOS_ACEPTADOS.includes(ext))
    throw new Error(
      ext === '.gltf'
        ? 'Los .gltf vienen en varios archivos: exportá un .glb (todo en uno).'
        : ext === '.skp' || ext === '.blend'
          ? `Los ${ext} todavía no se pueden abrir en el navegador: exportalo como .glb, .fbx o .dae.`
          : `Formato no soportado. Usá ${FORMATOS_ACEPTADOS.join(', ')}.`,
    )
  const avisos: string[] = []

  progreso('leer')
  await respirar()
  progreso('convertir', ext === '.glb' ? 'ya es glTF' : undefined)
  await respirar()
  const crudo = await aGLB(archivo, avisos)

  await MeshoptEncoder.ready
  await MeshoptSimplifier.ready
  const { MeshoptDecoder } = await import('meshoptimizer')
  await MeshoptDecoder.ready
  const io = new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  })
  let doc: Document
  try {
    doc = await io.readBinary(crudo)
  } catch (e) {
    const m = e instanceof Error ? e.message : ''
    throw new Error(/draco/i.test(m) ? 'El .glb usa compresión Draco: exportalo sin Draco.' : 'No se pudo leer el modelo.')
  }

  progreso('limpiar')
  await respirar()
  await doc.transform(dedup(), instance({ min: 5 }), flatten(), join(), weld(), prune())
  let triangulos = contarTriangulos(doc)
  let simplificado = false
  if (triangulos > TRIANGULOS_SIMPLIFICAR) {
    progreso('limpiar', `${(triangulos / 1e6).toFixed(1)} M de triángulos: simplificando`)
    await respirar()
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio: TRIANGULOS_SIMPLIFICAR / triangulos, error: 0.001 }),
    )
    triangulos = contarTriangulos(doc)
    simplificado = true
    avisos.push('El modelo tenía demasiados triángulos para el navegador y se simplificó un poco.')
  }

  progreso('texturas')
  await respirar()
  const cantTexturas = await achicarTexturas(doc)

  progreso('comprimir')
  await respirar()
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }), prune())
  let glb: Uint8Array = await io.writeBinary(doc)
  // Un .glb que ya venía optimizado puede no achicarse: en ese caso se usa el original
  if (ext === '.glb' && glb.byteLength >= crudo.byteLength) {
    glb = crudo
    avisos.push('El .glb ya venía optimizado: se usa tal cual.')
  }

  progreso('fin')
  const root = doc.getRoot()
  return {
    glb,
    informe: {
      nombre: archivo.name.replace(/\.[^.]+$/, ''),
      bytesOriginal: archivo.size,
      bytesFinal: glb.byteLength,
      triangulos,
      mallas: root.listMeshes().length,
      materiales: root.listMaterials().length,
      texturas: cantTexturas,
      simplificado,
      avisos,
    },
  }
}
