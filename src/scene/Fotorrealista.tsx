import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, Matrix4, Mesh, type InstancedMesh, type Scene, type Texture } from 'three'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/worker'
import { useEstado } from '../estado'

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
    if (OCULTAR.includes(o.name) && o.visible) {
      o.visible = false
      deshacer.push(() => (o.visible = true))
    }
  })
  for (const im of instancias) {
    for (let i = 0; i < im.count; i++) {
      im.getMatrixAt(i, m)
      const copia = new Mesh(im.geometry, im.material)
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
    pt.tiles.set(2, 2)
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
          pt.fadeDuration = 0
          pt.dynamicLowRes = false
          pt.updateCamera()
          const mirar = () => {
            const s = useEstado.getState()
            progreso(Math.floor(pt.samples))
            if ((listo.current && pt.samples >= n) || s.terminarYa) {
              pt.fadeDuration = fade
              pt.dynamicLowRes = true
              ok()
            } else requestAnimationFrame(mirar)
          }
          requestAnimationFrame(mirar)
        }),
    })
  }, [set])

  useFrame(() => {
    const pt = tracer.current
    if (!pt || !listo.current) {
      gl.render(scene, camera) // mientras se prepara, se ve la imagen en tiempo real
      return
    }
    // Si la cámara se movió, se reinicia la acumulación
    camera.updateMatrixWorld()
    if (!ultimaCam.current.equals(camera.matrixWorld) || !ultimaProj.current.equals(camera.projectionMatrix)) {
      ultimaCam.current.copy(camera.matrixWorld)
      ultimaProj.current.copy(camera.projectionMatrix)
      pt.updateCamera()
    }
    pt.renderSample()
    const ahora = performance.now()
    if (ahora - ultimoInforme.current > 250) {
      ultimoInforme.current = ahora
      set({ foto: { fase: 'listo', progreso: 1, muestras: Math.floor(pt.samples) } })
    }
  }, 1)

  return null
}
