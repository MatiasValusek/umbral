import type { ThreeEvent } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import { Raycaster, Vector3, type Group } from 'three'
import { useEstado } from '../estado'

// Estado compartido sin re-renders: dónde está el cursor sobre el terreno/modelo
export const cursor = { punto: new Vector3(), visible: false }
export const superficie: { grupo: Group | null } = { grupo: null }

const rayo = new Raycaster()
const ABAJO = new Vector3(0, -1, 0)

/** Altura del terreno/modelo debajo de (x, z), para apoyar objetos */
export function alturaEn(x: number, z: number): number {
  if (!superficie.grupo) return 0
  rayo.set(new Vector3(x, 60, z), ABAJO)
  const hit = rayo.intersectObject(superficie.grupo, true)[0]
  return hit ? hit.point.y : 0
}

/**
 * Envuelve todo lo que se puede "pisar" (terreno, casa, pileta). En modo Edición registra
 * dónde apunta el mouse y, si hay un objeto elegido en la biblioteca, lo coloca con un click.
 */
export default function Superficie({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)

  const mover = (e: ThreeEvent<PointerEvent>) => {
    const { modo, colocando } = useEstado.getState()
    if (modo !== 'edicion' || !colocando) return
    cursor.punto.copy(e.point)
    cursor.visible = true
  }

  const click = (e: ThreeEvent<MouseEvent>) => {
    const s = useEstado.getState()
    if (s.modo !== 'edicion' || e.delta > 5) return
    e.stopPropagation()
    if (s.colocando) {
      const id = s.agregar(s.colocando, [e.point.x, e.point.y, e.point.z], Math.random() * Math.PI * 2)
      // Shift mantiene la herramienta para seguir colocando del mismo tipo
      if (!e.nativeEvent.shiftKey) s.set({ colocando: null, seleccionado: id })
    } else {
      s.set({ seleccionado: null })
    }
  }

  return (
    <group
      ref={(g) => {
        ref.current = g
        superficie.grupo = g
      }}
      onPointerMove={mover}
      onPointerLeave={() => (cursor.visible = false)}
      onClick={click}
    >
      {children}
    </group>
  )
}
