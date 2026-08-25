import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from './lib/supabase'

const AuthContext = createContext(null)
const LOCAL_MODE = import.meta.env.DEV || import.meta.env.VITE_LOCAL_MODE === 'true'
const LOCAL_SESSION = {
  user: {
    id: 'local-dev-user',
    email: 'local@localhost',
  },
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(LOCAL_MODE ? LOCAL_SESSION : null)
  const [status, setStatus] = useState(LOCAL_MODE ? 'signed-in' : supabase ? 'loading' : 'auth-error')
  const [error, setError] = useState(LOCAL_MODE ? null : supabaseConfigError)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (LOCAL_MODE) return undefined
    if (!supabase) return undefined

    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setStatus(nextSession ? 'signed-in' : 'signed-out')
      setError(null)
    })

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setStatus('auth-error')
        setError(sessionError.message)
        return
      }
      setSession(data.session)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (LOCAL_MODE) return
    if (!supabase) return
    setStatus('signing-in')
    setError(null)
    setMessage('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setStatus('auth-error')
      setError(signInError.message)
    }
  }, [])

  const signUp = useCallback(async (email, password) => {
    if (LOCAL_MODE) return
    if (!supabase) return
    setStatus('signing-in')
    setError(null)
    setMessage('')
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setStatus('auth-error')
      setError(signUpError.message)
      return
    }
    if (!data.session) {
      setStatus('signed-out')
      setMessage('Account created. Check your email to confirm it, then sign in.')
    }
  }, [])

  const signOut = useCallback(async () => {
    if (LOCAL_MODE) return
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
    if (signOutError) {
      setStatus('auth-error')
      setError(signOutError.message)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        status,
        error,
        message,
        signIn,
        signUp,
        signOut,
        isLocalMode: LOCAL_MODE,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

function AuthForm() {
  const { status, error, message, signIn, signUp } = useAuth()
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const busy = status === 'signing-in'

  const submit = async (event) => {
    event.preventDefault()
    if (mode === 'sign-up') await signUp(email.trim(), password)
    else await signIn(email.trim(), password)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl">
        <div className="mb-6">
          <div className="text-xl font-bold"><span className="text-brand-gradient">Prep</span> Command</div>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to sync your prep data across devices.</p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="prep-auth-email">Email</label>
            <input
              id="prep-auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="prep-auth-password">Password</label>
            <input
              id="prep-auth-password"
              type="password"
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </div>

          {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>}
          {message && <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-400">{message}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          disabled={busy || Boolean(supabaseConfigError)}
          onClick={() => setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}

export function AuthGate({ children }) {
  const { status, user } = useAuth()
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring session…
      </main>
    )
  }
  if (!user) return <AuthForm />
  return children
}
