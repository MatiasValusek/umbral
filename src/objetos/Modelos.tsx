import { useMemo } from 'react'
import {
  CatmullRomCurve3,
  DoubleSide,
  MeshStandardMaterial,
  Shape,
  Vector3,
} from 'three'

// Objetos procedurales estilo maqueta de arquitectura: low-poly, sin texturas ni licencias de terceros.
// Unidades en metros, apoyados en y = 0.

const mat = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, roughness: 0.9 }), extra)

export const M = {
  monigote: mat('#f1eee7', { roughness: 0.75 }),
  tronco: mat('#6b4f3a'),
  copa: mat('#5f7f3e', { flatShading: true }),
  copaOscura: mat('#46652f', { flatShading: true }),
  copaClara: mat('#7d9a4c', { flatShading: true }),
  hojaPalmera: mat('#5a7d36', { side: DoubleSide, flatShading: true }),
  madera: mat('#a9743f', { roughness: 0.7 }),
  maderaOscura: mat('#7a5232', { roughness: 0.7 }),
  tela: mat('#efe9dd', { side: DoubleSide }),
  metal: mat('#3b3f3d', { roughness: 0.4, metalness: 0.6 }),
  terracota: mat('#b5643c'),
  autoCuerpo: mat('#d9dcd9', { roughness: 0.35, metalness: 0.3 }),
  vidrio: mat('#273038', { roughness: 0.1, metalness: 0.2 }),
  goma: mat('#1d1f1e', { roughness: 0.9 }),
}

const S = { castShadow: true, receiveShadow: true }

// ---------- Vegetación ----------

export function ArbolRedondo() {
  return (
    <group>
      <mesh {...S} material={M.tronco} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 2.4, 7]} />
      </mesh>
      <mesh {...S} material={M.copa} position={[0, 3.3, 0]}>
        <icosahedronGeometry args={[1.6, 1]} />
      </mesh>
      <mesh {...S} material={M.copaClara} position={[0.7, 3.9, 0.3]}>
        <icosahedronGeometry args={[0.9, 1]} />
      </mesh>
    </group>
  )
}

export function ArbolAlto() {
  return (
    <group>
      <mesh {...S} material={M.tronco} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 1, 6]} />
      </mesh>
      <mesh {...S} material={M.copaOscura} position={[0, 3.4, 0]}>
        <coneGeometry args={[0.95, 5.4, 8, 3]} />
      </mesh>
    </group>
  )
}

export function ArbolAncho() {
  const bolas: [number, number, number, number][] = [
    [0, 3.4, 0, 1.4],
    [1.3, 3.1, 0.4, 1.05],
    [-1.2, 3.2, -0.3, 1.1],
    [0.2, 3.3, 1.2, 1],
    [-0.3, 3.5, -1.2, 1],
  ]
  return (
    <group>
      <mesh {...S} material={M.tronco} position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.15, 0.24, 2.6, 7]} />
      </mesh>
      {bolas.map(([x, y, z, r], i) => (
        <mesh key={i} {...S} material={i % 2 ? M.copaClara : M.copa} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
    </group>
  )
}

export function Palmera() {
  const curva = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0, 0, 0),
        new Vector3(0.15, 2, 0),
        new Vector3(0.45, 4, 0),
        new Vector3(0.75, 5.6, 0),
      ]),
    [],
  )
  const tope = curva.getPoint(1)
  const hoja = useMemo(() => {
    const s = new Shape()
    s.moveTo(0, 0)
    s.quadraticCurveTo(0.9, 0.32, 2.4, 0)
    s.quadraticCurveTo(0.9, -0.32, 0, 0)
    return s
  }, [])
  return (
    <group>
      <mesh {...S} material={M.tronco}>
        <tubeGeometry args={[curva, 12, 0.16, 7, false]} />
      </mesh>
      <group position={tope}>
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} rotation={[0, (i / 9) * Math.PI * 2, 0]}>
            <mesh {...S} material={M.hojaPalmera} rotation={[Math.PI / 2, 0.35 + (i % 3) * 0.12, 0]}>
              <shapeGeometry args={[hoja, 6]} />
            </mesh>
          </group>
        ))}
        <mesh {...S} material={M.copaOscura}>
          <icosahedronGeometry args={[0.28, 0]} />
        </mesh>
      </group>
    </group>
  )
}

