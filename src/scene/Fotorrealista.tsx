import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  type InstancedMesh,
  type Scene,
  type Texture,
} from 'three'
import { MeshoptSimplifier } from 'meshoptimizer'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/worker'
import { useEstado } from '../estado'

// Triángulos máximos que pueden sumar las instancias (plantas repetidas) al convertirlas para el path tracer
const MAX_TRIS_INSTANCIAS = 400_000

const triangulos = (g: BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3

// El path tracer no entiende atributos cuantizados (KHR_mesh_quantization: enteros normalizados) ni
// intercalados: se convierten a Float32 comunes en una copia de la geometría (cacheada).
const ATRIBUTOS = ['position', 'normal', 'uv', 'uv1', 'tangent', 'color']
const decuantizadas = new Map<string, BufferGeometry>()
function decuantizar(geo: BufferGeometry): BufferGeometry {
  const necesita = ATRIBUTOS.some((n) => {
    const a = geo.getAttribute(n)
    return a && (a.normalized || !(a.array instanceof Float32Array) || 'isInterleavedBufferAttribute' in a)
  })
  if (!necesita) return geo
  const hecha = decuantizadas.get(geo.uuid)
  if (hecha) return hecha
  const g = new BufferGeometry()
  g.setIndex(geo.index)
  for (const [nombre, a] of Object.entries(geo.attributes)) {
    if (!ATRIBUTOS.includes(nombre)) continue
    const out = new Float32Array(a.count * a.itemSize)
    for (let i = 0; i < a.count; i++) {
      out[i * a.itemSize] = a.getX(i)
      if (a.itemSize > 1) out[i * a.itemSize + 1] = a.getY(i)
      if (a.itemSize > 2) out[i * a.itemSize + 2] = a.getZ(i)
      if (a.itemSize > 3) out[i * a.itemSize + 3] = a.getW(i)
    }
    g.setAttribute(nombre, new BufferAttribute(out, a.itemSize))
  }
  for (const grupo of geo.groups) g.addGroup(grupo.start, grupo.count, grupo.materialIndex)
  decuantizadas.set(geo.uuid, g)
  return g
}

// Versión simplificada de una geometría (solo para el path tracer; se cachea)
const simplificadas = new Map<string, BufferGeometry>()
function simplificar(geo: BufferGeometry, ratio: number): BufferGeometry {
  if (ratio >= 0.95 || !MeshoptSimplifier.supported) return geo
  const clave = `${geo.uuid}-${ratio.toFixed(3)}`
  const hecha = simplificadas.get(clave)
  if (hecha) return hecha
  const p = geo.attributes.position
  const pos = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    pos[i * 3] = p.getX(i)
    pos[i * 3 + 1] = p.getY(i)
    pos[i * 3 + 2] = p.getZ(i)
  }
  const idx = geo.index ? Uint32Array.from(geo.index.array as ArrayLike<number>) : Uint32Array.from({ length: p.count }, (_, i) => i)
  const objetivo = Math.max(36, Math.floor((idx.length * ratio) / 3) * 3)
  const [nuevo] = MeshoptSimplifier.simplify(idx, pos, 3, objetivo, 0.08, ['Prune'])
  const g = new BufferGeometry()
  for (const [nombre, attr] of Object.entries(geo.attributes)) g.setAttribute(nombre, attr)
  g.setIndex(new BufferAttribute(nuevo, 1))
  simplificadas.set(clave, g)
  return g
}

// La cámara puede moverse una fracción ínfima al terminar de frenar: eso no debe reiniciar la imagen
const parecidas = (a: Matrix4, b: Matrix4) => a.elements.every((v, i) => Math.abs(v - b.elements[i]) < 1e-5)

// Nombres de objetos que el path tracer no entiende o no debe ver
const OCULTAR = ['cielo', 'sombras-contacto']

/**
 * Prepara la escena para el path tracer y devuelve cómo dejarla como estaba:
 * - las instancias (plantas repetidas) se convierten en mallas comunes, porque el path tracer no las soporta
 * - el cielo procedural y las sombras de contacto se ocultan
 * - el fondo pasa a ser el HDRI del entorno
 */
