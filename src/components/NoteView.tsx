import { useEffect, useState } from 'react'
import { deleteNote, saveNote } from '../lib/db'
import { findBacklinks } from '../lib/links'
import { toggleTaskLine } from '../lib/tasks'
import { NOTE_TYPES, type Note } from '../lib/types'
import { NoteBody } from './NoteBody'
import { StatusChip } from './StatusChip'

interface Props {
  note: Note
  notes: Note[]
  titleIndex: Map<string, Note>
  onEdit: () => void
  onOpenLink: (title: string, target: Note | undefined) => void
  onOpen: (note: Note) => void
  onDeleted: () => void
  onTag: (tag: string) => void
}

export function NoteView({ note, notes, titleIndex, onEdit, onOpenLink, onOpen, onDeleted, onTag }: Props) {
  const [confirming, setConfirming] = useState(false)
  const type = NOTE_TYPES[note.type]
  const backlinks = findBacklinks(notes, note)
  const filled = type.fields.filter((f) => note.fields[f.key])

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(timer)
  }, [confirming])

  return (
    <article className="view">
      <header className="view-head">
        <div>
          <p className={`eyebrow type-${note.type}`}>{type.singular}</p>
          <h1>{note.title || 'Untitled'}</h1>
        </div>
        <div className="view-actions">
          <button type="button" className="btn primary" onClick={onEdit}>Edit</button>
          <button
            type="button"
            className={confirming ? 'btn danger' : 'btn ghost'}
            onClick={async () => {
              if (!confirming) return setConfirming(true)
              await deleteNote(note.id)
              onDeleted()
            }}
          >
            {confirming ? 'Delete for good' : 'Delete'}
          </button>
        </div>
      </header>

      {(filled.length > 0 || note.tags.length > 0) && (
        <dl className="facts">
          {filled.map((f) => (
            <div key={f.key}>
              <dt>{f.label}</dt>
              <dd>{f.kind === 'select' ? <StatusChip value={note.fields[f.key]} /> : note.fields[f.key]}</dd>
            </div>
          ))}
          {note.tags.length > 0 && (
            <div>
              <dt>Tags</dt>
              <dd className="tags">
                {note.tags.map((t) => (
                  <button key={t} type="button" className="tag" onClick={() => onTag(t)}>#{t}</button>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}

      <NoteBody
        body={note.body}
        titleIndex={titleIndex}
        onOpenLink={onOpenLink}
        onToggleTask={(line) => void saveNote({ ...note, body: toggleTaskLine(note.body, line) })}
      />

      {backlinks.length > 0 && (
        <section className="backlinks">
          <h2>Mentioned in</h2>
          <ul>
            {backlinks.map((b) => (
              <li key={b.id}>
                <button type="button" className={`wikilink type-${b.type}`} onClick={() => onOpen(b)}>{b.title || 'Untitled'}</button>
                <span className="muted"> · {NOTE_TYPES[b.type].singular}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
