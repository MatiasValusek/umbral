import { CanvasTexture, LinearSRGBColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

// Texturas generadas en el navegador (sin archivos ni licencias de terceros).
// Todas son repetibles sin costura: el ruido y las formas "dan la vuelta" en los bordes.

const N = 512

// ---------- ruido periódico ----------
function hash(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function ruido(x: number, y: number, p: number, s: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = x - x0, fy = y - y0
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const w = (v: number) => ((v % p) + p) % p
  const a = hash(w(x0), w(y0), s), b = hash(w(x0 + 1), w(y0), s)
  const c = hash(w(x0), w(y0 + 1), s), d = hash(w(x0 + 1), w(y0 + 1), s)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}
/** fbm periódico en [0,1]; (u,v) en [0,1) */
function fbm(u: number, v: number, base: number, octavas = 4, s = 1) {
  let t = 0, amp = 0.5, f = base, norm = 0
  for (let i = 0; i < octavas; i++) {
    t += amp * ruido(u * f, v * f, f, s + i * 17)
    norm += amp
    amp *= 0.5
    f *= 2
  }
  return t / norm
}

let semilla = 1
const azar = () => {
  semilla = (semilla * 16807) % 2147483647
  return (semilla - 1) / 2147483646
}

type Lienzo = { cv: HTMLCanvasElement; cx: CanvasRenderingContext2D }
const lienzo = (): Lienzo => {
  const cv = document.createElement('canvas')
  cv.width = cv.height = N
  return { cv, cx: cv.getContext('2d', { willReadFrequently: true })! }
}

/** Aplica una función por píxel: recibe u, v y el color actual; devuelve un factor de brillo */
function porPixel(cx: CanvasRenderingContext2D, f: (u: number, v: number) => number) {
  const img = cx.getImageData(0, 0, N, N)
  const d = img.data
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const k = f(x / N, y / N)
      const i = (y * N + x) * 4
      d[i] = Math.min(255, d[i] * k)
      d[i + 1] = Math.min(255, d[i + 1] * k)
      d[i + 2] = Math.min(255, d[i + 2] * k)
    }
  cx.putImageData(img, 0, 0)
}

/** Rectángulo que se repite en los bordes */
function rectEnvuelto(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  for (const dx of [0, -N, N]) for (const dy of [0, -N, N]) cx.fillRect(x + dx, y + dy, w, h)
}

// ---------- generadores ----------
function pasto({ cx }: Lienzo) {
  cx.fillStyle = '#5c7c33'
  cx.fillRect(0, 0, N, N)
  porPixel(cx, (u, v) => 0.75 + 0.5 * fbm(u, v, 6, 4, 3))
  for (let i = 0; i < 9000; i++) {
    const x = azar() * N, y = azar() * N
    const l = 4 + azar() * 7
    cx.strokeStyle = azar() > 0.5 ? 'rgba(130,165,70,0.55)' : 'rgba(40,62,22,0.5)'
    cx.lineWidth = 1
    cx.beginPath()
    cx.moveTo(x, y)
    cx.lineTo(x + (azar() - 0.5) * 3, y - l)
    cx.stroke()
  }
}

function deck({ cx }: Lienzo) {
  const tablas = 6
  const alto = N / tablas
  for (let t = 0; t < tablas; t++) {
    const tono = 0.85 + azar() * 0.3
    cx.fillStyle = `rgb(${150 * tono},${100 * tono},${62 * tono})`
    cx.fillRect(0, t * alto, N, alto)
  }
  porPixel(cx, (u, v) => {
    const veta = fbm(u * 0.25, v * 3, 8, 3, 5)
    return 0.8 + 0.4 * veta
  })
  cx.fillStyle = 'rgba(35,22,12,0.85)'
  for (let t = 0; t < tablas; t++) {
    cx.fillRect(0, t * alto, N, 3)
    const corte = ((t * 197) % N) + 40
    rectEnvuelto(cx, corte, t * alto, 3, alto)
  }
}

function porcelanato({ cx }: Lienzo) {
  const n = 2, lado = N / n
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const t = 0.95 + azar() * 0.08
      cx.fillStyle = `rgb(${205 * t},${200 * t},${190 * t})`
      cx.fillRect(i * lado, j * lado, lado, lado)
    }
  porPixel(cx, (u, v) => 0.93 + 0.12 * fbm(u, v, 4, 4, 9))
  cx.fillStyle = '#9a958c'
  for (let i = 0; i < n; i++) {
    rectEnvuelto(cx, i * lado - 1, 0, 3, N)
    rectEnvuelto(cx, 0, i * lado - 1, N, 3)
  }
}

