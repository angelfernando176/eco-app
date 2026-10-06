/**
 * Runtime configuration read from EXPO_PUBLIC_* environment variables.
 *
 * The values come from a `.env` file at `apps/mobile/.env` (created manually,
 * never committed). Required variables:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   EXPO_PUBLIC_ECO_WEB_URL (optional, defaults to http://localhost:5173)
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (optional, needed for Android maps)
 */

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
export const ecoWebUrl = process.env.EXPO_PUBLIC_ECO_WEB_URL ?? 'http://localhost:5173'
export const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