function prepararEscena(scene: Scene) {
  const deshacer: (() => void)[] = []
  const extra = new Group()
  extra.name = 'pt-instancias'
  const m = new Matrix4()

  scene.updateMatrixWorld(true)
  const instancias: InstancedMesh[] = []
  scene.traverse((o) => {
    if ((o as InstancedMesh).isInstancedMesh && o.visible) instancias.push(o as InstancedMesh)
    else if ((o as Mesh).isMesh) {
      const malla = o as Mesh
      const original = malla.geometry
      const nueva = decuantizar(original)
      if (nueva !== original) {
        malla.geometry = nueva
        deshacer.push(() => (malla.geometry = original))
      }
    }
    if (OCULTAR.includes(o.name) && o.visible) {
      o.visible = false
      deshacer.push(() => (o.visible = true))
    }
  })
  // Si las instancias suman demasiados triángulos, se simplifican (las plantas no necesitan tanto detalle)
  const total = instancias.reduce((t, im) => t + triangulos(im.geometry) * im.count, 0)
  const ratio = Math.max(0.03, Math.min(1, MAX_TRIS_INSTANCIAS / Math.max(1, total)))
  for (const im of instancias) {
    const geo = simplificar(decuantizar(im.geometry), ratio)
    for (let i = 0; i < im.count; i++) {
      im.getMatrixAt(i, m)
      const copia = new Mesh(geo, im.material)
      copia.matrixAutoUpdate = false
      copia.matrix.multiplyMatrices(im.matrixWorld, m)
      copia.matrixWorld.copy(copia.matrix)
      extra.add(copia)
    }
    im.visible = false
    deshacer.push(() => (im.visible = true))
  }
  scene.add(extra)
  deshacer.push(() => scene.remove(extra))

  const fondo = scene.background
  const env = scene.environment as Texture | null
  if (env) {
    scene.background = env
    scene.backgroundIntensity = scene.environmentIntensity
    scene.backgroundRotation.copy(scene.environmentRotation)
    scene.backgroundBlurriness = 0
  }
  deshacer.push(() => {
    // solo si nadie cambió el fondo mientras tanto
    if (scene.background === env) scene.background = fondo
    scene.backgroundIntensity = 1
  })
  return () => deshacer.reverse().forEach((f) => f())
}

/**
 * Motor "Foto": reemplaza el render en tiempo real por path tracing progresivo.
 * Mientras está montado, R3F no dibuja (useFrame con prioridad 1) y el path tracer acumula muestras.
 */
