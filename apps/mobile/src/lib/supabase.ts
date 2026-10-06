import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '../config'

/**
 * Supabase client for the ECO mobile app.
 *
 * The mobile user has no Auth account (operates as `anon`); writes go
 * through SECURITY DEFINER RPCs in the `eco` schema (register_mobile_user,
 * submit_rating). See supabase/migrations/0005_mobile.sql.
 */
export const supabase =
  isSupabaseConfigured && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        db: { schema: 'eco' },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null
