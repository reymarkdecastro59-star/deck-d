import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogIn } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { Input } from '@/app/ui/Input'
import { useAuth } from '@/auth/AuthContext'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Already signed in — bounce straight to the dashboard so a back-tap or
  // stale tab doesn't leave the user staring at an empty login form.
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-root flex min-h-dvh items-center justify-center bg-[var(--app-bg)] px-4 py-10 text-[var(--app-fg)]">
      <div className="w-full max-w-[400px]">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Back to home
        </Link>

        <div className="mt-8">
          <div className="app-eyebrow text-[var(--app-fg-muted)]">DECK&apos;D</div>
          <h1
            className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
          >
            Sign in
          </h1>
          <p className="mt-2 text-[14px] text-[var(--app-fg-muted)]">
            Use the credentials from your DECK&apos;D account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 space-y-4 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-6"
        >
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-[var(--app-fg-muted)]">Email</span>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              invalid={Boolean(error)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-[var(--app-fg-muted)]">Password</span>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              invalid={Boolean(error)}
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-[var(--app-r-2)] border border-[var(--app-danger)] bg-[var(--app-danger-tint)] px-3 py-2 text-[12.5px] text-[var(--app-fg)]"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
            leadingIcon={<LogIn className="h-4 w-4" />}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[12px] text-[var(--app-fg-dim)]">
          By continuing you agree to our{' '}
          <Link
            to="/legal/terms"
            className="underline decoration-[var(--app-border-strong)] underline-offset-2 hover:text-[var(--app-fg)]"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            to="/legal/privacy"
            className="underline decoration-[var(--app-border-strong)] underline-offset-2 hover:text-[var(--app-fg)]"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
