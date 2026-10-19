import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Null until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, so the app still boots locally.
export const supabase: SupabaseClient | null = isSupabaseConfigured
    ? createClient(url!, anonKey!, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              storageKey: 'coffee-app-auth',
          },
      })
    : null