export function Arbusto() {
  return (
    <group>
      <mesh {...S} material={M.copa} position={[0, 0.45, 0]}>
        <icosahedronGeometry args={[0.55, 1]} />
      </mesh>
      <mesh {...S} material={M.copaClara} position={[0.45, 0.35, 0.15]}>
        <icosahedronGeometry args={[0.4, 1]} />
      </mesh>
      <mesh {...S} material={M.copaOscura} position={[-0.4, 0.32, -0.1]}>
        <icosahedronGeometry args={[0.38, 1]} />
      </mesh>
    </group>
  )
}

export function Cerco() {
  return (
    <mesh {...S} material={M.copaOscura} position={[0, 0.55, 0]}>
      <boxGeometry args={[2, 1.1, 0.6, 4, 2, 2]} />
    </mesh>
  )
}

export function Maceta() {
  return (
    <group>
      <mesh {...S} material={M.terracota} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.3, 0.22, 0.5, 12]} />
      </mesh>
      <mesh {...S} material={M.copa} position={[0, 0.75, 0]}>
        <icosahedronGeometry args={[0.4, 1]} />
      </mesh>
    </group>
  )
}

// ---------- Personas (monigotes de maqueta) ----------

function Cabeza({ y }: { y: number }) {
  return (
    <mesh {...S} material={M.monigote} position={[0, y, 0]}>
      <sphereGeometry args={[0.11, 14, 10]} />
    </mesh>
  )
}

export function PersonaParada({ altura = 1.75 }: { altura?: number }) {
  const k = altura / 1.75
  return (
    <group scale={k}>
      <mesh {...S} material={M.monigote} position={[0.09, 0.45, 0]}>
        <capsuleGeometry args={[0.07, 0.75, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[-0.09, 0.45, 0]}>
        <capsuleGeometry args={[0.07, 0.75, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0, 1.15, 0]} scale={[1, 1, 0.65]}>
        <capsuleGeometry args={[0.17, 0.42, 4, 10]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0.24, 1.1, 0]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.05, 0.55, 4, 6]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[-0.24, 1.1, 0]} rotation={[0, 0, -0.12]}>
        <capsuleGeometry args={[0.05, 0.55, 4, 6]} />
      </mesh>
      <Cabeza y={1.6} />
    </group>
  )
}

export function PersonaCaminando() {
  return (
    <group>
      <mesh {...S} material={M.monigote} position={[0, 0.45, 0.13]} rotation={[0.32, 0, 0]}>
        <capsuleGeometry args={[0.07, 0.75, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0, 0.45, -0.13]} rotation={[-0.32, 0, 0]}>
        <capsuleGeometry args={[0.07, 0.75, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0, 1.15, 0]} scale={[0.65, 1, 1]}>
        <capsuleGeometry args={[0.17, 0.42, 4, 10]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0, 1.08, -0.16]} rotation={[0.35, 0, 0]}>
        <capsuleGeometry args={[0.05, 0.55, 4, 6]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0, 1.08, 0.16]} rotation={[-0.35, 0, 0]}>
        <capsuleGeometry args={[0.05, 0.55, 4, 6]} />
      </mesh>
      <Cabeza y={1.6} />
    </group>
  )
}

export function PersonaSentada() {
  return (
    <group>
      {/* banco */}
      <mesh {...S} material={M.madera} position={[0, 0.42, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.42]} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} {...S} material={M.metal} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.38]} />
        </mesh>
      ))}
      {/* persona */}
      <mesh {...S} material={M.monigote} position={[0.09, 0.5, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.07, 0.32, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[-0.09, 0.5, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.07, 0.32, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0.09, 0.24, 0.4]}>
        <capsuleGeometry args={[0.065, 0.32, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[-0.09, 0.24, 0.4]}>
        <capsuleGeometry args={[0.065, 0.32, 4, 8]} />
      </mesh>
      <mesh {...S} material={M.monigote} position={[0, 0.82, 0]} scale={[1, 1, 0.65]}>
        <capsuleGeometry args={[0.17, 0.42, 4, 10]} />
      </mesh>
      <Cabeza y={1.27} />
    </group>
  )
}