export default function Fotorrealista() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const set = useEstado((s) => s.set)
  const tracer = useRef<WebGLPathTracer | null>(null)
  const listo = useRef(false)
  const ultimaCam = useRef(new Matrix4())
  const ultimaProj = useRef(new Matrix4())
  const ultimoInforme = useRef(0)

  // Crear y destruir el path tracer
  useEffect(() => {
    const pt = new WebGLPathTracer(gl)
    // Vista previa liviana: media resolución y en mosaicos de 3×3 para no trabar la página.
    // El render final usa resolución completa (ver esperarMuestras).
    pt.tiles.set(3, 3)
    pt.renderScale = 0.5
    pt.bounces = 6
    pt.transmissiveBounces = 8
    pt.filterGlossyFactor = 0.5
    pt.minSamples = 2
    pt.renderDelay = 60
    pt.fadeDuration = 250
    pt.dynamicLowRes = true
    pt.lowResScale = 0.25
    // El árbol de aceleración (BVH) se arma en otro hilo para no congelar la página
    let worker: GenerateMeshBVHWorker | null = null
    try {
      worker = new GenerateMeshBVHWorker()
      pt.setBVHWorker(worker)
    } catch {
      worker = null
    }
    tracer.current = pt
    if (window.location.search.includes('debug')) (window as unknown as { __pt: unknown }).__pt = pt
    return () => {
      worker?.dispose()
      pt.dispose()
      tracer.current = null
      listo.current = false
      useEstado.getState().set({ foto: { fase: 'apagado', progreso: 0, muestras: 0 }, esperarMuestras: null })
    }
  }, [gl])

  // (Re)armar la escena del path tracer: al entrar y cada vez que cambia la luz, los objetos o los materiales
  useEffect(() => {
    let cancelado = false
    let restaurar: (() => void) | null = null

    const armar = async () => {
      const pt = tracer.current
      if (!pt || cancelado) return
      listo.current = false
      set({ foto: { fase: 'preparando', progreso: 0, muestras: 0 } })
      // esperar un par de cuadros para que React aplique luz/materiales/objetos nuevos
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (cancelado) return
      await MeshoptSimplifier.ready
      if (cancelado) return
      restaurar?.()
      restaurar = prepararEscena(scene)
      try {
        await pt.setSceneAsync(scene, camera, {
          onProgress: (p) => set({ foto: { fase: 'preparando', progreso: p, muestras: 0 } }),
        })
      } catch {
        // sin worker disponible: se arma en el hilo principal (la página se frena unos segundos)
        if (cancelado) return
        pt.setScene(scene, camera)
      }
      if (cancelado) return
      listo.current = true
      set({ foto: { fase: 'listo', progreso: 1, muestras: 0 } })
    }

    // Cambios que obligan a rearmar (con una pequeña espera para agrupar deslizadores)
    let espera: ReturnType<typeof setTimeout>
    const pedir = () => {
      clearTimeout(espera)
      espera = setTimeout(armar, 350)
    }
    armar()
    const desuscribir = useEstado.subscribe((s, prev) => {
      if (
        s.objetos !== prev.objetos ||
        s.materiales !== prev.materiales ||
        s.cielo !== prev.cielo ||
        s.hora !== prev.hora ||
        s.orientacion !== prev.orientacion ||
        s.exposicion !== prev.exposicion ||
        s.modeloUrl !== prev.modeloUrl
      )
        pedir()
    })
    return () => {
      cancelado = true
      clearTimeout(espera)
      desuscribir()
      restaurar?.()
    }
  }, [scene, camera, set])

  // Función para el render final: espera n muestras o hasta que el usuario corte
  useEffect(() => {
    set({
      esperarMuestras: (n, progreso) =>
        new Promise<void>((ok) => {
          const pt = tracer.current
          if (!pt) return ok()
          const fade = pt.fadeDuration
          const escala = pt.renderScale
          pt.fadeDuration = 0
          pt.dynamicLowRes = false
          pt.renderScale = 1
          // Mosaicos según el tamaño final: ~250 mil píxeles por cuadro
          const px = gl.domElement.width * gl.domElement.height
          const t = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(px / 250_000))))
          pt.tiles.set(t, t)
          pt.updateCamera()
          const mirar = () => {
            const s = useEstado.getState()
            progreso(Math.floor(pt.samples))
            if ((listo.current && pt.samples >= n) || s.terminarYa) {
              pt.fadeDuration = fade
              pt.dynamicLowRes = true
              pt.renderScale = escala
              pt.tiles.set(3, 3)
              pt.updateCamera()
              ok()
            } else requestAnimationFrame(mirar)
          }
          requestAnimationFrame(mirar)
        }),
    })
  }, [set])

  const lentos = useRef(0)
  useFrame((_, delta) => {
    const pt = tracer.current
    if (!pt || !listo.current) {
      gl.render(scene, camera) // mientras se prepara, se ve la imagen en tiempo real
      return
    }
    // Si la cámara se movió, se reinicia la acumulación
    camera.updateMatrixWorld()
    if (!parecidas(ultimaCam.current, camera.matrixWorld) || !parecidas(ultimaProj.current, camera.projectionMatrix)) {
      ultimaCam.current.copy(camera.matrixWorld)
      ultimaProj.current.copy(camera.projectionMatrix)
      pt.updateCamera()
    }
    pt.renderSample()
    // Si la compu va lenta, se reparte el trabajo en más mosaicos para que la página siga respondiendo
    if (delta > 0.15) {
      if (++lentos.current > 3 && pt.tiles.x < 8) {
        pt.tiles.addScalar(1)
        lentos.current = 0
      }
    } else lentos.current = 0
    const ahora = performance.now()
    if (ahora - ultimoInforme.current > 250) {
      ultimoInforme.current = ahora
      set({ foto: { fase: 'listo', progreso: 1, muestras: Math.floor(pt.samples) } })
    }
  }, 1)

  return null
}
