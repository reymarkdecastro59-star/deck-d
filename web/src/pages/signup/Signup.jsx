import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { Input } from '@/app/ui/Input'
import { useAuth } from '@/auth/AuthContext'
import { signUp } from '@/auth/cognito'

// Password policy mirrors the Cognito UserPool config in backend/template.yaml
// (8+ chars, one number). Validating client-side avoids a round-trip for the
// most common mistakes; Cognito is still the authority.
function validatePassword(pw) {
  if (pw.length < 8) return 'At least 8 characters.'
  if (!/\d/.test(pw)) return 'Must include at least one number.'
  return null
}

export default function Signup() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const pwError = validatePassword(password)
    if (pwError) return setError(pwError)
    if (password !== confirm) return setError('Passwords do not match.')
    if (!accepted) return setError('Accept the Terms and Privacy Policy to continue.')

    setLoading(true)
    try {
      await signUp(email, password)
      // Pass the email through router state so the confirm screen can
      // pre-fill and echo it — one less form field to re-type.
      navigate('/signup/confirm', { replace: true, state: { email } })
    } catch (err) {
      setError(err.message || 'Sign up failed')
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
            Create account
          </h1>
          <p className="mt-2 text-[14px] text-[var(--app-fg-muted)]">
            You'll get a 6-digit code by email to confirm.
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 chars, one number"
              invalid={Boolean(error)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-[var(--app-fg-muted)]">
              Confirm password
            </span>
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type it again"
              invalid={Boolean(error)}
            />
          </label>

          <label className="flex items-start gap-2 text-[12.5px] text-[var(--app-fg-muted)]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-[var(--app-accent)]"
            />
            <span>
              I agree to the{' '}
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
            </span>
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
            leadingIcon={<UserPlus className="h-4 w-4" />}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[12.5px] text-[var(--app-fg-muted)]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[var(--app-fg)] underline decoration-[var(--app-border-strong)] underline-offset-2 hover:text-[var(--app-fg-strong)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
