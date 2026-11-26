import { useGLTF } from '@react-three/drei'
import { useLayoutEffect } from 'react'
import type { Mesh, MeshStandardMaterial } from 'three'

// Ajustes de materiales que vienen planos desde SketchUp (por nombre de material)
const AJUSTES: Record<string, Partial<{ color: string; roughness: number }>> = {
  Color_F07: { color: '#4d6b36', roughness: 1 }, // medianera verde (enredadera)
}

// Carga un modelo .glb desde /public/models.
// Uso: <Model url="/models/casa.glb" />
export default function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  useLayoutEffect(() => {
    scene.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      const mats = (Array.isArray(m.material) ? m.material : [m.material]) as MeshStandardMaterial[]
      for (const mat of mats) {
        const a = AJUSTES[mat.name]
        if (!a) continue
        if (a.color) mat.color.set(a.color)
        if (a.roughness !== undefined) mat.roughness = a.roughness
      }
    })
  }, [scene])

  return <primitive object={scene} />
}
