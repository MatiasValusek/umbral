import { lazy, Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import Experience from './scene/Experience'
import Capturador from './scene/Capturador'
import Overlay from './ui/Overlay'
import PanelRender from './ui/PanelRender'
import Modos from './ui/Modos'
import Loader from './ui/Loader'
import { PUNTOS, VISTA_GENERAL, type Punto } from './data/puntos'
import { useEstado } from './estado'

// El postprocesado solo se usa en modo Render: se descarga cuando hace falta
const Efectos = lazy(() => import('./scene/Efectos'))

export default function App() {
  const controls = useRef<CameraControls>(null)
  const [activo, setActivo] = useState<string>(VISTA_GENERAL.id)
  const modo = useEstado((s) => s.modo)

  // ?debug en la URL expone en la consola la cámara (__cam.current.setLookAt(x,y,z, tx,ty,tz, true))
  // y el estado global (__umbral.getState())
  if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
    ;(window as unknown as { __cam: unknown }).__cam = controls
    ;(window as unknown as { __umbral: unknown }).__umbral = useEstado
  }

  const irA = (p: Punto) => {
    setActivo(p.id)
    controls.current?.setLookAt(...p.position, ...p.target, true)
  }

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: VISTA_GENERAL.position, fov: 40, near: 0.1, far: 900 }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
        {modo === 'render' && (
          <Suspense fallback={null}>
            <Efectos />
          </Suspense>
        )}
        <Capturador />
        <CameraControls
          ref={controls}
          minDistance={1}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.1}
          smoothTime={0.6}
        />
      </Canvas>
      <Overlay puntos={PUNTOS} activo={activo} onSelect={irA} modos={<Modos />} />
      {modo === 'render' && <PanelRender puntos={PUNTOS} activo={activo} onSelect={irA} />}
      <Loader />
    </>
  )
}
