import { Environment, Sky, SoftShadows } from '@react-three/drei'
import { useMemo } from 'react'
import { Color } from 'three'
import { CIELOS, posicionSol, useEstado } from '../estado'

const CALIDO = new Color('#ff8a3d')
const NEUTRO = new Color('#fff3e0')
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Sol + cielo + luz ambiente (HDRI) controlados desde el estado global.
export default function Iluminacion() {
  const { cielo, hora, orientacion, exposicion, sombrasSuaves, modo } = useEstado()
  const c = CIELOS[cielo]

  const sol = useMemo(() => {
    const { dir, elevacion } = posicionSol(hora, orientacion)
    const alto = smooth(0, 30, elevacion)
    const color = CALIDO.clone().lerp(NEUTRO, alto)
    const intensidad = (0.35 + 2.6 * smooth(-2, 25, elevacion)) * c.sol * exposicion
    const pos = dir.map((v) => v * 60) as [number, number, number]
    return { pos, color, intensidad, elevacion }
  }, [hora, orientacion, exposicion, c.sol])

  // De día el cielo ilumina más; al amanecer/atardecer baja la luz ambiente
  const ambiente = c.ambiente * exposicion * (0.65 + 0.35 * smooth(0, 20, sol.elevacion))
  const fondo = cielo === 'nublado' ? '#c9cfd3' : '#dfe7ec'
  const enRender = modo === 'render'

  return (
    <>
      <color attach="background" args={[fondo]} />
      <fog attach="fog" args={[fondo, 60, 160]} />
      <Sky
        distance={450}
        sunPosition={sol.pos}
        turbidity={c.turbidez}
        rayleigh={c.rayleigh}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Environment
        files={`hdri/${c.hdri}`}
        environmentIntensity={ambiente}
        environmentRotation={[0, (orientacion * Math.PI) / 180, 0]}
      />
      <hemisphereLight args={['#f4f1ea', '#4b5d3a', 0.25 * exposicion]} />
      <directionalLight
        key={enRender ? 'render' : 'vista'} // el tamaño del mapa de sombras solo se aplica al crear la luz
        castShadow
        position={sol.pos}
        intensity={sol.intensidad}
        color={sol.color}
        shadow-mapSize={enRender ? [4096, 4096] : [2048, 2048]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      {sombrasSuaves && enRender && <SoftShadows size={cielo === 'nublado' ? 40 : 18} samples={12} focus={0.6} />}
    </>
  )
}
