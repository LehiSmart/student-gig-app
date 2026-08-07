import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

const DEFAULT_SUPABASE_URL = 'https://placeholder.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder'

export function createClient() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envKey && envKey.length > 0 ? envKey : DEFAULT_SUPABASE_ANON_KEY

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}