export const PersonaNino = () => <PersonaParada altura={1.2} />

// ---------- Mobiliario ----------

export function Reposera() {
  return (
    <group>
      <mesh {...S} material={M.madera} position={[0, 0.3, 0.25]}>
        <boxGeometry args={[0.65, 0.06, 1.3]} />
      </mesh>
      <mesh {...S} material={M.madera} position={[0, 0.58, -0.62]} rotation={[-0.75, 0, 0]}>
        <boxGeometry args={[0.65, 0.06, 0.8]} />
      </mesh>
      {[
        [-0.28, 0.85],
        [0.28, 0.85],
        [-0.28, -0.55],
        [0.28, -0.55],
      ].map(([x, z], i) => (
        <mesh key={i} {...S} material={M.maderaOscura} position={[x, 0.14, z]}>
          <boxGeometry args={[0.05, 0.28, 0.05]} />
        </mesh>
      ))}
    </group>
  )
}

export function Sombrilla() {
  return (
    <group>
      <mesh {...S} material={M.metal} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.08, 16]} />
      </mesh>
      <mesh {...S} material={M.metal} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 2.4, 8]} />
      </mesh>
      <mesh {...S} material={M.tela} position={[0, 2.25, 0]}>
        <coneGeometry args={[1.4, 0.45, 8, 1, true]} />
      </mesh>
    </group>
  )
}

function Silla({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh {...S} material={M.madera} position={[0, 0.45, 0]}>
        <boxGeometry args={[0.45, 0.05, 0.45]} />
      </mesh>
      <mesh {...S} material={M.madera} position={[0, 0.72, -0.2]}>
        <boxGeometry args={[0.45, 0.5, 0.04]} />
      </mesh>
      {[
        [-0.19, -0.19],
        [0.19, -0.19],
        [-0.19, 0.19],
        [0.19, 0.19],
      ].map(([a, b], i) => (
        <mesh key={i} {...S} material={M.metal} position={[a, 0.22, b]}>
          <boxGeometry args={[0.03, 0.44, 0.03]} />
        </mesh>
      ))}
    </group>
  )
}

export function MesaSillas() {
  return (
    <group>
      <mesh {...S} material={M.madera} position={[0, 0.74, 0]}>
        <boxGeometry args={[1.6, 0.05, 0.9]} />
      </mesh>
      {[
        [-0.7, -0.38],
        [0.7, -0.38],
        [-0.7, 0.38],
        [0.7, 0.38],
      ].map(([x, z], i) => (
        <mesh key={i} {...S} material={M.metal} position={[x, 0.36, z]}>
          <boxGeometry args={[0.05, 0.72, 0.05]} />
        </mesh>
      ))}
      <Silla x={-0.4} z={-0.75} rot={0} />
      <Silla x={0.4} z={-0.75} rot={0} />
      <Silla x={-0.4} z={0.75} rot={Math.PI} />
      <Silla x={0.4} z={0.75} rot={Math.PI} />
    </group>
  )
}

export function Auto() {
  const ruedas: [number, number][] = [
    [-0.8, 1.35],
    [0.8, 1.35],
    [-0.8, -1.35],
    [0.8, -1.35],
  ]
  return (
    <group>
      <mesh {...S} material={M.autoCuerpo} position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 0.65, 4.4]} />
      </mesh>
      <mesh {...S} material={M.autoCuerpo} position={[0, 1.15, -0.25]}>
        <boxGeometry args={[1.6, 0.5, 2.3]} />
      </mesh>
      <mesh material={M.vidrio} position={[0, 1.15, -0.25]}>
        <boxGeometry args={[1.62, 0.36, 2.1]} />
      </mesh>
      {ruedas.map(([x, z], i) => (
        <mesh key={i} {...S} material={M.goma} position={[x, 0.34, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.25, 16]} />
        </mesh>
      ))}
    </group>
  )
}
