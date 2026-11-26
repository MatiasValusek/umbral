import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import Experience from './scene/Experience'
import Capturador from './scene/Capturador'
import Overlay from './ui/Overlay'
import PanelRender from './ui/PanelRender'
import PanelEdicion from './ui/PanelEdicion'
import Modos from './ui/Modos'
import BarraProyecto from './ui/BarraProyecto'
import { iniciarHistorial } from './proyecto/documento'
import Loader from './ui/Loader'
import { PUNTOS, VISTA_GENERAL, type Punto } from './data/puntos'
import { tituloModelo, useEstado } from './estado'
import SubirModelo from './ui/SubirModelo'
import { leerModelo } from './modelo/almacen'

// El postprocesado solo se usa en modo Render: se descarga cuando hace falta
const Efectos = lazy(() => import('./scene/Efectos'))

export default function App() {
  const controls = useRef<CameraControls>(null)
  const [activo, setActivo] = useState<string>(VISTA_GENERAL.id)
  const modo = useEstado((s) => s.modo)
  const modelo = useEstado((s) => s.modelo)
  const encuadre = useEstado((s) => s.encuadre)
  const radio = useEstado((s) => s.radioEscena)
  const propio = modelo.tipo === 'propio'

  // Modelo propio guardado en el navegador: se recupera al abrir la página
  useEffect(() => {
    const m = useEstado.getState().modelo
    if (m.tipo !== 'propio') return
    leerModelo()
      .then((blob) => {
        if (blob) useEstado.getState().set({ modeloUrl: URL.createObjectURL(blob) })
        else useEstado.getState().set({ modelo: { tipo: 'ejemplo' }, objetos: [], materiales: {} })
      })
      .catch(() => useEstado.getState().set({ modelo: { tipo: 'ejemplo' } }))
  }, [])

  // Un modelo propio no tiene puntos de interés: solo una vista general calculada
  const vistaPropia: Punto | null = encuadre && propio
    ? {
        id: VISTA_GENERAL.id,
        titulo: 'Vista general',
        descripcion: `Tu modelo ${tituloModelo(modelo)}. Girá con el mouse y acercate con la rueda.`,
        position: encuadre.position,
        target: encuadre.target,
      }
    : null
  const puntos = propio ? (vistaPropia ? [vistaPropia] : []) : PUNTOS

  // Encuadrar la cámara cuando carga un modelo propio
  useEffect(() => {
    if (!encuadre || !propio) return
    setActivo(VISTA_GENERAL.id)
    controls.current?.setLookAt(...encuadre.position, ...encuadre.target, true)
  }, [encuadre, propio])
  useEffect(() => {
    if (!propio) {
      setActivo(VISTA_GENERAL.id)
      controls.current?.setLookAt(...VISTA_GENERAL.position, ...VISTA_GENERAL.target, true)
    }
  }, [propio])

  // Historial de deshacer/rehacer (se arma después de recuperar la escena guardada en el navegador)
  useEffect(() => iniciarHistorial(), [])

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
          makeDefault
          ref={controls}
          minDistance={1}
          maxDistance={Math.max(60, radio * 4)}
          maxPolarAngle={Math.PI / 2.1}
          smoothTime={0.6}
        />
      </Canvas>
      <Overlay puntos={puntos} activo={activo} onSelect={irA} modos={
          <div className="centro">
            <Modos />
            {modo !== 'vista' && <BarraProyecto />}
          </div>
        } />
      {modo === 'edicion' && <PanelEdicion />}
      {modo === 'render' && <PanelRender puntos={puntos} activo={activo} onSelect={irA} />}
      <SubirModelo />
      <Loader />
    </>
  )
}
