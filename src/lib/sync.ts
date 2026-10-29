import { liveQuery, type Subscription } from 'dexie'
import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type DocumentChange,
  type Firestore,
  type QuerySnapshot,
} from 'firebase/firestore'
import { db } from './db'
import { decideRemote, needsPush, type RemoteRecord } from './merge'
import { firebaseConfig, setState, state, syncAvailable } from './syncState'
import type { Campaign, Note } from './types'

const emulator = import.meta.env.VITE_FIREBASE_EMULATOR as string | undefined

/**
 * Optional cloud sync. Notes always live in IndexedDB first, so the app works
 * offline and signed out. When signed in, every change is mirrored to
 * Firestore under users/<uid>/ and changes from other devices are merged in.
 */

let auth: Auth | null = null
let firestore: Firestore | null = null
let engine: SyncEngine | null = null

export function initSync() {
  if (!syncAvailable || auth) return
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  })
  if (emulator) {
    connectAuthEmulator(auth, `http://${emulator}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(firestore, emulator, 8080)
    // Lets automated tests sign in without the Google popup.
    const testAuth = auth
    Object.assign(window, {
      __codexTestSignIn: (email: string) =>
        signInWithCredential(testAuth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true }))),
    })
  }
  onAuthStateChanged(auth, (user) => {
    engine?.stop()
    engine = null
    if (user && firestore) {
      setState({ email: user.email, name: user.displayName, error: null })
      engine = new SyncEngine(firestore, user)
    } else {
      setState({ status: 'signed-out', email: null, name: null, error: null })
    }
  })
}

export async function signIn() {
  if (!auth) return
  const provider = new GoogleAuthProvider()
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
    } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      setState({ error: 'Sign-in failed. Check your internet connection and try again.' })
    }
  }
}

export async function signOut() {
  if (auth) await firebaseSignOut(auth)
}

type Kind = 'note' | 'campaign'

class SyncEngine {
  /** Last `updated` time seen in the cloud, per `kind:id`. */
  private remote = new Map<string, number>()
  private ready = { note: false, campaign: false }
  private pending = 0
  private stopped = false
  private unsubscribers: (() => void)[] = []
  private local: Subscription | null = null
  private pushTimer: ReturnType<typeof setTimeout> | undefined
  private readonly onOnline = () => this.updateStatus()

  private fs: Firestore
  private user: User

  constructor(fs: Firestore, user: User) {
    this.fs = fs
    this.user = user
    setState({ status: 'connecting' })
    window.addEventListener('online', this.onOnline)
    window.addEventListener('offline', this.onOnline)
    for (const kind of ['note', 'campaign'] as Kind[]) {
      this.unsubscribers.push(
        onSnapshot(
          this.col(kind),
          { includeMetadataChanges: true },
          (snap) => void this.onRemote(kind, snap),
          () => setState({ status: 'error', error: 'Sync was refused. Check the database rules in Firebase.' }),
        ),
      )
    }
  }

  stop() {
    this.stopped = true
    clearTimeout(this.pushTimer)
    this.unsubscribers.forEach((u) => u())
    this.local?.unsubscribe()
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('offline', this.onOnline)
  }

  private col(kind: Kind) {
    return collection(this.fs, 'users', this.user.uid, kind === 'note' ? 'notes' : 'campaigns')
  }

  private async onRemote(kind: Kind, snap: QuerySnapshot) {
    const changes = snap.docChanges().filter((c: DocumentChange) => c.type !== 'removed')
    if (changes.length > 0) await this.applyRemote(kind, changes)
    if (kind === 'campaign' && !snap.metadata.fromCache && snap.docs.some((d) => !d.data().deleted)) {
      await this.dropUntouchedExamples()
    }
    // Only push once the server's copy is known, so stale local data never overwrites newer cloud data.
    if (!snap.metadata.fromCache && !this.ready[kind]) {
      this.ready[kind] = true
      if (this.ready.note && this.ready.campaign) this.watchLocal()
    }
    this.updateStatus()
  }

  private async applyRemote(kind: Kind, changes: DocumentChange[]) {
    const table = kind === 'note' ? db.notes : db.campaigns
    await db.transaction('rw', table, db.deletions, async () => {
      for (const change of changes) {
        const id = change.doc.id
        const key = `${kind}:${id}`
        const data = change.doc.data() as RemoteRecord & Record<string, unknown>
        if (typeof data.updated !== 'number') continue
        this.remote.set(key, Math.max(this.remote.get(key) ?? 0, data.updated))
        const local = (await table.get(id)) as { updated: number } | undefined
        const tomb = await db.deletions.get(key)
        const action = decideRemote(data, local, tomb?.deletedAt)
        if (data.deleted && tomb && tomb.deletedAt <= data.updated) await db.deletions.delete(key)
        if (action === 'delete') {
          await table.delete(id)
        } else if (action === 'put') {
          const record = { ...data, id }
          delete record.deleted
          await table.put(record as Note & Campaign)
          if (tomb) await db.deletions.delete(key)
        }
      }
    })
  }

  /** A fresh device starts with the example campaign; remove it once real campaigns arrive. */
  private async dropUntouchedExamples() {
    const examples = await db.campaigns.filter((c) => Boolean(c.example)).toArray()
    for (const c of examples) {
      const notes = await db.notes.where('campaignId').equals(c.id).toArray()
      if (notes.every((n) => n.updated < c.created)) {
        await db.transaction('rw', db.campaigns, db.notes, async () => {
          await db.notes.where('campaignId').equals(c.id).delete()
          await db.campaigns.delete(c.id)
        })
      }
    }
  }

  private watchLocal() {
    this.local = liveQuery(async () => ({
      notes: await db.notes.toArray(),
      campaigns: await db.campaigns.toArray(),
      deletions: await db.deletions.toArray(),
    })).subscribe((snapshot) => {
      clearTimeout(this.pushTimer)
      this.pushTimer = setTimeout(() => this.push(snapshot), 300)
    })
  }

  private push({ notes, campaigns, deletions }: { notes: Note[]; campaigns: Campaign[]; deletions: { key: string; deletedAt: number }[] }) {
    if (this.stopped) return
    const localOnly = new Set(campaigns.filter((c) => c.example).map((c) => c.id))
    const writes: { kind: Kind; id: string; data: Record<string, unknown>; updated: number; tombKey?: string }[] = []

    for (const c of campaigns) {
      if (c.example || !needsPush(c.updated, this.remote.get(`campaign:${c.id}`))) continue
      const { id, ...data } = c
      writes.push({ kind: 'campaign', id, data, updated: c.updated })
    }
    for (const n of notes) {
      if (localOnly.has(n.campaignId) || !needsPush(n.updated, this.remote.get(`note:${n.id}`))) continue
      const { id, ...data } = n
      writes.push({ kind: 'note', id, data, updated: n.updated })
    }
    for (const t of deletions) {
      const [kind, id] = t.key.split(':') as [Kind, string]
      if (!needsPush(t.deletedAt, this.remote.get(t.key))) continue
      writes.push({ kind, id, data: { deleted: true, updated: t.deletedAt }, updated: t.deletedAt, tombKey: t.key })
    }

    for (const w of writes) {
      this.remote.set(`${w.kind}:${w.id}`, w.updated)
      this.pending++
      setDoc(doc(this.col(w.kind), w.id), w.data)
        .then(async () => {
          // The cloud now holds the delete; the local reminder is no longer needed.
          if (w.tombKey) await db.deletions.delete(w.tombKey)
        })
        .catch(() => {
          this.remote.delete(`${w.kind}:${w.id}`)
          setState({ status: 'error', error: 'Some changes could not be saved to your account.' })
        })
        .finally(() => {
          this.pending--
          this.updateStatus()
        })
    }
    this.updateStatus()
  }

  private updateStatus() {
    if (this.stopped || state.status === 'error') return
    if (!navigator.onLine) setState({ status: 'offline' })
    else if (!this.ready.note || !this.ready.campaign) setState({ status: 'connecting' })
    else setState({ status: this.pending > 0 ? 'saving' : 'synced' })
  }
}
