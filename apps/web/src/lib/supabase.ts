import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase para la app web/escritorio de ECO.
 *
 * Apunta al esquema "ECO" (el esquema "public" pertenece a otro proyecto y no
 * debe usarse). Las credenciales se leen de las variables de entorno de Vite:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { db: { schema: 'ECO' } })
    : null

export const isSupabaseConfigured = supabase !== null
