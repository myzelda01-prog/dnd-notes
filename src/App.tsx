import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { CampaignTools } from './components/CampaignTools'
import { DiceRoller } from './components/DiceRoller'
import { InstallButton } from './components/InstallButton'
import { NoteEditor } from './components/NoteEditor'
import { NoteView } from './components/NoteView'
import { StatusChip } from './components/StatusChip'
import { createNote, db, ensureStarterCampaign } from './lib/db'
import { buildTitleIndex, matchesQuery } from './lib/links'
import { NOTE_TYPES, TYPE_ORDER, type Note, type NoteType } from './lib/types'

type Filter = NoteType | 'all'

const CAMPAIGN_KEY = 'dnd-notes.campaign'

function readStoredCampaign(): string | null {
  try {
    return localStorage.getItem(CAMPAIGN_KEY)
  } catch {
    return null
  }
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.type === 'session' && b.type === 'session') {
      return (Number(b.fields.number) || 0) - (Number(a.fields.number) || 0)
    }
    return b.updated - a.updated
  })
}

function excerpt(body: string): string {
  return body
    .replace(/\[\[([^[\]]+)\]\]/g, '$1')
    .replace(/^\s*[-*]\s+(\[[ xX]\]\s*)?/gm, '')
    .replace(/[#*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)
}

export default function App() {
  const [campaignId, setCampaignId] = useState<string | null>(readStoredCampaign)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [newMenu, setNewMenu] = useState(false)

  useEffect(() => {
    void ensureStarterCampaign()
  }, [])

  const campaigns = useLiveQuery(() => db.campaigns.orderBy('created').toArray(), [])
  const campaign = campaigns?.find((c) => c.id === campaignId) ?? campaigns?.[0]

  useEffect(() => {
    if (!campaign) return
    try {
      localStorage.setItem(CAMPAIGN_KEY, campaign.id)
    } catch {
      // Private mode: the campaign choice just isn't remembered.
    }
  }, [campaign])

  const notes = useLiveQuery(
    () => (campaign ? db.notes.where('campaignId').equals(campaign.id).toArray() : Promise.resolve([] as Note[])),
    [campaign?.id],
  )

  const titleIndex = useMemo(() => buildTitleIndex(notes ?? []), [notes])
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: notes?.length ?? 0 }
    for (const n of notes ?? []) c[n.type] = (c[n.type] ?? 0) + 1
    return c
  }, [notes])

  const visible = useMemo(() => {
    const searching = query.trim() !== ''
    return sortNotes((notes ?? []).filter((n) => (searching || filter === 'all' || n.type === filter) && matchesQuery(n, query)))
  }, [notes, filter, query])

  const selected = notes?.find((n) => n.id === selectedId)

  const open = (note: Note) => {
    setSelectedId(note.id)
    setEditing(false)
  }

  const addNote = async (type: NoteType, title = '') => {
    if (!campaign) return
    setNewMenu(false)
    const note = await createNote(campaign.id, type, title)
    setFilter((f) => (f === 'all' ? f : type))
    setSelectedId(note.id)
    setEditing(true)
  }

  const openLink = (title: string, target: Note | undefined) => {
    if (target) open(target)
    else void addNote(filter === 'all' ? 'lore' : filter, title)
  }

  const switchCampaign = (id: string | null) => {
    setCampaignId(id)
    setSelectedId(null)
    setEditing(false)
    setQuery('')
  }

  if (!campaigns || !campaign || !notes) {
    return <div className="loading">Opening your codex…</div>
  }

  return (
    <div className="app" data-view={selected ? 'note' : 'list'}>
      <header className="topbar">
        <div className="brand">
          <span className="sigil" aria-hidden="true" />
          <span className="brand-name">Campaign Codex</span>
        </div>
        <label className="campaign-picker">
          <span className="visually-hidden">Campaign</span>
          <select id="campaign" value={campaign.id} onChange={(e) => switchCampaign(e.target.value)}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <DiceRoller />
        <InstallButton />
      </header>

      <aside className="sidebar">
        <nav className="filters" aria-label="Note types">
          {(['all', ...TYPE_ORDER] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`filter ${f !== 'all' ? `type-${f}` : ''}`}
              aria-current={filter === f && !query ? 'true' : undefined}
              onClick={() => {
                setFilter(f)
                setQuery('')
              }}
            >
              <span>{f === 'all' ? 'Everything' : NOTE_TYPES[f].label}</span>
              <span className="count">{counts[f] ?? 0}</span>
            </button>
          ))}
        </nav>
        <CampaignTools key={campaign.id} campaign={campaign} onSwitch={switchCampaign} />
      </aside>

      <section className="list-pane" aria-label="Notes">
        <div className="list-tools">
          <input
            id="search"
            type="search"
            placeholder="Search notes or #tag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="new-wrap">
            <button
              type="button"
              className="btn primary"
              aria-expanded={filter === 'all' ? newMenu : undefined}
              onClick={() => (filter === 'all' ? setNewMenu((m) => !m) : void addNote(filter))}
            >
              New {filter === 'all' ? 'note' : NOTE_TYPES[filter].singular.toLowerCase()}
            </button>
            {newMenu && (
              <div className="new-menu" role="menu">
                {TYPE_ORDER.map((t) => (
                  <button key={t} type="button" role="menuitem" className={`type-${t}`} onClick={() => void addNote(t)}>
                    {NOTE_TYPES[t].singular}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            {query ? (
              <p>No notes match “{query}”.</p>
            ) : (
              <>
                <p>No {filter === 'all' ? 'notes' : NOTE_TYPES[filter].label.toLowerCase()} yet.</p>
                <p className="muted">Use the New button to write your first one.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="note-list">
            {visible.map((n) => {
              const status = n.fields.status || n.fields.attitude
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`note-card type-${n.type}`}
                    aria-current={n.id === selectedId ? 'true' : undefined}
                    onClick={() => open(n)}
                  >
                    <span className="note-card-top">
                      <span className="note-type">
                        {n.type === 'session' && n.fields.number ? `Session ${n.fields.number}` : NOTE_TYPES[n.type].singular}
                      </span>
                      {status && <StatusChip value={status} />}
                      {n.type === 'loot' && n.fields.value && <span className="gp">{n.fields.value} gp</span>}
                    </span>
                    <span className="note-title">{n.title || 'Untitled'}</span>
                    {n.body && <span className="note-excerpt">{excerpt(n.body)}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <main className="note-pane">
        {selected ? (
          <>
            <button type="button" className="back-btn" onClick={() => { setSelectedId(null); setEditing(false) }}>
              ← All notes
            </button>
            {editing ? (
              <NoteEditor key={selected.id} note={selected} onDone={() => setEditing(false)} />
            ) : (
              <NoteView
                key={selected.id}
                note={selected}
                notes={notes}
                titleIndex={titleIndex}
                onEdit={() => setEditing(true)}
                onOpenLink={openLink}
                onOpen={open}
                onDeleted={() => setSelectedId(null)}
                onTag={(t) => setQuery(`#${t}`)}
              />
            )}
          </>
        ) : (
          <div className="placeholder">
            <p className="placeholder-title">{campaign.name}</p>
            <p className="muted">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}. Pick one from the list, or start a new one.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
