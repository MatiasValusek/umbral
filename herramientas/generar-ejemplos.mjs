// Genera modelos .glb low poly para proyectos de ejemplo de Umbral
import * as THREE from '../node_modules/three/build/three.module.js'
import { GLTFExporter } from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js'
import { writeFileSync } from 'node:fs'

// FileReader mínimo para que el exportador funcione en Node
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.() }) }
  readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend?.() }) }
}

const mats = {}
const mat = (nombre, color, opts = {}) =>
  (mats[nombre] ??= Object.assign(new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts }), { name: nombre }))

function box(padre, nombre, size, pos, m, rot) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(...size), m)
  me.name = nombre
  me.position.set(...pos)
  if (rot) me.rotation.set(...rot)
  padre.add(me)
  return me
}
function grupo(padre, nombre, pos = [0, 0, 0]) {
  const g = new THREE.Group(); g.name = nombre; g.position.set(...pos); padre.add(g); return g
}
async function exportar(escena, archivo) {
  const glb = await new GLTFExporter().parseAsync(escena, { binary: true })
  writeFileSync(new URL('../public/ejemplos/' + archivo, import.meta.url), Buffer.from(glb))
  console.log(archivo, Buffer.from(glb).length, 'bytes')
}

// ---------- 1. Maqueta low poly (la del principio) ----------
{
  const C = { pasto: '#6f8f4e', muro: '#eceae4', ladrillo: '#8a6f5e', chapa: '#5c6670', madera: '#8a5a3a', hormigon: '#c9c6bf', piedra: '#a7a39a', agua: '#5fc6d1', tronco: '#6b5440', copa: '#55703a', flor: '#9a7bc4' }
  const s = new THREE.Scene(); s.name = 'Maqueta low poly'
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(30, 26), mat('Pasto', C.pasto, { roughness: 1 }))
  piso.name = 'Terreno'; piso.rotation.x = -Math.PI / 2; s.add(piso)
  box(s, 'Medianera fondo', [30, 2.6, 0.25], [0, 1.3, -13], mat('Muro', C.muro))
  box(s, 'Medianera izquierda', [0.25, 2.6, 26], [-15, 1.3, 0], mat('Muro', C.muro))
  box(s, 'Medianera derecha', [0.25, 2.6, 26], [15, 1.3, 0], mat('Muro', C.muro))

  const casa = grupo(s, 'Casa', [-4, 0, -8])
  box(casa, 'Volumen', [12, 3, 8], [0, 1.5, 0], mat('Ladrillo', C.ladrillo))
  box(casa, 'Ventanal izquierdo', [3, 2.1, 0.05], [-2.5, 1.2, 4.01], mat('Vidrio', '#9fc3cc', { roughness: 0.1 }))
  box(casa, 'Ventanal derecho', [3, 2.1, 0.05], [2.5, 1.2, 4.01], mat('Vidrio', '#9fc3cc', { roughness: 0.1 }))
  box(casa, 'Puerta', [1, 2.1, 0.06], [0, 1.1, 4.02], mat('Madera', C.madera))
  const sh = new THREE.Shape(); sh.moveTo(-4.6, 0); sh.lineTo(4.6, 0); sh.lineTo(0, 1.8); sh.closePath()
  const gt = new THREE.ExtrudeGeometry(sh, { depth: 13, bevelEnabled: false }); gt.translate(0, 0, -6.5)
  const techo = new THREE.Mesh(gt, mat('Chapa', C.chapa, { roughness: 0.5, metalness: 0.4 }))
  techo.name = 'Techo'; techo.position.set(0, 3, 0); techo.rotation.y = Math.PI / 2; casa.add(techo)

  const gal = grupo(s, 'Galería', [-5, 0, -1.5])
  box(gal, 'Piso galería', [6, 0.06, 5], [0, 0.03, 0], mat('Piedra', C.piedra))
  for (const [x, z] of [[-2.7, -2.2], [2.7, -2.2], [-2.7, 2.2], [2.7, 2.2]]) box(gal, 'Columna', [0.18, 2.7, 0.18], [x, 1.35, z], mat('Madera', C.madera))
  box(gal, 'Viga', [5.8, 0.2, 0.15], [0, 2.7, 2.2], mat('Madera', C.madera))
  box(gal, 'Viga', [5.8, 0.2, 0.15], [0, 2.7, -2.2], mat('Madera', C.madera))
  for (let i = 0; i < 9; i++) box(gal, 'Listón', [0.08, 0.15, 5], [-2 + i * 0.5, 2.85, 0], mat('Madera', C.madera))
  box(gal, 'Mesa', [1.8, 0.08, 0.9], [0, 0.75, 0], mat('Madera', C.madera))
  box(gal, 'Pata', [0.1, 0.72, 0.1], [0, 0.37, 0], mat('Madera', C.madera))

  const pil = grupo(s, 'Pileta', [4, 0, 4])
  box(pil, 'Solárium', [11, 0.12, 6], [0, 0.06, 0], mat('Hormigón', C.hormigon))
  box(pil, 'Borde', [8.4, 0.16, 3.4], [0, 0.1, 0], mat('Borde pileta', '#e6e3dc'))
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), mat('Agua', C.agua, { roughness: 0.05 }))
  agua.name = 'Agua'; agua.rotation.x = -Math.PI / 2; agua.position.set(0, 0.19, 0); pil.add(agua)
  box(pil, 'Banco', [2.4, 0.45, 0.6], [-3, 0.35, 2.6], mat('Madera', C.madera))
  box(pil, 'Banco', [2.4, 0.45, 0.6], [0.5, 0.35, 2.6], mat('Madera', C.madera))

  const cant = grupo(s, 'Cantero')
  const ico = new THREE.IcosahedronGeometry(1, 0)
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 0.9 + 0.2
    const r = 4 + Math.sin(i * 12.9898) * 0.9
    const e = 0.35 + (Math.sin(i * 78.233) * 0.5 + 0.5) * 0.3
    const m = new THREE.Mesh(ico, i % 3 === 0 ? mat('Flores', C.flor, { roughness: 1, flatShading: true }) : mat('Matas', '#6a8a52', { roughness: 1, flatShading: true }))
    m.name = 'Mata'; m.position.set(-9 + Math.cos(a) * r, e * 0.8, 5 - Math.sin(a) * r * 0.8); m.scale.setScalar(e); cant.add(m)
  }
  for (let i = 0; i < 6; i++) box(s, 'Placa', [1.4, 0.06, 0.5], [-1.5, 0.03, 2 + i * 1.6], mat('Hormigón', C.hormigon))
  const tronco = new THREE.CylinderGeometry(0.12, 0.2, 3.2, 8), copa = new THREE.IcosahedronGeometry(1.3, 1)
  for (const [p, k] of [[[-11, 0, -2], 1.1], [[1.5, 0, -3], 1], [[11, 0, -6], 1.2], [[-12, 0, 10], 0.9]]) {
    const g = grupo(s, 'Árbol', p); g.scale.setScalar(k)
    const t = new THREE.Mesh(tronco, mat('Tronco', C.tronco, { roughness: 1 })); t.name = 'Tronco'; t.position.y = 1.6; g.add(t)
    const c = new THREE.Mesh(copa, mat('Copa', C.copa, { roughness: 1, flatShading: true })); c.name = 'Copa'; c.position.y = 3.6; g.add(c)
  }
  await exportar(s, 'maqueta-low-poly.glb')
}

