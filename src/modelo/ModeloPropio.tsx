import { useGLTF } from '@react-three/drei'
import { useLayoutEffect, useMemo } from 'react'
import { Box3, Vector3, type Mesh } from 'three'
import { UNIDADES, useEstado, type Unidad } from '../estado'

/** Altura de cámara/encuadre para ver todo el modelo */
export function encuadrePara(ancho: number, alto: number, largo: number) {
  const r = Math.max(ancho, largo, alto * 1.5, 4)
  return {
    position: [r * 0.75, Math.max(alto * 1.2, r * 0.7), r * 0.95] as [number, number, number],
    target: [0, alto * 0.25, 0] as [number, number, number],
  }
}

/**
 * Modelo subido por el usuario: escalado según la unidad, centrado en X/Z y apoyado en y = 0.
 * Al cargar pide a la cámara que lo encuadre.
 */
export default function ModeloPropio({ url, unidad }: { url: string; unidad: Unidad }) {
  const { scene } = useGLTF(url)
  const f = UNIDADES[unidad].factor

  const { offset, tam } = useMemo(() => {
    scene.updateMatrixWorld(true)
    const caja = new Box3().setFromObject(scene)
    const c = caja.getCenter(new Vector3())
    const t = caja.getSize(new Vector3())
    return { offset: [-c.x, -caja.min.y, -c.z] as [number, number, number], tam: t }
  }, [scene])

  useLayoutEffect(() => {
    scene.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
  }, [scene])

  useLayoutEffect(() => {
    const e = encuadrePara(tam.x * f, tam.y * f, tam.z * f)
    const prev = useEstado.getState().encuadre
    useEstado.getState().set({
      encuadre: { ...e, n: (prev?.n ?? 0) + 1 },
      radioEscena: Math.max(12, (Math.max(tam.x, tam.z) * f) / 2 + 6),
    })
  }, [tam, f])

  return (
    <group scale={f}>
      <primitive object={scene} position={offset} />
    </group>
  )
}
