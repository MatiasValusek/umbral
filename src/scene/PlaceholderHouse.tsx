import { useMemo } from 'react'
import * as THREE from 'three'

// Maqueta provisoria (volúmenes simples) para armar la web
// mientras preparamos el modelo real en Blender.

const C = {
  pasto: '#6f8f4e',
  muro: '#eceae4',
  ladrillo: '#8a6f5e',
  chapa: '#5c6670',
  madera: '#8a5a3a',
  hormigon: '#c9c6bf',
  piedra: '#a7a39a',
  agua: '#5fc6d1',
  tronco: '#6b5440',
  copa: '#55703a',
  flor: '#9a7bc4',
}

function Box({
  size,
  position,
  color,
  rotation,
  rough = 0.9,
}: {
  size: [number, number, number]
  position: [number, number, number]
  color: string
  rotation?: [number, number, number]
  rough?: number
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  )
}

function Casa() {
  // Techo a dos aguas con un prisma
  const techo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-4.6, 0)
    s.lineTo(4.6, 0)
    s.lineTo(0, 1.8)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 13, bevelEnabled: false })
    g.translate(0, 0, -6.5)
    return g
  }, [])

  return (
    <group position={[-4, 0, -8]}>
      <Box size={[12, 3, 8]} position={[0, 1.5, 0]} color={C.ladrillo} />
      {/* Ventanales */}
      <Box size={[3, 2.1, 0.05]} position={[-2.5, 1.2, 4.01]} color="#9fc3cc" rough={0.1} />
      <Box size={[3, 2.1, 0.05]} position={[2.5, 1.2, 4.01]} color="#9fc3cc" rough={0.1} />
      <Box size={[1, 2.1, 0.06]} position={[0, 1.1, 4.02]} color={C.madera} />
      <mesh geometry={techo} position={[0, 3, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.chapa} roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  )
}

function Galeria() {
  const listones = Array.from({ length: 9 }, (_, i) => -2 + i * 0.5)
  return (
    <group position={[-5, 0, -1.5]}>
      <Box size={[6, 0.06, 5]} position={[0, 0.03, 0]} color={C.piedra} />
      {[
        [-2.7, -2.2],
        [2.7, -2.2],
        [-2.7, 2.2],
        [2.7, 2.2],
      ].map(([x, z], i) => (
        <Box key={i} size={[0.18, 2.7, 0.18]} position={[x, 1.35, z]} color={C.madera} />
      ))}
      <Box size={[5.8, 0.2, 0.15]} position={[0, 2.7, 2.2]} color={C.madera} />
      <Box size={[5.8, 0.2, 0.15]} position={[0, 2.7, -2.2]} color={C.madera} />
      {listones.map((x) => (
        <Box key={x} size={[0.08, 0.15, 5]} position={[x, 2.85, 0]} color={C.madera} />
      ))}
      {/* Mesa */}
      <Box size={[1.8, 0.08, 0.9]} position={[0, 0.75, 0]} color={C.madera} />
      <Box size={[0.1, 0.72, 0.1]} position={[0, 0.37, 0]} color={C.madera} />
    </group>
  )
}

function Pileta() {
  return (
    <group position={[4, 0, 4]}>
      {/* Solárium */}
      <Box size={[11, 0.12, 6]} position={[0, 0.06, 0]} color={C.hormigon} />
      {/* Borde y agua */}
      <Box size={[8.4, 0.16, 3.4]} position={[0, 0.1, 0]} color="#e6e3dc" />
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 3]} />
        <meshPhysicalMaterial color={C.agua} roughness={0.05} metalness={0} clearcoat={1} transmission={0.2} />
      </mesh>
      {/* Bancos de madera */}
      <Box size={[2.4, 0.45, 0.6]} position={[-3, 0.35, 2.6]} color={C.madera} />
      <Box size={[2.4, 0.45, 0.6]} position={[0.5, 0.35, 2.6]} color={C.madera} />
    </group>
  )
}

function Arbol({ position, escala = 1 }: { position: [number, number, number]; escala?: number }) {
  return (
    <group position={position} scale={escala}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 3.2, 8]} />
        <meshStandardMaterial color={C.tronco} roughness={1} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color={C.copa} roughness={1} flatShading />
      </mesh>
    </group>
  )
}

function Cantero() {
  // Bordura curva con matas (instancias para que sea liviano)
  const matas = useMemo(() => {
    const out: { p: [number, number, number]; s: number; flor: boolean }[] = []
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 0.9 + 0.2
      const r = 4 + Math.sin(i * 12.9898) * 0.9
      out.push({
        p: [-9 + Math.cos(a) * r, 0, 5 - Math.sin(a) * r * 0.8],
        s: 0.35 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.3,
        flor: i % 3 === 0,
      })
    }
    return out
  }, [])

  return (
    <group>
      {matas.map((m, i) => (
        <mesh key={i} position={[m.p[0], m.s * 0.8, m.p[2]]} scale={m.s} castShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={m.flor ? C.flor : '#6a8a52'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export default function PlaceholderHouse() {
  return (
    <group>
      {/* Terreno */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 26]} />
        <meshStandardMaterial color={C.pasto} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#8ea07a" roughness={1} />
      </mesh>

      {/* Medianeras */}
      <Box size={[30, 2.6, 0.25]} position={[0, 1.3, -13]} color={C.muro} />
      <Box size={[0.25, 2.6, 26]} position={[-15, 1.3, 0]} color={C.muro} />
      <Box size={[0.25, 2.6, 26]} position={[15, 1.3, 0]} color={C.muro} />

      <Casa />
      <Galeria />
      <Pileta />
      <Cantero />

      {/* Senda de placas */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} size={[1.4, 0.06, 0.5]} position={[-1.5, 0.03, 2 + i * 1.6]} color={C.hormigon} />
      ))}

      <Arbol position={[-11, 0, -2]} escala={1.1} />
      <Arbol position={[1.5, 0, -3]} />
      <Arbol position={[11, 0, -6]} escala={1.2} />
      <Arbol position={[-12, 0, 10]} escala={0.9} />
    </group>
  )
}
