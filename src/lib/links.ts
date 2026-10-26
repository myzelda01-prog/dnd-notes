import type { Note } from './types'

const LINK_RE = /\[\[([^[\]]+?)\]\]/g

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Titles referenced with [[Title]] in a note body, normalized and deduplicated. */
export function extractLinks(body: string): string[] {
  const found = new Set<string>()
  for (const match of body.matchAll(LINK_RE)) {
    const title = normalizeTitle(match[1])
    if (title) found.add(title)
  }
  return [...found]
}

/** Notes in the same campaign whose body links to `note` by title. */
export function findBacklinks(notes: Note[], note: Note): Note[] {
  const title = normalizeTitle(note.title)
  if (!title) return []
  return notes.filter((n) => n.id !== note.id && extractLinks(n.body).includes(title))
}

export function buildTitleIndex(notes: Note[]): Map<string, Note> {
  const index = new Map<string, Note>()
  for (const n of notes) {
    const key = normalizeTitle(n.title)
    if (key && !index.has(key)) index.set(key, n)
  }
  return index
}

/** Case-insensitive search over title, body and tags. A leading # matches tags only. */
export function matchesQuery(note: Note, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (q.startsWith('#')) {
    const tag = q.slice(1)
    return note.tags.some((t) => t.toLowerCase() === tag)
  }
  return (
    note.title.toLowerCase().includes(q) ||
    note.body.toLowerCase().includes(q) ||
    note.tags.some((t) => t.toLowerCase().includes(q)) ||
    Object.values(note.fields).some((v) => v.toLowerCase().includes(q))
  )
}

export function parseTags(raw: string): string[] {
  const tags = raw
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
  return [...new Set(tags)]
}
