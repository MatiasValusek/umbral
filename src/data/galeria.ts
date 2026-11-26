// Fotos reales del patio (antes) y renders Lumion del proyecto (después).
// Originales en Pruebas/1/Img patio y Pruebas/1/Imagenes, convertidos a WebP en public/img/.
export type Par = {
  id: string
  titulo: string
  antes: string
  despues: string
  /** Punto de interés relacionado: el botón "Antes / Después" de su ficha abre este par */
  punto?: string
}

export const PARES: Par[] = [
  { id: 'pileta', titulo: 'Pileta', antes: 'img/antes/pileta.webp', despues: 'img/renders/e.webp', punto: 'pileta' },
  { id: 'hamaca', titulo: 'Hacia la casa', antes: 'img/antes/hamaca.webp', despues: 'img/renders/a.webp', punto: 'hamaca' },
  { id: 'quincho', titulo: 'Quincho', antes: 'img/antes/quincho.webp', despues: 'img/renders/d.webp', punto: 'quincho' },
  { id: 'canteros', titulo: 'Canteros', antes: 'img/antes/canteros.webp', despues: 'img/renders/f.webp', punto: 'canteros' },
  { id: 'solarium', titulo: 'Solárium', antes: 'img/antes/solarium.webp', despues: 'img/renders/g.webp' },
]

export type Render = { id: string; titulo: string; src: string; mini: string }

export const RENDERS: Render[] = [
  ['a', 'Medianera verde y hamaca'],
  ['b', 'Quincho y canteros'],
  ['c', 'Planta desde arriba'],
  ['d', 'Pérgola y mesa exterior'],
  ['e', 'Senda hacia el fondo'],
  ['f', 'Borduras florales'],
  ['g', 'Solárium y bancos'],
].map(([id, titulo]) => ({
  id,
  titulo,
  src: `img/renders/${id}.webp`,
  mini: `img/renders/${id}-mini.webp`,
}))
