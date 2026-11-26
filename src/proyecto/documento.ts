import { create } from 'zustand'
import { CIELOS, FORMATOS, useEstado, type AjusteMaterial, type Objeto } from '../estado'

// El "documento" es todo lo que el usuario hace sobre el modelo: objetos, materiales, luz y render.
// Es lo que se deshace/rehace y lo que se guarda en escena.json.
export type Documento = {
  objetos: Objeto[]
  materiales: Record<string, AjusteMaterial>
  cielo: keyof typeof CIELOS
  hora: number
  orientacion: number
  exposicion: number
  sombrasSuaves: boolean
  oclusion: boolean
  brillo: boolean
  vineta: boolean
  formato: keyof typeof FORMATOS
  archivo: 'png' | 'jpg'
}

const CLAVES = [
  'objetos',
  'materiales',
  'cielo',
  'hora',
  'orientacion',
  'exposicion',
  'sombrasSuaves',
  'oclusion',
  'brillo',
  'vineta',
  'formato',
  'archivo',
] as const satisfies readonly (keyof Documento)[]

export const DOCUMENTO_VACIO: Documento = {
  objetos: [],
  materiales: {},
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
}

export function documentoActual(): Documento {
  const s = useEstado.getState()
  const d = {} as Record<string, unknown>
  for (const k of CLAVES) d[k] = s[k]
  return d as Documento
}

const iguales = (a: Documento, b: Documento) => CLAVES.every((k) => a[k] === b[k])

// ---------- historial ----------
const LIMITE = 100
const AGRUPAR_MS = 450 // cambios seguidos (un deslizador) cuentan como uno

type Historial = { pasado: Documento[]; futuro: Documento[] }
export const useHistorial = create<Historial>(() => ({ pasado: [], futuro: [] }))

let ultimo: Documento | null = null
let ultimoCambio = 0
let aplicando = false

/** Empieza a registrar cambios del documento. Llamar una vez al iniciar. */
export function iniciarHistorial() {
  ultimo = documentoActual()
  return useEstado.subscribe(() => {
    if (aplicando) return
    const ahora = documentoActual()
    if (!ultimo || iguales(ahora, ultimo)) return
    const t = performance.now()
    const h = useHistorial.getState()
    // Si el cambio anterior fue hace muy poco, se agrupa: no se agrega una entrada nueva
    if (t - ultimoCambio > AGRUPAR_MS || h.pasado.length === 0) {
      useHistorial.setState({ pasado: [...h.pasado, ultimo].slice(-LIMITE), futuro: [] })
    } else if (h.futuro.length) {
      useHistorial.setState({ futuro: [] })
    }
    ultimoCambio = t
    ultimo = ahora
  })
}

function aplicar(d: Documento) {
  aplicando = true
  const s = useEstado.getState()
  // Si el objeto seleccionado ya no existe, se deselecciona
  const sel = s.seleccionado && d.objetos.some((o) => o.id === s.seleccionado) ? s.seleccionado : null
  s.set({ ...d, seleccionado: sel })
  ultimo = documentoActual()
  ultimoCambio = 0
  aplicando = false
}

export function deshacer() {
  const { pasado, futuro } = useHistorial.getState()
  const previo = pasado[pasado.length - 1]
  if (!previo) return false
  const actual = documentoActual()
  useHistorial.setState({ pasado: pasado.slice(0, -1), futuro: [actual, ...futuro] })
  aplicar(previo)
  return true
}

export function rehacer() {
  const { pasado, futuro } = useHistorial.getState()
  const siguiente = futuro[0]
  if (!siguiente) return false
  const actual = documentoActual()
  useHistorial.setState({ pasado: [...pasado, actual], futuro: futuro.slice(1) })
  aplicar(siguiente)
  return true
}

/** Reemplaza el documento entero (abrir archivo, empezar de cero) como un paso que se puede deshacer */
export function reemplazar(d: Documento) {
  const h = useHistorial.getState()
  useHistorial.setState({ pasado: [...h.pasado, documentoActual()].slice(-LIMITE), futuro: [] })
  aplicar(d)
}

