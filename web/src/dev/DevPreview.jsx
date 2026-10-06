// DEV-ONLY: renders the signed-in shell with sample data at /dev/preview/*
// (query ?live=1 for the "Now playing" state). Registered in App.jsx behind
// `import.meta.env.DEV`, so it never ships to production.
import { AppShell } from '@/app/shell'

if (typeof window !== 'undefined') {
  window.__DECKD_MOCK_API__ = true
  window.__DECKD_MOCK_LIVE__ = new URLSearchParams(window.location.search).has('live')
}

export default function DevPreview() {
  return <AppShell />
}
