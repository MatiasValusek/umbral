import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { create } from 'zustand'

// Proyecto de Supabase de Umbral (organización "Umbral").
// La clave publicable es pública a propósito: lo que protege los datos son las políticas RLS de la base.
// Se pueden pisar con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (por ejemplo, para un proyecto de pruebas).
const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL || ''
const CLAVE_PUBLICABLE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

/** Sin configuración no se muestra nada de la nube (la app sigue funcionando igual que antes) */
export const nubeDisponible = !!(URL_SUPABASE && CLAVE_PUBLICABLE)

export const supabase: SupabaseClient | null = nubeDisponible
  ? createClient(URL_SUPABASE, CLAVE_PUBLICABLE, { auth: { flowType: 'pkce', detectSessionInUrl: true } })
  : null

export const BUCKET = 'proyectos'
/** Límite de archivo del plan gratis de Supabase */
export const LIMITE_ARCHIVO = 50 * 1024 * 1024

type Sesion = {
  usuario: User | null
  cargando: boolean
  /** Proyecto de la nube que está abierto ahora (para "Guardar" sin preguntar el nombre) */
  actual: { id: string; nombre: string } | null
  /** URL blob del modelo que ya está subido en el proyecto actual (para no subirlo de nuevo) */
  modeloSubido: string | null
}
const leerActual = (): Sesion['actual'] => {
  try {
    const a = JSON.parse(localStorage.getItem('umbral-nube-actual') ?? 'null')
    return a && typeof a.id === 'string' && typeof a.nombre === 'string' ? a : null
  } catch {
    return null
  }
}
export const useSesion = create<Sesion>(() => ({ usuario: null, cargando: nubeDisponible, actual: leerActual(), modeloSubido: null }))
// El proyecto abierto sobrevive a recargar la página (así Ctrl S sigue guardando en el mismo)
useSesion.subscribe((s, antes) => {
  if (s.actual === antes.actual) return
  try {
    if (s.actual) localStorage.setItem('umbral-nube-actual', JSON.stringify(s.actual))
    else localStorage.removeItem('umbral-nube-actual')
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
})

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const usuario = data.session?.user ?? null
    useSesion.setState(usuario ? { usuario, cargando: false } : { usuario, cargando: false, actual: null })
  })
  supabase.auth.onAuthStateChange((_evento, sesion) => {
    const usuario = sesion?.user ?? null
    const antes = useSesion.getState().usuario
    // Cambio de cuenta (no el primer aviso al cargar): el proyecto abierto era del otro usuario
    useSesion.setState(antes && antes.id !== usuario?.id ? { usuario, actual: null, modeloSubido: null } : { usuario })
  })
  // Después de entrar con el link del mail, sacar el ?code= de la barra de direcciones
  if (window.location.search.includes('code=')) {
    const limpiar = () => {
      const u = new URL(window.location.href)
      u.searchParams.delete('code')
      window.history.replaceState(null, '', u.pathname + u.search + u.hash)
    }
    setTimeout(limpiar, 1500)
  }
}

/** Manda el link para entrar al mail. Vuelve a esta misma página. */
export async function mandarLink(email: string) {
  if (!supabase) throw new Error('La nube no está disponible.')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname, shouldCreateUser: true },
  })
  if (error) throw new Error(traducir(error.message, error.status))
}

/** Entrar con el código de 6 dígitos (si el mail trae código además del link) */
export async function entrarConCodigo(email: string, codigo: string) {
  if (!supabase) throw new Error('La nube no está disponible.')
  const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'email' })
  if (error) throw new Error(traducir(error.message, error.status))
}

export async function salir() {
  await supabase?.auth.signOut()
  useSesion.setState({ usuario: null, actual: null, modeloSubido: null })
}

export function traducir(mensaje: string, status?: number) {
  const m = mensaje.toLowerCase()
  if (status === 429 || m.includes('rate limit') || m.includes('security purposes'))
    return 'Se mandaron demasiados mails seguidos. Esperá unos minutos y probá de nuevo.'
  if (m.includes('invalid') && m.includes('email')) return 'Ese mail no parece válido.'
  if (m.includes('expired') || m.includes('invalid')) return 'El código no es válido o ya venció. Pedí uno nuevo.'
  if (m.includes('fetch') || m.includes('network')) return 'No hay conexión con la nube. Revisá internet y probá de nuevo.'
  return 'Algo falló en la nube: ' + mensaje
}
