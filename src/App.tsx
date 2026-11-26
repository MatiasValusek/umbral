import { Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import Experience from './scene/Experience'
import Overlay from './ui/Overlay'
import Loader from './ui/Loader'
import { PUNTOS, VISTA_GENERAL, type Punto } from './data/puntos'

export default function App() {
  const controls = useRef<CameraControls>(null)
  const [activo, setActivo] = useState<string>(VISTA_GENERAL.id)

  // ?debug en la URL expone la cámara en la consola: __cam.setLookAt(x,y,z, tx,ty,tz, true)
  if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
    ;(window as unknown as { __cam: unknown }).__cam = controls
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
        camera={{ position: VISTA_GENERAL.position, fov: 40, near: 0.1, far: 500 }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
        <CameraControls
          ref={controls}
          minDistance={1}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.1}
          smoothTime={0.6}
        />
      </Canvas>
      <Overlay puntos={PUNTOS} activo={activo} onSelect={irA} />
      <Loader />
    </>
  )
}
