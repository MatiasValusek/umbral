import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEstado } from '../estado'

// Postprocesado del modo Render: oclusión ambiental, brillo suave, viñeta y tone mapping.
// En modo Vista no se monta (más liviano para el celular).
export default function Efectos() {
  const { modo, motor, oclusion, brillo, vineta } = useEstado()
  if (modo !== 'render' || motor === 'foto') return null
  // La key reconstruye la cadena de efectos al prender/apagar uno
  const key = `${+oclusion}${+brillo}${+vineta}`
  return (
    <EffectComposer key={key} multisampling={0} enableNormalPass={false}>
      <>
        {oclusion && (
          <N8AO aoRadius={1.2} distanceFalloff={0.6} intensity={2.2} quality="high" halfRes={false} color="#1d2318" />
        )}
        {brillo && <Bloom intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />}
        {vineta && <Vignette offset={0.28} darkness={0.45} />}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </>
    </EffectComposer>
  )
}
