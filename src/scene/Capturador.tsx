import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { PerspectiveCamera } from 'three'
import { CALIDADES_FOTO, useEstado, type Archivo } from '../estado'

const esperarCuadros = (n: number) =>
  new Promise<void>((ok) => {
    const paso = () => (n-- <= 0 ? ok() : requestAnimationFrame(paso))
    requestAnimationFrame(paso)
  })

/**
 * Registra en el estado una función que renderiza la vista actual a una resolución fija.
 * El encuadre respeta el marco que se ve en pantalla: si el formato pide menos alto que la
 * ventana, se achica el campo de visión en la misma proporción.
 */
export default function Capturador() {
  const get = useThree((s) => s.get)
  const setFn = useEstado((s) => s.set)

  useEffect(() => {
    const capturar = async (ancho: number, alto: number, archivo: Archivo) => {
      const { gl, camera, size, viewport, setSize, setDpr } = get()
      const cam = camera as PerspectiveCamera

      // Si la placa no soporta el tamaño pedido, se escala hacia abajo manteniendo la proporción
      const max = Math.min(gl.capabilities.maxTextureSize, 8192)
      const escala = Math.min(1, max / Math.max(ancho, alto))
      const w = Math.round(ancho * escala)
      const h = Math.round(alto * escala)

      // Marco en pantalla: el mayor rectángulo de esa proporción que entra en la ventana
      const aspecto = ancho / alto
      const marcoAlto = Math.min(size.height, size.width / aspecto)
      const fovOriginal = cam.fov
      const tan = Math.tan(((fovOriginal * Math.PI) / 180) / 2) * (marcoAlto / size.height)
      const original = { w: size.width, h: size.height, top: size.top, left: size.left, dpr: viewport.dpr }

      try {
        cam.fov = (2 * Math.atan(tan) * 180) / Math.PI
        setDpr(1)
        setSize(w, h)
        cam.updateProjectionMatrix()
        const e = useEstado.getState()
        if (e.motor === 'foto' && e.esperarMuestras) {
          // Motor Foto: juntar muestras de path tracing a la resolución final
          e.set({ terminarYa: false, muestrasRender: 0 })
          await esperarCuadros(2)
          await e.esperarMuestras(CALIDADES_FOTO[e.calidadFoto].muestras, (m) =>
            useEstado.getState().set({ muestrasRender: m }),
          )
        } else {
          // Unos cuadros para que se acomoden sombras, oclusión y postprocesado al nuevo tamaño
          await esperarCuadros(6)
        }
        return await new Promise<Blob | null>((ok) =>
          gl.domElement.toBlob(ok, archivo === 'png' ? 'image/png' : 'image/jpeg', 0.93),
        )
      } finally {
        cam.fov = fovOriginal
        setDpr(original.dpr)
        setSize(original.w, original.h, original.top, original.left)
        cam.updateProjectionMatrix()
      }
    }
    setFn({ capturar })
    return () => setFn({ capturar: null })
  }, [get, setFn])

  return null
}
