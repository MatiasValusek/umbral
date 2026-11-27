import type { RootState } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'

export const esperarCuadros = (n: number) =>
  new Promise<void>((ok) => {
    const paso = () => (n-- <= 0 ? ok() : requestAnimationFrame(paso))
    requestAnimationFrame(paso)
  })

/**
 * Pone el lienzo a una resolución fija para renderizar (imagen o video) y devuelve cómo volver atrás.
 * El encuadre respeta el marco que se ve en pantalla: si el formato pide menos alto que la
 * ventana, se achica el campo de visión en la misma proporción.
 * `par`: redondea a números pares (los códecs de video lo exigen).
 */
export function fijarTamano(get: () => RootState, ancho: number, alto: number, par = false) {
  const { gl, camera, size, viewport, setSize, setDpr } = get()
  const cam = camera as PerspectiveCamera

  // Si la placa no soporta el tamaño pedido, se escala hacia abajo manteniendo la proporción
  const max = Math.min(gl.capabilities.maxTextureSize, 8192)
  const escala = Math.min(1, max / Math.max(ancho, alto))
  const redondear = (v: number) => (par ? Math.round(v / 2) * 2 : Math.round(v))
  const w = redondear(ancho * escala)
  const h = redondear(alto * escala)

  // Marco en pantalla: el mayor rectángulo de esa proporción que entra en la ventana
  const aspecto = ancho / alto
  const marcoAlto = Math.min(size.height, size.width / aspecto)
  const fovOriginal = cam.fov
  const tan = Math.tan(((fovOriginal * Math.PI) / 180) / 2) * (marcoAlto / size.height)
  const original = { w: size.width, h: size.height, top: size.top, left: size.left, dpr: viewport.dpr }

  cam.fov = (2 * Math.atan(tan) * 180) / Math.PI
  setDpr(1)
  setSize(w, h)
  cam.updateProjectionMatrix()

  return {
    w,
    h,
    restaurar() {
      cam.fov = fovOriginal
      setDpr(original.dpr)
      setSize(original.w, original.h, original.top, original.left)
      cam.updateProjectionMatrix()
    },
  }
}
