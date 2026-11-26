import type { ComponentType } from 'react'
import {
  ArbolAlto,
  ArbolAncho,
  ArbolRedondo,
  Arbusto,
  Auto,
  Cerco,
  Maceta,
  MesaSillas,
  Palmera,
  PersonaCaminando,
  PersonaNino,
  PersonaParada,
  PersonaSentada,
  Reposera,
  Sombrilla,
} from './Modelos'

export type Categoria = 'Vegetación' | 'Personas' | 'Mobiliario'

export type ItemCatalogo = {
  id: string
  nombre: string
  categoria: Categoria
  Modelo: ComponentType
  /** Ícono: trazos SVG en una caja de 24 × 24 */
  icono: string
}

export const CATALOGO: ItemCatalogo[] = [
  { id: 'arbol-redondo', nombre: 'Árbol', categoria: 'Vegetación', Modelo: ArbolRedondo, icono: 'M12 22v-8 M12 3a6 6 0 1 1 0 12a6 6 0 1 1 0-12z' },
  { id: 'arbol-ancho', nombre: 'Árbol ancho', categoria: 'Vegetación', Modelo: ArbolAncho, icono: 'M12 22v-8 M3 11a4 4 0 0 1 5-4a5 5 0 0 1 8 0a4 4 0 0 1 5 4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z' },
  { id: 'arbol-alto', nombre: 'Ciprés', categoria: 'Vegetación', Modelo: ArbolAlto, icono: 'M12 22v-3 M12 2l4 17H8z' },
  { id: 'palmera', nombre: 'Palmera', categoria: 'Vegetación', Modelo: Palmera, icono: 'M11 22c0-6 1-10 2-14 M13 8c-3-3-7-3-9-1 M13 8c3-3 7-3 9-1 M13 8c-1-3-3-5-6-5 M13 8c1-3 4-5 7-4' },
  { id: 'arbusto', nombre: 'Arbusto', categoria: 'Vegetación', Modelo: Arbusto, icono: 'M3 19a4 4 0 0 1 4-5a5 5 0 0 1 10 0a4 4 0 0 1 4 5z' },
  { id: 'cerco', nombre: 'Cerco vivo', categoria: 'Vegetación', Modelo: Cerco, icono: 'M3 19V11h18v8z M7 11v8 M12 11v8 M17 11v8' },
  { id: 'maceta', nombre: 'Maceta', categoria: 'Vegetación', Modelo: Maceta, icono: 'M8 14h8l-1 7H9z M12 14a4 4 0 1 1 0-8a4 4 0 1 1 0 8' },
  { id: 'persona-parada', nombre: 'Persona', categoria: 'Personas', Modelo: PersonaParada, icono: 'M12 2a2 2 0 1 1 0 4a2 2 0 1 1 0-4 M9 8h6v7H9z M10 15v7 M14 15v7' },
  { id: 'persona-caminando', nombre: 'Caminando', categoria: 'Personas', Modelo: PersonaCaminando, icono: 'M13 2a2 2 0 1 1 0 4a2 2 0 1 1 0-4 M12 8l-1 7 M11 15l-3 7 M11 15l4 7 M12 9l-4 4 M12 9l4 3' },
  { id: 'persona-sentada', nombre: 'Sentada', categoria: 'Personas', Modelo: PersonaSentada, icono: 'M11 3a2 2 0 1 1 0 4a2 2 0 1 1 0-4 M10 9v6h6v6 M4 15h14 M5 15v6 M17 15v6' },
  { id: 'nino', nombre: 'Niño', categoria: 'Personas', Modelo: PersonaNino, icono: 'M12 7a2 2 0 1 1 0 4a2 2 0 1 1 0-4 M10 12h4v5h-4z M11 17v5 M13 17v5' },
  { id: 'reposera', nombre: 'Reposera', categoria: 'Mobiliario', Modelo: Reposera, icono: 'M3 17h12l5-7 M5 17v4 M14 17v4' },
  { id: 'sombrilla', nombre: 'Sombrilla', categoria: 'Mobiliario', Modelo: Sombrilla, icono: 'M12 22V6 M3 10l9-6l9 6z M9 22h6' },
  { id: 'mesa-sillas', nombre: 'Mesa y sillas', categoria: 'Mobiliario', Modelo: MesaSillas, icono: 'M5 11h14 M8 11v8 M16 11v8 M2 14v6 M2 16h4v4 M22 14v6 M22 16h-4v4' },
  { id: 'auto', nombre: 'Auto', categoria: 'Mobiliario', Modelo: Auto, icono: 'M3 16v-4l3-5h12l3 5v4z M3 12h18 M7 19a2 2 0 1 1 0-.1 M17 19a2 2 0 1 1 0-.1' },
]

export const PROPIO = 'propio'

export const porId = (id: string) => CATALOGO.find((c) => c.id === id)
