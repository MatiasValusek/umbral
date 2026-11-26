import { Center, ContactShadows } from '@react-three/drei'
import Model from './Model'
import Agua from './Agua'
import Iluminacion from './Iluminacion'
import Superficie from '../objetos/Superficie'
import Objetos from '../objetos/Objetos'
import AplicarMateriales from '../materiales/AplicarMateriales'
import ModeloPropio from '../modelo/ModeloPropio'
import { useEstado } from '../estado'
import { useEffect } from 'react'

export default function Experience() {
  const modelo = useEstado((s) => s.modelo)
  const url = useEstado((s) => s.modeloUrl)
  const propio = modelo.tipo === 'propio'
  // Al cambiar de modelo se vuelven a armar la superficie y la lista de materiales
  // El modelo de ejemplo usa el radio de siempre
  useEffect(() => {
    if (!propio) useEstado.getState().set({ radioEscena: 28 })
  }, [propio])
  const clave = propio ? `propio-${url}-${modelo.unidad}` : 'ejemplo'

  return (
    <>
      <Iluminacion />

      {/* Todo lo que se puede "pisar" al colocar objetos */}
      <Superficie key={clave}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, propio ? -0.02 : -0.22, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial name="Terreno" color="#9aab84" roughness={1} />
        </mesh>
        {propio ? (
          url && <ModeloPropio url={url} unidad={modelo.unidad} />
        ) : (
          <>
            <Center disableY>
              <Model url={import.meta.env.VITE_MODELO_URL ?? 'models/casa.glb'} />
            </Center>
            <Agua />
          </>
        )}
      </Superficie>

      <AplicarMateriales key={clave} />
      <Objetos />
      <ContactShadows name="sombras-contacto" position={[0, 0.01, 0]} opacity={0.3} scale={60} blur={2.5} far={8} />
    </>
  )
}
