import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Modo = 'vista' | 'edicion' | 'render'
export type CieloId = 'despejado' | 'nublado' | 'atardecer' | 'amanecer'
export type FormatoId = 'hd' | '4k' | 'cuadrado' | 'vertical'
export type Archivo = 'png' | 'jpg'

// Cielos: HDRI CC0 de Poly Haven (en public/hdri) para la luz ambiente y los reflejos,
// y parámetros del cielo procedural de fondo (drei <Sky>).
export const CIELOS: Record<
  CieloId,
  {
    nombre: string
    hdri: string
    turbidez: number
    rayleigh: number
    sol: number // multiplicador de intensidad del sol
    ambiente: number // intensidad del HDRI
    horaSugerida?: number
  }
> = {
  despejado: { nombre: 'Despejado', hdri: 'rooitou_park_1k.hdr', turbidez: 4, rayleigh: 1, sol: 1, ambiente: 0.55 },
  nublado: { nombre: 'Nublado', hdri: 'forest_slope_1k.hdr', turbidez: 20, rayleigh: 4, sol: 0.25, ambiente: 1.1 },
  atardecer: { nombre: 'Atardecer', hdri: 'venice_sunset_1k.hdr', turbidez: 8, rayleigh: 2.5, sol: 1.9, ambiente: 0.75, horaSugerida: 19.25 },
  amanecer: { nombre: 'Amanecer', hdri: 'kiara_1_dawn_1k.hdr', turbidez: 6, rayleigh: 2, sol: 1.8, ambiente: 0.75, horaSugerida: 6.75 },
}

export const FORMATOS: Record<FormatoId, { nombre: string; detalle: string; ancho: number; alto: number }> = {
  hd: { nombre: 'HD', detalle: '1920 × 1080', ancho: 1920, alto: 1080 },
  '4k': { nombre: '4K', detalle: '3840 × 2160', ancho: 3840, alto: 2160 },
  cuadrado: { nombre: '1:1', detalle: '2048 × 2048 · redes', ancho: 2048, alto: 2048 },
  vertical: { nombre: '9:16', detalle: '1080 × 1920 · historias', ancho: 1080, alto: 1920 },
}

export type Herramienta = 'mover' | 'rotar' | 'escalar'

export type Objeto = {
  id: string
  tipo: string // id del catálogo o 'propio'
  nombre: string
  pos: [number, number, number]
  rotY: number // radianes
  escala: number
  url?: string // solo para .glb propios (blob, no sobrevive a recargar la página)
}

export type Pestana = 'objetos' | 'materiales'

/** Cambios sobre un material del modelo (se aplican encima del .glb, que nunca se modifica) */
export type AjusteMaterial = {
  color?: string
  rugosidad?: number
  metalicidad?: number
  textura?: string | null // id de TEXTURAS; null = quitar textura
  escala?: number // metros por repetición
  rotacion?: number // grados
}

export type Colocando = { tipo: string; nombre: string; url?: string }

const nuevoId = () => Math.random().toString(36).slice(2, 9)

export type Capturador = (ancho: number, alto: number, archivo: Archivo) => Promise<Blob | null>

type Estado = {
  modo: Modo
  cielo: CieloId
  hora: number // 6 a 20.5, hora local
  orientacion: number // grados: hacia dónde queda el norte (0 = fondo del lote)
  exposicion: number
  sombrasSuaves: boolean
  oclusion: boolean
  brillo: boolean
  vineta: boolean
  formato: FormatoId
  archivo: Archivo
  renderizando: boolean
  capturar: Capturador | null
  // Edición
  objetos: Objeto[]
  seleccionado: string | null
  colocando: Colocando | null
  herramienta: Herramienta
  pestana: Pestana
  materialSel: string | null
  listaMateriales: { nombre: string; color: string }[]
  materiales: Record<string, AjusteMaterial>
  ajustarMaterial: (nombre: string, parcial: AjusteMaterial) => void
  restaurarMaterial: (nombre: string) => void
  agregar: (c: Colocando, pos: [number, number, number], rotY?: number) => string
  actualizar: (id: string, parcial: Partial<Objeto>) => void
  borrar: (id: string) => void
  duplicar: (id: string) => void
  set: (parcial: Partial<Omit<Estado, 'set'>>) => void
  elegirCielo: (c: CieloId) => void
}

