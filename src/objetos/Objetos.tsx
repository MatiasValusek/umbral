import { Clone, TransformControls, useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Vector3, type Group, type Mesh, type Object3D } from 'three'
import { useEstado, type Colocando, type Objeto } from '../estado'
import { porId, PROPIO } from './catalogo'
import { alturaEn, cursor } from './Superficie'

// Modelo .glb subido por el usuario: se apoya en el piso y se centra en X/Z
function ModeloPropio({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const ajuste = useMemo(() => {
    const caja = new Box3().setFromObject(scene)
    const centro = caja.getCenter(new Vector3())
    return [-centro.x, -caja.min.y, -centro.z] as [number, number, number]
  }, [scene])
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
  }, [scene])
  return <Clone object={scene} position={ajuste} />
}

function Forma({ tipo, url }: { tipo: string; url?: string }) {
  if (tipo === PROPIO && url) return <ModeloPropio url={url} />
  const item = porId(tipo)
  return item ? <item.Modelo /> : null
}

// Objeto que sigue al mouse mientras se elige dónde colocarlo
function Fantasma({ c }: { c: Colocando }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ref.current) return
    ref.current.visible = cursor.visible
    ref.current.position.copy(cursor.punto)
  })
  return (
    <group ref={ref} raycast={() => null}>
      <Suspense fallback={null}>
        <Forma tipo={c.tipo} url={c.url} />
      </Suspense>
    </group>
  )
}

function Colocado({ o, seleccionado }: { o: Objeto; seleccionado: boolean }) {
  // setState como ref: estable y no re-renderiza si el objeto no cambió
  const [grupo, setGrupo] = useState<Group | null>(null)
  const click = (e: ThreeEvent<MouseEvent>) => {
    const s = useEstado.getState()
    if (s.modo !== 'edicion' || s.colocando || e.delta > 5) return
    e.stopPropagation()
    s.set({ seleccionado: o.id })
  }
  return (
    <>
      <group ref={setGrupo} position={o.pos} rotation={[0, o.rotY, 0]} scale={o.escala} onClick={click}>
        <Suspense fallback={null}>
          <Forma tipo={o.tipo} url={o.url} />
        </Suspense>
      </group>
      {seleccionado && grupo && <Seleccion objeto={grupo} />}
    </>
  )
}

function Seleccion({ objeto }: { objeto: Object3D }) {
  const { seleccionado, herramienta, actualizar } = useEstado()
  const guardar = () => {
    if (!seleccionado) return
    const p = objeto.position
    // Al soltar, se apoya sobre lo que haya debajo (pasto, piso, deck…)
    const y = herramienta === 'mover' ? alturaEn(p.x, p.z) : p.y
    objeto.position.y = y
    actualizar(seleccionado, {
      pos: [p.x, y, p.z],
      rotY: objeto.rotation.y,
      escala: objeto.scale.x,
    })
  }
  return (
    <>
      <TransformControls
        object={objeto}
        mode={herramienta === 'mover' ? 'translate' : herramienta === 'rotar' ? 'rotate' : 'scale'}
        showX={herramienta !== 'rotar'}
        showY={herramienta !== 'mover'}
        showZ={herramienta !== 'rotar'}
        size={0.8}
        onObjectChange={() => {
          // escala uniforme
          if (herramienta === 'escalar') {
            const s = objeto.scale
            const v = s.x !== s.y ? s.x : s.y !== s.z ? s.y : s.z
            s.setScalar(Math.min(4, Math.max(0.2, v)))
          }
        }}
        onMouseUp={guardar}
      />
    </>
  )
}

export default function Objetos() {
  const { objetos, colocando, seleccionado, modo } = useEstado()

  // Salir de Edición limpia selección y colocación
  useEffect(() => {
    if (modo !== 'edicion') useEstado.getState().set({ seleccionado: null, colocando: null })
  }, [modo])

  return (
    <>
      {objetos.map((o) => (
        <Colocado key={o.id} o={o} seleccionado={modo === 'edicion' && o.id === seleccionado} />
      ))}
      {modo === 'edicion' && colocando && <Fantasma c={colocando} />}
    </>
  )
}
