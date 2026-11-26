import { Center, ContactShadows } from '@react-three/drei'
import Model from './Model'
import Agua from './Agua'
import Iluminacion from './Iluminacion'

export default function Experience() {
  return (
    <>
      <Iluminacion />

      {/* Terreno alrededor del lote */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#9aab84" roughness={1} />
      </mesh>
      <Center disableY>
        <Model url={import.meta.env.VITE_MODELO_URL ?? 'models/casa.glb'} />
      </Center>
      <Agua />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.3} scale={60} blur={2.5} far={8} />
    </>
  )
}
