import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  
  // Retrieve the current session user
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Supabase Connection Test</h1>
        <div className="p-4 border rounded-lg bg-zinc-900 text-zinc-100 border-zinc-800">
          <p className="text-emerald-400 font-medium">
            Connected to Supabase
          </p>
          <p className="text-sm text-zinc-400 mt-2">
            {user ? `Logged in as: ${user.email}` : 'No active user session (Unauthenticated)'}
          </p>
        </div>
      </div>
    </main>
  )
}