import { Center, ContactShadows } from '@react-three/drei'
import Model from './Model'
import Agua from './Agua'
import Iluminacion from './Iluminacion'
import Superficie from '../objetos/Superficie'
import Objetos from '../objetos/Objetos'
import AplicarMateriales from '../materiales/AplicarMateriales'

export default function Experience() {
  return (
    <>
      <Iluminacion />

      {/* Todo lo que se puede "pisar" al colocar objetos */}
      <Superficie>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial name="Terreno" color="#9aab84" roughness={1} />
        </mesh>
        <Center disableY>
          <Model url={import.meta.env.VITE_MODELO_URL ?? 'models/casa.glb'} />
        </Center>
        <Agua />
      </Superficie>

      <AplicarMateriales />
      <Objetos />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.3} scale={60} blur={2.5} far={8} />
    </>
  )
}
