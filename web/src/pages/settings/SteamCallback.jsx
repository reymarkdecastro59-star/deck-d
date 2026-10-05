import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { linkSteam } from '@/api/steam'
import { Button } from '@/app/ui/Button'
import { PageFrame, PageHeader } from '@/app/ui/PageHeader'
import { Panel } from '@/app/ui/Panel'

const MESSAGES = {
  sign_in_expired: 'That Steam sign-in expired or was already used. Please try again.',
  steam_verification_failed: "Steam couldn't confirm that sign-in. Please try again.",
  invalid_params: 'Steam sent back an incomplete answer. Please try again.',
}

/**
 * Steam sends the user back here after signing in on steamcommunity.com.
 * Only the openid.* answer is forwarded; the backend checks it was issued
 * for this user and asks Steam to confirm it before trusting the account.
 */
export default function SteamCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // StrictMode double-run: the sign-in is single use
    started.current = true
    const query = new URLSearchParams(window.location.search)
    const params = {}
    for (const [k, v] of query) if (k.startsWith('openid.')) params[k] = v
    if (params['openid.mode'] === 'cancel') {
      navigate('/settings#imports', { replace: true, state: { steam: 'cancelled' } })
      return
    }
    linkSteam(params)
      .then((res) => {
        const outcome = res.error === 'steam_private' ? 'private' : 'connected'
        navigate('/settings#imports', { replace: true, state: { steam: outcome, result: res } })
      })
      .catch((err) => {
        const code = err?.body?.error
        setError(MESSAGES[code] || "Couldn't connect Steam. Please try again.")
      })
  }, [navigate])

  return (
    <PageFrame>
      <PageHeader title="Connecting Steam" />
      <Panel className="max-w-[640px]">
        {error ? (
          <div className="flex flex-col items-start gap-4">
            <p role="alert" className="text-[15px] text-[var(--app-fg)]">
              {error}
            </p>
            <Button as={Link} to="/settings#imports" variant="secondary">
              Back to Settings
            </Button>
          </div>
        ) : (
          <p role="status" className="app-wt-small text-[15px] text-[var(--app-fg-muted)]">
            Confirming your Steam account and importing your library…
          </p>
        )}
      </Panel>
    </PageFrame>
  )
}
