// Puntos de interés del recorrido.
// position = dónde se ubica la cámara, target = hacia dónde mira (metros, Y hacia arriba).
// El lote mide ~10,4 × 40 m: X de -5,2 a 5,2 · Z de -20 (fondo) a 20 (frente).
export type Punto = {
  id: string
  titulo: string
  descripcion: string
  position: [number, number, number]
  target: [number, number, number]
}

export const VISTA_GENERAL: Punto = {
  id: 'general',
  titulo: 'Vista general',
  descripcion: 'Lote de 10 × 40 m: casa al frente y jardín al fondo con pileta, quincho y canteros.',
  position: [17, 19, 6],
  target: [0, 0, -6],
}

export const PUNTOS: Punto[] = [
  VISTA_GENERAL,
  {
    id: 'pileta',
    titulo: 'Pileta',
    descripcion: 'Pileta sobre la medianera, con solárium de placas y bancos de madera.',
    position: [3.2, 2.6, 4],
    target: [-2.6, 0, -3.5],
  },
  {
    id: 'quincho',
    titulo: 'Quincho',
    descripcion: 'Quincho de ladrillo con pérgola de madera, parrilla y mesa exterior.',
    position: [-2.5, 2.4, -5],
    target: [3.6, 1.2, -13.5],
  },
  {
    id: 'hamaca',
    titulo: 'Hamaca',
    descripcion: 'Rincón de descanso con hamaca paraguaya entre canteros.',
    position: [-1.5, 1.9, 3.5],
    target: [3.3, 0.7, -1],
  },
  {
    id: 'canteros',
    titulo: 'Canteros',
    descripcion: 'Borduras con arbustos y florales sobre la medianera, con senda de placas.',
    position: [-3.5, 2.2, -2],
    target: [3, 0.3, -9],
  },
]
