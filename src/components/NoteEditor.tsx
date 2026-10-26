import { useEffect, useRef, useState } from 'react'
import { saveNote } from '../lib/db'
import { parseTags } from '../lib/links'
import { NOTE_TYPES, TYPE_ORDER, type Note, type NoteType } from '../lib/types'

interface Props {
  note: Note
  onDone: () => void
}

type SaveState = 'saved' | 'pending' | 'error'

export function NoteEditor({ note, onDone }: Props) {
  const [draft, setDraft] = useState(note)
  const [tagText, setTagText] = useState(note.tags.join(', '))
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const latest = useRef(draft)
  const dirty = useRef(false)

  // Autosave a short pause after the last keystroke.
  useEffect(() => {
    latest.current = draft
    if (!dirty.current) return
    setSaveState('pending')
    const timer = setTimeout(() => {
      saveNote(draft).then(
        () => setSaveState('saved'),
        () => setSaveState('error'),
      )
      dirty.current = false
    }, 500)
    return () => clearTimeout(timer)
  }, [draft])

  // Flush unsaved edits when leaving the editor.
  useEffect(
    () => () => {
      if (dirty.current) void saveNote(latest.current)
    },
    [],
  )

  const update = (patch: Partial<Note>) => {
    dirty.current = true
    setDraft((d) => ({ ...d, ...patch }))
  }
  const setField = (key: string, value: string) => update({ fields: { ...draft.fields, [key]: value } })
  const type = NOTE_TYPES[draft.type]

  return (
    <form className="editor" onSubmit={(e) => { e.preventDefault(); onDone() }}>
      <div className="editor-top">
        <input
          id="note-title"
          className="title-input"
          value={draft.title}
          placeholder={`Name this ${type.singular.toLowerCase()}`}
          autoFocus={!draft.title}
          onChange={(e) => update({ title: e.target.value })}
        />
        <div className="editor-actions">
          <span className={`save-state ${saveState}`} role="status">
            {saveState === 'saved' ? 'Saved' : saveState === 'pending' ? 'Saving…' : 'Not saved. Check storage space.'}
          </span>
          <button type="submit" className="btn primary">Done</button>
        </div>
      </div>

      <div className="field-grid">
        <label>
          <span>Type</span>
          <select id="note-type" value={draft.type} onChange={(e) => update({ type: e.target.value as NoteType })}>
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>{NOTE_TYPES[t].singular}</option>
            ))}
          </select>
        </label>
        {type.fields.map((f) => (
          <label key={f.key}>
            <span>{f.label}</span>
            {f.kind === 'select' ? (
              <select id={`field-${f.key}`} value={draft.fields[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
                <option value="">—</option>
                {f.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input
                id={`field-${f.key}`}
                inputMode={f.kind === 'number' ? 'numeric' : undefined}
                value={draft.fields[f.key] ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
        <label className="wide">
          <span>Tags, separated by commas</span>
          <input
            id="note-tags"
            value={tagText}
            placeholder="act-1, villain"
            onChange={(e) => {
              setTagText(e.target.value)
              update({ tags: parseTags(e.target.value) })
            }}
          />
        </label>
      </div>

      <label className="body-label">
        <span>Notes</span>
        <textarea
          id="note-body"
          value={draft.body}
          placeholder={'What happened? Link other notes with [[Name]].\n\n## Heading\n- list item\n- [ ] open task'}
          onChange={(e) => update({ body: e.target.value })}
        />
      </label>
      <p className="hint">
        <code>[[Name]]</code> links a note · <code>## Heading</code> · <code>- item</code> · <code>- [ ] task</code> · <code>**bold**</code> · <code>*italic*</code>
      </p>
    </form>
  )
}
