import { firebaseConfig as projectConfig } from '../firebaseConfig'

// Sync status lives here, apart from the Firebase code, so the app only
// downloads Firebase when sync is configured.

export type SyncStatus = 'unavailable' | 'signed-out' | 'connecting' | 'synced' | 'saving' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  email: string | null
  name: string | null
  error: string | null
}

const emulator = import.meta.env.VITE_FIREBASE_EMULATOR as string | undefined
export const firebaseConfig = emulator
  ? { apiKey: 'demo', authDomain: 'localhost', projectId: 'demo-codex', appId: 'demo' }
  : projectConfig

export const syncAvailable = Boolean(firebaseConfig.apiKey)

export let state: SyncState = { status: syncAvailable ? 'signed-out' : 'unavailable', email: null, name: null, error: null }
const listeners = new Set<() => void>()

export function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const syncStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get: () => state,
}

const loadSync = () => import('./sync')

export async function startSync() {
  if (syncAvailable) (await loadSync()).initSync()
}

export async function signIn() {
  await (await loadSync()).signIn()
}

export async function signOut() {
  await (await loadSync()).signOut()
}
