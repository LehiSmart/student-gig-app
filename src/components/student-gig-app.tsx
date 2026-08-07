'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { calculatePayout, formatCurrency } from '@/lib/gig'

type AuthMode = 'signin' | 'signup'
type UserRole = 'student' | 'provider'
type GigStatus = 'available' | 'accepted' | 'completed'

type Gig = {
  id: string
  title: string
  price: number
  description: string
  providerName: string
  providerId: string
  studentId?: string
  status: GigStatus
  createdAt: string
}

type AuthForm = {
  email: string
  password: string
  name: string
  role: UserRole
}

type GigForm = {
  title: string
  price: string
  description: string
}

const STORAGE_KEY = 'student-gig-app-state-v1'

export default function StudentGigApp() {
  const supabase = useMemo(() => createClient(), [])
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [authForm, setAuthForm] = useState<AuthForm>({
    email: '',
    password: '',
    name: '',
    role: 'student',
  })
  const [gigForm, setGigForm] = useState<GigForm>({
    title: '',
    price: '',
    description: '',
  })
  const [gigs, setGigs] = useState<Gig[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed?.gigs)) return parsed.gigs
      }
    } catch {
      // Ignore malformed storage data.
    }
    return []
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user ?? null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ gigs }))
  }, [gigs])

  const summary = useMemo(() => {
    const completedGigs = gigs.filter((gig) => gig.status === 'completed')
    const totalEarnings = completedGigs.reduce((sum, gig) => sum + gig.price, 0)
    const totalPlatformFees = completedGigs.reduce((sum, gig) => {
      return sum + calculatePayout(gig.price).platformFee
    }, 0)
    const totalStudentPayout = completedGigs.reduce((sum, gig) => {
      return sum + calculatePayout(gig.price).studentAmount
    }, 0)

    return {
      totalEarnings,
      totalPlatformFees,
      totalStudentPayout,
      completedCount: completedGigs.length,
    }
  }, [gigs])

  const myAcceptedGigs = useMemo(() => {
    if (!sessionUser) return []
    return gigs.filter((gig) => gig.studentId === sessionUser.id && gig.status !== 'completed')
  }, [gigs, sessionUser])

  const providerGigs = useMemo(() => {
    if (!sessionUser) return []
    return gigs.filter((gig) => gig.providerId === sessionUser.id)
  }, [gigs, sessionUser])

  const availableGigs = useMemo(() => {
    return gigs.filter((gig) => gig.status === 'available')
  }, [gigs])

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.name,
              role: authForm.role,
            },
          },
        })

        if (error) throw error
        setSessionUser(data.user)
        setMessage(`Welcome aboard, ${authForm.name || authForm.email}. Your account is ready.`)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        })

        if (error) throw error
        setSessionUser(data.user)
        setMessage('You are signed in and ready to accept gigs.')
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSessionUser(null)
    setMessage('You have signed out.')
  }

  function handleCreateGig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!sessionUser) {
      setMessage('Sign in before creating a gig.')
      return
    }

    const price = Number(gigForm.price)
    if (!gigForm.title.trim() || !gigForm.description.trim() || Number.isNaN(price) || price <= 0) {
      setMessage('Please enter a valid gig title, description, and price.')
      return
    }

    const newGig: Gig = {
      id: crypto.randomUUID(),
      title: gigForm.title.trim(),
      price,
      description: gigForm.description.trim(),
      providerName: authForm.name || sessionUser.email || 'Provider',
      providerId: sessionUser.id,
      status: 'available',
      createdAt: new Date().toISOString(),
    }

    setGigs((current) => [newGig, ...current])
    setGigForm({ title: '', price: '', description: '' })
    setMessage(`Gig created for ${formatCurrency(newGig.price)}.`)
  }

  function acceptGig(gigId: string) {
    if (!sessionUser) {
      setMessage('Sign in to accept a gig.')
      return
    }

    setGigs((current) =>
      current.map((gig) => (gig.id === gigId ? { ...gig, studentId: sessionUser.id, status: 'accepted' } : gig)),
    )
    setMessage('Gig accepted. You can complete it once the work is done.')
  }

  function completeGig(gigId: string) {
    setGigs((current) =>
      current.map((gig) => (gig.id === gigId ? { ...gig, status: 'completed' } : gig)),
    )
    setMessage('Gig marked complete and the payout has been calculated.')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f2937,_#030712_70%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">Student Gig Platform</p>
              <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Post, accept, and complete gigs in one place.</h1>
              <p className="mt-4 text-lg text-slate-300">
                Students can log in, pick up work from providers, and earn money while the platform takes a small commission.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              <p className="font-semibold">Current payout logic</p>
              <p className="mt-1">15% platform commission, 85% student payout.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Access your workspace</h2>
                <p className="mt-1 text-sm text-slate-400">Sign in or create an account to start posting and accepting gigs.</p>
              </div>
              {sessionUser ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                >
                  Sign out
                </button>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleAuth}>
              <div className="flex gap-2 rounded-full border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${authMode === 'signup' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'}`}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${authMode === 'signin' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'}`}
                >
                  Sign in
                </button>
              </div>

              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none ring-0"
                placeholder="Your name"
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none ring-0"
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              />
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none ring-0"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />

              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none"
                value={authForm.role}
                onChange={(event) => setAuthForm((current) => ({ ...current, role: event.target.value as UserRole }))}
              >
                <option value="student">Student</option>
                <option value="provider">Provider</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Working...' : authMode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            {message ? <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <h2 className="text-xl font-semibold">Live payout summary</h2>
            <p className="mt-1 text-sm text-slate-400">Completed gigs are instantly broken into student payout and platform commission.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Completed</p>
                <p className="mt-2 text-2xl font-semibold">{summary.completedCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Platform fee</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalPlatformFees)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Student payout</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalStudentPayout)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Create a gig</h2>
                <p className="mt-1 text-sm text-slate-400">Providers can publish work with a set price and description.</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Provider flow
              </span>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateGig}>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none"
                placeholder="Gig name"
                value={gigForm.title}
                onChange={(event) => setGigForm((current) => ({ ...current, title: event.target.value }))}
              />
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={gigForm.price}
                onChange={(event) => setGigForm((current) => ({ ...current, price: event.target.value }))}
              />
              <textarea
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none"
                placeholder="Describe the work"
                value={gigForm.description}
                onChange={(event) => setGigForm((current) => ({ ...current, description: event.target.value }))}
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Publish gig
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Open gigs</h2>
                <p className="mt-1 text-sm text-slate-400">Students can claim available work and complete it when finished.</p>
              </div>
              <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-sky-300">
                Student flow
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {availableGigs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                  No gigs are currently available. Providers can publish one above.
                </div>
              ) : (
                availableGigs.map((gig) => (
                  <article key={gig.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{gig.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{gig.description}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                        {formatCurrency(gig.price)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>Posted by {gig.providerName}</span>
                      <button
                        type="button"
                        onClick={() => acceptGig(gig.id)}
                        className="rounded-full border border-slate-700 px-3 py-1.5 font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                      >
                        Accept gig
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <h2 className="text-xl font-semibold">My accepted work</h2>
            <p className="mt-1 text-sm text-slate-400">Students can mark their assigned work as complete.</p>

            <div className="mt-6 space-y-4">
              {myAcceptedGigs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                  No gigs are currently assigned to you.
                </div>
              ) : (
                myAcceptedGigs.map((gig) => (
                  <article key={gig.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{gig.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{gig.description}</p>
                      </div>
                      <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sm font-semibold text-sky-300">Accepted</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>Will pay {formatCurrency(calculatePayout(gig.price).studentAmount)} after completion</span>
                      <button
                        type="button"
                        onClick={() => completeGig(gig.id)}
                        className="rounded-full border border-slate-700 px-3 py-1.5 font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                      >
                        Mark complete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <h2 className="text-xl font-semibold">Provider dashboard</h2>
            <p className="mt-1 text-sm text-slate-400">Track the gigs you have published and watch them move through the pipeline.</p>

            <div className="mt-6 space-y-4">
              {providerGigs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                  You have not published any gigs yet.
                </div>
              ) : (
                providerGigs.map((gig) => (
                  <article key={gig.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{gig.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{gig.description}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${gig.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                        {gig.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>Price {formatCurrency(gig.price)}</span>
                      <span>{gig.status === 'completed' ? 'Paid out' : 'Awaiting student'}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