// ---------- 2. Edificio de departamentos low poly (nuevo) ----------
{
  for (const k of Object.keys(mats)) delete mats[k]
  const s = new THREE.Scene(); s.name = 'Edificio Las Lomas'
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(36, 30), mat('Pasto', '#7a9a58', { roughness: 1 }))
  piso.name = 'Terreno'; piso.rotation.x = -Math.PI / 2; s.add(piso)
  box(s, 'Vereda', [36, 0.08, 4], [0, 0.04, 13], mat('Vereda', '#bdb8ae'))
  box(s, 'Calle', [36, 0.02, 6], [0, 0.01, 18], mat('Asfalto', '#4a4d52'))
  box(s, 'Acceso', [3, 0.1, 6], [0, 0.05, 8], mat('Vereda', '#bdb8ae'))

  const ed = grupo(s, 'Edificio', [0, 0, -1])
  const P = 3 // alto de piso
  const pisos = 4
  box(ed, 'Planta baja', [16, P, 10], [0, P / 2, 0], mat('Hormigón visto', '#b9b6ae'))
  for (let n = 1; n < pisos; n++) {
    box(ed, `Piso ${n}`, [16, P, 10], [0, P * n + P / 2, 0], mat('Revoque blanco', '#eeebe4'))
    box(ed, `Losa ${n}`, [16.4, 0.25, 10.4], [0, P * n, 0], mat('Hormigón visto', '#b9b6ae'))
    // dos departamentos por piso, con balcón al frente
    for (const x of [-4, 4]) {
      box(ed, `Balcón ${n}${x < 0 ? 'A' : 'B'}`, [5, 0.2, 1.6], [x, P * n + 0.1, 5.8], mat('Hormigón visto', '#b9b6ae'))
      box(ed, 'Baranda', [5, 1, 0.05], [x, P * n + 0.6, 6.58], mat('Vidrio baranda', '#a9c8cf', { roughness: 0.1 }))
      box(ed, 'Ventanal', [3.6, 2.2, 0.05], [x, P * n + 1.25, 5.03], mat('Vidrio', '#7fa7b3', { roughness: 0.1 }))
      box(ed, 'Ventana trasera', [2.4, 1.3, 0.05], [x, P * n + 1.6, -5.03], mat('Vidrio', '#7fa7b3', { roughness: 0.1 }))
    }
    box(ed, 'Ventana lateral', [0.05, 1.3, 2], [8.03, P * n + 1.6, -1], mat('Vidrio', '#7fa7b3', { roughness: 0.1 }))
    box(ed, 'Ventana lateral', [0.05, 1.3, 2], [-8.03, P * n + 1.6, -1], mat('Vidrio', '#7fa7b3', { roughness: 0.1 }))
  }
  // planta baja: hall vidriado y cocheras
  box(ed, 'Hall', [3, 2.6, 0.05], [0, 1.3, 5.03], mat('Vidrio', '#7fa7b3', { roughness: 0.1 }))
  box(ed, 'Puerta cochera', [4, 2.4, 0.06], [-5, 1.2, 5.03], mat('Chapa', '#5c6670', { roughness: 0.5, metalness: 0.4 }))
  box(ed, 'Local', [4, 2.4, 0.05], [5, 1.2, 5.03], mat('Vidrio', '#7fa7b3', { roughness: 0.1 }))
  box(ed, 'Marquesina', [5, 0.15, 1.6], [0, 2.9, 5.8], mat('Madera', '#8a5a3a'))
  box(ed, 'Terraza', [16.4, 0.3, 10.4], [0, P * pisos + 0.15, 0], mat('Hormigón visto', '#b9b6ae'))
  box(ed, 'Sala de máquinas', [4, 2.4, 3], [4, P * pisos + 1.5, -2], mat('Revoque blanco', '#eeebe4'))
  box(ed, 'Pérgola terraza', [5, 0.15, 3], [-4, P * pisos + 2.6, 1], mat('Madera', '#8a5a3a'))
  for (const [x, z] of [[-6.3, -0.3], [-1.7, -0.3], [-6.3, 2.3], [-1.7, 2.3]]) box(ed, 'Columna', [0.15, 2.5, 0.15], [x, P * pisos + 1.4, z], mat('Madera', '#8a5a3a'))

  const tronco = new THREE.CylinderGeometry(0.12, 0.18, 2.6, 7), copa = new THREE.IcosahedronGeometry(1.2, 0)
  for (const x of [-14, -9, 9, 14]) {
    const g = grupo(s, 'Árbol de vereda', [x, 0, 12.5])
    const t = new THREE.Mesh(tronco, mat('Tronco', '#6b5440', { roughness: 1 })); t.name = 'Tronco'; t.position.y = 1.3; g.add(t)
    const c = new THREE.Mesh(copa, mat('Copa', '#55703a', { roughness: 1, flatShading: true })); c.name = 'Copa'; c.position.y = 3.1; g.add(c)
  }
  const mata = new THREE.IcosahedronGeometry(0.6, 0)
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(mata, mat('Matas', '#6a8a52', { roughness: 1, flatShading: true }))
    m.name = 'Mata'; m.position.set(-8 + i * 1.23 + (i > 5 && i < 8 ? 0 : 0), 0.35, 5.8); m.scale.setScalar(0.7 + (i % 3) * 0.15)
    if (Math.abs(m.position.x) > 1.8) s.add(m)
  }
  await exportar(s, 'edificio-las-lomas.glb')
}
