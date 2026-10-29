import Dexie, { type EntityTable } from 'dexie'
import { isNoteType, type Campaign, type Deletion, type Note, type NoteType } from './types'
import { exampleNotes } from './examples'

export const db = new Dexie('dnd-notes') as Dexie & {
  notes: EntityTable<Note, 'id'>
  campaigns: EntityTable<Campaign, 'id'>
  deletions: EntityTable<Deletion, 'key'>
}

db.version(1).stores({
  notes: 'id, campaignId, type, updated, *tags',
  campaigns: 'id, created',
})

// v2: campaigns get an `updated` time and deletes are remembered, both for syncing.
db.version(2)
  .stores({ deletions: 'key' })
  .upgrade((tx) =>
    tx
      .table('campaigns')
      .toCollection()
      .modify((c: Campaign) => {
        c.updated = c.updated ?? c.created
        if (c.name.endsWith('(example)')) c.example = true
      }),
  )

export const newId = () => crypto.randomUUID()

export async function createCampaign(name: string): Promise<Campaign> {
  const now = Date.now()
  const campaign: Campaign = { id: newId(), name: name.trim() || 'Untitled campaign', created: now, updated: now }
  await db.campaigns.add(campaign)
  return campaign
}

export async function renameCampaign(id: string, name: string): Promise<void> {
  // Renaming the example campaign makes it the user's own, so it starts syncing.
  await db.campaigns.update(id, { name: name.trim() || 'Untitled campaign', updated: Date.now(), example: false })
}

export async function deleteCampaign(id: string): Promise<void> {
  await db.transaction('rw', db.campaigns, db.notes, db.deletions, async () => {
    const now = Date.now()
    const noteIds = (await db.notes.where('campaignId').equals(id).primaryKeys()) as string[]
    await db.deletions.bulkPut([
      { key: `campaign:${id}`, deletedAt: now },
      ...noteIds.map((n) => ({ key: `note:${n}`, deletedAt: now })),
    ])
    await db.notes.bulkDelete(noteIds)
    await db.campaigns.delete(id)
    // Always keep one campaign to write into.
    if ((await db.campaigns.count()) === 0) {
      await db.campaigns.add({ id: newId(), name: 'My campaign', created: now, updated: now })
    }
  })
}

export async function createNote(campaignId: string, type: NoteType, title = ''): Promise<Note> {
  const now = Date.now()
  const note: Note = { id: newId(), campaignId, type, title, body: '', tags: [], fields: {}, created: now, updated: now }
  if (type === 'session') {
    const sessions = await db.notes.where({ campaignId, type: 'session' }).toArray()
    const highest = Math.max(0, ...sessions.map((s) => Number(s.fields.number) || 0))
    note.fields.number = String(highest + 1)
    note.title = title || `Session ${highest + 1}`
  }
  await db.notes.add(note)
  return note
}

export async function saveNote(note: Note): Promise<void> {
  await db.notes.put({ ...note, updated: Date.now() })
}

export async function deleteNote(id: string): Promise<void> {
  await db.transaction('rw', db.notes, db.deletions, async () => {
    await db.deletions.put({ key: `note:${id}`, deletedAt: Date.now() })
    await db.notes.delete(id)
  })
}

/** On first run, create an example campaign so the app shows what it does. */
export async function ensureStarterCampaign(): Promise<void> {
  await db.transaction('rw', db.campaigns, db.notes, async () => {
    if ((await db.campaigns.count()) > 0) return
    const now = Date.now()
    const campaign: Campaign = { id: newId(), name: 'The Drowned Crown (example)', created: now, updated: now, example: true }
    await db.campaigns.add(campaign)
    await db.notes.bulkAdd(exampleNotes(campaign.id))
  })
}

interface Backup {
  app: 'dnd-notes'
  version: 1
  exported: string
  campaign: Campaign
  notes: Note[]
}

export async function exportCampaign(campaignId: string): Promise<{ filename: string; json: string }> {
  const campaign = await db.campaigns.get(campaignId)
  if (!campaign) throw new Error('Campaign not found')
  const notes = await db.notes.where('campaignId').equals(campaignId).toArray()
  const backup: Backup = { app: 'dnd-notes', version: 1, exported: new Date().toISOString(), campaign, notes }
  const slug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campaign'
  return { filename: `${slug}-${new Date().toISOString().slice(0, 10)}.json`, json: JSON.stringify(backup, null, 2) }
}

/**
 * Import a backup as a new campaign. Ids are regenerated so importing the
 * same file twice never overwrites existing notes.
 */
export async function importBackup(json: string): Promise<Campaign> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const backup = data as Partial<Backup>
  if (backup?.app !== 'dnd-notes' || !backup.campaign || !Array.isArray(backup.notes)) {
    throw new Error('That file is not a Campaign Codex backup.')
  }
  const now = Date.now()
  const campaign: Campaign = { id: newId(), name: String(backup.campaign.name ?? 'Imported campaign'), created: now, updated: now }
  const notes: Note[] = backup.notes.filter((n) => isNoteType(n?.type)).map((n) => ({
    id: newId(),
    campaignId: campaign.id,
    type: n.type,
    title: String(n.title ?? ''),
    body: String(n.body ?? ''),
    tags: Array.isArray(n.tags) ? n.tags.map(String) : [],
    fields: Object.fromEntries(Object.entries(n.fields ?? {}).map(([k, v]) => [k, String(v)])),
    created: Number(n.created) || Date.now(),
    updated: Number(n.updated) || Date.now(),
  }))
  await db.transaction('rw', db.campaigns, db.notes, async () => {
    await db.campaigns.add(campaign)
    await db.notes.bulkAdd(notes)
  })
  return campaign
}