// ---------- archivo escena.json ----------
export const FORMATO_ARCHIVO = 'umbral-escena'
export const VERSION_ARCHIVO = 1

export function aJSON(modelo: string) {
  const d = documentoActual()
  const propios = d.objetos.filter((o) => o.tipo === 'propio').length
  const archivo = {
    formato: FORMATO_ARCHIVO,
    version: VERSION_ARCHIVO,
    app: 'Umbral',
    guardado: new Date().toISOString(),
    modelo,
    escena: { ...d, objetos: d.objetos.filter((o) => o.tipo !== 'propio').map(({ url: _url, ...o }) => o) },
  }
  return { texto: JSON.stringify(archivo, null, 2), omitidos: propios }
}

const num = (v: unknown, def: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def)

/** Lee y valida un escena.json. Lanza Error con un mensaje para mostrar si no sirve. */
export function deJSON(texto: string): Documento {
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const a = datos as { formato?: unknown; version?: unknown; escena?: Record<string, unknown> }
  if (a?.formato !== FORMATO_ARCHIVO || !a.escena) throw new Error('No es un archivo de escena de Umbral.')
  if (typeof a.version === 'number' && a.version > VERSION_ARCHIVO)
    throw new Error('El archivo es de una versión más nueva de Umbral.')
  const e = a.escena
  const v = DOCUMENTO_VACIO
  const objetos: Objeto[] = Array.isArray(e.objetos)
    ? (e.objetos as Record<string, unknown>[])
        .filter((o) => o && typeof o.tipo === 'string' && o.tipo !== 'propio' && Array.isArray(o.pos))
        .map((o, i) => ({
          id: typeof o.id === 'string' ? o.id : `o${i}`,
          tipo: o.tipo as string,
          nombre: typeof o.nombre === 'string' ? o.nombre : String(o.tipo),
          pos: [0, 1, 2].map((k) => num((o.pos as unknown[])[k], 0, -500, 500)) as [number, number, number],
          rotY: num(o.rotY, 0),
          escala: num(o.escala, 1, 0.2, 4),
        }))
    : []
  const materiales: Record<string, AjusteMaterial> = {}
  if (e.materiales && typeof e.materiales === 'object')
    for (const [nombre, aj] of Object.entries(e.materiales as Record<string, Record<string, unknown>>)) {
      if (!aj || typeof aj !== 'object') continue
      const m: AjusteMaterial = {}
      if (typeof aj.color === 'string' && /^#[0-9a-f]{6}$/i.test(aj.color)) m.color = aj.color
      if (typeof aj.rugosidad === 'number') m.rugosidad = num(aj.rugosidad, 0.9, 0, 1)
      if (typeof aj.metalicidad === 'number') m.metalicidad = num(aj.metalicidad, 0, 0, 1)
      if (typeof aj.textura === 'string' || aj.textura === null) m.textura = aj.textura as string | null
      if (typeof aj.escala === 'number') m.escala = num(aj.escala, 1, 0.05, 50)
      if (typeof aj.rotacion === 'number') m.rotacion = num(aj.rotacion, 0, 0, 360)
      materiales[nombre] = m
    }
  return {
    objetos,
    materiales,
    cielo: typeof e.cielo === 'string' && e.cielo in CIELOS ? (e.cielo as Documento['cielo']) : v.cielo,
    hora: num(e.hora, v.hora, 6, 20.5),
    orientacion: num(e.orientacion, v.orientacion, 0, 359),
    exposicion: num(e.exposicion, v.exposicion, 0.4, 1.8),
    sombrasSuaves: bool(e.sombrasSuaves, v.sombrasSuaves),
    oclusion: bool(e.oclusion, v.oclusion),
    brillo: bool(e.brillo, v.brillo),
    vineta: bool(e.vineta, v.vineta),
    formato: typeof e.formato === 'string' && e.formato in FORMATOS ? (e.formato as Documento['formato']) : v.formato,
    archivo: e.archivo === 'jpg' ? 'jpg' : 'png',
  }
}