function hormigon({ cx }: Lienzo) {
  cx.fillStyle = '#a3a19b'
  cx.fillRect(0, 0, N, N)
  porPixel(cx, (u, v) => 0.82 + 0.3 * fbm(u, v, 5, 5, 11))
  for (let i = 0; i < 2500; i++) {
    cx.fillStyle = azar() > 0.5 ? 'rgba(70,70,68,0.35)' : 'rgba(230,228,222,0.35)'
    cx.fillRect(azar() * N, azar() * N, 1 + azar() * 1.5, 1 + azar() * 1.5)
  }
}

function ladrillo({ cx }: Lienzo) {
  cx.fillStyle = '#c9c1b3'
  cx.fillRect(0, 0, N, N)
  const filas = 8, porFila = 4
  const h = N / filas, w = N / porFila, junta = 5
  for (let f = 0; f < filas; f++)
    for (let c = 0; c < porFila; c++) {
      const t = 0.8 + azar() * 0.35
      cx.fillStyle = `rgb(${165 * t},${78 * t},${52 * t})`
      const x = c * w + (f % 2 ? w / 2 : 0)
      rectEnvuelto(cx, x + junta / 2, f * h + junta / 2, w - junta, h - junta)
    }
  porPixel(cx, (u, v) => 0.85 + 0.25 * fbm(u, v, 16, 3, 13))
}

function laja({ cx }: Lienzo) {
  // Voronoi periódico: cada celda una piedra, juntas oscuras entre celdas
  const pts = Array.from({ length: 26 }, () => ({
    x: azar(),
    y: azar(),
    t: 0.75 + azar() * 0.35,
    r: azar(),
  }))
  const img = cx.createImageData(N, N)
  const d = img.data
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N
      let d1 = 9, d2 = 9, cel = pts[0]
      for (const p of pts) {
        let dx = Math.abs(u - p.x), dy = Math.abs(v - p.y)
        dx = Math.min(dx, 1 - dx)
        dy = Math.min(dy, 1 - dy)
        const dd = dx * dx + dy * dy
        if (dd < d1) {
          d2 = d1
          d1 = dd
          cel = p
        } else if (dd < d2) d2 = dd
      }
      const borde = Math.sqrt(d2) - Math.sqrt(d1)
      const junta = borde < 0.008 ? 0.35 : 1
      const n = 0.85 + 0.25 * fbm(u, v, 8, 3, 21)
      const k = cel.t * n * junta
      const i = (y * N + x) * 4
      d[i] = (180 + cel.r * 25) * k
      d[i + 1] = (165 + cel.r * 10) * k
      d[i + 2] = 140 * k
      d[i + 3] = 255
    }
  cx.putImageData(img, 0, 0)
}

function grava({ cx }: Lienzo) {
  cx.fillStyle = '#8d877c'
  cx.fillRect(0, 0, N, N)
  for (let i = 0; i < 5000; i++) {
    const x = azar() * N, y = azar() * N, r = 2 + azar() * 4
    const t = 0.7 + azar() * 0.6
    cx.fillStyle = `rgb(${190 * t},${182 * t},${168 * t})`
    for (const dx of [0, -N, N])
      for (const dy of [0, -N, N]) {
        cx.beginPath()
        cx.ellipse(x + dx, y + dy, r, r * (0.6 + azar() * 0.4), azar() * 3, 0, Math.PI * 2)
        cx.fill()
      }
  }
}

