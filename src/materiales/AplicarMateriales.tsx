import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  BufferAttribute,
  Color,
  Matrix3,
  Vector3,
  type BufferGeometry,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Texture,
} from 'three'
import { useEstado } from '../estado'
import { superficie } from '../objetos/Superficie'
import { TEXTURAS, texturasPara, type TexturaId } from './texturas'

type Std = MeshStandardMaterial
type Original = {
  color: Color
  roughness: number
  metalness: number
  map: Texture | null
  normalMap: Texture | null
  emissive: Color
  emissiveIntensity: number
}

const esStd = (m: Material): m is Std => 'roughness' in m && 'color' in m

/** Materiales del modelo agrupados por nombre, con sus mallas */
function escanear() {
  const grupos = new Map<string, { mats: Set<Std>; mallas: Set<Mesh> }>()
  let sinNombre = 0
  superficie.grupo?.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    for (const mat of mats) {
      if (!esStd(mat)) continue
      if (!mat.name) mat.name = `Material ${++sinNombre}`
      const g = grupos.get(mat.name) ?? { mats: new Set(), mallas: new Set() }
      g.mats.add(mat)
      g.mallas.add(m)
      grupos.set(mat.name, g)
    }
  })
  return grupos
}

const pos = new Vector3()
const nor = new Vector3()
const nm = new Matrix3()

/**
 * Coordenadas de textura en metros, proyectadas por caja según la orientación de cada cara.
 * Así una textura de "1,2 m" mide 1,2 m en cualquier pared o piso, aunque el modelo no traiga UVs.
 */
function uvsEnMetros(malla: Mesh) {
  const geo = malla.geometry as BufferGeometry
  if (!geo.attributes.normal) geo.computeVertexNormals()
  malla.updateWorldMatrix(true, false)
  nm.getNormalMatrix(malla.matrixWorld)
  const p = geo.attributes.position
  const n = geo.attributes.normal
  const uv = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) {
    pos.fromBufferAttribute(p, i).applyMatrix4(malla.matrixWorld)
    nor.fromBufferAttribute(n, i).applyMatrix3(nm)
    const ax = Math.abs(nor.x), ay = Math.abs(nor.y), az = Math.abs(nor.z)
    if (ay >= ax && ay >= az) {
      uv[i * 2] = pos.x
      uv[i * 2 + 1] = pos.z
    } else if (ax >= az) {
      uv[i * 2] = pos.z
      uv[i * 2 + 1] = pos.y
    } else {
      uv[i * 2] = pos.x
      uv[i * 2 + 1] = pos.y
    }
  }
  geo.setAttribute('uv', new BufferAttribute(uv, 2))
}

const ACENTO = new Color('#7fbf4f')

/** Aplica los ajustes de material del estado sobre el modelo, y resalta el material elegido */
export default function AplicarMateriales() {
  const originales = useRef(new Map<Std, Original>())
  const geometrias = useRef(new Map<Mesh, BufferGeometry>()) // geometría original de cada malla retexturada
  const texturas = useRef(new Map<string, { id: string; map: Texture; normalMap: Texture }>())
  const resaltados = useRef<Std[]>([])
  const materiales = useEstado((s) => s.materiales)
  const materialSel = useEstado((s) => s.materialSel)
  const set = useEstado((s) => s.set)

  // Lista de materiales para el panel (una vez, al cargar el modelo)
  useEffect(() => {
    const lista = [...escanear()].map(([nombre, g]) => ({
      nombre,
      color: '#' + [...g.mats][0].color.getHexString(),
    }))
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
    set({ listaMateriales: lista })
  }, [set])

  useEffect(() => {
    const grupos = escanear()
    for (const [nombre, g] of grupos) {
      const a = materiales[nombre]
      for (const mat of g.mats) {
        if (!originales.current.has(mat))
          originales.current.set(mat, {
            color: mat.color.clone(),
            roughness: mat.roughness,
            metalness: mat.metalness,
            map: mat.map,
            normalMap: mat.normalMap,
            emissive: mat.emissive.clone(),
            emissiveIntensity: mat.emissiveIntensity,
          })
        const o = originales.current.get(mat)!
        const textura = a?.textura as TexturaId | null | undefined
        const tieneMapa = !!mat.map

        if (textura) {
          let t = texturas.current.get(nombre)
          if (!t || t.id !== textura) {
            t?.map.dispose()
            t?.normalMap.dispose()
            t = { id: textura, ...texturasPara(textura) }
            texturas.current.set(nombre, t)
          }
          const metros = a?.escala ?? TEXTURAS[textura].metros
          const rot = ((a?.rotacion ?? 0) * Math.PI) / 180
          for (const tx of [t.map, t.normalMap]) {
            tx.repeat.set(1 / metros, 1 / metros)
            tx.rotation = rot
          }
          mat.map = t.map
          mat.normalMap = t.normalMap
          mat.color.set(a?.color ?? '#ffffff')
          mat.roughness = a?.rugosidad ?? TEXTURAS[textura].rugosidad
        } else {
          mat.map = textura === null ? null : o.map
          mat.normalMap = textura === null ? null : o.normalMap
          if (a?.color) mat.color.set(a.color)
          else mat.color.copy(o.color)
          mat.roughness = a?.rugosidad ?? o.roughness
        }
        mat.metalness = a?.metalicidad ?? o.metalness
        if (tieneMapa !== !!mat.map) mat.needsUpdate = true
      }

      // Coordenadas de textura en metros para las mallas con textura nuestra; restaurar las demás
      for (const malla of g.mallas) {
        if (a?.textura) {
          if (!geometrias.current.has(malla)) {
            geometrias.current.set(malla, malla.geometry)
            malla.geometry = malla.geometry.clone()
            uvsEnMetros(malla)
          }
        } else if (geometrias.current.has(malla)) {
          malla.geometry.dispose()
          malla.geometry = geometrias.current.get(malla)!
          geometrias.current.delete(malla)
        }
      }
    }
  }, [materiales])

  // Resaltado del material elegido
  useEffect(() => {
    for (const m of resaltados.current) {
      const o = originales.current.get(m)
      if (o) {
        m.emissive.copy(o.emissive)
        m.emissiveIntensity = o.emissiveIntensity
      }
    }
    resaltados.current = []
    if (!materialSel) return
    const g = escanear().get(materialSel)
    if (!g) return
    for (const m of g.mats) {
      if (!originales.current.has(m))
        originales.current.set(m, {
          color: m.color.clone(),
          roughness: m.roughness,
          metalness: m.metalness,
          map: m.map,
          normalMap: m.normalMap,
          emissive: m.emissive.clone(),
          emissiveIntensity: m.emissiveIntensity,
        })
      resaltados.current.push(m)
    }
  }, [materialSel])

  useFrame(({ clock }) => {
    const k = 0.18 + 0.14 * Math.sin(clock.elapsedTime * 4)
    for (const m of resaltados.current) {
      m.emissive.copy(ACENTO)
      m.emissiveIntensity = k
    }
  })

  // Al salir de Materiales se apaga el resaltado
  const pestana = useEstado((s) => s.pestana)
  const modo = useEstado((s) => s.modo)
  useEffect(() => {
    if (modo !== 'edicion' || pestana !== 'materiales') set({ materialSel: null })
  }, [modo, pestana, set])

  return null
}
