import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { MeshPhysicalMaterial } from 'three'

// Espejo de agua de la pileta (coordenadas ya centradas en el lote)
export default function Agua({
  position = [-2.7, -0.12, -4] as [number, number, number],
  size = [2.4, 6] as [number, number],
}) {
  const mat = useRef<MeshPhysicalMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.clearcoatRoughness = 0.08 + Math.sin(clock.elapsedTime * 0.8) * 0.04
  })
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshPhysicalMaterial
        ref={mat}
        color="#3fc1d0"
        roughness={0.05}
        metalness={0}
        clearcoat={1}
        transparent
        opacity={0.88}
      />
    </mesh>
  )
}
