import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(unix) {
  return new Date(unix * 1000).toLocaleString()
}

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { email, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/sessions?limit=100')
      .then((data) => setSessions(data.sessions || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-cyan-400">DECK'D Dashboard</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">{email}</span>
          <button onClick={handleLogout} className="text-slate-300 hover:text-cyan-400">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <h2 className="mb-4 text-lg font-medium">Recent sessions</h2>

        {loading && <p className="text-slate-400">Loading...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}
        {!loading && !error && sessions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 py-16 text-center">
            <p className="text-slate-400">No sessions yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Start the tray agent and launch a tracked game.
            </p>
          </div>
        )}
        {!loading && !error && sessions.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3">Game</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sessions.map((s) => (
                  <tr key={s.session_id}>
                    <td className="px-4 py-3">{s.game_name}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(s.started_at)}</td>
                    <td className="px-4 py-3">{formatDuration(s.duration_sec)}</td>
                    <td className="px-4 py-3 text-slate-400">{s.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
