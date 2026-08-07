import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

const DEFAULT_SUPABASE_URL = 'https://placeholder.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder'

export async function createClient() {
  const cookieStore = await cookies()

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envKey && envKey.length > 0 ? envKey : DEFAULT_SUPABASE_ANON_KEY

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Safe to ignore when called from Server Components
          }
        },
      },
    }
  )
}