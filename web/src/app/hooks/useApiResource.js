import { useCallback, useEffect, useState } from 'react'

/**
 * useApiResource(fetcher, deps) — one primitive for the "load once, expose
 * data/loading/error/reload" pattern that every page hook used to duplicate.
 *
 * `fetcher` is a zero-arg async function; deps flow through to the effect so
 * pages can re-run the fetch when a param (like `range`) changes. `setData`
 * is exposed for optimistic mutations (Sessions, Devices) that need to write
 * into the cached data outside the fetcher.
 */
export function useApiResource(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => fetcher())
      .then((value) => {
        if (!cancelled) setData(value)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Request failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // fetcher deliberately excluded — pages pass a fresh arrow every render.
    // Callers own the deps that should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, ...deps])

  return { data, loading, error, reload, setData }
}