export const useEstado = create<Estado>()(
  persist(
  (set, get) => ({
  modo: 'vista',
  cielo: 'despejado',
  hora: 15,
  orientacion: 0,
  exposicion: 1,
  sombrasSuaves: true,
  oclusion: true,
  brillo: true,
  vineta: true,
  formato: 'hd',
  archivo: 'png',
  renderizando: false,
  capturar: null,
  objetos: [],
  seleccionado: null,
  colocando: null,
  herramienta: 'mover',
  pestana: 'objetos',
  materialSel: null,
  listaMateriales: [],
  materiales: {},
  ajustarMaterial: (nombre, parcial) =>
    set((s) => ({ materiales: { ...s.materiales, [nombre]: { ...s.materiales[nombre], ...parcial } } })),
  restaurarMaterial: (nombre) =>
    set((s) => {
      const { [nombre]: _, ...resto } = s.materiales
      return { materiales: resto }
    }),
  agregar: (c, pos, rotY = 0) => {
    const id = nuevoId()
    set((s) => ({ objetos: [...s.objetos, { id, ...c, pos, rotY, escala: 1 }] }))
    return id
  },
  actualizar: (id, parcial) =>
    set((s) => ({ objetos: s.objetos.map((o) => (o.id === id ? { ...o, ...parcial } : o)) })),
  borrar: (id) =>
    set((s) => ({
      objetos: s.objetos.filter((o) => o.id !== id),
      seleccionado: s.seleccionado === id ? null : s.seleccionado,
    })),
  duplicar: (id) => {
    const o = get().objetos.find((x) => x.id === id)
    if (!o) return
    const copia = { ...o, id: nuevoId(), pos: [o.pos[0] + 1, o.pos[1], o.pos[2] + 1] as [number, number, number] }
    set((s) => ({ objetos: [...s.objetos, copia], seleccionado: copia.id }))
  },
  set: (parcial) => set(parcial),
  elegirCielo: (c) =>
    set((s) => ({ cielo: c, hora: CIELOS[c].horaSugerida ?? (s.hora < 8 || s.hora > 18 ? 14 : s.hora) })),
  }),
  {
    // Guardado automático en este navegador: objetos colocados y ajustes de luz/render.
    // Los .glb propios no se guardan (viven en memoria hasta recargar).
    name: 'umbral-escena',
    version: 1,
    partialize: (s) => ({
      objetos: s.objetos.filter((o) => o.tipo !== 'propio'),
      materiales: s.materiales,
      cielo: s.cielo,
      hora: s.hora,
      orientacion: s.orientacion,
      exposicion: s.exposicion,
      sombrasSuaves: s.sombrasSuaves,
      oclusion: s.oclusion,
      brillo: s.brillo,
      vineta: s.vineta,
      formato: s.formato,
      archivo: s.archivo,
    }),
  },
  ),
)

// Posición del sol para Buenos Aires (lat −34,6°) a fines de noviembre (declinación ≈ −21°).
// Devuelve la dirección hacia el sol en coordenadas de la escena (norte = −Z rotado por `orientacion`)
// y la elevación en grados.
const LAT = (-34.6 * Math.PI) / 180
const DEC = (-21 * Math.PI) / 180
const MEDIODIA_SOLAR = 12.7 // huso UTC−3, longitud −58,4° y ecuación del tiempo de noviembre

export function posicionSol(hora: number, orientacion: number) {
  const H = ((hora - MEDIODIA_SOLAR) * 15 * Math.PI) / 180
  const este = -Math.cos(DEC) * Math.sin(H)
  const norte = Math.sin(DEC) * Math.cos(LAT) - Math.cos(DEC) * Math.sin(LAT) * Math.cos(H)
  const arriba = Math.sin(LAT) * Math.sin(DEC) + Math.cos(LAT) * Math.cos(DEC) * Math.cos(H)
  const r = (orientacion * Math.PI) / 180
  // norte → −Z, este → +X, luego rotar alrededor de Y
  const x0 = este
  const z0 = -norte
  const x = x0 * Math.cos(r) + z0 * Math.sin(r)
  const z = -x0 * Math.sin(r) + z0 * Math.cos(r)
  const elevacion = (Math.asin(Math.max(-1, Math.min(1, arriba))) * 180) / Math.PI
  return { dir: [x, Math.max(arriba, 0.02), z] as [number, number, number], elevacion }
}

export const formatoHora = (h: number) => {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`
}
