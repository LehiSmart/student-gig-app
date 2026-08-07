import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_SUPABASE_URL = 'https://placeholder.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envKey && envKey.length > 0 ? envKey : DEFAULT_SUPABASE_ANON_KEY

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh auth token if expired
  await supabase.auth.getUser()

  return supabaseResponse
}