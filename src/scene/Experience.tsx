import { ContactShadows, Environment, Lightformer, Sky } from '@react-three/drei'
import { Center } from '@react-three/drei'
import Model from './Model'
import Agua from './Agua'

export default function Experience() {
  return (
    <>
      <color attach="background" args={['#dfe7ec']} />
      <fog attach="fog" args={['#dfe7ec', 45, 120]} />
      <Sky sunPosition={[30, 25, 15]} turbidity={6} rayleigh={1.2} />

      <hemisphereLight args={['#f4f1ea', '#4b5d3a', 0.6]} />
      <directionalLight
        castShadow
        position={[30, 25, 15]}
        intensity={2.4}
        color="#fff3e0"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0004}
      />

      {/* Iluminación de entorno generada localmente (sin descargar HDRI) */}
      <Environment resolution={256} environmentIntensity={0.6}>
        <Lightformer intensity={2} position={[0, 10, 0]} scale={[30, 30, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1} position={[-20, 4, -10]} scale={[20, 6, 1]} rotation-y={Math.PI / 2} color="#cfe3ff" />
        <Lightformer intensity={1} position={[20, 4, 10]} scale={[20, 6, 1]} rotation-y={-Math.PI / 2} color="#ffe9cc" />
      </Environment>

      {/* Terreno alrededor del lote */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#9aab84" roughness={1} />
      </mesh>
      <Center disableY>
        <Model url={import.meta.env.VITE_MODELO_URL ?? "models/casa.glb"} />
      </Center>
      <Agua />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={60} blur={2.5} far={8} />
    </>
  )
}
