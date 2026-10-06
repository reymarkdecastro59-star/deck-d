import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { Input } from '@/app/ui/Input'
import { confirmSignUp, resendConfirmationCode } from '@/auth/cognito'

export default function ConfirmSignup() {
  const location = useLocation()
  // Router state may be lost on refresh — fall back to a plain field so
  // the flow still works if the user reloads mid-confirm.
  const initialEmail = location.state?.email ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)

  if (done) return <Navigate to="/login" replace state={{ justConfirmed: true }} />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      await confirmSignUp(email, code.trim())
      setDone(true)
    } catch (err) {
      setError(err.message || 'Confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setNotice(null)
    setResending(true)
    try {
      await resendConfirmationCode(email)
      setNotice('A new code is on its way. Check your inbox.')
    } catch (err) {
      setError(err.message || 'Could not resend the code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="app-root flex min-h-dvh items-center justify-center bg-[var(--app-bg)] px-4 py-10 text-[var(--app-fg)]">
      <div className="w-full max-w-[400px]">
        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Back to sign up
        </Link>

        <div className="mt-8">
          <div className="app-eyebrow text-[var(--app-fg-muted)]">Confirm email</div>
          <h1
            className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
            style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
          >
            Enter the code we sent
          </h1>
          <p className="mt-2 text-[14px] text-[var(--app-fg-muted)]">
            {initialEmail
              ? `We sent a 6-digit code to ${initialEmail}. It expires in about 24 hours.`
              : 'Enter the email you signed up with, then the 6-digit code.'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 space-y-4 rounded-[var(--app-r-3)] border border-[var(--app-border)] bg-[var(--app-bg-2)] p-6"
        >
          {!initialEmail && (
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
          )}

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-[var(--app-fg-muted)]">
              Verification code
            </span>
            <Input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              invalid={Boolean(error)}
              className="app-num tracking-[0.4em]"
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
          {notice && (
            <div
              role="status"
              className="rounded-[var(--app-r-2)] border border-[var(--app-border)] bg-[var(--app-bg-3)] px-3 py-2 text-[12.5px] text-[var(--app-fg-muted)]"
            >
              {notice}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
            leadingIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            {loading ? 'Confirming…' : 'Confirm and continue'}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full text-center text-[12.5px] text-[var(--app-fg-muted)] transition-colors hover:text-[var(--app-fg)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? 'Sending…' : "Didn't get the code? Resend it"}
          </button>
        </form>
      </div>
    </div>
  )
}