function revoque({ cx }: Lienzo) {
  cx.fillStyle = '#ebe7df'
  cx.fillRect(0, 0, N, N)
  porPixel(cx, (u, v) => 0.92 + 0.1 * fbm(u, v, 24, 3, 31))
}

// ---------- normal map a partir del brillo ----------
function normalDesde(cv: HTMLCanvasElement, fuerza: number) {
  const src = cv.getContext('2d')!.getImageData(0, 0, N, N).data
  const lum = new Float32Array(N * N)
  for (let i = 0; i < N * N; i++) lum[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255
  const out = lienzo()
  const img = out.cx.createImageData(N, N)
  const d = img.data
  const at = (x: number, y: number) => lum[((y + N) % N) * N + ((x + N) % N)]
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * fuerza
      const dy = (at(x, y + 1) - at(x, y - 1)) * fuerza
      const l = Math.hypot(dx, dy, 1)
      const i = (y * N + x) * 4
      d[i] = ((-dx / l) * 0.5 + 0.5) * 255
      d[i + 1] = ((dy / l) * 0.5 + 0.5) * 255
      d[i + 2] = (1 / l) * 255
      d[i + 3] = 255
    }
  out.cx.putImageData(img, 0, 0)
  return out.cv
}

// ---------- catálogo ----------
export type TexturaId = 'pasto' | 'deck' | 'porcelanato' | 'hormigon' | 'ladrillo' | 'laja' | 'grava' | 'revoque'

export const TEXTURAS: Record<
  TexturaId,
  { nombre: string; metros: number; rugosidad: number; relieve: number; gen: (l: Lienzo) => void }
> = {
  pasto: { nombre: 'Pasto', metros: 1.5, rugosidad: 1, relieve: 4, gen: pasto },
  deck: { nombre: 'Deck de madera', metros: 1.2, rugosidad: 0.75, relieve: 3, gen: deck },
  porcelanato: { nombre: 'Porcelanato', metros: 1.2, rugosidad: 0.35, relieve: 2, gen: porcelanato },
  hormigon: { nombre: 'Hormigón', metros: 2, rugosidad: 0.9, relieve: 2, gen: hormigon },
  ladrillo: { nombre: 'Ladrillo', metros: 1, rugosidad: 0.9, relieve: 4, gen: ladrillo },
  laja: { nombre: 'Laja de piedra', metros: 2.5, rugosidad: 0.85, relieve: 4, gen: laja },
  grava: { nombre: 'Grava', metros: 1, rugosidad: 1, relieve: 5, gen: grava },
  revoque: { nombre: 'Revoque blanco', metros: 2, rugosidad: 0.95, relieve: 3, gen: revoque },
}

type Generada = { color: HTMLCanvasElement; normal: HTMLCanvasElement; mini: string }
const cache = new Map<TexturaId, Generada>()

function generar(id: TexturaId): Generada {
  let g = cache.get(id)
  if (g) return g
  semilla = 7 + id.length * 131
  const l = lienzo()
  TEXTURAS[id].gen(l)
  const normal = normalDesde(l.cv, TEXTURAS[id].relieve)
  // miniatura para la interfaz
  const m = document.createElement('canvas')
  m.width = m.height = 96
  m.getContext('2d')!.drawImage(l.cv, 0, 0, 96, 96)
  g = { color: l.cv, normal, mini: m.toDataURL('image/jpeg', 0.8) }
  cache.set(id, g)
  return g
}

export const miniatura = (id: TexturaId) => generar(id).mini

/** Texturas de three listas para usar: una instancia por material (cada una con su escala/rotación) */
export function texturasPara(id: TexturaId): { map: Texture; normalMap: Texture } {
  const g = generar(id)
  const map = new CanvasTexture(g.color)
  map.colorSpace = SRGBColorSpace
  const normalMap = new CanvasTexture(g.normal)
  normalMap.colorSpace = LinearSRGBColorSpace
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = RepeatWrapping
    t.anisotropy = 8
    t.center.set(0.5, 0.5)
  }
  return { map, normalMap }
}
