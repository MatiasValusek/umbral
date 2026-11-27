import { useFrame, useThree } from '@react-three/fiber'
import type { CameraControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { useEstado, type Toma } from '../estado'
import { esperarCuadros, fijarTamano } from '../scene/tamano'
import { crearRecorrido, tomasDelRecorrido, type Pose } from './recorrido'

const v = new Vector3()
const vt = new Vector3()

function poseActual(c: CameraControls): Pose {
  c.getPosition(v)
  c.getTarget(vt)
  return { position: [v.x, v.y, v.z], target: [vt.x, vt.y, vt.z] }
}

const ponerPose = (c: CameraControls, p: Pose, suave = false) =>
  c.setLookAt(...p.position, ...p.target, suave)

/** Arma la función del recorrido con lo que hay ahora en el estado (lanza un Error si falta algo) */
function recorridoActual() {
  const s = useEstado.getState()
  const r = crearRecorrido(s.video, tomasDelRecorrido(s.video, s.modelo))
  if (typeof r === 'string') throw new Error(r)
  return r
}

/**
 * Vive dentro del Canvas: registra en el estado el grabador de video y la vista actual,
 * y anima la vista previa del recorrido en el visor.
 */
export default function Grabador() {
  const get = useThree((s) => s.get)
  const controles = useThree((s) => s.controls) as CameraControls | null
  const previa = useEstado((s) => s.previa)
  const setFn = useEstado((s) => s.set)
  const reloj = useRef({ t: 0, recorrido: null as ((u: number) => Pose) | null, volver: null as Pose | null })

  // Vista actual (para agregar tomas o fijar el inicio de la órbita)
  useEffect(() => {
    if (!controles) return
    // ?debug: __poseVideo(u) devuelve la pose del recorrido (0 = inicio, 1 = fin) para probarlo desde la consola
    if (window.location.search.includes('debug'))
      (window as unknown as { __poseVideo: unknown }).__poseVideo = (u: number) => recorridoActual()(u)
    const vistaActual = (): Toma => ({ nombre: '', ...poseActual(controles) })
    setFn({ vistaActual })
    return () => setFn({ vistaActual: null })
  }, [controles, setFn])

  // Grabar el MP4
  useEffect(() => {
    if (!controles) return
    const grabar = async (ancho: number, alto: number) => {
      const recorrido = recorridoActual()
      const { crearMp4 } = await import('./mp4')
      const { gl } = get()
      const { fps, duracion } = useEstado.getState().video
      const total = Math.max(2, Math.round(duracion * fps))
      const volver = poseActual(controles)
      controles.enabled = false
      const tam = fijarTamano(get, ancho, alto, true)
      let mp4: Awaited<ReturnType<typeof crearMp4>> | null = null
      try {
        mp4 = await crearMp4(gl.domElement, tam.w, tam.h, fps)
        const inicio = performance.now()
        useEstado.getState().set({ grabando: { cuadro: 0, total, inicio }, cancelarVideo: false })
        ponerPose(controles, recorrido(0))
        // Primeros cuadros: que se acomoden sombras, oclusión y postprocesado al nuevo tamaño
        await esperarCuadros(6)

        for (let i = 0; i < total; i++) {
          if (useEstado.getState().cancelarVideo) {
            await mp4.cancelar()
            return null
          }
          ponerPose(controles, recorrido(i / (total - 1)))
          // Dos cuadros: garantiza que el visor ya se dibujó con la cámara nueva
          await esperarCuadros(2)
          await mp4.agregar(i)
          useEstado.getState().set({ grabando: { cuadro: i + 1, total, inicio } })
        }
        return await mp4.terminar()
      } catch (e) {
        await mp4?.cancelar()
        throw e
      } finally {
        tam.restaurar()
        ponerPose(controles, volver)
        controles.enabled = true
        useEstado.getState().set({ grabando: null, cancelarVideo: false })
      }
    }
    setFn({ grabar })
    return () => setFn({ grabar: null })
  }, [controles, get, setFn])

  // Vista previa: recorre el camino en tiempo real dentro del visor
  useEffect(() => {
    if (!controles) return
    const r = reloj.current
    if (previa) {
      try {
        r.recorrido = recorridoActual()
      } catch {
        setFn({ previa: false })
        return
      }
      r.volver = poseActual(controles)
      r.t = 0
      controles.enabled = false
      ponerPose(controles, r.recorrido(0))
      return () => {
        r.recorrido = null
        controles.enabled = true
        if (r.volver) ponerPose(controles, r.volver, true)
      }
    }
  }, [previa, controles, setFn])

  useFrame((_, delta) => {
    const r = reloj.current
    if (!previa || !r.recorrido || !controles) return
    r.t += Math.min(delta, 0.1)
    const u = r.t / useEstado.getState().video.duracion
    if (u >= 1) {
      setFn({ previa: false })
      return
    }
    ponerPose(controles, r.recorrido(u))
  })

  return null
}
