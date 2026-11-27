import { CatmullRomCurve3, Vector3 } from 'three'
import { PUNTOS } from '../data/puntos'
import type { AjustesVideo, ModeloInfo, Orbita, Toma, Vec3 } from '../estado'

export type Pose = { position: Vec3; target: Vec3 }

// Recorrido sugerido para la casa de ejemplo: baja desde la vista aérea y recorre el jardín hacia el fondo.
// 'bajada' es una toma de paso por encima del jardín, para no atravesar la medianera al descender.
const BAJADA: Toma = { nombre: 'Bajada al jardín', position: [3, 7, 3], target: [-2, 0, -5] }
const ORDEN_SUGERIDO = ['general', 'bajada', 'pileta', 'hamaca', 'canteros', 'quincho']

/** Tomas que usa el video: las del usuario o, si no hay, el recorrido sugerido del modelo de ejemplo */
export function tomasDelRecorrido(video: AjustesVideo, modelo: ModeloInfo): Toma[] {
  if (video.tomas.length || modelo.tipo === 'propio') return video.tomas
  return ORDEN_SUGERIDO.flatMap((id) => {
    if (id === 'bajada') return [BAJADA]
    const p = PUNTOS.find((x) => x.id === id)
    return p ? [{ nombre: p.titulo, position: p.position, target: p.target }] : []
  })
}

/** Órbita que arranca en la vista dada (cámara → punto que mira) */
export function orbitaDesde(t: Toma): Orbita {
  const [px, py, pz] = t.position
  const [cx, cy, cz] = t.target
  const dx = px - cx
  const dz = pz - cz
  return { centro: t.target, radio: Math.max(0.5, Math.hypot(dx, dz)), altura: py - cy, angulo: Math.atan2(dx, dz) }
}

/**
 * Perfil de velocidad trapezoidal: acelera en el primer tramo, va parejo y frena al final.
 * u y el resultado van de 0 a 1.
 */
function suavizar(u: number, rampa: number) {
  if (rampa <= 0) return u
  const v = 1 / (1 - rampa)
  if (u < rampa) return (v * u * u) / (2 * rampa)
  if (u > 1 - rampa) return 1 - (v * (1 - u) ** 2) / (2 * rampa)
  return v * (u - rampa / 2)
}

const a3 = (v: Vector3): Vec3 => [v.x, v.y, v.z]

/**
 * Devuelve la pose de la cámara en función del avance (0 = inicio, 1 = fin),
 * o un mensaje si con estos ajustes no se puede armar el recorrido.
 */
export function crearRecorrido(video: AjustesVideo, tomas: Toma[]): ((u: number) => Pose) | string {
  if (video.tipo === 'orbita') {
    const o = video.orbita
    if (!o) return 'Elegí desde qué vista empieza la órbita.'
    const giro = (video.giro * Math.PI) / 180
    // Una vuelta completa va pareja (se puede repetir sin cortes); un giro parcial arranca y frena suave
    const rampa = video.giro === 360 ? 0 : 0.2
    return (u) => {
      const a = o.angulo + giro * suavizar(u, rampa)
      return {
        position: [o.centro[0] + Math.sin(a) * o.radio, o.centro[1] + o.altura, o.centro[2] + Math.cos(a) * o.radio],
        target: o.centro,
      }
    }
  }

  if (tomas.length < 2) return 'Agregá al menos 2 tomas para armar el recorrido.'
  const P = tomas.map((t) => new Vector3(...t.position))
  const T = tomas.map((t) => new Vector3(...t.target))
  const curvaP = new CatmullRomCurve3(P, false, 'centripetal')
  const curvaT = new CatmullRomCurve3(T, false, 'centripetal')

  // Cada tramo dura según cuánto se mueve la cámara (y cuánto cambia lo que mira),
  // así la velocidad es pareja aunque las tomas estén a distancias distintas
  const pesos = P.slice(1).map((p, i) => Math.max(p.distanceTo(P[i]), 0.6 * T[i + 1].distanceTo(T[i]), 0.5))
  const total = pesos.reduce((a, b) => a + b, 0)
  const acum = [0]
  for (const w of pesos) acum.push(acum[acum.length - 1] + w / total)
  const n = tomas.length - 1
  const vp = new Vector3()
  const vt = new Vector3()
  const pose = (t: number): Pose => {
    curvaP.getPoint(Math.min(1, Math.max(0, t)), vp)
    curvaT.getPoint(Math.min(1, Math.max(0, t)), vt)
    return { position: a3(vp), target: a3(vt) }
  }

  const pausa = video.pausa ?? 0
  if (pausa > 0) {
    // Se queda quieta `pausa` segundos en cada toma (también en la primera y la última)
    // y entre una y otra arranca y frena suave
    const movimiento = video.duracion - pausa * tomas.length
    if (movimiento < n * 1)
      return `Con ${tomas.length} pausas de ${pausa} s no queda tiempo para moverse: subí la duración o bajá la pausa.`
    const p = pausa / video.duracion // fracción de cada pausa
    const m = movimiento / video.duracion // fracción del movimiento total
    return (u) => {
      let x = Math.min(1, Math.max(0, u))
      for (let i = 0; i < n; i++) {
        if (x < p) return pose(i / n)
        x -= p
        const tramo = (pesos[i] / total) * m
        if (x < tramo) return pose((i + suavizar(x / tramo, 0.5)) / n)
        x -= tramo
      }
      return pose(1)
    }
  }

  return (u) => {
    const s = suavizar(Math.min(1, Math.max(0, u)), 0.12)
    let i = 0
    while (i < n - 1 && s > acum[i + 1]) i++
    const f = (s - acum[i]) / (acum[i + 1] - acum[i] || 1)
    return pose(Math.min(1, (i + Math.min(1, Math.max(0, f))) / n))
  }
}
