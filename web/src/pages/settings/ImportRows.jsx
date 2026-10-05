import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ExternalLink, Link2, RefreshCw, Trash2, Unlink } from 'lucide-react'
import { Button } from '@/app/ui/Button'
import { deleteImport, listImports, requestImport } from '@/api/imports'
import { connectSteam, disconnectSteam, getSteam, syncSteam } from '@/api/steam'
import { relativeTime } from '@/lib/format'

const POLL_MS = 5000
const GIVE_UP_MS = 5 * 60 * 1000
const STEAM_PRIVACY_URL = 'https://steamcommunity.com/my/edit/settings'

/**
 * Settings → Steam import.
 *
 * Connect Steam (recommended): the user signs in on Steam's own page, the
 * backend verifies the account, and the library imports through Steam's API
 * from any device. If the profile's "Game details" are private, Steam
 * returns nothing, so the PC tracker reads Steam locally instead — for the
 * connected account only. Without a connection, "Re-import" asks the PC.
 * Every import REPLACES the previous Steam import; tracked sessions are
 * never changed.
 */
export function ImportRows({ Row }) {
  const location = useLocation()
  const [imports, setImports] = useState(null)
  const [steam, setSteam] = useState(null)
  const [notice, setNotice] = useState(() => noticeFor(location.state))
  const [error, setError] = useState(null)
  const [waiting, setWaiting] = useState(false)
  const [busy, setBusy] = useState(null)
  const startedRef = useRef(0)

  const loadImports = useCallback(async () => {
    try {
      const d = await listImports()
      setImports(d)
      return d
    } catch (err) {
      setError(err.message || "Couldn't load imports")
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([listImports(), getSteam().catch(() => ({ configured: false, link: null }))])
      .then(([d, s]) => {
        if (cancelled) return
        setImports(d)
        setSteam(s)
        if (d?.requested_at) {
          startedRef.current = Date.now()
          setWaiting(true)
        }
      })
      .catch((err) => !cancelled && setError(err.message || "Couldn't load imports"))
    return () => {
      cancelled = true
    }
  }, [])

  // While the PC has a pending request, poll until the tracker has done it.
  useEffect(() => {
    if (!waiting) return undefined
    const id = setInterval(async () => {
      const d = await loadImports()
      if (d && !d.requested_at) setWaiting(false)
      if (Date.now() - startedRef.current > GIVE_UP_MS) setWaiting('stalled')
    }, POLL_MS)
    return () => clearInterval(id)
  }, [waiting, loadImports])

  const reimport = async () => {
    setBusy('reimport')
    setError(null)
    setNotice(null)
    try {
      if (steam?.link) {
        try {
          await syncSteam()
          setNotice({ text: 'Imported from Steam.' })
          setSteam(await getSteam())
          await loadImports()
        } catch (err) {
          const code = err?.body?.error
          if (code === 'steam_private') {
            setSteam(await getSteam())
            setNotice(PRIVATE_NOTICE)
            startedRef.current = Date.now()
            setWaiting(true) // the backend already asked the PC
          } else if (code === 'steam_unavailable') {
            setError("Steam didn't answer. Try again in a few minutes.")
          } else {
            throw err
          }
        }
      } else {
        await requestImport()
        startedRef.current = Date.now()
        setWaiting(true)
      }
    } catch (err) {
      setError(err.message || "Couldn't reach DECK'D")
    } finally {
      setBusy(null)
    }
  }

  const connect = async () => {
    setBusy('connect')
    setError(null)
    try {
      const { url } = await connectSteam(window.location.origin)
      window.location.assign(url) // Steam's own sign-in page
    } catch {
      setError("Couldn't start Steam sign-in. Please try again.")
      setBusy(null)
    }
  }

  const disconnect = async () => {
    setBusy('disconnect')
    try {
      await disconnectSteam()
      setSteam((s) => ({ ...s, link: null }))
      setNotice({ text: 'Steam disconnected. Your imported hours stay until you remove them.' })
    } catch {
      setError("Couldn't disconnect Steam.")
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    setBusy('remove')
    try {
      await deleteImport('steam')
      await loadImports()
    } catch (err) {
      setError(err.message || "Couldn't remove the import")
    } finally {
      setBusy(null)
    }
  }

  const link = steam?.link
  const imp = (imports?.imports ?? []).find((i) => i.source === 'steam')

  return (
    <div className="divide-y divide-[var(--app-hairline)]">
      {steam?.configured && !link && (
        <Row
          label="Connect Steam"
          hint="Sign in on Steam's own page; DECK'D never sees your Steam password. Your library and playtime then import from any device."
          action={
            <Button
              variant="primary"
              leadingIcon={<Link2 className="h-4 w-4" />}
              loading={busy === 'connect'}
              onClick={connect}
            >
              Connect Steam
            </Button>
          }
        />
      )}

      {link && (
        <Row
          label="Steam account"
          value={
            <span className="inline-flex items-center gap-2.5">
              {link.avatar && (
                <img src={link.avatar} alt="" className="h-6 w-6 rounded-[4px]" loading="lazy" />
              )}
              {link.name || 'Connected'}
            </span>
          }
          hint={
            link.api_error === 'private' ? (
              <>
                Your Steam game details are private, so your PC&apos;s tracker imports instead. To
                import from anywhere, set Game details to Public in{' '}
                <a
                  href={STEAM_PRIVACY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-[3px]"
                >
                  Steam privacy settings
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                .
              </>
            ) : (
              'Your library imports straight from Steam.'
            )
          }
          action={
            <Button
              variant="ghost"
              leadingIcon={<Unlink className="h-4 w-4" />}
              loading={busy === 'disconnect'}
              onClick={disconnect}
            >
              Disconnect
            </Button>
          }
        />
      )}

      <Row
        label="Steam playtime"
        value={
          imp
            ? `${imp.count.toLocaleString()} ${imp.count === 1 ? 'game' : 'games'} · ${imp.total_hours.toLocaleString()} h`
            : 'Not imported yet'
        }
        tone={imp ? 'default' : 'muted'}
        hint={
          imp
            ? `Imported ${relativeTime(imp.imported_at)} ${
                imp.method === 'steam_api' ? 'from Steam' : 'by your PC'
              }${imp.account_label ? ` (${imp.account_label})` : ''}. A new import replaces this one; tracked sessions are never changed.`
            : link
              ? 'Import your library now.'
              : "Your PC's tracker reads Steam within about a minute of asking."
        }
        action={
          <span className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw className="h-4 w-4" />}
              loading={busy === 'reimport' || waiting === true}
              disabled={waiting === true}
              onClick={reimport}
            >
              {waiting === true ? 'Waiting for your PC…' : imp ? 'Re-import' : 'Import'}
            </Button>
            {imp && (
              <Button
                variant="ghost"
                leadingIcon={<Trash2 className="h-4 w-4" />}
                loading={busy === 'remove'}
                onClick={remove}
              >
                Remove
              </Button>
            )}
          </span>
        }
      />

      {waiting === 'stalled' && (
        <p role="status" className="app-wt-small py-3 text-[14px] text-[var(--app-fg-muted)]">
          Your PC hasn&apos;t picked this up yet. Make sure the DECK&apos;D tracker is running and
          signed in; it imports as soon as it checks in.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="app-wt-small border-l-2 border-[var(--app-accent-rail)] py-3 pl-3 text-[14px] text-[var(--app-fg)]"
        >
          {notice.text}
        </p>
      )}
      {error && (
        <p role="alert" className="py-3 text-[14px] text-[var(--app-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}

const PRIVATE_NOTICE = {
  text: "Steam is connected, but your game details are private, so your PC's tracker will import instead (within about a minute).",
}

/** Message after returning from Steam's sign-in page. */
function noticeFor(state) {
  if (!state?.steam) return null
  if (state.steam === 'cancelled') return { text: 'Steam sign-in was cancelled.' }
  if (state.steam === 'private') return PRIVATE_NOTICE
  const count = state.result?.import?.count
  return {
    text:
      count != null
        ? `Steam connected. Imported ${count.toLocaleString()} games.`
        : 'Steam connected.',
  }
}
