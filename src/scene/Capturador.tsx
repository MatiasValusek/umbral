import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { CALIDADES_FOTO, useEstado, type Archivo } from '../estado'
import { esperarCuadros, fijarTamano } from './tamano'

/** Registra en el estado una función que renderiza la vista actual a una resolución fija. */
export default function Capturador() {
  const get = useThree((s) => s.get)
  const setFn = useEstado((s) => s.set)

  useEffect(() => {
    const capturar = async (ancho: number, alto: number, archivo: Archivo) => {
      const { gl } = get()
      const tam = fijarTamano(get, ancho, alto)
      try {
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
        tam.restaurar()
      }
    }
    setFn({ capturar })
    return () => setFn({ capturar: null })
  }, [get, setFn])

  return null
}
