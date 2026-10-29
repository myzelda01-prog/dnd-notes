import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { signIn, signOut, syncStore, type SyncStatus } from '../lib/syncState'

const LABELS: Record<SyncStatus, string> = {
  unavailable: '',
  'signed-out': '',
  connecting: 'Connecting…',
  synced: 'Synced',
  saving: 'Saving…',
  offline: 'Offline, will sync later',
  error: 'Sync problem',
}

export function AccountMenu() {
  const sync = useSyncExternalStore(syncStore.subscribe, syncStore.get)
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (sync.status === 'unavailable') return null

  if (sync.status === 'signed-out') {
    return (
      <div className="account">
        <button type="button" className="btn" onClick={() => void signIn()} title="Sign in with Google to get your notes on every device">
          Sign in to sync
        </button>
        {sync.error && <span className="sync-error" role="alert">{sync.error}</span>}
      </div>
    )
  }

  return (
    <div className="account" ref={wrap}>
      <button type="button" className={`sync-pill ${sync.status}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="sync-dot" aria-hidden="true" />
        {LABELS[sync.status]}
      </button>
      {open && (
        <div className="account-menu">
          <p className="account-who">
            Signed in as <strong>{sync.name || sync.email}</strong>
            {sync.name && sync.email && <span className="muted"> {sync.email}</span>}
          </p>
          {sync.error && <p className="sync-error">{sync.error}</p>}
          <p className="muted small">Your notes sync to every device where you sign in with this account.</p>
          <button type="button" className="btn" onClick={() => { setOpen(false); void signOut() }}>
            Sign out
          </button>
          <p className="muted small">Signing out keeps the notes on this device.</p>
        </div>
      )}
    </div>
  )
}
