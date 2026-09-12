import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/app/ui/Button'

/**
 * Top-level error boundary. Catches render-time exceptions from any nested
 * route so a broken page doesn't kill the whole app shell. Errors surface
 * with an actionable retry (soft reset) + reload (full page refresh).
 *
 * Uses a plain class component because React still requires class-based
 * boundaries — hooks don't cover this lifecycle yet.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col items-center justify-center px-8 py-16 text-center">
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-[var(--app-r-3)] border border-[var(--app-danger)] bg-[var(--app-danger-tint)] text-[var(--app-danger)]"
        >
          <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <div className="app-eyebrow mt-6 text-[var(--app-fg-muted)]">Unexpected error</div>
        <h1
          className="mt-2 font-normal tracking-tight text-[var(--app-fg-strong)]"
          style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.1 }}
        >
          Something broke on this page.
        </h1>
        <p className="mt-3 max-w-[480px] text-[14px] text-[var(--app-fg-muted)]">
          You didn't do anything wrong — the app hit a bug we didn't anticipate. Try again, or
          reload the whole page if it keeps happening.
        </p>
        {this.state.error?.message && (
          <pre className="app-num mt-4 max-w-[560px] truncate rounded-[var(--app-r-2)] border border-[var(--app-hairline)] bg-[var(--app-bg-2)] px-3 py-2 text-[11.5px] text-[var(--app-fg-dim)]">
            {this.state.error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="primary"
            leadingIcon={<RefreshCw className="h-4 w-4" />}
            onClick={this.handleReset}
          >
            Try again
          </Button>
          <Button variant="secondary" onClick={this.handleReload}>
            Reload page
          </Button>
        </div>
      </main>
    )
  }
}
